"use strict";

const CONFIG={
  PLAYER_SIZE:96,TILE_SIZE:64,MOVE_SPEED:220,
  IDLE_FRAME_MS:150,WALK_FRAME_MS:100,SKILL_FRAME_MS:90,
  SHURIKEN_FRAME_MS:55,SHURIKEN_SPEED:720,SHURIKEN_RANGE_TILES:5,
  SHURIKEN_SIZE:34,ENEMY_SIZE:72
};

const canvas=document.querySelector("#game");
const ctx=canvas.getContext("2d");
const joystick=document.querySelector("#joystick");
const knob=document.querySelector("#joystick-knob");
const skillButton=document.querySelector("#skill-button");
const status=document.querySelector("#status");

const state={
  w:innerWidth,h:innerHeight,dpr:1,last:performance.now(),
  player:{x:0,y:0,fx:1,fy:0,moving:false,skillAt:-1e9},
  input:{x:0,y:0,id:null},
  assets:{idle:[],walk:[],skill:[],shuriken:[]},
  shots:[],pending:[],
  enemy:{x:CONFIG.TILE_SIZE*4,y:0,energy:3,maxEnergy:3}
};

function resize(){
  state.w=innerWidth; state.h=innerHeight; state.dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.round(state.w*state.dpr); canvas.height=Math.round(state.h*state.dpr);
  ctx.setTransform(state.dpr,0,0,state.dpr,0,0); ctx.imageSmoothingEnabled=false;
}
addEventListener("resize",resize); resize();

function loadImage(src){
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=()=>resolve(null);
    img.src=src;
  });
}
async function loadGroup(dir,names){
  return (await Promise.all(names.map(n=>loadImage(`${dir}/${n}`)))).filter(Boolean);
}
async function loadAssets(){
  const m=window.ASSET_MANIFEST||{ninja:{}};
  state.assets.idle=await loadGroup("assets/ninja/idle",m.ninja?.idle||[]);
  state.assets.walk=await loadGroup("assets/ninja/walk",m.ninja?.walk||[]);
  state.assets.skill=await loadGroup("assets/ninja/skill",m.ninja?.skill||[]);
  state.assets.shuriken=await loadGroup("assets/shuriken",m.shuriken||[]);
  const a=state.assets;
  status.textContent=`idle ${a.idle.length} · walk ${a.walk.length} · skill ${a.skill.length} · 수리검 ${a.shuriken.length}`;
}
function frame(frames,t,ms,loop=true){
  if(!frames.length)return null;
  const i=Math.floor(Math.max(0,t)/ms);
  return frames[loop?i%frames.length:Math.min(i,frames.length-1)];
}
function drawBackground(){
  const s=CONFIG.TILE_SIZE,ox=(((-state.player.x)%s)+s)%s,oy=(((-state.player.y)%s)+s)%s;
  for(let y=-s;y<state.h+s;y+=s)for(let x=-s;x<state.w+s;x+=s){
    const wx=Math.floor((x+state.player.x)/s),wy=Math.floor((y+state.player.y)/s);
    ctx.fillStyle=(wx+wy)%2?"#222b36":"#2b3644";
    ctx.fillRect(x+ox,y+oy,s,s);
  }
}
function worldToScreen(x,y){return{x:state.w/2+x-state.player.x,y:state.h/2+y-state.player.y}}
function drawSprite(img,cx,cy,size,flip=false){
  const scale=Math.min(size/img.width,size/img.height),w=img.width*scale,h=img.height*scale;
  ctx.save(); ctx.translate(cx,cy); if(flip)ctx.scale(-1,1);
  ctx.drawImage(img,-w/2,-h/2,w,h); ctx.restore();
}
function drawPlayer(now){
  const skillDuration=Math.max(1,state.assets.skill.length||4)*CONFIG.SKILL_FRAME_MS;
  const using=now-state.player.skillAt<skillDuration;
  let img=null;
  if(using)img=frame(state.assets.skill,now-state.player.skillAt,CONFIG.SKILL_FRAME_MS,false);
  else if(state.player.moving)img=frame(state.assets.walk,now,CONFIG.WALK_FRAME_MS);
  else img=frame(state.assets.idle,now,CONFIG.IDLE_FRAME_MS);

  if(img)drawSprite(img,state.w/2,state.h/2,CONFIG.PLAYER_SIZE,state.player.fx<0);
  else{
    ctx.fillStyle="#111";ctx.beginPath();ctx.arc(state.w/2,state.h/2-12,24,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#b22";ctx.fillRect(state.w/2-24,state.h/2+10,48,30);
  }
}
function drawEnemy(){
  if(state.enemy.energy<=0)return;
  const p=worldToScreen(state.enemy.x,state.enemy.y),s=CONFIG.ENEMY_SIZE;
  ctx.fillStyle="#a44";ctx.fillRect(p.x-s/2,p.y-s/2,s,s);
  ctx.fillStyle="#111";ctx.fillRect(p.x-s/2,p.y-s/2-14,s,8);
  ctx.fillStyle="#55d06f";ctx.fillRect(p.x-s/2,p.y-s/2-14,s*(state.enemy.energy/state.enemy.maxEnergy),8);
}
function drawShots(now){
  for(const sh of state.shots){
    const p=worldToScreen(sh.x,sh.y);
    const img=frame(state.assets.shuriken,now-sh.created,CONFIG.SHURIKEN_FRAME_MS);
    if(img)drawSprite(img,p.x,p.y,CONFIG.SHURIKEN_SIZE,false);
    else{ctx.fillStyle="#ddd";ctx.fillRect(p.x-12,p.y-3,24,6);ctx.fillRect(p.x-3,p.y-12,6,24)}
  }
}
function fire(now){
  const l=Math.hypot(state.player.fx,state.player.fy)||1;
  state.player.skillAt=now;
  state.pending.push({at:now+CONFIG.SKILL_FRAME_MS,dx:state.player.fx/l,dy:state.player.fy/l});
}
skillButton.addEventListener("pointerdown",e=>{e.preventDefault();fire(performance.now())});

function updateJoystick(x,y){
  const r=joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,m=r.width*.34;
  let dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy);
  if(d>m){dx=dx/d*m;dy=dy/d*m}
  state.input.x=dx/m;state.input.y=dy/m;
  knob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
}
joystick.addEventListener("pointerdown",e=>{state.input.id=e.pointerId;joystick.setPointerCapture(e.pointerId);updateJoystick(e.clientX,e.clientY)});
joystick.addEventListener("pointermove",e=>{if(e.pointerId===state.input.id)updateJoystick(e.clientX,e.clientY)});
function reset(){state.input.id=null;state.input.x=state.input.y=0;knob.style.transform="translate(-50%,-50%)"}
joystick.addEventListener("pointerup",reset);joystick.addEventListener("pointercancel",reset);

