const game = document.querySelector("#game");
const actor = document.querySelector("#actor");
const ninja = document.querySelector("#ninja");
const joystick = document.querySelector("#joystick");
const joystickKnob = document.querySelector("#joystickKnob");
const shurikenButton = document.querySelector("#shurikenButton");

const animations = {
  idle: [1, 2, 3, 4].map((n) => `./assets/ninja/idle/0${n}.png`),
  walk: [1, 2, 3, 4].map((n) => `./assets/ninja/walk/0${n}.png`),
};

const IDLE_FRAME_MS = 140;
const WALK_FRAME_MS = 95;
const WORLD_SCROLL_SPEED = 145; // 배경 이동 속도(px/s)
const DEAD_ZONE = 0.12;
const SKILL_COOLDOWN = 360;

let animationName = "idle";
let frameIndex = 0;
let frameElapsed = 0;
let lastTime = performance.now();
let skillLocked = false;
let activePointerId = null;
let inputX = 0;
let inputY = 0;
let worldX = 0;
let worldY = 0;

function preloadFrames() {
  Object.values(animations).flat().forEach((src) => {
    const image = new Image();
    image.src = src;
  });
}

function setAnimation(nextName) {
  if (animationName === nextName) return;
  animationName = nextName;
  frameIndex = 0;
  frameElapsed = 0;
  ninja.src = animations[animationName][0];
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

function useShurikenSkill() {
  if (skillLocked) return;
  skillLocked = true;
  actor.classList.remove("is-throwing");
  shurikenButton.classList.add("is-active");
  void actor.offsetWidth;
  actor.classList.add("is-throwing");

  window.setTimeout(() => {
    actor.classList.remove("is-throwing");
    shurikenButton.classList.remove("is-active");
    skillLocked = false;
  }, SKILL_COOLDOWN);
}

shurikenButton.addEventListener("click", useShurikenSkill);

function gameLoop(now) {
  const deltaSeconds = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  const strength = Math.hypot(inputX, inputY);
  const isMoving = strength > DEAD_ZONE;

  if (isMoving) {
    const normalizedStrength = Math.min(strength, 1);
    const directionX = inputX / strength;
    const directionY = inputY / strength;

    // 캐릭터는 중앙에 고정하고, 반대 방향으로 월드를 이동한다.
    worldX -= directionX * WORLD_SCROLL_SPEED * normalizedStrength * deltaSeconds;
    worldY -= directionY * WORLD_SCROLL_SPEED * normalizedStrength * deltaSeconds;

    game.style.setProperty("--world-x", `${worldX}px`);
    game.style.setProperty("--world-y", `${worldY}px`);
    actor.classList.toggle("face-left", directionX < -0.05);
    setAnimation("walk");
  } else {
    setAnimation("idle");
  }

  frameElapsed += deltaSeconds * 1000;
  const frameDuration = animationName === "walk" ? WALK_FRAME_MS : IDLE_FRAME_MS;
  if (frameElapsed >= frameDuration) {
    frameElapsed %= frameDuration;
    frameIndex = (frameIndex + 1) % animations[animationName].length;
    ninja.src = animations[animationName][frameIndex];
  }

  requestAnimationFrame(gameLoop);
}

document.addEventListener("visibilitychange", () => {
  lastTime = performance.now();
  if (document.hidden) resetJoystick();
});

preloadFrames();
requestAnimationFrame(gameLoop);
