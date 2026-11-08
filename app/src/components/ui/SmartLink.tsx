import Link from "next/link";
import type { AnchorHTMLAttributes } from "react";

/** http(s) 주소는 다른 사이트다. 새 탭으로 열고 opener 를 끊는다 (SECURITY §5). */
export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

type SmartLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string };

/**
 * 모든 링크의 기반.
 * - 사이트 안 주소(/…, #…)는 next/link, http(s)는 새 탭 + rel, mailto·tel 은 일반 앵커.
 * - javascript:, data: 같은 위험한 스킴은 "#"으로 바꿔 렌더링하지 않는다.
 */
export function SmartLink({ href, children, ...rest }: SmartLinkProps) {
  if (isExternalHref(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  if (href.startsWith("/") || href.startsWith("#")) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }
  if (/^(mailto|tel):/i.test(href)) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <a href="#" {...rest}>
      {children}
    </a>
  );
}
