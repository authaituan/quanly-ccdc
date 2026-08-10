# PROJECT STATUS — Quản lý CCDC (IT Asset Management)

> AI-readable progress snapshot. Mọi dòng trong bảng dưới đây được audit trực
> tiếp từ source code thật tại thời điểm `audit_date`, không suy luận từ tên
> file/tên module. Khi code thay đổi, file này phải được cập nhật lại bằng
> cách audit lại — không copy/paste phiên bản cũ.

## META

```yaml
repo: authaituan/quanly-ccdc
branch: feature/scaffold-phase1
commit_hash: 3857f890ea70f7932004face8a99983eab82fbf9
commit_date: 2026-08-10T20:55:45+07:00
audit_date: 2026-08-10T21:15:00+07:00
auditor: Claude (Technical Auditor role, per project operating constitution)
```

## Nguồn sự thật đã đối chiếu

| Ưu tiên | Nguồn | Trạng thái tại thời điểm audit |
|---|---|---|
| 1. Runtime | `npm run start:dev` chưa được chạy thành công trong bất kỳ phiên nào — **không có bằng chứng runtime**. Chỉ có `npx nest build` (compile-time) đã pass. | Chưa audit được |
| 2. Database | PostgreSQL 17 local (`postgresql-x64-17` service), DB `quanly_ccdc` | Đã audit thật — xem bảng bên dưới |
| 3. Source code GitHub | Nhánh `feature/scaffold-phase1`, commit `2ad8953` | Đã audit thật — xem bảng bên dưới |
| 4. Commit history | 4 commit: `ba91f3e` (scaffold), `749615e` (fix build error), `291b277` (PROJECT_STATUS.md), `2ad8953` (import Book1.xlsx) | Đã đọc |
| 5. Prompt mô tả | Chat trước đó | Thấp nhất, không dùng làm evidence |

## Bảng tiến độ

