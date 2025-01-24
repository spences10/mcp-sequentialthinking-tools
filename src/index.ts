#!/usr/bin/env node

// adapted from https://github.com/modelcontextprotocol/servers/blob/main/src/sequentialthinking/index.ts
// for use with mcp tools

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ErrorCode,
	ListToolsRequestSchema,
	McpError,
	Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { ThoughtData, ToolSelection, ToolUsage } from './types.js';
import { SEQUENTIAL_THINKING_TOOL } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(
	readFileSync(join(__dirname, '..', 'package.json'), 'utf8'),
);
const { name, version } = pkg;

// Create MCP server instance
const server = new Server(
	{
		name,
		version,
	},
	{
		capabilities: {
			tools: {},
		},
	},
);

class ToolAwareSequentialThinkingServer {
	private thought_history: ThoughtData[] = [];
	private branches: Record<string, ThoughtData[]> = {};
	private available_tools: Map<string, Tool> = new Map();

	constructor(tools: Tool[]) {
		tools.forEach(tool => this.available_tools.set(tool.name, tool));
	}

	private validateThoughtData(input: unknown): ThoughtData {
		const data = input as Record<string, unknown>;

		if (!data.thought || typeof data.thought !== 'string') {
			throw new Error('Invalid thought: must be a string');
		}
		if (
			!data.thought_number ||
			typeof data.thought_number !== 'number'
		) {
			throw new Error('Invalid thought_number: must be a number');
		}
		if (
			!data.total_thoughts ||
			typeof data.total_thoughts !== 'number'
		) {
			throw new Error('Invalid total_thoughts: must be a number');
		}
		if (typeof data.next_thought_needed !== 'boolean') {
			throw new Error('Invalid next_thought_needed: must be a boolean');
		}

		const validated: ThoughtData = {
			thought: data.thought,
			thought_number: data.thought_number,
			total_thoughts: data.total_thoughts,
			next_thought_needed: data.next_thought_needed,
			is_revision: data.is_revision as boolean | undefined,
			revises_thought: data.revises_thought as number | undefined,
			branch_from_thought: data.branch_from_thought as number | undefined,
			branch_id: data.branch_id as string | undefined,
			needs_more_thoughts: data.needs_more_thoughts as boolean | undefined,
		};

		// Validate tool-related fields if present
		if (data.tools_considered) {
			if (!Array.isArray(data.tools_considered)) {
				throw new Error('tools_considered must be an array');
			}
			validated.tools_considered = data.tools_considered as ToolSelection[];
		}

		if (data.selected_tools) {
			if (!Array.isArray(data.selected_tools)) {
				throw new Error('selected_tools must be an array');
			}
			validated.selected_tools = data.selected_tools as string[];
		}

		return validated;
	}

	private async execute_tools(tools: string[], inputs: Record<string, unknown>): Promise<ToolUsage[]> {
		return Promise.all(tools.map(async tool_name => {
			const start_time = Date.now();
			try {
				const tool = this.available_tools.get(tool_name);
				if (!tool) {
					throw new Error(`Tool ${tool_name} not found`);
				}

				// Execute tool and get results
				const results = await this.execute_tool(tool, inputs);

				return {
					tool_name,
					inputs,
					status: 'success',
					results,
					execution_time: Date.now() - start_time
				};
			} catch (error) {
				return {
					tool_name,
					inputs,
					status: 'error',
					error: error instanceof Error ? error.message : String(error),
					execution_time: Date.now() - start_time
				};
			}
		}));
	}

