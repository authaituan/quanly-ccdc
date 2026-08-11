/**
 * Import Employee thật từ Book2.xlsx (sheet "Sheet1") vào DB.
 *
 * Nguồn: E:\OneDrive\ccdc\Book2.xlsx (đường dẫn tuyệt đối, ngoài repo -
 * override bằng biến môi trường BOOK2_XLSX_PATH nếu file ở chỗ khác).
 *
 * QUYẾT ĐỊNH ĐÃ CHỐT (2026-08-11, xem lịch sử chat):
 * - 4 cột dùng: "Mã HRM" -> Employee.employeeCode (unique, dùng dedup),
 *   "Tên nhân viên" -> Employee.fullName, "Mã BC" -> tìm Site.code,
 *   "Mã BĐX" -> chỉ đối chiếu/cảnh báo nếu lệch với Site.wardCode của
 *   Site tìm được qua Mã BC (KHÔNG dùng để tìm Site - Mã BC ưu tiên).
 * - Employee không có siteId trực tiếp, chỉ liên kết qua
 *   Employee.departmentId -> Department.siteId. Với mỗi Site distinct
 *   xuất hiện trong Book2.xlsx, tạo (hoặc tái dùng) đúng 1 Department đại
 *   diện cho Site đó (Department.name = Site.name), rồi gán Employee vào
 *   Department đó.
 * - Dry-run mặc định, --commit để ghi thật (cùng pattern import-book1.ts).
 *
 * Chạy dry-run:
 *   npx ts-node prisma/import-book2.ts
 * Chạy thật:
 *   npx ts-node prisma/import-book2.ts --commit
 */
import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BOOK2_PATH = process.env.BOOK2_XLSX_PATH || 'E:\\OneDrive\\ccdc\\Book2.xlsx';
const SHEET_NAME = 'Sheet1';
const COMMIT = process.argv.includes('--commit');

function normalizeHeader(h: unknown): string {
  return String(h ?? '').replace(/\r\n|\r|\n/g, ' ').trim();
}

interface RawRow {
  [key: string]: unknown;
}

function loadRows(): RawRow[] {
  const wb = XLSX.readFile(BOOK2_PATH, { cellDates: true });
  const sheet = wb.Sheets[SHEET_NAME];
  if (!sheet) throw new Error(`Không tìm thấy sheet "${SHEET_NAME}" trong ${BOOK2_PATH}`);
  const matrix: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: undefined });
  const headers = matrix[0].map(normalizeHeader);
  return matrix.slice(1).map((rowArr) => {
    const obj: RawRow = {};
    headers.forEach((h, i) => (obj[h] = rowArr[i]));
    return obj;
  });
}

const COL = {
  hrm: normalizeHeader('Mã HRM'),
  ten: normalizeHeader('Tên nhân viên'),
  maBC: normalizeHeader('Mã BC'),
  maBDX: normalizeHeader('Mã BĐX'),
};

function s(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const str = String(v).trim();
  return str === '' ? undefined : str;
}

interface EmployeeBuild {
  excelRow: number;
  employeeCode: string;
  fullName: string;
  siteCode: string;
  wardCodeInFile?: string;
}

interface DryRunReport {
  employeesToInsert: EmployeeBuild[];
  distinctSiteCodes: string[];
  siteNotFound: { excelRow: number; siteCode: string }[];
  wardCodeMismatch: { excelRow: number; siteCode: string; expectedWardCode: string | null; fileWardCode: string }[];
}

function build(rows: RawRow[]): DryRunReport {
  const report: DryRunReport = {
    employeesToInsert: [],
    distinctSiteCodes: [],
    siteNotFound: [],
    wardCodeMismatch: [],
  };
  const siteCodeSet = new Set<string>();

  rows.forEach((row, idx) => {
    const excelRow = idx + 2;
    const employeeCode = s(row[COL.hrm]);
    const fullName = s(row[COL.ten]);
    const siteCodeRaw = row[COL.maBC];
    const siteCode = siteCodeRaw === undefined || siteCodeRaw === null ? undefined : String(siteCodeRaw).trim();
    const wardCodeInFile = s(row[COL.maBDX]);

    if (!employeeCode || !fullName || !siteCode) {
      // Không xảy ra với 4 dòng thật đã audit (0 null), nhưng vẫn giữ
      // guard rõ ràng thay vì crash nếu dữ liệu tương lai thiếu cột.
      return;
    }

    siteCodeSet.add(siteCode);
    report.employeesToInsert.push({ excelRow, employeeCode, fullName, siteCode, wardCodeInFile });
  });

  report.distinctSiteCodes = [...siteCodeSet];
  return report;
}

