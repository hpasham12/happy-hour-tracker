import { useState } from 'react';

export function useResponsiveSidebar() {
  return useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 768));
}
