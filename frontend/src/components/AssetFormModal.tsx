/**
 * FE-04: form dùng chung cho Tạo mới (POST /assets) và Sửa (PATCH /assets/:id).
 * Field theo đúng CreateAssetDto/UpdateAssetDto (backend/src/modules/assets/dto)
 * - chỉ đưa vào form các field bắt buộc + field liên quan trực tiếp tới 14
 *   cột/nhóm chi tiết đã hiển thị ở AssetsPage; cố ý bỏ specs/warrantyExpiresAt/
 *   supportExpiresAt/purchaseCost khỏi phase này (đã duyệt 2026-08-11).
 */
import { useEffect, useState } from 'react';
import type { CSSProperties, FormEvent, ReactNode } from 'react';

export interface AssetCategoryDto {
  id: string;
  code: string;
  name: string;
}

export interface SiteOptionDto {
  id: string;
  code: string;
  name: string;
}

export interface AssetFormValues {
  assetTag: string;
  name: string;
  categoryId: string;
  siteId: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  ipAddress: string;
  macAddress: string;
  operatingStatus: string;
  ownershipStatus: string;
}

const OPERATING_STATUS_OPTIONS = ['IN_STOCK', 'PRODUCTION', 'MAINTENANCE', 'FAULTY', 'DECOMMISSIONED'];
const OWNERSHIP_STATUS_OPTIONS = ['OWNED', 'LEASED', 'BORROWED_POC'];

const EMPTY_VALUES: AssetFormValues = {
  assetTag: '',
  name: '',
  categoryId: '',
  siteId: '',
  manufacturer: '',
  model: '',
  serialNumber: '',
  ipAddress: '',
  macAddress: '',
  operatingStatus: 'IN_STOCK',
  ownershipStatus: 'OWNED',
};

interface Props {
  mode: 'create' | 'edit';
  categories: AssetCategoryDto[];
  sites: SiteOptionDto[];
  initialValues?: AssetFormValues;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: AssetFormValues) => void;
  onClose: () => void;
}

export default function AssetFormModal({
  mode,
  categories,
  sites,
  initialValues,
  submitting,
  errorMessage,
  onSubmit,
  onClose,
}: Props) {
  const [values, setValues] = useState<AssetFormValues>(initialValues ?? EMPTY_VALUES);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setValues(initialValues ?? EMPTY_VALUES);
  }, [initialValues]);

  function set<K extends keyof AssetFormValues>(key: K, value: AssetFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Validate tối thiểu phía client: 3 field bắt buộc theo CreateAssetDto.
    if (!values.assetTag.trim() || !values.name.trim() || !values.categoryId) {
      setValidationError('Mã thiết bị, Tên thiết bị và Loại máy là bắt buộc.');
      return;
    }
    setValidationError(null);
    onSubmit(values);
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
          width: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
          fontFamily: 'system-ui',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>{mode === 'create' ? 'Thêm thiết bị' : 'Sửa thiết bị'}</h2>

        {(validationError || errorMessage) && (
          <div style={{ padding: 8, background: '#fee', border: '1px solid #f99', borderRadius: 4, color: '#900', marginBottom: 12 }}>
            {validationError ?? errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Mã thiết bị (assetTag) *">
              <input value={values.assetTag} onChange={(e) => set('assetTag', e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Tên thiết bị *">
              <input value={values.name} onChange={(e) => set('name', e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Loại máy *">
              <select value={values.categoryId} onChange={(e) => set('categoryId', e.target.value)} style={inputStyle}>
                <option value="">-- Chọn loại máy --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Bưu cục / site">
              <select value={values.siteId} onChange={(e) => set('siteId', e.target.value)} style={inputStyle}>
                <option value="">-- Không chọn --</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hãng">
              <input value={values.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Model">
              <input value={values.model} onChange={(e) => set('model', e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Serial Number/TAG">
              <input value={values.serialNumber} onChange={(e) => set('serialNumber', e.target.value)} style={inputStyle} />
            </Field>
            <Field label="IP">
              <input value={values.ipAddress} onChange={(e) => set('ipAddress', e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Địa chỉ MAC">
              <input value={values.macAddress} onChange={(e) => set('macAddress', e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Tình trạng hoạt động">
              <select value={values.operatingStatus} onChange={(e) => set('operatingStatus', e.target.value)} style={inputStyle}>
                {OPERATING_STATUS_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sở hữu">
              <select value={values.ownershipStatus} onChange={(e) => set('ownershipStatus', e.target.value)} style={inputStyle}>
                {OWNERSHIP_STATUS_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
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
