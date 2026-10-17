// DOM + native Canvas harness. This exercises the actual engine, not browser layout or iPhone performance.
const {JSDOM}=require('jsdom');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
module.exports=async function boot(saved={},preview=false){
 const root=path.join(__dirname,'../..'),dom=new JSDOM(fs.readFileSync(path.join(root,preview?'gary-last-orders-preview.html':'index.html'),'utf8'),{url:'https://game.test/'+(preview?'gary-last-orders-preview.html':'index.html')+'?debug=1',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,context=dom.getInternalVMContext(),errors=[],pending=[];const native=new WeakMap();
 const store=new Map(Object.entries(saved));
 Object.defineProperty(w,'localStorage',{value:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}});
 Object.defineProperty(w.document.getElementById('stage'),'clientWidth',{value:360});
 Object.defineProperty(w,'devicePixelRatio',{value:1});
 w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};
 w.fetch=async()=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(path.join(root,'gary-game-config.json'),'utf8')),arrayBuffer:async()=>new ArrayBuffer(0)});
 w.matchMedia=()=>({matches:false});
 w.HTMLMediaElement.prototype.play=function(){return Promise.resolve()};w.HTMLMediaElement.prototype.pause=function(){};
 function backing(element){let c=native.get(element);if(!c){c=createCanvas(element.width,element.height);native.set(element,c);}if(c.width!==element.width)c.width=element.width;if(c.height!==element.height)c.height=element.height;return c;}
 w.HTMLCanvasElement.prototype.getContext=function(){const element=this,ctx=backing(element).getContext('2d');return new Proxy(ctx,{get(target,key){const value=target[key];if(typeof value!=='function')return value;return(...args)=>{backing(element);if(key==='drawImage'){args[0]=args[0].nativeImage||((args[0] instanceof w.HTMLCanvasElement)?backing(args[0]):args[0]);}return target[key](...args);}},set(target,key,value){target[key]=value;return true;}})};
 class Artwork extends w.EventTarget {
  constructor(){super();this.complete=false;this.naturalWidth=0;this.naturalHeight=0;this._src='';this.nativeImage=null;}
  get src(){return this._src;}
  set src(value){this._src=new URL(value,'https://game.test/').href;this.complete=false;
   const file=path.join(root,new URL(this._src).pathname.slice(1));
   const work=loadImage(file).then(img=>{this.nativeImage=img;this.complete=true;this.naturalWidth=img.width;this.naturalHeight=img.height;this.onload?.();this.dispatchEvent(new w.Event('load'));}).catch(e=>{this.complete=true;errors.push(file+': '+e.message);this.onerror?.();this.dispatchEvent(new w.Event('error'));});pending.push(work);
  }
  decode(){return Promise.resolve();}
 }
 w.Image=Artwork;
 for(const file of ['game-data.js','game-core.js','food-catalogue.js','gary-intro-transition.js','gary-crash-config.js','gary-street-mystery.js',...(!preview?['gary-road-evolution.js']:[]),'game-runtime.js']){
  const actual=preview?(file==='game-runtime.js'?'game-last-orders-preview.js':file==='food-catalogue.js'?'food-last-orders-preview.js':file):file;
  let text=fs.readFileSync(path.join(root,actual),'utf8');
  if(file==='game-runtime.js')text=text.replace(/\}\)\(\);\s*$/,`window.__test={
   ready:()=>startupReady,clear:()=>itemPool.clear(),advance:fixedUpdate,render:()=>{prepareView(1);render();},reset,move,suspend,resume,
   snapshot:()=>({state,distance,lane,score,speed:shownSpeed,rain:rainMix,mystery:mystery.snapshot(),errors:loadErrorLog.slice(),objects:objs.length}),
   ending:()=>{distance=STREET.length*STREET_SEGMENT_H+6500;nightMix=rainMix=shutterMix=1;nightOn=true;nightHeld=30;itemPool.clear();roadQueue=[];acc=0;rememberPositions();},
   pickup:kind=>{const o={t:kind,l:1,y:540,dare:0};collect(o);},
   hazard:()=>{const o=itemPool.acquire();Object.assign(o,{t:'fork',l:0,y:-50,previousY:-50,id:uid++,d:0,dare:0,near:0,refused:0,cleared:0});},
   skipEntrance:()=>{if(state==='intro_transition'){window.GaryIntroTransition.cancel();transition('play');}},
   bench:()=>({foot:mystery.footAt(distance),frame:mystery.frame()}),
   caches:()=>rasterCacheEntries
  };})();`);
  vm.runInContext(text,context,{filename:file});
 }
 await Promise.all(pending);await new Promise(r=>setImmediate(r));
 for(let i=0;i<200&&!w.__test.ready();i++)await new Promise(r=>setTimeout(r,5));
 if(errors.length)throw Error(errors.join('\n'));
 if(!w.__test.ready())throw Error('Startup failed: '+w.document.getElementById('startupStatus').textContent);
 return {w,store,dom,canvas:()=>backing(w.document.getElementById('c')),close:()=>{w.dispatchEvent(new w.Event('pagehide'));dom.window.close();}};
};
