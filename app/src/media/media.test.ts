import { PGlite } from "@electric-sql/pglite";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import sharp, { type Sharp } from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { auditLog, media } from "@/db/schema";
import { listAudit } from "@/data/admin/audit";
import type { AdminDb } from "@/data/admin/db";
import { createMedia, deleteMedia, listMedia, updateMediaAlt, validateAlt } from "@/data/admin/media";
import type { AdminSession } from "@/lib/auth/types";
import { createLocalStorage } from "./localStorage";
import { MEDIA_LIMITS, detectImageFormat, processImage } from "./process";
import { isValidStorageKey, mediaStoreKind, newStorageKey } from "./storage";

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const admin: AdminSession = { userId: "admin-1", name: "시험 관리자", email: "admin@example.com" };

async function image(format: "jpeg" | "png" | "webp" | "avif", width = 64, height = 48, extra?: (s: Sharp) => Sharp): Promise<Buffer> {
  let s = sharp({ create: { width, height, channels: 3, background: "#3a7" } });
  if (extra) s = extra(s);
  return s[format]().toBuffer();
}

describe("형식 판별 (매직 넘버)", () => {
  it("JPEG·PNG·WebP·AVIF 를 내용으로 알아본다", async () => {
    for (const f of ["jpeg", "png", "webp", "avif"] as const) expect(detectImageFormat(await image(f)), f).toBe(f);
  });

  it("확장자·내용이 다른 파일과 허용 밖 형식은 null 이다", () => {
    expect(detectImageFormat(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).toBeNull();
    expect(detectImageFormat(Buffer.from("GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff,\x00\x00"))).toBeNull();
    expect(detectImageFormat(Buffer.from("<?php system($_GET['c']); ?> padding padding"))).toBeNull();
    expect(detectImageFormat(Buffer.from("short"))).toBeNull();
  });
});

describe("이미지 처리", () => {
  it("모든 허용 형식을 WebP 로 다시 만든다", async () => {
    for (const f of ["jpeg", "png", "webp", "avif"] as const) {
      const out = await processImage(await image(f));
      expect(out.mime).toBe("image/webp");
      expect(detectImageFormat(out.data)).toBe("webp");
      expect(out).toMatchObject({ width: 64, height: 48 });
    }
  });

  it("위치정보(EXIF)와 설명 같은 메타데이터를 제거하고 방향은 픽셀에 반영한다", async () => {
    const withExif = await image("jpeg", 80, 40, (s) =>
      s.withExif({ IFD0: { ImageDescription: "secret-location-note", Copyright: "someone" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "37/1 33/1 0/1", GPSLongitudeRef: "E", GPSLongitude: "126/1 58/1 0/1" } }),
    );
    expect(withExif.includes(Buffer.from("secret-location-note"))).toBe(true); // 입력에는 있었다
    const out = await processImage(withExif);
    expect(out.data.includes(Buffer.from("secret-location-note"))).toBe(false);
    expect(out.data.includes(Buffer.from("Exif"))).toBe(false);
    const meta = await sharp(out.data).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.icc).toBeUndefined();

    // 방향 6(시계 방향 90도)이면 가로 80x40 이 세로 40x80 으로 저장된다
    const rotated = await sharp(await image("jpeg", 80, 40)).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    const r = await processImage(rotated);
    expect({ w: r.width, h: r.height }).toEqual({ w: 40, h: 80 });
  });

  it("긴 변을 상한으로 줄이고, 작은 이미지는 키우지 않는다", async () => {
    const big = await processImage(await image("png", 3000, 1500));
    expect({ w: big.width, h: big.height }).toEqual({ w: MEDIA_LIMITS.maxEdge, h: 1200 });
    const small = await processImage(await image("png", 100, 50));
    expect({ w: small.width, h: small.height }).toEqual({ w: 100, h: 50 });
  });

  it("거부: SVG·GIF·가짜 확장자(내용이 이미지 아님)·빈 파일", async () => {
    await expect(processImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).rejects.toThrow("JPEG, PNG, WebP, AVIF");
    await expect(processImage(Buffer.from("GIF89a" + "\x00".repeat(40), "binary"))).rejects.toThrow("JPEG, PNG, WebP, AVIF");
    await expect(processImage(Buffer.from("not an image at all, just text pretending"))).rejects.toThrow("JPEG, PNG, WebP, AVIF");
    await expect(processImage(Buffer.alloc(0))).rejects.toThrow("비어");
  });

  it("거부: 크기 초과, 화소 수 초과(압축 폭탄), 손상, 움직이는 이미지", async () => {
    await expect(processImage(Buffer.alloc(MEDIA_LIMITS.maxInputBytes + 1, 0xff))).rejects.toThrow("MB 이하");
    // 매우 큰 해상도지만 단색이라 파일은 작다 (4MB 미만)
    const bomb = await sharp({ create: { width: 8000, height: 8000, channels: 3, background: "#000" } }).png({ compressionLevel: 9 }).toBuffer();
    expect(bomb.length).toBeLessThan(MEDIA_LIMITS.maxInputBytes);
    await expect(processImage(bomb)).rejects.toThrow("처리하지 못했습니다");
    const valid = await image("jpeg", 200, 200);
    await expect(processImage(valid.subarray(0, Math.floor(valid.length / 2)))).rejects.toThrow("처리하지 못했습니다");
    const frame = (c: string) => sharp({ create: { width: 20, height: 20, channels: 3, background: c } }).png().toBuffer();
    const animated = await sharp([await frame("#f00"), await frame("#00f")], { join: { animated: true } })
      .webp({ delay: [100, 100], loop: 0 })
      .toBuffer();
    expect(detectImageFormat(animated)).toBe("webp");
    await expect(processImage(animated)).rejects.toThrow("움직이는 이미지");
  });
});

