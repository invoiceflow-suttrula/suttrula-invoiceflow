import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Shell from '../components/Shell.jsx';
import HIcon from '../components/HIcon.jsx';
import { supabase } from '../lib/supabase.js';
import { useConfirm } from '../components/DeleteConfirmationModal.jsx';
import useIsMobile from '../hooks/useIsMobile.js';

// Re-usable empty-state hero
export function EmptyHero({ eyebrow, title, sub, primary, primaryRoute, secondary, secondaryRoute, illustration }) {
  const navigate = useNavigate();
  return (
    <div className="h-card" style={{
      padding:'48px 56px',
      display:'flex', gap:36, alignItems:'center',
      background:'var(--paper)',
      border:'1px dashed var(--line-soft)',
      borderRadius:'var(--r-lg)',
      marginBottom:24,
    }}>
      <div style={{flex:1}}>
        <div className="h-eyebrow">{eyebrow}</div>
        <div className="serif" style={{fontSize:44, lineHeight:1.05, letterSpacing:'-0.02em', marginTop:8, maxWidth:560}}>
          {title}
        </div>
        <div className="h-meta" style={{fontSize:15, marginTop:12, maxWidth:520, lineHeight:1.55}}>{sub}</div>
        <div className="h-row" style={{gap:10, marginTop:22, display: 'flex'}}>
          {primary && (
            <button className="h-btn primary lg" onClick={() => navigate(primaryRoute)} style={{marginRight: 10}}>
              {primary} <HIcon name="arrow-r" size={15}/>
            </button>
          )}
          {secondary && (
            <button className="h-btn lg" onClick={() => navigate(secondaryRoute)}>
              {secondary}
            </button>
          )}
        </div>
      </div>
      <div style={{
        width:240, height:240, flex:'0 0 auto',
        display:'flex', alignItems:'center', justifyContent:'center',
        position:'relative',
      }}>
        {illustration}
      </div>
    </div>
  );
}

// Small placeholder card row (3 dashed cards) so the page doesn't feel naked
export function PlaceholderCardRow({ count = 3, label = 'Will appear here once you start' }) {
  return (
    <div style={{display:'grid', gridTemplateColumns:`repeat(${count}, 1fr)`, gap:14}}>
      {Array.from({length: count}).map((_, i) => (
        <div key={i} style={{
          padding:24,
          border:'1.5px dashed var(--line-soft)',
          borderRadius:'var(--r-md)',
          background:'var(--paper)',
          minHeight:160,
          display:'flex', flexDirection:'column', justifyContent:'space-between',
          color:'var(--ink-6)',
        }}>
          <div className="h-mono" style={{fontSize:10, letterSpacing:'0.2em'}}>PSG-00{String(i+1).padStart(2,'0')}</div>
          <div>
            <div style={{height:14, width:'60%', background:'var(--paper-3)', borderRadius:4, marginBottom:6}}/>
            <div style={{height:8, width:'40%', background:'var(--paper-3)', borderRadius:4}}/>
          </div>
          <div className="h-meta" style={{fontSize:11}}>{label}</div>
        </div>
      ))}
    </div>
  );
}

