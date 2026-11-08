"use server";

import { headers } from "next/headers";
import { getTour } from "@/data";
import { getInquiryStore } from "@/data/inquiryStore";
import { processSubmission } from "@/lib/forms/process";
import { createDuplicateGuard, createRateLimiter } from "@/lib/forms/rateLimit";
import type { FormState } from "@/lib/forms/state";

// 10분에 같은 접속 주소에서 10번까지. 같은 내용은 10분 안에 한 번만 저장한다.
// 한도는 FORM_RATE_LIMIT 으로 바꿀 수 있다 (E2E 는 같은 주소로 많이 제출하므로 크게 둔다).
const limiter = createRateLimiter({ limit: Number(process.env.FORM_RATE_LIMIT) || 10, windowMs: 10 * 60 * 1000 });
const duplicates = createDuplicateGuard({ windowMs: 10 * 60 * 1000 });

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** 투어 slug 는 폼에 묶어(bind) 받는다. 서버에서 투어와 모집 상태를 다시 확인한다. */
export async function submitReservation(slug: string, _prev: FormState, data: FormData): Promise<FormState> {
  return processSubmission("reservation", getTour(slug), data, await clientIp(), { store: getInquiryStore(), limiter, duplicates });
}

export async function submitNotice(slug: string, _prev: FormState, data: FormData): Promise<FormState> {
  return processSubmission("notice", getTour(slug), data, await clientIp(), { store: getInquiryStore(), limiter, duplicates });
}
