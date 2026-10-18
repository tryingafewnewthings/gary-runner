/* Gary Eats! distance difficulty V2 — seeded procedural generator and finite-state route validator. */
(function(root){
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const laneRoles=row=>Array.isArray(row)?row:row.roles||row.lanes;
const hazard=role=>role==='hazard_basic'||role==='hazard_wide';
const isWide=row=>laneRoles(row).includes('hazard_wide');
function occupied(row){
  const roles=laneRoles(row), blocked=[false,false,false];
  if(roles.length!==3)throw Error('A row must have 3 lane roles');
  for(let i=0;i<3;i++){
    if(roles[i]==='hazard_basic')blocked[i]=true;
    if(roles[i]==='hazard_wide'){
      if(i>=2||roles[i+1]!==null)throw Error('Invalid two-lane barrier footprint');
      blocked[i]=blocked[i+1]=true;
    }
  }
  return blocked;
}
function safeLanesOf(row){const mask=occupied(row);return [0,1,2].filter(i=>!mask[i]);}
function reachableAfter(from,row,gap,budget){
  if(!(gap>0)||!Array.isArray(from))return [];
  return safeLanesOf(row).filter(to=>from.some(start=>gap>Math.abs(start-to)*budget.moveCost+budget.reaction+budget.margin));
}
function seeded(input){let x=(Number(input)>>>0)||0x6d2b79f5;return()=>((x^=x<<13,x^=x>>>17,x^=x<<5)>>>0)/4294967296;}
function distanceLevel(distance,biomes){
  const d=Math.max(0,distance), index=biomes.findIndex((b,i)=>d<b.endDistance||i===biomes.length-1);
  const biome=biomes[Math.max(0,index)];
  // Each biome takes about 3–4 minutes at the 200–300 px/s normal speed.
  // After the final authored biome, repeat independent 36000px chapters forever.
  const span=biome.endDistance-biome.startDistance;
  const elapsed=Math.max(0,d-biome.startDistance);
  const cycle=Math.floor(elapsed/span);
  const progress=(elapsed%span)/span;
  const floor=clamp(biome.levelFloor+cycle*5,0,88),ceiling=clamp(biome.levelCeiling+cycle*5,0,100);
  const beat=progress<.16?'teach':progress<.65?'build':progress<.81?'peak':'release';
  const local=beat==='teach'?.08:beat==='build'?(progress-.16)/.49*.75+.08:beat==='peak'?1:.88;
  const level=clamp(Math.round(floor+(ceiling-floor)*local),0,100);
  return {level,intensity:beat,biome,biomeIndex:Math.max(0,index),progress,cycle,
    chaos:clamp(.07+level*.01,0,1)};
}
// Static rating of a newly sampled layout at the actual incoming row gap.
function rate(row,from,gap,budget){
  const roles=laneRoles(row),safe=safeLanesOf(row),count=3-safe.length;
  const shifts=Math.min(2,...safe.flatMap(to=>from.map(start=>Math.abs(start-to))));
  const empty=safe.filter(l=>roles[l]==='none').length;
  const tight=clamp((1.22-gap)*23,0,17);
  return clamp(Math.round(count*21+(count?4:0)+shifts*10+tight+empty*5+(isWide(row)?2:0)+(row.dare?-7:0)),0,100);
}
const DARE=Object.freeze(['hazard_basic','food_high','hazard_basic']);
function create(settings,biomes,items,initialSeed){
  const budget=settings.readBudget;
  if(!(budget?.moveCost>0&&budget.reaction>0&&budget.margin>=0))throw Error('Invalid read budget');
  if(!Array.isArray(biomes)||biomes.length<2||biomes.length>10)throw Error('Expected between 2 and 10 authored biomes');
  let rng,seed=0,state=distanceLevel(0,biomes),distance=0,reachable=[0,1,2];
  let lastWasWide=false,lastDare=false,introducedWide=false,rows=0,nextLeadIn=false;
  // GaryStreetSequence20261018V1: wide hazards require the late, decaying street.
  let wideAllowed=false;
  let layouts=[],sixgrams=new Set(),hazardRuns=[0,0,0],assist=0,cleanSeconds=0,crashes=[],wideWindow=[];
  const stats={attempted:0,procedural:0,setpieces:0,fallback:0,rejected:0,
    ratingRejected:0,reachRejected:0,repetitionRejected:0,validationFailures:0,
    wide:0,layoutRepeat:0,triples:0,sixgramRepeat:0,maxHazardStreak:0};
  const pick=list=>list[Math.floor(rng()*list.length)];
  const maskString=roles=>roles.map(r=>r==='hazard_wide'?'W':r==='hazard_basic'?'H':r==='food_high'?'R':r==='food_low'?'F':r===null?'_':'.').join('');
  function newSeed(){
    try{const a=new Uint32Array(1);root.crypto?.getRandomValues?.(a);if(a[0])return a[0];}catch(_){}
    return ((Date.now()^(Math.random()*4294967296))>>>0)||1;
  }
  function reset(newValue){
    seed=((newValue??initialSeed??newSeed())>>>0)||1;rng=seeded(seed);
    state=distanceLevel(0,biomes);distance=0;reachable=[0,1,2];
    lastWasWide=lastDare=introducedWide=nextLeadIn=false;wideAllowed=false;rows=0;layouts=[];sixgrams=new Set();hazardRuns=[0,0,0];wideWindow=[];cleanSeconds=0;
    // Assist and crash history persist briefly, but decay in clean play.
    for(const key of Object.keys(stats))stats[key]=0;
  }
  function progress(d,dt){
    distance=Math.max(0,d);state=distanceLevel(distance,biomes);
    if(dt>0){cleanSeconds+=dt;const delta=dt*(0.1/30);assist=assist>0?Math.max(0,assist-delta):Math.min(0,assist+delta);}
    return state;
  }
  function effectiveLevel(){return clamp(Math.round(state.level*(1-clamp(assist,-.1,.1))),0,100);}
  function gapFor(level,lead){
    const b=settings.baseGap-settings.gapDecrease*level/100;
    return Math.max(lead?settings.approachGap:settings.gapFloor,b*(1+assist)+rng()*settings.gapJitter,
      budget.reaction+2*budget.moveCost+budget.margin+.015);
  }
  function generate(level){
    const chaos=clamp(.07+level*.010,0,1);
    // Noise increases with chaos but hazard count follows the distance level.
    let count=level<17?0:level<45?1:2;
    if(rng()<chaos*.30) count=clamp(count+(rng()<.5?-1:1),0,2);
    const lanes=['none','none','none'], wide=wideAllowed && state.biomeIndex>=1 && level>=settings.wideIntroductionLevel &&
      !lastWasWide && !lastDare && (!introducedWide ? rng()<.28 : count===2 && rng()<(.10+.15*chaos));
    if(wide){const anchor=rng()<.5?0:1;lanes[anchor]='hazard_wide';lanes[anchor+1]=null;}
    else if(count){
      const pool=[0,1,2];
      for(let j=0;j<count;j++){const at=Math.floor(rng()*pool.length);lanes[pool.splice(at,1)[0]]='hazard_basic';}
    }
    const safe=safeLanesOf(lanes);const must=pick(safe);lanes[must]='food_low';
    for(const i of safe)if(i!==must&&rng() < (.22+chaos*.30))lanes[i]='food_low';
    return {roles:lanes,dare:false};
  }
  function validation(roles,gap,level,lead,dare){
    const mask=occupied(roles);
    const next=reachableAfter(reachable,roles,gap,budget);
    if(!next.length){stats.reachRejected++;return null;}
    if(!roles.some((r,i)=>!mask[i]&&(r==='food_low'||r==='food_high'))){stats.validationFailures++;return null;}
    const wide=isWide(roles);
    if(wide&&(!wideAllowed||state.biomeIndex<1||level<settings.wideIntroductionLevel||lastWasWide||lastDare||dare||wideWindow.reduce((a,b)=>a+b,0)>=Math.floor(Math.max(1,wideWindow.length)*.15)))return null;
    if(dare&&(lastWasWide||lastDare||state.intensity!=='peak'))return null;
    for(let i=0;i<3;i++)if(mask[i]&&hazardRuns[i]>=3){stats.repetitionRejected++;return null;}
    const key=maskString(roles),n=layouts.length;
    if(n>=2&&layouts[n-1]===key&&layouts[n-2]===key){stats.repetitionRejected++;return null;}
    const six=n>=5?layouts.slice(-5).concat(key).join('|'):null;
    if(six&&sixgrams.has(six)){stats.repetitionRejected++;return null;}
    const rating=rate({roles,dare},reachable,gap,budget);
    if(!lead&&Math.abs(rating-level)>24){stats.ratingRejected++;return null;}
    return {next,mask,key,six,rating,wide};
  }
  function fallback(gap,level){
    // Always safe, visible and non-repeating; fallback explicitly exempts the rating band.
    const pool=[];
    for(let j=0;j<3;j++)for(let k=0;k<3;k++){
      const roles=['none','none','none'];roles[j]='food_low';if(k!==j)roles[k]='food_low';
      const proof=validation(roles,gap,level,true,false);if(proof)pool.push({roles,proof});
    }
    if(!pool.length){stats.validationFailures++;throw Error('No valid safe fallback for seed '+seed+' row '+rows);}
    return pick(pool);
  }
  function row(d,opts={}){
    progress(d,0);stats.attempted++;
    const level=effectiveLevel(),lead=nextLeadIn||!!opts.leadIn;
    const gap=gapFor(level,lead);
    let selected=null,kind='procedural';
    if(!lead && state.intensity==='peak' && level>=38 && !lastWasWide && !lastDare && rng()<.085){
      const roles=DARE.slice(),proof=validation(roles,gap,level,false,true);
      if(proof){selected={roles,proof,dare:true};kind='setpiece';}
    }
    if(!selected){
      for(let tries=0;tries<5;tries++){
        const candidate=generate(level),proof=validation(candidate.roles,gap,level,lead,false);
        if(proof){selected={roles:candidate.roles,proof,dare:false};break;}
        stats.rejected++;
      }
    }
    if(!selected){const safe=fallback(gap,level);selected={roles:safe.roles,proof:safe.proof,dare:false};kind='fallback';}
    const {roles,proof}=selected;const mapped=roles.map(r=>r&&r!=='none'?state.biome.roles[r]:'none');
    if(mapped.some((v,i)=>v!=='none'&&!items[v]))throw Error('Unknown biome role map '+state.biome.id);
    if(proof.wide&&!introducedWide&&!roles.some(r=>r==='food_low'))throw Error('Wide introduction missing breadcrumbs');
    const repeat=layouts.at(-1)===proof.key;
    if(repeat)stats.layoutRepeat++;
    if(proof.six){if(sixgrams.has(proof.six))stats.sixgramRepeat++;sixgrams.add(proof.six);}
    if(layouts.at(-2)===proof.key && repeat)stats.triples++;
    layouts.push(proof.key);if(layouts.length>6)layouts.shift();
    for(let i=0;i<3;i++){hazardRuns[i]=proof.mask[i]?hazardRuns[i]+1:0;stats.maxHazardStreak=Math.max(stats.maxHazardStreak,hazardRuns[i]);}
    reachable=proof.next;lastWasWide=proof.wide;lastDare=selected.dare;
    if(proof.wide){introducedWide=true;stats.wide++;}
    wideWindow.push(proof.wide?1:0);if(wideWindow.length>100)wideWindow.shift();
    rows++;nextLeadIn=false;stats[kind==='setpiece'?'setpieces':kind]++;
    return {id:(kind==='setpiece'?'dare':kind==='fallback'?'fallback':'proc')+'-'+String(rows)+'-'+proof.key,
      lanes:mapped,roles:roles.slice(),safeLanes:safeLanesOf(roles),reachable:reachable.slice(),rating:proof.rating,
      level,gap,dare:selected.dare,wide:proof.wide,intensity:state.intensity,biome:state.biome.id,
      chaos:clamp(.07+level*.010,0,1),seed,source:kind};
  }
  function recordCrash(type,patternId,atDistance=distance){
    const now=Date.now();crashes=crashes.filter(t=>now-t<=40000);crashes.push(now);
    if(crashes.length>=2)assist=.1;cleanSeconds=0;
    try{const key='gary_difficulty_telemetry_v2',v=JSON.parse(root.localStorage?.getItem(key)||'[]');
      if(Array.isArray(v)){v.push({distance:Math.round(atDistance),hazardType:String(type),patternId:String(patternId||'unknown'),seed,at:now});
        root.localStorage?.setItem(key,JSON.stringify(v.slice(-50)));}}catch(_){}
  }
  function storyAllowed(clear,dareActive){return state.intensity==='release'&&clear&&!dareActive&&distance>=state.biome.startDistance;}
  function fullApproach(){reachable=[0,1,2];lastWasWide=lastDare=false;nextLeadIn=true;hazardRuns=[0,0,0];}
  reset();
  return Object.freeze({reset,progress,row,fullApproach,recordCrash,storyAllowed,
    allowWide(value){wideAllowed=!!value;},
    get state(){return state;},get seed(){return seed;},get assist(){return assist;},
    get reachable(){return reachable.slice();},stats:()=>({...stats}),
    verify:(roles,gap)=>reachableAfter(reachable,roles,gap,budget)});
}
const api=Object.freeze({create,distanceLevel,safeLanesOf,reachableAfter,rate,seeded,occupied});
if(typeof module==='object'&&module.exports)module.exports=api;else root.GaryDifficulty=api;
})(typeof window==='object'?window:globalThis);
