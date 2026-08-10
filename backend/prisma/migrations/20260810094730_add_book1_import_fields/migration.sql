-- AlterTable
ALTER TABLE "it_assets" ADD COLUMN     "currentUser" TEXT;

-- AlterTable
ALTER TABLE "sites" ADD COLUMN     "centralWardName" TEXT,
ADD COLUMN     "pointType" TEXT,
ADD COLUMN     "provinceCode" TEXT,
ADD COLUMN     "provinceName" TEXT,
ADD COLUMN     "regionCode" TEXT,
ADD COLUMN     "wardCode" TEXT,
ADD COLUMN     "wardName" TEXT;
