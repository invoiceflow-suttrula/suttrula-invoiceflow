/* Shell sidebar layout. On desktop: fixed left sidebar. On mobile: a top bar
   with a hamburger that opens a slide-in drawer from the left. */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HIcon from './HIcon';
import { useAuth } from '../contexts/AuthContext.jsx';
import useIsMobile from '../hooks/useIsMobile.js';

export default function Shell({ active, mesh = false, children }) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const mobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const go = (r) => () => { navigate(r); setOpen(false); };
  const handleSignOut = async () => { await signOut(); navigate('/signin'); };

  const items = [
    { id: 'dash', label: 'Dashboard', icon: 'home', badge: '', route: '/' },
    { id: 'data', label: 'Data sources', icon: 'database', badge: '5', route: '/data-sources' },
    { id: 'tmpl', label: 'Templates', icon: 'layers', badge: '2', route: '/templates' },
    { id: 'gen', label: 'Generate', icon: 'ticket', badge: '', route: '/generate' },
  ];
  const ops = [
    { id: 'ledger', label: 'Ledger', icon: 'file', route: '/ledger' },
    { id: 'sett', label: 'Settings', icon: 'settings', route: '/settings' },
  ];

  const Brand = () => (
    <div className="h-brand" onClick={go('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
      <img src="/assets/invoice-flow-icon-transparent.png" alt="Invoice Flow" width="30" height="30" style={{ display: 'block', flex: '0 0 auto' }} />
      <div className="name" style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.22em', fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1 }}>
        <span style={{ color: 'var(--ink-2)' }}>Invoice</span>
        <span style={{ color: '#1E9952' }}>Flow</span>
      </div>
      <div className="ver">v.4</div>
    </div>
  );

  /* Nav body, shared by desktop sidebar and mobile drawer. */
  const nav = (
    <>
      <Brand />
      <div className="nav-group">Workflow</div>
      {items.map((it) => (
        <div key={it.id} onClick={go(it.route)} style={{ cursor: 'pointer' }} className={'nav-item' + (it.id === active ? ' active' : '')}>
          <HIcon name={it.icon} size={17} />
          <span>{it.label}</span>
          {it.badge && <span className="badge">{it.badge}</span>}
        </div>
      ))}
      <div className="nav-group">Operations</div>
      {ops.map((it) => (
        <div key={it.id} onClick={go(it.route)} style={{ cursor: 'pointer' }} className={'nav-item' + (it.id === active ? ' active' : '')}>
          <HIcon name={it.icon} size={17} />
          <span>{it.label}</span>
        </div>
      ))}
      <div className="spacer" />
      <div className="h-user" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="ava">{user?.email?.[0]?.toUpperCase() || 'A'}</div>
        <div className="meta" style={{ flex: 1, minWidth: 0 }}>
          <div className="n">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}</div>
          <div className="e" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || 'Not signed in'}</div>
        </div>
        <button onClick={handleSignOut} className="h-iconbtn" title="Sign out" style={{ width: 30, height: 30, flex: '0 0 auto', cursor: 'pointer' }}>
          <HIcon name="logout" size={15} />
        </button>
      </div>
    </>
  );

  if (mobile) {
    return (
      <div className="h" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--paper)' }}>
        {/* top bar: logo left, hamburger right */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--line-faint)', background: 'var(--paper)', flex: '0 0 auto', zIndex: 10 }}>
          <Brand />
          <button onClick={() => setOpen(true)} className="h-iconbtn" title="Menu" style={{ width: 38, height: 38 }}>
            <HIcon name="menu" size={20} />
          </button>
        </div>

        {/* overlay */}
        {open && (
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(13,31,26,0.45)', zIndex: 40, animation: 'shell-fade .15s ease' }} />
        )}

        {/* slide-in drawer from the left */}
        <aside className="h-side" style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, width: 256, maxWidth: '82vw',
          zIndex: 50, transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform .22s ease', boxShadow: open ? '0 0 40px rgba(13,31,26,0.3)' : 'none',
          display: 'flex', flexDirection: 'column',
        }}>
          {nav}
        </aside>

        <main className="h-main" style={{ flex: 1, minHeight: 0 }}>
          <div className={'h-page' + (mesh ? ' mesh' : '')}>{children}</div>
        </main>

        <style>{`@keyframes shell-fade { from { opacity: 0; } to { opacity: 1; } }`}</style>
      </div>
    );
  }

  return (
    <div className="h-shell h">
      <aside className="h-side">{nav}</aside>
      <main className="h-main">
        <div className={'h-page' + (mesh ? ' mesh' : '')}>{children}</div>
      </main>
    </div>
  );
}
