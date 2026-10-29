/*
 * docx-builder.js — Xuất hợp đồng ra file Word (.docx)
 *
 * - Không cần thư viện ngoài (tự dựng WordprocessingML + gói ZIP "store").
 * - Dùng chung dữ liệu `c` và các hàm của app.core.js (calc, vnd, money, fmtPct,
 *   isRich, cleanLines) nên số liệu / quy tắc giống hệt bản xem trước & xuất HTML.
 * - Cách dùng:  const blob = buildDocx(c);   // Blob .docx
 */
window.DOCX_MIME='application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/*
 * Đo trang theo số đo của Word (chỉ dùng trong iframe ẩn khi xuất .docx):
 * Word đặt dòng "bội số 1.3" ≈ 1.3 × 1.15 em nên dày/thưa khác bản xem trước (CSS 1.3 em).
 * Các số dưới đây (dòng 1.57, khoảng cách đoạn 4px, Điều 9.3/5.3px, đệm ô 2.67px) đã chỉnh so với
 * bản dựng của LibreOffice (cùng chỉ số font); chọn hơi DÀY hơn Word để số giãn tính ra luôn an toàn.
 */
window.DOCX_EMU={
 lh:1.57,
 tp:2.67,
 word:1.15,        // 1 dòng đơn của Word / cỡ chữ
 maxMult:1.55,     // giãn dòng tối đa theo đơn vị Word
 css:''
};
window.DOCX_EMU.lhmax=DOCX_EMU.lh+(DOCX_EMU.maxMult-1.3)*DOCX_EMU.word;
window.DOCX_EMU.css=
 ':root{--emu:1;--lh0:'+DOCX_EMU.lh+';--lhmax:'+DOCX_EMU.lhmax.toFixed(4)+'}'+
 'body,.page{line-height:'+DOCX_EMU.lh+'}'+
 '.page p{margin-top:4px;margin-bottom:4px}'+
 '.page h2{margin-top:9.3px;margin-bottom:5.3px}'+
 '.page th,.page td{padding-top:var(--tp,'+DOCX_EMU.tp+'px);padding-bottom:var(--tp,'+DOCX_EMU.tp+'px)}';

/*
 * Chỗ ngắt trang cố định (giống bản xem trước):
 * Bản xem trước chia trang động và CỐ TÌNH chuyển nguyên bảng (cùng tiêu đề Điều + dòng dẫn) sang trang kế
 * khi bảng không còn vừa trang hiện tại, để bảng nằm gọn trên 1 trang. Word không tự đo như vậy được nên:
 *   1) docxPageBreaks(c) chạy đúng bộ chia trang của bản xem trước trong 1 iframe ẩn, lấy ra các tiêu đề Điều
 *      đứng ĐẦU TRANG MỚI và có bảng ngay sau nó;
 *   2) buildDocx(c,{breakBefore:[...]}) chèn <w:pageBreakBefore/> vào đúng các tiêu đề đó.
 * Chỗ ngắt trang tự nhiên giữa đoạn văn (hết trang thì xuống dòng) vẫn để Word tự quyết.
 */
