// React 18 e 19 inserem atributos em ordens distintas; a ordem não tem semântica no DOM.
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { createServer as servidorTCP } from 'node:net';
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as esperar } from 'node:timers/promises';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const canvas = resolve(raiz, 'design/canvas');
const saida = resolve(raiz, 'e2e/saida');
const estados = ['Apresentação', 'Login', 'Primeiro acesso', 'Escola', 'Professor', 'Professor · sem permissão', 'Aluno'];
const abas = {
  Escola: ['Painel', 'Semestre', 'Disciplinas', 'Professores', 'Alunos', 'Matrículas', 'Agenda', 'Avisos'],
  Professor: ['Painel', 'Agenda', 'Minhas disciplinas', 'Meus alunos', 'Avisos'],
};
const filtro = process.argv.includes('--estado') ? process.argv[process.argv.indexOf('--estado') + 1] : '';
const reactLocal = new Map([
  ['https://unpkg.com/react@18.3.1/umd/react.production.min.js', resolve(raiz, 'scripts/referencia/react.production.min.js')],
  ['https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js', resolve(raiz, 'scripts/referencia/react-dom.production.min.js')],
]);
let inicio = estados[0];
const servidor = createServer((req, res) => {
  const path = resolve(canvas, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!path.startsWith(canvas + sep)) { res.writeHead(404).end(); return; }
  try {
    let body = readFileSync(path);
    if (path === resolve(canvas, 'Portal Escolar.dc.html')) {
      body = body.toString('utf8').replace(/data-props="([^"]*)"/, (_, raw) => {
        const props = JSON.parse(raw.replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
        props.inicio.default = inicio;
        props.movimento.default = 'Reduzido';
        return 'data-props="' + JSON.stringify(props).replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"';
      });
    }
    const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
    res.writeHead(200, { 'Content-Type': (tipos[extname(path)] ?? 'application/octet-stream') + '; charset=utf-8' }).end(body);
  } catch (erro) {
    if (erro.code !== 'ENOENT') console.error(erro);
    res.writeHead(404).end();
  }
});

async function portaOcupada() {
  return new Promise((resolvePorta, reject) => {
    const probe = servidorTCP();
    probe.once('error', erro => erro.code === 'EADDRINUSE' ? resolvePorta(true) : reject(erro));
    probe.listen(5173, 'localhost', () => probe.close(() => resolvePorta(false)));
  });
}

// Normalizações autorizadas: tpl id, pseudo-classe, conteúdo do canvas e ordem dos atributos.
async function dom(page) {
  await page.locator('#dc-root > .sc-host[data-sc-name="Portal Escolar"]').waitFor({ state: 'attached' });
  return page.locator('#dc-root').evaluate(root => {
    const regras = new Map();
    function ler(sheet) {
      if (sheet.href && ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(new URL(sheet.href).hostname)) return;
      for (const rule of sheet.cssRules) {
        if (rule.styleSheet) ler(rule.styleSheet);
        const match = rule.selectorText?.match(/^\.(scp[a-z0-9]+)(:(?:hover|active|focus))$/);
        if (match) regras.set(match[1], match[2] + '{' + rule.style.cssText + '}');
      }
    }
    for (const sheet of document.styleSheets) ler(sheet);
    const clone = root.cloneNode(true);
    for (const el of [clone, ...clone.querySelectorAll('*')]) {
      el.removeAttribute('data-dc-tpl');
      if (el.hasAttribute('class')) {
        el.setAttribute('class', el.getAttribute('class').split(/\s+/).map(c => {
          if (!/^scp[a-z0-9]+$/.test(c)) return c;
          if (!regras.has(c)) throw new Error('Regra CSS ausente para ' + c);
          return regras.get(c);
        }).join(' '));
      }
      if (el.localName === 'canvas') el.replaceChildren();
      const atributos = [...el.attributes].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
      for (const attr of atributos) el.removeAttributeNode(attr);
      for (const attr of atributos) el.setAttributeNodeNS(attr);
    }
    return clone.outerHTML;
  });
}

