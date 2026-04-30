/*
  Warnings:

  - The values [DRAFT] on the enum `TournamentStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `endDate` on the `Tournament` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TournamentStatus_new" AS ENUM ('ACTIVE', 'COMPLETED');
ALTER TABLE "Tournament" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Tournament" ALTER COLUMN "status" TYPE "TournamentStatus_new" USING ("status"::text::"TournamentStatus_new");
ALTER TYPE "TournamentStatus" RENAME TO "TournamentStatus_old";
ALTER TYPE "TournamentStatus_new" RENAME TO "TournamentStatus";
DROP TYPE "TournamentStatus_old";
ALTER TABLE "Tournament" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "awayCas" INTEGER,
ADD COLUMN     "homeCas" INTEGER;

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "isVeteran" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Tournament" DROP COLUMN "endDate",
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
