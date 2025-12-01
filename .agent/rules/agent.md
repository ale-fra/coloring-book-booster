---
trigger: always_on
---

# Contributor Guidelines (Global)

This repository now has a root-level `AGENTS.md`. It applies to all files unless a nested `AGENTS.md` exists within a subdirectory, in which case the nested file’s rules take precedence for that subtree. For example, `components/AGENTS.md` would override relevant guidance for files in `components/`, while this root file would still govern `lib/` and other areas without their own file.

## Coding Standards
- Use TypeScript first: keep types explicit, narrow, and reuse shared types from `lib` where possible.
- Prefer functional React components and hooks. Avoid unnecessary state and side effects; keep components pure and memoize expensive computations when needed.
- Follow linting and formatting rules enforced by the repo (`npm run lint`). Do not disable lint rules unless absolutely necessary and documented.
- Keep modules focused: one main export per file when practical, small functions over large monoliths, and meaningful naming.
- Avoid catching broad errors; handle expected failure cases explicitly and propagate unexpected ones.
- Do not wrap imports in try/catch blocks.
- Write accessible JSX: semantic HTML, proper labels for form elements, keyboard/focus handling, and ARIA attributes when appropriate.

## Testing Policy
- Add or update automated tests alongside behavior changes. Favor Jest for unit/integration coverage where feasible.
- Run `npm test` and `npm run lint` before pushing. Document in your PR if a test is flaky or temporarily skipped, and include rationale.
- Keep tests deterministic: no real network calls; use mocks/fakes for external services.

## Documentation Rules
- Update README or feature-specific docs when user-visible behavior changes or new configuration is introduced.
- Inline documentation should be concise: use JSDoc/TSdoc for exported functions, and comments only where logic is non-obvious.
- Keep changelogs in PR descriptions: summarize scope, risks, and test evidence.

## Security and Secrets Handling
- Never commit secrets, API keys, certificates, or real credentials. Use environment variables and `.env.local` for local-only values, and add new keys to `.env.example` when appropriate.
- Validate and sanitize inputs at boundaries (API routes, external integrations). Avoid logging sensitive data.
- Use least privilege when adding permissions or scopes to third-party tokens.

## Branch and PR Hygiene
- Develop on feature branches; keep commits scoped and descriptive.
- Prefer small, reviewable PRs with clear titles and structured summaries (what/why/how, tests, risks).
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
- `app/` – Next.js app router pages and route handlers.
- `components/` – Shared React UI components.
- `lib/` – Utilities, services, and shared logic (e.g., data access, helpers).
- `public/` – Static assets.
- `tests/` (if present) and `*.test.ts` files – Automated tests.
- Root configs: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `jest.config.js`, `tailwind`/PostCSS config, `drizzle.config.ts`.

## Artifact Expectations
- Provide test evidence (command output or screenshots) in PR descriptions.
- Include screenshots for user-facing UI changes when feasible; ensure sensitive data is redacted.
- Note any follow-up work or known limitations directly in the PR body.

## Nested `AGENTS.md` Precedence
- This file is global. Any `AGENTS.md` placed inside a subdirectory (e.g., `app/AGENTS.md` or `components/forms/AGENTS.md`) overrides relevant guidance for files in that folder and its children. If instructions conflict, the nearest (most deeply nested) `AGENTS.md` wins. When editing multiple files across directories, follow the instructions applicable to each path.
