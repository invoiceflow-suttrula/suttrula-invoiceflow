import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HIcon from '../components/HIcon.jsx';

function Field({ label, hint, children, error }) {
  return (
    <div className="h-field">
      <label className="h-row h-between" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink-2)' }}>{label}</span>
        {hint && <span style={{ fontSize: 11, color: 'var(--ink-5)', fontWeight: 400 }}>{hint}</span>}
      </label>
      {children}
      {error && <div style={{ color: 'var(--brand-accent)', fontSize: 12, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

function OnbShell({ step, total, label, title, sub, children, primary, secondary, skip, onNext, onBack, onSkip, onExit }) {
  const navigate = useNavigate();
  const handleNext = onNext || (() => navigate('/empty'));
  const handleBack = onBack || (() => navigate(-1));
  const handleSkip = onSkip || (() => navigate('/empty'));
  const handleExit = onExit || (() => navigate('/empty'));

  return (
    <div className="h" style={{
      width:'100%', height:'100%',
      background:'var(--paper-2)',
      display:'flex', flexDirection:'column',
      position:'relative',
    }}>
      {/* Top strip */}
      <div className="h-row h-between" style={{padding:'22px 36px', borderBottom:'1px solid var(--line-faint)', background:'var(--paper)'}}>
        <div className="h-row" style={{gap:10, alignItems:'center'}}>
          <img src="/assets/invoice-flow-icon-transparent.png" alt="Invoice Flow" width="28" height="28" style={{display:'block', flex:'0 0 auto'}}/>
          <div style={{display:'inline-flex', alignItems:'baseline', gap:'0.22em', fontFamily:"'DM Sans', system-ui, sans-serif", fontWeight:700, fontSize:20, letterSpacing:'-0.025em', lineHeight:1}}>
            <span style={{color:'var(--ink-2)'}}>Invoice</span>
            <span style={{color:'#1E9952'}}>Flow</span>
          </div>
          <div className="h-mono" style={{fontSize:9, color:'var(--ink-6)', letterSpacing:'0.22em', marginLeft:8}}>SETUP</div>
        </div>

        <div className="h-row" style={{gap:6}}>
          {Array.from({length: total}).map((_, i) => (
            <div key={i} style={{
              width: i+1 === step ? 56 : 28, height:6,
              borderRadius:3,
              background: i+1 <= step ? 'var(--ink-2)' : 'var(--line-faint)',
              transition:'width .2s',
            }}/>
          ))}
          <div className="h-mono" style={{fontSize:11, color:'var(--ink-5)', marginLeft:10, letterSpacing:'0.18em'}}>
            STEP {String(step).padStart(2,'0')} / {String(total).padStart(2,'0')}
          </div>
        </div>

        <div className="h-row" style={{gap:14}}>
          <a onClick={handleExit} style={{fontSize:13, color:'var(--ink-5)', textDecoration:'underline', textUnderlineOffset:3, cursor:'pointer'}}>Save & continue later</a>
          <button className="h-iconbtn" title="Exit setup" onClick={handleExit}><HIcon name="x" size={15}/></button>
        </div>
      </div>

      {/* Page header */}
      <div style={{padding:'40px 64px 8px'}}>
        <div className="h-eyebrow">{label}</div>
        <div className="serif" style={{fontSize:46, lineHeight:1.05, letterSpacing:'-0.02em', marginTop:8, maxWidth:880}}>
          {title}
        </div>
        {sub && <div className="h-meta" style={{fontSize:15, marginTop:10, maxWidth:720, lineHeight:1.55}}>{sub}</div>}
      </div>

      {/* Content */}
      <div style={{padding:'24px 64px 24px', flex:1, overflow:'hidden'}}>
        {children}
      </div>

      {/* Sticky footer */}
      <div className="h-row h-between" style={{
        padding:'18px 64px',
        background:'var(--paper)',
        borderTop:'1px solid var(--line-faint)',
      }}>
        <button className="h-btn ghost" onClick={handleBack} style={{borderColor:'var(--line-faint)'}}>
          <HIcon name="chev-l" size={14}/> {secondary || 'Back'}
        </button>
        <div className="h-row" style={{gap:14}}>
          {skip && <a onClick={handleSkip} style={{fontSize:13, color:'var(--ink-5)', textDecoration:'underline', textUnderlineOffset:3, cursor:'pointer', marginRight:10}}>{skip}</a>}
          <button className="h-btn primary lg" onClick={handleNext}>
            {primary || 'Continue'} <HIcon name="arrow-r" size={15}/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 1 · WELCOME
// ────────────────────────────────────────────────────────────
export function HiFiOnbWelcome() {
  const navigate = useNavigate();
  const steps = [
    { n:'01', t:'About your business', d:'Name, address, tax ID. Only what shows on invoices.',  ic:'package',  m:'1 min'  },
    { n:'02', t:'Brand colour',        d:'One accent that drives every invoice you issue.',       ic:'sparkle',  m:'30 sec' },
    { n:'03', t:'Invoice template',    d:'Pick a default, or upload your own as an image.',       ic:'layers',   m:'30 sec' },
    { n:'04', t:'Import clients',      d:'Optional. Drop a CSV or skip for now.',                 ic:'upload',   m:'1 min'  },
    { n:'05', t:'Invite team',         d:'Up to 3 free seats on the trial plan.',                 ic:'users',    m:'1 min'  },
  ];

  return (
    <OnbShell
      step={1} total={6}
      label="WELCOME · STEP 01 OF 06"
      title={<>Let's set up <em style={{color:'var(--ink-5)'}}>your workspace.</em></>}
      sub="Five short steps, about four minutes. You can pause at any point, progress saves automatically."
      primary="Get started"
      secondary="Sign out"
      skip="Skip setup, take me to the empty dashboard"
      onBack={() => navigate('/signin')}
      onNext={() => navigate('/onboarding/business')}
      onSkip={() => navigate('/empty')}
    >
      <div style={{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:14}}>
        {steps.map((s, i) => (
          <div key={i} className="h-card" style={{padding:'18px 18px 20px', position:'relative'}}>
            <div className="h-row h-between" style={{marginBottom:36, display:'flex', justifyContent:'space-between'}}>
              <div className="h-mono" style={{fontSize:11, color:'var(--ink-5)', letterSpacing:'0.18em'}}>{s.n}</div>
              <div className="h-mono" style={{fontSize:10, color:'var(--ink-6)'}}>{s.m}</div>
            </div>
            <div style={{
              width:42, height:42, borderRadius:'50%',
              background:'var(--ink-9)', color:'var(--ink-2)',
              display:'flex', alignItems:'center', justifyContent:'center',
              marginBottom:14,
            }}>
              <HIcon name={s.ic} size={18}/>
            </div>
            <div className="serif" style={{fontSize:22, lineHeight:1.15}}>{s.t}</div>
            <div className="h-meta" style={{fontSize:13, marginTop:6}}>{s.d}</div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop:22, padding:'18px 22px',
        background:'var(--ink-2)', color:'var(--paper)',
        borderRadius:'var(--r-md)',
        display:'flex', alignItems:'center', gap:18,
      }}>
        <div style={{
          width:36, height:36, borderRadius:'50%',
          background:'rgba(255,255,255,0.12)',
          display:'flex', alignItems:'center', justifyContent:'center',
          marginRight: 10
        }}><HIcon name="sparkle" size={17}/></div>
        <div style={{flex:1}}>
          <div className="serif" style={{fontSize:20, color:'var(--paper)'}}>You're on the 14-day trial.</div>
          <div style={{fontSize:13, color:'rgba(255,255,255,0.7)', marginTop:2}}>
            Unlimited invoices, all templates, up to 3 seats. No card on file yet.
          </div>
        </div>
        <div className="h-mono" style={{fontSize:11, letterSpacing:'0.18em', color:'rgba(255,255,255,0.65)'}}>
          14 DAYS LEFT
        </div>
      </div>
    </OnbShell>
  );
}

// ────────────────────────────────────────────────────────────
// 2 · BUSINESS DETAILS
// ────────────────────────────────────────────────────────────
export function HiFiOnbCompany() {
  const navigate = useNavigate();
  return (
    <OnbShell
      step={2} total={6}
      label="BUSINESS · STEP 02 OF 06"
      title={<>Tell us about <em style={{color:'var(--ink-5)'}}>your business.</em></>}
      sub="These details land on every invoice you issue. Skip anything that doesn't apply; you can edit later in Settings → Business."
      skip="Skip for now"
      onBack={() => navigate('/onboarding/welcome')}
      onNext={() => navigate('/onboarding/brand')}
      onSkip={() => navigate('/onboarding/brand')}
    >
      <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:36}}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
          <div style={{gridColumn:'1 / -1'}}>
            <Field label="Legal name" hint="as registered">
              <div className="h-input"><input placeholder="e.g. Your Business Ltd."/></div>
            </Field>
          </div>
          <div style={{gridColumn:'1 / -1'}}>
            <Field label="Display name" hint="shown on invoices">
              <div className="h-input"><input placeholder="e.g. Your Business"/></div>
            </Field>
          </div>
          <Field label="Country">
            <div className="h-input">
              <input placeholder="Pick a country"/>
              <HIcon name="chev-d" size={14} color="var(--ink-5)"/>
            </div>
          </Field>
          <Field label="Currency">
            <div className="h-input">
              <input placeholder="Pick a currency"/>
              <HIcon name="chev-d" size={14} color="var(--ink-5)"/>
            </div>
          </Field>
          <Field label="Tax ID" hint="GSTIN, VAT, EIN, ABN; optional">
            <div className="h-input"><input placeholder="leave blank if none"/></div>
          </Field>
          <Field label="Business type" hint="optional">
            <div className="h-input">
              <input placeholder="e.g. IT services, retail, freelance"/>
              <HIcon name="chev-d" size={14} color="var(--ink-5)"/>
            </div>
          </Field>
          <div style={{gridColumn:'1 / -1'}}>
            <Field label="Registered address">
              <div className="h-input" style={{alignItems:'flex-start', paddingTop:14, paddingBottom:14}}>
                <textarea
                  placeholder="Street, city, postal code, country"
                  style={{flex:1, border:0, outline:0, background:'transparent', resize:'none', font:'inherit', color:'inherit', minHeight:64}}/>
              </div>
            </Field>
          </div>
          <Field label="Contact phone">
            <div className="h-input"><input placeholder="+ country code, number"/></div>
          </Field>
          <Field label="Public email">
            <div className="h-input"><HIcon name="mail" size={14} color="var(--ink-5)"/><input placeholder="billing@yourbusiness.com"/></div>
          </Field>
        </div>

        <div>
          <div className="h-eyebrow" style={{fontSize:9}}>LIVE PREVIEW · YOUR INVOICE FOOTER</div>
          <div style={{
            background:'var(--paper)', border:'1px solid var(--line-faint)',
            borderRadius:'var(--r-md)', padding:20, marginTop:10, boxShadow:'var(--sh-1)',
          }}>
            <div style={{
              borderTop:'1.5px dashed var(--line-soft)',
              paddingTop:14, marginBottom:14,
              display:'flex', gap:14, alignItems:'flex-start',
            }}>
              <div style={{
                width:28, height:28, borderRadius:'50%',
                background:'var(--paper-3)', color:'var(--ink-5)',
                border:'1px dashed var(--line-soft)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:'var(--serif)', fontSize:14, flex:'0 0 auto',
                marginRight: 10
              }}>?</div>
              <div style={{flex:1, minWidth:0}}>
                <div className="serif" style={{fontSize:18, lineHeight:1.15, color:'var(--ink-6)'}}>Your display name</div>
                <div className="h-meta" style={{fontSize:11, marginTop:2, color:'var(--ink-6)'}}>Your legal name</div>
              </div>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 14px', fontSize:11, color:'var(--ink-6)'}}>
              <div>
                <div className="h-eyebrow" style={{fontSize:8}}>ADDRESS</div>
                <div style={{marginTop:3, lineHeight:1.45}}>Registered address<br/>City, postal code</div>
              </div>
              <div>
                <div className="h-eyebrow" style={{fontSize:8}}>CONTACT</div>
                <div style={{marginTop:3, lineHeight:1.45}}>Phone<br/>Public email</div>
              </div>
              <div>
                <div className="h-eyebrow" style={{fontSize:8}}>TAX ID</div>
                <div className="h-mono" style={{marginTop:3, fontSize:11}}>—</div>
              </div>
              <div>
                <div className="h-eyebrow" style={{fontSize:8}}>CURRENCY</div>
                <div className="h-mono" style={{marginTop:3, fontSize:11}}>—</div>
              </div>
            </div>
            <div style={{
              marginTop:14, padding:'8px 0 0',
              borderTop:'1px solid var(--line-faint)',
              fontFamily:'var(--mono)', fontSize:8, letterSpacing:'0.18em',
              color:'var(--ink-6)', textAlign:'center',
            }}>
              <span style={{display:'inline-block', width:5, height:5, borderRadius:'50%', background:'var(--brand-accent, var(--ink-2))', verticalAlign:'middle', marginRight:6}}/>
              YOUR FOOTER LINE WILL APPEAR HERE
            </div>
          </div>

          <div style={{
            marginTop:14, padding:'12px 14px',
            background:'var(--ink-9)', borderRadius:'var(--r-md)',
            display:'flex', gap:10, alignItems:'flex-start',
          }}>
            <div style={{marginRight: 8, marginTop: 2}}><HIcon name="sparkle" size={14} color="var(--ink-2)"/></div>
            <div style={{fontSize:12, color:'var(--ink-3)', lineHeight:1.55}}>
              <strong style={{color:'var(--ink-2)'}}>Heads-up.</strong> The footer above shows on every invoice you issue. The preview updates live as you type.
            </div>
          </div>
        </div>
      </div>
    </OnbShell>
  );
}

// ────────────────────────────────────────────────────────────
// 3 · BRAND COLOUR
// ────────────────────────────────────────────────────────────
export function HiFiOnbBrand() {
  const navigate = useNavigate();
  const palettes = [
    { name:'Forest',     accent:'#2D5C4F', dark:'#102C26' },
    { name:'Indigo',     accent:'#4F46E5', dark:'#2A2099' },
    { name:'Burgundy',   accent:'#A0344E', dark:'#5B1C2A' },
    { name:'Mustard',    accent:'#C8902B', dark:'#7A5817' },
    { name:'Navy',       accent:'#1E3A5F', dark:'#0E1B33' },
    { name:'Terracotta', accent:'#C26A4E', dark:'#7A3B26' },
    { name:'Charcoal',   accent:'#3A3A3A', dark:'#1A1A1A' },
    { name:'Plum',       accent:'#5B3A6E', dark:'#2F1C42' },
  ];
  const active = 'Forest';

  return (
    <OnbShell
      step={3} total={6}
      label="BRAND · STEP 03 OF 06"
      title={<>Pick a <em style={{color:'var(--ink-5)'}}>colour</em> for your invoices.</>}
      sub="One accent does the work: header bands, totals, footer dot. You'll see it preview live on the right."
      onBack={() => navigate('/onboarding/business')}
      onNext={() => navigate('/onboarding/template')}
    >
      <div style={{display:'grid', gridTemplateColumns:'1.1fr 1fr', gap:36}}>
        <div>
          <div className="h-eyebrow" style={{fontSize:9}}>PRESETS</div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginTop:12}}>
            {palettes.map(p => {
              const on = p.name === active;
              return (
                <div key={p.name} style={{
                  borderRadius:'var(--r-md)',
                  border: '1.5px solid ' + (on ? 'var(--ink-2)' : 'var(--line-faint)'),
                  padding:14, cursor:'pointer', background:'var(--paper)',
                  position:'relative',
                }}>
                  {on && <div style={{
                    position:'absolute', top:10, right:10,
                    width:20, height:20, borderRadius:'50%',
                    background:'var(--ink-2)', color:'var(--paper)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}><HIcon name="check" size={12} strokeWidth={2.4}/></div>}
                  <div style={{display:'flex', gap:6, marginBottom:10}}>
                    <div style={{width:34, height:34, borderRadius:8, background:p.dark}}/>
                    <div style={{width:22, height:34, borderRadius:8, background:p.accent}}/>
                    <div style={{width:14, height:34, borderRadius:8, background:'var(--paper-3)', border:'1px solid var(--line-faint)'}}/>
                  </div>
                  <div style={{fontSize:13, fontWeight:500, color:'var(--ink-2)'}}>{p.name}</div>
                  <div className="h-mono" style={{fontSize:10, color:'var(--ink-5)', marginTop:2}}>{p.accent}</div>
                </div>
              );
            })}
          </div>

          <div className="h-eyebrow" style={{fontSize:9, marginTop:22}}>CUSTOM HEX</div>
          <div className="h-row" style={{gap:12, marginTop:10, display: 'flex'}}>
            <div className="h-input" style={{flex:1, maxWidth:240, display: 'flex', alignItems: 'center'}}>
              <div style={{width:18, height:18, borderRadius:5, background:'#2D5C4F', flex:'0 0 auto', marginRight: 10}}/>
              <input defaultValue="#2D5C4F" className="h-mono" style={{fontFamily:'var(--mono)', fontSize:13}}/>
            </div>
            <button className="h-btn ghost"><HIcon name="upload" size={14}/> Upload logo</button>
          </div>

          <div style={{
            marginTop:24, padding:'14px 16px',
            background:'var(--paper-3)',
            border:'1px dashed var(--line-soft)',
            borderRadius:'var(--r-md)',
            display:'flex', gap:12, alignItems: 'flex-start'
          }}>
            <div style={{marginRight: 10}}><HIcon name="eye" size={16} color="var(--ink-3)"/></div>
            <div style={{fontSize:12, color:'var(--ink-3)', lineHeight:1.55}}>
              <strong style={{color:'var(--ink-2)'}}>Contrast check passed.</strong> Forest #2D5C4F on white reads AAA at body sizes and AA at small.
            </div>
          </div>
        </div>

        <div>
          <div className="h-eyebrow" style={{fontSize:9}}>LIVE INVOICE PREVIEW</div>
          <div style={{
            marginTop:10,
            padding:'28px 22px',
            background:'var(--paper-3)',
            borderRadius:'var(--r-md)',
            display:'flex', justifyContent:'center',
          }}>
            <div style={{
              width:300, aspectRatio:'1 / 1.414',
              background:'#fff', borderRadius:6,
              boxShadow:'var(--sh-3)',
              display:'flex', flexDirection:'column', overflow:'hidden', fontSize:9,
            }}>
              <div style={{background:'#2D5C4F', color:'#fff', padding:'16px 18px'}}>
                <div className="h-mono" style={{fontSize:7, letterSpacing:'0.22em', opacity:0.7}}>INVOICE · #00001</div>
                <div className="serif" style={{fontSize:22, lineHeight:1, marginTop:6, color:'#fff'}}>Your business</div>
                <div style={{fontSize:9, marginTop:4, opacity:0.75}}>Sample preview, replace with your data</div>
              </div>
              <div style={{padding:'14px 18px', flex:1}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:10}}>
                  <div><div className="h-mono" style={{fontSize:6.5, letterSpacing:'0.22em', color:'#888'}}>BILL TO</div><div style={{fontSize:10, fontWeight:600, color:'#1A1A1A', marginTop:2}}>Client name</div></div>
                  <div style={{textAlign:'right'}}><div className="h-mono" style={{fontSize:6.5, letterSpacing:'0.22em', color:'#888'}}>ISSUED</div><div style={{fontSize:10, color:'#1A1A1A', marginTop:2}}>DD MMM YYYY</div></div>
                </div>
                <div style={{height:1, background:'#eee', margin:'10px 0'}}/>
                <div style={{display:'flex', flexDirection:'column', gap:6, fontSize:9, color:'#1A1A1A'}}>
                  <div className="h-row h-between" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Line item one</span><span className="h-mono">000.00</span></div>
                  <div className="h-row h-between" style={{ display: 'flex', justifyContent: 'space-between' }}><span>Line item two</span><span className="h-mono">000.00</span></div>
                  <div className="h-row h-between" style={{display: 'flex', justifyContent: 'space-between', color:'#666'}}><span>Tax</span><span className="h-mono">000.00</span></div>
                </div>
                <div style={{marginTop:14, paddingTop:10, borderTop:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
                  <div className="h-mono" style={{fontSize:7, letterSpacing:'0.22em', color:'#888'}}>TOTAL</div>
                  <div style={{fontFamily:'var(--sans)', fontSize:18, fontWeight:700, color:'#2D5C4F', letterSpacing:'-0.01em'}}>0,000.00</div>
                </div>
              </div>
              <div style={{
                padding:'8px 18px', borderTop:'1px solid #eee',
                fontFamily:'var(--mono)', fontSize:6.5, letterSpacing:'0.18em',
                color:'#888', textAlign:'right',
              }}>
                <span style={{display:'inline-block', width:4, height:4, borderRadius:'50%', background:'#2D5C4F', verticalAlign:'middle', marginRight:6}}/>
                YOUR FOOTER
              </div>
            </div>
          </div>
        </div>
      </div>
    </OnbShell>
  );
}

// ────────────────────────────────────────────────────────────
// 4 · INVOICE TEMPLATE
// ────────────────────────────────────────────────────────────
export function HiFiOnbTemplate() {
  const navigate = useNavigate();
  const tmpl = [
    { n:'01', t:'Corporate',      d:'Dark panel, accent header bar, classic table.',     pick:false },
    { n:'02', t:'Modern minimal', d:'Generous white, oversized totals, no borders.',     pick:true  },
    { n:'03', t:'Studio',         d:'Two-column with logo block, soft tinted rows.',     pick:false },
    { n:'04', t:'Classic',        d:'Newspaper-style serif, condensed header rule.',     pick:false },
    { n:'05', t:'Creative',       d:'Coloured side strip, large brand crest, italic.',   pick:false },
  ];

  return (
    <OnbShell
      step={4} total={6}
      label="TEMPLATE · STEP 04 OF 06"
      title={<>Pick a <em style={{color:'var(--ink-5)'}}>default</em> invoice template.</>}
      sub="Or skip the picker entirely. Upload an image of an existing invoice and we'll rebuild it as an Invoice Flow template from scratch."
      onBack={() => navigate('/onboarding/brand')}
      onNext={() => navigate('/onboarding/import')}
    >
      <div style={{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:14}}>
        {tmpl.map((t, i) => (
          <div key={i} style={{
            border:'1.5px solid ' + (t.pick ? 'var(--ink-2)' : 'var(--line-faint)'),
            borderRadius:'var(--r-md)',
            background:'var(--paper)',
            padding:'14px 14px 18px',
            cursor:'pointer',
            position:'relative',
            boxShadow: t.pick ? 'var(--sh-2)' : 'var(--sh-1)',
          }}>
            {t.pick && <div style={{
              position:'absolute', top:12, right:12,
              width:22, height:22, borderRadius:'50%',
              background:'var(--ink-2)', color:'var(--paper)',
              display:'flex', alignItems:'center', justifyContent:'center',
              zIndex:2,
            }}><HIcon name="check" size={12} strokeWidth={2.4}/></div>}

            <div className="h-mono" style={{fontSize:10, color:'var(--ink-5)', letterSpacing:'0.18em', marginBottom:10}}>{t.n}</div>

            <div style={{
              aspectRatio:'7 / 10',
              borderRadius:'var(--r-sm)',
              background:'#fff',
              border:'1px solid var(--line-faint)',
              padding:10,
              display:'flex', flexDirection:'column', gap:4,
            }}>
              <div style={{height:6, background:'var(--brand-accent, var(--ink-2))', width:'40%'}}/>
              <div style={{height:14, background:'var(--ink-2)', width:'70%', marginTop:6}}/>
              <div style={{height:3, background:'var(--ink-7)', width:'50%', marginTop:6}}/>
              <div style={{flex:1}}/>
              {[1,2,3,4].map(j => <div key={j} style={{height:3, background:'var(--paper-4)'}}/>)}
              <div style={{height:12, background:'var(--brand-accent, var(--ink-4))', width:'60%', alignSelf:'flex-end', marginTop:8}}/>
            </div>

            <div className="serif" style={{fontSize:20, lineHeight:1.15, marginTop:14}}>{t.t}</div>
            <div className="h-meta" style={{fontSize:12, marginTop:4}}>{t.d}</div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop:18,
        border:'1.5px dashed var(--ink-4)',
        borderRadius:'var(--r-md)',
        padding:'18px 22px',
        background:'var(--ink-9)',
        display:'flex', alignItems:'center', gap:18,
      }}>
        <div style={{
          width:44, height:44, borderRadius:'50%',
          background:'var(--ink-2)', color:'var(--paper)',
          display:'flex', alignItems:'center', justifyContent:'center',
          flex:'0 0 auto',
          marginRight: 10
        }}><HIcon name="upload" size={18}/></div>
        <div style={{flex:1}}>
          <div className="serif" style={{fontSize:20, lineHeight:1.15, color:'var(--ink-2)'}}>
            Have an existing invoice? <em style={{color:'var(--ink-5)'}}>Upload it.</em>
          </div>
          <div className="h-meta" style={{fontSize:13, marginTop:4, maxWidth:640}}>
            Drop in a JPG, PNG, or PDF of an invoice you already use. We'll analyse the layout, map every field, and rebuild it as a fully editable Invoice Flow template.
          </div>
        </div>
        <button className="h-btn primary" onClick={() => navigate('/template-gen/upload')}>
          Upload custom <HIcon name="arrow-r" size={14}/>
        </button>
      </div>
    </OnbShell>
  );
}

// ────────────────────────────────────────────────────────────
// 5 · IMPORT CLIENTS (optional)
// ────────────────────────────────────────────────────────────
export function HiFiOnbImport() {
  const navigate = useNavigate();
  return (
    <OnbShell
      step={5} total={6}
      label="CLIENTS · STEP 05 OF 06 · OPTIONAL"
      title={<>Bring your <em style={{color:'var(--ink-5)'}}>clients</em> across.</>}
      sub="Drop a .csv or .xlsx and we'll auto-map columns. Don't have a list yet? Skip this, you can add clients one at a time later."
      primary="Continue"
      skip="Skip, I'll add clients later"
      onBack={() => navigate('/onboarding/template')}
      onNext={() => navigate('/onboarding/invite')}
      onSkip={() => navigate('/onboarding/invite')}
    >
      <div style={{display:'grid', gridTemplateColumns:'1.1fr 1fr', gap:36}}>
        <div>
          <div style={{
            border:'1.5px dashed var(--ink-4)',
            borderRadius:'var(--r-lg)',
            background:'var(--ink-9)',
            padding:'48px 36px',
            display:'flex', flexDirection:'column', alignItems:'center',
            textAlign:'center',
          }}>
            <div style={{
              width:64, height:64, borderRadius:'50%',
              background:'var(--ink-2)', color:'var(--paper)',
              display:'flex', alignItems:'center', justifyContent:'center',
              marginBottom:18,
            }}>
              <HIcon name="upload" size={28} strokeWidth={1.6}/>
            </div>
            <div className="serif" style={{fontSize:30, lineHeight:1.1}}>Drop your client list</div>
            <div className="h-meta" style={{fontSize:13, marginTop:6, maxWidth:380}}>
              CSV, Excel, Numbers, Google Sheets exports. Up to 5,000 rows per file.
            </div>
            <div className="h-row" style={{gap:10, marginTop:18, display: 'flex', justifyContent: 'center'}}>
              <button className="h-btn primary" style={{marginRight: 10}}><HIcon name="upload" size={14}/> Choose file</button>
              <button className="h-btn"><HIcon name="download" size={14}/> Sample.csv</button>
            </div>
          </div>

          <div style={{
            marginTop:16, padding:'14px 18px',
            background:'var(--paper-2)',
            border:'1px dashed var(--line-soft)',
            borderRadius:'var(--r-md)',
            display:'flex', alignItems:'center', gap:14,
          }}>
            <div style={{
              width:38, height:46, borderRadius:6,
              background:'var(--paper-3)', color:'var(--ink-6)',
              border:'1px dashed var(--line-soft)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'var(--mono)', fontSize:10, fontWeight:600,
              flex:'0 0 auto',
              marginRight: 10
            }}>CSV</div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:14, fontWeight:500, color:'var(--ink-5)'}}>No file selected yet</div>
              <div className="h-meta" style={{fontSize:12, marginTop:2}}>Drop a file above, or skip this step. You can always import later from Settings → Clients.</div>
            </div>
          </div>
        </div>

        <div>
          <div className="h-eyebrow" style={{fontSize:9}}>COLUMNS WE LOOK FOR</div>
          <div style={{
            marginTop:10,
            background:'var(--paper)',
            border:'1px solid var(--line-faint)',
            borderRadius:'var(--r-md)',
            overflow:'hidden',
          }}>
            {[
              ['Client name',     'required'],
              ['Company',         'optional'],
              ['Email',           'required'],
              ['Phone',           'optional'],
              ['Billing address', 'optional'],
              ['Tax ID',          'optional'],
              ['Default currency','optional'],
              ['Notes',           'optional'],
            ].map((r, i) => (
              <div key={i} className="h-row" style={{
                padding:'12px 14px', display:'flex', justifyContent: 'space-between',
                borderBottom: i < 7 ? '1px solid var(--line-faint)' : 'none',
                fontSize:13,
              }}>
                <div style={{flex:1, fontWeight:500}}>{r[0]}</div>
                <span className={'h-status ' + (r[1] === 'required' ? 'ok' : 'muted')} style={{fontSize:9}}>
                  {r[1].toUpperCase()}
                </span>
              </div>
            ))}
          </div>

          <div className="h-meta" style={{fontSize:12, marginTop:10, lineHeight:1.55}}>
            We map columns by header name. If your headers don't match, we'll ask you to confirm the mapping on the next screen.
          </div>
        </div>
      </div>
    </OnbShell>
  );
}

// ────────────────────────────────────────────────────────────
// 6 · INVITE TEAM (optional)
// ────────────────────────────────────────────────────────────
export function HiFiOnbInvite() {
  const navigate = useNavigate();
  return (
    <OnbShell
      step={6} total={6}
      label="TEAM · STEP 06 OF 06 · OPTIONAL"
      title={<>Invite your <em style={{color:'var(--ink-5)'}}>team</em> along.</>}
      sub="Up to 3 free seats on the trial. Invitees set their own password; you choose what they can see."
      primary="Send invites & finish"
      skip="Skip, invite people later"
      onBack={() => navigate('/onboarding/import')}
      onNext={() => navigate('/onboarding/ready')}
      onSkip={() => navigate('/onboarding/ready')}
    >
      <div style={{display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:36}}>
        <div>
          <div className="h-eyebrow" style={{fontSize:9}}>INVITE BY EMAIL</div>
          <div style={{
            marginTop:10,
            background:'var(--paper)',
            border:'1px solid var(--line-faint)',
            borderRadius:'var(--r-md)',
            overflow:'hidden',
          }}>
            {[0,1,2].map((_, i) => (
              <div key={i} className="h-row" style={{
                padding:'12px 14px', display: 'flex', alignItems: 'center', gap:10,
                borderBottom: '1px solid var(--line-faint)',
              }}>
                <div className="h-input" style={{flex:1, padding:'8px 14px', display: 'flex', alignItems: 'center'}}>
                  <div style={{marginRight: 8, marginTop: 2}}><HIcon name="mail" size={13} color="var(--ink-5)"/></div>
                  <input placeholder={i === 0 ? 'teammate@yourbusiness.com' : 'add another email'} style={{width:'100%'}}/>
                </div>
                <div className="h-input" style={{width:180, padding:'8px 14px', display: 'flex', alignItems: 'center'}}>
                  <input defaultValue={i === 0 ? 'Admin' : i === 1 ? 'Issuer' : 'Viewer'} readOnly style={{width:'100%'}}/>
                  <HIcon name="chev-d" size={13} color="var(--ink-5)"/>
                </div>
                <button className="h-iconbtn"><HIcon name="trash" size={14}/></button>
              </div>
            ))}
            <div style={{padding:'12px 14px'}}>
              <button className="h-btn ghost" style={{borderStyle:'dashed', width:'100%', justifyContent:'center'}}>
                <HIcon name="plus" size={14}/> Add another teammate
              </button>
            </div>
          </div>

          <div className="h-eyebrow" style={{fontSize:9, marginTop:22}}>MESSAGE · OPTIONAL</div>
          <div className="h-input" style={{marginTop:8, alignItems:'flex-start', padding:'12px 16px'}}>
            <textarea
              placeholder={"Add a short note. They'll see this in the invite email. Leave blank for the default."}
              style={{flex:1, border:0, outline:0, background:'transparent', resize:'none', font:'inherit', color:'inherit', minHeight:84, lineHeight:1.55}}/>
          </div>
        </div>

        <div>
          <div className="h-eyebrow" style={{fontSize:9}}>ROLE PERMISSIONS</div>
          <div style={{display:'flex', flexDirection:'column', gap:10, marginTop:10}}>
            {[
              {r:'Admin',  d:'Full access. Manage billing, templates, team, settings.', ic:'settings'},
              {r:'Issuer', d:'Generate invoices, edit clients. No billing access.',    ic:'file'},
              {r:'Viewer', d:'Read-only access to dashboard, ledger, downloads.',       ic:'eye'},
            ].map((p, i) => (
              <div key={i} className="h-card" style={{padding:'14px 16px', display:'flex', gap:12, alignItems:'flex-start'}}>
                <div style={{
                  width:34, height:34, borderRadius:'50%',
                  background:'var(--ink-9)', color:'var(--ink-2)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flex:'0 0 auto',
                  marginRight: 10
                }}><HIcon name={p.ic} size={16}/></div>
                <div style={{flex:1}}>
                  <div className="h-row h-between" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{fontSize:14, fontWeight:600, color:'var(--ink-2)'}}>{p.r}</div>
                    <div className="h-mono" style={{fontSize:10, color:'var(--ink-5)'}}>SEAT</div>
                  </div>
                  <div className="h-meta" style={{fontSize:12, marginTop:2, lineHeight:1.5}}>{p.d}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="h-row" style={{
            marginTop:18, padding:'14px 16px',
            background:'var(--ink-2)', color:'var(--paper)',
            borderRadius:'var(--r-md)', display:'flex', alignItems:'center', gap:12,
          }}>
            <div style={{marginRight: 8}}><HIcon name="sparkle" size={16}/></div>
            <div style={{flex:1, fontSize:12, lineHeight:1.5}}>
              Up to <strong>3 trial seats</strong> at no charge. Need more? Upgrade later, no interruption.
            </div>
          </div>
        </div>
      </div>
    </OnbShell>
  );
}

// ────────────────────────────────────────────────────────────
// 7 · READY
// ────────────────────────────────────────────────────────────
export function HiFiOnbReady() {
  const navigate = useNavigate();
  return (
    <div className="h" style={{
      width:'100%', height:'100%',
      background:'var(--mesh-deep)',
      color:'var(--paper)',
      display:'flex', flexDirection:'column',
      position:'relative', overflow:'hidden',
    }}>
      <svg width="900" height="900" viewBox="0 0 900 900" style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)', opacity:0.10}}>
        {[420, 340, 260, 180, 100].map((r, i) => (
          <circle key={i} cx="450" cy="450" r={r} stroke="white" strokeWidth="1" fill="none"/>
        ))}
      </svg>

      <div className="h-row h-between" style={{padding:'22px 36px', position:'relative', zIndex:1, display: 'flex', justifyContent: 'space-between'}}>
        <div className="h-row" style={{gap:10, alignItems:'center', display: 'flex'}}>
          <img src="/assets/invoice-flow-icon-light.png" alt="Invoice Flow" width="28" height="28" style={{display:'block', flex:'0 0 auto', marginRight: 8}}/>
          <div style={{display:'inline-flex', alignItems:'baseline', gap:'0.22em', fontFamily:"'DM Sans', system-ui, sans-serif", fontWeight:700, fontSize:20, letterSpacing:'-0.025em', lineHeight:1}}>
            <span style={{color:'#fff'}}>Invoice</span>
            <span style={{color:'#9FD9B8'}}>Flow</span>
          </div>
        </div>
        <div className="h-mono" style={{fontSize:11, color:'rgba(255,255,255,0.55)', letterSpacing:'0.18em'}}>SETUP · COMPLETE</div>
      </div>

      <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', zIndex:1}}>
        <div style={{textAlign:'center', maxWidth:760, padding:'0 40px'}}>
          <div style={{
            width:84, height:84, borderRadius:'50%',
            background:'var(--paper)', color:'var(--ink-2)',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 30px',
            boxShadow:'0 10px 40px rgba(0,0,0,0.3)',
          }}>
            <HIcon name="check" size={42} strokeWidth={2}/>
          </div>

          <div className="h-eyebrow" style={{color:'rgba(255,255,255,0.6)'}}>YOUR WORKSPACE IS READY</div>
          <div className="serif" style={{fontSize:84, lineHeight:1, letterSpacing:'-0.025em', marginTop:18}}>
            You're ready<br/>
            <em style={{color:'rgba(255,255,255,0.65)'}}>to invoice.</em>
          </div>
          <div style={{fontSize:17, color:'rgba(255,255,255,0.7)', marginTop:22, lineHeight:1.55, maxWidth:560, margin:'22px auto 0'}}>
            Your workspace is set up. You can edit any of this from Settings, and you can always come back to upload more templates or clients.
          </div>

          <div style={{display:'flex', justifyContent:'center', gap:34, marginTop:34}}>
            {[
              ['Business',   'details saved'],
              ['Brand',      'colour set'],
              ['Template',   'default picked'],
              ['Team',       'seats reserved'],
            ].map(([v, l], i) => (
              <div key={i} style={{ margin: '0 10px' }}>
                <div className="h-row" style={{gap:8, justifyContent:'center', display: 'flex', alignItems: 'center'}}>
                  <div style={{
                    width:18, height:18, borderRadius:'50%',
                    background:'var(--paper)', color:'var(--ink-2)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    marginRight: 6
                  }}><HIcon name="check" size={11} strokeWidth={2.4}/></div>
                  <div className="serif" style={{fontSize:24, lineHeight:1}}>{v}</div>
                </div>
                <div className="h-mono" style={{fontSize:10, color:'rgba(255,255,255,0.55)', letterSpacing:'0.18em', marginTop:6, textTransform:'uppercase'}}>{l}</div>
              </div>
            ))}
          </div>

          <div className="h-row" style={{gap:12, justifyContent:'center', marginTop:42, display: 'flex'}}>
            <button className="h-btn lg" onClick={() => navigate('/empty')} style={{background:'var(--paper)', color:'var(--ink-2)', borderColor:'var(--paper)', padding:'16px 28px', marginRight: 10}}>
              Open dashboard <HIcon name="arrow-r" size={15}/>
            </button>
            <button className="h-btn lg" onClick={() => navigate('/single')} style={{background:'transparent', borderColor:'rgba(255,255,255,0.35)', color:'var(--paper)'}}>
              <HIcon name="file" size={15}/> Issue your first invoice
            </button>
          </div>

          <div className="h-mono" style={{fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:32, letterSpacing:'0.18em'}}>
            QUICKSTART · ⌘K TO SEARCH · ? FOR HELP
          </div>
        </div>
      </div>
    </div>
  );
}
