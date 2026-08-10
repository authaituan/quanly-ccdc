/**
 * FE-03: bọc quanh route cần đăng nhập. Check token tồn tại TRƯỚC khi
 * render children (không đợi request 401 mới redirect, tránh nháy màn
 * hình nội dung rồi mới bật lại /login).
 */
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../lib/auth';

export default function RequireAuth({ children }: { children: ReactNode }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
