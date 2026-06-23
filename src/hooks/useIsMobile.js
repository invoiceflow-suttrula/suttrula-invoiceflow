/* Tracks whether the viewport is at/below a breakpoint, so pages can swap
   multi-column layouts (set in inline styles) for a single stacked column. */

import { useState, useEffect } from 'react';

export default function useIsMobile(breakpoint = 860) {
  const get = () => (typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false);
  const [isMobile, setIsMobile] = useState(get);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);

  return isMobile;
}
