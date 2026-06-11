import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export const convertLeadToMandate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ leadId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: lead, error: le } = await context.supabase
      .from("leads").select("*").eq("id", data.leadId).single();
    if (le) throw new Error(le.message);
    if (!lead) throw new Error("Lead not found");

    const { data: existing } = await context.supabase
      .from("mandates").select("id").eq("lead_id", lead.id).maybeSingle();
    if (existing?.id) return { mandateId: existing.id, reused: true };

    const insert = {
      lead_id: lead.id,
      sponsor_name: lead.full_name,
      company_name: lead.company_name,
      email: lead.email,
      phone: lead.phone,
      deal_type: lead.deal_type,
      capital_sought: lead.capital_sought,
      asset_class: null,
      geography: null,
      use_of_proceeds: null,
      sponsor_track_record: null,
      financial_summary: (lead.report as any)?.executive_summary ?? null,
      sharia_status: "Pending" as const,
      stage: "Draft" as const,
      notes: lead.notes,
      created_by: context.userId,
    };
    const { data: m, error: ie } = await context.supabase
      .from("mandates").insert(insert).select("id").single();
    if (ie) throw new Error(ie.message);

    await context.supabase.from("leads").update({ status: "Converted to Mandate" }).eq("id", lead.id);
    return { mandateId: m.id as string, reused: false };
  });

const MandatePatch = z.object({
  id: z.string().uuid(),
  patch: z.object({
    sponsor_name: z.string().max(200).optional(),
    company_name: z.string().max(200).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(50).optional(),
    deal_type: z.enum(["Equity", "Debt"]).optional(),
    asset_class: z.string().max(200).nullable().optional(),
    geography: z.string().max(200).nullable().optional(),
    capital_sought: z.string().max(200).optional(),
    use_of_proceeds: z.string().max(4000).nullable().optional(),
    sponsor_track_record: z.string().max(4000).nullable().optional(),
    financial_summary: z.string().max(4000).nullable().optional(),
    sharia_status: z.enum(["Required", "Not Required", "Pending"]).optional(),
    stage: z.enum(["Draft", "Under Review", "Ready to Package", "Live", "Closed", "Archived"]).optional(),
    notes: z.string().max(8000).nullable().optional(),
  }),
});

export const updateMandate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => MandatePatch.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch: Record<string, unknown> = { ...data.patch };
    if (patch.stage === "Archived") patch.archived_at = new Date().toISOString();
    const { error } = await context.supabase.from("mandates").update(patch as any).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const archiveMandate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("mandates")
      .update({ stage: "Archived", archived_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
