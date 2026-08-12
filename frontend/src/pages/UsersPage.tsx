/**
 * FE-05: trang quản lý tài khoản, /users - chỉ IT_ADMIN (mọi route
 * backend module users chỉ IT_ADMIN gọi được, trừ tự đổi password của
 * chính mình - không áp dụng ở trang admin này). Route bọc RequireAuth
 * ở App.tsx; điều kiện role IT_ADMIN chặn thêm trong chính trang này -
 * xem audit FE-05 bước 1.
 *
 * Response GET/POST/PATCH/DELETE /users đều trả cùng 1 shape phẳng
 * (SAFE_USER_SELECT ở backend, không có field lồng quan hệ) - khác
 * AssetsPage, KHÔNG cần fetchById sau mutation, merge thẳng response
 * vào state.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearSession, getToken, getUser } from '../lib/auth';
import UserFormModal, { type UserFormValues } from '../components/UserFormModal';

const API_BASE = 'http://localhost:3000';

interface UserDto {
  id: string;
  email: string;
  fullName: string;
  role: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; users: UserDto[] };

export default function UsersPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const currentUser = getUser();

  const [modal, setModal] = useState<null | { mode: 'create' } | { mode: 'edit'; user: UserDto }>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 2c: state riêng cho form phụ đổi mật khẩu bên trong modal edit.
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  function authHeaders(extra?: Record<string, string>) {
    return { Authorization: `Bearer ${getToken()}`, ...extra };
  }

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });

    fetch(`${API_BASE}/users`, { headers: authHeaders() })
      .then((res) => {
        if (res.status === 401) {
          clearSession();
          navigate('/login', { replace: true });
          throw new Error('__redirecting__');
        }
        if (!res.ok) throw new Error(`Backend trả về HTTP ${res.status}`);
        return res.json() as Promise<UserDto[]>;
      })
      .then((users) => {
        if (!cancelled) setState({ status: 'ready', users });
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

  function openCreateModal() {
    setFormError(null);
    setModal({ mode: 'create' });
  }

  function openEditModal(user: UserDto) {
    setFormError(null);
    setPwError(null);
    setPwSuccess(null);
    setModal({ mode: 'edit', user });
  }

  function closeModal() {
    setModal(null);
    setFormError(null);
    setPwError(null);
    setPwSuccess(null);
  }

  async function handleFormSubmit(values: UserFormValues) {
    if (!modal) return;
    setFormSubmitting(true);
    setFormError(null);
    try {
      const isCreate = modal.mode === 'create';
      const url = isCreate ? `${API_BASE}/users` : `${API_BASE}/users/${modal.user.id}`;
      const payload = isCreate
        ? { email: values.email.trim(), password: values.password, fullName: values.fullName.trim(), role: values.role }
        : { fullName: values.fullName.trim(), role: values.role, active: values.active };
      const res = await fetch(url, {
        method: isCreate ? 'POST' : 'PATCH',
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
      const saved = body as UserDto;
      setState((s) => {
        if (s.status !== 'ready') return s;
        if (isCreate) return { status: 'ready', users: [...s.users, saved] };
        return { status: 'ready', users: s.users.map((u) => (u.id === saved.id ? saved : u)) };
      });
      setModal(null);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleChangePassword(newPassword: string) {
    if (!modal || modal.mode !== 'edit') return;
    setPwSubmitting(true);
    setPwError(null);
    setPwSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/users/${modal.user.id}/password`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        // Admin reset hộ - không gửi oldPassword (service bỏ qua vì
        // requester !== target và requester là IT_ADMIN).
        body: JSON.stringify({ newPassword }),
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
        setPwError(message);
        return;
      }
      setPwSuccess(body?.message ?? 'Đổi mật khẩu thành công');
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setPwSubmitting(false);
    }
  }

  async function handleDeactivate(user: UserDto) {
    if (!window.confirm(`Vô hiệu hóa tài khoản "${user.email}"? Tài khoản sẽ không đăng nhập được nữa.`)) return;
    try {
      const res = await fetch(`${API_BASE}/users/${user.id}`, {
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
      const updated = body as UserDto;
      setState((s) => {
        if (s.status !== 'ready') return s;
        return { status: 'ready', users: s.users.map((u) => (u.id === updated.id ? updated : u)) };
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Lỗi không xác định');
    }
  }

  if (currentUser?.role !== 'IT_ADMIN') {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui' }}>
        <h1>Quản lý tài khoản</h1>
        <p style={{ color: '#900' }}>Bạn không có quyền truy cập trang này (chỉ IT_ADMIN).</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Quản lý tài khoản</h1>
        <button onClick={openCreateModal}>+ Thêm tài khoản</button>
      </div>

      {state.status === 'loading' && <p>Đang tải danh sách tài khoản...</p>}

      {state.status === 'error' && (
        <div style={{ padding: 12, background: '#fee', border: '1px solid #f99', borderRadius: 4, color: '#900' }}>
          <strong>Không tải được dữ liệu:</strong> {state.message}
        </div>
      )}

      {state.status === 'ready' && (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #333' }}>
              <th style={{ padding: 8 }}>Email</th>
              <th style={{ padding: 8 }}>Họ tên</th>
              <th style={{ padding: 8 }}>Vai trò</th>
              <th style={{ padding: 8 }}>Trạng thái</th>
              <th style={{ padding: 8 }}></th>
            </tr>
          </thead>
          <tbody>
            {state.users.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: 8, fontFamily: 'monospace' }}>{u.email}</td>
                <td style={{ padding: 8 }}>{u.fullName}</td>
                <td style={{ padding: 8 }}>{u.role}</td>
                <td style={{ padding: 8 }}>{u.active ? 'Hoạt động' : 'Đã vô hiệu hóa'}</td>
                <td style={{ padding: 8, display: 'flex', gap: 8 }}>
                  <button onClick={() => openEditModal(u)}>Sửa</button>
                  {/* 2d: ẩn nút Vô hiệu hóa cho chính dòng của user đang đăng nhập
                      (khớp chặn 403 backend UsersService.deactivate). */}
                  {u.id !== currentUser?.id && u.active && (
                    <button onClick={() => handleDeactivate(u)}>Vô hiệu hóa</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <UserFormModal
          mode={modal.mode}
          initialValues={modal.mode === 'edit' ? userToFormValues(modal.user) : undefined}
          submitting={formSubmitting}
          errorMessage={formError}
          onSubmit={handleFormSubmit}
          onClose={closeModal}
          onChangePassword={modal.mode === 'edit' ? handleChangePassword : undefined}
          passwordSubmitting={pwSubmitting}
          passwordError={pwError}
          passwordSuccessMessage={pwSuccess}
        />
      )}
    </div>
  );
}

function userToFormValues(u: UserDto): UserFormValues {
  return {
    email: u.email,
    password: '',
    fullName: u.fullName,
    role: u.role,
    active: u.active,
  };
}
