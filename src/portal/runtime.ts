import React from 'react';

export function I(valor: any): React.ReactNode {
  if (valor === undefined || valor === null || typeof valor === 'boolean') return null;
  if (React.isValidElement(valor) || Array.isArray(valor)) return React.createElement(React.Fragment, null, valor);
  return React.createElement('span', { className: 'sc-interp' }, String(valor));
}

// cssToObj de design/canvas/support.js.
export function css(texto: string): React.CSSProperties {
  const o: Record<string, string> = {};
  for (const decl of texto.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    o[prop.startsWith('--') ? prop : prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = decl.slice(i + 1).trim();
  }
  return o;
}
