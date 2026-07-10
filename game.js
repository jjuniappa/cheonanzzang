const game = document.querySelector("#game");
const actor = document.querySelector("#actor");
const ninja = document.querySelector("#ninja");
const joystick = document.querySelector("#joystick");
const joystickKnob = document.querySelector("#joystickKnob");
const shurikenButton = document.querySelector("#shurikenButton");

// 각 폴더에 01.png ~ 04.png를 넣으면 자동으로 해당 모션에 사용됩니다.
const FRAME_COUNT = 4;
const animations = {
  idle: createFramePaths("idle"),
  walk: createFramePaths("walk"),
  skill: createFramePaths("skill"),
};

const FRAME_MS = {
  idle: 140,
  walk: 95,
  skill: 85,
};

const WORLD_SCROLL_SPEED = 145;
const DEAD_ZONE = 0.12;
const SKILL_COOLDOWN_MS = 650;

let animationName = "idle";
let frameIndex = 0;
let frameElapsed = 0;
let lastTime = performance.now();
let skillActive = false;
let skillLocked = false;
let cooldownTimer = 0;
let activePointerId = null;
let inputX = 0;
let inputY = 0;
let worldX = 0;
let worldY = 0;

function createFramePaths(folder) {
  return Array.from({ length: FRAME_COUNT }, (_, index) => {
    const fileName = String(index + 1).padStart(2, "0");
    return `./assets/ninja/${folder}/${fileName}.png`;
  });
}

function preloadFrames() {
  Object.values(animations).flat().forEach((src) => {
    const image = new Image();
    image.src = src;
  });
}

function showFrame(src) {
  // walk/skill 에셋이 아직 없을 때 깨진 이미지 대신 idle 01을 표시합니다.
  ninja.onerror = () => {
    ninja.onerror = null;
    ninja.src = animations.idle[0];
  };
  ninja.src = src;
}

function setAnimation(nextName, force = false) {
  if (!force && animationName === nextName) return;

  animationName = nextName;
  frameIndex = 0;
  frameElapsed = 0;
  showFrame(animations[nextName][0]);

  actor.classList.toggle("is-walking", nextName === "walk");
  actor.classList.toggle("is-using-skill", nextName === "skill");
}

function updateJoystick(clientX, clientY) {
  const rect = joystick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const maxRadius = rect.width * 0.31;

  let dx = clientX - centerX;
  let dy = clientY - centerY;
  const distance = Math.hypot(dx, dy);

  if (distance > maxRadius) {
    const ratio = maxRadius / distance;
    dx *= ratio;
    dy *= ratio;
  }

  inputX = dx / maxRadius;
  inputY = dy / maxRadius;
  joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

function resetJoystick() {
  activePointerId = null;
  inputX = 0;
  inputY = 0;
  joystickKnob.style.transform = "translate(-50%, -50%)";
}

joystick.addEventListener("pointerdown", (event) => {
  activePointerId = event.pointerId;
  joystick.setPointerCapture(event.pointerId);
  updateJoystick(event.clientX, event.clientY);
  event.preventDefault();
});

joystick.addEventListener("pointermove", (event) => {
  if (event.pointerId !== activePointerId) return;
  updateJoystick(event.clientX, event.clientY);
  event.preventDefault();
});

["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => {
  joystick.addEventListener(type, (event) => {
    if (activePointerId !== null && event.pointerId !== activePointerId) return;
    resetJoystick();
  });
});

function useShurikenSkill(event) {
  event?.preventDefault();
  if (skillLocked || skillActive) return;

  skillActive = true;
  skillLocked = true;
  cooldownTimer = SKILL_COOLDOWN_MS;
  shurikenButton.classList.add("is-active");
  shurikenButton.setAttribute("aria-pressed", "true");
  setAnimation("skill", true);
}

shurikenButton.addEventListener("pointerdown", useShurikenSkill);
shurikenButton.addEventListener("contextmenu", (event) => event.preventDefault());

function finishSkill(isMoving) {
  skillActive = false;
  shurikenButton.setAttribute("aria-pressed", "false");
  actor.classList.remove("is-using-skill");
  setAnimation(isMoving ? "walk" : "idle", true);
}

function updateAnimation(deltaMs, isMoving) {
  frameElapsed += deltaMs;
  const frameDuration = FRAME_MS[animationName];

  while (frameElapsed >= frameDuration) {
    frameElapsed -= frameDuration;
    frameIndex += 1;

    // skill은 4프레임을 한 번만 재생합니다.
    if (animationName === "skill" && frameIndex >= animations.skill.length) {
      finishSkill(isMoving);
      return;
    }

    frameIndex %= animations[animationName].length;
    showFrame(animations[animationName][frameIndex]);
  }
}

function gameLoop(now) {
  const deltaSeconds = Math.min((now - lastTime) / 1000, 0.05);
  const deltaMs = deltaSeconds * 1000;
  lastTime = now;

  const strength = Math.hypot(inputX, inputY);
  const isMoving = strength > DEAD_ZONE;

  if (isMoving) {
    const normalizedStrength = Math.min(strength, 1);
    const directionX = inputX / strength;
    const directionY = inputY / strength;

    worldX -= directionX * WORLD_SCROLL_SPEED * normalizedStrength * deltaSeconds;
    worldY -= directionY * WORLD_SCROLL_SPEED * normalizedStrength * deltaSeconds;
    game.style.setProperty("--world-x", `${worldX}px`);
    game.style.setProperty("--world-y", `${worldY}px`);
    actor.classList.toggle("face-left", directionX < -0.05);
  }

  if (!skillActive) {
    setAnimation(isMoving ? "walk" : "idle");
  }

  if (skillLocked) {
    cooldownTimer -= deltaMs;
    if (cooldownTimer <= 0) {
      skillLocked = false;
      shurikenButton.classList.remove("is-active");
    }
  }

  updateAnimation(deltaMs, isMoving);
  requestAnimationFrame(gameLoop);
}

document.addEventListener("visibilitychange", () => {
  lastTime = performance.now();
  if (document.hidden) resetJoystick();
});

preloadFrames();
setAnimation("idle", true);
requestAnimationFrame(gameLoop);
