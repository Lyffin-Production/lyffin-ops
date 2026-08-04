/* ============================================================================
   Lyffin Ops — shared.js
   ----------------------------------------------------------------------------
   Single source of truth for the things every page used to duplicate:
   Firebase init, HTML escaping, status constants/transition rules, the
   first-sign-in self-provisioning flow, and offline detection.

   Import what you need, e.g.:
     import { db, auth, esc, resolveUserDoc, STATUS_ORDER, isValidTransition,
              initOfflineBanner } from './shared.js';

   Editing this file changes the behaviour on every page at once — that is
   the point. Test a change on one page before assuming it is safe everywhere.
   ==========================================================================*/

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.9.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.9.0/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, getDoc, setDoc
} from 'https://www.gstatic.com/firebasejs/11.9.0/firebase-firestore.js';

/* ── Firebase ────────────────────────────────────────────────────────────── */
export const firebaseConfig = {
  apiKey:            "AIzaSyC0aoUyBCHn63-WkJnPFbDJLF0x1GFMyxU",
  authDomain:        "lyffin-platform.firebaseapp.com",
  projectId:         "lyffin-platform",
  storageBucket:     "lyffin-platform.firebasestorage.app",
  messagingSenderId: "618920465280",
  appId:             "1:618920465280:web:11ba5583ff3f2b778a2765"
};

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Firestore with persistent offline cache: reads that were already loaded
// stay available (from IndexedDB) when the network drops, instead of every
// page showing an endless loading state. Multi-tab manager lets more than
// one open tab/PWA window share the same cache without errors.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

/* ── HTML escaping ──────────────────────────────────────────────────────────
   Escapes &, <, >, and both quote characters — safe for both text content
   and attribute contexts (value="...", title="...", onclick="...(...)").   */
export function esc(s) {
  return (s || '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Turns any raw string into a safe CSS-class-name fragment (letters/digits/
// hyphens only) — use this instead of `.toLowerCase().replace(/\s+/g,'-')`
// whenever a class name is derived from stored data, so a value containing
// a quote or angle bracket can never break out of a class="..." attribute.
export function safeClass(s) {
  return (s || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/* ── Status workflow ─────────────────────────────────────────────────────── */
// The intended production sequence. "Not Started" and "On Hold" are outside
// the main line (Hold can be entered from/exited to whatever step it was at).
export const STATUS_ORDER = ['Not Started', 'Structure', 'Polish', 'Upholstery', 'Packing', 'Delivered', 'Completed'];

// Returns true if moving from `from` to `to` is a normal forward step, a
// move onto/off "On Hold", or a same-value no-op. Anything else (skipping
// stages, jumping backward past Hold) is flagged so the UI can ask for
// confirmation instead of silently allowing it.
export function isValidTransition(from, to) {
  if (!from || from === to) return true;
  if (to === 'On Hold' || from === 'On Hold') return true; // hold can interrupt/resume from anywhere
  const i = STATUS_ORDER.indexOf(from), j = STATUS_ORDER.indexOf(to);
  if (i === -1 || j === -1) return true; // unknown value — don't block, just can't vouch for it
  return j === i + 1; // only the very next step counts as a normal transition
}

/* ── Self-provisioning on first sign-in ─────────────────────────────────────
   Looks up the signed-in user's profile doc. If this is their first ever
   sign-in (no users/{uid} doc yet), checks for an admin-created invite
   matching their verified email and claims it — creating users/{uid} with
   exactly the name/role the admin assigned, instead of silently falling
   back to a default role. Firestore rules only allow this self-create when
   the written role/name match the invite exactly, so a user can never
   grant themselves a role this way. `fallbackRole` matches each page's
   existing default (most pages use 'sales'; production/project use 'floor'
   to avoid mis-routing factory-floor accounts before they're provisioned). */
export async function resolveUserDoc(user, fallbackRole) {
  let snap;
  try {
    snap = await getDoc(doc(db, 'users', user.uid));
  } catch (e) {
    // A failed read here (network blip, cold start before the connection is
    // live, etc.) must never silently strand the caller — every page that
    // calls this expects a plain object back, not an uncaught rejection.
    return {};
  }
  if (snap.exists()) return snap.data();
  if (user.email) {
    try {
      const inviteSnap = await getDoc(doc(db, 'pendingInvites', user.email));
      if (inviteSnap.exists()) {
        const invite = inviteSnap.data();
        const userDoc = { name: invite.name || '', email: user.email, role: invite.role || fallbackRole || 'sales' };
        await setDoc(doc(db, 'users', user.uid), userDoc);
        return userDoc;
      }
    } catch (e) { /* fall through to default */ }
  }
  return {};
}

/* ── Offline banner ──────────────────────────────────────────────────────── */
// Shows a small fixed banner whenever the browser goes offline, and hides it
// on reconnect. Cached reads still work (see persistentLocalCache above);
// this banner just tells the person clearly why data might be stale instead
// of leaving them looking at a blank or endlessly-loading screen.
export function initOfflineBanner() {
  if (document.getElementById('lc-offline-banner')) return;
  const el = document.createElement('div');
  el.id = 'lc-offline-banner';
  el.textContent = "You're offline — showing the last loaded data. Changes will sync once you're back online.";
  el.style.cssText = 'display:none;position:fixed;left:0;right:0;bottom:0;z-index:9999;' +
    'background:#3a2f1c;color:#f3e9d2;font-size:12.5px;font-family:system-ui,-apple-system,sans-serif;' +
    'padding:9px 16px;text-align:center;box-shadow:0 -2px 8px rgba(0,0,0,.15)';
  document.body.appendChild(el);
  const update = () => { el.style.display = navigator.onLine ? 'none' : 'block'; };
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}
