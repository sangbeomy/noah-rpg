# 노아 이야기 RPG

성경 속 인물들의 이야기를 아이들과 함께 즐기는 한국어 RPG. **노아와 방주** (창세기 6–9장), 3장.
(모세 이야기 RPG와 같은 엔진을 쓰는 별도 프로젝트입니다.)

1. 하나님의 부탁 — 방주 짓기 (나무 모으기 / 순서 맞추기 / 망치질)
2. 방주 안으로 — 동물 안내하기 / 빗속에서 물방울 피하기
3. 무지개 약속 — 비둘기 날리기 / 약속 이야기 순서 맞추기

## 개발
```
npm install
npm run dev      # 개발 서버
npm run build    # dist/ 생성
```

## 구조
- `src/data/chapters.ts` — 이야기(대사, 선택지, 미니게임). 새 장면은 여기에 추가
- `src/art.ts` — 코드로 그린 인물·소품·배경·장면 (`SC`에 한 줄 추가 → 노드의 `art`로 연결)
- `src/scenes/` — Title / Card / Story / Mini / Hud (Phaser 4)
- 진행 상황은 브라우저 `localStorage`(`noah-rpg-save-v1`)에 자동 저장
- 그림 미리보기: 주소 끝에 `?gallery=1` (2, 3 …)

## 배포
- **Netlify**: 저장소 연결 → 빌드 `npm run build`, 게시 `dist` (`netlify.toml` 포함)
- **GitHub Pages**: Settings → Pages → Source를 *GitHub Actions*로 설정 (`.github/workflows/pages.yml`)
