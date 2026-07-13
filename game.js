"use strict";

const CONFIG={PLAYER_SIZE:96,TILE_SIZE:64,MOVE_SPEED:220,IDLE_FRAME_MS:150,WALK_FRAME_MS:100,SKILL_FRAME_MS:90,SHURIKEN_FRAME_MS:55,SHURIKEN_SPEED:720,SHURIKEN_RANGE_TILES:5,SHURIKEN_SIZE:34,ULTIMATE_FRAME_MS:110,ULTIMATE_CHARGE_MS:900,ULTIMATE_COOLDOWN_MS:8000,ULTIMATE_RANGE_TILES:2.5,ULTIMATE_DAMAGE:3,ULTIMATE_EFFECT_SIZE:360,ENEMY_SIZE:72};
const paths=(dir,prefix,count)=>Array.from({length:count},(_,i)=>`${dir}/${prefix}${String(i+1).padStart(2,"0")}.png`);
const ASSETS={idle:paths("assets/ninja/idle","idle",4),walk:paths("assets/ninja/walk","walk",4),skill:paths("assets/ninja/skill","skill",4),shuriken:paths("assets/shuriken","shuriken",4),ultimate:paths("assets/ninja/ultimate","ultimate",8),ultimateCharge:paths("assets/effects/ultimateCharge","charge",4),ultimateSlash:paths("assets/effects/ultimateSlash","slash",4)};

const canvas=document.querySelector("#game"),ctx=canvas.getContext("2d"),joystick=document.querySelector("#joystick"),knob=document.querySelector("#joystick-knob"),skillButton=document.querySelector("#skill-button"),ultimateButton=document.querySelector("#ultimate-button"),status=document.querySelector("#status");
const state={w:innerWidth,h:innerHeight,dpr:1,last:performance.now(),player:{x:0,y:0,fx:1,fy:0,moving:false,skillAt:-1e9,mode:"normal",ultimateAt:-1e9,ultimateReadyAt:0,ultimateHit:false},input:{x:0,y:0,id:null},frames:{},pending:[],shots:[],enemies:[{x:128,y:0,energy:5,max:5,flash:0},{x:0,y:128,energy:5,max:5,flash:0}]};

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

