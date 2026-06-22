/* Shell sidebar layout — lifted from prototype hifi-shared.jsx,
   adapted to use React Router's useNavigate + Supabase auth */

import { useNavigate } from 'react-router-dom';
import HIcon from './HIcon';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Shell({ active, mesh = false, children }) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const go = (r) => () => navigate(r);

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

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

  return (
    <div className="h-shell h">
      <aside className="h-side">
        <div className="h-brand" onClick={go('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/assets/invoice-flow-icon-transparent.png" alt="Invoice Flow" width="30" height="30" style={{ display: 'block', flex: '0 0 auto' }} />
          <div className="name" style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.22em', fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1 }}>
            <span style={{ color: 'var(--ink-2)' }}>Invoice</span>
            <span style={{ color: '#1E9952' }}>Flow</span>
          </div>
          <div className="ver">v.4</div>
        </div>

        <div className="nav-group">Workflow</div>
        {items.map(it => (
          <div key={it.id}
            onClick={go(it.route)}
            style={{ cursor: 'pointer' }}
            className={'nav-item' + (it.id === active ? ' active' : '')}>
            <HIcon name={it.icon} size={17} />
            <span>{it.label}</span>
            {it.badge && <span className="badge">{it.badge}</span>}
          </div>
        ))}

        <div className="nav-group">Operations</div>
        {ops.map(it => (
          <div key={it.id}
            onClick={go(it.route)}
            style={{ cursor: 'pointer' }}
            className={'nav-item' + (it.id === active ? ' active' : '')}>
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
          <button onClick={handleSignOut} className="h-iconbtn" title="Sign out"
            style={{ width: 30, height: 30, flex: '0 0 auto', cursor: 'pointer' }}>
            <HIcon name="logout" size={15} />
          </button>
        </div>
      </aside>

      <main className="h-main">
        <div className={'h-page' + (mesh ? ' mesh' : '')}>
          {children}
        </div>
      </main>
    </div>
  );
}
