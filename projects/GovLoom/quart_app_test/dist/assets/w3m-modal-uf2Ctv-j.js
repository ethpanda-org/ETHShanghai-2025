const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-CSYJw-LT.js","assets/index-ClH3SUgu.js","assets/index-CCMyQJ5m.css"])))=>i.map(i=>d[i]);
import{i as v,a as y,M as a,A as h,O as p,c as C,E as k,x as S,R as m,_ as f,T as x,U as A,d as E,S as O,C as u,r as c,e as _}from"./index-ClH3SUgu.js";const L=v`
  :host {
    z-index: var(--w3m-z-index);
    display: block;
    backface-visibility: hidden;
    will-change: opacity;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    opacity: 0;
    background-color: var(--wui-cover);
    transition: opacity 0.2s var(--wui-ease-out-power-2);
    will-change: opacity;
  }

  :host(.open) {
    opacity: 1;
  }

  wui-card {
    max-width: var(--w3m-modal-width);
    width: 100%;
    position: relative;
    animation: zoom-in 0.2s var(--wui-ease-out-power-2);
    animation-fill-mode: backwards;
    outline: none;
  }

  wui-card[shake='true'] {
    animation:
      zoom-in 0.2s var(--wui-ease-out-power-2),
      w3m-shake 0.5s var(--wui-ease-out-power-2);
  }

  wui-flex {
    overflow-x: hidden;
    overflow-y: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  @media (max-height: 700px) and (min-width: 431px) {
    wui-flex {
      align-items: flex-start;
    }

    wui-card {
      margin: var(--wui-spacing-xxl) 0px;
    }
  }

  @media (max-width: 430px) {
    wui-flex {
      align-items: flex-end;
    }

    wui-card {
      max-width: 100%;
      border-bottom-left-radius: 0;
      border-bottom-right-radius: 0;
      border-bottom: none;
      animation: slide-in 0.2s var(--wui-ease-out-power-2);
    }

    wui-card[shake='true'] {
      animation:
        slide-in 0.2s var(--wui-ease-out-power-2),
        w3m-shake 0.5s var(--wui-ease-out-power-2);
    }
  }

  @keyframes zoom-in {
    0% {
      transform: scale(0.95) translateY(0);
    }
    100% {
      transform: scale(1) translateY(0);
    }
  }

  @keyframes slide-in {
    0% {
      transform: scale(1) translateY(50px);
    }
    100% {
      transform: scale(1) translateY(0);
    }
  }

  @keyframes w3m-shake {
    0% {
      transform: scale(1) rotate(0deg);
    }
    20% {
      transform: scale(1) rotate(-1deg);
    }
    40% {
      transform: scale(1) rotate(1.5deg);
    }
    60% {
      transform: scale(1) rotate(-1.5deg);
    }
    80% {
      transform: scale(1) rotate(1deg);
    }
    100% {
      transform: scale(1) rotate(0deg);
    }
  }

  @keyframes w3m-view-height {
    from {
      height: var(--prev-height);
    }
    to {
      height: var(--new-height);
    }
  }
`;var l=function(w,e,t,o){var r=arguments.length,i=r<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,t):o,s;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(w,e,t,o);else for(var d=w.length-1;d>=0;d--)(s=w[d])&&(i=(r<3?s(i):r>3?s(e,t,i):s(e,t))||i);return r>3&&i&&Object.defineProperty(e,t,i),i};const b="scroll-lock";let n=class extends y{constructor(){super(),this.unsubscribe=[],this.abortController=void 0,this.open=a.state.open,this.caipAddress=h.state.caipAddress,this.isSiweEnabled=p.state.isSiweEnabled,this.connected=h.state.isConnected,this.loading=a.state.loading,this.shake=a.state.shake,this.initializeTheming(),C.prefetch(),this.unsubscribe.push(a.subscribeKey("open",e=>e?this.onOpen():this.onClose()),a.subscribeKey("shake",e=>this.shake=e),a.subscribeKey("loading",e=>{this.loading=e,this.onNewAddress(h.state.caipAddress)}),h.subscribeKey("isConnected",e=>this.connected=e),h.subscribeKey("caipAddress",e=>this.onNewAddress(e)),p.subscribeKey("isSiweEnabled",e=>this.isSiweEnabled=e)),k.sendEvent({type:"track",event:"MODAL_LOADED"})}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),this.onRemoveKeyboardListener()}render(){return this.open?S`
          <wui-flex @click=${this.onOverlayClick.bind(this)} data-testid="w3m-modal-overlay">
            <wui-card
              shake="${this.shake}"
              role="alertdialog"
              aria-modal="true"
              tabindex="0"
              data-testid="w3m-modal-card"
            >
              <w3m-header></w3m-header>
              <w3m-router></w3m-router>
              <w3m-snackbar></w3m-snackbar>
            </wui-card>
          </wui-flex>
          <w3m-tooltip></w3m-tooltip>
        `:null}async onOverlayClick(e){e.target===e.currentTarget&&await this.handleClose()}async handleClose(){const e=m.state.view==="ConnectingSiwe",t=m.state.view==="ApproveTransaction";if(this.isSiweEnabled){const{SIWEController:o}=await f(async()=>{const{SIWEController:i}=await import("./index-CSYJw-LT.js");return{SIWEController:i}},__vite__mapDeps([0,1,2]));o.state.status!=="success"&&(e||t)?a.shake():a.close()}else a.close()}initializeTheming(){const{themeVariables:e,themeMode:t}=x.state,o=A.getColorTheme(t);E(e,o)}onClose(){this.open=!1,this.classList.remove("open"),this.onScrollUnlock(),O.hide(),this.onRemoveKeyboardListener()}onOpen(){this.open=!0,this.classList.add("open"),this.onScrollLock(),this.onAddKeyboardListener()}onScrollLock(){const e=document.createElement("style");e.dataset.w3m=b,e.textContent=`
      body {
        touch-action: none;
        overflow: hidden;
        overscroll-behavior: contain;
      }
      w3m-modal {
        pointer-events: auto;
      }
    `,document.head.appendChild(e)}onScrollUnlock(){const e=document.head.querySelector(`style[data-w3m="${b}"]`);e&&e.remove()}onAddKeyboardListener(){this.abortController=new AbortController;const e=this.shadowRoot?.querySelector("wui-card");e?.focus(),window.addEventListener("keydown",t=>{if(t.key==="Escape")this.handleClose();else if(t.key==="Tab"){const{tagName:o}=t.target;o&&!o.includes("W3M-")&&!o.includes("WUI-")&&e?.focus()}},this.abortController)}onRemoveKeyboardListener(){this.abortController?.abort(),this.abortController=void 0}async onNewAddress(e){if(!this.connected||this.loading)return;const t=u.getPlainAddress(this.caipAddress),o=u.getPlainAddress(e),r=u.getNetworkId(this.caipAddress),i=u.getNetworkId(e);if(this.caipAddress=e,this.isSiweEnabled){const{SIWEController:s}=await f(async()=>{const{SIWEController:g}=await import("./index-CSYJw-LT.js");return{SIWEController:g}},__vite__mapDeps([0,1,2])),d=await s.getSession();if(d&&t&&o&&t!==o){s.state._client?.options.signOutOnAccountChange&&(await s.signOut(),this.onSiweNavigation());return}if(d&&r&&i&&r!==i){s.state._client?.options.signOutOnNetworkChange&&(await s.signOut(),this.onSiweNavigation());return}this.onSiweNavigation()}}onSiweNavigation(){this.open?m.push("ConnectingSiwe"):a.open({view:"ConnectingSiwe"})}};n.styles=L;l([c()],n.prototype,"open",void 0);l([c()],n.prototype,"caipAddress",void 0);l([c()],n.prototype,"isSiweEnabled",void 0);l([c()],n.prototype,"connected",void 0);l([c()],n.prototype,"loading",void 0);l([c()],n.prototype,"shake",void 0);n=l([_("w3m-modal")],n);export{n as W3mModal};
