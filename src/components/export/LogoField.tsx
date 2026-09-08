// Logo perusahaan untuk kop laporan.
//
// Gambar diperkecil dulu di canvas sebelum disimpan: state aplikasi ikut ditulis ke
// localStorage, dan file logo mentah dari user gampang beberapa megabyte - jauh di atas
// kuota localStorage. 320 px sudah lebih dari cukup untuk kop PDF selebar 22 mm.

import { useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui';
import { useT } from '../ui/useT';

const MAX_EDGE = 320;

/** Baca file gambar, perkecil sisi terpanjang ke MAX_EDGE, kembalikan data URL PNG. */
function shrinkToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas tidak tersedia.'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Berkas gambar tidak terbaca.'));
    };
    img.src = url;
  });
}

export function LogoField() {
  const t = useT();
  const logo = useAppStore((s) => s.project.logo);
  const setProject = useAppStore((s) => s.setProject);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    try {
      setProject('logo', await shrinkToDataUrl(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="mb-3">
      <label className="mb-1 block text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        {t('companyLogo')}
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = '';
        }}
      />

      <div className="flex items-center gap-2">
        <div
          className="flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl"
          style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border-soft)' }}
        >
          {logo ? (
            <img src={logo} alt="" className="max-h-12 max-w-20 object-contain" />
          ) : (
            <span className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
              {t('noLogo')}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Button onClick={() => inputRef.current?.click()}>{t('chooseLogo')}</Button>
          {logo && (
            <Button tone="danger" onClick={() => setProject('logo', null)}>
              {t('removeLogo')}
            </Button>
          )}
        </div>
      </div>

      <p className="mt-1 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
        {t('logoHint')}
      </p>
      {error && (
        <p className="mt-1 text-[11px]" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
    </div>
  );
}
