// Estes testes detectam perda de escopo, interpolação, CSS e estado síncrono.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
function carregarTS(arquivo, dependencias = {}) {
  const codigo = ts.transpileModule(readFileSync(arquivo, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const modulo = { exports: {} };
  new Function('require', 'module', 'exports', codigo)(
    nome => dependencias[nome] ?? require(nome), modulo, modulo.exports,
  );
  return modulo.exports;
}

test('conversão conserva escopo interno, caminhos ausentes, texto e atributos', async () => {
  assert.ok(existsSync('scripts/converter-canvas.mjs'), 'o conversor ainda não foi implementado');
  const { converterTemplate } = await import('../scripts/converter-canvas.mjs');
  const { I, css } = carregarTS('src/portal/runtime.ts');
  const { jsx } = converterTemplate('<div class="base" style="--x:1;font-size:12px" style-hover="color:red" tabindex="0" ref="{{ ref }}"><sc-if value="{{ zero }}">errado</sc-if><sc-for list="{{ lista }}" as="v"><span title="n={{ v.nome }};x={{ ausente.x }}"> {{ v.nome }} {{ $index }}<sc-for list="{{ v.itens }}" as="v">{{ v }}:{{ $index }}</sc-for></span></sc-for>{{ ausente.x }}{{ sim }}{{ numero }}<input value="{{ ausente }}" checked="{{ ausente }}" onchange="{{ handler }}" inputmode="numeric"/><svg viewBox="0 0 1 1"><path stroke-width="2"/></svg></div>');
  const codigo = ts.transpileModule('const { Fragment } = React; function Template(v: any) { return <>' + jsx + '</>; }', {
    compilerOptions: { jsx: ts.JsxEmit.React },
  }).outputText;
  const Template = new Function('React', 'I', 'css', codigo + ';return Template;')(React, I, css);
  assert.equal(renderToStaticMarkup(Template({ zero: 0, lista: [{ nome: 'A', itens: ['B'] }], sim: true, numero: 0, handler: () => {}, ref: React.createRef() })),
    '<div class="base scp0" style="--x:1;font-size:12px" tabindex="0"><span title="n=A;x="> <span class="sc-interp">A</span> <span class="sc-interp">0</span><span class="sc-interp">B</span>:<span class="sc-interp">0</span></span><span class="sc-interp">0</span><input inputMode="numeric" value=""/><svg viewBox="0 0 1 1"><path stroke-width="2"></path></svg></div>');
});

test('pseudoestilos deduplicam por par e dc-import filtra o estilo do host', async () => {
  assert.ok(existsSync('scripts/converter-canvas.mjs'), 'o conversor ainda não foi implementado');
  const { converterTemplate } = await import('../scripts/converter-canvas.mjs');
  const resultado = converterTemplate('<button style-hover="color:red"/><button style-hover="color:red" style-focus="color:red"/><dc-import name="EstadoLista" b-c="{{ objeto }}" style="width:50px;color:red;z-index:2">filho</dc-import>');
  assert.deepEqual(resultado.pseudos, ['.scp0:hover{color:red !important}', '.scp1:focus{color:red !important}']);
  assert.deepEqual(resultado.imports, ['EstadoLista']);
  assert.match(resultado.jsx, /bC=\{v\.objeto\}/);
  assert.match(resultado.jsx, /__hostStyle=\{\{"width":"50px","zIndex":"2"\}\}/);
  assert.match(resultado.jsx, /\{"filho"\}/);
});

test('host atualiza a lógica antes do render e repassa props e ciclos de vida', () => {
  assert.ok(existsSync('src/portal/dc.tsx'), 'o host síncrono ainda não foi implementado');
  const { DCLogic, criarDC } = carregarTS('src/portal/dc.tsx');
  const chamadas = [];
  class Logic extends DCLogic {
    state = { n: 0, preservado: true };
    componentDidMount() { chamadas.push('montou'); }
    componentDidUpdate(prev) { chamadas.push([prev.titulo, this.props.titulo]); }
    componentWillUnmount() { chamadas.push('desmontou'); }
    renderVals() { return { titulo: String(this.state.n) }; }
  }
  const Host = criarDC('Teste', v => React.createElement('span', null, v.titulo), Logic);
  const host = new Host({ titulo: 'primeiro', __tplId: 'x', __name: 'interno', __hintSize: '1,1', __hostStyle: { width: '2px' } });
  host.setState = (update, cb) => { host.state = { ...host.state, ...update(host.state) }; cb?.(); };
  host.logic.setState({ n: 1 });
  assert.deepEqual(host.logic.state, { n: 1, preservado: true });
  host.logic.setState(prev => ({ n: prev.n + 1 }), () => chamadas.push(host.logic.state.n));
  assert.deepEqual(host.logic.state, { n: 2, preservado: true });
  assert.deepEqual(host.logic.props, { titulo: 'primeiro' });
  assert.equal(renderToStaticMarkup(host.render()), '<div class="sc-host" style="width:2px" data-sc-name="Teste"><span>2</span></div>');
  host.componentDidMount();
  host.props = { titulo: 'segundo' };
  host.componentDidUpdate({ titulo: 'primeiro' });
  host.componentWillUnmount();
  assert.deepEqual(chamadas, [2, 'montou', ['primeiro', 'segundo'], 'desmontou']);
});
