"""Extract supplied pixels only. Requires Pillow/numpy/scipy; not runtime dependencies."""
from PIL import Image
from scipy.ndimage import label, distance_transform_edt
import numpy as np, json, zipfile, hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]; out=root/'art/wilderness'; archive=root/'GaryEats_Wilderness_Asset_Pack_DRAFT01.zip'
z=zipfile.ZipFile(archive); prefix='GaryEats_Wilderness_Asset_Pack/'
manifest=json.loads(z.read(prefix+'manifest.json'))
report={'archiveSha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'method':'Measured alpha components, not declared grids; RGB unchanged. Alpha <64 removed from generated atlas haze; nearest-component ownership isolates overlapping nominal cells.','assets':{},'excluded':[]}
def save(name,im,source,rect=None,role='decoration'):
 p=out/name;p.parent.mkdir(parents=True,exist_ok=True);im.save(p)
 a=np.array(im.convert('RGBA'))[:,:,3]; yy,xx=np.where(a>0)
 report['assets'][str(name)]={'source':source,'sourceRect':rect,'width':im.width,'height':im.height,'alphaBounds':[int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)],'anchor':[im.width/2,int(yy.max()+1)],'role':role,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
for f in manifest['files']:
 path=f['path']
 if f['type']=='sprite':
  import io
  save(path,Image.open(io.BytesIO(z.read(prefix+path))).convert('RGBA'),path,role='verge')
for folder in ['props','hazards','ruins','decals']:
 import io
 path=next(k for k in manifest['atlas_cell_names'] if k.startswith(folder+'/'));im=Image.open(io.BytesIO(z.read(prefix+path))).convert('RGBA'); a=np.array(im)
 labels,n=label(a[:,:,3]>128);sizes=np.bincount(labels.ravel());major=[i for i in range(1,n+1) if sizes[i]>20000]
 # Decal leaf/stone scatters are disconnected: extract audited safe ROIs instead.
 if folder=='decals':
  rects=[(0,0,515,510),(520,60,855,480),(865,60,1160,490),(1180,55,1536,490),(0,515,500,1024),(500,515,850,1024),(850,515,1190,1024),(1190,515,1536,1024)]
  for entry,rect in zip(manifest['atlas_cell_names'][path],rects):
   name=entry.split(' ',1)[1];crop=im.crop(rect);b=np.array(crop);b[b[:,:,3]<64]=0;crop=Image.fromarray(b);bbox=crop.getbbox();crop=crop.crop(bbox);pad=Image.new('RGBA',(crop.width+16,crop.height+16));pad.alpha_composite(crop,(8,8));save(folder+'/'+name+'.png',pad,path,list(rect),'decal')
  continue
 if len(major)!=len(manifest['atlas_cell_names'][path]):raise RuntimeError((path,len(major)))
 centers={i:np.array(np.where(labels==i)).mean(axis=1) for i in major}
 major.sort(key=lambda i:(int(centers[i][0]>500),centers[i][1]))
 seeds=np.where(np.isin(labels,major),labels,0); _,indices=distance_transform_edt(seeds==0,return_indices=True);owner=seeds[tuple(indices)]
 for entry,component in zip(manifest['atlas_cell_names'][path],major):
  name=entry.split(' ',1)[1];keep=(owner==component)&(a[:,:,3]>=64);yy,xx=np.where(keep);rect=[int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)]
  b=a.copy();b[~keep]=0;crop=Image.fromarray(b).crop(rect);pad=Image.new('RGBA',(crop.width+16,crop.height+16));pad.alpha_composite(crop,(8,8))
  role='hazard' if name in ['fallen_branch_small_01','boulder_cluster_hazard_01','thorn_bramble_hazard_01'] else 'decal' if name in ['muddy_ruts_hazard_01','puddle_hazard_large_01'] else 'decoration'
  save(folder+'/'+name+'.png',pad,path,rect,role)
# Base is supplied independently; its translucent edges are composited over the road cache.
import io
path='road/road_surface_wilderness_base_300x1024.png';save(path,Image.open(io.BytesIO(z.read(prefix+path))).convert('RGBA'),path,role='surface')
path='road/road_tile_variants_wet_wilderness_atlas.png';im=Image.open(io.BytesIO(z.read(prefix+path))).convert('RGBA')
for i,rect in enumerate([(285,36,533,984),(635,36,877,984),(976,36,1241,984)]):save('road/road_surface_variant_%02d.png'%(i+1),im.crop(rect),path,list(rect),'surface')
report['excluded']=[{'source':'reference/*','reason':'Concept boards, mockups and QA images are references, not runtime artwork.'},{'source':'verge/verge_grass_clumps_atlas_3x2_256x512.png','reason':'Redundant atlas; all six separately registered sprites used.'},{'source':'road/road_tile_variants_wet_wilderness_atlas.png: outer strips','reason':'Narrow gravel edge strips omitted to preserve the fixed 150-unit road footprint.'}]
(out/'registration.json').write_text(json.dumps(report,indent=2)+'\n')
print('Extracted',len(report['assets']),'registered supplied-pixel assets')
