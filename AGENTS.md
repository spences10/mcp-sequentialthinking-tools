# Repository Conventions

- Use kebab-case filenames and snake_case project-owned variables and
  functions. Use PascalCase for types and classes. Preserve external
  API names at their boundaries.
- Keep this repository as a single package unless it gains a genuinely
  separate application or publishable package.
- Colocate tests with the code they exercise.
- Derive input types from Valibot schemas so runtime validation and
  TypeScript cannot drift apart.
- Use Vite+ for build, formatting, linting, type checking, and tests;
  do not add parallel toolchains for the same jobs.
- Treat MCP request content as untrusted. Update focused security
  tests whenever sanitization behavior changes.
- Run relevant tests and `pnpm check` after changes. Run `pnpm build`
  when package entry points or build configuration change.

Keep instructions limited to durable, non-obvious decisions. Discover
commands, dependencies, and file layout from their source files.
