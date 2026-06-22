/* Invoice preview — reuses the prototype's preview shell but is data-driven.
   Reached via /preview/ticket?id=<invoice id>. Reconstructs the invoice's line
   items by re-grouping the source rows (we persist a summary per invoice, not
   the individual lines), then renders the live Invoice + real metadata. */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import HIcon from '../components/HIcon.jsx';
import Invoice from '../components/Invoice.jsx';
import { supabase } from '../lib/supabase.js';
import { autoMap, groupRows, buildInvoiceFromGroup } from '../lib/invoicePdf.js';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const inr = (s) => '₹ ' + String(s ?? '');

const PANEL = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 'var(--r-md)',
  padding: '18px 20px',
};

export default function HiFiPreviewTicket() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get('id');

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null); // { inv, template, sample, variant, totals }

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    (async () => {
      const { data: inv } = await supabase.from('invoices').select('*').eq('id', id).maybeSingle();
      if (!inv) { setLoading(false); return; }

      const [{ data: template }, { data: company }, { data: source }] = await Promise.all([
        inv.template_id ? supabase.from('templates').select('*').eq('id', inv.template_id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('companies').select('*').limit(1).maybeSingle(),
        inv.data_source_id ? supabase.from('data_sources').select('*').eq('id', inv.data_source_id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      const variant = parseInt(template?.layout_type, 10) || 1;
      const dateStr = fmtDate(inv.issued_date);

      // Rebuild this invoice's line items from the source rows.
      let sample = null;
      let totals = { subtotal: inr(inv.amount), gst: '₹ 0', total: inr(inv.amount) };
      if (source) {
        const { data: rows } = await supabase.from('data_rows').select('row_data')
          .eq('data_source_id', source.id).order('row_index', { ascending: true });
        const map = autoMap(source.detected_columns || []);
        const groups = groupRows((rows || []).map((r) => r.row_data), map);
        for (const g of groups) {
          const built = buildInvoiceFromGroup(g, map, { company, refNumber: inv.ref_number, dateStr });
          const same = built.meta.client_name.toLowerCase() === String(inv.client_name || '').toLowerCase()
            && String(built.meta.email || '').toLowerCase() === String(inv.email || '').toLowerCase();
          if (same) { sample = built.sample; totals = { subtotal: inr(built.sample.subtotal), gst: inr(built.sample.gst), total: inr(built.sample.total) }; break; }
        }
      }
      // Fallback: a single line from the stored summary.
      if (!sample) {
        sample = {
          no: inv.ref_number, ref: inv.ref_number, date: dateStr, due: dateStr,
          pax: inv.client_name || 'Customer', paxLine2: inv.email || '', city: '',
          company: company?.name || 'My Company', addr: company?.address || '', email: company?.email || '', phone: company?.phone || '',
          items: [['', inv.item_summary || 'Service', '', 1, String(inv.amount), String(inv.amount)]],
          subtotal: String(inv.amount), gst: '0', total: String(inv.amount),
        };
      }

      setData({ inv, template, variant, sample, totals });
      setLoading(false);
    })();
  }, [id]);

  const download = async () => {
    const path = data?.inv?.pdf_storage_path;
    if (!path) { alert('No stored PDF for this invoice.'); return; }
    const { data: signed, error } = await supabase.storage.from('invoices').createSignedUrl(path, 120, { download: true });
    if (error || !signed?.signedUrl) { alert('Could not get the file: ' + (error?.message || 'no URL')); return; }
    window.open(signed.signedUrl, '_blank', 'noopener');
  };

  const emailInvoice = () => {
    const inv = data?.inv;
    if (!inv?.email) { alert('This invoice has no email address.'); return; }
    const subject = encodeURIComponent(`Invoice ${inv.ref_number}`);
    const body = encodeURIComponent(`Hi ${inv.client_name || ''},\n\nPlease find your invoice ${inv.ref_number} for ${data.totals.total}.\n\nThank you.`);
    window.location.href = `mailto:${inv.email}?subject=${subject}&body=${body}`;
  };

  const wrap = (children) => (
    <div className="h" style={{ width: '100%', height: '100%', background: 'var(--mesh-deep)', color: 'var(--paper)', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {children}
    </div>
  );

  if (loading) return wrap(<div style={{ margin: 'auto', color: 'rgba(255,255,255,0.7)' }}>Loading…</div>);
  if (!data) return wrap(
    <div style={{ margin: 'auto', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="serif" style={{ fontSize: 26 }}>Invoice not found.</div>
      <button onClick={() => navigate('/ledger')} className="h-btn sm" style={{ background: 'var(--paper)', color: 'var(--ink-2)' }}>Back to Ledger</button>
    </div>
  );

  const { inv, template, variant, sample, totals } = data;

  const statusMeta = {
    paid: { label: 'Paid', dot: '#A8C7BB' },
    sent: { label: 'Sent', dot: 'rgba(255,255,255,0.6)' },
    generated: { label: 'Generated', dot: '#A8C7BB' },
  }[inv.status] || { label: inv.status || 'Draft', dot: 'rgba(255,255,255,0.4)' };

  const dueStr = inv.issued_date ? fmtDate(addDays(inv.issued_date, 14)) : '—';
  const createdStr = inv.created_at ? new Date(inv.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

  const activity = [['Generated', createdStr]];
  if (inv.status === 'sent' || inv.status === 'paid') activity.push(['Sent · email', fmtDate(inv.updated_at)]);
  if (inv.status === 'paid') activity.push(['Paid', fmtDate(inv.updated_at)]);

  return wrap(
    <>
      {/* Top chrome */}
      <div className="h-row h-between" style={{ padding: '18px 28px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.18)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="h-row" style={{ gap: 14, display: 'flex', alignItems: 'center' }}>
          <button onClick={() => navigate(-1)} className="h-iconbtn" style={{ width: 32, height: 32, marginRight: 10, background: 'transparent', borderColor: 'rgba(255,255,255,0.18)', color: 'var(--paper)' }}><HIcon name="chev-l" size={15} /></button>
          <div className="h-row" style={{ gap: 8, alignItems: 'baseline', display: 'flex' }}>
            <div className="h-mono" style={{ fontSize: 11, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)', marginRight: 8 }}>PREVIEW</div>
            <div className="serif" style={{ fontSize: 22, lineHeight: 1, color: 'var(--paper)', marginRight: 8 }}>{inv.ref_number}</div>
            <div className="h-mono" style={{ fontSize: 11, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.5)' }}>· {String(inv.client_name || '').toUpperCase()}</div>
          </div>
        </div>
        <div className="h-row" style={{ gap: 8, display: 'flex' }}>
          <button onClick={emailInvoice} className="h-btn ghost sm" style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.22)', color: 'var(--paper)', marginRight: 8 }}>
            <HIcon name="mail" size={13} /> Email
          </button>
          <button onClick={download} className="h-btn sm" style={{ background: 'var(--paper)', color: 'var(--ink-2)', borderColor: 'var(--paper)' }}>
            <HIcon name="download" size={13} /> Download .pdf
          </button>
        </div>
      </div>

      {/* Body: invoice center + meta sidebar */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, padding: '28px 28px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 'var(--r-lg)', padding: '20px', overflow: 'auto' }}>
          <Invoice variant={variant} sample={sample} />
        </div>

        {/* meta sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflow: 'auto' }}>
          <div style={PANEL}>
            <div className="h-eyebrow" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 9 }}>STATUS</div>
            <div className="h-row" style={{ gap: 8, marginTop: 6, alignItems: 'center', display: 'flex' }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: statusMeta.dot, marginRight: 8 }} />
              <div className="serif" style={{ fontSize: 22, lineHeight: 1, color: 'var(--paper)' }}>{statusMeta.label}</div>
            </div>
            <div className="h-meta" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 6 }}>Total {totals.total} · issued {fmtDate(inv.issued_date)}</div>
          </div>

          <div style={PANEL}>
            <div className="h-eyebrow" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 9, marginBottom: 12 }}>DETAILS</div>
            {[
              ['Template', template?.name || '—'],
              ['Issued', fmtDate(inv.issued_date)],
              ['Due', dueStr],
              ['Subtotal', totals.subtotal],
              ['Tax', totals.gst],
              ['Total', totals.total],
            ].map(([k, v], i) => (
              <div key={k} className="h-row h-between" style={{ padding: '6px 0', borderTop: i ? '1px solid rgba(255,255,255,0.06)' : 'none', display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{k}</div>
                <div className="h-mono" style={{ fontSize: 12, color: 'var(--paper)' }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={PANEL}>
            <div className="h-eyebrow" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 9, marginBottom: 12 }}>ACTIVITY</div>
            {activity.map(([k, v], i) => (
              <div key={k} className="h-row" style={{ padding: '6px 0', gap: 10, display: 'flex', alignItems: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: i === activity.length - 1 ? '#A8C7BB' : 'rgba(255,255,255,0.4)', flex: '0 0 auto', marginRight: 8 }} />
                <div style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{k}</div>
                <div className="h-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>{v}</div>
              </div>
            ))}
          </div>

          <button onClick={() => navigate('/ledger')} className="h-btn sm" style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.22)', color: 'var(--paper)', justifyContent: 'center', marginTop: 'auto', display: 'flex', alignItems: 'center' }}>
            <HIcon name="chev-l" size={13} style={{ marginRight: 6 }} /> Back to Ledger
          </button>
        </div>
      </div>
    </>
  );
}
