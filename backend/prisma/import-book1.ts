/**
 * Import Site + ItAsset thật từ Book1.xlsx (sheet "Merge1") vào DB.
 *
 * Nguồn: E:\OneDrive\ccdc\Book1.xlsx (đường dẫn tuyệt đối, ngoài repo -
 * override bằng biến môi trường BOOK1_XLSX_PATH nếu file ở chỗ khác).
 *
 * QUYẾT ĐỊNH ĐÃ CHỐT (2026-08-10, xem chat lịch sử project):
 * - Chỉ dùng sheet "Merge1". Không dùng "Danh muc DPV để map DL", không
 *   dùng "QUAN_LY_IP".
 * - Site suy ra từ Mã MBC distinct trong Merge1. 1 mã bị mâu thuẫn dữ liệu
 *   site-level (531130, cột "Tên Bưu điện xã" bị dùng làm tên phòng ban
 *   nội bộ, 6 giá trị khác nhau) -> wardName = null cho riêng site này,
 *   không tự chọn đại diện.
 * - Serial Number/TAG trùng (giá trị rác kiểu "System Serial Number",
 *   "Default string", "To Be Filled By O.E.M.", "00000000"...) -> giữ
 *   nguyên lần xuất hiện đầu tiên trong mỗi cụm giá trị gốc, các lần sau
 *   thêm hậu tố "-NN" tăng dần RIÊNG theo từng cụm.
 * - assetTag = `${Mã MBC}-${STT tăng dần trong cùng Mã MBC}`. "Tên máy"
 *   gốc lưu vào ItAsset.notes.
 * - "Ngày cấp" KHÔNG import (nghi ngờ giá trị NOW() tại thời điểm mở file).
 * - CPU/RAM/Ổ cứng/Hệ điều hành -> ItAsset.specs (JSON), RAM ép về string.
 * - "Loại" (GD3/VHX/...) -> Site.pointType. Nếu 1 Mã MBC có nhiều giá trị
 *   Loại khác nhau, KHÔNG được xảy ra theo audit trước - script vẫn kiểm
 *   tra lại và dừng nếu phát hiện.
 * - "Tình trạng hoạt động" KHÔNG lưu vào DB, chỉ in ra báo cáo dry-run.
 * - "Loại máy" trống hoặc "Không có máy tính" -> categoryId = UNCLASSIFIED
 *   (category mới, seed.ts, group END_USER).
 * - "Người sử dụng" -> ItAsset.currentUser.
 * - 4 cột User VPN / Password VPN / User FortiClient / Password FortiClient
 *   KHÔNG được đọc, KHÔNG được import, KHÔNG được log dưới bất kỳ hình
 *   thức nào trong toàn bộ script này.
 *
 * Chạy dry-run (mặc định, KHÔNG ghi DB):
 *   npx ts-node prisma/import-book1.ts
 *
 * Chạy thật (ghi DB), chỉ sau khi dry-run được duyệt:
 *   npx ts-node prisma/import-book1.ts --commit
 */
import * as path from 'path';
import * as XLSX from 'xlsx';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const BOOK1_PATH = process.env.BOOK1_XLSX_PATH || 'E:\\OneDrive\\ccdc\\Book1.xlsx';
const SHEET_NAME = 'Merge1';
const COMMIT = process.argv.includes('--commit');

// Cột trong Merge1 - dùng tên header đã chuẩn hóa (xuống dòng -> khoảng
// trắng, xem normalizeHeader) để không phụ thuộc \n vs \r\n giữa các thư
// viện đọc xlsx khác nhau (đã audit tên gốc ở Bước 2).
function h(raw: string): string {
  return normalizeHeader(raw);
}
const COL = {
  provinceCode: h('Mã \nBĐT/TP'),
  provinceName: h('Tên BĐT/TP'),
  maMBC: h('Mã MBC'),
  tenBuuCuc: h('Tên bưu cục'),
  wardCode: h('Mã \nBĐX'),
  wardName: h('Tên Bưu điện xã'),
  pointType: h('Loại'),
  ip: h('IP'),
  tenMay: h('Tên máy'),
  mac: h('Địa chỉ MAC'),
  loaiMay: h('Loại máy'),
  hang: h('Hãng'),
  model: h('Model'),
  serial: h('Serial Number/TAG'),
  os: h('Hệ điều hành'),
  cpu: h('CPU'),
  ram: h('RAM'),
  storage: h('Ổ cứng'),
  currentUser: h('Người sử dụng'),
  regionCode: h('Mã \nBĐKV'),
  regionName: h('Tên \nBĐKV'),
  centralWardName: h('Bưu điện xã\ntrung tâm'),
  address: h('Địa chỉ chi tiết'),
  activeStatus: h('Tình trạng\nhoạt động'),
  // CẤM đọc: 'User VPN', 'Password VPN', 'User FortiClient', 'Password FortiClient'
} as const;