function loadImage(src){
  return new Promise(resolve=>{
    const image=new Image();

    image.onload=()=>{
      try{
        image.visibleBounds=findVisibleBounds(image);
      }catch(error){
        console.warn("투명 여백 계산 실패:",src,error);
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
    image.src=src;
  });
}
async function loadAll(){for(const [k,v] of Object.entries(ASSETS))state.frames[k]=(await Promise.all(v.map(loadImage))).filter(Boolean);status.textContent=`idle ${state.frames.idle.length} · walk ${state.frames.walk.length} · skill ${state.frames.skill.length} · 수리검 ${state.frames.shuriken.length} · 궁극기 ${state.frames.ultimate.length}`}
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
function fallback(){const x=state.w/2,y=state.h/2;ctx.fillStyle="#111";ctx.beginPath();ctx.arc(x,y-12,24,0,Math.PI*2);ctx.fill();ctx.fillStyle="#b22";ctx.fillRect(x-24,y+10,48,30)}
function drawPlayer(now){let img;if(state.player.mode==="ultimate")img=frame(state.frames.ultimate,now-state.player.ultimateAt,CONFIG.ULTIMATE_FRAME_MS,false);else{const using=now-state.player.skillAt<Math.max(1,state.frames.skill.length||4)*CONFIG.SKILL_FRAME_MS;img=using?frame(state.frames.skill,now-state.player.skillAt,CONFIG.SKILL_FRAME_MS,false):state.player.moving?frame(state.frames.walk,now,CONFIG.WALK_FRAME_MS):frame(state.frames.idle,now,CONFIG.IDLE_FRAME_MS)}img?sprite(img,state.w/2,state.h/2,CONFIG.PLAYER_SIZE,state.player.fx<0):fallback()}
function drawEnemies(now){for(const e of state.enemies){if(e.energy<=0)continue;const p=screen(e.x,e.y),s=CONFIG.ENEMY_SIZE;ctx.fillStyle=now<e.flash?"#fff":"#a44";ctx.fillRect(p.x-s/2,p.y-s/2,s,s);ctx.fillStyle="#111";ctx.fillRect(p.x-s/2,p.y-s/2-14,s,8);ctx.fillStyle="#55d06f";ctx.fillRect(p.x-s/2,p.y-s/2-14,s*(e.energy/e.max),8)}}
function drawShots(now){for(const s of state.shots){const p=screen(s.x,s.y),img=frame(state.frames.shuriken,now-s.created,CONFIG.SHURIKEN_FRAME_MS),a=Math.atan2(s.dy,s.dx);if(img)sprite(img,p.x,p.y,CONFIG.SHURIKEN_SIZE,false,a);else{ctx.save();ctx.translate(p.x,p.y);ctx.rotate(a);ctx.fillStyle="#ddd";ctx.fillRect(-12,-3,24,6);ctx.fillRect(-3,-12,6,24);ctx.restore()}}}
function drawUltimate(now){if(state.player.mode!=="ultimate")return;const t=now-state.player.ultimateAt;if(t<=CONFIG.ULTIMATE_CHARGE_MS){const img=frame(state.frames.ultimateCharge,t,90);if(img)sprite(img,state.w/2,state.h/2,CONFIG.ULTIMATE_EFFECT_SIZE);else{ctx.save();ctx.translate(state.w/2,state.h/2);ctx.globalAlpha=.45+Math.sin(t/70)*.15;ctx.strokeStyle="#ff3030";ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(-150,0);ctx.lineTo(150,0);ctx.moveTo(0,-150);ctx.lineTo(0,150);ctx.stroke();ctx.restore()}}else{const img=frame(state.frames.ultimateSlash,t-CONFIG.ULTIMATE_CHARGE_MS,70,false);if(img)sprite(img,state.w/2,state.h/2,CONFIG.ULTIMATE_EFFECT_SIZE)}}
function fire(now){if(state.player.mode==="ultimate")return;const l=Math.hypot(state.player.fx,state.player.fy)||1;state.player.skillAt=now;state.pending.push({at:now+CONFIG.SKILL_FRAME_MS,dx:state.player.fx/l,dy:state.player.fy/l})}
function ultimate(now){if(state.player.mode==="ultimate"||now<state.player.ultimateReadyAt)return;state.player.mode="ultimate";state.player.ultimateAt=now;state.player.ultimateReadyAt=now+CONFIG.ULTIMATE_COOLDOWN_MS;state.player.ultimateHit=false;state.input.x=state.input.y=0;state.input.id=null;knob.style.transform="translate(-50%,-50%)";joystick.style.pointerEvents="none"}
skillButton.addEventListener("pointerdown",e=>{e.preventDefault();fire(performance.now())});ultimateButton.addEventListener("pointerdown",e=>{e.preventDefault();ultimate(performance.now())});
function joy(x,y){if(state.player.mode==="ultimate")return;const r=joystick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,m=r.width*.34;let dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy);if(d>m){dx=dx/d*m;dy=dy/d*m}state.input.x=dx/m;state.input.y=dy/m;knob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`}
function reset(){state.input.id=null;state.input.x=state.input.y=0;knob.style.transform="translate(-50%,-50%)"}joystick.addEventListener("pointerdown",e=>{if(state.player.mode==="ultimate")return;state.input.id=e.pointerId;joystick.setPointerCapture(e.pointerId);joy(e.clientX,e.clientY)});joystick.addEventListener("pointermove",e=>{if(e.pointerId===state.input.id)joy(e.clientX,e.clientY)});joystick.addEventListener("pointerup",reset);joystick.addEventListener("pointercancel",reset);
function update(now,dt){if(state.player.mode!=="ultimate"){const l=Math.hypot(state.input.x,state.input.y);state.player.moving=l>.08;if(state.player.moving){const dx=state.input.x/l,dy=state.input.y/l;state.player.x+=dx*CONFIG.MOVE_SPEED*dt;state.player.y+=dy*CONFIG.MOVE_SPEED*dt;state.player.fx=dx;state.player.fy=dy}}else{state.player.moving=false;state.input.x=0;state.input.y=0;knob.style.transform="translate(-50%,-50%)"}state.pending=state.pending.filter(p=>{if(now<p.at)return true;state.shots.push({x:state.player.x,y:state.player.y,startX:state.player.x,startY:state.player.y,dx:p.dx,dy:p.dy,created:now});return false});for(const s of state.shots){s.x+=s.dx*CONFIG.SHURIKEN_SPEED*dt;s.y+=s.dy*CONFIG.SHURIKEN_SPEED*dt;for(const e of state.enemies)if(!s.dead&&e.energy>0&&Math.hypot(s.x-e.x,s.y-e.y)<(CONFIG.ENEMY_SIZE+CONFIG.SHURIKEN_SIZE)*.35){e.energy=Math.max(0,e.energy-1);e.flash=now+120;s.dead=true}if(Math.hypot(s.x-s.startX,s.y-s.startY)>=CONFIG.TILE_SIZE*CONFIG.SHURIKEN_RANGE_TILES)s.dead=true}state.shots=state.shots.filter(s=>!s.dead);if(state.player.mode==="ultimate"){const t=now-state.player.ultimateAt;if(!state.player.ultimateHit&&t>=CONFIG.ULTIMATE_CHARGE_MS){const range=CONFIG.TILE_SIZE*CONFIG.ULTIMATE_RANGE_TILES,thick=CONFIG.TILE_SIZE*.7;for(const e of state.enemies){const dx=Math.abs(e.x-state.player.x),dy=Math.abs(e.y-state.player.y);if(e.energy>0&&((dx<=range&&dy<=thick)||(dy<=range&&dx<=thick))){e.energy=Math.max(0,e.energy-CONFIG.ULTIMATE_DAMAGE);e.flash=now+180}}state.player.ultimateHit=true}if(t>=8*CONFIG.ULTIMATE_FRAME_MS)state.player.mode="normal"}const remain=Math.max(0,state.player.ultimateReadyAt-now);ultimateButton.disabled=state.player.mode==="ultimate"||remain>0;ultimateButton.textContent=state.player.mode==="ultimate"?"발동":remain>0?(remain/1000).toFixed(1):"궁극기"}
function loop(now){const dt=Math.min((now-state.last)/1000,.05);state.last=now;update(now,dt);ctx.clearRect(0,0,state.w,state.h);bg();drawEnemies(now);drawShots(now);drawUltimate(now);drawPlayer(now);requestAnimationFrame(loop)}loadAll().finally(()=>requestAnimationFrame(loop));
