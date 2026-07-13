# Ninja Shuriken Prototype

모바일 브라우저용 닌자 수리검 프로토타입입니다.

## 구현 내용

- 닌자는 화면 중앙에 고정됩니다.
- 가상 조이스틱 입력 시 월드와 체크무늬 배경이 움직입니다.
- 수리검 버튼을 누르면 스킬 모션의 2번째 프레임 시점에 발사됩니다.
- 수리검은 5칸(`TILE_SIZE × 5`)을 이동한 뒤 사라집니다.
- 사거리 안에서 적과 충돌하면 적 에너지가 1 감소합니다.
- 스킬 재사용 대기시간은 0ms입니다. 빠르게 누른 횟수만큼 발사가 예약됩니다.
- 모든 닌자 애니메이션은 `PLAYER_SIZE`를 사용하므로 표시 크기가 동일합니다.

## 에셋 폴더

```text
assets/
├── ninja/
│   ├── idle/
│   ├── walk/
│   └── skill/
└── shuriken/
```

폴더는 비어 있으며 `.gitkeep`만 들어 있습니다.

## 파일명 등록

브라우저는 정적 웹사이트의 폴더 파일 목록을 자동으로 읽을 수 없습니다.
에셋을 업로드한 뒤 `assets-manifest.js`에 실제 파일명을 재생 순서대로 적어 주세요.

```js
window.ASSET_MANIFEST = {
  ninja: {
    idle: ["idle-a.png", "idle-b.png", "idle-c.png", "idle-d.png"],
    walk: ["walk-a.png", "walk-b.png", "walk-c.png", "walk-d.png"],
    skill: ["skill-a.png", "skill-b.png", "skill-c.png", "skill-d.png"]
  },
  shuriken: [
    "shuriken-a.png",
    "shuriken-b.png",
    "shuriken-c.png",
    "shuriken-d.png"
  ]
};
```

파일명은 `01.png`, `02.png` 형식일 필요가 없습니다.

## 권장 수리검 프레임

- 권장: 4프레임
- 최소: 1프레임
- 가벼운 구성: 2프레임

회전하는 모습 자체를 이미지 프레임에 그려 넣으려면 4프레임이 가장 자연스럽습니다.
코드에서 CSS/Canvas 회전을 추가하지 않으며, 업로드한 프레임만 순서대로 재생합니다.

## 주요 설정

`game.js`의 `CONFIG`에서 조정합니다.

```js
PLAYER_SIZE: 96,
TILE_SIZE: 64,
SHURIKEN_RANGE_TILES: 5,
SHURIKEN_SPEED: 720,
SKILL_COOLDOWN_MS: 0
```

## 테스트

에셋이 없어도 닌자, 적, 수리검이 도형으로 표시되어 동작을 확인할 수 있습니다.

```bash
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000`을 열어 주세요.
