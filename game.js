"use strict";

const CONFIG = Object.freeze({
  // 모든 닌자 모션이 동일한 표시 크기를 사용합니다.
  PLAYER_SIZE: 96,

  TILE_SIZE: 64,
  MOVE_SPEED: 230,

  IDLE_FRAME_MS: 150,
  WALK_FRAME_MS: 100,
  SKILL_FRAME_MS: 90,
  SHURIKEN_FRAME_MS: 55,

  // 수리검은 정확히 5칸 이동한 뒤 사라집니다.
  SHURIKEN_RANGE_TILES: 5,
  SHURIKEN_SPEED: 720,
  SHURIKEN_SIZE: 34,

  ENEMY_SIZE: 72,
  ENEMY_START_ENERGY: 3,

  // 0이면 재사용 대기시간이 없습니다. 누르는 횟수만큼 발사 예약됩니다.
  SKILL_COOLDOWN_MS: 0,
  MAX_PROJECTILES: 40
});

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const joystick = document.querySelector("#joystick");
const joystickKnob = document.querySelector("#joystick-knob");
const skillButton = document.querySelector("#skill-button");
const assetStatus = document.querySelector("#asset-status");

const state = {
  width: 0,
  height: 0,
  dpr: 1,
  lastTime: performance.now(),

  // 플레이어의 월드 좌표. 화면에서는 항상 중앙에 그립니다.
  player: {
    x: 0,
    y: 0,
    facingX: 1,
    facingY: 0,
    moving: false,
    skillStartedAt: -Infinity
  },

  input: {
    x: 0,
    y: 0,
    activePointerId: null
  },

  projectiles: [],
  pendingShots: [],

  enemies: [
    {
      id: 1,
      // 시작 시 플레이어 오른쪽 4칸에 배치하여 테스트할 수 있습니다.
      x: CONFIG.TILE_SIZE * 4,
      y: 0,
      energy: CONFIG.ENEMY_START_ENERGY,
      maxEnergy: CONFIG.ENEMY_START_ENERGY,
      hitFlashUntil: 0
    }
  ],

  assets: {
    idle: [],
    walk: [],
    skill: [],
    shuriken: []
  }
};

function resize() {
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  state.width = window.innerWidth;
  state.height = window.innerHeight;

  canvas.width = Math.round(state.width * state.dpr);
  canvas.height = Math.round(state.height * state.dpr);
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;

  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

window.addEventListener("resize", resize, { passive: true });
resize();

function loadImage(path) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => {
      console.warn(`에셋을 불러오지 못했습니다: ${path}`);
      resolve(null);
    };
    image.src = path;
  });
}

async function loadFrames(folder, fileNames) {
  const images = await Promise.all(
    fileNames.map((fileName) => loadImage(`${folder}/${fileName}`))
  );
  return images.filter(Boolean);
}

async function loadAssets() {
  const manifest = window.ASSET_MANIFEST || {};
  const ninja = manifest.ninja || {};

  const [idle, walk, skill, shuriken] = await Promise.all([
    loadFrames("assets/ninja/idle", ninja.idle || []),
    loadFrames("assets/ninja/walk", ninja.walk || []),
    loadFrames("assets/ninja/skill", ninja.skill || []),
    loadFrames("assets/shuriken", manifest.shuriken || [])
  ]);

  state.assets.idle = idle;
  state.assets.walk = walk;
  state.assets.skill = skill;
  state.assets.shuriken = shuriken;

  const loadedCount = idle.length + walk.length + skill.length + shuriken.length;
  assetStatus.textContent = loadedCount
    ? `에셋 ${loadedCount}개 로드됨`
    : "에셋 미등록: 도형으로 동작 테스트 중";
}

function frameAt(frames, elapsedMs, frameMs, loop = true) {
  if (!frames.length) return null;
  const rawIndex = Math.floor(Math.max(0, elapsedMs) / frameMs);
  const index = loop
    ? rawIndex % frames.length
    : Math.min(rawIndex, frames.length - 1);
  return frames[index];
}

