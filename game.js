"use strict";

const CONFIG={PLAYER_SIZE:96,TILE_SIZE:64,MOVE_SPEED:220,IDLE_FRAME_MS:150,WALK_FRAME_MS:100,SKILL_FRAME_MS:90,SHURIKEN_FRAME_MS:55,SHURIKEN_SPEED:720,SHURIKEN_RANGE_TILES:5,SHURIKEN_SIZE:34,ULTIMATE_FRAME_MS:110,ULTIMATE_CHARGE_HOLD_MS:720,ULTIMATE_EFFECT_FRAME_MS:90,ULTIMATE_SLASH_FRAME_MS:70,ULTIMATE_COOLDOWN_MS:0,ULTIMATE_RANGE_TILES:2.5,ULTIMATE_DAMAGE:3,ULTIMATE_EFFECT_SIZE:360,ENERGY_MAX:20,SHURIKEN_ENERGY_COST:1,ULTIMATE_ENERGY_COST:5,ULTIMATE_GAUGE_MAX:100,ULTIMATE_GAUGE_PER_HIT:10,ENERGY_BAR_WIDTH:96,ENERGY_BAR_HEIGHT:8,ENERGY_BAR_OFFSET_Y:66,ULTIMATE_GAUGE_RADIUS:18,ULTIMATE_GAUGE_OFFSET_Y:94,ENEMY_SIZE:72};
const paths=(dir,prefix,count)=>Array.from({length:count},(_,i)=>`${dir}/${prefix}${String(i+1).padStart(2,"0")}.png`);
const ASSETS={
  idle:paths("assets/ninja/idle","idle",4),
  walk:paths("assets/ninja/walk","walk",4),
  skill:paths("assets/ninja/skill","skill",4),
  shuriken:paths("assets/shuriken","shuriken",4),
  ultimate:paths("assets/ninja/ultimate","ultimate",8),

  // 두 파일명 규칙을 모두 지원합니다.
  ultimateCharge:Array.from({length:4},(_,i)=>{
    const n=String(i+1).padStart(2,"0");
    return[
      `assets/effects/ultimateCharge/charge${n}.png`,
      `assets/effects/ultimateCharge/ultimateCharge${n}.png`
    ];
  }),

  ultimateSlash:Array.from({length:4},(_,i)=>{
    const n=String(i+1).padStart(2,"0");
    return[
      `assets/effects/ultimateSlash/slash${n}.png`,
      `assets/effects/ultimateSlash/ultimateSlash${n}.png`
    ];
  })
};

const canvas=document.querySelector("#game"),ctx=canvas.getContext("2d"),joystick=document.querySelector("#joystick"),knob=document.querySelector("#joystick-knob"),skillButton=document.querySelector("#skill-button"),ultimateButton=document.querySelector("#ultimate-button"),status=document.querySelector("#status");
const state={w:innerWidth,h:innerHeight,dpr:1,last:performance.now(),player:{x:0,y:0,fx:1,fy:0,moving:false,skillAt:-1e9,mode:"normal",ultimateAt:-1e9,ultimateHit:false,energy:CONFIG.ENERGY_MAX,maxEnergy:CONFIG.ENERGY_MAX,ultimateGauge:0,maxUltimateGauge:CONFIG.ULTIMATE_GAUGE_MAX},input:{x:0,y:0,id:null},frames:{},pending:[],shots:[],enemies:[{x:128,y:0,energy:5,max:5,flash:0},{x:0,y:128,energy:5,max:5,flash:0}]};

function resize(){state.w=innerWidth;state.h=innerHeight;state.dpr=Math.min(devicePixelRatio||1,2);canvas.width=state.w*state.dpr;canvas.height=state.h*state.dpr;canvas.style.width=state.w+"px";canvas.style.height=state.h+"px";ctx.setTransform(state.dpr,0,0,state.dpr,0,0);ctx.imageSmoothingEnabled=false}addEventListener("resize",resize);resize();
function findVisibleBounds(image){
  const canvas=document.createElement("canvas");
  canvas.width=image.naturalWidth||image.width;
  canvas.height=image.naturalHeight||image.height;

  const context=canvas.getContext("2d",{willReadFrequently:true});
  context.clearRect(0,0,canvas.width,canvas.height);
  context.drawImage(image,0,0);

  const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
  let minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1;

  for(let y=0;y<canvas.height;y++){
    for(let x=0;x<canvas.width;x++){
      const alpha=pixels[(y*canvas.width+x)*4+3];
      if(alpha>8){
        if(x<minX)minX=x;
        if(y<minY)minY=y;
        if(x>maxX)maxX=x;
        if(y>maxY)maxY=y;
      }
    }
  }

  if(maxX<minX||maxY<minY){
    return{x:0,y:0,width:canvas.width,height:canvas.height};
  }

  return{
    x:minX,
    y:minY,
    width:maxX-minX+1,
    height:maxY-minY+1
  };
}

