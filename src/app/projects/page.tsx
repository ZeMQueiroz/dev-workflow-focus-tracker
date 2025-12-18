import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/server-auth";
import { getWeekRange, formatDuration } from "@/lib/time";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineSignInButton } from "@/components/inline-sign-in-button";

import {
  createProject,
  archiveProject,
  unarchiveProject,
  renameProject,
} from "../actions/project-actions";

import {
  PROJECT_COLOR_KEYS,
  PROJECT_COLOR_LABELS,
  getProjectColorDotClass,
} from "@/lib/project-colors";

import { FolderKanban, Archive, Plus, PencilLine } from "lucide-react";
import type { Project, Session } from "@prisma/client";

const ProjectsPage = async () => {
  const userId = await getCurrentUserId();

  if (!userId) {
    return (
      <Card className="w-full border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <CardHeader>
          <CardTitle className="text-lg text-[var(--text-primary)]">
            Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Please sign in with GitHub or Google using the button in the
            top-right to manage your projects.
          </p>
          <InlineSignInButton />
        </CardContent>
      </Card>
    );
  }

  const { start, end } = getWeekRange(0);

  const [projects, sessionsThisWeek]: [Project[], Session[]] =
    await Promise.all([
      prisma.project.findMany({
        where: { ownerId: userId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.session.findMany({
        where: {
          ownerId: userId,
          startTime: {
            gte: start,
            lt: end,
          },
        },
      }),
    ]);

  const activeProjects = projects.filter((p) => !p.isArchived);
  const archivedProjects = projects.filter((p) => p.isArchived);

  const weeklyTotals = sessionsThisWeek.reduce<
    Record<number, { totalMs: number; count: number }>
  >((acc, s) => {
    if (!acc[s.projectId]) acc[s.projectId] = { totalMs: 0, count: 0 };
    acc[s.projectId].totalMs += s.durationMs;
    acc[s.projectId].count += 1;
    return acc;
  }, {});

  const activeUsedThisWeek = activeProjects.filter(
    (p) => (weeklyTotals[p.id]?.count ?? 0) > 0
  ).length;

  const activeTotalMs = activeProjects.reduce(
    (acc, p) => acc + (weeklyTotals[p.id]?.totalMs ?? 0),
    0
  );

  return (
    <div className="-mx-4 md:-mx-8">
      {/* Page header */}
      <header className="px-4 pb-4 md:px-8">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          Projects
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Keep your focus sessions organized by client, product, or workstream.
        </p>

        {/* Quick stats */}
        <div className="mt-3 flex flex-wrap gap-2 text-[0.7rem] text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 py-1">
            <FolderKanban className="h-3.5 w-3.5" />
            {activeProjects.length} active
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 py-1">
            <Plus className="h-3.5 w-3.5" />
            {activeUsedThisWeek} touched this week
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 py-1 font-mono text-[var(--text-primary)]">
            {formatDuration(activeTotalMs)} this week
          </span>
        </div>
      </header>

      <div className="grid w-full gap-6 px-4 pb-8 md:grid-cols-[1.1fr,1.9fr] md:px-8">
        {/* RIGHT column first on mobile (better UX) */}
        <div className="order-1 space-y-6 md:order-2">
          {/* Active projects */}
          <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <CardHeader className="flex items-baseline justify-between gap-2">
              <div>
                <CardTitle className="text-lg text-[var(--text-primary)]">
                  Active projects
                </CardTitle>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {activeProjects.length} active · {activeUsedThisWeek} touched
                  this week
                </p>
              </div>
            </CardHeader>

            <CardContent>
              {activeProjects.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  No active projects yet. Create your first project below — all
                  focus sessions are attached to a project.
                </p>
              ) : (
                <ul className="space-y-2 text-sm text-[var(--text-primary)]">
                  {activeProjects.map((project) => {
                    const stats = weeklyTotals[project.id] ?? {
                      totalMs: 0,
                      count: 0,
                    };
                    const hasActivity = stats.count > 0;

                    return (
                      <li
                        key={project.id}
                        className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 py-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <span
                                  className={getProjectColorDotClass(
                                    project.color
                                  )}
                                />
                                <span className="truncate font-medium text-[var(--text-primary)]">
                                  {project.name}
                                </span>
                              </div>

                              {hasActivity ? (
                                <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[0.65rem] font-medium text-accent-foreground">
                                  Active this week
                                </span>
                              ) : (
                                <span className="shrink-0 rounded-full bg-[var(--bg-surface)] px-2 py-0.5 text-[0.65rem] text-[var(--text-muted)]">
                                  No time this week
                                </span>
                              )}
                            </div>

                            <div className="mt-1 text-xs text-[var(--text-muted)]">
                              This week:{" "}
                              <span className="font-mono text-[var(--text-primary)]">
                                {formatDuration(stats.totalMs)}
                              </span>{" "}
                              · {stats.count} session
                              {stats.count !== 1 ? "s" : ""}
                            </div>
                          </div>

                          <form action={archiveProject} className="shrink-0">
                            <input type="hidden" name="id" value={project.id} />
                            <Button
                              type="submit"
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                            >
                              <Archive className="mr-1 h-3.5 w-3.5" />
                              Archive
                            </Button>
                          </form>
                        </div>

                        {/* Rename inline */}
                        <details className="mt-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2">
                          <summary className="cursor-pointer select-none text-[0.7rem] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                            <span className="inline-flex items-center gap-2">
                              <PencilLine className="h-3.5 w-3.5" />
                              Rename project
                            </span>
                          </summary>

                          <form
                            action={renameProject}
                            className="mt-2 flex flex-col gap-2 sm:flex-row"
                          >
                            <input type="hidden" name="id" value={project.id} />
                            <Input
                              name="name"
                              defaultValue={project.name}
                              className="h-9 border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-sm text-[var(--text-primary)]"
                            />
                            <Button
                              type="submit"
                              size="sm"
                              className="h-9 px-3 text-sm bg-[var(--accent-solid)] text-[var(--text-on-accent)] hover:brightness-110"
                            >
                              Save
                            </Button>
                          </form>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Archived projects */}
          <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <CardHeader className="flex items-baseline justify-between gap-2">
              <div>
                <CardTitle className="text-lg text-[var(--text-primary)]">
                  Archived projects
                </CardTitle>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {archivedProjects.length === 0
                    ? "Projects you archive will appear here."
                    : `${archivedProjects.length} archived project${
                        archivedProjects.length !== 1 ? "s" : ""
                      }`}
                </p>
              </div>
            </CardHeader>

            <CardContent>
              {archivedProjects.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">
                  No archived projects yet.
                </p>
              ) : (
                <ul className="space-y-2 text-sm text-[var(--text-primary)]">
                  {archivedProjects.map((project) => (
                    <li
                      key={project.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={getProjectColorDotClass(project.color)}
                        />
                        <span className="truncate">{project.name}</span>
                      </div>

                      <form action={unarchiveProject} className="shrink-0">
                        <input type="hidden" name="id" value={project.id} />
                        <Button
                          type="submit"
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                        >
                          Unarchive
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* LEFT column (create) second on mobile + sticky on desktop */}
        <div className="order-2 md:order-1 md:sticky md:top-[4.5rem] md:self-start">
          <Card className="border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <CardHeader>
              <CardTitle className="text-lg text-[var(--text-primary)]">
                New project
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="mb-4 text-sm text-[var(--text-muted)]">
                Create projects to group your focus sessions by client, product,
                or area of work.
              </p>

              <form action={createProject} className="space-y-4">
                <div>
                  <Label className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    Name
                  </Label>
                  <Input
                    name="name"
                    required
                    placeholder="Example: Client A – Backend"
                    className="h-10 border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-sm text-[var(--text-primary)]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                    Color
                  </Label>

                  {/* More consistent layout than flex-wrap */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {PROJECT_COLOR_KEYS.map((key) => (
                      <label key={key} className="cursor-pointer">
                        <input
                          type="radio"
                          name="color"
                          value={key}
                          defaultChecked={key === "slate"}
                          className="peer sr-only"
                        />
                        <div className="flex items-center gap-2 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2 py-2 text-[0.72rem] text-[var(--text-muted)] transition peer-checked:border-[var(--border-strong)] peer-checked:bg-[var(--bg-surface)] peer-checked:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]">
                          <span className={getProjectColorDotClass(key)} />
                          <span className="truncate">
                            {PROJECT_COLOR_LABELS[key]}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>

                  <p className="text-[0.7rem] text-[var(--text-muted)]">
                    Colors help you scan logs quickly. Use them for clients,
                    products, or work streams.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[var(--accent-solid)] text-[var(--text-on-accent)] text-sm font-medium hover:brightness-110"
                >
                  Create project
                </Button>

                {/* Roadmap blocks */}
                <div className="mt-4 space-y-2 text-xs text-[var(--text-muted)]">
                  <div className="pointer-events-none rounded-md border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-soft)]/60 p-3 opacity-60">
                    <div className="flex items-center justify-between">
                      <div className="text-[0.7rem] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                        Labels &amp; tags
                      </div>
                      <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1 text-[0.7rem] font-medium text-[var(--text-muted)]">
                        Roadmap
                      </span>
                    </div>
                    <p className="mt-1 text-[0.7rem] text-[var(--text-muted)]">
                      Light-weight tags and labels for grouping projects across
                      clients and themes will live here later.
                    </p>
                  </div>

                  <div className="pointer-events-none rounded-md border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface-soft)]/60 p-3 opacity-60">
                    <div className="flex items-center justify-between">
                      <div className="text-[0.7rem] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                        Budgets &amp; billing
                      </div>
                      <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-1 text-[0.7rem] font-medium text-[var(--text-muted)]">
                        Pro roadmap
                      </span>
                    </div>
                    <p className="mt-1 text-[0.7rem] text-[var(--text-muted)]">
                      Time budgets, hourly rates, and &quot;over/under&quot;
                      views will eventually plug into projects.
                    </p>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProjectsPage;
