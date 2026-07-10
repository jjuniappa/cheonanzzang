# 천안짱 닌자 조작 프로젝트

모션마다 서로 다른 프레임 수를 `config.json`에서 관리하는 구조입니다.

## 폴더 구조

```text
assets/
└── ninja/
    ├── config.json
    ├── idle/
    ├── walk/
    └── skill/
```

## 파일명 규칙

기본 설정은 두 자리 번호입니다.

```text
idle/idle_01.png
idle/idle_02.png
...

walk/walk_01.png
walk/walk_02.png
...

skill/skill_01.png
skill/skill_02.png
...
```

## 모션별 프레임 수 변경

`assets/ninja/config.json`을 수정합니다.

```json
{
  "animations": {
    "idle": {
      "frameCount": 4
    },
    "walk": {
      "frameCount": 6
    },
    "skill": {
      "frameCount": 8
    }
  }
}
```

예를 들어 Idle 7장, Walk 12장, Skill 15장이면 각각 다음처럼 바꿉니다.

```json
"frameCount": 7
"frameCount": 12
"frameCount": 15
```

각 모션의 `fps`도 개별 설정할 수 있습니다.

## 설정 설명

- `frameCount`: 해당 모션의 총 프레임 수
- `fps`: 초당 재생 프레임 수
- `loop`: 반복 여부
- `filePrefix`: 파일명 앞부분
- `numberPadding`: 번호 자릿수
- `extension`: 파일 확장자
- `display.height`: 캐릭터 표시 높이
- `display.offsetX`, `offsetY`: 중앙 기준 보정 위치

## 중요

`fetch()`로 `config.json`을 읽기 때문에 파일을 더블클릭해서 여는 대신 웹 서버에서 실행해야 합니다.

```bash
python -m http.server 8000
```

브라우저에서 다음 주소로 접속합니다.

```text
http://localhost:8000
```

GitHub Pages에서도 정상 작동합니다.
