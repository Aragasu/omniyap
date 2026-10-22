// The OmniYap settings overlay. It lives outside Yapper's React root, so it can be opened from the
// user bar, the tray, or Ctrl+, without touching the app's own settings modal.
import OmniYap from "../core/state.js";
import settings, { OptionType } from "../core/settings.js";
import plugins from "../core/plugins.js";
import themes from "../core/themes.js";
import dom from "../core/dom.js";
import store from "../core/store.js";
import { finder, patches } from "../core/turbo.js";
import { native } from "../core/native.js";
import roster from "../core/roster.js";
import { escapeHtml, formatDateTime } from "../core/util.js";
import logoUrl from "../../../assets/logo-64.png";

const { h } = dom;

const CSS = `
.omniyap-root{position:fixed;inset:0;z-index:2147483100;display:flex;align-items:center;justify-content:center;
  font:14px/1.45 Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color:#ececf1;
  /* Native controls (range tracks, selects, number spinners, scrollbars) paint dark. */
  color-scheme:dark}
.omniyap-root,.omniyap-root *{box-sizing:border-box}
/* One authored focus treatment for the whole panel; Yapper's own page is untouched. */
.omniyap-root :focus-visible{outline:2px solid #b57bff;outline-offset:2px}
.omniyap-root .omniyap-switch input:focus-visible{outline:none}
.omniyap-root[hidden]{display:none}
.omniyap-scrim{position:absolute;inset:0;background:rgba(8,8,12,.68);backdrop-filter:blur(3px)}
.omniyap-panel{position:relative;width:min(1040px,94vw);height:min(720px,90vh);background:#1b1b26;border:1px solid rgba(255,255,255,.09);
  border-radius:16px;display:flex;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.55)}
.omniyap-side{width:224px;flex:none;background:#15151f;border-right:1px solid rgba(255,255,255,.06);display:flex;flex-direction:column}
.omniyap-brand{display:flex;align-items:center;gap:10px;padding:18px 16px 12px}
.omniyap-logo{width:34px;height:34px;border-radius:10px;object-fit:contain;flex:none;
  filter:drop-shadow(0 2px 8px rgba(139,57,253,.45))}
.omniyap-brand b{display:block;font-size:15px;letter-spacing:-.2px}
.omniyap-brand span{display:block;font-size:11px;color:#8b8d98}
.omniyap-nav{display:flex;flex-direction:column;gap:2px;padding:8px}
.omniyap-nav button{display:flex;align-items:center;gap:9px;padding:9px 11px;border:0;border-radius:8px;background:transparent;color:#b7b9c2;
  font:500 13px Inter,system-ui,sans-serif;cursor:pointer;text-align:left}
.omniyap-nav button:hover{background:rgba(255,255,255,.05);color:#ececf1}
.omniyap-nav button.active{background:rgba(139,57,253,.14);color:#d9c2ff}
.omniyap-nav .glyph{width:18px;text-align:center;font-size:14px}
.omniyap-side-foot{margin-top:auto;padding:12px 16px;font-size:11px;color:#8d8f9b;border-top:1px solid rgba(255,255,255,.06)}
.omniyap-side-foot b{color:#d6d7de;font-weight:600}
.omniyap-main{flex:1;display:flex;flex-direction:column;min-width:0;min-height:0}
.omniyap-head{display:flex;align-items:center;gap:12px;min-height:60px;padding:0 20px;border-bottom:1px solid rgba(255,255,255,.06)}
.omniyap-head h2{margin:0;font-size:16px;font-weight:650;letter-spacing:-.2px}
.omniyap-head .spacer{flex:1}
.omniyap-search-wrap{position:relative;display:flex;align-items:center;flex:none}
.omniyap-search{width:230px;max-width:100%;padding:7px 30px 7px 11px;border-radius:8px;border:1px solid rgba(255,255,255,.1);
  background:#12121a;color:#ececf1;font:13px Inter,system-ui,sans-serif;outline:none}
.omniyap-search:focus{border-color:#8b39fd}
.omniyap-search::placeholder{color:#8b8d98}
.omniyap-search-clear{position:absolute;right:3px;display:grid;place-items:center;width:26px;height:26px;padding:0;border:0;
  border-radius:6px;background:transparent;color:#8b8d98;font:15px/1 Inter,system-ui,sans-serif;cursor:pointer}
.omniyap-search-clear:hover{background:rgba(255,255,255,.08);color:#ececf1}
.omniyap-search-clear[hidden]{display:none}
.omniyap-close{width:30px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:#22222e;color:#b7b9c2;cursor:pointer;font-size:16px;line-height:1}
.omniyap-close:hover{color:#fff;border-color:rgba(255,255,255,.2)}
.omniyap-body{flex:1;min-height:0;overflow:auto;padding:16px 20px 28px;scrollbar-width:thin;scrollbar-color:#3a3a4d transparent;
  -webkit-overflow-scrolling:touch}
.omniyap-body::-webkit-scrollbar{width:10px}
.omniyap-body::-webkit-scrollbar-track{background:transparent}
.omniyap-body::-webkit-scrollbar-thumb{background:#3a3a4d;border:2px solid transparent;background-clip:content-box;border-radius:8px}
/* One row of filters that scrolls horizontally instead of stacking into a wall of pills. */
.omniyap-toolbar{display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;
  scrollbar-width:none;padding:1px 0 2px;
  -webkit-mask-image:linear-gradient(90deg,#000 0,#000 calc(100% - 40px),transparent 100%);
  mask-image:linear-gradient(90deg,#000 0,#000 calc(100% - 40px),transparent 100%)}
.omniyap-toolbar::-webkit-scrollbar{display:none}
/* Wide panels have room to show every filter at once, so nothing hides behind a scroll edge. */
@media (min-width: 1100px){
  .omniyap-toolbar{flex-wrap:wrap;overflow:visible;-webkit-mask-image:none;mask-image:none}
}
.omniyap-toolbar .omniyap-pill{flex:0 0 auto}
.omniyap-toolbar-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-bottom:12px}
.omniyap-pill{display:inline-flex;align-items:center;height:28px;padding:0 11px;border-radius:999px;border:1px solid rgba(255,255,255,.1);
  background:#20202b;color:#b7b9c2;font:500 12px Inter,system-ui,sans-serif;cursor:pointer;white-space:nowrap}
.omniyap-btn.small{height:28px;padding:0 12px;font:500 12px Inter,system-ui,sans-serif}
.omniyap-pill.active{background:rgba(139,57,253,.16);border-color:rgba(139,57,253,.45);color:#d9c2ff}
.omniyap-pill:not(.active):hover{background:#2a2a37}
.omniyap-muted{color:#8b8d98;font-size:12px}
.omniyap-card{border:1px solid rgba(255,255,255,.075);border-radius:12px;background:#20202b;margin-bottom:10px;overflow:hidden}
.omniyap-card-head{display:flex;align-items:flex-start;gap:12px;padding:13px 14px}
.omniyap-card-head > .omniyap-btn{align-self:center;flex:none}
.omniyap-card-head .info{flex:1;min-width:0}
.omniyap-card-head .name{font-weight:600;font-size:13.5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.omniyap-card-head .desc{color:#9a9ca7;font-size:12.5px;margin-top:3px}
.omniyap-card-head .meta{margin-top:7px;font-size:11.5px;color:#8d8f9b;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.omniyap-tag{padding:2px 7px;border-radius:999px;background:#2b2b39;color:#b9bbc6;font-size:11px;line-height:1.35;
  text-transform:lowercase;white-space:nowrap}
.omniyap-error{color:#ff8d8d;font-size:11.5px;margin-top:6px;white-space:pre-wrap}
/* The label needs a real box: inside a plain block it used to stay inline, ignoring width/height. */
.omniyap-switch{position:relative;display:inline-flex;align-items:center;width:38px;height:24px;flex:0 0 38px;min-width:38px;
  margin-top:1px;cursor:pointer}
.omniyap-switch input{position:absolute;inset:0;opacity:0;width:100%;height:100%;margin:0;cursor:pointer;z-index:2}
.omniyap-switch span{position:absolute;left:0;right:0;top:1.5px;height:21px;border-radius:999px;background:#3a3a4a;transition:background .16s}
.omniyap-switch span::after{content:"";position:absolute;width:15px;height:15px;left:3px;top:3px;border-radius:50%;background:#d6d7de;transition:transform .16s}
.omniyap-switch input:checked + span{background:#8b39fd}
.omniyap-switch input:checked + span::after{transform:translateX(17px);background:#fff}
.omniyap-switch input:focus-visible + span{box-shadow:0 0 0 2px #1b1b26,0 0 0 4px #b57bff}
.omniyap-options{border-top:1px solid rgba(255,255,255,.06);padding:10px 14px 12px;display:none;background:#1c1c27}
.omniyap-card.open .omniyap-options{display:block}
.omniyap-options-foot{display:flex;justify-content:flex-start;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06)}
.omniyap-slider{display:flex;align-items:center;gap:8px;min-width:0;max-width:100%}
.omniyap-option{display:flex;align-items:center;flex-wrap:wrap;gap:6px 12px;padding:7px 0}
.omniyap-option .label{flex:1 1 190px;min-width:0;overflow-wrap:anywhere}
.omniyap-option > .control{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;flex:0 1 auto;
  margin-left:auto;max-width:100%;min-width:0}
.omniyap-option.multiline > .control{flex:1 1 100%;margin-left:0;justify-content:flex-start}
.omniyap-option.boolean .label{flex:1 1 auto}
.omniyap-option.boolean > .control{flex:0 0 auto;justify-content:flex-end}
.omniyap-value{display:inline-flex;align-items:center;justify-content:flex-end;min-width:3.4ch;padding:3px 7px;border-radius:6px;
  background:#262633;color:#c3c5cf;font:600 11.5px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}
.omniyap-option .label b{display:block;font-weight:550;font-size:12.5px}
.omniyap-option .label span{display:block;color:#8b8d98;font-size:11.5px;margin-top:1px}
.omniyap-option input[type=text],.omniyap-option input[type=number],.omniyap-option select,.omniyap-option textarea{
  width:200px;max-width:100%;padding:7px 9px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:#12121a;color:#ececf1;
  font:12.5px Inter,system-ui,sans-serif;outline:none}
/* Ranges: a quiet dark track with the accent thumb, so the readout carries the value.
   The native track stays near-white in Chromium even under color-scheme:dark. */
.omniyap-root input[type=range]{-webkit-appearance:none;appearance:none;height:24px;background:transparent;
  accent-color:#8b39fd;cursor:pointer}
.omniyap-root input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:999px;background:#3a3a4a}
.omniyap-root input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;margin-top:-5px;
  border-radius:50%;background:#b57bff;border:0;box-shadow:0 1px 3px rgba(0,0,0,.45)}
.omniyap-root input[type=range]:hover::-webkit-slider-thumb{background:#c9a6ff}
.omniyap-root input[type=range]:active::-webkit-slider-thumb{background:#d9c2ff}
.omniyap-root input[type=range]::-moz-range-track{height:4px;border-radius:999px;background:#3a3a4a}
.omniyap-root input[type=range]::-moz-range-thumb{width:14px;height:14px;border:0;border-radius:50%;background:#b57bff}
.omniyap-option input[type=range]{width:200px;max-width:100%;flex:0 1 200px}
.omniyap-option textarea{min-height:64px;resize:vertical;width:100%}
.omniyap-option input:focus,.omniyap-option select:focus,.omniyap-option textarea:focus{border-color:#8b39fd}
.omniyap-option .wide{width:100%}
.omniyap-tertiary{display:inline-flex;align-items:center;gap:5px;min-height:26px;padding:0 9px;border-radius:7px;
  border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);color:#b9bbc6;
  font:500 11.5px Inter,system-ui,sans-serif;cursor:pointer}
.omniyap-tertiary:hover{background:rgba(139,57,253,.14);border-color:rgba(139,57,253,.45);color:#e3d4ff}
.omniyap-btn{padding:8px 13px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:#262633;color:#ececf1;
  font:500 12.5px Inter,system-ui,sans-serif;cursor:pointer}
.omniyap-btn:hover{background:#30303f}
.omniyap-btn.primary{background:#8b39fd;border-color:#8b39fd;color:#fff;font-weight:650}
.omniyap-btn.primary:hover{background:#a05cff}
.omniyap-btn:disabled{opacity:.5;cursor:default}
.omniyap-sec{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8d8f9b;margin:20px 0 8px}
.omniyap-card:first-of-type{margin-top:0}
.omniyap-css{width:100%;min-height:320px;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#12121a;
  color:#dfe1e8;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;resize:vertical;outline:none}
.omniyap-css:focus{border-color:#8b39fd}
.omniyap-row{display:flex;align-items:center;flex-wrap:wrap;gap:8px 10px;justify-content:space-between;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05)}
.omniyap-row:last-child{border-bottom:0}
.omniyap-row .label{flex:1 1 180px;min-width:0;overflow-wrap:anywhere}
.omniyap-row .label b{display:block;font-weight:550;font-size:12.5px}
.omniyap-row .label span{display:block;color:#8b8d98;font-size:11.5px}
.omniyap-row > .omniyap-switch{margin-left:auto}
.omniyap-row .omniyap-slider{margin-left:auto;min-width:0}
.omniyap-field-row{display:flex;align-items:center;gap:8px;margin-top:10px}
.omniyap-field-row .omniyap-search{flex:1;width:auto;min-width:0}
.omniyap-field-row .omniyap-btn{height:34px;flex:none}
.omniyap-card-head .desc{overflow-wrap:anywhere}
.omniyap-card-head > .omniyap-switch{flex:0 0 38px;align-self:flex-start}
.omniyap-pre{background:#12121a;border:1px solid rgba(255,255,255,.07);border-radius:10px;padding:12px;font:11.5px/1.5 ui-monospace,monospace;
  color:#a9abb6;white-space:pre-wrap;word-break:break-word;max-height:220px;overflow:auto;scrollbar-width:thin;scrollbar-color:#3a3a4d transparent}
.omniyap-empty{display:flex;flex-direction:column;align-items:center;padding:36px 10px;text-align:center;color:#8b8d98;font-size:13px}
.omniyap-launch{display:grid;place-items:center;width:28px;height:28px;padding:0;border:0;background:transparent;
  border-radius:8px;cursor:pointer;margin-left:2px;line-height:0}
.omniyap-launch img{width:26px;height:26px;border-radius:7px;display:block;filter:drop-shadow(0 1px 4px rgba(139,57,253,.35))}
.omniyap-launch:hover img{filter:brightness(1.12) drop-shadow(0 1px 6px rgba(139,57,253,.5))}
.omniyap-launch:focus-visible{outline:2px solid #b57bff;outline-offset:2px}
/* When Yapper's own user bar is missing or renamed, the button anchors itself to the corner
   instead of disappearing with it. */
.omniyap-launch-floating{position:fixed;left:12px;bottom:12px;z-index:2147482000;width:34px;height:34px;
  background:rgba(27,27,38,.92);border:1px solid rgba(255,255,255,.16);box-shadow:0 6px 18px rgba(0,0,0,.45)}
.omniyap-launch-floating img{width:26px;height:26px}
.omniyap-tool-icon{display:inline-grid;place-items:center;width:24px;height:24px;margin-right:8px;flex:none;border-radius:7px;
  background:rgba(139,57,253,.14);color:#c9a6ff;font-size:12px;line-height:1}
.omniyap-nav .glyph{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;flex:none;color:currentColor}
.omniyap-nav .glyph svg{width:16px;height:16px;display:block}

/* Narrow desktops and tablets: give the sidebar less room before it collapses. */
@media (max-width: 980px){
  .omniyap-side{width:186px}
  .omniyap-head{padding:0 16px;min-height:56px}
  .omniyap-search{width:180px}
  .omniyap-body{padding:14px 16px 24px}
}

/* Phones: the panel fills the screen and the sidebar becomes five equal tabs. */
@media (max-width: 720px){
  .omniyap-root{align-items:stretch;justify-content:stretch}
  .omniyap-panel{width:100%;height:100vh;height:100dvh;max-height:none;border:0;border-radius:0;flex-direction:column}
  .omniyap-side{width:100%;flex:0 0 auto;flex-direction:column;border-right:0;border-bottom:1px solid rgba(255,255,255,.07)}
  .omniyap-side::-webkit-scrollbar{display:none}
  .omniyap-brand{display:none}
  .omniyap-nav{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:2px;width:100%;padding:5px 6px}
  .omniyap-nav button{flex-direction:column;justify-content:center;gap:3px;padding:5px 2px;font-size:10px;
    line-height:1.2;text-align:center;letter-spacing:0;white-space:nowrap}
  .omniyap-nav .glyph{width:18px;height:18px;font-size:0}
  .omniyap-nav .glyph svg{width:17px;height:17px}
  .omniyap-side-foot{display:none}
  .omniyap-head{min-height:0;padding:8px 12px;gap:8px;flex-wrap:wrap}
  .omniyap-head h2{font-size:15px}
  .omniyap-search-wrap{flex:1 1 100%;order:3}
  .omniyap-search{width:100%;font-size:14px;padding-right:36px}
  .omniyap-search-clear{width:30px;height:30px;right:1px;font-size:16px}
  .omniyap-close{width:34px;height:34px;margin-left:auto}
  .omniyap-body{padding:12px 12px 28px}
  .omniyap-card-head{padding:11px 12px;gap:10px}
  .omniyap-card-head .name{font-size:13px}
  .omniyap-card-head .desc{font-size:12px}
  .omniyap-options{padding:8px 12px 10px}
  .omniyap-option{padding:8px 0;gap:8px}
  .omniyap-option .label{flex:1 1 100%}
  .omniyap-option > .control{flex:1 1 100%;margin-left:0;justify-content:flex-start}
  /* A toggle stays on its label's line: stacking it doubles the height of every boolean row. */
  .omniyap-option.boolean .label{flex:1 1 auto}
  .omniyap-option.boolean > .control{flex:0 0 auto;margin-left:auto}
  .omniyap-option .omniyap-slider{flex:1 1 auto;width:100%}
  .omniyap-option input[type=text],.omniyap-option input[type=number],.omniyap-option select,.omniyap-option textarea,
  .omniyap-option input[type=range]{width:100%;flex:1 1 100%}
  .omniyap-option input[type=range]{flex:1 1 auto}
  .omniyap-value{margin-left:auto}
  .omniyap-switch{width:44px;height:26px;flex:0 0 44px;min-width:44px;margin-top:0}
  .omniyap-switch span{top:2px;height:22px}
  .omniyap-switch span::after{width:16px;height:16px;top:3px;left:3px}
  .omniyap-switch input:checked + span::after{transform:translateX(20px)}
  .omniyap-row > .omniyap-switch{margin-left:auto}
  .omniyap-row .omniyap-slider{flex:1 1 100%;justify-content:flex-start;margin-left:0}
  .omniyap-pill{height:32px;padding:0 12px}
  .omniyap-btn.small{height:32px}
}

/* Touch screens: the launcher is the only way into this panel, so give it a real hit target. */
@media (pointer: coarse){
  .omniyap-launch{width:34px;height:34px;border-radius:9px}
  .omniyap-launch img{width:30px;height:30px;border-radius:8px}
}

@media (max-height: 560px){
  .omniyap-panel{height:100vh;height:100dvh;max-height:none;border-radius:0}
}
`;

