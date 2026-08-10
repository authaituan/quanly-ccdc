/**
 * Seeds AssetCategory with the taxonomy locked in by the user on 2026-08-10.
 * Run with: npx prisma db seed
 */
import { PrismaClient, AssetCategoryGroup } from '@prisma/client';

const prisma = new PrismaClient();

const categories: { code: string; name: string; group: AssetCategoryGroup; isRackable: boolean }[] = [
  // Thiết bị Mạng & Hạ tầng core
  { code: 'ROUTER', name: 'Router', group: 'NETWORK_INFRA', isRackable: true },
  { code: 'CORE_SWITCH', name: 'Core Switch', group: 'NETWORK_INFRA', isRackable: true },
  { code: 'ACCESS_SWITCH', name: 'Access Switch', group: 'NETWORK_INFRA', isRackable: true },
  { code: 'FIREWALL', name: 'Firewall', group: 'NETWORK_INFRA', isRackable: true },
  { code: 'LOAD_BALANCER', name: 'Load Balancer', group: 'NETWORK_INFRA', isRackable: true },
  { code: 'KVM_SWITCH', name: 'KVM Switch', group: 'NETWORK_INFRA', isRackable: true },

  // Máy chủ & Lưu trữ
  { code: 'SERVER_RACK', name: 'Server (Rack)', group: 'SERVER_STORAGE', isRackable: true },
  { code: 'SERVER_BLADE', name: 'Server (Blade)', group: 'SERVER_STORAGE', isRackable: true },
  { code: 'NAS', name: 'NAS', group: 'SERVER_STORAGE', isRackable: true },
  { code: 'SAN', name: 'SAN', group: 'SERVER_STORAGE', isRackable: true },
  { code: 'RACK_CABINET', name: 'Tủ Rack (Rack Cabinet)', group: 'SERVER_STORAGE', isRackable: false },
  { code: 'PDU', name: 'PDU (Nguồn tủ rack)', group: 'SERVER_STORAGE', isRackable: true },
  { code: 'UPS', name: 'UPS', group: 'SERVER_STORAGE', isRackable: true },

  // Thiết bị Đầu cuối
  { code: 'PC_DESKTOP', name: 'Máy tính để bàn (PC Desktop)', group: 'END_USER', isRackable: false },
  { code: 'LAPTOP', name: 'Laptop', group: 'END_USER', isRackable: false },
  { code: 'MONITOR', name: 'Màn hình', group: 'END_USER', isRackable: false },
  { code: 'PRINTER', name: 'Máy in', group: 'END_USER', isRackable: false },
  { code: 'SCANNER', name: 'Máy quét (Scanner)', group: 'END_USER', isRackable: false },
  { code: 'IP_PHONE', name: 'Điện thoại IP (IP Phone)', group: 'END_USER', isRackable: false },
  // Placeholder cho các dòng import từ Book1.xlsx thiếu "Loại máy" hoặc ghi
  // "Không có máy tính" nhưng vẫn có dữ liệu asset khác (IP...) - xem
  // backend/prisma/import-book1.ts. Người dùng tự phân loại lại sau.
  { code: 'UNCLASSIFIED', name: 'Chưa phân loại', group: 'END_USER', isRackable: false },

  // Thiết bị Giám sát & An ninh
  { code: 'NVR_DVR', name: 'NVR/DVR (Đầu ghi hình)', group: 'SURVEILLANCE_SECURITY', isRackable: true },
  { code: 'IP_CAMERA', name: 'IP Camera', group: 'SURVEILLANCE_SECURITY', isRackable: false },
  { code: 'ACCESS_CONTROL', name: 'Thiết bị Chấm công/Access Control', group: 'SURVEILLANCE_SECURITY', isRackable: false },

  // Thiết bị Phụ trợ & Vật tư CNTT
  { code: 'SFP_MODULE', name: 'Module SFP', group: 'AUXILIARY_CONSUMABLE', isRackable: false },
  { code: 'PATCH_CORD', name: 'Dây patch cord', group: 'AUXILIARY_CONSUMABLE', isRackable: false },
  { code: 'CONVERTER_QUANG', name: 'Converter quang', group: 'AUXILIARY_CONSUMABLE', isRackable: false },
  { code: 'NIC', name: 'Card mạng', group: 'AUXILIARY_CONSUMABLE', isRackable: false },
  { code: 'CABLE_REEL', name: 'Rulo cáp', group: 'AUXILIARY_CONSUMABLE', isRackable: false },
  { code: 'SPARE_PART', name: 'Linh kiện thay thế (RAM, SSD, PSU)', group: 'AUXILIARY_CONSUMABLE', isRackable: false },
];

async function main() {
  for (const c of categories) {
    await prisma.assetCategory.upsert({
      where: { code: c.code },
      update: { name: c.name, group: c.group, isRackable: c.isRackable },
      create: c,
    });
  }
  console.log(`Seeded ${categories.length} asset categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
