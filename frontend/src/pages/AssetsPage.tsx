/**
 * FE-02: trang danh sách thiết bị thật, thay PlaceholderPage.
 *
 * Lưu ý bảo mật (xem PROJECT_STATUS.md): trang này KHÔNG có auth. Backend
 * GET /assets trả về toàn bộ scalar field của ItAsset, bao gồm cả
 * `currentUser` (dữ liệu cá nhân) - trang này CỐ Ý không hiển thị
 * currentUser trên bảng tổng, chỉ hiện khi người dùng chủ động mở chi
 * tiết 1 dòng (expand). Không sửa gì ở backend trong phase này.
 *
 * Gọi thẳng http://localhost:3000 (không qua proxy /api của vite.config.ts
 * - proxy đó trỏ đúng host nhưng backend không có prefix /api nên không
 * dùng được nguyên trạng; xem PROJECT_STATUS.md phase FE-02 để biết lý do).
 */
import { Fragment, useEffect, useMemo, useState } from 'react';

const API_BASE = 'http://localhost:3000';

interface AssetCategory {
  code: string;
  name: string;
}

interface Site {
  code: string;
  name: string;
}

interface ItAssetDto {
  id: string;
  assetTag: string;
  name: string;
  notes: string | null;
  ipAddress: string | null;
  macAddress: string | null;
  currentUser: string | null;
  operatingStatus: string;
  ownershipStatus: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  specs: Record<string, string> | null;
  category: AssetCategory;
  site: Site | null;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; assets: ItAssetDto[] };

const OPERATING_STATUS_LABEL: Record<string, string> = {
  IN_STOCK: 'Dự phòng trong kho',
  PRODUCTION: 'Đang chạy',
  MAINTENANCE: 'Đang bảo trì/Sửa chữa',
  FAULTY: 'Lỗi/Báo hỏng',
  DECOMMISSIONED: 'Thanh lý',
};

export default function AssetsPage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    fetch(`${API_BASE}/assets`)
      .then((res) => {
        if (!res.ok) throw new Error(`Backend trả về HTTP ${res.status}`);
        return res.json() as Promise<ItAssetDto[]>;
      })
      .then((assets) => {
        if (!cancelled) setState({ status: 'ready', assets });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof TypeError
            ? `Không kết nối được tới backend (${API_BASE}). Kiểm tra backend đã chạy (npm run start:dev) và không bị chặn CORS.`
            : err instanceof Error
              ? err.message
              : 'Lỗi không xác định';
        setState({ status: 'error', message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (state.status !== 'ready') return [];
    const q = query.trim().toLowerCase();
    if (!q) return state.assets;
    return state.assets.filter(
      (a) => a.assetTag.toLowerCase().includes(q) || (a.site?.name ?? '').toLowerCase().includes(q),
    );
  }, [state, query]);

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1>Danh sách thiết bị CNTT</h1>

      <input
        type="text"
        placeholder="Tìm theo mã thiết bị (assetTag) hoặc tên bưu cục..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ padding: 8, width: 360, marginBottom: 16, border: '1px solid #ccc', borderRadius: 4 }}
      />

      {state.status === 'loading' && <p>Đang tải danh sách thiết bị...</p>}

      {state.status === 'error' && (
        <div style={{ padding: 12, background: '#fee', border: '1px solid #f99', borderRadius: 4, color: '#900' }}>
          <strong>Không tải được dữ liệu:</strong> {state.message}
        </div>
      )}

      {state.status === 'ready' && (
        <>
          <p style={{ color: '#666' }}>
            Hiển thị {filtered.length} / {state.assets.length} thiết bị
          </p>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #333' }}>
                <th style={{ padding: 8 }}>Mã thiết bị</th>
                <th style={{ padding: 8 }}>Tên máy (nguồn gốc)</th>
                <th style={{ padding: 8 }}>Loại</th>
                <th style={{ padding: 8 }}>Bưu cục</th>
                <th style={{ padding: 8 }}>Tình trạng</th>
                <th style={{ padding: 8 }}>IP</th>
                <th style={{ padding: 8 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <Fragment key={a.id}>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 8, fontFamily: 'monospace' }}>{a.assetTag}</td>
                    <td style={{ padding: 8 }}>{a.notes ?? a.name}</td>
                    <td style={{ padding: 8 }}>{a.category.name}</td>
                    <td style={{ padding: 8 }}>{a.site?.name ?? '-'}</td>
                    <td style={{ padding: 8 }}>{OPERATING_STATUS_LABEL[a.operatingStatus] ?? a.operatingStatus}</td>
                    <td style={{ padding: 8, fontFamily: 'monospace' }}>{a.ipAddress ?? '-'}</td>
                    <td style={{ padding: 8 }}>
                      <button onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}>
                        {expandedId === a.id ? 'Ẩn' : 'Chi tiết'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === a.id && (
                    <tr key={`${a.id}-detail`} style={{ background: '#fafafa' }}>
                      <td colSpan={7} style={{ padding: 12 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 14 }}>
                          <div>
                            <strong>Hãng / Model:</strong> {a.manufacturer ?? '-'} / {a.model ?? '-'}
                          </div>
                          <div>
                            <strong>Serial:</strong> {a.serialNumber ?? '-'}
                          </div>
                          <div>
                            <strong>MAC:</strong> {a.macAddress ?? '-'}
                          </div>
                          <div>
                            <strong>Người sử dụng:</strong> {a.currentUser ?? '-'}
                          </div>
                          <div>
                            <strong>Sở hữu:</strong> {a.ownershipStatus}
                          </div>
                          {a.specs && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <strong>Cấu hình:</strong>{' '}
                              {Object.entries(a.specs)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(' · ')}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
