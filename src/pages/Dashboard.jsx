/* Dashboard — real stats + recent invoices/batches from Supabase. */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Shell from '../components/Shell.jsx';
import HIcon from '../components/HIcon.jsx';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    (async () => {
      const [{ data: inv }, { data: bat }] = await Promise.all([
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('invoice_batches').select('*').order('created_at', { ascending: false }),
      ]);
      setInvoices(inv || []);

      /* Keep batches for 5 days (today + previous 4); auto-delete older ones
         (the invoice_batches row + its batch.zip) on every Dashboard load. */
      const cut = new Date();
      cut.setHours(0, 0, 0, 0);
      cut.setDate(cut.getDate() - 4);
      const all = bat || [];
      const fresh = all.filter((b) => b.created_at && new Date(b.created_at) >= cut);
      const stale = all.filter((b) => !(b.created_at && new Date(b.created_at) >= cut));
      setBatches(fresh);

      if (stale.length) {
        const zips = stale.map((b) => b.zip_storage_path).filter(Boolean);
        if (zips.length) await supabase.storage.from('invoices').remove(zips);
        await supabase.from('invoice_batches').delete().in('id', stale.map((b) => b.id));
      }
    })();
  }, []);

  const now = new Date();
  /* Rolling window: today + the previous 4 days = 5 calendar days.
     Recomputed on every render, so yesterday's 6th-day-ago data drops off automatically. */
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - 4);
  const dateOf = (i) => (i.issued_date ? new Date(i.issued_date) : i.created_at ? new Date(i.created_at) : null);
  const last5 = invoices.filter((i) => { const d = dateOf(i); return d && d >= cutoff; });
  const unpaid = last5.filter((i) => i.status !== 'paid');
  const sum = (arr) => arr.reduce((a, i) => a + Number(i.amount || 0), 0);
  const lakh = (n) => (n >= 1e5 ? '₹ ' + (n / 1e5).toFixed(1) + 'L' : '₹ ' + Number(n).toLocaleString('en-IN'));
  const rel = (d) => {
    if (!d) return '—';
    const ms = now - new Date(d), h = ms / 36e5;
    if (h < 1) return Math.max(1, Math.round(ms / 6e4)) + ' m';
    if (h < 24) return Math.round(h) + ' h';
    return Math.round(h / 24) + ' d';
  };
  const firstName = String(user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there').split(' ')[0];
  const greet = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const todayLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();

  const openPath = async (path) => {
    if (!path) return;
    const { data } = await supabase.storage.from('invoices').createSignedUrl(path, 120, { download: true });
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener');
  };

  const recent = last5.slice(0, 6);
  const lastBatch = batches[0];

  return (
    <Shell active="dash">
      {/* ── Hero strip with mesh ───── */}
      <div style={{ borderRadius: 'var(--r-lg)', background: 'var(--mesh-deep)', color: 'var(--paper)', padding: '34px 36px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <svg width="320" height="320" viewBox="0 0 320 320" style={{ position: 'absolute', top: -80, right: -60, opacity: 0.18 }}>
          <path d="M160,40 C220,30 290,90 300,150 C310,210 240,290 170,290 C100,290 30,220 30,150 C30,80 100,50 160,40 Z" fill="white" />
        </svg>
        <svg width="200" height="200" viewBox="0 0 200 200" style={{ position: 'absolute', bottom: -60, left: -40, opacity: 0.12 }}>
          <path d="M100,20 C150,30 190,80 180,140 C170,200 100,200 60,180 C20,160 10,90 30,60 C50,30 80,15 100,20 Z" fill="white" />
        </svg>

        <div style={{ position: 'relative', zIndex: 1 }} className="h-row h-between">
          <div>
            <div className="h-eyebrow" style={{ color: 'rgba(255,255,255,0.65)' }}>{todayLabel}</div>
            <div className="serif" style={{ fontSize: 54, lineHeight: 1.04, marginTop: 8, maxWidth: 680 }}>
              {greet}, {firstName}. <span style={{ opacity: 0.65 }}>{invoices.length} invoices in your ledger.</span>
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 18, alignItems: 'baseline' }}>
              <div>
                <div className="h-eyebrow" style={{ color: 'rgba(255,255,255,0.55)' }}>LAST 5 DAYS</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 30, lineHeight: 1, marginTop: 4 }}>{last5.length} invoices</div>
              </div>
              <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.2)' }} />
              <div>
                <div className="h-eyebrow" style={{ color: 'rgba(255,255,255,0.55)' }}>REVENUE (5 DAYS)</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 30, lineHeight: 1, marginTop: 4 }}>{lakh(sum(last5))}</div>
              </div>
              <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.2)' }} />
              <div>
                <div className="h-eyebrow" style={{ color: 'rgba(255,255,255,0.55)' }}>UNPAID</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 30, lineHeight: 1, marginTop: 4 }}>{unpaid.length} invoices</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
            <button onClick={() => navigate('/generate')} className="h-btn lg" style={{ background: 'var(--paper)', color: 'var(--ink-2)', borderColor: 'var(--paper)' }}>
              <HIcon name="plus" size={16} /> Generate invoices
            </button>
            <button onClick={() => navigate('/data-sources/upload')} className="h-btn sm" style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.4)', color: 'var(--paper)' }}>
              <HIcon name="upload" size={14} /> Upload data source
            </button>
          </div>
        </div>
      </div>

      {/* ── Recent invoices ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, height: 'calc(100% - 280px)' }}>
        <div>
          <div className="h-row h-between" style={{ marginBottom: 12 }}>
            <div>
              <div className="h-eyebrow">RECENT INVOICES</div>
              <div className="serif" style={{ fontSize: 26, marginTop: 2 }}>{last5.length} in the last 5 days</div>
            </div>
            <div className="h-row" style={{ gap: 8 }}>
              <div onClick={() => navigate('/ledger')} className="h-chip ghost" style={{ cursor: 'pointer' }}>View ledger →</div>
            </div>
          </div>

          {recent.length === 0 ? (
            <div className="h-card" style={{ padding: 40, textAlign: 'center', border: '1px dashed var(--line-soft)' }}>
              <div className="serif" style={{ fontSize: 22 }}>Nothing in the last 5 days.</div>
              <div className="h-meta" style={{ marginTop: 8 }}>{invoices.length > 0 ? 'Older invoices are still in the Ledger.' : 'Generate a batch and your invoices will show up here.'}</div>
              <button onClick={() => navigate(invoices.length > 0 ? '/ledger' : '/generate')} className="h-btn primary sm" style={{ marginTop: 16 }}>
                <HIcon name={invoices.length > 0 ? 'file' : 'plus'} size={13} /> {invoices.length > 0 ? 'Open Ledger' : 'Generate invoices'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
              {recent.map((t) => (
                <div key={t.id} onClick={() => navigate(`/preview/ticket?id=${t.id}`)} className="h-card" style={{ padding: 18, cursor: 'pointer' }}>
                  <div className="h-row h-between" style={{ marginBottom: 10 }}>
                    <span className="h-mono" style={{ fontSize: 11, color: 'var(--ink-5)' }}>{t.ref_number}</span>
                    <span className={'h-status ' + (t.status === 'paid' ? 'ok' : 'muted')}>{t.status || 'draft'}</span>
                  </div>
                  <div className="serif" style={{ fontSize: 20, lineHeight: 1.1, marginBottom: 2 }}>{t.client_name || '—'}</div>
                  <div className="h-meta" style={{ marginBottom: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.item_summary || '—'}</div>
                  <div className="h-row h-between" style={{ paddingTop: 12, borderTop: '1px solid var(--line-faint)' }}>
                    <div>
                      <div className="h-eyebrow" style={{ fontSize: 9 }}>VALUE</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 13, marginTop: 2 }}>₹ {Number(t.amount || 0).toLocaleString('en-IN')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="h-eyebrow" style={{ fontSize: 9 }}>CREATED</div>
                      <div className="h-meta" style={{ marginTop: 2 }}>{rel(t.created_at)} ago</div>
                    </div>
                    <button className="h-iconbtn" style={{ marginLeft: 8 }} title="Download" onClick={(e) => { e.stopPropagation(); openPath(t.pdf_storage_path); }}><HIcon name="download" size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right rail: recent batches ─────────── */}
        <div className="h-col" style={{ gap: 14 }}>
          <div className="h-card" style={{ padding: 18 }}>
            <div className="h-row h-between" style={{ marginBottom: 12 }}>
              <div className="h-eyebrow">RECENT BATCHES</div>
              <div className="h-meta">{batches.length}</div>
            </div>
            {batches.length === 0 ? (
              <div className="h-meta" style={{ fontSize: 12 }}>No batches generated yet.</div>
            ) : batches.slice(0, 5).map((b, i) => (
              <div key={b.id} onClick={() => openPath(b.zip_storage_path)} className="h-row" style={{ padding: '10px 0', borderTop: i ? '1px solid var(--line-faint)' : 'none', gap: 12, cursor: 'pointer', alignItems: 'center' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--ink-9)', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                  <HIcon name="zip" size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.batch_name}</div>
                  <div className="h-meta" style={{ fontSize: 11 }}>{b.invoice_count} invoices · {lakh(Number(b.total_amount || 0))}</div>
                </div>
                <HIcon name="download" size={14} color="var(--ink-5)" />
              </div>
            ))}
          </div>

          {lastBatch && (
            <div className="h-card dark" style={{ padding: 18 }}>
              <div className="h-eyebrow" style={{ color: 'rgba(255,255,255,0.55)' }}>JUMP BACK</div>
              <div className="serif" style={{ fontSize: 22, marginTop: 4, color: 'var(--paper)' }}>Last batch</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>
                {lastBatch.invoice_count} invoices · {lakh(Number(lastBatch.total_amount || 0))} — {lastBatch.batch_name}
              </div>
              <button onClick={() => openPath(lastBatch.zip_storage_path)} className="h-btn sm" style={{ marginTop: 14, background: 'var(--paper)', color: 'var(--ink-2)', borderColor: 'var(--paper)' }}>
                <HIcon name="download" size={13} /> Download .zip
              </button>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}

export function HiFiDashboardEmpty() {
  const navigate = useNavigate();
  return (
    <Shell active="dash">
      {/* Welcome hero, no stats yet */}
      <div style={{
        borderRadius:'var(--r-lg)',
        background:'var(--mesh-deep)',
        color:'var(--paper)',
        padding:'36px 40px',
        marginBottom:24,
        position:'relative',
        overflow:'hidden',
      }}>
        <svg width="320" height="320" viewBox="0 0 320 320" style={{position:'absolute', top:-80, right:-60, opacity:0.18}}>
          <path d="M160,40 C220,30 290,90 300,150 C310,210 240,290 170,290 C100,290 30,220 30,150 C30,80 100,50 160,40 Z" fill="white"/>
        </svg>
        <div className="h-row h-between" style={{position:'relative', zIndex:1, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div>
            <div className="h-eyebrow" style={{color:'rgba(255,255,255,0.65)'}}>WELCOME · WORKSPACE READY</div>
            <div className="serif" style={{fontSize:44, lineHeight:1.05, letterSpacing:'-0.02em', marginTop:8, maxWidth:520, textWrap:'balance'}}>
              Let's issue your <em style={{color:'rgba(255,255,255,0.6)'}}>first invoice.</em>
            </div>
            <div style={{fontSize:14, color:'rgba(255,255,255,0.7)', marginTop:14, maxWidth:480, lineHeight:1.55}}>
              You haven't generated any invoices yet. Pick one of the routes below to get started, you can do it all from the sidebar later.
            </div>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:8, alignItems:'flex-end'}}>
            <button onClick={() => navigate('/generate')} className="h-btn lg" style={{background:'var(--paper)', color:'var(--ink-2)', borderColor:'var(--paper)', marginBottom: 8}}>
              <HIcon name="plus" size={16}/> Issue a single invoice
            </button>
            <button onClick={() => navigate('/data-sources/upload')} className="h-btn sm" style={{background:'transparent', borderColor:'rgba(255,255,255,0.4)', color:'var(--paper)'}}>
              <HIcon name="upload" size={14}/> Upload a data source
            </button>
          </div>
        </div>

        {/* Empty stats strip */}
        <div style={{display:'flex', gap:24, marginTop:24, alignItems:'baseline', position:'relative', zIndex:1, opacity:0.55}}>
          {['ISSUED THIS WEEK','REVENUE','PENDING'].map((k, i) => (
            <React.Fragment key={k}>
              {i ? <div style={{width:1, height:36, background:'rgba(255,255,255,0.18)', margin: '0 12px'}}/> : null}
              <div>
                <div className="h-eyebrow" style={{color:'rgba(255,255,255,0.55)'}}>{k}</div>
                <div style={{fontFamily:'var(--serif)', fontSize:28, lineHeight:1, marginTop:4, color:'rgba(255,255,255,0.6)'}}>—</div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 4 quick-start cards */}
      <div className="h-eyebrow" style={{marginBottom:12}}>QUICK START</div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginBottom:24}}>
        {[
          { ic:'file',    t:'Single invoice',     d:'Build one invoice with the form + live preview.', r:'/generate' },
          { ic:'users',   t:'Bulk via data source', d:'Upload a .xlsx and issue a batch in one go.',     r:'/data-sources/upload' },
          { ic:'layers',  t:'Use a template',     d:'Pick from 5 defaults or generate from an image.', r:'/templates' },
          { ic:'sparkle', t:'Custom template',    d:'Drop in an invoice image to rebuild as editable.',r:'/template-gen/upload' },
        ].map((q, i) => (
          <div key={i} onClick={() => navigate(q.r)} className="h-card" style={{padding:'20px 20px 22px', cursor:'pointer'}}>
            <div style={{
              width:38, height:38, borderRadius:'50%',
              background:'var(--ink-9)', color:'var(--ink-2)',
              display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14,
            }}><HIcon name={q.ic} size={17}/></div>
            <div className="serif" style={{fontSize:20, lineHeight:1.15}}>{q.t}</div>
            <div className="h-meta" style={{fontSize:12, marginTop:6, lineHeight:1.55}}>{q.d}</div>
            <div className="h-mono" style={{fontSize:10, color:'var(--ink-5)', marginTop:14, letterSpacing:'0.2em'}}>OPEN →</div>
          </div>
        ))}
      </div>

      {/* Bottom two columns: setup checklist + empty recent */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:24}}>
        <div className="h-card" style={{padding:'22px 24px'}}>
          <div className="h-eyebrow">SETUP CHECKLIST · 4 OF 5</div>
          <div className="serif" style={{fontSize:24, lineHeight:1.15, marginTop:4}}>Almost done.</div>
          <div style={{display:'flex', flexDirection:'column', gap:10, marginTop:14}}>
            {[
              ['Business details',  true, '/settings'],
              ['Brand colour',      true, '/settings'],
              ['Default template',  true, '/templates'],
              ['Team invited',      true, '/onboarding/invite'],
              ['First invoice',     false,'/single'],
            ].map(([t, done, r], i) => (
              <div key={i} onClick={() => navigate(r)} className="h-row" style={{
                gap:12, cursor:'pointer',
                padding:'10px 12px', borderRadius:'var(--r-sm)',
                background: done ? 'transparent' : 'var(--ink-9)',
                display: 'flex', alignItems: 'center'
              }}>
                <div style={{
                  width:22, height:22, borderRadius:'50%',
                  background: done ? 'var(--ink-2)' : 'transparent',
                  border: '1.5px solid ' + (done ? 'var(--ink-2)' : 'var(--ink-5)'),
                  color:'var(--paper)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flex:'0 0 auto',
                  marginRight: 8
                }}>{done && <HIcon name="check" size={11} strokeWidth={2.4}/>}</div>
                <div style={{flex:1, fontSize:14, fontWeight: done ? 400 : 600, color: done ? 'var(--ink-4)' : 'var(--ink-2)', textDecoration: done ? 'line-through' : 'none'}}>{t}</div>
                {!done && <span className="h-mono" style={{fontSize:10, letterSpacing:'0.18em', color:'var(--ink-5)'}}>DO NOW →</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="h-card" style={{padding:'22px 24px', border:'1px dashed var(--line-soft)', background:'var(--paper-2)', textAlign:'center', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center'}}>
          <div style={{
            width:60, height:60, borderRadius:'50%',
            background:'var(--paper)', border:'1px dashed var(--line-soft)',
            color:'var(--ink-5)',
            display:'flex', alignItems:'center', justifyContent:'center',
            marginBottom:16,
          }}><HIcon name="download" size={24}/></div>
          <div className="serif" style={{fontSize:22, lineHeight:1.15}}>No downloads yet.</div>
          <div className="h-meta" style={{fontSize:13, marginTop:6, maxWidth:320, lineHeight:1.55}}>
            Every invoice you generate will land here for re-download, email, or audit.
          </div>
          <button onClick={() => navigate('/generate')} className="h-btn primary sm" style={{marginTop:18, display: 'flex', alignItems: 'center'}}>
            <HIcon name="plus" size={13} style={{marginRight: 4}}/> Generate your first
          </button>
        </div>
      </div>
    </Shell>
  );
}

