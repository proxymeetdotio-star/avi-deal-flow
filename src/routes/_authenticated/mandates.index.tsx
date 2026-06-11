import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/mandates/")({
  head: () => ({ meta: [{ title: "Mandates — Avi Admin" }] }),
  component: MandatesList,
});

const STAGES = ["Draft", "Under Review", "Ready to Package", "Live", "Closed", "Archived"] as const;

function MandatesList() {
  const [stage, setStage] = useState<"All" | typeof STAGES[number]>("All");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["mandates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mandates")
        .select("id, sponsor_name, company_name, deal_type, capital_sought, stage, sharia_status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const rows = (data ?? []).filter((m) => {
    if (stage !== "All" && m.stage !== stage) return false;
    if (search && !`${m.sponsor_name} ${m.company_name}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[color:var(--color-muted-foreground)]">Avi Operator Console</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Mandates</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/admin" className="avi-btn-ghost">Leads</Link>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input className="avi-input max-w-xs" placeholder="Search sponsor or company…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {(["All", ...STAGES] as const).map((s) => (
            <button key={s} onClick={() => setStage(s)}
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md border"
              style={{
                borderColor: stage === s ? "var(--color-foreground)" : "var(--color-border)",
                backgroundColor: stage === s ? "var(--color-foreground)" : "transparent",
                color: stage === s ? "var(--color-background)" : "var(--color-foreground)",
              }}>{s}</button>
          ))}
        </div>
      </div>

      <div className="avi-card mt-4 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-sm text-[color:var(--color-muted-foreground)]">Loading mandates…</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm text-[color:var(--color-muted-foreground)]">No mandates yet. Convert a lead to create one.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: "var(--color-secondary)" }}>
                <tr className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                  <th className="text-left p-3">Created</th>
                  <th className="text-left p-3">Sponsor / Company</th>
                  <th className="text-left p-3">Deal</th>
                  <th className="text-left p-3">Capital</th>
                  <th className="text-left p-3">Sharia</th>
                  <th className="text-left p-3">Stage</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className="border-t hover:bg-[color:var(--color-secondary)] transition-colors" style={{ borderColor: "var(--color-border)" }}>
                    <td className="p-3 text-xs whitespace-nowrap text-[color:var(--color-muted-foreground)]">{new Date(m.created_at).toLocaleDateString("en-GB")}</td>
                    <td className="p-3"><div className="font-bold">{m.sponsor_name}</div><div className="text-xs text-[color:var(--color-muted-foreground)]">{m.company_name}</div></td>
                    <td className="p-3"><span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded" style={{ borderColor: "var(--color-border)" }}>{m.deal_type}</span></td>
                    <td className="p-3 whitespace-nowrap">{m.capital_sought}</td>
                    <td className="p-3 text-xs">{m.sharia_status}</td>
                    <td className="p-3 text-xs font-bold">{m.stage}</td>
                    <td className="p-3 text-right"><Link to="/mandates/$id" params={{ id: m.id }} className="avi-btn-ghost">Open →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
