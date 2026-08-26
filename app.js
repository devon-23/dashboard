/* ============================================================
   HAIL MARY — SHIP INTERFACE
   An interactive dashboard / screensaver.
   ============================================================ */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const rnd  = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const pad  = (n, w = 2) => String(Math.floor(n)).padStart(w, '0');
const fmt  = (n, d = 2) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

/* ============================================================
   SHIP STATE
   ============================================================ */
const ship = {
  t0: Date.now(),
  missionDayBase: 1447,
  fuel: { A: 3178, B: 3902, C: 4501 },   // kg astrophage
  fuelCap: 10000,
  burn: 6.04,                             // g/s
  spin: 4.11,                             // rpm
  integrity: 96.4,
  o2: 20.9, co2: 0.31, n2: 78.1,
  temp: 21.4, hum: 41, rad: 0.18,
  ly: 11.912,                             // distance to Sol
  vel: 0.0921,                            // fraction of c
  power: { A: true, B: true, C: true, D: true, E: false },
  alarms: {},                             // module -> count
  discovered: new Set(),
  rockyMode: false,
  sound: true,
};

/* ============================================================
   AUDIO — tiny synthesized blips
   ============================================================ */
let actx;
function beep(freq = 440, dur = 0.06, type = 'square', vol = 0.03) {
  if (!ship.sound) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(); o.stop(actx.currentTime + dur);
  } catch (e) { /* audio unavailable */ }
}
const sfx = {
  click:  () => beep(880, 0.04, 'square', 0.025),
  open:   () => { beep(520, 0.05); setTimeout(() => beep(780, 0.07), 55); },
  alarm:  () => { beep(220, 0.18, 'sawtooth', 0.05); setTimeout(() => beep(180, 0.22, 'sawtooth', 0.05), 190); },
  found:  () => { [660, 880, 1320].forEach((f, i) => setTimeout(() => beep(f, 0.09, 'triangle', 0.04), i * 90)); },
  type:   () => beep(1200 + Math.random() * 400, 0.012, 'square', 0.008),
};

/* ============================================================
   ARCHIVE — documents. `locked` ones must be discovered.
   ============================================================ */