(function(){
 const normH=s=>String(s??'').replace(/\s+/g,' ').trim().toUpperCase();

 // pages: các phần tử .page sau khi chia trang. Trả về danh sách tiêu đề (đã chuẩn hóa).
 window.docxFindTableBreaks=function(pages){
  const out=[];
  Array.from(pages).forEach((pg,i)=>{
   if(!i)return;   // trang đầu không cần ngắt
   const kids=Array.from(pg.children),first=kids[0];
   if(!first||first.tagName!=='H2')return;
   for(let j=1;j<kids.length;j++){
    if(kids[j].tagName==='H2')break;
    if(kids[j].tagName==='TABLE'){out.push(normH(first.textContent));break}
   }
  });
  return out;
 };

 // Trả về Promise<string[]|null>; null = không đo được (quá thời gian) -> xuất Word không có ngắt trang cố định.
 window.docxPageBreaks=function(c,timeoutMs){
  return new Promise(resolve=>{
   const fr=document.createElement('iframe');
   fr.setAttribute('aria-hidden','true');
   // cùng khổ với khung xem trước (880px); nằm trong màn hình nhưng trong suốt để trình duyệt vẫn dựng layout
   fr.style.cssText='position:fixed;left:0;top:0;width:880px;height:900px;border:0;opacity:0;pointer-events:none;z-index:-1';
   let done=false,poll=0,to=0;
   const finish=v=>{if(done)return;done=true;clearInterval(poll);clearTimeout(to);fr.remove();resolve(v)};
   poll=setInterval(()=>{
    try{
     const pages=fr.contentDocument&&fr.contentDocument.querySelectorAll('#document .page');
     if(pages&&pages.length){
       const v=window.docxFindTableBreaks(pages);
       // Số liệu giãn của từng trang (đã cân ở bản xem trước) để Word giãn giống
       v.layout=Array.from(pages).map(pg=>(pg._ent||[]).map(e=>({key:e.key,g0:e.g0,g1:e.g1,lh:e.lh,tp:e.tp})));
       finish(v);
      }
    }catch(e){}
   },80);
   to=setTimeout(()=>finish(null),timeoutMs||6000);
   fr.srcdoc=buildDoc(c).replace('</style>',window.DOCX_EMU.css+'</style>');
   document.body.appendChild(fr);
  });
 };
})();

