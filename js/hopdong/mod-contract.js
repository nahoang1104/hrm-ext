window.ModContract=(function(){
 let el,c,tm;
 let lastAutoSoftwareName='';
 let lastAutoSo='';   // số hợp đồng đang là giá trị tự sinh (MM/YYYY/HĐPM--QT) thì tự cập nhật khi đổi tháng/năm

 const now=new Date();
 const currentDay=String(now.getDate()).padStart(2,'0');
 const currentMonth=String(now.getMonth()+1).padStart(2,'0');
 const currentYear=String(now.getFullYear());

 const get=(o,p)=>p.split('.').reduce((a,k)=>a?.[k],o);
 const set=(o,p,v)=>{
  const ks=p.split('.'),l=ks.pop();
  ks.reduce((a,k)=>a[k],o)[l]=v;
 };

 const MONEY=['cost','amt'];

 /*
  * =========================
  *  HỖ TRỢ NỘI DUNG RICH TEXT
  * =========================
  */

 // Kiểm tra chuỗi có phải HTML đã được lưu từ trình soạn thảo hay không.
 const hasHtml=s=>isRich(s);

 // Chuyển nội dung đang lưu thành HTML để đưa vào contenteditable.
 const toEditorHtml=s=>{
  s=cleanLines(s);
  if(!s)return '';
  if(isRich(s))return s.replace(/\r?\n/g,'<br>');
  return esc(s).replace(/\r?\n/g,'<br>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
 };

 // Chuyển HTML về text để hiển thị lại trong textarea.
 const htmlToText=s=>{
  const box=document.createElement('div');
  box.innerHTML=String(s??'');
  return box.innerText||box.textContent||'';
 };

 // Chuyển DOM của trình soạn thảo (hoặc nội dung dán vào) thành HTML sạch: chỉ strong/em/u/br.
 // Mỗi khối (div/p/li...) thành một dòng; không còn thẻ <li style=...> hay <div>.
 const BLOCK=new Set(['DIV','P','LI','UL','OL','H1','H2','H3','H4','H5','H6','TR','TABLE','BLOCKQUOTE','SECTION','ARTICLE']);
 function editorToHtml(root){
  const wrap=(t,f)=>{if(!t)return '';if(f.u)t='<u>'+t+'</u>';if(f.i)t='<em>'+t+'</em>';if(f.b)t='<strong>'+t+'</strong>';return t};
  const walk=(n,fmt)=>{
   let out='';
   n.childNodes.forEach(ch=>{
    if(ch.nodeType===3){
     let t=ch.nodeValue.replace(/\u00a0/g,' ');
     if(/^\s*$/.test(t)&&/\n/.test(t))return;
     out+=wrap(esc(t.replace(/\s*\n\s*/g,' ')),fmt);
     return;
    }
    if(ch.nodeType!==1)return;
    const tag=ch.tagName,st=ch.style||{};
    if(tag==='BR'){out+='<br>';return}
    if(tag==='SCRIPT'||tag==='STYLE')return;
    const f={
     b:fmt.b||tag==='STRONG'||tag==='B'||/^(bold|[6-9]00)$/.test(st.fontWeight),
     i:fmt.i||tag==='EM'||tag==='I'||st.fontStyle==='italic',
     u:fmt.u||tag==='U'||/underline/.test(st.textDecoration||st.textDecorationLine||'')
    };
    const inner=walk(ch,f);
    // khối (div/p/li...) luôn nằm trên dòng riêng: thêm ngắt dòng TRƯỚC nếu phía trước đã có chữ
    if(BLOCK.has(tag)&&inner&&out&&!/<br>$/.test(out))out+='<br>';
    out+=inner;
    if(BLOCK.has(tag)&&inner&&!/<br>$/.test(inner))out+='<br>';
   });
   return out;
  };
  return walk(root,{}).replace(/(<br>){2,}/g,'<br>').replace(/^(<br>)+|(<br>)+$/g,'');   // bỏ dòng trống thừa (không tạo khoảng cách lạ)
 }

 let editorTarget=null;

 // CSS của trình soạn thảo (.ce-*), chọn khách hàng, form... nằm trong css/hopdong.css (dùng token màu của HRM).
 function editorCss(){return ''}

 function getRich(spec){const p=spec.split(',');return p[0]==='terms'?c.terms[p[1]].p[p[2]]:c[p[0]][p[1]][p[2]]}
 function setRich(spec,v){const p=spec.split(',');if(p[0]==='terms')c.terms[p[1]].p[p[2]]=v;else c[p[0]][p[1]][p[2]]=v}

 function openEditor(spec,title){
  const overlay=document.createElement('div');
  overlay.className='ce-overlay';
  overlay.innerHTML=`
   <div class="ce-modal">
    <div class="ce-head"><div class="ce-title">${esc(title||'Soạn thảo nội dung')}</div><button type="button" class="sm" data-ce-close aria-label="Đóng"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="ce-toolbar">
     <button type="button" class="ce-bold" data-ce-cmd="bold" title="Đậm">B</button>
     <button type="button" class="ce-italic" data-ce-cmd="italic" title="Nghiêng">I</button>
     <button type="button" class="ce-underline" data-ce-cmd="underline" title="Gạch chân">U</button>
    </div>
    <div class="ce-body"><div class="ce-editor" id="contractEditor" contenteditable="true" spellcheck="false" data-placeholder="Nhập nội dung... (mỗi dòng là một gạch đầu dòng ở Điều 1)"></div></div>
    <div class="ce-foot"><button type="button" data-ce-cancel>Hủy</button><button type="button" class="pri" data-ce-save>Lưu nội dung</button></div>
   </div>`;
  el.appendChild(overlay);
  const ed=overlay.querySelector('#contractEditor');
  ed.innerHTML=toEditorHtml(getRich(spec));
  try{document.execCommand('defaultParagraphSeparator',false,'br')}catch(e){}   // Enter = xuống dòng bằng <br>
  // Giữ vùng chọn khi bấm B/I/U
  overlay.addEventListener('mousedown',e=>{const b=e.target.closest('[data-ce-cmd]');if(!b)return;e.preventDefault();ed.focus();document.execCommand(b.dataset.ceCmd,false,null)});
  // Dán: luôn làm sạch (bỏ <li style=...>, <div>, màu, font...), giữ xuống dòng + đậm/nghiêng/gạch chân
  ed.addEventListener('paste',e=>{
   e.preventDefault();
   const cd=e.clipboardData,h=cd.getData('text/html'),t=cd.getData('text/plain');
   let out;
   if(h){const tmp=document.createElement('div');tmp.innerHTML=h;out=editorToHtml(tmp)}
   else out=cleanLines(t)===t?esc(t).replace(/\r?\n/g,'<br>'):editorToHtml(Object.assign(document.createElement('div'),{innerHTML:esc(cleanLines(t)).replace(/&lt;(\/?(?:strong|b|em|i|u))&gt;/g,'<$1>').replace(/\n/g,'<br>')}));
   document.execCommand('insertHTML',false,out);
  });
  overlay.addEventListener('click',e=>{
   if(e.target.closest('[data-ce-close],[data-ce-cancel]')){overlay.remove();return}
   if(e.target.closest('[data-ce-save]')){setRich(spec,editorToHtml(ed));overlay.remove();render()}
  });
  ed.focus();
 }

 /*
  * =========================
  *  KHÁCH HÀNG
  * =========================
  */

 const custs=()=>{
  const m=new Map();
  [...SEED.customers,...DB.customers].forEach(k=>m.set(k.name,k));
  return[...m.values()];
 };

 /*
  * =========================
  *  TIỀN
  * =========================
  */

 function fmtMoney(t){
  const v=money(t.value);
  return v;
 }

 /*
  * =========================
  *  TỰ ĐỘNG ĐIỀN ĐIỀU 2
  * =========================
  */

 function syncSoftwareItem(){
  if(!c.items||!c.items.length)return;

  const item=c.items[0];
  const sw=String(c.sw||'').trim();

  if(!sw)return;

  const auto=`Phần mềm ${sw}`;

  /*
   * Chỉ tự động thay đổi nếu:
   * - dòng đầu đang trống; hoặc
   * - dòng đầu chính là giá trị tự động được tạo trước đó.
   *
   * Nếu người dùng đã tự sửa thành tên khác thì không ghi đè.
   */
  if(!item.name||item.name===lastAutoSoftwareName){
   item.name=auto;
   lastAutoSoftwareName=auto;
  }
 }

 /*
  * =========================
  *  INPUT
  * =========================
  */

 const inp=(p,lbl,w)=>`
  <label class="f ${w||''}">
   ${lbl}
   <input data-k="${p}" value="${esc(get(c,p))}">
  </label>`;

 /*
  * Input của các danh sách.
  */
 const ci=(l,i,f,ph,cls,ro)=>{
  const v=c[l][i][f];

  let sh='';

  if(f==='pct'){
   sh=v?fmtPct(v):'';
  }else if(MONEY.includes(f)){
   sh=money(v)?vnd(money(v)):'';
  }else{
   sh=String(v??'');
  }

  return `
   <input
    data-l="${l}"
    data-i="${i}"
    data-f="${f}"
    placeholder="${esc(ph)}"
    value="${esc(sh)}"
    class="${cls||''}${ro?' ro':''}"
    ${ro?'readonly':''}
   >`;
 };

 /*
  * Textarea + nút mở trình soạn thảo.
  */
 const contentInput=(spec,label,ph)=>`
  <div class="content-editor-row">
   <button type="button" class="sm ce-open" data-editor="${spec}" data-editor-title="${esc(ph)}" title="${esc(htmlToText(cleanLines(getRich(spec)||'')).slice(0,300))}">✎ ${esc(label)}</button>
  </div>`;

 const rows=(l,cols)=>{
  return c[l].map((r,i)=>`
   <div class="row">
    ${cols.map(([f,ph,cls,ro])=>{
     if(cls==='ta')return contentInput(l+','+i+','+f,'Soạn thảo '+ph.toLowerCase(),ph);
     return ci(l,i,f,ph,cls,ro);
    }).join('')}

    <button type="button" class="sm bad" data-del="${l}" data-i="${i}" aria-label="Xóa dòng"><i class="fa-solid fa-xmark"></i></button>
   </div>
  `).join('')+`<button type="button" class="sm" data-add="${l}"><i class="fa-solid fa-plus"></i>Thêm dòng</button>`;
 };

 const defaultLabelPair=(labelPath,labelText,valuePath,valueText,w='')=>{
  const labelName=String(get(c,labelPath)??'').trim();
  return `${labelName?inp(labelPath,labelText,w):''}${inp(valuePath,valueText,w)}`;
 };

 const customLabelRows=(party='benA')=>{
  const list=Array.isArray(c[party]?.customs)?c[party].customs:[];

  return `
   <div class="custom-labels">
    <div class="custom-label-head">
     <span>Nhãn tự chọn</span>
     <button type="button" class="sm" data-custom-add data-custom-party="${party}"><i class="fa-solid fa-plus"></i>Thêm nhãn</button>
    </div>
    ${list.map((item,i)=>`
     <div class="custom-label-row">
      <label class="f">
       Tên nhãn
       <input
        data-custom-index="${i}"
        data-custom-key="name"
        data-custom-party="${party}"
        placeholder="Tên nhãn"
        value="${esc(item?.name??'')}"
       >
      </label>
      <label class="f">
       Nội dung
       <input
        data-custom-index="${i}"
        data-custom-key="value"
        data-custom-party="${party}"
        placeholder="Nội dung"
        value="${esc(item?.value??'')}"
       >
      </label>
      <button type="button" class="sm bad" data-custom-del="${i}" data-custom-party="${party}" aria-label="Xóa nhãn"><i class="fa-solid fa-xmark"></i></button>
     </div>
    `).join('')}
   </div>
  `;
 };

 /*
  * =========================
  *  BÊN A / BÊN B
  * =========================
  */

 const party=(p,lbl)=>`
  <fieldset>
   <legend>${lbl}</legend>

   ${p==='benA'
    ?`
     <div class="customer-picker">
      <div class="customer-picker-label">Khách hàng đã lưu</div>
      <button type="button" class="customer-picker-trigger" data-customer-picker-open="open">
       <i class="fa-solid fa-address-book"></i>Chọn khách hàng đã lưu
      </button>
      <div class="customer-picker-modal" data-customer-picker-modal hidden>
       <div class="customer-picker-panel">
        <div class="customer-picker-top">
         <strong>Chọn khách hàng đã lưu</strong>
         <button type="button" class="sm" data-customer-picker-close="close" aria-label="Đóng"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <input type="search" data-customer-picker-search="search" placeholder="Tìm theo tên khách hàng…">
        <div class="customer-picker-list">
         ${custs().map(k=>`<button type="button" class="customer-picker-item" data-customer-pick="${esc(k.name)}">
           <span>${esc(k.name)}</span>
           ${k.mst?`<small>${esc(k.mst)}</small>`:''}
         </button>`).join('') || '<div class="customer-picker-empty">Chưa có khách hàng nào trong quản lý</div>'}
        </div>
       </div>
      </div>
     </div>
    `
    :''
   }

   <div class="g">
    ${inp(p+'.name','Tên đơn vị','w2')}

    ${p==='benA'
     ?`
      ${defaultLabelPair('benA.mstLabel','Nhãn mã số','benA.mst','Mã số')}
      ${inp('benA.addr','Địa chỉ','w2')}
      ${defaultLabelPair('benA.headLabel','Nhãn người ký','benA.head','Họ tên người ký')}
      ${inp('benA.title','Danh xưng')}
      ${inp('benA.pos','Chức vụ (bỏ trống = ẩn)')}
      ${defaultLabelPair('benA.emailLabel','Nhãn email (bỏ trống = ẩn)','benA.email','Email')}
      ${customLabelRows('benA')}
     `
     :`
      ${inp('benB.mst','Mã số thuế')}
      ${inp('benB.stk','Số tài khoản - Ngân hàng')}
      ${inp('benB.addr','Địa chỉ','w2')}
      ${inp('benB.title','Danh xưng')}
      ${inp('benB.rep','Đại diện')}
      ${inp('benB.pos','Chức vụ')}
      ${customLabelRows('benB')}
     `
    }
   </div>
  </fieldset>`;

 /*
  * =========================
  *  NGƯỜI LẬP HỢP ĐỒNG (liên kết nhân sự HRM)
  * =========================
  * - Hợp đồng mới: người lập = người đang đăng nhập (quản lý có thể chọn người khác ở ô "Nhân viên lập hợp đồng").
  * - Hợp đồng đã có: giữ người lập đã lưu; hợp đồng cũ chưa gán thì hiện "Chưa gán" (quản lý gán được).
  * - Hợp đồng của người khác (nhân viên không phải quản lý): chỉ xem/in/xuất file, không sửa được (`locked`).
  */
 let STAFF=[],locked=false;
 let whoCache=null;   // họ tên người đăng nhập (HD_WHO, nạp bất đồng bộ lúc mở form)
 const meNow=()=>({...((window.HD_ME&&HD_ME())||{}),...(whoCache||{})});
 const isNew=()=>!ContractAPI.get(c.id);
 const curEmp=()=>c.employeeId!==undefined?c.employeeId:(isNew()?(meNow().id||''):'');
 function who(){ // {n: tên hiển thị} hoặc null nếu chưa gán
  if(c.employeeId===undefined)return isNew()?{n:(meNow().fullName||meNow().username||'')+' (bạn)'}:null;
  return c.employeeId?{n:c.employeeName||c.employeeUser||''}:null;
 }
 function chip(){
  const x=el&&el.querySelector('#empchip');if(!x)return;
  const w=who();
  x.innerHTML=w?`<i class="fa-solid fa-user-pen"></i>Người lập: <b>${esc(w.n)}</b>`:'<i class="fa-solid fa-user-slash"></i>Chưa gán nhân viên';
 }
 const empLabel=()=>{const cur=curEmp(),m=meNow();
  if(!cur)return '(Chưa gán nhân viên)';
  const u=STAFF.find(x=>x.id===cur),name=c.employeeName||(u&&(u.fullName||u.username))||(cur===m.id?(m.fullName||m.username):'')||'',user=c.employeeUser||(u&&u.username)||(cur===m.id?m.username:'')||'';
  return esc(name||user)+(name&&user?' (@'+esc(user)+')':'');
 };
 // Ô "Nhân viên lập hợp đồng" (chỉ quản lý trở lên): bấm để mở hộp thoại chọn có ô tìm kiếm
 function empField(){
  if(!ContractAPI.isMgr())return '';
  return `<div class="w2 emp-field" data-emp-wrap><span class="emp-lbl">Nhân viên lập hợp đồng</span><button type="button" class="emp-pick" data-emp-open><span>${empLabel()}</span><i class="fa-solid fa-magnifying-glass"></i></button></div>`;
 }
 async function openEmpModal(){
  if(!STAFF.length&&typeof API!=='undefined'&&API.staffList){try{STAFF=await API.staffList()}catch(x){return msg(x.message,true)}}
  const d=document.createElement('dialog');d.className='hdemp';
  const cur=curEmp();
  const item=(id,name,sub)=>`<button type="button" class="customer-picker-item${id===cur?' on':''}" data-pick="${esc(id)}"><span>${esc(name)}</span>${sub?`<small>${esc(sub)}</small>`:''}</button>`;
  d.innerHTML=`<h3>Chọn nhân viên lập hợp đồng</h3><input type="search" data-q placeholder="Tìm theo họ tên hoặc tên đăng nhập…">
   <div class="customer-picker-list">${item('','(Chưa gán nhân viên)','')}${STAFF.map(u=>item(u.id,u.fullName||u.username,'@'+u.username)).join('')}<div class="customer-picker-empty" hidden>Không tìm thấy nhân viên</div></div>
   <div class="row"><button type="button" data-x>Đóng</button></div>`;
  d.onclose=()=>d.remove();
  d.oninput=e=>{if(!e.target.matches('[data-q]'))return;const q=HDUI.nd(e.target.value);let n=0;
   d.querySelectorAll('[data-pick]').forEach(b=>{const show=!q||HDUI.nd(b.textContent).includes(q);b.hidden=!show;if(show)n++});
   d.querySelector('.customer-picker-empty').hidden=n>0};
  d.onclick=e=>{
   if(e.target.closest('[data-x]'))return d.close();
   const b=e.target.closest('[data-pick]');if(!b)return;
   const v=b.dataset.pick,u=STAFF.find(x=>x.id===v);
   if(!v){c.employeeId='';c.employeeUser='';c.employeeName='';}
   else{c.employeeId=v;c.employeeUser=u?u.username:(c.employeeUser||'');c.employeeName=u?(u.fullName||u.username):(c.employeeName||'');}
   chip();const w=el&&el.querySelector('[data-emp-wrap]');if(w)w.outerHTML=empField();
   d.close();
  };
  document.body.appendChild(d);d.showModal();
  d.querySelector('[data-q]').focus();
 }
 function form(){
  const h=formBody();
  return locked?`<fieldset class="hd-lock" disabled>${h}</fieldset>`:h;
 }

 /*
  * =========================
  *  FORM
  * =========================
  */

 function formBody(){
  const pm=c.payMode;

  return`
   <fieldset>
    <legend>Thông tin chung</legend>

    <div class="g">
     ${inp('so','Số hợp đồng','w2')}
     ${inp('day','Ngày')}
     ${inp('month','Tháng')}
     ${inp('year','Năm')}
     ${inp('title1','Tên hợp đồng — dòng 1','w2')}
     ${inp('title2','Tên hợp đồng — dòng 2 (bỏ trống = ẩn)','w2')}
     ${empField()}
    </div>
   </fieldset>

   ${party('benA','Bên A (khách hàng)')}
   ${party('benB','Bên B')}

   <fieldset>
    <legend>Điều 1. Nội dung hợp đồng</legend>

    ${inp('sw','Tên phần mềm')}

    <div class="hint">
     Nội dung chức năng có thể mở bằng trình soạn thảo để định dạng
     <b>đậm</b>, <i>nghiêng</i>, <u>gạch chân</u>.
    </div>

    ${rows('funcs',[
     ['name','Tên chức năng'],
     ['desc','Các nội dung chức năng','ta']
    ])}
   </fieldset>

   <fieldset>
    <legend>Điều 2. Giá trị hợp đồng</legend>

    ${rows('items',[
     ['name','Hạng mục'],
     ['cost','Chi phí (VNĐ)','n']
    ])}

    <div id="tot" class="hint"></div>
   </fieldset>

   <fieldset>
    <legend>Điều 3. Tiến độ thanh toán</legend>

    <div class="hint">
     Nhập theo:
     <label>
      <input type="radio" name="pm" value="amt"${pm==='amt'?' checked':''}>
      Số tiền (tính tỷ lệ)
     </label>

     <label>
      <input type="radio" name="pm" value="pct"${pm==='pct'?' checked':''}>
      Tỷ lệ % (tính số tiền)
     </label>
    </div>

    ${rows('pays',[
     ['content','Nội dung','ta'],
     ['pct','Tỷ lệ %','s',pm==='amt'],
     ['amt','Số tiền','n',pm==='pct']
    ])}

    <div id="paySum" class="hint"></div>
   </fieldset>

   <fieldset>
    <legend>Điều 4. Thời gian triển khai</legend>

    ${inp('total','Tổng thời gian thực hiện')}

    ${rows('phases',[
     ['name','Giai đoạn'],
     ['time','Thời gian'],
     ['content','Nội dung','ta']
    ])}

    
   </fieldset>

   <fieldset>
    <legend>Điều 5 trở đi (tự điền, có thể sửa)</legend>

    ${c.terms.map((t,a)=>`
     <div class="term">

      <div class="row">
       <input
        data-th="${a}"
        value="${esc(t.h)}"
        class="b"
       >

       <button type="button" class="sm bad" data-tdel="${a}"><i class="fa-solid fa-xmark"></i>Xóa điều</button>
      </div>

      ${t.p.map((x,b)=>`
       <div class="row">
        ${contentInput('terms,'+a+','+b,'Soạn thảo '+((String(x).match(/^(\d+\.\d+\.)/)||[])[1]||('khoản '+(b+1))),'Khoản '+(b+1))}
        <button type="button" class="sm bad" data-pdel="${a},${b}" aria-label="Xóa khoản"><i class="fa-solid fa-xmark"></i></button>
       </div>
      `).join('')}

      <button type="button" class="sm" data-padd="${a}"><i class="fa-solid fa-plus"></i>Thêm khoản</button>
     </div>
    `).join('')}

    <div class="btns"><button type="button" class="sm" data-tadd><i class="fa-solid fa-plus"></i>Thêm điều</button>
    <button type="button" class="sm" data-treset><i class="fa-solid fa-rotate-left"></i>Khôi phục điều khoản gốc</button></div>
   </fieldset>`;
 }

 /*
  * =========================
  *  PREVIEW
  * =========================
  */

 function preview(){
  const k=calc(c);

  c.pays.forEach((p,i)=>{
   const pi=el.querySelector(
    `[data-l=pays][data-i="${i}"][data-f=pct]`
   );

   const ai=el.querySelector(
    `[data-l=pays][data-i="${i}"][data-f=amt]`
   );

   if(pi&&pi!==document.activeElement)
    pi.value=p.pct?fmtPct(p.pct):'';

   if(ai&&ai!==document.activeElement)
    ai.value=money(p.amt)?vnd(p.amt):'';
  });

  const tot=el.querySelector('#tot');

  if(tot){
   tot.textContent=
    'Tổng cộng: '+vnd(k.total)+' VNĐ — '+k.words;
  }

  const s=el.querySelector('#paySum');

  if(s){
   const ok=k.amtSum===k.total&&k.pctSum===100;

   s.textContent=
    `Tổng các đợt: ${vnd(k.amtSum)} VNĐ (${fmtPct(k.pctSum)}%)`+
    (ok?'':' ⚠ chưa khớp tổng giá trị hợp đồng / 100%');

   s.className='hint'+(ok?'':' warn');
  }

  clearTimeout(tm);
  tm=setTimeout(paint,150);
 }

 /*
  * =========================
  *  PREVIEW SCALE
  * =========================
  */

 // Điện thoại: bật/tắt khung xem trước toàn màn hình (máy tính luôn hiện bên phải, hai nút này bị ẩn bằng CSS)
 function togglePv(on){
  el.classList.toggle('pv-open',on);document.body.classList.toggle('pv-lock',on);
  if(on){paint();requestAnimationFrame(fit)}
 }

 function fit(){
  const w=el.querySelector('#pvw');
  const f=el.querySelector('#fr');

  if(!w||!f)return;

  const s=Math.min(1,w.clientWidth/880);

  f.style.transform=`scale(${s})`;
  f.style.height=(w.clientHeight/s)+'px';
  f.style.marginLeft=
   Math.max(0,(w.clientWidth-880*s)/2)+'px';
 }

 function paint(){
  const fr=el.querySelector('#fr');

  if(!fr)return;

  const y=fr.contentWindow?fr.contentWindow.scrollY:0;

  fr.onload=()=>{
   try{
    fr.contentWindow.scrollTo(0,y);
   }catch(e){}
  };

  fr.srcdoc=buildDoc(c);
 }

 function render(){
  el.querySelector('#fm').innerHTML=form();
  preview();
 }

 /*
  * =========================
  *  DOWNLOAD
  * =========================
  */

 const dl=(name,type,txt)=>{
  const a=document.createElement('a');

  a.href=URL.createObjectURL(
   new Blob([txt],{type})
  );

  a.download=name;
  a.click();

  setTimeout(()=>{
   URL.revokeObjectURL(a.href);
  },1000);
 };

 const fname=ext=>
  'Hop_dong_'+
  (c.so||'hop-dong')
   .replace(/[\/\\:*?"<>|\s]+/g,'-')+
  '.'+ext;

 const msg=(t,bad)=>toast(t,bad?'err':'ok');

 /*
  * =========================
  *  MOUNT
  * =========================
  */

 function mount(el_,id){
  el=el_;

  /*
   * Khi tạo hợp đồng mới:
   * - ngày = ngày hiện tại
   * - tháng = tháng hiện tại
   * - năm = năm hiện tại
   *
   * Khi sửa hợp đồng cũ:
   * - giữ nguyên ngày tháng năm đã lưu.
   */
  c=id
   ?JSON.parse(JSON.stringify(ContractAPI.get(id)))
   :SEED.blank();
  const stored=id?ContractAPI.get(id):null;
  locked=!!stored&&!ContractAPI.canEdit(stored);   // hợp đồng của nhân viên khác
  STAFF=[];

  // Mới: ngày để trống (......), tháng/năm = hôm nay (do SEED.blank() điền). Sửa hợp đồng cũ: giữ nguyên.
  c.terms=(c.terms||[]).map(t=>({...t,p:Array.isArray(t.p)?t.p:String(t.p||'').split(/\n+/).filter(Boolean)}));
  lastAutoSo=id?'':c.so;
  if(c.title1==null)c.title1='HỢP ĐỒNG PHÁT TRIỂN';   // hợp đồng cũ chưa có trường này
  if(c.title2==null)c.title2='GIẢI PHÁP PHẦN MỀM';

   /*
   * Điều 2:
   * Tự động tạo dòng đầu là "Phần mềm + tên phần mềm"
   * nếu dữ liệu hiện tại chưa có tên.
   */
  if(c.items?.length){
   const old=c.items[0].name;

   if(!old&&c.sw){
    c.items[0].name=`Phần mềm ${String(c.sw).trim()}`;
    lastAutoSoftwareName=c.items[0].name;
   }else{
    lastAutoSoftwareName=old||'';
   }
  }

  el.innerHTML=`
   <h2>${id?'Hợp đồng '+esc(c.so||''):'Tạo hợp đồng'}</h2>
   ${locked?`<div class="hd-note"><i class="fa-solid fa-lock"></i><div>Hợp đồng này do <b>${esc(c.employeeName||c.employeeUser||'nhân viên khác')}</b> lập nên bạn chỉ xem, in và xuất file được. Muốn chỉnh sửa, bấm <b>Nhân bản</b> ở danh sách để tạo bản sao thuộc về bạn.</div></div>`:''}

   <div class="bar">
    <button type="button" onclick="go('list')"><i class="fa-solid fa-arrow-left"></i>Danh sách</button>
    <span class="chip" id="empchip"></span>
    <div class="sp"></div>
    ${locked||!ContractAPI.isMgr()?'':'<button id="save-customer"><i class="fa-solid fa-address-card"></i>Lưu khách hàng</button>'}
    <button id="print"><i class="fa-solid fa-print"></i>In / Lưu PDF</button>
    <button id="html"><i class="fa-solid fa-code"></i>Xuất HTML</button>
    <button id="docx"><i class="fa-solid fa-file-word"></i>Xuất Word</button>
    ${locked?'':'<button id="save" class="pri"><i class="fa-solid fa-floppy-disk"></i>Lưu hợp đồng</button>'}
   </div>

   <div class="split">
    <div class="card hd-form"><div id="fm"></div></div>

    <div id="pvw">
     <button type="button" class="pv-close" id="pvclose"><i class="fa-solid fa-xmark"></i>Đóng</button>
     <iframe
      id="fr"
      title="Xem trước hợp đồng"
     ></iframe>
    </div>
   </div>
   <button type="button" class="pri pv-fab" id="pvopen"><i class="fa-solid fa-eye"></i>Xem trước</button>
  `;
  document.body.classList.remove('pv-lock');

  chip();
  if(window.HD_WHO)HD_WHO().then(w=>{whoCache=w;chip();const sel=el&&el.querySelector('[data-emp-wrap]');if(sel&&!STAFF.length)sel.outerHTML=empField()}).catch(()=>{});
  // Quản lý: tải danh sách nhân sự cho ô "Nhân viên lập hợp đồng" (chỉ thay ô chọn, không vẽ lại form nên không mất chỗ đang gõ)
  if(ContractAPI.isMgr()&&!locked&&typeof API!=='undefined'&&API.staffList)API.staffList().then(l=>{
   STAFF=l;const w=el&&el.querySelector('[data-emp-wrap]');if(w)w.outerHTML=empField();
  }).catch(()=>{});

  render();
  fit();

  new ResizeObserver(fit).observe(
   el.querySelector('#pvw')
  );

  /*
   * =========================
   *  INPUT
   * =========================
   */

  el.oninput=e=>{
   const t=e.target;

   if(t.dataset.customerPickerSearch){
    const query=(t.value||'').toLowerCase().trim();
    const modal=t.closest('[data-customer-picker-modal]');
    if(!modal) return;
    modal.querySelectorAll('[data-customer-pick]').forEach(btn=>{
     const name=(btn.dataset.customerPick||'').toLowerCase();
     const text=(btn.textContent||'').toLowerCase();
     const show=!query || name.includes(query) || text.includes(query);
     btn.style.display=show?'flex':'none';
    });
    return;
   }

   /*
    * Input đơn.
    */
   if(t.dataset.k){
    set(c,t.dataset.k,t.value);

    if((t.dataset.k==='month'||t.dataset.k==='year')&&c.so===lastAutoSo){
     c.so=`${String(c.month||'').trim().padStart(2,'0')}/${String(c.year||'').trim()}/HĐPM--QT`;
     lastAutoSo=c.so;
     const so=el.querySelector('[data-k=so]');
     if(so)so.value=c.so;
    }
    if(t.dataset.k==='so')lastAutoSo='';

    /*
     * Khi thay đổi tên phần mềm, cập nhật dòng đầu Điều 2
     * nếu dòng đó vẫn đang dùng tên tự động.
     */
    if(t.dataset.k==='sw'){
     syncSoftwareItem();

     const first=el.querySelector(
      `[data-l=items][data-i="0"][data-f="name"]`
     );

     if(first){
      first.value=c.items[0].name||'';
     }
    }
   }

   /*
    * Các dòng danh sách.
    */
   else if(t.dataset.l){
    const f=t.dataset.f;
    const row=c[t.dataset.l][t.dataset.i];

    let v=t.value;

    if(MONEY.includes(f)){
     /*
      * Không format lại value trong lúc đang gõ.
      * Điều này tránh lỗi caret/composition với Vietnamese IME
      * trên Windows.
      */
     v=money(t.value);
    }
    else if(f==='pct'){
     v=parseFloat(
      String(v).replace(',','.')
     )||0;
    }
    else if(
     t.dataset.l==='funcs' ||
     t.dataset.l==='pays' ||
     t.dataset.l==='phases'
    ){
     /*
      * Nếu đây là textarea nội dung thì giữ plain text
      * trong lúc gõ trực tiếp.
      *
      * Nội dung có định dạng sẽ được lưu khi dùng
      * nút "Soạn thảo".
      */
     if(t.tagName==='TEXTAREA'){
      v=t.value;
     }
    }

    row[f]=v;

    if(
     t.dataset.l==='pays'&&
     f==='amt'
    ){
     row.lock=true;
    }
   }

   /*
    * Tiêu đề Điều.
    */
   else if(t.dataset.customIndex!=null){
    const party=String(t.dataset.customParty||'benA');
    const idx=Number(t.dataset.customIndex);
    const k=t.dataset.customKey;

    c[party]??={};
    if(!Array.isArray(c[party].customs))c[party].customs=[];
    c[party].customs[idx]??={name:'',value:''};
    c[party].customs[idx][k]=t.value;
    preview();
   }

   /*
    * Tiêu đề Điều.
    */
   else if(t.dataset.th!=null){
    c.terms[t.dataset.th].h=t.value;
   }

   /*
    * Nội dung Điều.
    */
   else if(t.dataset.tp!=null){
    const[a,b]=t.dataset.tp.split(',');
    c.terms[a].p[b]=t.value;
   }

   preview();
  };

  /*
   * =========================
   *  BLUR TIỀN
   * =========================
   */

  el.addEventListener('focusout',e=>{
   const t=e.target;

   if(!t.dataset.l)return;

   const f=t.dataset.f;

   if(!MONEY.includes(f))return;

   const row=c[t.dataset.l][t.dataset.i];
   const v=money(t.value);

   row[f]=v;
   t.value=v?vnd(v):'';

   preview();
  });

  /*
   * =========================
   *  CHANGE
   * =========================
   */

  el.onchange=e=>{
   if(e.target.name==='pm'){
    c.payMode=e.target.value;

    if(c.payMode==='amt'){
     c.pays.forEach(p=>p.lock=true);
    }

    render();
   }
  };

  /*
   * =========================
   *  CLICK
   * =========================
   */

  el.onclick=async e=>{
   const b=e.target.closest('button');

   if(!b)return;

   const d=b.dataset;

   // Điện thoại: khung xem trước ẩn, bật/tắt toàn màn hình bằng nút Xem trước / Đóng
   if(b.id==='pvopen'||b.id==='pvclose'){togglePv(b.id==='pvopen');return}

   if(b.hasAttribute('data-emp-open')){openEmpModal();return}

   if(b.hasAttribute('data-customer-picker-open')){
    const modal=el.querySelector('[data-customer-picker-modal]');
    if(modal){modal.hidden=false; const search=modal.querySelector('[data-customer-picker-search]'); if(search)search.focus();}
    return;
   }

   if(b.hasAttribute('data-customer-picker-close')){
    const modal=el.querySelector('[data-customer-picker-modal]');
    if(modal)modal.hidden=true;
    return;
   }

   if(d.customerPick){
    const k=custs().find(x=>x.name===d.customerPick);
    if(k){
     c.benA={...c.benA,...k};
     delete c.benA.id;delete c.benA.note;
     render();
    }
    return;
   }

   const pickerModal=e.target.closest('[data-customer-picker-modal]');
   if(pickerModal && e.target===pickerModal){
    pickerModal.hidden=true;
    return;
   }

   /*
    * Mở trình soạn thảo rich text.
    */
   if(d.editor){
    openEditor(d.editor,d.editorTitle);

    return;
   }

   /*
    * Các dòng dữ liệu.
    */
   const tpl={
    funcs:{
     name:'',
     desc:''
    },

    items:{
     name:'',
     cost:0
    },

    pays:{
     content:'',
     pct:0,
     amt:0,
     lock:c.payMode==='amt'
    },

    phases:{
     // Tự điền tên giai đoạn kế tiếp (Giai đoạn 4, 5, ...)
     name:'Giai đoạn '+(c.phases.length+1),
     time:'',
     content:''
    }
   };

   /*
    * Thêm dòng.
    */
   if(d.add){
    c[d.add].push({
     ...tpl[d.add]
    });

    /*
     * Nếu thêm dòng đầu tiên của Điều 2,
     * tự điền tên phần mềm.
     */
    if(
     d.add==='items'&&
     c.items.length===1
    ){
     syncSoftwareItem();
    }

    render();
   }

   /*
    * Xóa dòng.
    */
   else if(d.del){
    if(c[d.del].length>1){
     c[d.del].splice(+d.i,1);
     render();
    }
   }

   /*
    * Thêm khoản trong Điều.
    */
   else if(d.padd!=null){
    c.terms[d.padd].p.push('');
    render();
   }

   /*
    * Xóa khoản trong Điều.
    */
   else if(d.pdel){
    const[a,p]=d.pdel.split(',');

    c.terms[a].p.splice(+p,1);

    render();
   }

   /*
    * Xóa Điều.
    */
   else if(d.tdel!=null){
    c.terms.splice(+d.tdel,1);
    render();
   }

   /*
    * Thêm Điều.
    */
   else if(d.tadd!=null){
    c.terms.push({
     h:'ĐIỀU '+(c.terms.length+5)+'. ',
     p:['']
    });

    render();
   }

   /*
    * Khôi phục Điều 5–9.
    */
   else if(d.treset!=null){
    if(await ask('Khôi phục điều khoản gốc','Khôi phục toàn bộ Điều 5–9 về nội dung gốc? Các chỉnh sửa Điều 5–9 của hợp đồng này sẽ mất.',{ok:'Khôi phục'})){
     c.terms=
      JSON.parse(JSON.stringify(TERMS));

     render();
    }
   }

   else if(d.customAdd!=null){
    const party=String(d.customParty||'benA');
    c[party]??={};
    if(!Array.isArray(c[party].customs))c[party].customs=[];
    c[party].customs.push({name:'',value:''});
    render();
   }

   else if(d.customDel!=null){
    const party=String(d.customParty||'benA');
    c[party]??={};
    c[party].customs=Array.isArray(c[party].customs)?c[party].customs.filter((_,i)=>i!==Number(d.customDel)):[ ];
    render();
   }

   /*
    * Lưu.
    */
   else if(b.id==='save'){
    if(!c.benA.name||!c.sw){
     return msg(
      'Cần nhập tên Bên A và tên phần mềm.',
      true
     );
    }

    try{
     const r=await ContractAPI.saveWithCustomer(c,(k,diffs)=>ask('Cập nhật thông tin khách hàng?',
      'Đơn vị "'+k.name+'" đã có trong Quản lý khách hàng nhưng có thông tin khác lần trước:\n'+
      diffs.map(d=>'• '+d.label+': "'+(d.old||'(trống)')+'" → "'+(d.now||'(trống)')+'"').join('\n')+
      '\n\nCập nhật thông tin mới vào Quản lý khách hàng, hoặc giữ nguyên khách hàng và chỉ áp dụng riêng cho hợp đồng này.',
      {ok:'Cập nhật khách hàng',cancel:'Giữ nguyên khách hàng'}));
     // Đồng bộ người lập vừa được gắn khi lưu (hợp đồng mới), và đưa địa chỉ về trang sửa để tải lại không mất hợp đồng
     const st=ContractAPI.get(c.id);
     if(st&&c.employeeId===undefined&&st.employeeId!==undefined){c.employeeId=st.employeeId;c.employeeUser=st.employeeUser;c.employeeName=st.employeeName;}
     chip();
     history.replaceState(null,'','#/contracts/'+c.id);
     msg(r.created?'Đã lưu. Đã thêm khách hàng mới vào Quản lý khách hàng.':r.updated?'Đã lưu. Đã cập nhật thông tin khách hàng.':'Đã lưu.');
    }catch(x){
     msg(x.message,true);
    }
   }

   else if(b.id==='save-customer'){
    const ben=c.benA||{};
    const name=String(ben.name||'').trim();

    if(!name){
     return msg('Cần nhập tên khách hàng để lưu.',true);
    }

    try{
     const existing=ContractAPI.findCustomer(name);
     const payload={
      id:existing?existing.id:uid('kh'),
      name,
      mstLabel:String(ben.mstLabel||''),
      mst:String(ben.mst||''),
      addr:String(ben.addr||''),
      headLabel:String(ben.headLabel||''),
      title:String(ben.title||''),
      head:String(ben.head||''),
      pos:String(ben.pos||''),
      emailLabel:String(ben.emailLabel||''),
      email:String(ben.email||''),
      customs:Array.isArray(ben.customs)?ben.customs.map(item=>({
       name:String(item?.name||'').trim(),
       value:String(item?.value||'').trim()
      })).filter(item=>item.name||item.value):[],
      note:''
     };

     if(existing){
      Object.assign(existing,payload);
      await ContractAPI.saveCustomer(existing);
      msg('Đã lưu thông tin khách hàng.');
     }else{
      await ContractAPI.saveCustomer(payload);
      msg('Đã lưu khách hàng mới.');
     }
    }catch(x){
     msg(x.message,true);
    }
   }

   /*
    * In / PDF.
    */
   else if(b.id==='print'){
    paint();

    setTimeout(()=>{
     el.querySelector('#fr')
      .contentWindow
      .print();
    },300);
   }

   /*
    * HTML.
    */
   else if(b.id==='html'){
    dl(
     fname('html'),
     'text/html;charset=utf-8',
     buildDoc(c)
    );
   }

   /*
    * Word (.docx).
    */
   else if(b.id==='docx'){
    try{
     /*
      * Đo bố cục trang của bản xem trước để chèn page break
      * đúng chỗ bảng được chuyển nguyên sang trang mới.
      */
     msg('Đang xuất file Word...');

     const breaks=await docxPageBreaks(c);

     dl(
      fname('docx'),
      DOCX_MIME,
      buildDocx(c,{breakBefore:breaks||[],layout:(breaks&&breaks.layout)||null})
     );

     msg(
      breaks
       ?'Đã xuất file Word.'
       :'Đã xuất file Word (không đo được bố cục trang nên chưa chèn ngắt trang).'
     );
    }catch(x){
     console.error(x);
     msg('Không xuất được file Word: '+x.message,true);
    }
   }

  };
 }

 return{mount};
})();
