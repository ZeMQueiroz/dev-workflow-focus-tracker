// app/projects/page.tsx
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/server-auth";
import { getWeekRange, formatDuration } from "@/lib/time";

import { Button } from "@/components/ui/button";
import { InlineSignInButton } from "@/components/inline-sign-in-button";

import { CreateProjectDialog } from "@/components/create-project-dialog";
import {
  archiveProject,
  unarchiveProject,
  updateProject,
} from "../actions/project-actions";

import {
  getProjectColorDotClass,
  PROJECT_COLOR_KEYS,
} from "@/lib/project-colors";
import { PageContainer } from "@/components/page-container";

import {
  FolderKanban,
  Archive,
  PencilLine,
  Timer,
  Activity,
  ChevronDown,
  ArchiveRestore,
  AlertCircle,
} from "lucide-react";
import type { Project, Session } from "@prisma/client";

type ProjectsPageProps = {
  searchParams?: Promise<{ error?: string; name?: string }>;
};

const ProjectsPage = async ({ searchParams }: ProjectsPageProps) => {
  const userId = await getCurrentUserId();
  const sp = (await searchParams) ?? {};
  const error = sp.error;

  if (!userId) {
    return (
      <PageContainer variant='workspace'>
        <div className='w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-sm text-[var(--text-muted)]'>
          <h1 className='text-xl font-semibold text-[var(--text-primary)]'>
            Projects
          </h1>
          <p className='mt-2'>
            Please sign in with GitHub or Google using the button in the
            top-right to manage your projects.
          </p>
          <InlineSignInButton />
        </div>
      </PageContainer>
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

  // Sort: "touched this week" first, then by weekly time desc, then name
  const activeProjectsSorted = [...activeProjects].sort((a, b) => {
    const aCount = weeklyTotals[a.id]?.count ?? 0;
    const bCount = weeklyTotals[b.id]?.count ?? 0;
    if (aCount !== bCount) return bCount - aCount;

    const aMs = weeklyTotals[a.id]?.totalMs ?? 0;
    const bMs = weeklyTotals[b.id]?.totalMs ?? 0;
    if (aMs !== bMs) return bMs - aMs;

    return a.name.localeCompare(b.name);
  });

  const activeUsedThisWeek = activeProjects.filter(
    (p) => (weeklyTotals[p.id]?.count ?? 0) > 0,
  ).length;

  const activeTotalMs = activeProjects.reduce(
    (acc, p) => acc + (weeklyTotals[p.id]?.totalMs ?? 0),
    0,
  );

  return (
    <PageContainer variant='workspace'>
      <div className='w-full space-y-6'>
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* HERO OVERVIEW AREA                                             */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <header className='rounded-2xl border border-[var(--border-subtle)] bg-gradient-to-b from-[var(--bg-surface-soft)] to-[var(--bg-surface)] p-5 sm:p-6'>
          {/* Title row */}
          <div className='flex items-start justify-between gap-4'>
            <div>
              <h1 className='text-2xl font-semibold tracking-tight text-[var(--text-primary)]'>
                Projects
              </h1>
              <p className='mt-1 text-sm text-[var(--text-muted)]'>
                Keep your focus sessions organized by client, product, or
                workstream.
              </p>
            </div>
            <div className='shrink-0'>
              <CreateProjectDialog />
            </div>
          </div>

          {/* Stats row */}
          <div className='mt-5 grid grid-cols-3 gap-3'>
            <div className='rounded-xl bg-[var(--bg-surface)] p-3'>
              <div className='flex items-center gap-2 text-[var(--text-muted)]'>
                <FolderKanban className='h-3.5 w-3.5' />
                <span className='text-[0.65rem] font-medium uppercase tracking-wider'>
                  Active
                </span>
              </div>
              <div className='mt-1.5 text-xl font-semibold tabular-nums text-[var(--text-primary)]'>
                {activeProjects.length}
              </div>
            </div>

            <div className='rounded-xl bg-[var(--bg-surface)] p-3'>
              <div className='flex items-center gap-2 text-[var(--text-muted)]'>
                <Activity className='h-3.5 w-3.5' />
                <span className='text-[0.65rem] font-medium uppercase tracking-wider'>
                  This week
                </span>
              </div>
              <div className='mt-1.5 text-xl font-semibold tabular-nums text-[var(--text-primary)]'>
                {activeUsedThisWeek}
                <span className='ml-1 text-xs font-normal text-[var(--text-muted)]'>
                  touched
                </span>
              </div>
            </div>

            <div className='rounded-xl bg-[var(--bg-surface)] p-3'>
              <div className='flex items-center gap-2 text-[var(--text-muted)]'>
                <Timer className='h-3.5 w-3.5' />
                <span className='text-[0.65rem] font-medium uppercase tracking-wider'>
                  Time
                </span>
              </div>
              <div className='mt-1.5 font-mono text-lg font-semibold text-[var(--text-primary)]'>
                {formatDuration(activeTotalMs)}
              </div>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className='mt-4 flex items-start gap-2 rounded-lg bg-red-500/10 px-3 py-2.5 text-sm text-red-300'>
              <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' />
              <span>
                {error === "duplicate" ? (
                  <>
                    A project named{" "}
                    <span className='font-medium'>
                      {sp.name ? `"${sp.name}"` : "that"}
                    </span>{" "}
                    already exists. Choose a different name.
                  </>
                ) : error === "missing_name" ? (
                  <>Project name is required.</>
                ) : (
                  <>Something went wrong. Please try again.</>
                )}
              </span>
            </div>
          )}
        </header>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ACTIVE PROJECTS                                                */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section>
          <div className='mb-3 flex items-baseline justify-between px-1'>
            <h2 className='text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]'>
              Active projects
            </h2>
            <span className='text-[0.7rem] text-[var(--text-muted)]'>
              {activeProjects.length} project
              {activeProjects.length !== 1 ? "s" : ""}
            </span>
          </div>

          {activeProjectsSorted.length === 0 ? (
            <div className='rounded-xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center'>
              <FolderKanban className='mx-auto h-8 w-8 text-[var(--text-muted)] opacity-40' />
              <p className='mt-3 text-sm font-medium text-[var(--text-primary)]'>
                No projects yet
              </p>
              <p className='mt-1 max-w-xs mx-auto text-xs text-[var(--text-muted)]'>
                Every focus session belongs to a project. Create your first
                project to start tracking time.
              </p>
              <div className='mt-4'>
                <CreateProjectDialog />
              </div>
            </div>
          ) : (
            <div className='space-y-2'>
              {activeProjectsSorted.map((project) => {
                const stats = weeklyTotals[project.id] ?? {
                  totalMs: 0,
                  count: 0,
                };
                const hasActivity = stats.count > 0;

                return (
                  <div
                    key={project.id}
                    className='group rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] transition-colors hover:border-[var(--border-strong)]'
                  >
                    {/* Main row */}
                    <div className='flex items-center gap-3 px-4 py-3'>
                      {/* Color dot */}
                      <span
                        className={`${getProjectColorDotClass(project.color)} shrink-0`}
                      />

                      {/* Name + stats */}
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-center gap-2'>
                          <span className='truncate font-medium text-[var(--text-primary)]'>
                            {project.name}
                          </span>
                          {hasActivity && (
                            <span className='shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[0.6rem] font-medium text-[var(--accent-solid)]'>
                              Active
                            </span>
                          )}
                        </div>
                        <div className='mt-0.5 flex items-center gap-3 text-[0.7rem] text-[var(--text-muted)]'>
                          <span className='flex items-center gap-1'>
                            <Timer className='h-3 w-3' />
                            <span className='font-mono text-[var(--text-primary)]'>
                              {formatDuration(stats.totalMs)}
                            </span>
                          </span>
                          <span>
                            {stats.count} session{stats.count !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className='flex items-center gap-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100'>
                        {/* Rename — inline details toggle */}
                        <details className='relative'>
                          <summary className='flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-surface-soft)] hover:text-[var(--text-primary)] list-none [&::-webkit-details-marker]:hidden'>
                            <PencilLine className='h-3.5 w-3.5' />
                            <span className='sr-only'>Rename project</span>
                          </summary>

                          {/* Rename form — compact dropdown */}
                          <div className='absolute right-0 top-full z-10 mt-1 w-64 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 shadow-xl'>
                            <form
                              action={updateProject}
                              className='flex flex-col gap-3'
                            >
                              <input
                                type='hidden'
                                name='id'
                                value={project.id}
                              />
                              <div className='flex gap-2'>
                                <input
                                  name='name'
                                  defaultValue={project.name}
                                  className='h-8 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] px-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)]'
                                />
                                <Button
                                  type='submit'
                                  size='sm'
                                  className='h-8 shrink-0 bg-[var(--accent-solid)] px-3 text-xs text-[var(--text-on-accent)] hover:brightness-110'
                                >
                                  Save
                                </Button>
                              </div>
                              <div className='flex items-center gap-2 px-1'>
                                {PROJECT_COLOR_KEYS.map((c) => (
                                  <label
                                    key={c}
                                    className='relative flex cursor-pointer items-center justify-center'
                                    title={c}
                                  >
                                    <input
                                      type='radio'
                                      name='color'
                                      value={c}
                                      defaultChecked={
                                        (project.color || "slate") === c
                                      }
                                      className='peer sr-only'
                                    />
                                    <span
                                      className={`${getProjectColorDotClass(c)} ring-offset-[var(--bg-surface)] transition-all peer-checked:ring-2 peer-checked:ring-[var(--text-primary)] peer-checked:ring-offset-2 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--text-primary)] peer-focus-visible:ring-offset-2`}
                                    />
                                  </label>
                                ))}
                              </div>
                            </form>
                          </div>
                        </details>

                        {/* Archive */}
                        <form action={archiveProject}>
                          <input type='hidden' name='id' value={project.id} />
                          <button
                            type='submit'
                            className='flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-surface-soft)] hover:text-[var(--text-primary)]'
                            title='Archive project'
                          >
                            <Archive className='h-3.5 w-3.5' />
                            <span className='sr-only'>Archive</span>
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ARCHIVED PROJECTS — lightweight collapsible section            */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {archivedProjects.length > 0 && (
          <section>
            <details className='group'>
              <summary className='flex cursor-pointer items-center gap-2 px-1 py-2 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] select-none list-none [&::-webkit-details-marker]:hidden hover:text-[var(--text-primary)] transition-colors'>
                <ChevronDown className='h-3.5 w-3.5 transition-transform group-open:rotate-180' />
                <Archive className='h-3.5 w-3.5' />
                Archived
                <span className='ml-1 rounded-full bg-[var(--bg-surface-soft)] px-2 py-0.5 text-[0.65rem] tabular-nums'>
                  {archivedProjects.length}
                </span>
              </summary>

              <div className='mt-2 space-y-1.5'>
                {archivedProjects.map((project) => (
                  <div
                    key={project.id}
                    className='group/archived flex items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2.5 transition-colors hover:border-[var(--border-strong)]'
                  >
                    <div className='flex min-w-0 items-center gap-2'>
                      <span
                        className={`${getProjectColorDotClass(project.color)} opacity-50`}
                      />
                      <span className='truncate text-sm text-[var(--text-muted)]'>
                        {project.name}
                      </span>
                    </div>

                    <form action={unarchiveProject} className='shrink-0'>
                      <input type='hidden' name='id' value={project.id} />
                      <button
                        type='submit'
                        className='flex items-center gap-1.5 rounded-lg px-2 py-1 text-[0.7rem] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-surface-soft)] hover:text-[var(--text-primary)] opacity-0 group-hover/archived:opacity-100 focus:opacity-100'
                      >
                        <ArchiveRestore className='h-3 w-3' />
                        Restore
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </details>
          </section>
        )}
      </div>
    </PageContainer>
  );
};

export default ProjectsPage;
