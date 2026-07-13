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
