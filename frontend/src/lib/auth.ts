/**
 * FE-03: session helper dùng chung cho LoginPage + AssetsPage (và mọi
 * trang cần auth sau này).
 *
 * Lưu JWT + user info vào localStorage (quyết định 2026-08-10, xem
 * PROJECT_STATUS.md mục nợ kỹ thuật) - đơn giản, sống qua F5, nhưng có
 * bề mặt XSS-persistent nếu sau này có lỗ hổng inject script. Nên
 * chuyển sang httpOnly cookie khi deploy ra ngoài local/dev thật.
 */

const TOKEN_KEY = 'quanly_ccdc_access_token';
const USER_KEY = 'quanly_ccdc_user';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): SessionUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setSession(accessToken: string, user: SessionUser): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  // Chỉ check token có tồn tại (quyết định 2026-08-10) - không tự verify
  // hợp lệ ở FE, để backend tự trả 401 nếu token đã hết hạn/sai khi gọi
  // API thật.
  return getToken() !== null;
}
