import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Calendar,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Mail,
  MapPin,
  Menu,
  Pencil,
  Play,
  Search,
  ShoppingBag,
  Tag,
  Trash,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import styles from "./Icon.module.css";

/** 사이트에서 쓰는 아이콘 목록 (Lucide, ISC). 글자 기호(↗ ⧉ ☰)로 아이콘을 대신하지 않는다 — DESIGN-SYSTEM §2.4 */
export const ICONS = {
  "arrow-up-right": ArrowUpRight,
  "arrow-up": ArrowUp,
  "arrow-down": ArrowDown,
  menu: Menu,
  x: X,
  "chevron-right": ChevronRight,
  "external-link": ExternalLink,
  copy: Copy,
  mail: Mail,
  check: Check,
  calendar: Calendar,
  "map-pin": MapPin,
  play: Play,
  "shopping-bag": ShoppingBag,
  tag: Tag,
  search: Search,
  user: User,
  pencil: Pencil,
  trash: Trash,
  image: ImageIcon,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  /** px. 16 / 20 / 24 중에서 쓴다 */
  size?: 16 | 20 | 24;
  /** 아이콘만 있는 요소의 의미. 주면 이미지로 읽히고, 없으면 장식(aria-hidden)이다 */
  label?: string;
}

export function Icon({ name, size = 16, label }: IconProps) {
  const Component = ICONS[name];
  return (
    <Component
      className={styles.icon}
      size={size}
      strokeWidth={1.5}
      focusable="false"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    />
  );
}
