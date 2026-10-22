(() => {
  'use strict';
  /*
   * Active runtime: fixed simulation, interpolated rendering, pooled entities and guarded states.
   * PROJECT_STATE.md owns priorities; STYLE.txt owns visual approval.
   * All authored geometry, atlas crops and item definitions live in game-data.js.
   * Cutscene Studio V3 owns dialogue; planned item handovers are not active. Heavy rain is live. It builds after a settled night.
   *
   * Reading map: setup -> assets -> street rendering -> procedural item art ->
   * run lifecycle -> safe row spawning -> collection/rating -> audio -> update ->
   * lighting/player/HUD rendering -> input and main loop.
   * update() owns animation time. render() must never grant items or advance play.
   */
  const {FixedStepClock, ObjectPool, sweptContact, lerp} = window.GaryCore;
  const bridgePreviewSession=new URLSearchParams(location.search).get('debug')==='1'&&new URLSearchParams(location.search).get('bridgepreview')==='1';
  const bestStorageKey=bridgePreviewSession?'gary-bridge-preview-best':'garyBest';
  const simulation = new FixedStepClock(60, 6);
  const director = window.GaryDifficulty.create(DIFFICULTY, BIOMES, ITEMS);
  const scoreEvents = EVENTS.slice().sort((a, b) => a.at - b.at);

  const W = WORLD.width, H = WORLD.height, CX = W / 2;
  const ROAD_WIDTH = WORLD.roadWidth;
  const S = ROAD_WIDTH / 189;
  const ROAD_LEFT = (W - ROAD_WIDTH) / 2;
  const ROAD_RIGHT = ROAD_LEFT + ROAD_WIDTH;
  const LANE_WIDTH = ROAD_WIDTH / WORLD.laneCount;
  const PLAYER_Y = WORLD.playerY;

  const PAVEMENT_WIDTH = WORLD.pavementWidth;
  const BUILDING_WIDTH = ROAD_LEFT - PAVEMENT_WIDTH; // 89 at the current design size
  const STREET_SEGMENT_H = WORLD.streetSegmentHeight;
  const BUILDING_H = WORLD.buildingHeight;
  const DETAIL_H = STREET_SEGMENT_H - BUILDING_H;

  const PROPS = DETAILS.map(definition => ({ ...definition }));
  PROPS.forEach(p => { if (p.file) { p.img = new Image(); p.img.src = p.file; } });

  const $ = id => document.getElementById(id);
  const cv = $('c');
  const ctx = cv.getContext('2d');
  const stage = $('stage');
  const garyAudio = $('garyAudio');
  const introAvatarCv = $('introAvatar');
  const introCtx = introAvatarCv.getContext('2d');

  let K = 1;
  let state = 'menu';
  let score = 0, best = 0, tierMax = 0;
  let lane = 1, target = 1;
  // Predictable, eased lane changes leave collision checks on the actual lane.
  const LANE_CHANGE_SECONDS = DIFFICULTY.readBudget.moveCost;
  const MAX_LANE_LEAN = 0.045; // Approximately 2.6 degrees.
  let laneStart = 1, laneTime = LANE_CHANGE_SECONDS;
  let laneDuration = LANE_CHANGE_SECONDS, laneLean = 0;
  let scrollY = 0, distance = 0, acc = 0, gap = 1.1;
  const itemPool = new ObjectPool(96, () => ({t:'', l:0, y:0, previousY:0, id:0, patternId:'', d:0, dare:0, refused:0, near:0, cleared:0,foxEvent:0}));
  const effectPool = new ObjectPool(48, () => ({x:0,y:0,t:0,life:1,txt:'',col:'#fff',pop:0}));
  const starPool = new ObjectPool(128, () => ({x:0,y:0,previousX:0,previousY:0,vx:0,vy:0,life:0,maxLife:1,size:1}));
  const objs = itemPool.active, fx = effectPool.active, stars = starPool.active;
  let cap = null, mile = 0, crashT = 0, clock = 0, uid = 0;
  let grinTimer = 0, lastTierIndex = 0, nextEvent = 0, nextRow = 0, roadQueue = [], nearCd = 0, lastHit = null, shownSpeed = 200, flash = 0;
  let review = 0, reviewMul = 1, reviewGap = 0, hitStop = 0;
  let lastLanes = ['none', 'none', 'none'];
  let pendingRow = null;
  let playTime = 0, nightMix = 0;
  // Night biome. NIGHT_MODE is the switch: false stays daylight, true is the night street.
  // It stays off on the menu. A run fades into night once the first shop plan has passed.
  // Set NIGHT_PREVIEW to true to see night from the first frame of play.
  const NIGHT_MODE = true;
  const NIGHT_PREVIEW = false;
  const NIGHT_FADE = 6;
  let nightOn = false;
  // Rain is presentation. It does not touch speed, spawns, or collision.
  // ?rain=1 ramps the storm as soon as play starts, for a visual check.
  const RAIN_PREVIEW = /(?:\?|&)rain=1(?:&|$)/.test(location.search);
  const STREAK_COUNT = 126;
  const SPLASH_COUNT = 34;
  let nightHeld = 0, rainMix = 0, rainSaid = false;
// GaryStreetSequence20261018V2: guarded shop-state and scenery presentation.
let shutterMix = 0;
  let rainGain = null;
  const streaks = [];
  const splashes = [];
  for (let i = 0; i < STREAK_COUNT; i++) streaks.push(makeStreak(false));
  for (let i = 0; i < SPLASH_COUNT; i++) splashes.push(makeSplash(true));

  let performance = {
    foodSpawned: 0,
    foodEaten: 0,
    hazardsPassed: 0,
    collisions: 0,
    laneChanges: 0,
    nearMisses: 0,
    dareRefusals: 0,
    distance: 0
  };

  let finalRating = 1;

  let audioCtx, analyser, dataArray;

  const MUSIC_VOL = 0.2;        // normal level during play (0 to 1). Keep it low: sound effects are coming.
  const MUSIC_INTRO_VOL = 0.12; // quieter while Gary's intro voice plays
  const MUSIC_FADE_IN = 4;      // seconds
  const music = new Audio('gary_theme_song.mp3?v=1');
  music.loop = true;
  music.preload = 'auto';
  let musicGain = null, musicOn = false;
  let introAnimTimer = 0;
  let introAttempt = 0, introFallbackTimer = null;
  let gameOverFrameRequest = null;

  let streetLoaded = false;
  let loadErrorLog = [];

  /* -------------------------------------------------------------------------- */
  /* Gary assets                                                                */
  /* -------------------------------------------------------------------------- */

  // GaryPigeon20261017V2 — cobble-only, two-dimensional decorative movement.
  const pigeons = (() => {
    const sheet = new Image();
    let ready=false, seed=27183;
    const feet=[514,518,515,516,519,517];
    const birds=Array.from({length:3},()=>({segment:0,side:0,x:0,y:0,previousX:0,previousY:0,vx:0,vy:0,dx:1,dy:0,dir:1,timer:0,walking:true,phase:0,alert:0,cooldown:0}));
    function random(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;}
    // Empty shop footprints are exposed cobbles. Keep clear of each segment's
    // prop/detail zone, the kerbs and all three playable lanes.
    const leftMin=18,leftMax=ROAD_LEFT-19,rightMin=ROAD_RIGHT+19,rightMax=W-18;
    const top=32,bottom=BUILDING_H-12;
    function heading(b){const angle=random()*Math.PI*2;b.dx=Math.cos(angle);b.dy=Math.sin(angle);}
    function place(b,from){
      let segment=from,side=-1;
      for(let n=0;n<STREET.length;n++,segment++){
        const plan=STREET[segment%STREET.length];
        const l=!plan.left||plan.left==='none',r=!plan.right||plan.right==='none';
        if(l||r){side=l&&r?(random()<0.5?0:1):(l?0:1);break;}
      }
      b.segment=segment;b.side=side;
      const low=side===0?leftMin:rightMin,high=side===0?leftMax:rightMax;
      b.x=low+(high-low)*(0.25+random()*0.5);b.y=top+(bottom-top)*(0.25+random()*0.5);
      b.previousX=b.x;b.previousY=b.y;b.vx=b.vy=0;
      b.walking=true;b.timer=0.7+random()*1.3;b.phase=b.alert=b.cooldown=0;
      heading(b);b.dir=b.dx<0?-1:1;
    }
    function reset(){seed=27183;let segment=0;for(const b of birds){place(b,segment);segment=b.segment+2;}}
    sheet.onload=async()=>{if(sheet.naturalWidth!==2172||sheet.naturalHeight!==724)return;try{if(sheet.decode)await sheet.decode();ready=true;}catch(_){ready=false;}};
    sheet.onerror=()=>{ready=false;};sheet.src='gary-pigeon-walk.png?v=pigeon20261017v1';
    function remember(){for(const b of birds){b.previousX=b.x;b.previousY=b.y;}}
    function update(dt){
      if(!ready)return;
      for(const b of birds){
        if(b.side<0)continue;
        const baseY=distance-b.segment*STREET_SEGMENT_H+STREET_SEGMENT_H-56;
        if(baseY+top>H+48){
          let next=Math.max(0,Math.floor((distance+56)/STREET_SEGMENT_H)+2);
          for(const other of birds)next=Math.max(next,other.segment+2);
          place(b,next);continue;
        }
        const y=baseY+b.y;if(y < -48)continue;
        b.cooldown=Math.max(0,b.cooldown-dt);
        if(b.alert<=0&&b.cooldown<=0&&Math.abs(y-PLAYER_Y)<145&&Math.abs(b.x-lx(lane))<100){
          b.alert=1.1;b.cooldown=3;b.walking=true;
          b.dx=b.side===0?-0.6:0.6;b.dy=y<PLAYER_Y?-0.8:0.8;
        }
        if(b.alert>0){b.alert=Math.max(0,b.alert-dt);if(b.alert===0){b.walking=false;b.timer=0.65;}}
        else {b.timer-=dt;if(b.timer<=0){b.walking=!b.walking;b.timer=b.walking?0.8+random()*1.6:0.5+random()*0.9;if(b.walking)heading(b);}}
        const speed=b.walking?(b.alert>0?42:12):0;
        const ease=Math.min(1,dt*10);
        b.vx+=(b.dx*speed-b.vx)*ease;b.vy+=(b.dy*speed-b.vy)*ease;
        b.x+=b.vx*dt;b.y+=b.vy*dt;
        const low=b.side===0?leftMin:rightMin,high=b.side===0?leftMax:rightMax;
        if(b.x<low){b.x=low;b.vx=0;if(b.alert<=0)b.dx=Math.abs(b.dx);}
        if(b.x>high){b.x=high;b.vx=0;if(b.alert<=0)b.dx=-Math.abs(b.dx);}
        if(b.y<top){b.y=top;b.vy=0;if(b.alert<=0)b.dy=Math.abs(b.dy);}
        if(b.y>bottom){b.y=bottom;b.vy=0;if(b.alert<=0)b.dy=-Math.abs(b.dy);}
        if(Math.abs(b.vx)>0.8)b.dir=b.vx<0?-1:1;
        // Frame rate follows ground travel, including vertical movement.
        b.phase+=Math.hypot(b.vx,b.vy)*dt*0.65;
      }
    }
    function draw(){
      if(!ready||state==='menu'||state==='intro'||state==='intro_transition')return;
      for(const b of birds){
        if(b.side<0)continue;
        const y=view.distance-b.segment*STREET_SEGMENT_H+STREET_SEGMENT_H-56+lerp(b.previousY,b.y,view.alpha);
        if(y < -32||y>H+32)continue;
        const x=lerp(b.previousX,b.x,view.alpha),moving=Math.hypot(b.vx,b.vy)>0.7;
        const frame=moving?Math.floor(b.phase)%6:0,scale=0.078;
        ctx.save();ctx.translate(x,y);
        ctx.fillStyle='rgba(12,17,23,.12)';ctx.beginPath();ctx.ellipse(0,-1,9,2.3,0,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha*=1;ctx.scale(b.dir,1); // Full pigeon opacity for clear silhouettes.
        ctx.drawImage(sheet,frame*362,220,362,304,-181*scale,(220-feet[frame])*scale,362*scale,304*scale);
        ctx.restore();
      }
    }
    reset();return {reset,remember,update,draw};
  })();

  // GaryCrashCinematic20261017V1 — presentation only; the run is frozen after collision.
  const crashScene = (() => {
    const spec=window.GaryCrashConfig||{};
    const reduced=!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
    const sheet=spec.sheet?new Image():null;
    const columns=Math.max(1,Math.min(12,Number(spec.frames)||1));
    let sheetReady=false,buffer=null,source=null,voiceGain=null,voiceStarted=false,decoding=false;
    // GaryCrashAudioFix20261017V1: retry readiness; mark playback only after source.start succeeds.
    let duration=2.15,previousTime=0,elapsed=0,active=false,voiceAt=0;
    // Fetch once, before a crash. No network or decode work in the crash update.
    const bytes=spec.audio?fetch(spec.audio,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Voice unavailable');return r.arrayBuffer();}).catch(()=>null):Promise.resolve(null);
    if(sheet){sheet.onload=async()=>{try{if(sheet.naturalWidth%columns||!sheet.naturalHeight)return;if(sheet.decode)await sheet.decode();sheetReady=true;}catch(_){sheetReady=false;}};sheet.onerror=()=>{sheetReady=false;};sheet.src=spec.sheet;}
    async function prepareAudio(){
      if(!audioCtx||decoding||buffer)return;decoding=true;
      try{const data=await bytes;if(data)buffer=await audioCtx.decodeAudioData(data);}catch(_){buffer=null;}
      finally{decoding=false;}
    }
    function stopVoice(){if(source){try{source.stop();}catch(_){}source.disconnect();source=null;}if(voiceGain){voiceGain.disconnect();voiceGain=null;}}
    function reset(){stopVoice();active=false;elapsed=previousTime=0;voiceStarted=false;voiceAt=0;}
    function begin(){
      reset();active=true;duration=buffer?Math.min(6,Math.max(2.15,0.55+buffer.duration+0.4)):2.15;
      musicTo(0.035,0.2);
    }
    function playVoice(){
      if(voiceStarted||!buffer||!audioCtx||audioCtx.state!=='running')return;
      try{source=audioCtx.createBufferSource();source.buffer=buffer;voiceGain=audioCtx.createGain();voiceGain.gain.value=0.9;source.connect(voiceGain);voiceGain.connect(audioCtx.destination);source.start();voiceStarted=true;voiceAt=elapsed;duration=Math.min(6,Math.max(duration,elapsed+buffer.duration+0.38));}catch(_){stopVoice();}
    }
    function update(dt){previousTime=elapsed;elapsed+=dt;if(elapsed>=0.5)playVoice();return elapsed>=duration;}
    function time(){return lerp(previousTime,elapsed,view.alpha);}
    function camera(){
      if(!active)return;
      const t=time(),e=reduced?0:smooth((t-0.06)/0.65),zoom=1+0.85*e;
      const focusY=PLAYER_Y-WORLD.playerHeight*0.57;
      const x=Math.max(W*(1-zoom),Math.min(0,(CX-lx(view.lane)*zoom)*e));
      const y=Math.max(H*(1-zoom),Math.min(0,(H*0.49-focusY*zoom)*e));
      ctx.translate(x,y);ctx.scale(zoom,zoom);
    }
    function pose(){
      if(!sheetReady)return false;
      const fw=sheet.naturalWidth/columns,fh=sheet.naturalHeight;
      const talk=Math.max(0,time()-0.45),frame=Math.floor(talk*7)%columns;
      const h=WORLD.playerHeight,w=h*fw/fh;
      ctx.drawImage(sheet,frame*fw,0,fw,fh,-w/2,-h+WORLD.playerFootOffset,w,h);return true;
    }
    function screen(){
      if(!active||!state.startsWith('crash'))return;
      const t=time(),fade=smooth((t-(duration-0.38))/0.38);
      ctx.save();ctx.fillStyle='rgba(8,10,16,'+(0.12*smooth(t/0.5)+0.8*fade)+')';ctx.fillRect(0,0,W,H);
      if(t>0.28&&fade<1){
        ctx.globalAlpha=smooth((t-0.28)/0.18)*(1-fade);
        const line=String(spec.caption||LINES[lastHit]||'Proper ruined.');
        ctx.font='700 17px Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
        const w=Math.min(W-32,ctx.measureText(line).width+30);
        ctx.fillStyle='rgba(10,12,20,.88)';rr(ctx,CX-w/2,H-114,w,42,12);ctx.fill();
        ctx.fillStyle='#fff';ctx.fillText(line,CX,H-93,W-52);
      }
      ctx.restore();
    }
    function finish(){stopVoice();stopMusic();}
    function pause(){stopVoice();}
    function resume(){
      if(!voiceStarted||!buffer||!audioCtx||elapsed<0.5)return;
      const offset=elapsed-voiceAt;if(offset>=buffer.duration)return;
      try{source=audioCtx.createBufferSource();source.buffer=buffer;voiceGain=audioCtx.createGain();voiceGain.gain.value=0.9;source.connect(voiceGain);voiceGain.connect(audioCtx.destination);source.start(0,offset);}catch(_){stopVoice();}
    }
    return {reset,begin,update,camera,pose,screen,finish,pause,resume,prepareAudio};
  })();

  // GaryLastOrders20261017V1 — environmental cameo; future interaction has a stable identity.
  const mystery = window.GaryStreetMystery.create(STREET, STREET_SEGMENT_H, H);
  const mysterySpec = window.GaryStreetMystery.SPEC;
  const imgMystery = loadGary(mysterySpec.file, img => validateSheet(img, 'Hooded bench',
    mysterySpec.columns, mysterySpec.rows, mysterySpec.frameWidth, mysterySpec.frameHeight));

  // GaryCutsceneStudioV3: safe, reusable one-third narrative banners.
  const cutscenes = window.GaryCutscene.createManager({host:stage,onComplete:finishCutscene,worldSource:()=>{render(0,true);return cv;}});
  window.GaryCutscenes = Object.freeze({signal:name=>cutscenes.signal(name),setStage:name=>cutscenes.setStage(name)});
  const cutsceneWorld={stage:'high-street',distance:0,elapsed:0,playerY:PLAYER_Y+WORLD.playerFootOffset,
    hazardsClear:true,actors:[{id:'hooded-reader',footY:-Infinity,ready:false,introComplete:false}]};
  function sampleCutsceneWorld(clear){
    cutsceneWorld.stage=mystery.quiet()?'forgotten-road':rainMix>.5?'rainy-high-street':nightMix>.5?'night-high-street':'high-street';
    cutsceneWorld.distance=distance;cutsceneWorld.elapsed=playTime;cutsceneWorld.hazardsClear=clear;
    const actor=cutsceneWorld.actors[0];actor.footY=mystery.footAt(distance);actor.ready=imgMystery.ready;
    actor.introComplete=mystery.frame()>=6 && mystery.snapshot().time>=4.1;
    return cutsceneWorld;
  }
  function finishCutscene(){
    roadQueue=[];pendingRow=null;director.fullApproach();acc=0;lastLanes=['none','none','none'];gap=LEARN_GAP;nearCd=1.5;
    shownSpeed=Math.min(shownSpeed,mysterySpec.slowSpeed);
    transition('play');musicTo(MUSIC_VOL,1.2);
  }
  // GaryAssetGate20261017: do not expose a playable street until its artwork is decoded.
  let startupReady = false, startupPreparing = false;
  const decodedStartupImages = new WeakSet();
  const failedStartupImages = new WeakSet();
  const STARTUP_TIMEOUT_MS = 45000;

  async function prepareStartupImage(image) {
    if (decodedStartupImages.has(image)) return;
    const file = image.src;
    await new Promise((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => finish(Error('Artwork timed out')), STARTUP_TIMEOUT_MS);
      function finish(error) {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        image.removeEventListener('load', loaded);
        image.removeEventListener('error', failed);
        if (error) { failedStartupImages.add(image); reject(error); }
        else { failedStartupImages.delete(image); resolve(); }
      }
      async function loaded() {
        try {
          if (!image.naturalWidth) throw Error('Artwork unavailable');
          if (image.decode) await image.decode();
          finish();
        } catch (error) { finish(error); }
      }
      function failed() { finish(Error('Artwork unavailable')); }
      image.addEventListener('load', loaded);
      image.addEventListener('error', failed);
      if (image.complete && image.naturalWidth) loaded();
      else if (image.complete || failedStartupImages.has(image)) {
        // A failed download must be requested again, rather than waiting for an event already fired.
        const retry = new URL(file, location.href);
        retry.searchParams.set('artworkRetry', Date.now());
        image.src = retry.href;
      }
    });
    decodedStartupImages.add(image);
  }

  async function prepareStartup() {
    if (startupPreparing || startupReady) return;
    startupPreparing = true;
    const button = $('startBtn'), status = $('startupStatus');
    button.disabled = true; button.textContent = 'Loading Gary…';
    status.textContent = 'Getting the high street ready…';
    try {
      const images = [...new Set([
        imgWalkSheet, imgStreet, imgGaryIntro, imgSideLeft, imgSideRight, imgMystery,
        imgCheer, imgCrash, ...imgRun, ...(window.GaryRoadEvolution?.images || []), ...Object.values(cobbleImgs),
        ...PROPS.map(prop => prop.img), ...Object.values(itemImages), ...Object.values(foxImages), ...Object.values(wildernessImages)
      ].filter(Boolean))];
      let loaded = 0;
      const results = await Promise.allSettled(images.map(async image => {
        await prepareStartupImage(image);
        status.textContent = 'Preparing artwork ' + (++loaded) + ' / ' + images.length + '…';
      }));
      if (results.some(result => result.status === 'rejected') ||
          !imgWalkSheet.ready || !streetLoaded || !garyIntroLoaded ||
          !imgSideLeft.ready || !imgSideRight.ready || !imgMystery.ready) throw Error('Artwork unavailable');
      // Drop only stale network messages for images now successfully decoded.
      loadErrorLog = loadErrorLog.filter(message => !images.some(image =>
        decodedStartupImages.has(image) && message === new URL(image.src, location.href).pathname.split('/').pop() + ' not found'));
      status.textContent = 'Preparing the changing street…';
      await window.GaryRoadEvolution?.prepare();
      window.GaryRoadEvolution?.warm(ctx);
      status.textContent = 'Preparing the story…';
      await cutscenes.prepare();
      status.textContent='Preparing the other side…';
      await wilderness.prepare();wilderness.warm(ctx);
      startupReady = true;
      simulation.reset();
      button.textContent = 'Play Game';
      status.textContent = 'Ready. Let’s give it a go.';
    } catch (_) {
      button.textContent = 'Try again';
      status.textContent = 'Some artwork could not load. Check your connection and tap Try again.';
    } finally {
      startupPreparing = false;
      button.disabled = false;
    }
  }

  function loadGary(file, validate) {
    const img = new Image();
    img.onload = () => { img.ready = validate ? validate(img) : true; };
    img.onerror = () => { loadErrorLog.push(file + ' not found'); };
    img.src = file;
    return img;
  }

  // Geometry checks catch bad sheet dimensions, not visual style or alpha fringes.
  // See ASSET_GRID_PROMPT.txt for the separate human visual acceptance gate.
  function validateSheet(img, label, columns, rows, frameWidth, frameHeight) {
    const width = img.naturalWidth, height = img.naturalHeight;
    const valid = width > 0 && height > 0 && width % columns === 0 && height % rows === 0
      && (!frameWidth || width === columns * frameWidth)
      && (!frameHeight || height === rows * frameHeight);
    if (!valid) loadErrorLog.push(label + ': incompatible sprite-sheet dimensions');
    return valid;
  }
  const imgWalkSheet = loadGary(GARY_SPRITES.walk.file, img =>
    validateSheet(img, 'Gary walk', GARY_SPRITES.walk.columns, GARY_SPRITES.walk.rows));

  const WALK_FRAMES = GARY_SPRITES.walk.columns;
  const WALK_FRAME_TIME = GARY_SPRITES.walk.frameTime;

  const imgRun = GARY_SPRITES.gameOver.map(file => loadGary(file));
  const imgCheer = loadGary(GARY_SPRITES.cheer);
  const imgCrash = loadGary(GARY_SPRITES.crash);

  // Six-frame sidesteps — frame visibility independent from lane travel.
  // GaryApprovedSidesteps20261016V1
  const SIDE_FRAMES = 6, SIDE_W = 362, SIDE_H = 724;
  // GarySixFrameWidth20261017V2 — width only; preserve height and foot alignment.
  const SIDE_WIDTH_SCALE = 1.00;
  // GarySidestepVisibleHeight20261016V3
  // GaryMovementPolish20261017V1
  const SIDE_ANIM_SECONDS = LANE_CHANGE_SECONDS; // Animation follows actual lane progress.
  let sideAnimTime = SIDE_ANIM_SECONDS, sideAnimDir = 0;
  let sidePhaseStart = 0, laneVelocity = 0, laneTangent = 0;
  const sideHandoffFrames = [0, 0];
  const imgSideLeft = new Image(), imgSideRight = new Image();
  const sideArt = { left: false, right: false, anchors: [[], []], visibleHeights: [0.5, 0.5], walkFoot: 0.975, walkTop: 0.02 };

  // Derive the torso centre and shoe baseline from actual transparency.
  // Frames have different silhouettes; this prevents visible lateral/vertical popping.
  function analyseGaryFrame(img, frameIndex, width, height) {
    const probe = document.createElement('canvas');
    probe.width = width; probe.height = height;
    const pc = probe.getContext('2d', {willReadFrequently:true});
    pc.clearRect(0,0,width,height);
    pc.drawImage(img,frameIndex*width,0,width,height,0,0,width,height);
    let pixels;
    try { pixels = pc.getImageData(0,0,width,height).data; }
    catch (_) { return {torso:0.5,foot:0.96}; }
    // Opaque backgrounds are not valid transparent character sprites.
    if (pixels[3] > 60 && pixels[(width-1)*4+3] > 60 &&
        pixels[((height-1)*width)*4+3] > 60) {
      return {torso:0.5,foot:0.96};
    }
    let xSum=0, count=0, foot=0, top=height;
    for(let y=0;y<height;y+=3){
      for(let x=0;x<width;x+=3){
        const alpha=pixels[(y*width+x)*4+3];
        if(alpha<100) continue;
        if(y>foot) foot=y;
        if(y<top) top=y;
        if(y>height*0.24 && y<height*0.55){xSum+=x;count++;}
      }
    }
    return {torso:count?xSum/count/width:0.5,foot:foot?foot/height:0.96,top:top<height?top/height:0.02};
  }

  function prepareSideImage(img, key, file){
    img.ready = false;
    img.onload = () => {
      if(img.naturalWidth!==SIDE_FRAMES*SIDE_W || img.naturalHeight!==SIDE_H){
        loadErrorLog.push(file+': expected a 2172 x 724, six-frame sheet');
        return;
      }
      const anchors=[];
      for(let frame=0;frame<SIDE_FRAMES;frame++)
        anchors.push(analyseGaryFrame(img,frame,SIDE_W,SIDE_H));
      const direction = key==='left'?0:1;
      sideArt.anchors[direction]=anchors;
      sideArt.visibleHeights[direction]=Math.max(0.5,...anchors.map(a=>a.foot-(a.top??0.02)));
      img.ready=true;
      sideArt[key]=true;
      prepareWalkHandoffs();
    };
    img.onerror=()=>loadErrorLog.push(file+': missing; using walking animation');
    img.src=file+'?v=sixframewidth20261017v2';
  }
  prepareSideImage(imgSideLeft,'left','gary_sidestep_left.png');
  prepareSideImage(imgSideRight,'right','gary_sidestep_right.png');
  imgWalkSheet.addEventListener('load',()=>{
    if(!imgWalkSheet.naturalWidth)return;
    const width=Math.round(imgWalkSheet.naturalWidth/WALK_FRAMES);
    const height=imgWalkSheet.naturalHeight;
    const walkMetrics=analyseGaryFrame(imgWalkSheet,0,width,height);
    sideArt.walkFoot=walkMetrics.foot; sideArt.walkTop=walkMetrics.top||0.02;
    prepareWalkHandoffs();
  });
  let runFrame = 0, runTimer = 0;


  const imgGaryIntro = new Image();

  let garyIntroLoaded = false;

  imgGaryIntro.onload = () => {
    const spec = GARY_SPRITES.intro;
    garyIntroLoaded = validateSheet(imgGaryIntro, 'Gary intro', spec.columns, spec.rows, spec.frameWidth, spec.frameHeight);
  };

  imgGaryIntro.onerror = () => {
    loadErrorLog.push('gary_intro_sheet.PNG not found');
  };

  imgGaryIntro.src = GARY_SPRITES.intro.file;

  const GARY_INTRO_COLS = GARY_SPRITES.intro.columns;
  const GARY_INTRO_ROWS = GARY_SPRITES.intro.rows;
  const GARY_INTRO_FRAME_W = GARY_SPRITES.intro.frameWidth;
  const GARY_INTRO_FRAME_H = GARY_SPRITES.intro.frameHeight;
  const GARY_INTRO_FRAME_TIME = GARY_SPRITES.intro.frameTime;

  let garyIntroFrame = 0;
  let garyIntroFrameTimer = 0;

  /* -------------------------------------------------------------------------- */
  /* High-street sprite library                                                 */
  /* -------------------------------------------------------------------------- */

  /*
    The sprite sheet is a reusable library rather than a fixed six-shop street.
    Adding more buildings later only requires another entry in BUILDINGS and,
    when supplied, its matching keeper entry in KEEPERS.

    Source sheet: 2912 x 2688.
    Buildings occupy the top row, keepers the middle row, street props the bottom.
  */
  // BUILDINGS is authored in game-data.js.

  // KEEPERS is authored in game-data.js.


  const imgStreet = new Image();
  imgStreet.onload = () => {
    streetLoaded = validateSheet(imgStreet, 'Street atlas', 1, 1, STREET_ATLAS.width, STREET_ATLAS.height);
  };
  imgStreet.onerror = () => { loadErrorLog.push('high_street_sprites.webp not found'); };
  imgStreet.src = STREET_ATLAS.file;

  // COBBLE_KINDS is authored in game-data.js.
  const cobbleImgs = {};
  Object.entries(COBBLE_KINDS).forEach(([kind, file]) => {
    const img = new Image();
    img.onload = () => { img.ready = true; };
    img.onerror = () => { loadErrorLog.push(file + ' not found'); };
    img.src = file;
    cobbleImgs[kind] = img;
  });
  cobbleImgs.moss = cobbleImgs.damp = cobbleImgs.base;

  /*
    Each building has an intentional detail zone underneath it. The gap is
    deliberately kept as a separate rendering layer so we can later add:
    cobbles, postboxes, bins, lamps, planters, bikes, signs and other street
    dressing without changing the building system.
  */
  function shopByName(name) {
    if (!name || name === 'none') return -1;
    return BUILDINGS.findIndex(b => b.name === name);
  }


  function sideSlot(plan, side, slot) {
    if (slot === 'middle') return plan[side + 'Middle'] || plan[side + 'Object'] || 'none';
    const key = side + slot.charAt(0).toUpperCase() + slot.slice(1);
    return plan[key] || 'none';
  }

  function drawGroundPatch(x, y, w, h, kind) {
    if (kind !== 'damp' || h < 20) return;
    const cx = x + w * 0.5, cy = y + h * 0.72;
    const wash = ctx.createRadialGradient(cx, cy, 4, cx, cy, w * 0.42);
    wash.addColorStop(0, 'rgba(18,22,26,.28)');
    wash.addColorStop(1, 'rgba(18,22,26,0)');
    ctx.fillStyle = wash;
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.4, h * 0.32, 0, 0, 7);
    ctx.fill();
  }



  function drawSideLayers(x, y, w, h, plan, side) {
    drawDetailZone(x, y, w, h * 0.75, sideSlot(plan, side, 'back'), side);
    drawDetailZone(x, y, w, h, sideSlot(plan, side, 'middle'), side);
    drawDetailZone(x, y + h * 0.4, w, h * 0.6, sideSlot(plan, side, 'front'), side);
  }

  const lampGlows = [];
  const lampHeads = [];

  function drawDetailZone(x, y, w, h, objectName, side) {
    if (!objectName || objectName === 'none' || h < 28) return;
    const prop = PROPS.find(p => p.name === objectName);
    if (!prop) return;
    const cap = prop.cap || (objectName === 'bin' ? 46 : 72);
    const propH = Math.min(cap, h - 6);
    const propW = propH * (prop.w / prop.h);
    const shift = objectName === 'lamp' ? 0 : ((objectName.length * 17 + Math.round(x)) % 11) - 5;
    let px = x + w * 0.5 - propW / 2 + shift;
    // Stand the lamp on the kerb. The pavement between the shop and the road is only a few pixels wide.
    if (objectName === 'lamp') px = side === 'left' ? ROAD_LEFT - propW : ROAD_RIGHT + 3;
    const py = y + h - propH + 2;
    if (objectName === 'lamp') {
      lampGlows.push(py + propH * 0.45);
      lampHeads.push(px + propW * 0.5, py + propH * 0.08);
    }
    const foot = px + propW / 2;
    const cast = side === 'right' ? 8 : -8;
    ctx.save();
    ctx.fillStyle = 'rgba(12,14,18,.35)';
    ctx.beginPath();
    ctx.ellipse(foot + cast, y + h - 3, Math.max(8, propW * 0.34), 4, 0, 0, 7);
    ctx.fill();
    if (objectName === 'bin' || objectName === 'tree') {
      ctx.fillStyle = 'rgba(40,48,42,.28)';
      ctx.beginPath();
      ctx.ellipse(foot + 6, y + h - 2, 7, 3, 0, 0, 7);
      ctx.fill();
    }
    ctx.restore();
    if (prop.file && prop.img && prop.img.complete && prop.img.naturalWidth) {
      const frames = prop.frames || 1;
      const fw = prop.img.naturalWidth / frames;
      const fh = prop.img.naturalHeight;
      const frame = frames > 1 ? Math.floor(view.clock / 0.7) % frames : 0;
      ctx.save();
      if (objectName === 'bench' && side === 'right') {
        ctx.translate(px + propW, py);
        ctx.scale(-1, 1);
        ctx.drawImage(prop.img, frame * fw, 0, fw, fh, 0, 0, propW, propH);
      } else ctx.drawImage(prop.img, frame * fw, 0, fw, fh, px, py, propW, propH);
      ctx.restore();
      return;
    }
    if (!streetLoaded || prop.x == null) return;
    ctx.drawImage(imgStreet, prop.x, prop.y, prop.w, prop.h, px, py, propW, propH);
  }

  /*
    The source buildings contain a posed shopkeeper. Separate keeper sprites
    are clipped into the calibrated window, with restrained movement and sheen.
    This pass does not erase baked figures: inspect replacement art for duplicates.
  */
  // One set of window fractions. The keeper and the night light both use this,
  // so a later shop change stays aligned.
  // SHOP_PANES is authored in game-data.js.

  function shopWindowRect(index, x, y, w, h) {
    const pane = SHOP_PANES[index] || SHOP_PANES[0];
    return {
      x: x + w * pane.x,
      y: y + h * pane.y,
      w: w * pane.w,
      h: h * pane.h
    };
  }

  // Studio-controlled keeper position and movement. All units are local shop pixels.
  const shopKeeperSpecs = Object.create(null);
  // Published keeper placements are independent from light and glass rectangles.
  const shopKeeperAnchors = Object.create(null);
  const defaultKeeperSize = [1,1,1,1.55,1,1];
  const defaultKeeperDrop = [0.16,0.16,0,0.22,0,0.16];
  BUILDINGS.forEach((b,i)=>{shopKeeperSpecs[b.name]={offsetX:0,offsetY:0,scale:1,idleAmount:1,cheerAmount:1};});
  function applyPublishedKeepers(config){
    const defs=config?.shopKeepers;
    if(!defs||typeof defs!=='object')return;
    for(const b of BUILDINGS){const d=defs[b.name];if(!d)continue;
      if(!['offsetX','offsetY','scale','idleAmount','cheerAmount'].every(k=>Number.isFinite(d[k])))continue;
      if(Math.abs(d.offsetX)>89||Math.abs(d.offsetY)>236||d.scale<0.25||d.scale>2.5||d.idleAmount<0||d.idleAmount>3||d.cheerAmount<0||d.cheerAmount>3)continue;
      shopKeeperSpecs[b.name]={offsetX:d.offsetX,offsetY:d.offsetY,scale:d.scale,idleAmount:d.idleAmount,cheerAmount:d.cheerAmount,clip:rectIsValid(d.clip)?{...d.clip}:null};
    }
  }
  function drawKeeper(index, x, y, w, h, phaseSeed, segment, side) {
    const keeper = KEEPERS[index];
    if (!streetLoaded || !keeper) return;
    const closure = closureProgress(BUILDINGS[index]?.name,segment,side,view.clock);
    if(closure!==null && closure>=1)return;

    // Glass under the awning. Most fronts have the door on the right, so the
    // pane is left of centre. Red Lion is a wider glazed front.
    const win = shopWindowRect(index, x, y, w, h);
    const wx = win.x, wy = win.y, ww = win.w, wh = win.h;

    const spec = shopKeeperSpecs[BUILDINGS[index]?.name] || {offsetX:0,offsetY:0,scale:1,idleAmount:1,cheerAmount:1};
    const phase = view.clock * 2.1 + phaseSeed;
    const ahead = PLAYER_Y - (y + h * 0.72);
    const near = ahead > -40 && ahead < 150;
    // Approach and pull: smoothly settle the old jumping/cheering motion
    // before the shutter crosses the window; feet never translate vertically.
    const settle = closure === null ? 0 : Math.min(1,Math.max(0,closure*3));
    const cheer = (near ? Math.max(0, Math.sin(view.clock * 10)) : 0) * spec.cheerAmount * (1-settle);
    const bob = (Math.sin(phase) * 0.7 * spec.idleAmount - cheer * 5) * (1-settle);
    const breathe = 1 + Math.sin(phase * 0.9 + 0.8) * 0.012 * spec.idleAmount * (1-settle) + cheer * 0.06;
    const shift = Math.sin(view.clock * 0.75 + phaseSeed * 1.7) * 0.6 * spec.idleAmount * (1-settle);
    const pull = closure === null ? 0 : Math.sin(Math.PI*closure);

    // Other windows are large, so the keeper fills them. The pub glass is smaller,
    // so match the other keepers' size and let the frame crop him.
    const independent = shopKeeperAnchors[BUILDINGS[index]?.name];
    let keeperW, keeperH, baseX, baseY;
    if (independent) {
      keeperW = independent.w * spec.scale;
      keeperH = independent.h * spec.scale;
      baseX = x + independent.x + independent.w * 0.5 + shift + spec.offsetX;
      baseY = y + independent.y + independent.h + bob + spec.offsetY;
    } else {
      // Legacy fallback for unloaded or missing configuration.
      const size = (defaultKeeperSize[index] || 1) * spec.scale;
      const fitH = wh * 0.96 * size;
      const fitW = ww * 0.86 * size;
      keeperH = fitH;
      keeperW = keeperH * (keeper.w / keeper.h);
      if (keeperW > fitW) { keeperW = fitW; keeperH = keeperW * (keeper.h / keeper.w); }
      baseX = wx + ww * 0.5 + shift + spec.offsetX;
      const drop = wh * (defaultKeeperDrop[index] || 0) + spec.offsetY;
      baseY = wy + wh - 1 + bob + drop;
    }

    // Visible window clip from Visual Studio v1.5 (position remains independent).
    const visible = spec.clip ? {x:x+spec.clip.x,y:y+spec.clip.y,w:spec.clip.w,h:spec.clip.h} : win;
    ctx.save();
    ctx.beginPath();
    ctx.rect(visible.x + 1, visible.y + 1, Math.max(1, visible.w - 2), Math.max(1, visible.h - 2));
    ctx.clip();

    // An anchored lean under the shutter, not an upward jump.
    ctx.translate(baseX+(side==='L'?1:-1)*pull*1.6,baseY);
    ctx.rotate((side==='L'?1:-1)*pull*0.035);
    ctx.scale(1,breathe);
    ctx.drawImage(
      imgStreet,
      keeper.x, keeper.y, keeper.w, keeper.h,
      -keeperW / 2,
      -keeperH,
      keeperW,
      keeperH
    );
    ctx.restore();

    // A light sheen keeps them reading as behind the glass, not stuck on it.
    ctx.save();
    ctx.beginPath();
    ctx.rect(wx, wy, ww, wh);
    ctx.clip();
    const sheen = ctx.createLinearGradient(wx, wy, wx + ww * 0.65, wy + wh);
    sheen.addColorStop(0, 'rgba(255,255,255,0.055)');
    sheen.addColorStop(0.38, 'rgba(255,255,255,0)');
    sheen.addColorStop(1, 'rgba(8,16,28,0.045)');
    ctx.fillStyle = sheen;
    ctx.fillRect(wx, wy, ww, wh);
    ctx.restore();
  }

  // Detached canvases work in Safari without requiring worker OffscreenCanvas.
  // Bounded, resolution-aware cache: only immutable atlas/cobble crops belong here.
  const rasterCaches = new Map();
  let rasterCacheEntries=0;
  function drawCachedCrop(image, sx, sy, sw, sh, x, y, w, h) {
    // Numeric crop identifiers are stable. Do not build key arrays/strings in
    // this render hot path merely to look up an already-baked image.
    let entries = rasterCaches.get(image);
    if (!entries) { entries=[]; rasterCaches.set(image,entries); }
    let entry=null;
    for (let i=0;i<entries.length;i++) {
      const candidate=entries[i];
      if (candidate.sx===sx && candidate.sy===sy && candidate.sw===sw && candidate.sh===sh
          && candidate.w===w && candidate.h===h) { entry=candidate; break; }
    }
    let cached = entry?.canvas;
    if (!cached) {
      cached = document.createElement('canvas');
      cached.width = Math.max(1, Math.ceil(w * K));
      cached.height = Math.max(1, Math.ceil(h * K));
      const g = cached.getContext('2d');
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(image, sx, sy, sw, sh, 0, 0, cached.width, cached.height);
      if (rasterCacheEntries >= 64) {
        rasterCaches.clear(); rasterCacheEntries=0;
        entries=[]; rasterCaches.set(image,entries);
      }
      entries.push({sx,sy,sw,sh,w,h,canvas:cached}); rasterCacheEntries++;
    }
    ctx.drawImage(cached, x, y, w, h);
  }

  function drawStreetBuilding(buildingIndex, x, y, w, h, phaseSeed, seed) {
    if (buildingIndex < 0) return;
    const b = BUILDINGS[buildingIndex];
    if (!streetLoaded || !b) return;

    drawCachedCrop(imgStreet, b.x, b.y, b.w, b.h, x, y, w, h);
    if (nightOn) {
      ctx.save();
      ctx.globalAlpha = nightMix;
      paintWindowLight(b.keeper, x, y, w, h, seed || 0);
      ctx.restore();
    }
    // Shopkeepers are drawn after the lighting passes, so light stays behind them.
  }

  function drawKeepersAboveWindowLighting() {
    if (!streetLoaded) return;
    forEachStreetFront((plan, segment, y) => {
      const left = shopByName(plan.left);
      if (left >= 0) drawKeeper(BUILDINGS[left].keeper, 0, y, BUILDING_WIDTH, BUILDING_H, false, segment, 'L');
      const right = shopByName(plan.right);
      if (right >= 0) drawKeeper(BUILDINGS[right].keeper, ROAD_RIGHT + PAVEMENT_WIDTH, y, W - ROAD_RIGHT - PAVEMENT_WIDTH, BUILDING_H, true, segment, 'R');
    });
  }

  function cobbleFor(kind) {
    const img = cobbleImgs[kind] || cobbleImgs.weeds;
    return img && img.ready ? img : (cobbleImgs.weeds && cobbleImgs.weeds.ready ? cobbleImgs.weeds : null);
  }

  
  const COBBLE_CELL = WORLD.cobbleCell;

  // Every 2x2 group uses one complete texture.
  // At 60px per cell, each feature patch spans 120x120px.
  const COBBLE_BASE_MIX = [
    ['base', 0.72],
    ['light', 0.16],
    ['sparse', 0.08],
    ['weeds', 0.04]
  ];

  // Distinctive features are grouped so they remain visible.
  const COBBLE_FEATURE_MIX = [
    ['leaves', 0.24],
    ['cracked', 0.26],
    ['grime', 0.20],
    ['dense', 0.18],
    ['weeds', 0.12]
  ];

  const COBBLE_FEATURE_CHANCE = 0.35;

  function cellHash(c, r) {
    let h = Math.imul(c, 374761393) +
            Math.imul(r, 668265263) | 0;

    h = Math.imul(h ^ (h >>> 13), 1274126177);

    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function weightedCobble(table, value) {
    let total = 0;

    for (const [kind, weight] of table) {
      total += weight;
      if (value < total) return kind;
    }

    return table[table.length - 1][0];
  }

  function mixKind(c, r) {
    // Select ONE texture for a complete 2x2 patch.
    const blockC = Math.floor(c / 2);
    const blockR = Math.floor(r / 2);

    // Separate deterministic seeds prevent identical patterns
    // for patch placement and texture selection.
    const chance = cellHash(blockC + 173, blockR - 271);

    if (chance < COBBLE_FEATURE_CHANCE) {
      return weightedCobble(
        COBBLE_FEATURE_MIX,
        cellHash(blockC + 1009, blockR + 2047)
      );
    }

    return weightedCobble(
      COBBLE_BASE_MIX,
      cellHash(blockC - 401, blockR + 613)
    );
  }

  function drawCobbles(x, y, w, h, kind) {
    const C = COBBLE_CELL;

    // Preserve the original scrolling world alignment.
    const off = ((view.scrollY % C) + C) % C;
    const shift = Math.floor(view.scrollY / C);

    const j0 = Math.floor((y - off) / C);
    const c0 = Math.floor(x / C);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    for (let j = j0; j * C + off < y + h; j++) {
      const ty = j * C + off;
      const r = j - shift;

      for (let c = c0; c * C < x + w; c++) {

        // 'base' means mixed pavement in the existing game.
        // Named variants remain available for detail zones.
        const k = (!kind || kind === 'base')
          ? mixKind(c, r)
          : kind;

        const img = cobbleFor(k);

        if (!img) {
          ctx.fillStyle = '#6e7276';
          ctx.fillRect(c * C, ty, C + 0.5, C + 0.5);
          continue;
        }

        // Assemble the four original image quadrants
        // in the correct positions across a 2x2 patch.
        const hw = img.naturalWidth / 2;
        const hh = img.naturalHeight / 2;

        const sourceX = (((c % 2) + 2) % 2) * hw;
        const sourceY = (((r % 2) + 2) % 2) * hh;

        drawCachedCrop(
          img,
          sourceX, sourceY, hw, hh,
          c * C, ty, C + 0.5, C + 0.5
        );
      }
    }

    // GARY_ROAD_EVOLUTION_V1
    if (window.GaryRoadEvolution) {
      window.GaryRoadEvolution.drawCobbles(ctx, {x, y, w, h, scrollY: view.scrollY, distance: view.distance});
    }
    ctx.restore();
  }



  const blankStreetPlans = STREET.map(p=>Object.freeze({...p,
    left:'none',right:'none',leftBack:'none',leftMiddle:'none',leftFront:'none',leftObject:'none',
    rightBack:'none',rightMiddle:'none',rightFront:'none',rightObject:'none',
    leftGround:'cracked',rightGround:'sparse'}));
  let visualClearFrom=Infinity;
  function forEachStreetFront(cb, worldDistance = view.distance) {
    const peek = 56;
    const base = Math.floor((worldDistance + peek) / STREET_SEGMENT_H);
    for (let pass = -1; pass <= 3; pass++) {
      const index = base + pass;
      if (index < 0) continue;
      const y = worldDistance - index * STREET_SEGMENT_H + (STREET_SEGMENT_H - peek);
      const plan = STREET[((index % STREET.length) + STREET.length) % STREET.length];
      cb(index>=visualClearFrom ? blankStreetPlans[((index%STREET.length)+STREET.length)%STREET.length] : mystery.planFor(plan,index),index,y);
    }
  }

  function drawHighStreet() {
    ctx.fillStyle = '#1a1e24';
    ctx.fillRect(0, 0, W, H);

    // Cobbles sit behind the shops, so the space around each chimney is pavement.
    const leftW = ROAD_LEFT;
    const rightX = ROAD_RIGHT;
    drawCobbles(0, 0, leftW, H, 'base');
    drawCobbles(rightX, 0, W - rightX, H, 'base');

    if (!streetLoaded) {
      ctx.fillStyle = '#3a3030';
      ctx.fillRect(0, 0, ROAD_LEFT - PAVEMENT_WIDTH, H);
      ctx.fillStyle = '#30343a';
      ctx.fillRect(ROAD_RIGHT + PAVEMENT_WIDTH, 0, W - ROAD_RIGHT - PAVEMENT_WIDTH, H);
      return;
    }

    // The next roof stays just above the screen, so a shop approaches instead of popping in.
    forEachStreetFront((plan, index, y) => {
      drawStreetBuilding(
        shopByName(plan.left), 0, y, BUILDING_WIDTH, BUILDING_H, false, index * 2.1 + 0.4
      );
      drawCobbles(0, y + BUILDING_H, BUILDING_WIDTH, DETAIL_H, plan.leftGround || 'weeds');
      drawSideLayers(0, y + BUILDING_H, BUILDING_WIDTH, DETAIL_H, plan, 'left');
      drawGroundPatch(0, y + BUILDING_H, BUILDING_WIDTH, DETAIL_H, plan.leftGround);

      drawStreetBuilding(
        shopByName(plan.right), ROAD_RIGHT + PAVEMENT_WIDTH, y,
        W - ROAD_RIGHT - PAVEMENT_WIDTH, BUILDING_H, true, index * 2.1 + 2.7
      );
      drawCobbles(ROAD_RIGHT + PAVEMENT_WIDTH, y + BUILDING_H, W - ROAD_RIGHT - PAVEMENT_WIDTH, DETAIL_H, plan.rightGround || 'weeds');
      drawSideLayers(
        ROAD_RIGHT + PAVEMENT_WIDTH, y + BUILDING_H,
        W - ROAD_RIGHT - PAVEMENT_WIDTH, DETAIL_H, plan, 'right'
      );
      drawGroundPatch(ROAD_RIGHT + PAVEMENT_WIDTH, y + BUILDING_H, W - ROAD_RIGHT - PAVEMENT_WIDTH, DETAIL_H, plan.rightGround);
    });
  }

  function drawPavements() {
    // A light kerb, not a dark slot, so the shop front does not fuse with the road.
    ctx.fillStyle = '#c4c2bc';
    ctx.fillRect(ROAD_LEFT - 3, 0, 3, H);
    ctx.fillRect(ROAD_RIGHT, 0, 3, H);
    ctx.fillStyle = '#8d8a84';
    ctx.fillRect(ROAD_LEFT - 1, 0, 1, H);
    ctx.fillRect(ROAD_RIGHT, 0, 1, H);
  }

  function mk(fn) {
    const s = document.createElement('canvas');
    s.width = s.height = 120;
    const c = s.getContext('2d');
    c.translate(60, 60);
    c.lineJoin = 'round';
    c.lineCap = 'round';
    fn(c);
    return s;
  }

  function dMush(c) {
    c.lineWidth=3; c.strokeStyle='#2b1810'; c.fillStyle='#f5eedc';
    c.beginPath(); c.moveTo(-12,5); c.lineTo(-10,38); c.lineTo(10,38); c.lineTo(12,5); c.closePath(); c.fill(); c.stroke();
    c.fillStyle='#8a5a36'; c.beginPath(); c.arc(0,5,32,Math.PI,0); c.closePath(); c.fill(); c.stroke();
  }
  function dFork(c) {
    c.lineWidth=3; c.strokeStyle='#a0b0c0'; c.fillStyle='#e8f2fc';
    c.fillRect(-6,-10,12,48); c.strokeRect(-6,-10,12,48);
    [-14,-6,2,10].forEach(x=>{c.fillRect(x,-42,4,34);c.strokeRect(x,-42,4,34);});
    c.fillRect(-16,-12,32,8); c.strokeRect(-16,-12,32,8);
  }
  function dKebab(c) {
    c.lineWidth=3; c.strokeStyle='#4a2a10'; c.fillStyle='#5aa832';
    [[-18,-6],[0,-12],[18,-6]].forEach(([x,y])=>{c.beginPath();c.ellipse(x,y,12,8,0,0,7);c.fill();c.stroke();});
    c.fillStyle='#8a4b22'; [[-10,-14],[6,-16],[-2,-6],[12,-8]].forEach(([x,y])=>{c.beginPath();c.ellipse(x,y,11,6,0,0,7);c.fill();c.stroke();});
    c.fillStyle='#d8322c'; [[-16,-12],[16,-14]].forEach(([x,y])=>{c.beginPath();c.ellipse(x,y,6,4,0,0,7);c.fill();c.stroke();});
    c.fillStyle='#f2cf8c'; c.beginPath(); c.ellipse(0,4,28,24,0,0,Math.PI); c.closePath(); c.fill(); c.stroke();
  }
  function dFish(c) {
    c.lineWidth=3; c.strokeStyle='#4a3208'; c.fillStyle='#ffd23f';
    [[-18,-3,-.3],[-8,-6,-.1],[2,-8,.05],[12,-6,.2],[22,-3,.4]].forEach(([x,y,a])=>{c.save();c.translate(x,y);c.rotate(a);c.fillRect(-3.5,-22,7,26);c.strokeRect(-3.5,-22,7,26);c.restore();});
    c.save(); c.translate(-2,-6); c.rotate(-.45); c.fillStyle='#e9a23b';
    c.beginPath();c.ellipse(0,0,24,10,0,0,7);c.fill();c.stroke();
    c.beginPath();c.moveTo(22,0);c.lineTo(32,-8);c.lineTo(32,8);c.closePath();c.fill();c.stroke();c.restore();
    c.fillStyle='#fff'; c.beginPath();c.moveTo(-26,3);c.lineTo(26,3);c.lineTo(20,32);c.lineTo(-20,32);c.closePath();c.fill();
    c.fillStyle='#1f5fbf'; [-20,-8,4,16].forEach(x=>{c.beginPath();c.moveTo(x,3);c.lineTo(x+6,3);c.lineTo((x+6)*.79,32);c.lineTo(x*.79,32);c.closePath();c.fill();});
    c.beginPath();c.moveTo(-26,3);c.lineTo(26,3);c.lineTo(20,32);c.lineTo(-20,32);c.closePath();c.stroke();
  }
  function dRoast(c) {
    c.lineWidth=3; c.strokeStyle='#3a2a10'; c.fillStyle='#fff';
    c.beginPath();c.ellipse(0,12,38,20,0,0,7);c.fill();c.stroke();
    c.fillStyle='#e6edf4';c.beginPath();c.ellipse(0,12,28,15,0,0,7);c.fill();
    c.fillStyle='#7a4318';c.beginPath();c.ellipse(3,14,21,9,0,0,7);c.fill();
    c.fillStyle='#f0b640';[[-24,8],[-18,16]].forEach(([x,y])=>{c.beginPath();c.ellipse(x,y,8,5,.3,0,0,7);c.fill();c.stroke();});
    c.fillStyle='#b4573f';[[-8,5,-.3],[3,3,.1]].forEach(([x,y,a])=>{c.save();c.translate(x,y);c.rotate(a);c.beginPath();c.ellipse(0,0,13,7,0,0,7);c.fill();c.stroke();c.restore();});
    c.fillStyle='#e9b04f';c.beginPath();c.moveTo(12,8);c.lineTo(15,-10);c.quadraticCurveTo(22,-18,29,-10);c.lineTo(32,8);c.quadraticCurveTo(22,14,12,8);c.closePath();c.fill();c.stroke();
    c.fillStyle='#4caf3a';[[-5,20],[2,23],[-11,23],[6,18]].forEach(([x,y])=>{c.beginPath();c.arc(x,y,3,0,7);c.fill();});
  }

  const itemImages = Object.fromEntries(Object.entries(ITEMS)
    .filter(([, item]) => item.file)
    .map(([id, item]) => [id, loadGary(item.file)]));
  const SP = { m: mk(dMush), fork: mk(dFork), kebab: mk(dKebab), fish: mk(dFish), roast: mk(dRoast) };
  // GaryFoxEncounterV1: authored, non-hazard encounter on the Forgotten Road.
  const foxImages={approach:loadGary('art/fox/fox-approach.png?v=fox2',im=>validateSheet(im,'Fox approach',6,1,256,256)),snatch:loadGary('art/fox/fox-snatch.png?v=fox2',im=>validateSheet(im,'Fox snatch',4,1,256,256)),
    turn:loadGary('art/fox/fox-turn.png?v=fox2',im=>validateSheet(im,'Fox turn',3,1,256,256)),return:loadGary('art/fox/fox-return.png?v=fox2',im=>validateSheet(im,'Fox return',6,1,256,256)),bush:loadGary('art/fox/fox-bush.png?v=fox2')};
  const bridge=window.GaryBridge.create();
  let bridgePreviewFrozen=false;
  // Factory candidates are an isolated review-only render layer. No save, collision,
  // spawn, difficulty or normal Play state can reference them.
  let candidateAsset=null;
  let biomeCandidates=[];
  function drawOneCandidate(a,pass){
    if(!a||a.pass!==pass)return;
    const y=a.y+(a.scrollWithWorld?view.distance-a.placedDistance:0);
    if(y>H+32||y+a.height< -32)return;
    ctx.save();ctx.globalAlpha=a.opacity;
    ctx.drawImage(a.image,a.x,y,a.width,a.height);ctx.restore();
  }
  function drawCandidate(pass){
    if(!bridgePreviewSession)return;
    // No candidate image or callback allocations in the frame loop.
    drawOneCandidate(candidateAsset,pass);
    for(let i=0;i<biomeCandidates.length;i++)drawOneCandidate(biomeCandidates[i],pass);
  }
  const legacyBridgePaint=window.GaryBridge.renderer(()=>document.createElement('canvas'));
  let bridgePaint=legacyBridgePaint;
  const wildernessImages=Object.fromEntries(Object.entries(window.GaryWildernessData.assets).map(([key,def])=>[key,itemImages[key]||loadGary('art/wilderness/'+def.path)]));
  const wildernessEncounters=window.GaryWildernessEncounters.create({spawnFood:spawnWildernessItem,onStart(){cap={s:'Hang on… that grass moved.',t:0};},onCue(){cap={s:'Something moved beyond the grass.',t:0};}});
  const wilderness=window.GaryWilderness.create({data:window.GaryWildernessData,images:wildernessImages,makeCanvas:()=>document.createElement('canvas'),encounters:wildernessEncounters});
  function spawnWildernessItem(kind,laneIndex,y){
    const item=itemPool.acquire();if(!item)return false;
    Object.assign(item,{t:kind,l:laneIndex,y,previousY:y,id:uid++,patternId:'wilderness-rustle',d:0,dare:0,refused:0,near:0,cleared:0,foxEvent:0});
    if(isFood(kind))performance.foodSpawned++;return true;
  }
  const foxWorld={afterBench:false,dialogueActive:false,hazardsClear:false,distance:0};
  const fox=window.GaryFoxEncounter.create({images:foxImages,spawnFood:spawnFoxFood,
    onTheft(){performance.foodSpawned=Math.max(0,performance.foodSpawned-1);},
    onEscape(){cap={s:'Fair enough. He was here first.',t:0};}});
  function spawnFoxFood(laneIndex,y){
    const item=itemPool.acquire();if(!item)return null;
    item.t='sausage_roll';item.l=laneIndex;item.y=item.previousY=y;item.id=uid++;
    item.d=item.dare=item.refused=item.near=item.cleared=0;item.foxEvent=1;performance.foodSpawned++;
    return item;
  }
  let barrenFoodSpawns=0;
  function barrenFoodKind(kind){
    if(mystery.footAt(distance)<=H+116||(kind!=='kebab'&&kind!=='fish'))return kind;
    return barrenFoodSpawns++%2===0?'custard_cream':'sausage_roll';
  }


  function rr(c,x,y,w,h,r) {
    c.beginPath(); c.moveTo(x+r,y);
    c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r);
    c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath();
  }
  function txt(s,x,y,size,col,al) {
    ctx.font='900 '+size+'px "Arial Black",Impact,sans-serif';
    ctx.textAlign=al;ctx.textBaseline='middle';ctx.lineWidth=4;ctx.lineJoin='round';
    ctx.strokeStyle='rgba(0,0,0,.85)';ctx.strokeText(s,x,y);ctx.fillStyle=col;ctx.fillText(s,x,y);
  }
  function fbFace(c,r) {
    c.fillStyle='#ffd166';c.strokeStyle='#4a2a10';c.lineWidth=4;
    c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.stroke();
    c.fillStyle='#222';c.beginPath();c.arc(-r*.35,-r*.2,r*.12,0,Math.PI*2);c.arc(r*.35,-r*.2,r*.12,0,Math.PI*2);c.fill();
    c.beginPath();c.arc(0,0,r*.5,.15*Math.PI,.85*Math.PI);c.stroke();
  }

  function lx(l) { return ROAD_LEFT + (l + 0.5) * LANE_WIDTH; }

  function triggerGrin() {
    grinTimer=0.45;
    const px=lx(lane);
    for(let i=0;i<20;i++){
      const angle=Math.random()*Math.PI*2, speed=40+Math.random()*90, side=Math.random()<.5?-30:30;
      const star = starPool.acquire();
      if (!star) break; // Cosmetic effects may drop; gameplay objects never do.
      star.x=star.previousX=px+side; star.y=star.previousY=PLAYER_Y-35;
      star.vx=Math.cos(angle)*speed; star.vy=Math.sin(angle)*speed;
      star.life=.6+Math.random()*.5; star.maxLife=1.1; star.size=4+Math.random()*5;
    }
  }
  function reset() {
    const replaySeed = Number(new URLSearchParams(location.search).get("seed")) || undefined;
    director.reset(replaySeed); pendingRow = null;
    crashScene.reset();
    mystery.reset();
    cutscenes.reset();
    fox.reset();bridge.reset();wilderness.reset(director.seed);bridgePreviewFrozen=false;barrenFoodSpawns=0;
    window.GaryRoadEvolution?.reset();
    window.GaryFoodCatalogue?.resetRun?.();
    pigeons.reset();
    window.GaryIntroTransition?.cancel();
    if (gameOverFrameRequest !== null) cancelAnimationFrame(gameOverFrameRequest);
    gameOverFrameRequest = null;
    runFrame = runTimer = garyIntroFrame = garyIntroFrameTimer = introAnimTimer = 0;
    score = tierMax = lastTierIndex = scrollY = distance = acc = 0;
    lane = target = laneStart = 1;
    laneTime = laneDuration = LANE_CHANGE_SECONDS;
    laneLean = 0;
    sideAnimTime = SIDE_ANIM_SECONDS;
    sideAnimDir = 0;
    sidePhaseStart = laneVelocity = laneTangent = 0;
    gap = LEARN_GAP;
    playTime = nightMix = nightHeld = rainMix = shutterMix = 0;
    nightOn = false;
    rainSaid = false;
    shopClosureStarted.clear();
    visualClearFrom=Infinity;
    itemPool.clear(); effectPool.clear(); starPool.clear();
    roadQueue = [];
    cap = lastHit = null;
    mile = crashT = grinTimer = nextEvent = nextRow = nearCd = flash = 0;
    review = reviewGap = hitStop = clock = uid = 0;
    reviewMul = 1;
    shownSpeed = 200;
    lastLanes = ['none', 'none', 'none'];
    performance = {
      foodSpawned: 0,
      foodEaten: 0,
      hazardsPassed: 0,
      collisions: 0,
      laneChanges: 0,
      nearMisses: 0,
      dareRefusals: 0,
      distance: 0
    };
    finalRating = 1;
  }
  function move(direction) {
    if (state !== 'play') return;
    const next = bridge.locked() ? 1 : Math.max(0, Math.min(WORLD.laneCount - 1, target + direction));
    if (next === target) return;
    const travelDirection = Math.sign(next - lane);
    const continuing = sideAnimDir === travelDirection && sideAnimTime < SIDE_ANIM_SECONDS;
    const velocity = continuing ? laneVelocity : 0;
    sidePhaseStart = continuing ? sideAnimTime / SIDE_ANIM_SECONDS : 0;
    laneStart = lane;
    target = next;
    laneTime = 0;
    laneDuration = Math.max(0.12, Math.min(0.40,
      LANE_CHANGE_SECONDS * Math.abs(target - laneStart)));
    const delta = target - laneStart;
    if (Math.abs(delta) < 1e-9) {
      lane = target; laneTime = laneDuration; laneVelocity = laneTangent = 0;
      sideAnimDir = 0; sideAnimTime = SIDE_ANIM_SECONDS;
      previous.sideTime = view.sideTime = sideAnimTime; previous.sideDir = 0;
      return;
    }
    // A bounded Hermite tangent preserves speed on repeated same-way taps.
    laneTangent = delta ? Math.max(0, Math.min(2.5, velocity * laneDuration / delta)) : 0;
    laneVelocity = velocity;
    sideAnimDir = travelDirection;
    sideAnimTime = sidePhaseStart * SIDE_ANIM_SECONDS;
    previous.sideTime = view.sideTime = sideAnimTime;
    previous.sideDir = travelDirection;
    grinTimer = 0;
    performance.laneChanges++;
  }

  function updateGaryLane(dt) {
    const wasAnimating = sideAnimDir !== 0 && sideAnimTime < SIDE_ANIM_SECONDS;
    if (laneTime < laneDuration) {
      laneTime = Math.min(laneDuration, laneTime + dt);
      if (laneDuration - laneTime < 1e-9) laneTime = laneDuration;
      const t = laneTime / laneDuration, t2 = t * t, t3 = t2 * t;
      const delta = target - laneStart;
      const eased = -2 * t3 + 3 * t2 + laneTangent * (t3 - 2 * t2 + t);
      lane = laneStart + delta * eased;
      laneVelocity = delta * (-6 * t2 + 6 * t + laneTangent * (3 * t2 - 4 * t + 1)) / laneDuration;
    } else {
      lane = target;
      laneVelocity = 0;
    }
    const moving = laneTime < laneDuration;
    const phase = moving ? laneTime / laneDuration : 1;
    const desiredLean = moving
      ? Math.sign(target - laneStart) * MAX_LANE_LEAN * Math.sin(Math.PI * phase)
      : 0;
    laneLean += (desiredLean - laneLean) * (1 - Math.exp(-dt / 0.075));
    if (!moving && Math.abs(laneLean) < 0.0001) laneLean = 0;
    if (wasAnimating) {
      sideAnimTime = SIDE_ANIM_SECONDS * (sidePhaseStart + (1 - sidePhaseStart) * phase);
      if (!moving) {
        sideAnimTime = SIDE_ANIM_SECONDS;
        runFrame = sideHandoffFrames[sideAnimDir < 0 ? 0 : 1];
        runTimer = 0;
        sideAnimDir = 0;
      }
    }
  }

  // Compare registered lower-body silhouettes once assets load, never during play.
  function prepareWalkHandoffs() {
    if (!imgWalkSheet.ready || !sideArt.walkFoot) return;
    const w = 72, h = 150, height = WORLD.playerHeight, base = 144;
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const c = canvas.getContext('2d', {willReadFrequently:true});
    function sample(image, frame, columns, drawH, centre, foot) {
      c.clearRect(0, 0, w, h);
      const fw = image.naturalWidth / columns, fh = image.naturalHeight;
      const drawW = drawH * fw / fh * (image === imgWalkSheet ? 1 : SIDE_WIDTH_SCALE);
      c.drawImage(image, frame * fw, 0, fw, fh, w / 2 - drawW * centre, base - drawH * foot, drawW, drawH);
      return c.getImageData(0, 0, w, h).data;
    }
    try {
      const walk = [];
      for (let f = 0; f < WALK_FRAMES; f++) walk.push(sample(imgWalkSheet, f, WALK_FRAMES, height, 0.5, sideArt.walkFoot));
      [imgSideLeft, imgSideRight].forEach((image, direction) => {
        if (!image.ready) return;
        const a = sideArt.anchors[direction][SIDE_FRAMES - 1];
        const poseH = height * (sideArt.walkFoot - sideArt.walkTop) / sideArt.visibleHeights[direction];
        const pose = sample(image, SIDE_FRAMES - 1, SIDE_FRAMES, poseH, a.torso, a.foot);
        let best = Infinity;
        walk.forEach((pixels, frame) => {
          let error = 0;
          for (let p = Math.floor(h * 0.53) * w * 4; p < pixels.length; p += 4) {
            error += Math.abs(pose[p + 3] - pixels[p + 3]);
            if (pose[p + 3] > 100 && pixels[p + 3] > 100)
              error += 0.05 * (Math.abs(pose[p] - pixels[p]) + Math.abs(pose[p + 1] - pixels[p + 1]) + Math.abs(pose[p + 2] - pixels[p + 2]));
          }
          if (error < best) { best = error; sideHandoffFrames[direction] = frame; }
        });
      });
    } catch (_) { /* The normal walking cycle remains a safe fallback. */ }
  }

  /* layout:start — distance-based spawner, fixed-update only. */
  const LEARN_GAP = DIFFICULTY.approachGap;
  function isFood(kind){return ITEMS[kind]?.kind==='food';}
  function isHazard(kind){return ITEMS[kind]?.kind==='hazard';}
  // Role-aware safety helpers; wide hazard occupies BOTH lane units.
  function safeLanesOf(lanes){
    const blocked=[false,false,false];
    lanes.forEach((kind,i)=>{if(isHazard(kind)){blocked[i]=true;if(ITEMS[kind].laneSpan===2 && i<2)blocked[i+1]=true;}});
    return [0,1,2].filter(i=>!blocked[i]);
  }
  function forceShare(prev,lanes,readGap){
    const budget=DIFFICULTY.readBudget;
    const safe=safeLanesOf(lanes),from=safeLanesOf(prev);
    // Never erase half a wide obstacle to fake a route. Reject invalid paths instead.
    return safe.some(to=>from.some(start=>readGap > Math.abs(start-to)*budget.moveCost+budget.reaction+budget.margin));
  }
  function spawnRow(){
    if(!pendingRow)pendingRow=director.row(distance);
    const row=pendingRow;
    const needed=row.roles.filter(role=>role && role!=='none').length;
    if(itemPool.free.length<needed)return false;
    if(!forceShare(lastLanes,row.lanes,row.gap))throw Error('Unsafe difficulty row: '+row.id);
    pendingRow=null;
    row.lanes.forEach((kind,laneIndex)=>{
      if(!kind||kind==='none')return;
      if(!ITEMS[kind])throw Error('Unregistered biome item '+kind);
      kind=barrenFoodKind(kind);
      if(wilderness.active()&&wilderness.progress()>=0&&isHazard(kind)){
        if(wilderness.progress()<900)return; // Empty, incoming breathing room after the crossing.
        kind=wilderness.hazard(uid);
      }
      const item=itemPool.acquire();
      if(!item)throw Error('Pooled row capacity violated');
      item.t=kind;item.l=laneIndex;item.y=item.previousY=-60;item.id=uid++;
      item.patternId=row.id;
      item.d=item.refused=item.near=item.cleared=item.foxEvent=0;
      item.dare=row.dare&&kind==='roast'?1:0;
      if(isFood(kind))performance.foodSpawned++;
    });
    lastLanes=row.lanes.slice();
    pendingRow=director.row(distance);
    gap=pendingRow.gap;
    return true;
  }
  /* layout:end */

  // GARY_PICKUP_SFX_V1 — procedural sounds; no external audio files.
  // Runs inside the game's existing, user-unlocked AudioContext.
  function playPickupSfx(kind) {
    if (!audioCtx || audioCtx.state !== 'running' || document.hidden) return;
    try {
      const roast = kind === 'roast';
      const frequencies = roast ? [523.25, 659.25, 783.99, 1046.50] : [659.25, 880];
      const spacing = roast ? 0.078 : 0.055;
      const duration = roast ? 0.155 : 0.105;
      const volume = roast ? 0.049 : 0.038;
      const now = audioCtx.currentTime;
      for (let i = 0; i < frequencies.length; i++) {
        const at = now + i * spacing;
        const oscillator = audioCtx.createOscillator();
        const envelope = audioCtx.createGain();
        oscillator.type = (roast || i > 0) ? 'sine' : 'triangle';
        oscillator.frequency.setValueAtTime(frequencies[i], at);
        envelope.gain.setValueAtTime(0.0001, at);
        envelope.gain.exponentialRampToValueAtTime(volume, at + 0.011);
        envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
        oscillator.connect(envelope);
        envelope.connect(audioCtx.destination);
        oscillator.start(at);
        oscillator.stop(at + duration + 0.012);
        oscillator.onended = () => {
          oscillator.disconnect();
          envelope.disconnect();
        };
      }
    } catch (_) { /* Sound is optional: never interrupt gameplay. */ }
  }

  function addEffect(x,y,life,txt,col,pop=0) {
    const effect=effectPool.acquire();
    if (!effect) return;
    effect.x=x; effect.y=y; effect.t=0; effect.life=life;
    effect.txt=txt; effect.col=col; effect.pop=pop;
  }
  function collect(o) {
    if (!isFood(o.t)) return;
    playPickupSfx(o.t);
    window.GaryFoodCatalogue?.discover(o.t);
    review = Math.min(9, review + 1);
    reviewGap = 1.5;
    reviewMul = review >= 5 ? 3 : review >= 3 ? 2 : 1;
    const pts = ITEMS[o.t].points * reviewMul;
    score += pts;
    performance.foodEaten++;
    const col = (TIERS[tierOf(score)] || TIERS[0]).c;
    addEffect(lx(o.l),o.y,1.1,'+'+pts,col,1);
    let grin = o.t === 'roast' || review === 3 || review === 6;
    if (o.dare) {
      grin = true;
      cap = { s: CAPS[review % CAPS.length], t: 0 };
    }
    const currentTier = tierOf(score);
    if (currentTier > lastTierIndex) { lastTierIndex = currentTier; grin = true; }
    if (grin) triggerGrin();
    tierMax = Math.max(tierMax, currentTier);
    checkEvents();
    mile = Math.floor(score / 40);
  }
  function checkEvents() {
    while (nextEvent < scoreEvents.length && score >= scoreEvents[nextEvent].at) {
      const ev = scoreEvents[nextEvent++];
      if (ev.say) cap = { s: ev.say, t: 0 };
      if (ev.grin) triggerGrin();
    }
  }
  function crash(hitType, patternId){
    if(!bridgePreviewSession)director.recordCrash(hitType,patternId,distance);
    if(state!=='play')return;
    performance.collisions++;
    crashT=0;lastHit=hitType;cap=null;crashScene.begin();transition(ITEMS[hitType]?.wilderness?'crash_m':hitType==='street_barrier'?'crash_fork':'crash_'+hitType);
  }
  function calculatePerformanceRating() {
    const survivalScore =
      Math.min(performance.distance / 1800, 1);

    const foodScore =
      performance.foodSpawned > 0
        ? Math.min(
            performance.foodEaten / performance.foodSpawned,
            1
          )
        : 0;

    const hazardAttempts =
      performance.hazardsPassed +
      performance.collisions;

    const avoidanceScore =
      hazardAttempts > 0
        ? performance.hazardsPassed / hazardAttempts
        : 1;

    const nearMissScore =
      Math.min(performance.nearMisses / 8, 1);

    const movementPenalty =
      Math.min(
        Math.max(performance.laneChanges - 20, 0) / 40,
        1
      );

    let rating =
        survivalScore * 3.0
      + foodScore * 2.5
      + avoidanceScore * 2.5
      + nearMissScore * 2.0
      - movementPenalty * 0.5;

    rating = Math.max(1, Math.min(10, rating));

    return Math.round(rating);
  }
  function animateGameOverGary() {
    if (gameOverFrameRequest !== null) cancelAnimationFrame(gameOverFrameRequest);
    gameOverFrameRequest = null;
    const canvas = document.getElementById("overAvatar");
    if (!canvas) return;
    const ctxOver = canvas.getContext("2d");
    let frame = 0;
    let lastTime = window.performance.now();

    function draw(time) {
      const over = document.getElementById("over");
      if (!document.getElementById("overAvatar") || !over || !over.classList.contains("show")) return;

      const dt = time - lastTime;
      lastTime = time;

      if (dt > 0) {
        frame += dt / 1000;
      }

      ctxOver.clearRect(0, 0, canvas.width, canvas.height);

      const img = imgRun[Math.floor(frame * 6) % imgRun.length];

      if (img && img.complete && img.naturalWidth > 0) {
        const scale = 120 / Math.max(img.naturalWidth, img.naturalHeight);
        const width = img.naturalWidth * scale, height = img.naturalHeight * scale;
        ctxOver.drawImage(img, (canvas.width - width) / 2,
          (canvas.height - height) / 2, width, height);
      }

      gameOverFrameRequest = requestAnimationFrame(draw);
    }

    gameOverFrameRequest = requestAnimationFrame(draw);
  }
  function endGame(){
    if (!transition('over')) return;
    crashScene.finish();
    cap=null;
    if(score>best){best=score;try{localStorage.setItem(bestStorageKey,best);}catch(e){}}
    try{
      finalRating = calculatePerformanceRating();
      const fRating = document.getElementById("fRating");
      if (fRating) fRating.textContent = `${finalRating}/10`;
      $('fScore').textContent='Score: '+score;
      const T=TIERS[tierMax]||TIERS[TIERS.length-1];
      $('fTier').textContent='Tier: '+T.n;$('fTier').style.color=T.c;$('over').classList.add('show');
      animateGameOverGary();
    }catch(e){}
  }
  function startGameplay(){
    if (state !== 'intro' || !startupReady) return;
    introAttempt++;
    clearTimeout(introFallbackTimer);
    introFallbackTimer = null;
    garyAudio.onended = null;
    const finalTalkingFrame = getGaryIntroFrame();
    garyAudio.pause();
    garyAudio.currentTime = 0;
    reset();
    const entrance = window.GaryIntroTransition;
    const animated = !!(entrance && entrance.begin({
      canvas: cv, avatar: $('introAvatar'), width: W, height: H,
      startFrame: garyIntroFrame, introFrame: finalTalkingFrame,
      playerY: PLAYER_Y, playerHeight: WORLD.playerHeight,
      footOffset: WORLD.playerFootOffset, targetX: lx(1),
      walkSheet: imgWalkSheet, walkColumns: WALK_FRAMES
    }));
    $('introOverlay').classList.remove('show');
    $('introOverlay').style.visibility = 'hidden';
    transition(animated ? 'intro_transition' : 'play');
    if (!animated) musicTo(MUSIC_VOL, 2);
  }
  function getGaryIntroFrame(){
    if(!garyIntroLoaded || !imgGaryIntro.naturalWidth) return null;

    const col = garyIntroFrame % GARY_INTRO_COLS;
    const row = Math.floor(garyIntroFrame / GARY_INTRO_COLS);

    return {
      image: imgGaryIntro,
      sx: col * GARY_INTRO_FRAME_W,
      sy: row * GARY_INTRO_FRAME_H,
      sw: GARY_INTRO_FRAME_W,
      sh: GARY_INTRO_FRAME_H
    };
  }
  function initAudio(){
    if(audioCtx)return;
    try{
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      audioCtx=new AudioContext();analyser=audioCtx.createAnalyser();analyser.fftSize=256;
      dataArray=new Uint8Array(analyser.frequencyBinCount);
      const source=audioCtx.createMediaElementSource(garyAudio);source.connect(analyser);analyser.connect(audioCtx.destination);
    }catch(e){}
    try {
      musicGain = audioCtx.createGain();
      musicGain.gain.value = 0;
      const musicSource = audioCtx.createMediaElementSource(music);
      musicSource.connect(musicGain);
      musicGain.connect(audioCtx.destination);
    } catch (e) { musicGain = null; }
    ensureRainBed();
    crashScene.prepareAudio();
  }
  function ensureRainBed() {
    if (!audioCtx || rainGain) return;
    try {
      const rate = audioCtx.sampleRate;
      const seconds = 2;
      const buffer = audioCtx.createBuffer(1, rate * seconds, rate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        last = last * 0.86 + white * 0.14;
        data[i] = last;
      }
      const high = audioCtx.createBiquadFilter();
      high.type = 'highpass';
      high.frequency.value = 220;
      const low = audioCtx.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = 1400;
      rainGain = audioCtx.createGain();
      rainGain.gain.value = 0;
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(high);
      high.connect(low);
      low.connect(rainGain);
      rainGain.connect(audioCtx.destination);
      source.start();
    } catch (e) {
      rainGain = null;
    }
  }
  function setRainVolume(level, dt) {
    if (!rainGain) return;
    const current = rainGain.gain.value;
    rainGain.gain.value = current + (level - current) * Math.min(1, dt * 2.2);
  }
  function musicTo(level, secs) {
    if (!musicGain) { music.volume = level; return; }
    const t = audioCtx.currentTime, g = musicGain.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(level, t + secs);
  }
  function startMusic() {
    musicOn = true;
    music.volume = 1;
    music.currentTime = 0;
    if (musicGain && audioCtx) {
      const t = audioCtx.currentTime;
      musicGain.gain.cancelScheduledValues(t);
      musicGain.gain.setValueAtTime(0.04, t);
      musicGain.gain.linearRampToValueAtTime(MUSIC_INTRO_VOL, t + MUSIC_FADE_IN);
    }
    const kick = () => { const p = music.play(); if (p) p.catch(() => {}); };
    kick();
    if (audioCtx && audioCtx.state !== 'running') audioCtx.resume().then(kick).catch(() => {});
  }
  function stopMusic() {
    musicOn = false;
    musicTo(0, 1);
    setTimeout(() => { if (!musicOn) music.pause(); }, 1100);
  }
  function suspend() {
    simulation.reset();
    if (state === 'play' || state === 'cutscene' || state === 'intro' || state === 'intro_transition' || state.startsWith('crash')) {
      pausedFrom = state;
      transition('paused');
    }
    music.pause(); garyAudio.pause(); crashScene.pause();
    if (rainGain) rainGain.gain.value = 0;
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
  addEventListener('pagehide', suspend);
  try{best=+localStorage.getItem(bestStorageKey)||0;}catch(e){}
  function tierOf(s){if(s<=50)return 0;if(s<=150)return 1;if(s<=300)return 2;if(s<=500)return 3;return 4;}

  function isTalkingAudio(){
    if(analyser&&!garyAudio.paused){
      analyser.getByteFrequencyData(dataArray);
      let sum=0;for(let i=0;i<dataArray.length;i++)sum+=dataArray[i];
      return sum/dataArray.length>18;
    }
    return false;
  }

  function syncNight(dt) {
    if (!NIGHT_MODE || state === 'menu' || state === 'intro') {
      playTime = 0;
      nightMix = 0;
      nightOn = false;
      return;
    }
    if (state === 'play') playTime += dt;
    if (NIGHT_PREVIEW) {
      nightMix = 1;
      nightOn = true;
      return;
    }
    // The first street plan is one pass of STREET. Night starts as that plan ends.
    const firstStretch = STREET.length * STREET_SEGMENT_H;
    if (distance < firstStretch) {
      nightMix = 0;
      nightOn = false;
      return;
    }
    if (state === 'play') nightMix = Math.min(1, nightMix + dt / NIGHT_FADE);
    nightOn = nightMix > 0.001;
  }

  function updatePlay(dt) {
    director.progress(distance,dt);
    clock += dt;
    syncNight(dt);
    updateRain(dt, true);
    const hazardsClear = !objs.some(o => !o.d && isHazard(o.t));
    const dareActive = objs.some(o => !o.d && o.dare);
    const ground = window.GaryRoadEvolution;
    const storyGate = director.storyAllowed(hazardsClear,dareActive) ||
      (hazardsClear && !dareActive && rainMix>=0.8 && shutterMix>=0.95 && !!ground && ground.encounterReady());
    const wasQuiet = mystery.quiet();
    ground?.update(dt, distance, nightMix, imgMystery.ready && allShopsClosed());
    ground?.recordDistance(distance);
    const decline=ground?.progressAt(distance)||0;
    // Only clear NEW off-screen segments as deterioration advances; the hooded
    // reader and fox controllers still own their original encounter state.
    if(!Number.isFinite(visualClearFrom) && decline>=0.18)
      visualClearFrom=Math.ceil((distance+H)/STREET_SEGMENT_H)+1;
    director.allowWide(!wilderness.known() && allShopsClosed() && decline>=0.30 && !mystery.quiet());
    // GaryStoryEncounterRepair20261018V3: announce the encounter corridor as soon as weather and decay are ready.
    // This reserves an empty, incoming stretch BEFORE waiting for visible hazards to clear.
    // Never make mystery.quiet() contingent on hazardsClear or the difficulty story beat.
    const encounterCorridorReady = imgMystery.ready && (!ground || ground.encounterReady());
    if(!bridge.visible())mystery.update(dt, distance, rainMix, shutterMix, hazardsClear, encounterCorridorReady);
    if (mystery.quiet()) ground?.trigger(distance, mystery.footAt(distance));
    sampleCutsceneWorld(hazardsClear);cutscenes.prewarm(cutsceneWorld);
    // Encounter was scheduled independently; let it begin once existing hazards clear.
    if((storyGate || (mystery.quiet() && hazardsClear && !dareActive)) && cutscenes.tryStart(cutsceneWorld)){
      transition('cutscene');return;
    }
    const sceneQuiet=cutscenes.quiet(cutsceneWorld);
    // Fox may activate only after the bench sequence is past, independently of
    // procedural difficulty and hazard-free frames. Existing fox safety checks remain.
    foxWorld.afterBench=mystery.snapshot().passed;foxWorld.dialogueActive=sceneQuiet;
    foxWorld.hazardsClear=hazardsClear;foxWorld.distance=distance;if(!bridge.visible())fox.update(dt,foxWorld);
    if(state!=='play')return;
    const foxQuiet=fox.quiet();
    const bridgeWasQuiet=bridge.quiet();
    bridge.update(dt,{distance,foxFinished:fox.snapshot().finished,hazardsClear,dialogueActive:sceneQuiet});
    if(bridge.locked() && target!==1)move(1-target);
    const bridgeQuiet=bridge.quiet();
    const wasWildernessQuiet=wilderness.quiet(),previousWildernessStage=wilderness.stage();
    wilderness.update(dt,{distance,bridge:bridge.snapshot(),hazardsClear,blocked:mystery.quiet()||sceneQuiet||foxQuiet});
    const wildernessQuiet=wilderness.quiet();
    if(wilderness.progress()>=0){nightMix=1-.86*wilderness.warmth();nightOn=nightMix>.001;}
    if(wasWildernessQuiet&&!wildernessQuiet){director.fullApproach();pendingRow=null;roadQueue=[];acc=0;}
    if(wilderness.stage()>previousWildernessStage&&!cap)cap={s:wilderness.stage()===1?'The other side. Beautiful.':wilderness.stage()===3?'These stones look older than the path.':'A long way from the high street.',t:0};
    if(bridgeWasQuiet&&!bridgeQuiet){director.fullApproach();acc=0;lastLanes=['none','none','none'];}
    const waitForBenchIntro=mystery.quiet()&&hazardsClear&&mystery.footAt(distance)>=cutsceneWorld.playerY&&!cutsceneWorld.actors[0].introComplete;
    if (wasQuiet && !mystery.quiet()) {
      // Fresh, safe lead-in after the cameo; never release a backlog of rows.
      roadQueue = []; pendingRow=null; director.fullApproach(); acc = 0; lastLanes = ['none','none','none']; gap = LEARN_GAP;
    }
    window.GaryFoodCatalogue?.tick?.(dt);
    updateGaryLane(dt);
    grinTimer = Math.max(0, grinTimer - dt);
    updateWalkAnimation(dt);

    for (let i = stars.length - 1; i >= 0; i--) {
      const star = stars[i];
      star.x += star.vx * dt;
      star.y += star.vy * dt;
      star.life -= dt;

    }
    starPool.retain(livingStar);
    if (cap) {
      cap.t += dt;
      if (cap.t > 2.2) cap = null;
    }
    for (const effect of fx) effect.t += dt;
    effectPool.retain(livingEffect);

    const normalSpeed = Math.min(DIFFICULTY.speedCap, 200 + 100*Math.min(1,distance/8000));
    const desiredSpeed = foxQuiet&&hazardsClear ? normalSpeed*window.GaryFoxEncounter.SPEC.minSpeedRatio : mystery.slow(distance,hazardsClear) ? mysterySpec.slowSpeed : normalSpeed;
    shownSpeed += (desiredSpeed - shownSpeed) * Math.min(1, dt * 0.7);
    if(foxQuiet&&hazardsClear)shownSpeed=Math.max(shownSpeed,normalSpeed*window.GaryFoxEncounter.SPEC.minSpeedRatio);
    const speed = waitForBenchIntro ? 0 : shownSpeed;
    nearCd = Math.max(0, nearCd - dt);
    flash = Math.max(0, flash - dt);
    if (review > 0) {
      reviewGap -= dt;
      if (reviewGap <= 0) { review = 0; reviewMul = 1; }
    }

    distance += speed * dt;
    scrollY = distance;
    pigeons.update(dt);
    updateShopClosures();
    performance.distance = distance;
    if(bridgeQuiet||wildernessQuiet){roadQueue=[];pendingRow=null;}
    if (mystery.quiet() || sceneQuiet || foxQuiet || bridgeQuiet || wildernessQuiet) acc = 0;
    else acc += dt * (speed / DIFFICULTY.speedCap);
    let spawned = 0;
    while (!mystery.quiet() && !sceneQuiet && !foxQuiet && !bridgeQuiet && !wildernessQuiet && acc >= gap && spawned < 3) {
      const elapsedGap = gap;
      if (!spawnRow()) break;
      acc -= elapsedGap;
      spawned++;
    }

    for (const object of objs) {
      object.y += speed * dt;
      const definition = ITEMS[object.t];
      if (!definition) { object.d = 1; continue; }
      const verticalDistance = Math.abs(object.y - PLAYER_Y);
      const laneDistance = Math.abs(lane - object.l);

      if (!object.d && touchesPlayer(object, definition)) {
        object.d = 1;
        if (isHazard(object.t)) {
          review = 0;
          reviewMul = 1;
          crash(object.t,object.patternId);
          return;
        }
        collect(object);
      } else if (object.dare && !object.d && !object.refused && object.y > PLAYER_Y + 36) {
        object.refused = 1;
        object.d = 1;
        score += 10;
        addEffect(lx(1),PLAYER_Y-28,1.1,'+10','#ffe600');
        cap = { s: LINES.close, t: 0 };
        performance.dareRefusals++;
      } else if (!object.near && isHazard(object.t) && verticalDistance < 26
          && laneDistance > 0.55 && laneDistance < 1.05) {
        object.near = 1;
        if (nearCd <= 0) {
          nearCd = 1.4;
          score += 5;
          performance.nearMisses++;
          cap = { s: LINES.close, t: 0 };
          addEffect(lx(lane),PLAYER_Y-20,1,'+5','#fff');
        }
      }
    }
    itemPool.retain(livingItem);
  }

  function drawRoad(){
    ctx.fillStyle='#3a3f47';ctx.fillRect(ROAD_LEFT,0,ROAD_WIDTH,H);
    paintLaneMarkings('#c5c8cc');
    if (window.GaryRoadEvolution) {
      window.GaryRoadEvolution.drawRoad(ctx, {left: ROAD_LEFT, width: ROAD_WIDTH, height: H, scrollY: view.scrollY, distance: view.distance});
    }
  }

  function paintLaneMarkings(color) {
    const dashH=42*S,gapH=28*S,totalD=dashH+gapH,offY=view.scrollY%totalD;
    ctx.fillStyle=color;
    for(let l=1;l<=2;l++){
      const lineX=ROAD_LEFT+l*LANE_WIDTH-2.7*S;
      for(let y=-totalD+offY;y<H+totalD;y+=totalD)ctx.fillRect(lineX,y,5.4*S,dashH);
    }
  }

  function bakeGlow(size, stops) {
    const s = document.createElement('canvas');
    s.width = s.height = size;
    const g = s.getContext('2d');
    const rad = g.createRadialGradient(size/2, size/2, size*0.06, size/2, size/2, size/2);
    for (const stop of stops) rad.addColorStop(stop[0], stop[1]);
    g.fillStyle = rad;
    g.fillRect(0, 0, size, size);
    return s;
  }

  // These reusable light textures are baked once. paintWindowLight below still
  // creates a gradient per visible window; caching that pass is documented work.
  const nightGlow = bakeGlow(96, [
    [0, 'rgba(255, 244, 214, 0.95)'],
    [0.28, 'rgba(255, 188, 72, 0.72)'],
    [0.62, 'rgba(255, 170, 60, 0.18)'],
    [1, 'rgba(255, 160, 40, 0)']
  ]);
  const nightLamp = bakeGlow(64, [
    [0, 'rgba(255, 220, 150, 0.95)'],
    [0.4, 'rgba(255, 176, 70, 0.30)'],
    [1, 'rgba(255, 160, 50, 0)']
  ]);
  const nightRoadPool = bakeGlow(140, [
    [0, 'rgba(255, 186, 96, 0.55)'],
    [1, 'rgba(255, 170, 70, 0)']
  ]);
  function bakeEdge() {
    const s = document.createElement('canvas');
    s.width = 36;
    s.height = 8;
    const g = s.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 36, 0);
    grad.addColorStop(0, 'rgba(6, 10, 28, 0.34)');
    grad.addColorStop(1, 'rgba(6, 10, 28, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 36, 8);
    return s;
  }
  const nightEdge = bakeEdge();
  const nightWindowFill = bakeGlow(80, [
    [0, 'rgba(255, 246, 220, 0.92)'],
    [0.34, 'rgba(255, 188, 72, 0.62)'],
    [0.78, 'rgba(255, 168, 52, 0.16)'],
    [1, 'rgba(255, 160, 40, 0)']
  ]);

  function shopIsLit(seed) {
    return ((seed * 17 + 3) % 8) !== 0;
  }

  function drawNightAmbient() {
    ctx.save();
    ctx.globalAlpha = nightMix;
    ctx.fillStyle = 'rgba(12, 20, 48, 0.38)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawNightRoadLight() {
    ctx.save();
    ctx.globalAlpha = nightMix;
    ctx.fillStyle = 'rgba(16, 28, 58, 0.20)';
    ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, H);
    paintLaneMarkings('#fffef8');
    ctx.restore();
  }

  function paintWindowLight(keeperIndex, x, y, w, h, seed) {
    const win = shopWindowRect(keeperIndex, x, y, w, h);

    if (win.y > H || win.y + win.h < 0) {
      return;
    }

    const flick = 0.97 + 0.03 * Math.sin(clock * 1.7 + seed);

    ctx.save();

    ctx.beginPath();
    ctx.rect(win.x, win.y, win.w, win.h);
    ctx.clip();

    const glow = ctx.createRadialGradient(
      win.x + win.w * 0.52,
      win.y + win.h * 0.58,
      2,
      win.x + win.w * 0.52,
      win.y + win.h * 0.58,
      Math.max(win.w, win.h) * 0.65
    );

    glow.addColorStop(0, `rgba(255, 204, 112, ${0.20 * flick})`);
    glow.addColorStop(0.55, `rgba(255, 178, 82, ${0.10 * flick})`);
    glow.addColorStop(1, "rgba(255, 150, 60, 0)");

    ctx.fillStyle = glow;
    ctx.fillRect(win.x - 4, win.y - 4, win.w + 8, win.h + 8);

    ctx.fillStyle = `rgba(255, 184, 92, ${0.055 * flick})`;
    ctx.fillRect(win.x, win.y, win.w, win.h);

    ctx.restore();
  }

  function drawNightShopWindows() {
    // Window light is painted inside drawStreetBuilding, before the keeper,
    // so this later pass does not wash the shopkeeper back out.
  }

  function drawObj(o){
    const x=lx(o.l),y=lerp(o.previousY,o.y,view.alpha);
    const hazard=isHazard(o.t);
    if(hazard){
      ctx.fillStyle='rgba(18,20,24,.45)';
      ctx.beginPath();ctx.ellipse(x,y+16,18,7,0,0,7);ctx.fill();
    }else{
      ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(x,y+(o.foxEvent?4:18*S),o.foxEvent?7:20*S,o.foxEvent?2:6*S,0,0,7);ctx.fill();
    }
    if (o.dare) {
      const pulse = 0.45 + Math.sin(view.clock * 5) * 0.25;
      ctx.strokeStyle = 'rgba(255,230,0,' + pulse + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(x, y + 18, 28, 11, 0, 0, 7);
      ctx.stroke();
    }
    const definition = ITEMS[o.t];
    if (!definition) return;
    if(definition.laneSpan===2){
      const bx=lx(o.l)+LANE_WIDTH/2,by=y;
      ctx.save();ctx.fillStyle='rgba(10,14,20,.28)';
      ctx.beginPath();ctx.ellipse(bx,by+20,46,5,0,0,Math.PI*2);ctx.fill();
      const pic=itemImages[o.t];
      if(pic && pic.ready){
        // Source art stays perfectly horizontal, compressed toward road-camera height.
        ctx.translate(bx,by+1);ctx.scale(1,.88);ctx.drawImage(pic,-50,-27,100,54);
      }else{
        ctx.lineWidth=3;ctx.strokeStyle='#151b21';ctx.fillStyle='#f9b538';
        rr(ctx,bx-45,by-24,90,48,7);ctx.fill();ctx.stroke();
        ctx.fillStyle='#192733';ctx.fillRect(bx-39,by-8,78,16);
        ctx.fillStyle='#fff0ce';for(let i=0;i<5;i++)ctx.fillRect(bx-37+i*18,by-6,10,12);
      }
      ctx.restore();return;
    }
    if(definition.wilderness){wilderness.drawHazard(ctx,o.t,x,y);return;}
    const bob = o.foxEvent?0:Math.sin(view.clock * 6 + o.id) * 3 * S;
    const sz = o.foxEvent?16:definition.displaySize;
    const loaded = itemImages[o.t];
    const pic = loaded && loaded.ready ? loaded : SP[definition.fallback];
    if (!pic) return;
    ctx.drawImage(pic,x-sz/2,y-sz/2+bob,sz,sz);
    if(o.t==='roast'){
      const g = (view.clock*0.9+o.id)%1;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.sin(g*Math.PI)*0.7);
      ctx.fillStyle = '#f4f7ff';
      ctx.beginPath();
      ctx.ellipse(x-sz*0.2+g*sz*0.36, y-sz*0.08+bob, 4, 1.2, -0.5, 0, 7);
      ctx.fill();
      ctx.globalAlpha = Math.max(0, Math.sin(g*Math.PI)*0.35);
      ctx.beginPath();
      ctx.ellipse(x-sz*0.05+g*sz*0.2, y+sz*0.08+bob, 2.2, 0.7, -0.5, 0, 7);
      ctx.fill();
      ctx.restore();
    }
  }

  function updateIntroAnimation(dt) {
    introAnimTimer += dt;
    garyIntroFrameTimer += dt;
    const lastFrame = GARY_INTRO_COLS * GARY_INTRO_ROWS - 1;
    while (garyIntroFrame < lastFrame && garyIntroFrameTimer >= GARY_INTRO_FRAME_TIME) {
      garyIntroFrameTimer -= GARY_INTRO_FRAME_TIME;
      garyIntroFrame++;
    }
    if (garyIntroFrame === lastFrame) garyIntroFrameTimer = 0;
  }

  function updateWalkAnimation(dt) {
    if (sideAnimDir && sideAnimTime < SIDE_ANIM_SECONDS) return;
    if (grinTimer > 0 && imgCheer.ready) return;
    runTimer += dt;
    while (runTimer >= WALK_FRAME_TIME) {
      runTimer -= WALK_FRAME_TIME;
      runFrame = (runFrame + 1) % WALK_FRAMES;
    }
  }

  function drawIntroAvatar(){
    introCtx.clearRect(0,0,180,180);

    introCtx.fillStyle='#111';
    introCtx.beginPath();
    introCtx.arc(90,90,90,0,Math.PI*2);
    introCtx.fill();


    const frame = getGaryIntroFrame();

    if(frame){
      const displaySize = 175;
      const ar = frame.sw / frame.sh;

      let w = displaySize * ar;
      let h = displaySize;

      if(w > displaySize){
        w = displaySize;
        h = w / ar;
      }

      introCtx.drawImage(
        frame.image,
        frame.sx,
        frame.sy,
        frame.sw,
        frame.sh,
        90 - w / 2,
        90 - h / 2,
        w,
        h
      );
    }else{
      introCtx.save();
      introCtx.translate(90,90);
      fbFace(introCtx,60);
      introCtx.restore();
    }

    introCtx.lineWidth=6;
    introCtx.strokeStyle='#ffe600';
    introCtx.beginPath();
    introCtx.arc(90,90,86,0,Math.PI*2);
    introCtx.stroke();
  }

  function drawPlayer(){
    const px = lx(view.lane), py = PLAYER_Y;
    const shade = ctx.createRadialGradient(px,py+6,2,px,py+6,16);
    shade.addColorStop(0,'rgba(0,0,0,.24)');
    shade.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=shade;
    ctx.beginPath(); ctx.ellipse(px,py+6,16,4,0,0,7); ctx.fill();

    ctx.save(); ctx.translate(px,py);
    const isCrashing=state.startsWith('crash');
    const direction=sideAnimDir || (view.sideTime < SIDE_ANIM_SECONDS ? previous.sideDir : 0);
    const image=direction<0?imgSideLeft:direction>0?imgSideRight:null;
    const pose=state==='play' && !isCrashing &&
      view.sideTime<SIDE_ANIM_SECONDS && image && image.ready;
    // The sheet already includes its own lean. Avoid doubling it.
    if(!isCrashing) ctx.rotate(view.lean*(pose?0.25:1));
    const h=WORLD.playerHeight;
    if(isCrashing && crashScene.pose()){
      // Optional talking crash sheet has the same ground anchor as the base pose.
    } else if(isCrashing && imgCrash.ready || (!pose && grinTimer>0 && imgCheer.ready)){
      const single=isCrashing?imgCrash:imgCheer;
      const w=h*single.naturalWidth/single.naturalHeight;
      ctx.drawImage(single,-w/2,-h+WORLD.playerFootOffset,w,h);
    } else if(pose){
      // Six consecutive frames across the sidestep; no crossfaded ghosts.
      const fraction=Math.min(0.999999,view.sideTime/SIDE_ANIM_SECONDS);
      const frame=Math.min(SIDE_FRAMES-1,Math.floor(fraction*SIDE_FRAMES));
      const anchor=sideArt.anchors[direction<0?0:1][frame]||{torso:0.5,foot:0.96};
      // Match the walking sprite's full hair-to-shoe height, excluding padding.
      // One scale for the whole direction preserves frame-to-frame body proportions.
      const sheetVisible=sideArt.visibleHeights[direction<0?0:1];
      const poseH=h*(sideArt.walkFoot-sideArt.walkTop)/sheetVisible;
      const w=poseH*SIDE_W/SIDE_H*SIDE_WIDTH_SCALE;
      // Align the shirt/torso centre and shoe baseline to the walking sprites.
      const x=-w*anchor.torso;
      const y=-h+WORLD.playerFootOffset+h*sideArt.walkFoot-poseH*anchor.foot;
      ctx.drawImage(image,frame*SIDE_W,0,SIDE_W,SIDE_H,x,y,w,poseH);
    } else if(imgWalkSheet.ready){
      const frameW=imgWalkSheet.naturalWidth/WALK_FRAMES;
      const frameH=imgWalkSheet.naturalHeight;
      const w=h*frameW/frameH;
      ctx.drawImage(imgWalkSheet,runFrame*frameW,0,frameW,frameH,
        -w/2,-h+WORLD.playerFootOffset,w,h);
    } else {
      fbFace(ctx,36*S);
    }
    ctx.restore();

    for(const s of stars){
      const p=s.life/s.maxLife;
      ctx.save();ctx.fillStyle=Math.floor(view.clock*20)%2?'#ffe600':'#fff';ctx.globalAlpha=Math.max(0,p);
      ctx.beginPath();ctx.arc(lerp(s.previousX,s.x,view.alpha),lerp(s.previousY,s.y,view.alpha),s.size*p,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }

  function drawDiagnostics(){
    if(!loadErrorLog.length)return;
    ctx.fillStyle='rgba(255,0,0,.85)';ctx.fillRect(0,0,W,24*loadErrorLog.length+8);
    ctx.fillStyle='#c5c8cc';ctx.font='11px monospace';ctx.textAlign='left';ctx.textBaseline='top';
    loadErrorLog.forEach((err,i)=>ctx.fillText('â ï¸ ERROR: '+err,10,6+i*22));
  }

  function drawHud(){
    const T=TIERS[tierOf(score)];
    ctx.fillStyle='rgba(10,12,20,.85)';rr(ctx,10,10,340,38,10);ctx.fill();
    ctx.strokeStyle=T.c;ctx.lineWidth=3;ctx.stroke();txt('Tier: '+T.n,CX,29,13,T.c,'center');
    txt('SCORE '+score,20,70,18,'#fff','left');txt('BEST '+best,340,70,13,'#cfd6e0','right');
  }

  function drawCap(){
    const line=state.startsWith('crash')?(LINES[lastHit]||LINES.m):(cap&&cap.s);
    if(!line)return;
    const t=cap?cap.t:0,a=t>1.8?1-(t-1.8)/.4:1;
    ctx.save();ctx.globalAlpha=Math.max(0,a);
    ctx.font='700 13px Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    const w=Math.min(300,ctx.measureText(line).width+18);
    const x=CX-w/2,y=PLAYER_Y-168;
    ctx.fillStyle='rgba(12,14,18,.92)';
    rr(ctx,x,y,w,24,6);ctx.fill();
    ctx.fillStyle='#f4f1ea';
    ctx.fillText(line,CX,y+12);
    ctx.restore();
  }

  function drawStreetLight(){
    if (lampHeads.length && nightOn) {
      ctx.save();
      ctx.globalAlpha = 0.42 * nightMix;
      for (let i = 0; i < lampHeads.length; i += 2) {
        const hx = lampHeads[i], hy = lampHeads[i + 1];
        ctx.drawImage(nightLamp, hx - 28, hy - 22, 56, 44);
      }
      ctx.restore();
    }
    if (lampGlows.length) {
      const flick = 0.94 + Math.sin(view.clock * 3.1) * 0.04;
      const pool = nightOn ? (0.10 + 0.08 * nightMix) * flick : 0.05 * flick;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = pool;
      ctx.beginPath();
      ctx.rect(ROAD_LEFT, 0, ROAD_WIDTH, H);
      ctx.clip();
      for (const cy of lampGlows) ctx.drawImage(nightRoadPool, ROAD_LEFT - 10, cy - 46, ROAD_WIDTH + 20, 92);
      ctx.restore();
    }
    lampGlows.length = 0;
    lampHeads.length = 0;
  }

  function drawNightVignette() {
    ctx.save();
    ctx.globalAlpha = nightMix * 0.9;
    ctx.drawImage(nightEdge, 0, 0, 36, H);
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(nightEdge, 0, 0, 36, H);
    ctx.restore();
  }

  function drawVignette(){
    ctx.save();
    const leftShade = ctx.createLinearGradient(0, 0, ROAD_LEFT, 0);
    leftShade.addColorStop(0, 'rgba(8,10,14,.28)');
    leftShade.addColorStop(1, 'rgba(8,10,14,0)');
    ctx.fillStyle = leftShade;
    ctx.fillRect(0, 0, ROAD_LEFT, H);
    const rightShade = ctx.createLinearGradient(W, 0, ROAD_RIGHT, 0);
    rightShade.addColorStop(0, 'rgba(8,10,14,.28)');
    rightShade.addColorStop(1, 'rgba(8,10,14,0)');
    ctx.fillStyle = rightShade;
    ctx.fillRect(ROAD_RIGHT, 0, W - ROAD_RIGHT, H);
    ctx.restore();

    const t=ctx.createLinearGradient(0,0,0,70);t.addColorStop(0,'rgba(4,6,16,.18)');t.addColorStop(1,'rgba(4,6,16,0)');
    ctx.fillStyle=t;ctx.fillRect(0,0,W,70);
    const b=ctx.createLinearGradient(0,H-130,0,H);b.addColorStop(0,'rgba(4,6,16,0)');b.addColorStop(1,'rgba(4,6,16,.45)');
    ctx.fillStyle=b;ctx.fillRect(0,H-130,W,130);
  }

  function makeStreak(fromTop) {
    return {
      x: Math.random() * (W + 36) - 12,
      y: fromTop ? -24 - Math.random() * 90 : Math.random() * H,
      len: 7 + Math.random() * 13,
      speed: 620 + Math.random() * 480,
      drift: 22 + Math.random() * 26,
      a: 0.15 + Math.random() * 0.24,
      w: Math.random() < 0.82 ? 1 : 1.3,
      far: Math.random() < 0.42
    };
  }

  function recycleStreak(s) {
    s.x = Math.random() * (W + 56) - 24;
    s.y = -18 - Math.random() * 80;
    s.len = (s.far ? 6 : 9) + Math.random() * (s.far ? 8 : 12);
    s.speed = (s.far ? 480 : 700) + Math.random() * 360;
    s.drift = 18 + Math.random() * 30;
    s.a = (s.far ? 0.1 : 0.16) + Math.random() * 0.18;
    s.previousX=s.x; s.previousY=s.y;
  }

  function parkSplash(s, dormant) {
    const band = Math.random();
    if (band < 0.74) s.x = ROAD_LEFT + 8 + Math.random() * (ROAD_WIDTH - 16);
    else if (band < 0.87) s.x = Math.max(2, ROAD_LEFT - PAVEMENT_WIDTH) + Math.random() * PAVEMENT_WIDTH;
    else s.x = ROAD_RIGHT + 2 + Math.random() * Math.max(6, W - ROAD_RIGHT - 4);
    s.y0 = dormant ? Math.random() * H : -8 - Math.random() * 48;
    s.born = scrollY;
    s.y = s.previousY = s.y0;
    s.rx = 2.1 + Math.random() * 2.5;
    s.ry = 0.62 + Math.random() * 0.45;
    s.max = 0.18 + Math.random() * 0.16;
    s.life = dormant ? 0 : s.max;
    s.a = 0.55 + Math.random() * 0.45;
    s.wait = dormant ? 0.12 + Math.random() * 1.3 : 0;
  }

  function makeSplash(dormant) {
    const s = { x: 0, y0: 0, born: 0, y: 0, rx: 2, ry: 0.8, max: 0.24, life: 0, a: 0.8, wait: 0.4 };
    parkSplash(s, dormant);
    return s;
  }

  
function updateRain(dt, advancing) {
  if (state === 'menu' || state === 'intro' || state === 'over') {
    nightHeld = 0;
    rainMix = 0;
    rainSaid = false;
    setRainVolume(0, dt);
    return;
  }

  if (advancing) {
    if(wilderness.active()&&wilderness.progress()>=0){rainMix+=(wilderness.weather()-rainMix)*Math.min(1,dt*.8);}
    else if (RAIN_PREVIEW) {
      rainMix = Math.min(1, rainMix + dt / 1.4);
    } else if (nightMix >= 0.98) {
      nightHeld += dt;

      const goal = nightHeld <= WEATHER.breatheSeconds
        ? 0
        : Math.min(
            1,
            (nightHeld - WEATHER.breatheSeconds) / WEATHER.rampSeconds
          );

      rainMix += (goal - rainMix) * Math.min(1, dt * 0.85);
    }

    if (!rainSaid && rainMix > 0.55) {
      rainSaid = true;
      cap = { s: WEATHER.line, t: 0 };
    }
  }

  // Shops shut during the nightfall transition, before ground deterioration.
  if (advancing && nightMix >= 0.35) {
    shutterMix = Math.min(1, shutterMix + dt / 2.2);
  }

  if (rainMix < 0.012) {
    setRainVolume(0, dt);
    return;
  }

  const pace = 0.55 + rainMix * 0.7;

  for (let i = 0; i < STREAK_COUNT; i++) {
    const s = streaks[i];
    s.y += s.speed * pace * dt;
    s.x += s.drift * pace * dt;

    if (s.y > H + 8 || s.x > W + 30) {
      recycleStreak(s);
    }
  }

  const scrollDelta = advancing ? shownSpeed * dt : 0;

  for (let i = 0; i < SPLASH_COUNT; i++) {
    const s = splashes[i];
    s.y += scrollDelta;

    if (s.wait > 0) {
      s.wait -= dt * (0.35 + rainMix);

      if (s.wait <= 0) {
        parkSplash(s, false);
      }

      continue;
    }

    s.life -= dt;

    if (s.life <= 0 || s.y > H + 10) {
      s.life = 0;
      s.wait = (0.04 + Math.random() * 0.55) /
        Math.max(0.35, rainMix);
    }
  }

  setRainVolume(
    (state === 'play' || state.startsWith('crash'))
      ? rainMix * 0.11
      : 0,
    dt
  );
}


  function drawStormShade() {
    if (rainMix < 0.02) return;
    ctx.save();
    ctx.fillStyle = 'rgba(3, 6, 14, ' + (0.42 * rainMix) + ')';
    ctx.fillRect(0, 0, ROAD_LEFT, H);
    ctx.fillRect(ROAD_RIGHT, 0, W - ROAD_RIGHT, H);
    ctx.fillStyle = 'rgba(7, 12, 24, ' + (0.16 * rainMix) + ')';
    ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, H);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.5 * (1 - rainMix * 0.35);
    paintLaneMarkings('#e7eef8');
    ctx.restore();
  }

  function drawStormWindowLift() {
    if (!streetLoaded || !nightOn || rainMix < 0.12) return;
    ctx.save();
    ctx.globalAlpha = 0.5 * rainMix;
    forEachStreetFront((plan, index, y) => {
      stampBakedWindow(plan.left, 0, y, BUILDING_WIDTH, BUILDING_H, index);
      stampBakedWindow(
        plan.right, ROAD_RIGHT + PAVEMENT_WIDTH, y,
        W - ROAD_RIGHT - PAVEMENT_WIDTH, BUILDING_H, index + 3
      );
    });
    ctx.restore();
  }

  function stampBakedWindow(name, x, y, w, h) {
    const idx = shopByName(name);
    if (idx < 0) return;
    const keeper = BUILDINGS[idx].keeper;
    const win = shopWindowRect(keeper, x, y, w, h);
    if (win.y > H || win.y + win.h < 0) return;
    const size = Math.max(win.w, win.h) * 1.45;
    ctx.drawImage(nightGlow, win.x + win.w * 0.5 - size * 0.5, win.y + win.h * 0.42 - size * 0.5, size, size);
  }

  function drawRainSplashes() {
    if (rainMix < 0.02) return;
    ctx.save();
    ctx.fillStyle = '#d7e6f6';
    for (let i = 0; i < SPLASH_COUNT; i++) {
      const s = splashes[i];
      if (s.life <= 0 || s.wait > 0) continue;
      const k = 1 - s.life / s.max;
      ctx.globalAlpha = Math.sin(Math.min(1, Math.max(0, k)) * Math.PI) * 0.4 * rainMix * s.a;
      ctx.beginPath();
      ctx.ellipse(s.x, lerp(s.previousY,s.y,view.alpha), s.rx * (0.55 + k), s.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawRainStreaks() {
    if (rainMix < 0.02) return;
    const count = Math.min(
  STREAK_COUNT,
  Math.max(10, Math.floor(
    78 * (0.22 + 0.78 * rainMix) +
    48 * shutterMix
  ))
);
    const wildRain=wilderness.active()&&wilderness.progress()>=0;
    const effectiveCount=Math.ceil(count*(wildRain?rainMix:1));
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < effectiveCount; i++) {
      const s = streaks[i];
      const lean = s.drift * (s.len / s.speed);
      ctx.globalAlpha = s.a * (0.28 + 0.72 * rainMix)*(wildRain?rainMix:1);
      ctx.strokeStyle = s.far ? '#a9bdd2' : '#e8f2fb';
      ctx.lineWidth = s.w;
      ctx.beginPath();
      const x=lerp(s.previousX,s.x,view.alpha), y=lerp(s.previousY,s.y,view.alpha);
      ctx.moveTo(x, y);
      ctx.lineTo(x + lean, y + s.len);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Gary Eats! Visual Studio bridge. Published data is optional.
  const shopClosureSpecs = Object.create(null);
  const shopClosureStarted = new Map();
  const RECT_FIELDS = ['x', 'y', 'w', 'h'];
  const rectIsValid = r => r && RECT_FIELDS.every(k => Number.isFinite(r[k]))
    && r.x >= 0 && r.y >= 0 && r.w > 0 && r.h > 0
    && r.x + r.w <= BUILDING_WIDTH + 0.01
    && r.y + r.h <= BUILDING_H + 0.01;

  // Safe fallback: if the studio JSON fails, the existing game still starts.
  BUILDINGS.forEach((building, i) => {
    const p = SHOP_PANES[i];
    shopClosureSpecs[building.name] = {
      shutter: {
        x: p.x * BUILDING_WIDTH, y: p.y * BUILDING_H,
        w: p.w * BUILDING_WIDTH, h: p.h * BUILDING_H
      },
      doorLight: null,
      duration: 1
    };
  });

  fetch('gary-game-config.json', { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error('Studio configuration unavailable');
      return response.json();
    })
    .then(config => {
      if (config.schema !== 'gary-eats-game-config-v1'
          || config.world?.width !== W || config.world?.height !== H) {
        throw new Error('Incompatible Visual Studio configuration');
      }
      applyPublishedKeepers(config);
      if (config.shopKeeperAnchors && typeof config.shopKeeperAnchors === 'object') {
        BUILDINGS.forEach(building => {
          const a = config.shopKeeperAnchors[building.name];
          if (a && ['x','y','w','h'].every(k => Number.isFinite(a[k])) &&
              a.x >= -89 && a.x <= 178 && a.y >= -236 && a.y <= 472 &&
              a.w > 0 && a.w <= 178 && a.h > 0 && a.h <= 472) {
            shopKeeperAnchors[building.name] = { x:a.x, y:a.y, w:a.w, h:a.h };
          }
        });
      }
      // Studio window panes: one shared source for keeper anchoring and lighting.
      if (config.shopWindowPanes && typeof config.shopWindowPanes === 'object') {
        BUILDINGS.forEach((building, i) => {
          const p = config.shopWindowPanes[building.name];
          if (rectIsValid(p)) SHOP_PANES[i] = { x:p.x/BUILDING_WIDTH, y:p.y/BUILDING_H, w:p.w/BUILDING_WIDTH, h:p.h/BUILDING_H };
        });
      }
      for (const building of BUILDINGS) {
        const s = config.shopClosures?.[building.name];
        if (!rectIsValid(s?.shutter)) continue;
        shopClosureSpecs[building.name] = {
          shutter: s.shutter,
          doorLight: rectIsValid(s.doorLight) ? s.doorLight : null,
          duration: Number.isFinite(s.duration)
            ? Math.max(0.35, Math.min(3.5, s.duration)) : 1
        };
      }
    })
    .catch(error => console.warn('Visual Studio settings:', error.message));

  // Once per distinct shop name; repeating street instances retain closed shutters.
  // The map holds at most six entries. Story controllers are not altered.
  function closureProgress(name,segment,side,at){
    const entry=shopClosureStarted.get(name);
    if(!entry || segment<entry.segment)return null;
    if(segment>entry.segment)return 1;
    if(side!==entry.side)return null;
    const duration=shopClosureSpecs[name]?.duration||1;
    return Math.max(0,Math.min(1,(at-entry.time)/duration));
  }
  function allShopsClosed(){
    if(shopClosureStarted.size<BUILDINGS.length)return false;
    for(const shop of BUILDINGS){
      const entry=shopClosureStarted.get(shop.name);
      if(!entry || clock<entry.time+(shopClosureSpecs[shop.name]?.duration||1))return false;
    }
    return true;
  }
  function updateShopClosures(){
    if(shutterMix<0.95 || !streetLoaded || allShopsClosed())return;
    function start(name,segment,side,y){
      if(!name || name==='none'||shopClosureStarted.has(name))return;
      const spec=shopClosureSpecs[name];if(!spec)return;
      const bottom=y+spec.shutter.y+spec.shutter.h;
      if(bottom>=PLAYER_Y-230 && bottom<=PLAYER_Y+60)
        shopClosureStarted.set(name,{segment,side,time:clock});
    }
    forEachStreetFront((plan,segment,y)=>{start(plan.left,segment,'L',y);start(plan.right,segment,'R',y);},distance);
  }
  function drawShopShutters(){
    if(!shopClosureStarted.size||!streetLoaded)return;
    function paint(name,segment,side,y){
      const spec=shopClosureSpecs[name];if(!spec)return;
      const t=closureProgress(name,segment,side,view.clock);if(t===null)return;
      const eased=t*t*(3-2*t),s=spec.shutter;
      const bx=side==='L'?0:ROAD_RIGHT+PAVEMENT_WIDTH;
      const x=bx+s.x,top=y+s.y,h=s.h*eased;
      if(h>0.2){
        ctx.save();ctx.beginPath();ctx.rect(x,top,s.w,s.h);ctx.clip();
        ctx.fillStyle='#353b42';ctx.fillRect(x,top,s.w,h);
        ctx.strokeStyle='#79838e';ctx.lineWidth=1;
        for(let sy=top+4;sy<top+h;sy+=5){ctx.beginPath();ctx.moveTo(x+1,sy);ctx.lineTo(x+s.w-1,sy);ctx.stroke();}
        ctx.fillStyle='#a1aab3';ctx.fillRect(x,top+h-2.5,s.w,2.5);
        ctx.fillStyle='#242930';ctx.fillRect(x,top,1.6,h);ctx.fillRect(x+s.w-1.6,top,1.6,h);
        ctx.restore();
      }
      if(spec.doorLight&&t>0.7){
        const d=spec.doorLight;ctx.save();ctx.globalAlpha=Math.min(1,(t-0.7)/0.3)*0.94;
        ctx.fillStyle='#081019';ctx.fillRect(bx+d.x,y+d.y,d.w,d.h);ctx.restore();
      }
    }
    forEachStreetFront((plan,segment,y)=>{paint(plan.left,segment,'L',y);paint(plan.right,segment,'R',y);});
  }

  function drawMysteriousBench() {
    if (!imgMystery.ready || !mystery.visible(view.distance)) return;
    if (state==='menu' || state==='intro' || state==='intro_transition') return;
    const foot=mystery.footAt(view.distance), height=mysterySpec.height;
    const width=height*mysterySpec.frameWidth/mysterySpec.frameHeight;
    const frame=mystery.frame(), scale=height/mysterySpec.frameHeight;
    // Register the bench feet rather than the changing umbrella silhouette.
    const x=mysterySpec.pivotX-mysterySpec.anchorX[frame]*scale;
    const y=foot-mysterySpec.anchorY[frame]*scale;
    ctx.save();
    // A restrained light pool keeps the dark hood legible in the storm.
    ctx.globalAlpha=0.18;
    ctx.drawImage(nightGlow, x-12, foot-height-8, width+24, height+20);
    ctx.globalAlpha=1;
    ctx.drawImage(imgMystery, (frame%4)*mysterySpec.frameWidth,
      Math.floor(frame/4)*mysterySpec.frameHeight, mysterySpec.frameWidth, mysterySpec.frameHeight,
      x, y, width, height);
    ctx.restore();
  }

  function render(dt,cutscenePlate=false){
    if(state==='intro')drawIntroAvatar();
    ctx.setTransform(K,0,0,K,0,0);ctx.save();
    crashScene.camera();
    // At near>=500 the existing terrain provider covers all 640 rows opaquely.
    // Avoid drawing (and lazily caching) the entire hidden street underneath it.
    const bridgeCoversWorld=bridge.visible()&&bridge.nearAt(view.distance)>=500;
    if(!bridgeCoversWorld&&!wilderness.covers(view.distance)){
      drawHighStreet();drawPavements();drawRoad();
      pigeons.draw();
      if (nightOn) {
        drawNightAmbient();
        drawNightRoadLight();
        drawNightShopWindows();
      }
      drawStormWindowLift();
      drawStreetLight();
      drawKeepersAboveWindowLighting();
      drawShopShutters();
      if(!cutscenePlate&&cutscenes.worldActorOpacity()>0){ctx.save();ctx.globalAlpha*=cutscenes.worldActorOpacity();drawMysteriousBench();ctx.restore();}
      drawRainSplashes();
    }
    if(bridge.visible()&&!wilderness.covers(view.distance)){const n=bridge.nearAt(view.distance);bridgePaint.drawWater(ctx,n,view.clock);bridgePaint.drawLower(ctx,n);drawCandidate('under-water');bridgePaint.drawWaterOcclusion?.(ctx,n,view.clock);bridgePaint.drawDeck(ctx,n);drawCandidate('deck');}

    wilderness.drawGround(ctx,view.distance,view.clock);drawCandidate('ground');wilderness.drawDecor(ctx,view.distance,view.clock,false);drawCandidate('rear');

    if (state === 'intro_transition' && window.GaryIntroTransition) window.GaryIntroTransition.draw(ctx);
    if(state!=='menu'&&state!=='intro'&&state!=='intro_transition'){
      for(let i=objs.length-1;i>=0;i--)if(!objs[i].d)drawObj(objs[i]);
      if(!cutscenePlate)fox.draw(ctx,view.distance,view.alpha,view.clock);
      if(!cutscenePlate&&cutscenes.worldActorOpacity()>0){ctx.save();ctx.globalAlpha*=cutscenes.worldActorOpacity();drawPlayer();ctx.restore();}
      for(const f of fx){
        const k=f.t/f.life;
        const pop=f.pop?1.25-k*0.25:1;
        ctx.save();ctx.globalAlpha=1-k;
        ctx.translate(f.x,f.y-16-k*28);ctx.scale(pop,pop);
        txt(f.txt,0,0,16,f.col||'#fff','center');
        ctx.restore();

      }
      if(review>0 && state==='play'){
        txt('Proper. x'+reviewMul, lx(view.lane), PLAYER_Y+22, 11, (TIERS[tierOf(score)]||TIERS[0]).c, 'center');
      }
    }
    wilderness.drawDecor(ctx,view.distance,view.clock,true);
    if(bridge.visible()&&!wilderness.covers(view.distance))bridgePaint.drawForeground(ctx,bridge.nearAt(view.distance));
    drawCandidate('front');
    drawRainStreaks();
    ctx.restore();drawVignette();
    if (nightOn) drawNightVignette();

    if(state!=='menu'&&state!=='intro'&&state!=='intro_transition'){
      if(!state.startsWith('crash') && state!=='cutscene'){drawHud();drawCap();if(bridge.quiet()){ctx.save();ctx.fillStyle="rgba(24,36,31,.92)";ctx.fillRect(35,109,290,43);txt(bridge.warning()?"NARROW BRIDGE AHEAD":"THE FORGOTTEN BRIDGE",180,127,12,"#e6d2ab","center");txt(bridge.warning()?"Keep centre · Gary will follow the path":"Centre path · Stream below",180,144,10,"#c5cfba","center");ctx.restore();}}
      crashScene.screen();
    }
    if(/(?:\?|&)debug=1(?:&|$)/.test(location.search)){ctx.save();ctx.setTransform(K,0,0,K,0,0);ctx.font="700 11px Arial";ctx.fillStyle="#ffe600";ctx.fillText("Seed: "+director.seed+" Level: "+director.state.level,10,15);ctx.restore();}
    drawDiagnostics();
  }

  /* Fixed simulation and interpolated presentation. Collision always reads the
     authoritative lane/distance, never this view or a sprite silhouette. */
  const previous = {lane:1,distance:0,clock:0,lean:0,sideTime:SIDE_ANIM_SECONDS,sideDir:0};
  const view = {lane:1,distance:0,scrollY:0,clock:0,lean:0,sideTime:SIDE_ANIM_SECONDS,alpha:1};
  function rememberPositions() {
    pigeons.remember();
    previous.lane=lane; previous.distance=distance; previous.clock=clock;
    previous.lean=laneLean; previous.sideTime=sideAnimTime; previous.sideDir=sideAnimDir;
    for (const o of objs) o.previousY=o.y;
    for (const o of stars) { o.previousX=o.x; o.previousY=o.y; }
    for (const o of streaks) { o.previousX=o.x; o.previousY=o.y; }
    for (const o of splashes) o.previousY=o.y;
  }
  function prepareView(alpha) {
    view.alpha=state==='play' || state.startsWith('crash') ? alpha : 1;
    view.lane=lerp(previous.lane,lane,view.alpha);
    view.distance=view.scrollY=lerp(previous.distance,distance,view.alpha);
    view.clock=lerp(previous.clock,clock,view.alpha);
    view.lean=lerp(previous.lean,laneLean,view.alpha);
    view.sideTime=lerp(previous.sideTime,sideAnimTime,view.alpha);
  }
  const livingStar = s => s.life > 0;
  const livingEffect = e => e.t < e.life;
  function livingItem(object) {
    if (!object.cleared && !object.d && isHazard(object.t) && object.y > PLAYER_Y + 36) {
      object.cleared=1; performance.hazardsPassed++;
    }
    return !object.d && object.y < H + 60;
  }
  function touchesPlayer(object, definition) {
    const hazard = definition.kind==='hazard';
    // Food has a generous pickup sensor. Hazards use separate, forgiving
    // ground footprints authored in game-data.js, independent of animation.
    const span = hazard ? (definition.laneSpan||1) : 1;
    const centreX = lx(object.l)+(span-1)*LANE_WIDTH*0.5;
    const halfWidth = hazard ? PLAYER_CONTACT.halfWidth + definition.contact.halfWidth
      : definition.collision.laneRadius * LANE_WIDTH;
    const halfDepth = hazard ? PLAYER_CONTACT.halfDepth + definition.contact.halfDepth
      : definition.collision.verticalRadius;
    return sweptContact(centreX-lx(previous.lane), object.previousY-PLAYER_Y,
      centreX-lx(lane), object.y-PLAYER_Y, halfWidth, halfDepth);
  }
  let pausedFrom = null;
  const idleUpdate = dt => setRainVolume(0,dt);
  const paint = () => render();
  function updateCrash(dt) {
    crashT+=dt; updateRain(dt,false);
    if(crashScene.update(dt))endGame();
  }
  const handlers = {
    menu: {next:['intro'],update:idleUpdate,render:paint,
      enter:()=>{$('menu').classList.add('show');},exit:()=>{$('menu').classList.remove('show');}},
    intro: {next:['intro_transition','play','paused'],update:updateIntroAnimation,render:paint,
      enter:()=>{$('introOverlay').style.visibility='visible';$('introOverlay').classList.add('show');},
      exit:()=>{$('introOverlay').classList.remove('show');}},
    intro_transition: {next:['play','paused'],render:paint,update:dt=>{
      if (!window.GaryIntroTransition || window.GaryIntroTransition.update(dt)) {
        transition('play'); musicTo(MUSIC_VOL,2);
      }
    }},
    play: {next:['crash_m','crash_fork','paused','cutscene'],update:updatePlay,render:paint,
      enter:()=>{$('pauseBtn').hidden=false;window.GaryFoodCatalogue?.setPlaying?.(true);},
      exit:()=>{$('pauseBtn').hidden=true;window.GaryFoodCatalogue?.setPlaying?.(false);}},
    cutscene: {next:['play','paused'],render:paint,enter:()=>{cutscenes.enter();musicTo(.025,.5);},exit:()=>cutscenes.pause(),update:dt=>{setRainVolume(rainMix,dt);cutscenes.update(dt);}},
    crash_m: {next:['over','paused'],update:updateCrash,render:paint},
    crash_fork: {next:['over','paused'],update:updateCrash,render:paint},
    over: {next:['menu'],update:idleUpdate,render:paint,
      enter:()=>{$('over').classList.add('show');},exit:()=>{$('over').classList.remove('show');}},
    paused: {next:['intro','intro_transition','play','cutscene','crash_m','crash_fork'],update:idleUpdate,render:()=>{},
      enter:()=>{$('pauseOverlay').classList.add('show');},exit:()=>{$('pauseOverlay').classList.remove('show');}}
  };
  function transition(next) {
    if (next===state || !handlers[next] || !handlers[state].next.includes(next)) return false;
    handlers[state].exit?.(); state=next; handlers[state].enter?.();
    rememberPositions();
    return true;
  }
  function fixedUpdate(dt) {
    rememberPositions();
    handlers[state].update(dt);
  }
  function resume() {
    if (state!=='paused' || document.hidden || !pausedFrom) return;
    const next=pausedFrom; pausedFrom=null;
    simulation.reset(); transition(next);
    if (audioCtx?.state==='suspended') audioCtx.resume().catch(()=>{});
    if (musicOn) music.play().catch(()=>{});
    if(next.startsWith('crash'))crashScene.resume();
    if (next==='intro') {
      const attempt=introAttempt;
      garyAudio.play().catch(()=>{
        clearTimeout(introFallbackTimer);
        introFallbackTimer=setTimeout(()=>{
          if (state==='intro' && attempt===introAttempt) startGameplay();
        },2500);
      });
    }
  }
  $('pauseBtn').addEventListener('click',suspend);
  $('resumeBtn').addEventListener('click',resume);
  if (/(?:\?|&)debug=1(?:&|$)/.test(location.search)) {
    window.GaryBridgePreview=Object.freeze({
      start:(position='approach')=>{
        if(!startupReady)return false;
        if(state==='paused')resume();
        if(state.startsWith('crash'))transition('over');
        if(state==='over')transition('menu');
        if(state==='cutscene')transition('play');
        reset();$('menu').classList.remove('show');$('introOverlay').classList.remove('show');
        if(state==='menu')transition('intro');
        if(state==='intro')transition('intro_transition');
        if(state==='intro_transition'){window.GaryIntroTransition?.cancel();transition('play');}
        if(state!=='play')return false;
        distance=scrollY=20000;nightOn=true;nightMix=rainMix=shutterMix=1;rainSaid=true;playTime=60;
        visualClearFrom=0;
        bridge.update(1/60,{distance,foxFinished:true,hazardsClear:true});
        const n={approach:210,enter:560,middle:850,exit:1210}[position]??210;
        distance=scrollY=bridge.snapshot().anchor+n;
        bridge.update(1/60,{distance,foxFinished:true,hazardsClear:true});
        rememberPositions();prepareView(1);render();return true;
      },
      artwork:(pack,images={})=>{
        if(!bridgePreviewSession)throw Error('Artwork candidates require isolated bridge preview');
        if(pack===null){bridgePaint=legacyBridgePaint;}
        else{const candidate=window.GaryBridgeArt.create({makeCanvas:()=>document.createElement('canvas'),pack,images,environment:legacyBridgePaint,cacheScale:pack.candidate.structureRevision==='supplied-rounded-arcade-v3'?1:2});bridgePaint=candidate;}
        prepareView(1);render();return bridgePaint===legacyBridgePaint?'legacy':bridgePaint.mode;
      },
      artworkMode:()=>bridgePaint===legacyBridgePaint?'legacy':bridgePaint.mode,
      snapshot:()=>bridge.snapshot(),pause:suspend,
      freeze:()=>{bridgePreviewFrozen=true;simulation.reset();},
      resume:()=>{bridgePreviewFrozen=false;simulation.reset();resume();},
      reset:()=>{if(state==='paused')resume();window.GaryBridgePreview.start('approach');}
    });
    window.GaryWildernessPreview=Object.freeze({
      start:(viewName='reveal')=>{
        if(!bridgePreviewSession)return false;
        if(!window.GaryBridgePreview.start('exit'))return false;
        const offsets={bridge:-90,reveal:2400,dense:5600,obstacles:6200,rustle:3400,ruins:10170};
        const origin=bridge.snapshot().anchor+770;wilderness.begin(origin);distance=scrollY=origin+546+(offsets[viewName]??2400);
        bridge.update(1/60,{distance,foxFinished:true,hazardsClear:true});
        wilderness.update(1/60,{distance,bridge:bridge.snapshot(),hazardsClear:true,blocked:false});
        rainMix=wilderness.weather();nightMix=1-.86*wilderness.warmth();nightOn=true;
        if(viewName==='obstacles'){spawnWildernessItem('fallen_branch_small_01',0,470);spawnWildernessItem('boulder_cluster_hazard_01',2,350);spawnWildernessItem('thorn_bramble_hazard_01',0,210);}
        if(viewName==='rustle')wildernessEncounters.preview('cue',distance);
        rememberPositions();prepareView(1);render();return true;
      },snapshot:()=>wilderness.snapshot(),pause:()=>window.GaryBridgePreview.pause(),freeze:()=>window.GaryBridgePreview.freeze(),resume:()=>window.GaryBridgePreview.resume()
    });
    // No runtime candidate API exists outside ?debug=1&bridgepreview=1.
    if(bridgePreviewSession){
      const passes=new Set(['ground','rear','under-water','deck','front']);
      window.GaryAssetPreview=Object.freeze({
        ready:()=>startupReady,
        startScene:(scene='bridge-middle')=>{
          let ok=false;
          if(scene==='street-day'||scene==='street-rain'){
            ok=window.GaryBridgePreview.start('approach');
            if(!ok)return false;
            bridge.reset();wilderness.reset(director.seed);
            distance=scrollY=0;nightOn=scene==='street-rain';
            nightMix=rainMix=shutterMix=nightOn?1:0;
            rainSaid=nightOn;visualClearFrom=Infinity;
            rememberPositions();prepareView(1);render();
          }else if(scene==='bridge-approach'||scene==='bridge-enter'||scene==='bridge-middle'||scene==='bridge-exit'){
            ok=window.GaryBridgePreview.start(scene.slice(7));
          }else if(scene==='wilderness-reveal'||scene==='wilderness-dense'){
            ok=window.GaryWildernessPreview.start(scene.slice(11));
          }else throw Error('Unknown asset review scene');
          if(ok)window.GaryBridgePreview.freeze();
          return ok;
        },
        set:({image,draw,pass='rear',scrollWithWorld=true,opacity=1})=>{
          const sourceW=image?.naturalWidth||image?.width;
          const sourceH=image?.naturalHeight||image?.height;
          if(!(sourceW>0&&sourceH>0))throw Error('Decoded artwork required');
          if(!draw||![draw.x,draw.y,draw.width,draw.height,opacity].every(Number.isFinite)||
            draw.width<=0||draw.height<=0||draw.width>360||draw.height>1000||
            !(opacity>0&&opacity<=1)||!passes.has(pass))
            throw Error('Invalid preview geometry or render pass');
          candidateAsset={image,x:draw.x,y:draw.y,width:draw.width,height:draw.height,
            opacity,pass,scrollWithWorld:!!scrollWithWorld,placedDistance:view.distance};
          prepareView(1);render();
          return {pass,registered:false,collision:'NOT_DEFINED',worldDepth:candidateAsset.placedDistance};
        },
        clear:()=>{candidateAsset=null;prepareView(1);render();},
        // Entire biome-pack candidates render together, each in its own actual
        // world depth pass. This is a review-only, bounded ephemeral collection.
        setPack:(assets)=>{
          if(!Array.isArray(assets)||assets.length>20)throw Error('Maximum 20 biome candidates');
          const next=assets.map((entry,i)=>{
            const {image,draw,pass='rear',opacity=1,scrollWithWorld=true}=entry||{};
            const width=image?.naturalWidth||image?.width,height=image?.naturalHeight||image?.height;
            if(!(width>0&&height>0)||!draw||![draw.x,draw.y,draw.width,draw.height,opacity].every(Number.isFinite)||
               draw.width<=0||draw.height<=0||draw.width>360||draw.height>1000||
               Math.abs(draw.x)>1000||Math.abs(draw.y)>10000||
               !(opacity>0&&opacity<=1)||!passes.has(pass))throw Error('Invalid biome candidate '+i);
            return {image,x:draw.x,y:draw.y,width:draw.width,height:draw.height,
              opacity,pass,scrollWithWorld:!!scrollWithWorld,placedDistance:view.distance};
          });
          candidateAsset=null;biomeCandidates=next;prepareView(1);render();
          return {count:next.length,registered:false,collision:'NOT_DEFINED'};
        },
        clearPack:()=>{biomeCandidates=[];prepareView(1);render();},
        packSnapshot:()=>biomeCandidates.map(a=>({pass:a.pass,x:a.x,y:a.y,width:a.width,height:a.height,registered:false})),
        snapshot:()=>candidateAsset?{pass:candidateAsset.pass,
          draw:{x:candidateAsset.x,y:candidateAsset.y,width:candidateAsset.width,height:candidateAsset.height},
          scrollWithWorld:candidateAsset.scrollWithWorld,registered:false}:null
      });
    }
    window.GaryRuntimeStats=Object.freeze({snapshot:()=>({state,distance,lane,target,
      ticks:simulation.ticks,droppedSeconds:simulation.droppedSeconds,
      items:objs.length,itemPeak:itemPool.peak,itemMisses:itemPool.misses,
      effects:fx.length,effectPeak:effectPool.peak,stars:stars.length,starPeak:starPool.peak,
      cacheEntries:rasterCacheEntries,errors:loadErrorLog.slice()})});
  }

  /* -------------------------------------------------------------------------- */
  /* Input and lifecycle                                                        */
  /* -------------------------------------------------------------------------- */

  addEventListener('keydown',e=>{
    if(e.repeat)return;
    const k=e.key.toLowerCase();
    if(k==='arrowleft'||k==='a')move(-1);
    else if(k==='arrowright'||k==='d')move(1);
    else return;
    if(state==='play')e.preventDefault();
  });

  cv.addEventListener('pointerdown',e=>{
    if(state!=='play')return;
    const r=cv.getBoundingClientRect();
    move(e.clientX-r.left<r.width/2?-1:1);
    e.preventDefault();
  });

  $('startBtn').addEventListener('click', e => {
    if (state !== 'menu') return;
    if (!startupReady) { prepareStartup(); return; }
    e.currentTarget.blur();
    initAudio();
    reset();
    $('menu').classList.remove('show');
    transition('intro');
    const attempt = ++introAttempt;
    $('introOverlay').style.visibility = 'visible';
    $('introOverlay').classList.add('show');
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    garyAudio.currentTime = 0;
    garyAudio.onended = () => {
      if (attempt === introAttempt) startGameplay();
    };
    const playPromise = garyAudio.play();
    startMusic();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        if (attempt !== introAttempt || state !== 'intro') return;
        introFallbackTimer = setTimeout(() => {
          if (attempt === introAttempt && state === 'intro') startGameplay();
        }, 2500);
      });
    }
  });

  $('skipIntroBtn').addEventListener('click',startGameplay);

  $('againBtn').addEventListener('click',e=>{
    if (state !== 'over') return;
    e.currentTarget.blur(); reset(); transition('menu');
    stopMusic();
  });

  function resize(){
    // Design size stays 360x640. The phone picture is 3x that, 1080x1920, when the screen can take it.
    const w=Math.max(1,stage.clientWidth),dpr=Math.min(window.devicePixelRatio||1,3);
    rasterCaches.clear(); rasterCacheEntries=0;
    cv.width=Math.round(w*dpr);cv.height=Math.round(w*16/9*dpr);K=cv.width/W;
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality='high';
    if(bridgePreviewFrozen){prepareView(1);render();}
  }

  function loop(ts) {
    if (!document.hidden && startupReady && !bridgePreviewFrozen) {
      const alpha = simulation.frame(ts, fixedUpdate);
      prepareView(alpha);
      handlers[state].render();
    } else simulation.reset();
    requestAnimationFrame(loop);
  }

  addEventListener('resize',resize);
  resize();
  rememberPositions(); prepareView(1);
  prepareStartup();
  requestAnimationFrame(loop);
})();

