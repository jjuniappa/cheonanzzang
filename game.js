"use strict";

const CONFIG = {
  TILE_SIZE: 64,
  PLAYER_SIZE: 100,

  MAX_ENERGY: 50,
  BASIC_DAMAGE: 1,
  ULTIMATE_DAMAGE: 5,
  NINJA_ULTIMATE_RADIUS: 90,
  NINJA_ULTIMATE_EFFECT_SIZE: 180,

  ULTIMATE_GAUGE_MAX: 100,
  ULTIMATE_GAIN_ON_HIT: 10,

  IDLE_FRAME_MS: 150,
  WALK_FRAME_MS: 100,
  ATTACK_FRAME_MS: 90,
  ULTIMATE_FRAME_MS: 110,
  EFFECT_FRAME_MS: 80,

  PROJECTILE_SIZE: 34,

  MISSILE_SPEED: 500,
  MISSILE_SIZE: 58,
  MISSILE_EXPLOSION_RADIUS_TILES: 2,
  EXPLOSION_SIZE: 190,
  EXPLOSION_FRAME_MS: 85,

  SOLDIER_LAUNCH_FRAME_MS: 80,
  SOLDIER_MISSILE_INTERVAL_MS: 250,
  SOLDIER_MISSILE_DROP_HEIGHT: 560,
  SOLDIER_MISSILE_IMPACT_OFFSETS: [-110, 0, 110],

  AI_PREFERRED_DISTANCE_TILES: 4,

  ENERGY_BAR_WIDTH: 92,
  ENERGY_BAR_HEIGHT: 8,
  ENERGY_BAR_OFFSET_Y: 66,

  ULTIMATE_GAUGE_RADIUS: 18,
  ULTIMATE_GAUGE_OFFSET_Y: 92
};

const CHARACTER_CONFIG = {
  ninja: {
    moveSpeed: 240,
    projectileSpeed: 900,
    projectileRangeTiles: 4.4,
    basicDamage: 1,
    attackCooldownMs: 220
  },

  soldier: {
    moveSpeed: 180,
    projectileSpeed: 800,
    projectileRangeTiles: 5,
    basicDamage: 1,
    attackCooldownMs: 260
  }
};

function getCharacterConfig(fighterOrType) {
  const type =
    typeof fighterOrType === "string"
      ? fighterOrType
      : fighterOrType.type;

  return CHARACTER_CONFIG[type] || CHARACTER_CONFIG.ninja;
}

const ASSETS = {
  ninja: {
    portrait: "assets/ninja/portrait/portrait.png",
    idle: fixedPaths("assets/ninja/idle", "idle", 4),
    walk: fixedPaths("assets/ninja/walk", "walk", 4),
    attack: fixedPaths("assets/ninja/skill", "skill", 4),
    ultimate: fixedPaths("assets/ninja/ultimate", "ultimate", 8),
    projectile: fixedPaths("assets/shuriken", "shuriken", 4)
  },

  soldier: {
    portrait: "assets/soldier/portrait/portrait.png",
    idle: fixedPaths("assets/soldier/idle", "idle", 4),
    walk: fixedPaths("assets/soldier/walk", "walk", 4),
    attack: fixedPaths("assets/soldier/attack", "attack", 4),
    ultimate: fixedPaths("assets/soldier/ultimate", "ultimate", 8),
    projectile: fixedPaths("assets/bullet", "bullet", 1)
  },

  ultimateCharge: fixedPaths(
    "assets/effects/ultimateCharge",
    "charge",
    4
  ),

  ultimateSlash: fixedPaths(
    "assets/effects/ultimateSlash",
    "slash",
    4
  ),

  missileLaunch: fixedPaths(
    "assets/effects/missileLaunch",
    "launch",
    3
  ),

  missile: fixedPaths(
    "assets/missile",
    "missile",
    4
  ),


  explosion: fixedPaths(
    "assets/effects/explosion",
    "explosion",
    6
  )
};

function fixedPaths(directory, prefix, count) {
  return Array.from(
    { length: count },
    (_, index) =>
      `${directory}/${prefix}${String(index + 1).padStart(2, "0")}.png`
  );
}

const screens = {
  select: document.querySelector("#select-screen"),
  battle: document.querySelector("#battle-screen"),
  result: document.querySelector("#result-screen")
};

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const joystick = document.querySelector("#joystick");
const joystickKnob = document.querySelector("#joystick-knob");
const skillButton = document.querySelector("#skill-button");
const ultimateButton = document.querySelector("#ultimate-button");

const playerName = document.querySelector("#player-name");
const enemyName = document.querySelector("#enemy-name");
const playerHealthFill = document.querySelector("#player-health-fill");
const enemyHealthFill = document.querySelector("#enemy-health-fill");

const status = document.querySelector("#status");
const resultTitle = document.querySelector("#result-title");

const state = {
  width: innerWidth,
  height: innerHeight,
  dpr: 1,
  lastTime: performance.now(),

  selectedCharacter: "ninja",
  battleRunning: false,

  input: {
    x: 0,
    y: 0,
    pointerId: null
  },

  fighters: {
    player: null,
    enemy: null
  },

  frames: {
    ninja: emptyCharacterFrames(),
    soldier: emptyCharacterFrames(),
    ultimateCharge: [],
    ultimateSlash: [],
    missileLaunch: [],
    missile: [],
    explosion: []
  },

  projectiles: [],
  missiles: [],
  explosions: [],
  effects: []
};

