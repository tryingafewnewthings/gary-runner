'use strict';
/*
 * Gary Eats visual release gate. New production artwork must have a traceable
 * reference/geometry/in-engine visual evidence record. Pixel validators cannot
 * decide artistic quality; the ledger deliberately does not claim that.
 * Existing files are grandfathered only until changed; all newly added OR modified\n * production PNG/WebP images require updated evidence.
 */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const parse=dir=>JSON.parse(fs.readFileSync(path.join(dir,'art-visual-ledger.json'),'utf8'));
const isNewArt=f=>/\.(?:png|webp)$/i.test(f)&&! /^(?:docs|tests|tools|test-results|\.github)\//.test(f)&&!isCandidate(f);
const isCandidate=f=>/^art\/candidates\/.+\.(?:png|webp)$/i.test(f);
const within=(dir,file)=>!file.includes('..')&&!path.isAbsolute(file)&&
 fs.existsSync(path.join(dir,file));
function imageSize(dir,file){
 const raw=fs.readFileSync(path.join(dir,file));
 if(raw.length<24||raw.toString('hex',0,8)!=='89504e470d0a1a0a')return null;
 return [raw.readUInt32BE(16),raw.readUInt32BE(20)];
}
function checkNewFiles(files,ledger,dir=root){
 const failures=[],notes=[];
 if(ledger.schema!=='gary-eats-art-visual-ledger-v1'||typeof ledger.assets!=='object')
   return {pass:false,failures:['Invalid art-visual-ledger.json'],notes};
 for(const file of files){
  if(isCandidate(file)){notes.push(file+' — quarantined candidate, never normal runtime');continue;}
  if(!isNewArt(file))continue;
  const item=ledger.assets[file];
  if(!item){failures.push(file+': no visual provenance/QA ledger record');continue;}
  if(item.stage!=='VISUAL_REVIEWED_360'){failures.push(file+': cannot publish as production artwork without real-engine visual review');continue;}
  if(!['ground','shop','freestanding','food','character','bridge','other'].includes(item.family))
    failures.push(file+': invalid family');
  if(item.cameraStatus!=='CODE_LOCKED'&&item.cameraStatus!=='FAMILY_VISUALLY_REVIEWED')
    failures.push(file+': camera/geometry not reviewed');
  if(!item.source||!Number.isInteger(item.source.width)||!Number.isInteger(item.source.height)||item.source.width<=0||item.source.height<=0)
    failures.push(file+': missing source pixel dimensions');
  if(!item.draw||![item.draw.x,item.draw.y,item.draw.width,item.draw.height].every(Number.isFinite)||
     item.draw.width<=0||item.draw.height<=0)failures.push(file+': missing actual 360x640 game draw bounds');
  if(!Number.isFinite(item.groundContact?.x)||!Number.isFinite(item.groundContact?.y))
    failures.push(file+': missing measured ground-contact anchor');
  const refs=item.references||[];
  if(!Array.isArray(refs)||refs.length<2||!refs.includes('high_street_sprites.webp')||
     !refs.includes('docs/biome-workspace/layout-street-day.png')||refs.some(ref=>!within(dir,ref)))
    failures.push(file+': missing actual first-biome and live-engine references');
  if(refs.some(ref=>/wilderness\/(?:props|ruins|verge)|bridge\/production/.test(ref)))
    failures.push(file+': rejected/provisional art used as positive master');
  for(const mode of ['day','night','rain']){
   const proof=item.engineEvidence?.[mode];
   if(!proof||!within(dir,proof)){failures.push(file+': '+mode+' native-engine screenshot missing');continue;}
   const size=imageSize(dir,proof);
   if(!size||size[0]!==360||size[1]!==640)
    failures.push(file+': '+mode+' screenshot is not native 360x640 PNG');
  }
  const proofFile=item.nativeReviewFile;
  if(!proofFile||!within(dir,proofFile))failures.push(file+': original real-engine capture manifest missing');
  else try{
    const review=JSON.parse(fs.readFileSync(path.join(dir,proofFile),'utf8'));
    const digest=crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,file))).digest('hex');
    if(review.schema!=='gary-eats-native-engine-art-evidence-v1'||review.sourceSha256!==digest||
      review.registered!==false||review.technical?.pass!==true)
      failures.push(file+': real-engine capture manifest does not match this exact source image');
  }catch(_){failures.push(file+': invalid real-engine review evidence');}
  if(item.reviewedBy!=='ChatGPT-visual-review')
   failures.push(file+': missing agent visual comparison attestation');
  if(item.runtimeStartValidated!==true)
   failures.push(file+': active index script order and startup test not confirmed');
 }
 return {pass:failures.length===0,failures,notes};
}
function gitAdded(base){
 if(!/^[a-f0-9]{7,40}$/i.test(base))throw Error('Invalid base SHA');
 return cp.execFileSync('git',['-C',root,'diff','--name-only','--diff-filter=ACMR',base+'...HEAD'],{encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
}
if(require.main===module){
 try{
  const idx=process.argv.indexOf('--base');
  if(idx<0||!process.argv[idx+1])throw Error('Usage: node tools/visual-release-gate.cjs --base <commitSHA>');
  const result=checkNewFiles(gitAdded(process.argv[idx+1]),parse(root));
  for(const note of result.notes)console.log('INFO:',note);
  if(!result.pass){for(const error of result.failures)console.error('FAIL:',error);process.exitCode=1;}
  else console.log('Visual release ledger: PASS (evidence/metadata only; aesthetic quality is independently assessed)');
 }catch(e){console.error('FAIL:',e.message);process.exitCode=1;}
}
module.exports={checkNewFiles,isNewArt,isCandidate,imageSize};
