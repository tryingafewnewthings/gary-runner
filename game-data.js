/**
 * GARY EATS! — AUTHORING DATA / HANDOFF 2026-10-10
 * Load before game.js as a classic script. No modules or build step required.
 *
 * ACTIVE: WORLD, GARY_SPRITES, STREET_ATLAS, BUILDINGS, KEEPERS, SHOP_PANES,
 * COBBLE_KINDS, ITEMS and the existing content lists below.
 * PLANNED ONLY: DEVELOPMENT_PLAN at the end. It is not a runtime controller.
 * See PROJECT_STATE.md for implementation order and verified scope.
 */

// 1. Active coordinate and animation contracts. Units are design-canvas pixels.
const WORLD = Object.freeze({
  width: 360,
  height: 640,
  roadWidth: 150,
  laneCount: 3, // Current row algorithms support exactly three lanes.
  pavementWidth: 16,
  playerY: 540,
  playerHeight: 142,
  playerFootOffset: 6,
  streetSegmentHeight: 360,
  buildingHeight: 236,
  cobbleCell: 48
});

const GARY_SPRITES = {
  walk: { file: 'gary_walk_sheet.PNG?v=1', columns: 6, rows: 1,
    frameTime: 0.16, anchor: { x: 0.5, y: 1 } },
  intro: { file: 'gary_intro_sheet.PNG?v=1', columns: 4, rows: 2,
    frameWidth: 384, frameHeight: 512, frameTime: 0.55, holdLast: true },
  cheer: 'gary_cheer.png?v=1',
  crash: 'gary_crash.png?v=1',
  gameOver: ['gary_run1.png?v=5', 'gary_run2.png?v=5']
};

const STREET_ATLAS = { file: 'high_street_sprites.webp?v=8', width: 2912, height: 2688 };

// 2. Active shop library. Indices intentionally retain the existing atlas order.
// Source rectangles are atlas pixels; SHOP_PANES uses local shop fractions.
// Shops render into 89 x 236 boxes. Preserve these six individual calibrations.
const BUILDINGS = [
  { name: 'Fish & Chips',       x: 12,   y: 57, w: 484, h: 1287, keeper: 0 },
  { name: 'Peri Peri Chicken',  x: 527,  y: 57, w: 443, h: 1287, keeper: 1 },
  { name: 'Bakery',             x: 999,  y: 57, w: 442, h: 1287, keeper: 2 },
  { name: 'The Red Lion',       x: 1467, y: 57, w: 442, h: 1287, keeper: 3 },
  { name: 'Butchers',           x: 1940, y: 57, w: 446, h: 1287, keeper: 4 },
  { name: 'Mallace Cafe',       x: 2422, y: 57, w: 476, h: 1287, keeper: 5 }
];

const KEEPERS = [
  { x: 53,   y: 1455, w: 383, h: 444 },
  { x: 534,  y: 1455, w: 378, h: 444 },
  { x: 1045, y: 1455, w: 333, h: 444 },
  { x: 1479, y: 1455, w: 412, h: 444 },
  { x: 1971, y: 1455, w: 411, h: 444 },
  { x: 2501, y: 1455, w: 326, h: 444 }
];

const SHOP_PANES = [
  { x: 0.06, y: 0.560, w: 0.56, h: 0.280 },
  { x: 0.06, y: 0.558, w: 0.55, h: 0.282 },
  { x: 0.07, y: 0.558, w: 0.54, h: 0.282 },
  { x: 0.12, y: 0.628, w: 0.52, h: 0.248 },
  { x: 0.08, y: 0.575, w: 0.52, h: 0.255 },
  { x: 0.06, y: 0.560, w: 0.55, h: 0.280 }
];

