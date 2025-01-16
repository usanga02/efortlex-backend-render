-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ApartmentsToTenant" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_userId_key" ON "tenants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "_ApartmentsToTenant_AB_unique" ON "_ApartmentsToTenant"("A", "B");

-- CreateIndex
CREATE INDEX "_ApartmentsToTenant_B_index" ON "_ApartmentsToTenant"("B");

-- AddForeignKey
ALTER TABLE "_ApartmentsToTenant" ADD CONSTRAINT "_ApartmentsToTenant_A_fkey" FOREIGN KEY ("A") REFERENCES "apartments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApartmentsToTenant" ADD CONSTRAINT "_ApartmentsToTenant_B_fkey" FOREIGN KEY ("B") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
