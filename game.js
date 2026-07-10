(() => {
  "use strict";

  const config = window.NINJA_CONFIG;
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const joystick = document.getElementById("joystick");
  const joystickKnob = document.getElementById("joystick-knob");
  const skillButton = document.getElementById("skill-button");
  const skillLabel = document.getElementById("skill-label");
  const stateText = document.getElementById("state-text");
  const notice = document.getElementById("notice");

  const animations = {};
  const failedAssets = [];

  const world = {
    cameraX: 0,
    cameraY: 0,
    velocityX: 0,
    velocityY: 0
  };

  const player = {
    screenX: 0,
    screenY: 0,
    state: "idle",
    frameIndex: 0,
    frameTimer: 0,
    facingLeft: false,
    skillCooldownLeft: 0
  };

  const input = {
    x: 0,
    y: 0,
    pointerId: null
  };

  let lastTime = performance.now();

  function framePath(state, index) {
    return `assets/ninja/${state}/${String(index).padStart(2, "0")}.png`;
  }

  function loadImage(path) {
    return new Promise(resolve => {
      const image = new Image();

      image.onload = () => resolve({ ok: true, image });
      image.onerror = () => resolve({ ok: false, path });
      image.src = path;
    });
  }

  async function loadAssets() {
    for (const [state, info] of Object.entries(config.animations)) {
      const paths = [];

      for (let i = 1; i <= info.frameCount; i += 1) {
        paths.push(framePath(state, i));
      }

      const results = await Promise.all(paths.map(loadImage));
      animations[state] = results.filter(item => item.ok).map(item => item.image);

      results
        .filter(item => !item.ok)
        .forEach(item => failedAssets.push(item.path));
    }

    if (failedAssets.length > 0) {
      notice.style.display = "block";
      notice.textContent =
        `에셋 ${failedAssets.length}개가 없습니다. 현재는 안내용 닌자 실루엣으로 실행됩니다.`;
    }
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    player.screenX = innerWidth / 2;
    player.screenY = innerHeight / 2;
  }

  function setJoystick(clientX, clientY) {
    const rect = joystick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxDistance = rect.width * 0.34;

    let dx = clientX - cx;
    let dy = clientY - cy;
    const distance = Math.hypot(dx, dy);

    if (distance > maxDistance) {
      dx = dx / distance * maxDistance;
      dy = dy / distance * maxDistance;
    }

    input.x = dx / maxDistance;
    input.y = dy / maxDistance;

    joystickKnob.style.transform =
      `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  function resetJoystick() {
    input.x = 0;
    input.y = 0;
    input.pointerId = null;
    joystickKnob.style.transform = "translate(-50%, -50%)";
  }

  joystick.addEventListener("pointerdown", event => {
    input.pointerId = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    setJoystick(event.clientX, event.clientY);
  });

  joystick.addEventListener("pointermove", event => {
    if (event.pointerId !== input.pointerId) return;
    setJoystick(event.clientX, event.clientY);
  });

  joystick.addEventListener("pointerup", event => {
    if (event.pointerId !== input.pointerId) return;
    resetJoystick();
  });

  joystick.addEventListener("pointercancel", resetJoystick);
  joystick.addEventListener("lostpointercapture", resetJoystick);

  skillButton.addEventListener("pointerdown", event => {
    event.preventDefault();

    if (player.skillCooldownLeft > 0 || player.state === "skill") return;

    player.skillCooldownLeft = config.skillCooldown;
    setState("skill", true);
  });

  function setState(nextState, force = false) {
    if (!force && player.state === nextState) return;

    player.state = nextState;
    player.frameIndex = 0;
    player.frameTimer = 0;
    stateText.textContent = nextState.toUpperCase();
  }

  function update(dt) {
    const magnitude = Math.hypot(input.x, input.y);
    const moving = magnitude > 0.08;

    if (moving) {
      const nx = input.x / Math.max(1, magnitude);
      const ny = input.y / Math.max(1, magnitude);
      const strength = Math.min(1, magnitude);

      world.velocityX = nx * config.moveSpeed * strength;
      world.velocityY = ny * config.moveSpeed * strength;

      if (Math.abs(nx) > 0.08) {
        player.facingLeft = nx < 0;
      }
    } else {
      world.velocityX *= Math.pow(0.0008, dt);
      world.velocityY *= Math.pow(0.0008, dt);
    }

    // 캐릭터는 중앙에 고정하고 배경 좌표만 이동
    world.cameraX += world.velocityX * dt;
    world.cameraY += world.velocityY * dt;

    player.skillCooldownLeft = Math.max(0, player.skillCooldownLeft - dt);

    if (player.state !== "skill") {
      setState(moving ? "walk" : "idle");
    }

    updateAnimation(dt, moving);
    updateSkillUI();
  }

  function updateAnimation(dt, moving) {
    const info = config.animations[player.state];
    const frameCount = Math.max(1, animations[player.state]?.length || info.frameCount);

    player.frameTimer += dt;
    const frameDuration = 1 / info.fps;

    while (player.frameTimer >= frameDuration) {
      player.frameTimer -= frameDuration;
      player.frameIndex += 1;

      if (player.frameIndex >= frameCount) {
        if (info.loop) {
          player.frameIndex = 0;
        } else {
          setState(moving ? "walk" : "idle", true);
          break;
        }
      }
    }
  }

  function updateSkillUI() {
    if (player.skillCooldownLeft > 0) {
      skillButton.classList.add("cooldown");
      skillLabel.textContent = player.skillCooldownLeft.toFixed(1);
    } else {
      skillButton.classList.remove("cooldown");
      skillLabel.textContent = "READY";
    }
  }

  function drawBackground() {
    const w = innerWidth;
    const h = innerHeight;

    const gradient = ctx.createRadialGradient(
      w / 2, h / 2, 20,
      w / 2, h / 2, Math.max(w, h) * 0.8
    );

    gradient.addColorStop(0, "#1b1734");
    gradient.addColorStop(1, "#070912");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    const grid = 90;
    const ox = ((-world.cameraX % grid) + grid) % grid;
    const oy = ((-world.cameraY % grid) + grid) % grid;

    ctx.strokeStyle = "rgba(125, 77, 195, 0.2)";
    ctx.lineWidth = 1;

    for (let x = ox - grid; x < w + grid; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    for (let y = oy - grid; y < h + grid; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    drawWorldObjects(w, h);
  }

  function drawWorldObjects(w, h) {
    const spacing = 380;
    const minX = Math.floor((world.cameraX - w / 2) / spacing) - 1;
    const maxX = Math.ceil((world.cameraX + w / 2) / spacing) + 1;
    const minY = Math.floor((world.cameraY - h / 2) / spacing) - 1;
    const maxY = Math.ceil((world.cameraY + h / 2) / spacing) + 1;

    for (let gx = minX; gx <= maxX; gx += 1) {
      for (let gy = minY; gy <= maxY; gy += 1) {
        const seed = Math.abs((gx * 73856093) ^ (gy * 19349663));
        if (seed % 3 !== 0) continue;

        const wx = gx * spacing + 100;
        const wy = gy * spacing + 80;
        const sx = player.screenX + wx - world.cameraX;
        const sy = player.screenY + wy - world.cameraY;

        ctx.fillStyle = "rgba(255, 133, 35, 0.12)";
        ctx.strokeStyle = "rgba(255, 133, 35, 0.45)";
        ctx.lineWidth = 2;
        ctx.fillRect(sx - 32, sy - 32, 64, 64);
        ctx.strokeRect(sx - 32, sy - 32, 64, 64);
      }
    }
  }

  function drawPlayer() {
    const frames = animations[player.state] || [];
    const image = frames[player.frameIndex % Math.max(1, frames.length)];

    if (!image) {
      drawFallbackNinja();
      return;
    }

    const height = config.display.height;
    const scale = height / image.naturalHeight;
    const width = image.naturalWidth * scale;

    ctx.save();
    ctx.translate(
      player.screenX + config.display.offsetX,
      player.screenY + config.display.offsetY
    );

    if (player.facingLeft) {
      ctx.scale(-1, 1);
    }

    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  function drawFallbackNinja() {
    const x = player.screenX + config.display.offsetX;
    const y = player.screenY + config.display.offsetY;
    const scale = config.display.height / 170;
    const walkBob = player.state === "walk"
      ? Math.sin(player.frameIndex * 0.8) * 4
      : 0;

    ctx.save();
    ctx.translate(x, y + walkBob);
    ctx.scale(player.facingLeft ? -scale : scale, scale);

    if (player.state === "skill") {
      const progress =
        player.frameIndex / Math.max(1, config.animations.skill.frameCount - 1);

      ctx.globalAlpha = Math.sin(progress * Math.PI);
      ctx.strokeStyle = "#70e5ff";
      ctx.lineWidth = 8;
      ctx.shadowBlur = 20;
      ctx.shadowColor = "#70e5ff";
      ctx.beginPath();
      ctx.arc(70, 0, 45, -1.2, 1.2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, 78, 42, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#161922";
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-10, 34);
    ctx.lineTo(-17, 64);
    ctx.moveTo(10, 34);
    ctx.lineTo(17, 64);
    ctx.stroke();

    ctx.fillStyle = "#171a24";
    ctx.beginPath();
    ctx.roundRect(-27, -5, 54, 57, 16);
    ctx.fill();

    ctx.fillStyle = "#8f1622";
    ctx.fillRect(-29, 27, 58, 9);

    ctx.fillStyle = "#191b25";
    ctx.beginPath();
    ctx.arc(0, -28, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#a91d2b";
    ctx.fillRect(-36, -38, 72, 11);

    ctx.fillStyle = "#b98c69";
    ctx.beginPath();
    ctx.roundRect(-24, -25, 48, 16, 7);
    ctx.fill();

    ctx.fillStyle = "#111";
    ctx.fillRect(-14, -20, 8, 4);
    ctx.fillRect(8, -20, 8, 4);

    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    drawBackground();
    drawPlayer();
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;

    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("contextmenu", event => event.preventDefault());

  resize();
  loadAssets();
  requestAnimationFrame(loop);
})();