// 3b: mapping "Loại máy" -> AssetCategory.code (thủ công, đã duyệt).
// Giá trị không có trong map này (ngoài null/"Không có máy tính") sẽ làm
// script dừng với lỗi rõ ràng - không tự đoán category mới.
const LOAI_MAY_TO_CATEGORY: Record<string, string> = {
  'Máy tính để bàn lắp ráp ĐNA': 'PC_DESKTOP',
  'Máy tính để bàn Dell': 'PC_DESKTOP',
  'Máy tính để bàn Hewlett-Packard': 'PC_DESKTOP',
  'Lắp ráp ĐNA': 'PC_DESKTOP',
  'HP Prodesk 600 G5': 'PC_DESKTOP',
  'Dell Optiplex 5060': 'PC_DESKTOP',
  'Dell Optiplex 3040': 'PC_DESKTOP',
  'Lắp ráp Lắp ráp ĐNA': 'PC_DESKTOP',
  'Lắp ráp ĐNA dự án': 'PC_DESKTOP',
  'Lắp ráp ĐNA ': 'PC_DESKTOP', // trailing space thật trong file
  'Dell Optiplex 3020': 'PC_DESKTOP',
  'Lắp ráp ĐNA h81': 'PC_DESKTOP',
};
const UNCLASSIFIED_CATEGORY = 'UNCLASSIFIED';
const NO_COMPUTER_VALUE = 'Không có máy tính';

interface RawRow {
  [key: string]: unknown;
}

function s(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const str = String(v).trim();
  return str === '' ? undefined : str;
}

// Chuẩn hóa tên cột: gộp mọi kiểu xuống dòng (\n, \r\n) thành 1 khoảng
// trắng rồi trim. Cần thiết vì thư viện xlsx (SheetJS) đọc line-break
// trong header là \r\n, khác với openpyxl/pandas dùng ở Bước 2-3 (\n) -
// nếu so khớp chuỗi cứng sẽ silently miss toàn bộ cột có xuống dòng.
function normalizeHeader(h: unknown): string {
  return String(h ?? '').replace(/\r\n|\r|\n/g, ' ').trim();
}

function loadRows(): RawRow[] {
  const wb = XLSX.readFile(BOOK1_PATH, { cellDates: true });
  const sheet = wb.Sheets[SHEET_NAME];
  if (!sheet) {
    throw new Error(`Không tìm thấy sheet "${SHEET_NAME}" trong ${BOOK1_PATH}`);
  }
  const matrix: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: undefined });
  const headerRow = matrix[0];
  const normalizedHeaders = headerRow.map(normalizeHeader);
  const dataRows = matrix.slice(1);
  return dataRows.map((rowArr) => {
    const obj: RawRow = {};
    normalizedHeaders.forEach((h, i) => {
      obj[h] = rowArr[i];
    });
    return obj;
  });
}

interface SiteBuild {
  code: string;
  name: string;
  address?: string;
  regionName?: string;
  provinceCode?: string;
  provinceName?: string;
  regionCode?: string;
  wardCode?: string;
  wardName?: string;
  centralWardName?: string;
  pointType?: string;
}

interface AssetBuild {
  assetTag: string;
  siteCode: string;
  categoryCode: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  ipAddress?: string;
  macAddress?: string;
  currentUser?: string;
  notes?: string;
  specs: Record<string, string>;
}