// One authored icon set for the panel's own navigation. Plugin tool cards keep their own glyph,
// framed in .omniyap-tool-icon so mixed marks still read as one system.
const ICONS = {
    plugins: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.75" y="3.75" width="6.5" height="6.5" rx="2"/><rect x="13.75" y="3.75" width="6.5" height="6.5" rx="2"/><rect x="3.75" y="13.75" width="6.5" height="6.5" rx="2"/><rect x="13.75" y="13.75" width="6.5" height="6.5" rx="2"/></svg>',
    tools: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15.6 4.4a4.6 4.6 0 0 0-5.5 6.6L4 17.1a2.05 2.05 0 1 0 2.9 2.9l6.1-6.1a4.6 4.6 0 0 0 6.6-5.5l-3 3-2.9-2.9 3-3Z"/></svg>',
    themes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5c3.2 3.6 6 6.5 6 9.8a6 6 0 0 1-12 0c0-3.3 2.8-6.2 6-9.8Z"/></svg>',
    app: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7.5h7M17.5 7.5H20M4 16.5h2.5M11 16.5h9"/><circle cx="14" cy="7.5" r="2.4"/><circle cx="7.5" cy="16.5" r="2.4"/></svg>',
    diagnostics: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h3.8l2.4-6 4.2 12 2.4-6H21"/></svg>',
};

