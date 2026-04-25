import { sanitize_record, scan_record } from './security.js';
import type {
	thought_input,
	thought_record,
	thought_result,
	tool_reference,
	validation_issue,
} from './types.js';

const DEFAULT_SESSION = 'default';

export interface thinking_store_options {
	max_history_size?: number;
}

export class thinking_store {
	readonly max_history_size: number;
	private readonly sessions = new Map<string, thought_record[]>();

	constructor(options: thinking_store_options = {}) {
		this.max_history_size = sanitize_limit(
			options.max_history_size,
			1000,
		);
	}

	add(input: thought_input): thought_result {
		const session_id = normalize_session(input.session_id);
		const total_thoughts = Math.max(
			input.total_thoughts,
			input.thought_number,
		);
		const raw_record: thought_record = {
			...input,
			session_id,
			total_thoughts,
			created_at: new Date().toISOString(),
		};
		const security_warnings = scan_record(raw_record);
		const record = sanitize_record(raw_record);

		const invalid_recommendations = validate_recommendations(record);
		if (invalid_recommendations.length > 0) {
			return {
				session_id,
				thought_number: record.thought_number,
				total_thoughts,
				next_thought_needed: record.next_thought_needed,
				needs_more_thoughts: record.needs_more_thoughts,
				branches: this.branches(session_id),
				history_length: this.history(session_id).length,
				invalid_recommendations,
				security_warnings: security_warnings.length
					? security_warnings
					: undefined,
				recommended_tools: record.recommended_tools,
				remaining_steps: record.remaining_steps,
			};
		}

		const history = this.history(session_id);
		history.push(record);
		if (history.length > this.max_history_size) {
			history.splice(0, history.length - this.max_history_size);
		}
		this.sessions.set(session_id, history);

		return {
			session_id,
			thought_number: record.thought_number,
			total_thoughts,
			next_thought_needed: record.next_thought_needed,
			needs_more_thoughts: record.needs_more_thoughts,
			branches: this.branches(session_id),
			history_length: history.length,
			security_warnings: security_warnings.length
				? security_warnings
				: undefined,
			recommended_tools: record.recommended_tools,
			remaining_steps: record.remaining_steps,
		};
	}

	get_history(
		input: {
			session_id?: string;
			branch_id?: string;
			limit?: number;
		} = {},
	) {
		const session_id = normalize_session(input.session_id);
		const limit = sanitize_limit(input.limit, 50);
		let records = [...this.history(session_id)];
		if (input.branch_id) {
			records = records.filter(
				(record) => record.branch_id === input.branch_id,
			);
		}
		return {
			session_id,
			branches: this.branches(session_id),
			history_length: this.history(session_id).length,
			thoughts: records.slice(-limit),
		};
	}

	clear(input: { session_id?: string; all_sessions?: boolean } = {}) {
		if (input.all_sessions) {
			const cleared_sessions = this.sessions.size;
			const cleared_thoughts = [...this.sessions.values()].reduce(
				(total, records) => total + records.length,
				0,
			);
			this.sessions.clear();
			return { cleared_sessions, cleared_thoughts };
		}

		const session_id = normalize_session(input.session_id);
		const cleared_thoughts = this.history(session_id).length;
		this.sessions.delete(session_id);
		return { session_id, cleared_sessions: 1, cleared_thoughts };
	}

	private history(session_id: string): thought_record[] {
		return this.sessions.get(session_id) ?? [];
	}

	private branches(session_id: string): string[] {
		return [
			...new Set(
				this.history(session_id)
					.map((record) => record.branch_id)
					.filter((branch_id): branch_id is string =>
						Boolean(branch_id),
					),
			),
		];
	}
}

function validate_recommendations(
	input: thought_record,
): validation_issue[] {
	if (
		!input.recommended_tools?.length ||
		!input.available_tools?.length
	) {
		return [];
	}

	const available = new Set(input.available_tools.map(tool_name));
	const issues: validation_issue[] = [];
	input.recommended_tools.forEach((recommendation, index) => {
		if (!available.has(recommendation.tool_name)) {
			issues.push({
				field: `recommended_tools.${index}.tool_name`,
				message: `Unknown tool "${recommendation.tool_name}". Supply it in available_tools or remove the recommendation.`,
			});
		}
		recommendation.alternatives?.forEach((alternative, alt_index) => {
			if (!available.has(alternative)) {
				issues.push({
					field: `recommended_tools.${index}.alternatives.${alt_index}`,
					message: `Unknown alternative tool "${alternative}".`,
				});
			}
		});
	});
	return issues;
}

function tool_name(tool: tool_reference): string {
	return typeof tool === 'string' ? tool : tool.name;
}

function normalize_session(session_id: string | undefined): string {
	const trimmed = session_id?.trim();
	return trimmed ? trimmed : DEFAULT_SESSION;
}

function sanitize_limit(
	value: number | undefined,
	fallback: number,
): number {
	if (!Number.isFinite(value) || value === undefined) {
		return fallback;
	}
	return Math.max(1, Math.floor(value));
}
