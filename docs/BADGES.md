# Team badges and the signed roster

The `StaffBadges` plugin paints small `Owner`, `Developer`, `Contributor`, `Translator`, `Tester` and
`Artist` labels next to names. The two official roles — **owner** and **developer** — are granted by a
signed roster rather than by source code, so a fork cannot hand itself the owner badge by editing a
constant.

## Where it lives

| File | Committed | Purpose |
| --- | --- | --- |
| [`src/renderer/core/roster.json`](../src/renderer/core/roster.json) | yes | the roster plus its signature |
| [`src/renderer/core/roster-key.json`](../src/renderer/core/roster-key.json) | yes | the **public** half of the signing key |
| `.keys/roster-private.jwk` | **no** (gitignored) | the private signing key — the only thing that can change badges |
| [`src/shared/roster.mjs`](../src/shared/roster.mjs) | yes | canonical form, signature check, binding parsing |

The roster is plain data:

```json
{
  "version": 1,
  "updatedAt": "2026-10-22",
  "roles": { "owner": ["<user id>"], "developer": [], "contributor": [] },
  "signature": "…"
}
```

`signature` is an ECDSA P-256 signature over the canonical JSON of `version`, `updatedAt` and `roles`.
Only the public key ships, so anyone can *check* the signature but only the key holder can *create*
one. Editing a name in the file, adding an id, or serving a different file makes verification fail,
and the app keeps the last good roster instead of trusting it.

## Why not a database

A database would need a public client config to read from, and the client still decides whether to
trust what it receives — a rebuilt client can just point somewhere else. The signature is the actual
trust anchor; a static file needs no project, key or server, works offline, and costs nothing to
serve. If the roster ever needs to be edited from a phone, any static host works: it is one JSON file.

## Adding or removing someone

1. Edit the ids in [`roster.json`](../src/renderer/core/roster.json) and bump `version` and
   `updatedAt`.
2. `npm run roster:sign` — rewrites `signature` (extra: `npm run roster:verify`).
3. Commit `roster.json`.

Builds carry the signed copy, and running apps pick up the new list from `ROSTER_URL` on their next
launch, so no release is needed for roster changes. The URL is in
[`src/renderer/core/roster.js`](../src/renderer/core/roster.js) and currently points at
`raw.githubusercontent.com/Aragasu/omniyap/main/src/renderer/core/roster.json`; GitHub's CDN can lag a
few minutes behind a push.

Users can still bind `contributor`, `translator`, `tester` and `artist` locally from the plugin's
settings box for their own lists. Typing `owner` or `developer` there does nothing — those two roles
are roster-only.

## Creating or rotating the key

```bash
npm run roster:keygen            # once; writes .keys/roster-private.jwk and roster-key.json
npm run roster:sign              # sign the current roster with that key
```

`keygen` refuses to overwrite an existing private key unless you pass `--force`
(`node scripts/roster.mjs keygen --force`). Rotating the key changes `roster-key.json`, which is
compiled into the app, so a rotation needs a release before older installs accept the new roster.
Back the private key up somewhere safe; if it is lost, generate a new pair, sign, and ship the new
public key.

Never commit the private key. It is the only difference between "signed roster" and "anyone can type
their own id in".

## What this does not do

The badge is drawn locally, so someone who edits the client, replaces the public key with their own
and rebuilds can display whatever they like — they have made a modified build, not fooled the
official one. The roster also does not hide user ids (they are readable in the JSON, as ids generally
are); the signature protects authority, not secrecy.
