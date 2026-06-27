/* Create a data source in-app with an Excel-like grid (react-data-grid):
   inline editing, keyboard navigation, cell selection, row multi-select,
   sorting, column resize, single-cell copy/paste, undo/redo, validation,
   and row/column operations. Saves into data_sources + data_rows (same shape
   as an uploaded file). Optional .xlsx export via SheetJS. */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataGrid, renderTextEditor, SelectColumn, SELECT_COLUMN_KEY, Row as GridRow } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import * as XLSX from 'xlsx';
import Shell from '../components/Shell.jsx';
import HIcon from '../components/HIcon.jsx';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import useIsMobile from '../hooks/useIsMobile.js';

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const DEFAULT_COLS = ['Name', 'Email', 'Phone', 'City', 'GSTIN', 'Item', 'Qty', 'Rate', 'Tax'];
const DRAG_KEY = '__drag';
const BLANK_ROWS = 40; // start with a full sheet, like Excel
const blankRows = (n) => Array.from({ length: n }, () => ({ _id: uid() }));
const isCellCol = (k) => !!k && k !== SELECT_COLUMN_KEY && k !== DRAG_KEY;
const colLetter = (n) => { let s = ''; let x = n + 1; while (x > 0) { const m = (x - 1) % 26; s = String.fromCharCode(65 + m) + s; x = Math.floor((x - 1) / 26); } return s; };
// Wrap the default text editor so blank cells (undefined) become '' — keeps the
// <input> controlled and avoids React's "uncontrolled→controlled" warning.
const editTextCell = (props) => renderTextEditor({ ...props, row: { ...props.row, [props.column.key]: props.row[props.column.key] ?? '' } });

const colType = (name) => {
  const n = String(name || '').toLowerCase();
  if (/e-?mail/.test(n)) return 'email';
  if (/\bqty\b|quantity|rate|price|tax|amount|cost|fare/.test(n)) return 'number';
  if (/phone|mobile/.test(n)) return 'phone';
  return 'text';
};
const cellValid = (type, v) => {
  const s = String(v ?? '').trim();
  if (!s) return true; // empty is allowed
  if (type === 'email') return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
  if (type === 'number') return !Number.isNaN(parseFloat(s.replace(/[^0-9.\-]/g, '')));
  if (type === 'phone') return /^[\d+()\-\s]{6,}$/.test(s);
  return true;
};

