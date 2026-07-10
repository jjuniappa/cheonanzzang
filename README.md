# 천안짱 닌자 조작 프로토타입 v3

이 버전은 파일을 더블클릭해도 검은 화면만 나오지 않도록 `config.json` 대신 `config.js`를 사용합니다.

## 실행 방법

`index.html`을 브라우저에서 열면 바로 실행됩니다.

## 에셋 구조

```text
assets/ninja/
├── config.js
├── idle/
│   ├── 01.png
│   ├── 02.png
│   └── ...
├── walk/
│   ├── 01.png
│   ├── 02.png
│   └── ...
└── skill/
    ├── 01.png
    ├── 02.png
    └── ...
```

## 프레임 수 변경

`assets/ninja/config.js`의 각 `frameCount` 값을 실제 PNG 수에 맞게 수정합니다.

```js
animations: {
  idle:  { frameCount: 8,  fps: 8,  loop: true },
  walk:  { frameCount: 10, fps: 12, loop: true },
  skill: { frameCount: 15, fps: 18, loop: false }
}
```

## 캐릭터 크기

현재 표시 높이는 170입니다.

```js
display: {
  height: 170
}
```

## 에셋이 없을 때

에셋이 아직 없거나 파일명이 맞지 않아도 화면, 조이스틱, 배경 이동, 스킬 버튼은 작동합니다.
그 경우 안내용 닌자 실루엣이 표시됩니다.
