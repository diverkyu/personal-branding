"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CONTACT_ITEM, isCurrentPath, navItems, type NavItem } from "@/config/nav";
import { Icon } from "@/components/ui/Icon";
import { cx } from "@/lib/cx";
import { Logo } from "./Logo";
import styles from "./SiteHeader.module.css";

const MOBILE_QUERY = "(max-width: 680px)";
const CLOSE_DELAY_MS = 150;

/** 헤더 (SCREEN-SPEC §4.1 GL-H, INT-01 모바일 메뉴, INT-02 Freediving 하위 메뉴). */
export function SiteHeader({ showFilms = false }: { showFilms?: boolean }) {
  const items = navItems(showFilms);
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback((restoreFocus: boolean) => {
    setMenuOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  // 다른 페이지로 이동하면 패널을 닫는다 (이전 경로와 달라질 때만).
  const lastPath = useRef(pathname);
  useEffect(() => {
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      setMenuOpen(false);
    }
  }, [pathname]);

  // 열려 있는 동안: 본문 스크롤 잠금, ESC, 포커스 가둠, 화면이 넓어지면 닫음
  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const media = window.matchMedia(MOBILE_QUERY);
    const onMediaChange = () => {
      if (!media.matches) setMenuOpen(false);
    };
    media.addEventListener("change", onMediaChange);

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [buttonRef.current, ...(panelRef.current?.querySelectorAll<HTMLElement>("a[href], button") ?? [])].filter(
        (el): el is HTMLElement => el !== null,
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (!focusable.includes(active as HTMLElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    // 패널로 포커스를 옮긴다
    panelRef.current?.querySelector<HTMLElement>("a[href]")?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      media.removeEventListener("change", onMediaChange);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen, closeMenu]);

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Logo />

        <nav className={styles.desktop} aria-label="주 메뉴">
          <ul>
            {items.map((item) => (
              <li key={item.href}>{item.children ? <DropdownItem item={item} pathname={pathname} /> : <NavLink href={item.href} label={item.label} pathname={pathname} />}</li>
            ))}
          </ul>
        </nav>
        <Link href={CONTACT_ITEM.href} className={cx(styles.link, styles.contact, styles.contactWrap, styles.desktopOnly)} aria-current={isCurrentPath(pathname, CONTACT_ITEM.href) ? "page" : undefined}>
          {CONTACT_ITEM.label}
          <Icon name="arrow-up-right" size={16} />
        </Link>

        <button
          ref={buttonRef}
          type="button"
          className={styles.menuButton}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => (menuOpen ? closeMenu(false) : setMenuOpen(true))}
        >
          <Icon name={menuOpen ? "x" : "menu"} size={20} />
          <span>{menuOpen ? "CLOSE" : "MENU"}</span>
        </button>
      </div>

      {menuOpen ? <div className={styles.backdrop} onClick={() => closeMenu(true)} aria-hidden="true" /> : null}
      <div id="mobile-menu" ref={panelRef} className={styles.panel} hidden={!menuOpen}>
        <nav aria-label="모바일 메뉴">
          <ul>
            {items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} aria-current={pathname === item.href ? "page" : undefined} onClick={() => closeMenu(false)}>
                  {item.label}
                </Link>
                {item.children ? (
                  <ul className={styles.sub}>
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <Link href={child.href} aria-current={isCurrentPath(pathname, child.href) ? "page" : undefined} onClick={() => closeMenu(false)}>
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
            <li>
              <Link href={CONTACT_ITEM.href} className={styles.panelContact} aria-current={isCurrentPath(pathname, CONTACT_ITEM.href) ? "page" : undefined} onClick={() => closeMenu(false)}>
                {CONTACT_ITEM.label}
                <Icon name="arrow-up-right" size={20} />
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const current = isCurrentPath(pathname, href);
  return (
    <Link href={href} className={styles.link} aria-current={pathname === href ? "page" : undefined} data-current={current || undefined}>
      {label}
    </Link>
  );
}

/** INT-02. 호버·포커스로 펼치고, 마우스가 벗어나도 짧은 지연 뒤에 닫는다. ESC 로 닫고, 토글 버튼으로 터치·키보드에서도 연다. */
function DropdownItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const [open, setOpen] = useState(false);
  /** 토글 버튼으로 고정한 상태. 호버로 연 뒤 버튼을 눌러도 닫히지 않고, 고정되면 마우스가 벗어나도 유지된다 */
  const [pinned, setPinned] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const current = isCurrentPath(pathname, item.href);

  const cancelClose = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const openNow = () => {
    cancelClose();
    setOpen(true);
  };
  const closeLater = () => {
    cancelClose();
    timer.current = setTimeout(() => {
      setOpen(false);
      setPinned(false);
    }, CLOSE_DELAY_MS);
  };
  useEffect(() => cancelClose, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && open) {
      event.stopPropagation();
      cancelClose();
      setOpen(false);
      setPinned(false);
      linkRef.current?.focus();
    }
  };

  return (
    <div
      className={styles.dropdown}
      onMouseEnter={openNow}
      onMouseLeave={() => {
        if (!pinned) closeLater();
      }}
      onFocus={openNow}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) closeLater();
      }}
      onKeyDown={onKeyDown}
    >
      <Link ref={linkRef} href={item.href} className={styles.link} aria-current={current && pathname === item.href ? "page" : undefined} data-current={current || undefined}>
        {item.label}
      </Link>
      <button type="button" className={styles.toggle} aria-expanded={open} aria-controls={`submenu-${item.label}`} aria-label={`${item.label} 하위 메뉴`} onClick={() => {
          cancelClose();
          setOpen(!pinned);
          setPinned(!pinned);
        }}>
        <Icon name="chevron-right" size={16} />
      </button>
      <ul id={`submenu-${item.label}`} className={styles.submenu} hidden={!open}>
        {item.children?.map((child) => (
          <li key={child.href}>
            <Link href={child.href} aria-current={isCurrentPath(pathname, child.href) ? "page" : undefined} onClick={() => {
                setOpen(false);
                setPinned(false);
              }}>
              {child.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
