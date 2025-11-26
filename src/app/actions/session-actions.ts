"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserEmail } from "@/lib/server-auth";

export const createSession = async (formData: FormData) => {
  const ownerEmail = await getCurrentUserEmail();
  if (!ownerEmail) return; // not signed in → no-op

  const projectId = formData.get("projectId");
  const intention = formData.get("intention");
  const durationMinutesRaw = formData.get("durationMinutes");
  const notesRaw = formData.get("notes");

  if (!projectId || typeof projectId !== "string") return;
  if (!intention || typeof intention !== "string" || !intention.trim()) return;

  const durationMinutes = durationMinutesRaw ? Number(durationMinutesRaw) : 0;

  const safeDurationMinutes = isNaN(durationMinutes)
    ? 0
    : Math.max(0, durationMinutes);

  const durationMs = safeDurationMinutes * 60 * 1000;
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - durationMs);

  const notes =
    typeof notesRaw === "string" && notesRaw.trim().length > 0
      ? notesRaw.trim()
      : null;

  // Optional safety: ensure project belongs to this user
  const project = await prisma.project.findFirst({
    where: {
      id: Number(projectId),
      OR: [
        { ownerEmail },          // owned by this user
        { ownerEmail: null },    // legacy rows without owner; you can drop this later
      ],
    },
  });

  if (!project) return;

  await prisma.session.create({
    data: {
      projectId: project.id,
      intention: intention.trim(),
      notes,
      startTime,
      endTime,
      durationMs,
      ownerEmail,
    },
  });

  revalidatePath("/");
  revalidatePath("/week");
  revalidatePath("/summary");
};

export const deleteSession = async (formData: FormData) => {
  const ownerEmail = await getCurrentUserEmail();
  if (!ownerEmail) return;

  const id = formData.get("id");
  if (!id || typeof id !== "string") return;

  const numericId = Number(id);
  if (Number.isNaN(numericId)) return;

  // Ensure you only delete your own sessions
  await prisma.session.deleteMany({
    where: {
      id: numericId,
      ownerEmail,
    },
  });

  revalidatePath("/");
  revalidatePath("/week");
  revalidatePath("/summary");
};

export const updateSession = async (formData: FormData) => {
  const ownerEmail = await getCurrentUserEmail();
  if (!ownerEmail) return;

  const idRaw = formData.get("id");
  const intention = formData.get("intention");
  const durationMinutesRaw = formData.get("durationMinutes");
  const notesRaw = formData.get("notes");

  if (!idRaw || typeof idRaw !== "string") return;
  const id = Number(idRaw);
  if (Number.isNaN(id)) return;

  if (!intention || typeof intention !== "string" || !intention.trim()) return;

  const durationMinutes = durationMinutesRaw ? Number(durationMinutesRaw) : 0;
  const safeDurationMinutes = Number.isFinite(durationMinutes)
    ? Math.max(1, durationMinutes)
    : 1;

  const durationMs = safeDurationMinutes * 60 * 1000;

  const session = await prisma.session.findFirst({
    where: {
      id,
      ownerEmail,
    },
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
      intention: intention.trim(),
      durationMs,
      startTime,
      notes,
    },
  });

  revalidatePath("/");
  revalidatePath("/week");
  revalidatePath("/summary");
};
