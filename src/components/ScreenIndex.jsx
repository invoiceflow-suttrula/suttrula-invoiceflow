import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ROUTES = {
  // Auth
  '/loading':              { label: 'A.1 Loading' },
  '/signin':               { label: 'A.2 Sign in' },
  '/signup':               { label: 'A.3 Sign up' },
  '/forgot':               { label: 'A.4 Forgot password' },
  '/check-email':          { label: 'A.5 Check email' },
  '/reset':                { label: 'A.6 Reset password' },

  // Onboarding
  '/onboarding/welcome':   { label: 'B.1 Welcome' },
  '/onboarding/business':  { label: 'B.2 Business details' },
  '/onboarding/brand':     { label: 'B.3 Brand colour' },
  '/onboarding/template':  { label: 'B.4 Invoice template' },
  '/onboarding/import':    { label: 'B.5 Import clients' },
  '/onboarding/invite':    { label: 'B.6 Invite team' },
  '/onboarding/ready':     { label: 'B.7 Workspace ready' },

  // Custom template generation
  '/template-gen/upload':    { label: 'D.1 Upload image' },
  '/template-gen/settings':  { label: 'D.2 Basics' },
  '/template-gen/reading':   { label: 'D.3 Reading' },
  '/template-gen/mapping':   { label: 'D.4 Mapping' },
  '/template-gen/overlaps':  { label: 'D.5 Overlaps' },
  '/template-gen/composing': { label: 'D.6 Composing' },
  '/template-gen/review':    { label: 'D.7 Review and save' },

  // Generate invoice flow
  '/generate':          { label: 'G.1 Pick source + template' },
  '/generate/mapping':  { label: 'G.2 Map columns to fields' },
  '/generate/run':      { label: 'G.3 Generate + download' },

  // Data sources
  '/data-sources':        { label: 'F.1 Connected sources' },
  '/data-sources/upload': { label: 'F.2 Upload new' },

  // Core pipeline
  '/':                  { label: 'P.1 Dashboard' },
  '/templates':         { label: 'P.2 Pick template' },
  '/preview/ticket':    { label: 'P.3 Invoice preview' },
  '/ledger':            { label: 'P.4 Ledger' },
  '/settings':          { label: 'P.5 Settings' },

  // Empty
  '/empty':             { label: 'E.1 Empty dashboard' },
  '/ledger/empty':      { label: 'E.2 Empty ledger' },

  // Errors
  '/404':     { label: 'C.1 404 not found' },
  '/500':     { label: 'C.2 500 server' },
  '/403':     { label: 'C.3 403 no access' },
  '/offline': { label: 'C.4 Offline' },
};

const NAV_GROUPS = [
  { id: 'auth', title: 'Auth', items: [
    ['/loading',      'A.1 Loading'],
    ['/signin',       'A.2 Sign in'],
    ['/signup',       'A.3 Sign up'],
    ['/forgot',       'A.4 Forgot password'],
    ['/check-email',  'A.5 Check email'],
    ['/reset',        'A.6 Reset password'],
  ]},
  { id: 'onb', title: 'Onboarding', items: [
    ['/onboarding/welcome',  'B.1 Welcome'],
    ['/onboarding/business', 'B.2 Business details'],
    ['/onboarding/brand',    'B.3 Brand colour'],
    ['/onboarding/template', 'B.4 Invoice template'],
    ['/onboarding/import',   'B.5 Import clients'],
    ['/onboarding/invite',   'B.6 Invite team'],
    ['/onboarding/ready',    'B.7 Workspace ready'],
  ]},
  { id: 'gen', title: 'Generate invoice', items: [
    ['/generate',          'G.1 Pick source + template'],
    ['/generate/mapping',  'G.2 Map columns to fields'],
    ['/generate/run',      'G.3 Generate + download'],
  ]},
  { id: 'data', title: 'Data sources', items: [
    ['/data-sources',        'F.1 Connected sources'],
    ['/data-sources/upload', 'F.2 Upload new'],
  ]},
  { id: 'pipe', title: 'Core pages', items: [
    ['/',                  'P.1 Dashboard'],
    ['/templates',         'P.2 Pick template'],
    ['/preview/ticket',    'P.3 Invoice preview'],
    ['/ledger',            'P.4 Ledger'],
    ['/settings',          'P.5 Settings'],
  ]},
  { id: 'empty', title: 'Empty (new user)', items: [
    ['/empty',             'E.1 Empty dashboard'],
    ['/ledger/empty',      'E.2 Empty ledger'],
  ]},
  { id: 'tpl', title: 'Custom template', items: [
    ['/template-gen/upload',    'D.1 Upload image'],
    ['/template-gen/settings',  'D.2 Basics'],
    ['/template-gen/reading',   'D.3 Reading'],
    ['/template-gen/mapping',   'D.4 Mapping'],
    ['/template-gen/overlaps',  'D.5 Overlaps'],
    ['/template-gen/composing', 'D.6 Composing'],
    ['/template-gen/review',    'D.7 Review and save'],
  ]},
  { id: 'err', title: 'Errors', items: [
    ['/404',     'C.1 404 not found'],
    ['/500',     'C.2 500 server'],
    ['/403',     'C.3 403 no access'],
    ['/offline', 'C.4 Offline'],
  ]},
];

