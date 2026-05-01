-- AlterTable: add unique constraint on Player.name
CREATE UNIQUE INDEX "Player_name_key" ON "Player"("name");
