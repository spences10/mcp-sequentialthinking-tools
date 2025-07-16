# mcp-sequentialthinking-tools

An adaptation of the
[MCP Sequential Thinking Server](https://github.com/modelcontextprotocol/servers/blob/main/src/sequentialthinking/index.ts)
designed to guide tool usage in problem-solving. This server helps
break down complex problems into manageable steps and provides
recommendations for which MCP tools would be most effective at each
stage.

<a href="https://glama.ai/mcp/servers/zl990kfusy">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/zl990kfusy/badge" />
</a>

A Model Context Protocol (MCP) server that combines sequential
thinking with intelligent tool suggestions. For each step in the
problem-solving process, it provides confidence-scored recommendations
for which tools to use, along with rationale for why each tool would
be appropriate.

## Features

- 🤔 Dynamic and reflective problem-solving through sequential
  thoughts
- 🔄 Flexible thinking process that adapts and evolves
- 🌳 Support for branching and revision of thoughts
- 🛠️ LLM-driven intelligent tool recommendations for each step
- 📊 Confidence scoring for tool suggestions
- 🔍 Detailed rationale for tool recommendations
- 📝 Step tracking with expected outcomes
- 🔄 Progress monitoring with previous and remaining steps
- 🎯 Alternative tool suggestions for each step
- 🧠 Memory management with configurable history limits
- 🗑️ Manual history cleanup capabilities

## How It Works

This server facilitates sequential thinking with MCP tool coordination. The LLM analyzes available tools and their descriptions to make intelligent recommendations, which are then tracked and organized by this server.

The workflow:
1. LLM provides available MCP tools to the sequential thinking server
2. LLM analyzes each thought step and recommends appropriate tools
3. Server tracks recommendations, maintains context, and manages memory
4. LLM executes recommended tools and continues the thinking process

Each recommendation includes:
- A confidence score (0-1) indicating how well the tool matches the need
- A clear rationale explaining why the tool would be helpful
- A priority level to suggest tool execution order
- Suggested input parameters for the tool
- Alternative tools that could also be used

The server works with any MCP tools available in your environment and automatically manages memory to prevent unbounded growth.

## Example Usage

Here's an example of how the server guides tool usage:

```json
{
	"thought": "Initial research step to understand what universal reactivity means in Svelte 5",
	"current_step": {
		"step_description": "Gather initial information about Svelte 5's universal reactivity",
		"expected_outcome": "Clear understanding of universal reactivity concept",
		"recommended_tools": [
			{
				"tool_name": "search_docs",
				"confidence": 0.9,
				"rationale": "Search Svelte documentation for official information",
				"priority": 1
			},
			{
				"tool_name": "tavily_search",
				"confidence": 0.8,
				"rationale": "Get additional context from reliable sources",
				"priority": 2
			}
		],
		"next_step_conditions": [
			"Verify information accuracy",
			"Look for implementation details"
		]
	},
	"thought_number": 1,
	"total_thoughts": 5,
	"next_thought_needed": true
}
```

The server tracks your progress and supports:

- Creating branches to explore different approaches
- Revising previous thoughts with new information
- Maintaining context across multiple steps
- Suggesting next steps based on current findings

## Configuration

This server requires configuration through your MCP client. Here are
examples for different environments:

### Cline Configuration

Add this to your Cline MCP settings:

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

### Claude Desktop with WSL Configuration

For WSL environments, add this to your Claude Desktop configuration:

```json
{
	"mcpServers": {
		"mcp-sequentialthinking-tools": {
			"command": "wsl.exe",
			"args": [
				"bash",
				"-c",
				"MAX_HISTORY_SIZE=1000 source ~/.nvm/nvm.sh && /home/username/.nvm/versions/node/v20.12.1/bin/npx mcp-sequentialthinking-tools"
			]
		}
	}
}
```

## API

The server implements a single MCP tool with configurable parameters:

### sequentialthinking_tools

A tool for dynamic and reflective problem-solving through thoughts,
with intelligent tool recommendations.

Parameters:

- `available_mcp_tools` (array, required): Array of MCP tool names available for use (e.g., ["mcp-omnisearch", "mcp-turso-cloud"])
- `thought` (string, required): Your current thinking step
- `next_thought_needed` (boolean, required): Whether another thought
  step is needed
- `thought_number` (integer, required): Current thought number
- `total_thoughts` (integer, required): Estimated total thoughts
  needed
- `is_revision` (boolean, optional): Whether this revises previous
  thinking
- `revises_thought` (integer, optional): Which thought is being
  reconsidered
- `branch_from_thought` (integer, optional): Branching point thought
  number
- `branch_id` (string, optional): Branch identifier
- `needs_more_thoughts` (boolean, optional): If more thoughts are
  needed
- `current_step` (object, optional): Current step recommendation with:
  - `step_description`: What needs to be done
  - `recommended_tools`: Array of tool recommendations with confidence
    scores
  - `expected_outcome`: What to expect from this step
  - `next_step_conditions`: Conditions for next step
- `previous_steps` (array, optional): Steps already recommended
- `remaining_steps` (array, optional): High-level descriptions of
  upcoming steps

## Memory Management

The server includes built-in memory management to prevent unbounded growth:

- **History Limit**: Configurable maximum number of thoughts to retain (default: 1000)
- **Automatic Trimming**: History automatically trims when limit is exceeded
- **Manual Cleanup**: Server provides methods to clear history when needed

### Configuring History Size

You can configure the history size by setting the `MAX_HISTORY_SIZE` environment variable:

```json
{
  "mcpServers": {
    "mcp-sequentialthinking-tools": {
      "command": "npx",
      "args": ["-y", "mcp-sequentialthinking-tools"],
      "env": {
        "MAX_HISTORY_SIZE": "500"
      }
    }
  }
}
```

Or for local development:
```bash
MAX_HISTORY_SIZE=2000 npx mcp-sequentialthinking-tools
```

## Development

### Setup

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Build the project:

```bash
pnpm build
```

4. Run in development mode:

```bash
pnpm dev
```

### Publishing

The project uses changesets for version management. To publish:

1. Create a changeset:

```bash
pnpm changeset
```

2. Version the package:

```bash
pnpm changeset version
```

3. Publish to npm:

```bash
pnpm release
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built on the
  [Model Context Protocol](https://github.com/modelcontextprotocol)
- Adapted from the
  [MCP Sequential Thinking Server](https://github.com/modelcontextprotocol/servers/blob/main/src/sequentialthinking/index.ts)