export default function ScreenIndex() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const route = location.pathname;

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const meta = ROUTES[route];

  return (
    <>
      {/* floating launcher pill */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position:'fixed', left:20, bottom:20,
          zIndex:9998,
          display:'flex', alignItems:'center', gap:10,
          padding:'10px 16px 10px 12px',
          borderRadius:999,
          background:'rgba(16,28,32,0.92)',
          color:'#fff',
          border:'1px solid rgba(255,255,255,0.18)',
          backdropFilter:'blur(12px)',
          boxShadow:'0 12px 36px rgba(0,0,0,0.35)',
          cursor:'pointer',
          font:'500 12px/1 ui-sans-serif, system-ui, -apple-system',
          letterSpacing:'0.02em',
        }}
        title="Browse all screens (⌘K)"
      >
        <img
          src="/assets/invoice-flow-icon-light.png"
          alt=""
          width="22"
          height="22"
          style={{display:'block', flex:'0 0 auto'}}
        />
        <span style={{maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
          {meta ? meta.label : 'Browse screens'}
        </span>
        <span style={{
          fontFamily:'ui-monospace, monospace',
          fontSize:10, opacity:0.65, marginLeft:4,
          padding:'2px 6px', borderRadius:4,
          background:'rgba(255,255,255,0.12)',
        }}>⌘K</span>
      </button>

      {/* overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position:'fixed', inset:0, zIndex:9999,
            background:'rgba(8,14,16,0.55)',
            backdropFilter:'blur(6px)',
            display:'flex', alignItems:'center', justifyContent:'center',
            padding:40,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width:'min(1080px, 100%)',
              maxHeight:'80vh',
              background:'#fff', borderRadius:18,
              padding:'26px 28px',
              boxShadow:'0 30px 80px rgba(0,0,0,0.4)',
              display:'flex', flexDirection:'column',
              overflow:'hidden',
              font:'400 13px/1.5 ui-sans-serif, system-ui',
              color:'#0f1a18',
            }}
          >
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:18, flex:'0 0 auto'}}>
              <div>
                <div style={{fontFamily:'ui-monospace, monospace', fontSize:10, letterSpacing:'0.22em', color:'#5a6a66', textTransform:'uppercase'}}>SCREEN INDEX</div>
                <div style={{fontFamily:'"Instrument Serif", serif', fontSize:30, lineHeight:1, marginTop:6, letterSpacing:'-0.01em'}}>Jump to any screen.</div>
              </div>
              <button onClick={() => setOpen(false)} style={{border:'1px solid #ddd', background:'#fff', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12}}>Esc</button>
            </div>

            <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:18, overflow:'auto', flex:1}}>
              {NAV_GROUPS.map(g => (
                <div key={g.id}>
                  <div style={{fontFamily:'ui-monospace, monospace', fontSize:9, letterSpacing:'0.22em', color:'#5a6a66', textTransform:'uppercase', marginBottom:10}}>{g.title}</div>
                  <div style={{display:'flex', flexDirection:'column', gap:6}}>
                    {g.items.map(([r, label]) => {
                      const on = r === route;
                      return (
                        <button
                          key={r}
                          onClick={() => { navigate(r); setOpen(false); }}
                          style={{
                            textAlign:'left',
                            padding:'8px 10px',
                            borderRadius:8,
                            border:'1px solid ' + (on ? '#102C26' : '#ececec'),
                            background: on ? '#102C26' : '#fff',
                            color: on ? '#fff' : '#0f1a18',
                            fontSize:12,
                            cursor:'pointer',
                            display:'flex', alignItems:'center', justifyContent:'space-between',
                            gap:8,
                          }}
                        >
                          <span>{label}</span>
                          <span style={{
                            fontFamily:'ui-monospace, monospace', fontSize:9,
                            opacity: on ? 0.6 : 0.45,
                          }}>›</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{flex:'0 0 auto', marginTop:18, paddingTop:14, borderTop:'1px solid #ececec', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12, color:'#5a6a66'}}>
              <div>{Object.keys(ROUTES).length} screens · prototype</div>
              <div style={{display:'flex', gap:14, fontFamily:'ui-monospace, monospace', fontSize:10, letterSpacing:'0.18em'}}>
                <span>⌘K toggle</span><span>ESC close</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
