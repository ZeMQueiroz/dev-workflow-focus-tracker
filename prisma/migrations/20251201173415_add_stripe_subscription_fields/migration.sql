/*
  Warnings:

  - A unique constraint covering the columns `[stripeCustomerId]` on the table `UserSettings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `UserSettings` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "isPro" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "proExpiresAt" TIMESTAMP(3),
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_stripeCustomerId_key" ON "UserSettings"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_stripeSubscriptionId_key" ON "UserSettings"("stripeSubscriptionId");
