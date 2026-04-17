
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   DFA MINIMIZER — FULL JAVASCRIPT ENGINE + AI + QUIZ + THEORY
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

// ── Display-layer helpers for Kleene star notation ────────────────────────────
//
// SCOPE (per user specification):
//   1. HTML chip buttons (regex examples)  → true <sup>*</sup> superscript
//   2. Cytoscape edge labels (canvas/SVG)  → Unicode small asterisk ﹡ (U+FE61)
//      because canvas cannot render HTML; the visually-raised glyph is the
//      closest faithful approximation.
//   3. Everything else (Σ* formula, state-table markers, internal data,
//      parser, logic) → left exactly as-is.
//
// regexToHtmlSup(str)
//   Wraps postfix * and postfix + (one-or-more) in HTML <sup> tags.
//   CRITICAL DISTINCTION: infix `+` (union, e.g. `a+b`) must NOT be
//   superscripted. Only postfix `+` (one-or-more, e.g. `a+` at end of
//   expression or before `)`, `*`, `.`) gets <sup>.
//
//   Rule for `+`:
//     postfix  when next non-space char is: end-of-string, `)`, `*`, `+`, `.`
//     infix    when next non-space char is: any letter/digit or `(`
//
//   Rule for `*`: always postfix — wrap unconditionally (same as before).
//
function regexToHtmlSup(str) {
  if (!str || typeof str !== 'string') return str;

  // Step 1: superscript `*` — always postfix, safe to replace globally
  // after any ), word char, or closing </sup>
  let out = str.replace(/(\)|[\w\d]|<\/sup>)\*/g, '$1<sup>*</sup>');

  // Step 2: superscript postfix `+` ONLY — scan char by char so we can
  // inspect what follows each `+` and distinguish union from one-or-more.
  let result = '';
  for (let i = 0; i < out.length; i++) {
    if (out[i] === '+') {
      // Find next non-space character after this `+`
      let nextNonSpace = '';
      for (let j = i + 1; j < out.length; j++) {
        if (out[j] !== ' ') { nextNonSpace = out[j]; break; }
      }
      // Check if the char before `+` is an expression-end (operand or closing)
      // by peeking at the raw result so far (ignore trailing spaces)
      const prevText = result.trimEnd();
      const prevChar = prevText[prevText.length - 1] || '';
      const prevIsOperandEnd = /[\w\d)]/.test(prevChar) || prevText.endsWith('</sup>');

      // It's postfix only when:
      //   - left side ends an expression (operand end) AND
      //   - right side is NOT an operand start (not a letter/digit or `(`)
      const rightIsOperandStart = /[\w\d(]/.test(nextNonSpace);
      if (prevIsOperandEnd && !rightIsOperandStart) {
        result += '<sup>+</sup>';
      } else {
        result += '+';   // infix union — keep as plain `+`
      }
    } else {
      result += out[i];
    }
  }
  return result;
}

// regexToUnicodeSup(str)
//   Replaces postfix * with ﹡ (U+FE61 SMALL ASTERISK) and postfix + with ⁺ (U+207A).
//   Used for Cytoscape edge labels which are rendered on <canvas> and cannot
//   parse HTML.  The glyphs are visually smaller/raised and read as superscripts
//   in the monospace font Cytoscape uses.
//
function regexToUnicodeSup(str) {
  if (!str || typeof str !== 'string') return str;

  // Step 1: replace postfix * — always safe, * is never infix in regex
  let out = str.replace(/(\)|[\w\d])\*/g, '$1﹡');   // U+FE61 small asterisk

  // Step 2: replace postfix + only — same look-ahead logic as regexToHtmlSup.
  //   Postfix when: left side ends an operand AND right side is NOT an operand start.
  //   Infix (union) when: right side IS an operand start (letter/digit or `(`).
  let result = '';
  for (let i = 0; i < out.length; i++) {
    if (out[i] === '+') {
      let nextNonSpace = '';
      for (let j = i + 1; j < out.length; j++) {
        if (out[j] !== ' ') { nextNonSpace = out[j]; break; }
      }
      const prevText = result.trimEnd();
      const prevChar = prevText[prevText.length - 1] || '';
      const prevIsOperandEnd = /[\w\d)]/.test(prevChar) || prevText.endsWith('﹡') || prevText.endsWith('⁺');
      const rightIsOperandStart = /[\w\d(]/.test(nextNonSpace);

      if (prevIsOperandEnd && !rightIsOperandStart) {
        result += '⁺';   // postfix one-or-more  (U+207A superscript plus)
      } else {
        result += '+';   // infix union — keep as plain `+`
      }
    } else {
      result += out[i];
    }
  }
  return result;
}

// ── Language Definition Box ────────────────────────────────────────────────────

let langSigmaSelected = [];
let langDefOpen = true;

function toggleLangDef() {
  langDefOpen = !langDefOpen;
  const body = document.getElementById('lang-def-body');
  const toggle = document.getElementById('lang-def-toggle');
  if (langDefOpen) {
    body.classList.remove('collapsed');
    toggle.classList.remove('collapsed');
    body.style.maxHeight = body.scrollHeight + 'px';
    setTimeout(() => { body.style.maxHeight = ''; }, 350);
  } else {
    body.style.maxHeight = body.scrollHeight + 'px';
    requestAnimationFrame(() => { body.classList.add('collapsed'); toggle.classList.add('collapsed'); });
  }
}

function toggleSigmaChip(sym) {
  const chip = document.querySelector(`.lang-sigma-chip[data-sym="${sym}"]`);
  if (!chip) return;
  const idx = langSigmaSelected.indexOf(sym);
  if (idx === -1) {
    langSigmaSelected.push(sym);
    chip.classList.add('active');
  } else {
    langSigmaSelected.splice(idx, 1);
    chip.classList.remove('active');
  }
  renderSigmaSelected();
  updateLangPreview();
}

function renderSigmaSelected() {
  const el = document.getElementById('lang-sigma-selected');
  if (!langSigmaSelected.length) {
    el.innerHTML = '<span style="color:var(--ink3);font-size:0.75rem">No symbols selected — click to add</span>';
    return;
  }
  el.innerHTML = langSigmaSelected.map(sym =>
    `<span class="sigma-badge">${sym}<span class="sigma-badge-remove" onclick="removeSigmaSym('${sym}')">✕</span></span>`
  ).join('');
}

function removeSigmaSym(sym) {
  const idx = langSigmaSelected.indexOf(sym);
  if (idx !== -1) langSigmaSelected.splice(idx, 1);
  const chip = document.querySelector(`.lang-sigma-chip[data-sym="${sym}"]`);
  if (chip) chip.classList.remove('active');
  renderSigmaSelected();
  updateLangPreview();
}

function addSigmaSymbol() {
  const sym = prompt('Enter a new alphabet symbol (single character or short string):');
  if (!sym || !sym.trim()) return;
  const s = sym.trim();
  if (langSigmaSelected.includes(s)) { alert('Symbol already added.'); return; }
  // Create and add chip
  const container = document.getElementById('lang-sigma-chips');
  const addBtn = container.querySelector('.lang-sigma-add');
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'lang-sigma-chip active';
  chip.dataset.sym = s;
  chip.textContent = s;
  chip.onclick = () => toggleSigmaChip(s);
  container.insertBefore(chip, addBtn);
  langSigmaSelected.push(s);
  renderSigmaSelected();
  updateLangPreview();
}

function updateLangPreview() {
  const sigma = langSigmaSelected.length ? `{${langSigmaSelected.join(',')}}` : 'Σ';
  const desc = document.getElementById('lang-desc-input').value.trim();
  const cond = desc || '<em style="color:var(--ink3)">describe your language above</em>';
  document.getElementById('lang-preview-formula').innerHTML =
    `L = { w ∈ ${sigma}* | ${cond} }`;
}

