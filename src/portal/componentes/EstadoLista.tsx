// GERADO por scripts/converter-canvas.mjs — não edite
// @ts-nocheck
import { Fragment } from "react";
import { I, css } from "../runtime";
import React from "react";
import { DCLogic, criarDC } from "../dc";
function Template(v: any) {
  return <><div style={{"padding":"8px 0"}}>{"\n  "}{(v.carregando) ? <>{"\n    "}<div role={"status"} aria-live={"polite"} style={{"display":"flex","flexDirection":"column"}}>{"\n      "}{((_list0: any) => (Array.isArray(_list0) ? _list0 : []).map((_item0: any, _index0: number) => <Fragment key={_index0}>{"\n        "}<div style={{"display":"flex","alignItems":"center","gap":"12px","padding":"12px 20px","borderTop":"1px solid var(--borda-fraca)"}}>{"\n          "}<span style={{"width":"32px","height":"32px","flex":"none","borderRadius":"50%","background":"var(--sunken)"}}></span>{"\n          "}<span style={{"display":"flex","flexDirection":"column","gap":"6px","flex":"1","minWidth":"0"}}>{"\n            "}<span style={{"height":"10px","maxWidth":"220px","background":"var(--sunken)","borderRadius":"2px"}}></span>{"\n            "}<span style={{"height":"8px","maxWidth":"120px","background":"var(--sunken)","borderRadius":"2px"}}></span>{"\n          "}</span>{"\n          "}<span style={{"width":"72px","height":"8px","background":"var(--sunken)","borderRadius":"2px"}}></span>{"\n        "}</div>{"\n      "}</Fragment>))(v.linhas)}{"\n      "}<span style={{"padding":"12px 20px 4px","fontSize":"13px","color":"var(--texto-suave)"}}>{"Carregando…"}</span>{"\n    "}</div>{"\n  "}</> : null}{"\n  "}{(v.vazio) ? <>{"\n    "}<div style={{"display":"flex","flexDirection":"column","alignItems":"center","gap":"8px","padding":"40px 20px","textAlign":"center"}}>{"\n      "}<span style={{"fontFamily":"var(--fonte-titulo,'Newsreader',Georgia,serif)","fontStyle":"italic","fontSize":"22px","fontWeight":"500","color":"var(--texto)"}}>{"Nada por aqui"}</span>{"\n      "}<span style={{"fontSize":"14px","color":"var(--texto-suave)","maxWidth":"40ch","textWrap":"pretty"}}>{""}{I(v.texto)}{""}</span>{"\n    "}</div>{"\n  "}</> : null}{"\n  "}{(v.erro) ? <>{"\n    "}<div role={"alert"} style={{"display":"flex","flexDirection":"column","alignItems":"center","gap":"12px","padding":"40px 20px","textAlign":"center"}}>{"\n      "}<span style={{"fontFamily":"var(--fonte-titulo,'Newsreader',Georgia,serif)","fontStyle":"italic","fontSize":"22px","fontWeight":"500","color":"var(--aviso)"}}>{"Não foi possível carregar"}</span>{"\n      "}<span style={{"fontSize":"14px","color":"var(--texto-suave)","maxWidth":"40ch","textWrap":"pretty"}}>{"A conexão com o servidor falhou. Seus dados não foram perdidos."}</span>{"\n      "}<button style={{"minHeight":"36px","padding":"0 16px","border":"1px solid var(--borda)","borderRadius":"2px","background":"var(--superficie)","fontSize":"14px","fontWeight":"500","cursor":"pointer"}} className={["scp1"].filter(Boolean).join(" ")}>{"Tentar de novo"}</button>{"\n    "}</div>{"\n  "}</> : null}</div></>;
}

class Component extends DCLogic {
  renderVals() {
    const t = this.props.tipo;
    return {
      carregando: t === 'carregando', vazio: t === 'vazio', erro: t === 'erro',
      linhas: [1, 2, 3, 4],
      texto: this.props.mensagem ?? 'Nenhum item encontrado.'
    };
  }
}

export default criarDC("EstadoLista", Template, Component);
