// Quản lý khách hàng: danh sách + hộp thoại chi tiết (dialog của HRM). Logic nghiệp vụ giữ nguyên bản hopdong, chỉ đổi giao diện;
// bảng hợp đồng trong chi tiết khách có thêm cột Người lập.
window.ModCustomer=(function(){
 let el,Q='',PG=1;
 const mgr=()=>ContractAPI.isMgr(); // chỉ quản lý trở lên được thêm/sửa khách hàng; nhân viên chỉ xem
 const F=[['name','Tên đơn vị','full'],['mstLabel','Nhãn mã số'],['mst','Mã số'],['addr','Địa chỉ','full'],['headLabel','Nhãn người ký'],['title','Danh xưng'],['head','Họ tên người ký'],['pos','Chức vụ'],['emailLabel','Nhãn email'],['email','Email'],['note','Ghi chú','full']];
 const blank=()=>({id:uid('kh'),name:'',mstLabel:'Mã số thuế',mst:'',addr:'',headLabel:'Người đại diện',title:'',head:'',pos:'',emailLabel:'Email',email:'',customs:[],note:''});
 const fdt=s=>s?new Date(s).toLocaleString('vi-VN'):'';
 const list=()=>{const q=HDUI.nd(Q);return[...DB.customers].filter(k=>!q||HDUI.nd([k.name,k.mst,k.email,k.head].join(' ')).includes(q)).sort((a,b)=>String(a.name).localeCompare(String(b.name),'vi'))};
 function table(){const r=HDUI.paged(list(),PG);PG=r.page;
  if(!DB.customers.length)return`<div class="card">${empty('fa-building','Chưa có khách hàng','Khách hàng được thêm tự động khi lưu hợp đồng.',mgr()?'<button class="pri" data-a="add"><i class="fa-solid fa-plus"></i>Thêm khách hàng</button>':'')}</div>`;
  return`<div class="card"><div class="tbl-wrap"><table><tr><th>Tên đơn vị</th><th class="num">Số hợp đồng</th><th>Email</th><th></th></tr>
   ${r.items.map(k=>`<tr><td class="cell-head" data-l="Tên đơn vị"><div class="cell-main">${esc(k.name)}</div>${k.mst?`<div class="cell-sub">${esc(k.mst)}</div>`:''}</td><td data-l="Số hợp đồng" class="num">${ContractAPI.contractsOf(k).length}</td><td data-l="Email" class="wrapany">${esc(k.email)||'—'}</td>
   <td class="acts"><button class="sm" data-a="view" data-id="${esc(k.id)}">Xem chi tiết</button></td></tr>`).join('')||'<tr><td colspan="4">Không có kết quả.</td></tr>'}</table></div>${pager(r,'customers')}</div>`}
 const drawTable=()=>{el.querySelector('#hdtbl').innerHTML=table()};

 function mount(el_){
  el=el_;
  el.innerHTML=`<h2>Khách hàng</h2><div class="bar"><input id="kq" placeholder="Tìm tên đơn vị, mã số, email, người ký" value="${esc(Q)}"><div class="sp"></div>${mgr()?'<button class="pri" data-a="add"><i class="fa-solid fa-plus"></i>Thêm khách hàng</button>':''}</div><div id="hdtbl">${table()}</div>`;
  const kq=el.querySelector('#kq');kq.oninput=()=>{clearTimeout(kq.h);kq.h=setTimeout(()=>{Q=kq.value;PG=1;drawTable()},200)};
  HDUI.pageHandlers.customers=p=>{PG=p;drawTable()};
  el.onclick=e=>{const b=e.target.closest('button[data-a]');if(!b)return;
   if(b.dataset.a==='add')openModal(null);
   if(b.dataset.a==='view')openModal(b.dataset.id)};
 }

 function openModal(id){
  document.querySelector('dialog.hdcm')?.remove();
  const old=id?DB.customers.find(x=>x.id===id):null;
  const k=old?{...old,customs:(old.customs||[]).map(x=>({...x}))}:blank();
  const cons=old?ContractAPI.contractsOf(old).sort((a,b)=>(b.updated||'').localeCompare(a.updated||'')):[];
  const d=document.createElement('dialog');d.className='wide hdcm';

  // Đọc lại toàn bộ ô nhập vào k (trước khi vẽ lại hoặc lưu)
  const sync=()=>{
   d.querySelectorAll('[data-f]').forEach(i=>{k[i.dataset.f]=i.value.trim()});
   const m={};d.querySelectorAll('[data-custom-index]').forEach(i=>{(m[+i.dataset.customIndex]??={name:'',value:''})[i.dataset.customKey]=i.value.trim()});
   k.customs=Object.values(m).filter(x=>x&&(x.name||x.value));
  };
  const render=()=>{
   d.innerHTML=`<h3>${old?(mgr()?'Chi tiết khách hàng':'Thông tin khách hàng'):'Thêm khách hàng'}</h3>
   <div class="fgrid">${F.map(([f,l,w])=>`<label class="${w||''}">${l}${f==='note'?`<textarea data-f="${f}" rows="3" ${mgr()?'':'disabled'}>${esc(k[f])}</textarea>`:`<input data-f="${f}" value="${esc(k[f])}" ${mgr()?'':'disabled'}>`}</label>`).join('')}
    <div class="custom-labels"><div class="custom-label-head"><span>Nhãn tự chọn</span>${mgr()?'<button type="button" class="sm" data-custom-add><i class="fa-solid fa-plus"></i>Thêm nhãn</button>':''}</div>
    ${(k.customs||[]).map((it,i)=>`<div class="custom-label-row"><label>Tên nhãn<input data-custom-index="${i}" data-custom-key="name" ${mgr()?'':'disabled'} placeholder="Tên nhãn" value="${esc(it?.name??'')}"></label><label>Nội dung<input data-custom-index="${i}" data-custom-key="value" ${mgr()?'':'disabled'} placeholder="Nội dung" value="${esc(it?.value??'')}"></label>${mgr()?`<button type="button" class="sm bad" data-custom-del="${i}" aria-label="Xóa nhãn"><i class="fa-solid fa-xmark"></i></button>`:''}</div>`).join('')}</div></div>
   <div class="err" id="cmMsg"></div>
   ${old?`<h3 class="sub-h">Hợp đồng của khách (${cons.length})</h3><div class="tbl-wrap"><table><tr><th>Tên phần mềm</th><th>Người lập</th><th>Sửa lần cuối</th><th></th></tr>
    ${cons.map(c=>`<tr><td class="cell-head" data-l="Phần mềm">${esc(c.sw)||'—'}</td><td data-l="Người lập">${HDUI.emp(c)}</td><td data-l="Sửa lần cuối">${esc(fdt(c.updated))||'—'}</td><td class="acts"><button class="sm" type="button" data-edit="${esc(c.id)}">${ContractAPI.canEdit(c)?'Sửa':'Xem'}</button></td></tr>`).join('')||'<tr><td colspan="4">Chưa có hợp đồng.</td></tr>'}</table></div>`:''}
   <div class="row"><button type="button" data-x>Đóng</button>${mgr()?`<button type="button" class="pri" data-save>${old?'Lưu thay đổi':'Thêm khách hàng'}</button>`:''}</div>`;
  };
  d.onclick=async e=>{const t=e.target;
   if(t.closest('[data-x]'))return d.close();
   const ed=t.closest('[data-edit]');if(ed){d.close();return go('new',ed.dataset.edit)}
   if(t.closest('[data-custom-add]')){sync();k.customs.push({name:'',value:''});render();return}
   const del=t.closest('[data-custom-del]');if(del){sync();k.customs=k.customs.filter((_,i)=>i!==+del.dataset.customDel);render();return}
   if(t.closest('[data-save]')){
    sync();const err=m=>d.querySelector('#cmMsg').textContent=m;
    // Nhãn tự chọn phải có tên nhãn (giữ đúng quy tắc bản hopdong)
    k.customs=(k.customs||[]).filter(x=>String(x.name||'').trim());
    if(!k.name)return err('Cần nhập tên đơn vị.');
    const dup=ContractAPI.findCustomer(k.name);if(dup&&dup.id!==k.id)return err('Tên đơn vị này đã có trong hệ thống.');
    try{await ContractAPI.saveCustomer({...k});d.close();mount(el);toast(old?'Đã lưu thay đổi':'Đã thêm khách hàng')}catch(x){err(x.message)}}};
  d.onclose=()=>d.remove();
  document.body.appendChild(d);render();d.showModal();
 }
 return{mount}})();
