import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/data/admin/dbServer", () => ({ adminDb: vi.fn(() => ({})) }));
vi.mock("@/data/seo/store", () => ({ saveJournal: vi.fn(), deleteJournal: vi.fn(), saveField: vi.fn() }));
vi.mock("@/data/seo/sync", () => ({ syncSeo: vi.fn() }));
import { requireAdmin } from "@/lib/auth/session";
import { adminDb } from "@/data/admin/dbServer";
import { journalAction, fieldAction, syncAction } from "./actions";
beforeEach(() => { vi.clearAllMocks(); });
it("모든 변경은 관리자 검사를 먼저 수행하고 인증 리디렉션을 삼키지 않는다", async () => {
  vi.mocked(requireAdmin).mockRejectedValue(new Error("NEXT_REDIRECT"));
  for (const action of [() => journalAction({}, new FormData()), () => fieldAction({}, new FormData()), () => syncAction()]) await expect(action()).rejects.toThrow("NEXT_REDIRECT");
  expect(adminDb).not.toHaveBeenCalled();
});
