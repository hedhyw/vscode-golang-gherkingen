# AGENTS.md

## What this is

A VS Code extension (`hedhyw.golang-gherkingen`) that generates Behaviour
Driven Development (BDD) test boilerplate for Go from Cucumber/Gherkin
`*.feature` files. It is a thin UI wrapper around the
[gherkingen](https://github.com/hedhyw/gherkingen) generator.

## How it works

- `src/extension.ts` registers a single command, `golang-gherkingen.generate`
  (shown as "Go: Generate BDD Golang test" and as an editor-title button for
  `feature` files).
- The command shells out to Docker via `child_process.exec`:
  1. `docker pull hedhyw/gherkingen:<version>` (image tag is the
     `dockerImage` constant at the top of `src/extension.ts` — bump it there
     to upgrade the generator),
  2. `docker run --rm --tty --read-only --network none` with the active
     `.feature` file bind-mounted read-only into the container,
  3. captures stdout/stderr and opens the result in a new untitled Go
     document.
- The only setting is `golang-gherkingen.feature.language` (natural language
  of the feature file), passed to the generator as `--language`.
- Rootless Docker is a runtime requirement for users; the extension itself
  has no runtime npm dependencies.

## Layout

- `src/extension.ts` — the whole extension.
- `src/test/runTest.ts` — downloads VS Code via `@vscode/test-electron` and
  runs the integration tests.
- `src/test/suite/` — mocha test suite (entry `index.ts`, tests
  `*.test.ts`).
- `package.json` — extension manifest (command, language, configuration
  contributions) and scripts.
- `eslint.config.mjs` — ESLint flat config.
- `out/` — compiled JavaScript (git-ignored); `main` points at
  `out/extension.js`.

## Commands

- `npm ci` — install dependencies.
- `npm run compile` — type-check and compile TypeScript to `out/`.
- `npm run watch` — compile in watch mode.
- `npm run lint` — ESLint over `src/`.
- `npm test` — compile + lint (via `pretest`), then download VS Code and run
  the integration tests. Headless Linux needs `xvfb-run -a npm test`.
- Packaging/publishing: `npx @vscode/vsce package` / `npx @vscode/vsce publish`
  (vsce is not a dev dependency; `vscode:prepublish` runs `npm run compile`).

## Conventions

- Conventional commit messages (`feat:`, `fix:`, `chore:`, `ci:`, ...).
- `engines.vscode` is `^1.78.0` and `@types/vscode` is pinned to match; do
  not bump `@types/vscode` past the engine version (vsce refuses to package
  otherwise).
- CI (`.github/workflows/check.yml`) runs lint, compile, and the xvfb test
  suite on push/PR; GitHub Actions are pinned to commit SHAs.
