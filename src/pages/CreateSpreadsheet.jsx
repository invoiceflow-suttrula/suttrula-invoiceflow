/* Create a data source in-app — define columns + rows in a grid, then save
   straight into data_sources + data_rows (same shape the upload flow produces),
   so it appears in Data Sources and is usable in invoice generation.
   Optional "Download .xlsx" exports the grid via SheetJS. */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import Shell from '../components/Shell.jsx';
import HIcon from '../components/HIcon.jsx';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import useIsMobile from '../hooks/useIsMobile.js';

const DEFAULT_COLS = ['Name', 'Email', 'Phone', 'City', 'GSTIN', 'Item', 'Qty', 'Rate', 'Tax'];
const emptyRow = (n) => Array.from({ length: n }, () => '');

export default function CreateSpreadsheet() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mobile = useIsMobile();

  const [fileName, setFileName] = useState('New_Spreadsheet');
  const [columns, setColumns] = useState(DEFAULT_COLS);
  const [rows, setRows] = useState([emptyRow(DEFAULT_COLS.length)]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  /* ── column ops ── */
  const addColumn = () => { setColumns((c) => [...c, `Column ${c.length + 1}`]); setRows((rs) => rs.map((r) => [...r, ''])); };
  const removeColumn = (i) => { if (columns.length <= 1) return; setColumns((c) => c.filter((_, x) => x !== i)); setRows((rs) => rs.map((r) => r.filter((_, x) => x !== i))); };
  const renameColumn = (i, v) => setColumns((c) => c.map((n, x) => (x === i ? v : n)));
  const moveColumn = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= columns.length) return;
    setColumns((c) => { const a = [...c]; [a[i], a[j]] = [a[j], a[i]]; return a; });
    setRows((rs) => rs.map((r) => { const a = [...r]; [a[i], a[j]] = [a[j], a[i]]; return a; }));
  };

  /* ── row ops ── */
  const addRow = () => setRows((rs) => [...rs, emptyRow(columns.length)]);
  const removeRow = (i) => setRows((rs) => (rs.length <= 1 ? [emptyRow(columns.length)] : rs.filter((_, x) => x !== i)));
  const setCell = (r, c, v) => setRows((rs) => rs.map((row, x) => (x === r ? row.map((cell, y) => (y === c ? v : cell)) : row)));
  const clearAll = () => setRows([emptyRow(columns.length)]);

  /* unique, non-empty column names */
  const cleanColumns = () => {
    const seen = {};
    return columns.map((n, i) => {
      let name = String(n || '').trim() || `Column ${i + 1}`;
      if (seen[name] != null) { seen[name] += 1; name = `${name} (${seen[name]})`; } else seen[name] = 0;
      return name;
    });
  };
  const rowObjects = (cols) =>
    rows.filter((r) => r.some((c) => String(c).trim() !== ''))
      .map((r) => { const o = {}; cols.forEach((c, i) => { o[c] = r[i] ?? ''; }); return o; });

  const download = () => {
    const cols = cleanColumns();
    const ws = XLSX.utils.aoa_to_sheet([cols, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, (fileName.trim() || 'spreadsheet').replace(/\.xlsx$/i, '') + '.xlsx');
  };

  const save = async () => {
    setError('');
    const cols = cleanColumns();
    const dataRows = rowObjects(cols);
    if (!fileName.trim()) { setError('Enter a file name.'); return; }
    if (!cols.length) { setError('Add at least one column.'); return; }
    if (!dataRows.length) { setError('Add at least one row with data.'); return; }
    setSaving(true);
    try {
      const name = fileName.trim().replace(/\.xlsx$/i, '') + '.xlsx';
      const { data: src, error: srcErr } = await supabase.from('data_sources').insert({
        user_id: user.id, file_name: name, file_type: 'xlsx',
        row_count: dataRows.length, column_count: cols.length,
        detected_columns: cols, status: 'healthy',
      }).select().single();
      if (srcErr) throw srcErr;

      const records = dataRows.map((rd, i) => ({ data_source_id: src.id, row_index: i, row_data: rd }));
      const CHUNK = 200;
      for (let i = 0; i < records.length; i += CHUNK) {
        const { error: e } = await supabase.from('data_rows').insert(records.slice(i, i + CHUNK));
        if (e) throw e;
      }
      navigate('/data-sources');
    } catch (e) {
      console.error('Create spreadsheet failed:', e);
      setError(e.message || 'Failed to save.');
      setSaving(false);
    }
  };

  const cellInput = { width: '100%', border: '1px solid var(--line-faint)', borderRadius: 6, padding: '7px 9px', fontSize: 13, fontFamily: 'var(--sans)', background: 'var(--paper)', outline: 'none', color: 'var(--ink-2)' };
  const gridCols = `40px repeat(${columns.length}, minmax(150px, 1fr)) 44px`;

  return (
    <Shell active="data">
      <div className="h-topbar"><div className="crumb">DATA SOURCES · CREATE</div></div>

      <div className="h-row h-between keep-row" style={{ marginBottom: 18, alignItems: 'flex-start', gap: 12 }}>
        <div className="h-section-title" style={{ margin: 0, minWidth: 0 }}>
          <div className="serif" style={{ fontSize: mobile ? 28 : 36, lineHeight: 1.05 }}>Create spreadsheet</div>
          <div className="lead">Define columns, add rows, and save it as a data source — no file upload needed.</div>
        </div>
        <div className="h-row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="h-btn" onClick={() => navigate('/data-sources')}><HIcon name="chev-l" size={14} /> Back</button>
          <button className="h-btn" onClick={download}><HIcon name="download" size={14} /> Download .xlsx</button>
          <button className="h-btn primary" onClick={save} disabled={saving}><HIcon name="check" size={14} /> {saving ? 'Saving…' : 'Save as data source'}</button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--r-sm)', background: '#FEF0F0', border: '1px solid #F5C6C6', color: '#a23b2b', fontSize: 13, marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
          <HIcon name="x" size={14} /> {error}
        </div>
      )}

      {/* file name + toolbar */}
      <div className="h-row" style={{ gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="h-input" style={{ width: mobile ? '100%' : 320 }}>
          <HIcon name="file" size={14} color="var(--ink-5)" />
          <input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="File name (e.g. May_Bookings)" />
          <span className="h-mono" style={{ fontSize: 11, color: 'var(--ink-6)' }}>.xlsx</span>
        </div>
        <div style={{ flex: 1 }} />
        <button className="h-btn ghost sm" onClick={addColumn}><HIcon name="plus" size={13} /> Add column</button>
        <button className="h-btn ghost sm" onClick={clearAll}><HIcon name="trash" size={13} /> Clear rows</button>
      </div>

      {/* grid editor */}
      <div className="h-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, minWidth: 'max-content' }}>
            {/* header: column name + controls */}
            <div style={{ background: 'var(--paper-3)', borderBottom: '1px solid var(--line-faint)' }} />
            {columns.map((col, c) => (
              <div key={'h' + c} style={{ background: 'var(--paper-3)', borderBottom: '1px solid var(--line-faint)', borderLeft: '1px solid var(--line-faint)', padding: '8px 8px 6px' }}>
                <input value={col} onChange={(e) => renameColumn(c, e.target.value)} placeholder={`Column ${c + 1}`}
                  style={{ ...cellInput, fontWeight: 600, fontSize: 12, background: 'var(--paper)' }} />
                <div className="h-row" style={{ gap: 2, marginTop: 4, justifyContent: 'flex-end' }}>
                  <button className="h-iconbtn" style={{ width: 22, height: 22 }} title="Move left" disabled={c === 0} onClick={() => moveColumn(c, -1)}><HIcon name="chev-l" size={11} /></button>
                  <button className="h-iconbtn" style={{ width: 22, height: 22 }} title="Move right" disabled={c === columns.length - 1} onClick={() => moveColumn(c, 1)}><HIcon name="chev-r" size={11} /></button>
                  <button className="h-iconbtn" style={{ width: 22, height: 22 }} title="Remove column" disabled={columns.length <= 1} onClick={() => removeColumn(c)}><HIcon name="x" size={11} /></button>
                </div>
              </div>
            ))}
            <div style={{ background: 'var(--paper-3)', borderBottom: '1px solid var(--line-faint)', borderLeft: '1px solid var(--line-faint)' }} />

            {/* data rows */}
            {rows.map((row, r) => (
              <React.Fragment key={'r' + r}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--line-faint)', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-5)' }}>{r + 1}</div>
                {row.map((cell, c) => (
                  <div key={c} style={{ borderBottom: '1px solid var(--line-faint)', borderLeft: '1px solid var(--line-faint)', padding: 6 }}>
                    <input value={cell} onChange={(e) => setCell(r, c, e.target.value)} style={cellInput} />
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--line-faint)', borderLeft: '1px solid var(--line-faint)' }}>
                  <button className="h-iconbtn" style={{ width: 26, height: 26 }} title="Remove row" onClick={() => removeRow(r)}><HIcon name="trash" size={12} /></button>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--line-faint)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="h-btn ghost sm" onClick={addRow}><HIcon name="plus" size={13} /> Add row</button>
          <div className="h-meta" style={{ fontSize: 12 }}>{rows.length} row{rows.length === 1 ? '' : 's'} · {columns.length} column{columns.length === 1 ? '' : 's'}</div>
        </div>
      </div>
    </Shell>
  );
}
