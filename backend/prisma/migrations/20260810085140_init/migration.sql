-- CreateEnum
CREATE TYPE "AssetCategoryGroup" AS ENUM ('NETWORK_INFRA', 'SERVER_STORAGE', 'END_USER', 'SURVEILLANCE_SECURITY', 'AUXILIARY_CONSUMABLE');

-- CreateEnum
CREATE TYPE "OperatingStatus" AS ENUM ('IN_STOCK', 'PRODUCTION', 'MAINTENANCE', 'FAULTY', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "OwnershipStatus" AS ENUM ('OWNED', 'LEASED', 'BORROWED_POC');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'RETURNED', 'OFFBOARDING');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('UPGRADE', 'REPAIR', 'PREVENTIVE', 'VENDOR_WARRANTY', 'REIMAGE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('IT_ADMIN', 'ACCOUNTANT', 'WAREHOUSE_MANAGER', 'STAFF');

-- CreateTable
CREATE TABLE "asset_categories" (
    "id" TEXT NOT NULL,
    "group" "AssetCategoryGroup" NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isRackable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "regionName" TEXT,
    "hasServerRoom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rack_cabinets" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalUSize" INTEGER NOT NULL DEFAULT 42,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rack_cabinets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rack_placements" (
    "id" TEXT NOT NULL,
    "rackCabinetId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "startUPosition" INTEGER NOT NULL,
    "uSizeOccupied" INTEGER NOT NULL,
    "pduOutletLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rack_placements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "it_assets" (
    "id" TEXT NOT NULL,
    "assetTag" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "siteId" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "specs" JSONB,
    "ipAddress" TEXT,
    "macAddress" TEXT,
    "operatingStatus" "OperatingStatus" NOT NULL DEFAULT 'IN_STOCK',
    "ownershipStatus" "OwnershipStatus" NOT NULL DEFAULT 'OWNED',
    "warrantyExpiresAt" TIMESTAMP(3),
    "supportExpiresAt" TIMESTAMP(3),
    "purchaseDate" TIMESTAMP(3),
    "purchaseCost" DECIMAL(14,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "it_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "siteId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "employeeCode" TEXT,
    "departmentId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enduser_assignments" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "employeeId" TEXT,
    "departmentId" TEXT,
    "handoverDate" TIMESTAMP(3) NOT NULL,
    "expectedReturnDate" TIMESTAMP(3),
    "actualReturnDate" TIMESTAMP(3),
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "handoverChecklist" JSONB,
    "employeeConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enduser_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "it_maintenance_logs" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "description" TEXT NOT NULL,
    "supportProvider" TEXT,
    "cost" DECIMAL(14,2),
    "ticketRef" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "it_maintenance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "software_licenses_link" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "softwareName" TEXT NOT NULL,
    "licenseKey" TEXT,
    "activatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "software_licenses_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "network_access_credentials" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "vpnUsername" TEXT,
    "vpnPasswordEncrypted" TEXT,
    "fortiClientUsername" TEXT,
    "fortiClientPasswordEncrypted" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "network_access_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "asset_categories_code_key" ON "asset_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sites_code_key" ON "sites"("code");

-- CreateIndex
CREATE UNIQUE INDEX "rack_cabinets_siteId_name_key" ON "rack_cabinets"("siteId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "rack_placements_assetId_key" ON "rack_placements"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "it_assets_assetTag_key" ON "it_assets"("assetTag");

-- CreateIndex
CREATE UNIQUE INDEX "it_assets_serialNumber_key" ON "it_assets"("serialNumber");

-- CreateIndex
CREATE INDEX "it_assets_categoryId_idx" ON "it_assets"("categoryId");

-- CreateIndex
CREATE INDEX "it_assets_siteId_idx" ON "it_assets"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeCode_key" ON "employees"("employeeCode");

-- CreateIndex
CREATE INDEX "enduser_assignments_assetId_idx" ON "enduser_assignments"("assetId");

-- CreateIndex
CREATE INDEX "enduser_assignments_employeeId_idx" ON "enduser_assignments"("employeeId");

-- CreateIndex
CREATE INDEX "it_maintenance_logs_assetId_idx" ON "it_maintenance_logs"("assetId");

-- CreateIndex
CREATE INDEX "software_licenses_link_assetId_idx" ON "software_licenses_link"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "network_access_credentials_assetId_key" ON "network_access_credentials"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "rack_cabinets" ADD CONSTRAINT "rack_cabinets_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rack_placements" ADD CONSTRAINT "rack_placements_rackCabinetId_fkey" FOREIGN KEY ("rackCabinetId") REFERENCES "rack_cabinets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rack_placements" ADD CONSTRAINT "rack_placements_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "it_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_assets" ADD CONSTRAINT "it_assets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "asset_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_assets" ADD CONSTRAINT "it_assets_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enduser_assignments" ADD CONSTRAINT "enduser_assignments_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "it_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enduser_assignments" ADD CONSTRAINT "enduser_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enduser_assignments" ADD CONSTRAINT "enduser_assignments_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "it_maintenance_logs" ADD CONSTRAINT "it_maintenance_logs_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "it_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "software_licenses_link" ADD CONSTRAINT "software_licenses_link_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "it_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "network_access_credentials" ADD CONSTRAINT "network_access_credentials_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "it_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