function loadSingleImage(src){
  return new Promise(resolve=>{
    const image=new Image();

    image.onload=()=>{
      try{
        image.visibleBounds=findVisibleBounds(image);
      }catch(error){
        image.visibleBounds={
          x:0,
          y:0,
          width:image.naturalWidth||image.width,
          height:image.naturalHeight||image.height
        };
      }
      resolve(image);
    };

    image.onerror=()=>resolve(null);
    image.src=src+"?v=3";
  });
}

async function loadImage(source){
  const candidates=Array.isArray(source)?source:[source];

  for(const src of candidates){
    const image=await loadSingleImage(src);
    if(image){
      image.loadedFrom=src;
      return image;
    }
  }

  console.error("에셋 로드 실패:",candidates);
  return null;
}

async function loadAll(){
  for(const [key,sources] of Object.entries(ASSETS)){
    state.frames[key]=(await Promise.all(sources.map(loadImage))).filter(Boolean);
  }

  status.textContent=
    `idle ${state.frames.idle.length} · walk ${state.frames.walk.length} · `+
    `skill ${state.frames.skill.length} · 수리검 ${state.frames.shuriken.length} · `+
    `궁극기 ${state.frames.ultimate.length} · 충전 ${state.frames.ultimateCharge.length} · `+
    `참격 ${state.frames.ultimateSlash.length}`;
}

function frame(a,t,ms,loop=true){if(!a?.length)return null;const n=Math.floor(Math.max(0,t)/ms);return a[loop?n%a.length:Math.min(n,a.length-1)]}
function sprite(img,x,y,size,flip=false,angle=0){
  const bounds=img.visibleBounds||{
    x:0,
    y:0,
    width:img.naturalWidth||img.width,
    height:img.naturalHeight||img.height
  };

  // PNG 전체 캔버스가 아니라 실제 보이는 캐릭터 영역을 기준으로 크기를 맞춥니다.
  // skill 이미지에 투명 여백이 많아도 idle/walk와 같은 표시 크기가 유지됩니다.
  const scale=Math.min(size/bounds.width,size/bounds.height);
  const width=bounds.width*scale;
  const height=bounds.height*scale;

  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(angle);
  if(flip)ctx.scale(-1,1);

  ctx.drawImage(
    img,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    -width/2,
    -height/2,
    width,
    height
  );

  ctx.restore();
}
function bg(){const s=CONFIG.TILE_SIZE,ox=(((-state.player.x)%s)+s)%s,oy=(((-state.player.y)%s)+s)%s;ctx.fillStyle="#1b2330";ctx.fillRect(0,0,state.w,state.h);for(let y=-s;y<state.h+s;y+=s)for(let x=-s;x<state.w+s;x+=s){const wx=Math.floor((x+state.player.x)/s),wy=Math.floor((y+state.player.y)/s);ctx.fillStyle=(wx+wy)%2?"#222b36":"#2b3644";ctx.fillRect(x+ox,y+oy,s,s)}}
function screen(x,y){return{x:state.w/2+x-state.player.x,y:state.h/2+y-state.player.y}}
function getUltimateTimeline(){
  const frameMs=CONFIG.ULTIMATE_FRAME_MS;
  const chargeStart=frameMs*4; // 5프레임 진입
  const chargeEnd=chargeStart+CONFIG.ULTIMATE_CHARGE_HOLD_MS; // 6프레임 시작
  const frame6End=chargeEnd+frameMs;
  const frame7End=frame6End+frameMs;
  const frame8End=frame7End+frameMs;
  const slashFrameCount=Math.max(1,state.frames.ultimateSlash?.length||4);
  const slashEnd=frame8End+slashFrameCount*CONFIG.ULTIMATE_SLASH_FRAME_MS;

  return{frameMs,chargeStart,chargeEnd,frame6End,frame7End,frame8End,slashEnd};
}

