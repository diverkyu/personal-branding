import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "./Icon";
import { SmartLink } from "./SmartLink";
import type { Surface } from "./types";
import styles from "./Button.module.css";

/** 크기: L 높이 52, M 높이 48, S 높이 44 (DESIGN-SYSTEM §6 통일 기준) */
export type ButtonSize = "L" | "M" | "S";
export type ButtonVariant = "primary" | "outline" | "dark";

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** outline 의 색을 정한다. dark 배경에서는 라임, light 배경에서는 남색 */
  surface?: Surface;
  icon?: IconName;
  children: ReactNode;
  className?: string;
}

type LinkProps = CommonProps & {
  href: string;
  /** 외부 링크의 rel 을 바꾼다 (제휴 링크는 "sponsored nofollow noopener noreferrer") */
  rel?: string;
};
type ActionProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & {
    /** 제출·저장 중. 중복 제출을 막고 보조기기에 진행 중임을 알린다 */
    busy?: boolean;
  };

export type ButtonProps = LinkProps | ActionProps;

/** href 가 있으면 링크, 없으면 버튼으로 렌더링한다. 모양은 같다. */
export function Button(props: ButtonProps) {
  const { variant = "primary", size = "M", surface = "dark", icon, children, className, ...rest } = props;
  const classes = cx(styles.button, className);
  const data = { "data-variant": variant, "data-size": size, "data-surface": surface };
  const content = (
    <>
      <span>{children}</span>
      {icon ? <Icon name={icon} size={16} /> : null}
    </>
  );

  if ("href" in rest) {
    return (
      <SmartLink href={rest.href} rel={rest.rel} className={classes} {...data}>
        {content}
      </SmartLink>
    );
  }

  const { busy, type = "button", disabled, ...buttonRest } = rest;
  return (
    <button {...buttonRest} type={type} disabled={busy || disabled} aria-busy={busy || undefined} className={classes} {...data}>
      {content}
    </button>
  );
}
