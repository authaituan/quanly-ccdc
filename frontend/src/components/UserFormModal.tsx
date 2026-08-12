/**
 * FE-05: form dùng chung cho Tạo tài khoản (POST /users) và Sửa
 * (PATCH /users/:id). Password KHÔNG có trong form này (theo đúng
 * UpdateUserDto backend - đổi password đi qua route riêng
 * PATCH /users/:id/password) - form phụ "Đổi mật khẩu" render riêng
 * trong cùng modal khi mode='edit', dùng onChangePassword prop.
 */
import { useEffect, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';

const ROLE_OPTIONS = ['IT_ADMIN', 'ACCOUNTANT', 'WAREHOUSE_MANAGER', 'STAFF'];

export interface UserFormValues {
  email: string;
  password: string; // chỉ dùng khi mode create
  fullName: string;
  role: string;
  active: boolean;
}

const EMPTY_VALUES: UserFormValues = {
  email: '',
  password: '',
  fullName: '',
  role: 'STAFF',
  active: true,
};

interface Props {
  mode: 'create' | 'edit';
  initialValues?: UserFormValues;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: UserFormValues) => void;
  onClose: () => void;
  // FE-05 2c: chỉ truyền khi mode='edit' - hiện nút "Đổi mật khẩu" mở form phụ.
  onChangePassword?: (newPassword: string) => Promise<void>;
  passwordSubmitting?: boolean;
  passwordError?: string | null;
  passwordSuccessMessage?: string | null;
}

export default function UserFormModal({
  mode,
  initialValues,
  submitting,
  errorMessage,
  onSubmit,
  onClose,
  onChangePassword,
  passwordSubmitting,
  passwordError,
  passwordSuccessMessage,
}: Props) {
  const [values, setValues] = useState<UserFormValues>(initialValues ?? EMPTY_VALUES);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordValidationError, setPasswordValidationError] = useState<string | null>(null);

  useEffect(() => {
    setValues(initialValues ?? EMPTY_VALUES);
  }, [initialValues]);

  function set<K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!values.email.trim() || !values.fullName.trim() || !values.role) {
      setValidationError('Email, Họ tên và Vai trò là bắt buộc.');
      return;
    }
    if (mode === 'create' && values.password.trim().length < 8) {
      setValidationError('Mật khẩu ban đầu phải từ 8 ký tự trở lên.');
      return;
    }
    setValidationError(null);
    onSubmit(values);
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword.trim().length < 8) {
      setPasswordValidationError('Mật khẩu mới phải từ 8 ký tự trở lên.');
      return;
    }
    setPasswordValidationError(null);
    if (onChangePassword) {
      await onChangePassword(newPassword.trim());
      setNewPassword('');
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 8,
          padding: 24,
          width: 480,
          maxHeight: '90vh',
          overflowY: 'auto',
          fontFamily: 'system-ui',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>{mode === 'create' ? 'Thêm tài khoản' : 'Sửa tài khoản'}</h2>

        {(validationError || errorMessage) && (
          <div style={{ padding: 8, background: '#fee', border: '1px solid #f99', borderRadius: 4, color: '#900', marginBottom: 12 }}>
            {validationError ?? errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Email *">
              <input
                type="email"
                value={values.email}
                onChange={(e) => set('email', e.target.value)}
                disabled={mode === 'edit'}
                style={inputStyle}
              />
            </Field>
            {mode === 'create' && (
              <Field label="Mật khẩu ban đầu * (≥ 8 ký tự)">
                <input
                  type="password"
                  value={values.password}
                  onChange={(e) => set('password', e.target.value)}
                  style={inputStyle}
                />
              </Field>
            )}
            <Field label="Họ tên *">
              <input value={values.fullName} onChange={(e) => set('fullName', e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Vai trò *">
              <select value={values.role} onChange={(e) => set('role', e.target.value)} style={inputStyle}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
            {mode === 'edit' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={values.active} onChange={(e) => set('active', e.target.checked)} />
                Đang hoạt động (active)
              </label>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button type="button" onClick={onClose} disabled={submitting}>
              Hủy
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Đang lưu...' : mode === 'create' ? 'Tạo mới' : 'Lưu'}
            </button>
          </div>
        </form>

        {/* FE-05 2c: form phụ đổi mật khẩu, chỉ mode edit */}
        {mode === 'edit' && onChangePassword && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed #ccc' }}>
            {!showPasswordForm ? (
              <button type="button" onClick={() => setShowPasswordForm(true)}>
                Đổi mật khẩu
              </button>
            ) : (
              <form onSubmit={handlePasswordSubmit}>
                <strong style={{ display: 'block', marginBottom: 8 }}>Đổi mật khẩu (admin reset hộ)</strong>
                {(passwordValidationError || passwordError) && (
                  <div style={{ padding: 8, background: '#fee', border: '1px solid #f99', borderRadius: 4, color: '#900', marginBottom: 8 }}>
                    {passwordValidationError ?? passwordError}
                  </div>
                )}
                {passwordSuccessMessage && (
                  <div style={{ padding: 8, background: '#efe', border: '1px solid #9f9', borderRadius: 4, color: '#060', marginBottom: 8 }}>
                    {passwordSuccessMessage}
                  </div>
                )}
                <Field label="Mật khẩu mới * (≥ 8 ký tự)">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={inputStyle}
                  />
                </Field>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button type="button" onClick={() => setShowPasswordForm(false)} disabled={passwordSubmitting}>
                    Đóng
                  </button>
                  <button type="submit" disabled={passwordSubmitting}>
                    {passwordSubmitting ? 'Đang lưu...' : 'Đặt mật khẩu mới'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: CSSProperties = {
  padding: 6,
  border: '1px solid #ccc',
  borderRadius: 4,
  fontSize: 14,
};
