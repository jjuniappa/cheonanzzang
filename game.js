
/*
폴더 구조
assets/ninja/
 ├─config.json
 ├─idle/01.png
 ├─walk/01.png
 └─skill/01.png

파일명은 반드시
01.png
02.png
03.png
...
형식
*/

const CONFIG_PATH="assets/ninja/config.json";

async function loadConfig(){
 const cfg=await fetch(CONFIG_PATH).then(r=>r.json());
 console.log(cfg);

 // 캐릭터 표시 높이
 const CHARACTER_HEIGHT=cfg.display.height; // 현재 170

 // 애니메이션 생성 예시
 for(const state in cfg.animations){
   const info=cfg.animations[state];
   const frames=[];
   for(let i=1;i<=info.frameCount;i++){
      frames.push(
        `assets/ninja/${state}/${String(i).padStart(2,"0")}.png`
      );
   }
   console.log(state,frames);
 }

 // 화면 중앙 고정
 // 이동 시 배경만 이동
}
loadConfig();
