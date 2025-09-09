
export interface ToolRecommendation {
	tool_name: string;
	confidence: number;  // 0-1 indicating how confident we are this tool is appropriate
	rationale: string;  // Why this tool is recommended
	priority: number;   // Order in the recommendation sequence
	suggested_inputs?: Record<string, unknown>;  // Optional suggested parameters
	alternatives?: string[];  // Alternative tools that could be used
}

export interface StepRecommendation {
	step_description: string;  // What needs to be done
	recommended_tools: ToolRecommendation[];  // Tools recommended for this step
	expected_outcome: string;  // What to expect from this step
	next_step_conditions?: string[];  // Conditions to consider for the next step
}

export interface ThoughtData {
	available_mcp_tools: string[];  // Array of MCP tool names available for use
	thought: string;
	thought_number: number;
	total_thoughts: number;
	is_revision?: boolean;
	revises_thought?: number;
	branch_from_thought?: number;
	branch_id?: string;
	needs_more_thoughts?: boolean;
	next_thought_needed: boolean;
	
	// Recommendation-related fields
	current_step?: StepRecommendation;  // Current step being considered
	previous_steps?: StepRecommendation[];  // Steps already recommended
	remaining_steps?: string[];  // High-level descriptions of upcoming steps
}

export interface Tool {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>;
}

export interface ServerConfig {
	available_tools: Map<string, Tool>;
}
