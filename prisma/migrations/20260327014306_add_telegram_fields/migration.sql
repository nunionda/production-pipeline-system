-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "telegramChatId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "telegramChatId" TEXT,
ADD COLUMN     "telegramLinkCode" TEXT;
