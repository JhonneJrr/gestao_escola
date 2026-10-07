import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'htmlparser2';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const aviso = '// GERADO por scripts/converter-canvas.mjs — não edite\n';
const avisoCSS = '/* GERADO por scripts/converter-canvas.mjs — não edite */\n';
export const PROPRIOS = { 'Grade e Agenda': './GradeAgenda' };
export const identificador = nome => nome.split(/[^\p{L}\p{N}_$]+/u).filter(Boolean).map(p => p[0].toUpperCase() + p.slice(1)).join('');
const camel = s => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
// Atributos DOM distintos dos quatro templates; data-* e aria-* são literais.
const atributos = Object.fromEntries(('cx cy d disabled fill height href id max min name placeholder r ref rel role rows rx stroke style title type value width x y').split(' ').map(a => [a, a]));
Object.assign(atributos, {
  class: 'className', for: 'htmlFor', tabindex: 'tabIndex', tabIndex: 'tabIndex',
  inputmode: 'inputMode', inputMode: 'inputMode', autocomplete: 'autoComplete',
  maxLength: 'maxLength', maxlength: 'maxLength', viewBox: 'viewBox', 'stroke-width': 'strokeWidth', 'stroke-linejoin': 'strokeLinejoin', checked: 'checked',
});
for (const evento of ['Click', 'Change', 'Submit', 'KeyDown', 'PointerDown', 'MouseEnter', 'MouseLeave', 'Blur']) {
  atributos['on' + evento] = atributos[('on' + evento).toLowerCase()] = 'on' + evento;
}
const tags = new Set('article aside b br button canvas circle div form h1 h2 h3 header input kbd label li main nav option p path rect section select span strong svg textarea ul img hr'.split(' '));
const voids = new Set(['input', 'br', 'img', 'hr']);
const posicao = new Set(['position', 'left', 'right', 'top', 'bottom', 'inset', 'width', 'height', 'z-index', 'transform']);

