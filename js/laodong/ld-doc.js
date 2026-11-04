/* Engine văn bản nhân sự dùng chung (HĐLĐ, quyết định, công văn): mẫu có Điều/khoản + trường điền,
   ghi đè nội dung theo từng khối, dựng HTML xem trước/in và file Word. Hàm thuần, không đụng DOM/Store. */
(function(g){
 'use strict';
 if(!g.LD_TEMPLATES&&typeof require!=='undefined')require('./ld-templates.js');
 const DATA=g.LD_TEMPLATES||{fields:{},list:[]};
 const FIELDS=DATA.fields,LIST=DATA.list;
 const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const unesc=s=>String(s).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
 const strip=h=>unesc(String(h??'').replace(/<br\s*\/?>/gi,' ').replace(/<[^>]+>/g,''));
 const ISO=/^(\d{4})-(\d{2})-(\d{2})$/;

 /* ---------- đọc số thành chữ ---------- */
 const D=['không','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
 function three(n,full){
  const h=Math.floor(n/100),t=Math.floor(n%100/10),u=n%10,o=[];
  if(h||full)o.push(D[h]+' trăm');
  if(t>1){o.push(D[t]+' mươi');if(u===1)o.push('mốt');else if(u===5)o.push('lăm');else if(u)o.push(D[u])}
  else if(t===1){o.push('mười');if(u===5)o.push('lăm');else if(u)o.push(D[u])}
  else if(u){if(h||full)o.push('lẻ');o.push(D[u])}
  return o.join(' ');
 }
 function numWords(n){
  n=Math.round(num(n));if(n<0)return '';if(n===0)return 'Không';
  const U=['','nghìn','triệu','tỷ','nghìn tỷ','triệu tỷ'],gs=[];
  while(n>0){gs.push(n%1000);n=Math.floor(n/1000)}
  const parts=[];let started=false;
  for(let k=gs.length-1;k>=0;k--){
   if(gs[k]===0)continue;
   parts.push((three(gs[k],started)+' '+U[k]).trim());started=true;
  }
  const s=parts.join(' ').replace(/\s+/g,' ').trim();
  return s.charAt(0).toUpperCase()+s.slice(1);
 }

 /* ---------- nguồn tự điền ---------- */
 const months=(a,b)=>{
  const x=ISO.exec(a||''),y=ISO.exec(b||'');if(!x||!y)return '';
  const e=new Date(Date.UTC(+y[1],+y[2]-1,+y[3]+1));            // ngày kết thúc tính gộp
  let m=(e.getUTCFullYear()-x[1])*12+(e.getUTCMonth()+1-x[2]);if(e.getUTCDate()<+x[3])m--;
  return m>0?String(m):'';
 };
 const LOAI={XD_THOI_HAN:'xác định thời hạn',KXD_THOI_HAN:'không xác định thời hạn',THU_VIEC:'thử việc'};
 const pc=(hd,re)=>{const l=(hd?.phuCap||[]).filter(p=>re.test(String(p.ten||'')));return l.length?String(l.reduce((s,p)=>s+num(p.so),0)):''};
 const FN={
  thang:c=>months(c.hd?.tu,c.hd?.den),
  loaiHD:c=>LOAI[c.hd?.loai]||'',
  pcAn:c=>pc(c.hd,/(^|\s)ăn(\s|$)|cơm/i),pcDiLai:c=>pc(c.hd,/đi lại|xăng|xe/i),pcTrachNhiem:c=>pc(c.hd,/trách nhiệm/i),
  tuNgay:c=>c.hd?.chamDut?.ngay||''
 };
 const path=(o,p)=>p.split('.').reduce((x,k)=>x==null?x:x[k],o);
 function auto(key,ctx){
  const def=FIELDS[key];if(!def)return '';
  let v='';
  if(ctx&&ctx.mode==='doc'&&(key==='so'||key==='ngayKy')){      // văn bản ban hành: số = số trong sổ công văn, ngày = ngày ban hành
   return key==='so'?String(ctx.docSo||''):String(ctx.docDate||new Date().toISOString().slice(0,10));
  }
  if(def.src){v=def.src.startsWith('fn.')?(FN[def.src.slice(3)]?.(ctx||{})??''):path(ctx||{},def.src)}
  if(v==null||v==='')v=def.d||'';
  return String(v);
 }

 /* ---------- mẫu / khối ---------- */
 const tpls=()=>LIST;
 const tpl=id=>LIST.find(t=>t.id===id)||null;
 const bid=i=>'b'+i;
 /* Khối hiệu lực = mẫu + ghi đè. ov={m:{id:khối},del:[id],add:[{after,id,blk}]} ; groups={annex:true/false} */
 function blocks(t,ov,groups){
  const o=ov||{},m=o.m||{},del=new Set(o.del||[]),add=o.add||[],out=[];
  const gOn=k=>groups&&groups[k]!==undefined?!!groups[k]:!!(t.groups||[]).find(x=>x.k===k)?.on;
  const push=(b,id)=>{if(b.g&&!gOn(b.g))return;out.push({...b,id})};
  add.filter(a=>!a.after).forEach(a=>push(a.blk,a.id));
  t.blocks.forEach((b,i)=>{
   const id=bid(i);
   if(!del.has(id))push(m[id]||b,id);
   add.filter(a=>a.after===id).forEach(a=>push(a.blk,a.id));
  });
  return out;
 }
 /* Tự xác định khối nào thật sự khác mẫu (để lưu gọn). */
 const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 function slimOv(t,ov){
  if(!ov)return null;
  const m={};for(const [id,b] of Object.entries(ov.m||{})){const i=Number(id.slice(1));if(!same(b,t.blocks[i]))m[id]=b}
  const r={};if(Object.keys(m).length)r.m=m;if((ov.del||[]).length)r.del=[...new Set(ov.del)];if((ov.add||[]).length)r.add=ov.add;
  return Object.keys(r).length?r:null;
 }

 /* ---------- điền trường ---------- */
 const dmy=v=>{const m=ISO.exec(String(v||''));return m?`${m[3]}/${m[2]}/${m[1]}`:String(v||'')};
 const grp=n=>Math.round(num(n)).toLocaleString('vi-VN');
 const DOTS='..............';
 /* Giá trị hiển thị của {k} / {k:d|m|y|w}; rỗng -> null (để vẽ dấu chấm). */
 function tokenValue(key,mod,vals){
  const raw=vals[key]??'';if(raw===''||raw==null)return null;
  const type=FIELDS[key]?.t||'text';
  if(mod==='d'||mod==='m'||mod==='y'){const m=ISO.exec(raw);return m?(mod==='d'?m[3]:mod==='m'?m[2]:m[1]):null}
  if(mod==='w'){const w=numWords(raw);return w||null}
  if(type==='date')return dmy(raw);
  if(type==='money'&&Number.isFinite(Number(raw)))return grp(raw);
  return String(raw);
 }
 /* fill: thay token; html=true -> escape giá trị (giữ thẻ của mẫu) */
 function fill(text,vals,o={}){
  const html=o.html!==false;
  text=String(text??'');
  /* Mẫu viết "Công ty {aName}" nhưng tên pháp lý thường đã bắt đầu bằng "Công ty …": bỏ chữ thừa */
  if(/^công ty\b/i.test(String((vals||{}).aName||'')))text=text.replace(/(công ty|Công ty|CÔNG TY)\s+\{aName\}/g,'{aName}');
  return String(text).replace(/\{([A-Za-z0-9]+)(?::([dmyw]))?\}/g,(s,k,mod)=>{
   if(!(k in FIELDS))return s;
   const v=tokenValue(k,mod,vals||{});
   if(v==null)return o.empty??DOTS;
   const out=html?esc(v).replace(/\n/g,'<br>'):v;
   return out;
  });
 }
 const tokensIn=s=>[...String(s||'').matchAll(/\{([A-Za-z0-9]+)(?::[dmyw])?\}/g)].map(m=>m[1]);
 const OPT_KEYS=['aAuthNo','aAuthDate','aAuthBy'];
 /* Dòng ủy quyền chỉ hiện khi có nhập */
 const hidden=(b,vals)=>{
  const txt=JSON.stringify(b);
  if(!OPT_KEYS.some(k=>txt.includes('{'+k)))return false;
  return !OPT_KEYS.some(k=>String(vals[k]||'').trim());
 };

 /* Giá trị hiệu lực cho mọi trường của mẫu: f (người dùng nhập) đè lên tự điền. */
 function values(t,ctx,f){
  const v={},ff=f||{};
  const keys=new Set(t.fields);
  for(const b of t.blocks)for(const k of tokensIn(JSON.stringify(b)))keys.add(k);
  for(const k of keys){v[k]=ff[k]!==undefined?String(ff[k]):auto(k,ctx)}
  return v;
 }

 /* ---------- HTML ---------- */
 const lvl=i=>i?` i${i}`:'';
 const ALIGN={c:'center',r:'right',l:'left',j:'justify'};
 function pHtml(b,vals){
  const st=[];if(b.sz)st.push(`font-size:${b.sz}pt`);if(b.sp)st.push(`margin-top:${b.sp}pt`);
  return `<p class="${b.a||'j'}${lvl(b.i)}"${st.length?` style="${st.join(';')}"`:''}>${fill(b.x,vals)}</p>`;
 }
 function signHtml(b,vals){
  return `<table class="sig"><tr>${b.cols.map(c=>`<td><b>${fill(c.h,vals)}</b>${(c.n||[]).map(n=>`<br><i>${esc(n)}</i>`).join('')}<div class="sp"></div><b>${fill(c.v,vals)}</b></td>`).join('')}</tr></table>`;
 }
 const dateLine=v=>`${fill('{noiKy}',v,{empty:'…………'})}, ngày ${fill('{ngayKy:d}',v,{empty:'…'})} tháng ${fill('{ngayKy:m}',v,{empty:'…'})} năm ${fill('{ngayKy:y}',v,{empty:'……'})}`;
 const coHead=v=>{const n=String(v.aName||'').trim();return n?(/^công ty\b/i.test(n)?n:'CÔNG TY '+n).toUpperCase():'CÔNG TY ……………'};
 function headHtml(vals){
  return `<table class="qh"><tr><td class="l"><b>${esc(coHead(vals))}</b><br>———<br>Số: ${fill('{so}',vals)}</td><td class="r"><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><br><b><u>Độc lập - Tự do - Hạnh phúc</u></b><br><i>${dateLine(vals)}</i></td></tr></table>`;
 }
 function footHtml(b,vals){
  return `<table class="qf"><tr><td class="l"><b><i>Nơi nhận:</i></b>${b.nn.map(n=>`<br>- ${fill(n,vals)}`).join('')}</td><td class="r"><b>${fill(b.h,vals)}</b><br><i>${esc(b.n||'')}</i><div class="sp"></div></td></tr></table>`;
 }
 function blockHtml(b,vals){
  switch(b.k){
   case 'p':return pHtml(b,vals);
   case 'art':return `<p class="h j">${fill(b.h,vals)}</p>`+b.p.map(q=>`<p class="j${lvl(q.i)}">${fill(q.x,vals)}</p>`).join('');
   case 'sign':return signHtml(b,vals);
   case 'qdhead':return headHtml(vals);
   case 'qdfoot':return footHtml(b,vals);
   default:return '';
  }
 }
 const CSS=`*{box-sizing:border-box}body{margin:0;font:13pt/1.32 "Times New Roman",Times,serif;color:#000}
p{margin:0 0 5pt}.c{text-align:center}.r{text-align:right}.l{text-align:left}.j{text-align:justify}.i1{padding-left:9mm}.i2{padding-left:18mm}
p.h{font-weight:700;margin-top:7pt;page-break-after:avoid}
table{width:100%;border-collapse:collapse}td{vertical-align:top;padding:0}
.sig td{text-align:center;width:50%;padding-top:6pt}.sp{height:24mm}
.qh td,.qf td{width:50%;text-align:center;padding-bottom:6pt}.qf td.l{text-align:left;font-size:11pt}.qf{margin-top:8pt;page-break-inside:avoid}.sig{page-break-inside:avoid;margin-top:8pt}
@media screen{body{background:#e6e8ee;padding:10px}.sheet{width:210mm;max-width:100%;min-height:297mm;margin:0 auto 12px;padding:22mm 18mm 22mm 25mm;background:#fff;box-shadow:0 1px 5px rgba(0,0,0,.25)}}
@media print{@page{size:A4;margin:22mm 18mm 22mm 25mm}.sheet{padding:0;margin:0;box-shadow:none;page-break-after:always}.sheet:last-child{page-break-after:auto}}`;
 /* doc = {tpl, vals(effective), ov, groups}; trả về HTML hoàn chỉnh */
 function toHtml(doc,o={}){
  const t=typeof doc.tpl==='string'?tpl(doc.tpl):doc.tpl;
  const vals=doc.vals,bl=blocks(t,doc.ov,doc.groups),sheets=[[]];
  for(const b of bl){
   if(b.k==='pb'){sheets.push([]);continue}
   if(hidden(b,vals))continue;
   sheets[sheets.length-1].push(blockHtml(b,vals));
  }
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${esc(o.title||t.name)}</title><style>${CSS}</style></head><body>${sheets.filter(s=>s.length).map(s=>`<div class="sheet">${s.join('')}</div>`).join('')}</body></html>`;
 }
 /* Văn bản thuần (dùng kiểm thử và đối chiếu mẫu gốc) */
 function toPlain(doc){
  const t=typeof doc.tpl==='string'?tpl(doc.tpl):doc.tpl,vals=doc.vals,out=[];
  for(const b of blocks(t,doc.ov,doc.groups)){
   if(hidden(b,vals))continue;
   const f=s=>strip(fill(s,vals));
   if(b.k==='p')out.push(f(b.x));
   else if(b.k==='art'){out.push(f(b.h));b.p.forEach(q=>out.push(f(q.x)))}
   else if(b.k==='sign')b.cols.forEach(c=>{out.push(f(c.h));(c.n||[]).forEach(n=>out.push(n));out.push(f(c.v))});
   else if(b.k==='qdfoot'){out.push('Nơi nhận:');b.nn.forEach(n=>out.push('- '+f(n)));out.push(f(b.h));out.push(b.n||'')}
   else if(b.k==='qdhead')out.push(coHead(vals),'Số: '+f('{so}'),'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM','Độc lập - Tự do - Hạnh phúc',strip(dateLine(vals)));
  }
  return out;
 }

 /* ---------- Word ---------- */
 const X=s=>String(s??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 /* HTML nhẹ (strong/em/u/br + entity) -> các run */
 function runs(html,base={}){
  const out=[],st={b:!!base.b,i:!!base.i,u:!!base.u};
  const rp=()=>`<w:rPr>${st.b?'<w:b/>':''}${st.i?'<w:i/>':''}${st.u?'<w:u w:val="single"/>':''}${base.sz?`<w:sz w:val="${base.sz*2}"/><w:szCs w:val="${base.sz*2}"/>`:''}</w:rPr>`;
  for(const part of String(html).split(/(<\/?(?:strong|b|em|i|u)>|<br\s*\/?>)/i)){
   if(!part)continue;
   const tg=/^<(\/?)(strong|b|em|i|u)>$/i.exec(part);
   if(tg){const on=!tg[1],k=tg[2].toLowerCase();if(k==='strong'||k==='b')st.b=on||!!base.b;else if(k==='em'||k==='i')st.i=on||!!base.i;else st.u=on||!!base.u;continue}
   if(/^<br/i.test(part)){out.push(`<w:r>${rp()}<w:br/></w:r>`);continue}
   const t=unesc(part.replace(/<[^>]+>/g,''));if(t)out.push(`<w:r>${rp()}<w:t xml:space="preserve">${X(t)}</w:t></w:r>`);
  }
  return out.join('');
 }
 function wp(html,o={}){
  const ind=o.lv===2?1134:o.lv===1?567:0;
  return `<w:p><w:pPr>${o.keep?'<w:keepNext/>':''}<w:spacing w:before="${o.before||0}" w:after="${o.after??100}" w:line="${o.line||300}" w:lineRule="auto"/>${ind?`<w:ind w:left="${ind}"/>`:''}<w:jc w:val="${ALIGN[o.a||'j']==='justify'?'both':ALIGN[o.a||'j']}"/></w:pPr>${runs(html,o)}</w:p>`;
 }
 const NB='<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>';
 const tc=(w,inner)=>`<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/></w:tcPr>${inner}</w:tc>`;
 const tbl=(w1,w2,c1,c2)=>`<w:tbl><w:tblPr><w:tblW w:w="${w1+w2}" w:type="dxa"/>${NB}<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="${w1}"/><w:gridCol w:w="${w2}"/></w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>${tc(w1,c1)}${tc(w2,c2)}</w:tr></w:tbl>`;
 const W=9900;
 function blockXml(b,vals){
  const f=s=>fill(s,vals);
  switch(b.k){
   case 'p':return wp(f(b.x),{a:b.a,lv:b.i,sz:b.sz,before:b.sp?b.sp*20:0});
   case 'art':return wp('<strong>'+f(b.h)+'</strong>',{keep:1,before:120,a:'j'})+b.p.map(q=>wp(f(q.x),{lv:q.i})).join('');
   case 'sign':{
    const w=Math.floor(W/b.cols.length);
    const cell=c=>wp('<strong>'+f(c.h)+'</strong>',{a:'c',after:0})+(c.n||[]).map(n=>wp('<em>'+X(n)+'</em>',{a:'c',after:0}))+wp('',{after:1500})+wp('<strong>'+f(c.v)+'</strong>',{a:'c',after:0});
    return `<w:tbl><w:tblPr><w:tblW w:w="${W}" w:type="dxa"/>${NB}<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${b.cols.map(()=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>${b.cols.map(c=>tc(w,cell(c))).join('')}</w:tr></w:tbl>`+wp('',{after:60});
   }
   case 'qdhead':{
    const l=wp('<strong>'+X(coHead(vals))+'</strong>',{a:'c',after:0})+wp('———',{a:'c',after:0})+wp('Số: '+fill('{so}',vals),{a:'c',after:0});
    const r=wp('<strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong>',{a:'c',after:0})+wp('<strong><u>Độc lập - Tự do - Hạnh phúc</u></strong>',{a:'c',after:0})+wp('<em>'+dateLine(vals)+'</em>',{a:'c',after:0});
    return tbl(4300,5600,l,r)+wp('',{after:60});
   }
   case 'qdfoot':{
    const l=wp('<strong><em>Nơi nhận:</em></strong>',{a:'l',after:0,keep:1})+b.nn.map(n=>wp('- '+f(n),{a:'l',after:0,sz:11})).join('');
    const r=wp('<strong>'+f(b.h)+'</strong>',{a:'c',after:0})+wp('<em>'+X(b.n||'')+'</em>',{a:'c',after:0})+wp('',{after:1400});
    return tbl(5000,4900,l,r);
   }
   case 'pb':return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
   default:return '';
  }
 }
 const CT='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>';
 const RELS='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
 const DRELS='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>';
 const STYLES='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:szCs w:val="26"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>';
 const FOOTER='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>';
 function toDocx(doc){
  const t=typeof doc.tpl==='string'?tpl(doc.tpl):doc.tpl,vals=doc.vals;
  const body=blocks(t,doc.ov,doc.groups).filter(b=>!hidden(b,vals)).map(b=>blockXml(b,vals)).join('');
  const xml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${body}<w:sectPr><w:footerReference w:type="default" r:id="rId2"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1247" w:right="1021" w:bottom="1247" w:left="1417" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  return g.ZipUtil.build([{name:'[Content_Types].xml',data:CT},{name:'_rels/.rels',data:RELS},{name:'word/document.xml',data:xml},{name:'word/_rels/document.xml.rels',data:DRELS},{name:'word/styles.xml',data:STYLES},{name:'word/footer1.xml',data:FOOTER}],'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
 }
 const slug=s=>String(s||'van-ban').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').replace(/[^A-Za-z0-9]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase().slice(0,60)||'van-ban';

 const api={FIELDS,tpls,tpl,auto,values,blocks,slimOv,fill,tokensIn,tokenValue,numWords,hidden,toHtml,toPlain,toDocx,esc,strip,slug,dmy,CSS};
 g.LDDoc=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
