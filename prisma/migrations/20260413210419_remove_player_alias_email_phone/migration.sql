/*
  Warnings:

  - You are about to drop the column `alias` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Player` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Player` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Player" DROP COLUMN "alias",
DROP COLUMN "email",
DROP COLUMN "phone";
