/*
  Warnings:

  - You are about to drop the `Chat` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_roomId_fkey";

-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_userId_fkey";

-- DropTable
DROP TABLE "Chat";

-- CreateTable
CREATE TABLE "Shape" (
    "id" TEXT NOT NULL,
    "roomId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "angle" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "strokeColor" TEXT NOT NULL DEFAULT '#1e1e1e',
    "backgroundColor" TEXT NOT NULL DEFAULT 'transparent',
    "strokeWidth" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "strokeStyle" TEXT NOT NULL DEFAULT 'solid',
    "fillStyle" TEXT NOT NULL DEFAULT 'hachure',
    "opacity" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "points" JSONB,
    "text" TEXT,
    "fontSize" DOUBLE PRECISION,
    "fontFamily" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shape_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Shape_roomId_idx" ON "Shape"("roomId");

-- AddForeignKey
ALTER TABLE "Shape" ADD CONSTRAINT "Shape_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shape" ADD CONSTRAINT "Shape_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