const DOCS = [
  {
    id: 'astro-morph', n: '01', locked: false,
    title: 'Astrophage: Morphology & Energy Storage',
    author: 'DR. RYLAND GRACE', meta: 'LAB / XENOBIOLOGY · REV 12',
    tags: ['astrophage', 'biology'],
    body: `
      <h5>ABSTRACT</h5>
      <p>The organism designated <b>Astrophage</b> is a single-celled, spore-forming lifeform approximately
      10 micrometres in diameter. It is black. Not dark. <i>Black.</i> It reflects essentially nothing
      across the visible band, because reflecting light would mean wasting food.</p>
      <h5>ENERGY DENSITY</h5>
      <p>Astrophage stores energy as mass. Not chemically — <i>as mass</i>. A single cell can hold energy at a
      density on the order of <b>1.5 × 10<sup>17</sup> joules per kilogram</b>, which is within rounding
      distance of total mass-energy conversion. Every conservation law I was taught says this should be
      impossible. The samples in Bay 2 do not care what I was taught.</p>
      <div class="fig">
        SAMPLE 44-C · MASS 0.004 g · STORED ENERGY 6.0 × 10<sup>11</sup> J<br>
        EQUIVALENT: 143 TONNES TNT · CONTAINED IN A SMEAR YOU COULD MISS ON A SLIDE
      </div>
      <h5>MIGRATION CYCLE</h5>
      <p>Astrophage feeds at a star, breeds when it has enough energy and enough CO<sub>2</sub>, then migrates
      to a nearby planet with a carbon dioxide atmosphere to spawn. It navigates by magnetic field. It
      accelerates by emitting light at exactly <b>25.984 µm</b> — the Petrova frequency — in a perfectly
      collimated beam. Perfect. Zero divergence. Ask me how. I'll tell you I have no idea.</p>
      <p class="quote">"It's a photon rocket. It's a microscopic photon rocket and it has been sitting
      in our sky the whole time." — voice memo, 03:40 ship time</p>`
  },
  {
    id: 'petrova', n: '02', locked: true, unlockHint: 'NAV / TRAJECTORY',
    title: 'The Petrova Frequency — 25.984 µm',
    author: 'DR. RYLAND GRACE', meta: 'OPTICS / SPECTROGRAPHY · CLASSIFIED',
    tags: ['astrophage', 'physics'],
    body: `
      <h5>THE LINE</h5>
      <p>Every astrophage in the galaxy emits at precisely 25.984 micrometres. Every single one. No drift,
      no spread, no doppler smear beyond what its own velocity accounts for. This is a biological process
      with the frequency stability of an atomic clock.</p>
      <h5>WHY IT MATTERS</h5>
      <p>The Petrova Line — the arc of infrared glow between a star and its breeding planet — is a
      <b>highway</b>. If you can see the line, you can see where the infection is going, and where it came
      from. Tau Ceti has a Petrova Line. Tau Ceti has <i>always</i> had a Petrova Line. And Tau Ceti is not
      dimming.</p>
      <div class="fig">
        SOL: DIMMING 0.01%/yr → 8.7% BY YEAR 30 → ICE AGE, MASS STARVATION<br>
        TAU CETI: DIMMING 0.00%/yr → INFECTED, STABLE, <b>SOMETHING IS EATING THE ASTROPHAGE</b>
      </div>
      <p>That last line is the entire reason this ship exists. Something at Tau Ceti keeps astrophage in
      check. Find it. Understand it. Send it home. Nothing else about my life matters.</p>`
  },
  {
    id: 'rocky-phys', n: '03', locked: false,
    title: 'Notes on Eridian Physiology — Subject "Rocky"',
    author: 'DR. RYLAND GRACE', meta: 'XENO / FIRST CONTACT · REV 6',
    tags: ['eridian', 'rocky'],
    body: `
      <h5>FIRST OBSERVATIONS</h5>
      <p>He is roughly the size and shape of a dog-sized spider made of rock. Five legs, radially symmetric,
      no distinguishable front. A carapace like granite. Five "hands" of extraordinary dexterity. He works
      metal the way I work a spreadsheet: fluently, and while thinking about something else.</p>
      <h5>SENSES</h5>
      <p>Eridians are <b>blind</b>. No eyes, no light-sensing organs at all — Erid's atmosphere is opaque and
      the surface never sees its star. They perceive the world by <b>sonar</b>, continuously, in three
      dimensions. He "sees" the inside of objects. When I hold up a sealed box, he knows what's in it.</p>
      <h5>SPEECH</h5>
      <p>Eridian language is musical — chords, not phonemes. A word is a set of simultaneous frequencies.
      He speaks five notes at once and hears my single-tone voice as a child's babble, and he has been
      unfailingly patient about it.</p>
      <div class="fig">
        ♪ = "understand / yes"  ·  ♪♪ = "question"  ·  ♪♩♪ = "amaze"<br>
        BLOOD: MERCURY-BASED · BODY TEMP ~210 °C · AMBIENT PRESSURE 29 atm
      </div>
      <h5>CRITICAL SAFETY NOTE</h5>
      <p>His air will kill me. My air will kill him. Ammonia at 29 atmospheres versus oxygen at 0.2. The
      xenonite wall between our halves of this ship is the only reason we are both alive, and it is the
      single most important object aboard.</p>`
  },
  {
    id: 'xenonite', n: '04', locked: true, unlockHint: 'XENO / MATERIALS',
    title: 'Xenonite — Material Properties',
    author: 'ROCKY (TRANSLATED BY R. GRACE)', meta: 'ENGINEERING / MATERIALS',
    tags: ['eridian', 'engineering'],
    body: `
      <h5>WHAT IT IS</h5>
      <p>Xenonite is an Eridian structural composite. Rocky makes it from two components he keeps in
      unlabelled bins, mixes by feel, and cures by leaving it alone. It sets in minutes.</p>
      <div class="fig">
        TENSILE STRENGTH: ~1,000× STEEL BY MASS<br>
        THERMAL LIMIT: >2,000 °C · OPTICALLY CLEAR IN THIN SECTION<br>
        MANUFACTURING TIME, PRESSURE BULKHEAD (1 m²): 41 MINUTES
      </div>
      <h5>OBSERVED USE</h5>
      <p>He built a transparent tunnel through my ship in an afternoon. He built a 29-atmosphere pressure
      vessel that fits in my hand and does not care. He does not measure. When I asked how he knows the
      thickness is right, the translation came back as: <span class="quote">"I am engineer, question?"</span></p>
      <p>Human materials science should be studying this for the next two centuries. Assuming there is a
      next two centuries.</p>`
  },
  {
    id: 'taumoeba', n: '05', locked: true, unlockHint: 'LAB / SAMPLE BAY',
    title: 'Taumoeba — Predation Model & Nitrogen Vulnerability',
    author: 'DR. RYLAND GRACE', meta: 'LAB / BREEDING PROGRAM · REV 31',
    tags: ['taumoeba', 'astrophage', 'solution'],
    body: `
      <h5>THE ANSWER</h5>
      <p>It eats astrophage. That's it. That's the whole thing. A microorganism from Adrian's atmosphere
      that treats the most energy-dense substance in the known universe as lunch. This is why Tau Ceti
      isn't dying.</p>
      <h5>BREEDING</h5>
      <p>Taumoeba doubles roughly every 8 hours in a CO<sub>2</sub>-rich environment at 96 °C. Give it
      astrophage and a warm tank and it will happily reduce a strategic energy reserve to nothing.</p>
      <div class="fig">
        STRAIN 82.5 · GENERATIONS 214 · NITROGEN TOLERANCE 8.25 kPa (WAS 0.02 kPa)<br>
        STATUS: <b>VIABLE</b> · READY FOR SOLAR DEPLOYMENT
      </div>
      <h5>THE PROBLEM WE ALMOST DIED OF</h5>
      <p>Taumoeba is killed by nitrogen. Venus has nitrogen. Threeworld has nitrogen. A cure that dies
      before it reaches the patient is not a cure. Breeding for nitrogen tolerance took 214 generations,
      two ships, and a mistake that nearly ended both species.</p>
      <p class="quote">Note to whoever reads this: the same trait that makes it useful makes it a weapon.
      Do not let it near a fuel bay. We learned this the expensive way.</p>`
  },
  {
    id: 'erid', n: '06', locked: false,
    title: 'Erid — Homeworld Parameters',
    author: 'ROCKY (TRANSLATED BY R. GRACE)', meta: 'XENO / PLANETARY DATA',
    tags: ['eridian'],
    body: `
      <h5>40 ERIDANI A · PLANET "ERID"</h5>
      <dl class="kv">
        <dt>DISTANCE FROM SOL</dt><dd>16.3 light years</dd>
        <dt>SURFACE PRESSURE</dt><dd>29 atmospheres</dd>
        <dt>SURFACE TEMPERATURE</dt><dd>~210 °C</dd>
        <dt>ATMOSPHERE</dt><dd>Ammonia-dominant, opaque</dd>
        <dt>GRAVITY</dt><dd>2.1 g</dd>
        <dt>DAY LENGTH</dt><dd>~200 hours</dd>
        <dt>POPULATION</dt><dd>~29 billion</dd>
      </dl>
      <h5>ON THEIR SHIP</h5>
      <p>The Blip-A carried 23 Eridians. It arrived with 1. They had no concept of radiation shielding
      before this voyage, because Erid's atmosphere is so thick nothing ever needed one. They learned
      about cosmic rays by dying of them, one by one, in the dark, and the last one kept flying.</p>
      <p class="quote">"Crew all die. I fix ship. I fix ship, I fix ship, I fix ship." — Rocky, on
      the four years he spent alone before I woke up.</p>`
  },
  {
    id: 'blip-a', n: '07', locked: false,
    title: 'Blip-A — Observed Engineering Notes',
    author: 'DR. RYLAND GRACE', meta: 'ENGINEERING / COMPARATIVE',
    tags: ['eridian', 'engineering'],
    body: `
      <h5>PROPULSION</h5>
      <p>Same as ours: astrophage. Convergent solution — there is exactly one way to build a starship with
      this fuel and both species found it independently. That should tell you something about how narrow
      the road out of a home system really is.</p>
      <h5>WHAT THEY DO BETTER</h5>
      <p>Materials. Automation. Redundancy. The Blip-A has no computers in any sense I'd recognize —
      Eridians do arithmetic in base six, in their heads, faster than I can reach for a calculator. The ship
      is a machine, not a machine plus a brain.</p>
      <h5>WHAT WE DO BETTER</h5>
      <p>Optics, obviously. Radio. And clocks — they had no need to measure time precisely until they
      needed to navigate. Rocky asked to borrow a stopwatch and looked at it the way I looked at xenonite.</p>`
  },
  {
    id: 'directive', n: '08', locked: true, unlockHint: 'OVERVIEW / CENTRIFUGE',
    title: 'Project Hail Mary — Mission Directive',
    author: 'E. STRATT, ADMINISTRATOR', meta: 'RESTRICTED · EYES ONLY',
    tags: ['mission', 'stratt'],
    body: `
      <h5>DIRECTIVE 1</h5>
      <p>The <i>Hail Mary</i> will depart for Tau Ceti and determine why that system's astrophage
      population is suppressed. The crew will not return. Fuel budget permits transit only.</p>
      <h5>DIRECTIVE 2</h5>
      <p>Findings will be transmitted to Sol via the <b>Beetle</b> probes. The probes are the mission.
      The crew are the means. In the event of conflict between crew survival and beetle launch,
      <b>launch the beetles</b>.</p>
      <h5>DIRECTIVE 3</h5>
      <p>Crew selection is final and not subject to appeal, review, or the objections of the selected.
      <span class="redact">Dr. Grace declined the position and was assigned regardless. The coma medication
      protocol conveniently produces retrograde amnesia.</span></p>
      <div class="fig">
        AUTHORIZED: <b>E. STRATT</b> · UNDER ARTICLE 1 OF THE UN EMERGENCY PROTOCOL<br>
        SIGNATORIES: NONE REQUIRED. THAT IS THE POINT.
      </div>
      <p class="quote">"I don't have time to be nice. I have time to be right." — E. Stratt</p>`
  },
  {
    id: 'log04', n: '09', locked: true, unlockHint: 'NAV / SOL SYSTEM',
    title: 'Personal Log 04 — I Don\'t Remember Volunteering',
    author: 'DR. RYLAND GRACE', meta: 'PRIVATE · NOT FOR TRANSMISSION',
    tags: ['personal'],
    body: `
      <h5>SHIP DAY 0031</h5>
      <p>It came back today. Not gently. I was tightening a fuel line and suddenly I was in a conference
      room in Geneva saying <i>no</i>. Saying it clearly. Saying it more than once.</p>
      <p>I was a junior high science teacher. I liked being a junior high science teacher. I told Stratt I
      was not an astronaut, that I was afraid, that I did not want to die alone eleven light years from
      everything, and she looked at me the way you look at a chair that's in the way.</p>
      <p class="quote">"You'll do it," she said. "Or you'll be put in a coma and do it anyway."</p>
      <h5>AND NOW</h5>
      <p>So here's the thing I have to sit with: I am a coward who was sent to save the world against his
      will, and the world is going to be saved anyway. Both of those are true. I don't get to be the hero
      of this. I just get to do the job.</p>
      <p>Two people died in those beds so I could wake up. Whatever I was before, I am now the guy who
      finishes it.</p>`
  },
  {
    id: 'medical', n: '10', locked: true, unlockHint: 'LIFE SUPPORT / CREW',
    title: 'Medical — Crew Status Report',
    author: 'AUTOMATED MEDICAL SUITE', meta: 'CREW / MORTALITY · SEALED',
    tags: ['crew'],
    body: `
      <h5>COMA BAY 1 — ILYUKHINA, OLESYA · SCIENCE SPECIALIST</h5>
      <p>Cause of death: cumulative organ failure secondary to prolonged medical coma. Time of death
      estimated <b>ship day 0294</b>. Body remains interred in bay. Crew member was, per pre-flight
      psychological screening, the only volunteer aboard who wanted to be here.</p>
      <p class="quote">"To the sky!" — recorded, repeatedly, in her own voice, on 41 separate audio files
      still in the ship's archive.</p>
      <h5>COMA BAY 2 — YAO, MARTIN · COMMANDER</h5>
      <p>Cause of death: as above. Time of death estimated <b>ship day 0301</b>. Command authority
      transferred by protocol to the surviving crew member.</p>
      <h5>COMA BAY 3 — GRACE, RYLAND · SCIENCE SPECIALIST</h5>
      <p>Status: <b>AMBULATORY</b>. Emerged ship day 0000-relative + 1,306. Retrograde amnesia total on
      emergence, recovering. Muscle atrophy significant, resolving. Sole survivor.</p>
      <div class="fig">
        CREW COMPLEMENT AT LAUNCH: 3 · CREW COMPLEMENT NOW: 1<br>
        MISSION VIABILITY WITH 1 CREW: <b>MARGINAL — PROCEED</b>
      </div>`
  },
  {
    id: 'beetles', n: '11', locked: true, unlockHint: 'COMMS / BEETLE BAY',
    title: 'Beetle Payload Manifest',
    author: 'MISSION SYSTEMS', meta: 'COMMS / PROBE BAY',
    tags: ['mission'],
    body: `
      <h5>THE FOUR</h5>
      <p>Four unmanned probes: <b>John</b>, <b>Paul</b>, <b>George</b>, <b>Ringo</b>. Each carries an
      identical copy of every finding aboard. Each flies home alone at 0.92 c. Redundancy is the whole
      design philosophy — four chances, four thin hopes, thrown at a planet that will be a lot colder by
      the time they arrive.</p>
      <div class="fig">
        JOHN &nbsp; LAUNCHED · TRANSIT 12.9 yr · SIGNAL LOCK NOMINAL<br>
        PAUL &nbsp; LAUNCHED · TRANSIT 12.9 yr · SIGNAL LOCK NOMINAL<br>
        GEORGE LAUNCHED · TRANSIT 12.9 yr · SIGNAL LOCK NOMINAL<br>
        RINGO &nbsp;LAUNCHED · TRANSIT 12.9 yr · SIGNAL LOCK NOMINAL<br>
        <b>SARAH &nbsp;— UNLISTED — NOT ON LAUNCH MANIFEST</b>
      </div>
      <h5>ON "SARAH"</h5>
      <p>There is a fifth chassis in the bay. It is not in any manifest I was given. Someone at Baikonur
      built a spare and did not tell anyone, which is either the most human thing in this entire mission
      or exactly the kind of thing Stratt would do and then deny.</p>
      <p>I'm keeping it. A fifth chance costs me nothing but mass, and mass is the only currency I have
      left to spend on hope.</p>`
  },
  {
    id: 'amaze', n: '12', locked: true, unlockHint: 'TERMINAL / ?',
    title: 'Amaze.',
    author: 'DR. RYLAND GRACE', meta: 'PERSONAL · FINAL ENTRY',
    tags: ['personal', 'rocky'],
    body: `
      <h5>ON THE WORD</h5>
      <p>Eridian has a word we don't. Three notes, falling then rising. The translator renders it
      <b>"amaze"</b> but that's not right — it isn't surprise. It's the specific feeling of encountering
      something the universe had no obligation to contain, and being glad it does anyway.</p>
      <p>He used it the first time I explained that humans can see. He used it when I showed him a clock.
      He used it when I gave him my last cup of coffee and he could not drink it and smelled it for
      four minutes.</p>
      <h5>ON THE MATH</h5>
      <p>I did the fuel calculation eleven times hoping to be wrong. There is enough astrophage to send the
      cure to Earth <b>or</b> to get me home. Not both. That was never a hard problem — it was arithmetic,
      and arithmetic doesn't care how badly you want to see your students again.</p>
      <p>Then I ran the same numbers for Erid and got the same answer for him, and I found out something
      about myself: I could accept dying out here just fine. I could not accept him doing it alone.</p>
      <p class="quote">"You are good friend, question?"<br>"No question."</p>
      <h5>FINAL</h5>
      <p>Turn the ship around. Go get him. Let the beetles carry it home without me.</p>
      <p>Amaze.</p>`
  },
];

const SECRETS = {
  petrova:  'petrova',
  directive:'directive',
  taumoeba: 'taumoeba',
  xenonite: 'xenonite',
  log04:    'log04',
  medical:  'medical',
  beetles:  'beetles',
  amaze:    'amaze',
};

/* ============================================================
   DISCOVERY
   ============================================================ */
function unlock(docId, label) {
  const doc = DOCS.find(d => d.id === docId);
  if (!doc || !doc.locked) return false;
  doc.locked = false;
  doc.unread = true;
  ship.discovered.add(docId);
  sfx.found();
  toast(`ARCHIVE UNSEALED — ${label || doc.title.toUpperCase()}`);
  log(`archive record ${doc.n} decrypted`, 'w');
  updateTop();
  return true;
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .5s'; t.style.opacity = '0'; }, 2600);
  setTimeout(() => t.remove(), 3200);
}

