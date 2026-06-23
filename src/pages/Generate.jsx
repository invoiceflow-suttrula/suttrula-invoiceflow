/* Generate — 3-step invoice generation flow, wired to Supabase.
   Step 1  /generate          → pick a data source + a template (from DB)
   Step 2  /generate/mapping   → auto-mapped fields (read-only) + add custom fields
   Step 3  /generate/run       → batch-generate PDFs, then preview + download */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Shell from '../components/Shell.jsx';
import HIcon from '../components/HIcon.jsx';
import Invoice from '../components/Invoice.jsx';
import { supabase } from '../lib/supabase.js';
import { autoMap, FIELD_DEFS, groupRows, buildInvoiceFromGroup, generateBatch, downloadBlob, brandingSample, accentVars } from '../lib/invoicePdf.js';

/* Selections persist across the three routes within a session. */
const genState = {
  source: null,        // data_sources row
  template: null,      // templates row
  customFields: [],    // [{ label, value }]
  hiddenFields: [],    // auto-mapped field keys hidden from the invoice
};

/* Auto-mapped fields the user is allowed to hide (others are structural/required). */
const HIDEABLE = new Set(['email', 'phone', 'city', 'tax']);

const variantOf = (tpl) => parseInt(tpl?.layout_type, 10) || 1;
const fmtINR = (n) => '₹ ' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

