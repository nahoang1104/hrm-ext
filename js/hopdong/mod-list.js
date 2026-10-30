// Danh sách hợp đồng: thẻ tóm tắt, lọc theo nhân viên đã lập, phân trang. Giao diện dùng lớp của HRM (card, tbl-wrap, stats, tag...).
window.ModList=(function(){
 let el,F={q:'',emp:'',page:1};
 const meId=()=>(window.HD_ME&&HD_ME()||{}).id;
 const filtered=()=>{let r=[...ContractAPI.visible()];
  if(F.emp==='__me')r=r.filter(c=>c.employeeId===meId());
  else if(F.emp==='__none')r=r.filter(c=>!c.employeeId);
  else if(F.emp)r=r.filter(c=>c.employeeId===F.emp);
  if(F.q){const Q=HDUI.nd(F.q);r=r.filter(c=>HDUI.nd([c.so,c.benA?.name,c.sw,c.employeeName,c.employeeUser].join(' ')).includes(Q))}
  return r.sort((a,b)=>(b.updated||'').localeCompare(a.updated||''))};
 const mgr=()=>ContractAPI.isMgr();
 const monthKey=d=>String(d||'').slice(0,7);
 // Thẻ tóm tắt: quản lý thấy toàn bộ; nhân viên chỉ có hợp đồng của mình nên số liệu tính trên hợp đồng của mình
 const stats=()=>{const v=ContractAPI.visible(),sum=v.reduce((t,c)=>t+calc(c).total,0),now=monthKey(new Date().toISOString());
  const thisMonth=v.filter(c=>monthKey(c.created||c.updated)===now).length;
  return statRow(mgr()?[['Tổng hợp đồng',v.length,'fa-file-contract',''],
    ['Hợp đồng của tôi',v.filter(c=>c.employeeId&&c.employeeId===meId()).length,'fa-user-pen','green'],
    ['Nhân viên đã lập',ContractAPI.employees().length,'fa-users','violet'],
    ['Tổng giá trị (VNĐ)',vnd(sum),'fa-coins','orange',1]]
   :[['Hợp đồng của tôi',v.length,'fa-file-contract',''],['Lập trong tháng này',thisMonth,'fa-calendar-check','green'],
    ['Khách hàng',new Set(v.map(c=>c.customerId||c.benA?.name)).size,'fa-building','violet'],['Tổng giá trị (VNĐ)',vnd(sum),'fa-coins','orange',1]])};
 const empOptions=()=>{const n={};ContractAPI.visible().forEach(c=>{if(c.employeeId)n[c.employeeId]=(n[c.employeeId]||0)+1});
  return`<option value="">Mọi nhân viên</option><option value="__me" ${F.emp==='__me'?'selected':''}>Hợp đồng của tôi</option><option value="__none" ${F.emp==='__none'?'selected':''}>Chưa gán nhân viên</option>`+
   ContractAPI.employees().map(e=>`<option value="${esc(e.id)}" ${F.emp===e.id?'selected':''}>${esc(e.name)}${e.user&&e.user!==e.name?' (@'+esc(e.user)+')':''} · ${n[e.id]||0}</option>`).join('')};
 const rowHtml=c=>{const ed=ContractAPI.canEdit(c);
  return`<tr><td class="cell-head" data-l="Số hợp đồng"><div class="cell-main">${esc(c.so)||'—'}</div></td>
   <td data-l="Bên A (khách hàng)">${esc(c.benA?.name)||'—'}</td><td data-l="Phần mềm">${esc(c.sw)||'—'}</td>
   <td data-l="Tổng giá trị" class="num">${vnd(calc(c).total)}</td><td data-l="Người lập">${HDUI.emp(c)}</td>
   <td data-l="Cập nhật">${c.updated?dtc(c.updated):'—'}</td>
   <td class="acts"><button class="sm" data-a="edit" data-id="${esc(c.id)}">${ed?'Sửa':'Xem'}</button> <button class="sm" data-a="dup" data-id="${esc(c.id)}" title="Tạo bản sao thuộc về bạn">Nhân bản</button>${ed?` <button class="sm bad" data-a="del" data-id="${esc(c.id)}">Xóa</button>`:''}</td></tr>`};
 // Chỉ vẽ lại phần bảng + phân trang khi gõ tìm/đổi bộ lọc (giữ nguyên ô nhập đang gõ)
 function table(){const r=HDUI.paged(filtered(),F.page);F.page=r.page;
  if(!ContractAPI.visible().length)return`<div class="card">${empty('fa-file-contract','Chưa có hợp đồng','Tạo hợp đồng đầu tiên để bắt đầu.','<button class="pri" data-a="new"><i class="fa-solid fa-plus"></i>Tạo hợp đồng</button>')}</div>`;
  return`<div class="card"><div class="tbl-wrap"><table><tr><th>Số hợp đồng</th><th>Bên A (khách hàng)</th><th>Phần mềm</th><th class="num">Tổng giá trị (VNĐ)</th><th>Người lập</th><th>Cập nhật</th><th></th></tr>
   ${r.items.map(rowHtml).join('')||'<tr><td colspan="7">Không có kết quả.</td></tr>'}</table></div>${pager(r,'contracts')}</div>`}
 const drawTable=()=>{el.querySelector('#hdtbl').innerHTML=table()};
 const hydrateAvatars=()=>{const nodes=[...el.querySelectorAll('#hdtbl .usercell[data-uid]')];nodes.forEach(async n=>{if(n.dataset.avatarLoaded)return;n.dataset.avatarLoaded='1';const url=window.HD_AVATAR?await HD_AVATAR(n.dataset.uid):'';if(url&&n.isConnected){const box=n.querySelector('.ava-box');if(box&&!box.querySelector('img'))box.insertAdjacentHTML('afterbegin',`<img src="${esc(url)}" alt="" onerror="this.remove()">`)}})};
 function mount(el_){
  el=el_;
  el.innerHTML=`<h2>Hợp đồng</h2><div id="hdstats">${stats()}</div>
   <div class="bar"><input id="hq" placeholder="Tìm số hợp đồng, khách hàng, phần mềm, nhân viên" value="${esc(F.q)}">${mgr()?`<select id="he" title="Lọc theo nhân viên đã lập">${empOptions()}</select>`:''}
   <div class="sp"></div><button data-a="reload" title="Tải lại dữ liệu mới nhất"><i class="fa-solid fa-rotate"></i>Tải lại</button><button class="pri" data-a="new"><i class="fa-solid fa-plus"></i>Tạo hợp đồng</button></div>
   <div id="hdtbl">${table()}</div>`;
  hydrateAvatars();
  const re=()=>{F.q=el.querySelector('#hq').value;F.emp=mgr()?el.querySelector('#he').value:'';F.page=1;drawTable();hydrateAvatars()};
  el.querySelector('#hq').oninput=()=>{clearTimeout(re.h);re.h=setTimeout(re,200)};if(mgr())el.querySelector('#he').onchange=re;
  HDUI.pageHandlers.contracts=p=>{F.page=p;drawTable();hydrateAvatars()};
  el.onclick=async e=>{const b=e.target.closest('button[data-a]');if(!b)return;const a=b.dataset.a,c=b.dataset.id&&ContractAPI.get(b.dataset.id);
   if(a==='new')return go('new');
   if(a==='reload')return run(async()=>{ContractAPI.reset();await ContractAPI.boot();mount(el);toast('Đã tải lại danh sách')});
   if(!c)return toast('Không tìm thấy hợp đồng (có thể đã bị xóa)','warn');
   if(a==='edit')return go('new',c.id);
   if(a==='dup')return run(async()=>{const n=JSON.parse(JSON.stringify(c));n.id=uid('hd');n.so+=' (bản sao)';
    ['employeeId','employeeUser','employeeName','created'].forEach(k=>delete n[k]); // bản sao thuộc về người nhân bản
    await ContractAPI.upsert(n);mount(el);toast('Đã nhân bản hợp đồng')});
   if(a==='del'&&await ask('Xóa hợp đồng','Xóa hợp đồng '+c.so+'? Thao tác này không thể hoàn tác.',{ok:'Xóa',danger:true}))
    return run(async()=>{await ContractAPI.remove(c.id);mount(el);toast('Đã xóa hợp đồng')})}}
 return{mount}})();