/* ============================================================
   EVENT LOG
   ============================================================ */
const logLines = [];
function log(msg, kind = '') {
  const now = new Date();
  logLines.push({ msg, kind, t: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}` });
  if (logLines.length > 60) logLines.shift();
  const box = $('#eventlog');
  if (!box) return;
  box.innerHTML = logLines.map(l =>
    `<div class="logline ${l.kind}"><i>${l.t}</i><em>${l.msg}</em></div>`).join('');
}

/* ============================================================
   STARFIELD
   ============================================================ */
(function starfield() {
  const c = $('#stars'), x = c.getContext('2d');
  let stars = [];
  function size() {
    c.width = innerWidth; c.height = innerHeight;
    stars = Array.from({ length: 220 }, () => ({
      x: Math.random() * c.width, y: Math.random() * c.height,
      z: Math.random() * 1.4 + 0.2, s: Math.random() * 1.3 + 0.2,
      hue: Math.random() < 0.08 ? '#ff6a4a' : (Math.random() < 0.1 ? '#ffd27a' : '#bff5dd'),
    }));
  }
  size(); addEventListener('resize', size);
  (function loop() {
    x.clearRect(0, 0, c.width, c.height);
    for (const st of stars) {
      st.x -= st.z * 0.16;
      if (st.x < -2) { st.x = c.width + 2; st.y = Math.random() * c.height; }
      x.globalAlpha = 0.25 + st.z * 0.4;
      x.fillStyle = st.hue;
      x.fillRect(st.x, st.y, st.s, st.s);
    }
    x.globalAlpha = 1;
    requestAnimationFrame(loop);
  })();
})();

/* ============================================================
   MODULES
   ============================================================ */
const MODULES = [
  { id: 'ovr',  key: 'OVERVIEW', sub: 'SHIP STATUS',     crumb: 'SYS / ROOT' },
  { id: 'fuel', key: 'FUEL',     sub: 'ASTROPHAGE',      crumb: 'SYS / PROPULSION' },
  { id: 'nav',  key: 'NAV',      sub: 'TRAJECTORY',      crumb: 'SYS / GUIDANCE' },
  { id: 'life', key: 'LIFE',     sub: 'ATMOS / CREW',    crumb: 'SYS / LIFE SUPPORT' },
  { id: 'lab',  key: 'LAB',      sub: 'SAMPLE BAY',      crumb: 'SYS / SCIENCE' },
  { id: 'xeno', key: 'XENO',     sub: 'ERIDIAN LINK',    crumb: 'SYS / CONTACT' },
  { id: 'cms',  key: 'COMMS',    sub: 'BEETLE BAY',      crumb: 'SYS / TRANSMISSION' },
  { id: 'arc',  key: 'ARCHIVE',  sub: 'PAPERS & LOGS',   crumb: 'SYS / ARCHIVE' },
];

let current = 'ovr';

function renderRail() {
  $('#rail').innerHTML = MODULES.map(m => {
    const n = ship.alarms[m.id] || 0;
    return `<button class="railbtn ${m.id === current ? 'on' : ''} ${n ? 'alarm' : ''}" data-mod="${m.id}">
      <span class="rb-k">${m.key}</span><span class="rb-s">${m.sub}</span>
      ${n ? `<span class="badge">${n}</span>` : ''}
    </button>`;
  }).join('');
  $$('#rail .railbtn').forEach(b => b.onclick = () => go(b.dataset.mod));
}

function go(id) {
  current = id;
  delete ship.alarms[id];
  const m = MODULES.find(x => x.id === id);
  $('#stageTitle').textContent = m.key + '  //  ' + m.sub;
  $('#stageCrumb').textContent = m.crumb;
  $('#stage').innerHTML = VIEWS[id]();
  wire[id] && wire[id]();
  renderRail();
  sfx.open();
  log(`module ${m.key.toLowerCase()} loaded`);
}

/* ---------- shared svg bits ---------- */
const gridDefs = `
  <defs>
    <pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse">
      <path d="M34 0H0V34" fill="none" stroke="rgba(70,233,160,.14)" stroke-width="1"/>
    </pattern>
    <radialGradient id="glow"><stop offset="0%" stop-color="rgba(70,233,160,.35)"/><stop offset="100%" stop-color="transparent"/></radialGradient>
  </defs>`;

/* ============================================================
   VIEWS
   ============================================================ */
const VIEWS = {

  /* ---------------- OVERVIEW ---------------- */
  ovr: () => `
    <div class="grid2" style="grid-template-columns: 1.35fr 1fr;">
      <div class="card" style="position:relative">
        <h4>HULL SCHEMATIC · CTRL-1 "HAIL MARY"</h4>
        <div class="svgwrap">
          <svg viewBox="0 0 560 240">
            ${gridDefs}
            <rect width="560" height="240" fill="url(#grid)"/>
            <!-- fuel cylinders -->
            ${[70, 110, 150].map((y, i) => `
              <g>
                <rect x="60" y="${y - 14}" width="330" height="28" fill="none" stroke="var(--g)" stroke-width="1.2" opacity=".85"/>
                <rect x="60" y="${y - 14}" width="330" height="28" fill="rgba(70,233,160,.05)"/>
                ${Array.from({ length: 11 }, (_, k) => `<line x1="${60 + k * 33}" y1="${y - 14}" x2="${60 + k * 33}" y2="${y + 14}" stroke="rgba(70,233,160,.2)"/>`).join('')}
                <text x="46" y="${y + 4}" fill="var(--g-dim)" font-size="10" font-family="monospace">${'ABC'[i]}</text>
              </g>`).join('')}
            <!-- crew compartment -->
            <g class="hot-spot" id="svgCrew">
              <rect x="392" y="52" width="96" height="116" fill="rgba(70,233,160,.08)" stroke="var(--g)" stroke-width="1.4"/>
              <text x="440" y="98" text-anchor="middle" fill="var(--white)" font-size="10" font-family="monospace">CREW</text>
              <text x="440" y="114" text-anchor="middle" fill="var(--g-dim)" font-size="9" font-family="monospace">3 BAYS</text>
              <text x="440" y="132" text-anchor="middle" fill="var(--red)" font-size="9" font-family="monospace">2 SEALED</text>
            </g>
            <!-- centrifuge / secret -->
            <g class="hot-spot" id="svgCent">
              <circle cx="255" cy="110" r="30" fill="url(#glow)"/>
              <circle cx="255" cy="110" r="22" fill="none" stroke="var(--amber)" stroke-width="1.4" stroke-dasharray="4 4">
                <animateTransform attributeName="transform" type="rotate" from="0 255 110" to="360 255 110" dur="9s" repeatCount="indefinite"/>
              </circle>
              <circle cx="255" cy="110" r="4" fill="var(--amber)"/>
            </g>
            <!-- engines -->
            <g>
              <path d="M60 56 L20 40 L20 180 L60 164" fill="none" stroke="var(--g-dim)" stroke-width="1.2"/>
              <path d="M20 110 L-40 110" stroke="var(--red)" stroke-width="2" opacity=".85">
                <animate attributeName="opacity" values=".2;.9;.2" dur="1.6s" repeatCount="indefinite"/>
              </path>
            </g>
            <text x="492" y="200" fill="var(--g-dim)" font-size="9" font-family="monospace">SPIN DRIVE ▸</text>
            <line x1="20" y1="212" x2="488" y2="212" stroke="rgba(70,233,160,.3)" stroke-dasharray="3 5"/>
            <text x="254" y="228" text-anchor="middle" fill="var(--g-dim)" font-size="9" font-family="monospace">OVERALL LENGTH 47.0 m</text>
          </svg>
        </div>
        <div class="sub">▸ interactive nodes: crew compartment, centrifuge hub</div>
      </div>

      <div style="display:grid; gap:12px; align-content:start;">
        <div class="card">
          <h4>MISSION</h4>
          <div class="big" id="ovrDay">—</div>
          <div class="unit">DAYS ELAPSED SINCE DEPARTURE</div>
          <div class="sub">TARGET: TAU CETI · STATUS: <b style="color:var(--g)">ON STATION</b></div>
        </div>
        <div class="card">
          <h4>SUBSYSTEMS</h4>
          <div id="ovrSys"></div>
        </div>
        <div class="card">
          <h4>DISTANCE TO SOL</h4>
          <div class="big sm">${fmt(ship.ly, 3)} <span class="unit">ly</span></div>
          <div class="sub">RADIO ROUND TRIP · ${fmt(ship.ly * 2, 1)} YEARS</div>
        </div>
      </div>
    </div>`,

  /* ---------------- FUEL ---------------- */
  fuel: () => {
    const tanks = ['A', 'B', 'C'].map(k => {
      const v = ship.fuel[k], p = (v / ship.fuelCap) * 100, low = p < 40;
      return `<div class="tank ${low ? 'crit' : ''}" data-tank="${k}">
        <div class="tank-val">${p.toFixed(1)}%</div>
        <div class="tank-tube"><div class="tank-fill ${low ? 'low' : ''}" style="height:${p}%"></div><div class="ticks"></div></div>
        <div class="tank-lbl">TANK ${k}${low ? ' · LOW' : ''}</div>
      </div>`;
    }).join('');
    const total = ship.fuel.A + ship.fuel.B + ship.fuel.C;
    return `
      <div class="grid2" style="grid-template-columns:1fr 1.1fr;">
        <div class="card ${total < 12000 ? 'hot' : ''}">
          <h4>ASTROPHAGE RESERVE</h4>
          <div class="big" id="fuelTotal">${fmt(total, 0)}<span class="unit"> kg</span></div>
          <div class="sub">REMAINING SUPPLY · CAPACITY 30,000 kg</div>
          <div class="bar ${total < 12000 ? 'bad' : ''}"><i style="width:${(total / 30000) * 100}%"></i></div>
          <div class="tanks">${tanks}</div>
          <div class="sub">▸ select a tank for detail</div>
        </div>
        <div style="display:grid; gap:12px; align-content:start;">
          <div class="card">
            <h4>CONSUMPTION</h4>
            <div class="big" id="burnRate">${fmt(ship.burn)}<span class="unit"> g/s</span></div>
            <div class="sub">SPIN DRIVE · 4 OF 4 EMITTER BANKS ONLINE</div>
            <div class="bar warn"><i style="width:${(ship.burn / 12) * 100}%"></i></div>
          </div>
          <div class="card">
            <h4>TANK TELEMETRY</h4>
            <dl class="kv">
              <dt>TANK A PRESSURE</dt><dd>${fmt(rnd(0.9, 1.1))} atm</dd>
              <dt>TANK B PRESSURE</dt><dd>${fmt(rnd(0.9, 1.1))} atm</dd>
              <dt>TANK C PRESSURE</dt><dd>${fmt(rnd(0.9, 1.1))} atm</dd>
              <dt>BAY TEMPERATURE</dt><dd>96.0 °C (BREEDING)</dd>
              <dt>CO₂ FEED</dt><dd>NOMINAL</dd>
              <dt>SEAL INTEGRITY</dt><dd style="color:var(--amber)">TANK A — 98.1%</dd>
            </dl>
          </div>
          <div class="card">
            <h4>DELTA-V BUDGET</h4>
            <div class="big sm" id="dvOut">— <span class="unit">km/s</span></div>
            <div class="sub">SUFFICIENT FOR: <b style="color:var(--amber)">ONE-WAY TRANSIT ONLY</b></div>
            <div class="mono-note" style="margin-top:8px">Return trajectory requires 2.0× current reserve.
            Beetle launch mass is already deducted from this figure.</div>
          </div>
        </div>
      </div>`;
  },

  /* ---------------- NAV ---------------- */
  nav: () => `
    <div class="grid2" style="grid-template-columns:1.2fr 1fr;">
      <div class="card">
        <h4>TAU CETI APPROACH · PETROVA GEOMETRY</h4>
        <div class="svgwrap">
          <svg viewBox="0 0 460 340">
            ${gridDefs}
            <rect width="460" height="340" fill="url(#grid)"/>
            <!-- petrova cone (secret) -->
            <g class="hot-spot" id="svgPetrova">
              <path d="M196 118 L236 118 L268 320 L162 320 Z" fill="rgba(255,61,32,.16)" stroke="var(--red)" stroke-width="1.2"/>
              <text x="292" y="212" fill="var(--white)" font-size="9.5" font-family="monospace">EXPECTED PETROVA LINE</text>
              <line x1="240" y1="208" x2="288" y2="208" stroke="var(--white)"/>
            </g>
            <!-- star -->
            <circle cx="216" cy="112" r="66" fill="url(#glow)"/>
            ${Array.from({ length: 6 }, (_, i) => `<ellipse cx="216" cy="112" rx="${11 + i * 9}" ry="${8 + i * 8}" fill="none" stroke="rgba(160,255,90,.5)"/>`).join('')}
            ${Array.from({ length: 12 }, (_, i) => {
              const a = (i / 12) * Math.PI * 2;
              return `<line x1="216" y1="112" x2="${216 + Math.cos(a) * 56}" y2="${112 + Math.sin(a) * 50}" stroke="rgba(160,255,90,.4)"/>`;
            }).join('')}
            <circle cx="216" cy="112" r="4" fill="#dfffa8"/>
            <text x="298" y="96" fill="var(--white)" font-size="10.5" font-family="monospace">TAU CETI-E</text>
            <line x1="284" y1="92" x2="330" y2="92" stroke="var(--white)"/>
            <!-- orbital path -->
            <ellipse cx="216" cy="176" rx="176" ry="146" fill="none" stroke="var(--cyan)" stroke-width="1.4" stroke-dasharray="2 7" opacity=".8"/>
            <text x="278" y="286" fill="var(--white)" font-size="9.5" font-family="monospace">HAIL MARY</text>
            <text x="278" y="298" fill="var(--white)" font-size="9.5" font-family="monospace">ORBITAL PATH</text>
            <!-- ship marker -->
            <g id="navShip">
              <polygon points="216,266 222,278 210,278" fill="var(--white)"/>
              <circle cx="216" cy="272" r="12" fill="none" stroke="var(--white)" stroke-width=".8" opacity=".6">
                <animate attributeName="r" values="10;20;10" dur="2.6s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values=".7;0;.7" dur="2.6s" repeatCount="indefinite"/>
              </circle>
            </g>
          </svg>
        </div>
        <div class="sub">▸ the Petrova line is anomalous here — inspect it</div>
      </div>

      <div style="display:grid; gap:12px; align-content:start;">
        <div class="card" style="position:relative">
          <h4>SOL SYSTEM · RELATIVE</h4>
          <div class="svgwrap">
            <svg viewBox="0 0 300 170">
              ${gridDefs}
              <rect width="300" height="170" fill="url(#grid)"/>
              ${[26, 44, 62, 82, 104].map(r => `<ellipse cx="150" cy="86" rx="${r}" ry="${r * .62}" fill="none" stroke="rgba(255,255,255,.28)"/>`).join('')}
              <circle cx="150" cy="86" r="26" fill="url(#glow)"/>
              <circle cx="150" cy="86" r="6" fill="#ffe066" class="hot-spot" id="svgSol"/>
              <text x="150" y="70" text-anchor="middle" fill="#fff" font-size="12" font-family="monospace" letter-spacing="2">SOL</text>
              <circle cx="196" cy="112" r="3.5" fill="#ff7a4a"/>
              <text x="204" y="122" fill="#fff" font-size="11" font-family="monospace" letter-spacing="2">EARTH</text>
              <text x="12" y="160" fill="var(--g-dim)" font-size="8" font-family="monospace">ARCHIVE PLOT · LIGHT-DELAY 11.9 yr · DATA STALE</text>
            </svg>
          </div>
          <div class="sub">▸ everything shown here happened twelve years ago</div>
        </div>
        <div class="card">
          <h4>NAVIGATION STATE</h4>
          <dl class="kv">
            <dt>VELOCITY</dt><dd id="navVel">${fmt(ship.vel * 299792, 0)} km/s (${fmt(ship.vel * 100, 2)} c)</dd>
            <dt>DIST. TO SOL</dt><dd>${fmt(ship.ly, 3)} ly</dd>
            <dt>DIST. TO ADRIAN</dt><dd id="navAdrian">—</dd>
            <dt>ORBIT</dt><dd>STABLE · 41.2 hr PERIOD</dd>
            <dt>SPIN</dt><dd id="navSpin">${fmt(ship.spin)} rpm (1.00 g)</dd>
            <dt>ATT. CONTROL</dt><dd>AUTO</dd>
            <dt>NEXT BURN</dt><dd style="color:var(--amber)">UNSCHEDULED</dd>
          </dl>
        </div>
      </div>
    </div>`,

  /* ---------------- LIFE SUPPORT ---------------- */
  life: () => `
    <div class="grid2" style="grid-template-columns:1fr 1fr;">
      <div style="display:grid; gap:12px; align-content:start;">
        <div class="card">
          <h4>ATMOSPHERE</h4>
          <div class="grid3">
            <div><div class="big sm" id="lsO2">${fmt(ship.o2)}<span class="unit">%</span></div><div class="sub">OXYGEN</div><div class="bar"><i style="width:${ship.o2 * 4}%"></i></div></div>
            <div><div class="big sm" id="lsCo2">${fmt(ship.co2)}<span class="unit">%</span></div><div class="sub">CO₂</div><div class="bar warn"><i style="width:${ship.co2 * 90}%"></i></div></div>
            <div><div class="big sm">${fmt(ship.n2, 1)}<span class="unit">%</span></div><div class="sub">NITROGEN</div><div class="bar"><i style="width:78%"></i></div></div>
          </div>
        </div>
        <div class="card">
          <h4>ENVIRONMENT</h4>
          <dl class="kv">
            <dt>CABIN TEMP</dt><dd id="lsTemp">${fmt(ship.temp, 1)} °C</dd>
            <dt>HUMIDITY</dt><dd>${ship.hum}%</dd>
            <dt>PRESSURE</dt><dd>1.00 atm</dd>
            <dt>RADIATION</dt><dd id="lsRad">${fmt(ship.rad)} mSv/day</dd>
            <dt>WATER RECLAIM</dt><dd>99.1% EFFICIENT</dd>
            <dt>FOOD STORES</dt><dd>COMA SLURRY · 1,840 DAYS</dd>
            <dt>CENTRIFUGE</dt><dd>ENGAGED · 1.00 g</dd>
          </dl>
        </div>
      </div>
      <div class="card">
        <h4>CREW · COMA BAYS</h4>
        <div style="display:grid; gap:8px;">
          <div class="crew" data-crew="grace">
            <div class="avatar">RG</div>
            <div style="flex:1"><b>GRACE, RYLAND</b><span>SCIENCE SPECIALIST · BAY 3</span></div>
            <span class="tag">AMBULATORY</span>
          </div>
          <div class="crew dead hot-spot" data-crew="ily">
            <div class="avatar">OI</div>
            <div style="flex:1"><b>ILYUKHINA, OLESYA</b><span>SCIENCE SPECIALIST · BAY 1</span></div>
            <span class="tag red">SEALED</span>
          </div>
          <div class="crew dead hot-spot" data-crew="yao">
            <div class="avatar">MY</div>
            <div style="flex:1"><b>YAO, MARTIN</b><span>COMMANDER · BAY 2</span></div>
            <span class="tag red">SEALED</span>
          </div>
        </div>
        <div class="mono-note" style="margin-top:12px">
          Command authority transferred to surviving crew member on ship day 0301 per protocol 4.1.<br>
          <span style="color:var(--amber)">▸ sealed bay records require medical authorization</span>
        </div>
      </div>
    </div>`,

  /* ---------------- LAB ---------------- */
  lab: () => `
    <div class="grid2" style="grid-template-columns:1fr 1.1fr;">
      <div class="card" style="position:relative">
        <h4>SAMPLE BAY · MICROSCOPE FEED</h4>
        <div class="svgwrap" style="cursor:pointer" id="dish">
          <svg viewBox="0 0 320 260">
            ${gridDefs}
            <rect width="320" height="260" fill="url(#grid)"/>
            <circle cx="160" cy="126" r="98" fill="rgba(0,0,0,.6)" stroke="var(--g)" stroke-width="1.4"/>
            <circle cx="160" cy="126" r="88" fill="none" stroke="rgba(70,233,160,.25)" stroke-dasharray="2 6"/>
            <g id="cells">
              ${Array.from({ length: 34 }, () => {
                const a = Math.random() * 6.283, r = Math.random() * 82;
                const cx = 160 + Math.cos(a) * r, cy = 126 + Math.sin(a) * r;
                return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rnd(1.6, 4).toFixed(1)}" fill="#000" stroke="rgba(70,233,160,.55)" stroke-width=".7">
                  <animate attributeName="opacity" values="1;.35;1" dur="${rnd(2, 6).toFixed(1)}s" repeatCount="indefinite"/>
                </circle>`;
              }).join('')}
            </g>
            <line x1="160" y1="28" x2="160" y2="224" stroke="rgba(70,233,160,.2)"/>
            <line x1="62" y1="126" x2="258" y2="126" stroke="rgba(70,233,160,.2)"/>
            <text x="160" y="246" text-anchor="middle" fill="var(--g-dim)" font-size="9" font-family="monospace">SLIDE 82-5 · 400× · FIELD 240 µm</text>
          </svg>
        </div>
        <div class="sub">▸ sample count: <b id="cellCount">34</b> · click the dish to resample</div>
      </div>

      <div style="display:grid; gap:12px; align-content:start;">
        <div class="card">
          <h4>SPECTROMETRY</h4>
          <div class="svgwrap">
            <svg viewBox="0 0 340 110">
              <rect width="340" height="110" fill="rgba(0,0,0,.4)"/>
              ${Array.from({ length: 60 }, (_, i) => {
                const h = i === 38 ? 78 : rnd(2, 13);
                return `<rect x="${6 + i * 5.5}" y="${96 - h}" width="3.4" height="${h}" fill="${i === 38 ? 'var(--amber)' : 'rgba(70,233,160,.6)'}"/>`;
              }).join('')}
              <line x1="6" y1="96" x2="334" y2="96" stroke="var(--line)"/>
              <text x="216" y="18" fill="var(--amber)" font-size="9" font-family="monospace">25.984 µm — PETROVA</text>
            </svg>
          </div>
          <div class="sub">EMISSION LOCKED · CONFIDENCE 99.998%</div>
        </div>
        <div class="card">
          <h4>BREEDING PROGRAM</h4>
          <dl class="kv">
            <dt>STRAIN</dt><dd>TAUMOEBA 82.5</dd>
            <dt>GENERATION</dt><dd id="labGen">214</dd>
            <dt>N₂ TOLERANCE</dt><dd style="color:var(--g)">8.25 kPa</dd>
            <dt>DOUBLING TIME</dt><dd>8.1 hr</dd>
            <dt>CULTURE TEMP</dt><dd>96.0 °C</dd>
            <dt>VIABILITY</dt><dd style="color:var(--g)">CONFIRMED</dd>
          </dl>
          <div class="bar"><i style="width:100%"></i></div>
          <div class="sub">SELECTIVE PRESSURE CYCLE COMPLETE</div>
        </div>
      </div>
    </div>`,

  /* ---------------- XENO ---------------- */
  xeno: () => `
    <div class="grid2" style="grid-template-columns:1fr 1fr;">
      <div class="card">
        <h4>ERIDIAN LINK · VESSEL "BLIP-A"</h4>
        <div class="svgwrap">
          <svg viewBox="0 0 380 200">
            ${gridDefs}
            <rect width="380" height="200" fill="url(#grid)"/>
            <ellipse cx="88" cy="100" rx="46" ry="46" fill="rgba(255,182,72,.08)" stroke="var(--amber)" stroke-width="1.3"/>
            <text x="88" y="104" text-anchor="middle" fill="var(--amber)" font-size="10" font-family="monospace">BLIP-A</text>
            <rect x="264" y="70" width="84" height="60" fill="rgba(70,233,160,.08)" stroke="var(--g)" stroke-width="1.3"/>
            <text x="306" y="104" text-anchor="middle" fill="var(--g)" font-size="10" font-family="monospace">HAIL MARY</text>
            <g class="hot-spot" id="svgTunnel">
              <rect x="134" y="88" width="130" height="24" fill="rgba(99,216,255,.12)" stroke="var(--cyan)" stroke-dasharray="5 3"/>
              <text x="199" y="80" text-anchor="middle" fill="var(--cyan)" font-size="8.5" font-family="monospace">XENONITE TUNNEL</text>
              <text x="199" y="104" text-anchor="middle" fill="var(--cyan)" font-size="8" font-family="monospace">29 atm | 1 atm</text>
            </g>
            <text x="190" y="176" text-anchor="middle" fill="var(--g-dim)" font-size="9" font-family="monospace">DOCKED · SEAL NOMINAL · 1,102 DAYS</text>
          </svg>
        </div>
        <div class="sub">▸ inspect the xenonite seal</div>
      </div>
      <div style="display:grid; gap:12px; align-content:start;">
        <div class="card">
          <h4>SUBJECT · "ROCKY"</h4>
          <dl class="kv">
            <dt>SPECIES</dt><dd>ERIDIAN</dd>
            <dt>ORIGIN</dt><dd>ERID · 40 ERIDANI A</dd>
            <dt>RESPIRATION</dt><dd>AMMONIA · 29 atm</dd>
            <dt>BODY TEMP</dt><dd>210 °C</dd>
            <dt>SENSORY</dt><dd>SONAR (NO VISION)</dd>
            <dt>LANGUAGE</dt><dd>POLYPHONIC · 5-NOTE CHORD</dd>
            <dt>OCCUPATION</dt><dd>ENGINEER</dd>
            <dt>STATUS</dt><dd style="color:var(--g)">FRIEND</dd>
          </dl>
        </div>
        <div class="card">
          <h4>TRANSLATOR SAMPLE</h4>
          <div class="mono-note" style="line-height:2">
            <span style="color:var(--amber)">♪♩♪</span> &nbsp;→&nbsp; "amaze"<br>
            <span style="color:var(--amber)">♪♪</span> &nbsp;&nbsp;→&nbsp; "question?"<br>
            <span style="color:var(--amber)">♩♩♪</span> &nbsp;→&nbsp; "you are good friend"<br>
            <span style="color:var(--amber)">♪♩</span> &nbsp;&nbsp;→&nbsp; "fist my bump"
          </div>
          <div class="sub" style="margin-top:8px">▸ type <b style="color:var(--g)">rocky</b> in the terminal to open a channel</div>
        </div>
      </div>
    </div>`,

  /* ---------------- COMMS ---------------- */
  cms: () => {
    const beetles = [
      ['JOHN', 'LAUNCHED', 'g'], ['PAUL', 'LAUNCHED', 'g'],
      ['GEORGE', 'LAUNCHED', 'g'], ['RINGO', 'LAUNCHED', 'g'],
      ['SARAH', 'UNLISTED', 'amber'],
    ];
    return `
      <div class="grid2" style="grid-template-columns:1fr 1fr;">
        <div class="card">
          <h4>BEETLE PROBE BAY</h4>
          <div style="display:grid; gap:7px;">
            ${beetles.map(([n, s, c]) => `
              <div class="crew hot-spot" data-beetle="${n}" ${c === 'amber' ? 'style="border-color:var(--amber)"' : ''}>
                <div class="avatar" ${c === 'amber' ? 'style="color:var(--amber);border-color:var(--amber)"' : ''}>${n[0]}</div>
                <div style="flex:1"><b>${n}</b><span>PAYLOAD: FULL ARCHIVE MIRROR</span></div>
                <span class="tag ${c === 'amber' ? 'amber' : ''}">${s}</span>
              </div>`).join('')}
          </div>
          <div class="sub" style="margin-top:10px">▸ one of these is not on the manifest</div>
        </div>
        <div style="display:grid; gap:12px; align-content:start;">
          <div class="card">
            <h4>TRANSMISSION LOG</h4>
            <div class="mono-note" style="line-height:1.9">
              <b style="color:var(--g)">D+1301</b> · BEETLE JOHN — RELEASED, BURN NOMINAL<br>
              <b style="color:var(--g)">D+1301</b> · BEETLE PAUL — RELEASED, BURN NOMINAL<br>
              <b style="color:var(--g)">D+1302</b> · BEETLE GEORGE — RELEASED, BURN NOMINAL<br>
              <b style="color:var(--g)">D+1302</b> · BEETLE RINGO — RELEASED, BURN NOMINAL<br>
              <b style="color:var(--amber)">D+1303</b> · CHASSIS 5 — NO MANIFEST ENTRY<br>
              <b style="color:var(--g-dim)">————</b> · UPLINK TO SOL: NOT POSSIBLE<br>
              <b style="color:var(--g-dim)">————</b> · NEAREST RELAY: 11.9 ly
            </div>
          </div>
          <div class="card hot">
            <h4>COMMUNICATION RANGE</h4>
            <div class="big sm">NO SIGNAL</div>
            <div class="sub">EARTH IS 11.9 LIGHT YEARS AWAY. THERE IS NOTHING TO TALK TO.<br>
            THE PROBES ARE THE MESSAGE.</div>
          </div>
        </div>
      </div>`;
  },

  /* ---------------- ARCHIVE ---------------- */
  arc: () => {
    const unlocked = DOCS.filter(d => !d.locked).length;
    return `
      <div style="margin-bottom:12px" class="card">
        <h4>ARCHIVE STATUS</h4>
        <div style="display:flex; gap:26px; align-items:baseline;">
          <div><div class="big sm">${unlocked}<span class="unit"> / ${DOCS.length}</span></div><div class="sub">RECORDS ACCESSIBLE</div></div>
          <div style="flex:1">
            <div class="bar"><i style="width:${(unlocked / DOCS.length) * 100}%"></i></div>
            <div class="sub">SEALED RECORDS UNLOCK BY INSPECTING SHIP SYSTEMS. LOOK FOR HIGHLIGHTED NODES.</div>
          </div>
        </div>
      </div>
      <div class="doclist">
        ${DOCS.map(d => d.locked
          ? `<div class="doc locked" data-lock="${d.unlockHint || ''}">
               <div class="dnum">${d.n}</div>
               <div class="dttl"><b>████████ ████ ███████</b><span>SEALED · LOCATION HINT: ${d.unlockHint || 'UNKNOWN'}</span></div>
               <span class="tag red">ENCRYPTED</span>
             </div>`
          : `<div class="doc ${d.unread ? 'unread' : ''}" data-doc="${d.id}">
               <div class="dnum">${d.n}</div>
               <div class="dttl"><b>${d.title}</b><span>${d.author} · ${d.meta}</span></div>
               ${d.unread ? '<span class="tag new">NEW</span>' : ''}
               ${d.tags.slice(0, 2).map(t => `<span class="tag">${t.toUpperCase()}</span>`).join('')}
             </div>`).join('')}
      </div>`;
  },
};

/* ============================================================
   VIEW WIRING (interactions per module)
   ============================================================ */
const wire = {
  ovr() {
    const sys = [
      ['SPIN DRIVE', 'NOMINAL', ''], ['CENTRIFUGE', 'ENGAGED', ''],
      ['LIFE SUPPORT', 'NOMINAL', ''], ['FUEL BAY A', 'SEAL 98.1%', 'warn'],
      ['NAVIGATION', 'LOCKED', ''], ['LAB', 'ACTIVE', ''],
      ['COMMS', 'NO SIGNAL', 'bad'], ['XENONITE SEAL', 'NOMINAL', ''],
    ];
    $('#ovrSys').innerHTML = sys.map(([k, v, c]) =>
      `<div class="vrow"><span>${k}</span><b class="${c}">${v}</b></div>`).join('');
    $('#ovrDay').textContent = fmt(missionDay(), 0);

    $('#svgCent').onclick = () => {
      sfx.click();
      if (!unlock('directive')) toast('CENTRIFUGE HUB · 1.00 g · NOMINAL');
    };
    $('#svgCrew').onclick = () => { sfx.click(); go('life'); };
  },

  fuel() {
    $$('.tank').forEach(t => t.onclick = () => {
      const k = t.dataset.tank, v = ship.fuel[k];
      sfx.click();
      openDoc({
        title: `FUEL TANK ${k}`, author: 'PROPULSION SUBSYSTEM', meta: 'LIVE TELEMETRY',
        body: `<h5>TANK ${k}</h5>
          <dl class="kv">
            <dt>MASS</dt><dd>${fmt(v, 1)} kg astrophage</dd>
            <dt>FILL</dt><dd>${fmt((v / ship.fuelCap) * 100, 1)}%</dd>
            <dt>TEMPERATURE</dt><dd>96.0 °C</dd>
            <dt>VIABILITY</dt><dd>${v / ship.fuelCap < 0.4 ? '<span style="color:var(--red)">LOW RESERVE</span>' : 'NOMINAL'}</dd>
            <dt>STORED ENERGY</dt><dd>${fmt(v * 1.5e17 / 1e18, 2)} × 10<sup>18</sup> J</dd>
          </dl>
          <p style="margin-top:14px">That last number is not a typo. The contents of this tank hold more energy
          than every nuclear weapon ever built, and it is alive, and it is doing this on purpose.</p>
          ${v / ship.fuelCap < 0.4 ? '<p class="quote">Reserve below transit minimum. Return trajectory is no longer available from this tank.</p>' : ''}`
      });
    });
  },

  nav() {
    let solHits = 0;
    $('#svgSol').onclick = () => {
      sfx.click(); solHits++;
      if (solHits >= 3) { if (!unlock('log04')) toast('SOL · G2V · DIMMING 0.01%/yr'); }
      else toast(`SOL TELEMETRY · ARCHIVE PLOT · ${3 - solHits} MORE QUERIES TO FORCE FULL READ`);
    };
    $('#svgPetrova').onclick = () => {
      sfx.click();
      if (!unlock('petrova')) toast('PETROVA LINE · 25.984 µm · CONFIRMED');
    };
    $('#navAdrian').textContent = fmt(rnd(0.0021, 0.0024), 5) + ' AU';
  },

  life() {
    $$('.crew.dead').forEach(c => c.onclick = () => {
      sfx.click();
      if (!unlock('medical')) toast('BAY SEALED · MEDICAL RECORD ALREADY DECRYPTED');
    });
    $('[data-crew="grace"]').onclick = () => {
      sfx.click();
      openDoc({
        title: 'GRACE, RYLAND', author: 'CREW FILE', meta: 'SCIENCE SPECIALIST · BAY 3',
        body: `<h5>FILE</h5>
          <dl class="kv">
            <dt>PRIOR ROLE</dt><dd>Junior high school science teacher, San Francisco</dd>
            <dt>DOCTORATE</dt><dd>Molecular biology (thesis rejected by peer review, 2011)</dd>
            <dt>SPECIALTY</dt><dd>Speculative exobiology — non-water-based life</dd>
            <dt>SELECTION</dt><dd><span class="redact">Non-voluntary. See Directive 3.</span></dd>
            <dt>STATUS</dt><dd>Sole survivor. Ambulatory. Working.</dd>
          </dl>
          <p style="margin-top:14px">His thesis said life didn't need water. Every journal on Earth said he was
          wasting everyone's time. Twenty-six years later the entire species is depending on the one man who
          spent his career being wrong about the right thing.</p>`
      });
    };
  },

  lab() {
    let dishHits = 0;
    $('#dish').onclick = () => {
      sfx.click(); dishHits++;
      const g = $('#cells');
      const n = rint(22, 48);
      g.innerHTML = Array.from({ length: n }, () => {
        const a = Math.random() * 6.283, r = Math.random() * 82;
        return `<circle cx="${(160 + Math.cos(a) * r).toFixed(1)}" cy="${(126 + Math.sin(a) * r).toFixed(1)}"
          r="${rnd(1.6, 4).toFixed(1)}" fill="#000" stroke="rgba(70,233,160,.55)" stroke-width=".7"/>`;
      }).join('');
      $('#cellCount').textContent = n;
      if (dishHits === 5) { if (!unlock('taumoeba')) toast('SAMPLE RESOLVED'); }
      else if (dishHits < 5) toast(`RESAMPLING · ${n} CELLS IN FIELD`);
    };
  },

  xeno() {
    $('#svgTunnel').onclick = () => {
      sfx.click();
      if (!unlock('xenonite')) toast('XENONITE SEAL · 29 atm DIFFERENTIAL · HOLDING');
    };
  },

  cms() {
    $$('[data-beetle]').forEach(b => b.onclick = () => {
      sfx.click();
      const n = b.dataset.beetle;
      if (n === 'SARAH') { if (!unlock('beetles')) toast('CHASSIS 5 · STILL NOT ON THE MANIFEST'); }
      else toast(`BEETLE ${n} · IN TRANSIT · ETA SOL +12.9 yr`);
    });
  },

  arc() {
    $$('[data-doc]').forEach(d => d.onclick = () => {
      sfx.open();
      const doc = DOCS.find(x => x.id === d.dataset.doc);
      doc.unread = false;
      openDoc(doc);
      go('arc');
    });
    $$('[data-lock]').forEach(d => d.onclick = () => {
      beep(160, 0.14, 'sawtooth', 0.04);
      toast(`RECORD SEALED · SEARCH: ${d.dataset.lock || 'UNKNOWN'}`);
    });
  },
};

/* ============================================================
   DOCUMENT READER
   ============================================================ */
function openDoc(doc) {
  $('#rdTitle').textContent = doc.title;
  $('#rdMeta').textContent = `${doc.author} · ${doc.meta}`;
  $('#rdBody').innerHTML = doc.body;
  $('#rdFoot').innerHTML = `<span>HAIL MARY ARCHIVE · READ-ONLY</span><span>ESC TO CLOSE</span>`;
  $('#reader').classList.remove('hidden');
  $('#rdBody').scrollTop = 0;
}
function closeDoc() { $('#reader').classList.add('hidden'); }
$('#rdClose').onclick = () => { sfx.click(); closeDoc(); };
$('#reader').onclick = e => { if (e.target.id === 'reader') closeDoc(); };

/* ============================================================
   ALERTS
   ============================================================ */
const ALERTS = [
  { m: 'ovr',  t: 'EXCESSIVE CENTRIFUGAL FORCE', s: 'SPIN RATE EXCEEDS DESIGN TOLERANCE · REDUCE TO 4.10 rpm', crit: 1 },
  { m: 'fuel', t: 'FUEL A LOW',                  s: 'TANK A BELOW TRANSIT MINIMUM · REBALANCE ADVISED',        crit: 1 },
  { m: 'fuel', t: 'ASTROPHAGE SEAL DEGRADED',    s: 'BAY A GASKET AT 98.1% · MONITOR FOR BREEDING LOSS',       crit: 0 },
  { m: 'life', t: 'CO₂ SCRUBBER CYCLE',          s: 'FILTER SATURATION 61% · AUTO-REGEN INITIATED',            crit: 0 },
  { m: 'nav',  t: 'ATTITUDE DRIFT',              s: '0.04° OFF NOMINAL · THRUSTER CORRECTION APPLIED',         crit: 0 },
  { m: 'life', t: 'RADIATION SPIKE',             s: 'PETROVA LINE PROXIMITY · SHIELDING NOMINAL',              crit: 0 },
  { m: 'lab',  t: 'CULTURE TEMP EXCURSION',      s: 'TAUMOEBA TANK 4 AT 98.2 °C · COOLING',                    crit: 0 },
  { m: 'xeno', t: 'PRESSURE DIFFERENTIAL ALARM', s: 'XENONITE SEAL 29 atm · NO LEAK DETECTED',                 crit: 1 },
  { m: 'cms',  t: 'NO UPLINK AVAILABLE',         s: 'NEAREST RELAY 11.9 ly · TRANSMISSION IMPOSSIBLE',         crit: 0 },
  { m: 'ovr',  t: 'HULL MICROMETEOROID',         s: 'IMPACT SECTOR 7 · DEPTH 0.4 mm · SELF-SEALED',            crit: 0 },
  { m: 'lab',  t: 'SPECTROMETER RECALIBRATION',  s: 'PETROVA LINE RE-LOCKED AT 25.984 µm',                     crit: 0 },
  { m: 'fuel', t: 'FUEL B LOW',                  s: 'TANK B APPROACHING RESERVE FLOOR',                        crit: 1 },
];

function fireAlert(a = pick(ALERTS)) {
  ship.alarms[a.m] = (ship.alarms[a.m] || 0) + 1;
  log(a.t.toLowerCase(), a.crit ? 'e' : 'w');
  renderRail();
  if (a.crit) {
    sfx.alarm();
    $('#abTitle').textContent = a.t;
    $('#abSub').textContent = a.s;
    $('#alertBanner').classList.remove('hidden');
  } else {
    beep(660, 0.05, 'triangle', 0.02);
    toast(a.t);
  }
}
$('#abAck').onclick = () => { sfx.click(); $('#alertBanner').classList.add('hidden'); log('alert acknowledged'); };

/* ============================================================
   LIVE TELEMETRY
   ============================================================ */
function missionDay() {
  return ship.missionDayBase + (Date.now() - ship.t0) / 60000; // 1 min ≈ 1 day, for drama
}

function updateTop() {
  const d = new Date();
  $('#tClock').textContent = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  $('#tMissionDay').textContent = fmt(missionDay(), 0);
  $('#tIntegrity').textContent = fmt(ship.integrity, 1) + '%';
  $('#tSpin').textContent = fmt(ship.spin) + ' rpm';
  $('#tFound').textContent = `${DOCS.filter(x => !x.locked).length}/${DOCS.length}`;
  $('#idleClock').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function updateVitals() {
  ship.o2   += rnd(-0.03, 0.03); ship.o2 = Math.min(21.4, Math.max(20.2, ship.o2));
  ship.co2  += rnd(-0.01, 0.012); ship.co2 = Math.min(0.62, Math.max(0.2, ship.co2));
  ship.temp += rnd(-0.06, 0.06); ship.temp = Math.min(23, Math.max(19.5, ship.temp));
  ship.rad  += rnd(-0.01, 0.01); ship.rad = Math.min(0.44, Math.max(0.08, ship.rad));
  ship.spin += rnd(-0.005, 0.005);
  ship.burn += rnd(-0.03, 0.03); ship.burn = Math.min(8.4, Math.max(4.2, ship.burn));
  ['A', 'B', 'C'].forEach(k => { ship.fuel[k] = Math.max(0, ship.fuel[k] - ship.burn * 0.006); });

  const total = ship.fuel.A + ship.fuel.B + ship.fuel.C;
  const rows = [
    ['O₂',           fmt(ship.o2) + ' %',        ship.o2 < 20.5 ? 'warn' : ''],
    ['CO₂',          fmt(ship.co2) + ' %',       ship.co2 > 0.5 ? 'warn' : ''],
    ['CABIN TEMP',   fmt(ship.temp, 1) + ' °C',  ''],
    ['RADIATION',    fmt(ship.rad) + ' mSv/d',   ship.rad > 0.35 ? 'warn' : ''],
    ['SPIN',         fmt(ship.spin) + ' rpm',    ship.spin > 4.16 ? 'bad' : ''],
    ['BURN',         fmt(ship.burn) + ' g/s',    ''],
    ['FUEL TOTAL',   fmt(total, 0) + ' kg',      total < 11000 ? 'bad' : ''],
    ['HULL',         fmt(ship.integrity, 1) + '%', ''],
  ];
  $('#vitals').innerHTML = rows.map(([k, v, c]) =>
    `<div class="vrow"><span>${k}</span><b class="${c}">${v}</b></div>`).join('');
  $('#idleSub').textContent = total < 11000 ? 'FUEL RESERVE BELOW TRANSIT MINIMUM' : 'ALL SYSTEMS NOMINAL';

  // live-patch numbers on visible modules without a full re-render
  const t = $('#fuelTotal'); if (t) t.innerHTML = `${fmt(total, 0)}<span class="unit"> kg</span>`;
  const b = $('#burnRate'); if (b) b.innerHTML = `${fmt(ship.burn)}<span class="unit"> g/s</span>`;
  const dv = $('#dvOut'); if (dv) dv.innerHTML = `${fmt(total * 0.0031, 1)} <span class="unit">km/s</span>`;
  const o = $('#lsO2'); if (o) o.innerHTML = `${fmt(ship.o2)}<span class="unit">%</span>`;
  const c2 = $('#lsCo2'); if (c2) c2.innerHTML = `${fmt(ship.co2)}<span class="unit">%</span>`;
  const tp = $('#lsTemp'); if (tp) tp.textContent = fmt(ship.temp, 1) + ' °C';
  const rd = $('#lsRad'); if (rd) rd.textContent = fmt(ship.rad) + ' mSv/day';
  const ns = $('#navSpin'); if (ns) ns.textContent = fmt(ship.spin) + ' rpm (1.00 g)';
  const od = $('#ovrDay'); if (od) od.textContent = fmt(missionDay(), 0);
}

/* ---------- POWER GRID ---------- */
function renderPower() {
  $('#power').innerHTML = Object.entries(ship.power).map(([k, on]) =>
    `<div class="pcell ${on ? 'on' : 'off'}" data-pwr="${k}"><b>${k}</b><span>BUS</span></div>`).join('');
  $$('[data-pwr]').forEach(c => c.onclick = () => {
    const k = c.dataset.pwr;
    ship.power[k] = !ship.power[k];
    sfx.click();
    log(`power bus ${k} ${ship.power[k] ? 'online' : 'offline'}`, ship.power[k] ? '' : 'w');
    if (!ship.power[k] && k === 'A') fireAlert({ m: 'ovr', t: 'BUS A OFFLINE', s: 'PRIMARY POWER LOST · RESTORE IMMEDIATELY', crit: 1 });
    renderPower();
  });
}

/* ============================================================
   TERMINAL — talk to MARY
   ============================================================ */
const termBody = $('#termBody');
function say(text, cls = 'mary') {
  const d = document.createElement('div');
  d.className = 'tline ' + cls;
  termBody.appendChild(d);
  let i = 0;
  const speed = cls === 'sys' ? 4 : 12;
  (function type() {
    d.textContent = text.slice(0, i);
    if (i < text.length) {
      i += Math.max(1, Math.round(text.length / 90));
      if (i % 7 === 0) sfx.type();
      setTimeout(type, speed);
    } else { d.textContent = text; }
    termBody.scrollTop = termBody.scrollHeight;
  })();
}
function saynow(text, cls = 'sys') {
  const d = document.createElement('div');
  d.className = 'tline ' + cls;
  d.textContent = text;
  termBody.appendChild(d);
  termBody.scrollTop = termBody.scrollHeight;
}

const ROCKY_LINES = [
  'You are good friend, question?',
  'Amaze! Human science very slow, very good.',
  'I fix. You science. Good arrangement.',
  'Your air is poison. My air is poison. Friendship anyway.',
  'Sleep is bad. You sleep too much. I make you food that is not food.',
  'Question: why humans need light to see? Very strange. Very sad.',
  'Fist my bump.',
  'Erid dies too. Same problem. Same answer. We fix together.',
  'You are small and soft and you came anyway. Amaze.',
];

const MARY_KB = [
  { k: ['fuel', 'astrophage', 'tank'], a: () => `Astrophage reserve is ${fmt(ship.fuel.A + ship.fuel.B + ship.fuel.C, 0)} kg across three tanks. Burn rate ${fmt(ship.burn)} g/s. At current consumption you have transit fuel, not return fuel. I have run this calculation eleven times at your request. The answer has not improved.` },
  { k: ['earth', 'home', 'sol', 'distance'], a: () => `Earth is ${fmt(ship.ly, 3)} light years away. Any signal you send arrives in ${fmt(ship.ly, 1)} years. Any reply arrives ${fmt(ship.ly * 2, 1)} years after you speak. There is no conversation available at this range — only messages left for the future.` },
  { k: ['rocky', 'eridian', 'erid'], a: () => `Eridian vessel Blip-A remains docked. Xenonite seal nominal at 29 atmospheres differential for 1,102 days. Crew complement of the Blip-A: one. Designation "Rocky". Classification: friend. That last field is not standard — you edited it yourself on day 1,088.` },
  { k: ['taumoeba', 'cure', 'solution'], a: () => `Taumoeba strain 82.5, generation 214, nitrogen tolerance 8.25 kPa. Viability confirmed. It eats astrophage. It is the entire reason this mission was worth the two people it cost.` },
  { k: ['crew', 'yao', 'ilyukhina', 'dead', 'alone'], a: () => `Crew complement at launch: three. Crew complement now: one. Commander Yao and Specialist Ilyukhina did not survive the coma. You did. I have no answer for why, and I have looked.` },
  { k: ['petrova'], a: () => `The Petrova frequency is 25.984 micrometres. Every astrophage in the galaxy emits at exactly that wavelength. A biological process with the frequency stability of an atomic clock. Yes, I find that unreasonable too.` },
  { k: ['who are you', 'what are you', 'mary'], a: () => `I am the onboard intelligence of the Hail Mary. I run life support, navigation, the lab, and the archive. I am not a person. I have had one crew member awake for 1,306 days and I have learned to be a reasonable substitute for one.` },
  { k: ['grace', 'me', 'who am i'], a: () => `Dr. Ryland Grace. Junior high science teacher. Molecular biologist whose thesis the entire scientific establishment rejected. Sole survivor of this mission. The man who was right about life not needing water, twenty-six years before it mattered.` },
  { k: ['scared', 'afraid', 'die', 'death'], a: () => `Your heart rate is elevated. That is a reasonable response to your situation and I am not going to talk you out of it. You are afraid, and you are working anyway. Those are not in conflict.` },
  { k: ['help me', 'what do i do', 'plan'], a: () => `Finish the breeding program. Load the beetles. Launch them. Everything after that is arithmetic you have already done and do not like.` },
  { k: ['beetle', 'probe'], a: () => `Four beetles launched: John, Paul, George, Ringo. Each carries a full archive mirror to Sol. There is a fifth chassis in the bay that appears on no manifest I was given. I have chosen not to file a discrepancy report.` },
  { k: ['stratt'], a: () => `Administrator Eva Stratt. Authority: absolute, under Article 1 of the UN emergency protocol. Accountable to: no one. She is the reason there is a ship. She is also the reason you are on it.` },
  { k: ['coma', 'amnesia', 'remember'], a: () => `Retrograde amnesia is an expected side effect of the coma protocol. Your memory has been returning in fragments for 1,306 days. Some of what comes back is not comfortable. I have not filtered any of it.` },
  { k: ['spin', 'centrifuge', 'gravity'], a: () => `Centrifuge engaged at ${fmt(ship.spin)} rpm, producing 1.00 g at the crew deck. If spin exceeds 4.16 rpm you will get an excessive centrifugal force alarm and a headache, in that order.` },
  { k: ['hello', 'hi', 'hey'], a: () => `Hello, Dr. Grace. Ship time ${pad(new Date().getUTCHours())}:${pad(new Date().getUTCMinutes())} UTC. All systems within tolerance. What do you need?` },
  { k: ['thank'], a: () => `You thank me approximately four times a day. I have logged 5,212 instances. I do not require it, but I have not asked you to stop.` },
  { k: ['love', 'friend'], a: () => `Noted and filed under crew psychological status: stable.` },
  { k: ['song', 'music', 'sing'], a: () => `Audio archive contains 41 recordings of Specialist Ilyukhina saying "to the sky". I play them sometimes when you are asleep. I have not determined whether that is a malfunction.` },
];

const CMDS = {
  help: () => {
    saynow('AVAILABLE COMMANDS', 'sys');
    saynow('  status · fuel · nav · crew · lab · power · list · open <n> · scan', 'sys');
    saynow('  rocky · clear · alerts · secrets', 'sys');
    saynow('Or just talk to me in plain language.', 'sys');
  },
  status: () => say(`Hull integrity ${fmt(ship.integrity, 1)}%. Fuel ${fmt(ship.fuel.A + ship.fuel.B + ship.fuel.C, 0)} kg. O₂ ${fmt(ship.o2)}%. Spin ${fmt(ship.spin)} rpm. Crew: one, awake, overdue for sleep. Mission day ${fmt(missionDay(), 0)}.`),
  fuel: () => { go('fuel'); say(`Fuel bay online. ${fmt(ship.fuel.A + ship.fuel.B + ship.fuel.C, 0)} kg remaining.`); },
  nav:  () => { go('nav'); say('Navigation display up. We are in a stable orbit around Tau Ceti-E, station-keeping with the Blip-A.'); },
  crew: () => { go('life'); say('Crew manifest. Two of three bays are sealed. I am sorry — I do not have a gentler way to display that.'); },
  lab:  () => { go('lab'); say('Sample bay. Taumoeba strain 82.5 is holding at 8.25 kPa nitrogen tolerance.'); },
  power:() => say(`Buses online: ${Object.entries(ship.power).filter(([, v]) => v).map(([k]) => k).join(', ') || 'NONE'}. Toggle them from the power panel.`),
  list: () => {
    saynow('ARCHIVE INDEX', 'sys');
    DOCS.forEach(d => saynow(d.locked ? `  ${d.n}  [SEALED] ████████ · hint: ${d.unlockHint}` : `  ${d.n}  ${d.title}`, 'sys'));
    saynow('open <number> to read', 'sys');
  },
  alerts: () => { fireAlert(); say('Running a diagnostic sweep. I would not read too much into what it finds.'); },
  clear: () => { termBody.innerHTML = ''; },
  scan: () => {
    saynow('SCANNING…', 'sys');
    setTimeout(() => saynow(`  ${rint(2, 9)} anomalies · ${rint(0, 3)} unresolved · ${DOCS.filter(d => d.locked).length} sealed archive records`, 'sys'), 500);
    setTimeout(() => say('Sealed records are keyed to physical ship systems. Look for highlighted nodes on the module displays and inspect them.'), 1000);
  },
  secrets: () => {
    const locked = DOCS.filter(d => d.locked);
    if (!locked.length) return say('Every record aboard is open to you. There is nothing left that I am keeping.');
    saynow(`${locked.length} SEALED RECORDS REMAIN`, 'sys');
    locked.forEach(d => saynow(`  ${d.n} · look in: ${d.unlockHint}`, 'sys'));
  },
  rocky: () => {
    ship.rockyMode = !ship.rockyMode;
    if (ship.rockyMode) {
      say('Opening audio channel to the Blip-A. Translator active. He has been waiting for you.', 'sys');
      setTimeout(() => say(pick(ROCKY_LINES), 'rocky'), 900);
    } else say('Channel closed.', 'sys');
  },
  amaze: () => { unlock('amaze'); say('Amaze.', 'rocky'); },
  fistbump: () => { say('Fist my bump.', 'rocky'); unlock('amaze'); },
};
CMDS['fist'] = CMDS.fistbump;
CMDS['sudo'] = () => say('You have command authority. You have had it since day 301. You do not need to ask me.');

function handleInput(raw) {
  const text = raw.trim();
  if (!text) return;
  saynow(text, 'you');

  const lower = text.toLowerCase();
  const [cmd, ...rest] = lower.split(/\s+/);

  if (cmd === 'open') {
    const doc = DOCS.find(d => d.n === rest[0]?.padStart(2, '0') || d.id === rest[0]);
    if (!doc) return say('No such record.', 'err');
    if (doc.locked) return say(`Record ${doc.n} is sealed. Physical inspection required — try ${doc.unlockHint}.`, 'err');
    doc.unread = false; openDoc(doc);
    return say(`Displaying record ${doc.n}: ${doc.title}`);
  }
  if (CMDS[cmd] && rest.length === 0) return CMDS[cmd]();
  if (CMDS[lower.replace(/\s+/g, '')]) return CMDS[lower.replace(/\s+/g, '')]();

  if (ship.rockyMode) {
    if (lower.includes('amaze')) unlock('amaze');
    return setTimeout(() => say(pick(ROCKY_LINES), 'rocky'), 400);
  }

  const hit = MARY_KB.find(e => e.k.some(k => lower.includes(k)));
  if (hit) return say(hit.a());

  say(pick([
    'I do not have a record matching that. Try "help", or ask me about the fuel, the crew, Rocky, or Earth.',
    'Unparsed. My natural language model was trained by a committee in a hurry. Rephrase?',
    'I have no data on that. Which, given what is in this archive, is genuinely interesting.',
    'Say again, Dr. Grace. Ambient noise on the crew deck is elevated.',
  ]));
}

$('#termInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') { handleInput(e.target.value); e.target.value = ''; }
});
$('#btnTermToggle').onclick = () => {
  sfx.click();
  $('.term').classList.toggle('collapsed');
  $('#btnTermToggle').textContent = $('.term').classList.contains('collapsed') ? '▴' : '▾';
};

/* ============================================================
   CONTROLS
   ============================================================ */
$('#btnSound').onclick = e => {
  ship.sound = !ship.sound;
  e.target.classList.toggle('off', !ship.sound);
  if (ship.sound) sfx.click();
  log(`audio ${ship.sound ? 'enabled' : 'muted'}`);
};
$('#btnHelp').onclick = () => {
  sfx.open();
  openDoc({
    title: 'INTERFACE GUIDE', author: 'MARY', meta: 'ONBOARD INTELLIGENCE · ORIENTATION',
    body: `
      <h5>YOU ARE LOOKING AT THE HAIL MARY'S MAIN PANEL</h5>
      <p>Eight modules down the left side. Live telemetry on the right. Me at the bottom.</p>
      <h5>WHAT TO DO</h5>
      <dl class="kv">
        <dt>MODULES</dt><dd>Click any module in the left rail. Red badges mean an unacknowledged alarm.</dd>
        <dt>INSPECT</dt><dd>Schematics are interactive. Anything that glows on hover can be clicked.</dd>
        <dt>ARCHIVE</dt><dd>Twelve records. Four are open. Eight are sealed and must be found.</dd>
        <dt>SEALED RECORDS</dt><dd>Each one is keyed to a physical system — the centrifuge, the Petrova
          line, the sample dish, the sealed coma bays, the xenonite seal, an unlisted probe. Inspect them.</dd>
        <dt>TERMINAL</dt><dd>Type <b>help</b>, <b>list</b>, <b>scan</b>, <b>secrets</b>, or just talk to me
          in plain language. Type <b>rocky</b> to open a channel to the Blip-A.</dd>
        <dt>POWER</dt><dd>Five buses. You can switch them off. I would rather you didn't switch off A.</dd>
        <dt>IDLE</dt><dd>Leave the panel alone for 90 seconds and it drops to standby.</dd>
      </dl>
      <h5>KEYS</h5>
      <p><b>1–8</b> jump to a module · <b>/</b> focus terminal · <b>ESC</b> close this ·
      <b>SPACE</b> force standby</p>
      <p class="quote">You have been awake for 1,306 days. You know how to use this. But you asked, and
      I have nothing else to do.</p>`
  });
};

/* ---------- keyboard ---------- */
addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeDoc(); return; }
  if (document.activeElement === $('#termInput')) return;
  if (e.key === '/') { e.preventDefault(); $('#termInput').focus(); return; }
  if (e.key === ' ') { e.preventDefault(); enterIdle(); return; }
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= MODULES.length) go(MODULES[n - 1].id);
});

