/* Settings — company brand + colour, wired to the `companies` table. */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Shell from '../components/Shell.jsx';
import HIcon from '../components/HIcon.jsx';
import Invoice from '../components/Invoice.jsx';
import { supabase } from '../lib/supabase.js';
import useIsMobile from '../hooks/useIsMobile.js';

const COLOR_PRESETS = [
  { name: 'Forest', accent: '#2D5C4F', dark: '#102C26', tint: '#E6EEEA' },
  { name: 'Sky', accent: '#2E9FDB', dark: '#1C6EA0', tint: '#E4F3FC' },
  { name: 'Burgundy', accent: '#A0344E', dark: '#5B1C2A', tint: '#F4E6E9' },
  { name: 'Mustard', accent: '#C8902B', dark: '#7A5817', tint: '#FAF1D9' },
  { name: 'Navy', accent: '#1E3A5F', dark: '#0E1B33', tint: '#E0E7EE' },
  { name: 'Terracotta', accent: '#C26A4E', dark: '#7A3B26', tint: '#F8E6DC' },
  { name: 'Charcoal', accent: '#3A3A3A', dark: '#1A1A1A', tint: '#E9E9E9' },
  { name: 'Plum', accent: '#5B3A6E', dark: '#2F1C42', tint: '#EBE3F0' },
];

const fromCompany = (d) => ({
  name: d?.name || '', gstin: d?.gstin || '', address: d?.address || '',
  email: d?.email || '', phone: d?.phone || '', mobile: d?.mobile || '',
  account_holder: d?.account_holder || '', account_number: d?.account_number || '',
  bank_name: d?.bank_name || '', ifsc_code: d?.ifsc_code || '', upi_id: d?.upi_id || '',
  logo_url: d?.logo_url || '',
  accent_color: d?.accent_color || '#2D5C4F',
});
const EMPTY = fromCompany(null);

