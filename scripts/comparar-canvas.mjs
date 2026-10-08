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
// PORTA escolhe a porta do vite do comparador (padrão 5173); use outra quando já houver um vite rodando.
const PORTA = Number(process.env.PORTA || 5173);
const canvas = resolve(raiz, 'design/canvas');
const saida = resolve(raiz, 'e2e/saida');
// Os estados de `inicio` vêm direto das opções do canvas da atualização 3 (os mesmos nomes que o porte DEV aceita).
const propsCanvas = arquivo => JSON.parse(readFileSync(resolve(canvas, arquivo), 'utf8').match(/data-props="([^"]*)"/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
const estados = propsCanvas('Portal Escolar.dc.html').inicio.options;
const casos = [
  ...estados.map(inicio => ({ inicio })),
  ...["Vazio", "Enviando", "Só texto", "Com proposta", "Com \"Não coube\"", "Aplicando", "Aplicada", "Erro: não configurado", "Erro: limite de uso", "Erro: sem conexão"].map(iaEstado => ({ inicio: 'Escola', iaEstado })),
  ...['Não configurado', 'Limite de uso', 'Sem conexão'].map(iaErroSimulado => ({ inicio: 'Escola · assistente vazio', iaErroSimulado })),
  { inicio: 'Apresentação', funcoesEstilo: 'Espiral' },
  ...['Quarta 10:20', 'Quinta 14:00'].flatMap(relogio => ['Escola', 'Professor', 'Aluno'].map(inicio => ({ inicio, relogio }))),
];
let opcoes = {};

