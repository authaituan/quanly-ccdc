/**
 * FE-07: form nhập/sửa VPN-FortiClient credentials (upsert, POST
 * /assets/:assetId/credentials). ⚠️ Dữ liệu nhạy cảm - password thật,
 * hiển thị plaintext trong input value khi sửa (đã duyệt 2026-08-12, vì
 * IT_ADMIN đã được phép xem qua reveal rồi, không phải lộ thêm).
 * KHÔNG console.log bất kỳ giá trị nào của form này dưới mọi hình thức.
 */
import { useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';

export interface CredentialsFormValues {
  vpnUsername: string;
  vpnPassword: string;
  fortiClientUsername: string;
  fortiClientPassword: string;
}

interface Props {
  mode: 'create' | 'edit';
  initialValues?: CredentialsFormValues;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: CredentialsFormValues) => void;
  onClose: () => void;
}

const EMPTY_VALUES: CredentialsFormValues = {
  vpnUsername: '',
  vpnPassword: '',
  fortiClientUsername: '',
  fortiClientPassword: '',
};

export default function CredentialsFormModal({ mode, initialValues, submitting, errorMessage, onSubmit, onClose }: Props) {
  const [values, setValues] = useState<CredentialsFormValues>(initialValues ?? EMPTY_VALUES);

  function set<K extends keyof CredentialsFormValues>(key: K, value: CredentialsFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit(values);
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 8, padding: 24, width: 440, maxHeight: '90vh', overflowY: 'auto', fontFamily: 'system-ui' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>{mode === 'create' ? 'Thêm VPN/Forti' : 'Sửa VPN/Forti'}</h2>

        {errorMessage && (
          <div style={{ padding: 8, background: '#fee', border: '1px solid #f99', borderRadius: 4, color: '#900', marginBottom: 12 }}>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="User VPN">
              <input value={values.vpnUsername} onChange={(e) => set('vpnUsername', e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Password VPN">
              <input
                type="password"
                value={values.vpnPassword}
                onChange={(e) => set('vpnPassword', e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="User FortiClient">
              <input
                value={values.fortiClientUsername}
                onChange={(e) => set('fortiClientUsername', e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Password FortiClient">
              <input
                type="password"
                value={values.fortiClientPassword}
                onChange={(e) => set('fortiClientPassword', e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button type="button" onClick={onClose} disabled={submitting}>
              Hủy
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
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
