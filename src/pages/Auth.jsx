/* Auth pages — wired to Supabase Auth (email/password + Google OAuth) */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HIcon from '../components/HIcon.jsx';
import { supabase } from '../lib/supabase.js';

/* Shared brand panel — left side of every auth screen */
function AuthBrand({ eyebrow, headline, sub, sample }) {
  return (
    <div className="auth-brand" style={{
      background: 'var(--mesh-deep)',
      color: 'var(--paper)',
      padding: '48px 52px 40px',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden',
    }}>
      <svg width="560" height="560" viewBox="0 0 560 560" style={{ position: 'absolute', bottom: -180, right: -180, opacity: 0.10, pointerEvents: 'none' }}>
        <circle cx="280" cy="280" r="240" stroke="white" strokeWidth="1" fill="none" />
        <circle cx="280" cy="280" r="180" stroke="white" strokeWidth="1" fill="none" />
        <circle cx="280" cy="280" r="120" stroke="white" strokeWidth="1" fill="none" />
      </svg>

      <div className="h-row" style={{ gap: 12, position: 'relative', zIndex: 1, alignItems: 'center' }}>
        <img src="/assets/invoice-flow-icon-light.png" alt="Invoice Flow" width="34" height="34" style={{ display: 'block', flex: '0 0 auto' }} />
        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.22em', fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 22, letterSpacing: '-0.025em', lineHeight: 1 }}>
          <span style={{ color: '#ffffff' }}>Invoice</span>
          <span style={{ color: '#9FD9B8' }}>Flow</span>
        </div>
      </div>

      <div style={{ marginTop: 64, position: 'relative', zIndex: 1 }}>
        {eyebrow && <div className="h-eyebrow" style={{ color: 'rgba(255,255,255,0.55)' }}>{eyebrow}</div>}
        <div className="serif" style={{ fontSize: 56, lineHeight: 1.04, marginTop: 14, letterSpacing: '-0.025em', maxWidth: 440 }}>
          {headline}
        </div>
        {sub && <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', marginTop: 18, maxWidth: 380, lineHeight: 1.55 }}>
          {sub}
        </div>}
      </div>

      {sample && (
        <div style={{ marginTop: 'auto', position: 'relative', zIndex: 1 }}>
          {sample}
        </div>
      )}
    </div>
  );
}

function MiniInvoiceCard() {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.16)',
      borderRadius: 'var(--r-md)',
      padding: '18px 20px',
      display: 'flex', gap: 18, alignItems: 'center',
      backdropFilter: 'blur(6px)',
      maxWidth: 420,
    }}>
      <div style={{
        width: 54, height: 54, borderRadius: 'var(--r-sm)',
        background: 'rgba(255,255,255,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flex: '0 0 auto',
      }}>
        <HIcon name="file" size={22} color="rgba(255,255,255,0.85)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="h-eyebrow" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9 }}>WHAT YOU GET</div>
        <div className="serif" style={{ fontSize: 20, lineHeight: 1.15, color: 'var(--paper)', marginTop: 4 }}>
          Your data in, branded invoices out.
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>
          Built for the back office. No mystery, no black boxes.
        </div>
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.61z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3.01-2.33z" fill="#FBBC05" />
      <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .96 4.96L3.97 7.3C4.68 5.16 6.66 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}
function MsSquares() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <rect x="0" y="0" width="6.5" height="6.5" fill="#F25022" />
      <rect x="7.5" y="0" width="6.5" height="6.5" fill="#7FBA00" />
      <rect x="0" y="7.5" width="6.5" height="6.5" fill="#00A4EF" />
      <rect x="7.5" y="7.5" width="6.5" height="6.5" fill="#FFB900" />
    </svg>
  );
}

function Field({ label, hint, children, error }) {
  return (
    <div className="h-field">
      <label>{label}{hint && <span style={{ color: 'var(--ink-6)', marginLeft: 8, fontFamily: 'var(--sans)', letterSpacing: 0, textTransform: 'none', fontSize: 11 }}>{hint}</span>}</label>
      {children}
      {error && <div style={{ fontSize: 11, color: '#a23b2b', marginTop: 2, display: 'flex', gap: 6, alignItems: 'center' }}>
        <HIcon name="x" size={11} /> {error}
      </div>}
    </div>
  );
}

