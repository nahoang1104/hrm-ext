/* Tờ khai 05/KK-TNCN (Phụ lục I, Thông tư 89/2026/TT-BTC): tổng hợp chỉ tiêu [15]–[45] từ phiếu lương,
   dựng file Word (.docx) và bản HTML để in/lưu PDF. Hàm thuần, không đụng DOM/Store (trừ download/print). */
(function(g){
 'use strict';
 const money=n=>Math.round(Number(n)||0);
 const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};

 /* Bảng chỉ tiêu theo đúng thứ tự mẫu. unit: 'P' = Người, 'V' = VNĐ. */
 const ROWS=[
  {stt:'1',label:'Tổng số người lao động:',code:15,unit:'P',bold:1,span:2},
  {stt:'',label:'Trong đó: Cá nhân cư trú có hợp đồng lao động',code:16,unit:'P'},
  {stt:'2',label:'Tổng số cá nhân đã khấu trừ thuế [17]=[18]+[19]',code:17,unit:'P',bold:1},
  {stt:'2.1',label:'Cá nhân cư trú',code:18,unit:'P'},
  {stt:'2.2',label:'Cá nhân không cư trú',code:19,unit:'P'},
  {stt:'3',label:'Tổng thu nhập chịu thuế trả cho cá nhân [20]=[21]+[22]',code:20,unit:'V',bold:1},
  {stt:'3.1',label:'Cá nhân cư trú',code:21,unit:'V'},
  {stt:'3.2',label:'Cá nhân không cư trú',code:22,unit:'V'},
  {stt:'3.3',label:'Trong đó: Tổng thu nhập chịu thuế từ tiền phí mua bảo hiểm nhân thọ, bảo hiểm không bắt buộc khác của doanh nghiệp bảo hiểm không thành lập tại Việt Nam cho người lao động',code:23,unit:'V'},
  {stt:'4',label:'Tổng thu nhập được miễn trong kỳ [24]=[25]+[26]+[27]+[28]',code:24,unit:'V',bold:1},
  {stt:'4.1',label:'Theo quy định của Hợp đồng dầu khí',code:25,unit:'V'},
  {stt:'4.2',label:'Từ thực hiện nhiệm vụ khoa học, công nghệ và đổi mới sáng tạo.',code:26,unit:'V'},
  {stt:'4.3',label:'Thu nhập của chuyên gia hỗ trợ khởi nghiệp sáng tạo theo quy định',code:27,unit:'V'},
  {stt:'4.4',label:'Thu nhập được miễn khác',code:28,unit:'V'},
  {stt:'5',label:'Tổng thu nhập chịu thuế trả cho cá nhân thuộc diện phải khấu trừ thuế [29]=[30]+[31]',code:29,unit:'V',bold:1},
  {stt:'5.1',label:'Cá nhân cư trú',code:30,unit:'V'},
  {stt:'5.2',label:'Cá nhân không cư trú',code:31,unit:'V'},
  {stt:'6',label:'Thu nhập tính thuế [32]=[33]+[34]',code:32,unit:'V',bold:1},
  {stt:'6.1',label:'Cá nhân cư trú',code:33,unit:'V'},
  {stt:'6.2',label:'Cá nhân không cư trú',code:34,unit:'V'},
  {stt:'7',label:'Số thuế thu nhập cá nhân phải khấu trừ trong kỳ',code:35,unit:'V',bold:1},
  {stt:'8',label:'Số thuế được miễn trong kỳ',code:36,unit:'V',bold:1},
  {stt:'8.1',label:'Tổng thu nhập của cá nhân là nhân lực công nghiệp công nghệ số chất lượng cao thuộc trường hợp được miễn thuế',code:37,unit:'V'},
  {stt:'8.2',label:'Số thuế được miễn của cá nhân là nhân lực công nghiệp công nghệ số chất lượng cao',code:38,unit:'V'},
  {stt:'8.3',label:'Tổng thu nhập của cá nhân là nhân lực công nghệ cao thuộc trường hợp được miễn thuế',code:39,unit:'V'},
  {stt:'8.4',label:'Số thuế được miễn của cá nhân là nhân lực công nghệ cao thực hiện hoạt động nghiên cứu và phát triển công nghệ cao hoặc công nghệ chiến lược',code:40,unit:'V'},
  {stt:'8.5',label:'Số thuế được miễn khác theo quy định',code:41,unit:'V'},
  {stt:'9',label:'Tổng số thuế thu nhập cá nhân đã khấu trừ [42]=[43]+[44]',code:42,unit:'V',bold:1},
  {stt:'9.1',label:'Cá nhân cư trú',code:43,unit:'V'},
  {stt:'9.2',label:'Cá nhân không cư trú',code:44,unit:'V'},
  {stt:'9.3',label:'Trong đó: Tổng số thuế thu nhập cá nhân đã khấu trừ trên tiền phí mua bảo hiểm nhân thọ, bảo hiểm không bắt buộc khác của doanh nghiệp bảo hiểm không thành lập tại Việt Nam cho người lao động',code:45,unit:'V'}
 ];
 /* Chỉ tiêu hệ thống không có dữ liệu để tự tính → nhập tay (mặc định 0). [28] có số tự tính, nhập tay thì ghi đè. */
 const MANUAL=[23,25,26,27,28,36,37,38,39,40,41,45];
 const NOTES=[
  'Tờ khai này chỉ áp dụng đối với tổ chức, cá nhân phát sinh trả thu nhập từ tiền lương, tiền công cho cá nhân trong quý, không phân biệt có phát sinh khấu trừ thuế hay không phát sinh khấu trừ thuế.',
  'Chỉ tiêu [28]: Thu nhập được miễn thuế khác là các khoản thu nhập được miễn thuế thu nhập cá nhân theo quy định của pháp luật và các quy định khác do cơ quan nhà nước có thẩm quyền ban hành.',
  'Chỉ tiêu [38], [40]: Số thuế được miễn đối với nhân lực công nghiệp công nghệ số chất lượng cao; công nghệ cao trong thời hạn 05 năm được xác định theo quy định tại Điều 41, Điều 42 Nghị định số 253/2026/NĐ-CP ngày 30/6/2026 của Chính phủ.'
 ];

 const quarterOf=ym=>Math.floor((Number(String(ym).slice(5,7))-1)/3)+1;

 /* Gom phiếu lương đã chi trả (DA_CHI) của một quý theo từng người → chỉ tiêu tự tính.
    rows: bản ghi payroll đã lọc quyền xem. */
 function aggregate(rows,year,quarter){
  const by=new Map();
  for(const r of rows){
   if(r.tt!=='DA_CHI'||!String(r.ym||'').startsWith(year+'-')||quarterOf(r.ym)!==Number(quarter))continue;
   const o=r.out||{},tc=r.snapshot?.taxContext||{},tb=o.taxBreakdown||{};
   const resident=tc.resident!==false,contract=tc.contract||'LONG';
   const income=money(o.taxableIncome??o.gross),tax=money(o.tax);
   const method=tb.method||(!resident?'NON_RESIDENT':(contract==='SHORT'||contract==='NONE')?'WITHHOLD_10':'PROGRESSIVE');
   const subject=method==='PROGRESSIVE'||method==='NON_RESIDENT'||(method==='WITHHOLD_10'&&tb.eligible===true);
   let tntt=0;
   if(subject){
    if(method==='PROGRESSIVE'){
     tntt=tb.taxable!=null?money(tb.taxable):Math.max(0,income-money(o.insurance?.totalEmployee)-money(tc.personalDeduction??15500000)-Math.max(0,num(tc.dependentCount))*money(tc.dependentDeduction??6200000));
    }else tntt=income;
   }
   let p=by.get(r.uid);
   if(!p){p={uid:r.uid,resident,labor:false,withheld:false,lastYm:'',income:0,subjectIncome:0,tntt:0,tax:0,exempt:0};by.set(r.uid,p)}
   if(String(r.ym)>=p.lastYm){p.lastYm=String(r.ym);p.resident=resident}
   if(resident&&contract==='LONG')p.labor=true;
   if(tax>0)p.withheld=true;
   p.income+=income;p.tax+=tax;
   if(subject){p.subjectIncome+=income;p.tntt+=tntt}
   p.exempt+=money(tb.overtimeExempt)+money(tb.exemptAllowances);
   /* Phân loại cư trú theo từng phiếu để số tiền khớp tờ khai khi tư cách đổi giữa quý. */
   (p.rowsRes||(p.rowsRes=[])).push({resident,income,subject,tntt,tax,subjectIncome:subject?income:0});
  }
  const a={};for(let i=15;i<=45;i++)a[i]=0;
  for(const p of by.values()){
   a[15]++;if(p.labor)a[16]++;
   if(p.withheld){a[17]++;p.resident?a[18]++:a[19]++}
   for(const x of p.rowsRes){
    const res=x.resident;
    res?a[21]+=x.income:a[22]+=x.income;
    if(x.subject){res?a[30]+=x.subjectIncome:a[31]+=x.subjectIncome;res?a[33]+=x.tntt:a[34]+=x.tntt}
    res?a[43]+=x.tax:a[44]+=x.tax;
   }
   a[28]+=p.exempt;
  }
  a[35]=a[43]+a[44];
  return a;
 }

 const defaultHeader=(company={},year,quarter)=>({
  period:'Quý '+quarter+' năm '+year,first:true,supplement:'',
  name:company.name||'',taxCode:company.taxCode||'',address:company.address||'',ward:'',province:'',phone:'',email:'',
  agentName:'',agentTaxCode:'',agentContractNo:'',agentContractDate:'',allocated:false,
  agentPerson:'',agentCert:'',signPlace:'',signDate:'',signerName:company.representative||'',signerTitle:''
 });

 /* auto + nhập tay → bảng chỉ tiêu cuối cùng; công thức cộng áp dụng sau cùng. */
 function finalize(auto,header,manual,ctx={}){
  const m=manual||{},v={...auto},warnings=[];
  for(const k of MANUAL){if(m[k]!==undefined&&m[k]!==''&&m[k]!==null)v[k]=Math.max(0,money(m[k]));else if(k!==28)v[k]=0}
  v[20]=v[21]+v[22];
  v[24]=v[25]+v[26]+v[27]+v[28];
  v[29]=v[30]+v[31];
  v[32]=v[33]+v[34];
  v[42]=v[43]+v[44];
  if(m[36]===undefined||m[36]===''||m[36]===null)v[36]=v[38]+v[40]+v[41];
  if(v[16]>v[15])warnings.push('[16] lớn hơn [15].');
  if(v[17]>v[15])warnings.push('[17] lớn hơn [15].');
  if(v[23]>v[20])warnings.push('[23] lớn hơn [20].');
  if(v[45]>v[42])warnings.push('[45] lớn hơn [42].');
  if(v[35]!==v[42])warnings.push('[35] khác [42]: kiểm tra lại số thuế phải khấu trừ và số đã khấu trừ.');
  if(v[29]>v[20])warnings.push('[29] lớn hơn [20].');
  return {ind:v,auto,header:{...defaultHeader(ctx.company,ctx.year,ctx.quarter),...(header||{})},manual:m,warnings,year:ctx.year,quarter:ctx.quarter};
 }
 function compute(rows,ctx){const auto=aggregate(rows,ctx.year,ctx.quarter);return finalize(auto,ctx.header,ctx.manual,ctx)}

 /* ---------- định dạng ---------- */
 const fmt=n=>Math.round(Number(n)||0).toLocaleString('vi-VN');
 const cell=(row,v)=>row.unit==='P'?String(Math.round(v)):fmt(v);
 const unitTxt=u=>u==='P'?'Người':'VNĐ';
 const dmy=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||''));return m?`${m[3]}/${m[2]}/${m[1]}`:String(s||'')};
 const dateParts=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||''));return m?{d:m[3],m:m[2],y:m[1]}:null};
 const signLine=h=>{const p=dateParts(h.signDate);return (h.signPlace?h.signPlace:'…')+', ngày '+(p?p.d:'...')+' tháng '+(p?p.m:'…')+' năm '+(p?p.y:'...')};
 const periodText=f=>{const q=f.quarter,y=f.year;return 'Quý '+q+' năm '+y};

 /* ---------- Word ---------- */
 const X=s=>String(s??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 function run(t,o={}){
  return `<w:r><w:rPr>${o.b?'<w:b/>':''}${o.i?'<w:i/>':''}${o.u?'<w:u w:val="single"/>':''}${o.sz?`<w:sz w:val="${o.sz}"/><w:szCs w:val="${o.sz}"/>`:''}</w:rPr><w:t xml:space="preserve">${X(t)}</w:t></w:r>`;
 }
 /* parts: mảng [text,opts] hoặc chuỗi */
 function para(parts,o={}){
  const rs=(Array.isArray(parts)?parts:[parts]).map(p=>Array.isArray(p)?run(p[0],{sz:o.sz,...p[1]}):run(p,{sz:o.sz,b:o.b,i:o.i,u:o.u})).join('');
  const tabs=o.tabs?`<w:tabs>${o.tabs.map(t=>`<w:tab w:val="${t.v||'left'}" w:pos="${t.pos}"/>`).join('')}</w:tabs>`:'';
  return `<w:p><w:pPr>${o.keep?'<w:keepNext/>':''}${o.keepLines?'<w:keepLines/>':''}${tabs}<w:spacing w:before="${o.before??0}" w:after="${o.after??80}" w:line="${o.line??264}" w:lineRule="auto"/>${o.ind?`<w:ind w:left="${o.ind}"/>`:''}<w:jc w:val="${o.jc||'left'}"/></w:pPr>${rs}</w:p>`;
 }
 const tcell=(w,inner,o={})=>`<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${o.vm?`<w:vMerge${o.vm==='start'?' w:val="restart"':''}/>`:''}<w:vAlign w:val="center"/></w:tcPr>${inner}</w:tc>`;
 const BORD='<w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders>';
 const NOBORD='<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders>';
 const W=[650,4750,1100,1050,2350]; // tổng 9900

 function docBody(f){
  const h=f.header,v=f.ind,S=22,out=[];
  /* Hộp mẫu số góc phải */
  out.push(`<w:tbl><w:tblPr><w:tblW w:w="3700" w:type="dxa"/><w:jc w:val="right"/>${BORD}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="3700"/></w:tblGrid><w:tr>${tcell(3700,para([['Mẫu số: ',{}],['05/KK-TNCN',{b:1}]],{jc:'center',sz:18,after:0})+para('(Kèm theo Thông tư số 89/2026/TT-BTC ngày 30 tháng 6 năm 2026 của Bộ trưởng Bộ Tài chính)',{jc:'center',sz:18,i:1,after:0}))}</w:tr></w:tbl>`);
  out.push(para('',{after:120}));
  out.push(para('CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM',{jc:'center',b:1,sz:26,after:0}));
  out.push(para('Độc lập - Tự do - Hạnh phúc',{jc:'center',b:1,u:1,sz:26,after:240}));
  out.push(para('TỜ KHAI THUẾ THU NHẬP CÁ NHÂN',{jc:'center',b:1,sz:26,after:0}));
  out.push(para('(Áp dụng đối với tổ chức, cá nhân trả các khoản thu nhập từ tiền lương, tiền công)',{jc:'center',i:1,sz:24,after:200}));
  out.push(para([['[01]',{b:1}],[' Kỳ tính thuế: '+periodText(f),{}]],{jc:'center',sz:24}));
  out.push(para([['[02]',{b:1}],[' Lần đầu: '+(h.first?'☒':'☐'),{}],['\t',{}],['[03]',{b:1}],[' Bổ sung lần thứ: '+(h.first?'':(h.supplement||'…')),{}]],{jc:'center',sz:24,tabs:[{pos:5600,v:'left'}],after:160}));
  const F=(code,label,val,bold)=>para([['['+code+']',{b:1}],[' ',{}],[label,bold?{b:1}:{}],[val?' '+val:'',{}]],{sz:24,after:60});
  out.push(F('04','Tên người nộp thuế:',h.name,1));
  out.push(F('05','Mã số thuế:',h.taxCode));
  out.push(F('06','Địa chỉ:',h.address));
  out.push(para([['[07]',{b:1}],[' Xã/Phường/Đặc khu: '+(h.ward||''),{}],['\t',{}],['[08]',{b:1}],[' Tỉnh/thành phố: '+(h.province||''),{}]],{sz:24,after:60,tabs:[{pos:5600,v:'left'}]}));
  out.push(para([['[09]',{b:1}],[' Điện thoại: '+(h.phone||''),{}],['\t',{}],['[10]',{b:1}],[' Email: '+(h.email||''),{}]],{sz:24,after:60,tabs:[{pos:5600,v:'left'}]}));
  out.push(F('11','Mã số thuế:',h.agentTaxCode));
  out.push(para([['[12]',{b:1}],[' ',{}],['Tên tổ chức, cá nhân cung cấp dịch vụ làm thủ tục về thuế',{b:1}],[' (nếu có): '+(h.agentName||''),{}]],{sz:24,after:60}));
  out.push(F('13','Hợp đồng dịch vụ làm thủ tục về thuế: Số: '+(h.agentContractNo||'...................')+'  Ngày: '+dmy(h.agentContractDate),''));
  out.push(para([['[14]',{b:1}],[' Phân bổ thuế do có đơn vị hạch toán phụ thuộc tại địa bàn cấp tỉnh khác nơi có trụ sở chính: '+(h.allocated?'☒':'☐'),{}]],{sz:24,after:120}));
  out.push(para('Đơn vị tiền: Đồng Việt Nam',{jc:'right',i:1,sz:22,after:60}));
  /* Bảng chỉ tiêu */
  const hdr=`<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>${['STT','Chỉ tiêu','Mã chỉ tiêu','Đơn vị tính','Số người/ Số tiền'].map((t,i)=>tcell(W[i],para(t,{jc:'center',b:1,sz:S,after:0}))).join('')}</w:tr>`;
  const trs=[];
  for(let i=0;i<ROWS.length;i++){
   const r=ROWS[i];
   /* Dòng [15]+[16] dùng chung STT "1" (gộp dọc) */
   let sttCell;
   if(r.code===15)sttCell=tcell(W[0],para('1',{jc:'center',b:1,sz:S,after:0}),{vm:'start'});
   else if(r.code===16)sttCell=tcell(W[0],para('',{after:0}),{vm:'cont'});
   else sttCell=tcell(W[0],para(r.stt,{jc:'center',b:r.bold,sz:S,after:0}));
   trs.push(`<w:tr><w:trPr><w:cantSplit/></w:trPr>${sttCell}${tcell(W[1],para([[r.label,{b:r.bold}]],{sz:S,after:0}))}${tcell(W[2],para('['+r.code+']',{jc:'center',b:1,sz:S,after:0}))}${tcell(W[3],para(unitTxt(r.unit),{jc:'center',sz:S,after:0}))}${tcell(W[4],para(cell(r,v[r.code]),{jc:'right',sz:S,after:0}))}</w:tr>`);
  }
  out.push(`<w:tbl><w:tblPr><w:tblW w:w="9900" w:type="dxa"/>${BORD}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="30" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="30" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${W.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${hdr}${trs.join('')}</w:tbl>`);
  out.push(para('',{after:120}));
  out.push(para('Tôi cam đoan số liệu khai trên là đúng và chịu trách nhiệm trước pháp luật về những số liệu đã khai./.',{sz:24,keep:1,ind:0,before:120,after:160}));
  /* Chữ ký: hai cột không viền */
  const L=[para('NGƯỜI TRỰC TIẾP THỰC HIỆN',{b:1,sz:S,after:0,jc:'left'}),para('DỊCH VỤ LÀM THỦ TỤC VỀ THUẾ',{b:1,sz:S,after:0,jc:'left'}),para('Họ và tên: '+(h.agentPerson||'..............................'),{sz:24,after:0}),para('Chứng chỉ nghiệp vụ chuyên môn về thuế số: '+(h.agentCert||'......'),{sz:24,after:0})].join('');
  const R=[para(signLine(h),{i:1,jc:'center',sz:24,after:0}),para('NGƯỜI NỘP THUẾ hoặc',{b:1,jc:'center',sz:S,after:0}),para('ĐẠI DIỆN HỢP PHÁP CỦA NGƯỜI NỘP THUẾ',{b:1,jc:'center',sz:S,after:0}),para('(Chữ ký, ghi rõ họ tên; chức vụ và đóng dấu (nếu có)/Xác nhận điện tử/Ký điện tử)',{i:1,jc:'center',sz:20,after:1400}),para([[(h.signerTitle?h.signerTitle+' — ':'')+(h.signerName||''),{b:1}]],{jc:'center',sz:24,after:0})].join('');
  out.push(`<w:tbl><w:tblPr><w:tblW w:w="9900" w:type="dxa"/>${NOBORD}<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid><w:gridCol w:w="4300"/><w:gridCol w:w="5600"/></w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>${tcell(4300,L)}${tcell(5600,R)}</w:tr></w:tbl>`);
  out.push(`<w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="8" w:space="1" w:color="000000"/></w:pBdr><w:spacing w:before="240" w:after="60"/><w:ind w:right="7600"/></w:pPr></w:p>`);
  out.push(para('Ghi chú:',{b:1,i:1,sz:22,after:60,keep:1}));
  NOTES.forEach(n=>out.push(para('- '+n,{i:1,sz:22,after:80,jc:'both'})));
  return out.join('');
 }
 const CT='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>';
 const RELS='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
 const DRELS='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>';
 const STYLES='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:szCs w:val="26"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>';
 const FOOTER='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>2</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>';
 function buildDocx(f){
  const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>${docBody(f)}<w:sectPr><w:footerReference w:type="default" r:id="rId2"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="851" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/><w:titlePg/></w:sectPr></w:body></w:document>`;
  return g.ZipUtil.build([{name:'[Content_Types].xml',data:CT},{name:'_rels/.rels',data:RELS},{name:'word/document.xml',data:doc},{name:'word/_rels/document.xml.rels',data:DRELS},{name:'word/styles.xml',data:STYLES},{name:'word/footer1.xml',data:FOOTER}],'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
 }

 /* ---------- HTML để in / lưu PDF ---------- */
 const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function buildHtml(f){
  const h=f.header,v=f.ind;
  const rows=ROWS.map(r=>{
   const m=/^(.*?)(\s\[\d+\]=.*)$/.exec(r.label),lab=E(m?m[1]+m[2]:r.label);
   const stt=r.code===15?'<td rowspan="2" class="c b">1</td>':r.code===16?'':`<td class="c ${r.bold?'b':''}">${E(r.stt)}</td>`;
   return `<tr>${stt}<td class="${r.bold?'b':''}">${lab}</td><td class="c b">[${r.code}]</td><td class="c">${unitTxt(r.unit)}</td><td class="r">${cell(r,v[r.code])}</td></tr>`;
  }).join('');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>05/KK-TNCN ${E(periodText(f))}</title><style>
@page{size:A4;margin:16mm 15mm 16mm 20mm}
*{box-sizing:border-box}body{font:13pt/1.25 "Times New Roman",Times,serif;color:#000;margin:0}
.box{width:64mm;margin-left:auto;border:1px solid #000;padding:2mm;text-align:center;font-size:9pt}.box i{display:block}
.c{text-align:center}.r{text-align:right}.b{font-weight:700}p{margin:0 0 1.2mm}
h1,h2{margin:0;text-align:center;font-size:13pt}h2{text-decoration:underline;margin-bottom:5mm}
.t{margin:4mm 0 1mm;text-align:center;font-weight:700}.sub{text-align:center;font-style:italic;margin-bottom:4mm}
.two{display:flex}.two span:first-child{flex:0 0 57%}
table.f{width:100%;border-collapse:collapse;font-size:11pt;margin-top:2mm}
table.f th,table.f td{border:1px solid #000;padding:.6mm 1.6mm;vertical-align:middle}
table.f tr{page-break-inside:avoid}table.f thead{display:table-header-group}
.sig{display:flex;margin-top:5mm;page-break-inside:avoid}.sig>div:first-child{flex:0 0 43%}.sig>div:last-child{flex:1;text-align:center}
.rule{border-top:1px solid #000;width:28mm;margin:6mm 0 2mm}.note{font-style:italic;font-size:11pt;text-align:justify;margin-bottom:1.5mm}
</style></head><body>
<div class="box">Mẫu số: <b>05/KK-TNCN</b><i>(Kèm theo Thông tư số 89/2026/TT-BTC ngày 30 tháng 6 năm 2026 của Bộ trưởng Bộ Tài chính)</i></div>
<h1 style="margin-top:6mm">CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</h1><h2>Độc lập - Tự do - Hạnh phúc</h2>
<div class="t">TỜ KHAI THUẾ THU NHẬP CÁ NHÂN</div><div class="sub">(Áp dụng đối với tổ chức, cá nhân trả các khoản thu nhập từ tiền lương, tiền công)</div>
<p class="c"><b>[01]</b> Kỳ tính thuế: ${E(periodText(f))}</p>
<p class="c" style="margin-bottom:3mm"><b>[02]</b> Lần đầu: ${h.first?'☒':'☐'} &emsp;&emsp;&emsp; <b>[03]</b> Bổ sung lần thứ: ${h.first?'':E(h.supplement||'…')}</p>
<p><b>[04] Tên người nộp thuế:</b> ${E(h.name)}</p><p><b>[05]</b> Mã số thuế: ${E(h.taxCode)}</p><p><b>[06]</b> Địa chỉ: ${E(h.address)}</p>
<p class="two"><span><b>[07]</b> Xã/Phường/Đặc khu: ${E(h.ward)}</span><span><b>[08]</b> Tỉnh/thành phố: ${E(h.province)}</span></p>
<p class="two"><span><b>[09]</b> Điện thoại: ${E(h.phone)}</span><span><b>[10]</b> Email: ${E(h.email)}</span></p>
<p><b>[11]</b> Mã số thuế: ${E(h.agentTaxCode)}</p>
<p><b>[12] Tên tổ chức, cá nhân cung cấp dịch vụ làm thủ tục về thuế</b> (nếu có): ${E(h.agentName)}</p>
<p><b>[13]</b> Hợp đồng dịch vụ làm thủ tục về thuế: Số: ${E(h.agentContractNo||'...................')} Ngày: ${E(dmy(h.agentContractDate))}</p>
<p><b>[14]</b> Phân bổ thuế do có đơn vị hạch toán phụ thuộc tại địa bàn cấp tỉnh khác nơi có trụ sở chính: ${h.allocated?'☒':'☐'}</p>
<p class="r" style="font-style:italic;font-size:11pt;margin-top:3mm">Đơn vị tiền: Đồng Việt Nam</p>
<table class="f"><thead><tr><th style="width:9%">STT</th><th>Chỉ tiêu</th><th style="width:12%">Mã chỉ tiêu</th><th style="width:11%">Đơn vị tính</th><th style="width:20%">Số người/ Số tiền</th></tr></thead><tbody>${rows}</tbody></table>
<p style="margin-top:5mm;page-break-after:avoid">Tôi cam đoan số liệu khai trên là đúng và chịu trách nhiệm trước pháp luật về những số liệu đã khai./.</p>
<div class="sig"><div><b>NGƯỜI TRỰC TIẾP THỰC HIỆN<br>DỊCH VỤ LÀM THỦ TỤC VỀ THUẾ</b><br>Họ và tên: ${E(h.agentPerson||'..............................')}<br>Chứng chỉ nghiệp vụ chuyên môn về thuế số: ${E(h.agentCert||'......')}</div>
<div><i>${E(signLine(h))}</i><br><b style="font-size:11pt">NGƯỜI NỘP THUẾ hoặc<br>ĐẠI DIỆN HỢP PHÁP CỦA NGƯỜI NỘP THUẾ</b><br><i style="font-size:10pt">(Chữ ký, ghi rõ họ tên; chức vụ và đóng dấu (nếu có)/Xác nhận điện tử/Ký điện tử)</i><div style="height:24mm"></div><b>${E((h.signerTitle?h.signerTitle+' — ':'')+(h.signerName||''))}</b></div></div>
<div class="rule"></div><p class="note"><b>Ghi chú:</b></p>${NOTES.map(n=>`<p class="note">- ${E(n)}</p>`).join('')}
</body></html>`;
 }

 /* ---------- tải/in (chỉ chạy trên trình duyệt) ---------- */
 function fileName(f,ext){return `to-khai-05-KK-TNCN-${f.year}-Q${f.quarter}.${ext}`}
 function downloadDocx(f){const blob=buildDocx(f),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=fileName(f,'docx');document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);return blob}
 /* Mở hộp thoại in trong iframe ẩn; chọn "Lưu dưới dạng PDF" để có file PDF. */
 function printPdf(f){
  const fr=document.createElement('iframe');fr.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';document.body.append(fr);
  const d=fr.contentDocument;d.open();d.write(buildHtml(f));d.close();
  const go=()=>{try{fr.contentWindow.focus();fr.contentWindow.print()}finally{setTimeout(()=>fr.remove(),60000)}};
  fr.contentWindow.document.title=fileName(f,'pdf').replace(/\.pdf$/,'');
  setTimeout(go,300);
 }
 const api={ROWS,MANUAL,NOTES,aggregate,finalize,compute,defaultHeader,buildDocx,buildHtml,downloadDocx,printPdf,fileName,fmt};
 g.Form05KK=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