| Hạng mục | Trạng thái | Evidence (file:dòng) |
|---|---|---|
| Data model Prisma đầy đủ (18 model/enum) | ✅ Có, đã migrate | `backend/prisma/schema.prisma` — 12 model + 6 enum: `AssetCategoryGroup`(22), `AssetCategory`(30), `Site`(50, +7 field mới - xem OPS-02 bên dưới), `RackCabinet`(71), `RackPlacement`(86), `OperatingStatus`(105), `OwnershipStatus`(113), `ItAsset`(119, +`currentUser`), `Department`(157), `Employee`(170), `AssignmentStatus`(189), `EndUserAssignment`(195), `MaintenanceType`(221), `MaintenanceLog`(229), `SoftwareLicenseLink`(249), `NetworkAccessCredential`(269), `UserRole`(287), `User`(294) |
| `Site` — 7 field mới (Book1.xlsx import) | ✅ Đã migrate + có dữ liệu thật | `backend/prisma/schema.prisma:60-67`: `provinceCode`, `provinceName`, `regionCode`, `wardCode`, `wardName`, `centralWardName`, `pointType` (tất cả `String?`). Migration `backend/prisma/migrations/20260810094730_add_book1_import_fields/migration.sql`. Xác nhận `\d sites` thật có đủ 7 cột. Mẫu dữ liệu thật: site `536750` → `provinceCode='53'`, `regionCode='5310'`, `pointType='GD3'` |
| `ItAsset.currentUser` | ✅ Đã migrate + có dữ liệu thật | `backend/prisma/schema.prisma:149`. Query thật: `SELECT count(*) FROM it_assets WHERE "currentUser" IS NOT NULL` → 99 |
| `AssetCategory.UNCLASSIFIED` | ✅ Đã seed | `backend/prisma/seed.ts` — group `END_USER`, dùng cho 73 dòng Book1.xlsx thiếu "Loại máy" hoặc ghi "Không có máy tính" |
| Migration áp dụng vào DB thật | ✅ Đã chạy (2 migration) | `backend/prisma/migrations/`: `20260810085140_init`, `20260810094730_add_book1_import_fields`. Re-verify `npx prisma migrate status` → "Database schema is up to date!" |
| Seed taxonomy | ✅ Đã chạy | `backend/prisma/seed.ts`; output thật "Seeded 29 asset categories" (28 gốc + `UNCLASSIFIED`). Query thật `SELECT count(*) FROM asset_categories` → 29 |
| **OPS-02 — Import Book1.xlsx (Merge1) vào DB** | ✅ **Đã hoàn thành** | Script: `backend/prisma/import-book1.ts` (dry-run mặc định, `--commit` để ghi thật). Kết quả thật (query `psql` độc lập, không chỉ dựa vào log script): `SELECT count(*) FROM sites` → **206**; `SELECT count(*) FROM it_assets` → **359**; theo category: `PC_DESKTOP`=286, `UNCLASSIFIED`=73; `serialNumber` distinct=non-null=255 (không trùng); `network_access_credentials` = 0 dòng (xem rủi ro #4 bên dưới). Commit `2ad8953`. |
| **AST-04 — `PATCH /assets/:id`** | ✅ **Đã hoàn thành**, verify runtime thật | `backend/src/modules/assets/assets.controller.ts` (`update()`), `assets.service.ts` (`update()` + `assertCategoryExists`/`assertSiteExists`/`assertAssetTagAvailable`/`assertSerialNumberAvailable`), `dto/update-asset.dto.ts` (`PartialType(CreateAssetDto)`, cần thêm dependency `@nestjs/mapped-types`). Cho sửa mọi field kể cả `assetTag`/`serialNumber` (unique), validate FK + unique thủ công trước khi ghi (quyết định 2026-08-10). Verify thật bằng curl vào server đang chạy: PATCH field hợp lệ → 200 + data đúng; PATCH `categoryId` không tồn tại → **400** `"categoryId ... không tồn tại"`; PATCH `assetTag` trùng → **409** `"assetTag ... đã tồn tại"`. |
| **AST-05 — `DELETE /assets/:id` (soft delete)** | ✅ **Đã hoàn thành**, verify runtime thật | `assets.service.ts` (`decommission()`) — **không xóa dòng khỏi `it_assets`**, chỉ chuyển `operatingStatus` sang `DECOMMISSIONED` (quyết định 2026-08-10: đây là hệ thống quản lý tài sản, không được mất lịch sử kiểm toán). Verify thật: DELETE 1 asset thật → `SELECT count(*) FROM it_assets` vẫn = **359** (không giảm), dòng đó có `operatingStatus='DECOMMISSIONED'` xác nhận qua `psql` độc lập. DELETE id không tồn tại → **404**. |
| Module `assets` — 7 route | ✅ Có code, ✅ **GET/PATCH/DELETE đã test runtime thật qua curl** (xem AST-04/AST-05); `POST` chưa test runtime, chỉ build | `backend/src/modules/assets/assets.controller.ts`: `GET /assets`, `GET /assets/expiring-soon`, `GET /assets/by-tag/:assetTag`, `GET /assets/:id`, `POST /assets`, `PATCH /assets/:id`, `DELETE /assets/:id` (soft delete) |
| Module `sites` — 2 route | ✅ Có code, ❌ chưa test runtime | `backend/src/modules/sites/sites.controller.ts`: `GET /sites`(8), `GET /sites/:id`(13) |
| Module `credentials` — mã hóa VPN/FortiClient | ⚠️ Service xong, **không có route HTTP** | `backend/src/modules/credentials/credentials.service.ts`: `upsert()`(28), `reveal()`(54); `backend/src/modules/credentials/credentials.module.ts` — không import `AssetsController`-style controller, comment dòng 6-8 giải thích lý do (chờ module `auth`) |
| Mã hóa AES-256-GCM | ✅ Có code, chưa có unit test | `backend/src/common/crypto/encryption.service.ts` |
| Module `auth` (JWT/RolesGuard) | ❌ Chưa tồn tại | Không có thư mục `backend/src/modules/auth/`; `app.module.ts`(1-21) không import module nào tên `Auth` |
| Module `assignments`, `maintenance`, `software-licenses`, `users` | ❌ Chưa tồn tại (chỉ có model DB, chưa có controller/service) | Không có thư mục tương ứng trong `backend/src/modules/`; các model `EndUserAssignment`, `MaintenanceLog`, `SoftwareLicenseLink`, `User` chỉ tồn tại ở tầng schema |
| Frontend — routing skeleton | ⚠️ `/assets` có trang thật, `/`, `/sites`, `/scan` vẫn placeholder | `frontend/src/App.tsx` |
| **FE-02 — Trang danh sách thiết bị (`/assets`)** | ✅ **Đã hoàn thành**, verify runtime thật | `frontend/src/pages/AssetsPage.tsx` — gọi `GET http://localhost:3000/assets` khi mount, hiển thị bảng (assetTag, tên máy gốc, category, site, tình trạng, IP), tìm kiếm client-side theo assetTag/tên site, loading/error state, chi tiết mở rộng theo dòng. Verify thật: mở `/assets` trong browser (Vite dev port 5173 + backend port 3000 cùng chạy), load đúng **359/359** thiết bị, 0 lỗi console (tab sạch), `npm run build` pass 0 lỗi. |
| **Bug có sẵn từ scaffold, phát hiện+sửa ở FE-02** | ✅ Đã sửa | `frontend/src/main.tsx` thiếu `<BrowserRouter>` — mọi route (không riêng `/assets`) crash ngay khi mount trước khi sửa. Đã bọc `<App />` trong `<BrowserRouter>`. |
| Frontend — Rack visualizer tương tác | ❌ Chưa code | Không tìm thấy component nào tên rack/visualizer trong `frontend/src/` |
| Frontend — QR scan mobile-web | ❌ Chưa code | Route `/scan` chỉ là `PlaceholderPage`, không có logic camera/decode |
| Offboarding/decommission state machine | ❌ Chưa code | `EndUserAssignment.status` enum có `OFFBOARDING`(schema.prisma:189-193) nhưng không có service/controller nào implement luồng thu hồi → backup → wipe → license → kho |
| Build backend (`nest build`) | ✅ Pass, 0 lỗi | Chạy thật trong phiên trước; log không có output lỗi sau khi sửa `assets.service.ts` (cast `Prisma.InputJsonValue`) |
| Build frontend (`vite build`) | ✅ Pass, 0 lỗi | Output thật: `dist/index.html`, `dist/assets/index-BTeJBiAA.js` (160.89 kB) |
| Server chạy được qua HTTP (runtime thật) | ❓ **Không kết luận được** | Chưa từng chạy `npm run start:dev` thành công trong phiên nào — sandbox chặn spawn tiến trình nền. Không được coi build-pass tương đương với "server chạy đúng" |

## Rủi ro / lệch hướng đã ghi nhận

1. **`credentials` module không có route** — nếu ai đó cần API thật cho VPN/FortiClient, phải làm `auth` module trước (RolesGuard chặn non-`IT_ADMIN`), nếu không sẽ có người thêm controller vội mà bỏ qua RBAC.
2. **Runtime đã có bằng chứng thật (FE-02, 2026-08-10)** — backend `npm run start:dev` (port 3000) + frontend `npm run dev` (port 5173) chạy đồng thời, `/assets` load đúng 359/359 thiết bị, 0 lỗi console. Vẫn thiếu: chưa test các route khác (`expiring-soon`, `by-tag/:assetTag`, `POST /assets`, toàn bộ `sites` module) qua runtime thật.
3. **4 cột User VPN / Password VPN / User FortiClient / Password FortiClient trong Book1.xlsx bị bỏ qua hoàn toàn khi import (quyết định có chủ đích, đã duyệt 2026-08-10)** — `import-book1.ts` không đọc, không lưu 4 cột này dưới bất kỳ hình thức nào (xác nhận thật: `network_access_credentials` = 0 dòng). Dữ liệu VPN/FortiClient thật của 359 thiết bị **hiện không tồn tại ở đâu trong hệ thống mới** — nếu cần, phải nhập tay hoặc chạy 1 script import riêng sau khi module `auth` xong.
4. **Cột "Loại" (GD3/VHX/GD1/VP/GD2/PH2/PH1) và các field site khác vẫn cần dọn tay** — `Site.pointType`, `wardCode`, `wardName`, `centralWardName` được import nguyên trạng từ Excel, chưa chuẩn hóa/đối chiếu nghiệp vụ. Riêng site `531130` (VP BĐ Thành Phố Huế) có `wardName = NULL` do xung đột dữ liệu thật (cột này ở site đó bị dùng để ghi tên phòng ban nội bộ, không phải tên xã) — cần xử lý tay nếu muốn có dữ liệu phòng ban.
5. **73/359 `ItAsset` đang mang category `UNCLASSIFIED`** (thiếu "Loại máy" hoặc ghi "Không có máy tính" trong Excel gốc) — cần người dùng tự phân loại lại thủ công sau.
6. **⚠️ `/assets` là trang public, KHÔNG có auth (FE-02, 2026-08-10)** — backend chưa có module `auth`/`RolesGuard`, `AssetsController` không có guard nào. Bất kỳ ai truy cập được frontend đều thấy toàn bộ 359 thiết bị thật (IP, MAC, tên máy nguồn, hãng/model/serial khi mở "Chi tiết", kể cả `currentUser` ở phần chi tiết mở rộng). Trang chỉ hiển thị `currentUser` khi người dùng chủ động mở rộng 1 dòng, không phơi ra bảng tổng - nhưng vẫn không có kiểm soát truy cập nào ở tầng backend. **KHÔNG deploy `/assets` (hay bất kỳ phần nào của frontend) lên môi trường có người ngoài truy cập được cho tới khi có AUTH-01/02.** Hiện tại chỉ chạy an toàn ở local/dev.
