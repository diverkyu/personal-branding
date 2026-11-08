import { safeJson } from "@/lib/structured";

/** 구조화 데이터 <script>. 내용은 우리가 만든 객체뿐이며 safeJson 으로 이스케이프한다. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(data) }} />;
}