// ════════════════════════════════════════════════════════════════════
// STEP 1 · /generate — select data source + template
// ════════════════════════════════════════════════════════════════════
export function HiFiGenSelect() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const urlTpl = params.get('template');
  const [sources, setSources] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [srcId, setSrcId] = useState(genState.source?.id || null);
  const [tplId, setTplId] = useState(urlTpl || genState.template?.id || null);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    (async () => {
      const [{ data: ds }, { data: tp }, { data: co }] = await Promise.all([
        supabase.from('data_sources').select('*').order('uploaded_at', { ascending: false }),
        supabase.from('templates').select('*').order('is_default', { ascending: false }),
        supabase.from('companies').select('*').limit(1).maybeSingle(),
      ]);
      setSources(ds || []);
      setTemplates(tp || []);
      setCompany(co);
      if (!tplId && tp?.length) setTplId(tp.find((t) => t.is_default)?.id || tp[0].id);
      if (!srcId && ds?.length) setSrcId(ds[0].id);
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const brand = brandingSample(company);
  const brandVars = accentVars(company?.accent_color);

  const src = sources.find((s) => s.id === srcId);
  const tpl = templates.find((t) => t.id === tplId);
  const ready = !!(src && tpl);

  const goNext = () => {
    if (!ready) return;
    genState.source = src;
    genState.template = tpl;
    navigate('/generate/mapping');
  };

  return (
    <Shell active="gen">
      <div className="h-topbar"><div className="crumb">GENERATE INVOICE · STEP 1 OF 3 · SELECT</div></div>

      <div className="h-row h-between" style={{ marginBottom: 22, alignItems: 'flex-start', display: 'flex', justifyContent: 'space-between' }}>
        <div className="h-section-title" style={{ margin: 0, maxWidth: 680 }}>
          <div className="serif" style={{ fontSize: 38, lineHeight: 1.05 }}>Pick a data source and a template.</div>
          <div className="lead">Choose one of each. We'll auto-map the columns to the invoice fields on the next step.</div>
        </div>
        <button
          className={'h-btn lg ' + (ready ? 'primary' : '')}
          disabled={!ready}
          style={!ready ? { opacity: 0.35, cursor: 'not-allowed' } : null}
          onClick={goNext}
        >
          Next · map fields <HIcon name="arrow-r" size={15} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, height: 'calc(100% - 170px)' }}>
        {/* Data sources */}
        <div className="h-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-faint)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="h-eyebrow">01 · DATA SOURCE</div>
              <div style={{ fontSize: 16, marginTop: 4, color: 'var(--ink-2)' }}>Whose details go on the invoice?</div>
            </div>
            <button className="h-btn ghost sm" onClick={() => navigate('/data-sources/upload')}>
              <HIcon name="upload" size={13} /> Upload new
            </button>
          </div>

          <div className="no-scrollbar" style={{ flex: 1, overflow: 'auto', padding: '12px 14px' }}>
            {loading ? (
              <div className="h-meta" style={{ padding: 20 }}>Loading…</div>
            ) : sources.length === 0 ? (
              <div className="h-meta" style={{ padding: 20 }}>
                No data sources yet. <a onClick={() => navigate('/data-sources/upload')} style={{ color: 'var(--ink-2)', textDecoration: 'underline', cursor: 'pointer' }}>Upload a spreadsheet</a> first.
              </div>
            ) : (
              <div className="h-col" style={{ gap: 10 }}>
                {sources.map((s) => {
                  const on = srcId === s.id;
                  const cols = s.detected_columns || [];
                  return (
                    <div key={s.id} onClick={() => setSrcId(s.id)}
                      style={{
                        padding: '14px 16px', borderRadius: 'var(--r-md)',
                        border: on ? '1.5px solid var(--ink-2)' : '1.5px solid var(--line-faint)',
                        background: on ? 'var(--ink-9)' : 'var(--paper)',
                        cursor: 'pointer', transition: 'all .15s ease',
                      }}>
                      <div className="h-row h-between" style={{ gap: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="h-row" style={{ gap: 12, flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
                          <div style={{
                            width: 38, height: 38, borderRadius: 8, flex: '0 0 auto',
                            background: on ? 'var(--ink-2)' : 'var(--paper-3)',
                            color: on ? 'var(--paper)' : 'var(--ink-3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.12em', marginRight: 10,
                          }}>{String(s.file_type || 'XLSX').toUpperCase()}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.2, color: 'var(--ink-2)' }}>{s.file_name}</div>
                            <div className="h-meta" style={{ fontSize: 12, marginTop: 2 }}>
                              {s.row_count} rows · {s.column_count} columns
                            </div>
                          </div>
                        </div>
                        <div className={'h-check ' + (on ? 'on' : '')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {on && <HIcon name="check" size={11} color="var(--paper)" />}
                        </div>
                      </div>

                      {on && cols.length > 0 && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line-faint)', display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                          <div className="h-eyebrow" style={{ width: '100%', marginBottom: 4 }}>COLUMNS DETECTED</div>
                          {cols.map((c) => (
                            <div key={c} className="h-chip green" style={{ padding: '4px 10px', fontSize: 11, marginRight: 4, marginBottom: 4 }}>{c}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Templates */}
        <div className="h-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-faint)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div className="h-eyebrow">02 · INVOICE TEMPLATE</div>
              <div style={{ fontSize: 16, marginTop: 4, color: 'var(--ink-2)' }}>Which layout should we use?</div>
            </div>
            <button className="h-btn ghost sm" onClick={() => navigate('/templates')}>
              <HIcon name="layers" size={13} /> Manage
            </button>
          </div>
          <div className="no-scrollbar" style={{ flex: 1, overflow: 'auto', padding: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {templates.map((t) => {
                const on = tplId === t.id;
                return (
                  <div key={t.id} onClick={() => setTplId(t.id)}
                    style={{
                      padding: '12px', borderRadius: 'var(--r-md)',
                      border: on ? '1.5px solid var(--ink-2)' : '1.5px solid var(--line-faint)',
                      background: on ? 'var(--ink-9)' : 'var(--paper)',
                      cursor: 'pointer', transition: 'all .15s ease',
                      display: 'flex', flexDirection: 'column', gap: 8,
                    }}>
                    <div style={{ ...brandVars, background: 'var(--paper-3)', borderRadius: 'var(--r-sm)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6, minHeight: 180 }}>
                      <div style={{ transform: 'scale(0.40)', transformOrigin: 'center', pointerEvents: 'none', filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.12))' }}>
                        <Invoice variant={variantOf(t)} sample={brand} />
                      </div>
                    </div>
                    <div className="h-row h-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>{t.name}</div>
                        <div className="h-meta" style={{ fontSize: 11, marginTop: 1 }}>{t.is_default ? 'default' : 'preset'}</div>
                      </div>
                      <div className={'h-check ' + (on ? 'on' : '')} style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {on && <HIcon name="check" size={10} color="var(--paper)" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ════════════════════════════════════════════════════════════════════
// STEP 2 · /generate/mapping — auto-map (read-only) + add custom fields
// ════════════════════════════════════════════════════════════════════
export function HiFiGenMapping() {
  const navigate = useNavigate();
  const src = genState.source;
  const tpl = genState.template;
  const [custom, setCustom] = useState(genState.customFields);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [hidden, setHidden] = useState(() => new Set(genState.hiddenFields || []));
  const labelRef = useRef(null);

  const toggleHidden = (key) => setHidden((prev) => {
    const n = new Set(prev);
    n.has(key) ? n.delete(key) : n.add(key);
    genState.hiddenFields = [...n];
    return n;
  });

  useEffect(() => {
    if (!src || !tpl) navigate('/generate', { replace: true });
  }, [src, tpl, navigate]);
  useEffect(() => { if (adding) labelRef.current?.focus(); }, [adding]);
  if (!src || !tpl) return null;

  const columns = src.detected_columns || [];
  const mapping = autoMap(columns);
  const unmappedCols = columns.filter((c) => !Object.values(mapping).includes(c));

  const startAdding = () => { setNewLabel(''); setNewValue(''); setAdding(true); };
  const cancelAdding = () => { setAdding(false); setNewLabel(''); setNewValue(''); };
  const confirmAdd = () => {
    const label = newLabel.trim();
    if (!label) { labelRef.current?.focus(); return; }
    if (custom.some((c) => c.label.toLowerCase() === label.toLowerCase())) { cancelAdding(); return; }
    const next = [...custom, { label, value: newValue.trim() }];
    setCustom(next);
    genState.customFields = next;
    cancelAdding();
  };
  const removeCustom = (i) => {
    const next = custom.filter((_, idx) => idx !== i);
    setCustom(next);
    genState.customFields = next;
  };

  return (
    <Shell active="gen">
      <div className="h-topbar"><div className="crumb">GENERATE INVOICE · STEP 2 OF 3 · MAP FIELDS</div></div>

      <div className="h-row h-between" style={{ marginBottom: 14, alignItems: 'flex-start', display: 'flex', justifyContent: 'space-between' }}>
        <div className="h-section-title" style={{ margin: 0, maxWidth: 760 }}>
          <div className="serif" style={{ fontSize: 32, lineHeight: 1.05 }}>Fields are auto-mapped.</div>
          <div className="lead">
            We matched your columns to the invoice fields automatically. These are locked — you can only add extra fields below.
            <span className="h-mono" style={{ marginLeft: 8, color: 'var(--ink)' }}>{src.file_name}</span>
            <span style={{ margin: '0 6px', color: 'var(--ink-7)' }}>→</span>
            <span className="h-mono" style={{ color: 'var(--ink)' }}>{tpl.name}</span>
          </div>
        </div>
        <div className="h-row" style={{ gap: 8, display: 'flex' }}>
          <button className="h-btn ghost" onClick={() => navigate('/generate')} style={{ marginRight: 8 }}>
            <HIcon name="chev-l" size={14} /> Back
          </button>
          <button className="h-btn primary lg" onClick={() => { genState.customFields = custom; navigate('/generate/run'); }}>
            Next · generate <HIcon name="arrow-r" size={15} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, height: 'calc(100% - 160px)' }}>
        {/* Auto-matched (read-only) */}
        <div className="h-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line-faint)' }}>
            <div className="h-eyebrow">AUTO-MATCHED FIELDS</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>Detected automatically · use the eye toggle to hide a field from the invoice</div>
          </div>
          <div className="no-scrollbar" style={{ flex: 1, overflow: 'auto', padding: '14px 18px' }}>
            <div className="h-col" style={{ gap: 8 }}>
              {FIELD_DEFS.map((f) => {
                const col = mapping[f.key];
                const canHide = col && HIDEABLE.has(f.key);
                const isHidden = hidden.has(f.key);
                return (
                  <div key={f.key} className="h-row h-between" style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', borderRadius: 'var(--r-md)',
                    background: col ? 'var(--ink-9)' : 'var(--paper)',
                    border: '1px solid var(--line-faint)', opacity: col ? (isHidden ? 0.5 : 1) : 0.6,
                  }}>
                    <div className="h-row" style={{ gap: 10, display: 'flex', alignItems: 'center' }}>
                      <HIcon name={col ? 'check' : 'x'} size={14} color={col ? 'var(--brand-accent)' : 'var(--ink-6)'} />
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)', textDecoration: isHidden ? 'line-through' : 'none' }}>{f.label}</span>
                    </div>
                    <div className="h-row" style={{ gap: 10, display: 'flex', alignItems: 'center' }}>
                      <span className="h-mono" style={{ fontSize: 12, color: col ? 'var(--ink-2)' : 'var(--ink-6)' }}>
                        {col ? (isHidden ? 'hidden' : '← ' + col) : 'not found'}
                      </span>
                      {canHide ? (
                        <button className="h-iconbtn" style={{ width: 26, height: 26 }} title={isHidden ? 'Show on invoice' : 'Hide from invoice'} onClick={() => toggleHidden(f.key)}>
                          <HIcon name={isHidden ? 'eye-off' : 'eye'} size={13} />
                        </button>
                      ) : col ? (
                        <span className="h-mono" style={{ fontSize: 9, letterSpacing: '0.14em', color: 'var(--ink-6)' }}>REQUIRED</span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
            {unmappedCols.length > 0 && (
              <div className="h-meta" style={{ fontSize: 12, marginTop: 14, lineHeight: 1.5 }}>
                Unused columns: {unmappedCols.join(', ')}
              </div>
            )}
          </div>
        </div>

        {/* Custom fields */}
        <div className="h-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line-faint)' }}>
            <div className="h-eyebrow">CUSTOM FIELDS · ADD ONLY</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>Extra details that appear on every invoice</div>
          </div>
          <div className="no-scrollbar" style={{ flex: 1, overflow: 'auto', padding: '14px 18px' }}>
            {custom.length === 0 ? (
              <div className="h-meta" style={{ fontSize: 13, lineHeight: 1.55 }}>
                No custom fields yet. Add fields that aren't in your spreadsheet — e.g. a booking reference, tour date, or fixed terms.
              </div>
            ) : (
              <div className="h-col" style={{ gap: 8 }}>
                {custom.map((c, i) => (
                  <div key={i} className="h-row h-between" style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', borderRadius: 'var(--r-md)',
                    border: '1.5px dashed var(--ink-4)', background: 'var(--paper)',
                  }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)' }}>{c.label}</div>
                      <div className="h-meta" style={{ fontSize: 12 }}>{c.value || 'empty — fill later'}</div>
                    </div>
                    <button className="h-iconbtn" style={{ width: 28, height: 28 }} title="Remove" onClick={() => removeCustom(i)}>
                      <HIcon name="x" size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ padding: '10px 18px 16px', borderTop: '1px solid var(--line-faint)' }}>
            {adding ? (
              <div className="h-col" style={{ gap: 8 }}>
                <div className="h-row" style={{ gap: 8, display: 'flex' }}>
                  <div className="h-input" style={{ flex: 1 }}>
                    <input
                      ref={labelRef}
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') confirmAdd(); if (e.key === 'Escape') cancelAdding(); }}
                      placeholder="Field name (e.g. Booking Reference)"
                    />
                  </div>
                  <div className="h-input" style={{ flex: 1 }}>
                    <input
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') confirmAdd(); if (e.key === 'Escape') cancelAdding(); }}
                      placeholder="Value (optional)"
                    />
                  </div>
                </div>
                <div className="h-row" style={{ gap: 8, display: 'flex' }}>
                  <button onClick={confirmAdd} className="h-btn primary sm" style={{ flex: 1, justifyContent: 'center' }}>
                    <HIcon name="check" size={13} /> Add
                  </button>
                  <button onClick={cancelAdding} className="h-btn ghost sm" style={{ flex: 1, justifyContent: 'center' }}>
                    <HIcon name="x" size={13} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={startAdding} className="h-btn ghost" style={{ width: '100%', justifyContent: 'center', borderStyle: 'dashed' }}>
                <HIcon name="plus" size={14} /> Add custom field
              </button>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

// ════════════════════════════════════════════════════════════════════
// STEP 3 · /generate/run — generate batch, then preview + download
// ════════════════════════════════════════════════════════════════════
export function HiFiGenRun() {
  const navigate = useNavigate();
  const src = genState.source;
  const tpl = genState.template;

  const [phase, setPhase] = useState('ready'); // ready | running | done | error
  const [rowDatas, setRowDatas] = useState(null);
  const [plannedCount, setPlannedCount] = useState(src?.row_count || 0);
  const [progress, setProgress] = useState({ done: 0, total: src?.row_count || 0 });
  const [result, setResult] = useState(null);
  const [pageIdx, setPageIdx] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [company, setCompany] = useState(null);
  const [selected, setSelected] = useState(null); // Set of selected customer-group indices
  const [zoom, setZoom] = useState(0.8);
  const previewRef = useRef(null);
  const clampZoom = (z) => Math.min(2, Math.max(0.5, Math.round(z * 100) / 100));

  useEffect(() => {
    if (!src || !tpl) navigate('/generate', { replace: true });
  }, [src, tpl, navigate]);
  /* Mouse-wheel zoom over the preview (native listener so we can preventDefault). */
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const onWheel = (e) => { e.preventDefault(); setZoom((z) => clampZoom(z - e.deltaY * 0.0015)); };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [phase]);
  useEffect(() => {
    if (!src) return;
    (async () => {
      const [{ data }, { data: co }] = await Promise.all([
        supabase.from('data_rows').select('row_data').eq('data_source_id', src.id).order('row_index', { ascending: true }),
        supabase.from('companies').select('*').limit(1).maybeSingle(),
      ]);
      const rds = (data || []).map((r) => r.row_data);
      setRowDatas(rds);
      setCompany(co);
      const count = groupRows(rds, autoMap(src.detected_columns || [])).length;
      setPlannedCount(count);
      setSelected(new Set(Array.from({ length: count }, (_, i) => i))); // all selected by default
    })();
  }, [src]);
  /* Build a fresh object URL for the currently-viewed invoice; revoke the old one. */
  useEffect(() => {
    const blob = result?.pdfs?.[pageIdx]?.blob;
    if (!blob) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [result, pageIdx]);
  if (!src || !tpl) return null;

  /* Include custom fields + hidden-field flags so the preview matches the output. */
  const hiddenSet = new Set(genState.hiddenFields || []);
  const brand = {
    ...brandingSample(company),
    extras: (genState.customFields || []).filter((f) => f.label),
    hide: { email: hiddenSet.has('email'), phone: hiddenSet.has('phone'), city: hiddenSet.has('city'), tax: hiddenSet.has('tax') },
  };
  const brandVars = accentVars(company?.accent_color);

  /* Customers = grouped rows; the user picks which to generate. */
  const mapping = autoMap(src.detected_columns || []);
  const groups = rowDatas ? groupRows(rowDatas, mapping) : [];
  const custName = (g) => String((mapping.name ? g[0][mapping.name] : g[0][Object.keys(g[0])[0]]) || 'Customer');
  const custEmail = (g) => String((mapping.email ? g[0][mapping.email] : '') || '');
  const selectedCount = selected ? selected.size : 0;

  const toggleRow = (i) => setSelected((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const selectAll = () => setSelected(new Set(groups.map((_, i) => i)));
  const deselectAll = () => setSelected(new Set());

  /* Build the preview from the FIRST selected customer's real rows (not demo data). */
  const previewDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const previewIdx = groups.findIndex((_, i) => selected?.has(i));
  const previewGroup = groups[previewIdx >= 0 ? previewIdx : 0];
  const previewSample = previewGroup
    ? buildInvoiceFromGroup(previewGroup, mapping, {
        company, refNumber: 'INV-0001', dateStr: previewDate,
        customFields: genState.customFields, hidden: genState.hiddenFields,
      }).sample
    : brand;

  const run = async () => {
    setPhase('running');
    setError('');
    setProgress({ done: 0, total: selectedCount });
    try {
      const { data: company } = await supabase.from('companies').select('*').limit(1).maybeSingle();
      const selectedRows = groups.filter((_, i) => selected?.has(i)).flat();
      const res = await generateBatch(
        { source: src, template: tpl, mapping, customFields: genState.customFields, hidden: genState.hiddenFields, company, rows: selectedRows },
        (done, total) => setProgress({ done, total })
      );
      setResult(res);
      setPageIdx(0);
      setPhase('done');
    } catch (e) {
      console.error('Generation failed:', e);
      setError(e.message || 'Generation failed.');
      setPhase('error');
    }
  };

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Shell active="gen">
      <div className="h-topbar"><div className="crumb">GENERATE INVOICE · STEP 3 OF 3 · {phase === 'done' ? 'DONE' : 'GENERATE'}</div></div>

      <div className="h-row h-between" style={{ marginBottom: 18, alignItems: 'flex-start', display: 'flex', justifyContent: 'space-between' }}>
        <div className="h-section-title" style={{ margin: 0, maxWidth: 720 }}>
          <div className="serif" style={{ fontSize: 32, lineHeight: 1.05 }}>
            {phase === 'done' ? 'Invoices generated.' : 'Generate the batch.'}
          </div>
          <div className="lead">
            {phase === 'done'
              ? 'Preview the first invoice, then download everything as a ZIP or grab a single PDF.'
              : <>One invoice per row in <span className="h-mono" style={{ color: 'var(--ink)' }}>{src.file_name}</span> using <span className="h-mono" style={{ color: 'var(--ink)' }}>{tpl.name}</span>.</>}
          </div>
        </div>
        {phase === 'ready' && (
          <div className="h-row" style={{ gap: 8, display: 'flex' }}>
            <button className="h-btn ghost" onClick={() => navigate('/generate/mapping')} style={{ marginRight: 8 }}>
              <HIcon name="chev-l" size={14} /> Back
            </button>
            <button className="h-btn primary lg" onClick={run} disabled={rowDatas === null || selectedCount === 0}>
              <HIcon name="ticket" size={15} /> Generate {selectedCount} invoice{selectedCount === 1 ? '' : 's'}
            </button>
          </div>
        )}
      </div>

      {/* READY — customer selection + zoomable preview */}
      {phase === 'ready' && (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 18, height: 'calc(100% - 150px)' }}>
          {/* customer selection */}
          <div className="h-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line-faint)' }}>
              <div className="h-eyebrow">SELECT CUSTOMERS</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>{selectedCount} of {groups.length} selected</div>
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--line-faint)' }}>
              <button className="h-btn ghost sm" style={{ flex: 1, justifyContent: 'center' }} onClick={selectAll}><HIcon name="check" size={13} /> Select all</button>
              <button className="h-btn ghost sm" style={{ flex: 1, justifyContent: 'center' }} onClick={deselectAll}><HIcon name="x" size={13} /> Deselect all</button>
            </div>
            <div className="no-scrollbar" style={{ flex: 1, overflow: 'auto', padding: '10px 12px' }}>
              {rowDatas === null ? (
                <div className="h-meta" style={{ padding: 16 }}>Loading…</div>
              ) : (
                <div className="h-col" style={{ gap: 6 }}>
                  {groups.map((g, i) => {
                    const on = selected?.has(i);
                    return (
                      <label key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 'var(--r-md)', cursor: 'pointer',
                        border: '1px solid var(--line-faint)', background: on ? 'var(--ink-9)' : 'var(--paper)',
                      }}>
                        <input type="checkbox" checked={!!on} onChange={() => toggleRow(i)} style={{ width: 16, height: 16, flex: '0 0 auto', cursor: 'pointer' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{custName(g)}</div>
                          {custEmail(g) && <div className="h-meta" style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{custEmail(g)}</div>}
                        </div>
                        {g.length > 1 && <span className="h-mono" style={{ fontSize: 9, color: 'var(--ink-5)' }}>{g.length} items</span>}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* zoomable preview */}
          <div className="h-card" style={{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--line-faint)', background: 'var(--paper)' }}>
              <div className="h-eyebrow" style={{ flex: 1 }}>PREVIEW</div>
              <button className="h-iconbtn" style={{ width: 28, height: 28 }} title="Zoom out" onClick={() => setZoom((z) => clampZoom(z - 0.1))}><HIcon name="minus" size={14} /></button>
              <input type="range" min="50" max="200" step="5" value={Math.round(zoom * 100)} onChange={(e) => setZoom(clampZoom(e.target.value / 100))} style={{ width: 110 }} />
              <button className="h-iconbtn" style={{ width: 28, height: 28 }} title="Zoom in" onClick={() => setZoom((z) => clampZoom(z + 0.1))}><HIcon name="plus" size={14} /></button>
              <span className="h-mono" style={{ fontSize: 12, width: 46, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
              <button className="h-btn ghost sm" onClick={() => setZoom(0.8)}>Reset</button>
            </div>
            <div ref={previewRef} style={{ flex: 1, overflow: 'auto', background: 'var(--paper-3)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24 }}>
              <div style={{ width: 440 * zoom, height: 622 * zoom, flex: '0 0 auto', position: 'relative' }}>
                <div style={{ ...brandVars, position: 'absolute', top: 0, left: 0, transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
                  <Invoice variant={variantOf(tpl)} sample={previewSample} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RUNNING */}
      {phase === 'running' && (
        <div className="h-card" style={{ padding: '56px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
          <div style={{ width: 44, height: 44, border: '3px solid var(--line-faint)', borderTopColor: 'var(--ink-2)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
          <div className="serif" style={{ fontSize: 26 }}>Generating {progress.done} / {progress.total} invoices…</div>
          <div style={{ width: '100%', maxWidth: 520, height: 10, background: 'var(--paper-3)', borderRadius: 'var(--r-pill)', overflow: 'hidden' }}>
            <div style={{ width: pct + '%', height: '100%', background: 'var(--brand-accent)', transition: 'width .2s ease' }} />
          </div>
          <div className="h-mono" style={{ fontSize: 12, color: 'var(--ink-5)' }}>{pct}% · rendering PDFs and uploading to storage</div>
        </div>
      )}

      {/* ERROR */}
      {phase === 'error' && (
        <div className="h-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
          <div style={{ color: '#a23b2b', display: 'flex', alignItems: 'center', gap: 8 }}><HIcon name="x" size={18} /> {error}</div>
          <div className="h-meta" style={{ maxWidth: 480 }}>
            If this mentions storage permissions, the <span className="h-mono">invoices</span> bucket needs its upload policy (see setup notes).
          </div>
          <div className="h-row" style={{ gap: 8, display: 'flex' }}>
            <button className="h-btn" onClick={() => setPhase('ready')}>Try again</button>
            <button className="h-btn ghost" onClick={() => navigate('/generate/mapping')}>Back</button>
          </div>
        </div>
      )}

      {/* DONE — preview + downloads */}
      {phase === 'done' && result && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18, height: 'calc(100% - 150px)' }}>
          <div className="h-card" style={{ padding: 0, overflow: 'hidden', background: 'var(--paper-3)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--line-faint)', background: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="h-eyebrow" style={{ flex: 1 }}>
                PREVIEW · {result.pdfs?.[pageIdx]?.ref || 'INVOICE'}
              </div>
              <button className="h-iconbtn" style={{ width: 28, height: 28 }} title="Previous invoice"
                disabled={pageIdx === 0} onClick={() => setPageIdx((i) => Math.max(0, i - 1))}>
                <HIcon name="chev-l" size={14} />
              </button>
              <span className="h-mono" style={{ fontSize: 12, minWidth: 90, textAlign: 'center' }}>
                {(result.pdfs?.length ? pageIdx + 1 : 0)} of {result.pdfs?.length || 0}
              </span>
              <button className="h-iconbtn" style={{ width: 28, height: 28 }} title="Next invoice"
                disabled={pageIdx >= (result.pdfs?.length || 1) - 1} onClick={() => setPageIdx((i) => Math.min((result.pdfs?.length || 1) - 1, i + 1))}>
                <HIcon name="chev-r" size={14} />
              </button>
            </div>
            {previewUrl
              ? <iframe key={pageIdx} title="invoice-preview" src={previewUrl} style={{ flex: 1, width: '100%', border: 0 }} />
              : <div className="h-meta" style={{ padding: 20 }}>No preview available.</div>}
          </div>

          <div className="h-col" style={{ gap: 14 }}>
            <div className="h-card dark" style={{ padding: '18px 20px' }}>
              <div className="h-eyebrow" style={{ color: 'rgba(255,255,255,0.55)' }}>SUMMARY</div>
              <div className="serif" style={{ fontSize: 30, lineHeight: 1.05, marginTop: 8 }}>{result.count} invoices</div>
              <div className="h-meta" style={{ color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
                generated · total amount {fmtINR(result.total)}
              </div>
            </div>

            <div className="h-card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="h-btn primary lg" style={{ justifyContent: 'center' }}
                onClick={() => downloadBlob(result.zipBlob, `invoices-${result.batchId.slice(0, 8)}.zip`)}>
                <HIcon name="download" size={15} /> Download all (ZIP)
              </button>
              <button className="h-btn lg" style={{ justifyContent: 'center' }}
                onClick={() => { const p = result.pdfs?.[pageIdx]; if (p) downloadBlob(p.blob, `${p.ref}.pdf`); }}>
                <HIcon name="download" size={15} /> Download this PDF
              </button>
              <button className="h-btn ghost lg" style={{ justifyContent: 'center' }} onClick={() => navigate('/ledger')}>
                <HIcon name="file" size={15} /> View in Ledger
              </button>
            </div>

            <div className="h-card" style={{ padding: '14px 18px' }}>
              <div className="h-eyebrow">DETAILS</div>
              <div className="h-meta" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.6 }}>
                Source · {src.file_name}<br />
                Template · {tpl.name}<br />
                Issued · {result.dateStr}
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
