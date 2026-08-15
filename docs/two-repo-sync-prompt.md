# Two-repo sync — prompt to paste into any session

Copy the block below into any Claude Code tab working on this project (append your actual task
after it). It makes the session apply the change to **both** repos correctly and safely.

---

## THE PROMPT (copy from here)

**TWO-REPO RULE — read before you edit anything.**

This project has **two copies of the same frontend on purpose**:

- **MI-Proc** — `d:\MI-Proc\src` — the **mock-API reference / design source of truth**. 100% mock
  (localStorage). Ships to GitHub.
- **myapp** — `d:\MI-Proc\myapp-frontend-new\src` — the **real-API integration** target. Ships to
  GitLab `dev` → Cloud Run.

They exist separately because the backend isn't ready and lands module-by-module: MI-Proc lets every
screen be built and reviewed against Figma with zero backend, while myapp absorbs the risky real-API
churn. They are the **same product**, so if a screen changes in only one they drift and the reference
stops matching what deploys.

### What you must do
**Any UI / screen / component / i18n change must end up in BOTH repos, byte-identical.**
A change is **not done** until it exists in both and both build green.

### The ONE exception
**Real-API wiring lives in myapp only** — never copy it into MI-Proc, and never let a copy *from*
MI-Proc overwrite it. myapp-only files include:
`features/auth/api/`, `useLogout.ts`, `useResolveAfterLogin.ts`, `useSessionBootstrap.tsx`,
`platform/http/apiClient`, the flag-driven RFQ view-models (`rfqDetailView.ts`, `statusRules.ts`,
`listView.ts`), and myapp's real-API i18n strings (auth/onboarding errors, toasts).
For those, mirror the **behaviour**, not the bytes.

### How to sync — follow this exactly

**1. MI-Proc is CRLF, myapp is LF.** A plain `diff -rq` lies (reports ~141 files differing when only
~46 really do). Always compare CR-insensitively:
```bash
diff --strip-trailing-cr -q src/<path> myapp-frontend-new/src/<path>
```

**2. Check the diff DIRECTION before copying anything.**
```bash
diff --strip-trailing-cr src/<path> myapp-frontend-new/src/<path> | grep -c '^<'   # MI-Proc-only lines
diff --strip-trailing-cr src/<path> myapp-frontend-new/src/<path> | grep -c '^>'   # myapp-only lines
```
- **myapp-only count is 0** → MI-Proc is purely ahead → safe to copy the whole file.
- **myapp-only count > 0** → myapp has content you'd destroy → **merge by hand**, do not copy.
  Inspect what it is first: `diff --strip-trailing-cr src/<p> myapp-frontend-new/src/<p> | grep '^>'`

**3. Copy with line-ending conversion** (never a plain `cp` — it drags CRLF into myapp):
```bash
sed 's/\r$//' src/<path> > myapp-frontend-new/src/<path>
```

**4. Known traps — these ALWAYS need a hand-merge, never a copy:**
- `app/layouts/PortalShell/PortalShell.tsx` — myapp has `useLogout` (real-API).
- `platform/i18n/locales/en.ts` and `ar.ts` — myapp has ~34 extra lines of real-API auth/onboarding
  error strings, toasts and RFQ amendment keys. **Add your new keys surgically; never copy the file.**
- Any `features/auth/*`, `features/onboarding/*`, `platform/auth/*`, `platform/config.ts`, `main.tsx`.

**5. i18n:** every new user-facing string goes in `en.ts` **AND** `ar.ts`, in **both** repos.
Use logical Tailwind utilities (`ms-`, `me-`, `text-start`) — never `ml-`/`mr-`/`left`/`right`.

### Verify before you claim done
```bash
# MI-Proc — must be 0 errors
cd /d/MI-Proc && npx tsc -b

# myapp — must build
cd /d/MI-Proc/myapp-frontend-new && npm run build

# parity for every file you touched
diff --strip-trailing-cr -q src/<path> myapp-frontend-new/src/<path>
```
Do **not** use `vite build` or `tsc --noEmit` to type-check (the root tsconfig checks nothing).

### Report honestly
Tell me, per file: **copied** / **hand-merged** / **skipped (and why)**. If a file could not be synced
safely (e.g. it holds myapp real-API content you shouldn't touch), say so explicitly rather than
forcing it. If another session is mid-edit in a file, leave it and flag it.

**My actual task:** <describe the change here>

## (copy to here)

---

### Short version (when you just need the reminder)

> Apply this change to **both** repos: `d:\MI-Proc\src` (mock reference) and
> `d:\MI-Proc\myapp-frontend-new\src` (real-API). They must end up byte-identical **except** myapp's
> real-API files, which you must never overwrite. MI-Proc is CRLF and myapp is LF — compare with
> `diff --strip-trailing-cr` and copy with `sed 's/\r$//' src/X > myapp-frontend-new/src/X`. Before
> copying any file, check for myapp-only lines (`grep -c '^>'`) — if there are any, hand-merge instead.
> `PortalShell.tsx` and both i18n locale files ALWAYS need a hand-merge. New strings go in `en.ts` and
> `ar.ts` in both repos. Then verify: `npx tsc -b` in MI-Proc and `npm run build` in myapp, both green,
> plus `diff -q` on each file you touched. Report per file: copied / merged / skipped-and-why.
