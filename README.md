# mcp-sequentialthinking-tools

[![built with vite+](https://img.shields.io/badge/built%20with-Vite+-646CFF?logo=vite&logoColor=white)](https://viteplus.dev)
[![tested with vitest](https://img.shields.io/badge/tested%20with-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)

A lightweight MCP server for recording sequential reasoning steps. It
is a scratchpad with history, branching, revision metadata, and
optional validation for model-authored tool plans.

It does **not** discover your other MCP tools and it does **not**
choose tools for the model. If you pass `available_tools` and
`recommended_tools`, the server validates that the recommended names
exist and stores the step.

<a href="https://glama.ai/mcp/servers/zl990kfusy">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/zl990kfusy/badge" />
</a>

## Why use it?

Use this when a task benefits from explicit, inspectable reasoning:

- breaking a messy problem into steps;
- revising or branching a plan;
- keeping a small reasoning history by session;
- validating tool-plan names against a supplied tool list;
- clearing or inspecting reasoning history during a long agent run.

Do not use it for trivial requests. It adds overhead.

## Tools

### `sequentialthinking_tools`

Records one thought.

Required parameters:

- `thought` — current reasoning step
- `thought_number` — current step number
- `total_thoughts` — current estimate; automatically raised if lower
  than `thought_number`
- `next_thought_needed` — whether another thought is needed

Optional parameters:

- `session_id` — history bucket; defaults to `default`
- `is_revision`, `revises_thought`
- `branch_from_thought`, `branch_id`
- `needs_more_thoughts`
- `available_tools` — array of tool names or `{ name, description }`
  objects
- `recommended_tools` — model-authored recommendations to
  validate/store
- `remaining_steps` — short list of upcoming steps

Example:

```json
{
	"session_id": "svelte-debug",
	"thought": "First inspect the route files, then run the failing check.",
	"thought_number": 1,
	"total_thoughts": 3,
	"next_thought_needed": true,
	"available_tools": ["read", "bash"],
	"recommended_tools": [
		{
			"tool_name": "read",
			"confidence": 0.9,
			"rationale": "Need to inspect the relevant files before editing.",
			"priority": 1
		}
	]
}
```

If `recommended_tools` contains a name not present in
`available_tools`, the call returns `isError: true` and does not store
the thought.

## Security posture

The server treats thought text, tool descriptions, rationales, and
remaining-step text as untrusted input. Prompt-injection-like text is
scanned and redacted before it is stored or returned in history. Calls
with redactions include `security_warnings` showing which fields
matched.

This is defensive filtering, not a guarantee that arbitrary
adversarial text is safe. Do not put secrets in thoughts or tool
descriptions.

### `get_thinking_history`

Returns stored thoughts for a session.

Parameters:

- `session_id` — defaults to `default`
- `branch_id` — optional branch filter
- `limit` — max records to return; default `50`, max `500`

### `clear_thinking_history`

Clears one session or every session.

Parameters:

- `session_id` — defaults to `default`
- `all_sessions` — clear all history buckets

## Prompt

### `sequential-thinking-guidance`

A short prompt that tells the model how to use this server honestly:
as a scratchpad and validator, not as an external reasoning engine.

## Configuration

### Claude Desktop / compatible MCP clients

```json
{
	"mcpServers": {
		"mcp-sequentialthinking-tools": {
			"command": "npx",
			"args": ["-y", "mcp-sequentialthinking-tools"],
			"env": {
				"MAX_HISTORY_SIZE": "1000"
			}
		}
	}
}
```

`MAX_HISTORY_SIZE` is per session and defaults to `1000`.

The server uses `tmcp` and includes a small stdio transport that
accepts both standard `Content-Length` framed MCP messages and
newline-delimited JSON used by older `tmcp` tooling.

## Development

```bash
pnpm install
pnpm test
pnpm build
pnpm check
```

This project uses `vite-plus` for build, test, format, and lint
orchestration.

## Publishing

```bash
pnpm changeset
pnpm changeset version
pnpm release
```

## License

MIT License — see [LICENSE](LICENSE).

## Acknowledgments

- Built on the
  [Model Context Protocol](https://github.com/modelcontextprotocol)
- Adapted from the
  [MCP Sequential Thinking Server](https://github.com/modelcontextprotocol/servers/blob/main/src/sequentialthinking/index.ts)
