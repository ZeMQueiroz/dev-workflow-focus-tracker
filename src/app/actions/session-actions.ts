"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/server-auth";

export const createSession = async (formData: FormData) => {
  const userId = await getCurrentUserId();
  if (!userId) return; // not signed in → no-op

  const projectIdRaw = formData.get("projectId");
  const intentionRaw = formData.get("intention");
  const durationMinutesRaw = formData.get("durationMinutes");
  const notesRaw = formData.get("notes");

  if (!projectIdRaw || typeof projectIdRaw !== "string") return;
  const projectId = Number(projectIdRaw);
  if (Number.isNaN(projectId)) return;

  if (!intentionRaw || typeof intentionRaw !== "string" || !intentionRaw.trim())
    return;

  const durationMinutes = durationMinutesRaw ? Number(durationMinutesRaw) : 0;
  const safeDurationMinutes = Number.isFinite(durationMinutes)
    ? Math.max(0, durationMinutes)
    : 0;

  const durationMs = safeDurationMinutes * 60 * 1000;
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - durationMs);

  const notes =
    typeof notesRaw === "string" && notesRaw.trim().length > 0
      ? notesRaw.trim()
      : null;

  // Safety: ensure project belongs to this user
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: userId,
    },
    select: { id: true },
  });

  if (!project) return;

  await prisma.session.create({
    data: {
      projectId: project.id,
      intention: intentionRaw.trim(),
      notes,
      startTime,
      endTime,
      durationMs,
      ownerId: userId,
    },
  });

  revalidatePath("/today");
  revalidatePath("/week");
  revalidatePath("/summary");
};

export const deleteSession = async (formData: FormData) => {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const idRaw = formData.get("id");
  if (!idRaw || typeof idRaw !== "string") return;

  const id = Number(idRaw);
  if (Number.isNaN(id)) return;

  await prisma.session.deleteMany({
    where: {
      id,
      ownerId: userId,
    },
  });

  revalidatePath("/today");
  revalidatePath("/week");
  revalidatePath("/summary");
};

export const updateSession = async (formData: FormData) => {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const idRaw = formData.get("id");
  const intentionRaw = formData.get("intention");
  const durationMinutesRaw = formData.get("durationMinutes");
  const notesRaw = formData.get("notes");

  if (!idRaw || typeof idRaw !== "string") return;
  const id = Number(idRaw);
  if (Number.isNaN(id)) return;

  if (!intentionRaw || typeof intentionRaw !== "string" || !intentionRaw.trim())
    return;

  const durationMinutes = durationMinutesRaw ? Number(durationMinutesRaw) : 0;
  const safeDurationMinutes = Number.isFinite(durationMinutes)
    ? Math.max(1, durationMinutes)
    : 1;

  const durationMs = safeDurationMinutes * 60 * 1000;

  const session = await prisma.session.findFirst({
    where: {
      id,
      ownerId: userId,
    },
    select: { id: true, endTime: true },
  });

  if (!session) return;

  const notes =
    typeof notesRaw === "string" && notesRaw.trim().length > 0
      ? notesRaw.trim()
      : null;

  const endTime = session.endTime;
  const startTime = new Date(endTime.getTime() - durationMs);

  await prisma.session.update({
    where: { id },
    data: {
      intention: intentionRaw.trim(),
      durationMs,
      startTime,
      notes,
    },
  });

  revalidatePath("/today");
  revalidatePath("/week");
  revalidatePath("/summary");
};
