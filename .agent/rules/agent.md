---
trigger: always_on
---

# Contributor Guidelines (Global)

This repository has a root-level `AGENTS.md`. It applies to all files unless a nested `AGENTS.md` exists within a subdirectory, in which case the nested file’s rules take precedence for that subtree. For example, `components/AGENTS.md` would override relevant guidance for files in `components/`, while this root file would still govern `lib/` and other areas without their own file.

## File Encoding
- Keep this file (and other docs) as **UTF-8**. If you see garbled characters like `â€™` or `â€“`, fix the punctuation and re-save as UTF-8.

## Decision Hierarchy
- **Repo tooling rules first** (lint/format/typecheck/test).
- Then the **nearest** (most deeply nested) applicable `AGENTS.md`.
- Then this root `AGENTS.md`.

## Coding Standards
- Use TypeScript first: keep types explicit, narrow, and reuse shared types from `lib` where possible.
- Prefer functional React components and hooks. Avoid unnecessary state and side effects; keep components pure and memoize expensive computations when needed.
- Follow linting and formatting rules enforced by the repo (`npm run lint`). Do not disable lint rules unless absolutely necessary and documented.
- Keep modules focused: one main export per file when practical, small functions over large monoliths, and meaningful naming.
- Avoid catching broad errors in the middle of the stack; handle expected failure cases explicitly and propagate unexpected ones.
  - Exception: boundary layers (API routes, background jobs, request handlers) may catch to return a safe response and log/alert, but should not silently swallow unexpected errors.
- Do not wrap imports in try/catch blocks.
- Write accessible JSX:
  - Use semantic HTML first.
  - Every form control must have an associated label.
  - All interactive UI must be keyboard reachable.
  - Don’t use `div`/`span` as buttons/links unless you implement proper `role`, `tabIndex`, keyboard handlers, and focus styling (prefer real `<button>` / `<a>`).

## Testing Policy
- Add or update automated tests alongside behavior changes.
- Favor Jest for unit/integration coverage where feasible.
- If the repo has an e2e framework configured (e.g., Playwright/Cypress), add/update e2e tests for critical user flows.
- Run `npm test` and `npm run lint` before pushing. If a test is flaky or temporarily skipped, document the rationale in the PR and create a follow-up task.
- Keep tests deterministic: no real network calls; use mocks/fakes for external services.

## Documentation Rules
- Update README or feature-specific docs when user-visible behavior changes or new configuration is introduced.
- Inline documentation should be concise: use JSDoc/TSdoc for exported functions, and comments only where logic is non-obvious.

## PR Description Requirements
Include:
- **What / Why / How** (short, structured bullets are fine)
- **Tests run** (commands + any relevant output)
- **Risks / rollout notes** (migrations, flags, backwards-compat concerns, monitoring)
- **Screenshots** for user-facing UI changes (with sensitive data redacted)

## Commit Message Guidelines
- Use descriptive, scoped commits.
- Prefer **Conventional Commits** where practical: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `perf:`.
- If the repo uses squash merges, make sure the PR title is a good final commit message.

## Security and Secrets Handling
- Never commit secrets, API keys, certificates, or real credentials. Use environment variables and `.env.local` for local-only values, and add new keys to `.env.example` when appropriate.
- Validate and sanitize inputs at boundaries (API routes, external integrations). Avoid logging sensitive data.
- Use least privilege when adding permissions or scopes to third-party tokens.

## Branch and PR Hygiene
- Develop on feature branches; keep commits scoped and descriptive.
- Prefer small, reviewable PRs with clear titles and structured summaries.
- Ensure CI/lint/test status is green before requesting review. If you must merge with known issues, clearly call them out and create follow-up tasks.

### GitFlow Strategy (branching model)
- `main` mirrors production; `develop` is the integration branch for ongoing work. Keep both always releasable.
- Name feature branches `feature/<short-description>` off `develop`; rebase or merge regularly to stay current.
- Use `release/<version>` branches from `develop` to stabilize before production; allow only fixes/docs on release branches.
- For urgent production fixes, branch from `main` as `hotfix/<issue>` and merge back into both `main` and `develop` after validation.

## Review SLA and Approvals
- Aim to respond to review requests within one business day. A second reviewer is encouraged for risky or security-sensitive changes.
- Address feedback promptly; use follow-up issues for non-blocking items you cannot tackle immediately.

## Performance and Accessibility Checks
- Watch for client-side bundle size growth: reuse existing utilities, lazy-load heavy modules, and avoid unnecessary dependencies.
- For new UI features, consider accessibility and performance: prefer semantic elements, ensure keyboard navigation, and verify animations do not block interaction.
- Profile slow paths when adding data processing or rendering loops; add caching/memoization when warranted.

## Dependency Management
- Use `npm` (per `package-lock.json`) for installs. Avoid introducing new dependencies unless necessary; justify additions in the PR summary.
- Prefer existing library versions; upgrade only with reasoned justification and note breaking changes.
- Remove unused packages when discovered and ensure lockfiles stay in sync.

## Local Setup Tips
- Install dependencies with `npm install`.
- Run the development server with `npm run dev`; production build with `npm run build` followed by `npm start`.
- Use `npm run lint` and `npm test` locally to mirror CI expectations.

## Repository Layout (high level)
Common folders include:
- `app/` – Next.js app router pages and route handlers.
- `components/` – Shared React UI components.
- `lib/` – Utilities, services, and shared logic (e.g., data access, helpers).
- `public/` – Static assets.
- `tests/` (if present) and `*.test.ts` files – Automated tests.
- Root configs: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `jest.config.js`, `tailwind`/PostCSS config, `drizzle.config.ts`.

## Nested `AGENTS.md` Precedence
- This file is global. Any `AGENTS.md` placed inside a subdirectory (e.g., `app/AGENTS.md` or `components/forms/AGENTS.md`) overrides relevant guidance for files in that folder and its children. If instructions conflict, the nearest (most deeply nested) `AGENTS.md` wins. When editing multiple files across directories, follow the instructions applicable to each path.