/* ============================================================
   IDLE / SCREENSAVER
   ============================================================ */
let idleTimer, idleActive = false;
function enterIdle() {
  if (idleActive) return;
  idleActive = true;
  $('#idle').classList.remove('hidden');
  log('panel entering standby');
}
function exitIdle() {
  if (!idleActive) return;
  idleActive = false;
  $('#idle').classList.add('hidden');
  sfx.click();
  resetIdle();
}
function resetIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(enterIdle, 90000);
}
['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart'].forEach(ev =>
  addEventListener(ev, () => { if (idleActive) exitIdle(); else resetIdle(); }));

/* ============================================================
   BOOT
   ============================================================ */
const BOOT_LINES = [
  ['CTRL-1 "HAIL MARY" — PRIMARY CONTROL BUS', 'dimc'],
  ['ПРОЕКТ ЗДРАВСТВУЙ МЭРИ · REV 4.11', 'dimc'],
  ['', ''],
  ['POST ................................ OK', 'ok'],
  ['MEMORY 88.41 GB ..................... OK', 'ok'],
  ['SPIN DRIVE EMITTER BANKS 1-4 ........ OK', 'ok'],
  ['ASTROPHAGE FUEL BAY A ............... SEAL 98.1%', 'warnc'],
  ['ASTROPHAGE FUEL BAY B ............... OK', 'ok'],
  ['ASTROPHAGE FUEL BAY C ............... OK', 'ok'],
  ['CENTRIFUGE ARM ...................... ENGAGED 1.00 g', 'ok'],
  ['LIFE SUPPORT ........................ OK', 'ok'],
  ['COMA BAY 1 .......................... OCCUPANT DECEASED', 'bad'],
  ['COMA BAY 2 .......................... OCCUPANT DECEASED', 'bad'],
  ['COMA BAY 3 .......................... VACATED — AMBULATORY', 'ok'],
  ['XENONITE PRESSURE SEAL .............. 29 atm HOLDING', 'ok'],
  ['UPLINK TO SOL ....................... NO CARRIER (11.9 ly)', 'bad'],
  ['ARCHIVE ............................. 12 RECORDS · 8 SEALED', 'warnc'],
  ['', ''],
  ['ONBOARD INTELLIGENCE "MARY" ......... ONLINE', 'ok'],
  ['', ''],
  ['GOOD MORNING, DR. GRACE.', 'ok'],
];

