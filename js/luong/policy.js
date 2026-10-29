(function(g){
 let initPromise=null;
 async function rows(){
  let data=await g.HX.load('policy');
  if(!data.length&&!initPromise){initPromise=(async()=>{for(const x of (g.POLICY_SEED||[])){const row={...x,id:x.id||x.effectiveFrom,updated:new Date().toISOString(),by:'system-seed'};await g.HX.save('policy',null,row)}return g.HX.load('policy')})()}
  if(initPromise)data=await initPromise;
  return data;
 }
 g.Policy={async all(){return rows()},async at(date){const a=(await rows()).filter(x=>String(x.effectiveFrom)<=String(date)&&(!x.effectiveTo||String(x.effectiveTo)>=String(date))).sort((a,b)=>String(b.effectiveFrom).localeCompare(String(a.effectiveFrom)));return a[0]||null}};
 if(typeof module!=='undefined'&&module.exports)module.exports=g.Policy;
})(typeof window!=='undefined'?window:globalThis);
