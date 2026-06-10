import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ASSESSMENTS, assessmentByKey } from "@/lib/assessments";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Lead Dashboard — Avi Admin" }] }),
  component: AdminPage,
});

type LeadStatus = "New" | "Contacted" | "Converted to Mandate" | "Not Qualified";
const STATUSES: LeadStatus[] = ["New", "Contacted", "Converted to Mandate", "Not Qualified"];

interface Lead {
  id: string;
  assessment_type: string;
  full_name: string;
  company_name: string;
  email: string;
  phone: string;
  capital_sought: string;
  deal_type: string;
  funding_readiness_score: number | null;
  investor_attractiveness_score: number | null;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
}

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"All" | LeadStatus>("All");
  const [selected, setSelected] = useState<Lead | null>(null);

  const { data: roleData } = useQuery({
    queryKey: ["my-role"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return { isAdmin: false };
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      return { isAdmin: (data ?? []).some((r) => r.role === "admin"), userId: u.user.id };
    },
  });

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads"],
    enabled: roleData?.isAdmin === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id,assessment_type,full_name,company_name,email,phone,capital_sought,deal_type,funding_readiness_score,investor_attractiveness_score,status,notes,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });

  const updateLead = useMutation({
    mutationFn: async (patch: { id: string; status?: LeadStatus; notes?: string }) => {
      const { id, ...rest } = patch;
      const { error } = await supabase.from("leads").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead updated.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  if (roleData && !roleData.isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20">
        <h1 className="text-2xl font-bold">Access restricted</h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
          Your account does not have the admin role. Ask the Avi team to grant access.
        </p>
        <p className="mt-4 text-xs text-[color:var(--color-muted-foreground)] break-all">
          Your user ID: <code>{roleData.userId}</code>
        </p>
        <button onClick={signOut} className="avi-btn-ghost mt-6">Sign out</button>
      </div>
    );
  }

  const filtered = (leads ?? []).filter((l) => filter === "All" || l.status === filter);

  const stats = {
    total: leads?.length ?? 0,
    new: leads?.filter((l) => l.status === "New").length ?? 0,
    converted: leads?.filter((l) => l.status === "Converted to Mandate").length ?? 0,
    capitalCount: leads?.length ?? 0,
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[color:var(--color-muted-foreground)]">
            Avi Operator Console
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Lead Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/" className="avi-btn-ghost">View Site</Link>
          <button onClick={signOut} className="avi-btn-ghost">Sign Out</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
        <Stat label="Total Leads" value={stats.total} />
        <Stat label="New" value={stats.new} />
        <Stat label="Converted to Mandate" value={stats.converted} />
        <Stat label="Assessments Live" value={ASSESSMENTS.length} />
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {(["All", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md border"
            style={{
              borderColor: filter === s ? "var(--color-foreground)" : "var(--color-border)",
              backgroundColor: filter === s ? "var(--color-foreground)" : "transparent",
              color: filter === s ? "var(--color-background)" : "var(--color-foreground)",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="avi-card mt-4 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-sm text-[color:var(--color-muted-foreground)]">Loading leads…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-sm text-[color:var(--color-muted-foreground)]">No leads to display.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: "var(--color-secondary)" }}>
                <tr className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Name / Company</th>
                  <th className="text-left p-3">Assessment</th>
                  <th className="text-left p-3">Capital</th>
                  <th className="text-left p-3">Deal</th>
                  <th className="text-left p-3">Scores</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} onClick={() => setSelected(l)} className="cursor-pointer border-t hover:bg-[color:var(--color-secondary)] transition-colors" style={{ borderColor: "var(--color-border)" }}>
                    <td className="p-3 text-xs text-[color:var(--color-muted-foreground)] whitespace-nowrap">
                      {new Date(l.created_at).toLocaleDateString("en-GB")}
                    </td>
                    <td className="p-3">
                      <div className="font-bold">{l.full_name}</div>
                      <div className="text-xs text-[color:var(--color-muted-foreground)]">{l.company_name}</div>
                    </td>
                    <td className="p-3 text-xs">{assessmentByKey(l.assessment_type)?.title ?? l.assessment_type}</td>
                    <td className="p-3 whitespace-nowrap">{l.capital_sought}</td>
                    <td className="p-3"><Pill>{l.deal_type}</Pill></td>
                    <td className="p-3 text-xs whitespace-nowrap">
                      FR <strong>{l.funding_readiness_score ?? "—"}</strong> · IA <strong>{l.investor_attractiveness_score ?? "—"}</strong>
                    </td>
                    <td className="p-3"><StatusPill status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <Drawer lead={selected} onClose={() => setSelected(null)} onSave={(patch) => updateLead.mutate({ id: selected.id, ...patch })} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="avi-card p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-muted-foreground)]">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded" style={{ borderColor: "var(--color-border)" }}>{children}</span>;
}

function StatusPill({ status }: { status: LeadStatus }) {
  const color = status === "New" ? "var(--color-accent)" : status === "Converted to Mandate" ? "#16a34a" : status === "Not Qualified" ? "#a3a3a3" : "var(--color-foreground)";
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {status}
    </span>
  );
}

function Drawer({ lead, onClose, onSave }: {
  lead: Lead;
  onClose: () => void;
  onSave: (patch: { status?: LeadStatus; notes?: string }) => void;
}) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [notes, setNotes] = useState(lead.notes ?? "");
  const meta = assessmentByKey(lead.assessment_type);

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <aside onClick={(e) => e.stopPropagation()} className="w-full max-w-md h-full overflow-y-auto" style={{ backgroundColor: "var(--color-background)", borderLeft: "1px solid var(--color-border)" }}>
        <div className="p-6 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-muted-foreground)]">Lead</p>
              <h2 className="mt-1 text-xl font-bold">{lead.full_name}</h2>
              <p className="text-sm text-[color:var(--color-muted-foreground)]">{lead.company_name}</p>
            </div>
            <button onClick={onClose} className="avi-btn-ghost">Close</button>
          </div>
        </div>

        <div className="p-6 space-y-5 text-sm">
          <KV label="Assessment" value={meta?.title ?? lead.assessment_type} />
          <KV label="Email" value={lead.email} />
          <KV label="Phone" value={lead.phone} />
          <KV label="Capital sought" value={lead.capital_sought} />
          <KV label="Deal type" value={lead.deal_type} />
          <KV label="Funding readiness" value={`${lead.funding_readiness_score ?? "—"} / 10`} />
          <KV label="Investor attractiveness" value={`${lead.investor_attractiveness_score ?? "—"} / 10`} />
          <KV label="Submitted" value={new Date(lead.created_at).toLocaleString()} />

          <div>
            <span className="avi-label">Status</span>
            <select className="avi-input" value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <span className="avi-label">Notes</span>
            <textarea className="avi-input min-h-[120px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button onClick={() => onSave({ status, notes })} className="avi-btn-primary">Save Changes</button>
            <button
              onClick={() => { onSave({ status: "Converted to Mandate", notes }); }}
              className="avi-btn-ghost"
            >
              Convert to Mandate
            </button>
            <p className="text-[11px] text-[color:var(--color-muted-foreground)]">
              Mandate creation (Module 2) will open here in the next phase, pre-filled with this lead's data.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2" style={{ borderColor: "var(--color-border)" }}>
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-muted-foreground)]">{label}</span>
      <span className="text-right text-sm break-all">{value}</span>
    </div>
  );
}