function emptyCharacterFrames() {
  return {
    idle: [],
    walk: [],
    attack: [],
    ultimate: [],
    projectile: []
  };
}

function createFighter(type, x, y, isPlayer) {
  return {
    type,
    isPlayer,
    x,
    y,
    facingX: isPlayer ? 1 : -1,
    facingY: 0,
    moving: false,

    energy: CONFIG.MAX_ENERGY,
    maxEnergy: CONFIG.MAX_ENERGY,

    ultimateGauge: 0,
    maxUltimateGauge: CONFIG.ULTIMATE_GAUGE_MAX,

    mode: "normal",
    attackStartedAt: -Infinity,
    lastBasicAttackAt: -Infinity,
    ultimateStartedAt: -Infinity,
    ultimateHitApplied: false,
    ultimateProjectileSpawned: false,
    ultimatePhase: "none",
    ultimatePhaseStartedAt: -Infinity,
    ultimateOriginX: x,
    ultimateOriginY: y,
    ultimateMissileImpacts: 0,

    nextAiAttackAt: 0,
    dead: false
  };
}

function resize() {
  state.width = innerWidth;
  state.height = innerHeight;
  state.dpr = Math.min(devicePixelRatio || 1, 2);

  canvas.width = Math.round(state.width * state.dpr);
  canvas.height = Math.round(state.height * state.dpr);
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;

  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

addEventListener("resize", resize);
resize();

function findVisibleBounds(image) {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = image.naturalWidth || image.width;
  tempCanvas.height = image.naturalHeight || image.height;

  const tempCtx = tempCanvas.getContext("2d", { willReadFrequently: true });
  tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
  tempCtx.drawImage(image, 0, 0);

  const data = tempCtx.getImageData(
    0,
    0,
    tempCanvas.width,
    tempCanvas.height
  ).data;

  let minX = tempCanvas.width;
  let minY = tempCanvas.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < tempCanvas.height; y += 1) {
    for (let x = 0; x < tempCanvas.width; x += 1) {
      const alpha = data[(y * tempCanvas.width + x) * 4 + 3];

      if (alpha > 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return {
      x: 0,
      y: 0,
      width: tempCanvas.width,
      height: tempCanvas.height
    };
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
}

function loadImage(path) {
  return new Promise(resolve => {
    const image = new Image();

    image.onload = () => {
      try {
        image.visibleBounds = findVisibleBounds(image);
      } catch (error) {
        console.warn("투명 여백 계산 실패:", path, error);
        image.visibleBounds = {
          x: 0,
          y: 0,
          width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height
        };
      }

      resolve(image);
    };

    image.onerror = () => {
      console.error("에셋 로드 실패:", path);
      resolve(null);
    };

    image.src = `${path}?v=6`;
  });
}

async function loadFrames(paths) {
  const images = await Promise.all(paths.map(loadImage));
  return images.filter(Boolean);
}

async function loadAllAssets() {
  for (const type of ["ninja", "soldier"]) {
    const assetSet = ASSETS[type];
    state.frames[type].idle = await loadFrames(assetSet.idle);
    state.frames[type].walk = await loadFrames(assetSet.walk);
    state.frames[type].attack = await loadFrames(assetSet.attack);
    state.frames[type].ultimate = await loadFrames(assetSet.ultimate);
    state.frames[type].projectile = await loadFrames(assetSet.projectile);
  }

  state.frames.ultimateCharge = await loadFrames(ASSETS.ultimateCharge);
  state.frames.ultimateSlash = await loadFrames(ASSETS.ultimateSlash);
  state.frames.missileLaunch = await loadFrames(ASSETS.missileLaunch);
  state.frames.missile = await loadFrames(ASSETS.missile);
  state.frames.explosion = await loadFrames(ASSETS.explosion);

  status.textContent =
    `닌자 ${state.frames.ninja.idle.length}/${state.frames.ninja.attack.length} · ` +
    `군인 ${state.frames.soldier.idle.length}/${state.frames.soldier.attack.length} · ` +
    `미사일 ${state.frames.missile.length} · ` +
    `폭발 ${state.frames.explosion.length}`;
}

function frameAt(frames, elapsed, frameMs, loop = true) {
  if (!frames.length) return null;

  const rawIndex = Math.floor(Math.max(0, elapsed) / frameMs);
  const index = loop
    ? rawIndex % frames.length
    : Math.min(rawIndex, frames.length - 1);

  return frames[index];
}

function worldToScreen(x, y) {
  const player = state.fighters.player;

  return {
    x: state.width / 2 + (x - player.x),
    y: state.height / 2 + (y - player.y)
  };
}

function drawBackground() {
  const tile = CONFIG.TILE_SIZE;
  const player = state.fighters.player;

  const offsetX = ((-player.x % tile) + tile) % tile;
  const offsetY = ((-player.y % tile) + tile) % tile;

  ctx.fillStyle = "#19212d";
  ctx.fillRect(0, 0, state.width, state.height);

  for (let y = -tile; y < state.height + tile; y += tile) {
    for (let x = -tile; x < state.width + tile; x += tile) {
      const worldX = Math.floor((x + player.x) / tile);
      const worldY = Math.floor((y + player.y) / tile);

      ctx.fillStyle =
        (worldX + worldY) % 2 === 0 ? "#2b3644" : "#222b36";

      ctx.fillRect(x + offsetX, y + offsetY, tile, tile);
    }
  }
}

function drawSprite(image, x, y, size, flipX = false, angle = 0, alpha = 1) {
  const bounds = image.visibleBounds || {
    x: 0,
    y: 0,
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height
  };

  const scale = Math.min(size / bounds.width, size / bounds.height);
  const width = bounds.width * scale;
  const height = bounds.height * scale;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;

  if (flipX) {
    ctx.scale(-1, 1);
  }

  ctx.drawImage(
    image,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    -width / 2,
    -height / 2,
    width,
    height
  );

  ctx.restore();
}

// 군인 궁극기 전용 렌더링입니다.
// ultimate01의 보이는 높이로 한 번 정한 스케일을 1~8프레임에 공통 적용합니다.
// 따라서 3프레임 이후 로켓포가 위로 길어져도 군인 몸 크기가 줄어들지 않습니다.
// 궁극기 PNG 8장은 같은 캔버스 크기(권장 150x150)와 같은 정렬을 사용해야 합니다.
function drawSoldierUltimateSprite(
  image,
  referenceImage,
  x,
  y,
  targetHeight,
  flipX = false,
  alpha = 1
) {
  const referenceBounds = referenceImage?.visibleBounds || {
    width: referenceImage?.naturalWidth || referenceImage?.width || 1,
    height: referenceImage?.naturalHeight || referenceImage?.height || 1
  };

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const scale = targetHeight / Math.max(1, referenceBounds.height);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;

  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;

  if (flipX) {
    ctx.scale(-1, 1);
  }

  // 투명 여백을 자르지 않고 150x150 전체 캔버스를 같은 비율로 출력합니다.
  // 각 프레임의 캔버스 정렬이 그대로 유지되어 애니메이션이 흔들리지 않습니다.
  ctx.drawImage(
    image,
    0,
    0,
    sourceWidth,
    sourceHeight,
    -width / 2,
    -height / 2,
    width,
    height
  );

  ctx.restore();
}

function drawFallbackFighter(fighter, x, y) {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = fighter.type === "ninja" ? "#111" : "#44515f";
  ctx.beginPath();
  ctx.arc(0, -14, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = fighter.type === "ninja" ? "#a62934" : "#69788a";
  ctx.fillRect(-24, 10, 48, 32);

  ctx.restore();
}

function getFighterFrame(fighter, now) {
  const set = state.frames[fighter.type];

  if (fighter.mode === "ultimate") {
    if (fighter.type === "soldier") {
      if (fighter.ultimatePhase === "cast") {
        const castFrames = set.ultimate.slice(0, 6);
        return frameAt(
          castFrames,
          now - fighter.ultimatePhaseStartedAt,
          CONFIG.ULTIMATE_FRAME_MS,
          false
        );
      }

      if (fighter.ultimatePhase === "finish") {
        const finishFrames = set.ultimate.slice(6, 8);
        return frameAt(
          finishFrames,
          now - fighter.ultimatePhaseStartedAt,
          CONFIG.ULTIMATE_FRAME_MS,
          false
        );
      }

      // 발사 이펙트와 미사일 낙하 중에는 ultimate06을 유지합니다.
      return set.ultimate[5] || set.ultimate.at(-1) || null;
    }

    return frameAt(
      set.ultimate,
      now - fighter.ultimateStartedAt,
      CONFIG.ULTIMATE_FRAME_MS,
      false
    );
  }

  const attackDuration =
    Math.max(1, set.attack.length || 4) * CONFIG.ATTACK_FRAME_MS;

  if (now - fighter.attackStartedAt < attackDuration) {
    return frameAt(
      set.attack,
      now - fighter.attackStartedAt,
      CONFIG.ATTACK_FRAME_MS,
      false
    );
  }

  if (fighter.moving) {
    return frameAt(set.walk, now, CONFIG.WALK_FRAME_MS, true);
  }

  return frameAt(set.idle, now, CONFIG.IDLE_FRAME_MS, true);
}

function drawFighter(fighter, now) {
  const screen = fighter.isPlayer
    ? { x: state.width / 2, y: state.height / 2 }
    : worldToScreen(fighter.x, fighter.y);

  const image = getFighterFrame(fighter, now);

  if (image) {
    const isSoldierUltimate =
      fighter.type === "soldier" &&
      fighter.mode === "ultimate";

    if (isSoldierUltimate) {
      const referenceFrame =
        state.frames.soldier.ultimate[0] || image;

      drawSoldierUltimateSprite(
        image,
        referenceFrame,
        screen.x,
        screen.y,
        CONFIG.PLAYER_SIZE,
        fighter.facingX < 0
      );
    } else {
      // 다른 모든 캐릭터/모션은 기존 렌더링 방식을 그대로 사용합니다.
      drawSprite(
        image,
        screen.x,
        screen.y,
        CONFIG.PLAYER_SIZE,
        fighter.facingX < 0
      );
    }
  } else {
    drawFallbackFighter(fighter, screen.x, screen.y);
  }

  drawEnergyBar(fighter, screen.x, screen.y);
  drawUltimateGauge(fighter, screen.x, screen.y);
}

function drawEnergyBar(fighter, centerX, centerY) {
  const width = CONFIG.ENERGY_BAR_WIDTH;
  const height = CONFIG.ENERGY_BAR_HEIGHT;

  const x = centerX - width / 2;
  const y = centerY - CONFIG.ENERGY_BAR_OFFSET_Y;

  const ratio = Math.max(
    0,
    Math.min(1, fighter.energy / fighter.maxEnergy)
  );

  const color =
    ratio > 0.5 ? "#42d977" :
    ratio > 0.25 ? "#f1c84c" :
    "#ef5350";

  ctx.save();

  ctx.fillStyle = "rgba(0,0,0,.72)";
  ctx.fillRect(x - 2, y - 2, width + 4, height + 4);

  ctx.fillStyle = "#252b35";
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = color;
  ctx.fillRect(x, y, width * ratio, height);

  ctx.strokeStyle = "rgba(255,255,255,.34)";
  ctx.strokeRect(x + .5, y + .5, width - 1, height - 1);

  ctx.restore();
}

function drawUltimateGauge(fighter, centerX, centerY) {
  const x = centerX;
  const y = centerY - CONFIG.ULTIMATE_GAUGE_OFFSET_Y;
  const radius = CONFIG.ULTIMATE_GAUGE_RADIUS;

  const ratio = Math.max(
    0,
    Math.min(1, fighter.ultimateGauge / fighter.maxUltimateGauge)
  );

  ctx.save();
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,.55)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(
    x,
    y,
    radius - 3,
    -Math.PI / 2,
    -Math.PI / 2 + Math.PI * 2 * ratio
  );
  ctx.strokeStyle = ratio >= 1 ? "#ff6666" : "#d64545";
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 8px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ULT", x, y + 1);

  ctx.restore();
}

function directionTo(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;

  return {
    x: dx / length,
    y: dy / length
  };
}

function useBasicAttack(attacker, now) {
  if (!state.battleRunning || attacker.dead) return;
  if (attacker.mode === "ultimate") return;

  const characterConfig = getCharacterConfig(attacker);

  if (
    now - attacker.lastBasicAttackAt <
    characterConfig.attackCooldownMs
  ) {
    return;
  }

  attacker.lastBasicAttackAt = now;
  attacker.attackStartedAt = now;

  const target = attacker.isPlayer
    ? state.fighters.enemy
    : state.fighters.player;

  let direction;

  if (attacker.isPlayer) {
    // 플레이어 공격은 자동 조준하지 않습니다.
    // 마지막으로 이동한 방향 또는 현재 바라보는 방향으로 발사합니다.
    const length = Math.hypot(
      attacker.facingX,
      attacker.facingY
    ) || 1;

    direction = {
      x: attacker.facingX / length,
      y: attacker.facingY / length
    };
  } else {
    // AI 군인은 플레이어를 향해 조준합니다.
    direction = directionTo(attacker, target);
    attacker.facingX = direction.x;
    attacker.facingY = direction.y;
  }

  const delay = CONFIG.ATTACK_FRAME_MS;

  state.effects.push({
    type: "pending-shot",
    attacker,
    target,
    fireAt: now + delay,
    directionX: direction.x,
    directionY: direction.y
  });
}

function useUltimate(attacker, now) {
  if (!state.battleRunning || attacker.dead) return;
  if (attacker.mode === "ultimate") return;
  if (attacker.ultimateGauge < attacker.maxUltimateGauge) return;

  attacker.mode = "ultimate";
  attacker.ultimateStartedAt = now;
  attacker.ultimateHitApplied = false;
  attacker.ultimateProjectileSpawned = false;
  attacker.ultimatePhase = attacker.type === "soldier" ? "cast" : "active";
  attacker.ultimatePhaseStartedAt = now;
  attacker.ultimateOriginX = attacker.x;
  attacker.ultimateOriginY = attacker.y;
  attacker.ultimateMissileImpacts = 0;
  attacker.ultimateGauge = 0;
  attacker.moving = false;

  if (attacker.isPlayer) {
    resetJoystick();
    joystick.style.pointerEvents = "none";
  }
}

function spawnProjectile(event, now) {
  const attacker = event.attacker;

  const characterConfig = getCharacterConfig(attacker);

  state.projectiles.push({
    owner: attacker,
    target: event.target,
    x: attacker.x,
    y: attacker.y,
    startX: attacker.x,
    startY: attacker.y,
    directionX: event.directionX,
    directionY: event.directionY,
    speed: characterConfig.projectileSpeed,
    rangeTiles: characterConfig.projectileRangeTiles,
    damage: characterConfig.basicDamage,
    createdAt: now,
    dead: false
  });
}

function projectileHits(projectile, fighter) {
  const distance = Math.hypot(
    projectile.x - fighter.x,
    projectile.y - fighter.y
  );

  return distance <= CONFIG.PLAYER_SIZE * 0.42;
}

function applyDamage(attacker, defender, amount) {
  if (defender.dead) return;

  defender.energy = Math.max(0, defender.energy - amount);

  attacker.ultimateGauge = Math.min(
    attacker.maxUltimateGauge,
    attacker.ultimateGauge + CONFIG.ULTIMATE_GAIN_ON_HIT
  );

  if (defender.energy <= 0) {
    defender.dead = true;
    finishBattle(attacker.isPlayer);
  }
}


function spawnSoldierMissileBarrage(attacker, now) {
  const offsets = CONFIG.SOLDIER_MISSILE_IMPACT_OFFSETS;

  offsets.forEach((offsetX, index) => {
    const targetX = attacker.ultimateOriginX + offsetX;
    const targetY = attacker.ultimateOriginY;
    const spawnAt =
      now + index * CONFIG.SOLDIER_MISSILE_INTERVAL_MS;

    state.missiles.push({
      owner: attacker,
      x: targetX,
      y: targetY - CONFIG.SOLDIER_MISSILE_DROP_HEIGHT,
      targetX,
      targetY,
      directionX: 0,
      directionY: 1,
      spawnAt,
      createdAt: spawnAt,
      active: false,
      isUltimateBarrage: true,
      dead: false
    });
  });
}

function createExplosion(missile, now) {
  state.explosions.push({
    owner: missile.owner,
    x: missile.targetX,
    y: missile.targetY,
    createdAt: now,
    damageApplied: false,
    dead: false
  });
}

function updateMissiles(now, deltaSeconds) {
  for (const missile of state.missiles) {
    if (!missile.active) {
      if (now < missile.spawnAt) continue;
      missile.active = true;
      missile.createdAt = now;
    }

    const dx = missile.targetX - missile.x;
    const dy = missile.targetY - missile.y;
    const distance = Math.hypot(dx, dy);
    const moveDistance = CONFIG.MISSILE_SPEED * deltaSeconds;


    if (distance <= moveDistance + 10) {
      missile.x = missile.targetX;
      missile.y = missile.targetY;
      createExplosion(missile, now);
      missile.dead = true;

      if (missile.isUltimateBarrage) {
        missile.owner.ultimateMissileImpacts += 1;

        if (
          missile.owner.mode === "ultimate" &&
          missile.owner.ultimateMissileImpacts >= 3
        ) {
          missile.owner.ultimatePhase = "finish";
          missile.owner.ultimatePhaseStartedAt = now;
        }
      }

      continue;
    }

    missile.directionX = dx / (distance || 1);
    missile.directionY = dy / (distance || 1);
    missile.x += missile.directionX * moveDistance;
    missile.y += missile.directionY * moveDistance;
  }

  state.missiles = state.missiles.filter(
    missile => !missile.dead
  );
}

function updateExplosions(now) {
  const duration =
    Math.max(1, state.frames.explosion.length || 6) *
    CONFIG.EXPLOSION_FRAME_MS;

  for (const explosion of state.explosions) {
    if (!explosion.damageApplied) {
      const target = explosion.owner.isPlayer
        ? state.fighters.enemy
        : state.fighters.player;

      const distance = Math.hypot(
        target.x - explosion.x,
        target.y - explosion.y
      );

      if (
        distance <=
        CONFIG.TILE_SIZE *
        CONFIG.MISSILE_EXPLOSION_RADIUS_TILES
      ) {
        applyDamage(
          explosion.owner,
          target,
          CONFIG.ULTIMATE_DAMAGE
        );
      }

      explosion.damageApplied = true;
    }

    if (now - explosion.createdAt >= duration) {
      explosion.dead = true;


    }
  }

  state.explosions = state.explosions.filter(
    explosion => !explosion.dead
  );
}

function drawMissiles(now) {
  for (const missile of state.missiles) {
    if (!missile.active) continue;

    const screen = worldToScreen(missile.x, missile.y);
    const image = frameAt(
      state.frames.missile,
      now - missile.createdAt,
      CONFIG.EFFECT_FRAME_MS,
      true
    );

    const angle = Math.atan2(
      missile.directionY,
      missile.directionX
    );

    if (image) {
      drawSprite(
        image,
        screen.x,
        screen.y,
        CONFIG.MISSILE_SIZE,
        false,
        angle
      );
    } else {
      ctx.save();
      ctx.translate(screen.x, screen.y);
      ctx.rotate(angle);
      ctx.fillStyle = "#59663a";
      ctx.fillRect(-22, -6, 36, 12);
      ctx.fillStyle = "#d16a32";
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(9, -7);
      ctx.lineTo(9, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawExplosions(now) {
  for (const explosion of state.explosions) {
    const screen = worldToScreen(explosion.x, explosion.y);
    const image = frameAt(
      state.frames.explosion,
      now - explosion.createdAt,
      CONFIG.EXPLOSION_FRAME_MS,
      false
    );

    if (image) {
      drawSprite(
        image,
        screen.x,
        screen.y,
        CONFIG.EXPLOSION_SIZE
      );
    } else {
      const progress = Math.min(
        1,
        (now - explosion.createdAt) / 500
      );

      ctx.save();
      ctx.globalAlpha = 1 - progress;
      ctx.fillStyle =
        progress < 0.45 ? "#fff2a8" : "#ff6b21";
      ctx.beginPath();
      ctx.arc(
        screen.x,
        screen.y,
        24 + progress * 70,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    }
  }
}

function updatePlayer(deltaSeconds) {
  const fighter = state.fighters.player;

  if (!fighter || fighter.dead || fighter.mode === "ultimate") {
    if (fighter) fighter.moving = false;
    return;
  }

  const inputLength = Math.hypot(state.input.x, state.input.y);
  fighter.moving = inputLength > 0.08;

  if (!fighter.moving) return;

  const dx = state.input.x / inputLength;
  const dy = state.input.y / inputLength;

  const moveSpeed = getCharacterConfig(fighter).moveSpeed;

  fighter.x += dx * moveSpeed * deltaSeconds;
  fighter.y += dy * moveSpeed * deltaSeconds;
  fighter.facingX = dx;
  fighter.facingY = dy;
}

function updateEnemyAi(now, deltaSeconds) {
  const enemy = state.fighters.enemy;
  const player = state.fighters.player;

  if (!enemy || enemy.dead || enemy.mode === "ultimate") {
    if (enemy) enemy.moving = false;
    return;
  }

  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const distance = Math.hypot(dx, dy);
  const enemyConfig = getCharacterConfig(enemy);
  const preferred =
    CONFIG.TILE_SIZE *
    CONFIG.AI_PREFERRED_DISTANCE_TILES;

  enemy.facingX = dx / (distance || 1);
  enemy.facingY = dy / (distance || 1);

  if (distance > preferred * 1.15) {
    enemy.moving = true;
    enemy.x +=
      enemy.facingX *
      enemyConfig.moveSpeed *
      0.58 *
      deltaSeconds;

    enemy.y +=
      enemy.facingY *
      enemyConfig.moveSpeed *
      0.58 *
      deltaSeconds;
  } else if (distance < preferred * 0.7) {
    enemy.moving = true;
    enemy.x -=
      enemy.facingX *
      enemyConfig.moveSpeed *
      0.42 *
      deltaSeconds;

    enemy.y -=
      enemy.facingY *
      enemyConfig.moveSpeed *
      0.42 *
      deltaSeconds;
  } else {
    enemy.moving = false;
  }

  if (enemy.ultimateGauge >= enemy.maxUltimateGauge) {
    useUltimate(enemy, now);
    return;
  }

  if (now >= enemy.nextAiAttackAt) {
    useBasicAttack(enemy, now);
    enemy.nextAiAttackAt =
      now + enemyConfig.attackCooldownMs;
  }
}

function updatePendingShots(now) {
  const remaining = [];

  for (const event of state.effects) {
    if (event.type !== "pending-shot") {
      remaining.push(event);
      continue;
    }

    if (now >= event.fireAt) {
      spawnProjectile(event, now);
    } else {
      remaining.push(event);
    }
  }

  state.effects = remaining;
}

function updateProjectiles(deltaSeconds) {
  for (const projectile of state.projectiles) {
    projectile.x +=
      projectile.directionX * projectile.speed * deltaSeconds;

    projectile.y +=
      projectile.directionY * projectile.speed * deltaSeconds;

    if (
      !projectile.dead &&
      projectileHits(projectile, projectile.target)
    ) {
      applyDamage(
        projectile.owner,
        projectile.target,
        projectile.damage
      );
      projectile.dead = true;
    }

    const travelled = Math.hypot(
      projectile.x - projectile.startX,
      projectile.y - projectile.startY
    );

    if (
      travelled >=
      CONFIG.TILE_SIZE * projectile.rangeTiles
    ) {
      projectile.dead = true;
    }
  }

  state.projectiles = state.projectiles.filter(
    projectile => !projectile.dead
  );
}

function getUltimateTimeline(fighter) {
  const frameCount = Math.max(
    8,
    state.frames[fighter.type].ultimate.length || 8
  );

  const characterDuration =
    frameCount * CONFIG.ULTIMATE_FRAME_MS;

  const slashFrameCount = Math.max(
    1,
    state.frames.ultimateSlash.length || 4
  );

  return {
    characterDuration,
    slashDuration:
      slashFrameCount * CONFIG.EFFECT_FRAME_MS
  };
}

function updateUltimate(fighter, now) {
  if (fighter.mode !== "ultimate") return;

  const elapsed = now - fighter.ultimateStartedAt;
  const timeline = getUltimateTimeline(fighter);

  if (fighter.type === "soldier") {
    const castDuration = 6 * CONFIG.ULTIMATE_FRAME_MS;
    const launchFrameCount = Math.max(
      1,
      state.frames.missileLaunch.length || 3
    );
    const launchDuration =
      launchFrameCount * CONFIG.SOLDIER_LAUNCH_FRAME_MS;

    if (
      fighter.ultimatePhase === "cast" &&
      now - fighter.ultimatePhaseStartedAt >= castDuration
    ) {
      fighter.ultimatePhase = "launch";
      fighter.ultimatePhaseStartedAt = now;
      return;
    }

    if (
      fighter.ultimatePhase === "launch" &&
      now - fighter.ultimatePhaseStartedAt >= launchDuration
    ) {
      fighter.ultimatePhase = "strike";
      fighter.ultimatePhaseStartedAt = now;

      if (!fighter.ultimateProjectileSpawned) {
        spawnSoldierMissileBarrage(fighter, now);
        fighter.ultimateProjectileSpawned = true;
      }
      return;
    }

    if (fighter.ultimatePhase === "finish") {
      const finishDuration = 2 * CONFIG.ULTIMATE_FRAME_MS;

      if (
        now - fighter.ultimatePhaseStartedAt >= finishDuration
      ) {
        fighter.mode = "normal";
        fighter.ultimatePhase = "none";

        if (fighter.isPlayer) {
          joystick.style.pointerEvents = "auto";
        }
      }
    }

    return;
  }

  if (
    !fighter.ultimateHitApplied &&
    elapsed >= timeline.characterDuration
  ) {
    const target = fighter.isPlayer
      ? state.fighters.enemy
      : state.fighters.player;

    const distance = Math.hypot(
      target.x - fighter.x,
      target.y - fighter.y
    );

    if (distance <= CONFIG.NINJA_ULTIMATE_RADIUS) {
      applyDamage(
        fighter,
        target,
        CONFIG.ULTIMATE_DAMAGE
      );
    }

    fighter.ultimateHitApplied = true;
  }

  if (
    elapsed >=
    timeline.characterDuration + timeline.slashDuration
  ) {
    fighter.mode = "normal";

    if (fighter.isPlayer) {
      joystick.style.pointerEvents = "auto";
    }
  }
}

function drawProjectiles(now) {
  for (const projectile of state.projectiles) {
    const screen = worldToScreen(projectile.x, projectile.y);

    const frames = state.frames[projectile.owner.type].projectile;
    const image = frameAt(
      frames,
      now - projectile.createdAt,
      CONFIG.EFFECT_FRAME_MS,
      true
    );

    const angle = Math.atan2(
      projectile.directionY,
      projectile.directionX
    );

    if (image) {
      drawSprite(
        image,
        screen.x,
        screen.y,
        CONFIG.PROJECTILE_SIZE,
        false,
        angle
      );
    } else {
      ctx.save();
      ctx.translate(screen.x, screen.y);
      ctx.rotate(angle);
      ctx.fillStyle =
        projectile.owner.type === "ninja" ? "#dfe5ed" : "#ffd166";
      ctx.fillRect(-12, -3, 24, 6);
      ctx.restore();
    }
  }
}

function drawUltimateEffects(fighter, now) {
  if (fighter.mode !== "ultimate") return;

  const screen = fighter.isPlayer
    ? { x: state.width / 2, y: state.height / 2 }
    : worldToScreen(fighter.x, fighter.y);

  if (fighter.type === "soldier") {
    if (fighter.ultimatePhase !== "launch") return;

    const launchElapsed = now - fighter.ultimatePhaseStartedAt;
    const launchImage = frameAt(
      state.frames.missileLaunch,
      launchElapsed,
      CONFIG.SOLDIER_LAUNCH_FRAME_MS,
      false
    );

    // 로켓포 상단 부근. 화면 기준으로 2px 왼쪽 이동합니다.
    // 캐릭터가 왼쪽을 바라보면 launch 에셋도 좌우 반전합니다.
    const facingLeft = fighter.facingX < 0;
    const launchX = screen.x + (facingLeft ? 15 : 11);
    const launchY = screen.y - 95;

    if (launchImage) {
      drawSprite(
        launchImage,
        launchX,
        launchY,
        70,
        facingLeft
      );
    } else {
      const progress = Math.min(1, launchElapsed / 240);
      ctx.save();
      ctx.globalAlpha = 1 - progress * 0.55;
      ctx.fillStyle = progress < 0.45 ? "#fff3ad" : "#ff8a36";
      ctx.beginPath();
      ctx.arc(launchX, launchY, 9 + progress * 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    return;
  }

  if (fighter.type !== "ninja") return;

  const elapsed = now - fighter.ultimateStartedAt;
  const timeline = getUltimateTimeline(fighter);

  if (elapsed < timeline.characterDuration) {
    const charge = frameAt(
      state.frames.ultimateCharge,
      elapsed,
      CONFIG.EFFECT_FRAME_MS,
      true
    );

    if (charge) {
      drawSprite(
        charge,
        screen.x,
        screen.y,
        220,
        false,
        0,
        0.8
      );
    }
  } else {
    const slash = frameAt(
      state.frames.ultimateSlash,
      elapsed - timeline.characterDuration,
      CONFIG.EFFECT_FRAME_MS,
      false
    );

    if (slash) {
      drawSprite(
        slash,
        screen.x,
        screen.y,
        CONFIG.NINJA_ULTIMATE_EFFECT_SIZE,
        false,
        0,
        0.95
      );
    }
  }
}

function updateHud() {
  const player = state.fighters.player;
  const enemy = state.fighters.enemy;

  if (!player || !enemy) return;

  playerHealthFill.style.width =
    `${(player.energy / player.maxEnergy) * 100}%`;

  enemyHealthFill.style.width =
    `${(enemy.energy / enemy.maxEnergy) * 100}%`;

  ultimateButton.disabled =
    player.mode === "ultimate" ||
    player.ultimateGauge < player.maxUltimateGauge;

  ultimateButton.textContent =
    player.mode === "ultimate"
      ? "발동 중"
      : player.ultimateGauge >= player.maxUltimateGauge
        ? "궁극기"
        : `${Math.floor(player.ultimateGauge)}%`;

  skillButton.disabled =
    player.mode === "ultimate" ||
    player.dead;
}

function updateJoystick(clientX, clientY) {
  const fighter = state.fighters.player;

  if (!fighter || fighter.mode === "ultimate") return;

  const rect = joystick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const maxDistance = rect.width * 0.34;

  let dx = clientX - centerX;
  let dy = clientY - centerY;

  const distance = Math.hypot(dx, dy);

  if (distance > maxDistance) {
    dx = dx / distance * maxDistance;
    dy = dy / distance * maxDistance;
  }

  state.input.x = dx / maxDistance;
  state.input.y = dy / maxDistance;

  joystickKnob.style.transform =
    `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

function resetJoystick() {
  state.input.pointerId = null;
  state.input.x = 0;
  state.input.y = 0;
  joystickKnob.style.transform = "translate(-50%, -50%)";
}

joystick.addEventListener("pointerdown", event => {
  if (!state.battleRunning) return;

  state.input.pointerId = event.pointerId;
  joystick.setPointerCapture(event.pointerId);
  updateJoystick(event.clientX, event.clientY);
});

joystick.addEventListener("pointermove", event => {
  if (event.pointerId !== state.input.pointerId) return;
  updateJoystick(event.clientX, event.clientY);
});

joystick.addEventListener("pointerup", resetJoystick);
joystick.addEventListener("pointercancel", resetJoystick);

skillButton.addEventListener("pointerdown", event => {
  event.preventDefault();
  useBasicAttack(state.fighters.player, performance.now());
});

ultimateButton.addEventListener("pointerdown", event => {
  event.preventDefault();
  useUltimate(state.fighters.player, performance.now());
});

function startBattle() {
  const playerType = state.selectedCharacter;
  const enemyType = playerType === "ninja" ? "soldier" : "ninja";

  state.fighters.player = createFighter(
    playerType,
    0,
    0,
    true
  );

  state.fighters.enemy = createFighter(
    enemyType,
    CONFIG.TILE_SIZE * 4,
    0,
    false
  );

  state.projectiles = [];
  state.missiles = [];
  state.explosions = [];
  state.effects = [];
  state.battleRunning = true;

  playerName.textContent =
    playerType === "ninja" ? "닌자" : "군인";

  enemyName.textContent =
    enemyType === "ninja" ? "닌자" : "군인";

  showScreen("battle");
}

function finishBattle(playerWon) {
  if (!state.battleRunning) return;

  state.battleRunning = false;
  resetJoystick();

  resultTitle.textContent =
    playerWon ? "승리!" : "패배";

  setTimeout(() => showScreen("result"), 450);
}

function showScreen(name) {
  for (const [key, screen] of Object.entries(screens)) {
    screen.classList.toggle("is-visible", key === name);
  }
}

document.querySelectorAll(".character-card").forEach(card => {
  card.addEventListener("click", () => {
    document
      .querySelectorAll(".character-card")
      .forEach(item => item.classList.remove("is-selected"));

    card.classList.add("is-selected");
    state.selectedCharacter = card.dataset.character;
  });
});

document
  .querySelector("#start-button")
  .addEventListener("click", startBattle);

document
  .querySelector("#restart-button")
  .addEventListener("click", () => {
    state.battleRunning = false;
    showScreen("select");
  });

function loop(now) {
  const deltaSeconds = Math.min(
    (now - state.lastTime) / 1000,
    0.05
  );

  state.lastTime = now;

  if (state.battleRunning) {
    updatePlayer(deltaSeconds);
    updateEnemyAi(now, deltaSeconds);
    updatePendingShots(now);
    updateProjectiles(deltaSeconds);
    updateMissiles(now, deltaSeconds);
    updateExplosions(now);

    updateUltimate(state.fighters.player, now);
    updateUltimate(state.fighters.enemy, now);

    updateHud();

    ctx.clearRect(0, 0, state.width, state.height);
    drawBackground();

    // 캐릭터 → 일반 투사체/미사일 → 궁극기/폭발 순서로 그립니다.
    drawFighter(state.fighters.enemy, now);
    drawFighter(state.fighters.player, now);
    drawProjectiles(now);
    drawMissiles(now);

    drawUltimateEffects(state.fighters.enemy, now);
    drawUltimateEffects(state.fighters.player, now);
    drawExplosions(now);
  }

  requestAnimationFrame(loop);
}

loadAllAssets().finally(() => {
  requestAnimationFrame(loop);
});
