import * as v from 'valibot';
import { Tool } from './types.js';

const TOOL_DESCRIPTION = `A detailed tool for dynamic and reflective problem-solving through thoughts.
This tool helps analyze problems through a flexible thinking process that can adapt and evolve.
Each thought can build on, question, or revise previous insights as understanding deepens.

IMPORTANT: This server facilitates sequential thinking with MCP tool coordination. The LLM analyzes available tools and their descriptions to make intelligent recommendations, which are then tracked and organized by this server.

When to use this tool:
- Breaking down complex problems into steps
- Planning and design with room for revision
- Analysis that might need course correction
- Problems where the full scope might not be clear initially
- Problems that require a multi-step solution
- Tasks that need to maintain context over multiple steps
- Situations where irrelevant information needs to be filtered out
- When you need guidance on which tools to use and in what order

Key features:
- You can adjust total_thoughts up or down as you progress
- You can question or revise previous thoughts
- You can add more thoughts even after reaching what seemed like the end
- You can express uncertainty and explore alternative approaches
- Not every thought needs to build linearly - you can branch or backtrack
- Generates a solution hypothesis
- Verifies the hypothesis based on the Chain of Thought steps
- Recommends appropriate tools for each step
- Provides rationale for tool recommendations
- Suggests tool execution order and parameters
- Tracks previous recommendations and remaining steps

Parameters explained:
- available_mcp_tools: Array of MCP tool names that are available for use (e.g., ["mcp-omnisearch", "mcp-turso-cloud"])
- thought: Your current thinking step, which can include:
* Regular analytical steps
* Revisions of previous thoughts
* Questions about previous decisions
* Realizations about needing more analysis
* Changes in approach
* Hypothesis generation
* Hypothesis verification
* Tool recommendations and rationale
- next_thought_needed: True if you need more thinking, even if at what seemed like the end
- thought_number: Current number in sequence (can go beyond initial total if needed)
- total_thoughts: Current estimate of thoughts needed (can be adjusted up/down)
- is_revision: A boolean indicating if this thought revises previous thinking
- revises_thought: If is_revision is true, which thought number is being reconsidered
- branch_from_thought: If branching, which thought number is the branching point
- branch_id: Identifier for the current branch (if any)
- needs_more_thoughts: If reaching end but realizing more thoughts needed
- current_step: Current step recommendation, including:
* step_description: What needs to be done
* recommended_tools: Tools recommended for this step
* expected_outcome: What to expect from this step
* next_step_conditions: Conditions to consider for the next step
- previous_steps: Steps already recommended
- remaining_steps: High-level descriptions of upcoming steps

You should:
1. Start with an initial estimate of needed thoughts, but be ready to adjust
2. Feel free to question or revise previous thoughts
3. Don't hesitate to add more thoughts if needed, even at the "end"
4. Express uncertainty when present
5. Mark thoughts that revise previous thinking or branch into new paths
6. Ignore information that is irrelevant to the current step
7. Generate a solution hypothesis when appropriate
8. Verify the hypothesis based on the Chain of Thought steps
9. Consider available tools that could help with the current step
10. Provide clear rationale for tool recommendations
11. Suggest specific tool parameters when appropriate
12. Consider alternative tools for each step
13. Track progress through the recommended steps
14. Provide a single, ideally correct answer as the final output
15. Only set next_thought_needed to false when truly done and a satisfactory answer is reached`;

export const ToolRecommendationSchema = v.object({
	tool_name: v.pipe(
		v.string(),
		v.description('Name of the tool being recommended')
	),
	confidence: v.pipe(
		v.number(),
		v.minValue(0),
		v.maxValue(1),
		v.description('0-1 indicating confidence in recommendation')
	),
	rationale: v.pipe(
		v.string(),
		v.description('Why this tool is recommended')
	),
	priority: v.pipe(
		v.number(),
		v.description('Order in the recommendation sequence')
	),
	suggested_inputs: v.optional(v.pipe(
		v.record(v.string(), v.unknown()),
		v.description('Optional suggested parameters')
	)),
	alternatives: v.optional(v.pipe(
		v.array(v.string()),
		v.description('Alternative tools that could be used')
	))
});

export const StepRecommendationSchema = v.object({
	step_description: v.pipe(
		v.string(),
		v.description('What needs to be done')
	),
	recommended_tools: v.pipe(
		v.array(ToolRecommendationSchema),
		v.description('Tools recommended for this step')
	),
	expected_outcome: v.pipe(
		v.string(),
		v.description('What to expect from this step')
	),
	next_step_conditions: v.optional(v.pipe(
		v.array(v.string()),
		v.description('Conditions to consider for the next step')
	))
});

export const SequentialThinkingSchema = v.object({
	available_mcp_tools: v.pipe(
		v.array(v.string()),
		v.description('Array of MCP tool names available for use (e.g., ["mcp-omnisearch", "mcp-turso-cloud"])')
	),
	thought: v.pipe(
		v.string(),
		v.description('Your current thinking step')
	),
	next_thought_needed: v.pipe(
		v.boolean(),
		v.description('Whether another thought step is needed')
	),
	thought_number: v.pipe(
		v.number(),
		v.minValue(1),
		v.description('Current thought number')
	),
	total_thoughts: v.pipe(
		v.number(),
		v.minValue(1),
		v.description('Estimated total thoughts needed')
	),
	is_revision: v.optional(v.pipe(
		v.boolean(),
		v.description('Whether this revises previous thinking')
	)),
	revises_thought: v.optional(v.pipe(
		v.number(),
		v.minValue(1),
		v.description('Which thought is being reconsidered')
	)),
	branch_from_thought: v.optional(v.pipe(
		v.number(),
		v.minValue(1),
		v.description('Branching point thought number')
	)),
	branch_id: v.optional(v.pipe(
		v.string(),
		v.description('Branch identifier')
	)),
	needs_more_thoughts: v.optional(v.pipe(
		v.boolean(),
		v.description('If more thoughts are needed')
	)),
	current_step: v.optional(v.pipe(
		StepRecommendationSchema,
		v.description('Current step recommendation')
	)),
	previous_steps: v.optional(v.pipe(
		v.array(StepRecommendationSchema),
		v.description('Steps already recommended')
	)),
	remaining_steps: v.optional(v.pipe(
		v.array(v.string()),
		v.description('High-level descriptions of upcoming steps')
	))
});

export const SEQUENTIAL_THINKING_TOOL: Tool = {
	name: 'sequentialthinking_tools',
	description: TOOL_DESCRIPTION,
	inputSchema: {} // This will be handled by tmcp with the schema above
};