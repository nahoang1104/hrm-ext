/* HX schema-aware CRUD. KIO adapter chỉ hỗ trợ cột payload, nên HX dùng format H1 giống DataStore của hợp đồng.
 * Không sửa js/api/kio-api.js. Ghi bộ mảnh mới trước, chỉ xóa bộ cũ sau khi ghi thành công.
 */
(function(g){
 const defs={
  company:{key:'id',columns:['id','name','taxCode','address','representative','workRegion','socialInsuranceCode','shortName','workdaysMode','weekOff','standardHoursPerDay','updated','by']},
  policy:{key:'effectiveFrom',columns:['id','recordType','action','targetId','requestData','archived','deletedAt','deletedBy','originalEffectiveFrom','revisionAt','revisionBy','revisionData','effectiveFrom','minimumWageI','minimumWageII','minimumWageIII','minimumWageIV','minimumWageHourI','minimumWageHourII','minimumWageHourIII','minimumWageHourIV','baseSalary','insuranceCap','source','employeeSI','employeeHI','employeeUI','employerSI','employerHI','employerUI','status','proposedBy','approvedBy','approvedAt','note','updated','by']},
  counters:{key:'id',columns:['id','value','updated']},
  timesheets:{year:true,key:'id',columns:['id','uid','ym','d','ot','sh','lock','updated']},
  payroll:{year:true,key:'id',columns:['id','uid','ym','tt','pv','hd','cong','in','out','adjustments','allowances','bonusItems','overtimeInput','overtime','audit','correctionRequests','snapshot','calculationMode','created','by','updated']},
  payroll_requests:{year:true,key:'id',columns:['id','payrollId','uid','ym','status','reason','requestedAt','requestedBy','note','resolvedAt','resolvedBy','created','updated']},
  payroll_audit:{year:true,key:'id',columns:['id','payrollId','uid','ym','action','at','by','before','after']},
  bonuses:{year:true,key:'id',columns:['id','uid','ym','title','type','amount','note','status','approvedBy','approvedAt','reviewNote','created','updated','by']},
  documents:{year:true,key:'id',columns:['id','huong','loai','so','stt','ngay','soDen','ngayDen','noiGui','noiNhan','trichYeu','nguoiKy','chucVuKy','doKhan','xuLy','lienQuan','fileId','created','by']},
  leave_entitlements:{key:'uid',columns:['id','uid','annualDays','updated','by']},
  leave:{year:true,key:'id',columns:['id','uid','from','to','type','reason','tt','approvedBy','updated','created','note','fileId']},
  labor_contracts:{key:'id',columns:['id','uid','so','loai','tu','den','chucDanh','phongBan','diaDiem','luongCB','luongBH','phuCap','caMacDinh','tt','ngayKy','prev','fileId','chamDut','created','updated','by']},
  contract_annex:{key:'id',columns:['id','hd','so','loai','tu','thayDoi','fileId']},
  shifts:{key:'id',columns:['id','name','start','end','breakMinutes','active','updated','by']},
  holidays:{key:'id',columns:['id','date','name','year','note','updated','by']},
  dependents:{key:'id',columns:['id','uid','fullName','relation','dateOfBirth','taxCode','citizenID','from','to','fileId','note','status','approvedBy','created','updated','by']},
  tax_returns:{year:true,key:'id',columns:['id','type','period','status','exportedAt','submittedAt','transactionId','amount','data']},
  tax_settle:{year:true,key:'id',columns:['id','uid','year','data','status']}
 };
 const ROW=180,PAR=3,RX=/^H1\|([^|]*)\|(\d+)\|(\d+)\|(\d+)\|([\s\S]*)$/;
 const queues=Object.create(null),rowIds=Object.create(null),loadCache=new Map();let formSeq=0,lastRev=0;
 const CACHE_MS=45000;
 const api=()=>{if(!g.Store)throw Error('Store chưa được nạp');return g.Store};
 const isKio=()=>api().mode==='kio';
 const table=(name,year)=>{const d=defs[name];if(!d)throw Error('Bảng HX chưa khai báo: '+name);if(d.year&&!Number.isInteger(Number(year)))throw Error('Bảng '+name+' cần năm hợp lệ');return 'hx_'+name+(d.year?'_'+Number(year):'')};
 const schema=name=>defs[name]?{...defs[name],columns:[...defs[name].columns]}:null;
 const keyOf=(name,row)=>String(row?.[defs[name].key]??'');
 const runLimited=async(list,limit,fn)=>{let next=0;await Promise.all(Array.from({length:Math.min(limit,list.length)},async()=>{while(next<list.length){const i=next++;await fn(list[i],i)}}))};
 const nextRevision=()=>{lastRev=Math.max(Date.now(),lastRev+1);return lastRev};
 const makeForm=text=>{const f=document.createElement('form');f.id='hx_payload_form_'+(++formSeq);f.style.display='none';f.innerHTML='<textarea class="data-element" name="payload"></textarea>';f.querySelector('[name="payload"]').value=text;document.body.appendChild(f);return f};
 const insert=async(t,payload)=>{const once=async()=>{const f=makeForm(payload);try{const r=await sendFormDataKRUD('insert',t,null,'#'+f.id);if(!r||!r.success)throw Error(r?.error||'Lưu thất bại ở bảng '+t);return r}finally{f.remove()}};try{return await once()}catch(e){if(/SQLSTATE\[42S01\]|1050|already exists/i.test(String(e?.message||e))){await new Promise(r=>setTimeout(r,180));return once()}throw e}};
 const delRow=async(t,id)=>{const r=await krud('delete',t,{},id);if(!r||!r.success)throw Error(r?.error||'Không xóa được dòng '+id+' ở '+t)};
 const resultId=r=>r?.id??r?.insert_id??r?.insertId??r?.data?.id??null;
 const missingTable=e=>/doesn'?t exist|does not exist|no such table|unknown table|not found|42S02|1146|không tồn tại|không tìm thấy/i.test(String(e?.message||e));
 async function grab(t){
  let rows;try{rows=await KioStore.listRows(t,{force:true})}catch(e){if(missingTable(e)){rowIds[t]=new Map();return []}throw e}const groups=new Map(),ids=new Map();
  rows.forEach(r=>{const m=RX.exec(String(r.payload??''));if(!m)return;const k=m[1],rev=m[2],i=+m[3],n=+m[4],d=m[5];if(k.includes('|'))return;
   if(!ids.has(k))ids.set(k,[]);ids.get(k).push(r.id);
   if(!groups.has(k))groups.set(k,new Map());const byRev=groups.get(k);if(!byRev.has(rev))byRev.set(rev,{n,parts:new Map()});const x=byRev.get(rev);if(x.n===n)x.parts.set(i,d);
  });
  const out=[];
  groups.forEach((byRev,k)=>{const revisions=[...byRev.keys()].sort((a,b)=>Number(b)-Number(a));for(const rev of revisions){const x=byRev.get(rev);if(x.parts.size!==x.n)continue;let raw='';for(let i=0;i<x.n;i++){if(!x.parts.has(i)){raw=null;break}raw+=x.parts.get(i)}if(raw===null)continue;try{const row=JSON.parse(raw);if(row&&typeof row==='object'&&keyOfFromRaw(row)!=='')out.push(row);break}catch(_){}}});
  rowIds[t]=ids;return out;
 }
 const keyOfFromRaw=row=>String(row?.id??row?.effectiveFrom??'');
 const localLoad=async(name,year)=>api().list(table(name,year));
 async function load(name,year,opts={}){const t=table(name,year);if(!isKio())return localLoad(name,year);const cached=loadCache.get(t);if(!opts.force&&cached&&Date.now()-cached.at<CACHE_MS)return cached.rows.map(x=>({...x}));const rows=await grab(t);loadCache.set(t,{at:Date.now(),rows});return rows.map(x=>({...x}))}
 async function saveKio(name,year,row){const d=defs[name],t=table(name,year),key=keyOf(name,row);if(!key)throw Error('Thiếu khóa '+d.key+' của '+name);if(key.includes('|'))throw Error('Khóa HX không được chứa ký tự |');
  // Dùng chỉ mục được dựng từ HX.load() thay vì quét toàn bộ bảng KIO ở mỗi lần ghi.
  let index=rowIds[t];if(!index){let oldRows=[];try{oldRows=await KioStore.listRows(t,{force:true})}catch(e){if(!missingTable(e))throw e}index=new Map();oldRows.forEach(r=>{const m=RX.exec(String(r.payload??''));if(m){const a=index.get(m[1])||[];a.push(r.id);index.set(m[1],a)}});rowIds[t]=index}const oldIds=index.get(key)||[];
  const rev=nextRevision(),raw=JSON.stringify(row),parts=[];for(let i=0;i<raw.length;i+=ROW)parts.push(raw.slice(i,i+ROW));if(!parts.length)parts.push('');
  const encoded=parts.map((p,i)=>`H1|${key}|${rev}|${i}|${parts.length}|${p}`),written=[];
  try{written[0]=resultId(await insert(t,encoded[0]));await runLimited(encoded.slice(1),PAR,async(p,i)=>{written[i+1]=resultId(await insert(t,p))})}catch(e){rowIds[t]=null;KioStore.invalidateTable(t);loadCache.delete(t);throw e}
  const leftovers=[];await runLimited(oldIds,PAR,async id=>{try{await delRow(t,id)}catch(_){leftovers.push(id)}});index.set(key,[...leftovers,...written.filter(x=>x!=null)]);
  KioStore.invalidateTable(t);const cached=loadCache.get(t);if(cached)loadCache.set(t,{at:Date.now(),rows:[...cached.rows.filter(x=>keyOf(name,x)!==key),row]});return row;
 }
 async function save(name,year,row,opts={}){const d=defs[name];if(!d)throw Error('Bảng HX chưa khai báo: '+name);if(!row||typeof row!=='object')throw Error('Bản ghi HX không hợp lệ');
  const allowed=new Set(d.columns),out={};for(const k of Object.keys(row)){if(allowed.has(k)||k==='payload')out[k]=row[k]};const key=keyOf(name,out);if(!key)throw Error('Thiếu khóa '+d.key+' của '+name);
  const t=table(name,year),run=async()=>{const all=await load(name,year),old=all.find(x=>keyOf(name,x)===key);if(opts.expectedUpdated!==undefined&&String(old?.updated||'')!==String(opts.expectedUpdated))throw Error('Xung đột dữ liệu: bản ghi đã được người khác sửa');if(old&&out.updated&&old.updated&&String(out.updated)<String(old.updated))throw Error('Bản ghi cũ hơn dữ liệu hiện tại');const merged={...(old||{}),...out};if(isKio())return saveKio(name,year,merged);await api().sync(t,[merged]);return merged};
  const p=(queues[t]||Promise.resolve()).catch(()=>{}).then(run);queues[t]=p;return p;
 }
 async function remove(name,year,key){const t=table(name,year),k=String(key);loadCache.delete(t);if(!isKio())return api().del(t,[k]);let rows=[];try{rows=await KioStore.listRows(t,{force:true})}catch(e){if(!missingTable(e))throw e}const ids=[];rows.forEach(r=>{const m=RX.exec(String(r.payload??''));if(m&&m[1]===k)ids.push(r.id)});await runLimited(ids,PAR,id=>delRow(t,id));KioStore.invalidateTable(t);if(rowIds[t])rowIds[t].delete(k);return true}
 async function nextSeq(key){const id='seq_'+String(key).replace(/[^A-Za-z0-9_-]/g,'_');const work=async()=>{for(let i=0;i<12;i++){const all=await load('counters'),old=all.find(x=>x.id===id),value=Number(old?.value||0)+1,updated=new Date().toISOString();await save('counters',null,{id,value,updated});const check=(await load('counters')).find(x=>x.id===id);if(Number(check?.value)===value)return value}throw Error('Không cấp được số an toàn do có ghi đồng thời; vui lòng thử lại')};if(g.navigator?.locks?.request)return g.navigator.locks.request('hrx-seq-'+id,work);return work()}
 g.HX={table,schema,load,save,remove,nextSeq,invalidate:(name,year)=>loadCache.delete(table(name,year)),definitions:defs};
})(window);
