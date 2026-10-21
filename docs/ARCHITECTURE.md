# OmniYap architecture

OmniYap is three programs in a trench coat:

1. **Electron main** (`src/main/`) — the window, tray, permissions, screen-sharing picker, IPC, settings file.
2. **Preload** (`src/preload/`) — the isolated-world bridge and the document-start injection point.
3. **Renderer** (`src/renderer/`) — the mod itself, running in Yapper's page, bundled by esbuild into `dist/renderer.js`.

## Boot sequence

```
Electron starts
  └─ BrowserWindow loads https://www.yapper.website
       └─ preload (isolated world, before page scripts)
            ├─ ipcRenderer.sendSync("oy:boot")          → settings, quick CSS, theme list, versions
            ├─ contextBridge.exposeInMainWorld(...)     → window.OmniYapNative + window.yapperDesktop shim
            └─ webFrame.executeJavaScript(bundle)       → runs in the page's MAIN world, synchronously
                 └─ renderer bundle
                      ├─ installs the Turbopack hook  (before Yapper's runtime)
                      ├─ registers 97 plugins
                      ├─ startEnabled()                (socket hooks, listeners, CSS)
                      └─ on DOMContentLoaded: themes, settings UI launcher
```

`contextIsolation` stays on, `sandbox` stays on, `nodeIntegration` stays off. Only the narrow
`contextBridge` surface crosses worlds. The mod needs the main world because it must see Yapper's
JavaScript objects; that is the same trust boundary Vencord accepts.

### Why injection has to be early

Yapper is a Next.js App Router client bundled with Turbopack. Its chunks are pushed through
`globalThis.TURBOPACK`:

```js
(globalThis.TURBOPACK ||= []).push({
  otherChunks: ["static/immutable/chunks/…js"],
  runtimeModuleIds: [94553],
});
```

Module factories arrive later as:

```js
TURBOPACK.push(["path", id, id, function(ctx, module, exports) { … }, …]);
```

The runtime then swaps the array for an object with a `push` method. OmniYap installs a property
setter on `globalThis.TURBOPACK` *before* that happens, wraps every factory, and captures the module
context on the first factory invocation:

```
ctx = { r: require, M: Map<id, factory>, c: Map<id, { exports }> }
```

If the bundle is injected late (DevTools re-injection, Android WebView), the hook wraps the already
booted runtime's `push` instead. Module discovery is then partial — the finder still works once new
lazy modules instantiate — and the loader logs a warning.

### Finder

`src/renderer/core/turbo.js` exposes `OmniYap.finder`:

| Method | Use |
| --- | --- |
| `findExports([names])` | module whose exports include every name |
| `findByProps(...names)` | alias for `findExports` |
| `findIdsBySource([strings])` | module factories whose source contains strings |
| `getSource(id)` | factory source |
| `require(id)` | instantiate a module by id |
| `waitFor(names, {timeout})` | poll until found |
| `lazy(names)` | cached getter |

The finder first checks instantiated modules, then scans factory source for the quoted export names
and instantiates candidates on demand. Results are cached; failed instantiations are retried after a
cooldown so a module that throws during early boot can succeed later.

### Patches

Plugins can declare Vencord-style source patches:

```js
patches: [{
  find: "someUniqueString",
  replacement: { match: /original\(x\)/, replace: "patched(x)" },
}]
```

The loader rebuilds the factory with indirect `eval` when the module is first instantiated. Failed
patches are recorded and shown under **Diagnostics → Patches**; they never break the module.

## Yapper internals OmniYap relies on

These were verified against the live client (October 2026). They are implementation details, not a
public API, and Yapper can change them.

### Store

The client store is a zustand-style module exporting `useStore`, `getState`, `setState`,
`upsertMessages`, `removeMessage`. OmniYap finds it by those names (`core/store.js`) and exposes:

- `getState()`, `subscribe(fn)`, `setState(partial)`
- `me()`, `myId()`, `profile(id)`, `displayName(id)`, `online(id)`
- `channel(id)`, `server(id)`, `members(serverId)`, `memberCount(serverId)`, `blockedUsers()`
- `activeChannelId()`, `messages(channelId)`, `findMessage(id)`
- `live()` → Yapper's own action module: `sendMessage`, `toggleReaction`, `markRead`,
  `markServerRead`, `openChannel`, `openDmWith`, `deleteMessage`, `editMessage`, …

State fields used by plugins include `channels`, `messages`, `profiles`, `servers`, `serverMembers`,
`memberCounts`, `online`, `unread`, `blocked`, `friends`, `reactions`, `typing`, `myStatus`, `voice`.

