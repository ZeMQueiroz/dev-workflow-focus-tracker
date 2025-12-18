import { prisma } from "@/lib/prisma";
import { getWeekRange } from "@/lib/time";
import { getCurrentUserId } from "@/lib/server-auth";
import type { Prisma } from "@prisma/client";

const escapeCsv = (value: string | null | undefined) => {
  if (value == null) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

type SessionWithProject = Prisma.SessionGetPayload<{
  include: { project: true };
}>;

export const GET = async (request: Request) => {
  const userId = await getCurrentUserId();
  if (!userId) {
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

  const where: Prisma.SessionWhereInput = {
    ownerId: userId,
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
    include: { project: true },
    orderBy: { startTime: "asc" },
  });

  const header = [
    "date",
    "start_time",
    "end_time",
    "project",
    "intention",
    "notes",
    "duration_minutes",
  ];

  const rows = sessions.map((s) => {
    const date = s.startTime.toISOString().slice(0, 10);
    const startTime = s.startTime.toISOString();
    const endTime = s.endTime.toISOString();
    const durationMinutes = Math.round(s.durationMs / 60000);

    return [
      date,
      startTime,
      endTime,
      s.project.name,
      s.intention,
      s.notes ?? "",
      durationMinutes.toString(),
    ];
  });

  const lines = [
    header.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ];

  const csv = lines.join("\r\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="week.csv"',
    },
  });
};