window.buildDocx=function(c,opts){

 const now=new Date();
 const todayMonth=String(now.getMonth()+1).padStart(2,'0');
 const todayYear=String(now.getFullYear());

 const k=calc(c);
 const A=c.benA||{};
 const B=c.benB||{};

 // Tiêu đề Điều cần ngắt trang trước (xem docxPageBreaks)
 const BRK=new Set(((opts&&opts.breakBefore)||[]).map(s=>String(s??'').replace(/\s+/g,' ').trim().toUpperCase()));
 const brk=t=>BRK.has(String(t??'').replace(/\s+/g,' ').trim().toUpperCase());

 /* ============================================================
  * XML / RUN / PARAGRAPH
  * ============================================================ */

 // escape cho XML (bỏ ký tự điều khiển không hợp lệ)
 const xe=s=>String(s??'')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'')
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

 // rPr theo đúng thứ tự schema: b, i, sz, u
 const rpr=f=>{
  f=f||{};
  const s=
   (f.b?'<w:b/><w:bCs/>':'')+
   (f.i?'<w:i/><w:iCs/>':'')+
   (f.sz?`<w:sz w:val="${f.sz}"/><w:szCs w:val="${f.sz}"/>`:'')+
   (f.u?'<w:u w:val="single"/>':'');
  return s?`<w:rPr>${s}</w:rPr>`:'';
 };

 const run=(t,f)=>t===''||t==null?'':`<w:r>${rpr(f)}<w:t xml:space="preserve">${xe(t)}</w:t></w:r>`;
 const BR='<w:r><w:br/></w:r>';

 const decode=t=>t
  .replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
  .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');

 /*
  * Rich text -> các run của Word. Cùng quy tắc với rich() trong doc-builder.js:
  *  - Văn bản thường: hỗ trợ **đậm** và xuống dòng.
  *  - HTML từ trình soạn thảo: chỉ strong/b/em/i/u/br, thẻ khác bị bỏ.
  */
 function richRuns(s,base){
  base=base||{};
  const raw=String(s??'');
  s=cleanLines(raw);
  const legacy=s!==raw;
  if(!s)return '';

  let out='';

  if(!isRich(s)){
   s.split(/\r?\n/).forEach((ln,i)=>{
    if(i)out+=BR;
    ln.split(/\*\*(.+?)\*\*/g).forEach((seg,j)=>{
     if(seg)out+=run(seg,{...base,b:base.b||j%2===1});
    });
   });
   return out;
  }

  if(legacy)s=s.replace(/\r?\n/g,'<br>');

  let b=0,i=0,u=0;

  s.split(/(<[^>]*>)/).forEach(tok=>{
   if(!tok)return;

   if(tok[0]==='<'){
    const m=tok.match(/^<\s*(\/?)\s*([a-zA-Z0-9]+)/);
    if(!m)return;
    const close=!!m[1],tag=m[2].toLowerCase();
    if(tag==='br'){out+=BR;return}
    const d=close?-1:1;
    if(tag==='strong'||tag==='b')b=Math.max(0,b+d);
    else if(tag==='em'||tag==='i')i=Math.max(0,i+d);
    else if(tag==='u')u=Math.max(0,u+d);
    return;   // thẻ khác: bỏ
   }

   const t=decode(tok).replace(/\s*\n\s*/g,' ');
   out+=run(t,{...base,b:base.b||b>0,i:base.i||i>0,u:base.u||u>0});
  });

  return out;
 }

 // Đoạn văn. o: {jc,before,after,ind:{left,hanging,firstLine},keepNext,num:[numId,ilvl]}
 const P=(inner,o)=>{
  o=o||{};
  let pp='';
  if(o.keepNext)pp+='<w:keepNext/>';
  if(o.pageBreak)pp+='<w:pageBreakBefore/>';   // đúng thứ tự schema: keepNext, pageBreakBefore, numPr, spacing, ind, jc
  if(o.num)pp+=`<w:numPr><w:ilvl w:val="${o.num[1]}"/><w:numId w:val="${o.num[0]}"/></w:numPr>`;
  if(o.before!=null||o.after!=null){
   pp+='<w:spacing'+
    (o.before!=null?` w:before="${o.before}"`:'')+
    (o.after!=null?` w:after="${o.after}"`:'')+'/>';
  }
  if(o.ind){
   pp+='<w:ind'+
    (o.ind.left!=null?` w:left="${o.ind.left}"`:'')+
    (o.ind.hanging!=null?` w:hanging="${o.ind.hanging}"`:'')+
    (o.ind.firstLine!=null?` w:firstLine="${o.ind.firstLine}"`:'')+'/>';
  }
  if(o.jc)pp+=`<w:jc w:val="${o.jc}"/>`;
  return `<w:p>${pp?`<w:pPr>${pp}</w:pPr>`:''}${inner||''}</w:p>`;
 };

 const text=(t,f,o)=>P(run(t,f),o);

 /* ============================================================
  * BẢNG
  * ============================================================ */

 const TEXT_W=9979;   // 210mm - 2×17mm = 176mm (twips)

 const BORDER=
  ['top','left','bottom','right','insideH','insideV']
   .map(s=>`<w:${s} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`).join('');

 const tc=(w,inner,span)=>
  `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>`+
  (span?`<w:gridSpan w:val="${span}"/>`:'')+
  `<w:vAlign w:val="center"/></w:tcPr>${inner||P('')}</w:tc>`;

 const tr=(cells,header)=>
  `<w:tr><w:trPr><w:cantSplit/>${header?'<w:tblHeader/>':''}</w:trPr>${cells}</w:tr>`;

 // Bảng dữ liệu cố gắng nằm trọn một trang (như bản xem trước): mọi đoạn trong ô của các hàng trừ hàng cuối
 // giữ cùng trang với hàng kế (keepAll: cả hàng cuối, để đi cùng dòng ngay sau bảng). Bảng chữ ký (borders=false) bỏ qua.
 const keepRows=(rowsXml,keepAll)=>{
  const rs=rowsXml.split('<w:tr>');
  return rs.map((r,i)=>i===0||(!keepAll&&i===rs.length-1)?r:r.replace(/<w:pPr>/g,'<w:pPr><w:keepNext/>')).join('<w:tr>');
 };

 const table=(widths,rowsXml,borders,keepAll)=>
  `<w:tbl><w:tblPr><w:tblW w:w="${widths.reduce((a,b)=>a+b,0)}" w:type="dxa"/>`+
  `<w:tblBorders>${borders===false
    ?['top','left','bottom','right','insideH','insideV'].map(s=>`<w:${s} w:val="nil"/>`).join('')
    :BORDER}</w:tblBorders>`+
  `<w:tblLayout w:type="fixed"/>`+
  `<w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="100" w:type="dxa"/>`+
  `<w:bottom w:w="40" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>`+
  `<w:tblGrid>${widths.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${borders===false?rowsXml:keepRows(rowsXml,keepAll)}</w:tbl>`;

 const CP={before:0,after:0};   // đoạn trong ô bảng: không giãn cách
 const cellP=(inner,jc)=>P(inner,{...CP,jc:jc||'left'});
 const th=(w,t)=>tc(w,cellP(run(t,{b:true}),'center'));

 // khoảng trống nhỏ sau bảng (Word cần 1 đoạn giữa hai bảng / sau bảng)
 const gap=()=>P('',{before:0,after:0});

 /* ============================================================
  * HEADING ĐIỀU
  * ============================================================ */

 const h2=t=>P(run(t,{b:true,sz:25}),{keepNext:true,before:140,after:80,jc:'left',pageBreak:brk(t)});

 /* ============================================================
  * NỘI DUNG
  * ============================================================ */

 const J={jc:'both'};
 const body=[];
 const add=x=>{if(x)body.push(x)};

 // ---- Quốc hiệu / tiêu đề
 add(text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',{b:true},{jc:'center',before:0,after:0}));
 add(text('Độc lập – Tự do – Hạnh phúc',{b:true,u:true},{jc:'center',before:0,after:160}));

 add(text(c.title1==null?'HỢP ĐỒNG PHÁT TRIỂN':c.title1,{b:true,sz:30},{jc:'center',before:120,after:0}));

 const t2=c.title2==null?'GIẢI PHÁP PHẦN MỀM':c.title2;
 if(t2)add(text(t2,{b:true,sz:25},{jc:'center',before:40,after:0}));

 add(text('Số: '+(c.so||''),null,{jc:'center',before:80,after:0}));

 // ---- Căn cứ / ngày
 add(text('Căn cứ Bộ luật Dân sự hiện hành và nhu cầu hợp tác của hai bên.',null,{...J,before:160,after:60}));
 add(text(
  'Hôm nay, ngày '+(c.day||'......')+' tháng '+(c.month||todayMonth)+' năm '+(c.year||todayYear)+', chúng tôi gồm có:',
  null,{...J,before:60,after:60}));

 // ---- Bên A
 const L=(t,o)=>{if(t)add(text(t,null,{before:40,after:40,...(o||{})}))};
 const D=(label,value)=>{const name=String(label??'').trim(); return name ? name+': '+(value??'') : '';};

 add(text('BÊN A: '+(A.name||''),{b:true},{before:100,after:40,keepNext:true}));
 if(D(A.mstLabel,A.mst))L(D(A.mstLabel,A.mst));
 L('Địa chỉ: '+(A.addr||''));
 if(D(A.headLabel,[A.title,A.head].filter(Boolean).join(' ')))L(D(A.headLabel,[A.title,A.head].filter(Boolean).join(' ')));
 if(A.pos)L('Chức vụ: '+A.pos);
 if(D(A.emailLabel,A.email))L(D(A.emailLabel,A.email));
 const customLines=party=>(Array.isArray(party?.customs)?party.customs:[]).forEach(item=>{
  const name=String(item?.name??'').trim();
  if(!name)return;
  L(name+': '+(item?.value??''));
 });
 customLines(A);

 // ---- Bên B
 add(text('BÊN B: '+(B.name||''),{b:true},{before:140,after:40,keepNext:true}));
 L('Mã số thuế: '+(B.mst||''));
 L('Số tài khoản: '+(B.stk||''));
 L('Địa chỉ: '+(B.addr||''));
 L('Đại diện: '+[B.title||'',B.rep||''].join(' ').trim());
 L('Chức vụ: '+(B.pos||''));
 customLines(B);

 add(text('Hai bên cùng thống nhất ký kết Hợp đồng phát triển phần mềm với các điều khoản sau:',null,{...J,before:140,after:60}));

 // ---- ĐIỀU 1
 const sw=c.sw||'<Tên phần mềm>';

 add(h2('ĐIỀU 1. NỘI DUNG HỢP ĐỒNG'));
 add(text('Bên A đồng ý thuê và Bên B đồng ý triển khai hệ thống phần mềm với các nội dung sau:',null,J));
 add(text('Phần mềm '+sw+' có các chức năng theo bản mô tả chức năng đính kèm:',null,J));
 add(text('Phần mềm '+sw+' có các chức năng và nội dung công việc chính như sau:',{b:true},{...J,keepNext:true}));

 const single=(c.funcs||[]).length<2;   // 1 chức năng: không đánh số (giống bản HTML)

 (c.funcs||[]).forEach(f=>{

  add(P(
   run(f.name||'',{b:true}),
   single
    ?{ind:{left:360},before:40,after:20,jc:'left',keepNext:true}
    :{num:[1,0],before:60,after:20,jc:'left',keepNext:true}
  ));

  cleanLines(f.desc).replace(/<br\s*\/?>/gi,'\n')
   .split(/\r?\n/).map(x=>x.trim()).filter(Boolean)
   .forEach(line=>{
    add(P(richRuns(line),{num:[2,0],before:20,after:20,jc:'left'}));
   });
 });

 add(text(
  'Các nội dung trên là phạm vi công việc Bên B thực hiện theo Hợp đồng. Các yêu cầu phát sinh ngoài phạm vi nêu trên sẽ được hai bên trao đổi và thống nhất riêng về nội dung, thời gian và chi phí thực hiện (nếu có).',
  null,{...J,before:100,after:60}));

 // ---- ĐIỀU 2
 add(h2('ĐIỀU 2. GIÁ TRỊ HỢP ĐỒNG'));

 {
  const W=[900,6479,2600];
  let rows=tr(th(W[0],'STT')+th(W[1],'Hạng mục')+th(W[2],'Chi phí'),true);

  (c.items||[]).forEach((r,i)=>{
   rows+=tr(
    tc(W[0],cellP(run(String(i+1)),'center'))+
    tc(W[1],cellP(run(r.name||'')))+
    tc(W[2],cellP(run(vnd(money(r.cost))+' VNĐ'),'right'))
   );
  });

  rows+=tr(
   tc(W[0]+W[1],cellP(run('TỔNG CỘNG',{b:true}),'right'),2)+
   tc(W[2],cellP(run(vnd(k.total)+' VNĐ',{b:true}),'right'))
  );

  add(table(W,rows,true,true));
  add(text('(Bằng chữ: '+k.words+')',null,{...J,before:80,after:60}));
 }

 // ---- ĐIỀU 3
 add(h2('ĐIỀU 3. TIẾN ĐỘ THANH TOÁN'));

 {
  const W=[800,5279,1300,2600];
  let rows=tr(th(W[0],'Đợt')+th(W[1],'Nội dung')+th(W[2],'Tỷ lệ')+th(W[3],'Số tiền'),true);

  k.pays.forEach((p,i)=>{
   rows+=tr(
    tc(W[0],cellP(run(String(i+1)),'center'))+
    tc(W[1],cellP(richRuns(p.content)))+
    tc(W[2],cellP(run(fmtPct(p.pct)+'%'),'center'))+
    tc(W[3],cellP(run(vnd(money(p.amt))+' VNĐ'),'right'))
   );
  });

  add(table(W,rows));
  add(gap());
 }

 // ---- ĐIỀU 4
 add(h2('ĐIỀU 4. THỜI GIAN TRIỂN KHAI'));

 add(P(run('Tổng thời gian thực hiện: ')+richRuns(c.total||''),{...J,keepNext:true}));

 {
  const W=[1900,1700,6379];
  let rows=tr(th(W[0],'Giai đoạn')+th(W[1],'Thời gian')+th(W[2],'Nội dung'),true);

  (c.phases||[]).forEach(p=>{
   rows+=tr(
    tc(W[0],cellP(run(p.name||''),'center'))+
    tc(W[1],cellP(run(p.time||''),'center'))+
    tc(W[2],cellP(richRuns(p.content)))
   );
  });

  add(table(W,rows));
  add(gap());
 }

 // ---- ĐIỀU 5 trở đi
 (c.terms||[]).forEach(t=>{

  add(h2(t.h||''));

  const ps=Array.isArray(t.p)?t.p:String(t.p||'').split(/\n+/).filter(Boolean);

  ps.forEach(x=>{
   x=String(x??'');
   const m=x.match(/^(\d+\.\d+\.)\s*([\s\S]*)$/);

   if(m){
    add(P(run(m[1],{b:true})+run(' ')+richRuns(m[2]),{...J,before:60,after:60}));
   }else{
    add(P(richRuns(x),{...J,before:60,after:60}));
   }
  });
 });



 /*
  * Giãn khoảng cách giống bản xem trước.
  * layout: mỗi trang là danh sách {key,g0,g1,lh,tp} (px, hệ số dòng, đệm ô bảng) do bộ chia trang ghi lại.
  * Ghép từng khối của Word với khối của bản xem trước theo nội dung (40 ký tự đầu, như keyOf), rồi:
  *  - cộng thêm vào khoảng cách trên đoạn: (g1-g0) px × 15 twips × SAFE;
  *  - giãn dòng cả trang: 1.3 + (phần tăng của bản đo ÷ 1.15) × SAFE, tối đa 1.55 (bội số Word);
  *  - bảng: tăng đệm trên/dưới ô.
  * SAFE < 1 để Word (đo hơi khác trình duyệt) không bị tràn trang.
  */
 const LH_BASE=1.3, SAFE=0.8;

 function applyLayout(items,layout){

  if(!layout||!layout.length)return items;

  const nk=t=>String(t==null?'':t).replace(/\s+/g,' ').trim().toUpperCase().slice(0,40);

  const plain=x=>{
   let s='';
   x.replace(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g,(m,t)=>{s+=t;return m;});
   return decode(s);
  };

  // danh sách phẳng các khối của bản xem trước
  const ents=[];
  layout.forEach((pg,pi)=>pg.forEach((e,ei)=>ents.push({...e,pi,first:ei===0})));

  let ptr=0;

  return items.map(x=>{

   const isTbl=x.indexOf('<w:tbl>')===0;
   const key=isTbl?'#T':nk(plain(x));

   if(!key)return x;

   let hit=-1;

   for(let j=ptr;j<Math.min(ents.length,ptr+8);j++){
    if(ents[j].key===key){hit=j;break;}
   }

   if(hit<0)return x;

   ptr=hit+1;

   const e=ents[hit];

   if(isTbl){
    const f=1+((e.tp||DOCX_EMU.tp)/DOCX_EMU.tp-1)*SAFE;

    if(f<=1.01)return x;

    return x.replace(/<w:tblCellMar><w:top w:w="(\d+)"([\s\S]*?)<w:bottom w:w="(\d+)"/,
     (m,a,mid,b)=>`<w:tblCellMar><w:top w:w="${Math.round(a*f)}"${mid}<w:bottom w:w="${Math.round(b*f)}"`);
   }

   const add=e.first?0:Math.max(0,Math.round((e.g1-e.g0)*15*SAFE));
   // dòng: phần tăng so với mức nền của bản đo (đổi sang bội số Word) × SAFE
   const lh=(e.lh||DOCX_EMU.lh)>DOCX_EMU.lh+0.005
    ?Math.min(DOCX_EMU.maxMult,LH_BASE+((e.lh-DOCX_EMU.lh)/DOCX_EMU.word)*SAFE):0;

   if(!add&&!lh)return x;

   return x.replace(/<w:spacing w:before="(\d+)"( w:after="\d+")?\/>/,(m,b,a)=>
    `<w:spacing w:before="${(+b)+add}"${a||''}${lh?` w:line="${Math.round(lh*240)}" w:lineRule="auto"`:''}/>`);
  });
 }

 // ---- Chữ ký
 {
  const half=Math.floor(TEXT_W/2);

  const col=(title,name)=>tc(half,
   P(run(title,{b:true}),{jc:'center',before:0,after:0,keepNext:true})+
   P(run('(Ký, ghi rõ họ tên & đóng dấu)'),{jc:'center',before:40,after:0,keepNext:true})+
   P('',{before:2300,after:0,keepNext:true})+
   P(run(String(name||'').toUpperCase(),{b:true}),{jc:'center',before:0,after:0})
  );

  add(P('',{before:240,after:0,keepNext:true}));
  add(table([half,TEXT_W-half],tr(col('ĐẠI DIỆN BÊN A',A.head)+col('ĐẠI DIỆN BÊN B',B.rep)),false));
 }

 /* ============================================================
  * CÁC FILE TRONG GÓI DOCX
  * ============================================================ */

 const NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
 const HEAD='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

 // A4, lề trên 16mm, phải/trái 17mm, dưới 15mm (giống @page của bản HTML)
 const sect=
  '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>'+
  '<w:pgMar w:top="907" w:right="964" w:bottom="850" w:left="964" w:header="454" w:footer="454" w:gutter="0"/></w:sectPr>';

 const documentXml=
  HEAD+`<w:document ${NS}><w:body>${applyLayout(body,opts&&opts.layout).join('')}${gap()}${sect}</w:body></w:document>`;

 // Times New Roman 11.5pt, giãn dòng 1.3
 const stylesXml=
  HEAD+`<w:styles ${NS}><w:docDefaults>`+
  `<w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/>`+
  `<w:sz w:val="23"/><w:szCs w:val="23"/><w:lang w:val="vi-VN" w:eastAsia="vi-VN" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>`+
  `<w:pPrDefault><w:pPr><w:spacing w:before="60" w:after="60" w:line="312" w:lineRule="auto"/></w:pPr></w:pPrDefault>`+
  `</w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>`+
  `<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:uiPriority w:val="99"/><w:semiHidden/>`+
  `<w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/>`+
  `<w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>`;

 // numId 1: 1. 2. 3. (Điều 1) | numId 2: gạch đầu dòng
 const numberingXml=
  HEAD+`<w:numbering ${NS}>`+
  `<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/>`+
  `<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/>`+
  `<w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>`+
  `<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="singleLevel"/>`+
  `<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/>`+
  `<w:pPr><w:ind w:left="1080" w:hanging="300"/></w:pPr>`+
  `<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/></w:rPr></w:lvl></w:abstractNum>`+
  `<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>`+
  `<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num></w:numbering>`;

 const contentTypes=
  HEAD+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
  '<Default Extension="xml" ContentType="application/xml"/>'+
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'+
  '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'+
  '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>'+
  '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'+
  '</Types>';

 const rootRels=
  HEAD+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'+
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'+
  '</Relationships>';

 const docRels=
  HEAD+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'+
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>'+
  '</Relationships>';

 const iso=now.toISOString().replace(/\.\d+Z$/,'Z');
 const coreXml=
  HEAD+'<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '+
  'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" '+
  'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'+
  `<dc:title>${xe('Hợp đồng phát triển phần mềm - '+(c.so||''))}</dc:title>`+
  `<dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created>`+
  `<dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified>`+
  '</cp:coreProperties>';

 /* ============================================================
  * ZIP (store, không nén)
  * ============================================================ */


 return ZipUtil.build([
  {name:'[Content_Types].xml',data:contentTypes},
  {name:'_rels/.rels',data:rootRels},
  {name:'word/document.xml',data:documentXml},
  {name:'word/styles.xml',data:stylesXml},
  {name:'word/numbering.xml',data:numberingXml},
  {name:'word/_rels/document.xml.rels',data:docRels},
  {name:'docProps/core.xml',data:coreXml}
 ],DOCX_MIME);
};
