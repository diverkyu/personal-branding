# 검색엔진 등록 안내 — 구글 · 네이버 · 빙 (2026-11-28)

규강이 **어드민과 각 검색 서비스 화면만으로** `www.diverkyu.com` 을 검색엔진에 알리는 순서다. 코드나 Vercel 환경변수는 만지지 않아도 된다. 0.69.0(PR "검색 노출 어드민 설정") 배포 뒤부터 쓸 수 있다.

- 로그인은 규강 본인 계정으로 직접 한다(구글 계정, 네이버 아이디, Microsoft 계정). 비밀번호를 누구에게도 알려 주지 않는다.
- 각 서비스가 주는 **소유 확인 값은 비밀번호가 아니다.** 사이트의 모든 페이지 head 에 그대로 보이는 공개 문자열이다.
- 등록해도 바로 검색에 나오지는 않는다. 며칠~몇 주 걸린다. 요청은 "와 달라"고 알리는 것이지 보장이 아니다.

## 0. 시작 전 확인

| 확인 | 상태 (2026-11-28) |
| --- | --- |
| 개인정보 처리방침 게시 | 완료 (`/privacy`, 시행일 2026. 11. 28.) |
| 사이트 주소 `SITE_URL` = `https://www.diverkyu.com` | 완료 (사이트맵·정규 주소 확인) |
| 옛 임시 주소 → `www.diverkyu.com` 308 | 완료 |
| Vercel Pro 전환 (공개 운영 조건, INFRASTRUCTURE §2) | 규강 확인 필요 |
| 공개해도 되는 글만 공개 상태인지 | 규강 확인. **한 번 알려진 주소는 오래 남는다** |

## 1. 사이트 구조와 사이트맵 규칙

```
홈 /
├─ About /about
├─ Story /story ── 글 상세 /story/{글}
├─ Freediving /freediving
│   ├─ 투어 /freediving/tours ── 투어 상세
│   ├─ 장비 /freediving/equipment ── 장비 상세        (공개 장비가 있을 때만)
│   ├─ 수강 후기 /freediving/reviews                  (공개 후기가 있을 때만)
│   └─ 여행 추천 /freediving/travel ── 여행 상세      (공개 글이 있을 때만)
├─ Films /films ── 작품 상세                         (공개 작품이 있을 때만)
├─ Contact /contact
└─ 개인정보 처리방침 /privacy

검색 차단: /admin/ · /dev/ · /api/ · 어드민 미리보기
```

- 사이트맵 주소: `https://www.diverkyu.com/sitemap.xml`. 글을 공개하면 **5분 안에 자동으로** 들어간다. 따로 만들 필요가 없다.
- "준비 중"인 빈 목록(지금은 장비·후기·여행 추천)은 사이트맵에서 빠져 있다가, 첫 공개 글이 생기면 자동으로 들어간다.
- 같은 글이 필터 주소(`?tag=` 등)로 열려도 페이지마다 "대표 주소는 이것"이라는 표시(canonical)가 있어 하나로 모인다.

## 2. 순서 한눈에

1. 구글·네이버(·빙) 소유 확인 값을 어드민에 붙여 넣는다 — 노출을 켜기 전에 해도 된다
2. 어드민에서 **검색엔진에 노출 → 켜기**
3. 각 서비스에 사이트맵 제출
4. 홈 주소 색인 요청

## 3. 구글 서치콘솔 (구글 검색·AI 개요)

1. <https://search.google.com/search-console> 에 규강 구글 계정으로 들어간다.
2. **속성 추가** → 오른쪽 **URL 접두어** 칸에 `https://www.diverkyu.com/` 를 넣고 계속.
3. 소유권 확인 방법에서 **HTML 태그**를 펼친다. `<meta name="google-site-verification" content="…" />` 한 줄을 **복사**한다. (아직 "확인"은 누르지 않는다)
4. 새 탭에서 **어드민 → 사이트 설정 → 검색·공유 → 구글 서치콘솔 소유 확인** 칸에 그 한 줄을 통째로 붙여 넣고 **검색·공유 저장**. (어드민이 content 값만 골라 저장한다)
5. 1~5분 기다린 뒤 서치콘솔로 돌아와 **확인**을 누른다. "소유권이 확인됨"이 나오면 끝.
6. (2번 "노출 켜기"를 마친 뒤) 왼쪽 메뉴 **Sitemaps** → `sitemap.xml` 입력 → **제출**. 상태가 "성공"이면 된다.
7. 위쪽 **URL 검사** 칸에 `https://www.diverkyu.com/` → **색인 생성 요청**.

## 4. 네이버 서치어드바이저 (네이버 검색·AI 브리핑)

1. <https://searchadvisor.naver.com> → 오른쪽 위 **웹마스터 도구** → 규강 네이버 아이디로 로그인.
2. **사이트 등록** 칸에 `https://www.diverkyu.com` (https 포함 전체) → 추가.
3. 소유확인 방법에서 **HTML 태그**를 고르고 `<meta name="naver-site-verification" content="…" />` 한 줄을 복사한다.
4. **어드민 → 사이트 설정 → 검색·공유 → 네이버 서치어드바이저 소유 확인** 칸에 붙여 넣고 저장.
5. 1~5분 뒤 서치어드바이저에서 **소유확인**. 바로 안 되면 몇 시간 뒤 다시 누른다.
6. (노출 켜기 뒤) 사이트를 고르고 **요청 → 사이트맵 제출** → `https://www.diverkyu.com/sitemap.xml` 전체 주소로 제출.
7. **검증 → robots.txt** 에서 수집이 허용되어 있는지 본다.
8. **요청 → 웹 페이지 수집** → `https://www.diverkyu.com/` (전체 주소) → 확인.

