import { describe, expect, test } from "bun:test";
import { getTablePage } from "../src/utils/tablePagination";

describe("table pagination", () => {
  test("covers every row exactly once across pages", () => {
    const rows = Array.from({ length: 37 }, (_, i) => i);
    const displayed = [1, 2, 3, 4].flatMap(page => {
      const range = getTablePage(rows.length, page, 10);
      return rows.slice(range.start, range.end);
    });
    expect(displayed).toEqual(rows);
    expect(getTablePage(37, 4, 10).end).toBe(37);
  });

  test("clamps the page when filtered results shrink", () => {
    expect(getTablePage(3, 5, 10)).toEqual({ page: 1, pageCount: 1, start: 0, end: 3, size: 10 });
  });

  test("handles empty datasets and different page sizes", () => {
    expect(getTablePage(0, 1, 10).pageCount).toBe(1);
    expect(getTablePage(60, 2, 25)).toEqual({ page: 2, pageCount: 3, start: 25, end: 50, size: 25 });
  });
});