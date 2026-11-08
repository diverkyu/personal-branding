import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EquipmentCard } from "@/components/site/EquipmentCard";
import { InfoRow } from "@/components/site/InfoRow";
import { AFFILIATE_NOTICE, equipmentCard } from "@/components/site/mappers";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { Thumb } from "@/components/ui/Thumb";
import { getEquipment, listEquipment } from "@/data";
import { formatDate } from "@/lib/format";
import pages from "../../../pages.module.css";
import styles from "../../tours/[slug]/page.module.css";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return listEquipment().map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = getEquipment((await params).slug);
  return item ? { title: item.name, description: item.reason } : {};
}

/** EQ 상세 (SCREEN-SPEC §5.9). 행동 버튼은 장비 데이터의 행동 유형에 따른다. */
export default async function EquipmentDetailPage({ params }: Props) {
  const item = getEquipment((await params).slug);
  if (!item) notFound();
  const others = listEquipment().filter((e) => e.category === item.category && e.slug !== item.slug).slice(0, 3);
  const info = [
    { label: "카테고리", value: <Link href={`/freediving/equipment?category=${encodeURIComponent(item.category)}`}>{item.category}</Link> },
    ...(item.brand ? [{ label: "브랜드", value: item.brand }] : []),
    ...(item.priceNote ? [{ label: "가격대", value: item.priceNote }] : []),
    ...(item.checkedAt ? [{ label: "정보 확인일", value: formatDate(item.checkedAt) }] : []),
  ];

  return (
    <>
    <Section tone="light" sub>
      <nav aria-label="이동 경로" className={styles.crumbs}>
        <Link href="/freediving">Freediving</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/freediving/equipment">장비</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{item.name}</span>
      </nav>
      <div className={styles.media}>
        <Thumb height={420} variant={item.thumbVariant} />
      </div>
      <h1 className={styles.title}>{item.name}</h1>
      <InfoRow items={info} />
      <div className={pages.prose} style={{ marginTop: 40 }}>
        <p>{item.reason}</p>
        {item.reasonDetail?.map((p, i) => <p key={i}>{p}</p>)}
        {item.features && item.features.length > 0 ? (
          <ul>
            {item.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        ) : null}
      </div>
      {item.action === "external" && item.externalUrl ? (
        <div className={pages.after}>
          <Button href={item.externalUrl} size="M" icon="arrow-up-right" surface="light">
            구매처 보기
          </Button>
          {item.affiliate ? <p style={{ marginTop: 12, fontSize: 13, color: "var(--kyu-ink-sub)" }}>{AFFILIATE_NOTICE}</p> : null}
        </div>
      ) : null}
      {item.action === "inquiry" ? (
        <div className={pages.after}>
          <Button href="/contact" variant="outline" surface="light" size="M">
            문의하기
          </Button>
        </div>
      ) : null}
    </Section>
    {others.length > 0 ? (
      <Section tone="dark" sub>
        <h2 className={styles.h2} style={{ marginTop: 0 }}>같은 카테고리의 다른 장비</h2>
        <ul className={pages.grid3} style={{ listStyle: "none", padding: 0 }}>
          {others.map((e) => (
            <li key={e.slug}>
              <EquipmentCard {...equipmentCard(e)} affiliateNotice={AFFILIATE_NOTICE} />
            </li>
          ))}
        </ul>
      </Section>
    ) : null}
    </>
  );
}
