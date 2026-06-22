/* Error pages — lifted from prototype hifi-errors.jsx */

import { useNavigate } from 'react-router-dom';
import HIcon from '../components/HIcon.jsx';

function ErrShell({ tone = 'paper', code, badge, eyebrow, title, sub, primary, secondary, extras }) {
  const dark = tone === 'dark';
  const fg = dark ? 'var(--paper)' : 'var(--ink-2)';
  const mute = dark ? 'rgba(255,255,255,0.65)' : 'var(--ink-5)';
  const iconSrc = dark ? '/assets/invoice-flow-icon-light.png' : '/assets/invoice-flow-icon-transparent.png';
  const inkColor = dark ? '#fff' : 'var(--ink-2)';
  const accent = dark ? '#9FD9B8' : '#1E9952';
  const navigate = useNavigate();

  return (
    <div className="h" style={{
      width: '100%', height: '100%',
      background: dark ? 'var(--mesh-deep)' : 'var(--paper-2)',
      color: fg,
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
    }}>
      <div className="h-row h-between" style={{ padding: '22px 36px', position: 'relative', zIndex: 2 }}>
        <div className="h-row" style={{ gap: 10, alignItems: 'center' }}>
          <img src={iconSrc} alt="Invoice Flow" width="28" height="28" style={{ display: 'block', flex: '0 0 auto' }} />
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.22em', fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: '-0.025em', lineHeight: 1 }}>
            <span style={{ color: inkColor }}>Invoice</span>
            <span style={{ color: accent }}>Flow</span>
          </div>
        </div>
        <div className="h-row" style={{ gap: 14 }}>
          <a onClick={() => navigate('/')} style={{ fontSize: 13, color: mute, cursor: 'pointer' }}>Help</a>
          <a onClick={() => navigate('/')} style={{ fontSize: 13, color: mute, cursor: 'pointer' }}>Status →</a>
        </div>
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '0 64px', textAlign: 'center', position: 'relative', zIndex: 2,
      }}>
        <div className="h-row" style={{ gap: 10, alignItems: 'center', marginBottom: 18 }}>
          {code && <div style={{
            fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.22em',
            padding: '5px 12px', borderRadius: 'var(--r-pill)',
            background: dark ? 'rgba(255,255,255,0.08)' : 'var(--paper)',
            border: '1px solid ' + (dark ? 'rgba(255,255,255,0.16)' : 'var(--line-faint)'),
            color: fg,
          }}>{code}</div>}
          {badge && <div className="h-mono" style={{ fontSize: 11, letterSpacing: '0.22em', color: mute }}>{badge}</div>}
        </div>

        {eyebrow && <div className="h-eyebrow" style={{ color: mute, marginBottom: 14 }}>{eyebrow}</div>}
        <div className="serif" style={{ fontSize: 84, lineHeight: 1, letterSpacing: '-0.025em', maxWidth: 880, color: fg }}>
          {title}
        </div>
        {sub && <div style={{ fontSize: 16, color: mute, marginTop: 22, maxWidth: 560, lineHeight: 1.55 }}>{sub}</div>}

        <div className="h-row" style={{ gap: 12, marginTop: 32 }}>
          {primary}
          {secondary}
        </div>

        {extras && <div style={{ marginTop: 34, maxWidth: 680, width: '100%' }}>{extras}</div>}
      </div>

      <div className="h-row h-between" style={{
        padding: '18px 36px',
        borderTop: '1px solid ' + (dark ? 'rgba(255,255,255,0.08)' : 'var(--line-faint)'),
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em',
        color: mute, position: 'relative', zIndex: 2,
      }}>
        <div className="h-row" style={{ gap: 8, alignItems: 'center' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#A8C7BB' }} />
          ALL SYSTEMS NORMAL
        </div>
        <div>INVOICE FLOW · v.4.2.0</div>
      </div>
    </div>
  );
}

