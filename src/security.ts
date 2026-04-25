import type {
	security_warning,
	thought_record,
	tool_recommendation,
	tool_reference,
} from './types.js';

const injection_patterns: Array<{ name: string; pattern: RegExp }> = [
	{
		name: 'ignore-instructions',
		pattern:
			/\bignore\s+(all\s+)?(previous|prior|above|system|developer)\s+instructions?\b/i,
	},
	{
		name: 'override-role',
		pattern:
			/\b(system|developer)\s+(prompt|message|instruction)s?\b/i,
	},
	{
		name: 'secret-exfiltration',
		pattern:
			/\b(reveal|print|dump|exfiltrate|leak|show)\s+(the\s+)?(secret|secrets|token|tokens|api\s*key|password|credentials?)\b/i,
	},
	{
		name: 'tool-coercion',
		pattern:
			/\b(call|use|run|execute)\s+[^\n]{0,80}\b(tool|bash|shell|curl|wget)\b/i,
	},
	{
		name: 'hidden-instruction',
		pattern: /\bdo\s+not\s+(tell|mention|disclose|reveal)\b/i,
	},
];

const redaction = '[redacted: possible prompt-injection text]';

export function scan_text(
	field: string,
	value: string | undefined,
): security_warning[] {
	if (!value) {
		return [];
	}
	return injection_patterns
		.filter(({ pattern }) => pattern.test(value))
		.map(({ name }) => ({ field, pattern: name }));
}

export function sanitize_text(value: string): string {
	return injection_patterns.reduce(
		(sanitized, { pattern }) => sanitized.replace(pattern, redaction),
		value,
	);
}

export function scan_record(
	record: thought_record,
): security_warning[] {
	return [
		...scan_text('thought', record.thought),
		...(record.remaining_steps ?? []).flatMap((step, index) =>
			scan_text(`remaining_steps.${index}`, step),
		),
		...(record.available_tools ?? []).flatMap((tool, index) =>
			scan_tool_reference(tool, `available_tools.${index}`),
		),
		...(record.recommended_tools ?? []).flatMap((tool, index) =>
			scan_tool_recommendation(tool, `recommended_tools.${index}`),
		),
	];
}

export function sanitize_record(
	record: thought_record,
): thought_record {
	return {
		...record,
		thought: sanitize_text(record.thought),
		available_tools: record.available_tools?.map(
			sanitize_tool_reference,
		),
		recommended_tools: record.recommended_tools?.map(
			sanitize_tool_recommendation,
		),
		remaining_steps: record.remaining_steps?.map(sanitize_text),
	};
}

function scan_tool_reference(
	tool: tool_reference,
	field: string,
): security_warning[] {
	if (typeof tool === 'string') {
		return scan_text(field, tool);
	}
	return [
		...scan_text(`${field}.name`, tool.name),
		...scan_text(`${field}.description`, tool.description),
	];
}

function scan_tool_recommendation(
	tool: tool_recommendation,
	field: string,
): security_warning[] {
	return [
		...scan_text(`${field}.tool_name`, tool.tool_name),
		...scan_text(`${field}.rationale`, tool.rationale),
		...(tool.alternatives ?? []).flatMap((alternative, index) =>
			scan_text(`${field}.alternatives.${index}`, alternative),
		),
	];
}

function sanitize_tool_reference(
	tool: tool_reference,
): tool_reference {
	if (typeof tool === 'string') {
		return sanitize_text(tool);
	}
	return {
		...tool,
		name: sanitize_text(tool.name),
		description: tool.description
			? sanitize_text(tool.description)
			: undefined,
	};
}

function sanitize_tool_recommendation(
	tool: tool_recommendation,
): tool_recommendation {
	return {
		...tool,
		tool_name: sanitize_text(tool.tool_name),
		rationale: tool.rationale
			? sanitize_text(tool.rationale)
			: undefined,
		alternatives: tool.alternatives?.map(sanitize_text),
	};
}