async function verifyAgainstDb(report: DryRunReport) {
  for (const siteCode of report.distinctSiteCodes) {
    const site = await prisma.site.findUnique({ where: { code: siteCode } });
    const rowsForSite = report.employeesToInsert.filter((e) => e.siteCode === siteCode);
    if (!site) {
      for (const e of rowsForSite) report.siteNotFound.push({ excelRow: e.excelRow, siteCode });
      continue;
    }
    for (const e of rowsForSite) {
      if (e.wardCodeInFile && site.wardCode !== e.wardCodeInFile) {
        report.wardCodeMismatch.push({
          excelRow: e.excelRow,
          siteCode,
          expectedWardCode: site.wardCode,
          fileWardCode: e.wardCodeInFile,
        });
      }
    }
  }
}

function printReport(report: DryRunReport, totalRows: number) {
  console.log('========== DRY RUN — Book2.xlsx import ==========');
  console.log(`Tổng số dòng dữ liệu Excel: ${totalRows}`);
  console.log(`Employee sẽ insert: ${report.employeesToInsert.length}`);
  console.log(`Số Site distinct tham chiếu (Mã BC): ${report.distinctSiteCodes.length} -> [${report.distinctSiteCodes.join(', ')}]`);
  console.log(`Số Department sẽ tạo/tái dùng: ${report.distinctSiteCodes.length}`);
  console.log();
  if (report.siteNotFound.length) {
    console.log('---- Mã BC KHÔNG tìm thấy Site tương ứng (nhân viên sẽ bị SKIP) ----');
    for (const r of report.siteNotFound) console.log(`  excel row ${r.excelRow}: Mã BC=${r.siteCode}`);
  } else {
    console.log('Không có Mã BC nào thiếu Site tương ứng.');
  }
  console.log();
  if (report.wardCodeMismatch.length) {
    console.log('---- Mã BĐX trong file LỆCH với Site.wardCode thật (chỉ cảnh báo, không chặn import) ----');
    for (const r of report.wardCodeMismatch) {
      console.log(`  excel row ${r.excelRow}: siteCode=${r.siteCode} Site.wardCode=${r.expectedWardCode} Mã BĐX(file)=${r.fileWardCode}`);
    }
  } else {
    console.log('Mã BĐX khớp 100% với Site.wardCode cho toàn bộ dòng.');
  }
}

async function commitToDb(report: DryRunReport) {
  console.log('========== COMMIT — ghi vào DB thật ==========');
  const departmentIdBySiteCode = new Map<string, string>();

  for (const siteCode of report.distinctSiteCodes) {
    const site = await prisma.site.findUnique({ where: { code: siteCode } });
    if (!site) continue; // đã báo cáo ở siteNotFound

    let department = await prisma.department.findFirst({ where: { siteId: site.id } });
    if (!department) {
      department = await prisma.department.create({ data: { name: site.name, siteId: site.id } });
    }
    departmentIdBySiteCode.set(siteCode, department.id);
  }

  let inserted = 0;
  for (const e of report.employeesToInsert) {
    const departmentId = departmentIdBySiteCode.get(e.siteCode);
    if (!departmentId) continue; // site không tồn tại, đã báo cáo

    await prisma.employee.upsert({
      where: { employeeCode: e.employeeCode },
      create: { employeeCode: e.employeeCode, fullName: e.fullName, departmentId },
      update: { fullName: e.fullName, departmentId },
    });
    inserted++;
  }
  console.log(`Department tạo/tái dùng: ${departmentIdBySiteCode.size}`);
  console.log(`Employee upsert thành công: ${inserted}`);
}

async function main() {
  console.log(`Đọc file: ${BOOK2_PATH}, sheet: ${SHEET_NAME}`);
  const rows = loadRows();
  const report = build(rows);
  await verifyAgainstDb(report);
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
