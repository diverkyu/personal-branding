import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "./Icon";
import { SmartLink } from "./SmartLink";
import type { Surface } from "./types";
import styles from "./TextLink.module.css";

interface TextLinkProps {
  href: string;
  children: ReactNode;
  surface?: Surface;
  /** 끝에 붙는 아이콘. 기본은 arrow-up-right, 없애려면 null */
  icon?: IconName | null;
  className?: string;
}

/** 문장 끝에 두는 이동 링크 (밑줄 1px, 굵기 700). 장식용 아이콘은 읽히지 않는다. */
export function TextLink({ href, children, surface = "light", icon = "arrow-up-right", className }: TextLinkProps) {
  return (
    <SmartLink href={href} className={cx(styles.link, className)} data-surface={surface}>
      <span>{children}</span>
      {icon ? <Icon name={icon} size={16} /> : null}
    </SmartLink>
  );
}
