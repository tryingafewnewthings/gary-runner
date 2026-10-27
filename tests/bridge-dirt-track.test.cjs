'use strict';
// Bridge approach regression: world-locked 1:1 dirt/stone terrain above the
// native three-lane road, without any new runtime texture allocations.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function harness() {
  const paint = [];
  let canvases = 0;
  const makeContext = () => {
    const context = {};
    for (const key of [
      'scale','translate','save','restore','beginPath','moveTo','lineTo',
      'quadraticCurveTo','closePath','fill','stroke','ellipse','clearRect',
      'fillRect','rect','clip'
    ]) context[key] = () => {};
    context.drawImage = (...args) => paint.push(args);
    context.createLinearGradient = () => ({addColorStop() {}});
    return context;
  };
  class StubImage {
    set src(value) { this._src = value; this.onload?.(); }
    decode() { return Promise.resolve(); }
  }
  const root = {
    location: {search: ''},
    devicePixelRatio: 1,
    setTimeout: callback => callback(),
    document: {createElement: () => {
      canvases++;
      return {width: 0, height: 0, getContext: makeContext};
    }}
  };
  const source = fs.readFileSync(path.join(__dirname,'../gary-road-evolution.js'),'utf8');
  vm.runInNewContext(source, {window:root,WORLD:{width:360,roadWidth:150},
    Image:StubImage,URLSearchParams}, {filename:'gary-road-evolution.js'});
  return {api:root.GaryRoadEvolution,paint,makeContext,count:()=>canvases};
}

test('bridge track is prebuilt, three-lane-wide, bridge-anchored and clipped to screen', async () => {
  const {api,paint,makeContext,count} = harness();
  assert.equal(api.drawBridgeApproach(makeContext(),{near:100,height:640}),false);
  await api.prepare();
  assert.equal(api.snapshot().bridgeTrackReady,true);
  assert.equal(api.snapshot().bridgeTrackLength,680);
  assert.equal(api.stats().bridgeTrackAtlases,1);
  const preparedCount=count();
  paint.length=0;
  assert.equal(api.drawBridgeApproach(makeContext(),{near:180,height:640}),true);
  assert.equal(paint.length,1);
  assert.deepEqual(Array.from(paint[0].slice(1)),[0,0,150,460,105,180,150,460]);
  paint.length=0;
  assert.equal(api.drawBridgeApproach(makeContext(),{near:-180,height:640}),true);
  assert.deepEqual(Array.from(paint[0].slice(1)),[0,180,150,500,105,0,150,500]);
  paint.length=0;
  assert.equal(api.drawBridgeApproach(makeContext(),{near:700,height:640}),false);
  assert.equal(api.drawBridgeApproach(makeContext(),{near:-700,height:640}),false);
  assert.equal(paint.length,0);
  assert.equal(count(),preparedCount,'drawing must not allocate canvases');
  assert.equal(api.stats().bridgeTrackBlits,2);
});