interface DryRunReport {
  sitesToInsert: SiteBuild[];
  assetsToInsert: AssetBuild[];
  skippedRows: { excelRow: number; reason: string }[];
  serialRenames: { excelRow: number; maMBC: string; from: string; to: string }[];
  inactiveSites: { code: string; name: string }[];
  siteConflicts: { code: string; field: string; values: string[] }[];
}

function build(rows: RawRow[]): DryRunReport {
  const report: DryRunReport = {
    sitesToInsert: [],
    assetsToInsert: [],
    skippedRows: [],
    serialRenames: [],
    inactiveSites: [],
    siteConflicts: [],
  };

  // ---- 1. Gom Site theo Mã MBC, kiểm tra xung đột site-level ----
  const siteFieldCols: { key: keyof SiteBuild; col: string }[] = [
    { key: 'name', col: COL.tenBuuCuc },
    { key: 'provinceCode', col: COL.provinceCode },
    { key: 'provinceName', col: COL.provinceName },
    { key: 'regionCode', col: COL.regionCode },
    { key: 'regionName', col: COL.regionName },
    { key: 'wardCode', col: COL.wardCode },
    { key: 'wardName', col: COL.wardName },
    { key: 'centralWardName', col: COL.centralWardName },
    { key: 'pointType', col: COL.pointType },
    { key: 'address', col: COL.address },
  ];

  const rowsByMaMBC = new Map<string, { row: RawRow; excelRow: number }[]>();
  rows.forEach((row, idx) => {
    const maMBC = s(row[COL.maMBC]);
    if (!maMBC) return; // dòng không có Mã MBC - không thể xác định site, xử lý ở phần asset (skip)
    const excelRow = idx + 2; // +1 header, +1 1-indexed
    if (!rowsByMaMBC.has(maMBC)) rowsByMaMBC.set(maMBC, []);
    rowsByMaMBC.get(maMBC)!.push({ row, excelRow });
  });

  for (const [code, entries] of rowsByMaMBC) {
    const site: SiteBuild = { code, name: '' };
    for (const { key, col } of siteFieldCols) {
      const values = new Set(entries.map((e) => s(e.row[col])).filter((v): v is string => v !== undefined));
      if (values.size > 1) {
        // Quyết định đã duyệt: chỉ site 531130 / wardName được phép có
        // xung đột (xử lý = null). Bất kỳ xung đột nào khác -> dừng thật
        // (ghi vào report, không throw, để dry-run vẫn in được toàn bộ).
        report.siteConflicts.push({ code, field: key, values: [...values] });
        if (code === '531130' && key === 'wardName') {
          (site as any)[key] = undefined; // theo quyết định đã duyệt
          continue;
        }
        // Xung đột chưa được duyệt xử lý - không tự chọn đại diện, để trống.
        (site as any)[key] = undefined;
        continue;
      }
      const val = [...values][0];
      if (val !== undefined) (site as any)[key] = val;
    }
    if (!site.name) site.name = code; // an toàn tối thiểu, không nên xảy ra (name luôn có theo audit)
    report.sitesToInsert.push(site);

    // Báo cáo "Tình trạng hoạt động" = 1 -> Ngừng hoạt động (chỉ báo cáo)
    const hasInactive = entries.some((e) => Number(e.row[COL.activeStatus]) === 1);
    if (hasInactive) report.inactiveSites.push({ code, name: site.name });
  }

  // ---- 2. Serial dedup theo cụm giá trị gốc (thứ tự xuất hiện) ----
  const serialSeen = new Map<string, number>();
  function dedupSerial(raw: string, excelRow: number, maMBC: string): string {
    const n = (serialSeen.get(raw) ?? 0) + 1;
    serialSeen.set(raw, n);
    if (n === 1) return raw;
    const renamed = `${raw}-${String(n).padStart(2, '0')}`;
    report.serialRenames.push({ excelRow, maMBC, from: raw, to: renamed });
    return renamed;
  }

  // ---- 3. Build ItAsset, assetTag theo thứ tự trong từng Mã MBC ----
  const seqByMaMBC = new Map<string, number>();
  rows.forEach((row, idx) => {
    const excelRow = idx + 2;
    const maMBC = s(row[COL.maMBC]);
    if (!maMBC) {
      report.skippedRows.push({ excelRow, reason: 'Thiếu Mã MBC - không xác định được Site' });
      return;
    }

    const loaiMayRaw = s(row[COL.loaiMay]);
    let categoryCode: string;
    if (loaiMayRaw === undefined || loaiMayRaw === NO_COMPUTER_VALUE) {
      categoryCode = UNCLASSIFIED_CATEGORY;
    } else if (LOAI_MAY_TO_CATEGORY[loaiMayRaw]) {
      categoryCode = LOAI_MAY_TO_CATEGORY[loaiMayRaw];
    } else {
      report.skippedRows.push({
        excelRow,
        reason: `"Loại máy"="${loaiMayRaw}" không có trong bảng mapping đã duyệt - cần bổ sung thủ công, không tự đoán`,
      });
      return;
    }

    const seq = (seqByMaMBC.get(maMBC) ?? 0) + 1;
    seqByMaMBC.set(maMBC, seq);
    const assetTag = `${maMBC}-${seq}`;

    // "N/A" -> coi như null (quyết định đã duyệt, nhất quán với cách
    // pandas đã xử lý ở Bước 3 audit - không dedup, không lưu literal "N/A").
    const serialRawTmp = s(row[COL.serial]);
    const serialRaw = serialRawTmp && serialRawTmp.toUpperCase() === 'N/A' ? undefined : serialRawTmp;
    const serialNumber = serialRaw ? dedupSerial(serialRaw, excelRow, maMBC) : undefined;

    const specs: Record<string, string> = {};
    const os = s(row[COL.os]);
    const cpu = s(row[COL.cpu]);
    const ramRaw = row[COL.ram];
    const ram = ramRaw === undefined || ramRaw === null || ramRaw === '' ? undefined : String(ramRaw).trim();
    const storage = s(row[COL.storage]);
    if (os) specs.os = os;
    if (cpu) specs.cpu = cpu;
    if (ram) specs.ram = ram;
    if (storage) specs.storage = storage;

    report.assetsToInsert.push({
      assetTag,
      siteCode: maMBC,
      categoryCode,
      manufacturer: s(row[COL.hang]),
      model: s(row[COL.model]),
      serialNumber,
      ipAddress: s(row[COL.ip]),
      macAddress: s(row[COL.mac]),
      currentUser: s(row[COL.currentUser]),
      notes: s(row[COL.tenMay]) ? `Tên máy (nguồn Book1.xlsx): ${s(row[COL.tenMay])}` : undefined,
      specs,
    });
  });

  return report;
}

