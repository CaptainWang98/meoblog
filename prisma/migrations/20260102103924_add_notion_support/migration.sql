-- CreateTable
CREATE TABLE "notion_images" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "notionUrl" TEXT NOT NULL,
    "cachedUrl" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_articles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "notionPageId" TEXT,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'mdx',
    "image" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readTime" INTEGER NOT NULL DEFAULT 5,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "notionLastEditedAt" DATETIME
);
INSERT INTO "new_articles" ("content", "createdAt", "date", "excerpt", "id", "image", "readTime", "title", "updatedAt") SELECT "content", "createdAt", "date", "excerpt", "id", "image", "readTime", "title", "updatedAt" FROM "articles";
DROP TABLE "articles";
ALTER TABLE "new_articles" RENAME TO "articles";
CREATE UNIQUE INDEX "articles_notionPageId_key" ON "articles"("notionPageId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "notion_images_notionUrl_key" ON "notion_images"("notionUrl");
