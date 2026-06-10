import { createFileRoute, Link } from "@tanstack/react-router";
import { ASSESSMENTS } from "@/lib/assessments";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Avi — AI-Native Investment Banking for GCC Private Capital" },
      { name: "description", content: "Run a free AI-powered capital readiness assessment. Real estate, SME, growth and private credit across the GCC." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-12">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[color:var(--color-muted-foreground)]">
          AI-Native Investment Banking — GCC
        </p>
        <h1 className="mt-4 text-4xl sm:text-5xl md:text-6xl font-bold leading-[1.05] tracking-tight max-w-4xl">
          Institutional capital, packaged at the speed of software.
        </h1>
        <p className="mt-6 max-w-2xl text-base sm:text-lg text-[color:var(--color-muted-foreground)] leading-relaxed">
          Avi is an AI-native investment bank for GCC private capital markets — real estate, SME, growth and private credit. Begin with a free, confidential capital readiness assessment.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#assessments" className="avi-btn-primary">Run an Assessment</a>
          <Link to="/auth" className="avi-btn-ghost">Admin Sign In</Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6">
        <div className="avi-hairline" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px mt-px" style={{ backgroundColor: "var(--color-border)" }}>
          {[
            ["Real Estate", "GCC capital raising & JV"],
            ["SME & Growth", "Equity, mezzanine, private credit"],
            ["Sharia", "Compliant structures"],
            ["Speed", "Days, not months"],
          ].map(([k, v]) => (
            <div key={k} className="p-5" style={{ backgroundColor: "var(--color-background)" }}>
              <p className="text-xs font-bold uppercase tracking-wider">{k}</p>
              <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">{v}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="assessments" className="mx-auto max-w-6xl px-6 pt-20">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[color:var(--color-muted-foreground)]">Capital Readiness Tools</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">Four free assessments.</h2>
          </div>
          <p className="max-w-md text-sm text-[color:var(--color-muted-foreground)]">
            Each assessment produces a branded, downloadable report — scored, structured and ready to share with capital partners.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
          {ASSESSMENTS.map((a, i) => (
            <Link
              key={a.key}
              to="/assessment/$slug"
              params={{ slug: a.slug }}
              className="avi-card p-7 group hover:border-[color:var(--color-accent)] transition-colors"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--color-muted-foreground)]">
                  {String(i + 1).padStart(2, "0")} / Assessment
                </span>
                <span className="text-xs text-[color:var(--color-accent)] opacity-0 group-hover:opacity-100 transition-opacity">
                  Begin →
                </span>
              </div>
              <h3 className="mt-3 text-xl font-bold tracking-tight">{a.title}</h3>
              <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)] leading-relaxed">
                {a.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pt-24">
        <div className="avi-card p-8 md:p-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[color:var(--color-muted-foreground)]">How Avi Works</p>
          <ol className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              ["01", "Assess", "Run a free capital readiness assessment in minutes."],
              ["02", "Package", "Avi's AI engine produces institutional deal materials."],
              ["03", "Match", "Investor matching across GCC family offices and funds."],
              ["04", "Close", "Deal room, NDA workflow and transaction execution."],
            ].map(([n, h, t]) => (
              <li key={n}>
                <span className="text-2xl font-bold tracking-tight">{n}</span>
                <p className="mt-2 text-sm font-bold uppercase tracking-wider">{h}</p>
                <p className="mt-1 text-sm text-[color:var(--color-muted-foreground)]">{t}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