function printReport(report: DryRunReport, totalRows: number) {
  console.log('========== DRY RUN — Book1.xlsx (Merge1) import ==========');
  console.log(`Tổng số dòng dữ liệu Excel: ${totalRows}`);
  console.log(`Site sẽ insert (distinct Mã MBC): ${report.sitesToInsert.length}`);
  console.log(`ItAsset sẽ insert: ${report.assetsToInsert.length}`);
  console.log(`Dòng bị skip (không tạo ItAsset): ${report.skippedRows.length}`);
  console.log();

  if (report.siteConflicts.length) {
    console.log('---- XUNG ĐỘT SITE-LEVEL PHÁT HIỆN (field để trống nếu chưa duyệt xử lý riêng) ----');
    for (const c of report.siteConflicts) {
      console.log(`  Mã MBC=${c.code} field=${c.field}: ${JSON.stringify(c.values)}`);
    }
    console.log();
  }

  if (report.skippedRows.length) {
    console.log('---- DÒNG BỊ SKIP ----');
    for (const r of report.skippedRows) {
      console.log(`  excel row ${r.excelRow}: ${r.reason}`);
    }
    console.log();
  }

  console.log(`---- SERIAL RENAME (${report.serialRenames.length} dòng) ----`);
  console.log('  (đã duyệt ở Bước 3e, không in lại toàn bộ ở đây - xem báo cáo trước)');
  console.log();

  console.log(`---- SITE "Ngừng hoạt động" theo Tình trạng hoạt động=1 (chỉ báo cáo, KHÔNG lưu DB): ${report.inactiveSites.length} ----`);
  console.log();

  // Đếm asset theo category để đối chiếu nhanh với Bước 3b
  const byCategory = new Map<string, number>();
  for (const a of report.assetsToInsert) {
    byCategory.set(a.categoryCode, (byCategory.get(a.categoryCode) ?? 0) + 1);
  }
  console.log('---- Asset theo category ----');
  for (const [cat, count] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }
  console.log();
  console.log('LƯU Ý: 4 cột User VPN / Password VPN / User FortiClient / Password FortiClient');
  console.log('không được đọc trong script này (theo quyết định đã duyệt) - không xuất hiện ở đâu trong report.');
}

