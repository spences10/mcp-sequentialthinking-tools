import type * as v from 'valibot';
import type {
	sequential_thinking_schema,
	tool_recommendation_schema,
	tool_reference_schema,
} from './schema.js';

export type ToolReference = v.InferInput<
	typeof tool_reference_schema
>;

export type ToolRecommendation = v.InferInput<
	typeof tool_recommendation_schema
>;

export type ThoughtInput = v.InferInput<
	typeof sequential_thinking_schema
>;

export type ThoughtRecord = ThoughtInput & {
	session_id: string;
	created_at: string;
};

export interface ValidationIssue {
	field: string;
	message: string;
}

export interface SecurityWarning {
	field: string;
	pattern: string;
}

export interface ThoughtResult {
	session_id: string;
	thought_number: number;
	total_thoughts: number;
	next_thought_needed: boolean;
	needs_more_thoughts?: boolean;
	branches: string[];
	history_length: number;
	invalid_recommendations?: ValidationIssue[];
	security_warnings?: SecurityWarning[];
	recommended_tools?: ToolRecommendation[];
	remaining_steps?: string[];
}