const COBBLE_KINDS = {
  base: 'IMG_7141.webp?v=6',
  weeds: 'IMG_7142.webp?v=6',
  light: 'IMG_7143.webp?v=6',
  sparse: 'IMG_7144.webp?v=6',
  dense: 'IMG_7145.webp?v=6',
  leaves: 'IMG_7146.webp?v=6',
  grime: 'IMG_7147.webp?v=6',
  cracked: 'IMG_7148.webp?v=6'
};

// 3. Active item registry. Geometry preserves the existing runner's hit tests.
// verticalRadius is in design pixels; laneRadius is in lane units, not pixels.
// Sprite display boxes and collision geometry are deliberately independent.
const ITEMS = {
  kebab: { kind: 'food', points: 5, file: null, fallback: 'kebab', displaySize: 50,
    collision: { verticalRadius: 32 * 150 / 189, laneRadius: 0.55 } },
  fish: { kind: 'food', points: 10, file: null, fallback: 'fish', displaySize: 50,
    collision: { verticalRadius: 32 * 150 / 189, laneRadius: 0.55 } },
  roast: { kind: 'food', points: 25, file: 'roast.png', fallback: 'roast', displaySize: 46,
    collision: { verticalRadius: 32 * 150 / 189, laneRadius: 0.55 } },
  m: { kind: 'hazard', points: 0, file: 'mushroom.png?v=1', fallback: 'm', displaySize: 52,
    collision: { verticalRadius: 32 * 150 / 189, laneRadius: 0.55 } },
  fork: { kind: 'hazard', points: 0, file: 'fork.png?v=1', fallback: 'fork', displaySize: 44,
    collision: { verticalRadius: 32 * 150 / 189, laneRadius: 0.55 } }
};

// Compatibility view: points are authored only in ITEMS.
const FOODS = Object.fromEntries(Object.entries(ITEMS)
  .filter(([, item]) => item.kind === 'food')
  .map(([id, item]) => [id, item.points]));

// 4. Active score tiers, captions, street dressing and row patterns.
const TIERS = [
  { n: 'Absolute Rubbish', c: '#ff4d4d' },
  { n: 'Bit Dry, Needs Salt', c: '#ffb02e' },
  { n: 'Proper Decent Food', c: '#39ff88' },
  { n: 'BEAUTIFUL!', c: '#00ffff' },
  { n: "I'll have to bring Danny here one day", c: '#ffe600' }
];


// Lines the caption can say. The run looks these up. It does not write them.
const LINES = {
  fork: 'Plastic fork.',
  m: 'Mushrooms. No.',
  close: 'Close one.'
};

const CAPS = [
  "Look at the absolute size of that portion, fellas! Phrwoar.",
  "The crackling is elite.",
  "Swimming in proper thick gravy. Get a load of that.",
  "That is an absolute unit of a pie."
];

const EVENTS = [
  { at: 25, say: "Right, let's see what this high street has got." },
  { at: 80, say: "The crackling is elite.", grin: true },
  { at: 160, say: "Swimming in proper thick gravy. Get a load of that." },
  { at: 300, say: "BEAUTIFUL!", grin: true },
  { at: 500, say: "I'll have to bring Danny here one day.", grin: true }
];

// Prop w/h describes ONE frame, not the whole horizontal sheet. cap is rendered height.
// A new prop needs a name, a picture, width, height and cap. The street adds the shadow and the ground sit.
const DETAILS = [
  { name: 'lamp', x: 646, y: 1956, w: 150, h: 715 },
  { name: 'postbox', file: 'postbox.png', w: 400, h: 900, cap: 64 },
  { name: 'bin', file: 'bin.png', w: 571, h: 750, cap: 52 },
  { name: 'bench', file: 'bench.png?v=8', w: 271, h: 480, cap: 100, frames: 3 },
  { name: 'tree', file: 'tree.png?v=2', w: 463, h: 864, cap: 78 },
  { name: 'board', file: 'board.png', w: 635, h: 940, cap: 58 }
];

