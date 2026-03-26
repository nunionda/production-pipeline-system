-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "budgetLineId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallSheetShare" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "callSheetId" TEXT NOT NULL,
    "shootingDayId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallSheetShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallSheetConfirmation" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallSheetConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CallSheetShare_token_key" ON "CallSheetShare"("token");

-- CreateIndex
CREATE INDEX "CallSheetShare_token_idx" ON "CallSheetShare"("token");

-- CreateIndex
CREATE INDEX "CallSheetConfirmation_shareId_idx" ON "CallSheetConfirmation"("shareId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_budgetLineId_fkey" FOREIGN KEY ("budgetLineId") REFERENCES "BudgetLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallSheetShare" ADD CONSTRAINT "CallSheetShare_callSheetId_fkey" FOREIGN KEY ("callSheetId") REFERENCES "CallSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallSheetShare" ADD CONSTRAINT "CallSheetShare_shootingDayId_fkey" FOREIGN KEY ("shootingDayId") REFERENCES "ShootingDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallSheetConfirmation" ADD CONSTRAINT "CallSheetConfirmation_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "CallSheetShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;