function drawCheckerBackground() {
  const tile = CONFIG.TILE_SIZE;
  const cameraX = state.player.x;
  const cameraY = state.player.y;

  const offsetX = ((-cameraX % tile) + tile) % tile;
  const offsetY = ((-cameraY % tile) + tile) % tile;

  ctx.fillStyle = "#1a2029";
  ctx.fillRect(0, 0, state.width, state.height);

  const startColumn = -1;
  const endColumn = Math.ceil(state.width / tile) + 1;
  const startRow = -1;
  const endRow = Math.ceil(state.height / tile) + 1;

  for (let row = startRow; row <= endRow; row += 1) {
    for (let column = startColumn; column <= endColumn; column += 1) {
      const worldColumn = Math.floor(cameraX / tile) + column;
      const worldRow = Math.floor(cameraY / tile) + row;

      ctx.fillStyle = (worldColumn + worldRow) % 2 === 0
        ? "#27303c"
        : "#202833";

      ctx.fillRect(
        offsetX + column * tile,
        offsetY + row * tile,
        tile,
        tile
      );
    }
  }

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;

  for (let x = offsetX; x < state.width + tile; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, state.height);
    ctx.stroke();
  }

  for (let y = offsetY; y < state.height + tile; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(state.width, y);
    ctx.stroke();
  }
}

function worldToScreen(worldX, worldY) {
  return {
    x: state.width / 2 + (worldX - state.player.x),
    y: state.height / 2 + (worldY - state.player.y)
  };
}

function drawPlayer(now) {
  const player = state.player;
  const centerX = state.width / 2;
  const centerY = state.height / 2;

  const skillFrames = state.assets.skill;
  const skillDuration = Math.max(1, skillFrames.length || 4) * CONFIG.SKILL_FRAME_MS;
  const isUsingSkill = now - player.skillStartedAt < skillDuration;

  let frame = null;

  if (isUsingSkill) {
    frame = frameAt(
      skillFrames,
      now - player.skillStartedAt,
      CONFIG.SKILL_FRAME_MS,
      false
    );
  } else if (player.moving) {
    frame = frameAt(
      state.assets.walk,
      now,
      CONFIG.WALK_FRAME_MS,
      true
    );
  } else {
    frame = frameAt(
      state.assets.idle,
      now,
      CONFIG.IDLE_FRAME_MS,
      true
    );
  }

  ctx.save();
  ctx.translate(centerX, centerY);

  // 좌우 방향만 이미지 반전. 세로 방향은 발사 벡터에만 사용합니다.
  if (player.facingX < -0.01) {
    ctx.scale(-1, 1);
  }

  if (frame) {
    // 원본 이미지 비율을 유지하며 PLAYER_SIZE 안에 맞춥니다.
    const scale = Math.min(
      CONFIG.PLAYER_SIZE / frame.width,
      CONFIG.PLAYER_SIZE / frame.height
    );
    const width = frame.width * scale;
    const height = frame.height * scale;

    ctx.drawImage(frame, -width / 2, -height / 2, width, height);
  } else {
    drawFallbackNinja(isUsingSkill, player.moving);
  }

  ctx.restore();
}

function drawFallbackNinja(isUsingSkill, isMoving) {
  const bob = isMoving ? Math.sin(performance.now() / 70) * 3 : 0;

  ctx.translate(0, bob);
  ctx.fillStyle = "#11151b";
  ctx.beginPath();
  ctx.arc(0, -12, 25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#202732";
  ctx.fillRect(-26, 10, 52, 34);

  ctx.fillStyle = "#d8b28b";
  ctx.fillRect(-14, -18, 28, 10);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-9, -15, 5, 3);
  ctx.fillRect(5, -15, 5, 3);

  ctx.strokeStyle = "#d8b28b";
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(18, 18);
  ctx.lineTo(isUsingSkill ? 44 : 27, isUsingSkill ? 5 : 28);
  ctx.stroke();
}