export default function Settings() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const templateId = params.get('template');
  const mobile = useIsMobile();
  const [company, setCompany] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: co }, { data: tpls }] = await Promise.all([
        supabase.from('companies').select('*').limit(1).maybeSingle(),
        supabase.from('templates').select('*').order('is_default', { ascending: false }),
      ]);
      if (co) { setCompany(co); setForm(fromCompany(co)); }
      setTemplates(tpls || []);
      setLoading(false);
    })();
  }, []);

  /* Which template to preview — the one passed from the Templates page, else the default. */
  const selectedTpl = templates.find((t) => t.id === templateId) || templates.find((t) => t.is_default) || templates[0];
  const previewVariant = parseInt(selectedTpl?.layout_type, 10) || 2;

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setSaved(false); };

  const fileInputRef = useRef(null);
  const handleLogo = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please choose an image file.'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        /* Downscale to max 480px wide — small enough to store, sharp enough for hi-DPI PDFs. */
        const scale = Math.min(1, 480 / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        set('logo_url', canvas.toDataURL('image/png'));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData?.user?.id;
    const payload = { ...form, user_id: uid, updated_at: new Date().toISOString() };
    const res = company
      ? await supabase.from('companies').update(payload).eq('id', company.id).select().maybeSingle()
      : await supabase.from('companies').upsert(payload, { onConflict: 'user_id' }).select().maybeSingle();
    setSaving(false);
    if (res.error) { alert('Save failed: ' + res.error.message); return; }
    if (res.data) setCompany(res.data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const discard = () => { setForm(company ? fromCompany(company) : EMPTY); setSaved(false); };

  const presetMatch = COLOR_PRESETS.find((p) => p.accent.toLowerCase() === (form.accent_color || '').toLowerCase());
  const theme = presetMatch || { name: 'Custom', accent: form.accent_color, dark: form.accent_color, tint: '#EEF2F0' };
  const previewVars = {
    '--brand-accent': theme.accent,
    '--brand-accent-dark': theme.dark,
    '--brand-accent-tint': theme.tint,
    '--brand-accent-on': '#ffffff',
  };
  const previewSample = {
    company: form.name || 'My Company',
    addr: form.address || '—',
    email: form.email || '—',
    phone: form.phone || '',
    mobile: form.mobile || '',
    logo: form.logo_url || '',
    bank: {
      holder: form.account_holder,
      account: form.account_number,
      bank: form.bank_name,
      ifsc: form.ifsc_code,
      upi: form.upi_id,
    },
  };

  if (loading) {
    return (
      <Shell active="sett">
        <div className="h-topbar"><div className="crumb">SETTINGS · BRAND &amp; COLOUR</div></div>
        <div className="h-meta" style={{ padding: 24 }}>Loading…</div>
      </Shell>
    );
  }

  return (
    <Shell active="sett">
      <div className="h-topbar"><div className="crumb">SETTINGS · BRAND &amp; COLOUR</div></div>

      <div className="h-row h-between" style={{ marginBottom: 24 }}>
        <div className="h-section-title" style={{ margin: 0 }}>
          <div className="serif" style={{ fontSize: 36, lineHeight: 1.05 }}>Your brand</div>
          <div className="lead">Company details and one accent colour drive every invoice. Changes apply to the next generated batch.</div>
        </div>
        <div className="h-row" style={{ gap: 8 }}>
          {saved && <span className="h-status ok" style={{ alignSelf: 'center' }}><HIcon name="check" size={12} /> saved</span>}
          <button className="h-btn ghost" onClick={discard} disabled={saving}>Discard</button>
          <button className="h-btn primary" onClick={save} disabled={saving}>
            <HIcon name="check" size={14} /> {saving ? 'Saving…' : 'Save brand'}
          </button>
        </div>
      </div>

      {/* Natural-flow grid (page scrolls) + bottom gap so the last card breathes. */}
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 460px', gap: 24, alignItems: 'start', paddingBottom: 32, paddingRight: mobile ? 16 : 0 }}>
        <div className="h-col" style={{ gap: 16 }}>
          {/* Company identity */}
          <div className="h-card" style={{ padding: 20 }}>
            <div className="h-eyebrow" style={{ marginBottom: 14 }}>COMPANY</div>
            <div className="h-row" style={{ gap: 14, alignItems: mobile ? 'stretch' : 'flex-start', flexDirection: mobile ? 'column' : 'row' }}>
              <div style={{ position: 'relative', flex: '0 0 auto' }}>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogo} style={{ display: 'none' }} />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  title={form.logo_url ? 'Replace logo' : 'Upload logo'}
                  style={{
                    width: 72, height: 72, borderRadius: 'var(--r-md)',
                    background: form.logo_url ? 'var(--paper)' : 'var(--ink-9)',
                    border: '1.5px dashed var(--line-soft)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--ink-5)', cursor: 'pointer', overflow: 'hidden',
                  }}>
                  {form.logo_url ? (
                    <img src={form.logo_url} alt="logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ textAlign: 'center', fontSize: 11 }}>
                      <HIcon name="upload" size={18} />
                      <div style={{ marginTop: 2 }}>logo</div>
                    </div>
                  )}
                </div>
                {form.logo_url && (
                  <button onClick={() => set('logo_url', '')} title="Remove logo"
                    style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', background: 'var(--ink-2)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <HIcon name="x" size={11} />
                  </button>
                )}
              </div>
              <div style={{ flex: 1 }} className="h-col">
                <div className="h-row" style={{ gap: 12, flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'stretch' : 'center' }}>
                  <div className="h-field" style={{ flex: 1 }}>
                    <label>Company name</label>
                    <div className="h-input"><input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Enter your company name" /></div>
                  </div>
                  <div className="h-field" style={{ width: 180 }}>
                    <label>GSTIN</label>
                    <div className="h-input"><input value={form.gstin} onChange={(e) => set('gstin', e.target.value)} placeholder="Enter GSTIN" /></div>
                  </div>
                </div>
                <div className="h-row" style={{ gap: 12, flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'stretch' : 'center' }}>
                  <div className="h-field" style={{ flex: 1 }}>
                    <label>Address</label>
                    <div className="h-input"><input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Enter street, city, PIN" /></div>
                  </div>
                </div>
                <div className="h-row" style={{ gap: 12, flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'stretch' : 'center' }}>
                  <div className="h-field" style={{ flex: 1 }}>
                    <label>Mobile number</label>
                    <div className="h-input"><input value={form.mobile} onChange={(e) => set('mobile', e.target.value)} placeholder="+91 XXXXX XXXXX" /></div>
                  </div>
                </div>
                <div className="h-row" style={{ gap: 12, flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'stretch' : 'center' }}>
                  <div className="h-field" style={{ flex: 1 }}>
                    <label>Invoice email</label>
                    <div className="h-input"><input value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="invoice@company.com" /></div>
                  </div>
                  <div className="h-field" style={{ flex: 1 }}>
                    <label>Phone</label>
                    <div className="h-input"><input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bank details — shown at the bottom-left of every invoice */}
          <div className="h-card" style={{ padding: 20 }}>
            <div className="h-eyebrow" style={{ marginBottom: 4 }}>BANK DETAILS</div>
            <div className="h-meta" style={{ marginBottom: 14, fontSize: 13 }}>Appears at the bottom-left of every invoice. Leave blank to hide.</div>
            <div className="h-col" style={{ gap: 12 }}>
              <div className="h-row" style={{ gap: 12, flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'stretch' : 'center' }}>
                <div className="h-field" style={{ flex: 1 }}>
                  <label>Account holder name</label>
                  <div className="h-input"><input value={form.account_holder} onChange={(e) => set('account_holder', e.target.value)} placeholder="Enter account holder name" /></div>
                </div>
                <div className="h-field" style={{ flex: 1 }}>
                  <label>Account number</label>
                  <div className="h-input"><input value={form.account_number} onChange={(e) => set('account_number', e.target.value)} placeholder="Enter account number" /></div>
                </div>
              </div>
              <div className="h-row" style={{ gap: 12, flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'stretch' : 'center' }}>
                <div className="h-field" style={{ flex: 1 }}>
                  <label>Bank name</label>
                  <div className="h-input"><input value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} placeholder="Enter bank name" /></div>
                </div>
                <div className="h-field" style={{ flex: 1 }}>
                  <label>IFSC code</label>
                  <div className="h-input"><input value={form.ifsc_code} onChange={(e) => set('ifsc_code', e.target.value)} placeholder="Enter IFSC code" /></div>
                </div>
              </div>
              <div className="h-row" style={{ gap: 12, flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'stretch' : 'center' }}>
                <div className="h-field" style={{ flex: 1 }}>
                  <label>UPI ID <span style={{ color: 'var(--ink-6)', fontWeight: 400 }}>(optional)</span></label>
                  <div className="h-input"><input value={form.upi_id} onChange={(e) => set('upi_id', e.target.value)} placeholder="name@upi" /></div>
                </div>
              </div>
            </div>
          </div>

          {/* Color theme */}
          <div className="h-card" style={{ padding: 20 }}>
            <div className="h-row h-between" style={{ marginBottom: 14 }}>
              <div>
                <div className="h-eyebrow">COLOUR THEME</div>
                <div className="h-meta" style={{ marginTop: 2 }}>Applies to every invoice template, every batch, every download.</div>
              </div>
              <div className="h-row" style={{ gap: 6 }}>
                <span className="h-status muted">currently · {theme.name}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: mobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 10, marginBottom: 18 }}>
              {COLOR_PRESETS.map((p) => {
                const on = p.accent.toLowerCase() === (form.accent_color || '').toLowerCase();
                return (
                  <div key={p.name} onClick={() => set('accent_color', p.accent)} style={{
                    padding: 12, borderRadius: 'var(--r-md)',
                    border: on ? '2px solid var(--ink-2)' : '1px solid var(--line-faint)',
                    background: on ? 'var(--ink-9)' : 'var(--paper)',
                    cursor: 'pointer', position: 'relative',
                  }}>
                    {on && (
                      <div style={{ position: 'absolute', top: -8, right: -8, width: 22, height: 22, borderRadius: '50%', background: 'var(--ink-2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <HIcon name="check" size={12} />
                      </div>
                    )}
                    <div className="h-row" style={{ gap: 4, marginBottom: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: p.accent, border: '1.5px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }} />
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: p.dark, marginLeft: -6, border: '1.5px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }} />
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: p.tint, marginLeft: -4, border: '1.5px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                    <div className="h-mono" style={{ fontSize: 9, color: 'var(--ink-5)', marginTop: 1 }}>{p.accent}</div>
                  </div>
                );
              })}
            </div>

            <div className="h-row" style={{ gap: 10, alignItems: mobile ? 'stretch' : 'flex-end', flexDirection: mobile ? 'column' : 'row' }}>
              <div className="h-field" style={{ flex: 1 }}>
                <label>Custom accent (hex)</label>
                <div className="h-input">
                  <input type="color" value={form.accent_color} onChange={(e) => set('accent_color', e.target.value)} style={{ width: 24, height: 24, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }} />
                  <input value={form.accent_color} onChange={(e) => set('accent_color', e.target.value)} />
                </div>
              </div>
              <button className="h-btn ghost" onClick={() => set('accent_color', '#2D5C4F')}>Reset to forest</button>
            </div>
          </div>

          {/* Footer */}
          <div className="h-card" style={{ padding: 20 }}>
            <div className="h-eyebrow" style={{ marginBottom: 10 }}>SHARED INVOICE FOOTER</div>
            <div className="h-meta" style={{ marginBottom: 14, fontSize: 13 }}>
              The same footer appears at the bottom of every invoice template. Invoice number on the left, your company name on the right.
            </div>
            <div style={{ padding: '10px 18px', border: '1px dashed var(--line-soft)', borderRadius: 'var(--r-md)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.12em', color: 'var(--ink-5)', textTransform: 'uppercase', background: 'var(--paper-2)' }}>
              <span>INV-0001</span>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: form.accent_color }} />
              <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{form.name || 'My Company'}</span>
            </div>
          </div>
        </div>

        {/* Right column: live preview using real data + chosen colour */}
        <div className="h-col" style={{ gap: 12, alignItems: 'stretch', position: 'sticky', top: 0 }}>
          <div className="h-row h-between">
            <div className="h-eyebrow">LIVE PREVIEW</div>
            <span className="h-meta">{selectedTpl?.name || 'Template'}</span>
          </div>
          <div style={{ ...previewVars, background: 'var(--paper-3)', borderRadius: 'var(--r-lg)', display: 'flex', alignItems: 'center', justifyContent: mobile ? 'flex-start' : 'center', padding: 18, minHeight: mobile ? 'auto' : 560, overflowX: 'auto' }}>
            <Invoice variant={previewVariant} sample={previewSample} />
          </div>
        </div>
      </div>
    </Shell>
  );
}
