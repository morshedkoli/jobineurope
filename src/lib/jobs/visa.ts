/**
 * Heuristic detection of visa-sponsorship signals in job text.
 * Sponsorship is the user's #1 filter (applying to the EU from outside it),
 * so we err toward catching positive mentions but respect explicit negations.
 */

const POSITIVE = [
  "visa sponsorship",
  "visa sponsor",
  "sponsor a visa",
  "sponsor your visa",
  "we sponsor",
  "sponsorship available",
  "sponsorship provided",
  "relocation support",
  "relocation package",
  "relocation assistance",
  "work permit",
  "work visa",
  "blue card",
  "eu blue card",
  "visa support",
  "willing to sponsor",
  "we provide visa",
  "international applicants welcome",
];

const NEGATIVE = [
  "no visa sponsorship",
  "no sponsorship",
  "not able to sponsor",
  "unable to sponsor",
  "cannot sponsor",
  "can't sponsor",
  "do not sponsor",
  "don't sponsor",
  "without sponsorship",
  "no relocation",
  "must have work authorization",
  "must be authorized to work",
  "existing work authorization",
  "valid work permit required",
];

/** Returns true only when a positive signal exists and no negation overrides it. */
export function detectVisaSponsorship(...texts: Array<string | undefined>): boolean {
  const haystack = texts.filter(Boolean).join(" \n ").toLowerCase();
  if (!haystack) return false;
  const hasNegative = NEGATIVE.some((n) => haystack.includes(n));
  if (hasNegative) return false;
  return POSITIVE.some((p) => haystack.includes(p));
}
