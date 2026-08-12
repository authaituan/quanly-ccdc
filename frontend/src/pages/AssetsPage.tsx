/**
 * FE-02: trang danh sách thiết bị thật, thay PlaceholderPage.
 * FE-03 (2026-08-10): giờ đã có auth - request đính kèm
 * Authorization: Bearer <token>, 401 -> clearSession() + redirect /login
 * (xem lib/auth.ts). Route này được bọc bởi <RequireAuth> ở App.tsx nên
 * không thể mount nếu chưa có token, nhưng backend vẫn là nguồn sự thật
 * cuối cùng cho việc token còn hợp lệ hay không (token hết hạn giữa
 * phiên vẫn phải bị BE từ chối, không chỉ dựa vào việc FE thấy có token).
 *
 * Lưu ý bảo mật cũ (vẫn còn đúng): `currentUser` (dữ liệu cá nhân) CỐ Ý
 * không hiển thị trên bảng tổng, chỉ hiện khi người dùng chủ động mở chi
 * tiết 1 dòng (expand).
 *
 * Gọi thẳng http://localhost:3000 (không qua proxy /api của vite.config.ts
 * - proxy đó trỏ đúng host nhưng backend không có prefix /api nên không
 * dùng được nguyên trạng; xem PROJECT_STATUS.md phase FE-02 để biết lý do).
 */
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearSession, getToken, getUser } from '../lib/auth';
import AssetFormModal, {
  type AssetCategoryDto,
  type AssetFormValues,
  type SiteOptionDto,
} from '../components/AssetFormModal';

const API_BASE = 'http://localhost:3000';

interface AssetCategory {
  id: string;
  code: string;
  name: string;
}

interface Site {
  id: string;
  code: string;
  name: string;
  address: string | null;
  provinceCode: string | null;
  provinceName: string | null;
  regionCode: string | null;
  regionName: string | null;
  wardCode: string | null;
  wardName: string | null;
  centralWardName: string | null;
  pointType: string | null;
}

interface CredentialsDto {
  vpnUsername: string | null;
  vpnPassword: string | null;
  fortiClientUsername: string | null;
  fortiClientPassword: string | null;
}

const NOTES_TEN_MAY_PREFIX = 'Tên máy (nguồn Book1.xlsx): ';