// Menu da atualização 3: os Alt+N seguem esta ordem (TELAS_POR do canvas).
const abas = {
  Escola: ['Painel', 'Semestre', 'Professores', 'Alunos', 'Acadêmico', 'Avisos'],
  Professor: ['Painel', 'Acadêmico', 'Minhas turmas', 'Avisos'],
};
const filtro = process.argv.includes('--estado') ? process.argv[process.argv.indexOf('--estado') + 1] : '';
// ESTADOS=<regex> filtra também por expressão regular (rodar por partes, sem estourar o tempo).
const regexEstados = process.env.ESTADOS ? new RegExp(process.env.ESTADOS) : null;
const passa = texto => texto.includes(filtro) && (!regexEstados || regexEstados.test(texto));
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
      body = body.toString('utf8').replace(/<dc-import name="GradeAgenda"/g, '<dc-import name="GradeAgenda" relogio="' + (opcoes.relogio || 'Terça 08:40') + '"').replace(/data-props="([^"]*)"/, (_, raw) => {
        const props = JSON.parse(raw.replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
        props.inicio.default = inicio;
        props.movimento.default = 'Reduzido';
        for (const [k, v] of Object.entries(opcoes)) if (props[k]) props[k].default = v;
        return 'data-props="' + JSON.stringify(props).replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"';
      });
    }
    if (path === resolve(canvas, 'GradeAgenda.dc.html')) body = body.toString('utf8').replace(/data-props="([^"]*)"/, (_, raw) => {
      const props = JSON.parse(raw.replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
      props.relogio.default = 'Terça 08:40';
      return 'data-props="' + JSON.stringify(props).replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"';
    });
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
    probe.listen(PORTA, 'localhost', () => probe.close(() => resolvePorta(false)));
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
    vite = spawn(process.execPath, [resolve(raiz, 'node_modules/vite/bin/vite.js'), '--host', 'localhost', '--port', String(PORTA), '--strictPort'], { cwd: raiz, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    vite.stdout.on('data', data => { log += data; });
    vite.stderr.on('data', data => { log += data; });
    let pronto = false;
    for (let i = 0; i < 100; i++) {
      if (vite.exitCode !== null) throw new Error('Vite encerrou antes de servir o portal:\n' + log);
      try { pronto = (await fetch('http://localhost:' + PORTA + '/')).ok; } catch {}
      if (pronto) break;
      await esperar(100);
    }
    if (!pronto) throw new Error('Vite não ficou disponível em :' + PORTA + ':\n' + log);
  }
  browser = await chromium.launch({ channel: 'msedge' });
  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    for (const caso of casos) {
      inicio = caso.inicio; opcoes = caso;
      const variante = caso.iaEstado ? ' / IA ' + caso.iaEstado : caso.iaErroSimulado ? ' / Simulação ' + caso.iaErroSimulado : caso.funcoesEstilo ? ' / ' + caso.funcoesEstilo : caso.relogio ? ' / ' + caso.relogio : '';
      const nomeInicio = inicio + variante;
      const nomes = [nomeInicio, ...(inicio === 'Aluno' ? ['Aluno' + variante + ' / Acadêmico'] : []), ...(abas[inicio] ?? []).map((aba, i) => inicio + variante + ' / ' + aba + ' [Alt+' + (i + 1) + ']')];
      const sufixo = ' · ' + viewport.width + '×' + viewport.height;
      if (!nomes.some(nome => passa(nome + sufixo))) continue;
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
        porte.goto('http://localhost:' + PORTA + '/?' + new URLSearchParams({ relogio: 'Terça 08:40', ...caso, movimento: 'Reduzido' }), { waitUntil: 'load' }),
      ]);
      if (externas.size) throw new Error('URL externa não prevista pelo plano; comparação interrompida:\n' + [...externas].join('\n'));
      if (erros.length) throw new Error('Erro de execução do canvas/porte:\n' + erros.join('\n'));
      async function comparar(estado, captura = false, abaIndex = -1) {
        const label = estado + sufixo;
        const [ref, portado] = await Promise.all([estabilizar(referencia), estabilizar(porte)]);
        if (externas.size) throw new Error('URL externa não prevista pelo plano; comparação interrompida:\n' + [...externas].join('\n'));
        if (erros.length) throw new Error('Erro de execução do canvas/porte:\n' + erros.join('\n'));
        if (!passa(label)) return;
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
          // O canvas às vezes varia de uma abertura para outra (medidas e animações dependem do tempo): o controle
          // abre o canvas mais três vezes, cada uma em outro contexto, e compara o porte com todas as aberturas.
          const resultados = [ref];
          for (let n = 0; n < 3; n++) {
            const controleContext = await browser.newContext({ viewport, reducedMotion: 'reduce' });
            try {
              const page = await controleContext.newPage();
              await preparar(page);
              await page.goto(urlReferencia, { waitUntil: 'load' });
              let resultado = await estabilizar(page);
              if (abaIndex === -2) { await page.getByRole('button', { name: 'Acadêmico', exact: true }).click(); resultado = await estabilizar(page); }
              for (let i = 0; i <= abaIndex && resultado.estavel; i++) {
                await page.keyboard.press('Alt+' + (i + 1));
                resultado = await estabilizar(page);
              }
              resultados.push(resultado);
            } finally {
              await controleContext.close();
            }
          }
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
            const aberturas = resultados.map(r => r.atual);
            const igual = aberturas.every(a => a === aberturas[0]);
            // Quando o canvas varia, diz se o porte bate com alguma abertura (e, na segunda régua, sem o indicador de seleção das abas).
            const solto = s => s.replace(/<div aria-hidden="true" style="position: absolute; left: 0px; top: 0px;[^"]*"><\/div>/g, '').replace(/ isolation: isolate;/g, '');
            const veredito = aberturas.includes(portado.atual) ? 'porte igual a uma abertura do canvas' : aberturas.some(a => solto(a) === solto(portado.atual)) ? 'porte igual a uma abertura do canvas, fora o indicador de seleção' : 'porte DIFERE de todas as aberturas do canvas';
            console.log((igual ? 'DIFERENTE ' : 'ANIMADO (canvas difere de si mesmo) ') + label + ' · CONTROLE canvas x canvas: ' + (igual ? 'IGUAL' : 'DIFERENTE · ' + veredito));
            const outra = aberturas.find(a => a !== aberturas[0]) ?? aberturas[1];
            const controle = diff(aberturas[0], outra, 'canvas abertura 1', 'canvas outra abertura');
            writeFileSync(resolve(saida, 'comparar-' + file + '-controle.diff'), controle);
            console.log((igual ? texto : controle).split('\n').slice(0, 5).join('\n'));
            if (igual) process.exitCode = 1;
          }
        }
        if (captura) await Promise.all([
          referencia.screenshot({ path: resolve(saida, file + '-canvas.png') }),
          porte.screenshot({ path: resolve(saida, file + '-porte.png') }),
        ]);
      }
      await comparar(nomeInicio, ['Login', 'Escola', 'Aluno'].includes(inicio));
      for (const [i, aba] of (abas[inicio] ?? []).entries()) {
        if (!nomes.slice(i + 1).some(nome => passa(nome + sufixo))) break;
        await Promise.all([referencia.keyboard.press('Alt+' + (i + 1)), porte.keyboard.press('Alt+' + (i + 1))]);
        if (erros.length) throw new Error('Erro ao percorrer abas:\n' + erros.join('\n'));
        await comparar(inicio + variante + ' / ' + aba + ' [Alt+' + (i + 1) + ']', false, i);
      }
      if (inicio === 'Aluno') {
        await Promise.all([referencia.getByRole('button', { name: 'Acadêmico', exact: true }).click(), porte.getByRole('button', { name: 'Acadêmico', exact: true }).click()]);
        await comparar('Aluno' + variante + ' / Acadêmico', false, -2);
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
