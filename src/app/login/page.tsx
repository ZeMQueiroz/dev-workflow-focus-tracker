// app/login/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserEmail } from "@/lib/server-auth";
import { Card } from "@/components/ui/card";
import {
  Timer,
  Sparkles,
  CalendarRange,
  FileText,
  AlertCircle,
} from "lucide-react";
import { LoginProviders } from "./LoginProviders";

type LoginPageSearchParams = {
  callbackUrl?: string;
  error?: string;
};

type LoginPageProps = {
  // Next 16: searchParams is a Promise and must be awaited
  searchParams: Promise<LoginPageSearchParams>;
};

const LoginPage = async ({ searchParams }: LoginPageProps) => {
  const ownerEmail = await getCurrentUserEmail();
  const resolved = await searchParams;

  // Default first-login destination
  const callbackUrl = resolved.callbackUrl || "/today";
  const error = resolved.error;

  // Already signed in? Just send them on.
  if (ownerEmail) {
    redirect(callbackUrl);
  }

  let errorMessage: string | undefined;
  if (error) {
    switch (error) {
      case "google":
        errorMessage =
          "Google sign-in failed. Please check the account and try again, or use GitHub.";
        break;
      case "github":
        errorMessage =
          "GitHub sign-in failed. Please check the account and try again, or use Google.";
        break;
      case "OAuthSignin":
        errorMessage = "Could not start sign-in. Please try again.";
        break;
      case "OAuthCallback":
        errorMessage =
          "Something went wrong after authenticating. Try again, or try the other provider.";
        break;
      default:
        errorMessage = "Sign-in failed. Please try again.";
    }
  }

  return (
    <main className="w-full">
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-5xl flex-col gap-10 px-4 py-10 md:flex-row md:items-center md:px-8">
        {/* LEFT: value prop / marketing copy */}
        <section className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 py-1 text-[0.7rem] font-medium uppercase tracking-wide text-[var(--text-muted)]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Weekline · Focus log for developers</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              Sign in to keep your week straight.
            </h1>
            <p className="max-w-xl text-sm text-[var(--text-muted)] md:text-base">
              Log focused work blocks, see exactly where your time went this
              week, and export a clean summary for 1:1s, stand-ups, or client
              updates.
            </p>
          </div>

          <div className="grid gap-3 text-[0.8rem] text-[var(--text-muted)] sm:grid-cols-2">
            <div className="space-y-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide">
                <Timer className="h-3.5 w-3.5" />
                <span>Log focus, not tickets</span>
              </div>
              <p className="mt-1">
                One entry per block of work, grouped by project and intention.
              </p>
            </div>
            <div className="space-y-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] p-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Weekly story in one click</span>
              </div>
              <p className="mt-1">
                Generate Markdown summaries ready for Notion, Obsidian, or
                email.
              </p>
            </div>
          </div>

          <p className="text-[0.75rem] text-[var(--text-muted)]">
            New here?{" "}
            <Link
              href="/welcome"
              className="font-medium text-[var(--accent-solid)] hover:underline"
            >
              See the overview first →
            </Link>
          </p>
        </section>

        {/* RIGHT: sign-in card */}
        <section className="flex w-full justify-center md:w-auto md:flex-none">
          <Card className="w-full max-w-md border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 sm:p-7">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--bg-surface-soft)] px-3 py-1 text-[0.7rem] uppercase tracking-wide text-[var(--text-muted)]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>Sign in to Weekline</span>
            </div>

            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Choose a provider
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              We only store the focus sessions you log — nothing from your
              repos, pull requests, or email.
            </p>

            {/* Provider buttons (client-side signIn calls) */}
            <LoginProviders callbackUrl={callbackUrl} />

            {errorMessage && (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 p-2 text-[0.75rem] text-red-200">
                <AlertCircle className="mt-[1px] h-3.5 w-3.5" />
                <p>{errorMessage}</p>
              </div>
            )}

            <div className="mt-6 space-y-2 text-[0.75rem] text-[var(--text-muted)]">
              <div className="flex items-center gap-2">
                <CalendarRange className="h-3.5 w-3.5" />
                <span>See Today, Week, and Summary views of your focus.</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5" />
                <span>
                  Export clean Markdown recaps whenever you need them.
                </span>
              </div>
            </div>

            <p className="mt-4 text-[0.7rem] leading-relaxed text-[var(--text-muted)]">
              You can revoke access at any time from your GitHub or Google
              account settings. Weekline never reads your code, issues, or
              emails — only the focus sessions you log.
            </p>
          </Card>
        </section>
      </div>
    </main>
  );
};

export default LoginPage;
