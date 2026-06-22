/* StorageMeter — visual-only storage usage card.
   Sums file sizes across the Supabase Storage bucket(s) and shows a colored
   progress bar (green/yellow/orange/red) with a status label. No deletion. */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HIcon from './HIcon.jsx';
import { supabase } from '../lib/supabase.js';

/* Total capacity (GB). Override via VITE_STORAGE_LIMIT_GB; defaults to 1.5. */
const TOTAL_GB = Number(import.meta.env.VITE_STORAGE_LIMIT_GB) || 1.5;
const BUCKETS = ['invoices'];

/* Fire this after any upload/delete so an open meter refreshes immediately. */
export function notifyStorageChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('storage-changed'));
}

async function bucketUsage(bucket) {
  let total = 0;
  const { data: top, error } = await supabase.storage.from(bucket).list('', { limit: 1000 });
  if (error || !top) return 0;
  for (const entry of top) {
    if (entry.id && entry.metadata) {
      total += entry.metadata.size || 0;            // a file at the root
    } else {
      /* a folder (e.g. a batch id) — list its files one level down */
      const { data: files } = await supabase.storage.from(bucket).list(entry.name, { limit: 1000 });
      for (const f of files || []) total += f.metadata?.size || 0;
    }
  }
  return total;
}

export default function StorageMeter() {
  const navigate = useNavigate();
  const [bytes, setBytes] = useState(null);

  useEffect(() => {
    let alive = true;
    const recompute = async () => {
      let sum = 0;
      for (const b of BUCKETS) sum += await bucketUsage(b);
      if (alive) setBytes(sum);
    };
    recompute();
    const onVisible = () => { if (document.visibilityState === 'visible') recompute(); };
    window.addEventListener('storage-changed', recompute);
    window.addEventListener('focus', recompute);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      window.removeEventListener('storage-changed', recompute);
      window.removeEventListener('focus', recompute);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const usedGB = (bytes || 0) / 1e9;
  const pct = Math.min(100, (usedGB / TOTAL_GB) * 100);

  const level =
    pct >= 90 ? { color: '#C0392B', label: 'Critical' } :
    pct >= 75 ? { color: '#E07B39', label: 'Alert' } :
    pct >= 50 ? { color: '#E8B931', label: 'Monitor' } :
                { color: '#1E9952', label: 'Normal' };

  const fmtUsed = usedGB < 0.1 ? (bytes || 0) / 1e6 : usedGB;
  const usedLabel = usedGB < 0.1 ? `${fmtUsed.toFixed(1)} MB` : `${usedGB.toFixed(2)} GB`;

  return (
    <div className="h-card" style={{ padding: 18 }}>
      <div className="h-row h-between" style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="h-eyebrow">STORAGE</div>
        {bytes !== null && (
          <span className="h-status" style={{ color: level.color, borderColor: level.color }}>{level.label}</span>
        )}
      </div>

      {bytes === null ? (
        <div className="h-meta" style={{ fontSize: 12 }}>Calculating…</div>
      ) : (
        <>
          <div className="h-row h-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <div className="serif" style={{ fontSize: 22, lineHeight: 1 }}>{usedLabel}</div>
            <div className="h-mono" style={{ fontSize: 12, color: 'var(--ink-5)' }}>of {TOTAL_GB} GB · {pct.toFixed(pct < 10 ? 1 : 0)}%</div>
          </div>

          <div style={{ width: '100%', height: 10, background: 'var(--paper-3)', borderRadius: 'var(--r-pill)', overflow: 'hidden' }}>
            <div style={{ width: pct + '%', height: '100%', background: level.color, transition: 'width .3s ease' }} />
          </div>

          <button className="h-btn ghost sm" onClick={() => navigate('/data-sources')}
            style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}>
            <HIcon name="database" size={13} /> Manage storage
          </button>
        </>
      )}
    </div>
  );
}