네이버는 소유 확인을 1년마다 다시 할 수 있다. 어드민 칸의 값을 지우지 않고 그대로 두면 된다.

## 5. 빙 웹마스터 (빙·Copilot, 여러 AI 검색이 참고)

**가장 쉬운 방법 — 구글 서치콘솔에서 가져오기** (3번을 마친 뒤)

1. <https://www.bing.com/webmasters> → Microsoft 계정(또는 구글 계정)으로 로그인.
2. **Import from Google Search Console(구글 서치콘솔에서 가져오기)** → 구글 계정 연결 허용 → `https://www.diverkyu.com/` 선택 → 가져오기.
3. 소유 확인과 사이트맵이 함께 넘어온다. 어드민의 빙 칸은 **비워 둬도 된다.**

직접 추가할 때만: **Add your site manually** → 주소 입력 → **HTML Meta Tag** 의 `<meta name="msvalidate.01" content="…" />` 를 **어드민 → 빙 웹마스터 소유 확인** 칸에 붙여 넣고 저장 → Verify → Sitemaps 에 사이트맵 주소 제출.

## 6. 검색엔진에 노출 켜기 (어드민)

1. **어드민 → 사이트 설정 → 검색·공유 → 검색엔진에 노출** 을 **켜기**로 바꾸고 저장.
2. 몇 분 뒤 <https://www.diverkyu.com/robots.txt> 를 연다. 아래처럼 나오면 켜진 것이다.

```
User-Agent: *
Allow: /
Disallow: /admin/
Disallow: /dev/
Disallow: /api/
Disallow: /media-dev/

Sitemap: https://www.diverkyu.com/sitemap.xml
```

꺼져 있으면 `Disallow: /` 한 줄만 나온다.

- 운영 사이트에서만 켜진다. 프리뷰 주소는 이 스위치와 관계없이 항상 막혀 있다.
- AI 검색·AI 학습 크롤러(ChatGPT, Claude, Perplexity, Gemini 등)도 허용한다(2026-11-28 Lucia 결정, 규강 확인 대기). 막고 싶으면 개발 요청으로 바꾼다.
- **다시 끄면** 검색엔진이 새로 가져가지 않을 뿐, 이미 검색에 나온 주소가 바로 사라지지는 않는다. 특정 주소를 빼려면 각 서비스의 "삭제 요청" 기능을 쓴다(robots.txt 로 막지 않는다).
- 어드민 **대시보드의 점검 카드**에 "검색 노출"과 "검색엔진 소유 확인" 상태가 글자로 나온다.

## 7. 그다음 — 새 글을 쓸 때

- 공개하면 사이트맵에 자동으로 들어간다. 대부분은 이것으로 충분하다.
- 중요한 새 글·크게 고친 글만 구글 **URL 검사 → 색인 생성 요청**, 네이버 **웹 페이지 수집**으로 알린다. 같은 글을 여러 번 요청해도 빨라지지 않는다(구글은 하루 한도도 있다).
- 검색에 나왔는지는 `site:diverkyu.com` 검색으로 판단하지 않는다(0개여도 색인되어 있을 수 있다). 구글은 서치콘솔 **URL 검사**, 네이버는 **웹 페이지 수집** 결과로 본다.
- 작업자 컴퓨터에 설치된 `geo-index` 스킬로 요청 전 점검·요청을 한꺼번에 할 수도 있다(저장소에는 넣지 않는 개발 도구, SEO-GEO §6).

## 8. 막혔을 때

| 증상 | 확인할 것 |
| --- | --- |
| 소유 확인 실패 | 어드민에서 **저장**을 눌렀는지, 5분 지났는지. 브라우저에서 `view-source:https://www.diverkyu.com` 을 열어 `google-site-verification`(네이버는 `naver-site-verification`) 줄이 있는지 찾아본다 |
| 어드민 저장 때 "소유 확인 값 형식이 아닙니다" | 서비스가 준 **메타 태그 한 줄** 또는 `content` 값만 붙여 넣는다. 파일 다운로드 방식(HTML 파일)은 쓰지 않는다 |
| 사이트맵 "가져올 수 없음" | 6번 노출 켜기를 했는지, robots.txt 에 `Sitemap:` 줄이 있는지 |
| 대시보드 "운영 배포가 아니라서 막혀 있습니다" | 프리뷰 주소에서 보고 있다. 운영 주소 어드민에서 확인 |
| 대시보드 "환경변수 SITE_INDEXING=off 로 막혀 있습니다" | Vercel 환경변수에 비상 차단이 걸려 있다. 지우고 다시 배포해야 어드민 스위치가 동작한다 |

## 9. 개발 쪽 참고

- 판단 순서: 환경변수 `SITE_INDEXING=off`(강제 차단) / `=on`(강제 허용, 예전 방식) → Vercel 운영 배포(`VERCEL_ENV=production`)가 아니면 차단 → 임시 주소면 차단 → 어드민 `seo.indexing` 이 on 일 때만 허용 (`config/env.ts` `indexingDecision`).
- 소유 확인 값은 어드민 `seo.verify.google|naver|bing` 이 먼저, 비면 환경변수 `GOOGLE_/NAVER_/BING_SITE_VERIFICATION` (`lib/seo.ts` `verificationOf`).
- 노출을 켠 운영 사이트를 원격 점검할 때는 `REMOTE_EXPECT_INDEXING=on npm run test:remote` 로 돌린다(기본은 프리뷰처럼 막혀 있는지 본다).
