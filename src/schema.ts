import { Tool } from '@modelcontextprotocol/sdk/types.js';

const TOOL_DESCRIPTION = `A detailed tool for dynamic and reflective problem-solving through thoughts.
This tool helps analyze problems through a flexible thinking process that can adapt and evolve.
Each thought can build on, question, or revise previous insights as understanding deepens.

IMPORTANT: When initializing this tool, you must pass all available tools that you want the sequential thinking process to be able to use. The tool will analyze these tools and provide recommendations for their use.

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

export const SEQUENTIAL_THINKING_TOOL: Tool = {
	name: 'sequentialthinking_tools',
	description: TOOL_DESCRIPTION,
	inputSchema: {
		type: 'object',
		properties: {
			thought: {
				type: 'string',
				description: 'Your current thinking step',
			},
			next_thought_needed: {
				type: 'boolean',
				description: 'Whether another thought step is needed',
			},
			thought_number: {
				type: 'integer',
				description: 'Current thought number',
				minimum: 1,
			},
			total_thoughts: {
				type: 'integer',
				description: 'Estimated total thoughts needed',
				minimum: 1,
			},
			is_revision: {
				type: 'boolean',
				description: 'Whether this revises previous thinking',
			},
			revises_thought: {
				type: 'integer',
				description: 'Which thought is being reconsidered',
				minimum: 1,
			},
			branch_from_thought: {
				type: 'integer',
				description: 'Branching point thought number',
				minimum: 1,
			},
			branch_id: {
				type: 'string',
				description: 'Branch identifier',
			},
			needs_more_thoughts: {
				type: 'boolean',
				description: 'If more thoughts are needed',
			},
			current_step: {
				type: 'object',
				description: 'Current step recommendation',
				properties: {
					step_description: {
						type: 'string',
						description: 'What needs to be done'
					},
					recommended_tools: {
						type: 'array',
						description: 'Tools recommended for this step',
						items: {
							type: 'object',
							properties: {
								tool_name: {
									type: 'string',
									description: 'Name of the tool being recommended'
								},
								confidence: {
									type: 'number',
									description: '0-1 indicating confidence in recommendation',
									minimum: 0,
									maximum: 1
								},
								rationale: {
									type: 'string',
									description: 'Why this tool is recommended'
								},
								priority: {
									type: 'number',
									description: 'Order in the recommendation sequence'
								},
								suggested_inputs: {
									type: 'object',
									description: 'Optional suggested parameters'
								},
								alternatives: {
									type: 'array',
									description: 'Alternative tools that could be used',
									items: {
										type: 'string'
									}
								}
							},
							required: ['tool_name', 'confidence', 'rationale', 'priority']
						}
					},
					expected_outcome: {
						type: 'string',
						description: 'What to expect from this step'
					},
					next_step_conditions: {
						type: 'array',
						description: 'Conditions to consider for the next step',
						items: {
							type: 'string'
						}
					}
				},
				required: ['step_description', 'recommended_tools', 'expected_outcome']
			},
			previous_steps: {
				type: 'array',
				description: 'Steps already recommended',
				items: {
					type: 'object',
					properties: {
						step_description: {
							type: 'string',
							description: 'What needs to be done'
						},
						recommended_tools: {
							type: 'array',
							description: 'Tools recommended for this step',
							items: {
								type: 'object',
								properties: {
									tool_name: {
										type: 'string',
										description: 'Name of the tool being recommended'
									},
									confidence: {
										type: 'number',
										description: '0-1 indicating confidence in recommendation',
										minimum: 0,
										maximum: 1
									},
									rationale: {
										type: 'string',
										description: 'Why this tool is recommended'
									},
									priority: {
										type: 'number',
										description: 'Order in the recommendation sequence'
									},
									suggested_inputs: {
										type: 'object',
										description: 'Optional suggested parameters'
									},
									alternatives: {
										type: 'array',
										description: 'Alternative tools that could be used',
										items: {
											type: 'string'
										}
									}
								},
								required: ['tool_name', 'confidence', 'rationale', 'priority']
							}
						},
						expected_outcome: {
							type: 'string',
							description: 'What to expect from this step'
						},
						next_step_conditions: {
							type: 'array',
							description: 'Conditions to consider for the next step',
							items: {
								type: 'string'
							}
						}
					},
					required: ['step_description', 'recommended_tools', 'expected_outcome']
				}
			},
			remaining_steps: {
				type: 'array',
				description: 'High-level descriptions of upcoming steps',
				items: {
					type: 'string'
				}
			}
		},
		required: [
			'thought',
			'next_thought_needed',
			'thought_number',
			'total_thoughts',
		],
	},
};
