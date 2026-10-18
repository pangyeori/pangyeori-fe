import assert from "node:assert/strict";
import { test } from "node:test";
import { canAgreeToTerms, selectedTermsIds, needsTermsRefresh, formatTermsEffectiveAt } from "./terms.ts";

// Test-only documents for version changes and consent selection. Never sent to a real API.
const terms = [
  { termsId: "service-v1", type: "TERMS_OF_SERVICE", version: 1, required: true },
  { termsId: "privacy-v1", type: "PRIVACY_POLICY", version: 1, required: true },
  { termsId: "marketing-v1", type: "MARKETING", version: 1, required: false },
];

test("required terms must be selected; optional marketing never blocks signup", () => {
  assert.equal(canAgreeToTerms(terms, []), false);
  assert.equal(canAgreeToTerms(terms, ["service-v1", "marketing-v1"]), false);
  assert.equal(canAgreeToTerms(terms, ["service-v1", "privacy-v1"]), true);
  assert.equal(canAgreeToTerms([], []), false);
});

test("a new document version needs fresh consent and old IDs never enter the request", () => {
  const updated = [{ ...terms[0], termsId: "service-v2", version: 2 }, ...terms.slice(1)];
  const previous = terms.map((term) => term.termsId);
  assert.equal(canAgreeToTerms(updated, previous), false);
  assert.deepEqual(selectedTermsIds(updated, previous), ["privacy-v1", "marketing-v1"]);
  assert.equal(canAgreeToTerms(updated, [...previous, "service-v2"]), true);
});

test("new required types are enforced without a hardcoded service/privacy list", () => {
  const updated = [...terms, { termsId: "new-required", type: "NEW_POLICY", required: true }];
  assert.equal(canAgreeToTerms(updated, terms.map((term) => term.termsId)), false);
  assert.equal(canAgreeToTerms([{ termsId: "optional", required: false }], []), true);
});

test("only current IDs are sent, with no duplicates or unchecked marketing", () => {
  assert.deepEqual(selectedTermsIds(terms, ["service-v1", "service-v1", "privacy-v1", "removed"]), ["service-v1", "privacy-v1"]);
});

test("only document-related errors trigger a terms reload", () => {
  for (const code of ["TERMS_NOT_LATEST", "REQUIRED_TERMS_NOT_AGREED", "TERMS_NOT_FOUND"]) assert.equal(needsTermsRefresh(code), true);
  for (const code of [null, "EMAIL_ALREADY_EXISTS", "INVALID_TOKEN", "REQUIRED_TERMS_WITHDRAWAL_NOT_ALLOWED"]) assert.equal(needsTermsRefresh(code), false);
});

test("UTC effective date displays consistently in Korea including midnight rollover", () => {
  assert.equal(formatTermsEffectiveAt("2026-10-31T15:00:00"), formatTermsEffectiveAt("2026-11-01T00:00:00+09:00"));
  assert.match(formatTermsEffectiveAt("2026-10-31T15:00:00"), /11월 1일/);
});