// cssToObj, expr.ts e importantify seguem as regras de support.js.
function cssToObj(css) {
  const o = {};
  for (const decl of css.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    o[prop.startsWith('--') ? prop : camel(prop)] = decl.slice(i + 1).trim();
  }
  return o;
}
function parensWrapWhole(expr) {
  let depth = 0;
  for (let i = 0; i < expr.length - 1; i++) {
    if (expr[i] === '(') depth++;
    else if (expr[i] === ')') {
      depth--;
      if (depth === 0) return false;
    }
  }
  return true;
}
function expressao(src, scope) {
  const expr = src.trim();
  if (!expr) return 'undefined';
  if (expr[0] === '(' && expr.at(-1) === ')' && parensWrapWhole(expr)) return '(' + expressao(expr.slice(1, -1), scope) + ')';
  let depth = 0;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (c === '[' || c === '(') depth++;
    else if (c === ']' || c === ')') depth--;
    else if (depth === 0 && (c === '=' || c === '!') && expr[i + 1] === '=') {
      if (i > 0 && (expr[i - 1] === '=' || expr[i - 1] === '!')) continue;
      if (!expr.slice(0, i).trim()) continue;
      const op = expr[i + 2] === '=' ? c + '==' : c + '=';
      return '(' + expressao(expr.slice(0, i), scope) + ' ' + op + ' ' + expressao(expr.slice(i + op.length), scope) + ')';
    }
  }
  if (expr[0] === '!') return '!' + '(' + expressao(expr.slice(1), scope) + ')';
  if (['true', 'false', 'null', 'undefined'].includes(expr) || /^-?\d+(\.\d+)?$/.test(expr)) return expr;
  if (expr.length >= 2 && (expr[0] === '"' || expr[0] === "'") && expr.at(-1) === expr[0]) return JSON.stringify(expr.slice(1, -1));
  const ident = /^[A-Za-z_$][A-Za-z0-9_$]*/;
  const head = expr.match(ident);
  if (!head) throw new Error('Expressão não coberta pelo plano: ' + expr);
  let out = scope.get(head[0]) ?? 'v.' + head[0];
  let i = head[0].length;
  while (i < expr.length) {
    if (expr[i] === '.') {
      const m = expr.slice(i + 1).match(ident) || expr.slice(i + 1).match(/^\d+/);
      if (!m) throw new Error('Caminho não coberto pelo plano: ' + expr);
      out += /^\d/.test(m[0]) ? '?.[' + JSON.stringify(m[0]) + ']' : '?.' + m[0];
      i += 1 + m[0].length;
    } else if (expr[i] === '[') {
      let d = 1, j = i + 1;
      for (; j < expr.length; j++) {
        if (expr[j] === '[') d++;
        else if (expr[j] === ']' && --d === 0) break;
      }
      if (d !== 0) throw new Error('Caminho não coberto pelo plano: ' + expr);
      out += '?.[' + expressao(expr.slice(i + 1, j), scope) + ']';
      i = j + 1;
    } else throw new Error('Expressão não coberta pelo plano: ' + expr);
  }
  return out;
}
function interpolado(raw, scope) {
  const parts = raw.split(/\{\{([\s\S]+?)\}\}/g);
  return '`' + parts.map((p, i) => i & 1 ? '${(' + expressao(p, scope) + ') ?? ""}' : p.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')).join('') + '`';
}
function atributo(raw, scope) {
  const whole = raw.match(/^\s*\{\{([\s\S]+?)\}\}\s*$/);
  return whole ? expressao(whole[1], scope) : raw.includes('{{') ? interpolado(raw, scope) : JSON.stringify(raw);
}
function estiloHost(raw, scope) {
  if (!raw.includes('{{')) {
    const o = Object.fromEntries(Object.entries(cssToObj(raw)).filter(([k]) => posicao.has(k.replace(/[A-Z]/g, c => '-' + c.toLowerCase()))));
    return Object.keys(o).length ? JSON.stringify(o) : 'undefined';
  }
  return '((s: any) => { const all = typeof s === "string" ? css(s) : s; const out = Object.fromEntries(Object.entries(all ?? {}).filter(([k]) => ' + JSON.stringify([...posicao]) + '.includes(k.replace(/[A-Z]/g, c => "-" + c.toLowerCase())))); return Object.keys(out).length ? out : undefined; })(' + atributo(raw, scope) + ')';
}

export function converterTemplate(html, pseudoCache = new Map()) {
  const imports = new Set();
  const styles = [];
  let loopN = 0;
  const document = parseDocument(html.replace(/\r\n?/g, '\n'), { lowerCaseAttributeNames: false, recognizeSelfClosing: true, decodeEntities: true });
  function filhos(node, scope) { return (node.children ?? []).map(n => walk(n, scope)).join(''); }
  function walk(node, scope) {
    if (node.type === 'text') {
      const t = node.data;
      if (!t.includes('{{')) return !t.trim() && !t.includes(' ') ? '' : '{' + JSON.stringify(t) + '}';
      return t.split(/\{\{([\s\S]+?)\}\}/g).map((p, i) => i & 1 ? '{I(' + expressao(p, scope) + ')}' : '{' + JSON.stringify(p) + '}').join('');
    }
    if (node.type === 'comment') return '';
    const a = node.attribs;
    if (node.name === 'helmet') {
      for (const c of node.children) {
        if (c.name === 'style') styles.push(c.children.map(t => t.data ?? '').join(''));
        else if (c.type !== 'text' && c.type !== 'comment' && c.name !== 'link') throw new Error('Helmet não coberto pelo plano: ' + c.name);
      }
      return '';
    }
    if (node.name === 'sc-if') return '{(' + atributo(a.value ?? '', scope) + ') ? <>' + filhos(node, scope) + '</> : null}';
    if (node.name === 'sc-for') {
      const n = loopN++, item = '_item' + n, index = '_index' + n;
      const inner = new Map(scope).set(a.as ?? 'item', item).set('$index', index);
      return '{((_list' + n + ': any) => (Array.isArray(_list' + n + ') ? _list' + n + ' : []).map((' + item + ': any, ' + index + ': number) => <Fragment key={' + index + '}>' + filhos(node, inner) + '</Fragment>))(' + atributo(a.list ?? '', scope) + ')}';
    }
    const component = node.name === 'dc-import';
    const nome = component ? a.name ?? a.component : node.name;
    const tag = component ? identificador(nome) : nome;
    if (component) imports.add(nome);
    else if (!tags.has(tag)) throw new Error('Tag não coberta pelo plano: ' + tag);
    const props = [];
    const pseudos = [];
    for (const [name, raw] of Object.entries(a)) {
      if (['hint-size', 'sc-name', 'data-dc-tpl'].includes(name) || component && ['name', 'component'].includes(name)) continue;
      if (name.startsWith('style-')) {
        const pseudo = name.slice(6);
        if (!['hover', 'active', 'focus'].includes(pseudo) || raw.includes('{{')) throw new Error('Pseudoestilo não coberto pelo plano: ' + name);
        const key = pseudo + '|' + raw;
        if (!pseudoCache.has(key)) {
          const cls = 'scp' + pseudoCache.size.toString(36);
          pseudoCache.set(key, { cls, rule: '.' + cls + ':' + pseudo + '{' + importantify(raw) + '}' });
        }
        pseudos.push(pseudoCache.get(key).cls);
        continue;
      }
      let key = component ? camel(name) : atributos[name] ?? (/^(data|aria)-/.test(name) ? name : undefined);
      if (!key) throw new Error('Atributo não coberto pelo plano: ' + name);
      let value = atributo(raw, scope);
      if (name === 'style') {
        if (component) { key = '__hostStyle'; value = estiloHost(raw, scope); }
        else value = raw.includes('{{') ? 'css(' + interpolado(raw, scope) + ')' : JSON.stringify(cssToObj(raw));
      }
      if (key === 'value' || key === 'checked') value = '((' + value + ') === undefined ? ' + (key === 'value' ? '""' : 'false') + ' : (' + value + '))';
      props.push([key, value]);
    }
    if (pseudos.length && !component) {
      const existing = props.find(p => p[0] === 'className');
      const value = '[' + [existing?.[1], ...pseudos.map(c => JSON.stringify(c))].filter(Boolean).join(', ') + '].filter(Boolean).join(" ")';
      if (existing) existing[1] = value;
      else props.push(['className', value]);
    }
    const open = '<' + tag + props.map(([k, v]) => ' ' + k + '={' + v + '}').join('');
    return voids.has(tag) ? open + ' />' : open + '>' + filhos(node, scope) + '</' + tag + '>';
  }
  const jsx = filhos(document, new Map());
  return { jsx, styles, imports: [...imports], pseudos: [...pseudoCache.values()].map(p => p.rule) };
}

// Copiados de pseudo.ts em support.js, sem mudar a análise de declarações CSS.
function scanUnquotedUrl(css, i) {
  if (css[i] !== 'u' && css[i] !== 'U' || css.slice(i, i + 4).toLowerCase() !== 'url(' || /[a-z0-9_-]/i.test(css[i - 1] ?? '')) return -1;
  let j = i + 4;
  while (j < css.length && /\s/.test(css[j])) j++;
  if (css[j] === '"' || css[j] === "'") return -1;
  while (j < css.length && css[j] !== ')') { if (css[j] === '\\') j++; j++; }
  return j < css.length ? j + 1 : css.length;
}
function stripComments(css) {
  let out = '', quote = '';
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) {
      if (c === '\\') { out += c + (css[i + 1] ?? ''); i++; continue; }
      if (c === quote) quote = '';
      out += c;
    } else if (c === "'" || c === '"') { quote = c; out += c; }
    else if (c === '/' && css[i + 1] === '*') { const end = css.indexOf('*/', i + 2); i = end === -1 ? css.length : end + 1; out += ' '; }
    else { const end = scanUnquotedUrl(css, i); if (end === -1) out += c; else { out += css.slice(i, end); i = end - 1; } }
  }
  return out;
}
function importantify(css) {
  css = stripComments(css);
  const decls = [];
  let start = 0, depth = 0, quote = '';
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) { if (c === '\\') i++; else if (c === quote) quote = ''; }
    else if (c === "'" || c === '"') quote = c;
    else if (c === '(') depth++;
    else if (c === ')') depth = Math.max(0, depth - 1);
    else if (c === ';' && depth === 0) { decls.push(css.slice(start, i)); start = i + 1; }
    else { const end = scanUnquotedUrl(css, i); if (end !== -1) i = end - 1; }
  }
  decls.push(css.slice(start));
  return decls.map(d => d.trim()).filter(Boolean).map(d => /!\s*important$/i.test(d) ? d : d + ' !important').join(';');
}

export function converter({ gravar = false } = {}) {
  const cache = new Map(), feitos = new Set(), saidas = [];
  function gerar(nome, root = false) {
    if (feitos.has(nome)) return;
    feitos.add(nome);
    const src = readFileSync(resolve(raiz, 'design/canvas', nome + '.dc.html'), 'utf8');
    const html = src.slice(src.indexOf('<x-dc>') + 6, src.lastIndexOf('</x-dc>'));
    const result = converterTemplate(html, cache);
    const script = src.match(/<script\b[^>]*\bdata-dc-script\b[^>]*>([\s\S]*?)<\/script>/)?.[1];
    const proprio = PROPRIOS[nome], id = identificador(nome);
    const pasta = root ? 'src/portal/' : 'src/portal/componentes/';
    let codigo = aviso + '// @ts-nocheck\nimport { Fragment } from "react";\nimport { I, css } from "' + (root ? './' : '../') + 'runtime";\n';
    for (const sub of result.imports) codigo += 'import ' + identificador(sub) + ' from "' + (PROPRIOS[sub] ? (root ? PROPRIOS[sub] : '.' + PROPRIOS[sub]) : (root ? './componentes/' : './') + identificador(sub)) + '";\n';
    if (!root && !proprio) {
      codigo += 'import React from "react";\nimport { DCLogic, criarDC } from "../dc";\n';
      if (result.styles.length) codigo += 'import "./' + id + '.css";\n';
    }
    if (proprio && result.styles.length) codigo += 'import "./' + id + '.css";\n';
    codigo += (root || proprio ? 'export default ' : '') + 'function Template(v: any) {\n  return <>' + result.jsx + '</>;\n}\n';
    if (!root && !proprio) codigo += (script ?? '') + '\nexport default criarDC(' + JSON.stringify(nome) + ', Template' + (script ? ', Component' : '') + ');\n';
    saidas.push([pasta + (root ? 'template' : id + (proprio ? 'Template' : '')) + '.tsx', codigo]);
    if (root || result.styles.length) saidas.push([pasta + (root ? 'portal' : id) + '.css', avisoCSS + result.styles.join('\n') + (root ? '\nhtml,body{height:100%;margin:0}#dc-root,#dc-root>.sc-host{height:100%}\n' : '')]);
    for (const sub of result.imports) gerar(sub);
  }
  gerar('Portal Escolar', true);
  saidas.push(['src/portal/pseudo.css', avisoCSS + [...cache.values()].map(p => p.rule).join('\n') + '\n']);
  if (!gravar) return saidas;
  for (const [file, content] of saidas) {
    const path = resolve(raiz, file);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
    console.log('GERADO ' + file);
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) converter({ gravar: true });
