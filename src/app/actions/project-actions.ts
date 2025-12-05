"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserEmail } from "@/lib/server-auth";

export const createProject = async (formData: FormData) => {
  const ownerEmail = await getCurrentUserEmail();
  if (!ownerEmail) return;

  const nameRaw = formData.get("name");
  const colorRaw = formData.get("color");

  const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
  if (!name) return;

  const color =
    typeof colorRaw === "string" && colorRaw.trim() ? colorRaw.trim() : null;

  await prisma.project.create({
    data: {
      name,
      ownerEmail,
      color,
    },
  });

  revalidatePath("/projects");
  revalidatePath("/today");
  revalidatePath("/week");
  revalidatePath("/summary");
};

export const archiveProject = async (formData: FormData) => {
  const ownerEmail = await getCurrentUserEmail();
  if (!ownerEmail) return;

  const idRaw = formData.get("id");
  if (!idRaw || typeof idRaw !== "string") return;

  const id = Number(idRaw);
  if (Number.isNaN(id)) return;

  await prisma.project.updateMany({
    where: { id, ownerEmail },
    data: { isArchived: true },
  });

  revalidatePath("/projects");

  revalidatePath("/week");
  revalidatePath("/summary");
};

export const unarchiveProject = async (formData: FormData) => {
  const ownerEmail = await getCurrentUserEmail();
  if (!ownerEmail) return;

  const idRaw = formData.get("id");
  if (!idRaw || typeof idRaw !== "string") return;

  const id = Number(idRaw);
  if (Number.isNaN(id)) return;

  await prisma.project.updateMany({
    where: { id, ownerEmail },
    data: { isArchived: false },
  });

  revalidatePath("/projects");
  revalidatePath("/today");
  revalidatePath("/week");
  revalidatePath("/summary");
};

export const renameProject = async (formData: FormData) => {
  const ownerEmail = await getCurrentUserEmail();
  if (!ownerEmail) return;

  const idRaw = formData.get("id");
  const nameRaw = formData.get("name");

  if (!idRaw || typeof idRaw !== "string") return;
  const id = Number(idRaw);
  if (Number.isNaN(id)) return;

  const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
  if (!name) return;

  await prisma.project.updateMany({
    where: { id, ownerEmail },
    data: { name },
  });

  revalidatePath("/projects");

  revalidatePath("/week");
  revalidatePath("/summary");
};
