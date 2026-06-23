/* Reusable confirm dialog. Wrap the app in <ConfirmProvider>, then anywhere:
     const confirm = useConfirm();
     if (await confirm({ title, message, itemName })) { ...destructive action... }
   Replaces window.confirm() with an on-brand, keyboard-friendly modal. */

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import HIcon from './HIcon.jsx';

const ConfirmContext = createContext(() => Promise.resolve(false));
export const useConfirm = () => useContext(ConfirmContext);

function Modal({ opts, onCancel, onConfirm }) {
  const {
    title = 'Delete confirmation',
    message = 'This action cannot be undone.',
    itemName,
    confirmText = 'Delete',
    cancelText = 'Cancel',
  } = opts;

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(13,31,26,0.45)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'cf-fade .15s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true"
        style={{
          width: 'min(440px, calc(100vw - 40px))',
          background: 'var(--paper)', borderRadius: 'var(--r-lg)',
          boxShadow: '0 24px 60px rgba(13,31,26,0.35)',
          padding: '26px 26px 22px', animation: 'cf-pop .16s ease',
        }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: '#FCEBE8', color: '#C0392B',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        }}>
          <HIcon name="trash" size={22} />
        </div>

        <div className="serif" style={{ fontSize: 24, lineHeight: 1.1, color: 'var(--ink-2)' }}>{title}</div>
        {itemName && (
          <div className="h-mono" style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8, wordBreak: 'break-word' }}>{itemName}</div>
        )}
        <div className="h-meta" style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>{message}</div>

        <div className="h-row" style={{ gap: 10, marginTop: 22, display: 'flex' }}>
          <button onClick={onCancel} className="h-btn ghost lg" style={{ flex: 1, justifyContent: 'center' }}>
            {cancelText}
          </button>
          <button onClick={onConfirm} autoFocus className="h-btn lg" style={{
            flex: 1, justifyContent: 'center',
            background: '#C0392B', borderColor: '#C0392B', color: '#fff',
          }}>
            <HIcon name="trash" size={14} /> {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cf-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cf-pop { from { opacity: 0; transform: translateY(8px) scale(0.98); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { opts, resolve }

  const confirm = useCallback((opts = {}) => new Promise((resolve) => {
    setState({ opts, resolve });
  }), []);

  const finish = useCallback((value) => {
    setState((s) => { s?.resolve(value); return null; });
  }, []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e) => {
      if (e.key === 'Escape') finish(false);
      if (e.key === 'Enter') finish(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, finish]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && <Modal opts={state.opts} onCancel={() => finish(false)} onConfirm={() => finish(true)} />}
    </ConfirmContext.Provider>
  );
}
