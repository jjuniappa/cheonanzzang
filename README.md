# Ninja Game – 자동 에셋 인식 버전

## 사용법

아래 폴더에 이미지 파일을 업로드하고 GitHub `main` 브랜치에 push하세요.

- `assets/ninja/idle`
- `assets/ninja/walk`
- `assets/ninja/skill`
- `assets/shuriken`

파일명은 자유입니다. 예:

- `idle-a.png`
- `walk_03.webp`
- `throw-final.png`

GitHub Actions가 폴더를 스캔하여 `assets-manifest.js`를 자동 생성하고 GitHub Pages에 배포합니다.

## 로컬 실행

에셋을 넣은 뒤:

```bash
npm run assets
python -m http.server 8000
```

그다음 `http://localhost:8000`으로 접속합니다.

## 중요

정적 웹브라우저는 폴더의 파일 목록을 직접 읽을 수 없습니다.
그래서 GitHub Action 또는 `npm run assets` 단계가 필요합니다.
이 프로젝트는 그 과정을 자동화했습니다.
