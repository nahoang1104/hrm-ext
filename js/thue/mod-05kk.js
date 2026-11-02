/* Màn tờ khai 05/KK-TNCN: nhập đầu tờ khai + chỉ tiêu nhập tay, xem số liệu, lưu nháp, tải Word, in/lưu PDF. */
(function(g){
 'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const HEAD=[['name','[04] Tên người nộp thuế'],['taxCode','[05] Mã số thuế'],['address','[06] Địa chỉ',1],['ward','[07] Xã/Phường/Đặc khu'],['province','[08] Tỉnh/thành phố'],['phone','[09] Điện thoại'],['email','[10] Email'],['agentTaxCode','[11] MST đơn vị làm thủ tục thuế'],['agentName','[12] Tên đơn vị/cá nhân làm thủ tục thuế'],['agentContractNo','[13] Số hợp đồng dịch vụ thuế'],['agentContractDate','[13] Ngày hợp đồng','date'],['agentPerson','Người trực tiếp thực hiện dịch vụ thuế'],['agentCert','Số chứng chỉ hành nghề thuế'],['signPlace','Nơi ký'],['signDate','Ngày ký','date'],['signerName','Người đại diện ký'],['signerTitle','Chức vụ người ký']];
 const MAN=g.Form05KK.MANUAL;
 const label=c=>(g.Form05KK.ROWS.find(r=>r.code===c)||{}).label||'';
 async function open(year,quarter){
  let st;try{st=await g.TxAPI.form05(year,quarter)}catch(e){alert(e.message);return}
  const F=g.Form05KK,ctx={year:st.year,quarter:st.quarter,company:st.company};
  const state={header:{...F.defaultHeader(st.company,st.year,st.quarter),...(st.header||{})},manual:{...st.manual}};
  const locked=st.status==='SUBMITTED';
  const d=document.createElement('dialog');d.className='kk-dialog';
  d.innerHTML=`<div class="kk-wrap"><h3>Tờ khai 05/KK-TNCN — Quý ${st.quarter}/${st.year}</h3><p class="muted">Số liệu tự tính từ phiếu lương đã xác nhận chi trả trong quý. Các chỉ tiêu không có dữ liệu trong hệ thống (miễn thuế theo hợp đồng dầu khí, nhân lực công nghệ số/công nghệ cao, bảo hiểm của doanh nghiệp bảo hiểm nước ngoài…) nhập tay bên dưới, mặc định 0.${locked?' <b>Tờ khai đã đánh dấu đã nộp — chỉ xem/xuất, không sửa.</b>':''}</p>
  <h4>Thông tin đầu tờ khai</h4><div class="fgrid kk-head"><label>[02] Loại tờ khai<select name="kind"><option value="first">Lần đầu</option><option value="sup">Bổ sung</option></select></label><label>[03] Bổ sung lần thứ<input name="supplement" inputmode="numeric"></label><label class="full"><input type="checkbox" name="allocated" style="width:auto"> [14] Phân bổ thuế do có đơn vị hạch toán phụ thuộc tại địa bàn tỉnh khác nơi có trụ sở chính</label>${HEAD.map(([k,l,w])=>`<label class="${w===1?'full':''}">${esc(l)}<input name="${k}" ${w==='date'?'type="date"':''}></label>`).join('')}</div>
  <h4>Chỉ tiêu nhập tay</h4><div class="fgrid kk-man">${MAN.map(c=>`<label>[${c}] ${esc(label(c).replace(/^Trong đó: /,'').slice(0,70))}<input name="m${c}" type="number" min="0" step="1" placeholder="${c===28||c===36?'tự tính':'0'}"></label>`).join('')}</div>
  <h4>Số liệu tờ khai</h4><div id="kkTable" class="table-wrap"></div><div id="kkWarn" class="err"></div><div class="err" id="kkErr"></div>
  <div class="bar kk-act"><button type="button" data-x="close">Đóng</button><span class="sp"></span>${locked?'':'<button type="button" data-x="save">Lưu nháp</button>'}<button type="button" data-x="docx" class="pri">Tải Word (.docx)</button><button type="button" data-x="pdf" class="pri">In / Lưu PDF</button></div></div>`;
  document.body.append(d);
  const q=n=>d.querySelector(`[name="${n}"]`),err=m=>{d.querySelector('#kkErr').textContent=m||''};
  const fill=()=>{const h=state.header;q('kind').value=h.first===false?'sup':'first';q('supplement').value=h.supplement||'';q('allocated').checked=!!h.allocated;for(const [k] of HEAD)q(k).value=h[k]||'';for(const c of MAN)q('m'+c).value=state.manual[c]??''};
  const read=()=>{const h=state.header;h.first=q('kind').value!=='sup';h.supplement=q('supplement').value.trim();h.allocated=q('allocated').checked;for(const [k] of HEAD)h[k]=q(k).value.trim();const m={};for(const c of MAN){const v=q('m'+c).value;if(v!=='')m[c]=Math.max(0,Math.round(Number(v)||0))}state.manual=m};
  const calc=()=>F.finalize(st.auto,state.header,state.manual,ctx);
  const draw=()=>{const f=calc();d.querySelector('#kkTable').innerHTML=`<table><thead><tr><th>STT</th><th>Chỉ tiêu</th><th>Mã</th><th>ĐVT</th><th>Số người/Số tiền</th></tr></thead><tbody>${F.ROWS.map(r=>`<tr><td>${esc(r.stt)}</td><td ${r.bold?'style="font-weight:700"':''}>${esc(r.label)}</td><td>[${r.code}]</td><td>${r.unit==='P'?'Người':'VNĐ'}</td><td style="text-align:right">${r.unit==='P'?f.ind[r.code]:F.fmt(f.ind[r.code])}</td></tr>`).join('')}</tbody></table>`;d.querySelector('#kkWarn').textContent=f.warnings.join(' ')};
  fill();draw();if(locked)d.querySelectorAll('input,select').forEach(x=>x.disabled=true);
  d.addEventListener('input',()=>{read();draw()});
  d.addEventListener('click',async e=>{
   const b=e.target.closest('[data-x]');if(!b)return;err('');read();const f=calc(),k=b.dataset.x;
   try{
    if(k==='close'){d.close();return}
    if(k==='save'){await g.TxAPI.saveForm05(st.year,st.quarter,f);err('');b.textContent='Đã lưu';setTimeout(()=>b.textContent='Lưu nháp',1500);return}
    if(k==='docx'){g.Form05KK.downloadDocx(f);if(!locked)await g.TxAPI.saveForm05(st.year,st.quarter,f,{exported:'DOCX'});return}
    if(k==='pdf'){g.Form05KK.printPdf(f);if(!locked)await g.TxAPI.saveForm05(st.year,st.quarter,f,{exported:'PDF'});return}
   }catch(x){err(x.message)}
  });
  d.onclose=()=>d.remove();d.showModal();
 }
 g.Mod05KK={open};
})(window);
