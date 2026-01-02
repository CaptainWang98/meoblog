/*
  Warnings:

  - You are about to drop the column `cachedUrl` on the `notion_images` table. All the data in the column will be lost.
  - You are about to drop the column `expiresAt` on the `notion_images` table. All the data in the column will be lost.
  - Added the required column `fileName` to the `notion_images` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastSyncedAt` to the `notion_images` table without a default value. This is not possible if the table is not empty.
  - Added the required column `localPath` to the `notion_images` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimeType` to the `notion_images` table without a default value. This is not possible if the table is not empty.
  - Added the required column `notionBlockId` to the `notion_images` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `notion_images` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_notion_images" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "notionBlockId" TEXT NOT NULL,
    "notionUrl" TEXT NOT NULL,
    "localPath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "articleId" INTEGER,
    "lastSyncedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "notion_images_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_notion_images" ("createdAt", "id", "notionUrl", "updatedAt") SELECT "createdAt", "id", "notionUrl", "updatedAt" FROM "notion_images";
DROP TABLE "notion_images";
ALTER TABLE "new_notion_images" RENAME TO "notion_images";
CREATE UNIQUE INDEX "notion_images_notionBlockId_key" ON "notion_images"("notionBlockId");
CREATE INDEX "notion_images_articleId_idx" ON "notion_images"("articleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