/* ──── SIGN IN ──── */
export function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) {
      setError(err.message);
    } else {
      navigate('/');
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (err) setError(err.message);
  };

  return (
    <div className="h auth-split" style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 1.05fr', background: 'var(--paper)' }}>
      <AuthBrand
        eyebrow="WELCOME BACK"
        headline={<>Pick up where<br />you left off.</>}
        sub="Drafts, clients, line items, exactly as you left them. We saved your seat."
        sample={<MiniInvoiceCard />}
      />

      <div style={{ padding: '48px 76px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div className="h-row h-between">
          <div className="h-eyebrow">SIGN IN</div>
          <div className="h-row" style={{ gap: 6, fontSize: 13, color: 'var(--ink-5)' }}>
            <span>New here?</span>
            <a onClick={() => navigate('/signup')} style={{ color: 'var(--ink-2)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>Create an account</a>
          </div>
        </div>

        <div style={{ margin: '64px 0 12px' }}>
          <div className="serif" style={{ fontSize: 52, lineHeight: 1.04, letterSpacing: '-0.02em' }}>
            Welcome back, <em style={{ color: 'var(--ink-5)' }}>there.</em>
          </div>
          <div className="h-meta" style={{ fontSize: 15, marginTop: 10 }}>Sign in to continue where you left off.</div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 'var(--r-sm)', background: '#FEF0F0', border: '1px solid #F5C6C6', color: '#a23b2b', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <HIcon name="x" size={14} /> {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginTop: 28 }}>
          <button onClick={handleGoogleLogin} className="h-btn ghost" style={{ justifyContent: 'center', padding: '12px 16px' }}>
            <GoogleG /> Continue with Google
          </button>
        </div>

        <div className="h-row" style={{ margin: '24px 0 18px', gap: 14, color: 'var(--ink-5)' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line-faint)' }} />
          <div className="h-mono" style={{ fontSize: 10, letterSpacing: '0.2em' }}>OR WITH EMAIL</div>
          <div style={{ flex: 1, height: 1, background: 'var(--line-faint)' }} />
        </div>

        <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Work email">
            <div className="h-input">
              <HIcon name="mail" size={14} color="var(--ink-5)" />
              <input placeholder="you@company.com" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
          </Field>
          <Field label="Password">
            <div className="h-input">
              <HIcon name="settings" size={14} color="var(--ink-5)" />
              <input type={showPw ? 'text' : 'password'} placeholder="••••••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShowPw(v => !v)} className="h-iconbtn" style={{ width: 28, height: 28, border: 'none', background: 'transparent' }}>
                <HIcon name="eye" size={14} />
              </button>
            </div>
          </Field>

          <div className="h-row" style={{ marginTop: 2, justifyContent: 'flex-end', display: 'flex' }}>
            <a onClick={() => navigate('/forgot')} style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>
              Forgot password?
            </a>
          </div>

          <button type="submit" disabled={busy} className="h-btn primary lg" style={{ justifyContent: 'center', marginTop: 12, padding: '15px 22px', opacity: busy ? 0.7 : 1 }}>
            {busy ? 'Signing in…' : 'Sign in'} <HIcon name="arrow-r" size={15} />
          </button>
        </form>

        <div style={{ flex: 1 }} />

        <div className="h-row" style={{ gap: 14, fontSize: 11, color: 'var(--ink-6)', fontFamily: 'var(--mono)', letterSpacing: '0.16em' }}>
          <span>SECURE · TLS 1.3</span>
          <span>·</span>
          <span>SOC-2 TYPE II</span>
          <span style={{ flex: 1 }} />
          <a style={{ color: 'var(--ink-5)' }}>Help</a>
          <a style={{ color: 'var(--ink-5)' }}>Privacy</a>
        </div>
      </div>
    </div>
  );
}

/* ──── SIGN UP ──── */
export function SignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  /* Password strength — simple 0-5 score */
  const pwScore = (() => {
    let s = 0;
    if (password.length >= 6) s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthColor = ['var(--line-faint)', '#e74c3c', '#e67e22', '#f1c40f', '#27ae60', '#1E9952'];

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPw) { setError('Passwords do not match.'); return; }
    setBusy(true);
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (err) {
      setError(err.message);
    } else {
      /* Supabase may require email confirmation depending on project settings.
         On success, navigate to onboarding or check-email. */
      navigate('/check-email');
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (err) setError(err.message);
  };

  return (
    <div className="h auth-split" style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 1.05fr', background: 'var(--paper)' }}>
      <AuthBrand
        eyebrow="OPEN A WORKSPACE"
        headline={<>A workspace<br />that ships.</>}
        sub="Set up your invoicing in under three minutes. Works for IT services, retail, freelance, agency, any business."
        sample={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420 }}>
            {[
              ['Works for any business', 'IT, retail, freelance, agency, services'],
              ['Drop in an invoice image', "We rebuild it as an Invoice Flow template"],
              ['Brand the deliverable, not the tool', 'Per-workspace colour, logo, footer'],
            ].map(([t, b], i) => (
              <div key={i} className="h-row" style={{
                gap: 14, padding: '12px 16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 'var(--r-md)',
                backdropFilter: 'blur(6px)',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'var(--paper)', color: 'var(--ink-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flex: '0 0 auto',
                }}>
                  <HIcon name="check" size={12} strokeWidth={2.4} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--paper)' }}>{t}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{b}</div>
                </div>
              </div>
            ))}
          </div>
        }
      />

      <div style={{ padding: '40px 76px 40px', display: 'flex', flexDirection: 'column' }}>
        <div className="h-row h-between">
          <div className="h-eyebrow">CREATE ACCOUNT</div>
          <div className="h-row" style={{ gap: 6, fontSize: 13, color: 'var(--ink-5)' }}>
            <span>Already with us?</span>
            <a onClick={() => navigate('/signin')} style={{ color: 'var(--ink-2)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>Sign in</a>
          </div>
        </div>

        <div style={{ margin: '36px 0 8px' }}>
          <div className="serif" style={{ fontSize: 46, lineHeight: 1.04, letterSpacing: '-0.02em' }}>
            Set up your <em style={{ color: 'var(--ink-5)' }}>workspace.</em>
          </div>
          <div className="h-meta" style={{ fontSize: 14, marginTop: 8 }}>Free for personal use. No card required.</div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 'var(--r-sm)', background: '#FEF0F0', border: '1px solid #F5C6C6', color: '#a23b2b', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <HIcon name="x" size={14} /> {error}
          </div>
        )}

        <form onSubmit={handleEmailSignup} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 24 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Work email">
              <div className="h-input">
                <HIcon name="mail" size={14} color="var(--ink-5)" />
                <input placeholder="you@company.com" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </Field>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Password" hint="min. 6 characters">
              <div className="h-input">
                <input type={showPw ? 'text' : 'password'} placeholder="choose a strong passphrase" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPw(v => !v)} className="h-iconbtn" style={{ width: 28, height: 28, border: 'none', background: 'transparent' }}>
                  <HIcon name="eye" size={14} />
                </button>
              </div>
              <div className="h-row" style={{ gap: 6, marginTop: 8 }}>
                {[0, 1, 2, 3, 4].map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < pwScore ? strengthColor[pwScore] : 'var(--line-faint)', transition: 'background 0.2s' }} />
                ))}
                <div className="h-mono" style={{ fontSize: 10, color: 'var(--ink-6)', marginLeft: 8, letterSpacing: '0.15em' }}>
                  {password.length === 0 ? 'STRENGTH' : pwScore <= 1 ? 'WEAK' : pwScore <= 3 ? 'FAIR' : 'STRONG'}
                </div>
              </div>
            </Field>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <Field label="Confirm password">
              <div className="h-input">
                <input type="password" placeholder="type it again" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required />
              </div>
            </Field>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label className="h-row" style={{ gap: 10, cursor: 'pointer', marginTop: 6, alignItems: 'flex-start' }}>
              <div className="h-check" style={{ marginTop: 2 }} />
              <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5, maxWidth: 520 }}>
                I agree to the <a style={{ color: 'var(--ink-2)', textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>Terms of Service</a> and acknowledge the <a style={{ color: 'var(--ink-2)', textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>Privacy Policy</a>. Your data stays yours, we'll never sell it.
              </div>
            </label>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" disabled={busy} className="h-btn primary lg" style={{ justifyContent: 'center', marginTop: 12, padding: '15px 22px', width: '100%', opacity: busy ? 0.7 : 1 }}>
              {busy ? 'Creating…' : 'Create workspace'} <HIcon name="arrow-r" size={15} />
            </button>
          </div>
        </form>

        <div className="h-row" style={{ margin: '18px 0 14px', gap: 14, color: 'var(--ink-5)' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--line-faint)' }} />
          <div className="h-mono" style={{ fontSize: 10, letterSpacing: '0.2em' }}>OR SIGN UP WITH</div>
          <div style={{ flex: 1, height: 1, background: 'var(--line-faint)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
          <button onClick={handleGoogleSignup} className="h-btn ghost" style={{ justifyContent: 'center' }}><GoogleG /> Continue with Google</button>
        </div>
      </div>
    </div>
  );
}

/* ──── FORGOT PASSWORD ──── */
export function Forgot() {
  const navigate = useNavigate();
  return (
    <div className="h auth-split" style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 1.05fr', background: 'var(--paper)' }}>
      <AuthBrand
        eyebrow="LOST YOUR KEY?"
        headline={<>It happens,<br />let's get you back in.</>}
        sub="We'll send a single-use link to your inbox. The link expires in 15 minutes; no second password to remember."
      />

      <div style={{ padding: '48px 76px', display: 'flex', flexDirection: 'column' }}>
        <div className="h-row h-between">
          <div className="h-eyebrow">RESET · /forgot-password</div>
          <a onClick={() => navigate('/signin')} className="h-row" style={{ gap: 6, fontSize: 13, color: 'var(--ink-2)', fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>
            <HIcon name="chev-l" size={13} /> Back to sign in
          </a>
        </div>

        <div style={{ margin: '72px 0 12px' }}>
          <div className="serif" style={{ fontSize: 52, lineHeight: 1.04, letterSpacing: '-0.02em', maxWidth: 540 }}>
            Forgot your <em style={{ color: 'var(--ink-5)' }}>password?</em>
          </div>
          <div className="h-meta" style={{ fontSize: 15, marginTop: 12, maxWidth: 520, lineHeight: 1.55 }}>
            Enter the email you signed up with. We'll send a reset link that's good for the next 15 minutes.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 18 }}>
          <Field label="Work email">
            <div className="h-input">
              <HIcon name="mail" size={14} color="var(--ink-5)" />
              <input placeholder="you@company.com" />
            </div>
          </Field>

          <button onClick={() => navigate('/check-email')} className="h-btn primary lg" style={{ justifyContent: 'center', marginTop: 8, padding: '15px 22px' }}>
            Send reset link <HIcon name="arrow-r" size={15} />
          </button>
        </div>

        <div style={{
          marginTop: 32, padding: '16px 18px',
          background: 'var(--paper-3)',
          border: '1px solid var(--line-faint)',
          borderRadius: 'var(--r-md)',
          display: 'flex', gap: 14, alignItems: 'flex-start',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--ink-9)', color: 'var(--ink-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flex: '0 0 auto',
          }}><HIcon name="sparkle" size={15} /></div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)' }}>Can't access the inbox?</div>
            <div style={{ fontSize: 13, color: 'var(--ink-5)', marginTop: 2, lineHeight: 1.55 }}>
              If you signed up with Google or Microsoft, use that instead. There's no Invoice Flow password to reset.
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />
      </div>
    </div>
  );
}

/* ──── CHECK EMAIL ──── */
export function CheckEmail() {
  const navigate = useNavigate();
  return (
    <div className="h auth-split" style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 1.05fr', background: 'var(--paper)' }}>
      <AuthBrand
        eyebrow="DELIVERED"
        headline={<>The envelope<br />is in the post.</>}
        sub="If you don't see it in two minutes, peek in spam. Sometimes corporate filters eat our messages."
      />

      <div style={{ padding: '48px 76px', display: 'flex', flexDirection: 'column' }}>
        <div className="h-row h-between">
          <div className="h-eyebrow">CHECK INBOX · /forgot-password/sent</div>
          <a onClick={() => navigate('/signin')} className="h-row" style={{ gap: 6, fontSize: 13, color: 'var(--ink-2)', fontWeight: 500, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>
            <HIcon name="chev-l" size={13} /> Back to sign in
          </a>
        </div>

        <div style={{
          marginTop: 64,
          width: 84, height: 84, borderRadius: '50%',
          background: 'var(--ink-9)', color: 'var(--ink-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1.5px solid var(--ink-8)',
        }}>
          <HIcon name="mail" size={38} strokeWidth={1.4} />
        </div>

        <div style={{ marginTop: 28 }}>
          <div className="serif" style={{ fontSize: 48, lineHeight: 1.04, letterSpacing: '-0.02em', maxWidth: 540 }}>
            Check your <em style={{ color: 'var(--ink-5)' }}>inbox.</em>
          </div>
          <div className="h-meta" style={{ fontSize: 15, marginTop: 12, maxWidth: 560, lineHeight: 1.55 }}>
            We've sent a reset link to the email you signed up with.
            Click it within the next 15 minutes to set a new password.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
          <button onClick={() => navigate('/reset')} className="h-btn primary lg"><HIcon name="arrow-ne" size={15} /> Open mail app</button>
          <button className="h-btn lg"><HIcon name="upload" size={15} /> Resend in 38s</button>
        </div>

        <div style={{ flex: 1 }} />
      </div>
    </div>
  );
}

/* ──── RESET PASSWORD ──── */
export function ResetPassword() {
  const navigate = useNavigate();
  return (
    <div className="h auth-split" style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 1.05fr', background: 'var(--paper)' }}>
      <AuthBrand
        eyebrow="NEW KEY"
        headline={<>One more step.<br />Pick a strong one.</>}
        sub="A passphrase is easier to remember than a password. Try three unrelated words plus a number."
      />

      <div style={{ padding: '48px 76px', display: 'flex', flexDirection: 'column' }}>
        <div className="h-row h-between">
          <div className="h-eyebrow">RESET PASSWORD · /reset?t=…</div>
          <div className="h-status muted">link verified · expires in 15:00</div>
        </div>

        <div style={{ margin: '64px 0 12px' }}>
          <div className="serif" style={{ fontSize: 50, lineHeight: 1.04, letterSpacing: '-0.02em', maxWidth: 540 }}>
            Set a <em style={{ color: 'var(--ink-5)' }}>new password.</em>
          </div>
          <div className="h-meta" style={{ fontSize: 15, marginTop: 10 }}>
            You'll be signed back in automatically once it's saved.
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 22 }}>
          <Field label="New password" hint="min. 10 characters">
            <div className="h-input">
              <input type="password" placeholder="choose a strong passphrase" />
              <button className="h-iconbtn" style={{ width: 28, height: 28, border: 'none', background: 'transparent' }}>
                <HIcon name="eye" size={14} />
              </button>
            </div>
            <div className="h-row" style={{ gap: 6, marginTop: 8 }}>
              {[0, 0, 0, 0, 0].map((_, i) => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--line-faint)' }} />
              ))}
              <div className="h-mono" style={{ fontSize: 10, color: 'var(--ink-6)', marginLeft: 8, letterSpacing: '0.15em' }}>STRENGTH</div>
            </div>
          </Field>
          <Field label="Confirm new password">
            <div className="h-input">
              <input type="password" placeholder="type it again" />
            </div>
          </Field>
        </div>

        <div style={{
          marginTop: 20, padding: '16px 18px',
          background: 'var(--paper-3)',
          border: '1px solid var(--line-faint)',
          borderRadius: 'var(--r-md)',
        }}>
          <div className="h-eyebrow" style={{ fontSize: 9 }}>PASSWORD RULES</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 18px', marginTop: 10 }}>
            {[
              'At least 10 characters',
              'Mix of upper & lower case',
              'Includes a number',
              'Includes a symbol',
              'Not used in past 6 months',
              'Not in the breach corpus',
            ].map((t, i) => (
              <div key={i} className="h-row" style={{ gap: 8, fontSize: 13, color: 'var(--ink-5)' }}>
                <div className="h-check" style={{ width: 14, height: 14, borderRadius: 4 }} />
                {t}
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => navigate('/signin')} className="h-btn primary lg" style={{ justifyContent: 'center', marginTop: 22, padding: '15px 22px' }}>
          Save password & sign in <HIcon name="arrow-r" size={15} />
        </button>

        <div style={{ flex: 1 }} />
      </div>
    </div>
  );
}
