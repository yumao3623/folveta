export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type SessionRow = {
  id: string; access_token_hash: string; title: string; state: string; current_stage: string | null;
  failed_stage: string | null; error_code: string | null; error_message: string | null;
  expires_at: string; created_at: string; updated_at: string;
};
type SourceRow = {
  id: string; session_id: string; display_name: string; kind: "pdf" | "pptx"; mime_type: string;
  size_bytes: number; storage_path: string; file_hash: string | null; status: string; unit_count: number;
  readable_unit_count: number; extracted_character_count: number; warnings: Json;
  error_code: string | null; error_message: string | null; created_at: string; updated_at: string;
};
type UnitRow = {
  id: string; session_id: string; source_id: string; locator_kind: "page" | "slide"; locator_number: number;
  title: string | null; raw_text: string; normalized_text: string; readable: boolean; warnings: Json;
  content_hash: string;
};
type SpanRow = {
  id: string; session_id: string; source_id: string; locator_kind: "page" | "slide"; locator_number: number;
  ordinal: number; text: string; excerpt: string; content_hash: string;
};
type RunRow = {
  id: string; session_id: string; stage: string; status: string; attempt: number; prompt_version: string;
  schema_version: string; provider: string; model: string; usage: Json | null; error_code: string | null;
  error_message: string | null; started_at: string; completed_at: string | null;
};
type GuideRow = {
  id: string; session_id: string; schema_version: string; prompt_version: string; source_checksum: string;
  guide_json: Json; validation_warnings: Json; created_at: string; updated_at: string;
};
type QuickCheckRow = {
  id: string; session_id: string; guide_id: string; guide_checksum: string; schema_version: string;
  prompt_version: string; requested_question_count: number; question_count: number;
  quick_check_json: Json; validation_warnings: Json; created_at: string; updated_at: string;
};
type QuickCheckAttemptRow = {
  id: string; session_id: string; quick_check_id: string; status: "submitted";
  selected_answers: Json; result_json: Json; correct_count: number; scored_count: number;
  submitted_at: string;
};

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      preparation_sessions: Table<SessionRow, {
        id?: string; access_token_hash: string; title?: string; state?: string; current_stage?: string | null;
        failed_stage?: string | null; error_code?: string | null; error_message?: string | null;
        expires_at?: string; created_at?: string; updated_at?: string;
      }>;
      sources: Table<SourceRow, {
        id?: string; session_id: string; display_name: string; kind: "pdf" | "pptx"; mime_type: string;
        size_bytes: number; storage_path: string; file_hash?: string | null; status?: string; unit_count?: number;
        readable_unit_count?: number; extracted_character_count?: number; warnings?: Json;
        error_code?: string | null; error_message?: string | null; created_at?: string; updated_at?: string;
      }>;
      source_units: Table<UnitRow, {
        id?: string; session_id: string; source_id: string; locator_kind: "page" | "slide"; locator_number: number;
        title?: string | null; raw_text: string; normalized_text: string; readable: boolean; warnings?: Json; content_hash: string;
      }>;
      source_spans: Table<SpanRow, {
        id: string; session_id: string; source_id: string; locator_kind: "page" | "slide"; locator_number: number;
        ordinal: number; text: string; excerpt: string; content_hash: string;
      }>;
      generation_runs: Table<RunRow, {
        id?: string; session_id: string; stage: string; status: string; attempt?: number; prompt_version: string;
        schema_version: string; provider: string; model: string; usage?: Json | null; error_code?: string | null;
        error_message?: string | null; started_at?: string; completed_at?: string | null;
      }>;
      study_guides: Table<GuideRow, {
        id: string; session_id: string; schema_version: string; prompt_version: string; source_checksum: string;
        guide_json: Json; validation_warnings?: Json; created_at?: string; updated_at?: string;
      }>;
      quick_checks: Table<QuickCheckRow, {
        id: string; session_id: string; guide_id: string; guide_checksum: string; schema_version: string;
        prompt_version: string; requested_question_count: number; question_count: number;
        quick_check_json: Json; validation_warnings?: Json; created_at?: string; updated_at?: string;
      }>;
      quick_check_attempts: Table<QuickCheckAttemptRow, {
        id: string; session_id: string; quick_check_id: string; status: "submitted";
        selected_answers: Json; result_json: Json; correct_count: number; scored_count: number;
        submitted_at?: string;
      }>;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
