import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { updateMandate, archiveMandate } from "@/lib/mandates.functions";
import { analyzeMandateDocument } from "@/lib/mandate-docs.functions";
import { generateMandatePackage } from "@/lib/mandate-generate.functions";
import { renderMandatePdf } from "@/lib/render-mandate-pdf";
import { renderMandateDocx } from "@/lib/render-mandate-docx";
import { renderMandatePptx } from "@/lib/render-mandate-pptx";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mandates/$id")({
  head: () => ({ meta: [{ title: "Mandate — Avi Admin" }] }),
  component: MandateDetail,
});

const DOC_TYPES = ["Pitch Deck", "Financials", "Trade License", "Title Deed", "Valuation", "KYC", "Other"] as const;
const STAGES = ["Draft", "Under Review", "Ready to Package", "Live", "Closed", "Archived"] as const;
const SHARIA = ["Required", "Not Required", "Pending"] as const;

function MandateDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"overview" | "documents" | "package">("overview");

  const { data: mandate, isLoading } = useQuery({
    queryKey: ["mandate", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("mandates").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !mandate) {
    return <div className="mx-auto max-w-5xl px-6 py-20 text-sm text-[color:var(--color-muted-foreground)]">Loading mandate…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center gap-3 text-xs text-[color:var(--color-muted-foreground)]">
        <Link to="/mandates" className="hover:underline">Mandates</Link>
        <span>/</span>
        <span>{mandate.company_name}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{mandate.company_name}</h1>
          <p className="text-sm text-[color:var(--color-muted-foreground)]">
            {mandate.sponsor_name} · {mandate.deal_type} · {mandate.capital_sought}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md border" style={{ borderColor: "var(--color-border)" }}>{mandate.stage}</span>
        </div>
      </div>

      <div className="mt-6 flex gap-2 border-b" style={{ borderColor: "var(--color-border)" }}>
        {(["overview", "documents", "package"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 -mb-px"
            style={{ borderColor: tab === t ? "var(--color-foreground)" : "transparent", color: tab === t ? "var(--color-foreground)" : "var(--color-muted-foreground)" }}>
            {t === "package" ? "Generated Package" : t === "documents" ? "Documents" : "Overview"}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "overview" && <Overview mandate={mandate} onSaved={() => qc.invalidateQueries({ queryKey: ["mandate", id] })} />}
        {tab === "documents" && <Documents mandateId={id} />}
        {tab === "package" && <Package mandate={mandate} />}
      </div>
    </div>
  );
}

function Overview({ mandate, onSaved }: { mandate: any; onSaved: () => void }) {
  const [m, setM] = useState(mandate);
  const updateFn = useServerFn(updateMandate);
  const archiveFn = useServerFn(archiveMandate);
  const save = useMutation({
    mutationFn: () => updateFn({ data: { id: mandate.id, patch: {
      sponsor_name: m.sponsor_name, company_name: m.company_name, email: m.email, phone: m.phone,
      deal_type: m.deal_type, asset_class: m.asset_class, geography: m.geography, capital_sought: m.capital_sought,
      use_of_proceeds: m.use_of_proceeds, sponsor_track_record: m.sponsor_track_record,
      financial_summary: m.financial_summary, sharia_status: m.sharia_status, stage: m.stage, notes: m.notes,
    }}}),
    onSuccess: () => { toast.success("Mandate saved."); onSaved(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });
  const archive = useMutation({
    mutationFn: () => archiveFn({ data: { id: mandate.id } }),
    onSuccess: () => { toast.success("Mandate archived."); onSaved(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Archive failed"),
  });

  const f = (k: string, v: any) => setM({ ...m, [k]: v });
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Field label="Sponsor name" v={m.sponsor_name} onChange={(v) => f("sponsor_name", v)} />
      <Field label="Company" v={m.company_name} onChange={(v) => f("company_name", v)} />
      <Field label="Email" v={m.email} onChange={(v) => f("email", v)} />
      <Field label="Phone" v={m.phone} onChange={(v) => f("phone", v)} />
      <Select label="Deal type" v={m.deal_type} options={["Equity", "Debt"]} onChange={(v) => f("deal_type", v)} />
      <Field label="Capital sought" v={m.capital_sought} onChange={(v) => f("capital_sought", v)} />
      <Field label="Asset class" v={m.asset_class ?? ""} onChange={(v) => f("asset_class", v)} />
      <Field label="Geography" v={m.geography ?? ""} onChange={(v) => f("geography", v)} />
      <Select label="Stage" v={m.stage} options={[...STAGES]} onChange={(v) => f("stage", v)} />
      <Select label="Sharia status" v={m.sharia_status} options={[...SHARIA]} onChange={(v) => f("sharia_status", v)} />
      <Area label="Use of proceeds" v={m.use_of_proceeds ?? ""} onChange={(v) => f("use_of_proceeds", v)} />
      <Area label="Sponsor track record" v={m.sponsor_track_record ?? ""} onChange={(v) => f("sponsor_track_record", v)} />
      <Area label="Financial summary" v={m.financial_summary ?? ""} onChange={(v) => f("financial_summary", v)} full />
      <Area label="Internal notes" v={m.notes ?? ""} onChange={(v) => f("notes", v)} full />

      <div className="md:col-span-2 flex gap-2 pt-2">
        <button className="avi-btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : "Save Changes"}
        </button>
        {m.stage !== "Archived" && (
          <button className="avi-btn-ghost" disabled={archive.isPending} onClick={() => { if (confirm("Archive this mandate?")) archive.mutate(); }}>
            Archive
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, v, onChange }: { label: string; v: string; onChange: (v: string) => void }) {
  return <div><span className="avi-label">{label}</span><input className="avi-input" value={v} onChange={(e) => onChange(e.target.value)} /></div>;
}
function Select({ label, v, options, onChange }: { label: string; v: string; options: string[]; onChange: (v: string) => void }) {
  return <div><span className="avi-label">{label}</span><select className="avi-input" value={v} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o}>{o}</option>)}</select></div>;
}
function Area({ label, v, onChange, full }: { label: string; v: string; onChange: (v: string) => void; full?: boolean }) {
  return <div className={full ? "md:col-span-2" : ""}><span className="avi-label">{label}</span><textarea className="avi-input min-h-[90px]" value={v} onChange={(e) => onChange(e.target.value)} /></div>;
}

function Documents({ mandateId }: { mandateId: string }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<typeof DOC_TYPES[number]>("Pitch Deck");
  const [uploading, setUploading] = useState(false);
  const analyzeFn = useServerFn(analyzeMandateDocument);

  const { data: docs } = useQuery({
    queryKey: ["mandate-docs", mandateId],
    queryFn: async () => {
      const { data, error } = await supabase.from("mandate_documents")
        .select("*").eq("mandate_id", mandateId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const upload = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const count = (docs ?? []).length;
    if (count + files.length > 20) { toast.error("Maximum 20 documents per mandate."); return; }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 25 * 1024 * 1024) { toast.error(`${file.name} exceeds 25 MB`); continue; }
        const path = `${mandateId}/${crypto.randomUUID()}-${file.name}`;
        const { error: ue } = await supabase.storage.from("mandate-files").upload(path, file, {
          contentType: file.type || "application/octet-stream",
        });
        if (ue) { toast.error(`Upload failed: ${ue.message}`); continue; }
        const { error: ie } = await supabase.from("mandate_documents").insert({
          mandate_id: mandateId,
          storage_path: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || null,
          doc_type: docType,
        });
        if (ie) { toast.error(`Save failed: ${ie.message}`); continue; }
      }
      toast.success("Uploaded.");
      qc.invalidateQueries({ queryKey: ["mandate-docs", mandateId] });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const analyze = useMutation({
    mutationFn: (documentId: string) => analyzeFn({ data: { documentId } }),
    onSuccess: () => { toast.success("Analyzed."); qc.invalidateQueries({ queryKey: ["mandate-docs", mandateId] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Analysis failed"),
  });

  const remove = async (d: any) => {
    if (!confirm(`Delete ${d.file_name}?`)) return;
    await supabase.storage.from("mandate-files").remove([d.storage_path]);
    await supabase.from("mandate_documents").delete().eq("id", d.id);
    qc.invalidateQueries({ queryKey: ["mandate-docs", mandateId] });
  };

  return (
    <div className="space-y-4">
      <div className="avi-card p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-muted-foreground)]">Upload Documents ({(docs ?? []).length}/20)</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <span className="avi-label">Document type</span>
            <select className="avi-input" value={docType} onChange={(e) => setDocType(e.target.value as any)}>
              {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <input ref={fileRef} type="file" multiple onChange={(e) => upload(e.target.files)}
            className="text-sm" disabled={uploading || (docs ?? []).length >= 20} />
          {uploading && <span className="text-xs text-[color:var(--color-muted-foreground)]">Uploading…</span>}
        </div>
        <p className="mt-2 text-[11px] text-[color:var(--color-muted-foreground)]">Pitch deck, financials, trade license, title deed, valuation, KYC — up to 20 files, 25 MB each.</p>
      </div>

      <div className="avi-card overflow-hidden">
        {(docs ?? []).length === 0 ? (
          <div className="p-8 text-sm text-[color:var(--color-muted-foreground)]">No documents uploaded yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: "var(--color-secondary)" }}>
              <tr className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                <th className="text-left p-3">File</th><th className="text-left p-3">Type</th>
                <th className="text-left p-3">Analysis</th><th></th>
              </tr>
            </thead>
            <tbody>
              {(docs ?? []).map((d: any) => (
                <tr key={d.id} className="border-t" style={{ borderColor: "var(--color-border)" }}>
                  <td className="p-3"><div className="font-bold">{d.file_name}</div><div className="text-xs text-[color:var(--color-muted-foreground)]">{(d.file_size / 1024).toFixed(0)} KB</div></td>
                  <td className="p-3 text-xs">{d.doc_type}</td>
                  <td className="p-3 text-xs">{d.analyzed_at ? <span className="text-[color:var(--color-foreground)]">✓ Analyzed</span> : <span className="text-[color:var(--color-muted-foreground)]">Not yet analyzed</span>}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button className="avi-btn-ghost mr-2" disabled={analyze.isPending} onClick={() => analyze.mutate(d.id)}>
                      {analyze.isPending && analyze.variables === d.id ? "Analyzing…" : d.analyzed_at ? "Re-analyze" : "Analyze"}
                    </button>
                    <button className="avi-btn-ghost" onClick={() => remove(d)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(docs ?? []).some((d: any) => d.analysis) && (
        <AnalysisDetails docs={(docs ?? []).filter((d: any) => d.analysis)} />
      )}
    </div>
  );
}

function AnalysisDetails({ docs }: { docs: any[] }) {
  return (
    <div className="avi-card p-5 space-y-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-muted-foreground)]">AI Analysis</p>
      {docs.map((d) => (
        <details key={d.id} className="border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
          <summary className="cursor-pointer font-bold text-sm">{d.file_name}</summary>
          <pre className="mt-2 text-xs whitespace-pre-wrap p-3 rounded" style={{ backgroundColor: "var(--color-secondary)" }}>{JSON.stringify(d.analysis, null, 2)}</pre>
        </details>
      ))}
    </div>
  );
}

function Package({ mandate }: { mandate: any }) {
  const qc = useQueryClient();
  const genFn = useServerFn(generateMandatePackage);

  const { data: docs } = useQuery({
    queryKey: ["mandate-generated", mandate.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("mandate_generated_documents")
        .select("*").eq("mandate_id", mandate.id).order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const generate = useMutation({
    mutationFn: () => genFn({ data: { mandateId: mandate.id } }),
    onSuccess: () => { toast.success("Package generated."); qc.invalidateQueries({ queryKey: ["mandate-generated", mandate.id] }); qc.invalidateQueries({ queryKey: ["mandate", mandate.id] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Generation failed"),
  });

  const download = async (d: any, fmt: "pdf" | "docx" | "pptx") => {
    if (!d.content) { toast.error("Document not ready."); return; }
    const label = `${mandate.company_name} — ${mandate.deal_type}`;
    const fileBase = `${mandate.company_name.replace(/[^a-z0-9]+/gi, "_")}_${d.doc_kind.replace(/\s+/g, "_")}`;
    if (fmt === "pdf") {
      const pdf = renderMandatePdf(d.content, d.doc_kind, label);
      pdf.save(`${fileBase}.pdf`);
    } else if (fmt === "docx") {
      const blob = await renderMandateDocx(d.content, d.doc_kind, label);
      triggerDownload(blob, `${fileBase}.docx`);
    } else {
      const blob = await renderMandatePptx(d.content, d.doc_kind, label);
      triggerDownload(blob, `${fileBase}.pptx`);
    }
  };

  const expectedCount = mandate.deal_type === "Debt" ? 8 : 7;
  const sharia = mandate.sharia_status === "Required";

  return (
    <div className="space-y-4">
      <div className="avi-card p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-muted-foreground)]">Deal Package</p>
          <p className="mt-1 text-sm">
            {mandate.deal_type === "Debt" ? "8 debt documents" : "7 equity documents"}{sharia ? " + Sharia Compliance Memo" : ""}.
            Drafted by Avi AI from mandate inputs and analyzed source documents. <strong>No-assumption rule</strong> enforced — missing data shown as "Information not provided".
          </p>
        </div>
        <button className="avi-btn-primary" disabled={generate.isPending} onClick={() => generate.mutate()}>
          {generate.isPending ? "Generating…" : (docs?.length ?? 0) ? "Regenerate Package" : "Generate Package"}
        </button>
      </div>

      <div className="avi-card overflow-hidden">
        {(docs ?? []).length === 0 ? (
          <div className="p-8 text-sm text-[color:var(--color-muted-foreground)]">
            No package generated yet. Click Generate Package — Avi will draft {expectedCount}{sharia ? " + 1 Sharia memo" : ""} document{expectedCount > 1 ? "s" : ""}.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: "var(--color-secondary)" }}>
              <tr className="text-[10px] uppercase tracking-wider text-[color:var(--color-muted-foreground)]">
                <th className="text-left p-3">Document</th>
                <th className="text-left p-3">Format</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Download</th>
              </tr>
            </thead>
            <tbody>
              {(docs ?? []).map((d: any) => (
                <tr key={d.id} className="border-t" style={{ borderColor: "var(--color-border)" }}>
                  <td className="p-3 font-bold">{d.doc_kind}</td>
                  <td className="p-3 text-xs uppercase">{d.format}</td>
                  <td className="p-3 text-xs">
                    {d.status === "ready" ? <span>✓ Ready</span> : d.status === "error" ? <span title={d.error} style={{ color: "#c00" }}>✕ Error</span> : <span className="text-[color:var(--color-muted-foreground)]">{d.status}…</span>}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {d.status === "ready" ? (
                      <>
                        <button className="avi-btn-ghost mr-1" onClick={() => download(d, "pdf")}>PDF</button>
                        <button className="avi-btn-ghost mr-1" onClick={() => download(d, "docx")}>DOCX</button>
                        {d.format === "pptx" && <button className="avi-btn-ghost" onClick={() => download(d, "pptx")}>PPTX</button>}
                      </>
                    ) : d.status === "error" ? <span className="text-xs text-[color:var(--color-muted-foreground)]">{d.error?.slice(0, 60)}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
