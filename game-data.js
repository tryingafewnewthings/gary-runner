// This file is the list of things you can add without touching how the game runs.
//
// A line in EVENTS is a specific moment. It happens once, when the score
// reaches "at". Say what Gary says. grin: true makes him smile.
// Keep the moments in any order. The game sorts them.
//
// A line in DETAILS is an object on the pavement, such as a postbox.
// The numbers are where that object sits in the sprite sheet.

const TIERS = [
  { n: 'Absolute Rubbish', c: '#ff4d4d' },
  { n: 'Bit Dry, Needs Salt', c: '#ffb02e' },
  { n: 'Proper Decent Food', c: '#39ff88' },
  { n: 'BEAUTIFUL!', c: '#00ffff' },
  { n: "I'll have to bring Danny here one day", c: '#ffe600' }
];

const FOODS = { kebab: 5, fish: 10, roast: 25 };

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

// A new prop needs a name, a picture, width, height and cap. The street adds the shadow and the ground sit.
const DETAILS = [
  { name: 'lamp', x: 646, y: 1956, w: 150, h: 715 },
  { name: 'postbox', file: 'postbox.png', w: 400, h: 900, cap: 64 },
  { name: 'bin', file: 'bin.png', w: 571, h: 750, cap: 52 },
  { name: 'bench', file: 'bench.png?v=7', w: 484, h: 545, cap: 58 },
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

// One row of the road, in order. Three lanes: left, middle, right.
// none leaves a lane empty. kebab, fish and roast are food. fork and m are hazards.
// The pictures do not change. This only decides what comes next.
const ROWS = [
  { lanes: ['none', 'kebab', 'none'] },
  { lanes: ['none', 'kebab', 'none'] },
  { lanes: ['none', 'kebab', 'none'] },
  { lanes: ['none', 'fork', 'none'] }
];

// Stretches are short patterns. The run picks one, so the road does not repeat eight rows.
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
