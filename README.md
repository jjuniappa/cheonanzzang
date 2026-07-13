# Ninja Game - GitHub Pages 간단 버전

별도 설치, npm, manifest 생성 없이 GitHub Pages 링크에서 바로 실행됩니다.

## 에셋 파일명

아래 파일명을 정확히 사용하세요.

```text
assets/ninja/idle/
  idle01.png
  idle02.png
  idle03.png
  idle04.png

assets/ninja/walk/
  walk01.png
  walk02.png
  walk03.png
  walk04.png

assets/ninja/skill/
  skill01.png
  skill02.png
  skill03.png
  skill04.png

assets/shuriken/
  shuriken01.png
  shuriken02.png
  shuriken03.png
  shuriken04.png
```

## 사용 방법

1. 각 폴더에 이미지 업로드
2. GitHub에 commit
3. GitHub Pages 링크 새로고침

명령어 실행은 필요 없습니다.

## 화면 상단 숫자

정상 로드되면 다음처럼 표시됩니다.

```text
idle 4 · walk 4 · skill 4 · 수리검 4
```

0으로 표시되는 항목은 파일명이나 경로가 잘못된 것입니다.


## 수리검 발사 방향

캐릭터가 마지막으로 움직인 방향을 기억합니다.

- 오른쪽 이동 후 발사 → 오른쪽
- 왼쪽 위 이동 후 발사 → 왼쪽 위
- 아래 이동 중 발사 → 아래
- 이동 전 최초 발사 → 오른쪽

수리검 PNG는 **오른쪽으로 날아가는 방향**을 기준으로 제작하면 됩니다.
게임 코드가 이미지 전체를 실제 이동 방향에 맞게 자동 회전합니다.
