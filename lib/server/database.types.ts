export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type SessionRow = {
  id: string; access_token_hash: string | null; owner_user_id: string | null; title: string; state: string; current_stage: string | null;
  failed_stage: string | null; error_code: string | null; error_message: string | null;
  generation_checkpoint: Json | null;
  generation_lease_id: string | null; generation_lease_expires_at: string | null;
  current_generation_run_id: string | null;
  expires_at: string | null; claimed_at: string | null; last_accessed_at: string; archived_at: string | null;
  deleted_at: string | null; purge_after: string | null; created_at: string; updated_at: string;
};
type SourceRow = {
  id: string; session_id: string; display_name: string; kind: "pdf" | "ppt" | "pptx" | "doc" | "docx" | "xls" | "xlsx" | "image"; mime_type: string;
  size_bytes: number; storage_path: string; file_hash: string | null; status: string; unit_count: number;
  readable_unit_count: number; extracted_character_count: number; warnings: Json;
  error_code: string | null; error_message: string | null; created_at: string; updated_at: string;
};
type UnitRow = {
  id: string; session_id: string; source_id: string; locator_kind: "page" | "slide" | "paragraph" | "sheet" | "image" | "file"; locator_number: number;
  title: string | null; raw_text: string; normalized_text: string; readable: boolean; warnings: Json;
  content_hash: string;
};
type SpanRow = {
  id: string; session_id: string; source_id: string; locator_kind: "page" | "slide" | "paragraph" | "sheet" | "image" | "file"; locator_number: number;
  ordinal: number; text: string; excerpt: string; content_hash: string;
};
type RunRow = {
  id: string; session_id: string; stage: string; status: string; attempt: number; prompt_version: string;
  schema_version: string; provider: string; model: string; usage: Json | null; error_code: string | null;
  error_message: string | null; started_at: string; completed_at: string | null;
  generation_execution_id: string | null; operation_id: string | null;
  queue_duration_ms: number | null; slot_wait_duration_ms: number | null; provider_duration_ms: number | null;
  database_commit_duration_ms: number | null; total_duration_ms: number | null; retry_reason: string | null;
  provider_status: number | null; provider_request_id: string | null; deadline_exceeded: boolean;
};
type GuideRow = {
  id: string; session_id: string; schema_version: string; prompt_version: string; source_checksum: string;
  title: string; guide_json: Json; validation_warnings: Json; last_accessed_at: string;
  archived_at: string | null; deleted_at: string | null; created_at: string; updated_at: string;
};
type GenerationV2RequestRow = {
  id: string; session_id: string; source_snapshot_hash: string; generation_contract_hash: string;
  output_language: "match_materials" | "en" | "zh"; request_content_key: string; manifest_json: Json;
  status: "queued" | "working" | "complete" | "complete_with_gaps" | "failed_no_guide";
  last_progress_at: string; completed_at: string | null; created_at: string; updated_at: string;
};
type GenerationV2GuideRow = {
  id: string; request_id: string; session_id: string; source_snapshot_hash: string; generation_contract_hash: string;
  delivery_status: "complete" | "complete_with_gaps"; guide_json: Json; created_at: string; updated_at: string;
};
type GenerationV2ArtifactRow = {
  id: string; session_id: string; source_snapshot_hash: string; generation_contract_hash: string;
  output_language: "match_materials" | "en" | "zh"; artifact_kind: "guide" | "section" | "synthesis";
  partition_key: string; artifact_content_key: string; span_identity_json: Json;
  status: "pending" | "working" | "retry_wait" | "complete" | "gap"; result_json: Json | null; result_hash: string | null;
  gap_code: string | null; gap_message: string | null; retryable: boolean; attempt_count: number;
  lease_id: string | null; lease_expires_at: string | null; completed_at: string | null; created_at: string; updated_at: string;
};
type GenerationV2RequestArtifactRow = {
  request_id: string; artifact_id: string; session_id: string; partition_key: string; partition_order: number; required: boolean; created_at: string;
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
type BillingCustomerRow = {
  id: string; billing_environment: "sandbox" | "live" | null; user_id: string; paddle_customer_id: string; email: string | null; created_at: string; updated_at: string;
};
type BillingSubscriptionRow = {
  id: string; billing_environment: "sandbox" | "live" | null; paddle_subscription_id: string; user_id: string | null; paddle_customer_id: string; product_id: string; price_id: string;
  status: string; current_period_start: string | null; current_period_end: string | null; scheduled_change: Json | null;
  cancel_at_period_end: boolean; next_billed_at: string | null; last_event_occurred_at: string | null; raw_data: Json;
  created_at: string; updated_at: string;
};
type BillingUsagePeriodRow = {
  id: string; billing_environment: "sandbox" | "live" | null; user_id: string; period_start: string; period_end: string; plan: "free" | "pro"; quota: number; consumed: number; reserved: number;
  created_at: string; updated_at: string;
};
type BillingGenerationReservationRow = {
  generation_run_id: string; billing_environment: "sandbox" | "live" | null; user_id: string; period_start: string; status: "reserved" | "consumed" | "released"; created_at: string; updated_at: string;
};
type BillingWebhookEventRow = {
  id: string; billing_environment: "sandbox" | "live" | null; event_id: string; event_type: string; occurred_at: string | null; received_at: string; processed_at: string | null; status: "processed" | "ignored" | "failed";
};
type RateLimitWindowRow = {
  scope: string; key_hash: string; window_started_at: string; attempt_count: number;
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
        id?: string; access_token_hash?: string | null; owner_user_id?: string | null; title?: string; state?: string; current_stage?: string | null;
        failed_stage?: string | null; error_code?: string | null; error_message?: string | null;
        generation_checkpoint?: Json | null;
        generation_lease_id?: string | null; generation_lease_expires_at?: string | null;
        current_generation_run_id?: string | null;
        expires_at?: string | null; claimed_at?: string | null; last_accessed_at?: string; archived_at?: string | null;
        deleted_at?: string | null; purge_after?: string | null; created_at?: string; updated_at?: string;
      }>;
      sources: Table<SourceRow, {
        id?: string; session_id: string; display_name: string; kind: "pdf" | "ppt" | "pptx" | "doc" | "docx" | "xls" | "xlsx" | "image"; mime_type: string;
        size_bytes: number; storage_path: string; file_hash?: string | null; status?: string; unit_count?: number;
        readable_unit_count?: number; extracted_character_count?: number; warnings?: Json;
        error_code?: string | null; error_message?: string | null; created_at?: string; updated_at?: string;
      }>;
      source_units: Table<UnitRow, {
        id?: string; session_id: string; source_id: string; locator_kind: "page" | "slide" | "paragraph" | "sheet" | "image" | "file"; locator_number: number;
        title?: string | null; raw_text: string; normalized_text: string; readable: boolean; warnings?: Json; content_hash: string;
      }>;
      source_spans: Table<SpanRow, {
        id: string; session_id: string; source_id: string; locator_kind: "page" | "slide" | "paragraph" | "sheet" | "image" | "file"; locator_number: number;
        ordinal: number; text: string; excerpt: string; content_hash: string;
      }>;
      generation_runs: Table<RunRow, {
        id?: string; session_id: string; stage: string; status: string; attempt?: number; prompt_version: string;
        schema_version: string; provider: string; model: string; usage?: Json | null; error_code?: string | null;
        error_message?: string | null; started_at?: string; completed_at?: string | null;
        generation_execution_id?: string | null; operation_id?: string | null;
        queue_duration_ms?: number | null; slot_wait_duration_ms?: number | null; provider_duration_ms?: number | null;
        database_commit_duration_ms?: number | null; total_duration_ms?: number | null; retry_reason?: string | null;
        provider_status?: number | null; provider_request_id?: string | null; deadline_exceeded?: boolean;
      }>;
      generation_executions: Table<{
        id: string; session_id: string; status: string; public_stage: string; source_snapshot_hash: string;
        execution_contract_hash: string; dispatch_state: string; dispatch_token: string | null; support_id: string;
        billing_environment: "sandbox" | "live" | null;
      }, {
        id?: string; session_id: string; status?: string; public_stage?: string; source_snapshot_hash: string;
        execution_contract_hash: string; dispatch_state?: string; dispatch_token?: string | null; support_id?: string;
        billing_environment?: "sandbox" | "live" | null;
      }>;
      generation_operations: Table<{
        id: string; generation_run_id: string; operation_key: string; operation_kind: string;
        status: string; operation_input_hash: string; input_json: Json; result_json: Json | null; result_hash: string | null;
      }, {
        id?: string; generation_run_id: string; operation_key: string; operation_kind: string; operation_version: string;
        status?: string; operation_input_hash: string; input_json: Json; dependency_operation_ids?: string[]; dependency_result_hashes?: string[];
      }>;
      generation_workflow_instances: Table<{
        id: string; generation_run_id: string; workflow_run_id: string; status: string; support_id: string;
      }, {
        id?: string; generation_run_id: string; workflow_run_id: string; workflow_contract_version: string; status: string;
      }>;
      study_guides: Table<GuideRow, {
        id: string; session_id: string; schema_version: string; prompt_version: string; source_checksum: string;
        title?: string; guide_json: Json; validation_warnings?: Json; last_accessed_at?: string;
        archived_at?: string | null; deleted_at?: string | null; created_at?: string; updated_at?: string;
      }>;
      generation_v2_requests: Table<GenerationV2RequestRow, {
        id?: string; session_id: string; source_snapshot_hash: string; generation_contract_hash: string;
        output_language: "match_materials" | "en" | "zh"; request_content_key: string; manifest_json: Json;
        status?: "queued" | "working" | "complete" | "complete_with_gaps" | "failed_no_guide";
        last_progress_at?: string; completed_at?: string | null; created_at?: string; updated_at?: string;
      }>;
      generation_v2_guides: Table<GenerationV2GuideRow, {
        id?: string; request_id: string; session_id: string; source_snapshot_hash: string; generation_contract_hash: string;
        delivery_status: "complete" | "complete_with_gaps"; guide_json: Json; created_at?: string; updated_at?: string;
      }>;
      generation_v2_artifacts: Table<GenerationV2ArtifactRow, {
        id?: string; session_id: string; source_snapshot_hash: string; generation_contract_hash: string;
        output_language: "match_materials" | "en" | "zh"; artifact_kind: "guide" | "section" | "synthesis";
        partition_key: string; artifact_content_key: string; span_identity_json: Json;
        status?: "pending" | "working" | "retry_wait" | "complete" | "gap"; result_json?: Json | null; result_hash?: string | null;
        gap_code?: string | null; gap_message?: string | null; retryable?: boolean; attempt_count?: number;
        lease_id?: string | null; lease_expires_at?: string | null; completed_at?: string | null; created_at?: string; updated_at?: string;
      }>;
      generation_v2_request_artifacts: Table<GenerationV2RequestArtifactRow, {
        request_id: string; artifact_id: string; session_id: string; partition_key: string; partition_order: number; required?: boolean; created_at?: string;
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
      billing_customers: Table<BillingCustomerRow, {
        id?: string; billing_environment?: "sandbox" | "live" | null; user_id: string; paddle_customer_id: string; email?: string | null; created_at?: string; updated_at?: string;
      }>;
      billing_subscriptions: Table<BillingSubscriptionRow, {
        id?: string; billing_environment?: "sandbox" | "live" | null; paddle_subscription_id: string; user_id?: string | null; paddle_customer_id: string; product_id: string; price_id: string;
        status: string; current_period_start?: string | null; current_period_end?: string | null; scheduled_change?: Json | null;
        cancel_at_period_end?: boolean; next_billed_at?: string | null; last_event_occurred_at?: string | null; raw_data?: Json;
        created_at?: string; updated_at?: string;
      }>;
      billing_usage_periods: Table<BillingUsagePeriodRow, {
        id?: string; billing_environment?: "sandbox" | "live" | null; user_id: string; period_start: string; period_end: string; plan: "free" | "pro"; quota: number; consumed?: number; reserved?: number;
        created_at?: string; updated_at?: string;
      }>;
      billing_generation_reservations: Table<BillingGenerationReservationRow, {
        generation_run_id: string; billing_environment?: "sandbox" | "live" | null; user_id: string; period_start: string; status: "reserved" | "consumed" | "released"; created_at?: string; updated_at?: string;
      }>;
      billing_webhook_events: Table<BillingWebhookEventRow, {
        id?: string; billing_environment?: "sandbox" | "live" | null; event_id: string; event_type: string; occurred_at?: string | null; received_at?: string; processed_at?: string | null; status?: "processed" | "ignored" | "failed";
      }>;
      rate_limit_windows: Table<RateLimitWindowRow, {
        scope: string; key_hash: string; window_started_at: string; attempt_count?: number;
      }>;
    };
    Views: Record<never, never>;
    Functions: {
      claim_current_anonymous_session: {
        Args: { token_hash: string };
        Returns: string | null;
      };
      acknowledge_generation_workflow: {
        Args: {
          p_generation_run_id: string;
          p_dispatch_token: string;
          p_workflow_run_id: string;
          p_workflow_contract_version: string;
        };
        Returns: Json;
      };
      claim_generation_execution: { Args: Record<string, unknown>; Returns: Json };
      claim_generation_dispatch: { Args: Record<string, unknown>; Returns: Json };
      create_generation_operation: { Args: Record<string, unknown>; Returns: string };
      claim_generation_operation: { Args: Record<string, unknown>; Returns: Json };
      settle_generation_operation_success: { Args: Record<string, unknown>; Returns: Json };
      settle_generation_operation_retry_or_fail: { Args: Record<string, unknown>; Returns: Json };
      finalize_generation_execution: { Args: Record<string, unknown>; Returns: Json };
      create_or_join_generation_v2_request: { Args: { p_session_id: string; p_source_snapshot_hash: string; p_generation_contract_hash: string; p_output_language: "match_materials" | "en" | "zh"; p_request_content_key: string; p_manifest_json: Json }; Returns: GenerationV2RequestRow };
      claim_generation_v2_artifact: { Args: { p_artifact_id: string; p_lease_id: string; p_lease_seconds?: number }; Returns: GenerationV2ArtifactRow };
      settle_generation_v2_artifact: { Args: { p_artifact_id: string; p_lease_id: string; p_status: "complete" | "retry_wait" | "gap"; p_result_json?: Json | null; p_result_hash?: string | null; p_gap_code?: string | null; p_gap_message?: string | null; p_retryable?: boolean }; Returns: GenerationV2ArtifactRow };
      get_generation_execution_status: { Args: { p_generation_run_id: string }; Returns: Json };
      get_generation_operation_context: { Args: { p_generation_run_id: string; p_operation_key: string }; Returns: Json };
      billing_usage_summary: { Args: { p_user_id: string; p_billing_environment: "sandbox" | "live" }; Returns: Json };
      consume_rate_limit: {
        Args: { p_scope: string; p_key_hash: string; p_window_seconds: number; p_limit: number };
        Returns: Array<{ allowed: boolean; retry_after_seconds: number }>;
      };
      search_owned_knowledge: {
        Args: { search_query: string; result_limit?: number; result_offset?: number };
        Returns: Array<{
          result_type: "guide" | "topic" | "source";
          result_id: string;
          guide_id: string | null;
          session_id: string;
          source_id: string | null;
          title: string;
          subtitle: string | null;
          excerpt: string | null;
          rank: number;
          total_count: number;
        }>;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
