"use strict";

const CONFIG = {
  PLAYER_SIZE: 96,
  TILE_SIZE: 64,
  MOVE_SPEED: 220,

  IDLE_FRAME_MS: 150,
  WALK_FRAME_MS: 100,
  SKILL_FRAME_MS: 90,

  SHURIKEN_FRAME_MS: 55,
  SHURIKEN_SPEED: 720,
  SHURIKEN_RANGE_TILES: 5,
  SHURIKEN_SIZE: 34,

  ENEMY_SIZE: 72
};

const ASSETS = {
  idle: [
    "assets/ninja/idle/idle01.png",
    "assets/ninja/idle/idle02.png",
    "assets/ninja/idle/idle03.png",
    "assets/ninja/idle/idle04.png"
  ],
  walk: [
    "assets/ninja/walk/walk01.png",
    "assets/ninja/walk/walk02.png",
    "assets/ninja/walk/walk03.png",
    "assets/ninja/walk/walk04.png"
  ],
  skill: [
    "assets/ninja/skill/skill01.png",
    "assets/ninja/skill/skill02.png",
    "assets/ninja/skill/skill03.png",
    "assets/ninja/skill/skill04.png"
  ],
  shuriken: [
    "assets/shuriken/shuriken01.png",
    "assets/shuriken/shuriken02.png",
    "assets/shuriken/shuriken03.png",
    "assets/shuriken/shuriken04.png"
  ]
};

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const joystick = document.querySelector("#joystick");
const knob = document.querySelector("#joystick-knob");
const skillButton = document.querySelector("#skill-button");
const status = document.querySelector("#status");

const state = {
  width: innerWidth,
  height: innerHeight,
  dpr: 1,
  lastTime: performance.now(),

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
    pointerId: null
  },

  frames: {
    idle: [],
    walk: [],
    skill: [],
    shuriken: []
  },

  pendingShots: [],
  projectiles: [],

  enemy: {
    x: CONFIG.TILE_SIZE * 4,
    y: 0,
    energy: 3,
    maxEnergy: 3
  }
};

function resize() {
  state.width = innerWidth;
  state.height = innerHeight;
  state.dpr = Math.min(devicePixelRatio || 1, 2);

  canvas.width = Math.round(state.width * state.dpr);
  canvas.height = Math.round(state.height * state.dpr);
  canvas.style.width = state.width + "px";
  canvas.style.height = state.height + "px";

  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

addEventListener("resize", resize);
resize();

function loadImage(path) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = path;
  });
}

async function loadFrames(paths) {
  const images = await Promise.all(paths.map(loadImage));
  return images.filter(Boolean);
}

async function loadAllAssets() {
  const [idle, walk, skill, shuriken] = await Promise.all([
    loadFrames(ASSETS.idle),
    loadFrames(ASSETS.walk),
    loadFrames(ASSETS.skill),
    loadFrames(ASSETS.shuriken)
  ]);

  state.frames.idle = idle;
  state.frames.walk = walk;
  state.frames.skill = skill;
  state.frames.shuriken = shuriken;

  status.textContent =
    `idle ${idle.length} · walk ${walk.length} · skill ${skill.length} · 수리검 ${shuriken.length}`;
}

function getFrame(frames, elapsed, frameMs, loop = true) {
  if (!frames.length) return null;

  const raw = Math.floor(Math.max(0, elapsed) / frameMs);
  const index = loop
    ? raw % frames.length
    : Math.min(raw, frames.length - 1);

  return frames[index];
}

function drawBackground() {
  const tile = CONFIG.TILE_SIZE;
  const offsetX = ((-state.player.x % tile) + tile) % tile;
  const offsetY = ((-state.player.y % tile) + tile) % tile;

  ctx.fillStyle = "#1b2330";
  ctx.fillRect(0, 0, state.width, state.height);

  for (let y = -tile; y < state.height + tile; y += tile) {
    for (let x = -tile; x < state.width + tile; x += tile) {
      const worldX = Math.floor((x + state.player.x) / tile);
      const worldY = Math.floor((y + state.player.y) / tile);

      ctx.fillStyle = (worldX + worldY) % 2 === 0 ? "#2b3644" : "#222b36";
      ctx.fillRect(x + offsetX, y + offsetY, tile, tile);
    }
  }
}

function drawSprite(image, centerX, centerY, size, flipX = false) {
  const scale = Math.min(size / image.width, size / image.height);
  const width = image.width * scale;
  const height = image.height * scale;

  ctx.save();
  ctx.translate(centerX, centerY);

  if (flipX) ctx.scale(-1, 1);

  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  ctx.restore();
}

