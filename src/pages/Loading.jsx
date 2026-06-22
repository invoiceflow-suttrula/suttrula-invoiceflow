import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HIcon from '../components/HIcon.jsx';

/* Pure visual splash — no router/auth deps, so it can render before the router
   mounts (used as the app boot screen and by the /loading route). */
export function LoadingScreen() {
  const steps = [
    'Securing your session',
    'Warming up the workspace',
    'Loading templates',
    'Preparing the canvas',
    'Almost ready',
  ];
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(a => Math.min(a + 1, steps.length)), 450);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h" style={{
      width:'100%', height:'100%',
      background:'var(--mesh-deep)',
      color:'var(--paper)',
      position:'relative', overflow:'hidden',
      display:'flex', flexDirection:'column',
    }}>
      {/* Concentric halos */}
      <svg width="1100" height="1100" viewBox="0 0 1100 1100" style={{
        position:'absolute', top:'50%', left:'50%',
        transform:'translate(-50%, -50%)', opacity:0.10,
        pointerEvents:'none',
      }}>
        {[520, 420, 320, 220, 130].map((r, i) => (
          <circle key={i} cx="550" cy="550" r={r} stroke="white" strokeWidth="1" fill="none"/>
        ))}
      </svg>

      {/* drifting specks */}
      {[
        [10, 28, 5, 0.4], [88, 18, 4, 0.45], [72, 84, 6, 0.5], [16, 80, 4, 0.3],
        [42, 12, 3, 0.45], [62, 90, 4, 0.35], [92, 56, 5, 0.4], [8, 56, 3, 0.4],
      ].map(([x, y, s, o], i) => (
        <div key={i} style={{
          position:'absolute', top: y+'%', left: x+'%',
          width:s, height:s, borderRadius:'50%',
          background:'white', opacity: o,
        }}/>
      ))}

      {/* Top brand bar */}
      <div className="h-row h-between" style={{padding:'28px 40px', position:'relative', zIndex:2, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div className="h-row" style={{gap:12, display: 'flex', alignItems: 'center'}}>
          <img src="/assets/invoice-flow-icon-light.png" alt="Invoice Flow" width="32" height="32" style={{display:'block', flex:'0 0 auto', marginRight: 8}}/>
          <div style={{display:'inline-flex', alignItems:'baseline', gap:'0.22em', fontFamily:"'DM Sans', system-ui, sans-serif", fontWeight:700, fontSize:22, letterSpacing:'-0.025em', lineHeight:1}}><span style={{color:'var(--paper)'}}>Invoice</span><span style={{color:'#9FD9B8'}}>Flow</span></div>
        </div>
        <div className="h-mono" style={{fontSize:11, color:'rgba(255,255,255,0.45)', letterSpacing:'0.22em'}}>
          v.4.2.0 · SECURE SESSION
        </div>
      </div>

      {/* Centered stage */}
      <div style={{
        flex:1,
        display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        position:'relative', zIndex:2,
        padding:'0 40px',
      }}>
        {/* spinning gate dial */}
        <div style={{position:'relative', width:172, height:172, marginBottom:36}}>
          <svg width="172" height="172" viewBox="0 0 172 172">
            <circle cx="86" cy="86" r="78" stroke="rgba(255,255,255,0.12)" strokeWidth="2" fill="none"/>
            <circle cx="86" cy="86" r="78" stroke="rgba(255,255,255,0.9)" strokeWidth="2" fill="none"
              strokeDasharray="490" strokeDashoffset="330"
              strokeLinecap="round" transform="rotate(-90 86 86)">
              <animateTransform attributeName="transform" type="rotate"
                from="-90 86 86" to="270 86 86" dur="2.4s" repeatCount="indefinite"/>
            </circle>
            {/* tick marks */}
            {Array.from({length:12}).map((_,i) => {
              const a = i * 30 * Math.PI/180;
              const x1 = 86 + Math.cos(a)*68, y1 = 86 + Math.sin(a)*68;
              const x2 = 86 + Math.cos(a)*74, y2 = 86 + Math.sin(a)*74;
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round"/>;
            })}
          </svg>
          <div style={{
            position:'absolute', inset:0,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          }}>
            <div className="h-eyebrow" style={{color:'rgba(255,255,255,0.5)', fontSize:9}}>LOADING</div>
            <div className="serif" style={{fontSize:54, lineHeight:1, marginTop:6}}>{Math.min(active, steps.length) * 20}<span style={{fontSize:24, opacity:0.6}}>%</span></div>
          </div>
        </div>

        {/* headline */}
        <div className="h-eyebrow" style={{color:'rgba(255,255,255,0.55)'}}>PREPARING YOUR WORKSPACE</div>
        <div className="serif" style={{
          fontSize:80, lineHeight:1, letterSpacing:'-0.025em',
          marginTop:18, textAlign:'center', maxWidth:880,
        }}>
          Almost<br/>
          <em style={{color:'rgba(255,255,255,0.6)'}}>ready.</em>
        </div>
        <div style={{
          fontSize:16, color:'rgba(255,255,255,0.65)',
          marginTop:20, maxWidth:520, lineHeight:1.55,
          textAlign:'center',
        }}>
          We're warming up your workspace and compiling your defaults. This takes a few seconds.
        </div>

        {/* steps */}
        <div style={{
          marginTop:48,
          display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:10,
          width:'100%', maxWidth:920,
        }}>
          {steps.map((s, i) => {
            const done = i < active;
            const live = i === active;
            return (
              <div key={i} className="h-col" style={{
                gap:10, padding:'14px 14px',
                borderRadius:'var(--r-md)',
                background: live ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.03)',
                border:'1px solid ' + (live ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)'),
                opacity: done ? 0.55 : 1,
                alignItems:'flex-start',
                display: 'flex', flexDirection: 'column'
              }}>
                <div className="h-row h-between" style={{width:'100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div className="h-mono" style={{fontSize:9, letterSpacing:'0.22em',
                    color: live ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)'}}>
                    {String(i+1).padStart(2,'0')}
                  </div>
                  <div style={{
                    width:18, height:18, borderRadius:'50%',
                    background: done ? 'var(--paper)' : 'transparent',
                    border: '1.5px solid ' + (done ? 'var(--paper)' : 'rgba(255,255,255,0.35)'),
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:'var(--ink-2)',
                  }}>
                    {done && <HIcon name="check" size={10} strokeWidth={2.4}/>}
                    {live && <div style={{width:5, height:5, borderRadius:'50%', background:'var(--paper)',
                      animation:'h-pulse 1.2s ease-in-out infinite'}}/>}
                  </div>
                </div>
                <div style={{
                  fontSize:13, fontWeight: live ? 600 : 500,
                  color: live ? 'var(--paper)' : 'rgba(255,255,255,0.7)',
                  lineHeight:1.3,
                }}>{s}{live && '…'}</div>
              </div>
            );
          })}
        </div>

        {/* quote */}
        <div style={{
          marginTop:48, maxWidth:620, textAlign:'center',
          padding:'0 20px',
        }}>
          <div style={{
            fontFamily:'var(--serif)', fontSize:22, fontStyle:'italic',
            color:'rgba(255,255,255,0.55)', lineHeight:1.4,
          }}>
            "Quality is never an accident; it is always the result of intelligent effort."
          </div>
          <div className="h-mono" style={{
            fontSize:10, color:'rgba(255,255,255,0.35)',
            marginTop:12, letterSpacing:'0.22em',
          }}>
            JOHN RUSKIN
          </div>
        </div>
      </div>

      {/* bottom meta strip */}
      <div className="h-row h-between" style={{
        padding:'20px 40px',
        borderTop:'1px solid rgba(255,255,255,0.08)',
        position:'relative', zIndex:2,
        fontFamily:'var(--mono)', fontSize:10,
        letterSpacing:'0.18em', color:'rgba(255,255,255,0.45)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>TAKING TOO LONG? <span onClick={() => window.location.reload()} style={{color:'rgba(255,255,255,0.7)', textDecoration:'underline', textUnderlineOffset:3, cursor:'pointer'}}>REFRESH</span></div>
        <div>v.4.2.0 · INVOICE FLOW</div>
      </div>

      <style>{`
        @keyframes h-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}

/* Routed /loading page — shows the splash, then sends the user on to sign-in. */
export default function HiFiLoading() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate('/signin'), 2500);
    return () => clearTimeout(t);
  }, [navigate]);
  return <LoadingScreen />;
}
