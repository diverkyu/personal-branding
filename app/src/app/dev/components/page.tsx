import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isShowcaseEnabled } from "@/config/showcase";
import { EquipmentCard } from "@/components/site/EquipmentCard";
import { InfoRow } from "@/components/site/InfoRow";
import { ReviewCard } from "@/components/site/ReviewCard";
import { StoryCard } from "@/components/site/StoryCard";
import { TourArchiveCard } from "@/components/site/TourArchiveCard";
import { TourCard } from "@/components/site/TourCard";
import { Button } from "@/components/ui/Button";
import { Checkbox, FormNotice, TextField, Textarea } from "@/components/ui/Field";
import { ICONS, Icon, type IconName } from "@/components/ui/Icon";
import { Section } from "@/components/ui/Section";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { STATUS_LABELS, StatusBadge, type StatusKind } from "@/components/ui/StatusBadge";
import { TextLink } from "@/components/ui/TextLink";
import { FilterDemo } from "./ShowcaseClient";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "컴포넌트 쇼케이스",
  robots: { index: false, follow: false },
};

const SAMPLE_REVIEW = "후기 원문이 가공 없이 이 자리에 표시됩니다. 줄바꿈도\n그대로 유지됩니다.";
const TOUR_STATUSES: StatusKind[] = ["recruiting", "upcoming", "closed", "ended"];
const ADMIN_STATUSES: StatusKind[] = ["published", "draft", "new"];

