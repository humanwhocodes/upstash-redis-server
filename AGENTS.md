# Agent guidance

## Project and layout

This ES module Node.js package exposes a Hono HTTP server emulating the Upstash
Redis REST API for local development and testing. It forwards commands through
`ioredis`; it does not implement a Redis database.

- `src/app.js`: `createApp()` factory, authentication, single-command and pipeline
  endpoints, response encoding, and error handling.
- `src/index.js`: public package exports.
- `src/server.js`: CLI entry point and environment configuration.
- `tests/app.test.js`: Mocha tests using Node.js assertions.
- `dist/`: generated JavaScript and type declarations; do not edit or commit.
- `.github/workflows/`: Node.js and Bun CI, plus release automation.

Read `.github/copilot-instructions.md` and, for JavaScript/TypeScript changes,
`.github/instructions/javascript.instructions.md` alongside this guide.

## Setup and validation

Use Node.js >=18.18 and run commands from the repository root.

- `npm ci`: install dependencies from the lockfile.
- `npm run build`: run TypeScript with strict JavaScript checking and emit
  JavaScript and declaration files into `dist/`.
- `npx mocha tests/app.test.js --exit --forbid-only`: run the focused test file.
  Keep `--exit` because app instances create Redis connections.
- `npm test`: build automatically via `pretest`, then run all Mocha tests.
- `npm run lint`: lint source and tests with ESLint.
- `npx prettier --check AGENTS.md`: check this document's formatting; substitute
  the changed paths for other focused formatting checks.
- `npm run fmt`: format the entire repository; avoid unrelated formatting churn.
- `npm run test:attw`: check packed ESM exports and types after building when
  changing the package's public API or publishing configuration.

For code changes, run the affected test file until it passes, then the full test
suite, lint, and build as relevant. CI covers Node.js 20, 22, and 24 on Windows,
macOS, and Linux, and also builds and tests with Bun.

To run the server locally, build first and run `node dist/server.js` with
`URS_TOKEN` set. A running Redis instance is needed for real command execution.
`REDIS_URL` defaults to `redis://localhost:6379`; `PORT` defaults to `8080`.
Tests stub Redis methods for command-response cases, but app construction still
creates Redis clients.

## Code and test conventions

- Keep source in JavaScript ES modules with JSDoc annotations; TypeScript checks
  the JavaScript and generates declarations.
- Use tabs, double-quoted strings, and braced conditional blocks. Leave a blank
  line before and after conditionals, per the JavaScript instructions.
- Validate inputs at entry points. Use precise error messages, `TypeError` for
  type validation, and `Error` for business logic; preserve HTTP error response
  shapes and status codes when modifying endpoints.
- Cover success and error paths, exact error messages, asynchronous behavior,
  and concurrent operations where relevant. Restore mocked Redis methods after
  each test, following the existing `try`/`finally` pattern.
- Update README usage/configuration documentation when behavior changes.

## Commit messages and pull requests

**Both commit messages and PR titles MUST use Conventional Commits format:**
`type(scope): description`, where the scope is optional.

Choose the type for the primary purpose: `feat` for functionality, `fix` for bug
fixes, `docs` for Markdown-only documentation changes, `chore` for maintenance
that does not affect users, `ci` for workflows, and `build` for build changes.
Use a relevant scope only when useful, such as `app` or `server`. Examples:
`fix(app): preserve pipeline error responses` and `docs: add agent guidance`.
For breaking changes, use `!` after the type/scope and explain the break in a
`BREAKING CHANGE:` footer. See the
[Conventional Commits specification](https://www.conventionalcommits.org/en/v1.0.0/).
