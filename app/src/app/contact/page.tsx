import type { Metadata } from "next";
import { ContactSection } from "@/components/site/ContactSection";

export const metadata: Metadata = { title: "Contact" };

/** CONTACT (SCREEN-SPEC §5.11). 홈 하단과 같은 컴포넌트이며 이 페이지에서는 제목이 h1 이다. */
export default function ContactPage() {
  return <ContactSection asPage />;
}
