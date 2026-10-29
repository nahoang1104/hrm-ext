// Lớp lưu trữ duy nhất của app: chọn local hoặc KIO. Module nghiệp vụ chỉ gọi DataStore.load / saveOne / removeOne.
// Bản ghi là object thuần có `id`.
// KIO: cột payload chỉ chứa tối đa 255 ký tự nên mỗi bản ghi vẫn phải chia thành vài dòng, nhưng ở đây tự chia
// gọn hơn KioStore (dòng ~190 ký tự dữ liệu + tiêu đề ngắn, không bọc JSON hai lớp) và ghi song song.
// Đọc qua KioStore.listRows (có sẵn); ghi/xóa gọi thẳng sendFormDataKRUD/krud. KHÔNG sửa kio-api.js.
//
// Định dạng 1 dòng:  H1|<khóa>|<rev>|<i>|<n>|<dữ liệu>      (rev = thời điểm ghi; i = số thứ tự mảnh; n = tổng số mảnh)
// - Sửa = ghi bộ mảnh MỚI (rev mới) trước, xóa bộ cũ sau. Khi đọc chỉ nhận bộ mảnh ĐỦ, mới nhất; bộ đứt giữa chừng bị bỏ qua
//   (tự dùng bản trước) -> đứt mạng không bao giờ làm hỏng hay mất hợp đồng.
// - Dòng định dạng cũ (JSON của KioStore) bị bỏ qua.
window.DataStore=(function(){
 const lk=t=>'hopdong:store:'+t,keyOf=r=>String(r.id),queue={};
 const unwrap=r=>r&&r.id!=null&&r.payload&&typeof r.payload==='object'&&Object.keys(r).length===2?r.payload:r; // định dạng localStorage cũ {id,payload}
 const local={async load(t){try{return JSON.parse(localStorage.getItem(lk(t))||'[]').map(unwrap)}catch(e){return[]}},
  async save(t,items){localStorage.setItem(lk(t),JSON.stringify(items))},
  async saveOne(t,item){const a=await this.load(t),i=a.findIndex(x=>keyOf(x)===keyOf(item));i<0?a.push(item):a[i]=item;await this.save(t,a)},
  async removeOne(t,id){await this.save(t,(await this.load(t)).filter(x=>keyOf(x)!==String(id)))}};

 // ---- KIO ----
 const ROW=190,PAR=3,RX=/^H1\|([^|]*)\|(\d+)\|(\d+)\|(\d+)\|([\s\S]*)$/;
 const rowIds={}; // rowIds[bảng]: Map(khóa -> [id các dòng trên server]); null = chưa biết (cần đọc lại bảng)
 let seq=0;
 const runLimited=async(list,limit,fn)=>{let next=0;await Promise.all(Array.from({length:Math.min(limit,list.length)},async()=>{while(next<list.length){const i=next++;await fn(list[i],i)}}))};
 const grab=async t=>{const rows=await KioStore.listRows(t,{force:true}),g=new Map(),ids=new Map();
  rows.forEach(r=>{const m=RX.exec(String(r.payload??''));if(!m)return;
   const k=m[1],rev=m[2],i=+m[3],n=+m[4],d=m[5];
   (ids.get(k)||ids.set(k,[]).get(k)).push(r.id);
   const kr=g.get(k)||g.set(k,new Map()).get(k),x=kr.get(rev)||kr.set(rev,{n,p:new Map()}).get(rev);x.p.set(i,d)});
  const out=[];
  g.forEach(kr=>{for(const rev of [...kr.keys()].sort((a,b)=>b-a)){const x=kr.get(rev);if(x.p.size!==x.n)continue; // bộ mảnh chưa đủ -> bỏ, dùng bản trước
   let s='';for(let i=0;i<x.n&&s!==null;i++)s=x.p.has(i)?s+x.p.get(i):null;
   if(s===null)continue;try{out.push(JSON.parse(s));break}catch(e){}}});
  rowIds[t]=ids;return out};
 const makeForm=text=>{const f=document.createElement('form');f.id='hd_payload_form_'+(++seq);f.style.display='none';
  f.innerHTML='<textarea class="data-element" name="payload"></textarea>';f.querySelector('[name="payload"]').value=text;document.body.appendChild(f);return f};
 const insert=async(t,text)=>{
  const once=async()=>{const f=makeForm(text);try{const res=await sendFormDataKRUD('insert',t,null,'#'+f.id);
   if(!res||!res.success)throw new Error(res?.error||'Lưu thất bại ở bảng '+t);return res}finally{f.remove()}};
  try{return await once()}catch(e){
   // Bảng vừa được tạo ở request khác cùng lúc: thử lại đúng 1 lần
   if(/SQLSTATE\[42S01\]|1050|already exists/i.test(String(e?.message||e))){await new Promise(r=>setTimeout(r,180));return once()}
   throw e}};
 const del=async(t,id)=>{const r=await krud('delete',t,{},id);if(!r||!r.success)throw new Error(r?.error||'Không xóa được dòng '+id+' ở '+t)};
 const newId=res=>res.id??res.insert_id??res.insertId??res.data?.id??null;
 const idsOf=async(t,key)=>{if(!rowIds[t]||rowIds[t].get(key)===null)await grab(t);return rowIds[t].get(key)||[]};
 const kio={load:grab,
  async saveOne(t,item){const key=keyOf(item);if(key.includes('|'))throw new Error('id không được chứa ký tự |');
   const old=await idsOf(t,key),rev=Date.now(),text=JSON.stringify(item),parts=[];
   for(let i=0;i<text.length;i+=ROW)parts.push(text.slice(i,i+ROW));if(!parts.length)parts.push('');
   const rows=parts.map((d,i)=>`H1|${key}|${rev}|${i}|${parts.length}|${d}`),got=new Array(rows.length);
   try{
    got[0]=newId(await insert(t,rows[0])); // mảnh đầu ghi riêng (tránh lỗi tạo bảng trùng), các mảnh còn lại ghi song song
    await runLimited(rows.slice(1),PAR,async(r,i)=>{got[i+1]=newId(await insert(t,r))});
   }catch(e){rowIds[t].set(key,null);KioStore.invalidateTable(t);throw e} // ghi dở: bản cũ vẫn nguyên, lần sau đọc lại bảng để dọn mảnh thừa
   const left=[];
   await runLimited(old,PAR,async id=>{try{await del(t,id)}catch(e){left.push(id)}}); // xóa lỗi: giữ lại, lần lưu sau xóa tiếp
   KioStore.invalidateTable(t);
   rowIds[t].set(key,got.some(x=>x==null)?null:[...left,...got])},
  async removeOne(t,id){const key=String(id),old=await idsOf(t,key);
   try{await runLimited(old,PAR,id=>del(t,id))}catch(e){rowIds[t].set(key,null);KioStore.invalidateTable(t);throw e}
   KioStore.invalidateTable(t);rowIds[t].delete(key)}};

 const drv=()=>HD_CONFIG.driver==='kio'?kio:local;
 // ghi tuần tự theo bảng để các lần lưu không đè nhau
 const run=(t,fn)=>{const p=(queue[t]||Promise.resolve()).catch(()=>{}).then(fn);queue[t]=p;return p};
 return{load:t=>drv().load(t),
  saveOne(t,item){const s=JSON.parse(JSON.stringify(item)),d=drv();return run(t,()=>d.saveOne(t,s))}, // chụp lúc gọi
  removeOne(t,id){const d=drv();return run(t,()=>d.removeOne(t,id))}};
})();
