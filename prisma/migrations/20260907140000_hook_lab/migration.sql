
-- CreateEnum
CREATE TYPE "HookStrategy" AS ENUM ('QUESTION', 'CONTRARIAN', 'STORY', 'STAT', 'HOWTO', 'DIRECT');

-- CreateEnum
CREATE TYPE "HookSource" AS ENUM ('AI', 'MANUAL');

-- CreateTable
CREATE TABLE "HookLab" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "selectedCandidateId" TEXT,
    "lastGeneratedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HookLab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HookCandidate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "strategy" "HookStrategy" NOT NULL,
    "source" "HookSource" NOT NULL,
    "relevanceScore" INTEGER NOT NULL,
    "relevanceOverlap" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "clarityScore" INTEGER NOT NULL,
    "clarityGrade" TEXT NOT NULL,
    "clarityNotes" JSONB NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "warnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HookCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HookLab_ideaId_key" ON "HookLab"("ideaId");

-- CreateIndex
CREATE UNIQUE INDEX "HookLab_selectedCandidateId_key" ON "HookLab"("selectedCandidateId");

-- CreateIndex
CREATE INDEX "HookLab_userId_idx" ON "HookLab"("userId");

-- CreateIndex
CREATE INDEX "HookCandidate_labId_idx" ON "HookCandidate"("labId");

-- CreateIndex
CREATE INDEX "HookCandidate_userId_idx" ON "HookCandidate"("userId");

-- AddForeignKey
ALTER TABLE "HookLab" ADD CONSTRAINT "HookLab_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HookLab" ADD CONSTRAINT "HookLab_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "Idea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HookLab" ADD CONSTRAINT "HookLab_selectedCandidateId_fkey" FOREIGN KEY ("selectedCandidateId") REFERENCES "HookCandidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HookCandidate" ADD CONSTRAINT "HookCandidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HookCandidate" ADD CONSTRAINT "HookCandidate_labId_fkey" FOREIGN KEY ("labId") REFERENCES "HookLab"("id") ON DELETE CASCADE ON UPDATE CASCADE;