function drawEnemy(enemy, now) {
  if (enemy.energy <= 0) return;

  const screen = worldToScreen(enemy.x, enemy.y);
  const half = CONFIG.ENEMY_SIZE / 2;

  if (
    screen.x < -CONFIG.ENEMY_SIZE ||
    screen.x > state.width + CONFIG.ENEMY_SIZE ||
    screen.y < -CONFIG.ENEMY_SIZE ||
    screen.y > state.height + CONFIG.ENEMY_SIZE
  ) {
    return;
  }

  ctx.save();
  ctx.translate(screen.x, screen.y);

  ctx.fillStyle = now < enemy.hitFlashUntil ? "#ffffff" : "#a84848";
  ctx.fillRect(-half, -half, CONFIG.ENEMY_SIZE, CONFIG.ENEMY_SIZE);

  ctx.fillStyle = "#111";
  ctx.fillRect(-half, -half - 15, CONFIG.ENEMY_SIZE, 9);

  ctx.fillStyle = "#57d06f";
  ctx.fillRect(
    -half + 1,
    -half - 14,
    (CONFIG.ENEMY_SIZE - 2) * (enemy.energy / enemy.maxEnergy),
    7
  );

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "bold 13px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(`ENERGY ${enemy.energy}`, 0, half + 20);

  ctx.restore();
}

function drawProjectile(projectile, now) {
  const screen = worldToScreen(projectile.x, projectile.y);
  const frame = frameAt(
    state.assets.shuriken,
    now - projectile.createdAt,
    CONFIG.SHURIKEN_FRAME_MS,
    true
  );

  ctx.save();
  ctx.translate(screen.x, screen.y);

  if (frame) {
    const scale = Math.min(
      CONFIG.SHURIKEN_SIZE / frame.width,
      CONFIG.SHURIKEN_SIZE / frame.height
    );
    const width = frame.width * scale;
    const height = frame.height * scale;
    ctx.drawImage(frame, -width / 2, -height / 2, width, height);
  } else {
    // 에셋이 없을 때만 충돌/사거리 테스트용 십자 도형을 표시합니다.
    ctx.fillStyle = "#dce3ee";
    ctx.fillRect(-14, -3, 28, 6);
    ctx.fillRect(-3, -14, 6, 28);
    ctx.fillStyle = "#77869b";
    ctx.fillRect(-5, -5, 10, 10);
  }

  ctx.restore();
}

function scheduleShot(now) {
  if (state.projectiles.length + state.pendingShots.length >= CONFIG.MAX_PROJECTILES) {
    return;
  }

  // 버튼을 누른 시점의 방향을 저장합니다.
  const directionLength = Math.hypot(
    state.player.facingX,
    state.player.facingY
  ) || 1;

  state.pendingShots.push({
    fireAt: now + CONFIG.SKILL_FRAME_MS, // skill 애니메이션 2번째 프레임
    directionX: state.player.facingX / directionLength,
    directionY: state.player.facingY / directionLength
  });

  // 연타할 때마다 스킬 애니메이션을 처음부터 다시 보여 줍니다.
  state.player.skillStartedAt = now;
}

function spawnShot(shot, now) {
  const muzzleDistance = CONFIG.PLAYER_SIZE * 0.42;

  state.projectiles.push({
    x: state.player.x + shot.directionX * muzzleDistance,
    y: state.player.y + shot.directionY * muzzleDistance,
    startX: state.player.x,
    startY: state.player.y,
    directionX: shot.directionX,
    directionY: shot.directionY,
    createdAt: now,
    maxDistance: CONFIG.TILE_SIZE * CONFIG.SHURIKEN_RANGE_TILES,
    dead: false
  });
}

function processPendingShots(now) {
  const remaining = [];

  for (const shot of state.pendingShots) {
    if (now >= shot.fireAt) {
      spawnShot(shot, now);
    } else {
      remaining.push(shot);
    }
  }

  state.pendingShots = remaining;
}

function updatePlayer(deltaSeconds) {
  const inputLength = Math.hypot(state.input.x, state.input.y);
  state.player.moving = inputLength > 0.08;

  if (!state.player.moving) return;

  const directionX = state.input.x / inputLength;
  const directionY = state.input.y / inputLength;

  state.player.x += directionX * CONFIG.MOVE_SPEED * deltaSeconds;
  state.player.y += directionY * CONFIG.MOVE_SPEED * deltaSeconds;
  state.player.facingX = directionX;
  state.player.facingY = directionY;
}

