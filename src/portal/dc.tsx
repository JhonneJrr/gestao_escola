import React from 'react';

type Update = Record<string, any> | null | ((prev: any) => Record<string, any> | null);

export class DCLogic {
  props: any;
  state: any = {};
  __host?: { __setLogicState: (update: Update, cb?: () => void) => void; forceUpdate: () => void };

  constructor(props: any) { this.props = props || {}; }
  setState(update: Update, cb?: () => void) { this.__host?.__setLogicState(update, cb); }
  forceUpdate() { this.__host?.forceUpdate(); }
  componentDidMount() {}
  componentDidUpdate(_prevProps: any) {}
  componentWillUnmount() {}
  renderVals(): any { return {}; }
}

export function criarDC(nome: string, Template: (v: any) => React.ReactNode, Logic: typeof DCLogic = DCLogic) {
  return class Host extends React.Component<any, { __v: number }> {
    logic: DCLogic;

    constructor(props: any) {
      super(props);
      this.state = { __v: 0 };
      this.logic = new Logic(this.__userProps());
      this.logic.__host = this;
    }
    __userProps() {
      const { __tplId, __hostStyle, __hintSize, __name, ...rest } = this.props;
      return rest;
    }
    __setLogicState(update: Update, cb?: () => void) {
      const prev = this.logic.state;
      const patch = typeof update === 'function' ? update(prev) : update;
      this.logic.state = { ...prev, ...patch };
      this.setState(s => ({ __v: s.__v + 1 }), cb);
    }
    componentDidMount() { this.logic.componentDidMount(); }
    componentDidUpdate(prevProps: any) {
      this.logic.props = this.__userProps();
      this.logic.componentDidUpdate(prevProps);
    }
    componentWillUnmount() { this.logic.componentWillUnmount(); }
    render() {
      const propsDoUsuario = this.__userProps();
      this.logic.props = propsDoUsuario;
      const vals = { ...propsDoUsuario, ...this.logic.renderVals() };
      return <div className="sc-host" style={this.props.__hostStyle} data-sc-name={nome}>{Template(vals)}</div>;
    }
  };
}
