/**
 * 큰 사진은 올리기 전에 브라우저에서 줄인다(휴대폰 사진은 서버리스 요청 상한을 넘기 쉽다). 다시 그리면서 위치정보도 자연히 빠진다.
 * 이것은 편의일 뿐이다 — 서버가 크기·형식을 다시 확인하고 위치정보를 다시 지운다. 줄이지 못하면 원본을 그대로 보내고 서버가 판단한다.
 * 브라우저에서만 쓴다(미디어 화면과 본문 편집기의 올리기가 함께 쓴다).
 */
const DOWNSCALE_OVER_BYTES = 3 * 1024 * 1024;
const DOWNSCALE_EDGE = 2400;

export async function downscaleIfLarge(file: File): Promise<File> {
  if (file.size <= DOWNSCALE_OVER_BYTES || !file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, DOWNSCALE_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    return blob && blob.size < file.size ? new File([blob], "upload.webp", { type: "image/webp" }) : file;
  } catch {
    return file;
  }
}
