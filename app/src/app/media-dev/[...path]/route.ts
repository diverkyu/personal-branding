import { createLocalStorage } from "@/media/localStorage";
import { isValidStorageKey, mediaStoreKind } from "@/media/storage";

/**
 * 개발·시험 전용: 로컬 저장소(MEDIA_STORE=local)의 이미지를 보여 준다. 운영(MEDIA_STORE=blob 또는 미설정)에서는 항상 404 다.
 * 서버가 만든 키 형식만 받아 경로 탈출을 막는다.
 */
export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const notFound = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  if (mediaStoreKind() !== "local") return notFound();
  const { path } = await params;
  const key = `media/${path.join("/")}`;
  if (!isValidStorageKey(key)) return notFound();
  const data = await createLocalStorage(process.env.MEDIA_LOCAL_DIR || ".media-dev").read(key);
  if (!data) return notFound();
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
      "Cache-Control": "no-store",
    },
  });
}
