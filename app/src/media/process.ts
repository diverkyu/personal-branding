/**
 * 업로드 이미지 처리 (SECURITY §7). 서버가 모든 것을 다시 확인하고 다시 만든다:
 * - 파일 내용(매직 넘버)으로 형식을 판별한다. 확장자·클라이언트가 말한 MIME 은 믿지 않는다.
 * - 허용: JPEG, PNG, WebP, AVIF. SVG·GIF·그 외는 거부한다. 움직이는 이미지도 거부한다.
 * - 크기(바이트)와 해상도(화소 수)에 상한을 둔다.
 * - 회전 정보(EXIF)를 반영한 뒤 **메타데이터(GPS 등)를 모두 버리고** 긴 변 기준으로 줄여 WebP 로 다시 만든다.
 */
import sharp from "sharp";
import { AppError } from "@/lib/errors";

export const MEDIA_LIMITS = {
  /** 업로드 파일 상한. 서버리스 요청 본문 상한(약 4.5MB)보다 작게 둔다 */
  maxInputBytes: 4 * 1024 * 1024,
  /** 입력 이미지 화소 수 상한 (약 40메가픽셀: 압축 폭탄 방지) */
  maxInputPixels: 40_000_000,
  /** 저장하는 이미지의 긴 변 상한 */
  maxEdge: 2400,
  webpQuality: 82,
} as const;

export type DetectedFormat = "jpeg" | "png" | "webp" | "avif";

/** 파일 앞부분의 매직 넘버로 형식을 판별한다. 허용 목록 밖이면 null */
export function detectImageFormat(buf: Uint8Array): DetectedFormat | null {
  if (buf.length < 12) return null;
  const at = (i: number) => buf[i];
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "jpeg";
  if (at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47 && at(4) === 0x0d && at(5) === 0x0a && at(6) === 0x1a && at(7) === 0x0a) return "png";
  const ascii = (from: number, to: number) => String.fromCharCode(...buf.subarray(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (brand === "avif" || brand === "avis") return "avif";
  }
  return null;
}

export interface ProcessedImage {
  data: Buffer;
  width: number;
  height: number;
  mime: "image/webp";
}

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (input.length === 0) throw new AppError("validation", "파일이 비어 있습니다.");
  if (input.length > MEDIA_LIMITS.maxInputBytes) {
    throw new AppError("validation", `파일은 ${Math.round(MEDIA_LIMITS.maxInputBytes / 1024 / 1024)}MB 이하여야 합니다.`);
  }
  if (!detectImageFormat(input)) {
    throw new AppError("validation", "JPEG, PNG, WebP, AVIF 이미지만 올릴 수 있습니다.");
  }
  try {
    const base = sharp(input, { limitInputPixels: MEDIA_LIMITS.maxInputPixels, failOn: "error" });
    const meta = await base.metadata();
    if ((meta.pages ?? 1) > 1) throw new AppError("validation", "움직이는 이미지는 올릴 수 없습니다.");
    if (!meta.width || !meta.height) throw new AppError("validation", "이미지를 읽을 수 없습니다.");
    // rotate(): EXIF 방향을 픽셀에 반영한다. withMetadata 를 쓰지 않으므로 출력에는 EXIF·ICC·GPS 가 남지 않는다.
    const { data, info } = await base
      .rotate()
      .resize({ width: MEDIA_LIMITS.maxEdge, height: MEDIA_LIMITS.maxEdge, fit: "inside", withoutEnlargement: true })
      .webp({ quality: MEDIA_LIMITS.webpQuality })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height, mime: "image/webp" };
  } catch (error) {
    if (error instanceof AppError) throw error;
    // 해상도 상한 초과·손상된 파일·파서 오류 모두 같은 안내로 돌려준다 (내부 오류 내용은 노출하지 않는다)
    throw new AppError("validation", "이미지를 처리하지 못했습니다. 손상되었거나 너무 큰 파일일 수 있습니다.", { cause: error });
  }
}
