import{r as Ye,a as i,j as l,u as Qe,T as Je,R as Xe,D as et,b as tt,G as ot,c as U,d as De,e as nt,s as rt,g as st,f as it,h as ct,i as $e,k as ne,l as _e,m as P,n as at,o as lt,p as ut,N as ze,A as dt,B as mt,I as ft,q as Re,t as ht,P as gt,v as pt,C as yt}from"./hooks-BhuarnWy.js";import{S as Ct,a as St,C as vt,I as bt}from"./IPFSProvider-CACrVOai.js";var te={},je;function xt(){if(je)return te;je=1;var e=Ye();return te.createRoot=e.createRoot,te.hydrateRoot=e.hydrateRoot,te}var kt=xt();const Ve=e=>{const t=i.useRef({});return i.useEffect(()=>{t.current=e}),t.current},qe=i.createContext(null);function ue(){return i.useContext(qe)}const Ot=typeof Symbol=="function"&&Symbol.for,Mt=Ot?Symbol.for("mui.nested"):"__THEME_NESTED__";function Tt(e,t){return typeof t=="function"?t(e):{...e,...t}}function $t(e){const{children:t,theme:o}=e,n=ue(),s=i.useMemo(()=>{const d=n===null?{...o}:Tt(n,o);return d!=null&&(d[Mt]=n!==null),d},[o,n]);return l.jsx(qe.Provider,{value:s,children:t})}const Ee={};function Pe(e,t,o,n=!1){return i.useMemo(()=>{const s=e&&t[e]||t;if(typeof o=="function"){const d=o(s),r=e?{...t,[e]:d}:d;return n?()=>r:r}return e?{...t,[e]:o}:{...t,...o}},[e,t,o,n])}function He(e){const{children:t,theme:o,themeId:n}=e,s=Qe(Ee),d=ue()||Ee,r=Pe(n,s,o),c=Pe(n,d,o,!0),a=(n?r[n]:r).direction==="rtl";return l.jsx($t,{theme:c,children:l.jsx(Je.Provider,{value:r,children:l.jsx(Xe,{value:a,children:l.jsx(et,{value:n?r[n].components:r.components,children:t})})})})}const de="mode",me="color-scheme",Rt="data-color-scheme";function jt(e){const{defaultMode:t="system",defaultLightColorScheme:o="light",defaultDarkColorScheme:n="dark",modeStorageKey:s=de,colorSchemeStorageKey:d=me,attribute:r=Rt,colorSchemeNode:c="document.documentElement",nonce:a}=e||{};let u="",C=r;if(r==="class"&&(C=".%s"),r==="data"&&(C="[data-%s]"),C.startsWith(".")){const p=C.substring(1);u+=`${c}.classList.remove('${p}'.replace('%s', light), '${p}'.replace('%s', dark));
      ${c}.classList.add('${p}'.replace('%s', colorScheme));`}const v=C.match(/\[([^\]]+)\]/);if(v){const[p,f]=v[1].split("=");f||(u+=`${c}.removeAttribute('${p}'.replace('%s', light));
      ${c}.removeAttribute('${p}'.replace('%s', dark));`),u+=`
      ${c}.setAttribute('${p}'.replace('%s', colorScheme), ${f?`${f}.replace('%s', colorScheme)`:'""'});`}else u+=`${c}.setAttribute('${C}', colorScheme);`;return l.jsx("script",{suppressHydrationWarning:!0,nonce:typeof window>"u"?a:"",dangerouslySetInnerHTML:{__html:`(function() {
try {
  let colorScheme = '';
  const mode = localStorage.getItem('${s}') || '${t}';
  const dark = localStorage.getItem('${d}-dark') || '${n}';
  const light = localStorage.getItem('${d}-light') || '${o}';
  if (mode === 'system') {
    // handle system mode
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    if (mql.matches) {
      colorScheme = dark
    } else {
      colorScheme = light
    }
  }
  if (mode === 'light') {
    colorScheme = light;
  }
  if (mode === 'dark') {
    colorScheme = dark;
  }
  if (colorScheme) {
    ${u}
  }
} catch(e){}})();`}},"mui-color-scheme-init")}function Et(){}const Pt=({key:e,storageWindow:t})=>(!t&&typeof window<"u"&&(t=window),{get(o){if(typeof window>"u")return;if(!t)return o;let n;try{n=t.localStorage.getItem(e)}catch{}return n||o},set:o=>{if(t)try{t.localStorage.setItem(e,o)}catch{}},subscribe:o=>{if(!t)return Et;const n=s=>{const d=s.newValue;s.key===e&&o(d)};return t.addEventListener("storage",n),()=>{t.removeEventListener("storage",n)}}});function ie(){}function Le(e){if(typeof window<"u"&&typeof window.matchMedia=="function"&&e==="system")return window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}function Ke(e,t){if(e.mode==="light"||e.mode==="system"&&e.systemMode==="light")return t("light");if(e.mode==="dark"||e.mode==="system"&&e.systemMode==="dark")return t("dark")}function Lt(e){return Ke(e,t=>{if(t==="light")return e.lightColorScheme;if(t==="dark")return e.darkColorScheme})}function Nt(e){const{defaultMode:t="light",defaultLightColorScheme:o,defaultDarkColorScheme:n,supportedColorSchemes:s=[],modeStorageKey:d=de,colorSchemeStorageKey:r=me,storageWindow:c=typeof window>"u"?void 0:window,storageManager:a=Pt,noSsr:u=!1}=e,C=s.join(","),v=s.length>1,p=i.useMemo(()=>a==null?void 0:a({key:d,storageWindow:c}),[a,d,c]),f=i.useMemo(()=>a==null?void 0:a({key:`${r}-light`,storageWindow:c}),[a,r,c]),h=i.useMemo(()=>a==null?void 0:a({key:`${r}-dark`,storageWindow:c}),[a,r,c]),[b,O]=i.useState(()=>{const m=(p==null?void 0:p.get(t))||t,g=(f==null?void 0:f.get(o))||o,y=(h==null?void 0:h.get(n))||n;return{mode:m,systemMode:Le(m),lightColorScheme:g,darkColorScheme:y}}),[x,N]=i.useState(u||!v);i.useEffect(()=>{N(!0)},[]);const L=Lt(b),w=i.useCallback(m=>{O(g=>{if(m===g.mode)return g;const y=m??t;return p==null||p.set(y),{...g,mode:y,systemMode:Le(y)}})},[p,t]),B=i.useCallback(m=>{m?typeof m=="string"?m&&!C.includes(m)?console.error(`\`${m}\` does not exist in \`theme.colorSchemes\`.`):O(g=>{const y={...g};return Ke(g,S=>{S==="light"&&(f==null||f.set(m),y.lightColorScheme=m),S==="dark"&&(h==null||h.set(m),y.darkColorScheme=m)}),y}):O(g=>{const y={...g},S=m.light===null?o:m.light,I=m.dark===null?n:m.dark;return S&&(C.includes(S)?(y.lightColorScheme=S,f==null||f.set(S)):console.error(`\`${S}\` does not exist in \`theme.colorSchemes\`.`)),I&&(C.includes(I)?(y.darkColorScheme=I,h==null||h.set(I)):console.error(`\`${I}\` does not exist in \`theme.colorSchemes\`.`)),y}):O(g=>(f==null||f.set(o),h==null||h.set(n),{...g,lightColorScheme:o,darkColorScheme:n}))},[C,f,h,o,n]),_=i.useCallback(m=>{b.mode==="system"&&O(g=>{const y=m!=null&&m.matches?"dark":"light";return g.systemMode===y?g:{...g,systemMode:y}})},[b.mode]),V=i.useRef(_);return V.current=_,i.useEffect(()=>{if(typeof window.matchMedia!="function"||!v)return;const m=(...y)=>V.current(...y),g=window.matchMedia("(prefers-color-scheme: dark)");return g.addListener(m),m(g),()=>{g.removeListener(m)}},[v]),i.useEffect(()=>{if(v){const m=(p==null?void 0:p.subscribe(S=>{(!S||["light","dark","system"].includes(S))&&w(S||t)}))||ie,g=(f==null?void 0:f.subscribe(S=>{(!S||C.match(S))&&B({light:S})}))||ie,y=(h==null?void 0:h.subscribe(S=>{(!S||C.match(S))&&B({dark:S})}))||ie;return()=>{m(),g(),y()}}},[B,w,C,t,c,v,p,f,h]),{...b,mode:x?b.mode:void 0,systemMode:x?b.systemMode:void 0,colorScheme:x?L:void 0,setMode:w,setColorScheme:B}}const wt="*{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}";function Bt(e){const{themeId:t,theme:o={},modeStorageKey:n=de,colorSchemeStorageKey:s=me,disableTransitionOnChange:d=!1,defaultColorScheme:r,resolveTheme:c}=e,a={allColorSchemes:[],colorScheme:void 0,darkColorScheme:void 0,lightColorScheme:void 0,mode:void 0,setColorScheme:()=>{},setMode:()=>{},systemMode:void 0},u=i.createContext(void 0),C=()=>i.useContext(u)||a,v={},p={};function f(x){var ke,Oe,Me,Te;const{children:N,theme:L,modeStorageKey:w=n,colorSchemeStorageKey:B=s,disableTransitionOnChange:_=d,storageManager:V,storageWindow:m=typeof window>"u"?void 0:window,documentNode:g=typeof document>"u"?void 0:document,colorSchemeNode:y=typeof document>"u"?void 0:document.documentElement,disableNestedContext:S=!1,disableStyleSheetGeneration:I=!1,defaultMode:re="system",noSsr:X}=x,F=i.useRef(!1),q=ue(),z=i.useContext(u),H=!!z&&!S,G=i.useMemo(()=>L||(typeof o=="function"?o():o),[L]),W=G[t],k=W||G,{colorSchemes:$=v,components:ee=p,cssVarPrefix:Z}=k,fe=Object.keys($).filter(M=>!!$[M]).join(","),K=i.useMemo(()=>fe.split(","),[fe]),he=typeof r=="string"?r:r.light,ge=typeof r=="string"?r:r.dark,Fe=$[he]&&$[ge]?re:((Oe=(ke=$[k.defaultColorScheme])==null?void 0:ke.palette)==null?void 0:Oe.mode)||((Me=k.palette)==null?void 0:Me.mode),{mode:Ge,setMode:pe,systemMode:ye,lightColorScheme:Ce,darkColorScheme:Se,colorScheme:We,setColorScheme:ve}=Nt({supportedColorSchemes:K,defaultLightColorScheme:he,defaultDarkColorScheme:ge,modeStorageKey:w,colorSchemeStorageKey:B,defaultMode:Fe,storageManager:V,storageWindow:m,noSsr:X});let se=Ge,j=We;H&&(se=z.mode,j=z.colorScheme);const Y=i.useMemo(()=>{var J;const M=j||k.defaultColorScheme,T=((J=k.generateThemeVars)==null?void 0:J.call(k))||k.vars,R={...k,components:ee,colorSchemes:$,cssVarPrefix:Z,vars:T};if(typeof R.generateSpacing=="function"&&(R.spacing=R.generateSpacing()),M){const E=$[M];E&&typeof E=="object"&&Object.keys(E).forEach(A=>{E[A]&&typeof E[A]=="object"?R[A]={...R[A],...E[A]}:R[A]=E[A]})}return c?c(R):R},[k,j,ee,$,Z]),Q=k.colorSchemeSelector;tt(()=>{if(j&&y&&Q&&Q!=="media"){const M=Q;let T=Q;if(M==="class"&&(T=".%s"),M==="data"&&(T="[data-%s]"),M!=null&&M.startsWith("data-")&&!M.includes("%s")&&(T=`[${M}="%s"]`),T.startsWith("."))y.classList.remove(...K.map(R=>T.substring(1).replace("%s",R))),y.classList.add(T.substring(1).replace("%s",j));else{const R=T.replace("%s",j).match(/\[([^\]]+)\]/);if(R){const[J,E]=R[1].split("=");E||K.forEach(A=>{y.removeAttribute(J.replace(j,A))}),y.setAttribute(J,E?E.replace(/"|'/g,""):"")}else y.setAttribute(T,j)}}},[j,Q,y,K]),i.useEffect(()=>{let M;if(_&&F.current&&g){const T=g.createElement("style");T.appendChild(g.createTextNode(wt)),g.head.appendChild(T),window.getComputedStyle(g.body),M=setTimeout(()=>{g.head.removeChild(T)},1)}return()=>{clearTimeout(M)}},[j,_,g]),i.useEffect(()=>(F.current=!0,()=>{F.current=!1}),[]);const Ze=i.useMemo(()=>({allColorSchemes:K,colorScheme:j,darkColorScheme:Se,lightColorScheme:Ce,mode:se,setColorScheme:ve,setMode:pe,systemMode:ye}),[K,j,Se,Ce,se,ve,pe,ye,Y.colorSchemeSelector]);let be=!0;(I||k.cssVariables===!1||H&&(q==null?void 0:q.cssVarPrefix)===Z)&&(be=!1);const xe=l.jsxs(i.Fragment,{children:[l.jsx(He,{themeId:W?t:void 0,theme:Y,children:N}),be&&l.jsx(ot,{styles:((Te=Y.generateStyleSheets)==null?void 0:Te.call(Y))||[]})]});return H?xe:l.jsx(u.Provider,{value:Ze,children:xe})}const h=typeof r=="string"?r:r.light,b=typeof r=="string"?r:r.dark;return{CssVarsProvider:f,useColorScheme:C,getInitColorSchemeScript:x=>jt({colorSchemeStorageKey:s,defaultLightColorScheme:h,defaultDarkColorScheme:b,modeStorageKey:n,...x})}}function ce({theme:e,...t}){const o=U in e?e[U]:void 0;return l.jsx(He,{...t,themeId:o?U:void 0,theme:o||e})}const oe={colorSchemeStorageKey:"mui-color-scheme",defaultLightColorScheme:"light",defaultDarkColorScheme:"dark",modeStorageKey:"mui-mode"},{CssVarsProvider:It}=Bt({themeId:U,theme:()=>De({cssVariables:!0}),colorSchemeStorageKey:oe.colorSchemeStorageKey,modeStorageKey:oe.modeStorageKey,defaultColorScheme:{light:oe.defaultLightColorScheme,dark:oe.defaultDarkColorScheme},resolveTheme:e=>{const t={...e,typography:nt(e.palette,e.typography)};return t.unstable_sx=function(n){return rt({sx:n,theme:this})},t}}),At=It;function Dt({theme:e,...t}){if(typeof e=="function")return l.jsx(ce,{theme:e,...t});const o=U in e?e[U]:e;return"colorSchemes"in o?l.jsx(At,{theme:e,...t}):"vars"in o?l.jsx(ce,{theme:e,...t}):l.jsx(ce,{theme:{...e,vars:null},...t})}function _t(e){const{badgeContent:t,invisible:o=!1,max:n=99,showZero:s=!1}=e,d=Ve({badgeContent:t,max:n});let r=o;o===!1&&t===0&&!s&&(r=!0);const{badgeContent:c,max:a=n}=r?d:e,u=c&&Number(c)>a?`${a}+`:c;return{badgeContent:c,invisible:r,max:a,displayValue:u}}function zt(e){return it("MuiBadge",e)}const D=st("MuiBadge",["root","badge","dot","standard","anchorOriginTopRight","anchorOriginBottomRight","anchorOriginTopLeft","anchorOriginBottomLeft","invisible","colorError","colorInfo","colorPrimary","colorSecondary","colorSuccess","colorWarning","overlapRectangular","overlapCircular","anchorOriginTopLeftCircular","anchorOriginTopLeftRectangular","anchorOriginTopRightCircular","anchorOriginTopRightRectangular","anchorOriginBottomLeftCircular","anchorOriginBottomLeftRectangular","anchorOriginBottomRightCircular","anchorOriginBottomRightRectangular"]),ae=10,le=4,Vt=e=>{const{color:t,anchorOrigin:o,invisible:n,overlap:s,variant:d,classes:r={}}=e,c={root:["root"],badge:["badge",d,n&&"invisible",`anchorOrigin${P(o.vertical)}${P(o.horizontal)}`,`anchorOrigin${P(o.vertical)}${P(o.horizontal)}${P(s)}`,`overlap${P(s)}`,t!=="default"&&`color${P(t)}`]};return at(c,zt,r)},qt=_e("span",{name:"MuiBadge",slot:"Root",overridesResolver:(e,t)=>t.root})({position:"relative",display:"inline-flex",verticalAlign:"middle",flexShrink:0}),Ht=_e("span",{name:"MuiBadge",slot:"Badge",overridesResolver:(e,t)=>{const{ownerState:o}=e;return[t.badge,t[o.variant],t[`anchorOrigin${P(o.anchorOrigin.vertical)}${P(o.anchorOrigin.horizontal)}${P(o.overlap)}`],o.color!=="default"&&t[`color${P(o.color)}`],o.invisible&&t.invisible]}})(lt(({theme:e})=>({display:"flex",flexDirection:"row",flexWrap:"wrap",justifyContent:"center",alignContent:"center",alignItems:"center",position:"absolute",boxSizing:"border-box",fontFamily:e.typography.fontFamily,fontWeight:e.typography.fontWeightMedium,fontSize:e.typography.pxToRem(12),minWidth:ae*2,lineHeight:1,padding:"0 6px",height:ae*2,borderRadius:ae,zIndex:1,transition:e.transitions.create("transform",{easing:e.transitions.easing.easeInOut,duration:e.transitions.duration.enteringScreen}),variants:[...Object.entries(e.palette).filter(ut(["contrastText"])).map(([t])=>({props:{color:t},style:{backgroundColor:(e.vars||e).palette[t].main,color:(e.vars||e).palette[t].contrastText}})),{props:{variant:"dot"},style:{borderRadius:le,height:le*2,minWidth:le*2,padding:0}},{props:({ownerState:t})=>t.anchorOrigin.vertical==="top"&&t.anchorOrigin.horizontal==="right"&&t.overlap==="rectangular",style:{top:0,right:0,transform:"scale(1) translate(50%, -50%)",transformOrigin:"100% 0%",[`&.${D.invisible}`]:{transform:"scale(0) translate(50%, -50%)"}}},{props:({ownerState:t})=>t.anchorOrigin.vertical==="bottom"&&t.anchorOrigin.horizontal==="right"&&t.overlap==="rectangular",style:{bottom:0,right:0,transform:"scale(1) translate(50%, 50%)",transformOrigin:"100% 100%",[`&.${D.invisible}`]:{transform:"scale(0) translate(50%, 50%)"}}},{props:({ownerState:t})=>t.anchorOrigin.vertical==="top"&&t.anchorOrigin.horizontal==="left"&&t.overlap==="rectangular",style:{top:0,left:0,transform:"scale(1) translate(-50%, -50%)",transformOrigin:"0% 0%",[`&.${D.invisible}`]:{transform:"scale(0) translate(-50%, -50%)"}}},{props:({ownerState:t})=>t.anchorOrigin.vertical==="bottom"&&t.anchorOrigin.horizontal==="left"&&t.overlap==="rectangular",style:{bottom:0,left:0,transform:"scale(1) translate(-50%, 50%)",transformOrigin:"0% 100%",[`&.${D.invisible}`]:{transform:"scale(0) translate(-50%, 50%)"}}},{props:({ownerState:t})=>t.anchorOrigin.vertical==="top"&&t.anchorOrigin.horizontal==="right"&&t.overlap==="circular",style:{top:"14%",right:"14%",transform:"scale(1) translate(50%, -50%)",transformOrigin:"100% 0%",[`&.${D.invisible}`]:{transform:"scale(0) translate(50%, -50%)"}}},{props:({ownerState:t})=>t.anchorOrigin.vertical==="bottom"&&t.anchorOrigin.horizontal==="right"&&t.overlap==="circular",style:{bottom:"14%",right:"14%",transform:"scale(1) translate(50%, 50%)",transformOrigin:"100% 100%",[`&.${D.invisible}`]:{transform:"scale(0) translate(50%, 50%)"}}},{props:({ownerState:t})=>t.anchorOrigin.vertical==="top"&&t.anchorOrigin.horizontal==="left"&&t.overlap==="circular",style:{top:"14%",left:"14%",transform:"scale(1) translate(-50%, -50%)",transformOrigin:"0% 0%",[`&.${D.invisible}`]:{transform:"scale(0) translate(-50%, -50%)"}}},{props:({ownerState:t})=>t.anchorOrigin.vertical==="bottom"&&t.anchorOrigin.horizontal==="left"&&t.overlap==="circular",style:{bottom:"14%",left:"14%",transform:"scale(1) translate(-50%, 50%)",transformOrigin:"0% 100%",[`&.${D.invisible}`]:{transform:"scale(0) translate(-50%, 50%)"}}},{props:{invisible:!0},style:{transition:e.transitions.create("transform",{easing:e.transitions.easing.easeInOut,duration:e.transitions.duration.leavingScreen})}}]})));function Ne(e){return{vertical:(e==null?void 0:e.vertical)??"top",horizontal:(e==null?void 0:e.horizontal)??"right"}}const Kt=i.forwardRef(function(t,o){const n=ct({props:t,name:"MuiBadge"}),{anchorOrigin:s,className:d,classes:r,component:c,components:a={},componentsProps:u={},children:C,overlap:v="rectangular",color:p="default",invisible:f=!1,max:h=99,badgeContent:b,slots:O,slotProps:x,showZero:N=!1,variant:L="standard",...w}=n,{badgeContent:B,invisible:_,max:V,displayValue:m}=_t({max:h,invisible:f,badgeContent:b,showZero:N}),g=Ve({anchorOrigin:Ne(s),color:p,overlap:v,variant:L,badgeContent:b}),y=_||B==null&&L!=="dot",{color:S=p,overlap:I=v,anchorOrigin:re,variant:X=L}=y?g:n,F=Ne(re),q=X!=="dot"?m:void 0,z={...n,badgeContent:B,invisible:y,max:V,displayValue:q,showZero:N,anchorOrigin:F,color:S,overlap:I,variant:X},H=Vt(z),G=(O==null?void 0:O.root)??a.Root??qt,W=(O==null?void 0:O.badge)??a.Badge??Ht,k=(x==null?void 0:x.root)??u.root,$=(x==null?void 0:x.badge)??u.badge,ee=$e({elementType:G,externalSlotProps:k,externalForwardedProps:w,additionalProps:{ref:o,as:c},ownerState:z,className:ne(k==null?void 0:k.className,H.root,d)}),Z=$e({elementType:W,externalSlotProps:$,ownerState:z,className:ne(H.badge,$==null?void 0:$.className)});return l.jsxs(G,{...ee,children:[C,l.jsx(W,{...Z,children:q})]})});function Ut(e,t){const o=i.useContext(e);if(o==null)throw new Error(`context "${t}" was used without a Provider`);return o}function Ft(e,t){typeof e=="function"?e(t):e&&(e.current=t)}function Gt(...e){return i.useMemo(()=>e.every(t=>t==null)?null:t=>{e.forEach(o=>{Ft(o,t)})},e)}function Wt(e){return typeof e=="string"}function Zt(e,t,o){return e===void 0||Wt(e)?t:{...t,ownerState:{...t.ownerState,...o}}}function Yt(e,t=[]){if(e===void 0)return{};const o={};return Object.keys(e).filter(n=>n.match(/^on[A-Z]/)&&typeof e[n]=="function"&&!t.includes(n)).forEach(n=>{o[n]=e[n]}),o}function we(e){if(e===void 0)return{};const t={};return Object.keys(e).filter(o=>!(o.match(/^on[A-Z]/)&&typeof e[o]=="function")).forEach(o=>{t[o]=e[o]}),t}function Qt(e){const{getSlotProps:t,additionalProps:o,externalSlotProps:n,externalForwardedProps:s,className:d}=e;if(!t){const f=ne(o==null?void 0:o.className,d,s==null?void 0:s.className,n==null?void 0:n.className),h={...o==null?void 0:o.style,...s==null?void 0:s.style,...n==null?void 0:n.style},b={...o,...s,...n};return f.length>0&&(b.className=f),Object.keys(h).length>0&&(b.style=h),{props:b,internalRef:void 0}}const r=Yt({...s,...n}),c=we(n),a=we(s),u=t(r),C=ne(u==null?void 0:u.className,o==null?void 0:o.className,d,s==null?void 0:s.className,n==null?void 0:n.className),v={...u==null?void 0:u.style,...o==null?void 0:o.style,...s==null?void 0:s.style,...n==null?void 0:n.style},p={...u,...o,...a,...c};return C.length>0&&(p.className=C),Object.keys(v).length>0&&(p.style=v),{props:p,internalRef:u.ref}}function Jt(e,t,o){return typeof e=="function"?e(t,o):e}function Xt(e){var v;const{elementType:t,externalSlotProps:o,ownerState:n,skipResolvingSlotProps:s=!1,...d}=e,r=s?{}:Jt(o,n),{props:c,internalRef:a}=Qt({...d,externalSlotProps:r}),u=Gt(a,r==null?void 0:r.ref,(v=e.additionalProps)==null?void 0:v.ref);return Zt(t,{...c,ref:u},n)}const eo=i.createContext({});function to(){return i.useContext(eo)}var Be;const Ue=i.createContext(null),oo={close:"Close"};function no({notificationKey:e,open:t,message:o,options:n,badge:s}){var x,N;const d=to(),r={...oo,...d},{close:c}=Ut(ze),{severity:a,actionText:u,onAction:C,autoHideDuration:v}=n,p=i.useCallback((L,w)=>{w!=="clickaway"&&c(e)},[e,c]),f=l.jsxs(i.Fragment,{children:[C?l.jsx(mt,{color:"inherit",size:"small",onClick:C,children:u??"Action"}):null,l.jsx(ft,{size:"small","aria-label":r==null?void 0:r.close,title:r==null?void 0:r.close,color:"inherit",onClick:p,children:Be||(Be=l.jsx(vt,{fontSize:"small"}))})]}),h=i.useContext(Ue),b=((x=h==null?void 0:h.slots)==null?void 0:x.snackbar)??Ct,O=Xt({elementType:b,ownerState:h,externalSlotProps:(N=h==null?void 0:h.slotProps)==null?void 0:N.snackbar,additionalProps:{open:t,autoHideDuration:v,onClose:p,action:f}});return l.jsx(b,{...O,children:l.jsx(Kt,{badgeContent:s,color:"primary",sx:{width:"100%"},children:a?l.jsx(dt,{severity:a,sx:{width:"100%"},action:f,children:o}):l.jsx(St,{message:o,action:f})})},e)}function ro({state:e}){const t=e.queue[0]??null;return t?l.jsx(no,{...t,badge:e.queue.length>1?String(e.queue.length):null}):null}let Ie=0;const so=()=>{const e=Ie;return Ie+=1,e};function io(e){const{children:t}=e,[o,n]=i.useState({queue:[]}),s=i.useCallback((c,a={})=>{const u=a.key??`::toolpad-internal::notification::${so()}`;return n(C=>C.queue.some(v=>v.notificationKey===u)?C:{...C,queue:[...C.queue,{message:c,options:a,notificationKey:u,open:!0}]}),u},[]),d=i.useCallback(c=>{n(a=>({...a,queue:a.queue.filter(u=>u.notificationKey!==c)}))},[]),r=i.useMemo(()=>({show:s,close:d}),[s,d]);return l.jsx(Ue.Provider,{value:e,children:l.jsxs(ze.Provider,{value:r,children:[t,l.jsx(ro,{state:o})]})})}const Ae={components:{MuiButtonBase:{defaultProps:{disableRipple:!0}},MuiDivider:{styleOverrides:{vertical:{marginRight:10,marginLeft:10}}}}},co={light:Re(Ae,{palette:{mode:"light",background:{default:"#fafafa",paper:"#fff"}}}),dark:Re(Ae,{palette:{mode:"dark",background:{default:"#111",paper:"#171717"}}})};function ao({children:e}){const{themeMode:t}=ht();return l.jsx(Dt,{theme:De(co[t]),children:e})}const lo=document.getElementById("root"),uo=kt.createRoot(lo);function ho(e){uo.render(l.jsx(gt,{children:l.jsx(ao,{children:l.jsx(io,{children:l.jsx(bt,{fallback:l.jsx(pt,{sx:{display:"flex",justifyContent:"center",alignItems:"center",height:"100vh"},children:l.jsx(yt,{})}),children:l.jsx(e,{})})})})}))}export{ho as default};
