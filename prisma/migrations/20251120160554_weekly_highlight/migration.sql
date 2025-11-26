-- CreateTable
CREATE TABLE "WeeklyHighlight" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ownerEmail" TEXT NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "highlight" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyHighlight_ownerEmail_weekStart_key" ON "WeeklyHighlight"("ownerEmail", "weekStart");
