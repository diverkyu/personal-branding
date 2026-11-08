import type { Metadata } from "next";
import { ContactSection } from "@/components/site/ContactSection";
import { getSiteSettings } from "@/settings/read";

export const metadata: Metadata = { title: "Contact" };

/** CONTACT (SCREEN-SPEC §5.11). 홈 하단과 같은 컴포넌트이며 이 페이지에서는 제목이 h1 이다. 이메일·안내문은 사이트 설정에서 온다. */
export default async function ContactPage() {
  const settings = await getSiteSettings();
  return <ContactSection asPage email={settings["contact.email"]} intro={settings["contact.intro"]?.split("\n")} />;
}
