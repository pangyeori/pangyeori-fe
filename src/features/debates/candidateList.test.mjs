import assert from "node:assert/strict";
import { test } from "node:test";

import { getCandidatePage, requestAge } from "./candidateList.ts";

test("search filters immediately before paging by 10", () => {
  const candidates = Array.from({ length: 12 }, (_, index) => ({ name: `guest-${index + 1}` }));
  const secondPage = getCandidatePage(candidates, "", 2);
  assert.equal(secondPage.pageCount, 2);
  assert.deepEqual(secondPage.visible.map(({ name }) => name), ["guest-11", "guest-12"]);

  const searched = getCandidatePage(candidates, "GUEST-12", 2);
  assert.equal(searched.currentPage, 1);
  assert.deepEqual(searched.visible.map(({ name }) => name), ["guest-12"]);
});

test("request age shows the appropriate unit and ignores missing timestamps", () => {
  const now = Date.parse("2026-09-17T12:00:00Z");
  assert.equal(requestAge("2026-09-17T11:58:00Z", now), "2분 전");
  assert.equal(requestAge("2026-09-17T11:58:00", now), "2분 전");
  assert.equal(requestAge("2026-09-17T20:58:00+09:00", now), "2분 전");
  assert.equal(requestAge("2026-09-17T11:59:30Z", now), "방금 전");
  assert.equal(requestAge("2026-09-17T09:00:00Z", now), "3시간 전");
  assert.equal(requestAge("2026-09-15T12:00:00Z", now), "2일 전");
  assert.equal(requestAge("2026-07-19T12:00:00Z", now), "2달 전");
  assert.equal(requestAge("2025-09-17T12:00:00Z", now), "1년 전");
  assert.equal(requestAge(null, now), null);
  assert.equal(requestAge("invalid", now), null);
});
