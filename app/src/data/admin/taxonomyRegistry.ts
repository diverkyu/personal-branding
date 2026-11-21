/**
 * 태그·카테고리 "미리 등록하는 목록" (ADMIN-DESIGN §46). 글에서 쓰고 있는 이름만 보이던 태그·카테고리 화면에서,
 * 쓰는 글이 없어도 새 이름을 **미리 만들어 두고**, 쓰지 않는 이름은 목록에서 지울 수 있게 한다.
 * - 저장 위치: 기존 `site_settings` 표의 두 행(`taxonomy.tags`, `taxonomy.categories`). 값은 이름의 JSON 배열이다. **DB 마이그레이션 없음.**
 * - 등록 목록은 "고르기 쉽게 하는 후보"일 뿐이다. 글에 새 이름을 직접 써도 되고(예전처럼), 등록하지 않았다고 막지 않는다.
 * - 활동 기록에는 이름을 남기지 않는다(종류·건수만).
 */
import { and, eq } from "drizzle-orm";
import { EQUIPMENT_LIMITS } from "@/content/equipmentFields";
import { siteSettings } from "@/db/schema";
import type { AdminSession } from "@/lib/auth/types";
import { AppError } from "@/lib/errors";
import { recordAudit } from "./audit";
import type { AdminDb } from "./db";

export type TermKind = "tag" | "category";

const KEYS: Record<TermKind, string> = { tag: "taxonomy.tags", category: "taxonomy.categories" };
const LABELS: Record<TermKind, string> = { tag: "태그", category: "카테고리" };
/** 등록해 둘 수 있는 이름 수 (한 종류당) */
export const REGISTRY_MAX = 200;
const TAG_MAX = 20;
const CONFLICT = "다른 곳에서 먼저 고쳤습니다. 새로고침한 뒤 다시 시도해 주세요.";
const CONTROL = /[\u0000-\u001f\u007f]/;

const norm = (v: string): string => v.replace(/\s+/g, " ").trim();
const maxLen = (kind: TermKind): number => (kind === "tag" ? TAG_MAX : EQUIPMENT_LIMITS.category);

/** 등록할 이름을 검사해 정리한다. 태그는 쉼표로 구분해 입력하므로 이름에 쉼표를 쓸 수 없다 */
export function validateTermName(kind: TermKind, raw: string): string {
  const name = norm(raw);
  const label = LABELS[kind];
  if (!name) throw new AppError("validation", `${label} 이름을 입력해 주세요.`);
  if (name.length > maxLen(kind)) throw new AppError("validation", `${label} 이름은 ${maxLen(kind)}자까지 쓸 수 있습니다.`);
  if (CONTROL.test(name)) throw new AppError("validation", `${label} 이름에 쓸 수 없는 문자가 있습니다.`);
  if (kind === "tag" && /[,，]/.test(name)) throw new AppError("validation", "태그 이름에는 쉼표를 쓸 수 없습니다. 태그는 쉼표로 구분해 입력합니다.");
  return name;
}

function parse(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const raw: unknown = JSON.parse(value);
    if (!Array.isArray(raw)) return [];
    const out: string[] = [];
    for (const v of raw) if (typeof v === "string") {
      const n = norm(v);
      if (n && !out.includes(n)) out.push(n);
    }
    return out;
  } catch {
    return [];
  }
}

async function load(db: AdminDb, kind: TermKind): Promise<{ names: string[]; version: number | null }> {
  const [row] = await db.select({ value: siteSettings.value, version: siteSettings.version }).from(siteSettings).where(eq(siteSettings.key, KEYS[kind])).limit(1);
  return { names: parse(row?.value), version: row?.version ?? null };
}

async function save(db: AdminDb, admin: AdminSession, kind: TermKind, names: string[], version: number | null): Promise<void> {
  const value = JSON.stringify(names);
  if (version === null) {
    const inserted = await db.insert(siteSettings).values({ key: KEYS[kind], value, version: 1, updatedBy: admin.userId }).onConflictDoNothing().returning({ key: siteSettings.key });
    if (inserted.length === 0) throw new AppError("validation", CONFLICT);
    return;
  }
  const updated = await db
    .update(siteSettings)
    .set({ value, version: version + 1, updatedAt: new Date(), updatedBy: admin.userId })
    .where(and(eq(siteSettings.key, KEYS[kind]), eq(siteSettings.version, version)))
    .returning({ key: siteSettings.key });
  if (updated.length === 0) throw new AppError("validation", CONFLICT);
}

/** 미리 등록해 둔 이름 (가나다순) */
export async function listRegisteredTerms(db: AdminDb, admin: AdminSession, kind: TermKind): Promise<string[]> {
  void admin;
  const { names } = await load(db, kind);
  return [...names].sort((a, b) => a.localeCompare(b, "ko"));
}

/** 새 이름을 등록한다. 이미 등록돼 있으면 `added: false` 로 알린다 */
export async function addRegisteredTerm(db: AdminDb, admin: AdminSession, kind: TermKind, raw: string): Promise<{ name: string; added: boolean }> {
  const name = validateTermName(kind, raw);
  const { names, version } = await load(db, kind);
  if (names.includes(name)) return { name, added: false };
  if (names.length >= REGISTRY_MAX) throw new AppError("validation", `${LABELS[kind]}는 ${REGISTRY_MAX}개까지 등록할 수 있습니다. 쓰지 않는 이름을 먼저 지워 주세요.`);
  await save(db, admin, kind, [...names, name], version);
  await recordAudit(db, admin, { action: "taxonomy.add", targetType: kind, meta: { count: names.length + 1 } });
  return { name, added: true };
}

/** 등록 목록에서 이름을 뺀다 (글에서 쓰는 이름을 지우는 것이 아니다). 등록돼 있지 않으면 아무것도 하지 않는다 */
export async function removeRegisteredTerm(db: AdminDb, admin: AdminSession, kind: TermKind, raw: string): Promise<{ removed: boolean }> {
  const name = norm(raw);
  if (!name) throw new AppError("not_found", "대상을 찾을 수 없습니다.");
  const { names, version } = await load(db, kind);
  if (!names.includes(name)) return { removed: false };
  await save(db, admin, kind, names.filter((n) => n !== name), version);
  await recordAudit(db, admin, { action: "taxonomy.unregister", targetType: kind, meta: { count: names.length - 1 } });
  return { removed: true };
}

/** 글에서 이름을 바꾸거나(to 가 있으면) 지웠을 때(to 가 null) 등록 목록도 맞춘다. 등록돼 있지 않으면 아무것도 하지 않는다 */
export async function replaceRegisteredTerm(db: AdminDb, admin: AdminSession, kind: TermKind, from: string, to: string | null): Promise<void> {
  const { names, version } = await load(db, kind);
  if (!names.includes(from)) return;
  const next: string[] = [];
  for (const n of names) {
    const mapped = n === from ? to : n;
    if (mapped && !next.includes(mapped)) next.push(mapped);
  }
  await save(db, admin, kind, next, version);
}
