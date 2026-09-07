-- CreateEnum
CREATE TYPE "ResearchRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SignalKind" AS ENUM ('CHANGE', 'RECURRING', 'UNUSUAL', 'RISING', 'GAP');

-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('DIRECT', 'INFERENCE');

-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'ARCHIVED');

-- CreateTable
CREATE TABLE "ResearchRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" "ResearchRunStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "sourceCount" INTEGER NOT NULL DEFAULT 0,
    "clusterCount" INTEGER NOT NULL DEFAULT 0,
    "signalCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ResearchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "clusterId" TEXT,
    "canonicalUrl" TEXT NOT NULL,
    "urlHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publisher" TEXT,
    "author" TEXT,
    "publishedAt" TIMESTAMP(3),
    "excerpt" TEXT NOT NULL DEFAULT '',
    "provider" TEXT NOT NULL,
    "providerSourceId" TEXT,
    "relevanceScore" INTEGER,
    "relevanceReasons" JSONB,
    "metadata" JSONB,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryCluster" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "size" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryCluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "clusterId" TEXT,
    "kind" "SignalKind" NOT NULL,
    "evidenceKind" "EvidenceKind" NOT NULL DEFAULT 'DIRECT',
    "summary" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "sourceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relevanceScore" INTEGER,
    "relevanceReasons" JSONB,
    "savedIdeaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Idea" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "angle" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "sourceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "IdeaStatus" NOT NULL DEFAULT 'NEW',
    "origin" TEXT NOT NULL DEFAULT 'research',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResearchRun_userId_createdAt_idx" ON "ResearchRun"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ResearchRun_userId_status_idx" ON "ResearchRun"("userId", "status");

-- CreateIndex
CREATE INDEX "ResearchSource_userId_createdAt_idx" ON "ResearchSource"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ResearchSource_runId_idx" ON "ResearchSource"("runId");

-- CreateIndex
CREATE INDEX "ResearchSource_clusterId_idx" ON "ResearchSource"("clusterId");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchSource_runId_urlHash_key" ON "ResearchSource"("runId", "urlHash");

-- CreateIndex
CREATE INDEX "StoryCluster_userId_idx" ON "StoryCluster"("userId");

-- CreateIndex
CREATE INDEX "StoryCluster_runId_idx" ON "StoryCluster"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "Signal_savedIdeaId_key" ON "Signal"("savedIdeaId");

-- CreateIndex
CREATE INDEX "Signal_userId_idx" ON "Signal"("userId");

-- CreateIndex
CREATE INDEX "Signal_runId_idx" ON "Signal"("runId");

-- CreateIndex
CREATE INDEX "Signal_clusterId_idx" ON "Signal"("clusterId");

-- CreateIndex
CREATE INDEX "Idea_userId_createdAt_idx" ON "Idea"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Idea_userId_status_idx" ON "Idea"("userId", "status");

-- AddForeignKey
ALTER TABLE "ResearchRun" ADD CONSTRAINT "ResearchRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchSource" ADD CONSTRAINT "ResearchSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchSource" ADD CONSTRAINT "ResearchSource_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ResearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchSource" ADD CONSTRAINT "ResearchSource_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "StoryCluster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryCluster" ADD CONSTRAINT "StoryCluster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryCluster" ADD CONSTRAINT "StoryCluster_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ResearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ResearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "StoryCluster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_savedIdeaId_fkey" FOREIGN KEY ("savedIdeaId") REFERENCES "Idea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
