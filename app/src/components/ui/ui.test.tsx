import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";
import { Checkbox, FormNotice, TextField, Textarea } from "./Field";
import { FilterChipGroup } from "./FilterChip";
import { Icon } from "./Icon";
import { Section } from "./Section";
import { SectionHeader } from "./SectionHeader";
import { SmartLink, isExternalHref } from "./SmartLink";
import { STATUS_LABELS, StatusBadge, type StatusKind } from "./StatusBadge";
import { TextLink } from "./TextLink";
import { cx } from "@/lib/cx";

const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe("cx", () => {
  it("거짓 값을 건너뛴다", () => {
    expect(cx("a", false, null, undefined, "", "b")).toBe("a b");
  });
});

describe("SmartLink", () => {
  it("http(s) 주소는 새 탭과 rel 을 붙인다", () => {
    const out = html(<SmartLink href="https://example.com">x</SmartLink>);
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
    expect(isExternalHref("https://a.b")).toBe(true);
    expect(isExternalHref("/story")).toBe(false);
  });

  it("사이트 안 주소는 새 탭을 쓰지 않는다", () => {
    const out = html(<SmartLink href="/story">x</SmartLink>);
    expect(out).toContain('href="/story"');
    expect(out).not.toContain("_blank");
  });

  it("mailto, tel 은 일반 링크다", () => {
    expect(html(<SmartLink href="mailto:a@b.c">x</SmartLink>)).toContain('href="mailto:a@b.c"');
  });

  it("javascript: 같은 위험한 스킴은 # 으로 바꾼다 (SECURITY §5)", () => {
    const out = html(<SmartLink href="javascript:alert(1)">x</SmartLink>);
    expect(out).toContain('href="#"');
    expect(out).not.toContain("javascript:");
    expect(html(<SmartLink href="data:text/html,x">x</SmartLink>)).not.toContain("data:");
  });
});

describe("Icon", () => {
  it("라벨이 없으면 장식(aria-hidden)이다", () => {
    expect(html(<Icon name="check" />)).toContain('aria-hidden="true"');
  });

  it("라벨이 있으면 이미지로 읽힌다", () => {
    const out = html(<Icon name="menu" label="메뉴" />);
    expect(out).toContain('role="img"');
    expect(out).toContain('aria-label="메뉴"');
    expect(out).not.toContain("aria-hidden");
  });
});

describe("Button", () => {
  it("href 가 있으면 링크, 없으면 button type=button 이다", () => {
    expect(html(<Button href="/a">가기</Button>)).toMatch(/^<a /);
    const out = html(<Button>저장</Button>);
    expect(out).toMatch(/^<button /);
    expect(out).toContain('type="button"');
  });

  it("크기와 변형을 data 속성으로 전달한다", () => {
    const out = html(
      <Button href="/a" variant="outline" size="L" surface="light">
        x
      </Button>,
    );
    expect(out).toContain('data-variant="outline"');
    expect(out).toContain('data-size="L"');
    expect(out).toContain('data-surface="light"');
  });

  it("busy 이면 비활성화하고 진행 중임을 알린다", () => {
    const out = html(<Button busy>제출</Button>);
    expect(out).toContain("disabled");
    expect(out).toContain('aria-busy="true"');
  });

  it("아이콘은 장식으로 붙는다", () => {
    expect(html(<Button href="/a" icon="arrow-up-right">x</Button>)).toContain('aria-hidden="true"');
  });
});

describe("TextLink", () => {
  it("기본으로 화살표 아이콘을 붙이고 null 이면 없앤다", () => {
    expect(html(<TextLink href="/a">더 보기</TextLink>)).toContain("<svg");
    expect(html(<TextLink href="/a" icon={null}>더 보기</TextLink>)).not.toContain("<svg");
  });
});