### DOM

Stable-looking selectors used by the plugins:

```
.app .rail .rail-item .sidebar .sidebar-head.server-head
.chat .main-head .messages .msg[data-message-id]
.msg > .msg-gutter .avatar         (avatar button, aria-label "<name>'s profile")
.msg > .msg-body .msg-head .msg-author .msg-time
.msg > .msg-body .msg-text
.msg > .msg-actions button[aria-label="Reply"|"Add reaction"|"More"]
.msg-image img, img.emoji[alt=":name:"]
.composer .composer-box textarea[enterkeyhint="send"] .send-btn .upload-btn
.side-panel.members-panel .pick-row .pick-row-name
```

Message rows carry `data-message-id`; message objects carry `author_id`, `content`, `created_at`,
`reply_to_id`, `attachment_*`, `voice_secs`, `voice_wave`.

### Desktop bridge

The stock desktop preload exposes `window.yapperDesktop` with `setBadge`, `notify`, `onActivity`,
`screenPicker`, `screenSources`, `pickScreenSource`, `onUpdateReady`, `installUpdate`. OmniYap
implements the same surface on top of its own IPC so Yapper's website keeps using its desktop paths
inside OmniYap (screen picker, native notifications, taskbar badge). The user agent also carries
`YapperDesktop/<version>` for the same reason.

## Plugin lifecycle

```js
import { definePlugin, definePluginSettings, OptionType, messages } from "../core/api.js";

const settings = definePluginSettings({
  enabled: { type: OptionType.BOOLEAN, description: "…", default: true },
});

export default definePlugin({
  name: "MyPlugin",
  description: "…",
  authors: [{ name: "you" }],
  tags: ["chat"],
  settings,
  patches: [],
  start(ctx) {
    ctx.css(`.something { color: red }`);
    ctx.watch(".msg", (el) => { /* … */ });
    ctx.cleanup(messages.decorate(({ body }) => { /* … */ }));
    settings.onChange((key, value) => { /* … */ });
  },
  stop() {},
});
```

`ctx` provides automatic cleanup:

| Helper | Cleaned up on stop |
| --- | --- |
| `ctx.css(text)` | injected `<style>` removed |
| `ctx.watch(selector, fn)` | MutationObserver watcher removed |
| `ctx.onMutate(fn)` | DOM batch listener removed |
| `ctx.on(event, fn)` | event bus subscription removed |
| `ctx.interval/timeout` | timer cleared |
| `ctx.cleanup(fn)` | arbitrary teardown |

Settings are stored under `settings.data.plugins.<Name>` and persisted by the main process to
`settings.json` (atomic write). `settings.store.x` reads fall back to the declared default, so
adding an option never needs a migration.

Message-level plugins use the decorator API:

```js
messages.decorate(({ el, id, message, body, textEl, head, actions }) => {
  if (el.querySelector(".mine")) return; // idempotent
  body.appendChild(...);
});
```

Decorators run when a row appears, when its message object changes in the store (edit/reaction), and
on `messages.refresh()`.

## Main process

- **Window**: persisted bounds, tray, hide-on-close, F11, Ctrl+, Ctrl+Shift+I.
- **Permissions**: only Yapper origins get mic/camera/notifications/clipboard/display-capture.
- **Screen sharing**: the same flow as the official app — Yapper's picker calls
  `yapperDesktop.pickScreenSource(id)`, the next `getDisplayMedia` uses that source within 30 s,
  otherwise the primary screen is shared.
- **IPC**: every handler validates the sender frame's host against the allow-list.
- **Settings**: `settings.json` in `app.getPath("userData")`; quick CSS in `quickcss.css`; themes in
  `themes/`.
- **Optional YouTube ad filtering** in the session's `webRequest` (App → Block YouTube ads).

## Android

Electron does not run on Android. `android/` is a small Kotlin WebView shell that loads Yapper with
the same `dist/renderer.js` injected at document start through
`WebViewCompat.addDocumentStartJavaScript`. See [ANDROID.md](ANDROID.md).

## Adding a plugin

1. Create `src/renderer/plugins/MyPlugin.js` using the pattern above.
2. Import it in `src/renderer/plugins/index.js`.
3. `npm run build`, reload the app, enable it in settings.
4. Add it to the matrix in [PLUGIN-MATRIX.md](PLUGIN-MATRIX.md).
5. If it needs a native capability, add an IPC channel in `src/main/index.js`, expose it in
   `src/preload/index.js`, and handle the browser fallback in `src/renderer/core/native.js`.
