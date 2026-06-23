/* Data Sources — SheetJS upload + Supabase integration.
   Two views:
     1. DataSources (list)  — shows all uploaded data sources with preview
     2. DataSourceUpload     — file picker, parsing, preview, save to Supabase
*/

import { useState, useEffect, useRef, Fragment, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import Shell from '../components/Shell.jsx';
import HIcon from '../components/HIcon.jsx';
import { supabase } from '../lib/supabase.js';
import { useConfirm } from '../components/DeleteConfirmationModal.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

/* ── Legacy demo data — used by Generate.jsx until it's wired to Supabase ── */
export const GEN_SOURCES = [
  {
    id: 'src-2026-q2', name: 'Q2 customers · 2026.xlsx',
    kind: 'xlsx', rows: 142, cols: 9,
    columns: ['Name', 'Email', 'Phone', 'City', 'GSTIN', 'Item', 'Qty', 'Rate', 'Tax'],
    updated: '18 May 2026',
    sample: [
      ['Anjali Rao', 'anjali.rao@gmail.com', '+91 98123 45678', 'Bengaluru', '29ABCDE1234F1Z5', 'Backwaters cruise', 1, '24,800', '5%'],
      ['Rohan Kumar', 'rohan.k@outlook.com', '+91 99888 12210', 'Mumbai', '27ZRTYU5612P2K1', 'Backwaters cruise', 1, '24,800', '5%'],
      ['Priya Menon', 'priya.m@yahoo.in', '+91 98445 70334', 'Chennai', '33MENONLLP9912', 'Munnar heritage day trip', 1, '18,200', '5%'],
    ],
  },
  {
    id: 'src-roster-may', name: 'May roster · backwaters.csv',
    kind: 'csv', rows: 28, cols: 7,
    columns: ['Passenger', 'Email', 'Cabin', 'Package', 'Duration', 'Amount', 'Status'],
    updated: '12 May 2026',
    sample: [
      ['Anjali Rao', 'anjali.rao@gmail.com', 'Cabin 04 · upper', 'Backwaters · Alleppey', '3D · 2N', '24,800', 'Paid'],
      ['Rohan Kumar', 'rohan.k@outlook.com', 'Cabin 04 · upper', 'Backwaters · Alleppey', '3D · 2N', '24,800', 'Paid'],
    ],
  },
];

/* ─────────── shared cell styles for spreadsheet preview ─────────── */
const ssTh = {
  padding: '10px 12px', background: 'var(--paper-3)',
  borderBottom: '1px solid var(--line-soft)', borderRight: '1px solid var(--line-faint)',
  fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
  color: 'var(--ink-5)', position: 'sticky', top: 0, zIndex: 1,
};
const ssTd = {
  padding: '10px 12px', borderBottom: '1px solid var(--line-faint)', borderRight: '1px solid var(--line-faint)',
  fontSize: 13, color: 'var(--ink-2)', background: 'var(--paper)',
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center',
};
const ssRowNum = {
  ...ssTd, background: 'var(--paper-2)', color: 'var(--ink-5)', fontFamily: 'var(--mono)', fontSize: 11, justifyContent: 'center',
};

/* ─────────── Spreadsheet Preview Component (reused in both views) ─────────── */
function SpreadsheetPreview({ columns, rows, totalRows }) {
  if (!columns?.length) return null;
  const capped = rows.slice(0, 50);
  return (
    <div className="no-scrollbar" style={{ flex: 1, overflow: 'auto', background: 'var(--paper-2)' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `48px repeat(${columns.length}, minmax(140px, 1fr))`,
        minWidth: 'max-content',
      }}>
        <div style={ssTh}>#</div>
        {columns.map(c => <div key={c} style={ssTh}>{c}</div>)}

        {capped.map((row, ri) => (
          <Fragment key={ri}>
            <div style={ssRowNum}>{String(ri + 1).padStart(2, '0')}</div>
            {columns.map((col, ci) => (
              <div key={ci} style={ssTd} title={String(row[col] ?? '')}>
                {String(row[col] ?? '')}
              </div>
            ))}
          </Fragment>
        ))}

        {totalRows > capped.length && (
          <div style={{ ...ssTd, gridColumn: `1 / span ${columns.length + 1}`, justifyContent: 'center', color: 'var(--ink-5)', fontStyle: 'italic', background: 'var(--paper-2)' }}>
            + {totalRows - capped.length} more rows · preview capped at {capped.length}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────── Health analysis helper ─────────── */
function analyzeHealth(columns, rows) {
  const missingMap = {};
  columns.forEach(c => { missingMap[c] = 0; });
  let emptyRows = 0;

  rows.forEach(row => {
    let allEmpty = true;
    columns.forEach(c => {
      const v = row[c];
      if (v === null || v === undefined || String(v).trim() === '' || v === '—') {
        missingMap[c]++;
      } else {
        allEmpty = false;
      }
    });
    if (allEmpty) emptyRows++;
  });

  const totalMissing = Object.values(missingMap).reduce((a, b) => a + b, 0);
  const totalCells = columns.length * rows.length;
  const health = totalMissing === 0 ? 'healthy' : totalMissing / totalCells < 0.05 ? 'good' : 'warn';

  return { missingMap, emptyRows, totalMissing, totalCells, health };
}

/* ═══════════════════════════════════════════════════════════════════
   DATA SOURCES LIST
   ═══════════════════════════════════════════════════════════════════ */

export default function DataSources() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const confirm = useConfirm();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selId, setSelId] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [deleting, setDeleting] = useState(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all | xlsx | csv

  /* Fetch all data sources from Supabase */
  const fetchSources = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('data_sources')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch data sources:', error);
      setSources([]);
    } else {
      setSources(data || []);
      if (data?.length && !selId) setSelId(data[0].id);
    }
    setLoading(false);
  }, [selId]);

  useEffect(() => { fetchSources(); }, []);

  /* Fetch preview rows when selection changes */
  useEffect(() => {
    if (!selId) { setPreviewRows([]); return; }
    (async () => {
      const { data } = await supabase
        .from('data_rows')
        .select('row_data')
        .eq('data_source_id', selId)
        .order('row_index', { ascending: true })
        .limit(50);
      setPreviewRows(data?.map(r => r.row_data) || []);
    })();
  }, [selId]);

  /* Delete a data source */
  const handleDelete = async (id) => {
    const s = sources.find((x) => x.id === id);
    const ok = await confirm({
      title: 'Delete data source', itemName: s?.file_name,
      message: 'This deletes the file and all its parsed rows permanently. This action cannot be undone.',
    });
    if (!ok) return;
    setDeleting(id);
    await supabase.from('data_rows').delete().eq('data_source_id', id);
    await supabase.from('data_sources').delete().eq('id', id);
    setSources(prev => prev.filter(s => s.id !== id));
    if (selId === id) setSelId(sources.find(s => s.id !== id)?.id || null);
    setDeleting(null);
  };

  const sel = sources.find(s => s.id === selId);
  const totalRows = sources.reduce((a, s) => a + (s.row_count || 0), 0);
  const detectedColumns = sel?.detected_columns || [];

  /* Filter by type + search across filename and detected columns. */
  const filtered = sources.filter(s => {
    if (typeFilter !== 'all' && (s.file_type || 'xlsx') !== typeFilter) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      const inName = (s.file_name || '').toLowerCase().includes(q);
      const inCols = (s.detected_columns || []).some(c => String(c).toLowerCase().includes(q));
      if (!inName && !inCols) return false;
    }
    return true;
  });

  return (
    <Shell active="data">
      <div className="h-topbar"><div className="crumb">DATA SOURCES</div></div>

      <div className="h-row h-between" style={{ marginBottom: 18, alignItems: 'flex-start' }}>
        <div className="h-section-title" style={{ margin: 0 }}>
          <div className="serif" style={{ fontSize: 36, lineHeight: 1.05 }}>Data sources</div>
          <div className="lead">
            {sources.length} uploaded · {totalRows.toLocaleString('en-IN')} total rows.
            {sources.length === 0 && ' Upload a spreadsheet to get started.'}
          </div>
        </div>
        <div className="h-row" style={{ gap: 8 }}>
          <div className="h-input" style={{ width: 260 }}>
            <HIcon name="search" size={14} color="var(--ink-5)" />
            <input placeholder="Search by filename, column" value={query} onChange={e => setQuery(e.target.value)} />
          </div>
          <button className="h-btn primary" onClick={() => navigate('/data-sources/upload')}>
            <HIcon name="upload" size={14} /> Upload
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="h-row" style={{ marginBottom: 18, gap: 8, flexWrap: 'wrap' }}>
        {[
          ['all', 'All', sources.length],
          ['xlsx', '.xlsx', sources.filter(s => (s.file_type || 'xlsx') === 'xlsx').length],
          ['csv', '.csv', sources.filter(s => s.file_type === 'csv').length],
        ].map(([key, label, count]) => (
          <div key={key}
            onClick={() => setTypeFilter(key)}
            className={'h-chip' + (typeFilter === key ? ' solid' : '')}
            style={{ cursor: 'pointer' }}>
            {label} · {count}
          </div>
        ))}
        <div style={{ flex: 1 }} />
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, border: '3px solid var(--line-faint)', borderTopColor: 'var(--ink-2)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <div className="h-meta">Loading data sources…</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      ) : sources.length === 0 ? (
        /* Empty state */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100% - 230px)', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 'var(--r-pill)', background: 'var(--ink-9)', color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <HIcon name="database" size={30} />
          </div>
          <div className="serif" style={{ fontSize: 28, lineHeight: 1.1 }}>No data sources yet.</div>
          <div className="h-meta" style={{ fontSize: 14, marginTop: 10, maxWidth: 420, lineHeight: 1.55 }}>
            Upload a .xlsx or .csv file. We'll auto-detect column headers, preview the data, and save it so you can use it to generate invoices.
          </div>
          <button className="h-btn primary" style={{ marginTop: 22 }} onClick={() => navigate('/data-sources/upload')}>
            <HIcon name="upload" size={14} /> Upload your first file
          </button>
        </div>
      ) : (
        /* Main 2-panel layout */
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 18, height: 'calc(100% - 230px)' }}>
          {/* Left: source cards */}
          <div className="h-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-faint)' }}>
              <div className="h-eyebrow">UPLOADED · {filtered.length}{filtered.length !== sources.length ? ` of ${sources.length}` : ''}</div>
            </div>
            <div className="no-scrollbar" style={{ flex: 1, overflow: 'auto', padding: '10px 12px' }}>
              {filtered.length === 0 ? (
                <div className="h-meta" style={{ padding: 20, textAlign: 'center' }}>No matches for these filters.</div>
              ) : (
              <div className="h-col" style={{ gap: 8 }}>
                {filtered.map(s => {
                  const on = s.id === selId;
                  const ext = (s.file_type || 'xlsx').toUpperCase();
                  return (
                    <div key={s.id} onClick={() => setSelId(s.id)}
                      style={{
                        padding: '14px 14px', borderRadius: 'var(--r-md)',
                        border: on ? '1.5px solid var(--ink-2)' : '1px solid var(--line-faint)',
                        background: on ? 'var(--ink-9)' : 'var(--paper)',
                        cursor: 'pointer', transition: 'all .15s ease',
                        position: 'relative',
                      }}>
                      <div className="h-row" style={{ gap: 12 }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 8, flex: '0 0 auto',
                          background: on ? 'var(--ink-2)' : 'var(--paper-3)',
                          color: on ? 'var(--paper)' : 'var(--ink-3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em',
                        }}>{ext}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.25, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.file_name}</div>
                          <div className="h-meta" style={{ fontSize: 11.5, marginTop: 2 }}>
                            {s.row_count} rows · {s.column_count} cols · {new Date(s.uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                          className="h-iconbtn"
                          style={{ width: 28, height: 28, opacity: deleting === s.id ? 0.5 : 0.6 }}
                          title="Delete"
                        >
                          <HIcon name="trash" size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          </div>

          {/* Right: detail panel */}
          {sel ? (
            <div className="h-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line-faint)' }}>
                <div className="h-row h-between" style={{ alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="h-eyebrow">{(sel.file_type || 'xlsx').toUpperCase()} · UPLOADED {new Date(sel.uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}</div>
                    <div className="serif" style={{ fontSize: 26, lineHeight: 1.05, marginTop: 4 }}>{sel.file_name}</div>
                    <div className="h-meta" style={{ marginTop: 4 }}>
                      {sel.row_count?.toLocaleString('en-IN')} rows · {sel.column_count} columns
                    </div>
                  </div>
                  <div className="h-row" style={{ gap: 8 }}>
                    <button className="h-btn primary sm" onClick={() => navigate('/generate')}>
                      <HIcon name="ticket" size={13} /> Use in invoice
                    </button>
                  </div>
                </div>

                {/* Detected columns */}
                <div style={{ marginTop: 14 }}>
                  <div className="h-eyebrow" style={{ marginBottom: 8 }}>DETECTED COLUMNS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {detectedColumns.map(c => (
                      <div key={c} className="h-chip green" style={{ padding: '4px 12px', fontSize: 12 }}>{c}</div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Spreadsheet preview */}
              <SpreadsheetPreview
                columns={detectedColumns}
                rows={previewRows}
                totalRows={sel.row_count || 0}
              />

              {/* Footer status bar */}
              <div style={{
                padding: '10px 16px', borderTop: '1px solid var(--line-faint)',
                background: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span className={`h-status ${sel.status === 'healthy' ? 'ok' : sel.status === 'error' ? 'warn' : 'ok'}`}>
                  <span className="pulse" /> {sel.status || 'healthy'}
                </span>
                <span className="h-meta" style={{ fontSize: 12 }}>
                  {detectedColumns.length} columns detected automatically
                </span>
                <div style={{ flex: 1 }} />
                <span className="h-mono" style={{ fontSize: 11, color: 'var(--ink-5)' }}>
                  id · {sel.id?.slice(0, 8)}…
                </span>
              </div>
            </div>
          ) : (
            <div className="h-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-5)' }}>
              Select a data source to preview
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DATA SOURCE UPLOAD — drag & drop, SheetJS parse, preview, save
   ═══════════════════════════════════════════════════════════════════ */

export function DataSourceUpload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  /* Upload states */
  const [step, setStep] = useState('pick');     // pick → preview → saving → done
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [health, setHealth] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveProgress, setSaveProgress] = useState(0);

  /* ── Parse file with SheetJS ── */
  const parseFile = useCallback((f) => {
    setFile(f);
    setFileName(f.name);
    const ext = f.name.split('.').pop().toLowerCase();
    setFileType(ext === 'csv' ? 'csv' : 'xlsx');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];

        /* Read as raw rows first so we can locate the real header row.
           Spreadsheets often have a title/banner row above the headers
           (e.g. "Travel Bookings — Invoice Summary"), which would otherwise
           be mistaken for the header and collapse every other column. */
        const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });

        const filledCount = (r) => r.filter(c => c !== '' && c != null).length;

        if (aoa.length === 0) {
          setSaveError('No data rows found. Make sure the sheet has headers and data.');
          return;
        }

        /* Header row = the row with the most non-empty cells (earliest on a tie).
           This skips single-cell title/banner rows automatically. */
        let headerIdx = 0, maxFilled = -1;
        aoa.forEach((r, i) => {
          const f = filledCount(r);
          if (f > maxFilled) { maxFilled = f; headerIdx = i; }
        });

        /* Build clean, unique column names (fall back to "Column N" for blanks). */
        const seen = {};
        const cols = aoa[headerIdx].map((h, i) => {
          let name = String(h ?? '').trim() || `Column ${i + 1}`;
          if (seen[name] != null) { seen[name] += 1; name = `${name} (${seen[name]})`; }
          else seen[name] = 0;
          return name;
        });

        /* Everything after the header row is data; drop fully-empty rows. */
        const jsonRows = aoa.slice(headerIdx + 1)
          .filter(r => filledCount(r) > 0)
          .map(r => {
            const obj = {};
            cols.forEach((c, i) => { obj[c] = r[i] ?? ''; });
            return obj;
          });

        if (jsonRows.length === 0) {
          setSaveError('No data rows found below the header row.');
          return;
        }

        setColumns(cols);
        setRows(jsonRows);
        setHealth(analyzeHealth(cols, jsonRows));
        setSaveError('');
        setStep('preview');
      } catch (err) {
        setSaveError('Failed to parse file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(f);
  }, []);

  /* ── Drag & drop handlers ── */
  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) parseFile(f);
  };
  const onFileSelect = (e) => {
    const f = e.target.files[0];
    if (f) parseFile(f);
  };

  /* ── Save to Supabase ── */
  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    setSaveProgress(0);

    try {
      /* 1. Insert data source metadata */
      const { data: src, error: srcErr } = await supabase
        .from('data_sources')
        .insert({
          user_id: user.id,
          file_name: fileName,
          file_type: fileType,
          row_count: rows.length,
          column_count: columns.length,
          detected_columns: columns,
          status: health?.health || 'healthy',
        })
        .select()
        .single();

      if (srcErr) throw srcErr;
      setSaveProgress(20);

      /* 2. Insert data rows in chunks (Supabase has payload limits) */
      const CHUNK_SIZE = 200;
      const chunks = [];
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        chunks.push(rows.slice(i, i + CHUNK_SIZE));
      }

      for (let ci = 0; ci < chunks.length; ci++) {
        const chunk = chunks[ci];
        const rowRecords = chunk.map((row, idx) => ({
          data_source_id: src.id,
          row_index: ci * CHUNK_SIZE + idx,
          row_data: row,
        }));

        const { error: rowErr } = await supabase
          .from('data_rows')
          .insert(rowRecords);

        if (rowErr) throw rowErr;
        setSaveProgress(20 + Math.round((ci + 1) / chunks.length * 80));
      }

      setStep('done');
      /* Navigate to data sources list after short delay */
      setTimeout(() => navigate('/data-sources'), 1200);

    } catch (err) {
      console.error('Save failed:', err);
      setSaveError(err.message || 'Failed to save. Check your database tables.');
      setSaving(false);
    }
  };

  /* ── PICK step (file picker + drag & drop) ── */
  if (step === 'pick') {
    return (
      <Shell active="data">
        <div className="h-topbar"><div className="crumb">DATA SOURCES · UPLOAD</div></div>

        <div className="h-row h-between" style={{ marginBottom: 22, alignItems: 'flex-start' }}>
          <div className="h-section-title" style={{ margin: 0, maxWidth: 680 }}>
            <div className="serif" style={{ fontSize: 34, lineHeight: 1.05 }}>Upload a new data source.</div>
            <div className="lead">CSV or .xlsx. Any column schema works — we detect headers automatically and you map them to your template on the next step.</div>
          </div>
          <button className="h-btn ghost" onClick={() => navigate('/data-sources')}>
            <HIcon name="chev-l" size={14} /> Back
          </button>
        </div>

        {saveError && (
          <div style={{ padding: '10px 14px', borderRadius: 'var(--r-sm)', background: '#FEF0F0', border: '1px solid #F5C6C6', color: '#a23b2b', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', marginBottom: 18 }}>
            <HIcon name="x" size={14} /> {saveError}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, height: 'calc(100% - 160px)' }}>
          {/* Drop zone */}
          <div className="h-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              style={{
                flex: 1, margin: 18, borderRadius: 'var(--r-lg)',
                border: `2px dashed ${dragOver ? 'var(--ink-2)' : 'var(--line-soft)'}`,
                background: dragOver ? 'var(--ink-9)' : 'var(--paper-2)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 14, padding: '40px 30px', textAlign: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{
                width: 64, height: 64, borderRadius: 'var(--r-pill)',
                background: dragOver ? 'var(--ink-2)' : 'var(--ink-9)',
                color: dragOver ? 'var(--paper)' : 'var(--ink-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}>
                <HIcon name="upload" size={26} />
              </div>
              <div className="serif" style={{ fontSize: 24, lineHeight: 1.05, color: 'var(--ink-2)' }}>
                {dragOver ? 'Drop it here!' : 'Drop your spreadsheet here'}
              </div>
              <div className="h-meta" style={{ maxWidth: 380 }}>
                .xlsx, .xls, or .csv up to 25 MB. Header row required on the first line.
              </div>
              <div className="h-row" style={{ gap: 10, marginTop: 6 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={onFileSelect}
                  style={{ display: 'none' }}
                />
                <button className="h-btn primary" onClick={() => fileInputRef.current?.click()}>
                  <HIcon name="upload" size={14} /> Choose file
                </button>
              </div>
            </div>
          </div>

          {/* Tips panel */}
          <div className="h-col" style={{ gap: 14 }}>
            <div className="h-card" style={{ padding: 18 }}>
              <div className="h-eyebrow">WHAT WE DETECT</div>
              <div className="h-col" style={{ gap: 10, marginTop: 12 }}>
                {[
                  ['Column headers', 'Anything in row 1 becomes a mappable column.'],
                  ['Cell types', 'Currency, date, percent, integer, text.'],
                  ['Empty values', 'Flagged so you can patch them with custom fields.'],
                  ['Duplicate rows', 'Deduplicated by default; you can opt out.'],
                ].map(([t, d]) => (
                  <div key={t} className="h-row" style={{ gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 'var(--r-pill)',
                      background: 'var(--ink-9)', color: 'var(--ink-2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
                    }}>
                      <HIcon name="check" size={12} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>{t}</div>
                      <div className="h-meta" style={{ fontSize: 12, marginTop: 1 }}>{d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-card dark" style={{ padding: 18 }}>
              <div className="h-eyebrow" style={{ color: 'rgba(255,255,255,0.55)' }}>SCHEMA TIP</div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 22, lineHeight: 1.1, marginTop: 6 }}>
                Mix any fields you want.
              </div>
              <div className="h-meta" style={{ color: 'rgba(255,255,255,0.65)', marginTop: 6, fontSize: 12.5, lineHeight: 1.5 }}>
                A data source can be clients, attendees, employees — anything with a header row. We map it to invoices in the next step.
              </div>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  /* ── PREVIEW step (show parsed data + confirm) ── */
  if (step === 'preview') {
    return (
      <Shell active="data">
        <div className="h-topbar"><div className="crumb">DATA SOURCES · PREVIEW</div></div>

        <div className="h-row h-between" style={{ marginBottom: 14, alignItems: 'flex-start' }}>
          <div className="h-section-title" style={{ margin: 0 }}>
            <div className="serif" style={{ fontSize: 32, lineHeight: 1.05 }}>Review before saving.</div>
            <div className="lead">
              Check the data below. If everything looks good, confirm to save to your account.
            </div>
          </div>
          <div className="h-row" style={{ gap: 8 }}>
            <button className="h-btn ghost" onClick={() => { setStep('pick'); setColumns([]); setRows([]); setFile(null); }}>
              <HIcon name="chev-l" size={14} /> Pick another
            </button>
            <button
              className="h-btn primary"
              onClick={handleSave}
              disabled={saving}
              style={{ opacity: saving ? 0.7 : 1 }}
            >
              {saving ? (
                <>{`Saving… ${saveProgress}%`}</>
              ) : (
                <><HIcon name="check" size={14} /> Confirm & save {rows.length} rows</>
              )}
            </button>
          </div>
        </div>

        {saveError && (
          <div style={{ padding: '10px 14px', borderRadius: 'var(--r-sm)', background: '#FEF0F0', border: '1px solid #F5C6C6', color: '#a23b2b', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
            <HIcon name="x" size={14} /> {saveError}
          </div>
        )}

        {/* Stepper */}
        <div className="h-row" style={{ marginBottom: 18, gap: 12 }}>
          <div className="h-stepper">
            <div className="step done"><span className="dot">✓</span>Upload</div>
            <div className="bar" />
            <div className="step done"><span className="dot">✓</span>Parse</div>
            <div className="bar" />
            <div className="step active"><span className="dot">3</span>Review & save</div>
          </div>
          <div style={{ flex: 1 }} />
          <div className="h-chip green"><HIcon name="file" size={13} /> {fileName}</div>
          <div className="h-meta">{rows.length} rows · {columns.length} cols</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 18, height: 'calc(100% - 220px)' }}>
          {/* Spreadsheet preview */}
          <div className="h-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-faint)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="h-eyebrow">PREVIEW · {rows.length} ROWS</div>
              <div style={{ flex: 1 }} />
              <span className={`h-status ${health?.health === 'healthy' ? 'ok' : health?.health === 'warn' ? 'warn' : 'ok'}`}>
                <span className="pulse" /> {health?.health || 'healthy'}
              </span>
            </div>
            <SpreadsheetPreview columns={columns} rows={rows} totalRows={rows.length} />
          </div>

          {/* Right: health & columns panel */}
          <div className="h-col" style={{ gap: 14 }}>
            {/* Detected columns */}
            <div className="h-card" style={{ padding: 18 }}>
              <div className="h-eyebrow" style={{ marginBottom: 10 }}>DETECTED COLUMNS · {columns.length}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {columns.map(c => (
                  <div key={c} className="h-chip green" style={{ padding: '4px 12px', fontSize: 12 }}>{c}</div>
                ))}
              </div>
            </div>

            {/* Health summary */}
            <div className="h-card" style={{ padding: 18 }}>
              <div className="h-eyebrow" style={{ marginBottom: 10 }}>DATA HEALTH</div>
              <div className="h-col" style={{ gap: 10 }}>
                <div className="h-row" style={{ gap: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: health?.health === 'healthy' ? 'var(--ink-9)' : '#FBE8C9',
                    color: health?.health === 'healthy' ? 'var(--ink-2)' : '#8a5a16',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
                  }}>
                    <HIcon name={health?.health === 'healthy' ? 'check' : 'sparkle'} size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {health?.totalMissing === 0 ? 'No missing values' : `${health?.totalMissing} missing values`}
                    </div>
                    <div className="h-meta" style={{ fontSize: 12, marginTop: 1 }}>
                      {health?.emptyRows > 0 ? `${health.emptyRows} empty rows found` : 'All rows have data'}
                    </div>
                  </div>
                </div>
                {health?.totalMissing > 0 && (
                  <div className="h-col" style={{ gap: 4, paddingLeft: 38 }}>
                    {columns.filter(c => health.missingMap[c] > 0).map(c => (
                      <div key={c} className="h-meta" style={{ fontSize: 11 }}>
                        <span style={{ fontWeight: 500, color: 'var(--ink-3)' }}>{c}</span> — {health.missingMap[c]} missing
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* File info */}
            <div className="h-card" style={{ padding: 18, background: 'var(--paper-3)' }}>
              <div className="h-eyebrow" style={{ marginBottom: 8 }}>FILE INFO</div>
              <div className="h-col" style={{ gap: 6 }}>
                {[
                  ['File', fileName],
                  ['Type', fileType.toUpperCase()],
                  ['Rows', rows.length.toLocaleString('en-IN')],
                  ['Columns', columns.length],
                  ['Size', file ? `${(file.size / 1024).toFixed(1)} KB` : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="h-row h-between">
                    <span className="h-meta" style={{ fontSize: 12 }}>{k}</span>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Saving progress overlay */}
        {saving && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(8,14,16,0.55)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div className="h-card" style={{ padding: '32px 40px', textAlign: 'center', minWidth: 320 }}>
              <div style={{ width: 40, height: 40, border: '3px solid var(--line-faint)', borderTopColor: 'var(--ink-2)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }} />
              <div className="serif" style={{ fontSize: 22 }}>Saving to database…</div>
              <div className="h-meta" style={{ marginTop: 8 }}>{saveProgress}% · {rows.length} rows</div>
              <div style={{ width: '100%', height: 6, background: 'var(--paper-3)', borderRadius: 3, marginTop: 16, overflow: 'hidden' }}>
                <div style={{ width: `${saveProgress}%`, height: '100%', background: 'var(--ink-2)', borderRadius: 3, transition: 'width 0.3s ease' }} />
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          </div>
        )}
      </Shell>
    );
  }

  /* ── DONE step ── */
  return (
    <Shell active="data">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', background: 'var(--ink-2)', color: 'var(--paper)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
          animation: 'pop 0.3s ease',
        }}>
          <HIcon name="check" size={32} strokeWidth={2} />
        </div>
        <div className="serif" style={{ fontSize: 32 }}>Saved successfully.</div>
        <div className="h-meta" style={{ marginTop: 8, fontSize: 14 }}>
          {fileName} · {rows.length} rows · {columns.length} columns
        </div>
        <div className="h-meta" style={{ marginTop: 4 }}>Redirecting to Data Sources…</div>
        <style>{`@keyframes pop { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
      </div>
    </Shell>
  );
}
