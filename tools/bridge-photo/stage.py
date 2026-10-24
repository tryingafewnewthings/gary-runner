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
src=Image.open(source).convert('RGBA')
w,h=src.size
if not (w>=400 and h>=700 and abs(w/h-864/1536)<.03):
    raise SystemExit(f'Expected a portrait 9:16 source matching supplied artwork; got {w}x{h}')
# Fixed normalized crop measured from the supplied 864x1536 artwork.
left=round(w*235/864);right=round(w*629/864)
cropped=src.crop((left,0,right,h))
a=np.asarray(cropped,dtype=np.float32)
original_alpha=a[:,:,3]/255
# Preserve real PNG transparency; for an opaque image, key only near-white
# matte pixels. A rail can touch the crop edge: never assume corner transparency.
if np.mean(original_alpha<.98)>.001:
    alpha=original_alpha
    rgb=a[:,:,:3]
else:
    rgb=a[:,:,:3]
    distance=np.max(255-rgb,axis=2)
    alpha=np.clip((distance-12)/46,0,1)
    aa=alpha[:,:,None]
    rgb=np.where(aa>.08,(rgb-255*(1-aa))/np.maximum(aa,.08),rgb).clip(0,255)
rgba=np.dstack([rgb.astype('uint8'),(alpha*255).astype('uint8')])
art=Image.fromarray(rgba,'RGBA').resize((174,620),Image.Resampling.LANCZOS)
native_alpha=np.asarray(art.getchannel('A'))
opaque=float(np.mean(native_alpha>220))
clear=float(np.mean(native_alpha<24))
print(f'Bridge alpha diagnostics: opaque={opaque:.3f} transparent={clear:.3f} center={int(native_alpha[310,87])}')
if opaque<.10 or clear<.005 or int(native_alpha[310,87])<150:
    raise SystemExit('Artwork segmentation is implausible; refusing to stage image without visual inspection')
dest=root/'art/candidates/bridge/bridge-user-supplied.webp'
dest.parent.mkdir(parents=True,exist_ok=True)
art.save(dest,'WEBP',quality=77,method=6)
manifest=root/'asset-quality-manifest.json'
import json
m=json.loads(manifest.read_text())
m['assets']['art/candidates/bridge/bridge-user-supplied.webp']={'width':174,'height':620,'alpha':True}
manifest.write_text(json.dumps(m,indent=2)+'\n')
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
