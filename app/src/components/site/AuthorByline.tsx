import Link from "next/link";
import { siteConfig } from "@/config/site";
import styles from "./AuthorByline.module.css";

/** 검색용 작성자와 화면의 작성자를 같은 About 인물로 연결한다. */
export function AuthorByline({ role = "글" }: { role?: "글" | "제작" }) {
  return <p className={styles.byline}>{role} · <Link href="/about" rel="author">{siteConfig.ownerName} ({siteConfig.name})</Link></p>;
}
