/**
 * FE-06: modal Cấp phát thiết bị. Chỉ 1 chế độ (tạo mới) - không có
 * chế độ sửa (backend không có PATCH /assignments/:id ngoài /return).
 * Chọn asset qua ô tìm assetTag (GET /assets/by-tag/:tag) thay vì
 * dropdown 359 dòng - quyết định đã duyệt 2026-08-12.
 */
import { useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';

export interface EmployeeOptionDto {
  id: string;
  fullName: string;
  employeeCode: string | null;
}

interface AssetLookupResult {
  id: string;
  assetTag: string;
  name: string;
  operatingStatus: string;
  category: { name: string };
}

export interface AssignmentFormValues {
  assetId: string;
  employeeId: string;
  handoverDate: string;
  expectedReturnDate: string;
}

interface Props {
  employees: EmployeeOptionDto[];
  submitting: boolean;
  errorMessage: string | null;
  onLookupAsset: (assetTag: string) => Promise<AssetLookupResult | null>;
  onSubmit: (values: AssignmentFormValues) => void;
  onClose: () => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function AssignmentFormModal({ employees, submitting, errorMessage, onLookupAsset, onSubmit, onClose }: Props) {
  const [assetTagQuery, setAssetTagQuery] = useState('');
  const [assetLookup, setAssetLookup] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'found'; asset: AssetLookupResult }
    | { status: 'not-found' }
  >({ status: 'idle' });
  const [employeeId, setEmployeeId] = useState('');
  const [handoverDate, setHandoverDate] = useState(today());
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleLookup() {
    if (!assetTagQuery.trim()) return;
    setAssetLookup({ status: 'loading' });
    const asset = await onLookupAsset(assetTagQuery.trim());
    setAssetLookup(asset ? { status: 'found', asset } : { status: 'not-found' });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (assetLookup.status !== 'found') {
      setValidationError('Phải tìm và chọn đúng 1 thiết bị (assetTag) hợp lệ trước khi cấp phát.');
      return;
    }
    if (!handoverDate) {
      setValidationError('Ngày cấp là bắt buộc.');
      return;
    }
    setValidationError(null);
    onSubmit({
      assetId: assetLookup.asset.id,
      employeeId,
      handoverDate,
      expectedReturnDate,
    });
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 8, padding: 24, width: 480, maxHeight: '90vh', overflowY: 'auto', fontFamily: 'system-ui' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>Cấp phát thiết bị</h2>

        {(validationError || errorMessage) && (
          <div style={{ padding: 8, background: '#fee', border: '1px solid #f99', borderRadius: 4, color: '#900', marginBottom: 12 }}>
            {validationError ?? errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Mã thiết bị (assetTag) *">
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={assetTagQuery}
                  onChange={(e) => {
                    setAssetTagQuery(e.target.value);
                    setAssetLookup({ status: 'idle' });
                  }}
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="VD: 536750-2"
                />
                <button type="button" onClick={handleLookup} disabled={assetLookup.status === 'loading'}>
                  Tìm
                </button>
              </div>
              {assetLookup.status === 'loading' && <p style={{ fontSize: 13, color: '#666' }}>Đang tìm...</p>}
              {assetLookup.status === 'not-found' && (
                <p style={{ fontSize: 13, color: '#900' }}>Không tìm thấy thiết bị với assetTag này.</p>
              )}
              {assetLookup.status === 'found' && (
                <div style={{ fontSize: 13, background: '#f5f5f5', padding: 8, borderRadius: 4, marginTop: 4 }}>
                  <strong>{assetLookup.asset.name}</strong> ({assetLookup.asset.category.name}) — trạng thái hiện tại:{' '}
                  <strong>{assetLookup.asset.operatingStatus}</strong>
                </div>
              )}
            </Field>

            <Field label="Nhân viên nhận (tùy chọn)">
              <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={inputStyle}>
                <option value="">-- Không chọn --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} {emp.employeeCode ? `(${emp.employeeCode})` : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Ngày cấp *">
              <input type="date" value={handoverDate} onChange={(e) => setHandoverDate(e.target.value)} style={inputStyle} />
            </Field>

            <Field label="Ngày dự kiến trả (tùy chọn)">
              <input
                type="date"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button type="button" onClick={onClose} disabled={submitting}>
              Hủy
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Đang lưu...' : 'Cấp phát'}
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