describe("StatusBadge", () => {
  it("모든 상태를 색이 아닌 글자로 표시한다", () => {
    (Object.keys(STATUS_LABELS) as StatusKind[]).forEach((status) => {
      expect(html(<StatusBadge status={status} />)).toContain(STATUS_LABELS[status]);
    });
  });

  it("모집 중·발행·신규는 채워진 모양, 나머지는 테두리 모양이다", () => {
    expect(html(<StatusBadge status="recruiting" />)).toContain('data-tone="filled"');
    expect(html(<StatusBadge status="closed" />)).toContain('data-tone="outline"');
  });
});

describe("FilterChipGroup", () => {
  const options = [
    { value: "all", label: "전체" },
    { value: "fin", label: "핀" },
  ];

  it("그룹에 이름이 있고 선택된 칩만 aria-pressed=true 다", () => {
    const out = html(<FilterChipGroup label="장비 카테고리" options={options} value="fin" onChange={() => {}} />);
    expect(out).toContain('role="group"');
    expect(out).toContain('aria-label="장비 카테고리"');
    expect(out.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(out.match(/aria-pressed="false"/g)).toHaveLength(1);
  });
});

describe("Section / SectionHeader", () => {
  it("제목 요소를 as 로 정하고 크기는 size 로 따로 정한다", () => {
    const out = html(<SectionHeader as="h1" size="h2" title="제목" />);
    expect(out).toContain("<h1");
    expect(out).toContain('data-size="h2"');
  });

  it("라벨·설명·행동을 선택적으로 보여 준다", () => {
    const out = html(<SectionHeader label="01 / ABOUT KYU" title="t" description="설명" action={<a href="/x">더</a>} />);
    expect(out).toContain("01 / ABOUT KYU");
    expect(out).toContain("설명");
    expect(out).toContain('href="/x"');
    expect(html(<SectionHeader title="t" />)).not.toContain("<p");
  });

  it("Section 은 톤과 이름 연결을 전달한다", () => {
    const out = html(
      <Section tone="light" sub labelledBy="h">
        x
      </Section>,
    );
    expect(out).toContain('data-tone="light"');
    expect(out).toContain("data-sub");
    expect(out).toContain('aria-labelledby="h"');
  });
});

describe("폼 필드", () => {
  it("라벨이 입력과 연결되고 필수 표시가 있다", () => {
    const out = html(<TextField id="n" name="name" label="이름" required />);
    expect(out).toContain('for="n"');
    expect(out).toContain('id="n"');
    expect(out).toContain("(필수)");
    expect(out).toContain("required");
  });

  it("오류가 있으면 aria-invalid 와 aria-describedby 로 연결하고 alert 로 알린다", () => {
    const out = html(<TextField id="e" label="이메일" hint="도움말" error="형식 오류" />);
    expect(out).toContain('aria-invalid="true"');
    expect(out).toContain('aria-describedby="e-hint e-error"');
    expect(out).toContain('id="e-error"');
    expect(out).toContain('role="alert"');
  });

  it("오류가 없으면 aria-invalid 가 없다", () => {
    expect(html(<TextField id="e" label="이메일" />)).not.toContain("aria-invalid");
  });

  it("Textarea 도 같은 연결을 쓴다", () => {
    const out = html(<Textarea id="m" label="문의" error="필수입니다" />);
    expect(out).toContain("<textarea");
    expect(out).toContain('aria-describedby="m-error"');
  });

  it("Checkbox 는 라벨이 연결되고 오류를 알린다", () => {
    const out = html(<Checkbox id="a" label="동의합니다" required error="동의가 필요합니다" />);
    expect(out).toContain('type="checkbox"');
    expect(out).toContain('for="a"');
    expect(out).toContain('aria-invalid="true"');
  });

  it("FormNotice 의 role 은 종류에 따라 status 또는 alert 다", () => {
    expect(html(<FormNotice>안내</FormNotice>)).toContain('role="status"');
    expect(html(<FormNotice kind="success">완료</FormNotice>)).toContain('role="status"');
    expect(html(<FormNotice kind="error">실패</FormNotice>)).toContain('role="alert"');
  });
});