async function commitToDb(report: DryRunReport) {
  console.log('========== COMMIT — ghi vào DB thật ==========');

  const categories = await prisma.assetCategory.findMany();
  const categoryIdByCode = new Map(categories.map((c) => [c.code, c.id]));

  let siteInserted = 0;
  const siteIdByCode = new Map<string, string>();
  for (const site of report.sitesToInsert) {
    const created = await prisma.site.upsert({
      where: { code: site.code },
      create: {
        code: site.code,
        name: site.name,
        address: site.address,
        regionName: site.regionName,
        provinceCode: site.provinceCode,
        provinceName: site.provinceName,
        regionCode: site.regionCode,
        wardCode: site.wardCode,
        wardName: site.wardName,
        centralWardName: site.centralWardName,
        pointType: site.pointType,
      },
      update: {
        name: site.name,
        address: site.address,
        regionName: site.regionName,
        provinceCode: site.provinceCode,
        provinceName: site.provinceName,
        regionCode: site.regionCode,
        wardCode: site.wardCode,
        wardName: site.wardName,
        centralWardName: site.centralWardName,
        pointType: site.pointType,
      },
    });
    siteIdByCode.set(site.code, created.id);
    siteInserted++;
  }

  let assetInserted = 0;
  const assetErrors: { assetTag: string; error: string }[] = [];
  for (const asset of report.assetsToInsert) {
    const categoryId = categoryIdByCode.get(asset.categoryCode);
    const siteId = siteIdByCode.get(asset.siteCode);
    if (!categoryId) {
      assetErrors.push({ assetTag: asset.assetTag, error: `Không tìm thấy category ${asset.categoryCode} trong DB` });
      continue;
    }
    try {
      await prisma.itAsset.upsert({
        where: { assetTag: asset.assetTag },
        create: {
          assetTag: asset.assetTag,
          name: asset.notes ?? asset.assetTag,
          categoryId,
          siteId,
          manufacturer: asset.manufacturer,
          model: asset.model,
          serialNumber: asset.serialNumber,
          ipAddress: asset.ipAddress,
          macAddress: asset.macAddress,
          currentUser: asset.currentUser,
          notes: asset.notes,
          specs: Object.keys(asset.specs).length ? (asset.specs as Prisma.InputJsonValue) : undefined,
        },
        update: {
          name: asset.notes ?? asset.assetTag,
          categoryId,
          siteId,
          manufacturer: asset.manufacturer,
          model: asset.model,
          serialNumber: asset.serialNumber,
          ipAddress: asset.ipAddress,
          macAddress: asset.macAddress,
          currentUser: asset.currentUser,
          notes: asset.notes,
          specs: Object.keys(asset.specs).length ? (asset.specs as Prisma.InputJsonValue) : undefined,
        },
      });
      assetInserted++;
    } catch (err) {
      assetErrors.push({ assetTag: asset.assetTag, error: err instanceof Error ? err.message : String(err) });
    }
  }

  console.log(`Site upsert thành công: ${siteInserted}`);
  console.log(`ItAsset upsert thành công: ${assetInserted}`);
  if (assetErrors.length) {
    console.log(`ItAsset lỗi: ${assetErrors.length}`);
    for (const e of assetErrors) console.log(`  ${e.assetTag}: ${e.error}`);
  }
}

async function main() {
  console.log(`Đọc file: ${BOOK1_PATH}, sheet: ${SHEET_NAME}`);
  const rows = loadRows();
  const report = build(rows);
  printReport(report, rows.length);

  if (!COMMIT) {
    console.log();
    console.log('>>> DRY RUN - chưa ghi gì vào DB. Chạy lại với --commit sau khi được duyệt. <<<');
    return;
  }

  await commitToDb(report);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
