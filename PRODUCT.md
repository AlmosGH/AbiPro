# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are 12th-grade high-school students preparing for the Hungarian history *érettségi* (Abitur-equivalent) exam in German. They need focused, fast-paced preparation without visual overload.

## Product Purpose

AbiPro helps learners prepare for the intermediate-level Hungarian history exam through authentic past-exam short-answer tasks, targeted practice, and simulated exams. Success means learners can practice efficiently, understand results, and track improvement over time.

## Positioning

The product combines an official-history-exam task library with deterministic and AI-assisted grading, resumable practice, mock exams, and persistent progress in one learner-focused experience.

## Operating Context

Learners browse past exam tasks by session, historical period, topic, and curriculum; practice individual tasks; or complete timed, autosaved 12-task mock exams. Accounts retain attempts, answer history, mock-exam results, and topic/period progress. Administrators curate, validate, publish, archive, and restore exam content.

## Capabilities and Constraints

- Covers short-answer exam tasks; essays are deliberately out of scope.
- Exact-answer question types use deterministic grading; open-text answers may use AI evaluation against official marking criteria.
- The app must remain sleek, responsive, fast, and visually uncluttered to support concentrated study.
- Content follows a draft, published, archived workflow; only published tasks are visible to learners.
- Confirmed technology: SvelteKit, TypeScript, Tailwind CSS, PostgreSQL/Supabase, Drizzle, Supabase Auth, Zod, Gemini API, Vitest, and Playwright.

## Evidence on Hand

- Official exam PDFs and solution guides from 2006–2026 are stored in `erettsegik_2006_2026/`.
- Imported exercise imagery is stored in `static/test-data/`.
- The project README documents implemented learner, grading, mock-exam, and administrative workflows.
- No brand assets, formal accessibility standard, external testimonials, or verified performance claims are currently recorded.

## Product Principles

- Keep every study interaction calm, direct, and easy to scan.
- Favor rapid practice and clear feedback over decorative complexity.
- Ground evaluation and study material in official exam sources and marking criteria.
- Preserve learner progress reliably across attempts and sessions.