export default function CreateSpreadsheet() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const mobile = useIsMobile();

  const [fileName, setFileName] = useState('New_Spreadsheet');
  const [cols, setCols] = useState(() => DEFAULT_COLS.map((name) => ({ id: uid(), name })));
  const [rows, setRows] = useState(() => blankRows(BLANK_ROWS));
  const [selectedRows, setSelectedRows] = useState(() => new Set());
  const [sortColumns, setSortColumns] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  /* find / replace + context menu */
  const [findOpen, setFindOpen] = useState(false);
  const [replaceMode, setReplaceMode] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchIdx, setMatchIdx] = useState(0);
  const [menu, setMenu] = useState(null);
  const gridRef = useRef(null);
  const findInputRef = useRef(null);
  const dragRow = useRef(null); // rowIdx being dragged (grip handle)
  const openFind = (withReplace) => { setReplaceMode(withReplace); setFindOpen(true); setTimeout(() => findInputRef.current?.focus(), 0); };
  useEffect(() => { setMatchIdx(0); }, [findText]);

  /* ── undo / redo over {cols, rows} ── */
  const past = useRef([]);
  const future = useRef([]);
  const copied = useRef(null); // last copied cell value (for Ctrl+C / Ctrl+V)
  const snap = () => { past.current.push({ cols, rows }); if (past.current.length > 40) past.current.shift(); future.current = []; };
  const setBoth = (nc, nr) => { snap(); setCols(nc); setRows(nr); };
  const undo = () => { if (!past.current.length) return; future.current.unshift({ cols, rows }); const p = past.current.pop(); setCols(p.cols); setRows(p.rows); };
  const redo = () => { if (!future.current.length) return; past.current.push({ cols, rows }); const f = future.current.shift(); setCols(f.cols); setRows(f.rows); };

  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const editing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'f') { e.preventDefault(); openFind(false); return; }
      if (mod && e.key.toLowerCase() === 'h') { e.preventDefault(); openFind(true); return; }
      if (e.key === 'Escape') { setMenu(null); setFindOpen(false); return; }
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { if (editing) return; e.preventDefault(); undo(); }
      else if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { if (editing) return; e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* ── column ops ── */
  const addColumn = () => setBoth([...cols, { id: uid(), name: `Column ${cols.length + 1}` }], rows);
  const removeColumn = (id) => { if (cols.length <= 1) return; setBoth(cols.filter((c) => c.id !== id), rows.map((r) => { const { [id]: _omit, ...rest } = r; return rest; })); };
  const renameColumn = (id, name) => { snap(); setCols(cols.map((c) => (c.id === id ? { ...c, name } : c))); };
  const moveColumn = (i, dir) => { const j = i + dir; if (j < 0 || j >= cols.length) return; const a = [...cols]; [a[i], a[j]] = [a[j], a[i]]; setBoth(a, rows); };
  const insertColumnAt = (index) => { const a = [...cols]; a.splice(index, 0, { id: uid(), name: `Column ${cols.length + 1}` }); setBoth(a, rows); };
  const insertColumnById = (colId, after) => { const idx = cols.findIndex((c) => c.id === colId); if (idx < 0) return; insertColumnAt(idx + (after ? 1 : 0)); };

  /* ── row ops ── */
  const addRow = () => setBoth(cols, [...rows, { _id: uid() }]);
  const deleteSelected = () => { if (!selectedRows.size) return; setBoth(cols, rows.filter((r) => !selectedRows.has(r._id))); setSelectedRows(new Set()); };
  const duplicateSelected = () => {
    if (!selectedRows.size) return;
    const dups = rows.filter((r) => selectedRows.has(r._id)).map((r) => ({ ...r, _id: uid() }));
    setBoth(cols, [...rows, ...dups]);
  };
  const clearRows = () => { setBoth(cols, [{ _id: uid() }]); setSelectedRows(new Set()); };

  /* ── sorted view; edits merged back by _id to preserve real order ── */
  const displayRows = useMemo(() => {
    if (!sortColumns.length) return rows;
    const { columnKey, direction } = sortColumns[0];
    const sorted = [...rows].sort((a, b) => String(a[columnKey] ?? '').localeCompare(String(b[columnKey] ?? ''), undefined, { numeric: true }));
    return direction === 'DESC' ? sorted.reverse() : sorted;
  }, [rows, sortColumns]);

  /* ── find matches (in displayed order) ── */
  const matches = useMemo(() => {
    const q = findText.trim();
    if (!q) return [];
    const lc = q.toLowerCase();
    const out = [];
    displayRows.forEach((r, rowIdx) => cols.forEach((c, colIdx) => {
      if (String(r[c.id] ?? '').toLowerCase().includes(lc)) out.push({ rowId: r._id, colId: c.id, rowIdx, colIdx });
    }));
    return out;
  }, [displayRows, cols, findText]);
  const matchSet = useMemo(() => new Set(matches.map((m) => `${m.rowId}::${m.colId}`)), [matches]);
  const activeMatch = matches[matchIdx] || null;
  const activeKey = activeMatch ? `${activeMatch.rowId}::${activeMatch.colId}` : null;

  /* ── grid columns ── */
  const gridColumns = useMemo(() => [
    SelectColumn,
    {
      key: DRAG_KEY, name: '', width: 48, minWidth: 48, maxWidth: 48, frozen: true,
      resizable: false, sortable: false, draggable: false, cellClass: 'rdg-drag-cell', headerCellClass: 'rdg-corner',
      renderHeaderCell: () => '',
      renderCell: ({ rowIdx }) => (
        <div
          draggable
          title="Drag to move this row"
          onDragStart={(e) => { dragRow.current = rowIdx; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(rowIdx)); }}
          onDragEnd={() => { dragRow.current = null; }}
          style={{ cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', fontSize: 12 }}
        >
          {rowIdx + 1}
        </div>
      ),
    },
    ...cols.map((c, i) => ({
      key: c.id, name: c.name || '(unnamed)', editable: true, resizable: true, sortable: true, draggable: true,
      renderEditCell: editTextCell,
      renderHeaderCell: () => {
        const sc = sortColumns.find((s) => s.columnKey === c.id);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, padding: '2px 0' }}>
            <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.7, letterSpacing: 0.4 }}>{colLetter(i)}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.name || '(unnamed)'}{sc ? (sc.direction === 'ASC' ? '  ↑' : '  ↓') : ''}
            </span>
          </div>
        );
      },
      cellClass: (row) => {
        const cl = [];
        if (!cellValid(colType(c.name), row[c.id])) cl.push('rdg-cell-invalid');
        const k = `${row._id}::${c.id}`;
        if (matchSet.has(k)) cl.push(k === activeKey ? 'rdg-cell-match-active' : 'rdg-cell-match');
        return cl.join(' ') || undefined;
      },
    })),
  ], [cols, matchSet, activeKey, sortColumns]);

  const onRowsChange = (newRows) => {
    // record history from the pre-change snapshot
    past.current.push({ cols, rows });
    if (past.current.length > 40) past.current.shift();
    future.current = [];
    // Use a functional update so we always merge into the LATEST rows, never a
    // stale closure (which caused earlier edits to be lost when moving cells fast).
    if (!sortColumns.length) {
      // unsorted: the grid hands back the full, correctly-ordered array
      setRows(newRows);
      return;
    }
    // sorted view: map edits back onto the real row order by _id
    const byId = new Map(newRows.map((r) => [r._id, r]));
    setRows((cur) => cur.map((r) => byId.get(r._id) || r));
  };
  const onCellCopy = ({ column, row }) => { copied.current = row[column.key] ?? ''; };
  const onCellPaste = ({ column, row }) => ({ ...row, [column.key]: copied.current ?? row[column.key] });

  /* ── find / replace ── */
  const gotoMatch = (i) => {
    if (!matches.length) return;
    const n = ((i % matches.length) + matches.length) % matches.length;
    setMatchIdx(n);
    const m = matches[n];
    requestAnimationFrame(() => gridRef.current?.selectCell({ rowIdx: m.rowIdx, idx: m.colIdx + 2 }));
  };
  const replaceActive = () => {
    if (!activeMatch || !findText) return;
    const re = new RegExp(escapeRe(findText), 'gi');
    snap();
    setRows(rows.map((r) => (r._id === activeMatch.rowId ? { ...r, [activeMatch.colId]: String(r[activeMatch.colId] ?? '').replace(re, replaceText) } : r)));
  };
  const replaceAll = () => {
    if (!findText || !matches.length) return;
    const re = new RegExp(escapeRe(findText), 'gi');
    const ids = new Map();
    matches.forEach((m) => { if (!ids.has(m.rowId)) ids.set(m.rowId, new Set()); ids.get(m.rowId).add(m.colId); });
    snap();
    setRows(rows.map((r) => {
      const cset = ids.get(r._id);
      if (!cset) return r;
      const nr = { ...r };
      cset.forEach((cid) => { nr[cid] = String(nr[cid] ?? '').replace(re, replaceText); });
      return nr;
    }));
  };

  /* ── right-click context menu ops ── */
  const rowIndexById = (id) => rows.findIndex((r) => r._id === id);
  const insertRow = (id, below) => { const idx = rowIndexById(id); if (idx < 0) return; const a = [...rows]; a.splice(idx + (below ? 1 : 0), 0, { _id: uid() }); setBoth(cols, a); };
  const deleteRowById = (id) => { const left = rows.filter((r) => r._id !== id); setBoth(cols, left.length ? left : [{ _id: uid() }]); };
  const duplicateRowById = (id) => { const idx = rowIndexById(id); if (idx < 0) return; const a = [...rows]; a.splice(idx + 1, 0, { ...rows[idx], _id: uid() }); setBoth(cols, a); };
  const clearCell = (id, colId) => { if (!isCellCol(colId)) return; setBoth(cols, rows.map((r) => (r._id === id ? { ...r, [colId]: '' } : r))); };
  const copyCellById = (id, colId) => { if (!isCellCol(colId)) return; const r = rows.find((x) => x._id === id); if (r) copied.current = r[colId] ?? ''; };
  const pasteCellById = (id, colId) => { if (!isCellCol(colId)) return; setBoth(cols, rows.map((r) => (r._id === id ? { ...r, [colId]: copied.current ?? r[colId] } : r))); };
  const onCellContextMenu = (args, event) => { event.preventGridDefault?.(); event.preventDefault?.(); setMenu({ x: event.clientX, y: event.clientY, rowId: args.row._id, colId: args.column.key }); };
  const runMenu = (fn) => { fn(); setMenu(null); };

  /* ── drag to reorder: rows (grip handle) + columns (header) ── */
  const reorderRows = (fromIdx, toIdx) => {
    if (fromIdx == null || fromIdx === toIdx) return;
    const fromId = displayRows[fromIdx]?._id;
    const toId = displayRows[toIdx]?._id;
    if (!fromId || !toId || fromId === toId) return;
    const a = [...rows];
    const [moved] = a.splice(a.findIndex((r) => r._id === fromId), 1);
    a.splice(a.findIndex((r) => r._id === toId), 0, moved);
    setBoth(cols, a);
  };
  const onColumnsReorder = (sourceKey, targetKey) => {
    const from = cols.findIndex((c) => c.id === sourceKey);
    const to = cols.findIndex((c) => c.id === targetKey);
    if (from < 0 || to < 0 || from === to) return;
    const a = [...cols];
    const [moved] = a.splice(from, 1);
    a.splice(to, 0, moved);
    setBoth(a, rows);
  };
  const onFill = ({ columnKey, sourceRow, targetRow }) => (isCellCol(columnKey) ? { ...targetRow, [columnKey]: sourceRow[columnKey] } : targetRow);
  const onScroll = (e) => {
    const t = e.currentTarget;
    if (t.scrollHeight - t.scrollTop - t.clientHeight < 80) setRows((cur) => cur.concat(blankRows(15)));
  };
  const renderRow = useCallback((key, props) => (
    <GridRow
      {...props}
      key={key}
      onDragOver={(ev) => { if (dragRow.current != null) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; } }}
      onDrop={(ev) => { if (dragRow.current != null) { ev.preventDefault(); reorderRows(dragRow.current, props.rowIdx); dragRow.current = null; } }}
    />
  ), [displayRows, rows, cols]); // eslint-disable-line react-hooks/exhaustive-deps
  const renderers = useMemo(() => ({ renderRow }), [renderRow]);

  /* ── validation + filled-row summary ── */
  const invalidCount = useMemo(() => {
    let n = 0;
    rows.forEach((r) => cols.forEach((c) => { if (!cellValid(colType(c.name), r[c.id])) n += 1; }));
    return n;
  }, [rows, cols]);
  const filledCount = useMemo(() => rows.filter((r) => cols.some((c) => String(r[c.id] ?? '').trim() !== '')).length, [rows, cols]);

  /* ── save / export ── */
  const cleanNames = () => {
    const seen = {};
    return cols.map((c, i) => { let name = String(c.name || '').trim() || `Column ${i + 1}`; if (seen[name] != null) { seen[name] += 1; name = `${name} (${seen[name]})`; } else seen[name] = 0; return name; });
  };
  const rowObjects = (names) => rows
    .filter((r) => cols.some((c) => String(r[c.id] ?? '').trim() !== ''))
    .map((r) => { const o = {}; cols.forEach((c, i) => { o[names[i]] = r[c.id] ?? ''; }); return o; });

  const download = () => {
    const names = cleanNames();
    const aoa = [names, ...rows.map((r) => cols.map((c) => r[c.id] ?? ''))];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    XLSX.writeFile(wb, (fileName.trim() || 'spreadsheet').replace(/\.xlsx$/i, '') + '.xlsx');
  };

  const save = async () => {
    setError('');
    const names = cleanNames();
    const dataRows = rowObjects(names);
    if (!fileName.trim()) { setError('Enter a file name.'); return; }
    if (!cols.length) { setError('Add at least one column.'); return; }
    if (!dataRows.length) { setError('Add at least one row with data.'); return; }
    if (invalidCount > 0) { setError(`Fix ${invalidCount} invalid cell${invalidCount > 1 ? 's' : ''} (highlighted) before saving.`); return; }
    setSaving(true);
    try {
      const name = fileName.trim().replace(/\.xlsx$/i, '') + '.xlsx';
      const { data: src, error: srcErr } = await supabase.from('data_sources').insert({
        user_id: user.id, file_name: name, file_type: 'xlsx',
        row_count: dataRows.length, column_count: names.length,
        detected_columns: names, status: 'healthy',
      }).select().single();
      if (srcErr) throw srcErr;
      const records = dataRows.map((rd, i) => ({ data_source_id: src.id, row_index: i, row_data: rd }));
      for (let i = 0; i < records.length; i += 200) {
        const { error: e } = await supabase.from('data_rows').insert(records.slice(i, i + 200));
        if (e) throw e;
      }
      window.dispatchEvent(new Event('storage-changed'));
      navigate('/data-sources');
    } catch (e) {
      console.error('Create spreadsheet failed:', e);
      setError(e.message || 'Failed to save.');
      setSaving(false);
    }
  };

  return (
    <Shell active="data">
      <div className="h-topbar"><div className="crumb">DATA SOURCES · CREATE</div></div>

      <div className="h-row h-between keep-row" style={{ marginBottom: 16, alignItems: 'flex-start', gap: 12 }}>
        <div className="h-section-title" style={{ margin: 0, minWidth: 0 }}>
          <div className="serif" style={{ fontSize: mobile ? 26 : 34, lineHeight: 1.05 }}>Create spreadsheet</div>
          <div className="lead">An Excel-like editor — edit cells, copy/paste, sort, undo. Save as a data source.</div>
        </div>
        <div className="h-row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="h-btn" onClick={() => navigate('/data-sources')}><HIcon name="chev-l" size={14} /> Back</button>
          <button className="h-btn" onClick={download}><HIcon name="download" size={14} /> Download .xlsx</button>
          <button className="h-btn primary" onClick={save} disabled={saving}><HIcon name="check" size={14} /> {saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 'var(--r-sm)', background: '#FEF0F0', border: '1px solid #F5C6C6', color: '#a23b2b', fontSize: 13, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <HIcon name="x" size={14} /> {error}
        </div>
      )}

      {/* file name + toolbar */}
      <div className="h-row" style={{ gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="h-input" style={{ width: mobile ? '100%' : 300 }}>
          <HIcon name="file" size={14} color="var(--ink-5)" />
          <input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="File name" />
          <span className="h-mono" style={{ fontSize: 11, color: 'var(--ink-6)' }}>.xlsx</span>
        </div>
        <div style={{ flex: 1 }} />
        <button className="h-iconbtn" title="Undo (Ctrl+Z)" onClick={undo} disabled={!past.current.length} style={{ width: 32, height: 32 }}><HIcon name="chev-l" size={14} /></button>
        <button className="h-iconbtn" title="Redo (Ctrl+Y)" onClick={redo} disabled={!future.current.length} style={{ width: 32, height: 32 }}><HIcon name="chev-r" size={14} /></button>
        <button className="h-btn ghost sm" title="Find & replace (Ctrl+F)" onClick={() => openFind(false)}><HIcon name="search" size={13} /> Find</button>
        <button className="h-btn ghost sm" onClick={addColumn}><HIcon name="plus" size={13} /> Column</button>
        <button className="h-btn ghost sm" onClick={addRow}><HIcon name="plus" size={13} /> Row</button>
        <button className="h-btn ghost sm" onClick={duplicateSelected} disabled={!selectedRows.size}>Duplicate</button>
        <button className="h-btn ghost sm" onClick={deleteSelected} disabled={!selectedRows.size}><HIcon name="trash" size={13} /> Delete{selectedRows.size ? ` (${selectedRows.size})` : ''}</button>
        <button className="h-btn ghost sm" onClick={clearRows}>Clear</button>
      </div>

      {/* column manager */}
      <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 10 }}>
        {cols.map((c, i) => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4, flex: '0 0 auto', border: '1px solid var(--line-faint)', borderRadius: 'var(--r-md)', padding: '4px 6px', background: 'var(--paper)' }}>
            <input value={c.name} onChange={(e) => renameColumn(c.id, e.target.value)} placeholder={`Column ${i + 1}`}
              style={{ width: 110, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }} />
            <button className="h-iconbtn" style={{ width: 22, height: 22 }} title="Move left" disabled={i === 0} onClick={() => moveColumn(i, -1)}><HIcon name="chev-l" size={11} /></button>
            <button className="h-iconbtn" style={{ width: 22, height: 22 }} title="Move right" disabled={i === cols.length - 1} onClick={() => moveColumn(i, 1)}><HIcon name="chev-r" size={11} /></button>
            <button className="h-iconbtn" style={{ width: 22, height: 22 }} title="Insert column to the left" onClick={() => insertColumnAt(i)}><HIcon name="plus" size={11} /></button>
            <button className="h-iconbtn" style={{ width: 22, height: 22 }} title="Remove column" disabled={cols.length <= 1} onClick={() => removeColumn(c.id)}><HIcon name="x" size={11} /></button>
          </div>
        ))}
        <button className="h-btn ghost sm" style={{ flex: '0 0 auto' }} onClick={addColumn}><HIcon name="plus" size={13} /> Add column</button>
      </div>

      {/* find & replace bar */}
      {findOpen && (
        <div className="h-card" style={{ padding: 10, marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <div className="h-input" style={{ width: mobile ? '100%' : 220 }}>
            <HIcon name="search" size={14} color="var(--ink-5)" />
            <input ref={findInputRef} value={findText} onChange={(e) => setFindText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); gotoMatch(matchIdx + (e.shiftKey ? -1 : 1)); } }}
              placeholder="Find in sheet" />
          </div>
          <span className="h-mono" style={{ fontSize: 12, color: 'var(--ink-5)', minWidth: 54, textAlign: 'center' }}>
            {matches.length ? `${matchIdx + 1} / ${matches.length}` : (findText ? '0 / 0' : '—')}
          </span>
          <button className="h-iconbtn" title="Previous (Shift+Enter)" disabled={!matches.length} onClick={() => gotoMatch(matchIdx - 1)} style={{ width: 30, height: 30 }}><HIcon name="chev-l" size={13} /></button>
          <button className="h-iconbtn" title="Next (Enter)" disabled={!matches.length} onClick={() => gotoMatch(matchIdx + 1)} style={{ width: 30, height: 30 }}><HIcon name="chev-r" size={13} /></button>
          <button className="h-btn ghost sm" onClick={() => setReplaceMode((v) => !v)}>{replaceMode ? 'Hide replace' : 'Replace…'}</button>
          {replaceMode && (
            <>
              <div className="h-input" style={{ width: mobile ? '100%' : 220 }}>
                <HIcon name="pencil" size={14} color="var(--ink-5)" />
                <input value={replaceText} onChange={(e) => setReplaceText(e.target.value)} placeholder="Replace with" />
              </div>
              <button className="h-btn ghost sm" disabled={!activeMatch} onClick={replaceActive}>Replace</button>
              <button className="h-btn ghost sm" disabled={!matches.length} onClick={replaceAll}>Replace all{matches.length ? ` (${matches.length})` : ''}</button>
            </>
          )}
          <div style={{ flex: 1 }} />
          <button className="h-iconbtn" title="Close (Esc)" onClick={() => setFindOpen(false)} style={{ width: 30, height: 30 }}><HIcon name="x" size={13} /></button>
        </div>
      )}

      {/* the grid */}
      <DataGrid
        ref={gridRef}
        columns={gridColumns}
        rows={displayRows}
        rowKeyGetter={(r) => r._id}
        onRowsChange={onRowsChange}
        selectedRows={selectedRows}
        onSelectedRowsChange={setSelectedRows}
        sortColumns={sortColumns}
        onSortColumnsChange={setSortColumns}
        onCellCopy={onCellCopy}
        onCellPaste={onCellPaste}
        onCellContextMenu={onCellContextMenu}
        onColumnsReorder={onColumnsReorder}
        onFill={onFill}
        onScroll={onScroll}
        renderers={renderers}
        defaultColumnOptions={{ resizable: true, sortable: true, minWidth: 110 }}
        headerRowHeight={46}
        rowHeight={33}
        className="rdg-light rdg-excel"
        style={{ height: mobile ? 380 : 520, borderRadius: 'var(--r-md)', border: '1px solid #d8d8d3' }}
      />

      <div className="h-row" style={{ marginTop: 8, gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="h-meta" style={{ fontSize: 12 }}>{filledCount} filled · {cols.length} column{cols.length === 1 ? '' : 's'}</div>
        {invalidCount > 0 && <div className="h-status warn">{invalidCount} invalid cell{invalidCount > 1 ? 's' : ''}</div>}
        <div className="h-meta" style={{ fontSize: 11, color: 'var(--ink-6)' }}>Tip: drag the ⠿ handle to move a row · drag a column header to reorder · drag a cell's bottom-right corner to fill down · scroll for more rows</div>
      </div>

      {/* right-click context menu */}
      {menu && (
        <>
          <div onClick={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null); }} onWheel={() => setMenu(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 80 }} />
          <div className="h-card" style={{ position: 'fixed', top: Math.min(menu.y, window.innerHeight - 460), left: Math.min(menu.x, window.innerWidth - 200), zIndex: 81, padding: 4, minWidth: 184, boxShadow: '0 10px 30px rgba(0,0,0,.16)' }}>
            {[
              { label: 'Copy cell', icon: 'layers', fn: () => copyCellById(menu.rowId, menu.colId), disabled: !isCellCol(menu.colId) },
              { label: 'Paste cell', icon: 'download', fn: () => pasteCellById(menu.rowId, menu.colId), disabled: !isCellCol(menu.colId) },
              { label: 'Clear cell', icon: 'minus', fn: () => clearCell(menu.rowId, menu.colId), disabled: !isCellCol(menu.colId) },
              { sep: true },
              { label: 'Insert column left', icon: 'plus', fn: () => insertColumnById(menu.colId, false), disabled: !isCellCol(menu.colId) },
              { label: 'Insert column right', icon: 'plus', fn: () => insertColumnById(menu.colId, true), disabled: !isCellCol(menu.colId) },
              { sep: true },
              { label: 'Insert row above', icon: 'plus', fn: () => insertRow(menu.rowId, false) },
              { label: 'Insert row below', icon: 'plus', fn: () => insertRow(menu.rowId, true) },
              { label: 'Duplicate row', icon: 'layers', fn: () => duplicateRowById(menu.rowId) },
              { label: 'Delete row', icon: 'trash', fn: () => deleteRowById(menu.rowId), danger: true },
            ].map((it, i) => it.sep
              ? <div key={i} style={{ height: 1, background: 'var(--line-faint)', margin: '4px 6px' }} />
              : (
                <button key={i} disabled={it.disabled} onClick={() => runMenu(it.fn)}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 10px', border: 'none', background: 'transparent', borderRadius: 'var(--r-sm)', cursor: it.disabled ? 'not-allowed' : 'pointer', textAlign: 'left', fontSize: 13, color: it.danger ? '#c0392b' : 'var(--ink-2)', opacity: it.disabled ? 0.4 : 1 }}
                  onMouseEnter={(e) => { if (!it.disabled) e.currentTarget.style.background = '#f3f1ec'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                  <HIcon name={it.icon} size={13} /> {it.label}
                </button>
              ))}
          </div>
        </>
      )}

      <style>{`
        /* light Excel skin */
        .rdg-excel {
          --rdg-border-color: #e4e4df;
          --rdg-header-background-color: #217346;
          --rdg-header-draggable-background-color: #1b6a3f;
          --rdg-row-hover-background-color: #f1faf4;
          --rdg-background-color: #ffffff;
          --rdg-color: #232a25;
          --rdg-font-size: 13px;
        }
        .rdg-excel [role="columnheader"] { color: #ffffff; }
        .rdg-excel .rdg-corner { background: #1b6a3f; }
        .rdg-excel .rdg-drag-cell { padding: 0 !important; background: #f4f4f1; color: #5b6159; font-variant-numeric: tabular-nums; }
        .rdg-excel .rdg-drag-cell:hover { background: #e8e8e2; color: #232a25; }
        .rdg-cell-invalid { background-color: #FDECEA; box-shadow: inset 0 0 0 1px #E3A9A0; }
        .rdg-cell-match { background-color: #FFF3C4; }
        .rdg-cell-match-active { background-color: #FFD666; box-shadow: inset 0 0 0 2px #E0A000; }
      `}</style>
    </Shell>
  );
}
