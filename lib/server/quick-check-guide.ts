import { v2GuideSchema, type V2Guide } from "@/lib/ai/generation-v2";
import { isGenerationV2SchemaUnavailable } from "@/lib/ai/generation-v2-rollout";
import { guideSchema, type Guide } from "@/lib/schemas";
import { getSupabaseAdmin } from "@/lib/server/supabase";

export type QuickCheckGuideRecord =
  | { engine: "v1"; guideId: string; guide: Guide }
  | { engine: "v2"; guideId: string; guide: V2Guide };

export async function readLatestQuickCheckGuide(sessionId: string): Promise<QuickCheckGuideRecord | null> {
  const admin = getSupabaseAdmin();
  const { data: v2Row, error: v2Error } = await admin
    .from("generation_v2_guides")
    .select("id, guide_json, created_at, generation_v2_requests!inner(status)")
    .eq("session_id", sessionId)
    .in("generation_v2_requests.status", ["complete", "complete_with_gaps"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (v2Error && !isGenerationV2SchemaUnavailable(v2Error)) throw v2Error;
  if (v2Row) return { engine: "v2", guideId: v2Row.id, guide: v2GuideSchema.parse(v2Row.guide_json) };

  const { data: v1Row, error: v1Error } = await admin
    .from("study_guides")
    .select("id, guide_json")
    .eq("session_id", sessionId)
    .is("deleted_at", null)
    .maybeSingle();
  if (v1Error) throw v1Error;
  return v1Row ? { engine: "v1", guideId: v1Row.id, guide: guideSchema.parse(v1Row.guide_json) } : null;
}

export async function readQuickCheckGuide(
  sessionId: string,
  identity: { guideId: string | null; generationV2GuideId: string | null },
): Promise<QuickCheckGuideRecord | null> {
  const admin = getSupabaseAdmin();
  if (identity.generationV2GuideId) {
    const { data, error } = await admin
      .from("generation_v2_guides")
      .select("id, guide_json")
      .eq("id", identity.generationV2GuideId)
      .eq("session_id", sessionId)
      .maybeSingle();
    if (error) throw error;
    return data ? { engine: "v2", guideId: data.id, guide: v2GuideSchema.parse(data.guide_json) } : null;
  }
  if (!identity.guideId) return null;
  const { data, error } = await admin
    .from("study_guides")
    .select("id, guide_json")
    .eq("id", identity.guideId)
    .eq("session_id", sessionId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data ? { engine: "v1", guideId: data.id, guide: guideSchema.parse(data.guide_json) } : null;
}
