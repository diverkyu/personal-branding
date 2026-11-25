import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "./Icon";
import { SmartLink, isExternalHref } from "./SmartLink";
import type { Surface } from "./types";
import styles from "./TextLink.module.css";

/** 화살표(↗)는 사이트 밖으로 나가는 링크에만 붙인다: 다른 사이트(새 탭)와 메일 앱 열기 (디자인 점검 D9) */
function leavesSite(href: string): boolean {
  return isExternalHref(href) || /^mailto:/i.test(href);
}

interface TextLinkProps {
  href: string;
  children: ReactNode;
  surface?: Surface;
  /** 끝에 붙는 아이콘. 기본은 바깥으로 나가는 링크(http(s)·mailto)에만 arrow-up-right, 사이트 안 이동은 없음. 없애려면 null */
  icon?: IconName | null;
  className?: string;
}

/** 문장 끝에 두는 이동 링크 (밑줄 1px, 굵기 700). 장식용 아이콘은 읽히지 않는다. */
export function TextLink({ href, children, surface = "light", icon, className }: TextLinkProps) {
  const shown = icon === undefined ? (leavesSite(href) ? "arrow-up-right" : null) : icon;
  return (
    <SmartLink href={href} className={cx(styles.link, className)} data-surface={surface}>
      <span>{children}</span>
      {shown ? <Icon name={shown} size={16} /> : null}
    </SmartLink>
  );
}
