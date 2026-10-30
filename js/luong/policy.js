(function(g){
 let initPromise=null;
 const isRequest=x=>x.recordType==='REQUEST';
 const isPolicy=x=>!x.recordType||x.recordType==='POLICY';
 async function rows(){
  let data=await g.HX.load('policy');
  if(!data.length&&!initPromise){initPromise=(async()=>{for(const x of(g.POLICY_SEED||[])){const row={...x,id:x.effectiveFrom,recordType:'POLICY',status:'APPROVED',updated:new Date().toISOString(),by:'system-seed',approvedBy:'system-seed',approvedAt:new Date().toISOString()};delete row.effectiveTo;await g.HX.save('policy',null,row)}return g.HX.load('policy')})()}
  if(initPromise)data=await initPromise;
  return data.map(x=>({...x,status:x.status||'APPROVED'}));
 }
 g.Policy={
  async all(){return rows()},
  async at(date){
   const a=(await rows()).filter(x=>isPolicy(x)&&!x.archived&&x.status==='APPROVED'&&String(x.effectiveFrom)<=String(date)).sort((a,b)=>String(b.effectiveFrom).localeCompare(String(a.effectiveFrom)));
   return a[0]||null;
  }
 };
 if(typeof module!=='undefined'&&module.exports)module.exports=g.Policy;
})(typeof window!=='undefined'?window:globalThis);
