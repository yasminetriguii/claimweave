# ClaimWeave v0.2: fewer repeated requests

## Start with the useful part

1. Open [the live demo](https://yasminetriguii.github.io/claimweave/).
2. Choose **Repair & regression** and click **Try 120-day time shift**.
3. Six stale program checks map to two synthetic collection steps in the four-option catalog. Inspect which field and freshness requirement each step supports.
4. Reset the demo, return to **Repair & regression**, and choose **Policy regression bench**.
5. Run the proposed $2,000 housing cap. The engine performs 36 program comparisons across 12 original synthetic cases and identifies three changed housing outcomes. Missing, stale, and withdrawn evidence stays in review.
6. Download the report. It includes all fixture inputs, both policy versions, and every program's check-level trace so the comparison is reproducible.

## Why these features

Flagging missing evidence is useful but incomplete. A coordinator also needs to know which requests can be combined, which require applicant consent, and which must stay with a human reviewer. Policy authors need a repeatable way to inspect changed outcomes before rollout.

The planner uses exhaustive subset enumeration over at most 12 collection options. It finds a minimum-cardinality cover of the currently missing/stale fields within the displayed catalog. Current consent is checked first. Conflicts and unmet rules are kept outside automated collection planning. The bundled catalog has four options; a fabricated campus statement combines income and enrollment. This assumption is visible, and removing that option changes the minimum from two steps to three.

The regression bench changes only the fictional housing income cap. It reuses identical synthetic inputs against both policy versions. It does not infer real eligibility, assign fairness scores, train a model, or estimate population impact.

## Verification

33 automated regression tests cover consent, freshness, conflict detection, data minimization, planner coverage and minimum cardinality, no-op policy changes, input validation, and preserved review states. These are developer-authored tests and fixtures, not independent validation or held-out accuracy.

## Limits

No agency integration, real applicant records, cryptographic authenticity, runtime AI, or external submissions. Collection counts describe a fictional catalog, not measured administrative savings. A fresh record might still fail a rule. Source acceptance, legal consent, and real policy interpretation require domain validation.