function drawFallbackPlayer() {
  const cx = state.width / 2;
  const cy = state.height / 2;

  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(cx, cy - 12, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#b22";
  ctx.fillRect(cx - 24, cy + 10, 48, 30);
}

function drawPlayer(now) {
  const skillFrameCount = state.frames.skill.length || 4;
  const skillDuration = skillFrameCount * CONFIG.SKILL_FRAME_MS;
  const isSkill = now - state.player.skillStartedAt < skillDuration;

  let image = null;

  if (isSkill) {
    image = getFrame(
      state.frames.skill,
      now - state.player.skillStartedAt,
      CONFIG.SKILL_FRAME_MS,
      false
    );
  } else if (state.player.moving) {
    image = getFrame(
      state.frames.walk,
      now,
      CONFIG.WALK_FRAME_MS,
      true
    );
  } else {
    image = getFrame(
      state.frames.idle,
      now,
      CONFIG.IDLE_FRAME_MS,
      true
    );
  }

  if (image) {
    drawSprite(
      image,
      state.width / 2,
      state.height / 2,
      CONFIG.PLAYER_SIZE,
      state.player.facingX < 0
    );
  } else {
    drawFallbackPlayer();
  }
}

function worldToScreen(x, y) {
  return {
    x: state.width / 2 + x - state.player.x,
    y: state.height / 2 + y - state.player.y
  };
}

function drawEnemy() {
  if (state.enemy.energy <= 0) return;

  const p = worldToScreen(state.enemy.x, state.enemy.y);
  const size = CONFIG.ENEMY_SIZE;

  ctx.fillStyle = "#a44";
  ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);

  ctx.fillStyle = "#111";
  ctx.fillRect(p.x - size / 2, p.y - size / 2 - 14, size, 8);

  ctx.fillStyle = "#55d06f";
  ctx.fillRect(
    p.x - size / 2,
    p.y - size / 2 - 14,
    size * (state.enemy.energy / state.enemy.maxEnergy),
    8
  );
}

function drawProjectiles(now) {
  for (const projectile of state.projectiles) {
    const p = worldToScreen(projectile.x, projectile.y);
    const image = getFrame(
      state.frames.shuriken,
      now - projectile.createdAt,
      CONFIG.SHURIKEN_FRAME_MS,
      true
    );

    if (image) {
      drawSprite(image, p.x, p.y, CONFIG.SHURIKEN_SIZE);
    } else {
      ctx.fillStyle = "#ddd";
      ctx.fillRect(p.x - 12, p.y - 3, 24, 6);
      ctx.fillRect(p.x - 3, p.y - 12, 6, 24);
    }
  }
}

function fireSkill(now) {
  const length = Math.hypot(state.player.facingX, state.player.facingY) || 1;

  state.player.skillStartedAt = now;

  state.pendingShots.push({
    fireAt: now + CONFIG.SKILL_FRAME_MS,
    directionX: state.player.facingX / length,
    directionY: state.player.facingY / length
  });
}

skillButton.addEventListener("pointerdown", event => {
  event.preventDefault();
  fireSkill(performance.now());
});

function updateJoystick(clientX, clientY) {
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

  knob.style.transform =
    `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

function resetJoystick() {
  state.input.pointerId = null;
  state.input.x = 0;
  state.input.y = 0;
  knob.style.transform = "translate(-50%, -50%)";
}

joystick.addEventListener("pointerdown", event => {
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

function updatePlayer(deltaSeconds) {
  const length = Math.hypot(state.input.x, state.input.y);
  state.player.moving = length > 0.08;

  if (!state.player.moving) return;

  const dx = state.input.x / length;
  const dy = state.input.y / length;

  state.player.x += dx * CONFIG.MOVE_SPEED * deltaSeconds;
  state.player.y += dy * CONFIG.MOVE_SPEED * deltaSeconds;
  state.player.facingX = dx;
  state.player.facingY = dy;
}

function updatePendingShots(now) {
  const remaining = [];

  for (const pending of state.pendingShots) {
    if (now < pending.fireAt) {
      remaining.push(pending);
      continue;
    }

    state.projectiles.push({
      x: state.player.x,
      y: state.player.y,
      startX: state.player.x,
      startY: state.player.y,
      directionX: pending.directionX,
      directionY: pending.directionY,
      createdAt: now,
      dead: false
    });
  }

  state.pendingShots = remaining;
}

function updateProjectiles(deltaSeconds) {
  for (const projectile of state.projectiles) {
    projectile.x += projectile.directionX * CONFIG.SHURIKEN_SPEED * deltaSeconds;
    projectile.y += projectile.directionY * CONFIG.SHURIKEN_SPEED * deltaSeconds;

    const enemyDistance = Math.hypot(
      projectile.x - state.enemy.x,
      projectile.y - state.enemy.y
    );

    if (
      !projectile.dead &&
      state.enemy.energy > 0 &&
      enemyDistance < (CONFIG.ENEMY_SIZE + CONFIG.SHURIKEN_SIZE) * 0.35
    ) {
      state.enemy.energy = Math.max(0, state.enemy.energy - 1);
      projectile.dead = true;
    }

    const travelled = Math.hypot(
      projectile.x - projectile.startX,
      projectile.y - projectile.startY
    );

    if (travelled >= CONFIG.TILE_SIZE * CONFIG.SHURIKEN_RANGE_TILES) {
      projectile.dead = true;
    }
  }

  state.projectiles = state.projectiles.filter(projectile => !projectile.dead);
}

function loop(now) {
  const deltaSeconds = Math.min((now - state.lastTime) / 1000, 0.05);
  state.lastTime = now;

  updatePlayer(deltaSeconds);
  updatePendingShots(now);
  updateProjectiles(deltaSeconds);

  ctx.clearRect(0, 0, state.width, state.height);
  drawBackground();
  drawEnemy();
  drawProjectiles(now);
  drawPlayer(now);

  requestAnimationFrame(loop);
}

loadAllAssets().finally(() => requestAnimationFrame(loop));
