-- CreateEnum
CREATE TYPE "QCStatus" AS ENUM ('IN_PROGRESS', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "MasterFileStatus" AS ENUM ('CREATING', 'COMPLETED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "DeliveryTargetType" AS ENUM ('BROADCAST', 'OTT', 'DISTRIBUTOR', 'INTERNATIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "DeliveryTargetStatus" AS ENUM ('PENDING', 'DELIVERED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "QCReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" "QCStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "issues" JSONB,
    "technicalSpecs" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QCReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterFile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "resolution" TEXT,
    "codec" TEXT,
    "duration" TEXT,
    "fileSize" TEXT,
    "status" "MasterFileStatus" NOT NULL DEFAULT 'CREATING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MasterFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryTarget" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "type" "DeliveryTargetType" NOT NULL,
    "format" TEXT,
    "deadline" TIMESTAMP(3),
    "status" "DeliveryTargetStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryTarget_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "QCReport" ADD CONSTRAINT "QCReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterFile" ADD CONSTRAINT "MasterFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTarget" ADD CONSTRAINT "DeliveryTarget_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
