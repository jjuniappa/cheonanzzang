# Ninja Idle Mobile

업로드한 닌자 이미지 4장을 순서대로 재생해 모바일 화면 중앙에 표시하는 정적 웹 게임 시작 프로젝트입니다.

## 폴더 구조

```text
ninja-idle-mobile/
├─ assets/
│  └─ ninja/
│     ├─ 01.png
│     ├─ 02.png
│     ├─ 03.png
│     └─ 04.png
├─ index.html
├─ styles.css
├─ game.js
└─ README.md
```

## 로컬 실행

간단한 로컬 서버를 사용하세요.

```bash
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000`을 엽니다.

## GitHub에 업로드

```bash
git init
git add .
git commit -m "feat: add mobile centered ninja idle animation"
git branch -M main
git remote add origin https://github.com/사용자명/저장소명.git
git push -u origin main
```

## GitHub Pages 배포

저장소의 **Settings → Pages**에서 다음을 선택합니다.

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`

## 조절 가능한 값

`game.js`의 아래 값을 변경하면 프레임 속도가 바뀝니다.

```js
const FRAME_DURATION = 140;
```

숫자가 작을수록 빠르게 재생됩니다.
