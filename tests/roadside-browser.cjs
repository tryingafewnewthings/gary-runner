'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium,webkit}=require('playwright');
const instrument=require('./helpers/active-runtime-test-api.cjs');
const root=path.join(__dirname,'..');
const optional=/art\/forgotten-road\/(hedgehog-scurrying|fox-bush-verge)\.png/;
const engineName=process.env.GARY_TEST_ENGINE||'chromium';
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.html')?'text/html':file.endsWith('.png')?'image/png':'application/octet-stream');res.end(fs.readFileSync(file));}
 catch(_){res.writeHead(404).end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await ({chromium,webkit}[engineName]).launch({headless:true});
  for(const mode of ['ok','pending','404','corrupt','dimensions','decode']){
   const context=await browser.newContext({viewport:{width:360,height:640},deviceScaleFactor:1});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(mode=>{
    window.__draws=[];
    const draw=CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
     if(/(hedgehog-scurrying|fox-bush-verge)\.png/.test(image.src||'')){
      const m=this.getTransform(),x=args.length===8?args[4]:args[0],w=args.length===8?args[6]:args[2];
      window.__draws.push({src:image.src,args,left:Math.min(m.a*x+m.e,m.a*(x+w)+m.e),right:Math.max(m.a*x+m.e,m.a*(x+w)+m.e)});
     }
     return draw.call(this,image,...args);
    };
    if(mode==='decode'){
     const decode=HTMLImageElement.prototype.decode;
     HTMLImageElement.prototype.decode=function(){return /(hedgehog-scurrying|fox-bush-verge)\.png/.test(this.src)?Promise.reject(Error('test decode failure')):decode.call(this);};
    }
   },mode);
   await page.route('**/gary-difficulty-runtime.js*',route=>{
    const source=instrument(fs.readFileSync(path.join(root,'gary-difficulty-runtime.js'),'utf8'));
    const probe=`window.__roadside={images:roadsideImages,scene:(d,t,clear=10)=>{state='play';distance=scrollY=d;clock=t;visualClearFrom=clear;mystery.reset();fox.reset();bridge.reset();wilderness.reset();rememberPositions();prepareView(1);},draw:drawRoadsideWildlife,plate:()=>render(0,true)};\n`;
    return route.fulfill({contentType:'text/javascript',body:source.replace('  window.__test = Object.freeze({',probe+'  window.__test = Object.freeze({').replaceAll('requestAnimationFrame(loop);','/* manual test clock */')});
   });
   if(mode!=='ok'&&mode!=='decode')await page.route('**/art/forgotten-road/*.png',route=>{
    if(!optional.test(route.request().url()))return route.continue();
    if(mode==='pending')return; // Held indefinitely: startup must still enable Play.
    if(mode==='404')return route.fulfill({status:404,body:''});
    return route.fulfill({contentType:'image/png',body:mode==='corrupt'?Buffer.from('invalid png'):fs.readFileSync(path.join(root,'gary_intro_sheet.PNG'))});
   });
   await page.goto(`http://127.0.0.1:${server.address().port}/index.html?debug=1&seed=12345`,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.__test?.ready(),null,{timeout:60000});
   assert.equal(await page.locator('#startBtn').isEnabled(),true,mode);
   assert.deepEqual(await page.evaluate(()=>__test.snapshot().errors),[],mode);
   if(mode==='ok'){
    await page.waitForFunction(()=>Object.values(__roadside.images).every(image=>image?.ready));
    const result=await page.evaluate(async()=>{
     const frames=new Set(),sides=new Set();let animals=0,bushes=0;
     for(let d=4000;d<9000;d+=160)for(let t=0;t<1;t+=.1){
      __roadside.scene(d,t);__draws=[];__roadside.draw();
      for(const draw of __draws){
       if(!(draw.right<=105||draw.left>=255))throw Error('Decoration entered playable lanes');
       sides.add(draw.left<105?'left':'right');
       if(draw.args.length===8){animals++;frames.add(draw.args[0]);}else bushes++;
      }
     }
     __roadside.scene(6500,8,Infinity);__draws=[];__roadside.draw();
     if(__draws.length)throw Error('Decorations before clearing');
     __roadside.scene(6500,8);__draws=[];__roadside.plate();
     if(__draws.length)throw Error('Decorations in cutscene plate');
     __roadside.scene(6500,8);__test.ending();
     let stranger=0,scene=0,fox=0;
     for(let i=0;i<3200;i++){
      __test.clearOrdinary();__test.advance(1/60);__draws=[];__test.render();
      const s=__test.snapshot(),foot=__test.bench().foot;
      if((foot>=-36&&foot<=776)||s.state==='cutscene'||!['dormant','done'].includes(s.fox.phase)){
       if(__draws.length)throw Error('Decorations during narrative encounter');
      }
      if(foot>0&&foot<740)stranger++;
      if(s.state==='cutscene'){scene++;await new Promise(resolve=>setTimeout(resolve,0));__test.skipDialogue();}
      if(!['dormant','done'].includes(s.fox.phase))fox++;
      if(s.fox.finished)break;
     }
     return {frames:[...frames].sort((a,b)=>a-b),sides:[...sides].sort(),animals,bushes,stranger,scene,fox};
    });
    assert.deepEqual(result.frames,[0,72,144,216,288,360]);
    assert.deepEqual(result.sides,['left','right']);
    for(const key of ['animals','bushes','stranger','scene','fox'])assert.ok(result[key]>0,key);
    await page.evaluate(()=>{__test.ending();const d=Math.ceil(__test.snapshot().distance/1440)*1440;__roadside.scene(d,8);__test.render();});
    fs.mkdirSync(path.join(root,'test-results',engineName),{recursive:true});
    fs.writeFileSync(path.join(root,'test-results',engineName,'roadside.png'),Buffer.from(await page.locator('#c').evaluate(canvas=>canvas.toDataURL().split(',')[1]),'base64'));
    console.log(engineName,JSON.stringify(result));
   }else{
    // Play remains usable even when decoration requests or decodes fail.
    await page.locator('#startBtn').click();await page.locator('#skipIntroBtn').click();
    await page.evaluate(()=>{__test.skipEntrance();__roadside.scene(5500,8);__draws=[];__test.render();});
    assert.equal(await page.evaluate(()=>__draws.length),0,mode);
    assert.equal(await page.evaluate(()=>__test.snapshot().state),'play',mode);
   }
   assert.deepEqual(errors,[],mode);
   await context.close();console.log(engineName,mode,'PASS');
  }
  assert.deepEqual(fs.readFileSync(path.join(root,'art/forgotten-road/fox-bush-verge.png')),fs.readFileSync(path.join(root,'art/fox/fox-bush.png')));
 }finally{
  if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
