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


## 이동 제한
궁극기 발동 시작부터 8프레임 모션 종료까지 조이스틱 입력이 완전히 잠기며 배경도 움직이지 않습니다.


## 캐릭터 크기 보정

Idle, Walk, Skill, Ultimate PNG의 캔버스 크기나 투명 여백이 서로 달라도,
코드가 실제로 보이는 픽셀 영역을 자동 계산해 `PLAYER_SIZE` 크기에 맞춥니다.

따라서 수리검 모션에서만 캐릭터가 작아지는 현상이 발생하지 않습니다.


## 이번 수정

- 궁극기 쿨다운과 숫자 카운트다운을 제거했습니다.
- 궁극기 발동 중에만 이동이 잠깁니다.
- 궁극기 모션과 이펙트가 끝나면 조이스틱이 즉시 다시 활성화됩니다.
- 화면 상단에서 `궁극기`, `충전`, `참격` 에셋 로드 개수를 확인할 수 있습니다.
- 궁극기 캐릭터 파일명은 `assets/ninja/ultimate/ultimate01.png`부터 `ultimate08.png`까지입니다.


## 궁극기 프레임 이벤트 흐름

```text
ultimate01
ultimate02
ultimate03
ultimate04
ultimate05 + charge01~04 반복
ultimate06
ultimate07
ultimate08
slash01
slash02
slash03
slash04
Idle
```

- `ultimate05`에 진입하면 `ultimateCharge` 4프레임이 반복됩니다.
- 로딩 시간이 끝나면 충전 이펙트를 종료하고 `ultimate06`으로 넘어갑니다.
- `ultimate08` 종료 직후 `ultimateSlash` 4프레임이 한 번 재생됩니다.
- 참격 시작 시 십자 범위 피해가 한 번 적용됩니다.
- 참격이 끝나면 즉시 이동할 수 있습니다.
- 궁극기 쿨다운과 카운트다운은 없습니다.

### 에셋 경로

```text
assets/ninja/ultimate/ultimate01.png ~ ultimate08.png
assets/effects/ultimateCharge/charge01.png ~ charge04.png
assets/effects/ultimateSlash/slash01.png ~ slash04.png
```

### 로딩 시간 변경

`game.js` 상단:

```javascript
ULTIMATE_CHARGE_HOLD_MS: 900
```


## 중요 수정

- 궁극기 사용 후 쿨다운은 전혀 없습니다.
- 참격 4프레임이 끝나는 즉시 이동과 궁극기 버튼이 다시 활성화됩니다.
- `ultimateCharge`와 `ultimateSlash`는 아래 두 파일명 규칙을 모두 지원합니다.

```text
assets/effects/ultimateCharge/charge01.png
assets/effects/ultimateCharge/ultimateCharge01.png

assets/effects/ultimateSlash/slash01.png
assets/effects/ultimateSlash/ultimateSlash01.png
```

각각 01~04까지 넣으면 됩니다.
화면 상단에 `충전 4 · 참격 4`가 보이면 정상 로드된 것입니다.


## 궁극기 이펙트 레이어

렌더 순서를 아래처럼 변경했습니다.

```text
배경
적
수리검
캐릭터
ultimateCharge / ultimateSlash
```

따라서 궁극기 충전 및 참격 이펙트가 캐릭터보다 위 레이어에 표시됩니다.
