import type { SocialKind } from "@/settings/social";

/**
 * 인스타그램·유튜브 링크 표시 (CONTACT-07, GL-F3). Lucide 1.x 에는 상표 아이콘이 없어서, 같은 선 굵기(2)·24 격자로
 * 직접 그린 단순한 기호다(둥근 사각형+원 / 둥근 사각형+재생 삼각형). 공식 로고 파일을 복사하지 않는다.
 * 장식이므로 읽기 도구에서 숨기고, 이름은 링크의 aria-label 이 맡는다.
 */
export function SocialIcon({ kind, size = 24 }: { kind: SocialKind; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {kind === "instagram" ? (
        <>
          <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
          <circle cx="12" cy="12" r="4.25" />
          <circle cx="17.4" cy="6.6" r="0.6" fill="currentColor" />
        </>
      ) : (
        <>
          <rect x="1.75" y="5" width="20.5" height="14" rx="4" />
          <path d="M10 9.25v5.5l4.75-2.75z" fill="currentColor" />
        </>
      )}
    </svg>
  );
}

/** SNS 로고 링크 목록. 새 탭으로 연다 */
export function SocialLinks({ links, className, itemClassName }: { links: { kind: SocialKind; label: string; href: string }[]; className?: string; itemClassName?: string }) {
  if (links.length === 0) return null;
  return (
    <ul className={className} aria-label="SNS">
      {links.map((l) => (
        <li key={l.kind}>
          <a className={itemClassName} href={l.href} target="_blank" rel="noopener noreferrer" aria-label={`${l.label} (새 탭)`} title={l.label}>
            <SocialIcon kind={l.kind} />
          </a>
        </li>
      ))}
    </ul>
  );
}
