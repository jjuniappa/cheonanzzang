const ninja = document.querySelector("#ninja");

const frames = [
  "./assets/ninja/01.png",
  "./assets/ninja/02.png",
  "./assets/ninja/03.png",
  "./assets/ninja/04.png",
];

const FRAME_DURATION = 140;
let frameIndex = 0;
let timerId = null;

function preloadFrames() {
  frames.forEach((src) => {
    const image = new Image();
    image.src = src;
  });
}

function renderNextFrame() {
  frameIndex = (frameIndex + 1) % frames.length;
  ninja.src = frames[frameIndex];
}

function startIdleAnimation() {
  if (timerId !== null) return;
  timerId = window.setInterval(renderNextFrame, FRAME_DURATION);
}

function stopIdleAnimation() {
  if (timerId === null) return;
  window.clearInterval(timerId);
  timerId = null;
}

// 백그라운드 탭에서는 애니메이션을 멈춰 배터리 사용을 줄입니다.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopIdleAnimation();
  } else {
    startIdleAnimation();
  }
});

preloadFrames();
startIdleAnimation();
