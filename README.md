# Ninja vs Soldier 1v1

GitHub Pages에서 바로 실행되는 모바일 1:1 배틀 게임 기본 프로젝트입니다.

## 게임 흐름

1. 캐릭터 선택
2. 선택하지 않은 캐릭터가 AI 상대가 됨
3. 머리 위 에너지 게이지가 0이 되면 패배
4. 공격 적중 시 궁극기 게이지 10% 증가
5. 궁극기 게이지 100%에서 궁극기 사용 가능

## 에너지

- 최대 에너지: 20
- 캐릭터 머리 위 한 줄 바
- 칸 구분 없음
- 회복 없음
- 일반 공격 피해: 1
- 궁극기 피해: 5

## 에셋 파일명

### 닌자

```text
assets/ninja/portrait/portrait.png
assets/ninja/idle/idle01.png ~ idle04.png
assets/ninja/walk/walk01.png ~ walk04.png
assets/ninja/skill/skill01.png ~ skill04.png
assets/ninja/ultimate/ultimate01.png ~ ultimate08.png
assets/shuriken/shuriken01.png ~ shuriken04.png
```

### 군인

```text
assets/soldier/portrait/portrait.png
assets/soldier/idle/idle01.png ~ idle04.png
assets/soldier/walk/walk01.png ~ walk04.png
assets/soldier/attack/attack01.png ~ attack04.png
assets/soldier/ultimate/ultimate01.png ~ ultimate08.png
assets/bullet/bullet01.png
```

### 공통 궁극기 이펙트

```text
assets/effects/ultimateCharge/charge01.png ~ charge04.png
assets/effects/ultimateSlash/slash01.png ~ slash04.png
```

## GitHub Pages

프로젝트 파일을 저장소 루트에 업로드한 뒤 GitHub Pages를 활성화하면 됩니다.
추가 빌드나 npm 명령은 필요 없습니다.


## 플레이어 투사체 방향

플레이어의 수리검 또는 총알은 자동으로 상대를 추적하지 않습니다.

- 오른쪽으로 이동 후 공격 → 오른쪽 발사
- 왼쪽 위로 이동 후 공격 → 왼쪽 위 발사
- 이동을 멈춰도 마지막 이동 방향 유지
- 게임 시작 직후에는 오른쪽 발사
- AI 상대만 플레이어 방향으로 자동 조준


## 수정 사항

- 궁극기 이펙트가 캐릭터보다 위 레이어에 표시됩니다.
- 궁극기 8프레임 종료 직후 상대 에너지 5가 감소합니다.
- `ultimateCharge`는 궁극기 자세 재생 중 반복됩니다.
- `ultimateSlash`는 궁극기 자세 종료 후 한 번 재생됩니다.
- PNG의 투명 여백을 자동 계산하여 idle / walk / attack / ultimate 크기가 일정합니다.
- 화면 아래 상태 표시에서 궁극기 이펙트 로드 개수를 확인할 수 있습니다.

정상 예:

```text
궁극기충전 4 · 궁극기참격 4
```


## 군인 궁극기: 미사일 폭격

```text
ultimate01
ultimate02
ultimate03
ultimate04
ultimate05
ultimate06 → 미사일 발사
ultimate07
ultimate08 유지
미사일 비행
착탄
폭발
Idle
```

### 에셋 경로

```text
assets/soldier/ultimate/
  ultimate01.png ~ ultimate08.png

assets/missile/
  missile01.png ~ missile04.png

assets/effects/missileSmoke/
  smoke01.png ~ smoke04.png

assets/effects/explosion/
  explosion01.png ~ explosion06.png
```

### 규칙

- `ultimate06` 진입 시 미사일을 한 번 발사합니다.
- 발사 순간 상대의 위치가 착탄 지점으로 저장됩니다.
- 상대는 미사일 비행 중 이동하여 폭발을 피할 수 있습니다.
- 착탄 지점 반경 2칸 안에 있으면 에너지 5가 감소합니다.
- 폭발 6프레임 종료 후 군인이 Idle로 복귀합니다.
- 별도의 궁극기 쿨다운은 없습니다.
- 에셋이 없어도 임시 미사일, 연기, 폭발 도형으로 동작합니다.


## 캐릭터별 밸런스 설정

### 닌자

```text
이동 속도: 240 px/s
수리검 속도: 800 px/s
수리검 사거리: 5칸
일반 공격 피해: 1
일반 공격 간격: 260ms
```

### 군인

```text
이동 속도: 180 px/s
총알 속도: 900 px/s
총알 사거리: 7칸
일반 공격 피해: 1
일반 공격 간격: 420ms
```

### 공통

```text
최대 에너지: 20
궁극기 피해: 5
군인 미사일 속도: 500 px/s
군인 미사일 폭발 반경: 2칸
```

설정은 `game.js` 상단의 `CHARACTER_CONFIG`에서 변경할 수 있습니다.

```javascript
const CHARACTER_CONFIG = {
  ninja: {
    moveSpeed: 240,
    projectileSpeed: 800,
    projectileRangeTiles: 5,
    basicDamage: 1,
    attackCooldownMs: 260
  },

  soldier: {
    moveSpeed: 180,
    projectileSpeed: 900,
    projectileRangeTiles: 7,
    basicDamage: 1,
    attackCooldownMs: 420
  }
};
```


## 군인 궁극기 150x150 렌더링 규칙

- `assets/soldier/ultimate/ultimate01.png`부터 `ultimate08.png`까지 150x150 투명 PNG를 사용합니다.
- 8개 파일은 동일한 캔버스 위치에 캐릭터가 정렬되어 있어야 합니다.
- 궁극기 스케일은 `ultimate01.png`의 보이는 높이를 기준으로 고정됩니다.
- 3프레임 이후 로켓포가 위로 길어져도 군인 몸 크기는 줄어들지 않습니다.
- 다른 캐릭터 및 Idle/Walk/Attack 렌더링은 기존 방식 그대로입니다.

## 군인 궁극기 재생 순서

1. `ultimate01.png` ~ `ultimate06.png`
2. `assets/effects/missileLaunch/launch01.png` ~ `launch03.png`
3. 기존 `assets/missile/missile01.png` ~ `missile04.png` 애니메이션을 사용하는 미사일 3발이 0ms, 250ms, 500ms 간격으로 화면 위에서 수직 낙하
4. 각 착탄 위치에 폭발 생성 및 범위 피해
5. 세 번째 미사일 착탄 즉시 `ultimate07.png` ~ `ultimate08.png`
6. Idle 복귀

발사 이펙트 PNG가 없으면 임시 발사 플래시가 표시됩니다.