const TABS = [
    { id: "plugins", label: "Plugins", icon: "plugins" },
    { id: "tools", label: "Tools", icon: "tools" },
    { id: "themes", label: "Themes", icon: "themes" },
    { id: "app", label: "App", icon: "app" },
    { id: "diagnostics", label: "Diagnostics", icon: "diagnostics" },
];

// Plugins contribute small utilities (log viewer, scheduled messages, profiles…). They live here
// instead of adding a row of cryptic buttons to Yapper's user bar.
const tools = new Map();

export function registerTool(tool) {
    if (!tool?.id || typeof tool.onClick !== "function") return () => undefined;
    tools.set(tool.id, tool);
    if (isOpen()) renderBody();
    return () => {
        tools.delete(tool.id);
        if (isOpen()) renderBody();
    };
}

function toolsTab() {
    const list = [...tools.values()].sort((a, b) => a.label.localeCompare(b.label));
    if (!list.length) {
        return h("div", { class: "omniyap-empty" }, "No tools are registered. Enable the plugins that provide them.");
    }
    return h("div", {}, list.map((tool) => h("div", { class: "omniyap-card" },
        h("div", { class: "omniyap-card-head" },
            h("div", { class: "info" },
                h("div", { class: "name" }, tool.icon ? h("span", { class: "omniyap-tool-icon" }, tool.icon) : null, tool.label),
                tool.description ? h("div", { class: "desc" }, tool.description) : null,
            ),
            h("button", { class: "omniyap-btn primary", onclick: () => tool.onClick() }, "Open"),
        ),
    )));
}

