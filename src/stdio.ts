import process from 'node:process';
import type { Context, McpServer } from 'tmcp';

type wire_mode = 'headers' | 'lines';

type json_rpc_message = Record<string, unknown>;
type receive_message = Parameters<McpServer<any, any>['receive']>[0];

export class compatible_stdio_transport<
	t_custom extends Record<string, unknown> | undefined = undefined,
> {
	private buffer = Buffer.alloc(0);
	private readonly cleaners = new Set<() => void>();
	private mode: wire_mode = 'headers';
	private readonly session_info: NonNullable<
		Context<t_custom>['sessionInfo']
	> = {};
	private readonly subscriptions: Record<string, string[]> = {
		resource: [],
	};

	constructor(private readonly server: McpServer<any, t_custom>) {
		this.cleaners.add(
			this.server.on(
				'initialize',
				({ capabilities, clientInfo: client_info }) => {
					this.session_info.clientCapabilities = capabilities;
					this.session_info.clientInfo = client_info;
				},
			),
		);
		this.cleaners.add(
			this.server.on('send', ({ request }) => {
				this.write(request as unknown as json_rpc_message);
			}),
		);
		this.cleaners.add(
			this.server.on('broadcast', ({ request }) => {
				if (
					request.method === 'notifications/resources/updated' &&
					!this.subscriptions.resource.includes(request.params.uri)
				) {
					return;
				}
				this.write(request as unknown as json_rpc_message);
			}),
		);
		this.cleaners.add(
			this.server.on('loglevelchange', ({ level }) => {
				this.session_info.logLevel = level;
			}),
		);
		this.cleaners.add(
			this.server.on('subscription', ({ uri, action }) => {
				if (action === 'remove') {
					this.subscriptions.resource =
						this.subscriptions.resource.filter(
							(item) => item !== uri,
						);
				} else if (!this.subscriptions.resource.includes(uri)) {
					this.subscriptions.resource.push(uri);
				}
			}),
		);
	}

	listen(custom?: t_custom): void {
		process.stdin.on('data', (chunk: Buffer | string) => {
			this.buffer = Buffer.concat([
				this.buffer,
				Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk),
			]);
			void this.drain(custom);
		});

		process.stdin.on('end', () => this.close());
		process.on('SIGINT', () => this.close());
		process.on('SIGTERM', () => this.close());
	}

	private async drain(custom?: t_custom): Promise<void> {
		while (this.buffer.length > 0) {
			const framed = this.read_headers_message();
			if (framed === null) {
				const lined = this.read_line_message();
				if (lined === null) {
					return;
				}
				this.mode = 'lines';
				await this.handle(lined, custom);
				continue;
			}
			if (framed === undefined) {
				return;
			}
			this.mode = 'headers';
			await this.handle(framed, custom);
		}
	}

	private read_headers_message():
		| json_rpc_message
		| null
		| undefined {
		const header_end = this.buffer.indexOf('\r\n\r\n');
		if (header_end === -1) {
			return this.buffer.includes(0x0a) ? null : undefined;
		}

		const header = this.buffer
			.subarray(0, header_end)
			.toString('utf8');
		const content_length = header
			.split('\r\n')
			.map((line) => line.match(/^content-length:\s*(\d+)$/i)?.[1])
			.find(Boolean);
		if (!content_length) {
			return null;
		}

		const length = Number(content_length);
		const body_start = header_end + 4;
		const body_end = body_start + length;
		if (this.buffer.length < body_end) {
			return undefined;
		}

		const body = this.buffer
			.subarray(body_start, body_end)
			.toString('utf8');
		this.buffer = this.buffer.subarray(body_end);
		return JSON.parse(body) as json_rpc_message;
	}

	private read_line_message(): json_rpc_message | null {
		const line_end = this.buffer.indexOf('\n');
		if (line_end === -1) {
			return null;
		}
		const raw = this.buffer
			.subarray(0, line_end)
			.toString('utf8')
			.trim();
		this.buffer = this.buffer.subarray(line_end + 1);
		if (!raw) {
			return null;
		}
		return JSON.parse(raw) as json_rpc_message;
	}

	private async handle(
		message: json_rpc_message,
		custom?: t_custom,
	): Promise<void> {
		try {
			const response = await this.server.receive(
				message as receive_message,
				{
					custom,
					sessionInfo: this.session_info,
				},
			);
			if (response) {
				this.write(response as json_rpc_message);
			}
		} catch (error) {
			this.write({
				jsonrpc: '2.0',
				id:
					typeof message.id === 'number' ||
					typeof message.id === 'string'
						? message.id
						: null,
				error: {
					code: -32603,
					message:
						error instanceof Error ? error.message : String(error),
				},
			});
		}
	}

	private write(message: json_rpc_message): void {
		const body = JSON.stringify(message);
		if (this.mode === 'lines') {
			process.stdout.write(`${body}\n`);
			return;
		}
		process.stdout.write(
			`Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`,
		);
	}

	private close(): void {
		for (const cleaner of this.cleaners) {
			cleaner();
		}
		process.exit(0);
	}
}