// The street in order, from the start of a run. It repeats when it reaches the end.
// left and right are a shop name, or "none" for just pavement.
// object is a name from DETAILS, or "none".
// leftObject and rightObject are separate. A real street does not mirror itself,
// so most stretches have an object on one side only.
// Each side has three slots. Back is behind, middle is the main object, front is the small detail.
// leftObject and rightObject still mean the middle slot.
const STREET = [
  { left: 'Fish & Chips', right: 'none', leftMiddle: 'postbox', rightBack: 'lamp', rightFront: 'board', leftGround: 'weeds', rightGround: 'base' },
  { left: 'none', right: 'Bakery', leftObject: 'none', rightObject: 'none', leftGround: 'light', rightGround: 'weeds' },
  { left: 'none', right: 'none', leftObject: 'bench', rightObject: 'tree', rightGround: 'moss', leftGround: 'sparse' },
  { left: 'Peri Peri Chicken', right: 'none', leftObject: 'bin', rightObject: 'none', leftGround: 'damp', rightGround: 'dense' },
  { left: 'none', right: 'Butchers', leftObject: 'lamp', rightObject: 'none', leftGround: 'base', rightGround: 'light' },
  { left: 'none', right: 'none', leftObject: 'board', rightObject: 'none', leftGround: 'weeds', rightGround: 'moss' },
  { left: 'none', right: 'none', leftObject: 'postbox', rightObject: 'none', leftGround: 'sparse', rightGround: 'weeds' },
  { left: 'The Red Lion', right: 'Mallace Cafe', leftObject: 'none', rightObject: 'lamp', leftGround: 'dense', rightGround: 'light' },
  { left: 'none', right: 'none', leftObject: 'bin', rightObject: 'none', leftGround: 'moss', rightGround: 'base' },
  { left: 'none', right: 'Fish & Chips', leftObject: 'none', rightObject: 'postbox', leftGround: 'weeds', rightGround: 'dense' },
  { left: 'Bakery', right: 'none', leftObject: 'lamp', rightObject: 'none', leftGround: 'light', rightGround: 'sparse' },
  { left: 'none', right: 'none', leftObject: 'none', rightObject: 'bin', leftGround: 'base', rightGround: 'moss' }
];

// Stretches are the difficulty lever. The run picks one, plays it, then picks another.
// early is a score difficulty band, used under 250 points, in both day and night.
// mid is 250 to 900. late is after 900.
// Do not raise the speed cap to make this harder. Add a denser pattern here.
// Biome 2, the night version of this street, gets its own pool. It is not wired yet.
const STRETCHES = {
  early: [
    [ ['none','kebab','none'], ['none','kebab','none'], ['none','kebab','none'], ['none','fork','none'] ],
    [ ['kebab','none','fish'], ['none','fish','none'], ['fork','none','kebab'] ],
    [ ['none','none','fish'], ['none','kebab','none'], ['m','none','fish'] ]
  ],
  mid: [
    [ ['none','kebab','none'], ['none','kebab','none'], ['none','fork','none'], ['fish','none','none'] ],
    [ ['m','roast','m'], ['none','fish','none'], ['kebab','none','fork'] ],
    [ ['none','fork','kebab'], ['fish','none','none'], ['none','m','fish'], ['kebab','none','none'] ]
  ],
  late: [
    [ ['none','kebab','none'], ['none','fork','none'], ['m','fish','none'], ['none','roast','m'] ],
    [ ['fork','none','m'], ['none','kebab','none'], ['fish','none','fork'] ],
    [ ['m','none','fork'], ['none','fish','none'], ['kebab','none','m'], ['none','none','roast'] ]
  ]
};



