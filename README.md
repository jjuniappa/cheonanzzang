# Ninja Mobile Controller

캐릭터는 화면 중앙에 고정되고, 조이스틱 입력에 따라 체크무늬 배경이 이동합니다.

## 에셋 폴더 구조

```text
assets/
└── ninja/
    ├── idle/
    │   ├── 01.png
    │   ├── 02.png
    │   ├── 03.png
    │   └── 04.png
    ├── walk/
    │   ├── 01.png
    │   ├── 02.png
    │   ├── 03.png
    │   └── 04.png
    └── skill/
        ├── 01.png
        ├── 02.png
        ├── 03.png
        └── 04.png
```

- `idle`: 정지 중 반복 재생
- `walk`: 조이스틱을 움직이는 동안 반복 재생
- `skill`: 수리검 버튼을 누를 때 4프레임을 한 번 재생
- 파일명은 반드시 `01.png`부터 `04.png`까지 사용합니다.
- 세 모션의 캔버스 크기와 캐릭터 기준점을 같게 맞추는 것을 권장합니다.

현재 업로드된 닌자 이미지는 `idle` 폴더에만 들어 있습니다. `walk`, `skill` 폴더의 안내 파일을 삭제하고 PNG를 업로드하면 코드 수정 없이 적용됩니다.

## 실행

```bash
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000`을 엽니다.
