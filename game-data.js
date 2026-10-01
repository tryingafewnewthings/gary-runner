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

const DETAILS = [
  { name: 'lamp', x: 646, y: 1956, w: 150, h: 715 },
  { name: 'postbox', x: 1278, y: 2120, w: 255, h: 556 },
  { name: 'bin', x: 1859, y: 2226, w: 317, h: 444 }
];

// The street in order, from the start of a run. It repeats when it reaches the end.
// left and right are a shop name, or "none" for just pavement.
// object is a name from DETAILS, or "none".
// leftObject and rightObject are separate. A real street does not mirror itself,
// so most stretches have an object on one side only.
const STREET = [
  { left: 'Fish & Chips', right: 'Bakery', leftObject: 'postbox', rightObject: 'none' },
  { left: 'none', right: 'none', leftObject: 'none', rightObject: 'lamp' },
  { left: 'Peri Peri Chicken', right: 'Butchers', leftObject: 'bin', rightObject: 'none' },
  { left: 'none', right: 'none', leftObject: 'none', rightObject: 'postbox' },
  { left: 'The Red Lion', right: 'Mallace Cafe', leftObject: 'lamp', rightObject: 'none' },
  { left: 'none', right: 'none', leftObject: 'none', rightObject: 'bin' }
];

// One row of the road, in order. Three lanes: left, middle, right.
// none leaves a lane empty. kebab, fish and roast are food. fork and m are hazards.
// The pictures do not change. This only decides what comes next.
const ROWS = [
  { lanes: ['kebab', 'none', 'fish'] },
  { lanes: ['none', 'fork', 'kebab'] },
  { lanes: ['roast', 'none', 'none'] },
  { lanes: ['none', 'fish', 'm'] },
  { lanes: ['kebab', 'none', 'fork'] },
  { lanes: ['none', 'roast', 'fish'] },
  { lanes: ['m', 'kebab', 'none'] },
  { lanes: ['fish', 'none', 'roast'] }
];
