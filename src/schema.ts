import * as v from 'valibot';

export const tool_reference_schema = v.union([
	v.pipe(v.string(), v.description('Tool name')),
	v.object({
		name: v.pipe(v.string(), v.description('Tool name')),
		description: v.optional(
			v.pipe(v.string(), v.description('Brief tool description')),
		),
	}),
]);

export const tool_recommendation_schema = v.object({
	tool_name: v.pipe(
		v.string(),
		v.description('Name of the tool being recommended'),
	),
	confidence: v.optional(
		v.pipe(
			v.number(),
			v.minValue(0),
			v.maxValue(1),
			v.description('Optional 0-1 confidence score'),
		),
	),
	rationale: v.optional(
		v.pipe(v.string(), v.description('Why this tool may help')),
	),
	priority: v.optional(
		v.pipe(
			v.number(),
			v.minValue(1),
			v.description('Optional execution order hint'),
		),
	),
	suggested_inputs: v.optional(
		v.pipe(
			v.record(v.string(), v.unknown()),
			v.description('Optional suggested tool arguments'),
		),
	),
	alternatives: v.optional(
		v.pipe(
			v.array(v.string()),
			v.description('Alternative tool names'),
		),
	),
});

export const sequential_thinking_schema = v.object({
	session_id: v.optional(
		v.pipe(
			v.string(),
			v.description(
				'Optional history bucket. Defaults to "default".',
			),
		),
	),
	thought: v.pipe(v.string(), v.description('Current thinking step')),
	thought_number: v.pipe(
		v.number(),
		v.minValue(1),
		v.description('Current thought number'),
	),
	total_thoughts: v.pipe(
		v.number(),
		v.minValue(1),
		v.description('Current estimate of total thoughts needed'),
	),
	next_thought_needed: v.pipe(
		v.boolean(),
		v.description('Whether another thought is needed'),
	),
	is_revision: v.optional(
		v.pipe(
			v.boolean(),
			v.description('Whether this revises a thought'),
		),
	),
	revises_thought: v.optional(
		v.pipe(
			v.number(),
			v.minValue(1),
			v.description('Thought revised'),
		),
	),
	branch_from_thought: v.optional(
		v.pipe(
			v.number(),
			v.minValue(1),
			v.description('Thought number this branch starts from'),
		),
	),
	branch_id: v.optional(
		v.pipe(v.string(), v.description('Branch identifier')),
	),
	needs_more_thoughts: v.optional(
		v.pipe(
			v.boolean(),
			v.description('Set when the estimate was too low'),
		),
	),
	available_tools: v.optional(
		v.pipe(
			v.array(tool_reference_schema),
			v.description(
				'Optional tool names/descriptions used only to validate recommendations',
			),
		),
	),
	recommended_tools: v.optional(
		v.pipe(
			v.array(tool_recommendation_schema),
			v.description(
				'Optional tool plan authored by the model; validated if available_tools is supplied',
			),
		),
	),
	remaining_steps: v.optional(
		v.pipe(
			v.array(v.string()),
			v.description('Optional high-level remaining steps'),
		),
	),
});

export const get_history_schema = v.object({
	session_id: v.optional(
		v.pipe(v.string(), v.description('History bucket to inspect')),
	),
	branch_id: v.optional(
		v.pipe(v.string(), v.description('Optional branch filter')),
	),
	limit: v.optional(
		v.pipe(
			v.number(),
			v.minValue(1),
			v.maxValue(500),
			v.description('Maximum records to return; default 50'),
		),
	),
});

export const clear_history_schema = v.object({
	session_id: v.optional(
		v.pipe(v.string(), v.description('History bucket to clear')),
	),
	all_sessions: v.optional(
		v.pipe(v.boolean(), v.description('Clear every history bucket')),
	),
});

export const guidance_prompt_schema = v.object({
	problem: v.optional(
		v.pipe(
			v.string(),
			v.description('Optional problem to think through'),
		),
	),
});
