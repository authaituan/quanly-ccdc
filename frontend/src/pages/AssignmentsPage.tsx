/**
 * FE-06: trang cấp phát/thu hồi thiết bị, /assignments.
 * GET /assignments không giới hạn role (mọi role đăng nhập xem được) -
 * khác /users (ẩn cả trang), ở đây chỉ nút "Cấp phát"/"Thu hồi" ẩn nếu
 * không phải IT_ADMIN (khớp @Roles backend trên POST/PATCH).
 *
 * Response GET/POST/PATCH /assignments include đầy đủ asset+employee+
 * department lồng sẵn (assignments.service.ts) - không cần fetchById
 * sau mutation, merge thẳng response vào state (giống UsersPage, khác
 * AssetsPage).
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearSession, getToken, getUser } from '../lib/auth';
import AssignmentFormModal, { type AssignmentFormValues, type EmployeeOptionDto } from '../components/AssignmentFormModal';

const API_BASE = 'http://localhost:3000';

interface AssignmentDto {
  id: string;
  assetId: string;
  employeeId: string | null;
  departmentId: string | null;
  handoverDate: string;
  expectedReturnDate: string | null;
  actualReturnDate: string | null;
  status: string;
  asset: { id: string; assetTag: string; name: string; operatingStatus: string };
  employee: { id: string; fullName: string; employeeCode: string | null } | null;
  department: { id: string; name: string } | null;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; assignments: AssignmentDto[] };

export default function AssignmentsPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const user = getUser();
  const isItAdmin = user?.role === 'IT_ADMIN';

  const [employees, setEmployees] = useState<EmployeeOptionDto[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function authHeaders(extra?: Record<string, string>) {
    return { Authorization: `Bearer ${getToken()}`, ...extra };
  }

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    fetch(`${API_BASE}/assignments`, { headers: authHeaders() })
      .then((res) => {
        if (res.status === 401) {
          clearSession();
          navigate('/login', { replace: true });
          throw new Error('__redirecting__');
        }
        if (!res.ok) throw new Error(`Backend trả về HTTP ${res.status}`);
        return res.json() as Promise<AssignmentDto[]>;
      })
      .then((assignments) => {
        if (!cancelled) setState({ status: 'ready', assignments });
      })
      .catch((err: unknown) => {
        if (cancelled || (err instanceof Error && err.message === '__redirecting__')) return;
        const message =
          err instanceof TypeError
            ? `Không kết nối được tới backend (${API_BASE}).`
            : err instanceof Error
              ? err.message
              : 'Lỗi không xác định';
        setState({ status: 'error', message });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  async function ensureEmployeesLoaded() {
    if (employees.length > 0) return;
    try {
      const res = await fetch(`${API_BASE}/employees`, { headers: authHeaders() });
      if (res.status === 401) {
        clearSession();
        navigate('/login', { replace: true });
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as EmployeeOptionDto[];
      setEmployees(data);
    } catch {
      // Modal vẫn dùng được không có dropdown employee (optional field).
    }
  }

  async function openCreateModal() {
    setFormError(null);
    await ensureEmployeesLoaded();
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setFormError(null);
  }

  async function handleLookupAsset(assetTag: string) {
    const res = await fetch(`${API_BASE}/assets/by-tag/${encodeURIComponent(assetTag)}`, { headers: authHeaders() });
    if (res.status === 401) {
      clearSession();
      navigate('/login', { replace: true });
      return null;
    }
    if (!res.ok) return null;
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  }

  async function handleFormSubmit(values: AssignmentFormValues) {
    setFormSubmitting(true);
    setFormError(null);
    try {
      const payload = {
        assetId: values.assetId,
        employeeId: values.employeeId || undefined,
        handoverDate: values.handoverDate,
        expectedReturnDate: values.expectedReturnDate || undefined,
      };
      const res = await fetch(`${API_BASE}/assignments`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        clearSession();
        navigate('/login', { replace: true });
        return;
      }
      const text = await res.text();
      const body = text ? JSON.parse(text) : null;
      if (!res.ok) {
        const message = Array.isArray(body?.message) ? body.message.join(', ') : (body?.message ?? `HTTP ${res.status}`);
        setFormError(message);
        return;
      }
      const saved = body as AssignmentDto;
      setState((s) => {
        if (s.status !== 'ready') return s;
        return { status: 'ready', assignments: [saved, ...s.assignments] };
      });
      setModalOpen(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleReturn(assignment: AssignmentDto) {
    if (!window.confirm(`Thu hồi thiết bị "${assignment.asset.assetTag}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/assignments/${assignment.id}/return`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({}),
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
      const updated = body as AssignmentDto;
      setState((s) => {
        if (s.status !== 'ready') return s;
        return { status: 'ready', assignments: s.assignments.map((a) => (a.id === updated.id ? updated : a)) };
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi không xác định');
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Cấp phát / Thu hồi thiết bị</h1>
        {isItAdmin && <button onClick={openCreateModal}>+ Cấp phát mới</button>}
      </div>

      {state.status === 'loading' && <p>Đang tải lịch sử cấp phát...</p>}

      {state.status === 'error' && (
        <div style={{ padding: 12, background: '#fee', border: '1px solid #f99', borderRadius: 4, color: '#900' }}>
          <strong>Không tải được dữ liệu:</strong> {state.message}
        </div>
      )}

      {state.status === 'ready' && (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #333' }}>
              <th style={{ padding: 8 }}>Thiết bị</th>
              <th style={{ padding: 8 }}>Nhân viên</th>
              <th style={{ padding: 8 }}>Trạng thái</th>
              <th style={{ padding: 8 }}>Ngày cấp</th>
              <th style={{ padding: 8 }}>Ngày thu hồi</th>
              <th style={{ padding: 8 }}></th>
            </tr>
          </thead>
          <tbody>
            {state.assignments.map((a) => (
              <tr key={a.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 8, fontFamily: 'monospace' }}>{a.asset.assetTag}</td>
                <td style={{ padding: 8 }}>{a.employee?.fullName ?? '-'}</td>
                <td style={{ padding: 8 }}>{a.status}</td>
                <td style={{ padding: 8 }}>{a.handoverDate?.slice(0, 10)}</td>
                <td style={{ padding: 8 }}>{a.actualReturnDate?.slice(0, 10) ?? '-'}</td>
                <td style={{ padding: 8 }}>
                  {isItAdmin && a.status === 'ACTIVE' && <button onClick={() => handleReturn(a)}>Thu hồi</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <AssignmentFormModal
          employees={employees}
          submitting={formSubmitting}
          errorMessage={formError}
          onLookupAsset={handleLookupAsset}
          onSubmit={handleFormSubmit}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
