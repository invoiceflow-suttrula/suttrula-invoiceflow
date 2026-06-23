/* Unified error page. Navigate to it with details:
     navigate('/error', { state: { code: '500', title: '…', description: '…' } });
   or by preset key:
     navigate('/error', { state: { type: 'network' } });
   Falls back to a generic 404 when opened with no state. */

import { useNavigate, useLocation } from 'react-router-dom';
import HIcon from '../components/HIcon.jsx';

export const ERROR_PRESETS = {
  '404':       { code: '404', title: 'Page not found', description: "The page you're looking for doesn't exist or was moved." },
  '500':       { code: '500', title: 'Something went wrong', description: 'An unexpected error occurred. Please try again.' },
  auth:        { code: 'AUTH', title: 'Authentication error', description: 'Your session is invalid or has expired. Please sign in again.' },
  permission:  { code: '403', title: 'Permission denied', description: "You don't have access to this resource." },
  upload:      { code: 'UPLOAD', title: 'Upload failed', description: 'We couldn’t read or save that file. Check the format and try again.' },
  generation:  { code: 'GEN', title: 'Generation failed', description: 'The invoices could not be generated. Please retry.' },
  network:     { code: 'NET', title: 'Network error', description: 'Cannot reach the server. Check your connection and retry.' },
};

export default function ErrorPage() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const preset = ERROR_PRESETS[state?.type] || {};
  const code = state?.code || preset.code || '404';
  const title = state?.title || preset.title || ERROR_PRESETS['404'].title;
  const description = state?.description || preset.description || ERROR_PRESETS['404'].description;

  return (
    <div className="h" style={{
      width: '100%', height: '100%', background: 'var(--mesh-deep)', color: 'var(--paper)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 520 }}>
        <div className="h-mono" style={{ fontSize: 13, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.5)' }}>ERROR · {code}</div>
        <div className="serif" style={{ fontSize: 96, lineHeight: 1, marginTop: 8 }}>{code}</div>
        <div className="serif" style={{ fontSize: 34, lineHeight: 1.1, marginTop: 14 }}>{title}</div>
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', marginTop: 14, lineHeight: 1.6 }}>{description}</div>

        <div className="h-row" style={{ gap: 12, justifyContent: 'center', marginTop: 30, display: 'flex' }}>
          <button onClick={() => navigate(-1)} className="h-btn lg" style={{ background: 'transparent', borderColor: 'rgba(255,255,255,0.3)', color: 'var(--paper)' }}>
            <HIcon name="chev-l" size={15} /> Go back
          </button>
          <button onClick={() => navigate('/')} className="h-btn lg" style={{ background: 'var(--paper)', color: 'var(--ink-2)', borderColor: 'var(--paper)' }}>
            <HIcon name="home" size={15} /> Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
