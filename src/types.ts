export type tool_reference =
	| string
	| {
			name: string;
			description?: string;
	  };

export interface tool_recommendation {
	tool_name: string;
	confidence?: number;
	rationale?: string;
	priority?: number;
	suggested_inputs?: Record<string, unknown>;
	alternatives?: string[];
}

export interface thought_input {
	session_id?: string;
	thought: string;
	thought_number: number;
	total_thoughts: number;
	next_thought_needed: boolean;
	is_revision?: boolean;
	revises_thought?: number;
	branch_from_thought?: number;
	branch_id?: string;
	needs_more_thoughts?: boolean;
	available_tools?: tool_reference[];
	recommended_tools?: tool_recommendation[];
	remaining_steps?: string[];
}

export interface thought_record extends thought_input {
	session_id: string;
	created_at: string;
}

export interface validation_issue {
	field: string;
	message: string;
}

export interface security_warning {
	field: string;
	pattern: string;
}

export interface thought_result {
	session_id: string;
	thought_number: number;
	total_thoughts: number;
	next_thought_needed: boolean;
	needs_more_thoughts?: boolean;
	branches: string[];
	history_length: number;
	invalid_recommendations?: validation_issue[];
	security_warnings?: security_warning[];
	recommended_tools?: tool_recommendation[];
	remaining_steps?: string[];
}