// 5. DEVELOPMENT SPECIFICATION — never read by the current game loop.
// null means deliberately unresolved or asset not delivered; it is not a file path.
const DEVELOPMENT_PLAN = {
  "schemaVersion": 1,
  "status": "specification_only_not_executed",
  "milestone": "last_orders_encounter",
  "intent": "A warm, funny food journey into increasingly strange places. Gary remains recognisable and sincere.",
  "chapters": [
    {
      "id": "high_street_day",
      "chapter": 1,
      "runtimeStatus": "existing",
      "entryDistance": 0
    },
    {
      "id": "high_street_night",
      "chapter": 2,
      "runtimeStatus": "existing_lighting_only",
      "entryDistance": 4320,
      "fadeSeconds": 6
    },
    {
      "id": "deep_night_storm",
      "chapter": 3,
      "runtimeStatus": "planned",
      "entryDistance": null,
      "weather": "heavy_rain",
      "purpose": "Let ordinary night breathe, then darken and empty the street."
    },
    {
      "id": "last_orders_encounter",
      "chapter": 4,
      "runtimeStatus": "planned",
      "entryDistance": null,
      "cutsceneId": "last_orders"
    },
    {
      "id": "wilderness",
      "chapter": 5,
      "runtimeStatus": "planned",
      "entryDistance": null,
      "weather": "to_be_tuned",
      "purpose": "Trees replace the high street; eyes appear beyond the playable lanes."
    }
  ],
  "encounter": {
    "id": "last_orders_encounter",
    "oncePer": "run",
    "triggerOwner": "future_biome_controller",
    "trigger": {
      "type": "distance_after_night",
      "distance": null,
      "note": "Set through playtesting; never gate on a pickup or a score-caption callback."
    },
    "sequence": [
      {
        "phase": "storm_build",
        "control": "play",
        "spawnPolicy": "normal_safe_patterns",
        "visual": "Ramp heavy rain and deepen ambient colour while lanes remain readable."
      },
      {
        "phase": "clear_corridor",
        "control": "play",
        "spawnPolicy": "stop_new_hazards_and_dares",
        "visual": "Blend incoming street segments to empty shop slots; existing shops scroll away.",
        "exitCondition": "All active hazards/dares have cleared and the last shop is offscreen; player has not crashed."
      },
      {
        "phase": "slow_and_approach",
        "control": "cinematic",
        "spawnPolicy": "off",
        "visual": "Ease world to a slow walk, then stop. Stranger approaches on one chosen sidewalk.",
        "actorAnchor": "ground_contact",
        "exitCondition": "Actor reaches encounter marker; gameplay speed reaches zero."
      },
      {
        "phase": "dialogue",
        "control": "cutscene",
        "spawnPolicy": "off",
        "cutsceneId": "last_orders",
        "freeze": [
          "distance",
          "score",
          "lane",
          "objects",
          "spawnAccumulator",
          "reviewTimer",
          "itemEffectTimers",
          "walkAnimation"
        ],
        "continue": [
          "rain",
          "lanternGlow",
          "dialogueUI",
          "cutsceneAnimation"
        ]
      },
      {
        "phase": "reward_and_exit",
        "control": "cinematic",
        "spawnPolicy": "off",
        "action": "complete_encounter_once",
        "visual": "Display item receipt; stranger exits. Preserve the run and current lane."
      },
      {
        "phase": "resume",
        "control": "play",
        "spawnPolicy": "fresh_safe_lead_in",
        "visual": "Ease back toward stored gameplay pace, then continue toward wilderness.",
        "resetRun": false
      }
    ],
    "input": "Advance/skip taps are consumed; no simultaneous lane move. Ignore duplicate completion calls.",
    "resumeSafety": "Discard queued future rows intentionally at encounter entry only after active hazards clear; reset accumulator, seed lastLanes from a safe empty row, and use a full approach gap. Do not burst deferred spawns.",
    "backgroundPolicy": "Suspend both gameplay and presentation clocks/audio while tab is hidden. Restore the prior state without elapsed-time catch-up.",
    "failurePolicy": "Skip missing optional art; render a readable text panel. Missing required data fails back to the safe running corridor. No rewards duplicated by retries.",
    "tuning": {
      "slowSpeed": null,
      "approachSeconds": null,
      "darknessAlpha": null,
      "note": "Choose in a phone prototype; slowdown occurs only in a cleared corridor."
    }
  },
  "items": {
    "last_orders_lantern": {
      "status": "planned",
      "name": "The Last Orders Lantern",
      "kind": "equipment",
      "inventoryScope": "run",
      "description": "Battered chip-shop lantern, faded OPEN glass, warm amber light. Food, welcome and discovery carried into the wilderness.",
      "grant": {
        "source": "last_orders",
        "charges": 1,
        "oncePer": "run"
      },
      "activation": {
        "control": "separate_touch_button",
        "keyboard": "L",
        "allowedStates": [
          "play"
        ],
        "durationSeconds": 8,
        "maxCharges": 1,
        "consumeCharges": 1,
        "allowWhileActive": false
      },
      "recharge": {
        "onCollect": "roast",
        "setChargesTo": 1,
        "requiresOwnership": true,
        "extendActiveDuration": false
      },
      "effect": {
        "id": "reveal_bonus_food_trail",
        "implementationStatus": "planned",
        "behaviour": "Reveal an optional extra food trail on validated safe lanes. Existing hazards stay visible and unchanged.",
        "scorePolicy": "Normal item points and multipliers; no automatic collection.",
        "expiryPolicy": "Revealed food already spawned remains visible and collectible until passed; expiry stops new reveals.",
        "timingPolicy": "Eight seconds of active gameplay, not wall-clock time."
      },
      "ui": {
        "label": "Lantern",
        "showCharges": true,
        "showRemainingSeconds": true,
        "touchTargetCssPx": 44,
        "firstUseHint": "Light the lantern to reveal hidden food. Roast dinners recharge it."
      },
      "art": {
        "worldSprite": null,
        "inventoryIcon": null,
        "requiredBeforeEnable": true
      }
    }
  },
  "cutscenes": {
    "last_orders": {
      "status": "planned",
      "encounterId": "last_orders_encounter",
      "title": "Last Orders",
      "advance": "tap",
      "skipAvailable": true,
      "autoAdvance": false,
      "speakers": {
        "gary": {
          "label": "Gary",
          "portrait": null
        },
        "stranger": {
          "label": "Stranger",
          "portrait": null
        }
      },
      "steps": [
        {
          "id": "last_orders_01",
          "type": "dialogue",
          "speaker": "gary",
          "text": "Blimey. There were shops here a minute ago."
        },
        {
          "id": "last_orders_02",
          "type": "dialogue",
          "speaker": "stranger",
          "text": "Most people turn back when the lights go out."
        },
        {
          "id": "last_orders_03",
          "type": "dialogue",
          "speaker": "gary",
          "text": "I was hoping somewhere might still be serving."
        },
        {
          "id": "last_orders_04",
          "type": "dialogue",
          "speaker": "stranger",
          "text": "Yes. I thought you might."
        },
        {
          "id": "last_orders_05",
          "type": "direction",
          "speaker": null,
          "text": "The stranger lifts a small lantern. Beneath the dirt on its glass, the word OPEN glows."
        },
        {
          "id": "last_orders_06",
          "type": "dialogue",
          "speaker": "stranger",
          "text": "This hung outside my shop. We left it burning until the last customer had eaten."
        },
        {
          "id": "last_orders_07",
          "type": "dialogue",
          "speaker": "gary",
          "text": "What happened to the shop?"
        },
        {
          "id": "last_orders_08",
          "type": "dialogue",
          "speaker": "stranger",
          "text": "Road doesn’t go past it anymore."
        },
        {
          "id": "last_orders_09",
          "type": "direction",
          "speaker": null,
          "text": "He holds out the lantern."
        },
        {
          "id": "last_orders_10",
          "type": "dialogue",
          "speaker": "stranger",
          "text": "Take it. There’s good food beyond this street. You’ll need a little help finding it."
        },
        {
          "id": "last_orders_11",
          "type": "dialogue",
          "speaker": "gary",
          "text": "What do I owe you?"
        },
        {
          "id": "last_orders_12",
          "type": "dialogue",
          "speaker": "stranger",
          "text": "If you find somewhere good… tell people."
        },
        {
          "id": "last_orders_13",
          "type": "dialogue",
          "speaker": "gary",
          "text": "Well, I can certainly do that."
        },
        {
          "id": "last_orders_14",
          "type": "direction",
          "speaker": null,
          "text": "Gary takes the lantern. Its light grows warmer."
        },
        {
          "id": "last_orders_15",
          "type": "dialogue",
          "speaker": "stranger",
          "text": "One more thing. When you reach the trees, you’ll see eyes in the dark."
        },
        {
          "id": "last_orders_16",
          "type": "dialogue",
          "speaker": "gary",
          "text": "Right…"
        },
        {
          "id": "last_orders_17",
          "type": "dialogue",
          "speaker": "stranger",
          "text": "Some of them are only waiting for their supper."
        },
        {
          "id": "last_orders_18",
          "type": "direction",
          "speaker": null,
          "text": "The lantern flickers. The stranger is already walking away."
        },
        {
          "id": "last_orders_19",
          "type": "dialogue",
          "speaker": "gary",
          "text": "Lovely bloke. Didn’t catch his name."
        }
      ],
      "completion": {
        "handler": "complete_encounter_once",
        "actions": [
          {
            "type": "grant_item",
            "itemId": "last_orders_lantern",
            "charges": 1
          },
          {
            "type": "mark_encounter_seen",
            "encounterId": "last_orders_encounter"
          },
          {
            "type": "resume_preserved_run"
          }
        ],
        "sameActionsWhenSkipped": true
      },
      "directionPolicy": "Direction steps are cinematic staging, not automatically dialogue captions; implement them or use a short accessible narration fallback.",
      "durationNote": "Player-paced, roughly a minute at a relaxed reading speed; do not force this text into a ten-second scene."
    }
  },
  "artBacklog": [
    {
      "id": "stranger_world",
      "file": null,
      "status": "needed",
      "brief": "Elderly former chip-shop owner in a raincoat, carrying a dry takeaway bag; face partly obscured. Full-body ground-anchored sprite in the existing camera."
    },
    {
      "id": "stranger_portrait",
      "file": null,
      "status": "needed",
      "brief": "Same character and costume, readable face detail for dialogue; portrait framing may differ from world sprite."
    },
    {
      "id": "lantern_world",
      "file": null,
      "status": "needed",
      "brief": "Battered lantern with faded OPEN lettering, transparent unlit body; restrained amber glow added separately."
    },
    {
      "id": "lantern_icon",
      "file": null,
      "status": "needed",
      "brief": "Recognisable simplified silhouette at actual UI size; charge must not depend on tiny lettering."
    },
    {
      "id": "rain_splash",
      "file": null,
      "status": "candidate_exists_outside_repo_not_verified",
      "brief": "Inspect the earlier eight-frame splash candidate; verify dimensions and alpha before choosing a repository filename."
    },
    {
      "id": "wilderness_set",
      "file": null,
      "status": "needed",
      "brief": "Ground, edge vegetation, trees and eyes; keep lane geometry and gameplay readability."
    }
  ],
  "laterReveal": "An abandoned chip shop with an empty lantern bracket and a photograph behind the counter. Optional story payoff; not a required mechanic.",
  "guardrails": [
    "No darkness-dependent invisible hazards.",
    "No full-screen flash or input delay for atmosphere.",
    "No collision/scoring effects in render().",
    "No dynamic code execution from dialogue data.",
    "No placeholder asset filename loaded as if it already exists."
  ]
};