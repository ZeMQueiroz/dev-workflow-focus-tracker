-- CreateTable
CREATE TABLE "UserSettings" (
    "id" SERIAL NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_ownerEmail_key" ON "UserSettings"("ownerEmail");