let root = null;
let currentTab = "plugins";
let search = "";
let category = "all";
let openCards = new Set();

function optionRow(plugin, key, def) {
    const value = plugin.settings.store[key];
    let control;
    const type = def.type || OptionType.STRING;

    if (type === OptionType.BOOLEAN) {
        control = h("label", { class: "omniyap-switch" },
            h("input", {
                type: "checkbox",
                checked: !!value,
                "aria-label": def.displayName || key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()),
                onchange: (event) => {
                    plugin.settings.store[key] = event.target.checked;
                },
            }),
            h("span"),
        );
    } else if (type === OptionType.SELECT) {
        control = h("select", {
            onchange: (event) => {
                const selected = (def.options || []).find((option) => String(option.value) === event.target.value);
                plugin.settings.store[key] = selected ? selected.value : event.target.value;
            },
        }, (def.options || []).map((option) =>
            h("option", { value: String(option.value), selected: String(option.value) === String(value) }, option.label),
        ));
    } else if (type === OptionType.SLIDER || type === OptionType.NUMBER) {
        const isSlider = type === OptionType.SLIDER;
        const slider = h("input", {
            type: isSlider ? "range" : "number",
            value,
            min: def.min ?? (isSlider ? 0 : undefined),
            max: def.max ?? (isSlider ? 100 : undefined),
            step: def.step ?? (isSlider ? 1 : undefined),
            "aria-label": def.displayName || key,
            oninput: (event) => {
                const number = Number(event.target.value);
                plugin.settings.store[key] = Number.isFinite(number) ? number : def.default;
            },
        });
        if (isSlider) {
            // A bare range tells you where the handle is, not what it means; mirror the value beside it.
            const readout = h("output", { class: "omniyap-value", "aria-hidden": "true" }, String(slider.value));
            slider.addEventListener("input", () => {
                readout.textContent = String(slider.value);
            });
            control = h("div", { class: "omniyap-slider" }, slider, readout);
        } else {
            control = slider;
        }
    } else if (typeof def.render === "function") {
        control = h("div", { class: "omniyap-custom-option" });
        try {
            def.render(control, plugin);
        } catch (err) {
            control.textContent = "Could not render this option: " + (err?.message || err);
        }
    } else if (type === OptionType.STRING || type === OptionType.CUSTOM) {
        const isLong = def.multiline || (typeof value === "string" && value.includes("\n"));
        control = isLong
            ? h("textarea", {
                class: "wide",
                placeholder: def.placeholder || "",
                onchange: (event) => {
                    plugin.settings.store[key] = event.target.value;
                },
            }, String(value ?? ""))
            : h("input", {
                type: "text",
                value: String(value ?? ""),
                placeholder: def.placeholder || "",
                onchange: (event) => {
                    plugin.settings.store[key] = event.target.value;
                },
            });
    } else if (type === OptionType.COMPONENT) {
        control = h("div", { class: "omniyap-muted" }, "This option is managed by the plugin.");
    } else {
        control = h("span", { class: "omniyap-muted" }, String(value ?? ""));
    }

    const optionClass = "omniyap-option" + (def.multiline ? " multiline" : "") + (type === OptionType.BOOLEAN ? " boolean" : "");
    return h("div", { class: optionClass, style: def.multiline ? { display: "block" } : undefined },
        h("div", { class: "label" },
            h("b", {}, def.displayName || key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())),
            def.description ? h("span", {}, def.description) : null,
        ),
        h("div", { class: "control", style: def.multiline ? { marginTop: "6px" } : undefined }, control),
    );
}