// BE-01/AST-import: notes lưu cố định dạng "Tên máy (nguồn Book1.xlsx): <ten>"
// (xem import-book1.ts) - cắt tiền tố để lấy đúng "Tên máy" gốc từ Excel.
function extractTenMay(notes: string | null): string {
  if (!notes) return '-';
  return notes.startsWith(NOTES_TEN_MAY_PREFIX) ? notes.slice(NOTES_TEN_MAY_PREFIX.length) : notes;
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

// Cột "Tình trạng" (operatingStatus) và "Ngày cấp" cố ý KHÔNG hiển thị ở
// đâu trong phase này - không thuộc danh sách cột đã chốt (thứ tự theo
// Book1.xlsx gốc), và "Ngày cấp" vốn không được import vào DB. Nợ kỹ
// thuật đã biết, để phase khác quyết định có cần hiển thị lại không.

type CredState =
  | { status: 'loading' }
  | { status: 'none' } // asset chưa có NetworkAccessCredential nào (body rỗng, xem audit)
  | { status: 'ready'; data: CredentialsDto }
  | { status: 'error'; message: string };

export default function AssetsPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // CRED-04 (phương án A): chỉ IT_ADMIN mới lazy-load VPN/Forti, chỉ khi
  // mở rộng đúng dòng đó - không gọi trước cho toàn bộ danh sách.
  const [credState, setCredState] = useState<CredState | null>(null);
  const user = getUser();
  const isItAdmin = user?.role === 'IT_ADMIN';
  // AST-04/AUTH-02: POST/PATCH /assets cho phép IT_ADMIN + WAREHOUSE_MANAGER,
  // DELETE (thanh lý) chỉ IT_ADMIN - khớp bảng phân quyền backend đã duyệt.
  const canEditAsset = user?.role === 'IT_ADMIN' || user?.role === 'WAREHOUSE_MANAGER';

  // FE-04: Tạo mới/Sửa asset. modal null = đóng; categories/sites nạp lười
  // (chỉ khi mở modal lần đầu), dùng chung cho cả 2 chế độ.
  const [categories, setCategories] = useState<AssetCategoryDto[]>([]);
  const [sites, setSites] = useState<SiteOptionDto[]>([]);
  const [optionsLoaded, setOptionsLoaded] = useState(false);
  const [modal, setModal] = useState<
    | null
    | { mode: 'create' }
    | { mode: 'edit'; asset: ItAssetDto }
  >(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function handleLogout() {
    clearSession();
    navigate('/login', { replace: true });
  }

  function authHeaders(extra?: Record<string, string>) {
    return { Authorization: `Bearer ${getToken()}`, ...extra };
  }

  async function ensureOptionsLoaded() {
    if (optionsLoaded) return;
    try {
      const [catRes, siteRes] = await Promise.all([
        fetch(`${API_BASE}/asset-categories`, { headers: authHeaders() }),
        fetch(`${API_BASE}/sites`, { headers: authHeaders() }),
      ]);
      if (catRes.status === 401 || siteRes.status === 401) {
        clearSession();
        navigate('/login', { replace: true });
        return;
      }
      const cats = (await catRes.json()) as AssetCategoryDto[];
      const siteList = (await siteRes.json()) as SiteOptionDto[];
      setCategories(cats);
      setSites(siteList);
      setOptionsLoaded(true);
    } catch {
      setFormError('Không tải được danh sách Loại máy / Bưu cục.');
    }
  }

  async function openCreateModal() {
    setFormError(null);
    await ensureOptionsLoaded();
    setModal({ mode: 'create' });
  }

  async function openEditModal(asset: ItAssetDto) {
    setFormError(null);
    await ensureOptionsLoaded();
    setModal({ mode: 'edit', asset });
  }

  function closeModal() {
    setModal(null);
    setFormError(null);
  }

  function toAssetTagPayload(values: AssetFormValues) {
    // Field optional rỗng (chuỗi '') -> undefined, không gửi chuỗi rỗng cho
    // backend (DTO @IsOptional @IsString chấp nhận thiếu field, không chấp
    // nhận '' cho siteId FK).
    const opt = (v: string) => (v.trim() === '' ? undefined : v.trim());
    return {
      assetTag: values.assetTag.trim(),
      name: values.name.trim(),
      categoryId: values.categoryId,
      siteId: opt(values.siteId),
      manufacturer: opt(values.manufacturer),
      model: opt(values.model),
      serialNumber: opt(values.serialNumber),
      ipAddress: opt(values.ipAddress),
      macAddress: opt(values.macAddress),
      operatingStatus: values.operatingStatus,
      ownershipStatus: values.ownershipStatus,
    };
  }

  async function handleFormSubmit(values: AssetFormValues) {
    if (!modal) return;
    setFormSubmitting(true);
    setFormError(null);
    try {
      const isCreate = modal.mode === 'create';
      const url = isCreate ? `${API_BASE}/assets` : `${API_BASE}/assets/${modal.asset.id}`;
      const res = await fetch(url, {
        method: isCreate ? 'POST' : 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(toAssetTagPayload(values)),
      });
      if (res.status === 401) {
        clearSession();
        navigate('/login', { replace: true });
        return;
      }
      const text = await res.text();
      const body = text ? JSON.parse(text) : null;
      if (!res.ok) {
        // 400/409 backend trả {message: string}. Hiện đúng message backend,
        // không tự chế message khác (quy tắc dự án).
        const message = Array.isArray(body?.message) ? body.message.join(', ') : (body?.message ?? `HTTP ${res.status}`);
        setFormError(message);
        return;
      }
      // Bug thật phát hiện khi verify runtime (2026-08-11): response của
      // POST/PATCH /assets KHÔNG include category/site lồng (chỉ có
      // categoryId/siteId phẳng, xem assets.service.ts create()/update()) -
      // chèn thẳng vào state làm crash render (a.category.name undefined).
      // Fix: gọi GET /assets/:id (có include category+site đầy đủ) để lấy
      // đúng 1 dòng hoàn chỉnh trước khi merge vào state (vẫn không gọi lại
      // toàn bộ GET /assets, đúng thiết kế 2d đã duyệt).
      const savedId = (body as { id: string }).id;
      const full = await fetchAssetById(savedId);
      setState((s) => {
        if (s.status !== 'ready') return s;
        if (isCreate) return { status: 'ready', assets: [...s.assets, full] };
        return { status: 'ready', assets: s.assets.map((a) => (a.id === full.id ? full : a)) };
      });
      setModal(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDecommission(asset: ItAssetDto) {
    if (!window.confirm(`Thanh lý thiết bị "${asset.assetTag}"? Thiết bị sẽ chuyển sang trạng thái DECOMMISSIONED.`)) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/assets/${asset.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.status === 401) {
        clearSession();
        navigate('/login', { replace: true });
        return;
      }
      const text = await res.text();
      const body = text ? JSON.parse(text) : null;
      if (!res.ok) {
        alert(body?.message ?? `HTTP ${res.status}`);
        return;
      }
      // Cùng lý do như handleFormSubmit - DELETE /assets/:id (decommission)
      // cũng trả asset phẳng, không có category/site lồng.
      const updatedId = (body as { id: string }).id;
      const full = await fetchAssetById(updatedId);
      setState((s) => {
        if (s.status !== 'ready') return s;
        return { status: 'ready', assets: s.assets.map((a) => (a.id === full.id ? full : a)) };
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi không xác định');
    }
  }

  async function fetchAssetById(id: string): Promise<ItAssetDto> {
    const res = await fetch(`${API_BASE}/assets/${id}`, { headers: authHeaders() });
    if (res.status === 401) {
      clearSession();
      navigate('/login', { replace: true });
      throw new Error('__redirecting__');
    }
    if (!res.ok) throw new Error(`Backend trả về HTTP ${res.status}`);
    return (await res.json()) as ItAssetDto;
  }

  async function toggleExpand(assetId: string) {
    if (expandedId === assetId) {
      setExpandedId(null);
      setCredState(null);
      return;
    }
    setExpandedId(assetId);
    setCredState(null);
    if (!isItAdmin) return; // role khác IT_ADMIN: không gọi API credentials, không hiện Nhóm B

    setCredState({ status: 'loading' });
    try {
      const res = await fetch(`${API_BASE}/assets/${assetId}/credentials`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.status === 401) {
        clearSession();
        navigate('/login', { replace: true });
        return;
      }
      if (!res.ok) throw new Error(`Backend trả về HTTP ${res.status}`);
      // Audit thật (2026-08-10): khi asset chưa có credential nào, backend
      // trả body RỖNG (Content-Length: 0), không phải chuỗi JSON "null" -
      // res.json() trên body rỗng sẽ throw. Đọc text trước để xử lý đúng.
      const text = await res.text();
      if (!text) {
        setCredState({ status: 'none' });
        return;
      }
      const data = JSON.parse(text) as CredentialsDto;
      setCredState({ status: 'ready', data });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi không xác định';
      setCredState({ status: 'error', message });
    }
  }

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    fetch(`${API_BASE}/assets`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => {
        if (res.status === 401) {
          // Quyết định 2b: token hết hạn/không hợp lệ -> xóa session,
          // redirect /login ngay, không chỉ hiện lỗi trên trang.
          clearSession();
          navigate('/login', { replace: true });
          throw new Error('__redirecting__'); // chặn .then tiếp theo, không set state lỗi thừa
        }
        if (!res.ok) throw new Error(`Backend trả về HTTP ${res.status}`);
        return res.json() as Promise<ItAssetDto[]>;
      })
      .then((assets) => {
        if (!cancelled) setState({ status: 'ready', assets });
      })
      .catch((err: unknown) => {
        if (cancelled || (err instanceof Error && err.message === '__redirecting__')) return;
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
  }, [navigate]);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ margin: 0 }}>Danh sách thiết bị CNTT</h1>
          {canEditAsset && <button onClick={openCreateModal}>+ Thêm thiết bị</button>}
        </div>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
            <span>
              {user.fullName} <span style={{ color: '#666' }}>({user.role})</span>
            </span>
            <button onClick={handleLogout}>Đăng xuất</button>
          </div>
        )}
      </div>

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
                <th style={{ padding: 8 }}>Mã BĐT/TP</th>
                <th style={{ padding: 8 }}>Tên BĐT/TP</th>
                <th style={{ padding: 8 }}>Mã MBC</th>
                <th style={{ padding: 8 }}>Tên bưu cục</th>
                <th style={{ padding: 8 }}>Mã BĐX</th>
                <th style={{ padding: 8 }}>Tên Bưu điện xã</th>
                <th style={{ padding: 8 }}>Loại</th>
                <th style={{ padding: 8 }}>IP</th>
                <th style={{ padding: 8 }}>Tên máy</th>
                <th style={{ padding: 8 }}>Địa chỉ MAC</th>
                <th style={{ padding: 8 }}>Loại máy</th>
                <th style={{ padding: 8 }}>Hãng</th>
                <th style={{ padding: 8 }}>Model</th>
                <th style={{ padding: 8 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <Fragment key={a.id}>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 8, fontFamily: 'monospace' }}>{a.assetTag}</td>
                    <td style={{ padding: 8 }}>{a.site?.provinceCode ?? '-'}</td>
                    <td style={{ padding: 8 }}>{a.site?.provinceName ?? '-'}</td>
                    <td style={{ padding: 8 }}>{a.site?.code ?? '-'}</td>
                    <td style={{ padding: 8 }}>{a.site?.name ?? '-'}</td>
                    <td style={{ padding: 8 }}>{a.site?.wardCode ?? '-'}</td>
                    <td style={{ padding: 8 }}>{a.site?.wardName ?? '-'}</td>
                    <td style={{ padding: 8 }}>{a.site?.pointType ?? '-'}</td>
                    <td style={{ padding: 8, fontFamily: 'monospace' }}>{a.ipAddress ?? '-'}</td>
                    <td style={{ padding: 8 }}>{extractTenMay(a.notes)}</td>
                    <td style={{ padding: 8, fontFamily: 'monospace' }}>{a.macAddress ?? '-'}</td>
                    <td style={{ padding: 8 }}>{a.category.name}</td>
                    <td style={{ padding: 8 }}>{a.manufacturer ?? '-'}</td>
                    <td style={{ padding: 8 }}>{a.model ?? '-'}</td>
                    <td style={{ padding: 8 }}>
                      <button onClick={() => toggleExpand(a.id)}>{expandedId === a.id ? 'Ẩn' : 'Chi tiết'}</button>
                    </td>
                  </tr>
                  {expandedId === a.id && (
                    <tr key={`${a.id}-detail`} style={{ background: '#fafafa' }}>
                      <td colSpan={15} style={{ padding: 12 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 14 }}>
                          {/* Nhóm A - mọi role */}
                          <div>
                            <strong>Serial Number/TAG:</strong> {a.serialNumber ?? '-'}
                          </div>
                          <div>
                            <strong>Hệ điều hành:</strong> {a.specs?.os ?? '-'}
                          </div>
                          <div>
                            <strong>CPU:</strong> {a.specs?.cpu ?? '-'}
                          </div>
                          <div>
                            <strong>RAM:</strong> {a.specs?.ram ?? '-'}
                          </div>
                          <div>
                            <strong>Ổ cứng:</strong> {a.specs?.storage ?? '-'}
                          </div>
                          <div>
                            <strong>Người sử dụng:</strong> {a.currentUser ?? '-'}
                          </div>
                          <div>
                            <strong>Mã BĐKV:</strong> {a.site?.regionCode ?? '-'}
                          </div>
                          <div>
                            <strong>Tên BĐKV:</strong> {a.site?.regionName ?? '-'}
                          </div>
                          <div>
                            <strong>Bưu điện xã trung tâm:</strong> {a.site?.centralWardName ?? '-'}
                          </div>
                          <div>
                            <strong>Địa chỉ chi tiết:</strong> {a.site?.address ?? '-'}
                          </div>
                        </div>

                        {canEditAsset && (
                          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                            <button onClick={() => openEditModal(a)}>Sửa</button>
                            {isItAdmin && a.operatingStatus !== 'DECOMMISSIONED' && (
                              <button onClick={() => handleDecommission(a)}>Thanh lý</button>
                            )}
                          </div>
                        )}

                        {/* Nhóm B - CHỈ IT_ADMIN (CRED-04 phương án A): role khác không
                            thấy dòng nào ở đây, kể cả tiêu đề nhóm - ẩn hoàn toàn. */}
                        {isItAdmin && (
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #ccc' }}>
                            <strong style={{ display: 'block', marginBottom: 8 }}>VPN / FortiClient</strong>
                            {credState?.status === 'loading' && <p>Đang tải...</p>}
                            {credState?.status === 'error' && (
                              <p style={{ color: '#900' }}>Không tải được: {credState.message}</p>
                            )}
                            {credState?.status === 'none' && <p>Chưa cấu hình VPN/FortiClient</p>}
                            {credState?.status === 'ready' && (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 14 }}>
                                <div>
                                  <strong>User VPN:</strong> {credState.data.vpnUsername ?? '-'}
                                </div>
                                <div>
                                  <strong>Password VPN:</strong> {credState.data.vpnPassword ?? '-'}
                                </div>
                                <div>
                                  <strong>User FortiClient:</strong> {credState.data.fortiClientUsername ?? '-'}
                                </div>
                                <div>
                                  <strong>Password FortiClient:</strong> {credState.data.fortiClientPassword ?? '-'}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </>
      )}

      {modal && (
        <AssetFormModal
          mode={modal.mode}
          categories={categories}
          sites={sites}
          initialValues={modal.mode === 'edit' ? assetToFormValues(modal.asset) : undefined}
          submitting={formSubmitting}
          errorMessage={formError}
          onSubmit={handleFormSubmit}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function assetToFormValues(a: ItAssetDto): AssetFormValues {
  return {
    assetTag: a.assetTag,
    name: a.name,
    categoryId: a.category.id,
    siteId: a.site?.id ?? '',
    manufacturer: a.manufacturer ?? '',
    model: a.model ?? '',
    serialNumber: a.serialNumber ?? '',
    ipAddress: a.ipAddress ?? '',
    macAddress: a.macAddress ?? '',
    operatingStatus: a.operatingStatus,
    ownershipStatus: a.ownershipStatus,
  };
}
