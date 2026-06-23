import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Shell from '../components/Shell.jsx';
import HIcon from '../components/HIcon.jsx';
import Invoice from '../components/Invoice.jsx';
import { supabase } from '../lib/supabase.js';
import { brandingSample, accentVars } from '../lib/invoicePdf.js';
import useIsMobile from '../hooks/useIsMobile.js';

/* Per-variant blurbs (the templates table has no description column). */
const BLURBS = {
  1: 'Dark header strip with bright accent total. Classic, formal works for any business.',
  2: 'Cream paper with organic blob accents. Friendly, leisure-oriented great for tour invoices.',
  3: 'Patterned vertical rails frame the document. Memorable, stands out in a stack.',
  4: 'Confetti dots + accent badge. Playful, modern. Best with bright brand colours.',
  5: 'Full dark canvas with accent type. Premium, distinctive.',
};

export default function Templates() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const mobile = useIsMobile();

  useEffect(() => {
    (async () => {
      const [{ data }, { data: co }] = await Promise.all([
        supabase.from('templates').select('*').order('is_default', { ascending: false }),
        supabase.from('companies').select('*').limit(1).maybeSingle(),
      ]);
      const mapped = (data || []).map(t => {
        const v = parseInt(t.layout_type, 10) || 1;
        return { id: t.id, v, name: t.name, is_default: t.is_default, blurb: BLURBS[v] || '' };
      });
      setTemplates(mapped);
      setCompany(co);
      setCurrent(mapped.find(t => t.is_default)?.v ?? mapped[0]?.v ?? null);
      setLoading(false);
    })();
  }, []);

  const selected = templates.find(t => t.v === current) || templates[0];
  /* Real company branding so this preview matches Settings + Generator. */
  const brand = brandingSample(company);
  const brandVars = accentVars(company?.accent_color);

  /* Remember the chosen template as the default (DB), then open the generator on it. */
  const useTemplate = async () => {
    if (selected?.id) {
      await supabase.from('templates').update({ is_default: false }).neq('id', selected.id);
      await supabase.from('templates').update({ is_default: true }).eq('id', selected.id);
      navigate(`/generate?template=${selected.id}`);
    } else {
      navigate('/generate');
    }
  };

  return (
    <Shell active="tmpl">
      <div className="h-topbar"><div className="crumb">TEMPLATES · INVOICE DESIGN</div></div>

      <div className="h-row h-between" style={{marginBottom:20, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div className="h-section-title" style={{margin:0}}>
          <div className="serif" style={{fontSize:36, lineHeight:1.05}}>Invoice template</div>
          <div className="lead">A4 portrait. The same footer (invoice # · company name) is shared by every template only the body changes.</div>
        </div>
        <div className="h-row" style={{gap:8, display: 'flex'}}>
          <button className="h-btn" onClick={() => navigate(`/settings${selected?.id ? `?template=${selected.id}` : ''}`)} style={{marginRight: 6}}><HIcon name="pencil" size={14}/> Edit company details</button>
          <button className="h-btn primary" onClick={useTemplate}><HIcon name="check" size={14}/> Use this template</button>
        </div>
      </div>

      {/* 2-up portrait picker */}
      <div style={{
        background: 'var(--paper-3)', borderRadius: 'var(--r-lg)',
        padding: '20px 16px 14px',
      }}>
        <div className="h-row" style={{...brandVars, justifyContent:'center', alignItems:'flex-start', gap: mobile ? 20 : 40, minHeight:520, display: 'flex', flexWrap: mobile ? 'wrap' : 'nowrap'}}>
          {loading && <div className="h-meta" style={{ alignSelf: 'center' }}>Loading templates…</div>}
          {templates.map(t => {
            const isSel = t.v === current;
            return (
              <div key={t.v} onClick={() => setCurrent(t.v)} style={{
                cursor:'pointer', position:'relative', textAlign:'center',
                transition:'all .2s ease',
                transform: isSel ? 'scale(1)' : 'scale(0.94)',
                opacity: isSel ? 1 : 0.7,
                filter: isSel ? 'none' : 'grayscale(0.25)',
              }}>
                <div className="h-eyebrow" style={{marginBottom:8, color: isSel ? 'var(--ink-2)' : 'var(--ink-4)'}}>
                  {t.name.toUpperCase()}
                </div>
                <div style={{
                  boxShadow: isSel ? '0 24px 60px rgba(13,31,26,0.25)' : '0 8px 24px rgba(13,31,26,0.12)',
                  outline: isSel ? '2px solid var(--brand-accent)' : '2px solid transparent',
                  outlineOffset: 6, borderRadius: 2,
                }}>
                  <Invoice variant={t.v} sample={brand}/>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{textAlign:'center', marginTop:18}}>
          <div className="serif" style={{fontSize:22, lineHeight:1.1}}>{selected?.name}</div>
          <div className="h-meta" style={{marginTop:2, maxWidth:520, marginLeft:'auto', marginRight:'auto'}}>{selected?.blurb}</div>
          <div className="h-row" style={{gap:8, marginTop:12, justifyContent:'center', display: 'flex'}}>
            {templates.map(t => (
              <div key={t.v} onClick={() => setCurrent(t.v)} style={{
                width: t.v === current ? 28 : 8, height:8,
                borderRadius:'var(--r-pill)',
                background: t.v === current ? 'var(--brand-accent)' : 'var(--ink-7)',
                transition:'all .2s ease',
                cursor: 'pointer',
                margin: '0 4px'
              }}/>
            ))}
          </div>
        </div>
      </div>

    </Shell>
  );
}
