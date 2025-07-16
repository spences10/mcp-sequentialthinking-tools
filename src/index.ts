#!/usr/bin/env node

// adapted from https://github.com/modelcontextprotocol/servers/blob/main/src/sequentialthinking/index.ts
// for use with mcp tools

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
	Tool,
} from '@modelcontextprotocol/sdk/types.js';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { SEQUENTIAL_THINKING_TOOL } from './schema.js';
import { ThoughtData, ToolRecommendation, StepRecommendation } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(
	readFileSync(join(__dirname, '..', 'package.json'), 'utf8'),
);
const { name, version } = pkg;

// Create MCP server instance with tools capability
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

interface ServerOptions {
	available_tools?: Tool[];
	maxHistorySize?: number;
}

class ToolAwareSequentialThinkingServer {
	private thought_history: ThoughtData[] = [];
	private branches: Record<string, ThoughtData[]> = {};
	private available_tools: Map<string, Tool> = new Map();
	private maxHistorySize: number;

	public getAvailableTools(): Tool[] {
		return Array.from(this.available_tools.values());
	}

	constructor(options: ServerOptions = {}) {
		this.maxHistorySize = options.maxHistorySize || 1000;
		
		// Always include the sequential thinking tool
		const tools = [
			SEQUENTIAL_THINKING_TOOL,
			...(options.available_tools || []),
		];

		// Initialize with provided tools
		tools.forEach((tool) => {
			if (this.available_tools.has(tool.name)) {
				console.error(
					`Warning: Duplicate tool name '${tool.name}' - using first occurrence`,
				);
				return;
			}
			this.available_tools.set(tool.name, tool);
		});

		console.error(
			'Available tools:',
			Array.from(this.available_tools.keys()),
		);
	}

	public clearHistory(): void {
		this.thought_history = [];
		this.branches = {};
		console.error('History cleared');
	}

	public addTool(tool: Tool): void {
		if (this.available_tools.has(tool.name)) {
			console.error(`Warning: Tool '${tool.name}' already exists`);
			return;
		}
		this.available_tools.set(tool.name, tool);
		console.error(`Added tool: ${tool.name}`);
	}

	public discoverTools(): void {
		// In a real implementation, this would scan the environment
		// for available MCP tools and add them to available_tools
		console.error('Tool discovery not implemented - manually add tools via addTool()');
	}

	private validateThoughtData(input: unknown): ThoughtData {
		const data = input as Record<string, unknown>;

		if (!data.available_mcp_tools || !Array.isArray(data.available_mcp_tools)) {
			throw new Error('Invalid available_mcp_tools: must be an array');
		}
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
			throw new Error(
				'Invalid next_thought_needed: must be a boolean',
			);
		}

		const validated: ThoughtData = {
			available_mcp_tools: data.available_mcp_tools as string[],
			thought: data.thought,
			thought_number: data.thought_number,
			total_thoughts: data.total_thoughts,
			next_thought_needed: data.next_thought_needed,
			is_revision: data.is_revision as boolean | undefined,
			revises_thought: data.revises_thought as number | undefined,
			branch_from_thought: data.branch_from_thought as
				| number
				| undefined,
			branch_id: data.branch_id as string | undefined,
			needs_more_thoughts: data.needs_more_thoughts as
				| boolean
				| undefined,
		};

		// Validate recommendation-related fields if present
		if (data.current_step) {
			validated.current_step = data.current_step as StepRecommendation;
		}

		if (data.previous_steps) {
			if (!Array.isArray(data.previous_steps)) {
				throw new Error('previous_steps must be an array');
			}
			validated.previous_steps = data.previous_steps as StepRecommendation[];
		}

		if (data.remaining_steps) {
			if (!Array.isArray(data.remaining_steps)) {
				throw new Error('remaining_steps must be an array');
			}
			validated.remaining_steps = data.remaining_steps as string[];
		}

		return validated;
	}

	private formatRecommendation(step: StepRecommendation): string {
		const tools = step.recommended_tools
			.map((tool) => {
				const alternatives = tool.alternatives?.length 
					? ` (alternatives: ${tool.alternatives.join(', ')})`
					: '';
				const inputs = tool.suggested_inputs 
					? `\n    Suggested inputs: ${JSON.stringify(tool.suggested_inputs)}`
					: '';
				return `  - ${tool.tool_name} (priority: ${tool.priority})${alternatives}
    Rationale: ${tool.rationale}${inputs}`;
			})
			.join('\n');

		return `Step: ${step.step_description}
Recommended Tools:
${tools}
Expected Outcome: ${step.expected_outcome}${
			step.next_step_conditions
				? `\nConditions for next step:\n  - ${step.next_step_conditions.join('\n  - ')}`
				: ''
		}`;
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
			current_step,
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

		// Add recommendation information if present
		if (current_step) {
			content = `${thought}\n\nRecommendation:\n${this.formatRecommendation(current_step)}`;
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

			// Store the current step in thought history
			if (validatedInput.current_step) {
				if (!validatedInput.previous_steps) {
					validatedInput.previous_steps = [];
				}
				validatedInput.previous_steps.push(validatedInput.current_step);
			}

			this.thought_history.push(validatedInput);
		
		// Prevent memory leaks by limiting history size
		if (this.thought_history.length > this.maxHistorySize) {
			this.thought_history = this.thought_history.slice(-this.maxHistorySize);
			console.error(`History trimmed to ${this.maxHistorySize} items`);
		}

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
								next_thought_needed:
									validatedInput.next_thought_needed,
								branches: Object.keys(this.branches),
								thought_history_length: this.thought_history.length,
								available_mcp_tools: validatedInput.available_mcp_tools,
								current_step: validatedInput.current_step,
								previous_steps: validatedInput.previous_steps,
								remaining_steps: validatedInput.remaining_steps,
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

	// Tool execution removed - the MCP client handles tool execution
	// This server only provides tool recommendations
}

// Read configuration from environment variables or command line args
const maxHistorySize = parseInt(process.env.MAX_HISTORY_SIZE || '1000');

const thinkingServer = new ToolAwareSequentialThinkingServer({
	available_tools: [], // TODO: Add tool discovery mechanism
	maxHistorySize,
});

// Expose all available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
	tools: thinkingServer.getAvailableTools(),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	if (request.params.name === 'sequentialthinking_tools') {
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