export function HiFiLedger() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const mobile = useIsMobile();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(new Set());
  const [selected, setSelected] = useState(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .order('issued_date', { ascending: false })
        .order('created_at', { ascending: false });
      const list = data || [];
      setRows(list);
      // Expand the most recent date group by default.
      const firstKey = list[0]?.issued_date || (list[0] ? 'no-date' : null);
      if (firstKey) setExpanded(new Set([firstKey]));
      setLoading(false);
    })();
  }, []);

  const openInvoice = async (path) => {
    if (!path) return;
    const { data, error } = await supabase.storage.from('invoices').createSignedUrl(path, 120, { download: true });
    if (error || !data?.signedUrl) { alert('Could not open this file: ' + (error?.message || 'no URL')); return; }
    window.open(data.signedUrl, '_blank', 'noopener');
  };

  const fmtAmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  const lakh = (n) => '₹ ' + (n >= 1e5 ? (n / 1e5).toFixed(1) + 'L' : n.toLocaleString('en-IN'));

  const toKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const todayKey = toKey(new Date());
  const yesterdayKey = toKey(new Date(Date.now() - 864e5));
  const labelFor = (key) => {
    if (key === 'no-date') return 'No date';
    const base = new Date(key + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    if (key === todayKey) return 'Today · ' + base;
    if (key === yesterdayKey) return 'Yesterday · ' + base;
    return base;
  };

  /* Filter, then group by issued_date (newest first). */
  const filtered = rows.filter((r) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return [r.ref_number, r.client_name, r.item_summary, r.email].some((v) => String(v || '').toLowerCase().includes(q));
  });
  const map = new Map();
  for (const r of filtered) {
    const key = r.issued_date || 'no-date';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  const groups = Array.from(map.entries())
    .map(([key, items]) => ({ key, items, count: items.length, total: items.reduce((a, i) => a + Number(i.amount || 0), 0) }))
    .sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));

  const toggleExpand = (key) => setExpanded((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const toggleSelect = (id) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const setGroupSelected = (items, on) => setSelected((prev) => {
    const n = new Set(prev);
    items.forEach((i) => (on ? n.add(i.id) : n.delete(i.id)));
    return n;
  });

  const deleteIds = async (ids) => {
    if (!ids.length) return;
    setBusy(true);
    const targets = rows.filter((r) => ids.includes(r.id));
    const paths = targets.map((r) => r.pdf_storage_path).filter(Boolean);
    if (paths.length) await supabase.storage.from('invoices').remove(paths);
    /* .select() returns the rows actually deleted — if RLS blocks it, this is empty. */
    const { data: deleted, error } = await supabase.from('invoices').delete().in('id', ids).select('id');
    if (error) { setBusy(false); alert('Delete failed: ' + error.message); return; }
    if (!deleted || deleted.length === 0) {
      setBusy(false);
      alert('Nothing was deleted — the database blocked it.\n\nThe invoices DELETE policy still needs to be added in Supabase (see the SQL provided). Until then, invoices reappear on refresh.');
      return;
    }

    /* Reclaim space: if a batch folder now has no PDFs left, drop its batch.zip
       + batch record too (the zip is the bulk of the storage). */
    /* The batch folder is the path without the file name (e.g. <uid>/<batchId>). */
    const folders = [...new Set(targets.map((r) => r.pdf_storage_path?.split('/').slice(0, -1).join('/')).filter(Boolean))];
    for (const folder of folders) {
      const { data: left } = await supabase.storage.from('invoices').list(folder, { limit: 1000 });
      const pdfsLeft = (left || []).some((f) => f.name.endsWith('.pdf'));
      if (!pdfsLeft) {
        await supabase.storage.from('invoices').remove([`${folder}/batch.zip`]);
        await supabase.from('invoice_batches').delete().eq('zip_storage_path', `${folder}/batch.zip`);
      }
    }
    setBusy(false);
    /* Only remove what the DB actually deleted, so the UI can never drift from the DB. */
    const okIds = deleted.map((d) => d.id);
    setRows((prev) => prev.filter((r) => !okIds.includes(r.id)));
    setSelected((prev) => { const n = new Set(prev); okIds.forEach((i) => n.delete(i)); return n; });
    window.dispatchEvent(new Event('storage-changed'));
  };
  const confirmOne = async (r) => {
    const ok = await confirm({
      title: 'Delete invoice', itemName: r.ref_number,
      message: 'This removes the invoice and its PDF permanently. This action cannot be undone.',
    });
    if (ok) deleteIds([r.id]);
  };
  const confirmGroup = async (items) => {
    const ids = items.filter((i) => selected.has(i.id)).map((i) => i.id);
    if (!ids.length) return;
    const ok = await confirm({
      title: `Delete ${ids.length} invoice${ids.length > 1 ? 's' : ''}`,
      message: 'This removes the selected invoices and their PDFs permanently. This action cannot be undone.',
    });
    if (ok) deleteIds(ids);
  };

  const exportCsv = () => {
    if (!rows.length) return;
    const cols = ['ref_number', 'client_name', 'email', 'item_summary', 'amount', 'status', 'issued_date'];
    const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const csv = [cols.join(',')].concat(rows.map((r) => cols.map((c) => esc(r[c])).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'invoices.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const totalAll = rows.reduce((a, r) => a + Number(r.amount || 0), 0);

  return (
    <Shell active="ledger">
      <div className="h-topbar"><div className="crumb">LEDGER · GROUPED BY DATE</div></div>
      <div className="h-row h-between" style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: mobile ? 'wrap' : 'nowrap', gap: 12 }}>
        <div className="h-section-title" style={{ margin: 0 }}>
          <div className="serif" style={{ fontSize: mobile ? 28 : 36, lineHeight: 1.05 }}>Ledger</div>
          <div className="lead">{rows.length} invoices · {lakh(totalAll)} total. Grouped by date — click a day to expand.</div>
        </div>
        <div className="h-row" style={{ gap: 8, display: 'flex' }}>
          <button className="h-btn" onClick={exportCsv} disabled={!rows.length}><HIcon name="upload" size={14} /> Export CSV</button>
          <button className="h-btn primary" onClick={() => navigate('/generate')}><HIcon name="plus" size={14} /> Generate invoices</button>
        </div>
      </div>

      {/* search */}
      <div className="h-row" style={{ gap: 8, marginBottom: 14, flexWrap: 'wrap', display: 'flex', alignItems: 'center' }}>
        <div className="h-chip solid" style={{ marginRight: 6 }}>{groups.length} day{groups.length === 1 ? '' : 's'} · {filtered.length} invoices</div>
        <div style={{ flex: 1 }} />
        <div className="h-input" style={{ width: 260, padding: '6px 14px', fontSize: 13, display: 'flex', alignItems: 'center' }}>
          <div style={{ marginRight: 6 }}><HIcon name="search" size={13} color="var(--ink-5)" /></div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoices, clients, refs" style={{ border: 0, outline: 0, background: 'transparent', width: '100%' }} />
        </div>
      </div>

      {/* grouped list */}
      <div style={{ height: 'calc(100% - 150px)', overflowY: 'auto', paddingBottom: 24 }}>
        {loading ? (
          <div className="h-meta" style={{ padding: 24 }}>Loading…</div>
        ) : groups.length === 0 ? (
          <div className="h-card" style={{ padding: 40, textAlign: 'center', border: '1px dashed var(--line-soft)' }}>
            <div className="serif" style={{ fontSize: 22 }}>{query ? 'No matches.' : 'No invoices yet.'}</div>
            {!query && <div className="h-meta" style={{ marginTop: 8 }}>Generate a batch and it'll appear here grouped by day.</div>}
          </div>
        ) : groups.map((g) => {
          const isOpen = expanded.has(g.key);
          const selIds = g.items.filter((i) => selected.has(i.id)).map((i) => i.id);
          const allSel = g.items.length > 0 && selIds.length === g.items.length;
          return (
            <div key={g.key} className="h-card" style={{ padding: 0, marginBottom: 12, overflow: 'hidden' }}>
              {/* date header */}
              <div onClick={() => toggleExpand(g.key)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer', background: isOpen ? 'var(--paper-3)' : 'var(--paper)' }}>
                <HIcon name={isOpen ? 'chev-d' : 'chev-r'} size={16} />
                <span style={{ fontSize: 16 }}>📅</span>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{labelFor(g.key)}</div>
                <span className="h-status muted">{g.count} invoice{g.count > 1 ? 's' : ''}</span>
                <div style={{ flex: 1 }} />
                <span className="h-mono" style={{ fontSize: 12, color: 'var(--ink-5)' }}>{lakh(g.total)}</span>
              </div>

              {isOpen && (
                <div style={{ borderTop: '1px solid var(--line-faint)' }}>
                  {g.items.map((r) => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', flexWrap: mobile ? 'wrap' : 'nowrap', rowGap: 4, gap: 12, padding: '12px 18px', minHeight: 48, fontSize: 14, fontFamily: 'var(--sans)', borderBottom: '1px solid var(--line-faint)', background: selected.has(r.id) ? 'var(--ink-9)' : 'transparent' }}>
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} style={{ width: 16, height: 16, cursor: 'pointer', flex: '0 0 auto' }} />
                      <span className="h-mono" style={{ fontSize: 11, color: 'var(--ink-5)', width: mobile ? 'auto' : 150, flex: '0 0 auto' }}>{r.ref_number}</span>
                      <div style={{ flex: 1, fontSize: 14, fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.client_name || '—'}</div>
                      <div className="h-meta" style={{ flex: mobile ? '1 1 100%' : 1, fontSize: 13, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', order: mobile ? 3 : 0 }}>{r.item_summary || '—'}</div>
                      <span className="h-mono" style={{ fontSize: 13, width: mobile ? 'auto' : 110, marginLeft: mobile ? 'auto' : 0, textAlign: 'right', flex: '0 0 auto' }}>₹ {fmtAmt(r.amount)}</span>
                      <div className="h-row" style={{ gap: 4, flex: '0 0 auto' }}>
                        <button className="h-iconbtn" onClick={() => navigate(`/preview/ticket?id=${r.id}`)} style={{ width: 28, height: 28 }} title="Preview"><HIcon name="eye" size={12} /></button>
                        <button className="h-iconbtn" onClick={() => openInvoice(r.pdf_storage_path)} style={{ width: 28, height: 28 }} title="Download"><HIcon name="download" size={12} /></button>
                        <button className="h-iconbtn" onClick={() => confirmOne(r)} disabled={busy} style={{ width: 28, height: 28 }} title="Delete"><HIcon name="trash" size={12} /></button>
                      </div>
                    </div>
                  ))}
                  {/* group action bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', background: 'var(--paper-2)' }}>
                    <button className="h-btn ghost sm" onClick={() => setGroupSelected(g.items, !allSel)}>{allSel ? 'Deselect all' : 'Select all'}</button>
                    <div style={{ flex: 1 }} />
                    {selIds.length > 0 && (
                      <button className="h-btn sm" style={{ color: '#a23b2b', borderColor: '#e7c0b9' }} disabled={busy} onClick={() => confirmGroup(g.items)}>
                        <HIcon name="trash" size={12} /> Delete selected ({selIds.length})
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Shell>
  );
}

export function HiFiLedgerEmpty() {
  return (
    <Shell active="ledger">
      <div className="h-topbar"><div className="crumb">LEDGER</div></div>
      <div className="h-row h-between" style={{marginBottom:18}}>
        <div className="h-section-title" style={{margin:0}}>
          <div className="serif" style={{fontSize:36, lineHeight:1.05}}>Ledger</div>
          <div className="lead">Every invoice you issue lands here. Re-download, email, or audit any time.</div>
        </div>
      </div>
      <EmptyHero
        eyebrow="EMPTY · NO INVOICES YET"
        title={<>Nothing to <em style={{color:'var(--ink-5)'}}>show.</em></>}
        sub="Once you issue your first invoice, it'll appear here with its status, value, and full download history."
        primary="Issue your first invoice"  primaryRoute="/single"
        secondary="Generate a batch"        secondaryRoute="/batch"
        illustration={
          <svg width="220" height="180" viewBox="0 0 220 180">
            <rect x="40" y="30" width="140" height="120" rx="10" fill="var(--paper)" stroke="var(--line-faint)"/>
            <rect x="56" y="48" width="50" height="6" rx="2" fill="var(--ink-7)"/>
            <rect x="56" y="62" width="80" height="4" rx="2" fill="var(--paper-4)"/>
            {[80, 92, 104].map(y => (
              <g key={y}>
                <rect x="56" y={y} width="70" height="3" rx="1.5" fill="var(--paper-4)"/>
                <rect x="140" y={y} width="24" height="3" rx="1.5" fill="var(--ink-7)"/>
              </g>
            ))}
            <line x1="56" y1="120" x2="164" y2="120" stroke="var(--paper-4)"/>
            <rect x="120" y="128" width="44" height="10" rx="2" fill="var(--brand-accent, var(--ink-2))" opacity="0.4"/>
          </svg>
        }
      />
    </Shell>
  );
}