function projectileHitsEnemy(projectile, enemy) {
  if (enemy.energy <= 0) return false;

  const dx = projectile.x - enemy.x;
  const dy = projectile.y - enemy.y;
  const hitRadius = (CONFIG.SHURIKEN_SIZE + CONFIG.ENEMY_SIZE) * 0.36;

  return dx * dx + dy * dy <= hitRadius * hitRadius;
}

function updateProjectiles(deltaSeconds, now) {
  for (const projectile of state.projectiles) {
    projectile.x += projectile.directionX * CONFIG.SHURIKEN_SPEED * deltaSeconds;
    projectile.y += projectile.directionY * CONFIG.SHURIKEN_SPEED * deltaSeconds;

    for (const enemy of state.enemies) {
      if (projectileHitsEnemy(projectile, enemy)) {
        enemy.energy = Math.max(0, enemy.energy - 1);
        enemy.hitFlashUntil = now + 110;
        projectile.dead = true;
        break;
      }
    }

    const travelled = Math.hypot(
      projectile.x - projectile.startX,
      projectile.y - projectile.startY
    );

    if (travelled >= projectile.maxDistance) {
      projectile.dead = true;
    }
  }

  state.projectiles = state.projectiles.filter((projectile) => !projectile.dead);
}

function updateJoystick(clientX, clientY) {
  const rect = joystick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const maxDistance = rect.width * 0.34;

  let dx = clientX - centerX;
  let dy = clientY - centerY;
  const distance = Math.hypot(dx, dy);

  if (distance > maxDistance) {
    dx = (dx / distance) * maxDistance;
    dy = (dy / distance) * maxDistance;
  }

  joystickKnob.style.transform =
    `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

  state.input.x = dx / maxDistance;
  state.input.y = dy / maxDistance;
}

function resetJoystick() {
  state.input.activePointerId = null;
  state.input.x = 0;
  state.input.y = 0;
  joystickKnob.style.transform = "translate(-50%, -50%)";
}

joystick.addEventListener("pointerdown", (event) => {
  state.input.activePointerId = event.pointerId;
  joystick.setPointerCapture(event.pointerId);
  updateJoystick(event.clientX, event.clientY);
});

joystick.addEventListener("pointermove", (event) => {
  if (event.pointerId !== state.input.activePointerId) return;
  updateJoystick(event.clientX, event.clientY);
});

joystick.addEventListener("pointerup", (event) => {
  if (event.pointerId === state.input.activePointerId) resetJoystick();
});

joystick.addEventListener("pointercancel", resetJoystick);

let lastSkillPressAt = -Infinity;

skillButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();

  const now = performance.now();
  if (now - lastSkillPressAt < CONFIG.SKILL_COOLDOWN_MS) return;

  lastSkillPressAt = now;
  skillButton.classList.add("is-pressed");
  scheduleShot(now);
});

for (const eventName of ["pointerup", "pointercancel", "pointerleave"]) {
  skillButton.addEventListener(eventName, () => {
    skillButton.classList.remove("is-pressed");
  });
}

function update(now) {
  const deltaSeconds = Math.min((now - state.lastTime) / 1000, 0.05);
  state.lastTime = now;

  updatePlayer(deltaSeconds);
  processPendingShots(now);
  updateProjectiles(deltaSeconds, now);
}

function draw(now) {
  ctx.clearRect(0, 0, state.width, state.height);
  drawCheckerBackground();

  for (const enemy of state.enemies) {
    drawEnemy(enemy, now);
  }

  for (const projectile of state.projectiles) {
    drawProjectile(projectile, now);
  }

  drawPlayer(now);
}

function loop(now) {
  update(now);
  draw(now);
  requestAnimationFrame(loop);
}

loadAssets().finally(() => {
  requestAnimationFrame(loop);
});
