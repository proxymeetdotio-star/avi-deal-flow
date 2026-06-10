import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-6xl font-bold">404</h1>
        <p className="mt-3 text-sm text-[color:var(--color-muted-foreground)]">
          The page you're looking for doesn't exist.
        </p>
        <Link to="/" className="avi-btn-primary mt-6 inline-block">Return Home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-bold">Something went wrong.</h1>
        <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="avi-btn-primary mt-6"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Avi — AI-Native Investment Banking for GCC Private Capital" },
      { name: "description", content: "Avi is an AI-native investment bank for GCC private capital markets. Real estate, SME, growth and private credit." },
      { property: "og:title", content: "Avi — AI-Native Investment Banking" },
      { property: "og:description", content: "AI-native investment banking for GCC private capital markets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("avi-theme");
    const prefers = stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(prefers);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    if (typeof window !== "undefined") localStorage.setItem("avi-theme", dark ? "dark" : "light");
  }, [dark]);
  return (
    <button
      onClick={() => setDark((v) => !v)}
      aria-label="Toggle dark mode"
      className="avi-btn-ghost"
    >
      {dark ? "Light" : "Dark"}
    </button>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur" style={{ backgroundColor: "color-mix(in srgb, var(--color-background) 88%, transparent)", borderBottom: "1px solid var(--color-border)" }}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">AVI</span>
          <span className="hidden sm:inline text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-muted-foreground)]">
            GCC Private Capital
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link to="/" className="hidden sm:inline avi-btn-ghost">Assessments</Link>
          <Link to="/auth" className="avi-btn-ghost">Admin</Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t" style={{ borderColor: "var(--color-border)" }}>
      <div className="mx-auto max-w-6xl px-6 py-8 text-xs text-[color:var(--color-muted-foreground)]">
        <p className="font-bold uppercase tracking-[0.15em] text-[color:var(--color-foreground)]">Avi</p>
        <p className="mt-2 max-w-2xl leading-relaxed">
          Prepared by Avi. Regulated by the DFSA via Index &amp; Cie. Content on this site is for informational purposes only and does not constitute financial advice or an offer to invest or lend.
        </p>
        <p className="mt-3">© {new Date().getFullYear()} Avi. All rights reserved.</p>
      </div>
    </footer>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
      </div>
    </QueryClientProvider>
  );
}
