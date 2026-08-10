/**
 * Phase 1 scaffold shell. Route /assets có trang thật (FE-02, xem
 * frontend/src/pages/AssetsPage.tsx). Các route còn lại (/, /sites, /scan)
 * vẫn placeholder - ngoài phạm vi phase này ("1 phase 1 module").
 */
import { Routes, Route, Link } from 'react-router-dom';
import AssetsPage from './pages/AssetsPage';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>{title}</h1>
      <p>Chưa triển khai - scaffold phase 1.</p>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <nav style={{ display: 'flex', gap: 16, padding: 16, borderBottom: '1px solid #ddd' }}>
        <Link to="/">Dashboard</Link>
        <Link to="/assets">Thiết bị</Link>
        <Link to="/sites">Vị trí / Rack</Link>
        <Link to="/scan">Quét QR</Link>
      </nav>
      <Routes>
        <Route path="/" element={<PlaceholderPage title="Dashboard vòng đời & hạn hợp đồng" />} />
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/sites" element={<PlaceholderPage title="Sơ đồ vị trí & Rack" />} />
        <Route path="/scan" element={<PlaceholderPage title="Quét QR tra cứu thiết bị" />} />
      </Routes>
    </div>
  );
}