export function NotFound() {
  const navigate = useNavigate();
  return (
    <ErrShell
      tone="paper"
      code="ERR · 404"
      badge="PAGE NOT FOUND"
      eyebrow="WE LOOKED EVERYWHERE"
      title={<>This page<br />isn't here.</>}
      sub="The page you're after has either been retired, renamed, or was never built."
      primary={<button onClick={() => navigate('/')} className="h-btn primary lg"><HIcon name="home" size={15} /> Back to dashboard</button>}
      secondary={<button onClick={() => navigate('/')} className="h-btn lg"><HIcon name="search" size={15} /> Search Invoice Flow</button>}
      extras={
        <div style={{
          padding: '20px 24px',
          background: 'var(--paper)',
          border: '1px solid var(--line-faint)',
          borderRadius: 'var(--r-md)',
          textAlign: 'left',
        }}>
          <div className="h-eyebrow" style={{ fontSize: 9, marginBottom: 10 }}>YOU MIGHT BE LOOKING FOR</div>
          {[
            ['Recent invoices', '/ledger', 'file'],
            ['Issue a new invoice', '/single', 'plus'],
            ['Your clients', '/passengers', 'users'],
            ['Settings & brand', '/settings', 'settings'],
          ].map(([t, r, ic], i) => (
            <div key={t} onClick={() => navigate(r)} className="h-row" style={{
              padding: '10px 6px', cursor: 'pointer', gap: 12,
              borderTop: i ? '1px solid var(--line-faint)' : 'none',
            }}>
              <HIcon name={ic} size={15} color="var(--ink-5)" />
              <div style={{ flex: 1, fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>{t}</div>
              <HIcon name="chev-r" size={14} color="var(--ink-5)" />
            </div>
          ))}
        </div>
      }
    />
  );
}

export function ServerError() {
  const navigate = useNavigate();
  return (
    <ErrShell
      tone="dark"
      code="ERR · 500"
      badge="SERVER ERROR"
      eyebrow="OUR FAULT, NOT YOURS"
      title={<>Something<br />broke.</>}
      sub="Something on our end gave way. The team has been paged. Your work is safe."
      primary={
        <button onClick={() => navigate('/')} className="h-btn lg" style={{ background: 'var(--paper)', color: 'var(--ink-2)', borderColor: 'var(--paper)' }}>
          <HIcon name="upload" size={15} strokeWidth={1.8} /> Try again
        </button>
      }
      secondary={
        <button onClick={() => navigate('/')} className="h-btn lg" style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.35)', color: 'var(--paper)' }}>
          <HIcon name="arrow-ne" size={15} /> Status page
        </button>
      }
    />
  );
}

export function Forbidden() {
  const navigate = useNavigate();
  return (
    <ErrShell
      tone="paper"
      code="ERR · 403"
      badge="NO ACCESS"
      eyebrow="PERMISSION REQUIRED"
      title={<>You don't<br />have access here.</>}
      sub="Your account doesn't have permission to view this resource."
      primary={<button onClick={() => navigate('/')} className="h-btn primary lg"><HIcon name="users" size={15} /> Request access</button>}
      secondary={<button onClick={() => navigate('/')} className="h-btn lg"><HIcon name="home" size={15} /> Back to dashboard</button>}
    />
  );
}

export function Offline() {
  const navigate = useNavigate();
  return (
    <ErrShell
      tone="dark"
      code="ERR · NET"
      badge="OFFLINE"
      eyebrow="NO SIGNAL"
      title={<>You're<br />off the air.</>}
      sub="Invoice Flow can't reach our servers right now. Your recent work is saved locally."
      primary={<button onClick={() => navigate('/')} className="h-btn primary lg"><HIcon name="upload" size={15} /> Retry connection</button>}
      secondary={<button onClick={() => navigate('/')} className="h-btn lg"><HIcon name="settings" size={15} /> Work offline</button>}
    />
  );
}