/** 개발·시험용. 상태별 모양을 한 화면에서 확인한다 (DESIGN-SYSTEM §3). 운영에서는 기본 404. */
export default function ShowcasePage() {
  if (!isShowcaseEnabled(process.env)) notFound();

  return (
    <div>
      <Section tone="dark" sub>
        <SectionHeader as="h1" size="h2" label="DEV / COMPONENTS" title="컴포넌트 쇼케이스" description="개발·시험용 화면입니다. 샘플 데이터이며 실제 콘텐츠가 아닙니다." />
      </Section>

      <Section tone="dark" sub labelledBy="sc-buttons">
        <SectionHeader as="h2" size="h3" titleId="sc-buttons" label="01" title="버튼 · 링크 · 칩 · 뱃지" />
        <div className={styles.stack}>
          <div className={styles.row} data-testid="buttons-dark">
            <Button href="/dev/components" size="L" icon="arrow-up-right">
              Primary L
            </Button>
            <Button href="/dev/components" size="M">
              Primary M
            </Button>
            <Button href="/dev/components" size="S">
              Primary S
            </Button>
            <Button href="/dev/components" variant="outline" size="M">
              Outline
            </Button>
            <Button variant="primary" size="M" busy>
              제출 중
            </Button>
            <TextLink href="https://example.com" surface="dark">
              외부 링크
            </TextLink>
          </div>
          <div className={styles.row}>
            <FilterDemo surface="dark" />
          </div>
          <div className={styles.row}>
            {TOUR_STATUSES.concat(ADMIN_STATUSES).map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
        </div>
      </Section>

      <Section tone="light" sub labelledBy="sc-light">
        <SectionHeader as="h2" size="h3" titleId="sc-light" label="02" title="밝은 배경" surface="light" description="밝은 섹션에서 쓰는 변형입니다." action={<TextLink href="/dev/components">전체 보기</TextLink>} />
        <div className={styles.stack}>
          <div className={styles.row}>
            <Button href="/dev/components" variant="dark" size="M">
              Dark
            </Button>
            <Button href="/dev/components" variant="outline" surface="light" size="M">
              Outline
            </Button>
            <TextLink href="/dev/components">텍스트 링크</TextLink>
          </div>
          <div className={styles.row}>
            <FilterDemo surface="light" />
          </div>
          <div className={styles.row}>
            {TOUR_STATUSES.concat(ADMIN_STATUSES).map((status) => (
              <StatusBadge key={status} status={status} surface="light" />
            ))}
          </div>
          <InfoRow
            items={[
              { label: "일정", value: "2026.12.05 – 12.07" },
              { label: "장소", value: "[장소]" },
              { label: "모집 상태", value: STATUS_LABELS.recruiting },
              { label: "정원", value: "[인원]" },
            ]}
          />
        </div>
      </Section>

      <Section tone="dark" sub labelledBy="sc-cards-dark">
        <SectionHeader as="h2" size="h3" titleId="sc-cards-dark" label="03" title="카드 (어두운 배경)" />
        <div className={styles.grid}>
          <StoryCard href="/dev/components" title="스토리 제목이 들어갑니다" summary="글 요약 두 줄이 이 자리에 표시됩니다." dateLabel="2026.11.08 · 샘플" thumbVariant="sea-a" />
        </div>
        <div className={styles.grid}>
          <EquipmentCard href="/dev/components" name="장비명 (구매처 링크)" category="카테고리" reason="추천 이유 한 줄이 이 자리에 표시됩니다." action={{ type: "external", href: "https://example.com" }} thumbVariant="sea-b" />
          <EquipmentCard href="/dev/components" name="장비명 (문의하기)" category="카테고리" reason="추천 이유 한 줄이 이 자리에 표시됩니다." action={{ type: "inquiry", href: "/dev/components" }} thumbVariant="sea-c" />
          <EquipmentCard href="/dev/components" name="장비명 (버튼 없음)" category="카테고리" reason="버튼 없이 소개만 하는 장비도 둘 수 있습니다." thumbVariant="sea-d" />
          <EquipmentCard
            href="/dev/components"
            name="장비명 (제휴)"
            category="카테고리"
            reason="제휴 링크일 때만 고지 문구가 표시됩니다."
            action={{ type: "external", href: "https://example.com" }}
            affiliate
            affiliateNotice="이 링크로 구매하시면 수수료를 받을 수 있습니다."
          />
        </div>
        <StoryCard featured href="/dev/components" title="최신 글 (큰 카드)" summary="Story 목록 맨 위에 쓰는 큰 카드입니다." dateLabel="최신 글 · 2026.11.08 · 샘플" thumbVariant="sea-a" />
      </Section>

      <Section tone="light" sub labelledBy="sc-cards-light">
        <SectionHeader as="h2" size="h3" titleId="sc-cards-light" label="04" title="카드 (밝은 배경)" surface="light" />
        <div className={styles.grid}>
          <TourCard href="/dev/components" title="진행 예정 투어명" status="recruiting" scheduleLabel="2026.12.05 – 12.07" place="[장소]" capacityLabel="[인원]" cta="투어 자세히 보기" />
          <TourCard href="/dev/components" title="모집 예정 투어명" status="upcoming" scheduleLabel="2027.01.10 – 01.12" place="[장소]" />
        </div>
        <div className={styles.grid}>
          <TourCard split href="/dev/components" title="큰 투어 카드 (좌 이미지 + 우 정보)" status="recruiting" scheduleLabel="2026.12.05 – 12.07" place="[장소]" capacityLabel="[인원]" thumbVariant="sea-b" />
        </div>
        <div className={styles.grid}>
          <ReviewCard text={SAMPLE_REVIEW} author="수강생 표기" dateLabel="2026.10.21" tour={{ href: "/dev/components", title: "연결된 투어" }} />
          <ReviewCard text="연결된 투어가 없는 후기입니다." author="수강생 표기" dateLabel="2026.10.02" />
          <TourArchiveCard href="/dev/components" title="지난 투어명" extras={["후기 연결됨", "갤러리"]} thumbVariant="sea-a" />
          <StoryCard surface="light" href="/dev/components" title="밝은 배경의 스토리 카드" summary="요약 문구." dateLabel="2026.11.08" thumbVariant="sea-b" />
        </div>
      </Section>

      <Section tone="dark" sub labelledBy="sc-form">
        <SectionHeader as="h2" size="h3" titleId="sc-form" label="05" title="폼" />
        <form className={styles.form} action="#" aria-label="폼 샘플">
          <TextField id="sc-name" name="name" label="이름" required autoComplete="name" />
          <TextField id="sc-phone" name="phone" label="연락처" type="tel" required hint="숫자와 하이픈만 입력합니다." />
          <TextField id="sc-email" name="email" label="이메일" type="email" error="이메일 형식을 확인해주세요." defaultValue="a@" />
          <Textarea id="sc-message" name="message" label="문의 내용" hint="1,000자 이하" />
          <Checkbox id="sc-agree" name="agree" label="개인정보 수집·이용에 동의합니다." required />
          <Button type="submit" size="L">
            예약 문의하기
          </Button>
          <FormNotice>결제나 확정은 아닙니다. 문의가 접수되면 확인 후 답변드리겠습니다.</FormNotice>
          <FormNotice kind="success">문의가 접수되었습니다.</FormNotice>
          <FormNotice kind="error">전송하지 못했습니다. 잠시 후 다시 시도해주세요.</FormNotice>
        </form>
      </Section>

      <Section tone="light" sub labelledBy="sc-icons">
        <SectionHeader as="h2" size="h3" titleId="sc-icons" label="06" title="아이콘 (Lucide)" surface="light" />
        <ul className={styles.icons}>
          {(Object.keys(ICONS) as IconName[]).map((name) => (
            <li key={name}>
              <Icon name={name} size={24} />
              <span>{name}</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
