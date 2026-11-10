// DOM-Attrappe für reine Rechentests. Immer der ausgelieferte IIFE-Code,
// keine importierte Teil-Engine und keine zweite Rechenimplementierung.
const fs=require('node:fs'),vm=require('node:vm');
function createRuntime(){
  const html=fs.readFileSync(require('./ziel.js'),'utf8');
  const blocks=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(m=>m[1]).sort((a,b)=>b.length-a.length);
  let code=blocks[0].replace(/loadAll\(\);\s*\ncheckForUpdate\(\);/,'/* Keine Boot-Abfragen im Rechentest. */');
  const end=code.lastIndexOf('})();');
  code=code.slice(0,end)+'\nglobalThis.__runtimeEval=s=>eval(s);\n'+code.slice(end);
  const el=()=>({innerHTML:'',textContent:'',style:{},dataset:{},children:[],attributes:{},
    classList:{add(){},remove(){},toggle(){},contains(){return false}},
    setAttribute(k,v){this.attributes[k]=v},getAttribute(k){return this.attributes[k]??null},
    appendChild(c){this.children.push(c);return c},remove(){},insertBefore(c){this.children.push(c);return c},
    addEventListener(){},removeEventListener(){},querySelector(){return null},querySelectorAll(){return[]},
    getBoundingClientRect(){return{top:0,left:0,width:0,height:0}},closest(){return null},contains(){return false}});
  const elements=new Map(),storage=new Map();
  const stub=()=>new Proxy(function(){},{get(_,p){return p==='then'?undefined:stub()},apply(){return stub()}});
  let now=new Date(2026,7,26,21).getTime();
  class FixedDate extends Date{constructor(...a){a.length?super(...a):super(now)}static now(){return now}}
  const context={Date:FixedDate,console,performance,URL,URLSearchParams,Blob,
    setInterval:()=>0,clearInterval(){},setTimeout:()=>0,clearTimeout(){},requestAnimationFrame:()=>0,
    cancelAnimationFrame(){},requestIdleCallback:()=>0,fetch:()=>new Promise(()=>{}),
    addEventListener(){},removeEventListener(){},dispatchEvent(){},scrollTo(){},
    navigator:{onLine:true,userAgent:'rechentest',vibrate(){}},
    location:{href:'http://l/',search:'',hash:'',reload(){},replace(){},origin:'http://l',pathname:'/'},
    history:{pushState(){},replaceState(){},back(){},state:null},
    matchMedia:()=>({matches:false,addEventListener(){},addListener(){}}),
    alert(){},confirm:()=>true,prompt:()=>null,
    localStorage:{getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v)),
      removeItem:k=>storage.delete(k),key:i=>[...storage.keys()][i]??null,get length(){return storage.size}},
    document:{readyState:'complete',getElementById(id){if(!elements.has(id))elements.set(id,el());return elements.get(id)},
      createElement:()=>el(),createTextNode:t=>({textContent:t}),querySelector:()=>null,querySelectorAll:()=>[],
      addEventListener(){},removeEventListener(){},body:el(),documentElement:el(),visibilityState:'visible',hidden:false},
    supabase:{createClient:()=>({from:()=>stub(),channel:()=>stub(),rpc:()=>stub(),removeChannel(){}})}};
  context.window=context;
  vm.runInNewContext(code,context,{filename:'padel-app-rechentest.js'});
  return {K:context.__runtimeEval,setNow:ms=>{now=ms}};
}
module.exports={createRuntime};
