# 서드파티 리소스 고지

이 사이트가 사용하는 오픈소스 리소스의 저작권과 라이선스 고지다. 새 리소스를 추가하면 이 파일도 함께 갱신한다 ([docs/phase1/DESIGN-SYSTEM.md](../docs/phase1/DESIGN-SYSTEM.md) §8).

## 글꼴 — SIL Open Font License 1.1

글꼴 파일은 빌드할 때 `next/font/google`이 내려받아 이 사이트에서 직접 제공한다. 라이선스 전문: <https://openfontlicense.org/open-font-license-official-text/>

| 글꼴 | 저작권 |
| --- | --- |
| DM Sans | Copyright 2014 The DM Sans Project Authors (https://github.com/googlefonts/dm-fonts) |
| Noto Sans KR | Copyright 2014-2021 Adobe (http://www.adobe.com/), with Reserved Font Name 'Source' |
| Lora | Copyright 2011 The Lora Project Authors (https://github.com/cyrealtype/Lora-Cyrillic), with Reserved Font Name "Lora" |

OFL에 따라 글꼴 자체를 단독으로 판매하지 않으며, 수정본을 만들 경우 Reserved Font Name을 쓰지 않는다.

## 아이콘 — Lucide (ISC)

`lucide-react` 패키지. Copyright (c) 2026 Lucide Icons and Contributors. 일부 아이콘은 Feather 프로젝트에서 유래했으며 해당 아이콘은 MIT 라이선스(Copyright (c) 2013-present Cole Bemis)를 따른다. 전문: <https://github.com/lucide-icons/lucide/blob/main/LICENSE>

## 프레임워크

`next`(MIT, Vercel), `react`·`react-dom`(MIT, Meta Platforms)로 사이트와 어드민을 만든다. 개발·시험 도구 `typescript`(Apache-2.0), `eslint`(MIT), `vitest`(MIT), `@playwright/test`(Apache-2.0)는 배포 결과물에 포함되지 않는다. 각 패키지의 `license` 필드로 2026-11-25에 확인했다(문서 점검 때 이 절이 빠져 있던 것을 추가).

## 데이터베이스 라이브러리

`drizzle-orm`(Apache-2.0), `@neondatabase/serverless`(MIT)는 운영에서 쓰고, `drizzle-kit`(MIT)과 `@electric-sql/pglite`(Apache-2.0)는 개발·시험에서만 쓴다. 각 패키지의 `license` 필드로 2026-11-08에 확인했다.

## 어드민 인증·보조 도구

`better-auth`(MIT, 어드민 로그인·2차 인증), `qrcode`(MIT, 2차 인증 등록 QR), `tsx`(MIT, 개발용 스크립트 실행)는 각 패키지의 `license` 필드로 2026-11-08에 확인했다.

## 이미지 업로드

`@vercel/blob`(Apache-2.0, 이미지 저장소 연결)과 `sharp`(Apache-2.0, 업로드 이미지의 형식 확인·위치정보 제거·WebP 변환)를 쓴다. sharp는 홈 화면 추가 아이콘 생성 스크립트(`scripts/make-app-icons.mjs`, 0.63.0)에도 쓴다. sharp는 libvips(LGPL-3.0-or-later)를 미리 빌드한 바이너리로 함께 쓰며 동적으로 연결된다. 각 패키지의 `license` 필드로 2026-11-08에 확인했다. 이미지 파서의 취약점 소식은 의존성 점검에 포함한다 (SECURITY §7).

## 본문 편집기

`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-table`(Tiptap, MIT)과 그 하위 확장·ProseMirror(MIT)를 어드민 본문 편집기에 쓴다. 시험용으로 `jsdom`(MIT)을 쓴다. 각 패키지의 `license` 필드로 2026-11-08에 확인했다(`@tiptap/extension-table`은 2026-11-16에 `npm view`로 MIT 확인). Tiptap의 유료 확장(클라우드·AI·협업 등)은 쓰지 않는다.

## SEO 개발 도구 (2026-11-28)

- `@lhci/cli` 0.16.1 및 Lighthouse 13.6.0: Apache-2.0, GoogleChrome. 개발 의존성, 파일 리포트만 저장. `app/package-lock.json`으로 하위 의존성을 고정한다. 기존 top-level 패키지는 갱신하지 않았다. 새 Lighthouse 의존성의 공유 `tldts-core`는 npm 해석에 따라 7.4.20→7.6.2로 갱신됐다.
- Chrome DevTools MCP 1.14.0: Apache-2.0. 공식 npm 배포본을 고정 실행, 격리 프로필, 사용 통계 및 자동 CrUX 전송 비활성화. 앱 런타임에는 포함되지 않는다.
- Playwright MCP 0.0.86: Apache-2.0. 내부 alpha 엔진 때문에 사용자 결정으로 기본 비활성화. 기존 `@playwright/test` 1.65.0은 유지한다.
- `.agents/skills/`의 seo-audit, schema, site-architecture, ai-seo, analytics: Copyright (c) 2025 Corey Haines, MIT. 커밋 `2bf95edb4ebd37198ab7fd18b99ba95c2145ec64`, 원본 40개 파일을 수정 없이 도입. 라이선스 전문은 `../.agents/skills/MARKETINGSKILLS-LICENSE`, 파일 해시는 `upstream-lock.json`. 하위 외부 도구는 설치하지 않는다.

## 기존 리소스 확인 방법

글꼴은 Google Fonts 저장소의 `METADATA.pb`·`OFL.txt`, 아이콘은 Lucide 저장소의 `LICENSE`로 2026-11-08에 확인했다 ([CONCEPT §7.8](../docs/phase1/CONCEPT.md)).
