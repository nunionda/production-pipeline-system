-- CreateEnum
CREATE TYPE "FieldChangeType" AS ENUM ('DIALOGUE', 'BLOCKING', 'PROP', 'SCENE_ADD', 'SCENE_DELETE', 'OTHER');

-- CreateEnum
CREATE TYPE "AssetLogStatus" AS ENUM ('READY', 'IN_USE', 'DAMAGED', 'LOST');

-- CreateTable
CREATE TABLE "FieldChange" (
    "id" TEXT NOT NULL,
    "shootingDayId" TEXT NOT NULL,
    "sceneId" TEXT,
    "changeType" "FieldChangeType" NOT NULL,
    "description" TEXT NOT NULL,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyAssetLog" (
    "id" TEXT NOT NULL,
    "shootingDayId" TEXT NOT NULL,
    "propId" TEXT,
    "costumeId" TEXT,
    "assetStatus" "AssetLogStatus" NOT NULL DEFAULT 'READY',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyAssetLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FieldChange" ADD CONSTRAINT "FieldChange_shootingDayId_fkey" FOREIGN KEY ("shootingDayId") REFERENCES "ShootingDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldChange" ADD CONSTRAINT "FieldChange_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAssetLog" ADD CONSTRAINT "DailyAssetLog_shootingDayId_fkey" FOREIGN KEY ("shootingDayId") REFERENCES "ShootingDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAssetLog" ADD CONSTRAINT "DailyAssetLog_propId_fkey" FOREIGN KEY ("propId") REFERENCES "Prop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAssetLog" ADD CONSTRAINT "DailyAssetLog_costumeId_fkey" FOREIGN KEY ("costumeId") REFERENCES "Costume"("id") ON DELETE SET NULL ON UPDATE CASCADE;
