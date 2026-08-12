/**
 * Phase 1 scaffold shell. Route /assets có trang thật (FE-02) + auth
 * (FE-03, 2026-08-10): /login mới, /assets được bọc <RequireAuth>. Các
 * route còn lại (/, /sites, /scan) vẫn placeholder, không đụng trong
 * phase FE-03 - ngoài phạm vi ("1 phase 1 module").
 *
 * FE-05 (2026-08-12): thêm /users (bọc RequireAuth) - toàn bộ route
 * backend module users chỉ IT_ADMIN gọi được, nên link nav "/users" chỉ
 * hiện khi user.role === IT_ADMIN (tránh trải nghiệm bấm-vào-rồi-toàn-403).
 *
 * Bug thật phát hiện + sửa khi verify runtime FE-05: App không tự
 * re-render sau navigate('/assets')/navigate('/login') (login/logout ở
 * LoginPage/AssetsPage) vì App không subscribe router context - getUser()
 * chỉ được gọi đúng 1 lần lúc App mount, nên nav "Tài khoản" không hiện
 * ngay sau khi login (phải F5 mới thấy) dù đã đăng nhập IT_ADMIN thành
 * công. Sửa bằng useLocation() (chỉ dùng để ép re-render mỗi lần route
 * đổi, không đọc giá trị của nó) để getUser() luôn được gọi lại mỗi khi
 * điều hướng.
 */
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import AssetsPage from './pages/AssetsPage';
import UsersPage from './pages/UsersPage';
import LoginPage from './pages/LoginPage';
import RequireAuth from './components/RequireAuth';
import { getUser } from './lib/auth';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>{title}</h1>
      <p>Chưa triển khai - scaffold phase 1.</p>
    </div>
  );
}

export default function App() {
  // Ép App re-render mỗi khi route đổi (xem ghi chú bug ở trên) - không
  // dùng giá trị location, chỉ cần subscribe router context.
  useLocation();
  const user = getUser();

  return (
    <div>
      <nav style={{ display: 'flex', gap: 16, padding: 16, borderBottom: '1px solid #ddd' }}>
        <Link to="/">Dashboard</Link>
        <Link to="/assets">Thiết bị</Link>
        <Link to="/sites">Vị trí / Rack</Link>
        <Link to="/scan">Quét QR</Link>
        {user?.role === 'IT_ADMIN' && <Link to="/users">Tài khoản</Link>}
      </nav>
      <Routes>
        <Route path="/" element={<PlaceholderPage title="Dashboard vòng đời & hạn hợp đồng" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/assets"
          element={
            <RequireAuth>
              <AssetsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/users"
          element={
            <RequireAuth>
              <UsersPage />
            </RequireAuth>
          }
        />
        <Route path="/sites" element={<PlaceholderPage title="Sơ đồ vị trí & Rack" />} />
        <Route path="/scan" element={<PlaceholderPage title="Quét QR tra cứu thiết bị" />} />
      </Routes>
    </div>
  );
}
