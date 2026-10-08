# 단지분석 포스팅 생성기

홍보자료 캡처를 넣으면 단지 정보를 읽어 검증대에 정리하고, 분양·입주 단지 포스팅(소제목 + 4문장 단락, Q&A, 태그)을 작성함. 원고 속 숫자는 검증대 자료와 자동 대조함.

## 구성

- `index.html` — 화면 전체 (빌드 없음)
- `api/claude.js` — Anthropic API 중계 함수. API 키는 서버에만 있고 브라우저로 나가지 않음
- `vercel.json` — 함수 최대 실행 시간 300초, 검색엔진 노출 차단

## Vercel 환경변수

| 이름 | 필수 | 내용 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 필수 | console.anthropic.com에서 발급한 API 키 |
| `APP_PASSWORD` | 필수 | 화면에 들어갈 때 입력할 사무소 비밀번호 |
| `MODEL` | 선택 | 기본값 `claude-sonnet-5-5`. 판독 정확도를 더 높이려면 `claude-opus-5-5` |

환경변수를 바꾼 뒤에는 Vercel에서 Redeploy해야 반영됨.

## 비용

API 사용량은 Anthropic 콘솔 결제로 청구됨. 캡처 판독과 글 작성을 합쳐 단지 1건당 수만~십수만 토큰 수준이며, 콘솔에서 월 사용 한도를 걸어두는 것을 권장함.
