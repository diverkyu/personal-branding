import { revalidatePath, updateTag } from "next/cache";
import { PUBLIC_CONTENT_TAGS } from "@/content/cacheTags";

/**
 * 공개 화면의 콘텐츠 캐시(스토리·투어·장비·후기)를 바로 갱신한다. 발행·취소·삭제·모집 상태 변경·후기 공개/철회 때 서버 액션에서 부른다.
 * (updateTag 는 서버 액션 안에서만 쓸 수 있다. 크론 경로는 revalidateTag 를 쓴다.)
 */
export function refreshPublic(): void {
  for (const tag of PUBLIC_CONTENT_TAGS) updateTag(tag);
  revalidatePath("/", "layout");
}
