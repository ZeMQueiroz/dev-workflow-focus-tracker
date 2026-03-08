-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeSubscriptionStatus" TEXT DEFAULT 'inactive';
