# PROJECT STATUS — Quản lý CCDC (IT Asset Management)

> AI-readable progress snapshot. Mọi dòng trong bảng dưới đây được audit trực
> tiếp từ source code thật tại thời điểm `audit_date`, không suy luận từ tên
> file/tên module. Khi code thay đổi, file này phải được cập nhật lại bằng
> cách audit lại — không copy/paste phiên bản cũ.

## META

```yaml
repo: authaituan/quanly-ccdc
branch: feature/scaffold-phase1
commit_hash: 7a212a4e11fb8e546fbf59716a0c4c7eb9c4be7b
commit_date: 2026-08-10T21:10:53+07:00
audit_date: 2026-08-10T21:45:00+07:00
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
| **AUTH-01 — `POST /auth/login` (JWT)** | ✅ **Đã hoàn thành**, verify runtime thật | `backend/src/modules/auth/auth.controller.ts`, `auth.service.ts`, `jwt.strategy.ts`, `jwt-auth.guard.ts`. So `bcrypt.compare` với `passwordHash`, trả JWT (`JWT_EXPIRES_IN=8h`, không có refresh token - quyết định 2026-08-10). Sai email/sai password đều trả **401** cùng 1 message `"Email hoặc mật khẩu không đúng"` (không lộ email có tồn tại hay không). `main.ts` (`assertRequiredEnv`) chặn app khởi động nếu thiếu `JWT_SECRET`/`CREDENTIALS_ENCRYPTION_KEY` — verify thật bằng cách ẩn hẳn file `.env`: app exit code 1, không mở cổng. |
| **AUTH-02 — RolesGuard theo 4 role** | ✅ **Đã hoàn thành**, verify runtime thật | `backend/src/modules/auth/roles.guard.ts` + `roles.decorator.ts` (`@Roles(...)`). Áp vào `assets.controller.ts` và `sites.controller.ts`: mọi `GET` chỉ cần đăng nhập; `POST`/`PATCH /assets` yêu cầu `IT_ADMIN`\|`WAREHOUSE_MANAGER`; `DELETE /assets` (soft-delete) chỉ `IT_ADMIN` (bảng phân quyền đã duyệt 2026-08-10). Verify thật qua curl: role `STAFF` gọi `POST /assets` → **403**; role `IT_ADMIN` → **201**. |
| Seed tài khoản `IT_ADMIN` đầu tiên | ✅ Đã chạy | `backend/prisma/seed.ts` (`seedFirstAdmin`) — chỉ chạy nếu bảng `users` rỗng, đọc `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` từ env, **throw lỗi và dừng nếu thiếu** (không tự sinh password ngẫu nhiên). Query thật xác nhận: 1 user `admin@quanly-ccdc.local`, role `IT_ADMIN`, `active=true`. Re-chạy seed lần 2 xác nhận skip đúng (không tạo trùng). |
| Module `assets` — 7 route, **có JWT + RBAC guard** | ✅ Có code, ✅ Đã test runtime thật đầy đủ (không token → 401, sai role → 403, đúng role → 200/201) | `backend/src/modules/assets/assets.controller.ts`: `GET /assets`, `GET /assets/expiring-soon`, `GET /assets/by-tag/:assetTag`, `GET /assets/:id`, `POST /assets`, `PATCH /assets/:id`, `DELETE /assets/:id` (soft delete) |
| Module `sites` — 2 route, **có JWT guard** | ✅ Có code, ✅ Test runtime thật (không token → 401, có token → 200) | `backend/src/modules/sites/sites.controller.ts`: `GET /sites`, `GET /sites/:id` |
| Module `credentials` — mã hóa VPN/FortiClient | ⚠️ Service xong, **vẫn không có route HTTP** | `backend/src/modules/credentials/credentials.service.ts`: `upsert()`(28), `reveal()`(54). `auth` module giờ đã tồn tại (AUTH-01/02 xong) nhưng **route cho credentials vẫn chưa được nối** trong phase này — ngoài phạm vi AUTH-01/02, để phase riêng. |
| Mã hóa AES-256-GCM | ✅ Có code, chưa có unit test | `backend/src/common/crypto/encryption.service.ts` |
| **Module `auth` (JWT/RolesGuard)** | ✅ **Đã hoàn thành** | `backend/src/modules/auth/`: `auth.module.ts`, `auth.controller.ts`, `auth.service.ts`, `jwt.strategy.ts`, `jwt-auth.guard.ts`, `roles.guard.ts`, `roles.decorator.ts`, `dto/login.dto.ts`. Import vào `app.module.ts`. |
| Module `assignments`, `maintenance`, `software-licenses`, `users` | ❌ Chưa tồn tại (chỉ có model DB, chưa có controller/service) | Không có thư mục tương ứng trong `backend/src/modules/`; các model `EndUserAssignment`, `MaintenanceLog`, `SoftwareLicenseLink`, `User` chỉ tồn tại ở tầng schema |
| Frontend — routing skeleton | ⚠️ `/assets` có trang thật, `/`, `/sites`, `/scan` vẫn placeholder | `frontend/src/App.tsx` |
| **FE-02 — Trang danh sách thiết bị (`/assets`)** | ✅ Code + build vẫn ổn, nhưng **🔴 ĐÃ VỠ Ở RUNTIME kể từ AUTH-01/02 (2026-08-10)** | `frontend/src/pages/AssetsPage.tsx` gọi `fetch('http://localhost:3000/assets')` **không kèm header `Authorization`**. Từ khi `AssetsController` được gắn `@UseGuards(JwtAuthGuard, RolesGuard)` (AUTH-02), mọi request từ trang này sẽ nhận **401** thay vì data. Đây là **blocker phát sinh mới**, cố ý **không sửa trong phase AUTH-01/02** (ngoài phạm vi - chỉ đụng `backend/src/modules/{auth,assets,sites}`). Cần 1 phase riêng: thêm màn hình login ở frontend + đính JWT vào mọi request (`AssetsPage.tsx` và các trang tương lai). |
| **Bug có sẵn từ scaffold, phát hiện+sửa ở FE-02** | ✅ Đã sửa | `frontend/src/main.tsx` thiếu `<BrowserRouter>` — mọi route (không riêng `/assets`) crash ngay khi mount trước khi sửa. Đã bọc `<App />` trong `<BrowserRouter>`. |
| Frontend — Rack visualizer tương tác | ❌ Chưa code | Không tìm thấy component nào tên rack/visualizer trong `frontend/src/` |
| Frontend — QR scan mobile-web | ❌ Chưa code | Route `/scan` chỉ là `PlaceholderPage`, không có logic camera/decode |
| Offboarding/decommission state machine | ❌ Chưa code | `EndUserAssignment.status` enum có `OFFBOARDING`(schema.prisma:189-193) nhưng không có service/controller nào implement luồng thu hồi → backup → wipe → license → kho |
| Build backend (`nest build`) | ✅ Pass, 0 lỗi | Chạy thật trong phiên trước; log không có output lỗi sau khi sửa `assets.service.ts` (cast `Prisma.InputJsonValue`) |
| Build frontend (`vite build`) | ✅ Pass, 0 lỗi | Output thật: `dist/index.html`, `dist/assets/index-BTeJBiAA.js` (160.89 kB) |
| Server chạy được qua HTTP (runtime thật) | ✅ **Đã kết luận được** (từ FE-02, 2026-08-10) | `npm run start:dev` chạy thật nhiều phiên liên tiếp (FE-02, AST-04/05, AUTH-01/02), verify bằng curl + browser thật, không còn là "chưa xác nhận" |

## Rủi ro / lệch hướng đã ghi nhận

1. **`credentials` module vẫn không có route** — `auth` module đã xong (AUTH-01/02), nên rào cản kỹ thuật trước đây đã hết, nhưng route thật cho VPN/FortiClient vẫn **chưa được viết** trong bất kỳ phase nào tới giờ. Nếu ai đó tự thêm controller sau này, nhớ áp `@Roles(UserRole.IT_ADMIN)` — đã có sẵn `RolesGuard`/`@Roles` dùng được ngay.
2. **4 cột User VPN / Password VPN / User FortiClient / Password FortiClient trong Book1.xlsx bị bỏ qua hoàn toàn khi import (quyết định có chủ đích, đã duyệt 2026-08-10)** — `import-book1.ts` không đọc, không lưu 4 cột này dưới bất kỳ hình thức nào (xác nhận thật: `network_access_credentials` = 0 dòng). Dữ liệu VPN/FortiClient thật của 359 thiết bị **hiện không tồn tại ở đâu trong hệ thống mới**.
3. **Cột "Loại" (GD3/VHX/GD1/VP/GD2/PH2/PH1) và các field site khác vẫn cần dọn tay** — `Site.pointType`, `wardCode`, `wardName`, `centralWardName` được import nguyên trạng từ Excel, chưa chuẩn hóa/đối chiếu nghiệp vụ. Riêng site `531130` (VP BĐ Thành Phố Huế) có `wardName = NULL` do xung đột dữ liệu thật.
4. **73/359 `ItAsset` đang mang category `UNCLASSIFIED`** (thiếu "Loại máy" hoặc ghi "Không có máy tính" trong Excel gốc) — cần người dùng tự phân loại lại thủ công sau.
5. **✅ RESOLVED (một phần) — `/assets` từng là trang public không auth (FE-02).** Kể từ AUTH-01/02 (2026-08-10), `AssetsController`/`SitesController` đã có `@UseGuards(JwtAuthGuard, RolesGuard)`, không còn trả data cho request không có JWT hợp lệ. **NHƯNG phát sinh blocker mới**: `frontend/src/pages/AssetsPage.tsx` chưa được sửa để gửi JWT — trang `/assets` giờ sẽ **hiện lỗi 401 ("Không tải được dữ liệu")** thay vì hiển thị bảng, cho tới khi có phase làm màn hình login + đính token vào request ở frontend. Backend giờ an toàn hơn để expose ra ngoài local, nhưng **frontend hiện tại (chưa sửa) sẽ không dùng được nữa** cho tới phase đó.
6. **`POST /assets`/`PATCH /assets/:id` cho phép `WAREHOUSE_MANAGER`** (theo bảng đã duyệt) nhưng **chưa có tài khoản `WAREHOUSE_MANAGER` nào tồn tại thật trong DB** để verify runtime cho role này — chỉ mới verify `IT_ADMIN` (201) và `STAFF` (403, đúng vì bị chặn). Nên coi nhánh `WAREHOUSE_MANAGER` là **đã code đúng theo logic nhưng chưa test thật qua curl**.
7. **Chưa có route đăng xuất/thu hồi token (logout/blacklist)** — JWT còn hiệu lực tới khi hết hạn (8h) dù người dùng có "đăng xuất" ở UI hay không (vì chưa có UI). Đây là hạn chế đã biết của thiết kế "chỉ access token, không refresh token" đã duyệt, không phải lỗi.