describe("저장 키·저장소 선택", () => {
  it("키는 서버가 만든 무작위 형식이고 매번 다르다", () => {
    const a = newStorageKey(new Date("2026-11-08T00:00:00Z"));
    const b = newStorageKey(new Date("2026-11-08T00:00:00Z"));
    expect(a).toMatch(/^media\/2026\/11\/[0-9a-f]{32}\.webp$/);
    expect(a).not.toBe(b);
    expect(isValidStorageKey(a)).toBe(true);
    for (const bad of ["../etc/passwd", "media/2026/11/../../x.webp", "media/2026/11/abc.webp", "media/2026/11/" + "a".repeat(32) + ".php", "/media/2026/11/" + "a".repeat(32) + ".webp"]) {
      expect(isValidStorageKey(bad), bad).toBe(false);
    }
  });

  it("환경 설정이 모자라면 저장소는 없다(업로드 불가), local 은 운영에서 쓰이지 않는다", () => {
    expect(mediaStoreKind({})).toBeNull();
    expect(mediaStoreKind({ MEDIA_STORE: "blob" })).toBeNull();
    expect(mediaStoreKind({ MEDIA_STORE: "blob", BLOB_READ_WRITE_TOKEN: "  " })).toBeNull();
    expect(mediaStoreKind({ MEDIA_STORE: "blob", BLOB_READ_WRITE_TOKEN: "token" })).toBe("blob");
    expect(mediaStoreKind({ MEDIA_STORE: "local", NODE_ENV: "development" })).toBe("local");
    expect(mediaStoreKind({ MEDIA_STORE: "local", NODE_ENV: "production" })).toBeNull();
    expect(mediaStoreKind({ MEDIA_STORE: "other" })).toBeNull();
  });

  it("로컬 저장소: 저장·읽기·삭제, 같은 키 덮어쓰기와 경로 탈출 거부", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "kyu-media-"));
    try {
      const store = createLocalStorage(dir);
      const key = newStorageKey();
      const { url } = await store.put(key, Buffer.from("data"), "image/webp");
      expect(url).toBe(`/media-dev/${key.replace(/^media\//, "")}`);
      expect((await store.read(key))?.toString()).toBe("data");
      await expect(store.put(key, Buffer.from("again"), "image/webp")).rejects.toThrow();
      await expect(store.put("../../escape.webp", Buffer.from("x"), "image/webp")).rejects.toThrow("허용되지 않는");
      await store.remove(key);
      expect(await store.read(key)).toBeNull();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("미디어 데이터 (PGlite)", () => {
  let client: PGlite;
  let db: AdminDb;
  beforeAll(async () => {
    client = new PGlite();
    const d = drizzle({ client });
    await migrate(d, { migrationsFolder: path.resolve(__dirname, "../../drizzle") });
    db = d as unknown as AdminDb;
  });
  afterAll(async () => {
    await client.close();
  });
  beforeEach(async () => {
    await db.delete(media);
    await db.delete(auditLog);
  });

  const input = (over: Partial<Parameters<typeof createMedia>[2]> = {}) => ({ storage: "local" as const, storageKey: newStorageKey(), url: "/media-dev/x.webp", bytes: 1234, width: 64, height: 48, ...over });

  it("등록·목록(최신순, 대체 텍스트 없는 수)·대체 텍스트 수정", async () => {
    const a = await createMedia(db, admin, input());
    const b = await createMedia(db, admin, input({ alt: "  바다 위의 배  " }));
    const list = await listMedia(db, admin, 1);
    expect(list.total).toBe(2);
    expect(list.missingAlt).toBe(1);
    expect(list.items.map((i) => i.id)).toEqual([b.id, a.id]);
    expect(b.alt).toBe("바다 위의 배");
    await updateMediaAlt(db, admin, a.id, "수면 아래 햇빛");
    expect((await listMedia(db, admin, 1)).missingAlt).toBe(0);
    await updateMediaAlt(db, admin, a.id, "   ");
    expect((await listMedia(db, admin, 1)).missingAlt).toBe(1);
  });

  it("대체 텍스트는 길이를 제한하고, 없는 id·형식이 틀린 id 는 거부한다", async () => {
    const a = await createMedia(db, admin, input());
    await expect(updateMediaAlt(db, admin, a.id, "가".repeat(201))).rejects.toThrow("200자");
    await expect(updateMediaAlt(db, admin, "not-a-uuid", "x")).rejects.toThrow();
    await expect(updateMediaAlt(db, admin, "00000000-0000-4000-8000-000000000000", "x")).rejects.toThrow();
    expect(validateAlt("  여러   공백\n줄바꿈  ")).toEqual({ ok: true, value: "여러 공백 줄바꿈" });
  });

  it("삭제하면 라이브러리에서 사라지고 다시 삭제·수정할 수 없다", async () => {
    const a = await createMedia(db, admin, input());
    await deleteMedia(db, admin, a.id);
    expect((await listMedia(db, admin, 1)).total).toBe(0);
    await expect(deleteMedia(db, admin, a.id)).rejects.toThrow();
    await expect(updateMediaAlt(db, admin, a.id, "x")).rejects.toThrow();
    expect(await db.select().from(media)).toHaveLength(1); // 행은 남는다(파일 정리는 휴지통 단계)
  });

  it("활동 기록에는 파일 정보 수치만 남고 대체 텍스트 내용은 남지 않는다", async () => {
    const a = await createMedia(db, admin, input({ alt: "비밀 장소의 사진" }));
    await updateMediaAlt(db, admin, a.id, "비밀 장소 새 설명");
    await deleteMedia(db, admin, a.id);
    const { items } = await listAudit(db, admin, 1);
    expect(items.map((i) => i.action).sort()).toEqual(["media.alt_update", "media.delete", "media.upload"]);
    expect(JSON.stringify(items)).not.toContain("비밀");
  });

  it("DB 제약: webp 만, 같은 저장 경로 중복 불가", async () => {
    await expect(client.query(`insert into media (storage, storage_key, url, mime, bytes, width, height, created_by) values ('local','k1','u','image/jpeg',1,1,1,'a')`)).rejects.toThrow();
    await expect(client.query(`insert into media (storage, storage_key, url, mime, bytes, width, height, created_by) values ('s3','k2','u','image/webp',1,1,1,'a')`)).rejects.toThrow();
    await client.query(`insert into media (storage, storage_key, url, mime, bytes, width, height, created_by) values ('local','k3','u','image/webp',1,1,1,'a')`);
    await expect(client.query(`insert into media (storage, storage_key, url, mime, bytes, width, height, created_by) values ('local','k3','u','image/webp',1,1,1,'a')`)).rejects.toThrow();
  });
});
