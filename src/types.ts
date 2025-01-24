import { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface ToolSelection {
	tool_name: string;
	confidence: number;  // 0-1 indicating how confident we are this tool is appropriate
	rationale: string;  // Why this tool was selected
	priority: number;   // Order of execution when multiple tools are selected
}

export interface ToolUsage {
	tool_name: string;
	inputs: Record<string, unknown>;
	status: 'pending' | 'success' | 'error';
	results?: unknown;
	error?: string;
	execution_time?: number;
}

export interface ThoughtData {
	thought: string;
	thought_number: number;
	total_thoughts: number;
	is_revision?: boolean;
	revises_thought?: number;
	branch_from_thought?: number;
	branch_id?: string;
	needs_more_thoughts?: boolean;
	next_thought_needed: boolean;
	
	// Tool-related fields
	tools_considered?: ToolSelection[];  // Tools evaluated for this thought
	selected_tools?: string[];           // Names of tools chosen for execution
	tool_executions?: ToolUsage[];       // Results of tool executions
	tool_outputs?: string[];            // Processed/summarized tool results
}

export interface ServerConfig {
	available_tools: Map<string, Tool>;
}
