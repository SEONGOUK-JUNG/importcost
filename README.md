# ImportCost PWA — 배포 가이드

## 파일 구조
```
importcost/
├── index.html          ← 메인 앱
├── manifest.json       ← PWA 설정
├── sw.js               ← 서비스워커 (오프라인·캐싱)
├── cloudflare-worker.js ← 환율 API 프록시 (Cloudflare 배포)
├── icons/
│   ├── icon-72.png
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-192.png    ← AniBridge와 동일 방식
│   └── icon-512.png
└── README.md
```

## 배포 순서

### 1단계 — GitHub 저장소 생성
```bash
git init
git add .
git commit -m "ImportCost PWA 초기 배포"
git remote add origin https://github.com/YOUR_ID/importcost.git
git push -u origin main
```

### 2단계 — GitHub Pages 활성화
- GitHub 저장소 → Settings → Pages
- Source: Deploy from branch → main → / (root)
- 도메인: importcost.YOUR_ID.github.io

### 3단계 — 커스텀 도메인 연결 (선택)
- importcost.com 또는 원하는 도메인 구매
- Cloudflare DNS 설정 (AniBridge와 동일)
- CNAME 레코드: importcost.com → YOUR_ID.github.io

### 4단계 — Cloudflare Worker 배포 (환율 API)
```bash
npm install -g wrangler
wrangler login
wrangler deploy cloudflare-worker.js --name importcost-rates
```
- 배포 후 URL: https://importcost-rates.YOUR_WORKER.workers.dev/rates
- index.html의 RATE_API 변수를 해당 URL로 변경

### 5단계 — 아이콘 준비
- icon-192.png, icon-512.png 필수
- AniBridge 아이콘 동일 사이즈로 ImportCost용 제작
- https://realfavicongenerator.net 에서 모든 사이즈 자동 생성

## 홈 화면 추가 안내 (사용자용)

### Android
1. Chrome에서 importcost.com 접속
2. 주소창 오른쪽 메뉴(⋮) → "홈 화면에 추가"
3. 또는 화면 하단 "추가" 배너 클릭

### iPhone
1. Safari에서 importcost.com 접속
2. 하단 공유 버튼(□↑) → "홈 화면에 추가"

## 환율 API 무료 한도
- open.er-api.com: 월 1,500회 무료
- Cloudflare Worker 캐싱으로 실제 호출 최소화
- 유료 전환 시: ExchangeRate-API Pro ($10/월, 무제한)
