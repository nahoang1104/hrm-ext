(function(g){
 const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),num=v=>Number(v||0),fmt=v=>num(v).toLocaleString('vi-VN');
 const fields=[['employeeSI','BHXH NLĐ (%)',8],['employeeHI','BHYT NLĐ (%)',1.5],['employeeUI','BHTN NLĐ (%)',1],['employerSI','BHXH đơn vị (%)',17.5],['employerHI','BHYT đơn vị (%)',3],['employerUI','BHTN đơn vị (%)',1],['minimumWageI','Sàn vùng I (VNĐ)',5310000],['minimumWageII','Sàn vùng II (VNĐ)',4730000],['minimumWageIII','Sàn vùng III (VNĐ)',4140000],['minimumWageIV','Sàn vùng IV (VNĐ)',3700000],['insuranceCap','Trần cơ sở đóng BH (VNĐ)',0],['baseSalary','Lương cơ sở (VNĐ)',0],['taxPersonalDeductionMonth','Giảm trừ bản thân/tháng (VNĐ)',15500000],['taxDependentDeductionMonth','Giảm trừ mỗi người phụ thuộc/tháng (VNĐ)',6200000],['taxWithholdingThreshold','Ngưỡng khấu trừ 10% (VNĐ; 0 = chưa cấu hình)',0],
 ['overtimeDailyLimitRatio','Tỷ lệ OT tối đa/ngày so với giờ bình thường',0.5],
 ['overtimeDailyTotalLimitHours','Tổng giờ làm tối đa/ngày (giờ)',12],
 ['overtimeMonthLimitHours','Giới hạn OT/tháng (giờ)',40],
 ['overtimeYearLimitHours','Giới hạn OT/năm thông thường (giờ)',200],
 ['overtimeSpecialYearLimitHours','Giới hạn OT/năm trường hợp đặc biệt (giờ)',300],
 ['overtimeNightPremiumRate','Phụ trội làm đêm (%)',30],
 ['overtimeNightExtraRate','Phụ trội OT vào ban đêm (%)',20]];
 const who=()=>g.HRX.me()?.username||'unknown',isRequest=r=>r.recordType==='REQUEST',isRevision=r=>r.recordType==='REVISION',isArchived=r=>!!r.archived;
 const policyRows=rows=>rows.filter(r=>!isRequest(r)&&!isRevision(r));
 const requestData=r=>{try{return JSON.parse(r.requestData||'{}')}catch(_){return {}}};
 const revisionData=r=>{try{return JSON.parse(r.revisionData||'{}')}catch(_){return {}}};
 const makeKey=()=>`REQ-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
 function conflict(rows,date,exceptPolicyId=null,exceptRequestId=null){
  return rows.some(r=>{
   if(isRequest(r)){
    if(r.id===exceptRequestId||r.status==='REJECTED')return false;
    const d=requestData(r);return ['ADD','EDIT'].includes(r.action)&&d.effectiveFrom===date;
   }
   return r.id!==exceptPolicyId&&String(r.effectiveFrom||'')===date;
  });
 }
 function formData(form){const d=Object.fromEntries(new FormData(form));for(const [k] of fields)d[k]=num(d[k]);return d}
 function modal(title,initial,onSave){
  const old=$('#policyModal');if(old)old.remove();const data=initial||{};
  const wrap=document.createElement('div');wrap.id='policyModal';wrap.style.cssText='position:fixed;inset:0;background:#0008;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto';
  wrap.innerHTML=`<div class="card" style="width:min(760px,100%);max-height:92vh;overflow:auto;background:var(--card,#fff)"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><h3>${esc(title)}</h3><button type="button" class="btn-ico" id="policyModalClose" aria-label="Đóng">×</button></div><form id="policyEditForm"><div class="fgrid"><label>Ngày bắt đầu hiệu lực *<input type="date" name="effectiveFrom" value="${esc(data.effectiveFrom||'')}" required></label>${fields.map(([k,l,v])=>`<label>${l}<input name="${k}" type="number" min="0" step="0.01" value="${esc(data[k]??v)}" required></label>`).join('')}<label class="full">Căn cứ pháp lý / ghi chú<input name="source" value="${esc(data.source||'')}" required placeholder="Số luật, nghị định, thông tư..."></label></div><p id="policyFormError" class="err"></p><div style="display:flex;justify-content:flex-end;gap:8px"><button type="button" id="policyModalCancel">Hủy</button><button class="pri" type="submit">Lưu</button></div></form></div>`;
  document.body.append(wrap);const close=()=>wrap.remove();$('#policyModalClose').onclick=close;$('#policyModalCancel').onclick=close;wrap.addEventListener('click',e=>{if(e.target===wrap)close()});
  $('#policyEditForm').onsubmit=async e=>{e.preventDefault();const d=formData(e.currentTarget);try{await onSave(d);close();await render()}catch(err){$('#policyFormError').textContent=err.message||String(err)}};
 }
 async function render(){
  if(!g.HRX?.isMgr())throw Error('Không có quyền truy cập');
  const sa=g.HRX.isSA(),all=await g.Policy.all(),policies=policyRows(all),requests=all.filter(isRequest),sorted=policies.slice().sort((a,b)=>String(b.effectiveFrom).localeCompare(String(a.effectiveFrom))),pending=requests.filter(r=>r.status==='PENDING');
  const root=$('.view');
  const statusLabel=r=>isArchived(r)?'Đã xóa':(r.status||'APPROVED')==='PENDING'?'Chờ duyệt':r.status==='REJECTED'?'Từ chối':'Đã duyệt';
  const rowActions=r=>{
   const status=r.status||'APPROVED';let actions='';
   if(sa&&status==='PENDING'&&(isRequest(r)||!r.recordType))actions+=`<button class="sm pri" data-approve="${esc(r.id)}">Duyệt</button><button class="sm bad" data-reject="${esc(r.id)}">Từ chối</button>`;
   if(!isArchived(r)&&status==='APPROVED')actions+=`<details class="more"><summary class="btn-ico" title="Thao tác"><i class="fa-solid fa-ellipsis"></i></summary><div class="menu"><button type="button" data-edit="${esc(r.id)}">${sa?'Sửa':'Đề xuất sửa'}</button><button type="button" data-delete="${esc(r.id)}">${sa?'Xóa':'Đề xuất xóa'}</button></div></details>`;
   return actions;
  };
  root.innerHTML=`<h2>Tham số pháp lý</h2>
   <div class="card"><p class="muted">Quản lý tập trung mức đóng bảo hiểm, sàn/trần đóng, lương cơ sở, giảm trừ thuế và giới hạn làm thêm giờ theo từng mốc hiệu lực. Mỗi chính sách có hiệu lực từ ngày bắt đầu đến ngay trước ngày bắt đầu của chính sách kế tiếp. Không nhập ngày kết thúc. Nếu sửa ngày bắt đầu, mốc cũ được giữ lại để bảo toàn giai đoạn lịch sử. HR_MANAGER gửi đề xuất sửa/xóa để Giám đốc duyệt; SUPER_ADMIN có thể thao tác trực tiếp.</p><button class="pri" id="policyAdd">${sa?'Thêm chính sách':'Gửi chính sách mới cho Giám đốc duyệt'}</button></div>
   ${pending.length?`<div class="card"><h3>Đề xuất chờ Giám đốc duyệt</h3><div class="table-wrap"><table><thead><tr><th>Loại đề xuất</th><th>Ngày hiệu lực</th><th>Người gửi</th><th>Nội dung</th><th>Thao tác</th></tr></thead><tbody>${pending.map(r=>{const d=requestData(r),kind={ADD:'Thêm mới',EDIT:'Sửa',DELETE:'Xóa'}[r.action]||'Thêm mới';return `<tr><td>${kind}</td><td>${esc(d.effectiveFrom||r.effectiveFrom||'')}</td><td>${esc(r.proposedBy||r.by||'')}</td><td>${esc(r.note||d.source||'')}</td><td>${rowActions(r)}</td></tr>`}).join('')}</tbody></table></div></div>`:''}
   <div class="card"><h3>Lịch sử tham số bảo hiểm, thuế và làm thêm giờ</h3><div class="table-wrap"><table><thead><tr><th>Hiệu lực từ</th><th>BH NLĐ</th><th>BH đơn vị</th><th>Sàn vùng I–IV</th><th>OT tháng/năm</th><th>Căn cứ pháp lý</th><th>Trạng thái</th><th>Người tạo / duyệt</th><th>Thao tác</th></tr></thead><tbody>${sorted.map(r=>`<tr><td>${esc(r.effectiveFrom)}</td><td>${num(r.employeeSI??8)}% + ${num(r.employeeHI??1.5)}% + ${num(r.employeeUI??1)}%</td><td>${num(r.employerSI??17.5)}% + ${num(r.employerHI??3)}% + ${num(r.employerUI??1)}%</td><td>${[r.minimumWageI,r.minimumWageII,r.minimumWageIII,r.minimumWageIV].map(fmt).join(' / ')}</td><td>${num(r.overtimeMonthLimitHours??40)} / ${num(r.overtimeYearLimitHours??200)} giờ</td><td>${esc(r.source||'')}</td><td>${statusLabel(r)}</td><td>${esc(r.proposedBy||r.by||'')} ${r.approvedBy?' / '+esc(r.approvedBy):''}</td><td>${rowActions(r)}</td></tr>`).join('')||'<tr><td colspan="9">Chưa có dữ liệu.</td></tr>'}</tbody></table></div></div>
   ${all.filter(isRevision).length?`<div class="card"><h3>Lịch sử phiên bản tham số pháp lý</h3><div class="table-wrap"><table><thead><tr><th>Mốc hiệu lực</th><th>Thời điểm sửa</th><th>Người sửa</th><th>BH NLĐ</th><th>BH đơn vị</th><th>Căn cứ cũ</th></tr></thead><tbody>${all.filter(isRevision).sort((a,b)=>String(b.revisionAt).localeCompare(String(a.revisionAt))).map(r=>{const d=revisionData(r);return `<tr><td>${esc(r.originalEffectiveFrom||'')}</td><td>${esc(r.revisionAt||'')}</td><td>${esc(r.revisionBy||'')}</td><td>${num(d.employeeSI??8)}% + ${num(d.employeeHI??1.5)}% + ${num(d.employeeUI??1)}%</td><td>${num(d.employerSI??17.5)}% + ${num(d.employerHI??3)}% + ${num(d.employerUI??1)}%</td><td>${esc(d.source||'')}</td></tr>`}).join('')}</tbody></table></div></div>`:''}`;
  const createRequest=async(action,target,d)=>{const id=makeKey(),now=new Date().toISOString(),req={id,effectiveFrom:id,recordType:'REQUEST',action,targetId:target?.id||'',requestData:JSON.stringify(d||{}),status:'PENDING',proposedBy:who(),by:who(),updated:now,note:action==='DELETE'?`Đề xuất xóa chính sách ${target?.effectiveFrom||''}`:`Đề xuất ${action==='ADD'?'thêm': 'sửa'} chính sách ${d?.effectiveFrom||''}`};await g.HX.save('policy',null,req);await g.HRX.log('INSURANCE_POLICY_REQUEST_'+action,target?.id||null,req.note)};
  const persistPolicy=async(d,target=null,exceptRequestId=null)=>{
   const rows=await g.Policy.all();if(conflict(rows,d.effectiveFrom,target?.id||null,exceptRequestId))throw Error('Ngày bắt đầu này đã tồn tại hoặc đang có đề xuất chờ duyệt. Không thể tạo hai chính sách trùng ngày.');
   const now=new Date().toISOString(),next={...(target||{}),...d,id:d.effectiveFrom,effectiveFrom:d.effectiveFrom,recordType:'POLICY',status:'APPROVED',updated:now,by:who(),proposedBy:target?.proposedBy||who(),approvedBy:who(),approvedAt:now,archived:false};
   // Lưu snapshot phiên bản cũ trước khi cập nhật cùng ngày hiệu lực.
   if(target&&target.effectiveFrom===d.effectiveFrom){const revId=`REV-${target.effectiveFrom}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;await g.HX.save('policy',null,{id:revId,effectiveFrom:revId,recordType:'REVISION',originalEffectiveFrom:target.effectiveFrom,revisionAt:now,revisionBy:who(),revisionData:JSON.stringify(target),status:'HISTORY',updated:now,by:who()})}
   // Nếu đổi ngày hiệu lực, giữ nguyên mốc cũ để nó tiếp tục áp dụng cho giai đoạn lịch sử trước mốc mới.
   await g.HX.save('policy',null,next);await g.HRX.log(target?'UPDATE_INSURANCE_POLICY':'CREATE_INSURANCE_POLICY',next.id,`Chính sách hiệu lực ${next.effectiveFrom}: ${next.source}`);
  };
  $('#policyAdd').onclick=()=>modal(sa?'Thêm chính sách bảo hiểm':'Đề xuất chính sách bảo hiểm mới',{},async d=>{
   const rows=await g.Policy.all();if(conflict(rows,d.effectiveFrom))throw Error('Ngày bắt đầu này đã tồn tại hoặc đang có đề xuất chờ duyệt.');
   if(sa)await persistPolicy(d);else await createRequest('ADD',null,d);
  });
  root.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{const target=policies.find(x=>x.id===b.dataset.edit);if(!target)return;modal(sa?'Sửa chính sách bảo hiểm':'Đề xuất sửa chính sách bảo hiểm',target,async d=>{
   const rows=await g.Policy.all();if(conflict(rows,d.effectiveFrom,target.id))throw Error('Ngày bắt đầu này đã tồn tại hoặc đang có đề xuất chờ duyệt.');
   if(sa)await persistPolicy(d,target);else await createRequest('EDIT',target,d);
  })});
  root.querySelectorAll('[data-delete]').forEach(b=>b.onclick=async()=>{const target=policies.find(x=>x.id===b.dataset.delete);if(!target)return;if(!confirm(`Xác nhận ${sa?'xóa':'đề xuất xóa'} chính sách từ ngày ${target.effectiveFrom}? Lịch sử được lưu để bảo toàn đối chiếu lương đã tính.`))return;try{if(sa){const now=new Date().toISOString();target.archived=true;target.deletedAt=now;target.deletedBy=who();target.updated=now;await g.HX.save('policy',null,target);await g.HRX.log('DELETE_INSURANCE_POLICY',target.id,'Xóa chính sách hiệu lực '+target.effectiveFrom)}else await createRequest('DELETE',target);await render()}catch(e){alert(e.message)}});
  root.querySelectorAll('[data-approve]').forEach(b=>b.onclick=async()=>{try{
   const req=(await g.Policy.all()).find(x=>x.id===b.dataset.approve);if(!req||req.status!=='PENDING')throw Error('Đề xuất không còn chờ duyệt');const now=new Date().toISOString();
   if(isRequest(req)){
    const d=requestData(req),target=(await g.Policy.all()).find(x=>!isRequest(x)&&x.id===req.targetId);
    if(req.action==='ADD'){await persistPolicy(d,null,req.id)}
    else if(req.action==='EDIT'){if(!target||isArchived(target))throw Error('Chính sách gốc không còn tồn tại hoặc đã bị xóa');await persistPolicy(d,target,req.id)}
    else if(req.action==='DELETE'){if(!target||isArchived(target))throw Error('Chính sách gốc không còn tồn tại hoặc đã bị xóa');target.archived=true;target.deletedAt=now;target.deletedBy=who();target.updated=now;await g.HX.save('policy',null,target);await g.HRX.log('APPROVE_DELETE_INSURANCE_POLICY',target.id,'Duyệt xóa chính sách '+target.effectiveFrom)}
    req.status='APPROVED';req.approvedBy=who();req.approvedAt=now;req.updated=now;await g.HX.save('policy',null,req);
   }else{ // dữ liệu P3 cũ: đề xuất thêm mới được lưu trực tiếp trong bảng policy
    const rows=await g.Policy.all();if(conflict(rows,req.effectiveFrom,req.id))throw Error('Đã tồn tại chính sách khác trùng ngày hiệu lực');req.status='APPROVED';req.approvedBy=who();req.approvedAt=now;req.updated=now;await g.HX.save('policy',null,req);
   }
   await g.HRX.log('APPROVE_INSURANCE_POLICY_REQUEST',req.id,'Duyệt đề xuất '+(req.action||'ADD'));await render();
  }catch(e){alert(e.message)}});
  root.querySelectorAll('[data-reject]').forEach(b=>b.onclick=async()=>{try{const req=(await g.Policy.all()).find(x=>x.id===b.dataset.reject);if(!req||req.status!=='PENDING')throw Error('Đề xuất không còn chờ duyệt');req.status='REJECTED';req.approvedBy=who();req.approvedAt=new Date().toISOString();req.updated=req.approvedAt;await g.HX.save('policy',null,req);await g.HRX.log('REJECT_INSURANCE_POLICY_REQUEST',req.id,'Từ chối đề xuất '+(req.action||'ADD'));await render()}catch(e){alert(e.message)}});
 }
 g.ModPolicy={render};
})(window);
