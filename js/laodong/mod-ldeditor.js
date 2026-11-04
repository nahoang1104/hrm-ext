/* Trình soạn văn bản nhân sự từ mẫu: trái = trường điền + Điều/khoản chỉnh được, phải = xem trước A4 trực tiếp.
   Dùng chung cho hợp đồng lao động, quyết định và sổ công văn. Không gọi API lưu: bên gọi truyền "actions". */
(function(g){
 'use strict';
 const L=()=>g.LDDoc,esc=s=>L().esc(s);
 const SEC={chung:'Thông tin chung',a:'Bên A – Người sử dụng lao động / đơn vị',b:'Bên B – Người lao động',hd:'Nội dung hợp đồng',qd:'Nội dung văn bản',pl:'Phụ lục mô tả công việc'};
 const SEC_OPEN={chung:1,b:1,hd:1,qd:1};
 let seq=0;
 const clone=o=>JSON.parse(JSON.stringify(o));

 /* ---- làm sạch HTML từ ô soạn thảo về tập thẻ cho phép ---- */
 function clean(html){
  return String(html||'').replace(/&nbsp;/g,' ').replace(/<\/?(div|p)[^>]*>/gi,'<br>')
   .replace(/<(\/?)(b)(\s[^>]*)?>/gi,'<$1strong>').replace(/<(\/?)(i)(\s[^>]*)?>/gi,'<$1em>')
   .replace(/<(?!\/?(strong|em|u|br)\b)[^>]*>/gi,'').replace(/<(strong|em|u)(\s[^>]*)?>/gi,'<$1>')
   .replace(/(<br>\s*)+$/i,'').replace(/^(\s*<br>)+/i,'').replace(/\s{2,}/g,' ').trim();
 }

 function rich(title,{x,i,tokens,withLevel}){
  return new Promise(res=>{
   const d=document.createElement('dialog');d.className='ldx-dlg';
   d.innerHTML=`<form method="dialog"><h3>${esc(title)}</h3><div class="ldx-tb"><button type="button" data-c="bold"><b>B</b></button><button type="button" data-c="italic"><i>I</i></button><button type="button" data-c="underline"><u>U</u></button>${withLevel?`<select data-lv><option value="0">Đoạn thường</option><option value="1">Thụt vào (khoản)</option><option value="2">Thụt sâu (điểm)</option></select>`:''}<select data-tok><option value="">Chèn trường điền…</option>${tokens.map(t=>`<option value="${esc(t.k)}">${esc(t.l)} {${esc(t.k)}}</option>`).join('')}</select></div><div class="ldx-ce" contenteditable="true" spellcheck="true">${x||''}</div><p class="muted">Chữ dạng <code>{tên_trường}</code> sẽ được thay bằng giá trị đã điền (ngày dùng <code>{ngayKy:d}</code> / <code>:m</code> / <code>:y</code>, số tiền bằng chữ dùng <code>:w</code>).</p><div class="row"><button type="button" data-no>Hủy</button><button class="pri" data-ok>Xong</button></div></form>`;
   document.body.append(d);d.showModal();
   const ce=d.querySelector('.ldx-ce'),lv=d.querySelector('[data-lv]');if(lv)lv.value=String(i||0);ce.focus();
   d.querySelectorAll('[data-c]').forEach(b=>b.onmousedown=ev=>{ev.preventDefault();document.execCommand(b.dataset.c)});
   d.querySelector('[data-tok]').onchange=ev=>{if(!ev.target.value)return;ce.focus();document.execCommand('insertText',false,'{'+ev.target.value+'}');ev.target.value=''};
   let out=null;
   d.querySelector('[data-no]').onclick=()=>d.close();
   d.querySelector('[data-ok]').onclick=ev=>{ev.preventDefault();out={x:clean(ce.innerHTML),i:lv?Number(lv.value):0};d.close()};
   d.onclose=()=>{d.remove();res(out)};
  });
 }

 function mount(host,opts){
  const t0=L().tpl(opts.tplId);if(!t0)throw Error('Không tìm thấy mẫu văn bản');
  const S={tplId:opts.tplId,ctx:opts.ctx||{},f:{...(opts.state?.f||{})},ov:clone(opts.state?.ov||{}),groups:{...(opts.state?.groups||{})}};
  const tpl=()=>L().tpl(S.tplId);
  const doc=()=>({tpl:S.tplId,vals:L().values(tpl(),S.ctx,S.f),ov:S.ov,groups:S.groups});
  host.innerHTML=`<div class="ldx"><div class="ldx-form"><div class="ldx-extra"></div><div class="ldx-tsel"></div><div class="ldx-fields"></div><div class="ldx-groups"></div><div class="ldx-content"></div></div><div class="ldx-prev"><div class="ldx-bar"><b class="ldx-name"></b><span class="sp"></span><button type="button" data-x="print">In / Lưu PDF</button><button type="button" data-x="docx">Tải Word (.docx)</button>${(opts.actions||[]).map(a=>`<button type="button" class="${a.cls||''}" data-a="${esc(a.id)}">${esc(a.label)}</button>`).join('')}</div><p class="err ldx-err"></p><iframe class="ldx-frame" title="Xem trước văn bản"></iframe></div></div>`;
  const q=s=>host.querySelector(s),frame=q('.ldx-frame');
  const err=(m,ok)=>{const el=q('.ldx-err');el.textContent=m||'';el.classList.toggle('ok',!!ok)};
  /* --- xem trước --- */
  let tm=null,lastY=0;
  const preview=()=>{
   clearTimeout(tm);tm=setTimeout(()=>{
    try{lastY=frame.contentWindow?.scrollY||lastY}catch{}
    frame.onload=()=>{try{frame.contentWindow.scrollTo(0,lastY)}catch{}};
    frame.srcdoc=L().toHtml(doc(),{title:tpl().name});updateBadges();
   },120);
  };
  const changed=()=>{opts.onChange?.(api.getState());preview()};
  /* --- chọn mẫu --- */
  function drawTsel(){
   const el=q('.ldx-tsel'),list=opts.templates||[];
   if(list.length<2){el.innerHTML='';return}
   el.innerHTML=`<label>Mẫu văn bản<select>${list.map(t=>`<option value="${esc(t.id)}" ${t.id===S.tplId?'selected':''}>${esc(t.name)}</option>`).join('')}</select></label>`;
   el.querySelector('select').onchange=ev=>{
    const hasEdit=Object.keys(S.ov||{}).length;
    if(hasEdit&&!confirm('Đổi mẫu sẽ bỏ các chỉnh sửa Điều/khoản đã làm trên mẫu hiện tại. Tiếp tục?')){ev.target.value=S.tplId;return}
    S.tplId=ev.target.value;S.ov={};S.groups={};drawAll();changed();
   };
  }
  /* --- trường điền --- */
  const rsLink=k=>` <a href="#" class="ldx-rs" data-rs="${esc(k)}" title="Quay lại giá trị tự điền">↺</a>`;
  function fieldHtml(k){
   const d=L().FIELDS[k],v=L().values(tpl(),S.ctx,S.f)[k]??'',auto=L().auto(k,S.ctx),over=S.f[k]!==undefined&&String(S.f[k])!==auto;
   const common=`data-k="${esc(k)}" placeholder="${esc(d.h||'')}"`;
   const inp=d.t==='area'?`<textarea ${common} rows="2">${esc(v)}</textarea>`:d.t==='date'?`<input type="date" ${common} value="${esc(v)}">`:d.t==='money'?`<input type="text" inputmode="numeric" ${common} value="${esc(v)}">`:`<input type="text" ${common} value="${esc(v)}">`;
   return `<label class="${d.t==='area'?'full':''}">${esc(d.l)}<span class="ldx-rsw">${over?rsLink(k):''}</span>${inp}</label>`;
  }
  function drawFields(){
   const was={};q('.ldx-fields').querySelectorAll('.ldx-sec').forEach(d=>{was[d.dataset.s]=d.open});
   const t=tpl(),by={};for(const k of t.fields){const s=L().FIELDS[k]?.s||'hd';(by[s]=by[s]||[]).push(k)}
   q('.ldx-fields').innerHTML=Object.keys(SEC).filter(s=>by[s]).map(s=>`<details class="ldx-sec" data-s="${s}" ${(was[s]!==undefined?was[s]:SEC_OPEN[s])?'open':''}><summary>${esc(SEC[s])} <small class="ldx-badge"></small></summary><div class="fgrid">${by[s].map(fieldHtml).join('')}</div></details>`).join('');
   q('.ldx-fields').querySelectorAll('[data-k]').forEach(el=>{
    el.oninput=()=>{
     const k=el.dataset.k,d=L().FIELDS[k];let v=el.value;
     if(d.t==='money')v=v.replace(/[^\d]/g,'');
     const auto=L().auto(k,S.ctx);
     if(String(v)===auto)delete S.f[k];else S.f[k]=v;
     const w=el.closest('label')?.querySelector('.ldx-rsw');if(w)w.innerHTML=S.f[k]!==undefined?rsLink(k):'';
     changed();
    };
   });
   q('.ldx-fields').onclick=ev=>{const a=ev.target.closest('[data-rs]');if(!a)return;ev.preventDefault();delete S.f[a.dataset.rs];drawFields();changed()};
  }
  function updateBadges(){
   const vals=L().values(tpl(),S.ctx,S.f);
   host.querySelectorAll('.ldx-sec').forEach(sec=>{
    const miss=[...sec.querySelectorAll('[data-k]')].filter(el=>!String(vals[el.dataset.k]??'').trim()).length;
    const b=sec.querySelector('.ldx-badge');if(b){b.textContent=miss?`· ${miss} chưa điền`:'';b.className='ldx-badge'+(miss?' warn':'')}
   });
  }
  function drawGroups(){
   const gs=tpl().groups||[];
   q('.ldx-groups').innerHTML=gs.map(x=>`<label class="ldx-chk"><input type="checkbox" data-g="${esc(x.k)}" ${(S.groups[x.k]??!!x.on)?'checked':''}> ${esc(x.label)}</label>`).join('');
   q('.ldx-groups').querySelectorAll('[data-g]').forEach(c=>c.onchange=()=>{S.groups[c.dataset.g]=c.checked;drawContent();changed()});
  }
  /* --- nội dung: Điều / khoản --- */
  const tokens=()=>tpl().fields.map(k=>({k,l:L().FIELDS[k].l}));
  const newId=()=>'n'+Date.now().toString(36)+(++seq);
  const setBlk=(id,blk)=>{if(id[0]==='n'){const a=(S.ov.add||[]).find(x=>x.id===id);if(a)a.blk=blk}else{(S.ov.m=S.ov.m||{})[id]=blk}};
  const delBlk=id=>{if(id[0]==='n')S.ov.add=(S.ov.add||[]).filter(x=>x.id!==id);else(S.ov.del=S.ov.del||[]).push(id)};
  const addAfter=(id,blk)=>{(S.ov.add=S.ov.add||[]).push({after:id[0]==='n'?((S.ov.add.find(x=>x.id===id)||{}).after||''):id,id:newId(),blk})};
  const sum=h=>{const s=L().strip(L().fill(h,L().values(tpl(),S.ctx,S.f))).replace(/\s+/g,' ');return s.length>110?s.slice(0,108)+'…':s};
  function drawContent(){
   const bl=L().blocks(tpl(),S.ov,S.groups),segs=[];
   for(const b of bl){
    if(b.k==='art')segs.push({art:b});
    else if(b.k==='p'){const last=segs[segs.length-1];if(last&&last.ps)last.ps.push(b);else segs.push({ps:[b]})}
   }
   const rowP=(b,aid,pi,item,total)=>`<div class="ldx-row"><span class="txt${item.i?' lv'+item.i:''}">${esc(sum(item.x))||'<i>(trống)</i>'}</span><span class="ops"><button type="button" data-op="edit" data-b="${esc(b.id)}" data-p="${pi}" title="Sửa nội dung">✎</button><button type="button" data-op="up" data-b="${esc(b.id)}" data-p="${pi}" ${pi===0?'disabled':''} title="Lên">↑</button><button type="button" data-op="down" data-b="${esc(b.id)}" data-p="${pi}" ${pi===total-1?'disabled':''} title="Xuống">↓</button><button type="button" data-op="add" data-b="${esc(b.id)}" data-p="${pi}" title="Thêm khoản bên dưới">＋</button><button type="button" data-op="del" data-b="${esc(b.id)}" data-p="${pi}" title="Xóa khoản">🗑</button></span></div>`;
   const html=segs.map((s,si)=>{
    if(s.art){const b=s.art;return `<details class="ldx-art"><summary><input class="ldx-h" data-h="${esc(b.id)}" value="${esc(b.h)}"><span class="ldx-n" title="Mở / đóng các khoản">${b.p.length} khoản ▾</span><button type="button" class="sm bad" data-op="delart" data-b="${esc(b.id)}" title="Xóa cả Điều">Xóa Điều</button></summary>${b.p.map((it,pi)=>rowP(b,b.id,pi,it,b.p.length)).join('')}<button type="button" class="sm" data-op="addp" data-b="${esc(b.id)}">＋ Thêm khoản</button></details>`}
    return `<details class="ldx-art ldx-pg"><summary><b>${si===0?'Phần đầu văn bản (quốc hiệu, căn cứ, các bên)':'Đoạn văn khác'}</b> <small>${s.ps.length} đoạn</small></summary>${s.ps.map(b=>`<div class="ldx-row"><span class="txt">${esc(sum(b.x))||'<i>(trống)</i>'}</span><span class="ops"><button type="button" data-op="editp" data-b="${esc(b.id)}" title="Sửa">✎</button><button type="button" data-op="addpp" data-b="${esc(b.id)}" title="Thêm đoạn bên dưới">＋</button><button type="button" data-op="delp" data-b="${esc(b.id)}" title="Xóa đoạn">🗑</button></span></div>`).join('')}</details>`;
   }).join('');
   const lastArt=[...bl].reverse().find(b=>b.k==='art');
   q('.ldx-content').innerHTML=`<h4>Nội dung &amp; các Điều khoản</h4><p class="muted">Bấm vào từng Điều để sửa, thêm, xóa hoặc đổi thứ tự khoản. Chỉnh sửa chỉ áp dụng cho văn bản này, không đổi mẫu gốc.</p>${html}<div class="bar"><button type="button" class="sm" data-op="newart" ${lastArt?`data-b="${esc(lastArt.id)}"`:''}>＋ Thêm Điều</button><span class="sp"></span><button type="button" class="sm" data-op="reset">Khôi phục mẫu gốc</button></div>`;
  }
  async function onOp(ev){
   const bt=ev.target.closest('[data-op]');if(!bt)return;
   const op=bt.dataset.op,id=bt.dataset.b,pi=Number(bt.dataset.p);
   const cur=()=>L().blocks(tpl(),S.ov,S.groups).find(b=>b.id===id);
   const keepOpen=()=>[...host.querySelectorAll('.ldx-content details')].map(d=>d.open);
   const restore=o=>host.querySelectorAll('.ldx-content details').forEach((d,i)=>{if(o[i])d.open=true});
   const redraw=()=>{const o=keepOpen();drawContent();restore(o);changed()};
   if(op==='reset'){if(confirm('Bỏ mọi chỉnh sửa nội dung/Điều khoản và quay lại mẫu gốc?')){S.ov={};drawContent();changed()}return}
   if(op==='newart'){const n=L().blocks(tpl(),S.ov,S.groups).filter(b=>b.k==='art').length+1;addAfter(id||'',{k:'art',h:'Điều '+n+'. Nội dung mới',p:[{x:'Nội dung điều khoản.'}]});const o=keepOpen();drawContent();restore(o);changed();return}
   const b=cur();if(!b)return;
   if(op==='delart'){if(confirm('Xóa cả Điều này khỏi văn bản?')){delBlk(id);redraw()}return}
   if(op==='delp'){delBlk(id);redraw();return}
   if(op==='editp'){const r=await rich('Sửa đoạn văn',{x:b.x,i:b.i,tokens:tokens(),withLevel:true});if(r){setBlk(id,{...b,id:undefined,x:r.x,i:r.i||undefined});redraw()}return}
   if(op==='addpp'){addAfter(id,{k:'p',x:'Nội dung mới.'});redraw();return}
   if(b.k!=='art')return;
   const nb={...b};delete nb.id;nb.p=b.p.map(x=>({...x}));
   if(op==='addp'){nb.p.push({x:'Nội dung khoản mới.'});setBlk(id,nb);redraw();return}
   if(op==='edit'){const it=nb.p[pi],r=await rich('Sửa khoản – '+b.h,{x:it.x,i:it.i,tokens:tokens(),withLevel:true});if(r){nb.p[pi]={x:r.x,...(r.i?{i:r.i}:{})};setBlk(id,nb);redraw()}return}
   if(op==='add'){nb.p.splice(pi+1,0,{x:'Nội dung khoản mới.'});setBlk(id,nb);redraw();return}
   if(op==='del'){nb.p.splice(pi,1);setBlk(id,nb);redraw();return}
   if(op==='up'&&pi>0){[nb.p[pi-1],nb.p[pi]]=[nb.p[pi],nb.p[pi-1]];setBlk(id,nb);redraw();return}
   if(op==='down'&&pi<nb.p.length-1){[nb.p[pi+1],nb.p[pi]]=[nb.p[pi],nb.p[pi+1]];setBlk(id,nb);redraw()}
  }
  q('.ldx-content').addEventListener('click',onOp);
  q('.ldx-content').addEventListener('input',ev=>{
   const h=ev.target.closest('[data-h]');if(!h)return;
   const b=L().blocks(tpl(),S.ov,S.groups).find(x=>x.id===h.dataset.h);if(!b)return;
   const nb={...b,h:h.value};delete nb.id;setBlk(h.dataset.h,nb);changed();
  });
  q('.ldx-content').addEventListener('click',ev=>{if(ev.target.closest('.ldx-h')||ev.target.closest('summary button'))ev.preventDefault()},true);
  q('.ldx-content').addEventListener('keyup',ev=>{if(ev.target.closest('.ldx-h')&&ev.key===' ')ev.preventDefault()},true);
  function drawAll(){q('.ldx-name').textContent=tpl().name;drawTsel();drawFields();drawGroups();drawContent();preview()}
  /* --- xuất --- */
  const fname=ext=>`${L().slug(tpl().name)}-${L().slug(L().values(tpl(),S.ctx,S.f).bName||'')}.${ext}`.replace(/-\./,'.');
  host.addEventListener('click',async ev=>{
   const x=ev.target.closest('[data-x]'),a=ev.target.closest('[data-a]');
   try{
    if(x?.dataset.x==='print'){err('');try{frame.contentWindow.focus();frame.contentWindow.print()}catch(e){err('Trình duyệt chặn in: '+e.message)}await opts.onExport?.('PDF',doc());return}
    if(x?.dataset.x==='docx'){err('');const blob=L().toDocx(doc()),url=URL.createObjectURL(blob),el=document.createElement('a');el.href=url;el.download=fname('docx');document.body.append(el);el.click();el.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);await opts.onExport?.('DOCX',doc());return}
    if(a){err('');const act=(opts.actions||[]).find(z=>z.id===a.dataset.a);a.disabled=true;try{await act.run(api)}finally{a.disabled=false}}
   }catch(e){err(e.message)}
  });
  const api={
   el:host,getDoc:doc,getState:()=>({tpl:S.tplId,f:{...S.f},ov:L().slimOv(tpl(),S.ov),groups:{...S.groups}}),
   setCtx(c){S.ctx=c;drawFields();preview()},setError:err,resetValues(){S.f={};drawFields();preview()},tplId:()=>S.tplId,
   setTemplate(id){S.tplId=id;S.ov={};S.groups={};drawAll()},
   extraEl:q('.ldx-extra'),refresh:preview,fileName:fname
  };
  if(opts.extra)opts.extra(api);
  drawAll();
  return api;
 }
 g.LDEditor={mount,clean};
})(window);
