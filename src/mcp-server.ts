import { ValibotJsonSchemaAdapter } from '@tmcp/adapter-valibot';
import { McpServer } from 'tmcp';
import { prompt as prompt_result } from 'tmcp/utils';
import {
	clear_history_schema,
	get_history_schema,
	guidance_prompt_schema,
	sequential_thinking_schema,
} from './schema.js';
import { thinking_store } from './thinking.js';

export interface ServerMetadata {
	name: string;
	version: string;
	description: string;
}

/** Create a fully registered MCP server for a transport. */
export function create_mcp_server(metadata: ServerMetadata) {
	const server = new McpServer(metadata, {
		adapter: new ValibotJsonSchemaAdapter(),
		capabilities: {
			tools: { listChanged: true },
			prompts: { listChanged: true },
		},
	});
	const max_history_size = parse_int_env('MAX_HISTORY_SIZE', 1000);
	const thinking = new thinking_store({ max_history_size });

	server.tool(
		{
			name: 'sequentialthinking_tools',
			description:
				'Record one step of sequential reasoning. Optionally include available_tools and recommended_tools; recommendations are validated, not generated, by this server.',
			schema: sequential_thinking_schema,
		},
		(input) => {
			const result = thinking.add(input);
			return json_tool(
				result,
				Boolean(result.invalid_recommendations?.length),
			);
		},
	);

	server.tool(
		{
			name: 'get_thinking_history',
			description:
				'Return recorded thoughts for a session. Use this to inspect or resume prior reasoning.',
			schema: get_history_schema,
		},
		(input) => json_tool(thinking.get_history(input)),
	);

	server.tool(
		{
			name: 'clear_thinking_history',
			description:
				'Clear recorded sequential-thinking history for one session or all sessions.',
			schema: clear_history_schema,
		},
		(input) => json_tool(thinking.clear(input)),
	);

	server.prompt(
		{
			name: 'sequential-thinking-guidance',
			description:
				'Use sequentialthinking_tools as a lightweight scratchpad without pretending it performs reasoning for you.',
			schema: guidance_prompt_schema,
		},
		({ problem }) =>
			prompt_result.message(
				[
					'Use sequentialthinking_tools only for problems that genuinely benefit from explicit multi-step reasoning.',
					'Keep each thought short. Revise or branch when new evidence changes the plan.',
					'If recommending tools, pass available_tools and recommended_tools so the server can validate names.',
					'Do not claim the server chose the tools; the model authored the plan and the server tracked it.',
					problem ? `Problem: ${problem}` : undefined,
				]
					.filter(Boolean)
					.join('\n'),
			),
	);

	return server;
}

function json_tool(data: unknown, is_error = false) {
	return {
		content: [
			{
				type: 'text' as const,
				text: JSON.stringify(data, null, 2),
			},
		],
		isError: is_error,
	};
}

function parse_int_env(name: string, fallback: number): number {
	const value = Number.parseInt(process.env[name] ?? '', 10);
	return Number.isFinite(value) && value > 0 ? value : fallback;
}
