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

## 데이터베이스 라이브러리

`drizzle-orm`(Apache-2.0), `@neondatabase/serverless`(MIT)는 운영에서 쓰고, `drizzle-kit`(MIT)과 `@electric-sql/pglite`(Apache-2.0)는 개발·시험에서만 쓴다. 각 패키지의 `license` 필드로 2026-11-08에 확인했다.

## 어드민 인증·보조 도구

`better-auth`(MIT, 어드민 로그인·2차 인증), `qrcode`(MIT, 2차 인증 등록 QR), `tsx`(MIT, 개발용 스크립트 실행)는 각 패키지의 `license` 필드로 2026-11-08에 확인했다.

## 이미지 업로드

`@vercel/blob`(Apache-2.0, 이미지 저장소 연결)과 `sharp`(Apache-2.0, 업로드 이미지의 형식 확인·위치정보 제거·WebP 변환)를 쓴다. sharp는 libvips(LGPL-3.0-or-later)를 미리 빌드한 바이너리로 함께 쓰며 동적으로 연결된다. 각 패키지의 `license` 필드로 2026-11-08에 확인했다. 이미지 파서의 취약점 소식은 의존성 점검에 포함한다 (SECURITY §7).

## 본문 편집기

`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`(Tiptap, MIT)과 그 하위 확장·ProseMirror(MIT)를 어드민 본문 편집기에 쓴다. 시험용으로 `jsdom`(MIT)을 쓴다. 각 패키지의 `license` 필드로 2026-11-08에 확인했다. Tiptap의 유료 확장(클라우드·AI·협업 등)은 쓰지 않는다.

## 확인 방법

글꼴은 Google Fonts 저장소의 `METADATA.pb`·`OFL.txt`, 아이콘은 Lucide 저장소의 `LICENSE`로 2026-11-08에 확인했다 ([CONCEPT §7.8](../docs/phase1/CONCEPT.md)).
