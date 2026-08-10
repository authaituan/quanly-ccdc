/**
 * Phase 1 scaffold shell. Real pages (Asset list, Rack visualizer, QR
 * scanner, Lifecycle dashboard) land in a follow-up phase per the
 * "one phase per chat" rule - this only proves the routing skeleton
 * against the planned IA.
 */
import { Routes, Route, Link } from 'react-router-dom';

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
        <Route path="/assets" element={<PlaceholderPage title="Danh sách thiết bị CNTT" />} />
        <Route path="/sites" element={<PlaceholderPage title="Sơ đồ vị trí & Rack" />} />
        <Route path="/scan" element={<PlaceholderPage title="Quét QR tra cứu thiết bị" />} />
      </Routes>
    </div>
  );
}
