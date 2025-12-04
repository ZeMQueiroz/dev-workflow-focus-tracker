// src/app/api/exports/week/json/route.ts
import { prisma } from "@/lib/prisma";
import { getWeekRange } from "@/lib/time";
import { getCurrentUserEmail } from "@/lib/server-auth";
import type { Prisma } from "@prisma/client";

// Add a type for the included relation
type SessionWithProject = Prisma.SessionGetPayload<{
  include: { project: true };
}>;

export const GET = async (request: Request) => {
  const ownerEmail = await getCurrentUserEmail();
  if (!ownerEmail) {
    return new Response("Not authenticated", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const offsetParam = searchParams.get("offset");
  const projectIdParam = searchParams.get("projectId");

  const weekOffset = offsetParam ? Number(offsetParam) || 0 : 0;
  const projectId =
    projectIdParam && !Number.isNaN(Number(projectIdParam))
      ? Number(projectIdParam)
      : null;

  const { start, end } = getWeekRange(weekOffset);

  // Use Prisma's generated type instead of the Parameters<> trick
  const where: Prisma.SessionWhereInput = {
    ownerEmail,
    startTime: {
      gte: start,
      lt: end,
    },
  };

  if (projectId !== null) {
    where.projectId = projectId;
  }

  const sessions: SessionWithProject[] = await prisma.session.findMany({
    where,
    include: {
      project: true,
    },
    orderBy: {
      startTime: "asc",
    },
  });

  const result = sessions.map((s) => ({
    id: s.id,
    date: s.startTime.toISOString().slice(0, 10),
    startTime: s.startTime.toISOString(),
    endTime: s.endTime.toISOString(),
    durationMs: s.durationMs,
    durationMinutes: Math.round(s.durationMs / 60000),
    projectId: s.projectId,
    projectName: s.project?.name ?? "",
    intention: s.intention,
    notes: s.notes,
    createdAt: s.createdAt.toISOString(),
  }));

  return new Response(JSON.stringify(result, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="week.json"',
    },
  });
};
