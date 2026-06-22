import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HIcon from '../components/HIcon.jsx';
import Invoice from '../components/Invoice.jsx';

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

function TplShell({ step, total, label, title, sub, children, primary, secondary, skip, dark, onNext, onBack, onSkip, onExit }) {
  const navigate = useNavigate();
  const fg = dark ? 'var(--paper)' : 'var(--ink-2)';
  const mute = dark ? 'rgba(255,255,255,0.65)' : 'var(--ink-5)';
  
  const handleNext = onNext || (() => navigate('/templates'));
  const handleBack = onBack || (() => navigate('/templates'));
  const handleSkip = onSkip || (() => navigate('/templates'));
  const handleExit = onExit || (() => navigate('/templates'));

  return (
    <div className="h" style={{
      width:'100%', height:'100%',
      background: dark ? 'var(--mesh-deep)' : 'var(--paper-2)',
      color: fg,
      display:'flex', flexDirection:'column',
      position:'relative', overflow:'hidden',
    }}>
      <div className="h-row h-between" style={{
        padding:'22px 36px',
        borderBottom: '1px solid ' + (dark ? 'rgba(255,255,255,0.08)' : 'var(--line-faint)'),
        background: dark ? 'transparent' : 'var(--paper)',
        position:'relative', zIndex:2,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div className="h-row" style={{gap:10, display: 'flex', alignItems: 'center'}}>
          <img src="/assets/invoice-flow-icon-transparent.png" alt="Invoice Flow" width="28" height="28" style={{display:'block', flex:'0 0 auto', marginRight: 8}}/>
          <div style={{display:'inline-flex', alignItems:'baseline', gap:'0.22em', fontFamily:"'DM Sans', system-ui, sans-serif", fontWeight:700, fontSize:20, letterSpacing:'-0.025em', lineHeight:1}}><span style={{color:'var(--ink-2)'}}>Invoice</span><span style={{color:'#1E9952'}}>Flow</span></div>
          <div className="h-mono" style={{fontSize:9, color: mute, letterSpacing:'0.22em', marginLeft:8}}>CUSTOM TEMPLATE</div>
        </div>

        <div className="h-row" style={{gap:6, display: 'flex', alignItems: 'center'}}>
          {Array.from({length: total}).map((_, i) => (
            <div key={i} style={{
              width: i+1 === step ? 56 : 28, height:6,
              borderRadius:3,
              background: i+1 <= step
                ? (dark ? 'var(--paper)' : 'var(--ink-2)')
                : (dark ? 'rgba(255,255,255,0.18)' : 'var(--line-faint)'),
              transition:'width .2s',
            }}/>
          ))}
          <div className="h-mono" style={{fontSize:11, color: mute, marginLeft:10, letterSpacing:'0.18em'}}>
            STEP {String(step).padStart(2,'0')} / {String(total).padStart(2,'0')}
          </div>
        </div>

        <div className="h-row" style={{gap:14, display: 'flex', alignItems: 'center'}}>
          <a onClick={handleExit} style={{fontSize:13, color: mute, textDecoration:'underline', textUnderlineOffset:3, cursor:'pointer', marginRight: 10}}>Save & continue later</a>
          <button className="h-iconbtn" onClick={handleExit} style={dark ? {background:'transparent', borderColor:'rgba(255,255,255,0.18)', color:'var(--paper)'} : null} title="Exit"><HIcon name="x" size={15}/></button>
        </div>
      </div>

      <div style={{padding:'36px 64px 8px', position:'relative', zIndex:2}}>
        <div className="h-eyebrow" style={{color: mute}}>{label}</div>
        <div className="serif" style={{fontSize:44, lineHeight:1.05, letterSpacing:'-0.02em', marginTop:8, maxWidth:980, color: fg}}>
          {title}
        </div>
        {sub && <div style={{fontSize:15, marginTop:10, maxWidth:780, lineHeight:1.55, color: mute}}>{sub}</div>}
      </div>

      <div style={{padding:'20px 64px 20px', flex:1, overflow:'hidden', position:'relative', zIndex:2}}>
        {children}
      </div>

      {(primary || secondary || skip) && (
        <div className="h-row h-between" style={{
          padding:'18px 64px',
          background: dark ? 'transparent' : 'var(--paper)',
          borderTop: '1px solid ' + (dark ? 'rgba(255,255,255,0.08)' : 'var(--line-faint)'),
          position:'relative', zIndex:2,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <button className="h-btn ghost" onClick={handleBack} style={dark ? {borderColor:'rgba(255,255,255,0.22)', color:'var(--paper)', background:'transparent'} : {borderColor:'var(--line-faint)'}}>
            <HIcon name="chev-l" size={14}/> {secondary || 'Back'}
          </button>
          <div className="h-row" style={{gap:14, display: 'flex', alignItems: 'center'}}>
            {skip && <a onClick={handleSkip} style={{fontSize:13, color: mute, textDecoration:'underline', textUnderlineOffset:3, cursor:'pointer', marginRight: 10}}>{skip}</a>}
            {primary && <button className="h-btn primary lg" onClick={handleNext} style={dark ? {background:'var(--paper)', color:'var(--ink-2)', borderColor:'var(--paper)'} : null}>
              {primary} <HIcon name="arrow-r" size={15}/>
            </button>}
          </div>
        </div>
      )}
    </div>
  );
}

function FauxInvoice({ width = 280, overlays = null, scanLine = false, shadow = true, dim = false }) {
  return (
    <div style={{
      width, aspectRatio:'1 / 1.414',
      background:'#fff',
      borderRadius:6,
      boxShadow: shadow ? 'var(--sh-3)' : 'none',
      padding:0,
      display:'flex', flexDirection:'column',
      position:'relative', overflow:'hidden',
      opacity: dim ? 0.55 : 1,
    }}>
      {/* dark top panel like the uploaded sample */}
      <div style={{background:'#1A1A1A', color:'#fff', padding:'14px 16px', position:'relative'}}>
        <div style={{height:6, background:'rgba(255,255,255,0.35)', width:'38%', borderRadius:1}}/>
        <div style={{display:'flex', justifyContent:'space-between', marginTop:14, alignItems:'baseline'}}>
          <div>
            <div style={{height:5, background:'#E89D2C', width:60, borderRadius:1}}/>
            <div style={{height:3, background:'rgba(255,255,255,0.45)', width:50, marginTop:4, borderRadius:1}}/>
            <div style={{height:3, background:'rgba(255,255,255,0.45)', width:62, marginTop:3, borderRadius:1}}/>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:18, fontWeight:800, color:'#E89D2C', letterSpacing:'-0.01em'}}>INVOICE</div>
            <div style={{height:3, background:'rgba(255,255,255,0.4)', width:80, marginTop:5, borderRadius:1, marginLeft:'auto'}}/>
            <div style={{height:3, background:'rgba(255,255,255,0.4)', width:70, marginTop:3, borderRadius:1, marginLeft:'auto'}}/>
          </div>
        </div>
      </div>
      {/* items table */}
      <div style={{flex:1, background:'#1A1A1A', padding:'10px 16px', display:'flex', flexDirection:'column'}}>
        <div style={{height:11, background:'#E89D2C', borderRadius:1, display:'flex', alignItems:'center', padding:'0 6px', gap:8}}>
          {['38%','24%','14%','24%'].map((w,i)=>(<div key={i} style={{height:2, width:w, background:'#1A1A1A', borderRadius:1}}/>))}
        </div>
        {[1,2,3,4,5].map(r => (
          <div key={r} style={{height:11, marginTop:3, display:'flex', alignItems:'center', padding:'0 6px', gap:8, borderBottom:'1px dotted rgba(232,157,44,0.4)'}}>
            <div style={{height:2.5, width:'38%', background:'rgba(255,255,255,0.7)', borderRadius:1}}/>
            <div style={{height:2.5, width:'18%', background:'rgba(255,255,255,0.5)', borderRadius:1}}/>
            <div style={{height:2.5, width:'10%', background:'rgba(255,255,255,0.5)', borderRadius:1}}/>
            <div style={{height:2.5, width:'20%', background:'rgba(255,255,255,0.7)', borderRadius:1}}/>
          </div>
        ))}
        {/* totals + payment */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:14}}>
          <div>
            <div style={{height:4, background:'#E89D2C', width:60, borderRadius:1}}/>
            <div style={{height:2.5, background:'rgba(255,255,255,0.55)', width:'80%', marginTop:6, borderRadius:1}}/>
            <div style={{height:2.5, background:'rgba(255,255,255,0.55)', width:'75%', marginTop:3, borderRadius:1}}/>
          </div>
          <div>
            <div style={{display:'flex', justifyContent:'space-between', marginTop:2}}>
              <div style={{height:3, width:30, background:'rgba(255,255,255,0.55)', borderRadius:1}}/>
              <div style={{height:3, width:18, background:'rgba(255,255,255,0.85)', borderRadius:1}}/>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', marginTop:5}}>
              <div style={{height:3, width:22, background:'rgba(255,255,255,0.55)', borderRadius:1}}/>
              <div style={{height:3, width:14, background:'rgba(255,255,255,0.85)', borderRadius:1}}/>
            </div>
            <div style={{height:12, background:'#E89D2C', marginTop:8, borderRadius:1, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 6px'}}>
              <div style={{height:3, width:24, background:'#1A1A1A', borderRadius:1}}/>
              <div style={{height:3, width:20, background:'#1A1A1A', borderRadius:1}}/>
            </div>
          </div>
        </div>
        <div style={{flex:1}}/>
        {/* terms */}
        <div style={{marginTop:8, display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
          <div>
            <div style={{height:3.5, background:'#E89D2C', width:'60%', borderRadius:1}}/>
            <div style={{height:2, background:'rgba(255,255,255,0.45)', width:'95%', marginTop:4, borderRadius:1}}/>
            <div style={{height:2, background:'rgba(255,255,255,0.45)', width:'88%', marginTop:2, borderRadius:1}}/>
            <div style={{height:2, background:'rgba(255,255,255,0.45)', width:'70%', marginTop:2, borderRadius:1}}/>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{height:2.5, background:'rgba(255,255,255,0.55)', width:'70%', marginLeft:'auto', borderRadius:1}}/>
            <div style={{height:2.5, background:'rgba(255,255,255,0.55)', width:'85%', marginTop:3, marginLeft:'auto', borderRadius:1}}/>
          </div>
        </div>
      </div>

      {/* overlay slot detection boxes, scan lines */}
      {overlays}
      {scanLine && <div style={{
        position:'absolute', left:0, right:0, top:0,
        height:60, pointerEvents:'none',
        background:'linear-gradient(180deg, transparent 0%, rgba(168,199,187,0.45) 50%, transparent 100%)',
        animation:'tpl-scan 1.8s linear infinite',
      }}/>}

      <style>{`
        @keyframes tpl-scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(${Math.round(width * 1.414)}px); }
        }
      `}</style>
    </div>
  );
}

function GenShell({ pct, eyebrow, title, sub, stage, stageList, sideBody, bigPanel, nextRoute }) {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      if (nextRoute) navigate(nextRoute);
    }, 2200);
    return () => clearTimeout(t);
  }, [nextRoute, navigate]);

  return (
    <TplShell
      step={3} total={4} dark
      label={'GENERATING · STEP 03 OF 04 · ' + String(pct).padStart(2,'0') + '%'}
      title={title}
      sub={sub}
    >
      <div style={{display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:36, height:'100%'}}>
        {/* big visual panel */}
        <div style={{
          background:'rgba(255,255,255,0.04)',
          border:'1px solid rgba(255,255,255,0.10)',
          borderRadius:'var(--r-lg)',
          padding:'30px 30px',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          backdropFilter:'blur(6px)',
          position:'relative', overflow:'hidden',
        }}>
          {bigPanel}
        </div>

        {/* status sidebar */}
        <div style={{display:'flex', flexDirection:'column', gap:18}}>
          {/* progress block */}
          <div style={{
            background:'rgba(255,255,255,0.04)',
            border:'1px solid rgba(255,255,255,0.10)',
            borderRadius:'var(--r-md)',
            padding:'18px 20px',
            backdropFilter:'blur(6px)',
          }}>
            <div className="h-row h-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="h-eyebrow" style={{color:'rgba(255,255,255,0.55)', fontSize:9}}>{eyebrow}</div>
              <div className="h-row" style={{gap:6, display: 'flex', alignItems: 'center'}}>
                <div style={{width:6, height:6, borderRadius:'50%', background:'#A8C7BB', animation:'h-pulse 1.2s ease-in-out infinite', marginRight: 6}}/>
                <div className="h-mono" style={{fontSize:10, color:'rgba(255,255,255,0.7)', letterSpacing:'0.18em'}}>LIVE</div>
              </div>
            </div>
            <div className="serif" style={{fontSize:38, lineHeight:1, marginTop:10, letterSpacing:'-0.02em'}}>{pct}<span style={{fontSize:20, opacity:0.6}}>%</span></div>
            <div style={{height:6, borderRadius:3, background:'rgba(255,255,255,0.10)', marginTop:14, overflow:'hidden'}}>
              <div style={{height:'100%', width: pct+'%', background:'var(--paper)', borderRadius:3, transition:'width .4s'}}/>
            </div>
            <div className="h-row h-between" style={{marginTop:8, fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.15em', color:'rgba(255,255,255,0.45)', display: 'flex', justifyContent: 'space-between'}}>
              <span>ELAPSED · 00:0{Math.round(pct/20)}</span>
              <span>ETA · 00:{String(Math.max(1, Math.round((100-pct)/15))).padStart(2,'0')}</span>
            </div>
          </div>

          {/* stage list */}
          <div style={{
            background:'rgba(255,255,255,0.04)',
            border:'1px solid rgba(255,255,255,0.10)',
            borderRadius:'var(--r-md)',
            padding:'18px 20px',
          }}>
            <div className="h-eyebrow" style={{color:'rgba(255,255,255,0.55)', fontSize:9, marginBottom:14}}>STAGES</div>
            {stageList.map((s, i) => {
              const done = i < stage;
              const live = i === stage;
              return (
                <div key={i} className="h-row" style={{
                  gap:12, padding:'8px 0',
                  borderTop: i ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  opacity: done ? 0.55 : 1,
                  display: 'flex', alignItems: 'center'
                }}>
                  <div style={{
                    width:22, height:22, borderRadius:'50%',
                    background: done ? 'var(--paper)' : 'transparent',
                    border: '1.5px solid ' + (done ? 'var(--paper)' : 'rgba(255,255,255,0.35)'),
                    display:'flex', alignItems:'center', justifyContent:'center',
                    flex:'0 0 auto',
                    color:'var(--ink-2)',
                    marginRight: 10
                  }}>
                    {done && <HIcon name="check" size={11} strokeWidth={2.4}/>}
                    {live && <div style={{width:6, height:6, borderRadius:'50%', background:'var(--paper)', animation:'h-pulse 1.2s ease-in-out infinite'}}/>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13, fontWeight: live ? 600 : 500, color: live ? 'var(--paper)' : 'rgba(255,255,255,0.7)'}}>{s.t}</div>
                    {live && s.sub && <div style={{fontSize:11, color:'rgba(255,255,255,0.55)', marginTop:2, lineHeight:1.5}}>{s.sub}</div>}
                  </div>
                  {done && <div className="h-mono" style={{fontSize:10, color:'rgba(255,255,255,0.45)'}}>OK</div>}
                  {live && <div className="h-mono" style={{fontSize:10, color:'rgba(255,255,255,0.7)'}}>…</div>}
                </div>
              );
            })}
          </div>

          {sideBody}
        </div>
      </div>

      <style>{`
        @keyframes h-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.7); }
        }
      `}</style>
    </TplShell>
  );
}

const GEN_STAGES = [
  { t:'Reading the invoice', sub:'Identifying page geometry, sections, columns, and rules.' },
  { t:'Mapping fields', sub:'Pinning logo, headings, bill-to, items, tax, totals, footer.' },
  { t:'Resolving overlaps', sub:'Checking element collisions, alignment, spacing, print bleed.' },
  { t:'Composing template', sub:'Rebuilding as an editable Invoice Flow template.' },
];

// ────────────────────────────────────────────────────────────
// SCREEN 1 UPLOAD
// ────────────────────────────────────────────────────────────
export function HiFiTplUpload() {
  const navigate = useNavigate();
  return (
    <TplShell
      step={1} total={4}
      label="UPLOAD · STEP 01 OF 04"
      title={<>Bring your own <em style={{color:'var(--ink-5)'}}>invoice.</em></>}
      sub="Drop an image of an existing invoice. We'll analyse the layout, identify every field, and rebuild it as a fully editable Invoice Flow template. Works with PDFs, photos of paper invoices, or PNGs from any design tool."
      onNext={() => navigate('/template-gen/settings')}
      onBack={() => navigate('/templates')}
      onSkip={() => navigate('/template-gen/settings')}
      primary="Continue"
      skip="Use a sample invoice instead"
    >
      <div style={{display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:36, height:'100%'}}>
        <div style={{display:'flex', flexDirection:'column'}}>
          <div style={{
            flex:1,
            border:'1.5px dashed var(--ink-4)',
            borderRadius:'var(--r-lg)',
            background:'var(--ink-9)',
            padding:'48px 36px',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            textAlign:'center',
            position:'relative',
          }}>
            <div style={{
              width:72, height:72, borderRadius:'50%',
              background:'var(--ink-2)', color:'var(--paper)',
              display:'flex', alignItems:'center', justifyContent:'center',
              marginBottom:22,
            }}>
              <HIcon name="upload" size={32} strokeWidth={1.4}/>
            </div>
            <div className="serif" style={{fontSize:34, lineHeight:1.1, letterSpacing:'-0.01em'}}>
              Drop your invoice image here
            </div>
            <div className="h-meta" style={{fontSize:14, marginTop:8, maxWidth:460, lineHeight:1.55}}>
              JPG, PNG, PDF, HEIC up to 20 MB. The clearer the image, the more accurate the analysis.
            </div>
            <div className="h-row" style={{gap:10, marginTop:24, display: 'flex', justifyContent: 'center'}}>
              <button className="h-btn primary" style={{marginRight: 10}}><HIcon name="upload" size={14}/> Choose file</button>
              <button className="h-btn"><HIcon name="file" size={14}/> Use a sample</button>
            </div>

            <div className="h-row" style={{gap:6, marginTop:24, flexWrap:'wrap', justifyContent:'center', display: 'flex'}}>
              {['JPG','PNG','PDF','HEIC','WebP'].map(f => (
                <span key={f} className="h-mono" style={{
                  fontSize:10, letterSpacing:'0.15em',
                  padding:'4px 9px', borderRadius:'var(--r-pill)',
                  background:'var(--paper)', border:'1px solid var(--line-faint)',
                  color:'var(--ink-5)', margin: '2px'
                }}>{f}</span>
              ))}
            </div>
          </div>

          <div style={{
            marginTop:14, padding:'14px 18px',
            background:'var(--paper)',
            border:'1px solid var(--line-faint)',
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
            }}>IMG</div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{fontSize:14, fontWeight:500, color:'var(--ink-5)'}}>No file selected yet</div>
              <div className="h-meta" style={{fontSize:12, marginTop:2}}>
                Drop a file above to begin. We never share or sell uploaded files they're encrypted at rest and deleted after 30 days.
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="h-eyebrow" style={{fontSize:9}}>WHAT HAPPENS NEXT</div>
          <div style={{display:'flex', flexDirection:'column', gap:10, marginTop:12}}>
            {[
              {n:'01', t:'We read your invoice', d:'Detect layout, sections, columns, fonts, and the colour palette in use.'},
              {n:'02', t:'Map every field', d:'Pin logo, company, bill-to, line items, tax, totals, payment, terms, footer.'},
              {n:'03', t:'Resolve overlaps', d:'Apply Invoice Flow guidelines for spacing, alignment, accessibility, and print bleed.'},
              {n:'04', t:'Rebuild as a template',d:'Output an editable template you can issue invoices from immediately.'},
            ].map((s, i) => (
              <div key={i} className="h-card" style={{padding:'14px 16px', display:'flex', gap:14, alignItems:'flex-start'}}>
                <div className="h-mono" style={{
                  fontSize:11, letterSpacing:'0.18em', color:'var(--ink-5)',
                  width:30, flex:'0 0 auto', paddingTop:2, marginRight: 10
                }}>{s.n}</div>
                <div style={{flex:1}}>
                  <div className="serif" style={{fontSize:18, lineHeight:1.2}}>{s.t}</div>
                  <div className="h-meta" style={{fontSize:12, marginTop:3, lineHeight:1.5}}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop:14, padding:'12px 14px',
            background:'var(--ink-2)', color:'var(--paper)',
            borderRadius:'var(--r-md)',
            display:'flex', gap:10, alignItems:'flex-start',
          }}>
            <div style={{marginRight: 8, marginTop: 2}}><HIcon name="sparkle" size={14}/></div>
            <div style={{fontSize:12, lineHeight:1.5}}>
              <strong>Tip.</strong> A flat scan or screenshot reads better than a photo at an angle. We straighten and crop automatically, but a clean source means a faster, more accurate rebuild.
            </div>
          </div>
        </div>
      </div>
    </TplShell>
  );
}

// ────────────────────────────────────────────────────────────
// SCREEN 2 BASIC SETTINGS
// ────────────────────────────────────────────────────────────
export function HiFiTplSettings() {
  const navigate = useNavigate();
  return (
    <TplShell
      step={2} total={4}
      label="SETTINGS · STEP 02 OF 04 · OPTIONAL"
      title={<>A few <em style={{color:'var(--ink-5)'}}>basics</em> or skip them.</>}
      sub="If you skip, we'll auto-detect every value from the image. You can also override any of these later from the template editor."
      onNext={() => navigate('/template-gen/reading')}
      onBack={() => navigate('/template-gen/upload')}
      onSkip={() => navigate('/template-gen/reading')}
      primary="Start analysis"
      skip="Skip use auto-detected defaults"
    >
      <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:36}}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
          <Field label="Page size" hint="auto-detected: A4">
            <div className="h-input">
              <input defaultValue="A4 · 210 × 297 mm"/>
              <HIcon name="chev-d" size={14} color="var(--ink-5)"/>
            </div>
          </Field>
          <Field label="Orientation" hint="auto-detected">
            <div className="h-input">
              <input defaultValue="Portrait"/>
              <HIcon name="chev-d" size={14} color="var(--ink-5)"/>
            </div>
          </Field>

          <Field label="Default currency">
            <div className="h-input">
              <input placeholder="Pick a currency"/>
              <HIcon name="chev-d" size={14} color="var(--ink-5)"/>
            </div>
          </Field>
          <Field label="Tax mode" hint="optional">
            <div className="h-input">
              <input placeholder="None / single rate / line-by-line"/>
              <HIcon name="chev-d" size={14} color="var(--ink-5)"/>
            </div>
          </Field>

          <div style={{gridColumn:'1 / -1'}}>
            <Field label="Colour handling">
              <div className="h-row" style={{gap:8, display: 'flex'}}>
                {[
                  ['Use detected colours', true],
                  ['Map to my brand colour', false],
                  ['Black & white', false],
                ].map(([t, on], i) => (
                  <div key={i} style={{
                    flex:1, padding:'10px 14px',
                    border:'1.5px solid ' + (on ? 'var(--ink-2)' : 'var(--line-faint)'),
                    borderRadius:'var(--r-md)',
                    background: on ? 'var(--ink-9)' : 'var(--paper)',
                    cursor:'pointer',
                    display:'flex', alignItems:'center', gap:10,
                    marginRight: i < 2 ? 10 : 0
                  }}>
                    <div className={'h-check' + (on ? ' on' : '')} style={{width:16, height:16, borderRadius:'50%', marginRight: 8, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      {on && <HIcon name="check" size={10} strokeWidth={2.4}/>}
                    </div>
                    <div style={{fontSize:13, fontWeight: on ? 600 : 500, color: on ? 'var(--ink-2)' : 'var(--ink-3)'}}>{t}</div>
                  </div>
                ))}
              </div>
            </Field>
          </div>

          <div style={{gridColumn:'1 / -1'}}>
            <Field label="Fields to detect" hint="we'll pin these zones automatically uncheck any you don't need">
              <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8}}>
                {[
                  ['Logo & brand', true],
                  ['Company info', true],
                  ['Bill-to block', true],
                  ['Invoice no. & date', true],
                  ['Line items', true],
                  ['Subtotal & tax', true],
                  ['Total amount', true],
                  ['Payment details', true],
                  ['Terms & conditions', false],
                ].map(([t, on], i) => (
                  <label key={i} className="h-row" style={{
                    gap:10, padding:'10px 14px',
                    border:'1px solid var(--line-faint)',
                    borderRadius:'var(--r-md)',
                    background:'var(--paper)',
                    cursor:'pointer',
                    display: 'flex', alignItems: 'center'
                  }}>
                    <div className={'h-check' + (on ? ' on' : '')} style={{marginRight: 8, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                      {on && <HIcon name="check" size={11} strokeWidth={2.4}/>}
                    </div>
                    <div style={{fontSize:13, color:'var(--ink-2)'}}>{t}</div>
                  </label>
                ))}
              </div>
            </Field>
          </div>
        </div>

        <div>
          <div className="h-eyebrow" style={{fontSize:9}}>UPLOADED · PRE-ANALYSIS</div>
          <div style={{
            marginTop:10,
            padding:'24px 18px',
            background:'var(--paper-3)',
            borderRadius:'var(--r-md)',
            display:'flex', justifyContent:'center',
            position:'relative',
          }}>
            <FauxInvoice width={240} overlays={
              <>
                {[
                  {x:8, y:6, w:26, h:8 },
                  {x:38, y:24, w:54, h:14},
                  {x:8, y:42, w:84, h:30},
                  {x:8, y:76, w:38, h:14},
                  {x:52, y:78, w:40, h:12},
                ].map((b, i) => (
                  <div key={i} style={{
                    position:'absolute',
                    left:b.x+'%', top:b.y+'%',
                    width:b.w+'%', height:b.h+'%',
                    border:'1px dashed rgba(168,199,187,0.7)',
                    borderRadius:3,
                    pointerEvents:'none',
                  }}/>
                ))}
              </>
            }/>
          </div>
          <div className="h-meta" style={{fontSize:12, marginTop:12, lineHeight:1.55, textAlign:'center'}}>
            Soft dashed boxes show <strong style={{color:'var(--ink-2)'}}>auto-detected zones.</strong> We'll firm these up in the next step.
          </div>
        </div>
      </div>
    </TplShell>
  );
}

// ────────────────────────────────────────────────────────────
// SCREEN 3a GEN · READING (22%)
// ────────────────────────────────────────────────────────────
export function HiFiTplGen1() {
  return (
    <GenShell
      pct={22}
      eyebrow="STAGE 01 OF 04"
      stage={0}
      stageList={GEN_STAGES}
      nextRoute="/template-gen/mapping"
      title={<>Reading <em style={{color:'rgba(255,255,255,0.6)'}}>your invoice…</em></>}
      sub="We're scanning the page geometry, columns, and rule lines. Faint imperfections from photos or low-DPI scans are normalised."
      bigPanel={
        <div style={{position:'relative'}}>
          <FauxInvoice width={300} scanLine={true} shadow={false}/>
          <div style={{
            position:'absolute', top:-12, right:-12,
            padding:'4px 10px', borderRadius:'var(--r-pill)',
            background:'var(--paper)', color:'var(--ink-2)',
            fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.2em',
          }}>SCANNING</div>
        </div>
      }
      sideBody={
        <div style={{
          background:'rgba(255,255,255,0.04)',
          border:'1px solid rgba(255,255,255,0.10)',
          borderRadius:'var(--r-md)',
          padding:'18px 20px',
        }}>
          <div className="h-eyebrow" style={{color:'rgba(255,255,255,0.55)', fontSize:9, marginBottom:12}}>WHAT WE'VE SEEN SO FAR</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
            {[
              ['Page size', 'A4 · 210×297 mm'],
              ['Resolution', '300 dpi'],
              ['Colour profile','sRGB'],
              ['Orientation', 'Portrait'],
              ['Dominant hue', '#1A1A1A'],
              ['Accent hue', '#E89D2C'],
            ].map(([k, v], i) => (
              <div key={i}>
                <div className="h-mono" style={{fontSize:9, letterSpacing:'0.18em', color:'rgba(255,255,255,0.45)'}}>{k.toUpperCase()}</div>
                <div className="serif" style={{fontSize:18, lineHeight:1.15, marginTop:3, color:'var(--paper)'}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      }
    />
  );
}

// ────────────────────────────────────────────────────────────
// SCREEN 3b GEN · MAPPING (48%)
// ────────────────────────────────────────────────────────────
export function HiFiTplGen2() {
  const zones = [
    {x:6, y:4, w:30, h:9, c:'#A8C7BB', n:'logo'},
    {x:6, y:14, w:40, h:18, c:'#E89D2C', n:'header'},
    {x:52, y:14, w:40, h:18, c:'#E89D2C', n:'invoice no. + date'},
    {x:6, y:34, w:86, h:30, c:'#A8C7BB', n:'line items'},
    {x:6, y:66, w:42, h:12, c:'#A8C7BB', n:'payment'},
    {x:52, y:66, w:40, h:14, c:'#E89D2C', n:'totals'},
    {x:6, y:84, w:50, h:8, c:'#A8C7BB', n:'terms'},
    {x:60, y:86, w:32, h:6, c:'#A8C7BB', n:'footer'},
  ];
  return (
    <GenShell
      pct={48}
      eyebrow="STAGE 02 OF 04"
      stage={1}
      stageList={GEN_STAGES}
      nextRoute="/template-gen/overlaps"
      title={<>Mapping <em style={{color:'rgba(255,255,255,0.6)'}}>every field.</em></>}
      sub="We're pinning the zones we can see logo, headings, bill-to, items, totals, payment, terms, footer and labelling each one for the editor."
      bigPanel={
        <div style={{position:'relative'}}>
          <FauxInvoice width={300} overlays={
            <>
              {zones.map((z, i) => (
                <div key={i} style={{
                  position:'absolute',
                  left: z.x+'%', top: z.y+'%',
                  width: z.w+'%', height: z.h+'%',
                  border:'1.5px solid ' + z.c,
                  borderRadius:3,
                  pointerEvents:'none',
                  background: 'rgba(0,0,0,0.0)',
                }}>
                  <span style={{
                    position:'absolute', top:-9, left:-1,
                    fontFamily:'var(--mono)', fontSize:7, letterSpacing:'0.12em',
                    background: z.c, color:'#1A1A1A',
                    padding:'1px 5px', borderRadius:2,
                    whiteSpace:'nowrap',
                  }}>{String(i+1).padStart(2,'0')} · {z.n}</span>
                </div>
              ))}
            </>
          }/>
        </div>
      }
      sideBody={
        <div style={{
          background:'rgba(255,255,255,0.04)',
          border:'1px solid rgba(255,255,255,0.10)',
          borderRadius:'var(--r-md)',
          padding:'18px 20px',
        }}>
          <div className="h-row h-between" style={{marginBottom:12, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div className="h-eyebrow" style={{color:'rgba(255,255,255,0.55)', fontSize:9}}>DETECTED · 8 ZONES</div>
            <div className="h-mono" style={{fontSize:10, color:'rgba(255,255,255,0.6)'}}>3 active</div>
          </div>
          {zones.slice(0, 6).map((z, i) => (
            <div key={i} className="h-row" style={{
              gap:10, padding:'6px 0',
              borderTop: i ? '1px solid rgba(255,255,255,0.06)' : 'none',
              display: 'flex', alignItems: 'center'
            }}>
              <div style={{width:8, height:8, borderRadius:2, background: z.c, flex:'0 0 auto', marginRight: 8}}/>
              <div style={{fontSize:12, color:'rgba(255,255,255,0.85)', flex:1, textTransform:'capitalize'}}>{z.n}</div>
              <div className="h-mono" style={{fontSize:10, color:'rgba(255,255,255,0.5)'}}>{z.w}×{z.h}</div>
            </div>
          ))}
        </div>
      }
    />
  );
}

// ────────────────────────────────────────────────────────────
// SCREEN 3c GEN · OVERLAPS (74%)
// ────────────────────────────────────────────────────────────
export function HiFiTplGen3() {
  return (
    <GenShell
      pct={74}
      eyebrow="STAGE 03 OF 04"
      stage={2}
      stageList={GEN_STAGES}
      nextRoute="/template-gen/composing"
      title={<>Resolving <em style={{color:'rgba(255,255,255,0.6)'}}>overlapping elements.</em></>}
      sub="Where two zones collide we apply Invoice Flow spacing rules minimum gutter, baseline alignment, and 3 mm safe print margin on every edge."
      bigPanel={
        <div style={{position:'relative'}}>
          <FauxInvoice width={300} dim overlays={
            <>
              <div style={{position:'absolute', left:'50%', top:'10%', width:'42%', height:'24%',
                border:'1.5px solid #e4be7a', borderRadius:3,
                background:'rgba(228,190,122,0.08)'}}>
                <span style={{
                  position:'absolute', top:-9, left:-1,
                  fontFamily:'var(--mono)', fontSize:7, letterSpacing:'0.12em',
                  background:'#e4be7a', color:'#1A1A1A', padding:'1px 5px', borderRadius:2,
                  whiteSpace: 'nowrap'
                }}>CONFLICT · header vs. number</span>
              </div>
              <div style={{position:'absolute', left:'52%', top:'66%', width:'40%', height:'14%',
                border:'1.5px solid #A8C7BB', borderRadius:3,
                background:'rgba(168,199,187,0.10)'}}>
                <span style={{
                  position:'absolute', top:-9, left:-1,
                  fontFamily:'var(--mono)', fontSize:7, letterSpacing:'0.12em',
                  background:'#A8C7BB', color:'#1A1A1A', padding:'1px 5px', borderRadius:2,
                  whiteSpace: 'nowrap'
                }}>RESOLVED · totals nudged</span>
              </div>
              {[24, 40, 56, 72].map((y, i) => (
                <div key={i} style={{
                  position:'absolute', left:'4%', right:'4%', top:y+'%',
                  height:1, background:'rgba(168,199,187,0.35)',
                  pointerEvents:'none',
                }}/>
              ))}
            </>
          }/>
        </div>
      }
      sideBody={
        <div style={{
          background:'rgba(255,255,255,0.04)',
          border:'1px solid rgba(255,255,255,0.10)',
          borderRadius:'var(--r-md)',
          padding:'18px 20px',
        }}>
          <div className="h-eyebrow" style={{color:'rgba(255,255,255,0.55)', fontSize:9, marginBottom:12}}>GUIDELINES APPLIED</div>
          {[
            ['Minimum gutter', '12 pt'],
            ['Baseline grid', '8 pt'],
            ['Safe print margin', '3 mm'],
            ['Min. font size', '7 pt'],
            ['Contrast minimum', 'AA (4.5:1)'],
            ['Currency alignment', 'right · monospace'],
          ].map(([k, v], i) => (
            <div key={i} className="h-row h-between" style={{
              padding:'8px 0',
              borderTop: i ? '1px solid rgba(255,255,255,0.06)' : 'none',
              display: 'flex', justifyContent: 'space-between'
            }}>
              <div style={{fontSize:13, color:'rgba(255,255,255,0.85)'}}>{k}</div>
              <div className="h-mono" style={{fontSize:11, color:'var(--paper)'}}>{v}</div>
            </div>
          ))}
          <div className="h-row" style={{
            marginTop:14, padding:'10px 12px',
            background:'rgba(168,199,187,0.10)',
            border:'1px solid rgba(168,199,187,0.25)',
            borderRadius:'var(--r-sm)', gap:8,
            display: 'flex', alignItems: 'center'
          }}>
            <div style={{marginRight: 6}}><HIcon name="check" size={13} color="#A8C7BB" strokeWidth={2.2}/></div>
            <div style={{fontSize:11, color:'rgba(255,255,255,0.85)', lineHeight:1.5}}>
              <strong style={{color:'var(--paper)'}}>3 of 3 conflicts resolved.</strong> No manual review needed.
            </div>
          </div>
        </div>
      }
    />
  );
}

// ────────────────────────────────────────────────────────────
// SCREEN 3d GEN · COMPOSING (94%)
// ────────────────────────────────────────────────────────────
export function HiFiTplGen4() {
  return (
    <GenShell
      pct={94}
      eyebrow="STAGE 04 OF 04"
      stage={3}
      stageList={GEN_STAGES}
      nextRoute="/template-gen/review"
      title={<>Composing <em style={{color:'rgba(255,255,255,0.6)'}}>your template.</em></>}
      sub="We're stitching everything together typography, colour, alignment, line-item table, footer block. You'll be able to edit any of it on the next screen."
      bigPanel={
        <div style={{position:'relative', display:'flex', gap:14, alignItems:'center'}}>
          <FauxInvoice width={170} dim shadow={false}/>
          <div style={{
            color:'rgba(255,255,255,0.4)', fontSize:24,
            display:'flex', flexDirection:'column', alignItems:'center', gap:6,
            marginLeft: 10, marginRight: 10
          }}>
            <HIcon name="arrow-r" size={28} strokeWidth={1.4}/>
            <div className="h-mono" style={{fontSize:9, letterSpacing:'0.2em'}}>REBUILD</div>
          </div>
          <div style={{
            width:200, aspectRatio:'1 / 1.414',
            background:'#fff',
            borderRadius:6,
            boxShadow:'var(--sh-3)',
            display:'flex', flexDirection:'column',
            position:'relative',
            overflow:'hidden',
          }}>
            <div style={{background:'var(--brand-accent, var(--ink-2))', color:'#fff', padding:'12px 14px'}}>
              <div className="h-mono" style={{fontSize:7, letterSpacing:'0.22em', opacity:0.85}}>INVOICE · #00001</div>
              <div className="serif" style={{fontSize:18, lineHeight:1, marginTop:4, color:'#fff'}}>Your business</div>
            </div>
            <div style={{padding:'10px 14px', flex:1, fontSize:8, display: 'flex', flexDirection: 'column'}}>
              <div className="h-row h-between" style={{marginBottom:8, display: 'flex', justifyContent: 'space-between'}}>
                <div style={{height:5, background:'var(--paper-4)', width:'40%'}}/>
                <div style={{height:5, background:'var(--paper-4)', width:'30%'}}/>
              </div>
              <div style={{height:1, background:'var(--paper-4)', margin:'6px 0'}}/>
              {[1,2,3,4].map(r => (
                <div key={r} className="h-row h-between" style={{padding:'3px 0', borderBottom:'1px dotted var(--paper-4)', display: 'flex', justifyContent: 'space-between'}}>
                  <div style={{height:3, background:'var(--ink-7)', width:'50%'}}/>
                  <div style={{height:3, background:'var(--ink-3)', width:'18%'}}/>
                </div>
              ))}
              <div style={{flex:1}}/>
              <div style={{
                marginTop:8, paddingTop:6, borderTop:'1px solid var(--paper-4)',
                display:'flex', justifyContent:'space-between', alignItems:'baseline',
              }}>
                <div className="h-mono" style={{fontSize:6, letterSpacing:'0.22em', color:'#888'}}>TOTAL</div>
                <div style={{fontSize:14, fontWeight:700, color:'var(--brand-accent, var(--ink-2))'}}>0,000.00</div>
              </div>
            </div>
            <div style={{padding:'6px 14px', borderTop:'1px solid var(--paper-4)', fontFamily:'var(--mono)', fontSize:5.5, letterSpacing:'0.18em', color:'#888', textAlign:'right'}}>
              <span style={{display:'inline-block', width:3, height:3, borderRadius:'50%', background:'var(--brand-accent, var(--ink-2))', verticalAlign:'middle', marginRight:4}}/>
              YOUR FOOTER
            </div>
          </div>
        </div>
      }
      sideBody={
        <div style={{
          background:'rgba(255,255,255,0.04)',
          border:'1px solid rgba(255,255,255,0.10)',
          borderRadius:'var(--r-md)',
          padding:'18px 20px',
        }}>
          <div className="h-eyebrow" style={{color:'rgba(255,255,255,0.55)', fontSize:9, marginBottom:12}}>COMPOSING</div>
          {[
            ['Typography', 'done'],
            ['Colour mapping', 'done'],
            ['Line-item table', 'done'],
            ['Totals block', 'done'],
            ['Footer & meta', 'live'],
            ['Print bleed', 'queued'],
          ].map(([k, st], i) => (
            <div key={i} className="h-row h-between" style={{
              padding:'8px 0',
              borderTop: i ? '1px solid rgba(255,255,255,0.06)' : 'none',
              opacity: st === 'queued' ? 0.55 : 1,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{fontSize:13, color:'rgba(255,255,255,0.85)'}}>{k}</div>
              <div className="h-row" style={{gap:6, display: 'flex', alignItems: 'center'}}>
                {st === 'done' && <HIcon name="check" size={12} color="#A8C7BB" strokeWidth={2.2}/>}
                {st === 'live' && <div style={{width:6, height:6, borderRadius:'50%', background:'var(--paper)', animation:'h-pulse 1.2s ease-in-out infinite', marginRight: 6}}/>}
                {st === 'queued' && <div style={{width:6, height:6, borderRadius:'50%', background:'rgba(255,255,255,0.25)', marginRight: 6}}/>}
                <div className="h-mono" style={{fontSize:9, letterSpacing:'0.18em', color:'rgba(255,255,255,0.6)', textTransform:'uppercase'}}>{st}</div>
              </div>
            </div>
          ))}
        </div>
      }
    />
  );
}

// ────────────────────────────────────────────────────────────
// SCREEN 4 PREVIEW (side-by-side + save & name)
// ────────────────────────────────────────────────────────────
export function HiFiTplPreview() {
  const navigate = useNavigate();
  return (
    <TplShell
      step={4} total={4}
      label="REVIEW · STEP 04 OF 04"
      title={<>Your template <em style={{color:'var(--ink-5)'}}>is ready.</em></>}
      sub="Compare side-by-side. Every detected field is editable change copy, swap colours, resize zones. Name it, save it, and start issuing invoices."
      onNext={() => navigate('/templates')}
      onBack={() => navigate('/template-gen/upload')}
      onSkip={() => navigate('/templates')}
      primary="Save & set as default"
      skip="Save without setting default"
    >
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1.2fr', gap:24, height:'100%'}}>
        <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
          <div className="h-row h-between" style={{width:'100%', marginBottom:12, display: 'flex', justifyContent: 'space-between'}}>
            <div className="h-eyebrow" style={{fontSize:9}}>ORIGINAL · UPLOADED</div>
            <div className="h-mono" style={{fontSize:10, color:'var(--ink-5)'}}>1 MB · jpg</div>
          </div>
          <div style={{
            flex:1, width:'100%',
            background:'var(--paper-3)',
            borderRadius:'var(--r-md)',
            padding:18,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <FauxInvoice width={220}/>
          </div>
        </div>

        <div style={{display:'flex', flexDirection:'column', alignItems:'center'}}>
          <div className="h-row h-between" style={{width:'100%', marginBottom:12, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div className="h-eyebrow" style={{fontSize:9, color:'var(--ink-2)'}}>GENERATED · EDITABLE</div>
            <div className="h-status ok" style={{fontSize:9, display: 'flex', alignItems: 'center'}}><HIcon name="check" size={11} style={{marginRight: 4}}/> 12 / 12 mapped</div>
          </div>
          <div style={{
            flex:1, width:'100%',
            background:'var(--ink-9)',
            border:'1.5px solid var(--ink-2)',
            borderRadius:'var(--r-md)',
            padding:18,
            display:'flex', alignItems:'center', justifyContent:'center',
            position:'relative',
          }}>
            <div style={{
              width:220, aspectRatio:'1 / 1.414',
              background:'#fff',
              borderRadius:6,
              boxShadow:'var(--sh-3)',
              display:'flex', flexDirection:'column',
              overflow:'hidden', fontSize:8,
            }}>
              <div style={{background:'var(--brand-accent, var(--ink-2))', color:'#fff', padding:'14px 16px'}}>
                <div className="h-mono" style={{fontSize:7, letterSpacing:'0.22em', opacity:0.85}}>INVOICE · #00001</div>
                <div className="serif" style={{fontSize:20, lineHeight:1, marginTop:5, color:'#fff'}}>Your business</div>
                <div style={{fontSize:8, marginTop:3, opacity:0.75}}>Sample preview · placeholder data</div>
              </div>
              <div style={{padding:'12px 16px', flex:1, display: 'flex', flexDirection: 'column'}}>
                <div className="h-row h-between" style={{marginBottom:8, display: 'flex', justifyContent: 'space-between'}}>
                  <div>
                    <div className="h-mono" style={{fontSize:6, letterSpacing:'0.22em', color:'#888'}}>BILL TO</div>
                    <div style={{fontSize:9, fontWeight:600, color:'#1A1A1A', marginTop:2}}>Client name</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div className="h-mono" style={{fontSize:6, letterSpacing:'0.22em', color:'#888'}}>ISSUED</div>
                    <div style={{fontSize:9, color:'#1A1A1A', marginTop:2}}>DD MMM YYYY</div>
                  </div>
                </div>
                <div style={{height:1, background:'#eee', margin:'8px 0'}}/>
                {[1,2,3,4].map(r => (
                  <div key={r} className="h-row h-between" style={{padding:'3px 0', fontSize:8, color:'#1A1A1A', display: 'flex', justifyContent: 'space-between'}}>
                    <span>Line item {r}</span><span className="h-mono">000.00</span>
                  </div>
                ))}
                <div style={{
                  marginTop:8, paddingTop:7, borderTop:'1px solid #eee',
                  display:'flex', justifyContent:'space-between', alignItems:'baseline',
                }}>
                  <div className="h-mono" style={{fontSize:6, letterSpacing:'0.22em', color:'#888'}}>TOTAL</div>
                  <div style={{fontSize:16, fontWeight:700, color:'var(--brand-accent, var(--ink-2))'}}>0,000.00</div>
                </div>
              </div>
              <div style={{
                padding:'6px 16px', borderTop:'1px solid #eee',
                fontFamily:'var(--mono)', fontSize:5.5, letterSpacing:'0.18em',
                color:'#888', textAlign:'right',
              }}>
                <span style={{display:'inline-block', width:3, height:3, borderRadius:'50%', background:'var(--brand-accent, var(--ink-2))', verticalAlign:'middle', marginRight:4}}/>
                YOUR FOOTER
              </div>
            </div>
          </div>
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:16}}>
          <div className="h-card" style={{padding:'18px 20px'}}>
            <div className="h-eyebrow" style={{fontSize:9, marginBottom: 8}}>NAME YOUR TEMPLATE</div>
            <Field label="Template name">
              <div className="h-input" style={{marginTop:6}}>
                <input placeholder="e.g. Studio Corporate"/>
              </div>
            </Field>
            <div style={{marginTop:10}}>
              <Field label="Description" hint="optional">
                <div className="h-input" style={{alignItems:'flex-start', padding:'10px 14px'}}>
                  <textarea
                    placeholder="Short note for your team when to use this template."
                    style={{flex:1, border:0, outline:0, background:'transparent', resize:'none', font:'inherit', color:'inherit', minHeight:50, lineHeight:1.5}}/>
                </div>
              </Field>
            </div>
            <div style={{marginTop:10}}>
              <div className="h-mono" style={{fontSize:10, letterSpacing:'0.2em', color:'var(--ink-5)', textTransform:'uppercase'}}>TAGS</div>
              <div className="h-row" style={{gap:6, marginTop:6, flexWrap:'wrap', display: 'flex'}}>
                {['Corporate','Dark','Single-rate-tax','A4'].map(t => (
                  <span key={t} className="h-chip green" style={{padding:'4px 10px', fontSize:11, display: 'flex', alignItems: 'center', marginRight: 4, marginBottom: 4}}>{t} <HIcon name="x" size={10} style={{marginLeft: 4}}/></span>
                ))}
                <span className="h-chip ghost" style={{padding:'4px 10px', fontSize:11, display: 'flex', alignItems: 'center'}}><HIcon name="plus" size={10} style={{marginRight: 4}}/> add</span>
              </div>
            </div>
          </div>

          <div className="h-card" style={{padding:'16px 18px', flex:1, overflow:'hidden'}}>
            <div className="h-row h-between" style={{marginBottom:10, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div className="h-eyebrow" style={{fontSize:9}}>DETECTED FIELDS · 12</div>
              <div className="h-mono" style={{fontSize:10, color:'var(--ink-5)'}}>all editable</div>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 16px', fontSize:12}}>
              {[
                'Logo','Company','Bill-to','Invoice no.','Issue date',
                'Line items','Subtotal','Tax','Total',
                'Payment','Terms','Footer',
              ].map((f, i) => (
                <div key={i} className="h-row" style={{gap:8, display: 'flex', alignItems: 'center'}}>
                  <HIcon name="check" size={12} color="var(--ink-2)" strokeWidth={2.2} style={{marginRight: 4}}/>
                  <span style={{color:'var(--ink-2)'}}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </TplShell>
  );
}
