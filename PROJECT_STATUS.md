# PROJECT STATUS — Quản lý CCDC (IT Asset Management)

> AI-readable progress snapshot. Mọi dòng trong bảng dưới đây được audit trực
> tiếp từ source code thật tại thời điểm `audit_date`, không suy luận từ tên
> file/tên module. Khi code thay đổi, file này phải được cập nhật lại bằng
> cách audit lại — không copy/paste phiên bản cũ.

## META

```yaml
repo: authaituan/quanly-ccdc
branch: feature/scaffold-phase1
commit_hash: 749615e4e5b42ea8cdaff8c9ef3bc4c60cc2706b
commit_date: 2026-08-10T15:54:29+07:00
audit_date: 2026-08-10T16:00:00+07:00
auditor: Claude (Technical Auditor role, per project operating constitution)
```

## Nguồn sự thật đã đối chiếu

| Ưu tiên | Nguồn | Trạng thái tại thời điểm audit |
|---|---|---|
| 1. Runtime | `npm run start:dev` chưa được chạy thành công trong bất kỳ phiên nào — **không có bằng chứng runtime**. Chỉ có `npx nest build` (compile-time) đã pass. | Chưa audit được |
| 2. Database | PostgreSQL 17 local (`postgresql-x64-17` service), DB `quanly_ccdc` | Đã audit thật — xem bảng bên dưới |
| 3. Source code GitHub | Nhánh `feature/scaffold-phase1`, commit `749615e` | Đã audit thật — xem bảng bên dưới |
| 4. Commit history | 2 commit: `ba91f3e` (scaffold), `749615e` (fix build error) | Đã đọc |
| 5. Prompt mô tả | Chat trước đó | Thấp nhất, không dùng làm evidence |

## Bảng tiến độ

| Hạng mục | Trạng thái | Evidence (file:dòng) |
|---|---|---|
| Data model Prisma đầy đủ (18 model/enum) | ✅ Có, đã migrate | `backend/prisma/schema.prisma` — 12 model + 6 enum: `AssetCategoryGroup`(22), `AssetCategory`(30), `Site`(50), `RackCabinet`(71), `RackPlacement`(86), `OperatingStatus`(105), `OwnershipStatus`(113), `ItAsset`(119), `Department`(157), `Employee`(170), `AssignmentStatus`(189), `EndUserAssignment`(195), `MaintenanceType`(221), `MaintenanceLog`(229), `SoftwareLicenseLink`(249), `NetworkAccessCredential`(269), `UserRole`(287), `User`(294) |
| Migration áp dụng vào DB thật | ✅ Đã chạy | `backend/prisma/migrations/20260810085140_init/` tồn tại; xác nhận bằng `psql \dt` trong phiên trước → 12 bảng nghiệp vụ + `_prisma_migrations` có thật trong `quanly_ccdc`. Re-verify lần 2 bằng `npx prisma migrate status` (2026-08-10, phiên hiện tại) → output thật: "1 migration found in prisma/migrations", "Database schema is up to date!" |
| Seed taxonomy 28 category | ✅ Đã chạy | `backend/prisma/seed.ts`; output thật "Seeded 28 asset categories" |
| Module `assets` — 5 route | ✅ Có code, ❌ chưa test runtime | `backend/src/modules/assets/assets.controller.ts`: `GET /assets`(9), `GET /assets/expiring-soon`(14), `GET /assets/by-tag/:assetTag`(19), `GET /assets/:id`(25), `POST /assets`(30) |
| Module `sites` — 2 route | ✅ Có code, ❌ chưa test runtime | `backend/src/modules/sites/sites.controller.ts`: `GET /sites`(8), `GET /sites/:id`(13) |
| Module `credentials` — mã hóa VPN/FortiClient | ⚠️ Service xong, **không có route HTTP** | `backend/src/modules/credentials/credentials.service.ts`: `upsert()`(28), `reveal()`(54); `backend/src/modules/credentials/credentials.module.ts` — không import `AssetsController`-style controller, comment dòng 6-8 giải thích lý do (chờ module `auth`) |
| Mã hóa AES-256-GCM | ✅ Có code, chưa có unit test | `backend/src/common/crypto/encryption.service.ts` |
| Module `auth` (JWT/RolesGuard) | ❌ Chưa tồn tại | Không có thư mục `backend/src/modules/auth/`; `app.module.ts`(1-21) không import module nào tên `Auth` |
| Module `assignments`, `maintenance`, `software-licenses`, `users` | ❌ Chưa tồn tại (chỉ có model DB, chưa có controller/service) | Không có thư mục tương ứng trong `backend/src/modules/`; các model `EndUserAssignment`, `MaintenanceLog`, `SoftwareLicenseLink`, `User` chỉ tồn tại ở tầng schema |
| Frontend — routing skeleton | ✅ Có, toàn bộ là placeholder | `frontend/src/App.tsx`: route `/`(28), `/assets`(29), `/sites`(30), `/scan`(31) — mỗi route render `<PlaceholderPage>`, không có UI thật |
| Frontend — Rack visualizer tương tác | ❌ Chưa code | Không tìm thấy component nào tên rack/visualizer trong `frontend/src/` |
| Frontend — QR scan mobile-web | ❌ Chưa code | Route `/scan` chỉ là `PlaceholderPage`, không có logic camera/decode |
| Offboarding/decommission state machine | ❌ Chưa code | `EndUserAssignment.status` enum có `OFFBOARDING`(schema.prisma:189-193) nhưng không có service/controller nào implement luồng thu hồi → backup → wipe → license → kho |
| Import dữ liệu từ Book1.xlsx | ❌ Chưa có script | Không có file import/migration script nào tham chiếu `Book1.xlsx` trong repo |
| Build backend (`nest build`) | ✅ Pass, 0 lỗi | Chạy thật trong phiên trước; log không có output lỗi sau khi sửa `assets.service.ts` (cast `Prisma.InputJsonValue`) |
| Build frontend (`vite build`) | ✅ Pass, 0 lỗi | Output thật: `dist/index.html`, `dist/assets/index-BTeJBiAA.js` (160.89 kB) |
| Server chạy được qua HTTP (runtime thật) | ❓ **Không kết luận được** | Chưa từng chạy `npm run start:dev` thành công trong phiên nào — sandbox chặn spawn tiến trình nền. Không được coi build-pass tương đương với "server chạy đúng" |

## Rủi ro / lệch hướng đã ghi nhận

1. **`credentials` module không có route** — nếu ai đó cần API thật cho VPN/FortiClient, phải làm `auth` module trước (RolesGuard chặn non-`IT_ADMIN`), nếu không sẽ có người thêm controller vội mà bỏ qua RBAC.
2. **Chưa có bằng chứng runtime nào** — mọi xác nhận "hoạt động" trong project này tới nay đều dừng ở compile-time/migration-time, chưa có request/response HTTP thật nào được quan sát.
3. **Book1.xlsx (359 dòng dữ liệu thật)** chưa được import — `IT_Asset`/`Site` trong DB hiện đang rỗng dữ liệu thật, chỉ có 28 dòng taxonomy seed.