function update(now,dt){
  const l=Math.hypot(state.input.x,state.input.y);
  state.player.moving=l>.08;
  if(state.player.moving){
    const dx=state.input.x/l,dy=state.input.y/l;
    state.player.x+=dx*CONFIG.MOVE_SPEED*dt;state.player.y+=dy*CONFIG.MOVE_SPEED*dt;
    state.player.fx=dx;state.player.fy=dy;
  }
  state.pending=state.pending.filter(p=>{
    if(now<p.at)return true;
    state.shots.push({x:state.player.x,y:state.player.y,dx:p.dx,dy:p.dy,startX:state.player.x,startY:state.player.y,created:now});
    return false;
  });
  for(const s of state.shots){
    s.x+=s.dx*CONFIG.SHURIKEN_SPEED*dt;s.y+=s.dy*CONFIG.SHURIKEN_SPEED*dt;
    if(Math.hypot(s.x-state.enemy.x,s.y-state.enemy.y)<(CONFIG.ENEMY_SIZE+CONFIG.SHURIKEN_SIZE)*.35){
      if(!s.dead&&state.enemy.energy>0)state.enemy.energy--;s.dead=true;
    }
    if(Math.hypot(s.x-s.startX,s.y-s.startY)>=CONFIG.TILE_SIZE*CONFIG.SHURIKEN_RANGE_TILES)s.dead=true;
  }
  state.shots=state.shots.filter(s=>!s.dead);
}
function loop(now){
  const dt=Math.min((now-state.last)/1000,.05);state.last=now;
  update(now,dt);ctx.clearRect(0,0,state.w,state.h);
  drawBackground();drawEnemy();drawShots(now);drawPlayer(now);
  requestAnimationFrame(loop);
}
loadAssets().finally(()=>requestAnimationFrame(loop));
