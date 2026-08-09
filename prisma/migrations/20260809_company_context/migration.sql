-- CreateTable: CompanyContextSession
CREATE TABLE "CompanyContextSession" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "summary" TEXT,
    "analysisSessionId" TEXT,
    CONSTRAINT "CompanyContextSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CompanyContextEntry
CREATE TABLE "CompanyContextEntry" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompanyContextEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyContextSession_analysisSessionId_key" ON "CompanyContextSession"("analysisSessionId");

-- AddForeignKey
ALTER TABLE "CompanyContextSession" ADD CONSTRAINT "CompanyContextSession_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyContextEntry" ADD CONSTRAINT "CompanyContextEntry_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "CompanyContextSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
