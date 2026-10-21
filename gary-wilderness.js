/* The Other Side: world-registered supplied art, seeded distribution and fixed-size caches. */
(function(root){'use strict';
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
 function hash(n,seed=1){let v=(n^seed)>>>0;v=Math.imul(v^(v>>>16),0x7feb352d);v=Math.imul(v^(v>>>15),0x846ca68b);return (v^(v>>>16))>>>0;}
 const stageAt=z=>z<1500?0:z<4000?1:z<8500?2:3;
 const HAZARDS=Object.freeze(['fallen_branch_small_01','boulder_cluster_hazard_01','thorn_bramble_hazard_01']);
 function create({data,images,makeCanvas,encounters,seed=1}){
  let origin=null,runSeed=seed,progress=-546,weather=1,ready=false,atlas=null;
  const sprites={},surfaces=[],ground=[],entrance=[];
  const grasses=Object.keys(data.assets).filter(k=>data.assets[k].role==='verge');
  const props=Object.keys(data.assets).filter(k=>k!=='fallen_log_large_01'&&data.assets[k].role==='decoration'&&!data.assets[k].path.startsWith('ruins/'));
  const ruins=Object.keys(data.assets).filter(k=>data.assets[k].path.startsWith('ruins/'));
  const decals=Object.keys(data.assets).filter(k=>data.assets[k].role==='decal');
  const road=Object.keys(data.assets).filter(k=>data.assets[k].role==='surface');
  const canvas=(w,h)=>{const c=makeCanvas();c.width=w;c.height=h;return c;};
  function reset(value=seed){origin=null;progress=-546;weather=1;runSeed=value>>>0;encounters.reset(runSeed^0x783912);}
  async function prepare(){
   if(ready)return;
   atlas=canvas(1024,1024);const c=atlas.getContext('2d');let x=2,y=2,row=0;
   for(const [key,def] of Object.entries(data.assets)){
    if(def.role==='surface')continue;const w=Math.ceil(def.drawWidth),h=Math.ceil(def.drawHeight);
    if(x+w+2>1024){x=2;y+=row+4;row=0;}if(y+h+2>1024)throw Error('Wilderness atlas overflow');
    const image=images[key];if(!image?.ready)throw Error('Wilderness image not decoded: '+key);
    c.drawImage(image,x,y,w,h);
    if(def.role==='verge'){
     c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.globalCompositeOperation='destination-in';
     const foot=y+def.anchor[1]/def.height*h;const blend=c.createLinearGradient(0,foot-24,0,foot+1);blend.addColorStop(0,'#fff');blend.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=blend;c.fillRect(x,y,w,h);
     const edge=c.createLinearGradient(x,0,x+w,0);edge.addColorStop(0,'rgba(255,255,255,0)');edge.addColorStop(.22,'#fff');edge.addColorStop(.78,'#fff');edge.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=edge;c.fillRect(x,y,w,h);c.restore();
    }
    sprites[key]=Object.freeze({x,y,w,h,ax:def.anchor[0]/def.width*w,ay:def.anchor[1]/def.height*h});x+=w+4;row=Math.max(row,h);
   }
   for(let i=0;i<4;i++){
    const tile=canvas(150,512),g=tile.getContext('2d');g.fillStyle='#828878';g.fillRect(0,0,150,512);g.drawImage(images[road[0]],0,0,150,512);
    if(i>0){
     const overlay=canvas(150,512),v=overlay.getContext('2d');v.drawImage(images[road[i]],0,0,150,512);
     const fade=v.createLinearGradient(0,0,0,512);fade.addColorStop(0,'rgba(255,255,255,0)');fade.addColorStop(.18,'#fff');fade.addColorStop(.82,'#fff');fade.addColorStop(1,'rgba(255,255,255,0)');v.globalCompositeOperation='destination-in';v.fillStyle=fade;v.fillRect(0,0,150,512);g.globalAlpha=.2;g.drawImage(overlay,0,0);g.globalAlpha=1;
    }
    surfaces.push(tile);
    const floor=canvas(360,512),f=floor.getContext('2d');const grad=f.createLinearGradient(0,0,360,0);grad.addColorStop(0,['#34442e','#394c30','#32472c','#2d402d'][i]);grad.addColorStop(.5,['#4a583c','#526340','#475c37','#405335'][i]);grad.addColorStop(1,['#30452f','#3e5232','#344a2e','#2e432e'][i]);f.fillStyle=grad;f.fillRect(0,0,360,512);
    // Supplied ground decals remain in a separate verge cache, never in the road surface.
    f.save();f.beginPath();f.rect(0,0,103,512);f.rect(257,0,103,512);f.clip();
    const floorKeys=['grass_patch_small_01','leaf_scatter_decal_01','damp_grime_patch_01','leaf_litter_twigs_patch_01','loose_stones_scatter_01'];
    for(let k=0;k<20+i*12;k++){const h=hash(k,381+i*77),s=sprites[floorKeys[h%floorKeys.length]],x=(h>>>4)%360,y=(h>>>12)%512;f.globalAlpha=.26+(h%3)*.08;f.drawImage(atlas,s.x,s.y,s.w,s.h,x-s.w/2,y-s.h/2,s.w,s.h);}
    f.restore();ground.push(floor);
    await new Promise(resolve=>setTimeout(resolve,0));
   }
   // A world-registered feather lets the old banks/paving recede without a horizontal cut.
   for(const source of [ground[0],surfaces[0]]){
    const tile=canvas(source.width,512),g=tile.getContext('2d');g.drawImage(source,0,0);
    const fade=g.createLinearGradient(0,292,0,512);fade.addColorStop(0,'#fff');fade.addColorStop(1,'rgba(255,255,255,0)');g.globalCompositeOperation='destination-in';g.fillStyle=fade;g.fillRect(0,0,tile.width,512);entrance.push(tile);
   }
   ready=true;
  }
  function update(dt,w){
   if(!(dt>0))return;
   if(origin===null&&w.bridge.phase!=='dormant')origin=w.bridge.anchor+770;
   if(origin===null)return;
   progress=w.distance-origin-546;weather=1-smooth((progress-300)/2800)*.96;
   encounters.update(dt,{...w,progress,blocked:w.blocked||w.bridge.phase!=='done'});
  }
  function begin(at){origin=at;progress=-546;}
  const active=()=>origin!==null;
  function sprite(ctx,key,x,foot,sway=0){const s=sprites[key];if(!s)return;ctx.drawImage(atlas,s.x,s.y,s.w,s.h,x-s.ax+sway,foot-s.ay,s.w,s.h);}
  function drawGround(ctx,distance,clock){
   if(!ready||origin===null)return;const enter=distance-origin;if(enter<=0)return;
   ctx.save();ctx.beginPath();ctx.rect(0,0,360,Math.min(640,enter));ctx.clip();
   // Immutable 512-unit world strips: fixed number of blits, no geometry allocation.
   const first=Math.floor((enter-640)/512),last=Math.floor(enter/512);
   for(let i=first;i<=last;i++){
    const z=i*512,sy=enter-(i+1)*512,stage=stageAt(Math.max(0,z));
    ctx.drawImage(i===0?entrance[0]:ground[stage],0,sy);ctx.drawImage(i===0?entrance[1]:surfaces[hash(i,runSeed)%4],105,sy);
   }
   // Small non-damaging surface detail stays below all obstacles and pickups.
   const base=Math.floor(enter/140);
   for(let i=base+1;i>=base-6;i--){const z=i*140;if(z<0)continue;const h=hash(i,runSeed+83),y=enter-z;if(y< -80||y>720)continue;
    ctx.save();ctx.globalAlpha=.18+.16*weather;sprite(ctx,decals[h%decals.length],130+(h%3)*50,y);ctx.restore();
   }
   ctx.restore();
  }
  function drawDecor(ctx,distance,clock,foreground=false){
   if(!ready||origin===null)return;const enter=distance-origin;if(enter<=0)return;
   ctx.save();ctx.beginPath();ctx.rect(0,0,103,Math.min(640,enter));ctx.rect(257,0,103,Math.min(640,enter));ctx.clip();
   const base=Math.floor(enter/64);
   // Render far-to-near; each decoration is derived from a bounded world slot.
   for(let i=base+3;i>=base-12;i--){const z=i*64;if(z<0)continue;const y=enter-z,stage=stageAt(z);if(y< -140||y>790||(y>546)!==foreground)continue;
    for(let side=0;side<2;side++){
     const h=hash(i*2+side,runSeed),x=side?274:86;
     if(stage>0||i%3===side){
      ctx.globalAlpha=smooth(z/220);const sway=Math.sin(clock*1.15+(h%100)*.06)*.8,drift=(h%39)-19;sprite(ctx,grasses[h%grasses.length],x+(side?1:-1)*(h%13),y+drift,sway);
      if(stage>=2||stage===1&&i%2===0)sprite(ctx,grasses[(h>>>5)%grasses.length],side?332:28,y-21,-sway*.5);
     }
     ctx.globalAlpha=smooth(z/220);if(stage>=2&&i%6===side)sprite(ctx,props[(h>>>16)%props.length],side?324:35,y-9);
     if(i%3===side&&stage>=1){
      const key=(stage>=3&&i%9===side||stage>=2&&i%15===side)?ruins[(h>>>8)%ruins.length]:i%7===side?'fallen_log_large_01':props[(h>>>8)%props.length];
      ctx.fillStyle='rgba(24,36,24,.22)';ctx.beginPath();ctx.ellipse(side?311:49,y+1,27,5,0,0,7);ctx.fill();sprite(ctx,key,side?314:46,y);
     }
    }
   }
   const s=encounters.state;
   if(s.phase==='rustling'||s.phase==='recovery'){
    const foot=distance-s.depth;if((foot>546)===foreground&&foot>-100&&foot<780){const shake=s.phase==='rustling'?Math.sin(s.time*27)*3:Math.sin(s.time*13)*Math.max(0,1-s.time)*1.5;sprite(ctx,'verge_grass_tall_wet_01',s.side<0?91:269,foot,shake);}
   }
   ctx.restore();
  }
  reset(seed);
  return Object.freeze({prepare,reset,begin,update,drawGround,drawDecor,active,
   origin:()=>origin,progress:()=>progress,stage:()=>stageAt(Math.max(0,progress)),weather:()=>weather,
   warmth:()=>smooth((progress-600)/3200),quiet:encounters.quiet,
   ready:()=>ready,known:active,covers:distance=>origin!==null&&distance-origin>=860,
   hazard:(id)=>HAZARDS[hash(id,runSeed)%HAZARDS.length],
   drawHazard(ctx,key,x,y){sprite(ctx,key,x,y+14);},
   encounter:encounters,
   snapshot:()=>({origin,progress,stage:stageAt(Math.max(0,progress)),weather,ready,seed:runSeed,encounter:encounters.snapshot(),cacheCount:ready?11:0}),
   warm(ctx){if(ready){ctx.save();ctx.globalAlpha=.001;ctx.drawImage(atlas,0,0);for(const c of [...surfaces,...ground,...entrance])ctx.drawImage(c,0,0);ctx.restore();}}
  });
 }
 const api=Object.freeze({hash,stageAt,HAZARDS,create});if(typeof module==='object'&&module.exports)module.exports=api;else root.GaryWilderness=api;
})(typeof window==='object'?window:globalThis);