// Building every option control for 262 plugins up front costs about a second of blocked main thread.
// Cards are created in idle slices and their option panels only when they are opened.
const scheduleIdle = typeof requestIdleCallback === "function"
    ? (fn) => requestIdleCallback(fn, { timeout: 200 })
    : (fn) => setTimeout(fn, 16);

let renderGeneration = 0;

function renderCardsInChunks(container, pluginsToRender, chunk = 24) {
    const generation = ++renderGeneration;
    let index = 0;
    const step = () => {
        if (generation !== renderGeneration) return;
        // The list is built before it is attached, so the first slice renders detached and the rest
        // only continue once the tab is actually on screen.
        if (index > 0 && !container.isConnected) return;
        const end = Math.min(pluginsToRender.length, index + chunk);
        const fragment = document.createDocumentFragment();
        for (; index < end; index++) fragment.appendChild(pluginCard(pluginsToRender[index]));
        container.appendChild(fragment);
        if (index < pluginsToRender.length) scheduleIdle(step);
    };
    step();
}

function pluginCard(plugin) {
    const enabled = plugins.isEnabled(plugin.name);
    const error = plugins.errors.get(plugin.name);
    const hasOptions = Object.keys(plugin.settings?.definitions || {}).length > 0;

    const buildOptions = () => h("div", { class: "omniyap-options" },
        ...Object.entries(plugin.settings.definitions).map(([key, def]) => optionRow(plugin, key, def)),
        h("div", { class: "omniyap-options-foot" },
            h("button", {
                class: "omniyap-tertiary",
                onclick: () => {
                    plugin.settings.resetAll();
                    renderBody();
                },
            }, "Reset all options"),
        ),
    );

    const settingsButton = hasOptions ? h("button", {
        class: "omniyap-tertiary",
        "aria-expanded": openCards.has(plugin.name) ? "true" : "false",
        onclick: () => {
            const isOpen = openCards.has(plugin.name);
            if (isOpen) {
                openCards.delete(plugin.name);
                card.classList.remove("open");
                settingsButton.setAttribute("aria-expanded", "false");
                return;
            }
            openCards.add(plugin.name);
            if (!card.querySelector(":scope > .omniyap-options")) card.appendChild(buildOptions());
            card.classList.add("open");
            settingsButton.setAttribute("aria-expanded", "true");
        },
    }, "Settings") : null;

    const card = h("div", { class: "omniyap-card" + (openCards.has(plugin.name) ? " open" : "") },
        h("div", { class: "omniyap-card-head" },
            h("div", { class: "info" },
                h("div", { class: "name" },
                    plugin.name,
                    ...(plugin.tags || []).slice(0, 3).map((tag) => h("span", { class: "omniyap-tag" }, tag)),
                ),
                plugin.description ? h("div", { class: "desc" }, plugin.description) : null,
                (plugin.authors?.length || hasOptions)
                    ? h("div", { class: "meta" },
                        plugin.authors?.length ? h("span", {}, "by " + plugin.authors.map((a) => a.name || a).join(", ")) : null,
                        settingsButton,
                    )
                    : null,
                error ? h("div", { class: "omniyap-error" }, "Failed: " + (error.message || error)) : null,
            ),
            h("label", { class: "omniyap-switch" },
                h("input", {
                    type: "checkbox",
                    checked: enabled,
                    "aria-label": `Enable ${plugin.name}`,
                    onchange: (event) => {
                        plugins.setEnabled(plugin.name, event.target.checked);
                        renderBody();
                    },
                }),
                h("span"),
            ),
        ),
        hasOptions && openCards.has(plugin.name) ? buildOptions() : null,
    );
    return card;
}

function pluginsTab() {
    const all = plugins.list().sort((a, b) => a.name.localeCompare(b.name));
    const tags = [...new Set(all.flatMap((plugin) => plugin.tags || []))].sort();
    const query = search.trim().toLowerCase();
    const filtered = all.filter((plugin) => {
        if (category !== "all" && !(plugin.tags || []).includes(category)) return false;
        if (!query) return true;
        return `${plugin.name} ${plugin.description} ${(plugin.tags || []).join(" ")}`.toLowerCase().includes(query);
    });

    return h("div", {},
        h("div", { class: "omniyap-toolbar" },
            h("button", {
                class: "omniyap-pill" + (category === "all" ? " active" : ""),
                onclick: () => {
                    category = "all";
                    renderBody();
                },
            }, `All (${all.length})`),
            ...tags.slice(0, 12).map((tag) => h("button", {
                class: "omniyap-pill" + (category === tag ? " active" : ""),
                onclick: () => {
                    category = tag;
                    renderBody();
                },
            }, tag)),
        ),
        h("div", { class: "omniyap-toolbar-actions" },
            h("span", { class: "omniyap-muted" }, filtered.length === all.length
                ? `${all.length} plugins`
                : `${filtered.length} ${filtered.length === 1 ? "match" : "matches"}`),
            h("button", {
                class: "omniyap-btn small",
                onclick: () => {
                    const enable = plugins.enabledCount() < all.length;
                    for (const plugin of all) plugins.setEnabled(plugin.name, enable);
                    renderBody();
                },
            }, plugins.enabledCount() < all.length ? "Enable all" : "Disable all"),
        ),
        (() => {
            if (!filtered.length) {
                return h("div", { class: "omniyap-empty" },
                    h("div", {}, search.trim() ? `No plugins match “${search.trim()}”.` : "No plugins in this category."),
                    h("button", {
                        class: "omniyap-btn small",
                        style: { marginTop: "12px" },
                        onclick: () => {
                            search = "";
                            category = "all";
                            const box = root?.querySelector(".omniyap-search");
                            if (box) box.value = "";
                            renderBody();
                            box?.focus();
                        },
                    }, "Clear filters"),
                );
            }
            const list = h("div", {});
            renderCardsInChunks(list, filtered);
            return list;
        })(),
    );
}

