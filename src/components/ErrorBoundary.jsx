/* Catches render crashes anywhere in the app and shows a self-contained
   error screen (no router hooks — it sits above the router). */

import React from 'react';

export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{
        width: '100%', height: '100%', minHeight: '100vh',
        background: 'var(--mesh-deep, #0d1f1a)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        fontFamily: "'DM Sans', system-ui, sans-serif", textAlign: 'center',
      }}>
        <div style={{ maxWidth: 520 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 13, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.5)' }}>ERROR · 500</div>
          <div style={{ fontSize: 88, lineHeight: 1, marginTop: 8, fontFamily: "'Instrument Serif', serif" }}>500</div>
          <div style={{ fontSize: 30, marginTop: 12, fontFamily: "'Instrument Serif', serif" }}>Something went wrong</div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', marginTop: 12, lineHeight: 1.6 }}>
            The app hit an unexpected error. Reloading usually fixes it.
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28 }}>
            <button onClick={() => window.location.reload()} style={btn(false)}>Reload</button>
            <button onClick={() => { window.location.href = '/'; }} style={btn(true)}>Go to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }
}

const btn = (solid) => ({
  padding: '12px 20px', borderRadius: 999, cursor: 'pointer', fontSize: 14, fontWeight: 500,
  background: solid ? '#fff' : 'transparent',
  color: solid ? '#102C26' : '#fff',
  border: '1px solid ' + (solid ? '#fff' : 'rgba(255,255,255,0.3)'),
});