function getUltimateCharacterFrameIndex(elapsed){
  const timeline=getUltimateTimeline();

  if(elapsed<timeline.chargeStart){
    return Math.min(3,Math.floor(elapsed/timeline.frameMs));
  }

  if(elapsed<timeline.chargeEnd){
    return 4; // 궁극기 로딩 중에는 ultimate05 유지
  }

  if(elapsed<timeline.frame6End)return 5;
  if(elapsed<timeline.frame7End)return 6;
  return 7;
}
function fallback(){const x=state.w/2,y=state.h/2;ctx.fillStyle="#111";ctx.beginPath();ctx.arc(x,y-12,24,0,Math.PI*2);ctx.fill();ctx.fillStyle="#b22";ctx.fillRect(x-24,y+10,48,30)}
function drawPlayer(now){let img;if(state.player.mode==="ultimate"){
  const elapsed=now-state.player.ultimateAt;
  const frames=state.frames.ultimate;
  const index=getUltimateCharacterFrameIndex(elapsed);
  img=frames?.length?frames[Math.min(index,frames.length-1)]:null;
}else{const using=now-state.player.skillAt<Math.max(1,state.frames.skill.length||4)*CONFIG.SKILL_FRAME_MS;img=using?frame(state.frames.skill,now-state.player.skillAt,CONFIG.SKILL_FRAME_MS,false):state.player.moving?frame(state.frames.walk,now,CONFIG.WALK_FRAME_MS):frame(state.frames.idle,now,CONFIG.IDLE_FRAME_MS)}img?sprite(img,state.w/2,state.h/2,CONFIG.PLAYER_SIZE,state.player.fx<0):fallback()}
function drawEnemies(now){for(const e of state.enemies){if(e.energy<=0)continue;const p=screen(e.x,e.y),s=CONFIG.ENEMY_SIZE;ctx.fillStyle=now<e.flash?"#fff":"#a44";ctx.fillRect(p.x-s/2,p.y-s/2,s,s);ctx.fillStyle="#111";ctx.fillRect(p.x-s/2,p.y-s/2-14,s,8);ctx.fillStyle="#55d06f";ctx.fillRect(p.x-s/2,p.y-s/2-14,s*(e.energy/e.max),8)}}
function drawShots(now){for(const s of state.shots){const p=screen(s.x,s.y),img=frame(state.frames.shuriken,now-s.created,CONFIG.SHURIKEN_FRAME_MS),a=Math.atan2(s.dy,s.dx);if(img)sprite(img,p.x,p.y,CONFIG.SHURIKEN_SIZE,false,a);else{ctx.save();ctx.translate(p.x,p.y);ctx.rotate(a);ctx.fillStyle="#ddd";ctx.fillRect(-12,-3,24,6);ctx.fillRect(-3,-12,6,24);ctx.restore()}}}
function drawUltimate(now){
  if(state.player.mode!=="ultimate")return;

  const elapsed=now-state.player.ultimateAt;
  const timeline=getUltimateTimeline();

  // ultimate05를 유지하는 로딩 구간에서 charge01~04를 반복합니다.
  if(elapsed>=timeline.chargeStart&&elapsed<timeline.chargeEnd){
    const chargeElapsed=elapsed-timeline.chargeStart;
    const image=frame(
      state.frames.ultimateCharge,
      chargeElapsed,
      CONFIG.ULTIMATE_EFFECT_FRAME_MS,
      true
    );

    if(image){
      sprite(image,state.w/2,state.h/2,CONFIG.ULTIMATE_EFFECT_SIZE);
    }else{
      ctx.save();
      ctx.translate(state.w/2,state.h/2);
      ctx.globalAlpha=.45+Math.sin(chargeElapsed/70)*.15;
      ctx.strokeStyle="#ff3030";
      ctx.lineWidth=10;
      ctx.beginPath();
      ctx.moveTo(-150,0);
      ctx.lineTo(150,0);
      ctx.moveTo(0,-150);
      ctx.lineTo(0,150);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ultimate08이 끝난 뒤 slash01~04를 한 번 재생합니다.
  if(elapsed>=timeline.frame8End&&elapsed<timeline.slashEnd){
    const slashElapsed=elapsed-timeline.frame8End;
    const image=frame(
      state.frames.ultimateSlash,
      slashElapsed,
      CONFIG.ULTIMATE_SLASH_FRAME_MS,
      false
    );

    if(image){
      sprite(image,state.w/2,state.h/2,CONFIG.ULTIMATE_EFFECT_SIZE);
    }
  }
}

function drawPlayerEnergyBar(){
  const width=CONFIG.ENERGY_BAR_WIDTH;
  const height=CONFIG.ENERGY_BAR_HEIGHT;
  const x=state.w/2-width/2;
  const y=state.h/2-CONFIG.ENERGY_BAR_OFFSET_Y;
  const ratio=Math.max(0,Math.min(1,state.player.energy/state.player.maxEnergy));
  const color=ratio>.5?"#38d06f":ratio>.25?"#f2c94c":"#ef5350";

  ctx.save();
  ctx.fillStyle="rgba(0,0,0,.72)";
  ctx.fillRect(x-2,y-2,width+4,height+4);
  ctx.fillStyle="#252b35";
  ctx.fillRect(x,y,width,height);
  ctx.fillStyle=color;
  ctx.fillRect(x,y,width*ratio,height);
  ctx.strokeStyle="rgba(255,255,255,.35)";
  ctx.strokeRect(x+.5,y+.5,width-1,height-1);
  ctx.restore();
}

function drawUltimateGauge(){
  const x=state.w/2;
  const y=state.h/2-CONFIG.ULTIMATE_GAUGE_OFFSET_Y;
  const r=CONFIG.ULTIMATE_GAUGE_RADIUS;
  const ratio=Math.max(0,Math.min(1,state.player.ultimateGauge/state.player.maxUltimateGauge));
  const ready=ratio>=1;

  ctx.save();
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fillStyle="rgba(0,0,0,.58)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x,y,r-3,-Math.PI/2,-Math.PI/2+Math.PI*2*ratio);
  ctx.strokeStyle=ready?"#ff6464":"#d64545";
  ctx.lineWidth=6;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x,y,r,0,Math.PI*2);
  ctx.strokeStyle=ready?"#ffaaaa":"rgba(255,255,255,.3)";
  ctx.lineWidth=2;
  ctx.stroke();

  ctx.fillStyle="#fff";
  ctx.font="bold 9px system-ui";
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  ctx.fillText("ULT",x,y+1);

  if(ready){
    ctx.globalAlpha=.35+.25*Math.sin(performance.now()/90);
    ctx.beginPath();
    ctx.arc(x,y,r+5,0,Math.PI*2);
    ctx.strokeStyle="#ff4b4b";
    ctx.lineWidth=3;
    ctx.stroke();
  }
  ctx.restore();
}

function updateSkillButtons(){
  skillButton.disabled=
    state.player.mode==="ultimate"||
    state.player.energy<CONFIG.SHURIKEN_ENERGY_COST;

  const ready=
    state.player.ultimateGauge>=state.player.maxUltimateGauge &&
    state.player.energy>=CONFIG.ULTIMATE_ENERGY_COST;

  ultimateButton.disabled=state.player.mode==="ultimate"||!ready;

  if(state.player.mode==="ultimate")ultimateButton.textContent="발동 중";
  else if(state.player.ultimateGauge<state.player.maxUltimateGauge)
    ultimateButton.textContent=Math.floor(state.player.ultimateGauge)+"%";
  else if(state.player.energy<CONFIG.ULTIMATE_ENERGY_COST)
    ultimateButton.textContent="에너지 부족";
  else ultimateButton.textContent="궁극기";
}

function fire(now){if(state.player.mode==="ultimate")return;if(state.player.energy<CONFIG.SHURIKEN_ENERGY_COST)return;state.player.energy-=CONFIG.SHURIKEN_ENERGY_COST;const l=Math.hypot(state.player.fx,state.player.fy)||1;state.player.skillAt=now;state.pending.push({at:now+CONFIG.SKILL_FRAME_MS,dx:state.player.fx/l,dy:state.player.fy/l})}
function ultimate(now){
  if(state.player.mode==="ultimate")return;
  if(state.player.ultimateGauge<state.player.maxUltimateGauge)return;
  if(state.player.energy<CONFIG.ULTIMATE_ENERGY_COST)return;
  state.player.energy-=CONFIG.ULTIMATE_ENERGY_COST;
  state.player.ultimateGauge=0;

  state.player.mode="ultimate";
  state.player.ultimateAt=now;
    state.player.ultimateHit=false;

  // 궁극기 발동 중에만 이동을 잠급니다.
  state.input.x=0;
  state.input.y=0;
  state.input.id=null;
  state.player.moving=false;
  knob.style.transform="translate(-50%,-50%)";
  joystick.style.pointerEvents="none";
}
skillButton.addEventListener("pointerdown",e=>{e.preventDefault();fire(performance.now())});ultimateButton.addEventListener("pointerdown",e=>{e.preventDefault();ultimate(performance.now())});
function joy(x,y){if(state.player.mode==="ultimate")return;const r=joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,m=r.width*.34;let dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy);if(d>m){dx=dx/d*m;dy=dy/d*m}state.input.x=dx/m;state.input.y=dy/m;knob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`}
function reset(){state.input.id=null;state.input.x=state.input.y=0;knob.style.transform="translate(-50%,-50%)"}joystick.addEventListener("pointerdown",e=>{if(state.player.mode==="ultimate")return;state.input.id=e.pointerId;joystick.setPointerCapture(e.pointerId);joy(e.clientX,e.clientY)});joystick.addEventListener("pointermove",e=>{if(e.pointerId===state.input.id)joy(e.clientX,e.clientY)});joystick.addEventListener("pointerup",reset);joystick.addEventListener("pointercancel",reset);
function update(now,dt){if(state.player.mode!=="ultimate"){const l=Math.hypot(state.input.x,state.input.y);state.player.moving=l>.08;if(state.player.moving){const dx=state.input.x/l,dy=state.input.y/l;state.player.x+=dx*CONFIG.MOVE_SPEED*dt;state.player.y+=dy*CONFIG.MOVE_SPEED*dt;state.player.fx=dx;state.player.fy=dy}}else{state.player.moving=false;state.input.x=0;state.input.y=0;knob.style.transform="translate(-50%,-50%)"}state.pending=state.pending.filter(p=>{if(now<p.at)return true;state.shots.push({x:state.player.x,y:state.player.y,startX:state.player.x,startY:state.player.y,dx:p.dx,dy:p.dy,created:now});return false});for(const s of state.shots){s.x+=s.dx*CONFIG.SHURIKEN_SPEED*dt;s.y+=s.dy*CONFIG.SHURIKEN_SPEED*dt;for(const e of state.enemies)if(!s.dead&&e.energy>0&&Math.hypot(s.x-e.x,s.y-e.y)<(CONFIG.ENEMY_SIZE+CONFIG.SHURIKEN_SIZE)*.35){e.energy=Math.max(0,e.energy-1);e.flash=now+120;s.dead=true}if(Math.hypot(s.x-s.startX,s.y-s.startY)>=CONFIG.TILE_SIZE*CONFIG.SHURIKEN_RANGE_TILES)s.dead=true}state.shots=state.shots.filter(s=>!s.dead);if(state.player.mode==="ultimate"){
  const elapsed=now-state.player.ultimateAt;
  const timeline=getUltimateTimeline();

  // ultimate08 종료 직후 slash가 시작될 때 한 번만 피해를 적용합니다.
  if(!state.player.ultimateHit&&elapsed>=timeline.frame8End){
    const range=CONFIG.TILE_SIZE*CONFIG.ULTIMATE_RANGE_TILES;
    const thickness=CONFIG.TILE_SIZE*.7;

    for(const enemy of state.enemies){
      const dx=Math.abs(enemy.x-state.player.x);
      const dy=Math.abs(enemy.y-state.player.y);
      const inHorizontal=dx<=range&&dy<=thickness;
      const inVertical=dy<=range&&dx<=thickness;

      if(enemy.energy>0&&(inHorizontal||inVertical)){
        enemy.energy=Math.max(0,enemy.energy-CONFIG.ULTIMATE_DAMAGE);
        enemy.flash=now+180;
      }
    }

    state.player.ultimateHit=true;
  }

  // slash 4프레임까지 끝난 뒤 즉시 이동 가능 상태로 복귀합니다.
  if(elapsed>=timeline.slashEnd){
    state.player.mode="normal";
    state.player.moving=false;
    state.input.x=0;
    state.input.y=0;
    joystick.style.pointerEvents="auto";
    ultimateButton.disabled=false;
    ultimateButton.textContent="궁극기";
  }
}
updateSkillButtons();
}
function loop(now){const dt=Math.min((now-state.last)/1000,.05);state.last=now;update(now,dt);ctx.clearRect(0,0,state.w,state.h);bg();drawEnemies(now);drawShots(now);drawPlayer(now);drawPlayerEnergyBar();drawUltimateGauge();drawUltimate(now);requestAnimationFrame(loop)}loadAll().finally(()=>requestAnimationFrame(loop));
