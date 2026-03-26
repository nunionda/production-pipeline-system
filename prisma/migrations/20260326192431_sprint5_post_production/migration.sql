-- CreateEnum
CREATE TYPE "EditStatus" AS ENUM ('ROUGH_CUT', 'FINE_CUT', 'PICTURE_LOCK', 'FINAL');

-- CreateEnum
CREATE TYPE "VFXStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'REVIEW', 'REVISION', 'APPROVED');

-- CreateEnum
CREATE TYPE "SoundTaskType" AS ENUM ('ADR', 'FOLEY', 'SFX', 'MUSIC', 'MIX', 'MASTER');

-- CreateEnum
CREATE TYPE "PostTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD');

-- CreateTable
CREATE TABLE "EditVersion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "editor" TEXT,
    "status" "EditStatus" NOT NULL DEFAULT 'ROUGH_CUT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EditVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VFXShot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "shotName" TEXT NOT NULL,
    "description" TEXT,
    "vendor" TEXT,
    "status" "VFXStatus" NOT NULL DEFAULT 'WAITING',
    "deadline" TIMESTAMP(3),
    "revisionCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VFXShot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoundTask" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "SoundTaskType" NOT NULL,
    "description" TEXT,
    "assignee" TEXT,
    "status" "PostTaskStatus" NOT NULL DEFAULT 'PENDING',
    "deadline" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SoundTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ColorGradingSession" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "colorist" TEXT,
    "status" "PostTaskStatus" NOT NULL DEFAULT 'PENDING',
    "sessionDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ColorGradingSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EditVersion" ADD CONSTRAINT "EditVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VFXShot" ADD CONSTRAINT "VFXShot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoundTask" ADD CONSTRAINT "SoundTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ColorGradingSession" ADD CONSTRAINT "ColorGradingSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
