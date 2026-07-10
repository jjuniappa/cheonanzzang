(() => {
  "use strict";

  const CONFIG_URL = "assets/ninja/config.json";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const stateText = document.getElementById("state-text");
  const assetMessage = document.getElementById("asset-message");

  const joystick = document.getElementById("joystick");
  const joystickKnob = document.getElementById("joystick-knob");
  const normalSkillButton = document.getElementById("normal-skill");
  const normalCooldownText = document.getElementById("normal-cooldown");

  let characterConfig = null;
  const animations = {};

  const world = {
    cameraX: 0,
    cameraY: 0,
    velocityX: 0,
    velocityY: 0,
    speed: 280,
    gridSize: 96
  };

  const player = {
    x: 0,
    y: 0,
    state: "idle",
    frameIndex: 0,
    frameTimer: 0,
    facingLeft: false,
    cooldownLeft: 0,
    skillCooldown: 2
  };

  const input = {
    x: 0,
    y: 0,
    pointerId: null
  };

  let lastTime = performance.now();
  let assetsReady = false;

  function padNumber(number, digits) {
    return String(number).padStart(digits, "0");
  }

  function buildFramePaths(stateName, stateConfig) {
    const frames = [];

    for (let i = 1; i <= stateConfig.frameCount; i += 1) {
      const frameNumber = padNumber(i, stateConfig.numberPadding);
      frames.push(
        `assets/ninja/${stateName}/${stateConfig.filePrefix}${frameNumber}.${stateConfig.extension}`
      );
    }

    return frames;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(src));
      image.src = src;
    });
  }

  async function loadCharacterConfig() {
    const response = await fetch(CONFIG_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`config.json을 불러오지 못했습니다. (${response.status})`);
    }

    return response.json();
  }

  async function loadAnimations() {
    try {
      characterConfig = await loadCharacterConfig();
      const missingFiles = [];

      for (const [stateName, stateConfig] of Object.entries(characterConfig.animations)) {
        const framePaths = buildFramePaths(stateName, stateConfig);
        const results = await Promise.allSettled(framePaths.map(loadImage));

        animations[stateName] = results
          .filter(result => result.status === "fulfilled")
          .map(result => result.value);

        results
          .filter(result => result.status === "rejected")
          .forEach(result => missingFiles.push(result.reason.message));
      }

      const requiredStates = ["idle", "walk", "skill"];
      assetsReady = requiredStates.every(
        stateName => animations[stateName] && animations[stateName].length > 0
      );

      if (missingFiles.length > 0) {
        assetMessage.style.display = "block";
        assetMessage.textContent =
          `누락된 에셋 ${missingFiles.length}개가 있습니다. config.json의 프레임 수와 실제 파일명을 확인하세요.`;
      }

      if (!assetsReady) {
        throw new Error("idle, walk, skill 에셋이 모두 필요합니다.");
      }

      player.skillCooldown = characterConfig.skillCooldown ?? 2;
      stateText.textContent = "IDLE";
    } catch (error) {
      assetsReady = false;
      stateText.textContent = "ASSET ERROR";
      assetMessage.style.display = "block";
      assetMessage.textContent = error.message;
      console.error(error);
    }
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    player.x = innerWidth / 2;
    player.y = innerHeight / 2;
  }

  function setJoystick(clientX, clientY) {
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

  normalSkillButton.addEventListener("pointerdown", event => {
    event.preventDefault();
    startSkill();
  });

  function startSkill() {
    if (!assetsReady) return;
    if (player.cooldownLeft > 0 || player.state === "skill") return;

    player.state = "skill";
    player.frameIndex = 0;
    player.frameTimer = 0;
    player.cooldownLeft = player.skillCooldown;
    stateText.textContent = "SKILL";
  }

  function setState(nextState) {
    if (player.state === nextState) return;

    player.state = nextState;
    player.frameIndex = 0;
    player.frameTimer = 0;
    stateText.textContent = nextState.toUpperCase();
  }

  function update(dt) {
    player.cooldownLeft = Math.max(0, player.cooldownLeft - dt);

    const magnitude = Math.hypot(input.x, input.y);
    const moving = magnitude > 0.08;

    if (moving) {
      const nx = input.x / Math.max(1, magnitude);
      const ny = input.y / Math.max(1, magnitude);

      world.velocityX = nx * world.speed * Math.min(1, magnitude);
      world.velocityY = ny * world.speed * Math.min(1, magnitude);

      if (Math.abs(nx) > 0.08) {
        player.facingLeft = nx < 0;
      }
    } else {
      world.velocityX *= Math.pow(0.0008, dt);
      world.velocityY *= Math.pow(0.0008, dt);
    }

    // 캐릭터는 화면 중앙에 고정하고 배경 좌표만 이동한다.
    world.cameraX += world.velocityX * dt;
    world.cameraY += world.velocityY * dt;

    if (assetsReady) {
      if (player.state !== "skill") {
        setState(moving ? "walk" : "idle");
      }

      updateAnimation(dt, moving);
    }

    updateCooldownUI();
  }

  function updateAnimation(dt, moving) {
    const stateConfig = characterConfig.animations[player.state];
    const frames = animations[player.state];

    if (!stateConfig || !frames || frames.length === 0) return;

    player.frameTimer += dt;
    const frameDuration = 1 / stateConfig.fps;

    while (player.frameTimer >= frameDuration) {
      player.frameTimer -= frameDuration;
      player.frameIndex += 1;

      if (player.frameIndex >= frames.length) {
        if (stateConfig.loop) {
          player.frameIndex = 0;
        } else {
          setState(moving ? "walk" : "idle");
          break;
        }
      }
    }
  }

  function updateCooldownUI() {
    if (player.cooldownLeft > 0) {
      normalSkillButton.classList.add("cooldown");
      normalCooldownText.textContent = player.cooldownLeft.toFixed(1);
    } else {
      normalSkillButton.classList.remove("cooldown");
      normalCooldownText.textContent = "READY";
    }
  }

  function drawBackground() {
    const width = innerWidth;
    const height = innerHeight;

    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      30,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.75
    );

    gradient.addColorStop(0, "#17142d");
    gradient.addColorStop(1, "#050610");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const grid = world.gridSize;
    const offsetX = ((-world.cameraX % grid) + grid) % grid;
    const offsetY = ((-world.cameraY % grid) + grid) % grid;

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(126, 65, 190, 0.22)";

    for (let x = offsetX - grid; x < width + grid; x += grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let y = offsetY - grid; y < height + grid; y += grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    drawWorldObjects(width, height);
  }

  function drawWorldObjects(width, height) {
    const spacing = 430;
    const startX = Math.floor((world.cameraX - width / 2) / spacing) - 1;
    const endX = Math.ceil((world.cameraX + width / 2) / spacing) + 1;
    const startY = Math.floor((world.cameraY - height / 2) / spacing) - 1;
    const endY = Math.ceil((world.cameraY + height / 2) / spacing) + 1;

    for (let gx = startX; gx <= endX; gx += 1) {
      for (let gy = startY; gy <= endY; gy += 1) {
        const hash = Math.abs((gx * 73856093) ^ (gy * 19349663));
        if (hash % 3 !== 0) continue;

        const worldX = gx * spacing + 120;
        const worldY = gy * spacing + 90;
        const screenX = player.x + (worldX - world.cameraX);
        const screenY = player.y + (worldY - world.cameraY);

        ctx.fillStyle = "rgba(255, 135, 30, 0.12)";
        ctx.strokeStyle = "rgba(255, 135, 30, 0.4)";
        ctx.lineWidth = 2;
        ctx.fillRect(screenX - 34, screenY - 34, 68, 68);
        ctx.strokeRect(screenX - 34, screenY - 34, 68, 68);
      }
    }
  }

  function drawPlayer() {
    if (!assetsReady) {
      drawAssetGuide();
      return;
    }

    const frames = animations[player.state];
    const image = frames[player.frameIndex % frames.length];
    if (!image) return;

    const targetHeight =
      characterConfig.display?.height ??
      Math.min(innerHeight * 0.34, 260);

    const scale = targetHeight / image.naturalHeight;
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;

    const offsetX = characterConfig.display?.offsetX ?? 0;
    const offsetY = characterConfig.display?.offsetY ?? 0;

    ctx.save();
    ctx.translate(player.x + offsetX, player.y + offsetY);

    if (player.facingLeft) {
      ctx.scale(-1, 1);
    }

    ctx.drawImage(
      image,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );

    ctx.restore();
  }

  function drawAssetGuide() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.strokeStyle = "rgba(98, 221, 255, 0.7)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(-70, -100, 140, 200);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "700 15px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("NINJA ASSET", 0, -4);
    ctx.fillText("대기 위치", 0, 20);
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    drawBackground();
    drawPlayer();
  }

  function frame(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;

    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("contextmenu", event => event.preventDefault());

  resize();
  loadAnimations();
  requestAnimationFrame(frame);
})();
