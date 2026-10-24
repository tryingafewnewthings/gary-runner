#!/usr/bin/env python3
"""Stage owner-supplied bridge photo on an isolated review branch. Never modify live main."""
from pathlib import Path
from PIL import Image
import numpy as np, hashlib, shutil, sys

root=Path(__file__).resolve().parents[2]
uploads=root/'art/bridge/uploads'
sources=[p for p in uploads.iterdir() if p.suffix.lower() in ('.jpg','.jpeg','.png','.webp')]
if len(sources)!=1: raise SystemExit(f'Expected exactly one bridge photo in {uploads}, found {len(sources)}')
source=sources[0]
src=Image.open(source).convert('RGB')
w,h=src.size
if not (w>=400 and h>=700 and abs(w/h-864/1536)<.03):
    raise SystemExit(f'Expected a portrait 9:16 source matching supplied artwork; got {w}x{h}')
# Fixed normalized crop measured from the supplied 864x1536 artwork.
left=round(w*235/864);right=round(w*629/864)
cropped=src.crop((left,0,right,h))
a=np.asarray(cropped,dtype=np.float32)
d=np.max(255-a,axis=2)
alpha=np.clip((d-12)/45,0,1)
# Remove white matte from antialiased edges, preserve the painted stone/rope.
aa=alpha[:,:,None]
rgb=np.where(aa>.08,(a-255*(1-aa))/np.maximum(aa,.08),a).clip(0,255).astype('uint8')
rgba=np.dstack([rgb,(alpha*255).astype('uint8')])
art=Image.fromarray(rgba,'RGBA').resize((174,620),Image.Resampling.LANCZOS)
if art.getpixel((0,100))[3]>16 or art.getpixel((87,300))[3]<230:
    raise SystemExit('Artwork alpha test failed; upload the exact original bridge image')
dest=root/'art/bridge/user/bridge-user-supplied.webp'
dest.parent.mkdir(parents=True,exist_ok=True)
art.save(dest,'WEBP',quality=77,method=6)
def replace_once(text,old,new,label):
    if text.count(old)!=1: raise SystemExit(f'{label}: expected one anchor, got {text.count(old)}')
    return text.replace(old,new,1)
idx=root/'index.html';run=root/'gary-difficulty-runtime.js'
a=idx.read_text();b=run.read_text()
a=replace_once(a,'<script src="gary-bridge-art.js?v=supplied3"></script>',
    '<script src="gary-bridge-art.js?v=supplied3"></script>\n<script src="gary-bridge-user.js?v=user-bridge-20261024-v1"></script>','index')
a=replace_once(a,'gary-difficulty-runtime.js?v=bridgepaint-20261022-v1',
    'gary-difficulty-runtime.js?v=user-bridge-20261024-v1','cache')
b=replace_once(b,'  let bridgePaint=legacyBridgePaint;',
'''  let bridgePaint=legacyBridgePaint;
  const userBridge=window.GaryUserBridge?.create({makeCanvas:()=>document.createElement('canvas'),ImageType:Image,environment:legacyBridgePaint})||null;
  const useUserBridge=()=>!!userBridge?.ready()&&(!bridgePreviewSession||bridgePaint===legacyBridgePaint);
  if(bridgePreviewSession)window.GaryUserBridgeStatus=Object.freeze({ready:()=>!!userBridge?.ready(),reason:()=>userBridge?.reason()||'unavailable'});''','init')
old="""    if(bridge.visible()&&!wilderness.covers(view.distance)){const n=bridge.nearAt(view.distance);bridgePaint.drawWater(ctx,n,view.clock);bridgePaint.drawLower(ctx,n);paintedBridge?.drawLower(ctx,n);drawCandidate('under-water');bridgePaint.drawWaterOcclusion?.(ctx,n,view.clock);bridgePaint.drawDeck(ctx,n);paintedBridge?.drawDeck(ctx,n);drawCandidate('deck');}

    wilderness.drawGround(ctx,view.distance,view.clock);if(bridge.visible()&&!wilderness.covers(view.distance))paintedBridge?.drawUnder(ctx,bridge.nearAt(view.distance));if(!streetCandidateGround)drawCandidate('ground');wilderness.drawDecor(ctx,view.distance,view.clock,false);drawCandidate('rear');"""
new="""    if(bridge.visible()&&!wilderness.covers(view.distance)&&!useUserBridge()){const n=bridge.nearAt(view.distance);bridgePaint.drawWater(ctx,n,view.clock);bridgePaint.drawLower(ctx,n);paintedBridge?.drawLower(ctx,n);drawCandidate('under-water');bridgePaint.drawWaterOcclusion?.(ctx,n,view.clock);bridgePaint.drawDeck(ctx,n);paintedBridge?.drawDeck(ctx,n);drawCandidate('deck');}

    wilderness.drawGround(ctx,view.distance,view.clock);
    if(bridge.visible()&&!wilderness.covers(view.distance)){
      if(useUserBridge()){const n=bridge.nearAt(view.distance);userBridge.drawWater(ctx,n,view.clock);drawCandidate('under-water');userBridge.drawDeck(ctx,n);drawCandidate('deck');}
      else paintedBridge?.drawUnder(ctx,bridge.nearAt(view.distance));
    }
    if(!streetCandidateGround)drawCandidate('ground');wilderness.drawDecor(ctx,view.distance,view.clock,false);drawCandidate('rear');"""
b=replace_once(b,old,new,'bridge layers')
b=replace_once(b,"if(bridge.visible()&&!wilderness.covers(view.distance)){const n=bridge.nearAt(view.distance);bridgePaint.drawForeground(ctx,n);paintedBridge?.drawFront(ctx,n);}",
"if(bridge.visible()&&!wilderness.covers(view.distance)){const n=bridge.nearAt(view.distance);if(useUserBridge())userBridge.drawFront(ctx,n);else{bridgePaint.drawForeground(ctx,n);paintedBridge?.drawFront(ctx,n);}}",'foreground')
shutil.copyfile(root/'tools/bridge-photo/gary-bridge-user.js',root/'gary-bridge-user.js')
idx.write_text(a);run.write_text(b)
print('STAGED owner photo',source.name,src.size,'->',dest,'sha256',hashlib.sha256(dest.read_bytes()).hexdigest())
print('Gameplay logic, fox, collisions, foods and fallback unchanged')