function applyLangToInputs() {
  if (!langSigmaSelected.length) {
    const alphaInput = document.getElementById('m-alpha');
    if (alphaInput) alphaInput.focus();
    return;
  }
  const alphaInput = document.getElementById('m-alpha');
  if (alphaInput) {
    alphaInput.value = langSigmaSelected.join(',');
    alphaInput.style.borderColor = 'var(--violet)';
    alphaInput.style.boxShadow = '0 0 0 3px var(--violet-glow)';
    setTimeout(() => { alphaInput.style.borderColor = ''; alphaInput.style.boxShadow = ''; }, 1400);
    alphaInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ── Language Description → DFA Builder ────────────────────────────────────────
// applyLangAndSwitch now calls mFromLangDef which uses AI to build the DFA
function applyLangAndSwitch() {
  mFromLangDef();
}

// Built-in pattern library for common language descriptions (instant, no AI needed)
const LANG_PATTERNS = [
  // Even number of a/0/1/b
  { rx: /even\s+(?:number|count)\s+of\s+['"]?(\w+)['"]?/, handler: (m, sigma) => buildEvenCountDFA(m[1], sigma) },
  { rx: /(?:number|count)\s+of\s+['"]?(\w+)['"]?\s+(?:is\s+)?even/, handler: (m, sigma) => buildEvenCountDFA(m[1], sigma) },

  // Ends with / ending in
  { rx: /end(?:s|ing)?\s+(?:in|with)\s+['"]?([a-z0-9]+)['"]?/, handler: (m, sigma) => buildEndsWith(m[1], sigma) },

  // 🔥 FIXED: Starts with (handles "strings starting with a")
  {
    rx: /(?:strings?\s+)?start(?:s|ed|ing)?\s+(?:with|by)\s+['"]?([a-z0-9]+)['"]?/,
    handler: (m, sigma) => buildStartsWith(m[1], sigma)
  },

  // Contains substring
  { rx: /contain(?:s|ing)\s+['"]?([a-z0-9]+)['"]?/, handler: (m, sigma) => buildContains(m[1], sigma) },

  // 🔥 FIXED: Divisible by 3 (handles "binary div by 3")
  { rx: /(binary\s+)?(div|divisible|multiple|mod(?:ulo)?)\s*(by)?\s*3/, handler: (_m, _sigma) => buildDiv3() },

  // Length divisible by 2
  { rx: /length\s+(?:is\s+)?(?:even|divisible\s+by\s+2|multiple\s+of\s+2)/, handler: (_m, sigma) => buildEvenLength(sigma) },

  // Length divisible by 3
  { rx: /length\s+(?:is\s+)?(?:divisible\s+by\s+3|multiple\s+of\s+3)/, handler: (_m, sigma) => buildLengthMod3(sigma) },

  // Accepts all strings
  { rx: /all\s+strings|accepts\s+everything|every\s+string|Σ\*/, handler: (_m, sigma) => buildAcceptAll(sigma) },

  // Rejects all / empty language
  { rx: /no\s+strings|empty\s+language|reject\s+all|accepts\s+nothing/, handler: (_m, sigma) => buildRejectAll(sigma) },
];

// ── DFA Builders for common patterns ──
function buildEvenCountDFA(sym, sigma) {
  // q0: even count (accepting), q1: odd count
  const al = sigma.length ? sigma : [sym];
  const tr = { q0: {}, q1: {} };
  al.forEach(a => {
    if (a === sym) { tr.q0[a] = 'q1'; tr.q1[a] = 'q0'; }
    else { tr.q0[a] = 'q0'; tr.q1[a] = 'q1'; }
  });
  return {
    states: ['q0', 'q1'], alpha: al, start: 'q0', finals: ['q0'], trans: tr,
    desc: `Accepts strings over {${al.join(',')}} with even number of '${sym}'`
  };
}
function buildEvenCountMulti(symbols, sigma) {
  const tracked = [...new Set(symbols.map(s => String(s).trim()).filter(Boolean))];
  const al = sigma.length ? sigma : tracked;
  if (!tracked.length) return buildAcceptAll(al);

  const states = Array.from({ length: 1 << tracked.length }, (_, i) => `q${i}`);
  const tr = {};
  states.forEach((stateName, mask) => {
    tr[stateName] = {};
    al.forEach(a => {
      const idx = tracked.indexOf(a);
      const nextMask = idx === -1 ? mask : (mask ^ (1 << idx));
      tr[stateName][a] = `q${nextMask}`;
    });
  });

  return {
    states,
    alpha: al,
    start: 'q0',
    finals: ['q0'],
    trans: tr,
    desc: `Accepts strings over {${al.join(',')}} with even number of ${tracked.map(s => `'${s}'`).join(' and ')}`
  };
}
function buildEvenThenOddFollowedBy(firstSym, secondSym, sigma) {
  const al = sigma.length ? sigma : [...new Set([firstSym, secondSym])];
  const states = ['q0', 'q1', 'q2', 'q3', 'Dead'];
  const tr = {};
  states.forEach(s => { tr[s] = {}; });

  al.forEach(a => {
    tr['q0'][a] = a === firstSym ? 'q1' : a === secondSym ? 'q3' : 'Dead';
    tr['q1'][a] = a === firstSym ? 'q0' : 'Dead';
    tr['q2'][a] = a === secondSym ? 'q3' : 'Dead';
    tr['q3'][a] = a === secondSym ? 'q2' : 'Dead';
    tr['Dead'][a] = 'Dead';
  });

  return {
    states,
    alpha: al,
    start: 'q0',
    finals: ['q3'],
    trans: tr,
    desc: `Accepts strings of the form ${firstSym}*${secondSym}* with an even number of '${firstSym}' followed by an odd number of '${secondSym}'`
  };
}
function buildEndsWith(suffix, sigma) {
  // Build DFA that accepts strings ending in `suffix` over sigma
  // Use simple KMP-style construction via subset of states 0..n
  const n = suffix.length;
  const states = Array.from({ length: n + 1 }, (_, i) => `q${i}`);
  const tr = {};
  states.forEach(s => { tr[s] = {}; });
  const al = sigma.length ? sigma : [...new Set(suffix.split(''))];
  // For each state (= matched prefix length), compute transitions
  // failure function
  const fail = new Array(n + 1).fill(0);
  for (let i = 1; i < n; i++) {
    let j = fail[i - 1];
    while (j > 0 && suffix[i] !== suffix[j]) j = fail[j - 1];
    if (suffix[i] === suffix[j]) j++;
    fail[i] = j;
  }
  for (let state = 0; state <= n; state++) {
    al.forEach(a => {
      let j = state === n ? fail[n - 1] : state;
      if (state < n && a === suffix[state]) j = state + 1;
      else {
        while (j > 0 && a !== suffix[j]) j = fail[j - 1];
        if (a === suffix[j]) j++;
      }
      tr[`q${state}`][a] = `q${j}`;
    });
  }
  return {
    states, alpha: al, start: 'q0', finals: [`q${n}`], trans: tr,
    desc: `Accepts strings over {${al.join(',')}} ending in "${suffix}"`
  };
}
function buildStartsWith(prefix, sigma) {
  const n = prefix.length;
  const states = Array.from({ length: n + 2 }, (_, i) => i < n + 1 ? `q${i}` : 'Dead');
  const al = sigma.length ? sigma : [...new Set(prefix.split(''))];
  const tr = {};
  states.forEach(s => { tr[s] = {}; });
  // q0→q1→...→qn on prefix chars; qn loops on all; anything wrong → Dead
  for (let i = 0; i < n; i++) {
    al.forEach(a => {
      tr[`q${i}`][a] = a === prefix[i] ? `q${i + 1}` : 'Dead';
    });
  }
  al.forEach(a => { tr[`q${n}`][a] = `q${n}`; tr['Dead'][a] = 'Dead'; });
  // CRIT-4 FIX: the original expression `states.filter((_,i)=>i>n&&i<n+1)` is always
  // empty (open interval between two consecutive integers has no integers in it).
  // qn is the only final state — it is the accepting sink reached after the full prefix.
  return {
    states, alpha: al, start: 'q0', finals: [`q${n}`], trans: tr,
    desc: `Accepts strings over {${al.join(',')}} starting with "${prefix}"`
  };
}

function buildContains(sub, sigma) {
  // KMP-based contains DFA
  const n = sub.length;
  const states = Array.from({ length: n + 1 }, (_, i) => `q${i}`);
  const al = sigma.length ? sigma : [...new Set(sub.split(''))];
  const tr = {};
  states.forEach(s => { tr[s] = {}; });
  const fail = new Array(n + 1).fill(0);
  for (let i = 1; i < n; i++) {
    let j = fail[i - 1];
    while (j > 0 && sub[i] !== sub[j]) j = fail[j - 1];
    if (sub[i] === sub[j]) j++;
    fail[i] = j;
  }
  for (let state = 0; state < n; state++) {
    al.forEach(a => {
      let j = state;
      if (a === sub[j]) j++;
      else {
        while (j > 0 && a !== sub[j]) j = fail[j - 1];
        if (a === sub[j]) j++;
      }
      tr[`q${state}`][a] = `q${j}`;
    });
  }
  // qn is accepting sink
  al.forEach(a => { tr[`q${n}`][a] = `q${n}`; });
  return {
    states, alpha: al, start: 'q0', finals: [`q${n}`], trans: tr,
    desc: `Accepts strings over {${al.join(',')}} containing "${sub}"`
  };
}
function buildDiv3() {
  const tr = { q0: { '0': 'q0', '1': 'q1' }, q1: { '0': 'q2', '1': 'q0' }, q2: { '0': 'q1', '1': 'q2' } };
  return {
    states: ['q0', 'q1', 'q2'], alpha: ['0', '1'], start: 'q0', finals: ['q0'], trans: tr,
    desc: 'Accepts binary strings (including "0") whose value is divisible by 3'
  };
}
function buildEvenLength(sigma) {
  const al = sigma.length ? sigma : ['0', '1'];
  const tr = { q0: {}, q1: {} };
  al.forEach(a => { tr.q0[a] = 'q1'; tr.q1[a] = 'q0'; });
  return {
    states: ['q0', 'q1'], alpha: al, start: 'q0', finals: ['q0'], trans: tr,
    desc: `Accepts strings over {${al.join(',')}} with even length`
  };
}
function buildLengthMod3(sigma) {
  const al = sigma.length ? sigma : ['0', '1'];
  const tr = { q0: {}, q1: {}, q2: {} };
  al.forEach(a => { tr.q0[a] = 'q1'; tr.q1[a] = 'q2'; tr.q2[a] = 'q0'; });
  return {
    states: ['q0', 'q1', 'q2'], alpha: al, start: 'q0', finals: ['q0'], trans: tr,
    desc: `Accepts strings over {${al.join(',')}} with length divisible by 3`
  };
}
function buildAcceptAll(sigma) {
  const al = sigma.length ? sigma : ['0', '1'];
  const tr = { q0: {} };
  al.forEach(a => { tr.q0[a] = 'q0'; });
  return {
    states: ['q0'], alpha: al, start: 'q0', finals: ['q0'], trans: tr,
    desc: `Accepts ALL strings over {${al.join(',')}}`
  };
}
function buildRejectAll(sigma) {
  const al = sigma.length ? sigma : ['0', '1'];
  const tr = { q0: {} };
  al.forEach(a => { tr.q0[a] = 'q0'; });
  return {
    states: ['q0'], alpha: al, start: 'q0', finals: [], trans: tr,
    desc: `Rejects ALL strings (empty language) over {${al.join(',')}}`
  };
}

function normalizeLangText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/["â€]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchBuiltInLanguage(desc, sigma) {
  const normalized = normalizeLangText(desc);
  const followedByMatch = normalized.match(/^(?:strings?\s+(?:with|having)\s+)?even\s+(?:number|count)\s+of\s+['"]?([a-z0-9_]+)['"]?s?\s+followed\s+by\s+(?:an?\s+)?odd\s+(?:number|count)\s+of\s+['"]?([a-z0-9_]+)['"]?s?$/i);
  if (followedByMatch) {
    return buildEvenThenOddFollowedBy(followedByMatch[1], followedByMatch[2], sigma);
  }

  const evenMultiMatch = normalized.match(/^(?:strings?\s+(?:with|having)\s+)?even\s+(?:number|count)\s+of\s+['"]?([a-z0-9_]+)['"]?s?\s+and\s+['"]?([a-z0-9_]+)['"]?s?$/i);
  if (evenMultiMatch) {
    return buildEvenCountMulti([evenMultiMatch[1], evenMultiMatch[2]], sigma);
  }

  for (const pat of LANG_PATTERNS) {
    const m = normalized.match(pat.rx);
    if (!m) continue;
    // if (normalizeLangText(m[0]) !== normalized) continue;
    return pat.handler(m, sigma);
  }

  return null;
}

async function mFromLangDef() {
  const desc = document.getElementById('lang-desc-input').value.trim();
  const sigma = [...langSigmaSelected];
  const errEl = document.getElementById('m-langdef-error') || (() => {
    const d = document.createElement('div'); d.id = 'm-langdef-error';
    const panel = document.getElementById('imp-langdef');
    if (panel) panel.appendChild(d);
    return d;
  })();
  errEl.innerHTML = '';

  if (!desc) { errEl.innerHTML = '<div class="error-box">⚠ Please describe your language first.</div>'; return; }
  if (!sigma.length) { errEl.innerHTML = '<div class="error-box">⚠ Please select at least one alphabet symbol (Σ).</div>'; return; }

  // ── 1. Try built-in pattern library first (instant, no API) ──
  const descLower = normalizeLangText(desc);
  const evenMultiDfa = matchBuiltInLanguage(desc, sigma);
  if (evenMultiDfa) {
    errEl.innerHTML = `<div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.3);border-radius:6px;padding:8px 14px;font-size:0.78rem;color:var(--green);margin-top:10px">
      ✓ Recognised pattern: <em>${esc(evenMultiDfa.desc)}</em>
    </div>`;
    mLoadDFA(evenMultiDfa.states, evenMultiDfa.alpha, evenMultiDfa.start, evenMultiDfa.finals, evenMultiDfa.trans, `Language: ${desc}`);
    return;
  }
  for (const pat of LANG_PATTERNS) {
    const m = descLower.match(pat.rx);
    // if (m && normalizeLangText(m[0]) !== descLower) continue;
    if (m) {
      try {
        const dfa = pat.handler(m, sigma);
        // Validate the built result
        if (dfa && dfa.states && dfa.states.length && dfa.alpha && dfa.start) {
          errEl.innerHTML = `<div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.3);border-radius:6px;padding:8px 14px;font-size:0.78rem;color:var(--green);margin-top:10px">
            ✓ Recognised pattern: <em>${esc(dfa.desc)}</em>
          </div>`;
          mLoadDFA(dfa.states, dfa.alpha, dfa.start, dfa.finals, dfa.trans, `Language: ${desc}`);
          return;
        }
      } catch (e) { console.warn('[LangDef] built-in handler error:', e); }
    }
  }

  // ── 2. Check if a named preset matches ──
  for (const [key, sug] of Object.entries(LANG_SUGGESTIONS)) {
    if (descLower === normalizeLangText(sug.desc)) {
      if (sug.preset && M_PRESETS[sug.preset]) {
        errEl.innerHTML = `<div style="background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.3);border-radius:6px;padding:8px 14px;font-size:0.78rem;color:var(--teal);margin-top:10px">
          ✓ Matched preset: <em>${esc(sug.desc)}</em>
        </div>`;
        mLoadPreset(sug.preset);
        return;
      }
    }
  }

  // ── 3. Unsupported language — show error and switch to Transition Table ──
  errEl.innerHTML = `<div class="error-box" style="margin-top:10px">
    ⚠ This language is not supported by the built-in pattern library.<br>
    <small style="color:var(--ink3)">Please use the <strong>Transition Table</strong> input to define your DFA manually.</small>
  </div>`;
  setTimeout(() => switchInputMethod('trtable'), 1200);
}

const LANG_SUGGESTIONS = {
  'even-a': { desc: "strings with even number of a's", sigma: ['a', 'b'], preset: 'even0s_ab' },
  'even-0': { desc: "strings with even number of 0's", sigma: ['0', '1'], preset: 'even0s' },
  'ends-01': { desc: "strings ending in '01'", sigma: ['0', '1'], preset: 'end01' },
  'starts-a': { desc: "strings starting with 'a'", sigma: ['a', 'b'], preset: null },
  'div3': { desc: "binary strings divisible by 3", sigma: ['0', '1'], preset: 'div3' },
};

function applySuggestion(key) {
  const s = LANG_SUGGESTIONS[key]; if (!s) return;
  document.getElementById('lang-desc-input').value = s.desc;
  // Reset sigma selection
  langSigmaSelected = [];
  document.querySelectorAll('.lang-sigma-chip').forEach(c => c.classList.remove('active'));
  s.sigma.forEach(sym => {
    const chip = document.querySelector(`.lang-sigma-chip[data-sym="${sym}"]`);
    if (chip) { chip.classList.add('active'); langSigmaSelected.push(sym); }
    else {
      // create chip if missing
      const container = document.getElementById('lang-sigma-chips');
      const addBtn = container.querySelector('.lang-sigma-add');
      const nc = document.createElement('button');
      nc.type = 'button';
      nc.className = 'lang-sigma-chip active';
      nc.dataset.sym = sym; nc.textContent = sym;
      nc.onclick = () => toggleSigmaChip(sym);
      container.insertBefore(nc, addBtn);
      langSigmaSelected.push(sym);
    }
  });
  renderSigmaSelected();
  updateLangPreview();
  // Also apply sigma to field and optionally load preset
  applyLangToInputs();
  if (s.preset && M_PRESETS[s.preset]) mLoadPreset(s.preset);
}

// Wire up sigma chip clicks — moved to DOMContentLoaded below

// ── Page Navigation ────────────────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const pg = document.getElementById('page-' + id);
  if (pg) pg.classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l => {
    if (l.getAttribute('onclick') && l.getAttribute('onclick').includes("'" + id + "'")) l.classList.add('active');
  });
  window.scrollTo(0, 0);
}

// ── Theory toggles ──────────────────────────────────────────────────────────────
function toggleTheory(id) {
  const el = document.getElementById(id);
  const btn = document.getElementById('btn-' + id);
  if (!el) return;
  el.classList.toggle('open');
  if (btn) {
    btn.classList.toggle('open');
    // Find the first text node safely
    const textNode = Array.from(btn.childNodes).find(n => n.nodeType === 3);
    if (textNode) textNode.textContent = el.classList.contains('open') ? 'Collapse ' : 'Learn more ';
  }
}


// ── Helpers ────────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function pairKey(p, q) {
  const ps = String(p), qs = String(q);
  return (mStateCompare(ps, qs) <= 0 ? `${ps}\x00${qs}` : `${qs}\x00${ps}`);
}
function mGetEl(id) { return document.getElementById(id); }
function mClone(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
function mUniqueOrdered(list) {
  return [...new Set((Array.isArray(list) ? list : []).map(v => String(v).trim()).filter(Boolean))];
}
function mStateCompare(a, b) { return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }); }
function mSortStates(list) { return [...list].sort(mStateCompare); }
function mCanonicalGroupKey(group) { return mSortStates(group)[0] || ''; }
function mCanonicalizeGroups(groups) {
  const entries = Object.values(groups || {}).map(group => mSortStates(group)).filter(group => group.length);
  entries.sort((a, b) => mStateCompare(mCanonicalGroupKey(a), mCanonicalGroupKey(b)));
  const out = {};
  entries.forEach(group => { out[mCanonicalGroupKey(group)] = group; });
  return out;
}
function mBuildGroupsFromMarkedPairs(states, markedPairs) {
  const parent = {};
  const orderedStates = mSortStates(states || []);
  orderedStates.forEach(s => (parent[s] = s));
  function find(x) {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  }
  function union(a, b) {
    const ra = find(a), rb = find(b);
    if (ra === rb) return;
    const keep = mStateCompare(ra, rb) <= 0 ? ra : rb;
    const drop = keep === ra ? rb : ra;
    parent[drop] = keep;
  }
  for (let i = 0; i < orderedStates.length; i++) {
    for (let j = i + 1; j < orderedStates.length; j++) {
      const key = pairKey(orderedStates[i], orderedStates[j]);
      if (Object.prototype.hasOwnProperty.call(markedPairs, key) && markedPairs[key] === false) {
        union(orderedStates[i], orderedStates[j]);
      }
    }
  }
  const groups = {};
  orderedStates.forEach(s => {
    const rep = find(s);
    if (!groups[rep]) groups[rep] = [];
    groups[rep].push(s);
  });
  return mCanonicalizeGroups(groups);
}
function mBuildGroupMembership(groups) {
  const repByState = new Map();
  const labelByRep = new Map();
  const sortedKeys = Object.keys(groups || {}).sort(mStateCompare);
  sortedKeys.forEach(rep => {
    const members = mSortStates(groups[rep] || []);
    const label = members.length === 1 ? members[0] : `{${members.join(',')}}`;
    labelByRep.set(rep, label);
    members.forEach(state => repByState.set(state, rep));
  });
  return { repByState, labelByRep, sortedKeys };
}
function mPartitionToMarkedPairs(states, partition) {
  const groups = (partition || []).map(group => mSortStates(group)).filter(group => group.length);
  const membership = new Map();
  groups.forEach((group, idx) => group.forEach(state => membership.set(state, idx)));
  const marked = {};
  const orderedStates = mSortStates(states || []);
  for (let i = 0; i < orderedStates.length; i++) {
    for (let j = i + 1; j < orderedStates.length; j++) {
      marked[pairKey(orderedStates[i], orderedStates[j])] = membership.get(orderedStates[i]) !== membership.get(orderedStates[j]);
    }
  }
  return marked;
}
function mBuildSignature(state, alpha, transitions, stateToGroup, partition) {
  return alpha.map(sym => {
    const dest = transitions[state] && transitions[state][sym];
    const groupIdx = stateToGroup.get(dest);
    if (groupIdx === undefined) return `?${sym}`;
    return mCanonicalGroupKey(partition[groupIdx] || []);
  }).join(' | ');
}
// ══════════════════════════════════════════════════════════════════
// ── PART 1: normalizeDFA — standalone, called by mRunMinimization
//            and mCrossValidateSilent. Returns a normalized DFA
//            object or throws a string error message.
//
// Pipeline (strict order):
//   1. Trim/unique state names and alphabet
//   2. Validate start ∈ states, finals ⊆ states
//   3. Reject if no final states
//   4. BFS unreachable removal
//   5. Add Dead trap state if any transition missing
//   6. Sort states and alphabet deterministically
//   7. Final completeness assertion
// ══════════════════════════════════════════════════════════════════
function normalizeDFA(dfa) {
  // 1. Normalize names
  let states = mUniqueOrdered((dfa.states || []).map(s => String(s).trim()));
  let alpha = mUniqueOrdered((dfa.alpha || []).map(a => String(a).trim()));
  let start = String(dfa.start || '').trim();
  let finals = mUniqueOrdered((dfa.finals || []).map(f => String(f).trim()));
  // Deep-clone transitions and trim keys/values
  let trans = {};
  states.forEach(s => {
    trans[s] = {};
    alpha.forEach(a => {
      const raw = dfa.trans && dfa.trans[s] && dfa.trans[s][a];
      trans[s][a] = raw ? String(raw).trim() : '';
    });
  });

  // 2. Validate start / finals
  const stateSet = new Set(states);
  if (!states.length) throw 'No states defined.';
  if (!alpha.length) throw 'No alphabet symbols defined.';
  if (!start) throw 'Start state is required.';
  if (!stateSet.has(start)) throw `Start state "${start}" is not in the states list.`;
  const badFinals = finals.filter(f => !stateSet.has(f));
  if (badFinals.length) throw `Unknown final state(s): ${badFinals.join(', ')}`;

  // 3. Reject if no final states (Q5 answer B)
  if (!finals.length) throw 'DFA has no accepting (final) states — this defines the empty language. Add at least one final state.';

  // 4. BFS — remove unreachable states
  const reachable = new Set([start]);
  const bq = [start];
  while (bq.length) {
    const cur = bq.shift();
    alpha.forEach(a => {
      const dest = trans[cur] && trans[cur][a];
      if (dest && stateSet.has(dest) && !reachable.has(dest)) {
        reachable.add(dest);
        bq.push(dest);
      }
    });
  }
  states = states.filter(s => reachable.has(s));
  finals = finals.filter(s => reachable.has(s));
  const prunedTrans = {};
  states.forEach(s => {
    prunedTrans[s] = {};
    alpha.forEach(a => { prunedTrans[s][a] = (trans[s] && trans[s][a] && reachable.has(trans[s][a])) ? trans[s][a] : ''; });
  });
  trans = prunedTrans;

  // 5. Add Dead trap state if any transition is missing
  const missingAny = states.some(s => alpha.some(a => !trans[s][a]));
  if (missingAny) {
    let deadName = 'Dead';
    let dc = 1;
    while (new Set(states).has(deadName)) deadName = `Dead_${dc++}`;
    states.push(deadName);
    trans[deadName] = {};
    alpha.forEach(a => { trans[deadName][a] = deadName; });
    states.forEach(s => {
      if (s === deadName) return;
      alpha.forEach(a => { if (!trans[s][a]) trans[s][a] = deadName; });
    });
  }

  // 6. Sort states and alphabet deterministically
  states = mSortStates(states);
  alpha = [...alpha].sort(mStateCompare);

  // Re-validate finals after pruning (finals can become empty if all were unreachable)
  finals = finals.filter(s => new Set(states).has(s));

  // 7. Final completeness assertion
  const stSet2 = new Set(states);
  states.forEach(s => alpha.forEach(a => {
    if (!trans[s][a] || !stSet2.has(trans[s][a]))
      throw `Internal: transition δ(${s},${a}) still undefined after normalization. Bug — please report.`;
  }));

  return { states, alpha, start, finals, trans };
}

function mValidateAndNormalizeDFA(st, al, start, fn, tr, options = {}) {
  const allowPartial = !!options.allowPartial;
  const errors = [];
  const warnings = [];
  const rawStates = Array.isArray(st) ? st.map(s => String(s).trim()).filter(Boolean) : [];
  const rawAlpha = Array.isArray(al) ? al.map(a => String(a).trim()).filter(Boolean) : [];
  const states = mUniqueOrdered(rawStates);
  const alpha = mUniqueOrdered(rawAlpha);
  const finalsRaw = Array.isArray(fn) ? fn.map(f => String(f).trim()).filter(Boolean) : [];
  const finals = mUniqueOrdered(finalsRaw);
  const startState = String(start || '').trim();
  const stateSet = new Set(states);
  if (!states.length) errors.push('No states defined.');
  if (states.length > 2000) errors.push(`Too many states (${states.length}). Limit is 2000 to prevent browser crash.`);
  if (!alpha.length) errors.push('No alphabet symbols defined.');
  if (rawStates.length !== states.length) errors.push('Duplicate state names are not allowed.');
  if (rawAlpha.length !== alpha.length) errors.push('Duplicate alphabet symbols are not allowed.');
  if (!startState) errors.push('Start state is required.');
  else if (!stateSet.has(startState)) errors.push(`Start state "${startState}" is not in the states list.`);
  const badFinals = finals.filter(f => !stateSet.has(f));
  if (badFinals.length) errors.push(`Unknown final state(s): ${badFinals.join(', ')}`);
  const cleanTrans = {};
  const missingTransitions = [];
  const invalidTransitions = [];
  states.forEach(state => {
    cleanTrans[state] = {};
    alpha.forEach(sym => {
      const dest = tr && tr[state] && Object.prototype.hasOwnProperty.call(tr[state], sym)
        ? String(tr[state][sym]).trim()
        : '';
      if (!dest) {
        cleanTrans[state][sym] = '';
        missingTransitions.push(`δ(${state},${sym})`);
        return;
      }
      if (!stateSet.has(dest)) {
        invalidTransitions.push(`δ(${state},${sym}) → ${dest}`);
        cleanTrans[state][sym] = '';
        return;
      }
      cleanTrans[state][sym] = dest;
    });
  });
  if (invalidTransitions.length) errors.push(`Unknown transition destination(s): ${invalidTransitions.join(', ')}`);
  if (!allowPartial && missingTransitions.length) errors.push(`Missing transition(s): ${missingTransitions.join(', ')}`);
  if (allowPartial && missingTransitions.length) warnings.push(`Missing transition(s) will be completed with a Dead state: ${missingTransitions.join(', ')}`);
  return { ok: errors.length === 0, errors, warnings, states, alpha, start: startState, finals, trans: cleanTrans, missingTransitions, invalidTransitions };
}
function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<div class="error-box">⚠ ${esc(msg)}</div>`;
}
function clearError(id) { const el = document.getElementById(id); if (el) el.innerHTML = ''; }
function show(id) {
  const el = document.getElementById(id); if (!el) return;
  el.classList.remove('hidden');
  if (el.style.display === 'none') el.style.display = '';
}
function hide(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
function destroyCy(id) {
  if (mCyInstances[id]) { try { mCyInstances[id].destroy(); } catch (_) { } mCyInstances[id] = null; }
  const c = document.getElementById(id); if (c) c.innerHTML = '';
}
function destroyThree(id) {
  const s = threeScenes[id]; if (!s) return;
  if (s.animId) cancelAnimationFrame(s.animId);
  if (s.renderer) s.renderer.dispose();
  threeScenes[id] = null;
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ── QUIZ ───────────────────────────────────────────────────────────────────────
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const QUIZ_QUESTIONS = [
  {
    q: "What does it mean for two states in a DFA to be 'equivalent'?",
    opts: [
      "They have the same name or label",
      "For every input string, they both either accept or both reject — they are indistinguishable",
      "They are both final states",
      "They have the same number of outgoing transitions"
    ],
    correct: 1,
    explanation: "Two states p and q are equivalent if for every possible string w, δ*(p,w) ∈ F ⟺ δ*(q,w) ∈ F. They behave identically for all future inputs, so merging them doesn't change the language."
  },
  {
    q: "In the table-filling algorithm, how are pairs initially marked in Step 1?",
    opts: [
      "All pairs are initially marked as equivalent",
      "Pairs are marked randomly",
      "Pairs (p, q) are marked if exactly one of them is a final state",
      "Pairs are marked if they transition to the same state on any input"
    ],
    correct: 2,
    explanation: "If one state is final (accepting) and the other is not, they clearly accept different things — the empty string distinguishes them. These are immediately distinguishable and get marked ✕ in Step 1."
  },
  {
    q: "What is a 'dead state' (or 'unreachable state') in a DFA?",
    opts: [
      "A state that is a final state but never visited",
      "A state that is never reachable from the start state via any input",
      "A state that only has self-loops",
      "A state that transitions only to the start state"
    ],
    correct: 1,
    explanation: "An unreachable state is one you can never get to from the start state, no matter what input you read. Since it never participates in any computation, it can be safely removed before minimization."
  },
  {
    q: "The minimized DFA for any regular language is unique. This is guaranteed by which theorem?",
    opts: [
      "Pumping Lemma",
      "Rice's Theorem",
      "Myhill–Nerode Theorem",
      "Cook-Levin Theorem"
    ],
    correct: 2,
    explanation: "The Myhill–Nerode theorem characterizes regular languages by equivalence classes of strings. It also proves that the minimized DFA is unique (up to state renaming) — two different minimal DFAs for the same language would be isomorphic."
  },
  {
    q: "In partition refinement, we start with the partition {F, Q\\F}. What does Q\\F represent?",
    opts: [
      "The alphabet of the DFA",
      "The transition function",
      "All states that are NOT final (non-accepting) states",
      "All states reachable from the start state"
    ],
    correct: 2,
    explanation: "Q\\F (read 'Q minus F') is the set of all states that are NOT in the set of final states F. The initial partition separates accepting from non-accepting states since these are immediately distinguishable."
  },
  {
    q: "What is the time complexity of the table-filling (mark-and-merge) algorithm?",
    opts: [
      "O(n log n)",
      "O(n · |Σ|)",
      "O(n² · |Σ|)",
      "O(2ⁿ)"
    ],
    correct: 2,
    explanation: "There are O(n²) pairs of states, and for each pair we check |Σ| symbols per iteration, with up to n iterations. The total is O(n² · |Σ|). In practice it's usually much faster because convergence happens quickly."
  },
  {
    q: "After minimizing a DFA, the resulting minimized DFA accepts...",
    opts: [
      "A strictly smaller language than the original",
      "A strictly larger language than the original",
      "Exactly the same language as the original DFA",
      "Only strings shorter than those accepted by the original"
    ],
    correct: 2,
    explanation: "Minimization preserves the language! We only merge states that are provably equivalent — meaning they accept exactly the same set of future strings. The minimized DFA is just a more compact representation of the same language."
  },
  {
    q: "Which of these is a valid real-world application of DFA minimization?",
    opts: [
      "Compressing image files with JPEG",
      "Making regex pattern matching engines more efficient",
      "Sorting arrays faster",
      "Encrypting data with AES"
    ],
    correct: 1,
    explanation: "Regular expression engines (like those in programming languages, text editors, and browsers) internally use finite automata. Minimizing those automata makes pattern matching faster and uses less memory — a direct practical benefit!"
  }
];

let quizAnswers = new Array(QUIZ_QUESTIONS.length).fill(null);
let quizDone = 0;

function buildQuiz() {
  const container = document.getElementById('quiz-container');
  if (!container) return;
  quizAnswers = new Array(QUIZ_QUESTIONS.length).fill(null);
  quizDone = 0;
  document.getElementById('quiz-score').style.display = 'none';

  container.innerHTML = QUIZ_QUESTIONS.map((q, qi) => `
    <div class="quiz-card" id="quiz-card-${qi}">
      <div class="quiz-q">
        <span class="qnum">QUESTION ${qi + 1} / ${QUIZ_QUESTIONS.length}</span>
        ${esc(q.q)}
      </div>
      <div class="quiz-opts">
        ${q.opts.map((opt, oi) => `
          <button class="quiz-opt" id="opt-${qi}-${oi}" onclick="answerQuiz(${qi},${oi})">
            <span class="opt-indicator">${String.fromCharCode(65 + oi)}</span>
            ${esc(opt)}
          </button>
        `).join('')}
      </div>
      <div class="quiz-feedback" id="feedback-${qi}"></div>
    </div>
  `).join('');
}

function answerQuiz(qi, chosen) {
  if (quizAnswers[qi] !== null) return;
  quizAnswers[qi] = chosen;
  quizDone++;
  const q = QUIZ_QUESTIONS[qi];
  const isCorrect = chosen === q.correct;

  // Style all options
  for (let oi = 0; oi < q.opts.length; oi++) {
    const btn = document.getElementById(`opt-${qi}-${oi}`);
    btn.classList.add('disabled');
    if (oi === q.correct) btn.classList.add('correct');
    else if (oi === chosen && !isCorrect) btn.classList.add('wrong');
  }

  // Show feedback
  const fb = document.getElementById(`feedback-${qi}`);
  fb.className = `quiz-feedback ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`;
  fb.style.display = 'block';
  fb.innerHTML = (isCorrect ? '<strong>✓ Correct!</strong> ' : '<strong>✗ Not quite.</strong> ') + esc(q.explanation);

  // Check if all answered
  if (quizDone === QUIZ_QUESTIONS.length) showQuizScore();
}

function showQuizScore() {
  const correct = quizAnswers.filter((a, i) => a === QUIZ_QUESTIONS[i].correct).length;
  const total = QUIZ_QUESTIONS.length;
  const pct = Math.round((correct / total) * 100);
  const scoreEl = document.getElementById('quiz-score');
  const circleEl = document.getElementById('score-circle');
  const titleEl = document.getElementById('score-title');
  const descEl = document.getElementById('score-desc');

  circleEl.textContent = `${correct}/${total}`;
  if (pct >= 80) { titleEl.textContent = '🎉 Excellent Work!'; descEl.textContent = `You got ${correct} out of ${total} right (${pct}%). You really understand DFA minimization!`; }
  else if (pct >= 60) { titleEl.textContent = '👍 Good Effort!'; descEl.textContent = `You got ${correct} out of ${total} right (${pct}%). Review the explanations and try again!`; }
  else { titleEl.textContent = '📖 Keep Learning!'; descEl.textContent = `You got ${correct} out of ${total} right (${pct}%). Go back to the Learn page and read the theory sections.`; }

  scoreEl.style.display = 'block';
  scoreEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetQuiz() {
  buildQuiz();
  window.scrollTo(0, 0);
}

// ── INIT ───────────────────────────────────────────────────────────────────────
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
document.addEventListener('DOMContentLoaded', () => {
  const langDescInput = document.getElementById('lang-desc-input');
  if (langDescInput) langDescInput.addEventListener('input', updateLangPreview);

  // Wire inline Start/Finals ↔ States validation on all four fields
  mWireFieldValidation();

  buildQuiz();

  // Load default preset into the transition table (using the correct function name)
  setTimeout(() => {
    if (document.getElementById('m-states') && document.getElementById('m-table-area')) {
      mLoadPreset('end01');
    }
  }, 200);
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MINIMIZE PAGE — Full Engine
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// ── Cytoscape instance registry (shared across all graph renders) ──
// NOTE: destroyCy() in the helpers section referenced undefined `cyInstances` and `threeScenes`.
// All graph instances are stored in mCyInstances; threeScenes was never used — both are fixed here.
const threeScenes = {};   // kept as stub so destroyThree() doesn't throw

// ── State ──────────────────────────────────────────────────────
// IMPORTANT: mStates/mTransitions are the *working* copies used during minimization.
// mOrigStates/mOrigTransitions preserve the raw user-supplied DFA so that repeated
// runs start from clean input rather than an already-mutated structure.
let mOrigStates = [], mOrigAlpha = [], mOrigFinals = [], mOrigStart = '', mOrigTransitions = {};
let mStates = [], mAlpha = [], mFinals = [], mStart = '', mTransitions = {};
let mMinGroups = {}, mMinStart = '', mMarkedPairs = {}, mUnreachable = [];
let mMinRepByState = new Map(), mMinLabelByRep = new Map(), mMinSortedKeys = [];
let mMethod = 'myhill';
let mStepQueue = [], mStepIdx = 0;
let mGroupSteps = [];
let mCyInstances = {};
// draw canvas state
let mCanvas = null, mCtx = null, mDrawStates = [], mDrawEdges = [], mDrawTool = 'state', mDrawFrom = null, mDrawCounter = 0;

// ── Input Method Switch ─────────────────────────────────────────
let currentInputMode = 'trtable';
function switchInputMethod(id) {
  currentInputMode = id; // 🔥 track mode

  ['trtable', 'regex', 'mdraw', 'langdef'].forEach(k => {
    const btn = document.getElementById('imb-' + k);
    const panel = document.getElementById('imp-' + k);
    if (btn) btn.classList.toggle('active', k === id);
    if (panel) panel.classList.toggle('active', k === id);
  });

  // 🔥 CLEAR OLD DFA STATE
  mStates = [];
  mAlpha = [];
  mFinals = [];
  mStart = '';
  mTransitions = {};

  const preview = document.getElementById('m-orig-preview-card');
  if (preview) preview.style.display = 'none';

  // 🔥 FIX: Initialize canvas when switching to draw mode
  if (id === 'mdraw') {
    // Use requestAnimationFrame to ensure the panel is visible before measuring
    requestAnimationFrame(() => {
      mInitCanvas();
      mSetTool('state');
    });
  }
}

// ── Preset loader ───────────────────────────────────────────────
const M_PRESETS = {
  even0s: { states: 'q0,q1', alpha: '0,1', start: 'q0', finals: 'q0', trans: { q0: { '0': 'q1', '1': 'q0' }, q1: { '0': 'q0', '1': 'q1' } } },
  even0s_ab: { states: 'q0,q1', alpha: 'a,b', start: 'q0', finals: 'q0', trans: { q0: { 'a': 'q1', 'b': 'q0' }, q1: { 'a': 'q0', 'b': 'q1' } } },
  end01: { states: 'q0,q1,q2,q3', alpha: '0,1', start: 'q0', finals: 'q2', trans: { q0: { '0': 'q1', '1': 'q0' }, q1: { '0': 'q1', '1': 'q2' }, q2: { '0': 'q3', '1': 'q0' }, q3: { '0': 'q1', '1': 'q2' } } },
  div3: { states: 'q0,q1,q2', alpha: '0,1', start: 'q0', finals: 'q0', trans: { q0: { '0': 'q0', '1': 'q1' }, q1: { '0': 'q2', '1': 'q0' }, q2: { '0': 'q1', '1': 'q2' } } },
  astar: { states: 'q0,q1,q2,q3', alpha: 'a,b', start: 'q0', finals: 'q2,q3', trans: { q0: { 'a': 'q1', 'b': 'q0' }, q1: { 'a': 'q2', 'b': 'q0' }, q2: { 'a': 'q2', 'b': 'q3' }, q3: { 'a': 'q1', 'b': 'q0' } } },
  classic: { states: 'q0,q1,q2,q3,q4', alpha: '0,1', start: 'q0', finals: 'q3,q4', trans: { q0: { '0': 'q1', '1': 'q2' }, q1: { '0': 'q0', '1': 'q3' }, q2: { '0': 'q4', '1': 'q0' }, q3: { '0': 'q3', '1': 'q3' }, q4: { '0': 'q4', '1': 'q4' } } }
};
function mLoadPreset(k) {
  const p = M_PRESETS[k]; if (!p) return;
  const statesInput = document.getElementById('m-states');
  const alphaInput = document.getElementById('m-alpha');
  const startInput = document.getElementById('m-start');
  const finalsInput = document.getElementById('m-finals');
  if (!statesInput || !alphaInput || !startInput || !finalsInput) return;
  statesInput.value = p.states;
  alphaInput.value = p.alpha;
  startInput.value = p.start;
  finalsInput.value = p.finals;
  // Presets are always valid — clear any stale inline errors immediately
  [M_FIELD_START, M_FIELD_FINALS].forEach(mFieldErrClear);
  mInitTable();
  setTimeout(() => {
    document.querySelectorAll('#m-table-area .mcell').forEach(inp => {
      const f = inp.dataset.f, s = inp.dataset.s;
      if (p.trans[f] && p.trans[f][s]) inp.value = p.trans[f][s];
    });

    mLoadDFA(
      p.states,
      p.alpha,
      p.start,
      p.finals,
      p.trans,
      p.desc || "Preset DFA"
    );

  }, 80);
}

// ══════════════════════════════════════════════════════════════════
// ── Inline State-Field Validation Engine ─────────────────────────
// Validates Start State and Final States against the parsed States
// set on every input/blur event and before every build/minimize
// action. Renders an inline error under the offending field and
// highlights it with a rose border. Auto-clears once corrected.
// ══════════════════════════════════════════════════════════════════

// Ids of the four transition-table input fields
const M_FIELD_STATES = 'm-states';
const M_FIELD_ALPHA = 'm-alpha';
const M_FIELD_START = 'm-start';
const M_FIELD_FINALS = 'm-finals';

// Helper: get/create the per-field inline error element that lives
// directly under each .input-group.  Using a dedicated element keeps
// the error visually glued to the field it belongs to.
function mFieldErrEl(fieldId) {
  const errId = `${fieldId}-field-err`;
  let el = document.getElementById(errId);
  if (!el) {
    el = document.createElement('div');
    el.id = errId;
    el.className = 'field-err-msg';
    el.style.display = 'none';
    const input = document.getElementById(fieldId);
    if (input && input.parentNode) {
      // Insert after the input (or after the hint span if present)
      const hint = input.parentNode.querySelector('.input-hint');
      const ref = hint || input;
      ref.insertAdjacentElement('afterend', el);
    }
  }
  return el;
}

// Show an inline error under fieldId.  stateList is the current valid
// set of states shown as a compact pill to orient the user quickly.
function mFieldErrShow(fieldId, message, stateList) {
  const input = document.getElementById(fieldId);
  if (!input) return;
  // Toggle err class — remove first so the shake re-triggers each time
  input.classList.remove('err');
  void input.offsetWidth;          // force reflow → restart animation
  input.classList.add('err');
  input.classList.remove('valid-flash');

  const el = mFieldErrEl(fieldId);
  const statesPill = stateList && stateList.length
    ? `<div class="field-err-states">Must be one of: ${stateList.map(esc).join(', ')}</div>`
    : '';
  el.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <span><strong>${esc(message)}</strong>${statesPill}</span>`;
  el.style.display = 'flex';
}

// Clear the inline error for a field and restore its normal style.
function mFieldErrClear(fieldId) {
  const input = document.getElementById(fieldId);
  if (input) {
    if (input.classList.contains('err')) {
      input.classList.remove('err');
      // Brief valid-flash to confirm the correction was registered
      input.classList.add('valid-flash');
      setTimeout(() => input.classList.remove('valid-flash'), 700);
    }
  }
  const el = mFieldErrEl(fieldId);
  if (el) { el.style.display = 'none'; el.innerHTML = ''; }
}

// Parse the States (Q) field and return a trimmed, deduplicated array.
// Returns [] if the field is empty or doesn't exist.
function mGetParsedStates() {
  const el = document.getElementById(M_FIELD_STATES);
  if (!el) return [];
  return el.value.split(',').map(x => x.trim()).filter(Boolean);
}

// Core validator.  Runs silently (no side effects) and returns an array
// of { fieldId, message, stateList } objects — one per failing field.
// Returns [] when everything is valid.
function mRunFieldValidation() {
  const states = mGetParsedStates();
  const stateSet = new Set(states);
  const errors = [];

  // Only validate Start / Finals when we already have a parseable States list
  if (!states.length) return errors;  // States-field errors are caught by mInitTable

  // ── Start State ──
  const startEl = document.getElementById(M_FIELD_START);
  if (startEl) {
    const sv = startEl.value.trim();
    if (sv && !stateSet.has(sv)) {
      errors.push({ fieldId: M_FIELD_START, message: `"${sv}" is not in States (Q)`, stateList: states });
    }
  }

  // ── Final States ──
  const finalsEl = document.getElementById(M_FIELD_FINALS);
  if (finalsEl) {
    const fv = finalsEl.value.trim();
    if (fv) {
      const badFinals = fv.split(',').map(x => x.trim()).filter(Boolean)
        .filter(f => !stateSet.has(f));
      if (badFinals.length) {
        const noun = badFinals.length === 1 ? 'state' : 'states';
        errors.push({
          fieldId: M_FIELD_FINALS,
          message: `Unknown final ${noun}: ${badFinals.map(f => `"${f}"`).join(', ')}`,
          stateList: states
        });
      }
    }
  }

  return errors;
}

// Apply validation results to the UI: show errors for failing fields,
// clear errors for passing fields.  Returns true when all fields are valid.
function mApplyFieldValidation() {
  const errors = mRunFieldValidation();
  const failingIds = new Set(errors.map(e => e.fieldId));

  // Show errors
  errors.forEach(({ fieldId, message, stateList }) => {
    mFieldErrShow(fieldId, message, stateList);
  });

  // Clear whichever fields are now passing
  [M_FIELD_START, M_FIELD_FINALS].forEach(id => {
    if (!failingIds.has(id)) mFieldErrClear(id);
  });

  return errors.length === 0;
}

// Wire input + blur events on the four fields so validation fires live.
// Called once from DOMContentLoaded.
function mWireFieldValidation() {
  // Re-validate Start and Finals whenever States changes (because the
  // valid set itself changes).  Also re-validate when Start/Finals change.
  [M_FIELD_STATES, M_FIELD_START, M_FIELD_FINALS].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => mApplyFieldValidation());
    el.addEventListener('blur', () => mApplyFieldValidation());
  });

  // Alphabet doesn't constrain States so no cross-validation needed there,
  // but clear any stale errors when user edits it
  const alphaEl = document.getElementById(M_FIELD_ALPHA);
  if (alphaEl) {
    alphaEl.addEventListener('blur', () => mApplyFieldValidation());
  }
}

// ── Build Transition Table UI ────────────────────────────────────
function mInitTable() {
  const statesInput = document.getElementById('m-states');
  const alphaInput = document.getElementById('m-alpha');
  const ea = document.getElementById('m-error-area');
  const ta = document.getElementById('m-table-area');
  const tableBtn = document.getElementById('m-table-btn');
  if (!statesInput || !alphaInput || !ea || !ta || !tableBtn) return;
  const st = statesInput.value.split(',').map(x => x.trim()).filter(Boolean);
  const al = alphaInput.value.split(',').map(x => x.trim()).filter(Boolean);
  if (st.length < 2) { ea.innerHTML = '<div class="error-box">⚠ Enter at least 2 states.</div>'; return; }
  if (!al.length) { ea.innerHTML = '<div class="error-box">⚠ Enter at least 1 symbol.</div>'; return; }
  // Gate: validate Start / Finals against the parsed States set
  if (!mApplyFieldValidation()) {
    ea.innerHTML = '<div class="error-box">⚠ Fix the highlighted field errors above before building.</div>';
    return;
  }
  ea.innerHTML = '';
  let h = `<table class="tbl"><thead><tr><th>State</th>`;
  al.forEach(a => { h += `<th>δ(q,${esc(a)})</th>`; });
  h += `</tr></thead><tbody>`;
  st.forEach(s => {
    h += `<tr><td style="font-family:var(--font-mono);font-weight:700;color:var(--teal)">${esc(s)}</td>`;
    al.forEach(a => { h += `<td><input type="text" class="mcell" data-f="${esc(s)}" data-s="${esc(a)}" placeholder="…" autocomplete="off" style="width:80px;padding:6px 8px;background:var(--bg3);border:1.5px solid var(--border);border-radius:5px;color:var(--ink);font-family:var(--font-mono);font-size:0.8rem;outline:none"></td>`; });
    h += '</tr>';
  });
  ta.innerHTML = h + '</tbody></table>';
  tableBtn.style.display = 'block';
}
function mFromTable() {
  const statesInput = mGetEl('m-states');
  const alphaInput = mGetEl('m-alpha');
  const startInput = mGetEl('m-start');
  const finalsInput = mGetEl('m-finals');
  const ea = mGetEl('m-error-area');
  if (!statesInput || !alphaInput || !startInput || !finalsInput || !ea) return;

  const st = statesInput.value.split(',').map(x => x.trim()).filter(Boolean);
  const al = alphaInput.value.split(',').map(x => x.trim()).filter(Boolean);
  const start = startInput.value.trim();
  const fn = finalsInput.value.split(',').map(x => x.trim()).filter(Boolean);

  // Gate: validate Start / Finals against States before proceeding
  if (!mApplyFieldValidation()) {
    ea.innerHTML = '<div class="error-box">⚠ Fix the highlighted field errors above before loading.</div>';
    return;
  }
  ea.innerHTML = '';

  // CRIT-1 FIX: Build tr from DOM cells FIRST so the single validation call
  // can catch unknown destination states immediately (previously passed {} which
  // meant invalid destinations silently bypassed the validator).
  const stSet = new Set(st);
  const alSet = new Set(al);
  const tr = {};
  st.forEach(s => (tr[s] = {}));
  const missingCells = [];
  const invalidCells = [];

  document.querySelectorAll('#m-table-area .mcell').forEach(inp => {
    const f = inp.dataset.f, sym = inp.dataset.s, to = inp.value.trim();
    inp.style.borderColor = '';
    if (!stSet.has(f) || !alSet.has(sym)) return;
    if (!to) {
      inp.style.borderColor = 'rgba(247,201,72,0.7)';
      missingCells.push(`δ(${f},${sym})`);
      return;
    }
    if (!stSet.has(to)) {
      inp.style.borderColor = 'var(--rose)';
      invalidCells.push(`δ(${f},${sym}) → ${to}`);
      return;
    }
    tr[f][sym] = to;
  });

  if (invalidCells.length) {
    ea.innerHTML = `<div class="error-box">⚠ Unknown transition destination(s): ${invalidCells.map(esc).join(', ')}</div>`;
    return;
  }

  // Now validate everything in one combined call with the real transition map
  const baseValidation = mValidateAndNormalizeDFA(st, al, start, fn, tr, { allowPartial: true });
  if (!baseValidation.ok) {
    ea.innerHTML = `<div class="error-box">⚠ ${baseValidation.errors.map(esc).join('<br>')}</div>`;
    return;
  }

  if (missingCells.length) {
    ea.innerHTML = `<div class="warn-box" style="background:rgba(247,201,72,0.08);border:1px solid rgba(247,201,72,0.3);border-radius:6px;padding:10px 14px;font-size:0.78rem;color:var(--amber);margin-bottom:10px">
      ⚠ ${missingCells.length} empty cell(s): ${missingCells.slice(0, 5).join(', ')}${missingCells.length > 5 ? ` …+${missingCells.length - 5} more` : ''}<br>
      <span style="color:var(--ink3)">These will be routed to a Dead (trap) state automatically.</span>
    </div>`;
  }

  mLoadDFA(baseValidation.states, baseValidation.alpha, baseValidation.start, baseValidation.finals, tr, 'Transition Table');
}

// ── Canvas Draw Mode ─────────────────────────────────────────────
function mInitCanvas() {
  const el = document.getElementById('m-draw-canvas'); if (!el) return;
  const fresh = el.cloneNode(false); el.parentNode.replaceChild(fresh, el);
  mCanvas = fresh; mCtx = mCanvas.getContext('2d');

  // Size the canvas pixel buffer to match CSS size × device pixel ratio
  function resizeCanvas() {
    if (!mCanvas) return;
    const rect = mCanvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return; // not visible yet
    const dpr = window.devicePixelRatio || 1;
    mCanvas.width = rect.width * dpr;
    mCanvas.height = rect.height * dpr;
    mCtx = mCanvas.getContext('2d');
    mCtx.scale(dpr, dpr);
    mDrawCanvas();
  }

  resizeCanvas();
  mCanvas.addEventListener('click', mHandleClick);
  mCanvas.addEventListener('contextmenu', e => { e.preventDefault(); mDrawFrom = null; mDrawCanvas(); });

  // Handle touch for mobile
  mCanvas.addEventListener('touchend', e => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const simulatedClick = new MouseEvent('click', {
      clientX: touch.clientX,
      clientY: touch.clientY,
      bubbles: true
    });
    mCanvas.dispatchEvent(simulatedClick);
  }, { passive: false });

  mDrawCanvas();
}
function mSetHint(m) { const el = document.getElementById('m-draw-hint'); if (el) el.textContent = m; }
function mSetTool(t) {
  mDrawTool = t; mDrawFrom = null;
  document.querySelectorAll('[id^=mtool-]').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('mtool-' + t); if (btn) btn.classList.add('active');
  const hints = { state: 'Click empty area to add state.', final: 'Click state to toggle final.', transition: 'Click source, then destination.', start: 'Click state to set as start.' };
  mSetHint(hints[t] || ''); mDrawCanvas();
}
function mHandleClick(e) {
  if (!mCanvas) return;
  const r = mCanvas.getBoundingClientRect();
  const pos = { x: e.clientX - r.left, y: e.clientY - r.top };
  const hit = mDrawStates.findIndex(s => Math.hypot(s.x - pos.x, s.y - pos.y) < 28);
  if (mDrawTool === 'state') {
    if (hit !== -1) return;
    const label = `q${mDrawCounter++}`;
    mDrawStates.push({ label, x: pos.x, y: pos.y, isFinal: false, isStart: mDrawStates.length === 0 });
    mSetHint(`Added "${label}".`);
  } else if (mDrawTool === 'final') {
    if (hit === -1) return;
    mDrawStates[hit].isFinal = !mDrawStates[hit].isFinal;
    mSetHint(`"${mDrawStates[hit].label}" is now ${mDrawStates[hit].isFinal ? 'final ✓' : 'non-final'}.`);
  } else if (mDrawTool === 'start') {
    if (hit === -1) return;
    mDrawStates.forEach(s => s.isStart = false);
    mDrawStates[hit].isStart = true;
    mSetHint(`"${mDrawStates[hit].label}" set as start.`);
  } else if (mDrawTool === 'transition') {
    if (mDrawFrom === null) {
      if (hit === -1) return;
      mDrawFrom = hit;
      mSetHint(`Source "${mDrawStates[hit].label}". Now click destination.`);
    } else {
      if (hit === -1) { mDrawFrom = null; mSetHint('Cancelled.'); mDrawCanvas(); return; }
      const sym = prompt(`Symbol(s) for "${mDrawStates[mDrawFrom].label}"→"${mDrawStates[hit].label}"\n(comma-separated, e.g. 0,1)`);
      if (sym && sym.trim()) sym.split(',').map(x => x.trim()).filter(Boolean).forEach(s => mDrawEdges.push({ from: mDrawStates[mDrawFrom].label, to: mDrawStates[hit].label, label: s }));
      mDrawFrom = null; mSetHint('Done.');
    }
  }
  mDrawCanvas();
}
function mClearCanvas() { mDrawStates = []; mDrawEdges = []; mDrawFrom = null; mDrawCounter = 0; mSetHint('Cleared.'); mDrawCanvas(); }
function mDrawCanvas() {
  if (!mCanvas || !mCtx) return;
  const W = mCanvas.getBoundingClientRect().width, H = mCanvas.getBoundingClientRect().height;
  mCtx.save(); mCtx.setTransform(1, 0, 0, 1, 0, 0); mCtx.clearRect(0, 0, mCanvas.width, mCanvas.height); mCtx.restore();
  mCtx.fillStyle = '#10132a'; mCtx.fillRect(0, 0, W, H);
  // dot grid
  mCtx.fillStyle = 'rgba(78,205,196,0.05)';
  for (let gx = 28; gx < W; gx += 28) for (let gy = 28; gy < H; gy += 28) { mCtx.beginPath(); mCtx.arc(gx, gy, 1, 0, 2 * Math.PI); mCtx.fill(); }
  // edges
  const eg = {};
  mDrawEdges.forEach(e => { const k = `${e.from}→${e.to}`; if (!eg[k]) eg[k] = { from: e.from, to: e.to, labels: [] }; if (!eg[k].labels.includes(e.label)) eg[k].labels.push(e.label); });
  Object.values(eg).forEach(g => { const fn = mDrawStates.find(s => s.label === g.from), tn = mDrawStates.find(s => s.label === g.to); if (fn && tn) mDrawEdge(fn, tn, regexToUnicodeSup(g.labels.join(','))); });
  // nodes
  const NR = 28;
  mDrawStates.forEach(s => {
    const isSel = (mDrawFrom !== null && mDrawStates[mDrawFrom] && mDrawStates[mDrawFrom].label === s.label);
    // glow
    if (s.isStart || s.isFinal || isSel) {
      const gc = isSel ? 'rgba(247,201,72,0.2)' : s.isStart ? 'rgba(59,130,246,0.3)' : 'rgba(244,63,94,0.15)';
      const g2 = mCtx.createRadialGradient(s.x, s.y, NR * 0.5, s.x, s.y, NR + 20);
      g2.addColorStop(0, gc); g2.addColorStop(1, 'transparent');
      mCtx.beginPath(); mCtx.arc(s.x, s.y, NR + 20, 0, 2 * Math.PI); mCtx.fillStyle = g2; mCtx.fill();
    }
    const grad = mCtx.createRadialGradient(s.x - NR * 0.3, s.y - NR * 0.3, 0, s.x, s.y, NR);
    if (s.isStart) { grad.addColorStop(0, 'rgba(59,130,246,0.5)'); grad.addColorStop(1, 'rgba(29,78,216,0.2)'); }
    else if (s.isFinal) { grad.addColorStop(0, 'rgba(244,63,94,0.4)'); grad.addColorStop(1, 'rgba(190,18,60,0.2)'); }
    else { grad.addColorStop(0, 'rgba(139,92,246,0.3)'); grad.addColorStop(1, 'rgba(91,33,182,0.15)'); }
    mCtx.beginPath(); mCtx.arc(s.x, s.y, NR, 0, 2 * Math.PI); mCtx.fillStyle = grad; mCtx.fill();
    mCtx.strokeStyle = isSel ? '#f7c948' : s.isStart ? '#3b82f6' : s.isFinal ? '#f43f5e' : 'rgba(99,102,241,0.8)';
    mCtx.lineWidth = isSel ? 2.5 : s.isStart ? 3 : 2.5; mCtx.stroke();
    if (s.isFinal) { mCtx.beginPath(); mCtx.arc(s.x, s.y, NR - 5, 0, 2 * Math.PI); mCtx.strokeStyle = 'rgba(244,63,94,0.6)'; mCtx.lineWidth = 1.5; mCtx.stroke(); }
    if (s.isStart) {
      mCtx.beginPath(); mCtx.moveTo(s.x - NR - 28, s.y); mCtx.lineTo(s.x - NR - 1, s.y); mCtx.strokeStyle = '#3b82f6'; mCtx.lineWidth = 2.5; mCtx.stroke();
      mCtx.beginPath(); mCtx.moveTo(s.x - NR - 1, s.y); mCtx.lineTo(s.x - NR - 11, s.y - 6); mCtx.lineTo(s.x - NR - 11, s.y + 6); mCtx.closePath(); mCtx.fillStyle = '#3b82f6'; mCtx.fill();
    }
    mCtx.save(); mCtx.shadowColor = 'rgba(0,0,0,0.7)'; mCtx.shadowBlur = 4;
    mCtx.fillStyle = '#f0ead6'; mCtx.font = "bold 13px 'Inter', sans-serif";
    mCtx.textAlign = 'center'; mCtx.textBaseline = 'middle'; mCtx.fillText(s.label, s.x, s.y); mCtx.restore();
  });
}
function mDrawEdge(from, to, label) {
  const isMulti = label.includes(',');
  const lineCol = isMulti ? '#f7c948' : '#3b82f6';
  const glowCol = isMulti ? 'rgba(247,201,72,0.15)' : 'rgba(59,130,246,0.18)';
  const NR = 28;
  if (from.label === to.label) {
    const lx = from.x, ly = from.y - NR - 18;
    mCtx.beginPath(); mCtx.arc(lx, ly, 18 + 3, 0, 2 * Math.PI); mCtx.strokeStyle = glowCol; mCtx.lineWidth = 5; mCtx.stroke();
    mCtx.beginPath(); mCtx.arc(lx, ly, 18, 0, 2 * Math.PI); mCtx.strokeStyle = lineCol; mCtx.lineWidth = 2; mCtx.stroke();
    mDrawBadge(lx, ly - 28, label); return;
  }
  const dx = to.x - from.x, dy = to.y - from.y, d = Math.hypot(dx, dy);
  if (d < 1) return;
  const nx = dx / d, ny = dy / d;
  const hasBidi = mDrawEdges.some(e => e.from === to.label && e.to === from.label);
  const curv = hasBidi ? 38 : 22;
  const mx = (from.x + to.x) / 2 - ny * curv, my = (from.y + to.y) / 2 + nx * curv;
  const sx = from.x + nx * (NR + 1), sy = from.y + ny * (NR + 1);
  const ex = to.x - nx * (NR + 1), ey = to.y - ny * (NR + 1);
  mCtx.beginPath(); mCtx.moveTo(sx, sy); mCtx.quadraticCurveTo(mx, my, ex, ey);
  mCtx.strokeStyle = glowCol; mCtx.lineWidth = 6; mCtx.lineCap = 'round'; mCtx.stroke();
  mCtx.beginPath(); mCtx.moveTo(sx, sy); mCtx.quadraticCurveTo(mx, my, ex, ey);
  mCtx.strokeStyle = lineCol; mCtx.lineWidth = 2; mCtx.lineCap = 'round'; mCtx.stroke();
  const t = 0.97;
  const tpx = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * mx + t * t * ex;
  const tpy = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * my + t * t * ey;
  let ax = ex - tpx, ay = ey - tpy; const al = Math.hypot(ax, ay);
  if (al > 0.001) { ax /= al; ay /= al; } else { ax = nx; ay = ny; }
  mCtx.beginPath(); mCtx.moveTo(ex, ey);
  mCtx.lineTo(ex - ax * 11 + ay * 5, ey - ay * 11 - ax * 5); mCtx.lineTo(ex - ax * 11 - ay * 5, ey - ay * 11 + ax * 5);
  mCtx.closePath(); mCtx.fillStyle = lineCol; mCtx.fill();
  mDrawBadge(mx - ny * 10, my + nx * 10, label);
}
function mDrawBadge(x, y, label) {
  const isMulti = label.includes(',');
  mCtx.font = "bold 11px 'Space Mono',monospace";
  const tw = mCtx.measureText(label).width;
  const px = 7, py = 4, bw = tw + px * 2, bh = 18 + py * 2, br = 5;
  mCtx.save(); mCtx.shadowColor = 'rgba(0,0,0,0.6)'; mCtx.shadowBlur = 6; mCtx.shadowOffsetX = 1; mCtx.shadowOffsetY = 2;
  function pill() {
    mCtx.beginPath();
    mCtx.moveTo(x - bw / 2 + br, y - bh / 2); mCtx.lineTo(x + bw / 2 - br, y - bh / 2);
    mCtx.arcTo(x + bw / 2, y - bh / 2, x + bw / 2, y - bh / 2 + br, br); mCtx.lineTo(x + bw / 2, y + bh / 2 - br);
    mCtx.arcTo(x + bw / 2, y + bh / 2, x + bw / 2 - br, y + bh / 2, br); mCtx.lineTo(x - bw / 2 + br, y + bh / 2);
    mCtx.arcTo(x - bw / 2, y + bh / 2, x - bw / 2, y + bh / 2 - br, br); mCtx.lineTo(x - bw / 2, y - bh / 2 + br);
    mCtx.arcTo(x - bw / 2, y - bh / 2, x - bw / 2 + br, y - bh / 2, br); mCtx.closePath();
  }
  pill(); mCtx.fillStyle = isMulti ? '#f7c948' : '#141830'; mCtx.fill(); mCtx.restore();
  pill(); mCtx.strokeStyle = isMulti ? 'rgba(247,201,72,0.6)' : 'rgba(78,205,196,0.5)'; mCtx.lineWidth = 1.5; mCtx.stroke();
  mCtx.fillStyle = isMulti ? '#0c0e1a' : '#4ecdc4'; mCtx.textAlign = 'center'; mCtx.textBaseline = 'middle';
  mCtx.font = "bold 11px 'Space Mono',monospace"; mCtx.fillText(label, x, y + 0.5);
}
function mFromCanvas() {
  const ea = document.getElementById('m-draw-error'); ea.innerHTML = '';
  if (mDrawStates.length < 2) { ea.innerHTML = '<div class="error-box">⚠ Draw at least 2 states.</div>'; return; }
  const al = document.getElementById('m-draw-alpha').value.split(',').map(x => x.trim()).filter(Boolean);
  if (!al.length) { ea.innerHTML = '<div class="error-box">⚠ Enter alphabet.</div>'; return; }
  const startNode = mDrawStates.find(s => s.isStart);
  if (!startNode) { ea.innerHTML = '<div class="error-box">⚠ Set a start state.</div>'; return; }
  const st = mDrawStates.map(s => s.label);
  const fn = mDrawStates.filter(s => s.isFinal).map(s => s.label);
  const tr = {}; st.forEach(s => (tr[s] = {}));
  // LOGIC-1 FIX: only one pass needed — split by comma so multi-symbol edges like
  // "0,1" are correctly expanded.  The previous first loop (treating the whole label
  // as a single symbol key) was a strict subset of this one and also left orphaned
  // keys like tr[from]["0,1"] when a comma-label was drawn.
  mDrawEdges.forEach(e => {
    e.label.split(',').map(x => x.trim()).filter(Boolean).forEach(sym => {
      tr[e.from][sym] = e.to;
    });
  });
  const missing = [];
  st.forEach(s => al.forEach(a => { if (!tr[s][a]) missing.push(`δ(${s},${a})`) }));
  if (missing.length) { ea.innerHTML = `<div class="error-box">⚠ Missing transitions: ${missing.slice(0, 6).join(', ')}${missing.length > 6 ? ` …+${missing.length - 6} more` : ''}<br><small style="color:var(--ink3)">Use the transition tool to add missing edges. A Dead state will NOT be auto-added from canvas drawings.</small></div>`; return; }
  mLoadDFA(st, al, startNode.label, fn, tr, 'Canvas Drawing');
}

// ── Minimize Page Theory Toggle ────────────────────────────────────────────
function toggleMinTheory() {
  const body = document.getElementById('min-theory-strip-body');
  const chevron = document.getElementById('min-theory-chevron');
  const btn = document.getElementById('min-theory-toggle-btn');
  const isOpen = body.style.display === 'none' || !body.style.display;
  body.style.display = isOpen ? 'block' : 'none';
  chevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
  btn.childNodes[2] && (btn.childNodes[2].textContent = ''); // clear text
  btn.lastChild.textContent = isOpen ? ' Hide Theory ' : ' Show Theory ';
}
function switchMinTheory(id) {
  ['dfa', 'why', 'myhill', 'grouping', 'merge'].forEach(k => {
    const t = document.getElementById('mtt-' + k);
    const p = document.getElementById('min-theory-panel-' + k);
    if (t) t.classList.toggle('active', k === id);
    if (p) p.classList.toggle('active', k === id);
  });
}

// ── Graph Reset Helpers ────────────────────────────────────────────────────
function mResetGraph(cyId) {
  const cy = mCyInstances[cyId];
  if (!cy) return;

  // Unlock all nodes so the layout engine can reposition non-start nodes freely
  cy.nodes().unlock();

  const realNodes = cy.nodes().not('.ghost');
  const nc = realNodes.length;
  const startNode = realNodes.filter('[?isStart]').first();
  const startId = startNode.length ? startNode.id() : null;
  const ghostId = startId ? `${cyId}-ghost` : null;

  const autoName = nc <= 4 ? 'circle' : 'cose';
  const PADDING = 90;
  const autoOpts = autoName === 'cose'
    ? { name: 'cose', padding: PADDING, nodeRepulsion: 22000, idealEdgeLength: 180, edgeElasticity: 80, gravity: 0.18, componentSpacing: 110, nodeOverlap: 32, numIter: 1400, randomize: false, fit: false, animate: true, animationDuration: 500 }
    : { name: autoName, padding: PADDING, spacingFactor: 1.25, avoidOverlap: true, fit: false, animate: true, animationDuration: 500 };

  // Run layout only on non-start nodes, then re-pin start
  const nonStart = realNodes.filter(n => n.id() !== startId);
  if (nonStart.length > 0) {
    nonStart.layout(autoOpts).run();
  }

  const container = document.getElementById(cyId);
  // Re-pin after animation finishes (500 ms) + small buffer
  setTimeout(() => {
    mApplyStartPin(cy, container, startId, ghostId, PADDING);
    // Re-tag bidirectional pairs after positions settle
    cy.edges().removeClass('para-fwd para-bwd');
    cy.edges().not('.ghost,.start-arrow').forEach(e => {
      if (e.source().id() === e.target().id()) return;
      const rev = cy.edges(`[source="${e.target().id()}"][target="${e.source().id()}"]`).not('.ghost,.start-arrow');
      if (rev.length > 0) { e.addClass('para-fwd'); rev.forEach(r => r.addClass('para-bwd')); }
    });
    mResolveGraphSpacing(cy);
  }, 550);
}
function mResetLiveDFA() {
  const cy = mCyInstances['m-live-dfa-cy'];
  if (!cy) return;

  cy.nodes().unlock();

  const realNodes = cy.nodes().not('.ghost');
  const startNode = realNodes.filter('[?isStart]').first();
  const startId = startNode.length ? startNode.id() : null;
  const ghostId = 'live-ghost';

  const PADDING = 36;
  const nc = realNodes.length;
  const autoName = nc <= 4 ? 'circle' : 'cose';
  const autoOpts = autoName === 'cose'
    ? { name: 'cose', padding: PADDING, nodeRepulsion: 18000, idealEdgeLength: 140, edgeElasticity: 78, gravity: 0.18, componentSpacing: 80, nodeOverlap: 24, numIter: 1000, randomize: false, fit: false, animate: true, animationDuration: 400 }
    : { name: autoName, padding: PADDING, spacingFactor: 1.2, avoidOverlap: true, fit: false, animate: true, animationDuration: 400 };

  const nonStart = realNodes.filter(n => n.id() !== startId);
  if (nonStart.length > 0) {
    nonStart.layout(autoOpts).run();
  }

  const container = mGetEl('m-live-dfa-container');
  setTimeout(() => {
    mApplyStartPin(cy, container, startId, ghostId, PADDING);
    mResolveGraphSpacing(cy);
  }, 450);
}

// ── Load DFA → normalize → show preview ──────────────────────────
// _mLoadToken: incremented on every mLoadDFA call so that any pending
// async callbacks (rAF/setTimeout) from a PREVIOUS call become stale and
// self-cancel. This prevents double-destroy races when the user submits
// a 2nd query while the 1st query's deferred mRenderPreviewDFA is still queued.
let _mLoadToken = 0;

function mLoadDFA(st, al, start, fn, tr, source) {
  const validation = mValidateAndNormalizeDFA(st, al, start, fn, tr, { allowPartial: true });
  if (!validation.ok) {
    console.error('[mLoadDFA] Invalid DFA input:', validation.errors);
    const errEl = mGetEl('m-error-area') || mGetEl('m-method-error') || mGetEl('m-regex-error') || mGetEl('m-draw-error');
    if (errEl) errEl.innerHTML = `<div class="error-box">⚠ ${validation.errors.map(esc).join('<br>')}</div>`;
    return;
  }
  const statesSet = mSortStates(validation.states);
  const alphaSet = [...validation.alpha];
  const startNorm = validation.start;
  const finalsNorm = mSortStates(validation.finals);
  const cleanTrans = validation.trans;

  // ── 3. Save pristine originals — these are never mutated after this point ──
  mOrigStates = [...statesSet];
  mOrigAlpha = [...alphaSet];
  mOrigStart = startNorm;
  mOrigFinals = [...finalsNorm];
  mOrigTransitions = JSON.parse(JSON.stringify(cleanTrans));

  // ── 4. Reset ALL algorithm state so every run starts completely fresh ──
  mStates = [...statesSet];
  mAlpha = [...alphaSet];
  mStart = startNorm;
  mFinals = [...finalsNorm];
  mTransitions = JSON.parse(JSON.stringify(cleanTrans));
  mMinGroups = {};
  mMinStart = '';
  mMarkedPairs = {};
  mUnreachable = [];
  mStepQueue = [];
  mStepIdx = 0;
  mGroupSteps = [];

  // ── 5. Destroy all existing Cytoscape instances to prevent DOM / canvas leakage ──
  ['m-preview-cy', 'm-cy-min', 'm-live-dfa-cy', 'm-cmp-cy-orig', 'm-cmp-cy-min'].forEach(id => {
    if (mCyInstances[id]) { try { mCyInstances[id].destroy(); } catch (_) { } mCyInstances[id] = null; }
    const el = document.getElementById(id); if (el) el.innerHTML = '';
  });

  // ── 6. Reset UI sections that persist between runs ──
  const secC = document.getElementById('m-section-c'); if (secC) secC.style.display = 'none';
  const secD = document.getElementById('m-section-d'); if (secD) secD.style.display = 'none';
  const cvEl = document.getElementById('m-crossval-result'); if (cvEl) { cvEl.style.display = 'none'; cvEl.innerHTML = ''; }
  const methodCard = document.getElementById('m-method-card');
  const resultsArea = document.getElementById('m-results-area');
  if (methodCard) methodCard.style.display = 'none';
  if (resultsArea) resultsArea.classList.remove('visible');

  // ── 7. Show original DFA preview ──
  // CRITICAL: set display:block BEFORE the graph draw so Cytoscape sees a
  // non-zero container. We also stamp a token so if another mLoadDFA call
  // fires before our setTimeout fires, the stale callback self-cancels.
  const previewCard = document.getElementById('m-orig-preview-card');
  if (!previewCard) return;
  previewCard.style.animation = '';
  previewCard.style.display = 'block';
  const myToken = ++_mLoadToken;
  setTimeout(() => {
    if (_mLoadToken !== myToken) return; // stale — a newer mLoadDFA already ran
    if (!previewCard.isConnected) return;
    previewCard.style.animation = 'previewFadeIn 0.4s ease both';
    mRenderPreviewDFA(source);
    setTimeout(() => previewCard.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }, 0);
}

// ── Show the DFA preview before method selection ──────────────────
function mRenderPreviewDFA(source) {
  // Source tag
  const srcTag = document.getElementById('m-preview-source-tag');
  const srcLabel = document.getElementById('m-preview-source-label');
  if (srcTag) srcTag.textContent = source || 'INPUT';
  if (srcLabel) srcLabel.textContent = `Loaded from: ${source || 'input'}`;
  // Meta tags (like the image: "N states · M symbols | PNG")
  const metaStates = document.getElementById('m-preview-meta-states');
  const metaAlpha = document.getElementById('m-preview-meta-alpha');
  const stateMeta = document.getElementById('m-preview-state-meta');
  if (metaStates) metaStates.textContent = `${mStates.length} state${mStates.length !== 1 ? 's' : ''}`;
  if (metaAlpha) metaAlpha.textContent = `${mAlpha.length} symbol${mAlpha.length !== 1 ? 's' : ''}`;
  if (stateMeta) stateMeta.textContent = `${mStates.length} states · ${mAlpha.length} symbols`;
  // Stats
  const statsEl = document.getElementById('m-preview-stats');
  if (statsEl) {
    const fCount = mFinals.length;
    const nfCount = mStates.length - fCount;
    statsEl.innerHTML = `
      <div class="preview-stat-chip"><span class="dot" style="background:var(--teal)"></span>${mStates.length} state${mStates.length !== 1 ? 's' : ''}</div>
      <div class="preview-stat-chip"><span class="dot" style="background:var(--amber)"></span>${mAlpha.length} symbol${mAlpha.length !== 1 ? 's' : ''} in Σ</div>
      <div class="preview-stat-chip"><span class="dot" style="background:var(--green)"></span>${fCount} accepting</div>
      <div class="preview-stat-chip"><span class="dot" style="background:var(--rose)"></span>${nfCount} non-accepting</div>
      <div class="preview-stat-chip"><span class="dot" style="background:var(--violet)"></span>Start: <span style="font-family:var(--font-mono);color:var(--teal);margin-left:4px">${esc(mStart)}</span></div>
    `;
  }
  // Graph
  const elems = mBuildCyElems(mStates, mAlpha, mTransitions, mFinals, mStart);
  mDraw2D('m-preview-cy', elems, 'm-preview-legend');
  // Table
  const tableEl = document.getElementById('m-preview-table');
  if (tableEl) {
    let h = `<table class="tbl"><thead><tr><th>State</th>`;
    mAlpha.forEach(a => { h += `<th>δ(q,${esc(a)})</th>`; });
    h += '</tr></thead><tbody>';
    mStates.forEach(s => {
      const isS = s === mStart, isF = mFinals.includes(s);
      const lbl = `${isS ? '→ ' : ''}${esc(s)}${isF ? ' *' : ''}`;
      h += `<tr><td style="font-family:var(--font-mono);font-weight:700;color:${isS ? 'var(--teal)' : isF ? 'var(--amber)' : 'var(--ink)'};">${lbl}</td>`;
      mAlpha.forEach(a => { const d = mTransitions[s] && mTransitions[s][a]; h += `<td>${d ? esc(d) : '—'}</td>`; });
      h += '</tr>';
    });
    tableEl.innerHTML = h + '</tbody></table>';
  }
  // Unreachable notice
  const unreachEl = document.getElementById('m-preview-unreachable');
  if (unreachEl) unreachEl.innerHTML = '';
}

// ── mShowMethodCard: called when user clicks "Proceed to Minimization" ──
function mShowMethodCard() {
  // Hide the preview card
  const previewCard = document.getElementById('m-orig-preview-card');
  if (previewCard) {
    previewCard.style.animation = 'previewFadeIn 0.3s ease reverse both';
    setTimeout(() => { previewCard.style.display = 'none'; }, 280);
  }
  const mc = document.getElementById('m-method-card');
  if (mc) mc.style.animation = '';
  mc.style.display = 'block';
  setTimeout(() => mc.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
}

// ── Method selection ─────────────────────────────────────────────
function selectMethod(m) {
  mMethod = m;
  const myhillBtn = mGetEl('mc-myhill');
  const groupingBtn = mGetEl('mc-grouping');
  if (myhillBtn) myhillBtn.classList.toggle('active', m === 'myhill');
  if (groupingBtn) groupingBtn.classList.toggle('active', m === 'grouping');
}

// ── Run Minimization ─────────────────────────────────────────────
async function mRunMinimization() {
  if (currentInputMode === 'langdef') {
    await mFromLangDef(); // pehle DFA bana
    // phir baaki code skip
  }


  const ea = mGetEl('m-method-error');
  if (!ea) return;
  ea.innerHTML = '';
  if (!mOrigStates.length) { ea.innerHTML = '<div class="error-box">⚠ Load a DFA first.</div>'; return; }
  // Gate: re-run field validation in case user edited fields after loading
  if (!mApplyFieldValidation()) {
    ea.innerHTML = '<div class="error-box">⚠ Fix the highlighted field errors before minimizing.</div>';
    return;
  }

  // ── CRITICAL: always restore working copies from the saved pristine originals ──
  // mRunMinimization is destructive (removes unreachable states, adds dead state).
  // Re-running without this restore would operate on an already-mutated mStates,
  // producing wrong results or crashes on the second and subsequent runs.
  mStates = [...mOrigStates];
  mAlpha = [...mOrigAlpha];
  mStart = mOrigStart;
  mFinals = [...mOrigFinals];
  mTransitions = mClone(mOrigTransitions);
  mMinGroups = {};
  mMinStart = '';
  mMarkedPairs = {};
  mUnreachable = [];
  mStepQueue = [];
  mStepIdx = 0;
  mGroupSteps = [];
  mMinRepByState = new Map();
  mMinLabelByRep = new Map();
  mMinSortedKeys = [];

  // ── PART 1: Normalize DFA using standalone normalizeDFA() ──
  // Records unreachable states for display before normalization strips them.
  const preNorm = { states: [...mStates] };
  let normalized;
  try {
    // Compute unreachable for display (before normalizeDFA strips them)
    const reachPre = new Set([mStart]);
    const bqPre = [mStart];
    while (bqPre.length) {
      const c = bqPre.shift();
      mAlpha.forEach(a => {
        const n = mTransitions[c] && mTransitions[c][a];
        if (n && reachPre.has(n) === false && preNorm.states.includes(n)) { reachPre.add(n); bqPre.push(n); }
      });
    }
    mUnreachable = preNorm.states.filter(s => !reachPre.has(s));

    normalized = normalizeDFA({
      states: mStates, alpha: mAlpha, start: mStart,
      finals: mFinals, trans: mTransitions
    });
  } catch (normErr) {
    ea.innerHTML = `<div class="error-box">⚠ ${esc(String(normErr))}</div>`;
    return;
  }

  // ── Apply normalized DFA to working globals ──
  const prevStates = [...mStates];
  mStates = [...normalized.states];
  mAlpha = [...normalized.alpha];
  mStart = normalized.start;
  mFinals = [...normalized.finals];
  mTransitions = mClone(normalized.trans);

  // Show Dead-state warning if one was added
  const deadAdded = mStates.find(s => /^Dead(_\d+)?$/.test(s) && !prevStates.includes(s));
  if (deadAdded) {
    const warnEl = mGetEl('m-method-error');
    if (warnEl) warnEl.innerHTML = `<div class="warn-box" style="background:rgba(247,201,72,0.08);border:1px solid rgba(247,201,72,0.3);border-radius:6px;padding:10px 14px;font-size:0.78rem;color:var(--amber);margin-bottom:10px">
      ⚠ Incomplete transition function detected.<br>
      <span style="color:var(--ink3)">→ Missing transitions routed to new Dead (trap) state "<strong>${esc(deadAdded)}</strong>".</span>
    </div>`;
  }

  console.debug('[DFA MINIMIZER] Normalized:', mStates.length, 'states, unreachable removed:', mUnreachable);

  // ── Run chosen algorithm (populates mStepQueue / mGroupSteps / mMinGroups) ──
  if (mMethod === 'myhill') mRunMyhill();
  else mRunGrouping();

  // ── PART 4: areEquivalent cross-validation (throws on mismatch per Q3-B) ──
  try {
    const cvResult = mCrossValidateSilent();
    const cvEl = document.getElementById('m-crossval-result');
    if (cvEl) {
      cvEl.style.display = 'block';
      if (cvResult.match) {
        cvEl.innerHTML = `<div style="background:rgba(94,234,212,0.07);border:1px solid rgba(94,234,212,0.25);border-radius:6px;padding:8px 14px;font-size:0.75rem;font-family:var(--font-mono);color:var(--green)">✓ Cross-Validation Passed — ${cvResult.details}</div>`;
      } else {
        // cvResult.match===false means areEquivalent threw — should not reach here
        cvEl.innerHTML = `<div style="background:rgba(251,113,133,0.08);border:1px solid rgba(251,113,133,0.3);border-radius:6px;padding:8px 14px;font-size:0.75rem;font-family:var(--font-mono);color:var(--rose);white-space:pre-wrap">${esc(cvResult.details)}</div>`;
        console.error('[DFA MINIMIZER] Cross-validation failure:', cvResult);
        // Do not render results when algorithms disagree
        return;
      }
    }
  } catch (cvErr) {
    // areEquivalent threw "Minimization inconsistency detected" (Q3-B)
    const cvEl = document.getElementById('m-crossval-result');
    if (cvEl) {
      cvEl.style.display = 'block';
      cvEl.innerHTML = `<div style="background:rgba(251,113,133,0.08);border:1px solid rgba(251,113,133,0.3);border-radius:6px;padding:8px 14px;font-size:0.75rem;font-family:var(--font-mono);color:var(--rose)">🚨 ${esc(cvErr.message || String(cvErr))}</div>`;
    }
    console.error('[DFA MINIMIZER] areEquivalent threw:', cvErr);
    // Section C/D do not render — return before mRenderResults
    return;
  }

  // ── PART 5: Apply canonical q0,q1,q2… renaming before rendering ──
  mApplyCanonicalRenaming();

  // ── Show results ──
  mRenderResults();
}

// ── PART 2: Myhill-Nerode Table-Filling (dependency-graph + queue, O(n²|Σ|)) ──
function mRunMyhill() {
  const n = mStates.length;
  if (n === 0) return;
  const orderedStates = mSortStates(mStates);
  const s2i = new Map(orderedStates.map((s, i) => [s, i]));
  const fSet = new Set(mFinals.map(f => s2i.get(f)));
  const numA = mAlpha.length;

  // Flat transition table: transFlat[i*numA+a] = dest index
  // DFA is complete after normalizeDFA so dest is always valid
  const transFlat = new Int32Array(n * numA);
  for (let i = 0; i < n; i++)
    for (let a = 0; a < numA; a++) {
      const dest = mTransitions[orderedStates[i]][mAlpha[a]];
      transFlat[i * numA + a] = s2i.has(dest) ? s2i.get(dest) : -1;
    }

  // marked[i*n+j] (i<j) = 1 if distinguishable
  const marked = new Uint8Array(n * n);

  // DEPENDENCY GRAPH: dependents[pairKey] = list of {i,j} pairs that
  // depend on this pair being unmarked. Built once, used by propagation queue.
  const dependents = new Map(); // pairKey -> [{i,j}]
  const pairIdx = (i, j) => (i < j ? `${i}\x01${j}` : `${j}\x01${i}`);

  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let a = 0; a < numA; a++) {
        const ti = transFlat[i * numA + a];
        const tj = transFlat[j * numA + a];
        if (ti === -1 || tj === -1 || ti === tj) continue;
        const dkey = pairIdx(ti, tj);
        if (!dependents.has(dkey)) dependents.set(dkey, []);
        dependents.get(dkey).push({ i, j });
      }

  // Step 1: initial marking — one final, one not
  const queue = []; // pairs newly marked, to propagate
  const step1Reasons = [];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      if (fSet.has(i) !== fSet.has(j)) {
        marked[i * n + j] = 1;
        queue.push({ i, j });
        step1Reasons.push(`(${orderedStates[i]},${orderedStates[j]}): ${fSet.has(i) ? orderedStates[i] : orderedStates[j]} is final, ${fSet.has(i) ? orderedStates[j] : orderedStates[i]} is not`);
      }
    }

  const exportMarkedPairs = () => {
    const res = {};
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        res[pairKey(orderedStates[i], orderedStates[j])] = marked[i * n + j] === 1;
    return res;
  };
  mMarkedPairs = exportMarkedPairs();

  const s1desc = step1Reasons.length
    ? `Step 1 — Initial marking: ${step1Reasons.length} pair(s) marked ✕ immediately.\nRule: mark (p,q) if exactly one of p,q is a final state — the empty string ε distinguishes them.\nMarked: ${step1Reasons.slice(0, 5).join('; ')}${step1Reasons.length > 5 ? ` … +${step1Reasons.length - 5} more` : ''}`
    : `Step 1 — Initial marking: No pairs immediately distinguishable (all states share the same accept/reject classification). Proceeding to propagation.`;
  mStepQueue = [{ table: exportMarkedPairs(), desc: s1desc }];

  // Step 2-N: BFS propagation via dependency graph (no brute-force rescans)
  let round = 2;
  let propagationBatch = [...queue]; // pairs marked in step1
  while (propagationBatch.length) {
    const nowMarked = [];
    const roundReasons = [];
    const nextBatch = [];

    for (const { i, j } of propagationBatch) {
      const dkey = pairIdx(i, j);
      const deps = dependents.get(dkey) || [];
      for (const { i: pi, j: pj } of deps) {
        const mi = pi < pj ? pi : pj;
        const mj = pi < pj ? pj : pi;
        if (!marked[mi * n + mj]) {
          marked[mi * n + mj] = 1;
          nowMarked.push([mi, mj]);
          // Find which symbol caused this for the reason string
          let causeSym = '?';
          for (let a = 0; a < numA; a++) {
            const ti = transFlat[mi * numA + a], tj = transFlat[mj * numA + a];
            const ki = ti < tj ? ti : tj, kj = ti < tj ? tj : ti;
            if (ki === (i < j ? i : j) && kj === (i < j ? j : i)) { causeSym = mAlpha[a]; break; }
          }
          roundReasons.push(`(${orderedStates[mi]},${orderedStates[mj]}) via '${causeSym}' → (${orderedStates[i]},${orderedStates[j]}) already ✕`);
          nextBatch.push({ i: mi, j: mj });
        }
      }
    }

    propagationBatch = nextBatch;
    if (nowMarked.length) {
      mMarkedPairs = exportMarkedPairs();
      const desc = `Step ${round} — Propagation round ${round - 1}: ${nowMarked.length} new pair(s) marked ✕.\nRule: mark (p,q) if ∃ symbol a: (δ(p,a), δ(q,a)) is already marked.\n${roundReasons.slice(0, 4).join('\n')}${roundReasons.length > 4 ? `\n… +${roundReasons.length - 4} more` : ''}`;
      mStepQueue.push({ table: exportMarkedPairs(), desc });
      round++;
    }
  }

  mMarkedPairs = exportMarkedPairs();
  mStepQueue.push({ table: exportMarkedPairs(), desc: `Step ${round} — Convergence: no new pairs found distinguishable. Table is stable.\nAll ≡ pairs are provably equivalent — they cannot be told apart by any string. Each equivalence class becomes one state in the minimized DFA.` });
  mStepIdx = 0;
  mBuildMinGroups();
}

// ── PART 3: TRUE Hopcroft Partition Refinement O(n log n) ────────
// Step UI: each worklist pop that causes a split generates a UI step,
// showing the updated partition. Stable rounds are collapsed into one step.
function mRunGrouping() {
  const orderedStates = mSortStates(mStates);
  const n = orderedStates.length;
  if (n === 0) return;
  const s2i = new Map(orderedStates.map((s, i) => [s, i]));
  const numA = mAlpha.length;

  // Flat transition table: transFlat[i*numA+a] = dest index (complete after normalization)
  const transFlat = new Int32Array(n * numA);
  for (let i = 0; i < n; i++)
    for (let a = 0; a < numA; a++) {
      const dest = mTransitions[orderedStates[i]][mAlpha[a]];
      transFlat[i * numA + a] = s2i.has(dest) ? s2i.get(dest) : -1;
    }

  // Reverse transition: revTrans[a][j] = Set of i such that δ(i,a)=j
  const revTrans = Array.from({ length: numA }, () => Array.from({ length: n }, () => []));
  for (let i = 0; i < n; i++)
    for (let a = 0; a < numA; a++) {
      const j = transFlat[i * numA + a];
      if (j !== -1) revTrans[a][j].push(i);
    }

  // stateToBlock[i] = block index in partition P
  const stateToBlock = new Int32Array(n);
  // P = array of Sets (each block is a Set of state indices)
  const finalSet = new Set(mFinals.map(s => s2i.get(s)).filter(i => i !== undefined));
  const F = [...finalSet];
  const NF = orderedStates.map((_, i) => i).filter(i => !finalSet.has(i));

  let P = [];
  if (F.length) { P.push(new Set(F)); F.forEach(i => stateToBlock[i] = 0); }
  if (NF.length) { P.push(new Set(NF)); NF.forEach(i => stateToBlock[i] = P.length - 1); }

  // W = worklist: starts with the smaller of F, NF (or whichever exists)
  // Represent worklist items as block indices (into P at time of insertion)
  // We use the "refiners" approach: store actual Sets in W.
  const W = [];
  if (F.length && NF.length) W.push(F.length <= NF.length ? new Set(F) : new Set(NF));
  else if (F.length) W.push(new Set(F));
  else if (NF.length) W.push(new Set(NF));

  const formatPartition = () => P.map(blk => mSortStates([...blk].map(i => orderedStates[i])));
  const FNames = F.map(i => orderedStates[i]);
  const NFNames = NF.map(i => orderedStates[i]);
  const initAction = `Start: ${F.length} accepting {${FNames.join(',')}} vs ${NF.length} non-accepting {${NFNames.join(',')}}. Worklist seeded with smaller set.`;
  mGroupSteps = [{
    label: 'π₀ — Initial split: Accept vs Non-Accept',
    groups: formatPartition(),
    action: initAction,
    isComplete: false,
    worklistItem: null
  }];

  // ── Main Hopcroft loop ──
  while (W.length) {
    const A = W.pop(); // take a splitter from worklist

    for (let a = 0; a < numA; a++) {
      // X = states that transition to A on symbol a
      const X = new Set();
      for (const j of A) {
        for (const i of revTrans[a][j]) X.add(i);
      }
      if (X.size === 0) continue;

      // For each block Y in P, split into Y∩X and Y\X
      const newP = [];
      const splits = []; // {inter, diff, origIdx}
      for (let bi = 0; bi < P.length; bi++) {
        const Y = P[bi];
        const inter = new Set([...Y].filter(i => X.has(i)));
        const diff = new Set([...Y].filter(i => !X.has(i)));
        if (inter.size > 0 && diff.size > 0) {
          splits.push({ inter, diff, origIdx: bi, origSize: Y.size });
          newP.push(inter);
          newP.push(diff);
        } else {
          newP.push(Y);
        }
      }

      if (!splits.length) continue; // no split happened for this symbol

      // Rebuild P and stateToBlock
      P = newP;
      for (let bi = 0; bi < P.length; bi++)
        for (const i of P[bi]) stateToBlock[i] = bi;

      // Update worklist per Hopcroft rule:
      // For each split (inter, diff): if Y was in W, replace with both;
      // else add the smaller of inter, diff.
      // Since we store actual Set references in W (not indices), we check by set identity.
      // Simplified correct approach: add smaller to W (or both if same size).
      for (const { inter, diff } of splits) {
        // Find if original Y is in W by checking if any W item has same elements as Y (expensive).
        // Use the standard simplification: always add both halves to W; correct and still O(n log n)
        // because each state can only be added O(log n) times total.
        W.push(inter.size <= diff.size ? inter : diff);
        // (Adding only the smaller is sufficient for O(n log n) guarantee.)
      }

      // Record step for UI
      const stepLabel = `Worklist pop — symbol '${mAlpha[a]}': ${splits.map(sp => `{${[...sp.inter].map(i => orderedStates[i]).join(',')}} | {${[...sp.diff].map(i => orderedStates[i]).join(',')}}`).join('; ')}`;
      mGroupSteps.push({
        label: `π${mGroupSteps.length} — Refine on '${mAlpha[a]}'`,
        groups: formatPartition(),
        action: stepLabel,
        isComplete: false,
        worklistItem: [...A].map(i => orderedStates[i])
      });
    }
  }

  // Final stable step
  mGroupSteps.push({
    label: `π${mGroupSteps.length} — Stable ✓ Worklist empty`,
    groups: formatPartition(),
    action: `Final partition: ${P.length} equivalence class(es). Each becomes one minimized state.`,
    isComplete: true,
    worklistItem: null
  });

  // Convert to mStepQueue format expected by UI
  mMarkedPairs = mPartitionToMarkedPairs(mStates, formatPartition());
  mStepQueue = mGroupSteps.map(step => ({
    groups: step.groups,
    desc: step.label + ' — ' + step.action,
    isComplete: step.isComplete,
    isGrouping: true
  }));
  mStepIdx = 0;
  mBuildMinGroups();
}

function mBuildMinGroups() {
  mMinGroups = mBuildGroupsFromMarkedPairs(mStates, mMarkedPairs);
  const membership = mBuildGroupMembership(mMinGroups);
  mMinRepByState = membership.repByState;
  mMinLabelByRep = membership.labelByRep;
  mMinSortedKeys = membership.sortedKeys;

  // Determine minimized start
  mMinStart = mMinRepByState.get(mStart) || '';
}

// ── PART 4: areEquivalent — BFS on product automaton (throws on mismatch) ──
function areEquivalent(dfa1, dfa2) {
  // dfa1, dfa2: {states, alpha, start, finals, trans} — both normalized and complete
  const f1 = new Set(dfa1.finals);
  const f2 = new Set(dfa2.finals);
  const visited = new Set();
  const queue = [[dfa1.start, dfa2.start]];
  visited.add(`${dfa1.start}\x00${dfa2.start}`);

  while (queue.length) {
    const [s1, s2] = queue.shift();
    // If one is final and other is not → NOT equivalent
    if (f1.has(s1) !== f2.has(s2))
      throw new Error('Minimization inconsistency detected');
    for (const a of dfa1.alpha) {
      const t1 = dfa1.trans[s1] && dfa1.trans[s1][a];
      const t2 = dfa2.trans[s2] && dfa2.trans[s2][a];
      if (!t1 || !t2) continue; // should not happen after normalization
      const key = `${t1}\x00${t2}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push([t1, t2]);
      }
    }
  }
  return true; // all reachable pairs agreed
}

/* ── Cross-Validation (silent) ────────────────────────────────────────────────
   Runs BOTH Myhill-Nerode and Hopcroft on an isolated normalized copy of the
   current working DFA via normalizeDFA().  The live mStepQueue / mGroupSteps /
   mMarkedPairs / mMinGroups are NEVER touched.
   Throws "Minimization inconsistency detected" (via areEquivalent) on mismatch.
   Returns: { match: bool, details: string, mismatchPairs: [] }
*/
function mCrossValidateSilent() {
  // ── Work entirely on a fresh normalized local copy ──
  let norm;
  try {
    norm = normalizeDFA({ states: mStates, alpha: mAlpha, start: mStart, finals: mFinals, trans: mTransitions });
  } catch (e) { return { match: false, details: `normalizeDFA failed in CV: ${e}`, mismatchPairs: [] }; }

  const states = norm.states;
  const alpha = norm.alpha;
  const finals = new Set(norm.finals);
  const trans = norm.trans;

  // ── Helper: run Myhill-Nerode locally, returns {groups, marked} ──
  function runMyhillLocal() {
    const marked = {};
    const orderedStates = mSortStates(states);
    const n = orderedStates.length;
    const s2i = new Map(orderedStates.map((s, i) => [s, i]));
    const fSet = new Set(norm.finals.map(f => s2i.get(f)));
    const numA = alpha.length;
    const transFlat = new Int32Array(n * numA);
    for (let i = 0; i < n; i++) for (let a = 0; a < numA; a++) {
      const dest = trans[orderedStates[i]][alpha[a]];
      transFlat[i * numA + a] = s2i.has(dest) ? s2i.get(dest) : -1;
    }
    const markedArr = new Uint8Array(n * n);
    // Dependency graph
    const dependents = new Map();
    const pairIdx = (i, j) => i < j ? `${i}\x01${j}` : `${j}\x01${i}`;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let a = 0; a < numA; a++) {
      const ti = transFlat[i * numA + a], tj = transFlat[j * numA + a];
      if (ti === -1 || tj === -1 || ti === tj) continue;
      const dk = pairIdx(ti, tj);
      if (!dependents.has(dk)) dependents.set(dk, []);
      dependents.get(dk).push({ i, j });
    }
    // Initial marking
    const queue = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      if (fSet.has(i) !== fSet.has(j)) { markedArr[i * n + j] = 1; queue.push({ i, j }); }
    }
    // BFS propagation
    let batch = [...queue];
    while (batch.length) {
      const next = [];
      for (const { i, j } of batch) {
        const dk = pairIdx(i, j);
        for (const { i: pi, j: pj } of (dependents.get(dk) || [])) {
          const mi = pi < pj ? pi : pj, mj = pi < pj ? pj : pi;
          if (!markedArr[mi * n + mj]) { markedArr[mi * n + mj] = 1; next.push({ i: mi, j: mj }); }
        }
      }
      batch = next;
    }
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++)
      marked[pairKey(orderedStates[i], orderedStates[j])] = markedArr[i * n + j] === 1;
    return { groups: mBuildGroupsFromMarkedPairs(orderedStates, marked), marked };
  }

  // ── Helper: run Hopcroft locally, returns {groups} ──
  function runHopcroftLocal() {
    const orderedStates = mSortStates(states);
    const n = orderedStates.length;
    const s2i = new Map(orderedStates.map((s, i) => [s, i]));
    const numA = alpha.length;
    const transFlat = new Int32Array(n * numA);
    for (let i = 0; i < n; i++) for (let a = 0; a < numA; a++) {
      const dest = trans[orderedStates[i]][alpha[a]];
      transFlat[i * numA + a] = s2i.has(dest) ? s2i.get(dest) : -1;
    }
    const revTrans = Array.from({ length: numA }, () => Array.from({ length: n }, () => []));
    for (let i = 0; i < n; i++) for (let a = 0; a < numA; a++) {
      const j = transFlat[i * numA + a]; if (j !== -1) revTrans[a][j].push(i);
    }
    const fSet = new Set(norm.finals.map(f => s2i.get(f)).filter(i => i !== undefined));
    const F = [...fSet], NF = orderedStates.map((_, i) => i).filter(i => !fSet.has(i));
    let P = [];
    if (F.length) P.push(new Set(F));
    if (NF.length) P.push(new Set(NF));
    const W = [];
    if (F.length && NF.length) W.push(F.length <= NF.length ? new Set(F) : new Set(NF));
    else if (F.length) W.push(new Set(F));
    else if (NF.length) W.push(new Set(NF));
    while (W.length) {
      const A = W.pop();
      for (let a = 0; a < numA; a++) {
        const X = new Set();
        for (const j of A) for (const i of revTrans[a][j]) X.add(i);
        if (!X.size) continue;
        const newP = [], splits = [];
        for (let bi = 0; bi < P.length; bi++) {
          const Y = P[bi];
          const inter = new Set([...Y].filter(i => X.has(i)));
          const diff = new Set([...Y].filter(i => !X.has(i)));
          if (inter.size > 0 && diff.size > 0) { splits.push({ inter, diff }); newP.push(inter); newP.push(diff); }
          else newP.push(Y);
        }
        if (!splits.length) continue;
        P = newP;
        for (const { inter, diff } of splits) W.push(inter.size <= diff.size ? inter : diff);
      }
    }
    const partition = P.map(blk => mSortStates([...blk].map(i => orderedStates[i])));
    const marked = mPartitionToMarkedPairs(states, partition);
    return { groups: mBuildGroupsFromMarkedPairs(states, marked) };
  }

  const myhill = runMyhillLocal();
  const hopcroft = runHopcroftLocal();
  const myhillCount = Object.keys(myhill.groups).length;
  const hopcroftCount = Object.keys(hopcroft.groups).length;

  // Build minimized DFAs for areEquivalent check
  function buildMinDFA(groups, origNorm) {
    const membership = mBuildGroupMembership(groups);
    const repByState = membership.repByState;
    const minStates = membership.sortedKeys;
    const minStart = repByState.get(origNorm.start);
    const minFinals = [...new Set(origNorm.finals.map(f => repByState.get(f)).filter(Boolean))];
    const minTrans = {};
    minStates.forEach(rep => {
      minTrans[rep] = {};
      const member = groups[rep][0];
      origNorm.alpha.forEach(a => {
        const dest = origNorm.trans[member] && origNorm.trans[member][a];
        if (dest) minTrans[rep][a] = repByState.get(dest);
      });
    });
    return { states: minStates, alpha: origNorm.alpha, start: minStart, finals: minFinals, trans: minTrans };
  }

  const myhillDFA = buildMinDFA(myhill.groups, norm);
  const hopcroftDFA = buildMinDFA(hopcroft.groups, norm);

  // PART 4: areEquivalent throws on mismatch (Q3-B)
  areEquivalent(myhillDFA, hopcroftDFA);

  const myhillMembership = mBuildGroupMembership(myhill.groups);
  const hopcroftMembership = mBuildGroupMembership(hopcroft.groups);

  // Pair-level equivalence check
  const mismatches = [];
  const ordSt = mSortStates(states);
  for (let i = 0; i < ordSt.length; i++) for (let j = i + 1; j < ordSt.length; j++) {
    const p = ordSt[i], q = ordSt[j], key = pairKey(p, q);
    const myhillEquiv = !(myhill.marked[key]);
    const hopcroftEquiv = hopcroftMembership.repByState.get(p) === hopcroftMembership.repByState.get(q);
    if (myhillEquiv !== hopcroftEquiv)
      mismatches.push(`(${p},${q}): Myhill says ${myhillEquiv ? '≡' : '✕'}, Hopcroft says ${hopcroftEquiv ? '≡' : '✕'}`);
  }

  if (mismatches.length)
    throw new Error(`Minimization inconsistency detected on ${mismatches.length} pair(s):\n${mismatches.slice(0, 8).join('\n')}`);

  return {
    match: true,
    details: `✓ Both algorithms agree: ${myhillCount} state(s) in minimized DFA.`,
    mismatchPairs: []
  };
}

// ── PART 5: Preserve user-defined state names ───────────────────────
// Previously this function renamed every equivalence class to q0,q1,q2,…
// which destroyed user-defined names like A, B, C.
//
// Now we simply ensure mMinStart, mMinRepByState, mMinLabelByRep, and
// mMinSortedKeys are consistent with the groups already built by
// mBuildMinGroups() / mBuildGroupMembership(), which already produces:
//   • single-member groups  → original user name (e.g. "A")
//   • multi-member groups   → "{A,C}" format with original names
//
// mMinGroups keys are the union-find representatives (original state names).
// No renaming is performed — user-defined names are the single source of truth.
function mApplyCanonicalRenaming() {
  if (!Object.keys(mMinGroups).length) return;

  // Re-derive membership from the existing mMinGroups so all maps are
  // consistent (mBuildMinGroups may have already set them, but re-running
  // here is safe and guarantees coherence after any post-processing).
  const membership = mBuildGroupMembership(mMinGroups);
  mMinRepByState = membership.repByState;
  mMinLabelByRep = membership.labelByRep;
  mMinSortedKeys = membership.sortedKeys;
  mMinStart = membership.repByState.get(mStart) || membership.sortedKeys[0] || '';
}

// ── Render All Results ────────────────────────────────────────────
function mRenderResults() {
  const ra = mGetEl('m-results-area');
  if (!ra) return;
  // FIX: always strip 'visible' first and force a reflow so the CSS transition
  // re-fires on every run, not just the first. Without this, classList.add on an
  // already-visible element is a no-op — scroll and transitions don't re-trigger.
  ra.classList.remove('visible');
  void ra.offsetHeight; // force reflow
  ra.classList.add('visible');
  ra.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Method label
  const methodLabel = mGetEl('m-method-label');
  if (methodLabel) methodLabel.textContent = mMethod === 'myhill' ? 'Myhill-Nerode' : 'Grouping Method';

  // Section C: hidden until algo complete
  const secC = document.getElementById('m-section-c');
  if (secC) secC.style.display = 'none';

  // Destroy ALL graph instances from any previous run to prevent duplication / stale renders
  ['m-cy-min', 'm-live-dfa-cy', 'm-cmp-cy-orig', 'm-cmp-cy-min'].forEach(id => {
    if (mCyInstances[id]) { try { mCyInstances[id].destroy(); } catch (_) { } mCyInstances[id] = null; }
    const el = document.getElementById(id); if (el) el.innerHTML = '';
  });

  // Reset live DFA panel
  const cyId = 'm-live-dfa-cy';
  const liveCont = document.getElementById('m-live-dfa-container');
  if (liveCont) liveCont.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--ink3);font-size:0.78rem;font-family:var(--font-mono)">Waiting for first step…</div>';
  const liveStatus = document.getElementById('m-live-dfa-status');
  if (liveStatus) { liveStatus.textContent = 'in progress…'; liveStatus.style.color = 'var(--rose)'; }
  const liveCaption = document.getElementById('m-live-dfa-caption');
  if (liveCaption) liveCaption.textContent = '';

  // Section B: Process
  mStepIdx = 0;
  const stepDescription = mGetEl('m-step-description');
  if (stepDescription) stepDescription.textContent = 'Click "Next Step →" to begin the minimization walkthrough.';
  const sv = document.getElementById('m-step-split-view');
  if (sv) sv.style.display = 'none';
  const stepCounter = mGetEl('m-step-counter');
  const prevBtn = mGetEl('m-btn-prev');
  const nextBtn = mGetEl('m-btn-next');
  if (stepCounter) stepCounter.textContent = `Step 0 / ${mStepQueue.length}`;
  if (prevBtn) prevBtn.disabled = true;
  if (nextBtn) nextBtn.disabled = false;
  mRenderProgressTrack(-1);
  // Inject starter beginner hint
  let hintEl = document.getElementById('m-beginner-hint');
  const stepDescBox = mGetEl('m-step-desc-box');
  if (stepDescBox) {
    if (!hintEl) { hintEl = document.createElement('div'); hintEl.id = 'm-beginner-hint'; stepDescBox.after(hintEl); }
    hintEl.innerHTML = `<div class="step-hint-bar"><span class="hint-label">🧠 ${mMethod === 'myhill' ? 'Myhill-Nerode' : 'Grouping Method'}</span>Click <strong>Next Step →</strong> to walk through the algorithm. The <strong>left panel</strong> shows the algorithm state, the <strong>right panel</strong> builds the minimized DFA live in parallel.</div>`;
  }
  // Matrix view
  mRenderMatrixView();
  switchProcessTab('psteps');
  // Section C will be revealed when algo completes
}

function mRenderOrigDFA() {
  // Section A is now removed from results area.
  // Original DFA is shown in the preview card (m-preview-cy).
  // This function is kept for any remaining internal calls but does nothing harmful.
}

function mRenderMatrixView() {
  const matrixView = mGetEl('m-matrix-view');
  if (!matrixView) return;
  if (mMethod === 'myhill') {
    // CRIT-3 FIX: mMarkedPairs keys were built using mSortStates(mStates), so the
    // display must use the same sorted order — otherwise cell (i,j) looks up the
    // wrong pair key and shows ✕/≡ in the wrong cell.
    const displayStates = mSortStates(mStates);
    const n = displayStates.length;
    let h = '<p style="font-size:0.8rem;color:var(--ink2);margin-bottom:12px">Final state of the distinguishability table after all propagation rounds. ✕ = distinguishable, ≡ = equivalent.</p>';
    h += '<div style="overflow-x:auto"><table class="pair-matrix"><thead><tr><th></th>';
    for (let c = 0; c < n - 1; c++) h += `<th>${esc(displayStates[c])}</th>`;
    h += '</tr></thead><tbody>';
    for (let i = 1; i < n; i++) {
      h += `<tr><th>${esc(displayStates[i])}</th>`;
      for (let j = 0; j < n - 1; j++) {
        if (j < i) { const mk = mMarkedPairs[pairKey(displayStates[i], displayStates[j])]; h += `<td class="${mk ? 'cell-marked' : 'cell-equiv'}">${mk ? '✕' : '≡'}</td>`; }
        else h += '<td class="cell-empty">—</td>';
      }
      h += '</tr>';
    }
    matrixView.innerHTML = h + '</tbody></table></div>';
  } else {
    // Partition steps summary
    let h = '<p style="font-size:0.8rem;color:var(--ink2);margin-bottom:12px">All partition refinement rounds from P₀ to the stable final partition.</p>';
    h += '<div class="pr-box">';
    mGroupSteps.forEach(step => {
      h += `<div class="pr-row ${step.isComplete ? 'complete' : ''}"><div class="pr-label">${esc(step.label.split('—')[0])}</div><div class="pr-groups">`;
      step.groups.forEach(g => { h += `<div class="pr-group">{${g.map(esc).join(', ')}}</div>`; });
      h += '</div></div>';
    });
    matrixView.innerHTML = h + '</div>';
  }
}

// ── Step Navigation ───────────────────────────────────────────────
// ── Beginner-friendly hints for each step type ───────────────────
function mGetBeginnerHint(stepIdx, totalSteps, isGrouping) {
  if (isGrouping) {
    if (stepIdx === 0) return { label: 'Hopcroft Init', text: 'We split all states into two buckets: <strong>accepting</strong> and <strong>non-accepting</strong>. This is pi0. The <strong>worklist W</strong> is seeded with the <em>smaller</em> set - this is what gives Hopcroft O(n log n) speed.' };
    if (stepIdx === totalSteps - 1) return { label: 'Worklist Empty!', text: 'W is empty - no more splits possible. Every group is <strong>stable</strong>. States in the same group are indistinguishable by any string. Each group becomes <strong>one state</strong> in the minimized DFA.' };
    return { label: 'Worklist Pop', text: 'We pop a <strong>splitter set A</strong> from W. For each symbol a, we find states that transition into A. Any partition block Y split by this is divided - the <em>smaller half</em> goes back into W.' };
  } else {
    if (stepIdx === 0) return { label: '💡 Step 1 — Initial Marking', text: 'We look at every pair of states (p, q). If one is an <strong>accepting state</strong> and the other is <strong>not</strong>, they are immediately distinguishable — any string accepted by one would be rejected by the other. We mark these pairs with ✕.' };
    if (stepIdx === totalSteps - 1) return { label: '✅ Convergence!', text: 'No new pairs were marked in the last round. Every remaining <strong>≡</strong> (unmarked) pair contains two states that are <strong>equivalent</strong> — no string can tell them apart. These equivalent states will be merged into a single state in the minimized DFA.' };
    return { label: '🔄 Propagation Round', text: 'We look at each unmarked pair (p, q). If reading some symbol <em>a</em> from both states leads to a pair that is already marked ✕, then (p, q) must also be distinguishable — and we mark it ✕ too. We keep doing this until nothing changes.' };
  }
}

// ── Progress Tracker ────────────────────────────────────────────
function mRenderProgressTrack(current) {
  const track = document.getElementById('m-step-progress-track');
  if (!track || !mStepQueue.length) return;
  const isG = (mMethod === 'grouping');
  // Build named steps
  let names;
  if (isG) {
    names = mGroupSteps.map((s, i) => i === 0 ? 'P₀ Split' : s.isComplete ? 'Stable ✓' : `P${i} Refine`);
  } else {
    names = ['Init Mark', ...Array.from({ length: mStepQueue.length - 2 }, (_, i) => `Round ${i + 2}`), 'Converge'];
  }
  let h = '';
  names.forEach((name, i) => {
    const state = i < current ? 'done' : i === current ? 'active' : '';
    h += `<div class="step-prog-wrap">
      <div class="step-prog-dot ${state}" title="Step ${i + 1}: ${name}">${i < current ? '✓' : i + 1}</div>
      <div class="step-prog-name ${state}">${name}</div>
    </div>`;
    if (i < names.length - 1) {
      h += `<div class="step-prog-line ${i < current ? 'done' : ''}"></div>`;
    }
  });
  track.innerHTML = h;
}

// ── Build per-step theory content ──────────────────────────────
function mGetStepTheory(stepIdx, totalSteps) {
  const isG = (mMethod === 'grouping');
  if (isG) {
    const step = mGroupSteps[stepIdx] || {};
    if (stepIdx === 0) return {
      badge: 'grouping', badgeText: 'Step 1 — Init',
      title: 'Initial Split (π₀) + Seed Worklist W',
      body: `<strong>Hopcroft init:</strong> Split states into F (accepting) and Q∖F (non-accepting). Seed worklist W with the <em>smaller</em> of the two sets.<br><br><strong>Why smaller?</strong> Each state is processed at most O(log n) times — giving O(n log n) total.`,
      formula: 'π₀ = { F, Q∖F }, W = smaller of F, Q∖F',
      why: 'Seeding with the smaller set is Hopcroft\'s key insight for O(n log n).'
    };
    if (step.isComplete) return {
      badge: 'done', badgeText: 'Stable ✓',
      title: 'Worklist Empty — Algorithm Complete',
      body: `W is empty. Every group is <strong>stable</strong> — states in the same group are indistinguishable by any string. Each group becomes one state in the canonical minimized DFA (q0,q1,q2,…).`,
      formula: '|W| = 0 → terminate',
      why: 'The result is the coarsest stable partition refining {F, Q∖F}.'
    };
    const wItem = step.worklistItem ? `Splitter A={${step.worklistItem.join(',')}}` : 'Worklist pop';
    return {
      badge: 'grouping', badgeText: `Step ${stepIdx + 1}`,
      title: `Hopcroft: ${wItem}`,
      body: `For each symbol a, find X = states that transition into A on a. For each partition block Y: if Y∩X and Y∖X are both non-empty → split Y, push smaller half into W.`,
      formula: 'X={q|δ(q,a)∈A}; split Y if Y∩X≠∅ and Y∖X≠∅',
      why: 'Adding only the smaller half to W keeps the O(n log n) guarantee.'
    };
  } else {
    // Myhill table-filling
    const step = mStepQueue[stepIdx] || {};
    if (stepIdx === 0) return {
      badge: 'myhill', badgeText: 'Step 1 / 6',
      title: 'Step 1: Build the Pair Table + Initial Marking',
      body: `<strong>What we do:</strong> Create a triangular table with one cell for every <em>pair</em> of states (p, q) where p ≠ q.<br><br>
We avoid duplicates — pair (A,B) and (B,A) are the same, so we only keep the lower triangle.<br><br>
Then we <strong>immediately mark</strong> any pair where exactly one state is a final state:<br>
• One final + one non-final → <span class="code">✕</span> (distinguishable)<br>
• Both final or both non-final → <span class="code">≡</span> (potentially equivalent)<br><br>
<strong>Why?</strong> The empty string ε is accepted from a final state but rejected from a non-final state. They are immediately distinguishable.`,
      formula: 'Mark (p,q) if: p∈F XOR q∈F (exactly one is final)',
      why: 'A final and non-final state can never be equivalent — just reading zero more symbols (the empty string) tells them apart. These pairs get a ✕ right away.'
    };
    if (stepIdx === totalSteps - 1) return {
      badge: 'done', badgeText: 'Converged ✓',
      title: 'Step 5: Convergence — Algorithm Complete',
      body: `<strong>Why we stop:</strong> We completed a full pass through all unmarked pairs and found <strong>no new pairs to mark</strong>. Two consecutive rounds gave the same table.<br><br>
Every remaining <span class="code">≡</span> pair contains two states that are <strong>completely equivalent</strong> — no string, however long, can distinguish them.<br><br>
<strong>Next:</strong> Merge each set of equivalent states into a single state in the minimized DFA.`,
      formula: 'No new ✕ marks found → terminate',
      why: 'All remaining ≡ pairs are guaranteed equivalent. Merging them creates a smaller DFA that accepts exactly the same language.'
    };
    const step_obj = mStepQueue[stepIdx];
    const prevStep = mStepQueue[stepIdx - 1];
    const nowMarked = [];
    if (step_obj && prevStep) {
      Object.keys(step_obj.table || {}).forEach(k => {
        if (step_obj.table[k] && !prevStep.table[k]) nowMarked.push(k.replace('|', ' and '));
      });
    }
    return {
      badge: 'myhill', badgeText: `Round ${stepIdx + 1} — Propagation`,
      title: `Step ${stepIdx + 2}: Propagate Markings`,
      body: `<strong>What we check:</strong> For each still-unmarked pair (p, q), look at where both states go on each input symbol:<br><br>
• Compute δ(p, a) = p' and δ(q, a) = q' for each symbol a<br>
• If the pair (p', q') is already marked <span class="code">✕</span> → mark (p, q) too<br>
• <em>Reason:</em> If reading symbol 'a' leads to a distinguishable situation, then (p, q) are distinguishable too<br><br>
${nowMarked.length > 0 ? `<strong>This round marked:</strong> ${nowMarked.slice(0, 4).map(k => `(${k})`).join(', ')}${nowMarked.length > 4 ? '…' : ''}` :
          '<strong>No new marks</strong> in this round → convergence!'}`,
      formula: 'If (δ(p,a), δ(q,a)) is marked ✕, then (p,q) is marked ✕',
      why: nowMarked.length > 0
        ? `We found ${nowMarked.length} new distinguishable pair(s). Continue to the next round.`
        : 'No new pairs were marked. This means the algorithm has converged — all remaining ≡ pairs are truly equivalent.'
    };
  }
}

// ── Render animated states panel ─────────────────────────────────
function mRenderStepAnimation(stepIdx) {
  const isG = (mMethod === 'grouping');
  let h = '';
  if (isG) {
    const step = mGroupSteps[stepIdx] || {};
    const isFirst = stepIdx === 0, isDone = step.isComplete;
    if (isFirst) {
      // Show two groups: Final / Non-final
      const finals = mStates.filter(s => mFinals.includes(s));
      const nonFinals = mStates.filter(s => !mFinals.includes(s));
      h += `<div class="anim-group-box stable" style="animation-delay:0.05s">
        <div class="anim-group-label">Accepting (F)</div>`;
      finals.forEach((s, i) => {
        const isSt = s === mStart;
        h += `<div class="anim-state-bubble ${isSt ? 'state-start' : 'state-final'}" style="animation-delay:${0.05 + i * 0.07}s">${esc(s)}</div>`;
      });
      if (!finals.length) h += `<span style="font-size:0.75rem;color:var(--ink3)">(none)</span>`;
      h += `</div>`;
      h += `<div class="anim-group-box" style="animation-delay:0.15s">
        <div class="anim-group-label">Non-Accepting (Q∖F)</div>`;
      nonFinals.forEach((s, i) => {
        h += `<div class="anim-state-bubble state-normal" style="animation-delay:${0.15 + i * 0.07}s">${esc(s)}</div>`;
      });
      if (!nonFinals.length) h += `<span style="font-size:0.75rem;color:var(--ink3)">(none)</span>`;
      h += `</div>`;
    } else {
      // Show current partition
      step.groups.forEach((grp, gi) => {
        const isStab = isDone || false;
        const prevGroups = stepIdx > 0 ? (mGroupSteps[stepIdx - 1].groups || []) : [];
        const wasOneGroup = prevGroups.some(pg => pg.length > grp.length && grp.every(s => pg.includes(s)));
        const cls = isStab ? 'stable' : wasOneGroup ? 'new' : '';
        h += `<div class="anim-group-box ${cls}" style="animation-delay:${gi * 0.08}s">
          <div class="anim-group-label">Group ${gi + 1}${isStab ? ' ✓' : ''}</div>`;
        grp.forEach((s, si) => {
          const isSt = s === mStart, isF = mFinals.includes(s);
          h += `<div class="anim-state-bubble ${isSt ? 'state-start' : isF ? 'state-final' : isStab ? 'state-equiv' : 'state-normal'}" style="animation-delay:${gi * 0.08 + si * 0.06}s">${esc(s)}</div>`;
        });
        h += `</div>`;
      });
    }
  } else {
    // Myhill: show states color-coded by current role
    h += `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">`;
    mStates.forEach((s, i) => {
      const isF = mFinals.includes(s), isSt = s === mStart;
      h += `<div class="anim-state-bubble ${isSt ? 'state-start' : isF ? 'state-final' : 'state-normal'}" style="animation-delay:${i * 0.06}s" title="${isSt ? 'Start state' : ''}${isF ? ' Accepting state' : ''}">
        ${esc(s)}</div>`;
    });
    h += `</div>`;
    // Show pair counts
    const step = mStepQueue[stepIdx];
    if (step && step.table) {
      const total = Object.keys(step.table).length;
      const marked = Object.values(step.table).filter(Boolean).length;
      const equiv = total - marked;
      h += `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;margin-bottom:10px">
        <div style="padding:6px 12px;border-radius:var(--r-xs);background:rgba(251,113,133,0.12);border:1px solid rgba(251,113,133,0.3);font-family:var(--font-mono);font-size:0.73rem;color:var(--rose)">✕ ${marked} distinct</div>
        <div style="padding:6px 12px;border-radius:var(--r-xs);background:rgba(94,234,212,0.08);border:1px solid rgba(94,234,212,0.3);font-family:var(--font-mono);font-size:0.73rem;color:var(--green)">≡ ${equiv} equiv</div>
        <div style="padding:6px 12px;border-radius:var(--r-xs);background:var(--bg2);border:1px solid var(--border);font-family:var(--font-mono);font-size:0.73rem;color:var(--ink3)">${total} total pairs</div>
      </div>`;
      // Mini pair table — CRIT-3 FIX: use sorted states to match mMarkedPairs key order
      const displayStates = mSortStates(mStates);
      const n = displayStates.length;
      const prevTbl = stepIdx > 0 && mStepQueue[stepIdx - 1] ? mStepQueue[stepIdx - 1].table : null;
      h += `<div style="overflow-x:auto"><table class="pair-matrix" style="font-size:0.7rem"><thead><tr><th></th>`;
      for (let c = 0; c < n - 1; c++) h += `<th>${esc(displayStates[c])}</th>`;
      h += `</tr></thead><tbody>`;
      for (let i = 1; i < n; i++) {
        h += `<tr><th>${esc(displayStates[i])}</th>`;
        for (let j = 0; j < n - 1; j++) {
          if (j < i) {
            const mk = step.table[pairKey(displayStates[i], displayStates[j])];
            const wasNew = prevTbl && mk && !prevTbl[pairKey(displayStates[i], displayStates[j])];
            const cls = wasNew ? 'cell-new-mark' : mk ? 'cell-marked' : 'cell-equiv';
            h += `<td class="${cls}" style="padding:5px 8px">${mk ? '✕' : '≡'}</td>`;
          } else h += `<td class="cell-empty" style="padding:5px 8px">—</td>`;
        }
        h += `</tr>`;
      }
      h += `</tbody></table></div>`;
    }
  }
  const stepVisual = mGetEl('m-step-visual');
  if (stepVisual) stepVisual.innerHTML = h;
}

function mNextStep() {
  const desc = mGetEl('m-step-description');
  const ctr = mGetEl('m-step-counter');
  const prevBtn = mGetEl('m-btn-prev');
  const nextBtn = mGetEl('m-btn-next');
  const splitView = mGetEl('m-step-split-view');
  if (!desc || !ctr || !prevBtn || !nextBtn) return;

  if (mStepIdx >= mStepQueue.length) {
    // ── COMPLETION: reveal Section C and final state ──
    desc.innerHTML = "<strong style='color:var(--green)'>✓ Minimization Complete!</strong> The minimized DFA is now shown below.";
    nextBtn.disabled = true;
    mRenderProgressTrack(mStepQueue.length);
    // Update live DFA panel to complete state
    const liveStatus = document.getElementById('m-live-dfa-status');
    if (liveStatus) { liveStatus.textContent = 'complete ✓'; liveStatus.style.color = 'var(--green)'; }
    mRenderLiveDFA(true);
    // Reveal and populate Section C
    const secC = document.getElementById('m-section-c');
    if (secC) { secC.style.display = ''; mRenderMinDFA(); mUpdateComparisonBar(); }
    // Reveal and populate Section D (comparison)
    const secD = document.getElementById('m-section-d');
    if (secD) { secD.style.display = ''; setTimeout(() => mRenderComparison(), 200); }
    let hintEl = document.getElementById('m-beginner-hint');
    const stepDescBox = mGetEl('m-step-desc-box');
    if (stepDescBox) {
      if (!hintEl) { hintEl = document.createElement('div'); hintEl.id = 'm-beginner-hint'; stepDescBox.after(hintEl); }
      hintEl.innerHTML = `<div class="step-hint-bar"><span class="hint-label">✅ Algorithm Complete</span>Minimization finished! Section C shows the minimized DFA and Section D shows a side-by-side comparison with highlighted changes.</div>`;
    }
    return;
  }

  const step = mStepQueue[mStepIdx];
  desc.textContent = step.desc;
  ctr.textContent = `Step ${mStepIdx + 1} / ${mStepQueue.length}`;
  // Prev is disabled only at the very first step (index 0).
  // After mStepIdx is incremented at the bottom, step 2+ allows going back.
  prevBtn.disabled = (mStepIdx === 0);

  // Show split view
  if (splitView) splitView.style.display = 'grid';

  // ── Compact theory bar (minimal, just formula + one-liner) ──
  const compactBar = document.getElementById('m-compact-theory-bar');
  const compactText = document.getElementById('m-compact-theory-text');
  const theory = mGetStepTheory(mStepIdx, mStepQueue.length);
  if (compactBar && compactText) {
    const formulaShort = theory.formula ? `<span style="color:var(--amber)">${theory.formula}</span>` : '';
    const whyShort = theory.why ? ` — <span style="color:var(--ink2)">${theory.why.replace(/<[^>]*>/g, '').slice(0, 90)}${theory.why.length > 90 ? '…' : ''}</span>` : '';
    compactText.innerHTML = formulaShort + whyShort;
    compactBar.style.display = 'block';
  }

  // ── Left: algorithm state visualization ──
  mRenderStepAnimation(mStepIdx);

  // ── Right: live building of minimized DFA ──
  mRenderLiveDFA(false);

  // Beginner hint (1 line only)
  const hint = mGetBeginnerHint(mStepIdx, mStepQueue.length, !!step.isGrouping);
  let hintEl = document.getElementById('m-beginner-hint');
  const stepDescBox = mGetEl('m-step-desc-box');
  if (stepDescBox) {
    if (!hintEl) { hintEl = document.createElement('div'); hintEl.id = 'm-beginner-hint'; stepDescBox.after(hintEl); }
    hintEl.innerHTML = `<div class="step-hint-bar"><span class="hint-label">${hint.label}</span>${hint.text}</div>`;
  }

  // Flash animation
  const box = mGetEl('m-step-desc-box');
  if (box) { box.classList.remove('step-flash'); void box.offsetWidth; box.classList.add('step-flash'); }

  mRenderProgressTrack(mStepIdx);
  mStepIdx++;
}
// ── Live DFA Builder: renders partial/final minimized DFA with Cytoscape ──────
function mRenderLiveDFA(isFinal) {
  const container = mGetEl('m-live-dfa-container');
  const caption = mGetEl('m-live-dfa-caption');
  if (!container) return;
  if (!container.isConnected) return;
  if (typeof cytoscape !== 'function') {
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--rose);font-size:0.78rem;font-family:var(--font-mono)">Graph library unavailable.</div>';
    return;
  }
  if (container.offsetWidth === 0 || container.offsetHeight === 0) {
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--ink3);font-size:0.78rem;font-family:var(--font-mono)">Graph will render when this panel is visible…</div>';
    return;
  }

  // Compute current equivalence groups
  const curIdx = Math.max(0, mStepIdx - 1);
  let partialGroups = null;

  if (isFinal) {
    partialGroups = mMinGroups;
  } else if (mMethod === 'grouping') {
    const step = mGroupSteps[curIdx];
    if (step) {
      partialGroups = mCanonicalizeGroups(Object.fromEntries(step.groups.map(g => [mCanonicalGroupKey(g), g])));
    }
  } else {
    const step = mStepQueue[curIdx];
    if (step && step.table) {
      partialGroups = mBuildGroupsFromMarkedPairs(mStates, step.table);
    }
  }

  if (!partialGroups) {
    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--ink3);font-size:0.78rem;font-family:var(--font-mono)">Step through to see DFA build…</div>';
    return;
  }

  const membership = mBuildGroupMembership(partialGroups);
  const groupKeys = membership.sortedKeys;
  const totalOrig = mStates.length;
  const totalGroups = groupKeys.length;
  const shouldAnimateDetail = totalGroups <= 10;

  // Build cytoscape elements
  const elems = [];
  const findGroupRep = s => membership.repByState.get(s) || s;

  // Add nodes
  groupKeys.forEach(rep => {
    const members = partialGroups[rep];
    const isFinalState = members.some(s => mFinals.includes(s));
    const isStart = members.includes(mStart);
    const isMerged = members.length > 1;
    const lbl = membership.labelByRep.get(rep) || members[0];
    elems.push({ data: { id: rep, label: lbl, isFinal: isFinalState, isStart, isMerged } });
  });

  // Add edges
  const edgeMap = {};
  // LOGIC-6 FIX: use a Set for O(1) membership checks instead of O(n) Array.includes
  const groupKeySet = new Set(groupKeys);
  groupKeys.forEach(rep => {
    const member = partialGroups[rep][0];
    mAlpha.forEach(a => {
      const dest = mTransitions[member] && mTransitions[member][a];
      if (!dest) return;
      const destRep = findGroupRep(dest);
      if (!groupKeySet.has(destRep)) return;
      const ek = `${rep}→${destRep}`;
      if (!edgeMap[ek]) edgeMap[ek] = { source: rep, target: destRep, labels: [] };
      if (!edgeMap[ek].labels.includes(a)) edgeMap[ek].labels.push(a);
    });
  });
  Object.values(edgeMap).forEach(e => elems.push({ data: { id: `le_${e.source}_${e.target}`, source: e.source, target: e.target, label: regexToUnicodeSup(e.labels.join(',')), multi: e.labels.length > 1 } }));

  // Add start arrow ghost
  const startRep = groupKeys.find(r => partialGroups[r].includes(mStart));
  if (startRep) {
    elems.push({ data: { id: 'live-ghost', label: '' }, classes: 'ghost' });
    elems.push({ data: { source: 'live-ghost', target: startRep, label: '' }, classes: 'start-arrow' });
  }

  // Destroy old and create new
  const cyId = 'm-live-dfa-cy';
  if (mCyInstances[cyId]) { try { mCyInstances[cyId].destroy(); } catch (_) { } mCyInstances[cyId] = null; }
  // Container needs an inner div for cytoscape
  container.innerHTML = '';
  const innerDiv = document.createElement('div');
  innerDiv.style.cssText = 'width:100%;height:100%;';
  container.appendChild(innerDiv);

  try {
    mCyInstances[cyId] = cytoscape({
      container: innerDiv,
      elements: elems,
      style: [
        {
          selector: 'node', style: {
            label: 'data(label)',
            shape: 'ellipse',
            'background-color': '#030712',
            'border-width': 2.4,
            'border-color': '#EAB308',
            color: '#FACC15',
            'text-valign': 'center', 'text-halign': 'center',
            'text-wrap': 'none',
            'text-outline-width': 1.4,
            'text-outline-color': '#020617',
            width: 58, height: 58,
            'font-size': '11px', 'font-family': "'Rajdhani', sans-serif", 'font-weight': '700',
            'shadow-blur': 26, 'shadow-color': 'rgba(234, 179, 8, 0.82)', 'shadow-offset-x': 0, 'shadow-offset-y': 0,
            'underlay-opacity': 0,
            'overlay-opacity': 0,
            'transition-property': 'background-color, border-color, shadow-color, underlay-color', 'transition-duration': '0.3s'
          }
        },
        {
          selector: 'node[?isStart]', style: {
            'border-color': '#3B82F6', 'border-width': 2.8, 'background-color': '#030712',
            'shadow-color': 'rgba(59, 130, 246, 0.95)', 'shadow-blur': 30,
            'underlay-opacity': 0,
            color: '#60A5FA'
          }
        },
        {
          selector: 'node[?isFinal]', style: {
            'border-width': 4.4, 'border-style': 'double', 'border-color': '#EF4444', 'background-color': '#030712',
            'shadow-color': 'rgba(239, 68, 68, 0.95)', 'shadow-blur': 30,
            'underlay-opacity': 0,
            color: '#F87171'
          }
        },
        {
          selector: 'node[?isStart][?isFinal]', style: {
            'border-color': '#3B82F6', 'border-width': 4.8, 'border-style': 'double', 'background-color': '#030712',
            'shadow-color': 'rgba(59, 130, 246, 0.95)', 'shadow-blur': 34,
            'underlay-opacity': 0,
            color: '#60A5FA'
          }
        },
        {
          selector: 'node[?isMerged]:not([?isStart]):not([?isFinal])', style: {
            shape: 'ellipse',
            'border-color': '#EAB308', 'border-width': 2.8, 'background-color': '#030712',
            'shadow-color': 'rgba(234, 179, 8, 0.82)', 'shadow-blur': 28,
            'underlay-opacity': 0,
            color: '#FACC15'
          }
        },
        {
          selector: 'node[label = "Dead"], node[id = "Dead"]', style: {
            shape: 'ellipse',
            'border-color': 'rgba(107, 114, 128, 0.7)',
            'background-color': '#0b1120',
            'shadow-color': 'rgba(107, 114, 128, 0.18)',
            'shadow-blur': 6,
            'underlay-opacity': 0,
            color: 'rgba(107, 114, 128, 0.7)',
            opacity: 0.7
          }
        },
        { selector: '.ghost', style: { width: 1, height: 1, opacity: 0, 'background-opacity': 0, 'border-width': 0 } },
        {
          selector: '.start-arrow', style: {
            width: 2.8,
            'line-color': '#38bdf8',
            'target-arrow-color': '#38bdf8',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 1.45,
            'curve-style': 'straight',
            'line-style': 'dashed',
            'line-dash-pattern': [8, 6],
            'underlay-color': 'rgba(56, 189, 248, 0.28)',
            'underlay-padding': 4,
            'underlay-opacity': 1
          }
        },
        {
          selector: 'edge', style: {
            label: 'data(label)', width: 2.2,
            'target-arrow-shape': 'triangle', 'target-arrow-color': '#7dd3fc', 'arrow-scale': 1.35,
            'curve-style': 'bezier',
            'control-point-distances': [0], 'control-point-weights': [0.5],
            'line-color': '#60a5fa', 'line-opacity': 0.96,
            color: '#e0f2fe', 'font-size': '12px', 'font-family': "'Rajdhani', sans-serif", 'font-weight': '700',
            'text-outline-width': 1.4,
            'text-outline-color': '#020617',
            'text-background-opacity': 0,
            'text-border-opacity': 0,
            'text-margin-y': -24, 'text-margin-x': 0, 'text-rotation': 'none',
            'underlay-color': 'rgba(59, 130, 246, 0.14)',
            'underlay-padding': 2,
            'underlay-opacity': 1,
            'transition-property': 'line-color, width, opacity', 'transition-duration': '0.4s'
          }
        },
        { selector: 'edge.para-fwd', style: { 'control-point-distances': [78], 'control-point-weights': [0.43], 'text-margin-y': -30, 'text-margin-x': -4, 'z-index': 4 } },
        { selector: 'edge.para-bwd', style: { 'control-point-distances': [-78], 'control-point-weights': [0.57], 'text-margin-y': -30, 'text-margin-x': 4, 'z-index': 4 } },
        {
          selector: 'edge[source = target]', style: {
            'curve-style': 'loop', 'loop-direction': '-38deg', 'loop-sweep': '42deg',
            'text-margin-y': -28, 'text-margin-x': 14
          }
        }
      ],
      // Preset on mount; non-start auto-layout + start-pin runs below
      layout: { name: 'preset' }
    });

    // ── Two-pass layout: non-start nodes auto, start node pinned ──
    const LIVE_PADDING = 44;
    const liveAutoName = totalGroups <= 4 ? 'circle' : 'cose';
    const liveAutoOpts = liveAutoName === 'cose'
      ? { name: 'cose', padding: LIVE_PADDING, nodeRepulsion: 18000, idealEdgeLength: 145, edgeElasticity: 80, gravity: 0.18, componentSpacing: 80, nodeOverlap: 24, numIter: 900, randomize: false, fit: false, animate: false }
      : { name: liveAutoName, padding: LIVE_PADDING, spacingFactor: 1.15, avoidOverlap: true, fit: false, animate: false };

    const liveCy = mCyInstances[cyId];
    const liveStartId = startRep || null;
    const liveGhostId = startRep ? 'live-ghost' : null;
    const liveNonStart = liveCy.nodes().not('.ghost').filter(n => n.id() !== liveStartId);
    if (liveNonStart.length > 0) {
      liveNonStart.layout(liveAutoOpts).run();
    }
    mApplyStartPin(liveCy, innerDiv, liveStartId, liveGhostId, LIVE_PADDING);

    // Tag bidirectional pairs to prevent overlap
    if (liveCy) {
      liveCy.edges().not('.ghost,.start-arrow').forEach(e => {
        if (e.source().id() === e.target().id()) return;
        const rev = liveCy.edges(`[source="${e.target().id()}"][target="${e.source().id()}"]`).not('.ghost,.start-arrow');
        if (rev.length > 0) { e.addClass('para-fwd'); rev.forEach(r => r.addClass('para-bwd')); }
      });
      mResolveGraphSpacing(liveCy);
    }
    // ── Sequential animation: state → its edges → next state → its edges ──
    const liveCyAnim = mCyInstances[cyId];
    if (liveCyAnim) {
      if (shouldAnimateDetail) {
        liveCyAnim.elements().not('.ghost').not('.start-arrow').style('opacity', 0);
        liveCyAnim.elements('.ghost,.start-arrow').style('opacity', 1);
        const nodes = liveCyAnim.nodes().not('.ghost');
        let delay = 0;
        const STEP_NODE = 280;
        const STEP_EDGE = 180;
        nodes.forEach((node) => {
          setTimeout(() => {
            node.animate({ style: { opacity: 1 } }, { duration: 240, easing: 'ease-out-cubic' });
          }, delay);
          delay += STEP_NODE;
          const outEdges = node.connectedEdges().filter(e => e.source().id() === node.id() && !e.hasClass('ghost') && !e.hasClass('start-arrow'));
          outEdges.forEach((edge) => {
            const targetNode = edge.target();
            setTimeout(() => {
              edge.animate({ style: { opacity: 1 } }, { duration: 200, easing: 'ease-out-quad' });
              if (parseFloat(targetNode.style('opacity')) < 0.5) {
                targetNode.animate({ style: { opacity: 1 } }, { duration: 220, easing: 'ease-out-cubic' });
              }
            }, delay);
            delay += STEP_EDGE;
          });
        });
      } else {
        liveCyAnim.elements().style('opacity', 1);
      }
    }
  } catch (err) { container.innerHTML = `<div style="color:var(--rose);padding:12px;font-size:0.75rem">Graph error: ${esc(err.message)}</div>`; }

  // Update caption + status
  const liveStatus = document.getElementById('m-live-dfa-status');
  if (caption) {
    const reducedBy = totalOrig - totalGroups;
    if (isFinal) {
      caption.innerHTML = `<span style="color:var(--green)">✓ Final: ${totalOrig} → ${totalGroups} state${totalGroups !== 1 ? 's' : ''}${reducedBy > 0 ? ` (−${reducedBy} merged)` : '  (already minimal)'}</span>`;
      if (liveStatus) { liveStatus.textContent = 'complete ✓'; liveStatus.style.color = 'var(--green)'; }
    } else {
      caption.innerHTML = `${totalGroups} group${totalGroups !== 1 ? 's' : ''} so far — ${mStates.length} original states`;
    }
  }
}

function mPrevStep() {
  // mStepIdx points to the NEXT step to render (mNextStep increments it after rendering).
  // To go back one step: subtract 2 so that mNextStep() shows stepIdx-1.
  // Guard: if mStepIdx <= 1 we are at step 1 or the start — nothing to go back to.
  if (mStepIdx <= 1) return;
  mStepIdx = Math.max(0, mStepIdx - 2);
  const nextBtn = mGetEl('m-btn-next');
  const prevBtn = mGetEl('m-btn-prev');
  if (nextBtn) nextBtn.disabled = false;
  // Hide section C/D when going back
  const secC = document.getElementById('m-section-c');
  if (secC) secC.style.display = 'none';
  const secD = document.getElementById('m-section-d');
  if (secD) secD.style.display = 'none';
  const liveStatus = document.getElementById('m-live-dfa-status');
  if (liveStatus) { liveStatus.textContent = 'in progress…'; liveStatus.style.color = 'var(--rose)'; }
  mNextStep();
  // LOGIC-3 FIX: set disabled AFTER mNextStep() — mNextStep increments mStepIdx,
  // so checking before the call showed the wrong state (Prev disabled at step 2).
  if (prevBtn) prevBtn.disabled = (mStepIdx <= 1);
}
function mRestartProcess() {
  mStepIdx = 0;
  const stepDescription = mGetEl('m-step-description');
  if (stepDescription) stepDescription.textContent = 'Click "Next Step →" to begin the walkthrough.';
  const sv = document.getElementById('m-step-split-view');
  if (sv) sv.style.display = 'none';
  const stepCounter = mGetEl('m-step-counter');
  const prevBtn = mGetEl('m-btn-prev');
  const nextBtn = mGetEl('m-btn-next');
  if (stepCounter) stepCounter.textContent = `Step 0 / ${mStepQueue.length}`;
  if (prevBtn) prevBtn.disabled = true;
  if (nextBtn) nextBtn.disabled = false;
  mRenderProgressTrack(-1);
  // Reset live DFA panel
  const cyId = 'm-live-dfa-cy';
  if (mCyInstances[cyId]) { try { mCyInstances[cyId].destroy(); } catch (_) { } mCyInstances[cyId] = null; }
  const liveCont = document.getElementById('m-live-dfa-container');
  if (liveCont) liveCont.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--ink3);font-size:0.78rem;font-family:var(--font-mono)">Waiting for first step…</div>';
  const liveStatus = document.getElementById('m-live-dfa-status');
  if (liveStatus) { liveStatus.textContent = 'in progress…'; liveStatus.style.color = 'var(--rose)'; }
  const liveCaption = document.getElementById('m-live-dfa-caption');
  if (liveCaption) liveCaption.textContent = '';
  // Hide section C
  const secC = document.getElementById('m-section-c');
  if (secC) secC.style.display = 'none';
  // Hide section D
  const secD2 = document.getElementById('m-section-d');
  if (secD2) secD2.style.display = 'none';
  // Hide compact theory bar
  const bar = document.getElementById('m-compact-theory-bar');
  if (bar) bar.style.display = 'none';
  const hintEl = document.getElementById('m-beginner-hint');
  if (hintEl) hintEl.innerHTML = `<div class="step-hint-bar"><span class="hint-label">💡 How to use step-by-step mode</span>Press <strong>Next Step →</strong> to advance. Left panel shows algorithm state, right panel builds the minimized DFA live in parallel.</div>`;
}

// ── Toggle beginner guide expand/collapse ─────────────────────────
function toggleBeginnerGuide() {
  const coll = document.getElementById('bgb-collapsible');
  const btn = document.getElementById('bgb-toggle-btn');
  const isOpen = coll.classList.toggle('open');
  btn.classList.toggle('open', isOpen);
  // UX-2 FIX: use a named span instead of fragile text-node search
  const lbl = document.getElementById('bgb-toggle-text');
  if (lbl) lbl.textContent = isOpen ? ' Hide workflow guide ' : ' Show full workflow guide ';
}

function mRenderMyhillStepVisual(tbl, stepIdx, totalSteps) {
  // CRIT-3 FIX: use sorted states — mMarkedPairs keys are built from mSortStates(mStates)
  const displayStates = mSortStates(mStates);
  const n = displayStates.length;
  let prevTbl = stepIdx > 0 && mStepQueue[stepIdx - 1] ? mStepQueue[stepIdx - 1].table : null;
  let h = '<div style="overflow-x:auto;margin-top:2px"><table class="pair-matrix"><thead><tr><th></th>';
  for (let c = 0; c < n - 1; c++) h += `<th>${esc(displayStates[c])}</th>`;
  h += '</tr></thead><tbody>';
  for (let i = 1; i < n; i++) {
    h += `<tr><th>${esc(displayStates[i])}</th>`;
    for (let j = 0; j < n - 1; j++) {
      if (j < i) {
        const mk = tbl[pairKey(displayStates[i], displayStates[j])];
        const wasNew = prevTbl && mk && !prevTbl[pairKey(displayStates[i], displayStates[j])];
        const cls = wasNew ? 'cell-new-mark' : mk ? 'cell-marked' : 'cell-equiv';
        const title = wasNew ? ` title="Newly marked this step!"` : mk ? ` title="Distinguishable pair"` : ` title="Equivalent — may merge"`;
        h += `<td class="${cls}"${title}>${mk ? '✕' : '≡'}</td>`;
      } else h += '<td class="cell-empty">—</td>';
    }
    h += '</tr>';
  }
  const stepVisual = mGetEl('m-step-visual');
  if (stepVisual) stepVisual.innerHTML = h + '</tbody></table></div>';
}

function mRenderGroupingStepVisual(step, idx) {
  const allSteps = mGroupSteps;
  let h = '<div class="grouping-steps">';
  allSteps.slice(0, idx + 1).forEach((s, si) => {
    const isCur = (si === idx);
    const isDone = (!isCur && si < idx);
    const cls = isCur ? 'active-step' : isDone ? 'done-step' : '';
    h += `<div class="grouping-step-row ${cls}">
      <div class="gs-label">${esc(s.label.split('—')[0].trim())}</div>
      <div class="gs-groups">`;
    s.groups.forEach(g => {
      const chipCls = s.isComplete ? 'stable' : isDone ? 'stable' : isCur ? '' : '';
      h += `<div class="gs-group-chip ${chipCls}">{${g.map(esc).join(', ')}}</div>`;
    });
    h += `<div class="gs-action">${esc(s.action)}</div>`;
    h += '</div></div>';
  });
  const stepVisual = mGetEl('m-step-visual');
  if (stepVisual) stepVisual.innerHTML = h + '</div>';
}

function switchProcessTab(id) {
  ['psteps', 'pmatrix'].forEach(k => {
    const tab = document.getElementById('ptab-' + k);
    const panel = document.getElementById('ppanel-' + k);
    if (tab) tab.classList.toggle('active', k === id);
    if (panel) panel.classList.toggle('active', k === id);
  });
}

// ── Render Minimized DFA ──────────────────────────────────────────
// ── Dead-state visibility helper ──────────────────────────────────────────────
// Returns true if a minimised-group representative key represents a dead (trap)
// state that should be hidden from visual output.  A dead state is a non-accepting
// group where every member's name matches /^Dead(_\d+)?$/ — the names we assign
// in mRunMinimization.  We keep it internally for simulation correctness but
// exclude it from graphs, tables, and equivalence-class chips.
function mIsDeadGroup(repId) {
  const members = mMinGroups[repId];
  if (!members || !members.length) return false;
  if (members.some(s => mFinals.includes(s))) return false; // accepting → never dead
  return members.every(s => /^Dead(_\d+)?$/.test(s));
}

function mRenderMinDFA() {
  if (!mStates.length || !Object.keys(mMinGroups).length) return;
  const stateCountEl = mGetEl('min-state-count');
  const minTableEl = mGetEl('m-min-table');
  const eqClassesEl = mGetEl('m-equiv-classes');
  if (!stateCountEl || !minTableEl || !eqClassesEl) return;
  // Build a stable representative→group label lookup
  const minGroupKeys = mMinSortedKeys.length ? [...mMinSortedKeys] : Object.keys(mMinGroups).sort(mStateCompare);
  const findRep = s => mMinRepByState.get(s) || null;
  const groupLabel = r => mMinLabelByRep.get(r) || '?';

  // Dead-state hiding: separate visible keys (for display) from all keys (for transitions)
  const visibleKeys = minGroupKeys.filter(r => !mIsDeadGroup(r));

  // ── Build graph elements — dead state excluded from graph ──
  const minElems = [];
  const minEdgeMap = {};

  visibleKeys.forEach(repId => {
    const members = mMinGroups[repId];
    const gl = groupLabel(repId);
    const isFinal = members.some(s => mFinals.includes(s));
    const isStart = members.includes(mStart);
    minElems.push({ data: { id: repId, label: gl, isFinal, isStart } });
  });

  visibleKeys.forEach(repId => {
    // Use the first member as the canonical representative for transitions
    const rep = mMinGroups[repId][0];
    mAlpha.forEach(a => {
      const dest = mTransitions[rep] && mTransitions[rep][a];
      if (!dest) return;
      const destRep = findRep(dest);
      if (!destRep) return;
      // Skip edges that lead to the hidden dead state
      if (mIsDeadGroup(destRep)) return;
      const ek = `${repId}→${destRep}`;
      if (!minEdgeMap[ek]) minEdgeMap[ek] = { source: repId, target: destRep, labels: [] };
      if (!minEdgeMap[ek].labels.includes(a)) minEdgeMap[ek].labels.push(a);
    });
  });
  Object.values(minEdgeMap).forEach(e => minElems.push({
    data: { id: `me_${e.source}_${e.target}`, source: e.source, target: e.target, label: regexToUnicodeSup(e.labels.join(',')), multi: e.labels.length > 1 }
  }));
  mDraw2D('m-cy-min', minElems, 'm-legend-min');
  // State count shown excludes the hidden dead state
  stateCountEl.textContent = `${visibleKeys.length} state${visibleKeys.length !== 1 ? 's' : ''}`;

  // ── Minimized transition table — dead state row hidden, dead-dest cells show "—" ──
  const finalSet = new Set(mFinals);
  const sortedKeys = [...visibleKeys].sort((a, b) => {
    const aStart = mMinStart === a ? 0 : 1;
    const bStart = mMinStart === b ? 0 : 1;
    if (aStart !== bStart) return aStart - bStart;
    const aFinal = mMinGroups[a].some(s => finalSet.has(s)) ? 0 : 1;
    const bFinal = mMinGroups[b].some(s => finalSet.has(s)) ? 0 : 1;
    return aFinal !== bFinal ? aFinal - bFinal : mStateCompare(a, b);
  });

  let h = `<table class="tbl tbl-min"><thead><tr><th>State</th>`;
  mAlpha.forEach(a => (h += `<th>δ(q,${esc(a)})</th>`));
  h += '</tr></thead><tbody>';
  sortedKeys.forEach(repId => {
    const members = mMinGroups[repId];
    const gl = groupLabel(repId);
    const isFinal = members.some(s => mFinals.includes(s));
    const isStart = members.includes(mStart);
    const rep = members[0]; // canonical representative
    h += `<tr><td style="font-family:var(--font-mono);font-weight:700;color:${isStart ? 'var(--teal)' : isFinal ? 'var(--amber)' : 'var(--ink2)'}">${isStart ? '→ ' : ''}${esc(gl)}${isFinal ? ' *' : ''}</td>`;
    mAlpha.forEach(a => {
      const dest = mTransitions[rep] && mTransitions[rep][a];
      if (!dest) {
        h += '<td style="color:var(--rose)">ERR</td>'; // should never show after completeness check
        return;
      }
      const destRep = findRep(dest);
      if (!destRep) {
        h += '<td style="color:var(--ink3)">—</td>';
        return;
      }
      // If the destination is the hidden dead state, show "—" (no transition shown)
      if (mIsDeadGroup(destRep)) {
        h += '<td style="color:var(--ink3)" title="leads to dead/trap state">—</td>';
        return;
      }
      const destGl = groupLabel(destRep);
      h += `<td>${esc(destGl)}</td>`;
    });
    h += '</tr>';
  });
  minTableEl.innerHTML = h + '</tbody></table>';

  // ── Equivalence classes — dead state chip hidden ──
  let ec = '<div style="display:flex;flex-wrap:wrap;gap:7px">';
  sortedKeys.forEach(repId => {
    const members = mMinGroups[repId];
    const isFinal = members.some(s => mFinals.includes(s));
    const isStart = members.includes(mStart);
    const col = isStart ? 'var(--teal)' : isFinal ? 'var(--amber)' : 'var(--violet)';
    ec += `<div style="padding:6px 13px;border-radius:99px;border:1.5px solid ${col};background:transparent;font-family:var(--font-mono);font-size:0.76rem;color:${col}">${esc(groupLabel(repId))}</div>`;
  });
  eqClassesEl.innerHTML = ec + '</div>';
}

function mUpdateComparisonBar() {
  // LOGIC-2 FIX: use mOrigStates.length (user's unmodified input) not mStates.length
  // (which is post-pruning and may differ after unreachable removal + dead-state addition).
  // Also exclude the hidden dead state from the minimised count for display.
  const origN = mOrigStates.length;
  const visibleMinKeys = (mMinSortedKeys.length ? [...mMinSortedKeys] : Object.keys(mMinGroups).sort(mStateCompare))
    .filter(r => !mIsDeadGroup(r));
  const minN = visibleMinKeys.length;
  const origCountEl = mGetEl('cmp-orig-n');
  const minCountEl = mGetEl('cmp-min-n');
  const reductEl = document.getElementById('cmp-reduction');
  if (origCountEl) origCountEl.textContent = origN;
  if (minCountEl) minCountEl.textContent = minN;
  const saved = origN - minN;
  const pct = origN > 0 ? Math.round(saved / origN * 100) : 0;
  if (!reductEl) return;
  if (saved > 0) {
    reductEl.innerHTML = `↓ ${pct}% smaller`;
    // Add beginner explanation to comparison bar
    const cmpNote = document.getElementById('cmp-beginner-note');
    if (cmpNote) cmpNote.innerHTML = `<div class="step-hint-bar" style="margin-top:10px"><span class="hint-label">🎉 What does this mean?</span>Your original DFA had <strong>${origN} states</strong> but the minimized version has only <strong>${minN} state${minN !== 1 ? 's' : ''}</strong> — a <strong>${pct}% reduction</strong>! Both machines accept exactly the same set of strings. The minimized DFA is provably the smallest possible DFA for this language.</div>`;
  } else {
    reductEl.innerHTML = `Already minimal`;
    const cmpNote = document.getElementById('cmp-beginner-note');
    if (cmpNote) cmpNote.innerHTML = `<div class="step-hint-bar" style="margin-top:10px"><span class="hint-label">ℹ️ Already Minimal!</span>Your DFA cannot be made smaller — every state is truly unique and necessary. No two states behave identically for all possible input strings. This DFA is already the <strong>canonical minimal DFA</strong> for its language.</div>`;
  }
}

// ── Comparison Section D Renderer ─────────────────────────────────
function mRenderComparison() {
  if (!mStates.length || !Object.keys(mMinGroups).length) return;
  const diffEl = mGetEl('m-diff-table');
  const transEl = mGetEl('m-diff-trans-table');

  // Stable findRep — returns the mMinGroups key for state s, or null
  const findRep = s => mMinRepByState.get(s) || null;
  const groupLabel = r => mMinLabelByRep.get(r) || '?';

  const origN = mStates.length;
  const minKeys = mMinSortedKeys.length ? [...mMinSortedKeys] : Object.keys(mMinGroups).sort(mStateCompare);
  const minN = minKeys.length;

  // ── Stable "removed" detection: a state is removed if it is in a merged group
  //    AND it is NOT the representative key itself. The representative is the
  //    union-find root, which IS the mMinGroups key. All other members are "removed".
  // Build a Set of representatives for O(1) lookup
  const repSet = new Set(minKeys);
  const removedStates = mStates.filter(s => {
    const rep = findRep(s);
    return rep !== null && mMinGroups[rep].length > 1 && !repSet.has(s);
  });
  const mergedGroups = minKeys.filter(r => mMinGroups[r].length > 1);
  const keptStates = minKeys.filter(r => mMinGroups[r].length === 1);

  const origBadge = document.getElementById('m-cmp-orig-badge');
  const minBadge = document.getElementById('m-cmp-min-badge');
  if (origBadge) origBadge.textContent = `${origN} state${origN !== 1 ? 's' : ''}`;
  if (minBadge) minBadge.textContent = `${minN} state${minN !== 1 ? 's' : ''}`;

  // ── Summary diff chips ──
  const chipsEl = document.getElementById('m-diff-chips');
  if (chipsEl) {
    let ch = '';
    if (removedStates.length) ch += `<span class="diff-chip diff-chip-removed">✕ ${removedStates.length} state${removedStates.length !== 1 ? 's' : ''} removed</span>`;
    if (mergedGroups.length) ch += `<span class="diff-chip diff-chip-merged">⊕ ${mergedGroups.length} group${mergedGroups.length !== 1 ? 's' : ''} merged</span>`;
    if (keptStates.length) ch += `<span class="diff-chip diff-chip-kept">✓ ${keptStates.length} state${keptStates.length !== 1 ? 's' : ''} unchanged</span>`;
    const saved = origN - minN;
    if (saved > 0) ch += `<span class="diff-chip diff-chip-removed">↓ ${Math.round(saved / origN * 100)}% smaller</span>`;
    else ch += `<span class="diff-chip diff-chip-same">Already minimal</span>`;
    chipsEl.innerHTML = ch;
  }

  // ── Draw original graph with removed-state highlights ──
  const origElems = [];
  mStates.forEach(s => {
    const rep = findRep(s);
    const willMerge = rep !== null && mMinGroups[rep].length > 1;
    // FIX: isRemoved = in a merged group AND not the union-find representative key
    const isRemoved = willMerge && !repSet.has(s);
    const nodeSize = 64;
    const nodeFontSize = '12px';
    origElems.push({ data: { id: s, label: s, isFinal: mFinals.includes(s), isStart: s === mStart, isRemoved, isMerged: willMerge && !isRemoved, nodeSize, nodeFontSize } });
  });
  const origEdgeMap = {};
  mStates.forEach(s => mAlpha.forEach(a => {
    const to = mTransitions[s] && mTransitions[s][a]; if (!to) return;
    const k = `${s}→${to}`;
    if (!origEdgeMap[k]) origEdgeMap[k] = { source: s, target: to, labels: [] };
    if (!origEdgeMap[k].labels.includes(a)) origEdgeMap[k].labels.push(a);
  }));
  Object.values(origEdgeMap).forEach(e => origElems.push({ data: { id: `oe_${e.source}_${e.target}`, source: e.source, target: e.target, label: regexToUnicodeSup(e.labels.join(',')) } }));

  // Draw with special style for removed/merged states
  mDrawComparison('m-cmp-cy-orig', origElems, 'm-cmp-legend-orig', false);

  // ── Draw minimized graph ──
  const minElems = [];
  minKeys.forEach(rep => {
    const members = mMinGroups[rep];
    const lbl = groupLabel(rep);
    // Pre-compute size: merged labels need wider nodes
    const nodeSize = members.length > 1 ? Math.max(72, lbl.length * 9 + 20) : 64;
    const nodeFontSize = nodeSize > 90 ? '9px' : nodeSize > 72 ? '10px' : '12px';
    minElems.push({ data: { id: rep, label: lbl, isFinal: members.some(s => mFinals.includes(s)), isStart: members.includes(mStart), isMerged: members.length > 1, nodeSize, nodeFontSize } });
  });
  const minEdgeMap = {};
  minKeys.forEach(rep => {
    const member = mMinGroups[rep][0];
    mAlpha.forEach(a => {
      const dest = mTransitions[member] && mTransitions[member][a]; if (!dest) return;
      const destRep = findRep(dest); if (!destRep) return;
      const ek = `${rep}→${destRep}`;
      if (!minEdgeMap[ek]) minEdgeMap[ek] = { source: rep, target: destRep, labels: [] };
      if (!minEdgeMap[ek].labels.includes(a)) minEdgeMap[ek].labels.push(a);
    });
  });
  Object.values(minEdgeMap).forEach(e => minElems.push({ data: { id: `me2_${e.source}_${e.target}`, source: e.source, target: e.target, label: regexToUnicodeSup(e.labels.join(',')) } }));
  mDrawComparison('m-cmp-cy-min', minElems, 'm-cmp-legend-min', true);

  // ── State changes detail table ──
  if (diffEl) {
    let h = `<table class="diff-tbl"><thead><tr>
      <th>Original State</th><th>Status</th><th>Merged Into</th><th>Role</th>
    </tr></thead><tbody>`;
    mStates.forEach(s => {
      const rep = findRep(s);
      const members = (rep && mMinGroups[rep]) || [s];
      const isMerged = members.length > 1;
      // FIX: stable isRemoved check using repSet
      const isRemoved = isMerged && !repSet.has(s);
      const isStart = s === mStart, isFinal = mFinals.includes(s);
      const role = (isStart && isFinal) ? 'Start + Final' : isStart ? 'Start' : isFinal ? 'Final' : 'Normal';
      const rowCls = isRemoved ? 'diff-row-removed' : isMerged ? 'diff-row-merged' : 'diff-row-kept';
      const status = isRemoved ? '✕ Removed (merged)' : isMerged ? `⊕ Merged → ${groupLabel(rep)}` : '✓ Kept as-is';
      const mergedInto = isMerged ? groupLabel(rep) : '—';
      h += `<tr class="${rowCls}"><td>${esc(s)}</td><td>${status}</td><td>${esc(mergedInto)}</td><td>${role}</td></tr>`;
    });
    diffEl.innerHTML = h + '</tbody></table>';
  }

  // ── Transition comparison table ──
  if (transEl) {
    // Build min trans for lookup — maps repKey → {sym → destRepKey}
    const minTrans = {};
    minKeys.forEach(r => {
      minTrans[r] = {};
      mAlpha.forEach(a => {
        const dest = mTransitions[mMinGroups[r][0]] && mTransitions[mMinGroups[r][0]][a];
        if (dest) { const dr = findRep(dest); if (dr) minTrans[r][a] = dr; }
      });
    });

    let h = `<table class="diff-tbl"><thead><tr><th>State</th>`;
    mAlpha.forEach(a => h += `<th>δ(·,${esc(a)}) — Original</th><th>δ(·,${esc(a)}) — Minimized</th>`);
    h += `<th>Change</th></tr></thead><tbody>`;

    // Sort rows: start first
    const sortedMinKeys = [...minKeys].sort((a, b) => {
      const as = mMinGroups[a].includes(mStart) ? 0 : 1;
      const bs = mMinGroups[b].includes(mStart) ? 0 : 1;
      return as - bs;
    });
    sortedMinKeys.forEach(rep => {
      const members = mMinGroups[rep];
      const lbl = groupLabel(rep);
      const isStart = members.includes(mStart), isFinal = members.some(s => mFinals.includes(s));
      const isMerged = members.length > 1;
      const rowCls = isMerged ? 'diff-row-merged' : 'diff-row-kept';
      let changed = false;
      let cells = '';
      mAlpha.forEach(a => {
        // Show each member's original destination for clarity in merged rows
        const origDestsRaw = members.map(s => {
          const d = mTransitions[s] && mTransitions[s][a];
          return d || '—';
        });
        const origDestsUniq = [...new Set(origDestsRaw)];
        const origStr = origDestsUniq.join('/');
        // Minimized destination
        const minDestRep = minTrans[rep] ? minTrans[rep][a] : null;
        const minDestLbl = minDestRep ? groupLabel(minDestRep) : '—';
        // Mark changed only if multiple distinct original destinations collapsed into one
        const isCellChanged = origDestsUniq.length > 1;
        if (isCellChanged) changed = true;
        cells += `<td>${esc(origStr)}</td><td class="${isCellChanged ? 'diff-cell-changed' : ''}">${esc(minDestLbl)}</td>`;
      });
      const statusBadge = isMerged ? `<span style="color:var(--amber);font-size:0.7rem">⊕ merged</span>`
        : changed ? `<span style="color:var(--teal);font-size:0.7rem">✎ simplified</span>`
          : `<span style="color:var(--ink3);font-size:0.7rem">— same</span>`;
      h += `<tr class="${rowCls}"><td style="font-weight:700;color:${isStart ? 'var(--teal)' : isFinal ? 'var(--amber)' : 'var(--violet)'}">${isStart ? '→ ' : ''}${esc(lbl)}${isFinal ? ' *' : ''}</td>${cells}<td>${statusBadge}</td></tr>`;
    });
    transEl.innerHTML = h + '</tbody></table>';
  }
}

// ── Draw a comparison graph (supports removed/merged node highlighting) ──
function mDrawComparison(id, elems, legendId, isMin, retryCount = 0) {
  if (mCyInstances[id]) { try { mCyInstances[id].destroy(); } catch (_) { } mCyInstances[id] = null; }
  const container = document.getElementById(id); if (!container) return;
  if (!container.isConnected) return;
  container.innerHTML = '';
  if (typeof cytoscape !== 'function') {
    container.innerHTML = '<p style="color:var(--rose);padding:16px;font-size:0.8rem">Graph library unavailable.</p>';
    return;
  }
  if (container.offsetWidth === 0 || container.offsetHeight === 0) {
    if (retryCount >= 10) return;
    setTimeout(() => {
      const nextContainer = document.getElementById(id);
      if (nextContainer && nextContainer.isConnected) {
        mDrawComparison(id, elems, legendId, isMin, retryCount + 1);
      }
    }, 50);
    return;
  }

  const startNode = elems.find(e => e.data && e.data.isStart && !e.data.source);
  if (legendId) {
    const le = document.getElementById(legendId); if (le) {
      const finals = elems.filter(e => e.data && e.data.isFinal && !e.data.source);
      const sl = startNode ? esc(startNode.data.label) : '(none)';
      const fl = finals.length ? finals.map(n => esc(n.data.label)).join(', ') : '(none)';
      le.innerHTML = `<div class="leg-row"><span class="leg-dot ld-start"></span><span class="leg-text">▶ Start: <strong style="color:var(--teal)">${sl}</strong></span><span style="width:1px;height:16px;background:var(--border);display:inline-block;margin:0 6px"></span><span class="leg-dot ld-final"></span><span class="leg-text">◉ Final: <strong style="color:#EF4444">${fl}</strong></span>${!isMin ? `<span style="margin-left:10px;font-size:0.7rem;color:var(--rose)">✕ = removed/merged</span>` : '<span style="margin-left:10px;font-size:0.7rem;color:var(--amber)">⊕ = merged group</span>'}</div>`;
    }
  }

  const all = [...elems];
  if (startNode) {
    all.push({ data: { id: `${id}-ghost`, label: '' }, classes: 'ghost' });
    all.push({ data: { source: `${id}-ghost`, target: startNode.data.id, label: '' }, classes: 'start-arrow' });
  }

  const nc = elems.filter(e => !e.data.source).length;
  const edgeCount = elems.length - nc;
  const shouldAnimate = nc <= 12 && edgeCount <= 24;
  const LAYOUT_PADDING = 80;
  const autoLayoutName = nc <= 4 ? 'circle' : 'cose';
  const autoLayoutOpts = autoLayoutName === 'cose'
    ? { name: 'cose', padding: LAYOUT_PADDING, nodeRepulsion: 22000, idealEdgeLength: 180, edgeElasticity: 80, gravity: 0.18, componentSpacing: 110, nodeOverlap: 32, numIter: 1400, randomize: false, fit: false, animate: false }
    : { name: autoLayoutName, padding: LAYOUT_PADDING, spacingFactor: 1.25, avoidOverlap: true, fit: false, animate: false };

  try {
    mCyInstances[id] = cytoscape({
      container, elements: all,
      style: [
        // ── Base: all nodes get label + sizing ──
        {
          selector: 'node', style: {
            label: 'data(label)',
            shape: 'ellipse',
            'background-color': '#030712',
            'border-width': 2.4,
            'border-color': '#EAB308',
            color: '#FACC15',
            'text-valign': 'center', 'text-halign': 'center',
            'text-wrap': 'none',
            'text-outline-width': 1.6,
            'text-outline-color': '#020617',
            'min-zoomed-font-size': 0,
            width: 64, height: 64,
            'font-size': '13px', 'font-family': "'Rajdhani', sans-serif", 'font-weight': '700',
            'shadow-blur': 26, 'shadow-color': 'rgba(234, 179, 8, 0.82)', 'shadow-offset-x': 0, 'shadow-offset-y': 0,
            'underlay-opacity': 0,
            'overlay-opacity': 0,
            'transition-property': 'background-color, border-color, shadow-color, underlay-color', 'transition-duration': '0.3s'
          }
        },
        {
          selector: 'node[?isStart]', style: {
            'border-color': '#3B82F6', 'border-width': 2.8, 'background-color': '#030712',
            'shadow-color': 'rgba(59, 130, 246, 0.95)', 'shadow-blur': 30,
            'underlay-opacity': 0,
            color: '#60A5FA', 'min-zoomed-font-size': 0
          }
        },
        {
          selector: 'node[?isFinal]', style: {
            'border-width': 4.4, 'border-style': 'double', 'border-color': '#EF4444', 'background-color': '#030712',
            'shadow-color': 'rgba(239, 68, 68, 0.95)', 'shadow-blur': 30,
            'underlay-opacity': 0,
            color: '#F87171', 'min-zoomed-font-size': 0
          }
        },
        {
          selector: 'node[?isStart][?isFinal]', style: {
            'border-color': '#3B82F6', 'border-width': 4.8, 'border-style': 'double', 'background-color': '#030712',
            'shadow-color': 'rgba(59, 130, 246, 0.95)', 'shadow-blur': 34,
            'underlay-opacity': 0,
            color: '#60A5FA', 'min-zoomed-font-size': 0
          }
        },
        // ── Merged survivor in original DFA — amber highlight ──
        {
          selector: 'node[?isMerged]', style: {
            label: 'data(label)',
            shape: 'ellipse',
            'border-color': '#EAB308', 'border-width': 2.8, 'border-style': 'solid',
            'background-color': '#030712',
            'shadow-color': 'rgba(234, 179, 8, 0.82)', 'shadow-blur': 28,
            'underlay-opacity': 0,
            color: '#FACC15', 'text-outline-width': 1.4, 'text-outline-color': '#020617',
            'text-valign': 'center', 'text-halign': 'center', 'min-zoomed-font-size': 0,
            'font-size': 'data(nodeFontSize)',
            width: 'data(nodeSize)', height: 'data(nodeSize)'
          }
        },
        // ── Merged group node in minimized DFA — violet glow ──
        {
          selector: 'node[?isMerged][!isStart][!isFinal]', style: {
            label: 'data(label)',
            shape: 'ellipse',
            'border-color': '#EAB308', 'border-width': 2.8, 'background-color': '#030712',
            'shadow-color': 'rgba(234, 179, 8, 0.82)', 'shadow-blur': 28,
            'underlay-opacity': 0,
            color: '#FACC15', 'text-outline-width': 1.4, 'text-outline-color': '#020617',
            'text-valign': 'center', 'text-halign': 'center', 'min-zoomed-font-size': 0,
            'font-size': 'data(nodeFontSize)',
            width: 'data(nodeSize)', height: 'data(nodeSize)'
          }
        },
        // ── REMOVED state — rose dashed, full opacity, name always shown ──
        // Must come LAST so it overrides isFinal/isStart/isMerged
        {
          selector: 'node[?isRemoved]', style: {
            label: 'data(label)',
            shape: 'ellipse',
            'border-color': 'rgba(107, 114, 128, 0.7)', 'border-width': 2.6, 'border-style': 'dashed',
            'background-color': '#0b1120',
            'shadow-color': 'rgba(107, 114, 128, 0.2)', 'shadow-blur': 6,
            'underlay-opacity': 0,
            color: 'rgba(107, 114, 128, 0.7)', 'text-outline-width': 1.2, 'text-outline-color': '#020617',
            'text-valign': 'center', 'text-halign': 'center', 'min-zoomed-font-size': 0,
            opacity: 0.7
          }
        },
        {
          selector: 'node[label = "Dead"], node[id = "Dead"]', style: {
            shape: 'ellipse',
            'border-color': 'rgba(107, 114, 128, 0.7)',
            'background-color': '#0b1120',
            'shadow-color': 'rgba(107, 114, 128, 0.18)',
            'shadow-blur': 6,
            'underlay-opacity': 0,
            color: 'rgba(107, 114, 128, 0.7)',
            opacity: 0.7
          }
        },
        { selector: '.ghost', style: { width: 1, height: 1, opacity: 0, 'background-opacity': 0, 'border-width': 0 } },
        {
          selector: '.start-arrow', style: {
            width: 2.8,
            'line-color': '#38bdf8',
            'target-arrow-color': '#38bdf8',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 1.5,
            'curve-style': 'straight',
            'line-style': 'dashed',
            'line-dash-pattern': [8, 6],
            'underlay-color': 'rgba(56, 189, 248, 0.28)',
            'underlay-padding': 4,
            'underlay-opacity': 1
          }
        },
        {
          selector: 'edge', style: {
            label: 'data(label)', width: 2.3,
            'target-arrow-shape': 'triangle', 'target-arrow-color': '#7dd3fc', 'arrow-scale': 1.38,
            'curve-style': 'bezier', 'control-point-distances': [0], 'control-point-weights': [0.5],
            'line-color': '#60a5fa', 'line-opacity': 0.96,
            color: '#e0f2fe', 'font-size': '13px', 'font-family': "'Rajdhani', sans-serif", 'font-weight': '700',
            'text-outline-width': 1.5,
            'text-outline-color': '#020617',
            'text-background-opacity': 0,
            'text-border-opacity': 0,
            'text-margin-y': -28, 'text-margin-x': 0, 'text-rotation': 'none',
            'underlay-color': 'rgba(59, 130, 246, 0.14)',
            'underlay-padding': 2,
            'underlay-opacity': 1,
            'transition-property': 'line-color, width, opacity', 'transition-duration': '0.4s'
          }
        },
        { selector: 'edge[source = target]', style: { 'curve-style': 'loop', 'loop-direction': '-38deg', 'loop-sweep': '42deg', 'text-margin-y': -32, 'text-margin-x': 16 } },
        { selector: 'edge.para-fwd', style: { 'control-point-distances': [92], 'control-point-weights': [0.43], 'text-margin-y': -34, 'text-margin-x': -4, 'z-index': 4 } },
        { selector: 'edge.para-bwd', style: { 'control-point-distances': [-92], 'control-point-weights': [0.57], 'text-margin-y': -34, 'text-margin-x': 4, 'z-index': 4 } }
      ],
      layout: { name: 'preset' }
    });
    const cy = mCyInstances[id];

    // ── Two-pass layout: non-start nodes auto, start node pinned ──
    const startId = startNode ? startNode.data.id : null;
    const ghostId = startNode ? `${id}-ghost` : null;
    const nonStartNodes = cy.nodes().not('.ghost').filter(n => n.id() !== startId);
    if (nonStartNodes.length > 0) {
      nonStartNodes.layout(autoLayoutOpts).run();
    }
    mApplyStartPin(cy, container, startId, ghostId, LAYOUT_PADDING);

    // Tag bidirectional edges
    cy.edges().not('.ghost,.start-arrow').forEach(e => {
      if (e.source().id() === e.target().id()) return;
      const rev = cy.edges(`[source="${e.target().id()}"][target="${e.source().id()}"]`).not('.ghost,.start-arrow');
      if (rev.length > 0) { e.addClass('para-fwd'); rev.forEach(r => r.addClass('para-bwd')); }
    });
    // Entrance animation — all nodes/edges fade in cleanly
    mResolveGraphSpacing(cy);
    if (shouldAnimate) {
      cy.edges().not('.ghost,.start-arrow').style('opacity', 0);
      cy.elements('.start-arrow').style('opacity', 1);
      cy.nodes().not('.ghost').forEach((n, i) => {
        n.style('opacity', 0);
        setTimeout(() => n.animate({ style: { opacity: 1 } }, { duration: 260, easing: 'ease-out-cubic' }), i * 90);
      });
      cy.edges().not('.ghost,.start-arrow').forEach((e, i) => {
        setTimeout(() => e.animate({ style: { opacity: 1 } }, { duration: 200, easing: 'ease-out-quad' }), nc * 90 + i * 60);
      });
    } else {
      cy.elements().style('opacity', 1);
    }
  } catch (err) { container.innerHTML = `<p style="color:var(--rose);padding:16px;font-size:0.8rem">Graph error: ${esc(err.message)}</p>`; }
}

// ── Simulate ──────────────────────────────────────────────────────
function mSimulate() {
  const inputEl = mGetEl('m-sim-input');
  const out = mGetEl('m-sim-output');
  if (!inputEl || !out) return;
  const inp = inputEl.value.trim();
  if (!mStates.length || !Object.keys(mMinGroups).length) {
    out.innerHTML = '<div class="sim-result reject"><div class="sim-verdict">⚠ Run minimization first.</div></div>'; return;
  }

  // FIX: tokenise by matching alphabet symbols longest-first (handles multi-char symbols like "ab", "10")
  let chars = [];
  if (inp === '') {
    chars = [];
  } else {
    // Sort alpha descending by length so longer symbols match first
    const sortedAlpha = [...mAlpha].sort((a, b) => b.length - a.length);
    let pos = 0;
    while (pos < inp.length) {
      const sym = sortedAlpha.find(a => inp.startsWith(a, pos));
      if (!sym) {
        out.innerHTML = `<div class="sim-result reject">⚠ Character at position ${pos} ("${esc(inp[pos])}") does not match any alphabet symbol: {${mAlpha.map(esc).join(', ')}}</div>`;
        return;
      }
      chars.push(sym);
      pos += sym.length;
    }
  }

  const findRepSim = s => mMinRepByState.get(s) || null;
  const groupLabelSim = r => mMinLabelByRep.get(r) || '?';

  // ── Original DFA simulation ──
  let cur = mStart, oPath = [mStart], oOk = true;
  for (const sym of chars) {
    const nxt = mTransitions[cur] && mTransitions[cur][sym];
    if (!nxt) { oOk = false; break; }
    cur = nxt;
    oPath.push(cur);
  }
  const oAcc = oOk && mFinals.includes(cur);

  // ── Minimized DFA simulation (uses same transitions, shows group labels) ──
  let mCurState = mStart, mPath = [], mOk = true;
  const s0rep = findRepSim(mStart);
  mPath.push(groupLabelSim(s0rep));
  for (const sym of chars) {
    const nxt = mTransitions[mCurState] && mTransitions[mCurState][sym];
    if (!nxt) { mOk = false; break; }
    mCurState = nxt;
    const r = findRepSim(mCurState);
    mPath.push(groupLabelSim(r));
  }
  const mAcc = mOk && mFinals.includes(mCurState);

  // Both must agree — if they disagree there is a bug
  if (oAcc !== mAcc) {
    console.error('[Simulate] MISMATCH: orig=', oAcc, 'min=', mAcc, 'input=', inp);
  }

  const arrow = arr => arr.map(esc).join(' <span class="sim-arrow-inline">→</span> ');
  const inputDisp = chars.length === 0 ? 'ε (empty string)' : chars.map(esc).join(' · ');
  out.innerHTML = `
    <div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--ink3);margin-bottom:8px">Input: <strong style="color:var(--ink)">${inputDisp}</strong> (${chars.length} symbol${chars.length !== 1 ? 's' : ''})</div>
    <div class="sim-result ${oAcc ? 'accept' : 'reject'}">
      <div class="sim-label">Original DFA</div>
      <div class="sim-path">${arrow(oPath)}</div>
      <div class="sim-verdict">${oAcc ? '✓ ACCEPTED' : '✗ REJECTED'}</div>
    </div>
    <div class="sim-result ${mAcc ? 'accept' : 'reject'}">
      <div class="sim-label">Minimized DFA</div>
      <div class="sim-path">${arrow(mPath)}</div>
      <div class="sim-verdict">${mAcc ? '✓ ACCEPTED' : '✗ REJECTED'}</div>
    </div>`;
}

// ══════════════════════════════════════════════════════════════════
// ── Shared: pin start node, layout everything else ────────────────
//
// The start (initial) state must always appear at a fixed, straight
// position on the left side of the graph — exactly as textbook DFA
// diagrams show it — regardless of how many other states exist or
// which auto-layout algorithm is chosen.
//
// Strategy (works with every Cytoscape layout algorithm):
//   1. Run the chosen auto-layout (circle / cose / preset) on ALL
//      non-ghost, non-start-arrow nodes first with animate:false.
//   2. After the layout settles, lock the start node at a computed
//      left-centre position based on the container dimensions.
//   3. Reposition the ghost node just to the left of the start node
//      so the dashed entry arrow always points straight from the left.
//   4. Fit the viewport to all real nodes.
//
// Called from mDraw2D, mDrawComparison, and mRenderLiveDFA after the
// cytoscape instance is created but before any entrance animation.
//
// Parameters:
//   cy          — the Cytoscape instance
//   containerEl — the DOM element used as the cy container
//   startId     — the data.id of the start node (not the ghost id)
//   ghostId     — the data.id of the ghost node (or null if none)
//   padding     — graph padding used in layout (for fit call)
// ══════════════════════════════════════════════════════════════════
function mApplyStartPin(cy, containerEl, startId, ghostId, padding) {
  if (!cy || !startId) return;

  const startNode = cy.getElementById(startId);
  if (!startNode || startNode.length === 0) return;

  // Container dimensions — fall back to sensible defaults if zero
  const W = (containerEl && containerEl.offsetWidth > 0) ? containerEl.offsetWidth : 600;
  const H = (containerEl && containerEl.offsetHeight > 0) ? containerEl.offsetHeight : 400;

  // Reference image: start node sits roughly 22 % from the left edge,
  // vertically centred. The entry arrow is long (~130 px), dead-straight,
  // horizontal. 0.22 * W gives enough left margin for the arrow without
  // eating into the space the other nodes need on the right.
  const pinX = Math.round(W * 0.18);
  const pinY = Math.round(H * 0.50);

  // Lock the start node at its fixed position
  startNode.position({ x: pinX, y: pinY });
  startNode.lock();

  // Ghost sits 130 px to the left — this is the arrowhead origin.
  // 130 px matches the long dashed line visible in the reference image.
  if (ghostId) {
    const ghost = cy.getElementById(ghostId);
    if (ghost && ghost.length > 0) {
      ghost.position({ x: pinX - Math.max(120, Math.round(W * 0.16)), y: pinY });
      ghost.lock();
    }
  }

  // Fit viewport to all real (non-ghost) nodes
  const realNodes = cy.nodes().not('.ghost');
  if (realNodes.length > 0) {
    cy.fit(realNodes, padding);
  }
}

function mResolveGraphSpacing(cy) {
  if (!cy) return;
  const edges = cy.edges().not('.ghost,.start-arrow');
  if (!edges.length) return;

  const distPointToSegment = (p, a, b) => {
    const abx = b.x - a.x, aby = b.y - a.y;
    const apx = p.x - a.x, apy = p.y - a.y;
    const ab2 = (abx * abx) + (aby * aby) || 1;
    const t = Math.max(0, Math.min(1, ((apx * abx) + (apy * aby)) / ab2));
    const x = a.x + (abx * t), y = a.y + (aby * t);
    return Math.hypot(p.x - x, p.y - y);
  };
  const ccw = (a, b, c) => ((c.y - a.y) * (b.x - a.x)) > ((b.y - a.y) * (c.x - a.x));
  const segmentsIntersect = (a, b, c, d) => ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
  const labelBox = (edge, point) => {
    const label = String(edge.data('label') || '');
    const width = Math.max(16, label.length * 7.2);
    return { left: point.x - width / 2, right: point.x + width / 2, top: point.y - 9, bottom: point.y + 9 };
  };
  const boxOverlap = (a, b) => !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);

  edges.removeClass('para-fwd para-bwd');
  edges.forEach(e => e.removeStyle('control-point-distances control-point-weights text-margin-x text-margin-y loop-direction loop-sweep'));

  edges.forEach(e => {
    if (e.source().id() === e.target().id()) return;
    const rev = edges.filter(x => x.source().id() === e.target().id() && x.target().id() === e.source().id());
    if (rev.length > 0) {
      e.addClass('para-fwd');
      rev.forEach(r => r.addClass('para-bwd'));
    }
  });

  const nonLoops = edges.filter(e => e.source().id() !== e.target().id());
  const crossings = new Map();
  for (let i = 0; i < nonLoops.length; i++) {
    for (let j = i + 1; j < nonLoops.length; j++) {
      const a = nonLoops[i], b = nonLoops[j];
      if (a.source().id() === b.source().id() || a.source().id() === b.target().id() || a.target().id() === b.source().id() || a.target().id() === b.target().id()) continue;
      if (segmentsIntersect(a.source().position(), a.target().position(), b.source().position(), b.target().position())) {
        crossings.set(a.id(), (crossings.get(a.id()) || 0) + 1);
        crossings.set(b.id(), (crossings.get(b.id()) || 0) + 1);
      }
    }
  }

  edges.forEach(e => {
    if (e.source().id() === e.target().id()) {
      e.style('loop-direction', '-18deg');
      e.style('loop-sweep', '34deg');
      return;
    }
    let cp = 0;
    if (e.hasClass('para-fwd')) cp = 92;
    if (e.hasClass('para-bwd')) cp = -92;
    const extra = (crossings.get(e.id()) || 0) * 28;
    if (extra) cp = cp === 0 ? ((e.id() < e.target().id() ? 1 : -1) * extra) : (cp + (Math.sign(cp) * extra));
    e.style('control-point-distances', [cp]);
    e.style('control-point-weights', [0.5]);
  });

  const segments = nonLoops.map(e => ({ edge: e, a: e.source().position(), b: e.target().position() }));
  const placed = [];
  edges.sort((a, b) => String(b.data('label') || '').length - String(a.data('label') || '').length).forEach(e => {
    const s = e.source().position();
    const t = e.target().position();

    if (e.source().id() === e.target().id()) {
      const angle = -18 * Math.PI / 180;
      const point = { x: s.x + Math.cos(angle) * 66, y: s.y + Math.sin(angle) * 66 };
      e.style('text-margin-x', 24);
      e.style('text-margin-y', -38);
      placed.push({ box: labelBox(e, point) });
      return;
    }

    const cpRaw = e.style('control-point-distances');
    const cp = Number(Array.isArray(cpRaw) ? cpRaw[0] : cpRaw) || 0;
    const dx = t.x - s.x, dy = t.y - s.y;
    const len = Math.hypot(dx, dy) || 1;
    const normal = { x: -dy / len, y: dx / len };
    const anchor = { x: (s.x + t.x) / 2 + normal.x * cp * 0.35, y: (s.y + t.y) / 2 + normal.y * cp * 0.35 };
    let offset = 28 + (Math.abs(cp) > 0 ? 8 : 0);
    let sign = cp === 0 ? -1 : Math.sign(cp);
    let point = { x: anchor.x + normal.x * offset * sign, y: anchor.y + normal.y * offset * sign };
    let box = labelBox(e, point);
    for (let k = 0; k < 10; k++) {
      const labelClash = placed.some(p => boxOverlap(box, p.box));
      const edgeClash = segments.some(seg => seg.edge.id() !== e.id() && distPointToSegment(point, seg.a, seg.b) < 18);
      if (!labelClash && !edgeClash) break;
      if (k === 4) sign *= -1;
      offset += 8;
      point = { x: anchor.x + normal.x * offset * sign, y: anchor.y + normal.y * offset * sign };
      box = labelBox(e, point);
    }
    e.style('text-margin-x', Math.round(point.x - anchor.x));
    e.style('text-margin-y', Math.round(point.y - anchor.y));
    placed.push({ box });
  });
}

// ── 2D Graph helper ────────────────────────────────────────────────
function mDraw2D(id, elems, legendId, retryCount = 0) {
  if (mCyInstances[id]) { try { mCyInstances[id].destroy(); } catch (_) { } mCyInstances[id] = null; }
  const container = document.getElementById(id); if (!container) return;
  if (!container.isConnected) return;
  container.innerHTML = '';
  if (typeof cytoscape !== 'function') {
    container.innerHTML = '<p style="color:var(--rose);padding:16px;font-size:0.8rem">Graph library unavailable.</p>';
    return;
  }
  // Dimension guard: if the container has zero size (parent is still display:none or
  // hasn't been painted yet), Cytoscape will silently fail and leave a broken instance.
  // Retry once after a short delay to let the browser finish its layout pass.
  if (container.offsetWidth === 0 || container.offsetHeight === 0) {
    if (retryCount >= 10) return;
    setTimeout(() => {
      const nextContainer = document.getElementById(id);
      if (nextContainer && nextContainer.isConnected) {
        mDraw2D(id, elems, legendId, retryCount + 1);
      }
    }, 50);
    return;
  }
  const startNode = elems.find(e => e.data && e.data.isStart && !e.data.source);
  const finalNodes = elems.filter(e => e.data && e.data.isFinal && !e.data.source);
  if (legendId) {
    const le = document.getElementById(legendId); if (le) {
      const sl = startNode ? esc(startNode.data.label) : '(none)';
      const fl = finalNodes.length ? finalNodes.map(n => esc(n.data.label)).join(', ') : '(none)';
      le.innerHTML = `<div class="leg-row"><span class="leg-dot ld-start"></span><span class="leg-text">▶ Initial: <strong style="color:var(--teal)">${sl}</strong></span><span style="width:1px;height:16px;background:var(--border);display:inline-block;margin:0 4px"></span><span class="leg-dot ld-final"></span><span class="leg-text">◉ Final: <strong style="color:#EF4444">${fl}</strong></span></div>`;
    }
  }
  const all = [...elems];
  if (startNode) {
    all.push({ data: { id: `${id}-ghost`, label: '' }, classes: 'ghost' });
    all.push({ data: { source: `${id}-ghost`, target: startNode.data.id, label: '' }, classes: 'start-arrow' });
  }
  const nc = elems.filter(e => !e.data.source).length;
  const edgeCount = elems.length - nc;
  const shouldAnimate = nc <= 12 && edgeCount <= 24;
  // Start with preset layout so we control all positions ourselves.
  // The auto-layout for non-start nodes runs as a post-mount sub-layout.
  const LAYOUT_PADDING = 90;
  const autoLayoutName = nc <= 4 ? 'circle' : 'cose';
  const autoLayoutOpts = autoLayoutName === 'cose'
    ? { name: 'cose', padding: LAYOUT_PADDING, nodeRepulsion: 22000, idealEdgeLength: 180, edgeElasticity: 80, gravity: 0.18, componentSpacing: 110, nodeOverlap: 32, numIter: 1400, randomize: false, fit: false, animate: false }
    : { name: autoLayoutName, padding: LAYOUT_PADDING, spacingFactor: 1.25, avoidOverlap: true, fit: false, animate: false };
  try {
    mCyInstances[id] = cytoscape({
      container, elements: all,
      style: [
        // ── Base nodes ──
        {
          selector: 'node', style: {
            label: 'data(label)',
            shape: 'ellipse',
            'background-color': '#030712',
            'border-width': 2.4,
            'border-color': '#EAB308',
            color: '#FACC15',
            'text-valign': 'center', 'text-halign': 'center',
            'text-wrap': 'none',
            'text-outline-width': 1.6,
            'text-outline-color': '#020617',
            width: 68, height: 68,
            'font-size': '14px', 'font-family': "'Rajdhani', sans-serif", 'font-weight': '700',
            'shadow-blur': 26, 'shadow-color': 'rgba(234, 179, 8, 0.82)', 'shadow-offset-x': 0, 'shadow-offset-y': 0,
            'underlay-opacity': 0,
            'overlay-opacity': 0,
            'transition-property': 'background-color, border-color, shadow-color, underlay-color', 'transition-duration': '0.3s'
          }
        },
        // ── Start state ──
        {
          selector: 'node[?isStart]', style: {
            'border-color': '#3B82F6', 'border-width': 2.8, 'background-color': '#030712',
            'shadow-color': 'rgba(59, 130, 246, 0.95)', 'shadow-blur': 30,
            'underlay-opacity': 0,
            color: '#60A5FA'
          }
        },
        // ── Final state ──
        {
          selector: 'node[?isFinal]', style: {
            'border-width': 4.4, 'border-style': 'double', 'border-color': '#EF4444', 'background-color': '#030712',
            'shadow-color': 'rgba(239, 68, 68, 0.95)', 'shadow-blur': 30,
            'underlay-opacity': 0,
            color: '#F87171'
          }
        },
        // ── Start + Final combined ──
        {
          selector: 'node[?isStart][?isFinal]', style: {
            'border-color': '#3B82F6', 'border-width': 4.8, 'border-style': 'double', 'background-color': '#030712',
            'shadow-color': 'rgba(59, 130, 246, 0.95)', 'shadow-blur': 34,
            'underlay-opacity': 0,
            color: '#60A5FA'
          }
        },
        {
          selector: 'node[label = "Dead"], node[id = "Dead"]', style: {
            shape: 'ellipse',
            'border-color': 'rgba(107, 114, 128, 0.7)',
            'background-color': '#0b1120',
            'shadow-color': 'rgba(107, 114, 128, 0.18)',
            'shadow-blur': 6,
            'underlay-opacity': 0,
            color: 'rgba(107, 114, 128, 0.7)',
            opacity: 0.7
          }
        },
        // ── Ghost node ──
        { selector: '.ghost', style: { width: 1, height: 1, opacity: 0, 'background-opacity': 0, 'border-width': 0 } },
        // ── Start arrow ── matches reference: long straight dashed blue line → solid triangle
        {
          selector: '.start-arrow', style: {
            width: 2.8,
            'line-color': '#38bdf8',
            'target-arrow-color': '#38bdf8',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 1.5,
            'curve-style': 'straight',
            'line-style': 'dashed',
            'line-dash-pattern': [8, 6],
            'underlay-color': 'rgba(56, 189, 248, 0.28)',
            'underlay-padding': 4,
            'underlay-opacity': 1
          }
        },
        // ── All regular edges — no box, label floats cleanly above line ──
        {
          selector: 'edge', style: {
            label: 'data(label)',
            width: 2.3,
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#7dd3fc',
            'arrow-scale': 1.38,
            'curve-style': 'bezier',
            'control-point-distances': [0],
            'control-point-weights': [0.5],
            'line-color': '#60a5fa',
            'line-opacity': 0.96,
            color: '#e0f2fe',
            'font-size': '13px', 'font-family': "'Rajdhani', sans-serif", 'font-weight': '700',
            'text-outline-width': 1.5,
            'text-outline-color': '#020617',
            'text-background-opacity': 0,
            'text-border-opacity': 0,
            'text-margin-y': -28,
            'text-margin-x': 0,
            'text-rotation': 'none',
            'underlay-color': 'rgba(59, 130, 246, 0.14)',
            'underlay-padding': 2,
            'underlay-opacity': 1,
            'transition-property': 'line-color, width, opacity', 'transition-duration': '0.4s'
          }
        },
        // ── Self-loops ──
        {
          selector: 'edge[source = target]', style: {
            'curve-style': 'loop',
            'loop-direction': '-38deg',
            'loop-sweep': '42deg',
            'text-margin-y': -32, 'text-margin-x': 16
          }
        },
        // ── Parallel edges: curve them apart so they don't overlap ──
        { selector: 'edge.para-fwd', style: { 'control-point-distances': [92], 'control-point-weights': [0.43], 'text-margin-y': -34, 'text-margin-x': -4, 'z-index': 4 } },
        { selector: 'edge.para-bwd', style: { 'control-point-distances': [-92], 'control-point-weights': [0.57], 'text-margin-y': -34, 'text-margin-x': 4, 'z-index': 4 } }
      ],
      // Use preset so Cytoscape doesn't auto-layout on mount.
      // We run auto-layout only on non-start nodes below, then pin the start node.
      layout: { name: 'preset' }
    });
    const cy = mCyInstances[id];

    // ── Two-pass layout: non-start nodes auto, start node pinned ──
    const startId = startNode ? startNode.data.id : null;
    const ghostId = startNode ? `${id}-ghost` : null;
    const nonStartNodes = cy.nodes().not('.ghost').filter(n => n.id() !== startId);

    if (nonStartNodes.length > 0) {
      // Run the auto-layout exclusively on non-start nodes (start is excluded
      // from force calculations so it cannot drift from its pinned position).
      nonStartNodes.layout(autoLayoutOpts).run();
    }

    // Pin start node at fixed left-centre position and fit viewport
    mApplyStartPin(cy, container, startId, ghostId, LAYOUT_PADDING);

    // Post-layout: tag bidirectional edge pairs so they curve apart
    cy.edges().not('.ghost,.start-arrow').forEach(e => {
      if (e.source().id() === e.target().id()) return; // skip loops
      const rev = cy.edges(`[source="${e.target().id()}"][target="${e.source().id()}"]`).not('.ghost,.start-arrow');
      if (rev.length > 0) {
        e.addClass('para-fwd');
        rev.forEach(r => r.addClass('para-bwd'));
      }
    });
    mResolveGraphSpacing(cy);
    if (!shouldAnimate) {
      cy.elements().style('opacity', 1);
    }
  } catch (err) { container.innerHTML = `<p style="color:var(--rose);padding:20px">Graph error: ${esc(err.message)}</p>`; }
}

function mBuildCyElems(states, alpha, trans, finals, start) {
  const elems = [];
  states.forEach(s => elems.push({ data: { id: s, label: s, isFinal: finals.includes(s), isStart: s === start } }));
  const edgeMap = {};
  states.forEach(s => alpha.forEach(a => {
    const to = trans[s] && trans[s][a]; if (!to) return;
    const k = `${s}→${to}`;
    if (!edgeMap[k]) edgeMap[k] = { source: s, target: to, labels: [] };
    if (!edgeMap[k].labels.includes(a)) edgeMap[k].labels.push(a);
  }));
  Object.values(edgeMap).forEach(e => elems.push({ data: { id: `e_${e.source}_${e.target}`, source: e.source, target: e.target, label: regexToUnicodeSup(e.labels.join(',')), multi: e.labels.length > 1 } }));
  return elems;
}

function mExportPNG(cyId) {
  const cy = mCyInstances[cyId];
  if (!cy) { alert('Graph not available.'); return; }
  const png = cy.png({ output: 'base64uri', scale: 2, bg: '#1c2140' });
  const a = document.createElement('a'); a.href = png; a.download = `dfa_${cyId}.png`; a.click();
}
function mExportJSON() {
  if (!mStates.length || !Object.keys(mMinGroups).length) { alert('Run minimization first.'); return; }
  // Stable findRep
  function findRepExport(s) {
    for (const r of Object.keys(mMinGroups)) if (mMinGroups[r].includes(s)) return r;
    return null;
  }
  function groupLabelExport(r) {
    if (!r || !mMinGroups[r]) return '?';
    const m = mMinGroups[r].slice().sort();
    return m.length === 1 ? m[0] : `{${m.join(',')}}`;
  }
  const minStates = Object.keys(mMinGroups).map(r => ({
    id: r,
    label: groupLabelExport(r),
    isStart: mMinGroups[r].includes(mStart),
    isFinal: mMinGroups[r].some(s => mFinals.includes(s)),
    members: [...mMinGroups[r]]
  }));
  const minTrans = {};
  Object.keys(mMinGroups).forEach(r => {
    minTrans[r] = {};
    mAlpha.forEach(a => {
      const d = mTransitions[mMinGroups[r][0]] && mTransitions[mMinGroups[r][0]][a];
      if (d) {
        const dr = findRepExport(d);
        if (dr) minTrans[r][a] = dr;
      }
    });
  });
  const data = {
    method: mMethod,
    original: { states: mStates, alphabet: mAlpha, start: mStart, finals: mFinals, transitions: mTransitions },
    minimized: { states: minStates, alphabet: mAlpha, start: mMinStart, transitions: minTrans }
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'minimized_dfa.json'; a.click();
}

// ── REGEX TO DFA MODULE ────────────────────────────────────────────────────────
let nfaStateCounter = 0;
function getNewNfaState() { return `n${nfaStateCounter++}`; }

function setRegex(regex, alpha) {
  const rEl = document.getElementById('m-regex');
  const aEl = document.getElementById('m-regex-alpha');
  const dEl = document.getElementById('m-regex-display');
  if (rEl) rEl.value = regex;
  if (aEl) aEl.value = alpha;
  if (dEl) dEl.innerHTML = regexToHtmlSup(esc(regex));
}

function mFromRegex() {
  // Sync raw text from the display div → hidden input before parsing
  const dEl = document.getElementById('m-regex-display');
  const rEl = document.getElementById('m-regex');
  if (dEl && rEl) rEl.value = dEl.innerText.trim();

  const regexStr = document.getElementById('m-regex').value.trim();
  const alphaStr = document.getElementById('m-regex-alpha').value.trim();
  const errEl = document.getElementById('m-regex-error');
  const infoEl = document.getElementById('m-regex-info');
  if (errEl) errEl.innerHTML = '';
  if (infoEl) infoEl.innerHTML = '';

  if (!regexStr) { showRegexError('Please enter a regular expression.'); return; }
  const alpha = mUniqueOrdered(alphaStr.split(','));
  if (!alpha.length) { showRegexError('Please enter a valid alphabet.'); return; }

  try {
    const tokens = regexTokenizeAndDisambiguate(regexStr);
    const rpn = regexToRPN(tokens);
    const nfa = buildThompsonNFA(rpn);
    const dfa = nfaToDFA(nfa, alpha);

    if (infoEl) infoEl.innerHTML = `Regex parsed successfully. NFA states: ${Object.keys(nfa.trans).length} → DFA states: ${dfa.states.length}`;

    // Load it into the main app
    mLoadDFA(dfa.states, dfa.alpha, dfa.start, dfa.finals, dfa.trans, `Regex: ${regexStr}`);
  } catch (err) {
    showRegexError(err.message);
  }
}

function showRegexError(msg) {
  const errEl = document.getElementById('m-regex-error');
  if (errEl) errEl.innerHTML = `<div class="error-box">⚠ ${esc(msg)}</div>`;
}

function regexTokenizeAndDisambiguate(str) {
  const tokens = [];
  let i = 0;
  while (i < str.length) {
    const char = str[i];
    if (char === ' ') { i++; continue; }
    if (['(', ')', '.', '*'].includes(char)) {
      tokens.push({ type: char, val: char });
    } else if (char === '+') {
      // Determine context: look ahead for right-side char
      let nextNonSpace = '';
      for (let j = i + 1; j < str.length; j++) {
        if (str[j] !== ' ') { nextNonSpace = str[j]; break; }
      }
      // Look behind: find the last meaningful token to check if left side ends an operand
      const lastToken = tokens.length ? tokens[tokens.length - 1] : null;
      const leftIsOperandEnd = lastToken && ['SYM', ')', '*', '+_POST'].includes(lastToken.type);

      // `+` is postfix (one-or-more) only when:
      //   - left side ends an operand expression, AND
      //   - right side is NOT an operand start (not a letter/digit or `(`)
      // `+` is infix (union) when right side IS an operand start.
      // Any other position (e.g. leading +, or after an operator) is a syntax error.
      const rightIsOperandStart = /[\w\d(]/.test(nextNonSpace);
      let isPostfix;
      if (leftIsOperandEnd && !rightIsOperandStart) {
        isPostfix = true;   // e.g. a+  or  a+*  or end-of-string
      } else if (rightIsOperandStart) {
        if (!leftIsOperandEnd) {
          // leading + or + immediately after an operator (e.g. `++`, `(+`) — invalid
          throw new Error(
            'Invalid use of "+": union operator requires a left-hand operand ' +
            '(e.g. use "a+b" for union, "a+" for one-or-more).'
          );
        }
        isPostfix = false;  // infix union: a+b
      } else {
        // e.g. `++` where left is already +_POST — not a valid position
        throw new Error(
          'Unexpected "+" operator: cannot appear here in the expression.'
        );
      }
      tokens.push({ type: isPostfix ? '+_POST' : '+', val: isPostfix ? '⁺' : '+' });
    } else {
      tokens.push({ type: 'SYM', val: char });
    }
    i++;
  }

  // Insert implicit concatenations if explicit `.` is missing
  const opTokens = [];
  for (let j = 0; j < tokens.length; j++) {
    const t = tokens[j];
    if (j > 0) {
      const prev = tokens[j - 1];
      const prevConcat = ['SYM', ')', '*', '+_POST'].includes(prev.type);
      const nextConcat = ['SYM', '('].includes(t.type);
      if (prevConcat && nextConcat) {
        opTokens.push({ type: '.', val: '.' });
      }
    }
    opTokens.push(t);
  }
  return opTokens;
}

function regexToRPN(tokens) {
  const out = [];
  const stack = [];
  const prec = { '*': 3, '+_POST': 3, '.': 2, '+': 1 };

  for (const t of tokens) {
    if (t.type === 'SYM') {
      out.push(t);
    } else if (t.type === '(') {
      stack.push(t);
    } else if (t.type === ')') {
      while (stack.length && stack[stack.length - 1].type !== '(') {
        out.push(stack.pop());
      }
      if (!stack.length) throw new Error('Mismatched parentheses (extra closing parenthese).');
      stack.pop(); // discard '('
    } else {
      while (stack.length && stack[stack.length - 1].type !== '(' && prec[stack[stack.length - 1].type] >= prec[t.type]) {
        out.push(stack.pop());
      }
      stack.push(t);
    }
  }
  while (stack.length) {
    const p = stack.pop();
    if (p.type === '(') throw new Error('Mismatched parentheses (extra opening parenthese).');
    out.push(p);
  }
  return out;
}

function buildThompsonNFA(rpn) {
  nfaStateCounter = 0;
  const stack = [];

  for (const t of rpn) {
    if (t.type === 'SYM') {
      const start = getNewNfaState();
      const end = getNewNfaState();
      const trans = { [start]: { [t.val]: [end] }, [end]: {} };
      stack.push({ start, end, trans });
    } else if (t.type === '.') {
      if (stack.length < 2) throw new Error('Invalid syntax (concatenation missing operands).');
      const right = stack.pop();
      const left = stack.pop();
      // Add epsilon edge from left end to right start
      if (!left.trans[left.end]['ε']) left.trans[left.end]['ε'] = [];
      left.trans[left.end]['ε'].push(right.start);
      stack.push({
        start: left.start,
        end: right.end,
        trans: { ...left.trans, ...right.trans }
      });
    } else if (t.type === '+') { // Union
      if (stack.length < 2) throw new Error('Invalid syntax (union missing operands).');
      const right = stack.pop();
      const left = stack.pop();
      const start = getNewNfaState();
      const end = getNewNfaState();
      const trans = { [start]: { 'ε': [left.start, right.start] }, [end]: {} };
      if (!left.trans[left.end]['ε']) left.trans[left.end]['ε'] = [];
      left.trans[left.end]['ε'].push(end);
      if (!right.trans[right.end]['ε']) right.trans[right.end]['ε'] = [];
      right.trans[right.end]['ε'].push(end);
      stack.push({
        start, end, trans: { ...trans, ...left.trans, ...right.trans }
      });
    } else if (t.type === '*') { // Kleene Star
      if (stack.length < 1) throw new Error('Invalid syntax (* missing operand).');
      const target = stack.pop();
      const start = getNewNfaState();
      const end = getNewNfaState();
      const trans = { [start]: { 'ε': [target.start, end] }, [end]: {} };
      if (!target.trans[target.end]['ε']) target.trans[target.end]['ε'] = [];
      target.trans[target.end]['ε'].push(target.start, end);
      stack.push({
        start, end, trans: { ...trans, ...target.trans }
      });
    } else if (t.type === '+_POST') { // One-or-More
      if (stack.length < 1) throw new Error('Invalid syntax (+ one-or-more missing operand).');
      const target = stack.pop();
      const start = getNewNfaState();
      const end = getNewNfaState();
      // start -> target.start
      const trans = { [start]: { 'ε': [target.start] }, [end]: {} };
      if (!target.trans[target.end]['ε']) target.trans[target.end]['ε'] = [];
      // target loops back to itself, or goes forward to end
      target.trans[target.end]['ε'].push(target.start, end);
      stack.push({
        start, end, trans: { ...trans, ...target.trans }
      });
    }
  }

  if (stack.length !== 1) {
    if (stack.length === 0) {
      // Empty regex
      const start = getNewNfaState();
      return { start, end: start, trans: { [start]: {} } };
    }
    throw new Error('Invalid regex syntax (too many operands pending).');
  }
  return stack[0];
}

// Subset construction (NFA → DFA)
function epsilonClosure(states, trans) {
  const closure = new Set(states);
  const q = [...states];
  while (q.length) {
    const s = q.pop();
    const eps = trans[s] && trans[s]['ε'];
    if (eps) {
      for (const e of eps) {
        if (!closure.has(e)) {
          closure.add(e);
          q.push(e);
        }
      }
    }
  }
  return [...closure].sort(); // Sort to make array predictable length/order
}

function nfaToDFA(nfa, alpha) {
  const startClosure = epsilonClosure([nfa.start], nfa.trans);
  const dfaStates = [];
  const dfaTrans = {};
  const dfaFinals = [];

  const startName = startClosure.join(',');
  const queue = [startClosure];
  const visited = new Set([startName]);

  let dfaCounter = 0;
  const nameMap = { [startName]: `q${dfaCounter++}` };

  while (queue.length) {
    const currentSet = queue.shift();
    const currentName = currentSet.join(',');
    const qName = nameMap[currentName];

    dfaStates.push(qName);
    dfaTrans[qName] = {};

    if (currentSet.includes(nfa.end)) {
      dfaFinals.push(qName);
    }

    for (const sym of alpha) {
      const nextSetItems = new Set();
      for (const s of currentSet) {
        if (nfa.trans[s] && nfa.trans[s][sym]) {
          for (const ds of nfa.trans[s][sym]) nextSetItems.add(ds);
        }
      }
      if (nextSetItems.size > 0) {
        const closureTarget = epsilonClosure([...nextSetItems], nfa.trans);
        const targetName = closureTarget.join(',');

        if (!visited.has(targetName)) {
          visited.add(targetName);
          nameMap[targetName] = `q${dfaCounter++}`;
          queue.push(closureTarget);
        }
        dfaTrans[qName][sym] = nameMap[targetName];
      } else {
        dfaTrans[qName][sym] = 'Dead';
      }
    }
  }

  let usesDead = false;
  for (const s of dfaStates) {
    for (const sym of alpha) {
      if (dfaTrans[s][sym] === 'Dead') usesDead = true;
    }
  }

  if (usesDead) {
    dfaStates.push('Dead');
    dfaTrans['Dead'] = {};
    for (const sym of alpha) {
      dfaTrans['Dead'][sym] = 'Dead';
    }
  }

  return {
    states: dfaStates,
    alpha,
    start: nameMap[startName],
    finals: dfaFinals,
    trans: dfaTrans
  };
}


document.addEventListener('DOMContentLoaded', () => {
  // Preview update on typing
  const descInput = document.getElementById('lang-desc-input');
  if (descInput) {
    descInput.addEventListener('input', updateLangPreview);
  }

  // Initial preview render
  updateLangPreview();

  // ── Regex display div: seed initial value + wire live typing sync ──────────
  const regexDisplay = document.getElementById('m-regex-display');
  const regexHidden  = document.getElementById('m-regex');
  if (regexDisplay && regexHidden) {
    // Seed: show the default value with superscript formatting
    regexDisplay.innerHTML = regexToHtmlSup(esc(regexHidden.value));

    // Live sync while user types: capture raw text → update hidden input,
    // then re-render with superscripts while preserving caret position.
    regexDisplay.addEventListener('input', () => {
      const raw = regexDisplay.innerText;   // plain text, no HTML
      regexHidden.value = raw;              // keep hidden input in sync

      // Re-render with superscripts
      const sel = window.getSelection();
      const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
      // Measure caret offset from start of text content
      let caretOffset = 0;
      if (range) {
        const preRange = range.cloneRange();
        preRange.selectNodeContents(regexDisplay);
        preRange.setEnd(range.endContainer, range.endOffset);
        caretOffset = preRange.toString().length;
      }

      // Replace inner HTML with formatted version
      regexDisplay.innerHTML = regexToHtmlSup(esc(raw));

      // Restore caret at same text offset
      if (range) {
        try {
          const newRange = document.createRange();
          let node = regexDisplay, remaining = caretOffset;
          const walker = document.createTreeWalker(regexDisplay, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const len = walker.currentNode.length;
            if (remaining <= len) { newRange.setStart(walker.currentNode, remaining); break; }
            remaining -= len;
          }
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
        } catch (_) { /* caret restore failed gracefully — not critical */ }
      }
    });

    // On paste: strip HTML, insert plain text only
    regexDisplay.addEventListener('paste', e => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });

    // On Enter key: trigger parse instead of inserting newline
    regexDisplay.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); mFromRegex(); }
    });
  }
});