	private formatThought(thoughtData: ThoughtData): string {
		const {
			thought_number,
			total_thoughts,
			thought,
			is_revision,
			revises_thought,
			branch_from_thought,
			branch_id,
			tool_executions
		} = thoughtData;

		let prefix = '';
		let context = '';

		if (is_revision) {
			prefix = chalk.yellow('🔄 Revision');
			context = ` (revising thought ${revises_thought})`;
		} else if (branch_from_thought) {
			prefix = chalk.green('🌿 Branch');
			context = ` (from thought ${branch_from_thought}, ID: ${branch_id})`;
		} else {
			prefix = chalk.blue('💭 Thought');
			context = '';
		}

		const header = `${prefix} ${thought_number}/${total_thoughts}${context}`;
		let content = thought;

		// Add tool execution information if present
		if (tool_executions?.length) {
			const tool_info = tool_executions.map(execution => {
				const status = execution.status === 'success' ? '✅' : '❌';
				const time = execution.execution_time ? ` (${execution.execution_time}ms)` : '';
				return `${status} ${execution.tool_name}${time}${execution.error ? `: ${execution.error}` : ''}`;
			}).join('\n');
			content = `${thought}\n\nTools Used:\n${tool_info}`;
		}

		const border = '─'.repeat(
			Math.max(header.length, content.length) + 4,
		);

		return `
┌${border}┐
│ ${header} │
├${border}┤
│ ${content.padEnd(border.length - 2)} │
└${border}┘`;
	}

	public async processThought(input: unknown): Promise<{
		content: Array<{ type: string; text: string }>;
		isError?: boolean;
	}> {
		try {
			const validatedInput = this.validateThoughtData(input);

			if (
				validatedInput.thought_number > validatedInput.total_thoughts
			) {
				validatedInput.total_thoughts = validatedInput.thought_number;
			}

			// Execute selected tools if any
			if (validatedInput.selected_tools?.length) {
				validatedInput.tool_executions = await this.execute_tools(
					validatedInput.selected_tools,
					{ thought: validatedInput.thought }
				);
				
				// Process tool results into outputs
				validatedInput.tool_outputs = validatedInput.tool_executions
					.filter(execution => execution.status === 'success')
					.map(execution => JSON.stringify(execution.results));
			}

			this.thought_history.push(validatedInput);

			if (
				validatedInput.branch_from_thought &&
				validatedInput.branch_id
			) {
				if (!this.branches[validatedInput.branch_id]) {
					this.branches[validatedInput.branch_id] = [];
				}
				this.branches[validatedInput.branch_id].push(validatedInput);
			}

			const formattedThought = this.formatThought(validatedInput);
			console.error(formattedThought);

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(
							{
								thought_number: validatedInput.thought_number,
								total_thoughts: validatedInput.total_thoughts,
								next_thought_needed: validatedInput.next_thought_needed,
								branches: Object.keys(this.branches),
								thought_history_length: this.thought_history.length,
								tool_executions: validatedInput.tool_executions,
								tool_outputs: validatedInput.tool_outputs
							},
							null,
							2,
						),
					},
				],
			};
		} catch (error) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(
							{
								error:
									error instanceof Error
										? error.message
										: String(error),
								status: 'failed',
							},
							null,
							2,
						),
					},
				],
				isError: true,
			};
		}
	}

	private async execute_tool(tool: Tool, inputs: Record<string, unknown>): Promise<unknown> {
		try {
			// Call the tool through the server's request method
			const response = await server.request(
				{
					method: 'callTool',
					params: {
						name: tool.name,
						arguments: inputs
					}
				},
				CallToolRequestSchema
			);
			
			// Extract the result from the response
			if ('content' in response && Array.isArray(response.content) && response.content.length > 0) {
				const content = response.content[0];
				if ('text' in content && typeof content.text === 'string') {
					try {
						// Attempt to parse JSON result
						return JSON.parse(content.text);
					} catch {
						// If not JSON, return as-is
						return content.text;
					}
				}
			}
			
			throw new Error('Tool execution returned no content');
		} catch (error) {
			throw new Error(
				`Failed to execute tool ${tool.name}: ${
					error instanceof Error ? error.message : String(error)
				}`
			);
		}
	}
}


const thinkingServer = new ToolAwareSequentialThinkingServer([SEQUENTIAL_THINKING_TOOL]);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
	tools: [SEQUENTIAL_THINKING_TOOL],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	if (request.params.name === 'sequentialthinking') {
		return thinkingServer.processThought(request.params.arguments);
	}

	return {
		content: [
			{
				type: 'text',
				text: `Unknown tool: ${request.params.name}`,
			},
		],
		isError: true,
	};
});

async function runServer() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error('Sequential Thinking MCP Server running on stdio');
}

runServer().catch((error) => {
	console.error('Fatal error running server:', error);
	process.exit(1);
});