async function estabilizar(page) {
  const fim = Date.now() + 8000;
  let atual = await dom(page), anterior = atual;
  while (Date.now() < fim) {
    await esperar(Math.min(400, fim - Date.now()));
    anterior = atual;
    atual = await dom(page);
    if (atual === anterior && Date.now() <= fim) return { atual, anterior, estavel: true };
  }
  return { atual, anterior, estavel: false };
}

function diff(ref, porte, ladoA = 'canvas', ladoB = 'porte') {
  let i = 0;
  while (i < ref.length && i < porte.length && ref[i] === porte[i]) i++;
  const trecho = s => s.slice(Math.max(0, i - 100), i + 300).replace(/\n/g, '\\n');
  return ['--- ' + ladoA, '+++ ' + ladoB, '@@ caractere ' + i + ' @@', '-' + trecho(ref), '+' + trecho(porte), '', '--- DOM ' + ladoA + ' completo ---', ref, '', '+++ DOM ' + ladoB + ' completo +++', porte].join('\n') + '\n';
}

let vite, browser;
const externas = new Set();
try {
  mkdirSync(saida, { recursive: true });
  await new Promise(resolveServidor => servidor.listen(0, '127.0.0.1', resolveServidor));
  if (!await portaOcupada()) {
    vite = spawn(process.execPath, [resolve(raiz, 'node_modules/vite/bin/vite.js'), '--host', 'localhost', '--port', '5173', '--strictPort'], { cwd: raiz, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    vite.stdout.on('data', data => { log += data; });
    vite.stderr.on('data', data => { log += data; });
    let pronto = false;
    for (let i = 0; i < 100; i++) {
      if (vite.exitCode !== null) throw new Error('Vite encerrou antes de servir o portal:\n' + log);
      try { pronto = (await fetch('http://localhost:5173/portal.html')).ok; } catch {}
      if (pronto) break;
      await esperar(100);
    }
    if (!pronto) throw new Error('Vite não ficou disponível em :5173:\n' + log);
  }
  browser = await chromium.launch({ channel: 'msedge' });
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    for (inicio of estados) {
      const nomes = [inicio, ...(abas[inicio] ?? []).map((aba, i) => inicio + ' / ' + aba + ' [Alt+' + (i + 1) + ']')];
      const sufixo = ' · ' + viewport.width + '×' + viewport.height;
      if (!nomes.some(nome => (nome + sufixo).includes(filtro))) continue;
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      const referencia = await context.newPage();
      const porte = await context.newPage();
      const erros = [];
      async function preparar(page) {
        page.on('pageerror', erro => erros.push(erro.message));
        await page.route('**/*', route => {
          const url = route.request().url();
          const parsed = new URL(url);
          if (reactLocal.has(url)) return route.fulfill({ path: reactLocal.get(url), contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' } });
          if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(parsed.hostname)) return route.abort();
          if (!['localhost', '127.0.0.1'].includes(parsed.hostname)) { externas.add(url); return route.abort(); }
          return route.continue();
        });
      }
      for (const page of [referencia, porte]) await preparar(page);
      const urlReferencia = 'http://127.0.0.1:' + servidor.address().port + '/Portal%20Escolar.dc.html';
      await Promise.all([
        referencia.goto(urlReferencia, { waitUntil: 'load' }),
        porte.goto('http://localhost:5173/portal.html?' + new URLSearchParams({ inicio, movimento: 'Reduzido' }), { waitUntil: 'load' }),
      ]);
      if (externas.size) throw new Error('URL externa não prevista pelo plano; comparação interrompida:\n' + [...externas].join('\n'));
      if (erros.length) throw new Error('Erro de execução do canvas/porte:\n' + erros.join('\n'));
      async function comparar(estado, captura = false, abaIndex = -1) {
        const label = estado + sufixo;
        const [ref, portado] = await Promise.all([estabilizar(referencia), estabilizar(porte)]);
        if (externas.size) throw new Error('URL externa não prevista pelo plano; comparação interrompida:\n' + [...externas].join('\n'));
        if (erros.length) throw new Error('Erro de execução do canvas/porte:\n' + erros.join('\n'));
        if (!label.includes(filtro)) return;
        const file = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
        if (!ref.estavel || !portado.estavel) {
          console.log('INSTAVEL ' + label);
          for (const [lado, resultado] of [['canvas', ref], ['porte', portado]]) {
            if (resultado.estavel) continue;
            const texto = diff(resultado.anterior, resultado.atual, lado + ' penúltima captura', lado + ' última captura');
            writeFileSync(resolve(saida, 'comparar-' + file + '-instavel-' + lado + '.diff'), texto);
            console.log(texto.split('\n').slice(0, 5).join('\n'));
          }
          process.exitCode = 1;
        } else if (ref.atual === portado.atual) {
          console.log('IGUAL ' + label);
        } else {
          const texto = diff(ref.atual, portado.atual);
          writeFileSync(resolve(saida, 'comparar-' + file + '.diff'), texto);
          // A referência que divergiu é a primeira abertura; o controle abre a segunda em outro contexto.
          const controleContext = await browser.newContext({ viewport, reducedMotion: 'reduce' });
          try {
            const page = await controleContext.newPage();
            await preparar(page);
            await page.goto(urlReferencia, { waitUntil: 'load' });
            let resultado = await estabilizar(page);
            for (let i = 0; i <= abaIndex && resultado.estavel; i++) {
              await page.keyboard.press('Alt+' + (i + 1));
              resultado = await estabilizar(page);
            }
            const resultados = [ref, resultado];
            if (externas.size) throw new Error('URL externa não prevista pelo plano; comparação interrompida:\n' + [...externas].join('\n'));
            if (erros.length) throw new Error('Erro de execução do controle:\n' + erros.join('\n'));
            if (resultados.some(r => !r.estavel)) {
              console.log('INSTAVEL ' + label + ' · CONTROLE canvas x canvas: INSTAVEL');
              for (const [i, resultado] of resultados.entries()) {
                if (!resultado.estavel) {
                  writeFileSync(resolve(saida, 'comparar-' + file + '-instavel-controle-' + (i + 1) + '.diff'), diff(resultado.anterior, resultado.atual, 'canvas penúltima captura', 'canvas última captura'));
                }
              }
              process.exitCode = 1;
            } else {
              const igual = resultados[0].atual === resultados[1].atual;
              console.log((igual ? 'DIFERENTE ' : 'ANIMADO (canvas difere de si mesmo) ') + label + ' · CONTROLE canvas x canvas: ' + (igual ? 'IGUAL' : 'DIFERENTE'));
              const controle = diff(resultados[0].atual, resultados[1].atual, 'canvas abertura 1', 'canvas abertura 2');
              writeFileSync(resolve(saida, 'comparar-' + file + '-controle.diff'), controle);
              console.log((igual ? texto : controle).split('\n').slice(0, 5).join('\n'));
              if (igual) process.exitCode = 1;
            }
          } finally {
            await controleContext.close();
          }
        }
        if (captura) await Promise.all([
          referencia.screenshot({ path: resolve(saida, file + '-canvas.png') }),
          porte.screenshot({ path: resolve(saida, file + '-porte.png') }),
        ]);
      }
      await comparar(inicio, ['Login', 'Escola', 'Aluno'].includes(inicio));
      for (const [i, aba] of (abas[inicio] ?? []).entries()) {
        if (!nomes.slice(i + 1).some(nome => (nome + sufixo).includes(filtro))) break;
        await Promise.all([referencia.keyboard.press('Alt+' + (i + 1)), porte.keyboard.press('Alt+' + (i + 1))]);
        if (erros.length) throw new Error('Erro ao percorrer abas:\n' + erros.join('\n'));
        await comparar(inicio + ' / ' + aba + ' [Alt+' + (i + 1) + ']', false, i);
      }
      await context.close();
    }
  }
} catch (erro) {
  console.error(erro.message);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (vite) {
    const encerrou = new Promise(resolveFim => vite.once('exit', resolveFim));
    vite.kill();
    if (vite.exitCode === null) await encerrou;
  }
  await new Promise(resolveFim => servidor.close(resolveFim));
}
