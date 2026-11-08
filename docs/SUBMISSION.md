# Submission preparation

Status: draft only. Not registered or submitted by this document.

## Target

[LaunchPad Hacks](https://launchpad-hacks.devpost.com/) — November 20, 2026, 5 PM Eastern. The published rules allow students of majority age, solo projects, and disclosed AI assistance. Final registration explicitly accepts Official Rules and Devpost Terms of Service and awaits the account holder's confirmation. Recheck live requirements before submitting.

## Name

ClaimWeave

## Pitch

Trace how consent, stale evidence, and policy changes affect application checks before they reach people.

## Inspiration

YC’s “Plaid for Government Benefits” request highlights repeated verification. Research showed that reusable verification already exists. We chose a narrower question: how can a reviewer understand which checks depend on a record, and what changes when evidence or policy changes?

## What it does

ClaimWeave connects synthetic income, residency, and enrollment records to three fictional programs. Reviewers inspect check-level reasons, withdraw purpose-specific consent, compare rule versions, reproduce conflicting evidence, and download a minimal evidence packet only when the current checks allow it.

## How it was built

A dependency-free JavaScript application shares a pure rules engine between the browser and Node test runner. Static assets can be hosted without a backend. Evidence exports use explicit field projection. GitHub Actions runs regression checks. OpenAI Codex assisted research, implementation, visual design, tests, and documentation. There is no runtime AI model.

## Challenges

Missing or withdrawn evidence must not look like a failed eligibility decision. A conflicting pair of records must not be silently resolved by picking whichever value passes. A downloaded packet must exclude unrelated source fields. Policy-only changes must be reproducible without mutating the baseline.

## What is next

Validate the workflow with real reviewers; add a versioned policy schema and agency-specific acceptance tests; investigate authenticated source adapters. Those features are not implemented in this prototype.

## Before final submission

- Supply a judge-accessible build or demo and screenshots.
- Confirm participant information, personal contributions, eligibility, and any teammates.
- Disclose AI assistance and pre-existing components accurately.
- Run the complete demo and verify all linked artifacts.
- Never present fictional policies as actual benefit requirements.
