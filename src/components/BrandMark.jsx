/* BrandMark — lifted from prototype hifi-shared.jsx */

export default function BrandMark({ variant = 'lockup', size = 28, dark = false, gap = 12 }) {
  const iconSrc = dark
    ? '/assets/invoice-flow-icon-light.png'
    : '/assets/invoice-flow-icon-transparent.png';
  const wordmarkInk = dark ? '#ffffff' : '#0F1A18';
  const wordmarkAccent = dark ? '#9FD9B8' : '#1E9952';
  const fontPx = Math.round(size * 0.78);

  const Icon = (
    <img
      src={iconSrc}
      alt="Invoice Flow"
      width={size}
      height={size}
      style={{ display: 'block', objectFit: 'contain', flex: '0 0 auto' }}
    />
  );

  const Wordmark = (
    <span style={{
      fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
      fontWeight: 700,
      fontSize: fontPx,
      letterSpacing: '-0.025em',
      lineHeight: 1,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ color: wordmarkInk }}>Invoice</span>
      <span style={{ color: wordmarkAccent, marginLeft: '0.25em' }}>Flow</span>
    </span>
  );

  if (variant === 'icon') return Icon;
  if (variant === 'wordmark') return Wordmark;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap }}>
      {Icon}{Wordmark}
    </div>
  );
}
