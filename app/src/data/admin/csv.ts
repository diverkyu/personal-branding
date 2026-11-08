/**
 * CSV 만들기. 스프레드시트가 수식으로 실행하는 값(=, +, -, @ 로 시작)은 앞에 작은따옴표를 붙여 막는다 (CSV 인젝션).
 * 쉼표·따옴표·줄바꿈이 있는 값은 따옴표로 감싼다. 엑셀에서 한글이 깨지지 않게 BOM 을 붙인다.
 */
const DANGEROUS_START = /^[=+\-@\t\r]/;

export function csvCell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (DANGEROUS_START.test(text)) text = "'" + text;
  return /[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}
