#!/usr/bin/env node

import { StdioTransport } from '@tmcp/transport-stdio';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { create_mcp_server } from './mcp-server.js';
import type { thought_result } from './types.js';

const module_directory = dirname(fileURLToPath(import.meta.url));
const package_info = JSON.parse(
	readFileSync(join(module_directory, '..', 'package.json'), 'utf-8'),
) as { name: string; version: string; description?: string };

const server = create_mcp_server({
	name: package_info.name,
	version: package_info.version,
	description:
		package_info.description ??
		'Sequential thinking scratchpad and optional tool-plan validator.',
});

new StdioTransport(server).listen();

export type sequential_thinking_result = thought_result;
