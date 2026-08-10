/**
 * FE-03: trang đăng nhập. Gọi POST /auth/login, lưu session (localStorage,
 * xem lib/auth.ts), redirect /assets khi thành công.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, setSession } from '../lib/auth';

const API_BASE = 'http://localhost:3000';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Quyết định 2d: đã có token trong localStorage -> redirect thẳng
  // /assets, không tự verify hợp lệ ở FE.
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/assets', { replace: true });
    }
  }, [navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        // Dùng đúng message backend trả về, không tự chế message khác.
        throw new Error(body.message ?? `Đăng nhập thất bại (HTTP ${res.status})`);
      }
      setSession(body.accessToken, body.user);
      navigate('/assets', { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof TypeError
          ? `Không kết nối được tới backend (${API_BASE}).`
          : err instanceof Error
            ? err.message
            : 'Lỗi không xác định';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 360, margin: '80px auto' }}>
      <h1>Đăng nhập</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', marginBottom: 4 }}>Mật khẩu</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
          />
        </div>

        {error && (
          <div style={{ padding: 8, marginBottom: 12, background: '#fee', border: '1px solid #f99', borderRadius: 4, color: '#900' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting} style={{ padding: '8px 16px' }}>
          {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
}
