-- Link a ContentDraft back to the Idea it was created from.
-- Additive only: one nullable column plus its unique index and foreign key.

-- AlterTable
ALTER TABLE "ContentDraft" ADD COLUMN "originIdeaId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ContentDraft_originIdeaId_key" ON "ContentDraft"("originIdeaId");

-- AddForeignKey
ALTER TABLE "ContentDraft" ADD CONSTRAINT "ContentDraft_originIdeaId_fkey" FOREIGN KEY ("originIdeaId") REFERENCES "Idea"("id") ON DELETE SET NULL ON UPDATE CASCADE;
