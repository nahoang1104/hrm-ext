/* Sổ công văn + Soạn văn bản từ mẫu. Văn bản đi/nội bộ được soạn bằng trình soạn mẫu (Điều/khoản, trường điền,
   xem trước A4, Word/PDF) rồi đăng ký vào sổ để cấp số; nội dung lưu trong cột "body" của dòng sổ. */
(function(g){
 'use strict';
 const $=s=>document.querySelector(s),e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),today=()=>new Date().toISOString().slice(0,10);
 let year=new Date().getFullYear(),rows=[];
 const HUONG={DEN:'Văn bản đến',DI:'Văn bản đi',NOI_BO:'Nội bộ'};
 const LOAI=[['CV','Công văn'],['QD','Quyết định'],['TB','Thông báo'],['BB','Biên bản'],['TTR','Tờ trình'],['GM','Giấy mời'],['GGT','Giấy giới thiệu'],['GUQ','Giấy ủy quyền'],['KH','Kế hoạch'],['HD','Hướng dẫn'],['BC','Báo cáo'],['KHAC','Khác']];
 const TTX={MOI:'Mới',DANG_XU_LY:'Đang xử lý',DA_XU_LY:'Đã xử lý',LUU:'Lưu'};
 const TPL_LOAI={'qd-chamdut':'QD','qd-tangluong':'QD','qd-chung':'QD','tb-chung':'TB'};
 const TPL_HUONG={'gx-congtac':'DI','gx-thunhap':'DI'};
 const opt=(list,v)=>list.map(o=>`<option value="${e(o[0])}" ${String(v??'')===o[0]?'selected':''}>${e(o[1])}</option>`).join('');
 const mgr=()=>g.HRX.isMgr();
 const root=()=>$('.view');
 const noPerm=m=>{const r=root();if(r)r.innerHTML=`<div class="card">${m}</div>`};

 /* ---------- hộp thoại sửa thông tin đăng ký (văn bản đến, hoặc sửa meta) ---------- */
 function dialog(title,fields,vals,submit){
  const d=document.createElement('dialog');d.className='wide';
  d.innerHTML=`<form><h3>${e(title)}</h3><div class="fgrid">${fields.map(f=>`<label${f.full?' class="full"':''}>${e(f.label)}${f.req?' *':''}${f.select?`<select name="${f.k}" ${f.req?'required':''}>${f.opts.map(o=>`<option value="${o[0]}" ${String(vals[f.k]||'')===o[0]?'selected':''}>${e(o[1])}</option>`).join('')}</select>`:f.area?`<textarea name="${f.k}" ${f.req?'required':''}>${e(vals[f.k]||'')}</textarea>`:`<input name="${f.k}" type="${f.type||'text'}" ${f.req?'required':''} ${f.accept?`accept="${f.accept}"`:''} value="${f.type==='file'?'':e(vals[f.k]||'')}">`}</label>`).join('')}</div><p class="err"></p><div class="row"><button type="button" data-cancel>Hủy</button><button class="pri">Lưu</button></div></form>`;
  document.body.append(d);d.showModal();d.querySelector('[data-cancel]').onclick=()=>d.close();
  d.querySelector('form').onsubmit=async ev=>{ev.preventDefault();const o={};fields.forEach(f=>{const el=ev.currentTarget.elements[f.k];o[f.k]=f.type==='file'?el.files[0]:el.value});try{await submit(o);d.close();await render()}catch(x){d.querySelector('.err').textContent=x.message}};
  d.onclose=()=>d.remove();
 }
 const FIELDS=[{k:'huong',label:'Hướng',select:true,req:true,opts:[['DEN','Văn bản đến'],['DI','Văn bản đi'],['NOI_BO','Nội bộ']]},{k:'loai',label:'Loại',select:true,req:true,opts:LOAI},{k:'ngay',label:'Ngày văn bản',type:'date',req:true},{k:'soDen',label:'Số đến (nếu có)'},{k:'noiGui',label:'Nơi gửi'},{k:'noiNhan',label:'Nơi nhận'},{k:'trichYeu',label:'Trích yếu',req:true,full:true},{k:'nguoiKy',label:'Người ký'},{k:'chucVuKy',label:'Chức vụ người ký'},{k:'doKhan',label:'Độ khẩn',select:true,opts:[['THUONG','Thường'],['KHAN','Khẩn'],['THUONG_KHAN','Thượng khẩn'],['HOA_TOC','Hỏa tốc']]},{k:'hanXuLy',label:'Hạn xử lý',type:'date'},{k:'nguoiXuLy',label:'ID người xử lý'},{k:'trangThai',label:'Trạng thái xử lý',select:true,opts:Object.entries(TTX)},{k:'lienQuanUid',label:'ID nhân sự liên quan'},{k:'file',label:'File scan (PDF/JPG/PNG/WebP ≤5MB)',type:'file',accept:'application/pdf,image/jpeg,image/png,image/webp',full:true}];
 async function edit(row){
  dialog(row?'Sửa thông tin văn bản':'Đăng ký văn bản đến / văn bản có sẵn',FIELDS,{ngay:today(),huong:'DEN',loai:'CV',doKhan:'THUONG',trangThai:row?.xuLy?.tt||'MOI',hanXuLy:row?.xuLy?.han||'',nguoiXuLy:row?.xuLy?.uid||'',lienQuanUid:row?.lienQuan?.uid||'',...row},async d=>{
   const file=d.file;delete d.file;const uid=d.lienQuanUid;delete d.lienQuanUid;
   d.lienQuan={uid:uid||'',hd:row?.lienQuan?.hd||''};d.xuLy={uid:d.nguoiXuLy||'',han:d.hanXuLy||'',tt:d.trangThai||'MOI'};
   if(file)d.fileId=await g.HRX.uploadFile(uid||g.HRX.me().id,'documents',file);
   if(row){d.id=row.id;d.expectedUpdated=row.updated}
   await g.LDAPI.saveDocument(d,year);
  });
 }
 async function exp(){
  const out=rows.map(r=>({stt:r.stt,so:r.so,soDen:r.soDen,huong:r.huong,loai:r.loai,ngay:r.ngay,noiGui:r.noiGui,noiNhan:r.noiNhan,trichYeu:r.trichYeu,nguoiKy:r.nguoiKy,doKhan:r.doKhan,trangThai:r.xuLy?.tt,hanXuLy:r.xuLy?.han}));
  g.XLSXBuilder.download(out,{headers:['stt','so','soDen','huong','loai','ngay','noiGui','noiNhan','trichYeu','nguoiKy','doKhan','trangThai','hanXuLy'],sheetName:'So cong van',filename:`so-cong-van-${year}.xlsx`});
  await g.HRX.log('EXPORT_DOCUMENT_REGISTER_XLSX',null,`Xuất sổ công văn năm ${year}`);
 }

 /* ---------- trình soạn văn bản (dùng chung với màn Hợp đồng lao động) ---------- */
 const download=(blob,name)=>{const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500)};
 async function loadPerson(uid,hdHint){
  let emp={},hd=hdHint||null;
  if(uid){try{emp=await g.HRX.profile(uid)||{}}catch{emp={}}if(!hd){try{hd=await g.LDAPI.activeContract(uid)}catch{hd=null}}}
  return {emp,hd};
 }
 /* opts: {tplId, row?, prefill?:{uid,hd}, back:fn, extraActions?:[{id,label,cls,confirm,run(api,{cur,vals,hd})}]} */
 async function compose(opts){
  if(!mgr())return noPerm('Bạn không có quyền soạn văn bản nghiệp vụ.');
  const row=opts.row||null,tplId=row?.body?.tpl||opts.tplId,L=g.LDDoc,t0=L.tpl(tplId);
  if(!t0)return noPerm('Không tìm thấy mẫu văn bản.');
  const [co,staff]=await Promise.all([g.LDAPI.company(),g.LDAPI.staff()]);
  let uid=row?.lienQuan?.uid||opts.prefill?.uid||'',cur=row;
  let per=await loadPerson(uid,opts.prefill?.hd);
  const rowYear=row?Number(String(row.ngay||'').slice(0,4))||year:year;
  const mkCtx=(docSo,docDate)=>({mode:'doc',docSo,docDate,co,emp:per.emp,hd:per.hd});
  const meta={huong:row?.huong||TPL_HUONG[tplId]||'NOI_BO',loai:row?.loai||TPL_LOAI[tplId]||'KHAC',trichYeu:row?.trichYeu||'',noiNhan:row?.noiNhan||'',nguoiKy:row?.nguoiKy||'',chucVuKy:row?.chucVuKy||'',doKhan:row?.doKhan||'THUONG'};
  root().innerHTML=`<div class="sechd"><div><h2>${e(row?'Văn bản: '+(row.so||row.trichYeu):'Soạn văn bản từ mẫu')}</h2><p class="muted">Mẫu: ${e(t0.name)}${t0.src?` · nguồn: ${e(t0.src)}`:''}</p></div><div class="sp"></div><button id="cv-back">← Quay lại</button></div><div id="cv-host"></div>`;
  $('#cv-back').onclick=()=>opts.back?opts.back():templates();
  const state0=row?.body?{f:row.body.f,ov:row.body.ov,groups:row.body.groups}:{};
  const extra=api=>{
   api.extraEl.innerHTML=`<details class="ldx-sec" open><summary>Đăng ký vào sổ công văn</summary><div class="fgrid"><label class="full">Nhân sự liên quan (điền sẵn thông tin từ hồ sơ &amp; hợp đồng)<select id="cv-uid"><option value="">— Không gắn nhân sự —</option>${staff.map(p=>`<option value="${e(p.id)}" ${p.id===uid?'selected':''}>${e(p.fullName||p.username)} (@${e(p.username)})</option>`).join('')}</select></label><label>Hướng<select id="cv-huong">${opt([['DI','Văn bản đi'],['NOI_BO','Nội bộ']],meta.huong)}</select></label><label>Loại<select id="cv-loai">${opt(LOAI,meta.loai)}</select></label><label class="full">Trích yếu *<input id="cv-ty" value="${e(meta.trichYeu)}" placeholder="VD: Quyết định tăng lương cho …"></label><label>Nơi nhận<input id="cv-nn" value="${e(meta.noiNhan)}"></label><label>Độ khẩn<select id="cv-dk">${opt([['THUONG','Thường'],['KHAN','Khẩn'],['THUONG_KHAN','Thượng khẩn'],['HOA_TOC','Hỏa tốc']],meta.doKhan)}</select></label><label>Người ký<input id="cv-nk" value="${e(meta.nguoiKy)}"></label><label>Chức vụ người ký<input id="cv-cv" value="${e(meta.chucVuKy)}"></label></div><p class="muted">${row?`Số văn bản: <b>${e(row.so||'')}</b>`:'Số văn bản được cấp tự động khi lưu vào sổ.'}</p></details>`;
   const el=api.extraEl;
   const sync=()=>{meta.huong=el.querySelector('#cv-huong').value;meta.loai=el.querySelector('#cv-loai').value;meta.trichYeu=el.querySelector('#cv-ty').value;meta.noiNhan=el.querySelector('#cv-nn').value;meta.doKhan=el.querySelector('#cv-dk').value;meta.nguoiKy=el.querySelector('#cv-nk').value;meta.chucVuKy=el.querySelector('#cv-cv').value};
   el.addEventListener('input',sync);
   el.querySelector('#cv-uid').onchange=async ev=>{
    if(Object.keys(api.getState().f).length&&!confirm('Đổi nhân sự sẽ điền lại các trường theo hồ sơ nhân sự mới (các giá trị đã nhập tay sẽ mất). Tiếp tục?')){ev.target.value=uid;return}
    uid=ev.target.value;per=await loadPerson(uid,uid===opts.prefill?.uid?opts.prefill?.hd:null);
    api.resetValues();api.setCtx(mkCtx(cur?.so||'',cur?.ngay||''));
   };
  };
  const doSave=async api=>{
   const T=g.LDDoc.tpl(api.tplId()),d=api.getDoc(),vals=d.vals;
   if(!String(meta.trichYeu).trim())throw Error('Cần nhập trích yếu để đăng ký sổ công văn');
   const ngay=vals.ngayKy;if(!/^\d{4}-\d{2}-\d{2}$/.test(ngay||''))throw Error('Cần nhập ngày ký / ban hành (mục Thông tin chung)');
   if(cur&&String(ngay).slice(0,4)!==String(rowYear))throw Error('Không đổi sang năm khác của văn bản đã vào sổ; hãy soạn văn bản mới.');
   const st=api.getState(),keep={};for(const k of T.fields)keep[k]=vals[k]??'';delete keep.so;   // chốt giá trị đã ban hành
   const input={...(cur||{}),huong:meta.huong,loai:meta.loai,ngay,trichYeu:meta.trichYeu.trim(),noiNhan:meta.noiNhan,nguoiKy:meta.nguoiKy||vals.aRep||'',chucVuKy:meta.chucVuKy||vals.aPos||'',doKhan:meta.doKhan,noiGui:co.name||'',lienQuan:{uid:uid||'',hd:per.hd?.id||cur?.lienQuan?.hd||''},body:{tpl:st.tpl,f:keep,ov:st.ov,groups:st.groups}};
   if(cur){input.id=cur.id;input.expectedUpdated=cur.updated}
   const y=Number(String(ngay).slice(0,4));
   const saved=await g.LDAPI.saveDocument(input,y);
   cur=saved;api.setCtx(mkCtx(saved.so,saved.ngay));
   await g.HRX.log('SAVE_LABOR_DOC_BODY',uid||null,`Lưu nội dung văn bản ${saved.so} từ mẫu ${st.tpl}`);
   api.setError(`Đã lưu vào sổ công văn — số ${saved.so||saved.stt}.`,true);
   return saved;
  };
  const actions=[{id:'save',label:'Lưu vào sổ công văn',cls:'pri',run:doSave}];
  for(const a of opts.extraActions||[])actions.push({id:a.id,label:a.label,cls:a.cls||'',run:async api=>{
   if(a.confirm&&!confirm(a.confirm))return;const saved=await doSave(api);await a.run(api,{cur:saved,vals:api.getDoc().vals,hd:per.hd});
  }});
  g.LDEditor.mount($('#cv-host'),{tplId,ctx:mkCtx(row?.so||'',row?.ngay||''),state:state0,
   templates:g.LDDoc.tpls().filter(x=>x.group!=='HDLD'&&!row).map(x=>({id:x.id,name:x.name})),
   extra,actions,
   onExport:(k,doc)=>g.HRX.log('EXPORT_LABOR_DOC_'+k,uid||null,'Xuất văn bản từ mẫu '+doc.tpl+' ('+k+')')});
 }

 /* ---------- thư viện mẫu ---------- */
 async function templates(){
  const r=root();if(!mgr())return noPerm('Bạn không có quyền soạn văn bản nghiệp vụ.');
  const GR=[['HDLD','Hợp đồng lao động','Soạn trong màn Hợp đồng lao động để lưu cùng hồ sơ hợp đồng, phụ cấp và số hợp đồng.'],['QD','Quyết định','Điền thông tin, chỉnh Điều khoản, xuất Word/PDF và đăng ký vào sổ công văn.'],['CV','Thông báo & giấy xác nhận','Mẫu chung do hệ thống cung cấp (không thuộc bộ hợp đồng mẫu).']];
  r.innerHTML=`<div class="sechd"><div><h2>Soạn văn bản từ mẫu</h2><p class="muted">Mỗi mẫu có nội dung, Điều khoản và các trường điền; xem trước A4 ngay khi nhập, chỉnh được từng Điều, xuất Word hoặc in/lưu PDF.</p></div><div class="sp"></div><button id="tp-reg">Sổ công văn</button></div>${GR.map(([k,n,h])=>`<h3>${e(n)}</h3><p class="muted">${e(h)}</p><div class="ldx-gal">${g.LDDoc.tpls().filter(t=>t.group===k).map(t=>`<div class="card ldx-card"><b>${e(t.name)}</b><small>${e(t.src||'Mẫu chung')}</small><small>${t.blocks.filter(b=>b.k==='art').length} Điều · ${t.fields.length} trường điền</small><button class="pri" data-t="${e(t.id)}">${k==='HDLD'?'Tạo hợp đồng':'Soạn văn bản'}</button></div>`).join('')}</div>`).join('')}`;
  $('#tp-reg').onclick=()=>{location.hash='/documents'};
  r.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{
   const t=g.LDDoc.tpl(b.dataset.t);
   if(t.group==='HDLD'){g.__ldNew={tpl:t.id};location.hash='/labor-contracts';g.ModHDLD?.render?.();return}
   compose({tplId:t.id,back:templates});
  });
 }

 /* ---------- sổ công văn ---------- */
 async function openBody(r){compose({tplId:r.body.tpl,row:r,back:render})}
 async function quick(r,kind){
  const L=g.LDDoc,b=r.body,t=L.tpl(b.tpl);if(!t)throw Error('Không tìm thấy mẫu của văn bản này');
  const doc={tpl:b.tpl,vals:L.values(t,{mode:'doc',docSo:r.so,docDate:r.ngay},b.f),ov:b.ov,groups:b.groups};
  if(kind==='docx'){download(L.toDocx(doc),`${L.slug(r.so||r.trichYeu)}.docx`);await g.HRX.log('EXPORT_LABOR_DOC_DOCX',r.lienQuan?.uid||null,'Xuất Word văn bản '+(r.so||''));return}
  const fr=document.createElement('iframe');fr.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';document.body.append(fr);
  fr.srcdoc=L.toHtml(doc,{title:r.so||r.trichYeu});fr.onload=()=>{fr.contentWindow.focus();fr.contentWindow.print();setTimeout(()=>fr.remove(),60000)};
  await g.HRX.log('EXPORT_LABOR_DOC_PDF',r.lienQuan?.uid||null,'In/PDF văn bản '+(r.so||''));
 }
 async function render(){
  if(!mgr())return noPerm('Bạn không có quyền xem sổ công văn.');
  rows=await g.LDAPI.listDocuments(year);
  root().innerHTML=`<div class="sechd"><h2>Sổ công văn</h2><div class="sp"></div><label>Năm <input id="dc-year" type="number" min="2000" max="2200" value="${year}" style="width:100px"></label><button id="dc-compose" class="pri">Soạn văn bản từ mẫu</button><button id="dc-add">Đăng ký văn bản đến</button><button id="dc-export">Xuất Excel</button></div><div class="bar"><input id="dc-q" placeholder="Tìm số, trích yếu, nơi gửi/nhận"></div><div class="card tbl-wrap"><table><thead><tr><th>STT</th><th>Số/ký hiệu</th><th>Ngày</th><th>Hướng</th><th>Nơi gửi/nhận</th><th>Trích yếu</th><th>Trạng thái</th><th></th></tr></thead><tbody id="dc-body"></tbody></table></div>`;
  const draw=()=>{
   const q=$('#dc-q').value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
   const list=rows.filter(r=>`${r.so} ${r.soDen} ${r.trichYeu} ${r.noiGui} ${r.noiNhan}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(q));
   $('#dc-body').innerHTML=list.map(r=>`<tr><td>${r.stt||''}</td><td>${e(r.so||r.soDen||'')}</td><td>${e(r.ngay)}</td><td>${e(HUONG[r.huong]||r.huong)}</td><td>${e(r.noiGui||r.noiNhan||'')}</td><td>${e(r.trichYeu)}${r.body?` <small class="tag slate">${e(g.LDDoc.tpl(r.body.tpl)?.name||'Soạn từ mẫu')}</small>`:''}</td><td>${e(TTX[r.xuLy?.tt]||'Mới')}${r.xuLy?.han?`<small> · hạn ${e(r.xuLy.han)}</small>`:''}</td><td class="acts">${r.body?`<button class="sm pri" data-open="${e(r.id)}">Mở văn bản</button><button class="sm" data-word="${e(r.id)}">Word</button><button class="sm" data-pdf="${e(r.id)}">PDF</button>`:''}${r.fileId?`<button class="sm" data-file="${e(r.fileId)}">Bản scan</button>`:''}<button class="sm" data-edit="${e(r.id)}">Thông tin</button><button class="sm bad" data-del="${e(r.id)}">Xóa</button></td></tr>`).join('')||'<tr><td colspan="8">Không có văn bản.</td></tr>';
   const B=$('#dc-body'),by=id=>rows.find(r=>r.id===id);
   B.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openBody(by(b.dataset.open)));
   B.querySelectorAll('[data-word]').forEach(b=>b.onclick=()=>quick(by(b.dataset.word),'docx').catch(x=>alert(x.message)));
   B.querySelectorAll('[data-pdf]').forEach(b=>b.onclick=()=>quick(by(b.dataset.pdf),'pdf').catch(x=>alert(x.message)));
   B.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(by(b.dataset.edit)));
   B.querySelectorAll('[data-file]').forEach(b=>b.onclick=async()=>{try{window.open(await g.HRX.fileUrl(b.dataset.file),'_blank')}catch(x){alert(x.message)}});
   B.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{if(confirm('Xóa văn bản này?')){await g.LDAPI.removeDocument(b.dataset.del,year);await render()}});
  };
  $('#dc-q').oninput=draw;$('#dc-year').onchange=async ev=>{year=Number(ev.target.value)||new Date().getFullYear();await render()};
  $('#dc-add').onclick=()=>edit(null);$('#dc-compose').onclick=()=>templates();$('#dc-export').onclick=()=>exp().catch(x=>alert(x.message));draw();
 }
 g.ModCongVan={render,templates,compose};
})(window);
