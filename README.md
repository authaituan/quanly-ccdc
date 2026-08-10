# Quản lý CCDC — IT Asset Management (ITAM)

Hệ thống quản lý tài sản CNTT: thiết bị mạng/hạ tầng core, máy chủ & lưu trữ,
thiết bị đầu cuối, thiết bị giám sát/an ninh, vật tư phụ trợ CNTT.

Scope, mô hình dữ liệu và các quyết định thiết kế được chốt ngày 2026-08-10
(xem lịch sử chat với chủ project để biết đầy đủ rationale).

## Tech stack

- Backend: NestJS + TypeScript + Prisma + PostgreSQL
- Frontend: React + Vite + TypeScript
- Auth: JWT, role-based (`IT_ADMIN`, `ACCOUNTANT`, `WAREHOUSE_MANAGER`, `STAFF`)

## Cấu trúc thư mục

```
backend/
  prisma/schema.prisma   # data model đầy đủ - nguồn sự thật cho DB
  prisma/seed.ts         # seed taxonomy AssetCategory
  src/modules/assets/    # module mẫu (controller+service+dto) - theo pattern này cho các module còn lại
  src/modules/sites/     # sites + rack (đọc, phục vụ rack visualizer)
  src/modules/credentials/ # NetworkAccessCredential, mã hóa AES-256-GCM, chỉ IT_ADMIN đọc được
  src/common/crypto/     # EncryptionService dùng chung
frontend/
  src/App.tsx            # routing skeleton, 4 trang placeholder theo IA đã duyệt
```

## Data model — bảng chính (`backend/prisma/schema.prisma`)

- `AssetCategory` — taxonomy 5 nhóm thiết bị CNTT (seed sẵn trong `seed.ts`)
- `Site` — mọi địa điểm vật lý (bưu cục, trụ sở, DC); cha của `RackCabinet`
- `RackCabinet` / `RackPlacement` — sơ đồ tủ rack, vị trí U, PDU outlet
- `IT_Asset` — bảng tài sản trung tâm (spec, IP, MAC, trạng thái, hạn bảo hành/SmartNet)
- `Department` / `Employee` — tổ chức nội bộ (tối giản)
- `EndUserAssignment` — cấp phát/thu hồi thiết bị đầu cuối, checklist bàn giao, xác nhận nhân sự
- `MaintenanceLog` — lịch sử nâng cấp/sửa chữa/bảo hành/re-image
- `SoftwareLicenseLink` — license phần mềm gắn theo thiết bị
- `NetworkAccessCredential` — VPN/FortiClient, **mã hóa**, tách bảng riêng, chỉ `IT_ADMIN`
- `User` — tài khoản đăng nhập hệ thống + role

## Trạng thái scaffold (Phase 1 — chưa hoàn thiện)

Đã có: data model đầy đủ, module `assets` (CRUD + cảnh báo hết hạn bảo hành/SmartNet
trong 60 ngày + tra cứu theo asset tag cho luồng quét QR), module `sites` (đọc, phục vụ
rack visualizer), module `credentials` (service mã hóa, RBAC ở tầng service — **chưa
có controller/route**, cần hoàn thiện auth module trước).

Chưa có (để lại cho phase tiếp theo, theo đúng nguyên tắc "1 phase 1 chat"):
- Module `auth` (JWT strategy, RolesGuard) — bắt buộc phải xong trước khi mở route cho `credentials`
- Module `assignments`, `maintenance`, `software-licenses`, `users` (controller/service theo đúng pattern của `assets`)
- Frontend: các trang thật (danh sách thiết bị, rack visualizer tương tác, quét QR qua camera, dashboard cảnh báo)
- Luồng offboarding/decommission (thu hồi → backup → wipe → thu hồi license → nhập kho) — cần state machine riêng trên `EndUserAssignment.status` + `IT_Asset.operatingStatus`
- Script import dữ liệu từ Book1.xlsx (Merge1) vào `IT_Asset`/`Site`

## Setup local (khi cần chạy thử)

```bash
cd backend
cp .env.example .env   # điền DATABASE_URL, JWT_SECRET, CREDENTIALS_ENCRYPTION_KEY thật
npm install
npm run prisma:migrate
npx prisma db seed
npm run start:dev
```

```bash
cd frontend
npm install
npm run dev
```
