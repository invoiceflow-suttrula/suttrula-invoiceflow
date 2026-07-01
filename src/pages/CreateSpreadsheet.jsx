/* Create a data source in-app with an Excel-like grid (react-data-grid):
   inline editing, keyboard nav, drag-to-select cell ranges, range copy +
   block (multi-row/col) paste, sorting, column resize, drag to reorder
   rows/columns, undo/redo, validation, and all row/column operations in a
   right-click menu. Saves into data_sources + data_rows (same shape as an
   uploaded file). Optional .xlsx export via SheetJS. */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataGrid, renderTextEditor, SELECT_COLUMN_KEY, Row as GridRow } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import * as XLSX from 'xlsx';
import Shell from '../components/Shell.jsx';
import HIcon from '../components/HIcon.jsx';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import useIsMobile from '../hooks/useIsMobile.js';

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const colLetter = (n) => { let s = ''; let x = n + 1; while (x > 0) { const m = (x - 1) % 26; s = String.fromCharCode(65 + m) + s; x = Math.floor((x - 1) / 26); } return s; };
const DEFAULT_COLS = ['Name', 'Email', 'Phone', 'City', 'GSTIN', 'Item', 'Qty', 'Rate', 'Tax'];
const DRAG_KEY = '__drag';
const BLANK_ROWS = 40;
const blankRows = (n) => Array.from({ length: n }, () => ({ _id: uid() }));
const isCellCol = (k) => !!k && k !== SELECT_COLUMN_KEY && k !== DRAG_KEY;
// Wrap the default text editor so blank cells (undefined) become '' (controlled input).
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
  if (!s) return true;
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
  const [sortColumns, setSortColumns] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [renamingId, setRenamingId] = useState(null); // column being renamed (inline in header)

  /* find / replace */
  const [findOpen, setFindOpen] = useState(false);
  const [replaceMode, setReplaceMode] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchIdx, setMatchIdx] = useState(0);
  const [menu, setMenu] = useState(null);
  const [showKeys, setShowKeys] = useState(false);

  /* range selection (drag across cells) */
  const [range, setRange] = useState(null); // {r1,c1,r2,c2} in display indices / data-col indices
  const selecting = useRef(false);
  const anchorCell = useRef(null); // {rowIdx, colIdx} for block paste
  const lastPaste = useRef(0);     // dedupe (Ctrl+V readText + native paste event)
  const rightClickGuard = useRef(false); // keep the range when right-clicking inside it

  const gridRef = useRef(null);
  const findInputRef = useRef(null);
  const dragRow = useRef(null);
  const openFind = (withReplace) => { setReplaceMode(withReplace); setFindOpen(true); setTimeout(() => findInputRef.current?.focus(), 0); };
  useEffect(() => { setMatchIdx(0); }, [findText]);

  /* ── undo / redo over {cols, rows} ── */
  const past = useRef([]);
  const future = useRef([]);
  const snap = () => { past.current.push({ cols, rows }); if (past.current.length > 40) past.current.shift(); future.current = []; };
  const setBoth = (nc, nr) => { snap(); setCols(nc); setRows(nr); };
  const undo = () => { if (!past.current.length) return; future.current.unshift({ cols, rows }); const p = past.current.pop(); setCols(p.cols); setRows(p.rows); };
  const redo = () => { if (!future.current.length) return; past.current.push({ cols, rows }); const f = future.current.shift(); setCols(f.cols); setRows(f.rows); };

  /* ── sorted view; edits merged back by _id to preserve real order ── */
  const displayRows = useMemo(() => {
    if (!sortColumns.length) return rows;
    const { columnKey, direction } = sortColumns[0];
    const dir = direction === 'DESC' ? -1 : 1;
    return [...rows].sort((a, b) => {
      const av = String(a[columnKey] ?? '').trim();
      const bv = String(b[columnKey] ?? '').trim();
      if (!av && !bv) return 0;
      if (!av) return 1;   // blanks always sink to the bottom…
      if (!bv) return -1;  // …regardless of sort direction
      return dir * av.localeCompare(bv, undefined, { numeric: true });
    });
  }, [rows, sortColumns]);
  const rowIndexMap = useMemo(() => new Map(displayRows.map((r, i) => [r._id, i])), [displayRows]);

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

  /* normalized range */
  const nr = range && { r1: Math.min(range.r1, range.r2), r2: Math.max(range.r1, range.r2), c1: Math.min(range.c1, range.c2), c2: Math.max(range.c1, range.c2) };

  /* drag-to-select handlers (attached per data cell) */
  const inRange = (rg, rowIdx, colIdx) => {
    if (!rg) return false;
    const r1 = Math.min(rg.r1, rg.r2), r2 = Math.max(rg.r1, rg.r2), c1 = Math.min(rg.c1, rg.c2), c2 = Math.max(rg.c1, rg.c2);
    return rowIdx >= r1 && rowIdx <= r2 && colIdx >= c1 && colIdx <= c2;
  };
  const cellMouseDown = (rowIdx, colIdx, e) => {
    anchorCell.current = { rowIdx, colIdx };
    if (e.button === 2) {
      // right-click: keep the selection if clicking inside it, else select this cell
      rightClickGuard.current = true;
      setRange((rg) => (inRange(rg, rowIdx, colIdx) ? rg : { r1: rowIdx, c1: colIdx, r2: rowIdx, c2: colIdx }));
      return;
    }
    if (e.button !== 0) return;
    selecting.current = true;
    setRange({ r1: rowIdx, c1: colIdx, r2: rowIdx, c2: colIdx });
  };
  const cellMouseEnter = (rowIdx, colIdx) => {
    if (selecting.current) setRange((rg) => (rg ? { ...rg, r2: rowIdx, c2: colIdx } : { r1: rowIdx, c1: colIdx, r2: rowIdx, c2: colIdx }));
  };
  useEffect(() => {
    const up = () => { selecting.current = false; };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  /* ── grid columns ── */
  const gridColumns = useMemo(() => [
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
        if (renamingId === c.id) {
          return (
            <input
              autoFocus
              defaultValue={c.name}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onBlur={(e) => { renameColumn(c.id, e.target.value); setRenamingId(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { renameColumn(c.id, e.currentTarget.value); setRenamingId(null); } else if (e.key === 'Escape') { setRenamingId(null); } }}
              style={{ width: '100%', font: 'inherit', color: '#1d2a22', border: '1px solid #1b6a3f', borderRadius: 4, padding: '2px 4px', boxSizing: 'border-box' }}
            />
          );
        }
        const sc = sortColumns.find((s) => s.columnKey === c.id);
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', textAlign: 'center', lineHeight: 1.15, padding: '2px 0' }}>
            <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.7, letterSpacing: 0.4 }}>{colLetter(i)}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
              {c.name || '(unnamed)'}{sc ? (sc.direction === 'ASC' ? '  ↑' : '  ↓') : ''}
            </span>
          </div>
        );
      },
      renderCell: ({ row, rowIdx }) => (
        <div
          className="rdg-cellwrap"
          onMouseDown={(e) => cellMouseDown(rowIdx, i, e)}
          onMouseEnter={() => cellMouseEnter(rowIdx, i)}
        >
          {row[c.id] ?? ''}
        </div>
      ),
      cellClass: (row) => {
        const cl = [];
        if (nr) { const idx = rowIndexMap.get(row._id); if (idx != null && idx >= nr.r1 && idx <= nr.r2 && i >= nr.c1 && i <= nr.c2) cl.push('rdg-range'); }
        if (matchSet.has(`${row._id}::${c.id}`)) cl.push(`${row._id}::${c.id}` === activeKey ? 'rdg-cell-match-active' : 'rdg-cell-match');
        if (!cellValid(colType(c.name), row[c.id])) cl.push('rdg-cell-invalid');
        return cl.join(' ') || undefined;
      },
    })),
  ], [cols, matchSet, activeKey, sortColumns, renamingId, range, rowIndexMap]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRowsChange = (newRows) => {
    past.current.push({ cols, rows }); if (past.current.length > 40) past.current.shift(); future.current = [];
    if (!sortColumns.length) { setRows(newRows); return; }
    const byId = new Map(newRows.map((r) => [r._id, r]));
    setRows((cur) => cur.map((r) => byId.get(r._id) || r));
  };

  /* ── column ops ── */
  const renameColumn = (id, name) => { snap(); setCols((cur) => cur.map((c) => (c.id === id ? { ...c, name } : c))); };
  const moveColumnById = (id, dir) => { const i = cols.findIndex((c) => c.id === id); const j = i + dir; if (i < 0 || j < 0 || j >= cols.length) return; const a = [...cols]; [a[i], a[j]] = [a[j], a[i]]; setBoth(a, rows); };
  const insertColumnAt = (index) => { const a = [...cols]; a.splice(index, 0, { id: uid(), name: `Column ${cols.length + 1}` }); setBoth(a, rows); };
  const insertColumnById = (id, after) => { const i = cols.findIndex((c) => c.id === id); if (i < 0) return; insertColumnAt(i + (after ? 1 : 0)); };
  const removeColumn = (id) => { if (cols.length <= 1) return; setBoth(cols.filter((c) => c.id !== id), rows.map((r) => { const { [id]: _omit, ...rest } = r; return rest; })); };
  const onColumnsReorder = (sourceKey, targetKey) => {
    const from = cols.findIndex((c) => c.id === sourceKey);
    const to = cols.findIndex((c) => c.id === targetKey);
    if (from < 0 || to < 0 || from === to) return;
    const a = [...cols]; const [m] = a.splice(from, 1); a.splice(to, 0, m); setBoth(a, rows);
  };

  /* ── row ops ── */
  const rowIndexById = (id) => rows.findIndex((r) => r._id === id);
  const insertRow = (id, below) => { const idx = rowIndexById(id); if (idx < 0) return; const a = [...rows]; a.splice(idx + (below ? 1 : 0), 0, { _id: uid() }); setBoth(cols, a); };
  const deleteRowById = (id) => { const left = rows.filter((r) => r._id !== id); setBoth(cols, left.length ? left : [{ _id: uid() }]); };
  const duplicateRowById = (id) => { const idx = rowIndexById(id); if (idx < 0) return; const a = [...rows]; a.splice(idx + 1, 0, { ...rows[idx], _id: uid() }); setBoth(cols, a); };
  const clearCell = (id, colId) => { if (!isCellCol(colId)) return; setBoth(cols, rows.map((r) => (r._id === id ? { ...r, [colId]: '' } : r))); };

  /* multi-selection ops (whole drag range) */
  const deleteRows = (ids) => { const set = new Set(ids); const left = rows.filter((r) => !set.has(r._id)); setBoth(cols, left.length ? left : [{ _id: uid() }]); setRange(null); };
  const duplicateRows = (ids) => {
    const idxs = ids.map((id) => rows.findIndex((r) => r._id === id)).filter((i) => i >= 0).sort((a, b) => a - b);
    if (!idxs.length) return;
    const copies = idxs.map((i) => ({ ...rows[i], _id: uid() }));
    const a = [...rows]; a.splice(idxs[idxs.length - 1] + 1, 0, ...copies); setBoth(cols, a);
  };
  const clearCells = (rowIds, colIds) => {
    const rset = new Set(rowIds); const cids = colIds.filter(isCellCol);
    if (!cids.length) return;
    setBoth(cols, rows.map((r) => { if (!rset.has(r._id)) return r; const x = { ...r }; cids.forEach((cid) => { x[cid] = ''; }); return x; }));
  };
  const removeColumns = (ids) => {
    const removeSet = new Set(ids.filter(isCellCol));
    const keep = cols.filter((c) => !removeSet.has(c.id));
    if (!keep.length) return;
    setBoth(keep, rows.map((r) => { const x = { ...r }; removeSet.forEach((cid) => { delete x[cid]; }); return x; }));
    setRange(null);
  };
  const copySelection = (rowIds, colIds) => {
    const cids = colIds.filter(isCellCol);
    if (!cids.length) return;
    const tsv = rowIds.map((rid) => { const r = rows.find((x) => x._id === rid); return cids.map((cid) => String(r?.[cid] ?? '')).join('\t'); }).join('\n');
    copied.current = tsv;
    navigator.clipboard?.writeText(tsv);
  };

  /* ── single-cell copy/paste via context menu ── */
  const copied = useRef(null);
  const copyCellById = (id, colId) => { if (!isCellCol(colId)) return; const r = rows.find((x) => x._id === id); if (r) copied.current = r[colId] ?? ''; };
  const pasteCellById = (id, colId) => { if (!isCellCol(colId)) return; setBoth(cols, rows.map((r) => (r._id === id ? { ...r, [colId]: copied.current ?? r[colId] } : r))); };

  /* ── range copy (Ctrl+C) + block paste (Ctrl+V) ── */
  const buildRangeTSV = (rg) => {
    const out = [];
    for (let r = rg.r1; r <= rg.r2; r++) {
      const ro = displayRows[r];
      const line = [];
      for (let c = rg.c1; c <= rg.c2; c++) line.push(String(ro?.[cols[c]?.id] ?? ''));
      out.push(line.join('\t'));
    }
    return out.join('\n');
  };
  const applyBlockPaste = (sr, sc, matrix) => {
    if (!matrix.length) return;
    const maxCols = Math.max(...matrix.map((m) => m.length));
    const workCols = [...cols];
    while (workCols.length < sc + maxCols) workCols.push({ id: uid(), name: `Column ${workCols.length + 1}` });
    const workRows = [...rows];
    const needLen = sr + matrix.length;
    if (!sortColumns.length) {
      while (workRows.length < needLen) workRows.push({ _id: uid() });
    } else {
      const extra = needLen - displayRows.length;
      for (let k = 0; k < extra; k++) workRows.push({ _id: uid() });
    }
    const displayIds = sortColumns.length
      ? displayRows.map((r) => r._id).concat(workRows.slice(rows.length).map((r) => r._id))
      : workRows.map((r) => r._id);
    const byId = new Map(workRows.map((r) => [r._id, r]));
    matrix.forEach((line, ri) => {
      const id = displayIds[sr + ri];
      if (!id) return;
      const target = { ...(byId.get(id) || { _id: id }) };
      line.forEach((val, ci) => { const col = workCols[sc + ci]; if (col) target[col.id] = val; });
      byId.set(id, target);
    });
    setBoth(workCols, workRows.map((r) => byId.get(r._id) || r));
  };

  /* Parse clipboard text into a 2-D block and paste it at the selected cell.
     Auto-detects the separator: tab (Excel/Sheets), pipe (Markdown table),
     comma (CSV), else each line is one cell (a vertical list fills down). */
  const pasteText = (text) => {
    if (!text) return;
    const now = Date.now();
    if (now - lastPaste.current < 300) return; // guard against double-fire
    lastPaste.current = now;
    const norm = text.replace(/\r\n?/g, '\n');
    let lines = norm.split('\n').filter((l) => l.trim() !== '');
    if (!lines.length) return;

    const delim = norm.includes('\t') ? '\t'
      : lines.some((l) => l.includes('|')) ? '|'
      : lines.some((l) => l.includes(',')) ? ',' : null;

    const splitLine = (ln) => {
      if (!delim) return [ln];
      const cells = ln.split(delim).map((s) => s.trim());
      if (delim === '|') { // markdown tables are wrapped in pipes → drop empty edges
        if (cells[0] === '') cells.shift();
        if (cells.length && cells[cells.length - 1] === '') cells.pop();
      }
      return cells;
    };
    // a markdown separator row looks like | --- | :--: | --- |
    const isSeparator = (cells) => cells.some((c) => /^:?-{2,}:?$/.test(c)) && cells.every((c) => c === '' || /^:?-{2,}:?$/.test(c));

    const matrix = lines.map(splitLine).filter((cells) => !isSeparator(cells));
    if (!matrix.length) return;
    const a = anchorCell.current || (nr ? { rowIdx: nr.r1, colIdx: nr.c1 } : { rowIdx: 0, colIdx: 0 });
    applyBlockPaste(a.rowIdx, a.colIdx, matrix);
  };

  /* keyboard: find, undo/redo, range copy, block paste */
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const editing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'f') { e.preventDefault(); openFind(false); return; }
      if (mod && e.key.toLowerCase() === 'h') { e.preventDefault(); openFind(true); return; }
      if (e.key === 'Escape') { setMenu(null); setFindOpen(false); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !editing && nr) {
        e.preventDefault();
        const rowIds = []; for (let r = nr.r1; r <= nr.r2; r++) { const id = displayRows[r]?._id; if (id) rowIds.push(id); }
        const colIds = []; for (let c = nr.c1; c <= nr.c2; c++) { const col = cols[c]; if (col) colIds.push(col.id); }
        clearCells(rowIds, colIds);
        return;
      }
      if (mod && e.key.toLowerCase() === 'c' && !editing && nr) { e.preventDefault(); navigator.clipboard?.writeText(buildRangeTSV(nr)); return; }
      if (mod && e.key.toLowerCase() === 'v' && !editing) { e.preventDefault(); navigator.clipboard?.readText?.().then((txt) => pasteText(txt)).catch(() => {}); return; }
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { if (editing) return; e.preventDefault(); undo(); }
      else if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { if (editing) return; e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* Fallback: native paste event (fires in some browsers / when a field is focused). */
  useEffect(() => {
    const onPaste = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return; // editing a field
      const text = e.clipboardData?.getData('text/plain');
      if (!text) return;
      e.preventDefault();
      pasteText(text);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  });

  /* ── drag rows to reorder (grip handle) ── */
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
  const renderRow = useCallback((key, props) => (
    <GridRow
      {...props}
      key={key}
      onDragOver={(ev) => { if (dragRow.current != null) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; } }}
      onDrop={(ev) => { if (dragRow.current != null) { ev.preventDefault(); reorderRows(dragRow.current, props.rowIdx); dragRow.current = null; } }}
    />
  ), [displayRows, rows, cols]); // eslint-disable-line react-hooks/exhaustive-deps
  const renderers = useMemo(() => ({ renderRow }), [renderRow]);

  const onFill = ({ columnKey, sourceRow, targetRow }) => (isCellCol(columnKey) ? { ...targetRow, [columnKey]: sourceRow[columnKey] } : targetRow);
  const onScroll = (e) => { const t = e.currentTarget; if (t.scrollHeight - t.scrollTop - t.clientHeight < 80) setRows((cur) => cur.concat(blankRows(15))); };
  const onSelectedCellChange = (args) => {
    const colIdx = cols.findIndex((c) => c.id === args.column?.key);
    if (colIdx < 0) return;
    anchorCell.current = { rowIdx: args.rowIdx, colIdx };
    if (rightClickGuard.current) { rightClickGuard.current = false; return; } // don't collapse on right-click
    if (!selecting.current) setRange({ r1: args.rowIdx, c1: colIdx, r2: args.rowIdx, c2: colIdx });
  };
  const onCellContextMenu = (args, event) => {
    event.preventGridDefault?.(); event.preventDefault?.();
    const rIdx = rowIndexMap.get(args.row._id);
    const cIdx = cols.findIndex((c) => c.id === args.column.key);
    let selRowIds = [args.row._id];
    let selColIds = isCellCol(args.column.key) ? [args.column.key] : [];
    // if the right-click landed inside the drag selection, act on the whole range
    if (nr && rIdx != null && inRange(nr, rIdx, cIdx)) {
      selRowIds = [];
      for (let r = nr.r1; r <= nr.r2; r++) { const id = displayRows[r]?._id; if (id) selRowIds.push(id); }
      selColIds = [];
      for (let c = nr.c1; c <= nr.c2; c++) { const col = cols[c]; if (col) selColIds.push(col.id); }
    }
    setMenu({ x: event.clientX, y: event.clientY, rowId: args.row._id, colId: args.column.key, selRowIds, selColIds });
  };
  const runMenu = (fn) => { fn(); setMenu(null); };

  /* ── find / replace ── */
  const gotoMatch = (i) => {
    if (!matches.length) return;
    const n = ((i % matches.length) + matches.length) % matches.length;
    setMatchIdx(n);
    const m = matches[n];
    requestAnimationFrame(() => gridRef.current?.selectCell({ rowIdx: m.rowIdx, idx: m.colIdx + 1 }));
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
      const x = { ...r };
      cset.forEach((cid) => { x[cid] = String(x[cid] ?? '').replace(re, replaceText); });
      return x;
    }));
  };

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

  const rc = menu?.selRowIds?.length || 1;        // selected row count
  const cc = menu?.selColIds?.length || 0;        // selected (data) column count
  const multi = rc > 1 || cc > 1;
  const MENU = menu ? [
    { label: multi ? `Copy ${rc}×${Math.max(cc, 1)}` : 'Copy cell', icon: 'layers', fn: () => copySelection(menu.selRowIds, menu.selColIds), disabled: !isCellCol(menu.colId) },
    { label: 'Paste here', icon: 'download', fn: () => pasteCellById(menu.rowId, menu.colId), disabled: !isCellCol(menu.colId) },
    { label: multi ? 'Clear cells' : 'Clear cell', icon: 'minus', fn: () => clearCells(menu.selRowIds, menu.selColIds), disabled: !isCellCol(menu.colId) },
    { sep: true },
    { label: 'Rename column', icon: 'pencil', fn: () => setRenamingId(menu.colId), disabled: !isCellCol(menu.colId) },
    { label: 'Move column left', icon: 'chev-l', fn: () => moveColumnById(menu.colId, -1), disabled: !isCellCol(menu.colId) },
    { label: 'Move column right', icon: 'chev-r', fn: () => moveColumnById(menu.colId, 1), disabled: !isCellCol(menu.colId) },
    { label: 'Insert column left', icon: 'plus', fn: () => insertColumnById(menu.colId, false), disabled: !isCellCol(menu.colId) },
    { label: 'Insert column right', icon: 'plus', fn: () => insertColumnById(menu.colId, true), disabled: !isCellCol(menu.colId) },
    { label: cc > 1 ? `Delete ${cc} columns` : 'Delete column', icon: 'trash', fn: () => removeColumns(cc > 1 ? menu.selColIds : [menu.colId]), disabled: !isCellCol(menu.colId) || cols.length <= (cc > 1 ? cc : 1) },
    { sep: true },
    { label: 'Insert row above', icon: 'plus', fn: () => insertRow(menu.rowId, false) },
    { label: 'Insert row below', icon: 'plus', fn: () => insertRow(menu.rowId, true) },
    { label: rc > 1 ? `Duplicate ${rc} rows` : 'Duplicate row', icon: 'layers', fn: () => duplicateRows(menu.selRowIds) },
    { label: rc > 1 ? `Delete ${rc} rows` : 'Delete row', icon: 'trash', fn: () => deleteRows(menu.selRowIds), danger: true },
  ] : [];

  return (
    <Shell active="data">
      <div className="h-topbar"><div className="crumb">DATA SOURCES · CREATE</div></div>

      <div className="h-row h-between keep-row" style={{ marginBottom: 16, alignItems: 'flex-start', gap: 12 }}>
        <div className="h-section-title" style={{ margin: 0, minWidth: 0 }}>
          <div className="serif" style={{ fontSize: mobile ? 26 : 34, lineHeight: 1.05 }}>Create spreadsheet</div>
          <div className="lead">Right-click a cell for all row & column actions. Drag to select, copy, and paste blocks like Excel.</div>
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

      {/* toolbar: file name + undo/redo + find only */}
      <div className="h-row" style={{ gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="h-input" style={{ width: mobile ? '100%' : 300 }}>
          <HIcon name="file" size={14} color="var(--ink-5)" />
          <input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="File name" />
          <span className="h-mono" style={{ fontSize: 11, color: 'var(--ink-6)' }}>.xlsx</span>
        </div>
        <div style={{ flex: 1 }} />
        <button className="h-iconbtn" title="Undo (Ctrl+Z)" onClick={undo} disabled={!past.current.length} style={{ width: 32, height: 32 }}><HIcon name="undo" size={15} /></button>
        <button className="h-iconbtn" title="Redo (Ctrl+Y)" onClick={redo} disabled={!future.current.length} style={{ width: 32, height: 32 }}><HIcon name="redo" size={15} /></button>
        <button className="h-btn ghost sm" title="Find & replace (Ctrl+F)" onClick={() => openFind(false)}><HIcon name="search" size={13} /> Find</button>
        <button className="h-btn ghost sm" title="Keyboard shortcuts" onClick={() => setShowKeys((v) => !v)}><HIcon name="compass" size={13} /> Shortcuts</button>
      </div>

      {/* keyboard shortcuts guide */}
      {showKeys && (
        <div className="h-card" style={{ padding: 14, marginBottom: 12 }}>
          <div className="h-row h-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="h-eyebrow">KEYBOARD SHORTCUTS</div>
            <button className="h-iconbtn" onClick={() => setShowKeys(false)} style={{ width: 28, height: 28 }}><HIcon name="x" size={13} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: '6px 24px' }}>
            {[
              ['Move between cells', 'Arrow keys'],
              ['Next / previous cell', 'Tab / Shift+Tab'],
              ['Start editing a cell', 'Type, or double-click'],
              ['Confirm edit & move down', 'Enter'],
              ['Cancel editing', 'Esc'],
              ['Clear selected cell(s)', 'Delete'],
              ['Select a range of cells', 'Click + drag'],
              ['Copy cell / range', 'Ctrl + C'],
              ['Paste a block', 'Ctrl + V'],
              ['Undo', 'Ctrl + Z'],
              ['Redo', 'Ctrl + Y  (or Ctrl+Shift+Z)'],
              ['Find', 'Ctrl + F'],
              ['Find & Replace', 'Ctrl + H'],
              ['Fill a value down', 'Drag the cell’s corner'],
              ['Move a row', 'Drag the row number'],
              ['Reorder a column', 'Drag the column header'],
              ['Sort by a column', 'Click the column header'],
              ['All row / column actions', 'Right-click a cell'],
            ].map(([what, keys]) => (
              <div key={what} className="h-row h-between" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline', padding: '3px 0', borderBottom: '1px dashed var(--line-faint)' }}>
                <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{what}</span>
                <span className="h-mono" style={{ fontSize: 11.5, color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>{keys}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
        sortColumns={sortColumns}
        onSortColumnsChange={setSortColumns}
        onColumnsReorder={onColumnsReorder}
        onFill={onFill}
        onScroll={onScroll}
        onSelectedCellChange={onSelectedCellChange}
        onCellContextMenu={onCellContextMenu}
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
        <div className="h-meta" style={{ fontSize: 11, color: 'var(--ink-6)' }}>Drag across cells to select · Ctrl+C / Ctrl+V to copy & paste a block · drag the row number to move a row · drag a column header to reorder · right-click for all actions</div>
      </div>

      {/* right-click context menu */}
      {menu && (
        <>
          <div onClick={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null); }} onWheel={() => setMenu(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 80 }} />
          <div className="h-card" style={{ position: 'fixed', top: Math.min(menu.y, window.innerHeight - 540), left: Math.min(menu.x, window.innerWidth - 200), zIndex: 81, padding: 4, minWidth: 188, boxShadow: '0 10px 30px rgba(0,0,0,.16)' }}>
            {MENU.map((it, i) => it.sep
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
        .rdg-cellwrap { display: flex; align-items: center; height: 100%; width: 100%; user-select: none; }
        .rdg-range { background-color: #d4eede; }
        .rdg-cell-match { background-color: #FFF3C4; }
        .rdg-cell-match-active { background-color: #FFD666; box-shadow: inset 0 0 0 2px #E0A000; }
        .rdg-cell-invalid { background-color: #FDECEA; box-shadow: inset 0 0 0 1px #E3A9A0; }
      `}</style>
    </Shell>
  );
}
