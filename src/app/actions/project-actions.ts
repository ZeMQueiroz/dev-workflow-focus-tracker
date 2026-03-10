"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/server-auth";
import { redirect } from "next/navigation";

const normalizeName = (value: unknown) => {
  const s = typeof value === "string" ? value : "";
  // trim + collapse internal whitespace
  return s.trim().replace(/\s+/g, " ");
};

const normalizeColor = (value: unknown) => {
  const s = typeof value === "string" ? value.trim() : "";
  // keep your schema as String? (nullable) — null means "default"
  return s ? s : null;
};

// Centralized revalidation so we don't forget routes
const revalidateAll = () => {
  revalidatePath("/projects");
  revalidatePath("/today");
  revalidatePath("/week");
  revalidatePath("/summary");
};

export const createProject = async (formData: FormData) => {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/api/auth/signin");

  const name = normalizeName(formData.get("name"));
  const color = normalizeColor(formData.get("color"));

  if (!name) redirect("/projects?error=missing_name");

  // Prevent duplicates per user (case-insensitive)
  const existing = await prisma.project.findFirst({
    where: {
      ownerId: userId,
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (existing) {
    redirect(`/projects?error=duplicate&name=${encodeURIComponent(name)}`);
  }

  await prisma.project.create({
    data: {
      name,
      ownerId: userId,
      color,
    },
  });

  revalidateAll();
  redirect("/projects");
};

export const archiveProject = async (formData: FormData) => {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/api/auth/signin");

  const idRaw = formData.get("id");
  if (!idRaw || typeof idRaw !== "string") return;

  const id = Number(idRaw);
  if (Number.isNaN(id)) return;

  await prisma.project.updateMany({
    where: { id, ownerId: userId },
    data: { isArchived: true },
  });

  revalidatePath("/projects");
  revalidatePath("/week");
  revalidatePath("/summary");

  // optional: keep user on projects page
  redirect("/projects");
};

export const unarchiveProject = async (formData: FormData) => {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/api/auth/signin");

  const idRaw = formData.get("id");
  if (!idRaw || typeof idRaw !== "string") return;

  const id = Number(idRaw);
  if (Number.isNaN(id)) return;

  await prisma.project.updateMany({
    where: { id, ownerId: userId },
    data: { isArchived: false },
  });

  revalidateAll();
  redirect("/projects");
};

export const updateProject = async (formData: FormData) => {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/api/auth/signin");

  const idRaw = formData.get("id");
  if (!idRaw || typeof idRaw !== "string") return;
  const id = Number(idRaw);
  if (Number.isNaN(id)) return;

  const name = normalizeName(formData.get("name"));
  const color = normalizeColor(formData.get("color"));
  if (!name) redirect("/projects?error=missing_name");

  // Prevent duplicates per user (case-insensitive), excluding the project being renamed
  const existing = await prisma.project.findFirst({
    where: {
      ownerId: userId,
      id: { not: id },
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (existing) {
    redirect(`/projects?error=duplicate&name=${encodeURIComponent(name)}`);
  }

  await prisma.project.updateMany({
    where: { id, ownerId: userId },
    data: { name, color },
  });

  revalidatePath("/projects");
  revalidatePath("/week");
  revalidatePath("/summary");

  redirect("/projects");
};
