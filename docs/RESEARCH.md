# Research record

Checked November 8, 2026. This is a scoped public prior-work search, not exhaustive diligence, a patent opinion, or a novelty guarantee.

## Problem signal

YC's current [Requests for Startups](https://www.ycombinator.com/rfs) includes “Plaid for Government Benefits,” describing consent-based reuse of source records. ClaimWeave takes this as a problem signal rather than evidence that the solution is new.

## Closest alternatives located

| Source | Observed overlap | ClaimWeave scope |
|---|---|---|
| [Reclaim government solutions](https://www.reclaimprotocol.org/solutions/government) | Reusable, source-backed evidence for multiple programs, with consent and freshness | A synthetic developer/reviewer workbench for failure states, not a competing source connector |
| [CMS Emmy](https://github.com/CMSgov/emmy-app) | Open-source benefits verification workflows and evidence packages | A small deterministic regression engine, not a replacement benefit application |
| [CRA Income Verification Services](https://www.canada.ca/en/revenue-agency/services/about-canada-revenue-agency-cra/protecting-your-privacy/privacy-impact-assessment/income-verification-services-v4.html) | Income verification across government partners | No access to CRA; all examples fictional |
| [Equifax Eligibility Check](https://www.equifax.ca/business/product/eligibility-check/) | Government eligibility data orchestration and verification | No identity, fraud, or real eligibility assessment |
| [Student Verification Suite](https://devpost.com/software/student-verification-suite) | Agent workflows for student evidence and verification | No autonomous application submission; inspect dependencies and simulated changes |
| [ApplyProof](https://devpost.com/software/applyproof) | Application readiness, document checking, uncertainty handling | Cross-program evidence dependencies and explicit policy diffs |

These comparisons use published descriptions; unmentioned capabilities may exist. Do not claim these products lack ClaimWeave's features without hands-on verification.

## Additional research

- [Digital Benefits Network state-system research](https://digitalgovernmenthub.org/publications/implementing-benefits-eligibility-enrollment-systems-insights-on-state-approaches-and-processes/) describes how policy requirements become system changes and tests. This is evidence of the workflow problem, not validation of this product.
- [Consent Verification Monitoring](https://doi.org/10.1145/3490754) studies evolving consent and authorization. Consent evolution is not a new concept.
- A targeted patent search found [US9147042B1](https://patents.google.com/patent/US9147042B1/en), describing consent-related data verification. No claim mapping or legal review was conducted; no patentability or freedom-to-operate conclusion is offered.

## Search coverage

Searches covered the official YC RFS, government verification systems, public GitHub repositories, Devpost entries, consent research, and Google Patents. Representative queries: `government benefits reusable income verification consent evidence`, `site.github.com benefits eligibility provenance`, `site.devpost.com benefits document verification`, `benefits eligibility policy change evidence software`, and `site.patents.google.com consent eligibility verification`.

Startup/product coverage is limited to public search results and the vendor pages above. Private repositories, unpublished prototypes, inaccessible documents, all jurisdictions, comprehensive academic databases, and patent-family claim analysis were not covered. No user interviews or independent outcome study has been done.

## Defensible positioning

“A working synthetic-data workbench combining purpose-scoped consent, evidence freshness, conflict detection, and policy-version comparisons in a traceable application-check workflow.”

Do not say “first,” “never done before,” “production ready,” “verified income,” or “AI eligibility engine.” Differentiation remains a hypothesis to test with benefits-system developers and reviewers.
