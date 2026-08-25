import { describe, expect, it } from 'vitest';
import { create_mcp_server } from './mcp-server.js';

const modern_meta = {
	'io.modelcontextprotocol/protocolVersion': '2026-07-28',
	'io.modelcontextprotocol/clientCapabilities': {},
	'io.modelcontextprotocol/clientInfo': {
		name: 'protocol-test',
		version: '1.0.0',
	},
};

function create_server() {
	return create_mcp_server({
		name: 'mcp-sequentialthinking-tools',
		version: 'test',
		description: 'test server',
	});
}

function request(
	server: ReturnType<typeof create_mcp_server>,
	id: number,
	method: string,
	params: Record<string, unknown> = {},
) {
	return server.receive({
		jsonrpc: '2.0',
		id,
		method,
		params: {
			...params,
			_meta: modern_meta,
		},
	});
}

describe('MCP 2026-07-28 protocol', () => {
	it('supports stateless discovery and capability listing', async () => {
		const server = create_server();

		const discovery = await request(server, 1, 'server/discover');
		expect(discovery).toMatchObject({
			jsonrpc: '2.0',
			id: 1,
			result: {
				supportedVersions: ['2026-07-28'],
				capabilities: { tools: {}, prompts: {} },
				resultType: 'complete',
				_meta: {
					'io.modelcontextprotocol/serverInfo': {
						name: 'mcp-sequentialthinking-tools',
					},
				},
			},
		});

		const tools = await request(server, 2, 'tools/list');
		expect(tools).toMatchObject({
			jsonrpc: '2.0',
			id: 2,
			result: { tools: expect.any(Array) },
		});
		expect(
			(
				tools as { result: { tools: Array<{ name: string }> } }
			).result.tools.map((tool) => tool.name),
		).toEqual(
			expect.arrayContaining([
				'sequentialthinking_tools',
				'get_thinking_history',
				'clear_thinking_history',
			]),
		);

		const prompts = await request(server, 3, 'prompts/list');
		expect(prompts).toMatchObject({
			jsonrpc: '2.0',
			id: 3,
			result: {
				prompts: [
					expect.objectContaining({
						name: 'sequential-thinking-guidance',
					}),
				],
			},
		});
	});

	it('supports stateless tool calls and modern errors', async () => {
		const server = create_server();

		const called = await request(server, 4, 'tools/call', {
			name: 'sequentialthinking_tools',
			arguments: {
				thought: 'Test modern protocol',
				thought_number: 1,
				total_thoughts: 1,
				next_thought_needed: false,
			},
		});
		expect(called).toMatchObject({
			jsonrpc: '2.0',
			id: 4,
			result: {
				isError: false,
				resultType: 'complete',
				content: [expect.objectContaining({ type: 'text' })],
			},
		});

		const missing_tool = await request(server, 5, 'tools/call', {
			name: 'not_a_tool',
			arguments: {},
		});
		expect(missing_tool).toMatchObject({
			jsonrpc: '2.0',
			id: 5,
			result: {
				isError: true,
				resultType: 'complete',
				content: [
					expect.objectContaining({
						type: 'text',
						text: 'Tool not_a_tool not found',
					}),
				],
			},
		});

		const unsupported_version = await server.receive({
			jsonrpc: '2.0',
			id: 6,
			method: 'tools/list',
			params: {
				_meta: {
					...modern_meta,
					'io.modelcontextprotocol/protocolVersion': '2099-01-01',
				},
			},
		});
		expect(unsupported_version).toMatchObject({
			jsonrpc: '2.0',
			id: 6,
			error: { code: -32022 },
		});
	});
});
