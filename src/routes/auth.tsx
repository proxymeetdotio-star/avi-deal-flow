import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Admin Sign In — Avi" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        toast.success("Account created. Sign in to continue.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <Link to="/" className="text-xs uppercase tracking-widest text-[color:var(--color-muted-foreground)] hover:underline">← Home</Link>
      <h1 className="mt-6 text-3xl font-bold">Admin Access</h1>
      <p className="mt-2 text-sm text-[color:var(--color-muted-foreground)]">
        Internal operator console for the Avi team.
      </p>

      <form onSubmit={submit} className="avi-card mt-8 p-6 space-y-5">
        <label className="block">
          <span className="avi-label">Email</span>
          <input className="avi-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="avi-label">Password</span>
          <input className="avi-input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button type="submit" disabled={loading} className="avi-btn-primary w-full">
          {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
        </button>
        <button type="button" onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))} className="text-xs text-[color:var(--color-muted-foreground)] hover:underline w-full text-center">
          {mode === "signin" ? "Need an account? Create one →" : "Have an account? Sign in →"}
        </button>
      </form>
      <p className="mt-4 text-[11px] text-[color:var(--color-muted-foreground)]">
        Admin role must be granted in the database for access to the leads dashboard.
      </p>
    </div>
  );
}