function themesTab() {
    const quickCss = settings.get("omniyap.quickCss", "") || "";
    const enabledFiles = new Set(settings.get("themes.enabled", []) || []);
    const links = settings.get("themes.links", []) || [];

    const editor = h("textarea", {
        class: "omniyap-css",
        spellcheck: false,
        placeholder: "/* Quick CSS — applied to Yapper immediately */",
    }, quickCss);

    return h("div", {},
        h("div", { class: "omniyap-sec" }, "Quick CSS"),
        h("div", { class: "omniyap-muted", style: { marginBottom: "8px" } },
            "Applied on top of Yapper. Use Yapper's CSS variables and classes; inspect the page for exact selectors."),
        editor,
        h("div", { style: { display: "flex", gap: "8px", marginTop: "8px" } },
            h("button", {
                class: "omniyap-btn primary",
                onclick: async (event) => {
                    event.target.disabled = true;
                    await themes.setQuickCss(editor.value);
                    event.target.disabled = false;
                    dom.toast("Quick CSS applied", { type: "success" });
                },
            }, "Apply"),
            h("button", {
                class: "omniyap-btn",
                onclick: () => {
                    editor.value = "";
                    themes.setQuickCss("");
                },
            }, "Clear"),
        ),

        h("div", { class: "omniyap-sec" }, "Installed themes"),
        themes.available.length
            ? h("div", {}, themes.available.map((theme) => h("div", { class: "omniyap-row" },
                h("div", { class: "label" },
                    h("b", {}, theme.name || theme.fileName),
                    h("span", {}, `${(theme.size / 1024).toFixed(1)} KiB${theme.modified ? ` · ${formatDateTime(theme.modified)}` : ""}`),
                ),
                h("label", { class: "omniyap-switch" },
                    h("input", {
                        type: "checkbox",
                        checked: enabledFiles.has(theme.fileName),
                        onchange: async (event) => {
                            await themes.toggleFile(theme.fileName, event.target.checked);
                        },
                    }),
                    h("span"),
                ),
            )))
            : h("div", { class: "omniyap-muted" }, "No theme files yet. Import a .css file, or drop one into the themes folder."),
        h("div", { style: { display: "flex", gap: "8px", marginTop: "10px" } },
            h("button", {
                class: "omniyap-btn",
                onclick: async () => {
                    await native.themes.import();
                    await themes.list();
                    renderBody();
                },
            }, "Import theme…"),
            h("button", {
                class: "omniyap-btn",
                onclick: () => native.app.openPath("themes"),
            }, "Open themes folder"),
        ),

        h("div", { class: "omniyap-sec" }, "Theme links"),
        links.length
            ? h("div", {}, links.map((link) => h("div", { class: "omniyap-row" },
                h("div", { class: "label", style: { minWidth: 0 } },
                    h("b", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, link.url),
                ),
                h("label", { class: "omniyap-switch" },
                    h("input", {
                        type: "checkbox",
                        checked: !!link.enabled,
                        onchange: async (event) => {
                            await themes.toggleLink(link.url, event.target.checked);
                        },
                    }),
                    h("span"),
                ),
            )))
            : h("div", { class: "omniyap-muted" }, "No theme links. Add a raw https CSS URL below."),
        h("div", { class: "omniyap-field-row" },
            h("input", {
                class: "omniyap-search",
                placeholder: "https://example.com/theme.css",
                onkeydown: async (event) => {
                    if (event.key !== "Enter") return;
                    const url = event.target.value.trim();
                    if (!/^https:\/\//.test(url)) return dom.toast("Theme links must be https", { type: "error" });
                    try {
                        await themes.addLink(url, true);
                        event.target.value = "";
                        renderBody();
                    } catch (err) {
                        dom.toast(String(err.message || err), { type: "error" });
                    }
                },
            }),
            h("button", {
                class: "omniyap-btn",
                onclick: async (event) => {
                    const input = event.target.previousSibling;
                    const url = input.value.trim();
                    if (!/^https:\/\//.test(url)) return dom.toast("Theme links must be https", { type: "error" });
                    try {
                        await themes.addLink(url, true);
                        input.value = "";
                        renderBody();
                    } catch (err) {
                        dom.toast(String(err.message || err), { type: "error" });
                    }
                },
            }, "Add"),
        ),
    );
}

function toggleRow(title, description, value, onChange) {
    return h("div", { class: "omniyap-row" },
        h("div", { class: "label" }, h("b", {}, title), h("span", {}, description)),
        h("label", { class: "omniyap-switch" },
            h("input", { type: "checkbox", checked: !!value, onchange: (event) => onChange(event.target.checked) }),
            h("span"),
        ),
    );
}

function appTab() {
    const zoom = Number(settings.get("omniyap.zoom", 100));
    const zoomValue = h("output", { class: "omniyap-value", "aria-hidden": "true" }, `${zoom}%`);
    return h("div", {},
        h("div", { class: "omniyap-sec" }, "Window"),
        toggleRow("Start minimised", "Launch into the tray without showing the window.", settings.get("omniyap.startMinimized", false), (value) => settings.set("omniyap.startMinimized", value)),
        toggleRow("Keep running in the tray", "Closing the window hides it instead of quitting.", settings.get("omniyap.minimizeToTray", true), (value) => settings.set("omniyap.minimizeToTray", value)),
        toggleRow("Show tray icon", "The OmniYap icon in the system tray.", settings.get("omniyap.tray", true), (value) => settings.set("omniyap.tray", value)),
        h("div", { class: "omniyap-row" },
            h("div", { class: "label" }, h("b", {}, "Zoom"), h("span", {}, "Scale Yapper's interface.")),
            h("div", { class: "omniyap-slider" },
                h("input", {
                    type: "range", min: 50, max: 200, step: 5, value: zoom, style: { width: "168px" },
                    "aria-label": "Zoom",
                    oninput: (event) => {
                        const value = Number(event.target.value);
                        zoomValue.textContent = `${value}%`;
                        settings.set("omniyap.zoom", value);
                        native.ui.setZoom(value);
                    },
                }),
                zoomValue,
            ),
        ),

        h("div", { class: "omniyap-sec" }, "Behaviour"),
        toggleRow("Native context menus", "Use the operating system's context menu for links, images and text.", settings.get("omniyap.nativeContextMenu", true), (value) => settings.set("omniyap.nativeContextMenu", value)),
        toggleRow("Spellcheck", "Underline misspelled words in the composer.", settings.get("omniyap.spellcheck", true), (value) => settings.set("omniyap.spellcheck", value)),
        toggleRow("Block YouTube ads", "Filter ad requests in embedded YouTube players.", settings.get("omniyap.blockYouTubeAds", false), (value) => settings.set("omniyap.blockYouTubeAds", value)),

        h("div", { class: "omniyap-sec" }, "Maintenance"),
        h("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } },
            h("button", { class: "omniyap-btn", onclick: () => native.app.reload() }, "Reload Yapper"),
            h("button", { class: "omniyap-btn", onclick: () => native.app.devtools() }, "Toggle DevTools"),
            h("button", { class: "omniyap-btn", onclick: () => native.app.openPath("data") }, "Open data folder"),
            h("button", {
                class: "omniyap-btn",
                onclick: async () => {
                    const text = JSON.stringify(plugins.diagnostics(), null, 2);
                    await native.saveDiagnostics(text);
                },
            }, "Save diagnostics"),
        ),
        h("div", { class: "omniyap-sec" }, "Settings backup"),
        h("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } },
            h("button", {
                class: "omniyap-btn",
                onclick: async () => {
                    const blob = new Blob([JSON.stringify(settings.data, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const link = h("a", { href: url, download: "omniyap-settings.json" });
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                },
            }, "Export settings"),
            (() => {
                const picker = h("input", {
                    type: "file", accept: ".json", style: { display: "none" },
                    onchange: async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        try {
                            const parsed = JSON.parse(await file.text());
                            await native.settings.patch(parsed);
                            dom.toast("Settings imported. Reload to apply everything.", { type: "success" });
                        } catch (err) {
                            dom.toast("Invalid settings file: " + (err.message || err), { type: "error" });
                        }
                    },
                });
                return [
                    picker,
                    h("button", {
                        class: "omniyap-btn",
                        onclick: () => picker.click(),
                    }, "Import settings"),
                ];
            })(),
        ),
    );
}

function diagnosticsTab() {
    const stats = finder.stats();
    const errors = [...plugins.errors.entries()];
    const patchReport = patches.report();
    const team = roster.status();
    const ownRoles = store.isReady ? roster.rolesFor(store.myId()) : [];
    return h("div", {},
        h("div", { class: "omniyap-sec" }, "Runtime"),
        h("div", { class: "omniyap-pre" }, [
            `OmniYap ${OmniYap.version} (${OmniYap.boot.mode})`,
            `Electron ${OmniYap.boot.electron || "—"}   Chrome ${OmniYap.boot.chrome || "—"}`,
            `Platform ${OmniYap.boot.platform}   Build ${OmniYap.boot.buildHash}`,
            `Yapper store: ${store.isReady ? "ready" : "not ready"}`,
            `Turbopack: ctx=${stats.ctxCaptured} factories=${stats.factories} instantiated=${stats.instantiated} hooked=${stats.hookInstalled}`,
            `Module factories wrapped: ${stats.factoriesWrapped}`,
            `Plugins: ${plugins.enabledCount()} enabled / ${plugins.list().length} installed`,
        ].join("\n")),

        h("div", { class: "omniyap-sec" }, "Team badges"),
        h("div", { class: "omniyap-pre" }, [
            `Roster v${team.version} from ${team.source} — ${team.ids} id(s), updated ${team.updatedAt || "—"}`,
            `Your official roles: ${ownRoles.join(", ") || "none"}`,
            team.error ? `Last refresh: ${team.error}` : `Live copy: ${team.url}`,
        ].join("\n")),

        h("div", { class: "omniyap-sec" }, "Plugin errors"),
        errors.length
            ? h("div", { class: "omniyap-pre" }, errors.map(([name, err]) => `${name}: ${err?.message || err}`).join("\n"))
            : h("div", { class: "omniyap-muted" }, "No plugin errors."),

        h("div", { class: "omniyap-sec" }, "Patches"),
        patchReport.length
            ? h("div", { class: "omniyap-pre" }, patchReport.map((patch) => `${patch.plugin}  applied=${patch.applied}${patch.failed.length ? "  failed=" + patch.failed.join("; ") : ""}`).join("\n"))
            : h("div", { class: "omniyap-muted" }, "No source patches registered."),

        h("div", { class: "omniyap-sec" }, "Recent log"),
        h("div", { class: "omniyap-pre" }, OmniYap.log.history().slice(-60).map((entry) => `[${entry.level}] ${entry.text}`).join("\n")),

        h("div", { style: { display: "flex", gap: "8px", marginTop: "12px" } },
            h("button", {
                class: "omniyap-btn",
                onclick: () => void dom.copy(JSON.stringify(plugins.diagnostics(), null, 2), "Diagnostics copied"),
            }, "Copy diagnostics"),
            h("button", { class: "omniyap-btn", onclick: () => renderBody() }, "Refresh"),
        ),
    );
}

function renderBody() {
    if (!root) return;
    const body = root.querySelector(".omniyap-body");
    if (!body) return;
    const titles = { plugins: "Plugins", tools: "Tools", themes: "Themes", app: "App settings", diagnostics: "Diagnostics" };
    const title = root.querySelector(".omniyap-head h2");
    if (title) title.textContent = titles[currentTab] || "OmniYap";
    const searchWrap = root.querySelector(".omniyap-search-wrap");
    if (searchWrap) searchWrap.style.display = currentTab === "plugins" ? "" : "none";
    const clearSearch = root.querySelector(".omniyap-search-clear");
    if (clearSearch) clearSearch.hidden = !search;

    body.replaceChildren(
        currentTab === "plugins" ? pluginsTab()
            : currentTab === "tools" ? toolsTab()
                : currentTab === "themes" ? themesTab()
                    : currentTab === "app" ? appTab()
                        : diagnosticsTab(),
    );

    root.querySelectorAll(".omniyap-nav button").forEach((button) => {
        button.classList.toggle("active", button.dataset.tab === currentTab);
    });
    const foot = root.querySelector(".omniyap-side-foot");
    if (foot) foot.innerHTML = `<b>${plugins.enabledCount()}</b> of ${plugins.list().length} plugins enabled`;
}

export function open(page) {
    if (!document.getElementById("omniyap-ui-styles")) {
        const style = document.createElement("style");
        style.id = "omniyap-ui-styles";
        style.textContent = CSS;
        document.head.appendChild(style);
    }
    if (!root) {
        const nav = h("div", { class: "omniyap-nav" }, TABS.map((tab) => h("button", {
            dataset: { tab: tab.id },
            onclick: () => {
                currentTab = tab.id;
                renderBody();
            },
        }, h("span", { class: "glyph", html: ICONS[tab.icon] }), tab.label)));

        const searchInput = h("input", {
            class: "omniyap-search",
            placeholder: "Search plugins…",
            "aria-label": "Search plugins",
            value: search,
            oninput: (event) => {
                search = event.target.value;
                clearSearch.hidden = !search;
                renderBody();
            },
        });
        const clearSearch = h("button", {
            class: "omniyap-search-clear",
            type: "button",
            title: "Clear search",
            "aria-label": "Clear search",
            hidden: !search,
            onclick: () => {
                search = "";
                searchInput.value = "";
                clearSearch.hidden = true;
                renderBody();
                searchInput.focus();
            },
        }, "×");
        const searchBox = h("div", { class: "omniyap-search-wrap" }, searchInput, clearSearch);

        root = h("div", { class: "omniyap-root", hidden: true },
            h("div", {
                class: "omniyap-scrim",
                onmousedown: (event) => {
                    if (event.target.classList.contains("omniyap-scrim")) close();
                },
            }),
            h("div", { class: "omniyap-panel", role: "dialog", "aria-label": "OmniYap settings" },
                h("div", { class: "omniyap-side" },
                    h("div", { class: "omniyap-brand" },
                        h("img", { class: "omniyap-logo", src: logoUrl, alt: "OmniYap" }),
                        h("div", {}, h("b", {}, "OmniYap"), h("span", {}, `v${OmniYap.version}`)),
                    ),
                    nav,
                    h("div", { class: "omniyap-side-foot" }, ""),
                ),
                h("div", { class: "omniyap-main" },
                    h("div", { class: "omniyap-head" },
                        h("h2", {}, "Plugins"),
                        searchBox,
                        h("span", { class: "spacer" }),
                        h("button", { class: "omniyap-close", onclick: close, title: "Close" }, "×"),
                    ),
                    h("div", { class: "omniyap-body" }),
                ),
            ),
        );
        document.body.appendChild(root);

        // Document-level so Escape closes the panel even if focus is on the page behind it.
        document.addEventListener("keydown", (event) => {
            if (root.hidden || event.key !== "Escape") return;
            // A dialog opened from the panel sits above it and consumes its own Escape.
            if (document.querySelector(".omniyap-modal-root:not([hidden])")) return;
            event.preventDefault();
            event.stopPropagation();
            close();
        }, true);
    }

    if (page) currentTab = page;
    root.hidden = false;
    renderBody();
    root.querySelector(".omniyap-search")?.focus();
}

export function close() {
    if (root) root.hidden = true;
}

export function toggle() {
    if (!root || root.hidden) open();
    else close();
}

export const isOpen = () => !!root && !root.hidden;

/**
 * Add the OmniYap launcher to Yapper's user bar and listen for the tray shortcut. Yapper renames its
 * markup from time to time, so a missing (or renamed) bar no longer hides the settings panel: the
 * button pins itself to the bottom-left corner once the app shell is on screen, and moves into the
 * bar as soon as one appears.
 */
export function injectLauncher() {
    const BUTTON_ID = "omniyap-launcher";
    const BAR_SELECTORS = [".user-bar", "[class*='user-bar']", "[class*='userbar']", "[class*='user-nav']", "[class*='userNav']"];

    const findBar = () => {
        for (const selector of BAR_SELECTORS) {
            const bar = document.querySelector(selector);
            if (bar) return bar;
        }
        return null;
    };

    const makeButton = () => h("button", {
        id: BUTTON_ID,
        class: "omniyap-launch",
        title: "OmniYap settings (Ctrl+,)",
        "aria-label": "OmniYap settings",
        onclick: (event) => {
            event.preventDefault();
            event.stopPropagation();
            open();
        },
    }, h("img", { src: logoUrl, alt: "OY", width: 26, height: 26, draggable: "false" }));

    const add = () => {
        const bar = findBar();
        const existing = document.getElementById(BUTTON_ID);
        if (bar) {
            const button = existing || makeButton();
            button.classList.remove("omniyap-launch-floating");
            if (button.parentElement !== bar) bar.appendChild(button);
            return;
        }
        if (existing) return;
        // The landing/login page has neither bar nor shell; only show the fallback inside the app.
        if (!document.querySelector(".composer, .sidebar, .messages, [class*='composer']")) return;
        const button = makeButton();
        button.classList.add("omniyap-launch-floating");
        document.body.appendChild(button);
    };

    for (const selector of BAR_SELECTORS) dom.watch(selector, add);
    dom.watch(".composer, .sidebar, .messages", add);
    setTimeout(add, 2000);
    setTimeout(add, 6000);
    window.addEventListener("omniyap:open-settings", () => open());
    window.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key === ",") {
            event.preventDefault();
            toggle();
        }
    }, true);
}

const ui = { open, close, toggle, isOpen, injectLauncher, render: renderBody, registerTool, tools };
OmniYap.ui = ui;
export default ui;
