-- CreateTable
CREATE TABLE "articles" (
    "id" SERIAL NOT NULL,
    "notionPageId" TEXT,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'mdx',
    "image" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readTime" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notionLastEditedAt" TIMESTAMP(3),

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notion_images" (
    "id" SERIAL NOT NULL,
    "notionBlockId" TEXT NOT NULL,
    "notionUrl" TEXT NOT NULL,
    "localPath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "articleId" INTEGER,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notion_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "articles_notionPageId_key" ON "articles"("notionPageId");

-- CreateIndex
CREATE UNIQUE INDEX "notion_images_notionBlockId_key" ON "notion_images"("notionBlockId");

-- CreateIndex
CREATE INDEX "notion_images_articleId_idx" ON "notion_images"("articleId");

-- AddForeignKey
ALTER TABLE "notion_images" ADD CONSTRAINT "notion_images_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
