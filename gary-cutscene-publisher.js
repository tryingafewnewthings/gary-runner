/* GitHub writes run only after the owner presses Install/Publish. Tokens are never persisted. */
(function(root){'use strict';
 const to64=s=>{const bytes=new TextEncoder().encode(s);let out='';for(let i=0;i<bytes.length;i+=8192)out+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(out);};
 const from64=s=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,'')),c=>c.charCodeAt(0)));
 function create({owner,repo,branch='main',token,fetchFn=root.fetch,log=()=>{}}){
  if(!/^[A-Za-z0-9_.-]+$/.test(owner)||!/^[A-Za-z0-9_.-]+$/.test(repo)||!branch||branch.includes('..'))throw Error('Check the repository details.');
  const base='https://api.github.com/repos/'+encodeURIComponent(owner)+'/'+encodeURIComponent(repo);
  const headers={Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'};if(token)headers.Authorization='Bearer '+token;
  async function api(method,path,data,allow404=false){
   const r=await fetchFn(base+path,{method,headers,cache:'no-store',...(data===undefined?{}:{body:JSON.stringify(data)})});
   const body=await r.json().catch(()=>({}));if(allow404&&r.status===404)return null;
   if(!r.ok)throw Error('GitHub '+r.status+': '+(body.message||'Request failed'));
   return body;
  }
  async function head(){const ref=await api('GET','/git/ref/heads/'+branch.split('/').map(encodeURIComponent).join('/'));const commit=await api('GET','/git/commits/'+ref.object.sha);return {sha:ref.object.sha,tree:commit.tree.sha};}
  async function file(path,ref){return api('GET','/contents/'+path.split('/').map(encodeURIComponent).join('/')+'?ref='+encodeURIComponent(ref||branch),undefined,true);}
  async function publish(files,expected={}){
   if(!token)throw Error('Enter a GitHub token with Contents: read and write permission.');
   if(!Array.isArray(files)||!files.length||files.some(f=>!f.path||f.path.startsWith('/')||f.path.split('/').includes('..')))throw Error('Invalid publish file list.');
   const start=await head();log('Checking the current game…');
   for(const [path,sha]of Object.entries(expected)){const now=await file(path,start.sha);if((now?.sha||null)!==sha)throw Error('The live '+path+' has changed. Nothing was published. Load the latest project or regenerate the installer.');}
   const entries=[];
   for(let i=0;i<files.length;i++){const f=files[i];log('Uploading '+(i+1)+' / '+files.length+'…');const b=await api('POST','/git/blobs',{content:f.encoding==='base64'?f.content:to64(f.content),encoding:'base64'});entries.push({path:f.path,mode:'100644',type:'blob',sha:b.sha});}
   const tree=await api('POST','/git/trees',{base_tree:start.tree,tree:entries});
   const commit=await api('POST','/git/commits',{message:'Update Gary Eats cutscenes from mobile Studio',tree:tree.sha,parents:[start.sha]});
   // A fast-forward update rejects a concurrent push; the live branch is never forced.
   const before=await head();if(before.sha!==start.sha)throw Error('Another update arrived during publishing. Nothing was published. Load the latest version and retry.');
   await api('PATCH','/git/refs/heads/'+branch.split('/').map(encodeURIComponent).join('/'),{sha:commit.sha,force:false});
   log('Published. GitHub Pages may take a minute to refresh.');return {sha:commit.sha,url:'https://github.com/'+owner+'/'+repo+'/commit/'+commit.sha,base:start.sha};
  }
  return {head,file,publish,api};
 }
 const api={create,to64,from64};if(typeof module==='object'&&module.exports)module.exports=api;else root.GaryCutscenePublisher=api;
})(typeof window==='object'?window:globalThis);