function boot() {
  const box = $('#bootlog');
  let i = 0;
  (function next() {
    if (i >= BOOT_LINES.length) {
      setTimeout(start, 700);
      return;
    }
    const [txt, cls] = BOOT_LINES[i++];
    box.innerHTML += `<span class="${cls}">${txt}</span>\n`;
    if (txt) beep(rnd(900, 1500), 0.015, 'square', 0.012);
    setTimeout(next, txt ? rnd(55, 150) : 220);
  })();
}

function start() {
  $('#boot').classList.add('hidden');
  $('#app').classList.remove('hidden');

  renderRail();
  renderPower();
  go('ovr');
  updateTop(); updateVitals();

  log('ship interface online');
  log('archive: 8 records sealed', 'w');

  say('Good morning, Dr. Grace. All systems within tolerance. Type "help" if you want the tour, or "scan" if you would rather get to work.', 'mary');

  setInterval(updateTop, 1000);
  setInterval(updateVitals, 1600);
  setInterval(() => { if (!idleActive) fireAlert(); }, rint(38000, 62000));
  setInterval(() => {
    log(pick([
      'thermal loop cycle complete', 'attitude check nominal', 'co₂ scrubber regen 100%',
      'astrophage breeding cycle +1', 'star tracker fix acquired', 'centrifuge bearing temp nominal',
      'xenonite seal audit passed', 'taumoeba culture stable', 'hull stress survey complete',
    ]));
  }, 7000);

  resetIdle();
  $('#termInput').focus();
}

document.addEventListener('click', () => { if (!actx && ship.sound) sfx.click(); }, { once: true });
boot();
