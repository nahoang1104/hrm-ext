window.buildDoc=function(c){

 const now=new Date();

 const todayDay=String(now.getDate()).padStart(2,'0');
 const todayMonth=String(now.getMonth()+1).padStart(2,'0');
 const todayYear=String(now.getFullYear());

 const k=calc(c);
 const A=c.benA||{};
 const B=c.benB||{};

 const sw=esc(c.sw||'<Tên phần mềm>');
 const pc=n=>fmtPct(n)+'%';

 /*
  * ============================================================
  * RICH TEXT
  * ============================================================
  *
  * Nội dung từ trình soạn thảo trong mod-contract.js có thể
  * chứa:
  *
  *   <strong>...</strong>
  *   <b>...</b>
  *   <em>...</em>
  *   <i>...</i>
  *   <u>...</u>
  *   <br>
  *
  * Chỉ cho phép các tag trên.
  */

 const rich=function(s){
  const raw=String(s??'');
  s=cleanLines(raw);
  const legacy=s!==raw;   // chỉ dữ liệu cũ dính thẻ <li>... mới cần đổi \n thành <br>
  if(!s)return '';
  // Văn bản thường: escape, hỗ trợ **đậm** và xuống dòng
  if(!isRich(s))return esc(s).replace(/\r?\n/g,'<br>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  // HTML từ trình soạn thảo: chỉ giữ strong/b/em/i/u/br
  s=s.replace(/<(?!\/?(?:strong|b|em|i|u|br)\b)[^>]*>/gi,'');
  return legacy?s.replace(/\r?\n/g,'<br>'):s;   // dữ liệu bình thường: giữ nguyên như bản gốc
 };


 /*
  * ============================================================
  * TEXT / PARTY
  * ============================================================
  */

 const line=t=>t?`<p>${t}</p>`:'';
 const customLabelLines=(party)=>{
  const list=Array.isArray(party?.customs)?party.customs:[];
  return list
   .map(item=>{
    const name=String(item?.name??'').trim();
    if(!name)return '';
    return `${esc(name)}: ${esc(String(item?.value??''))}`;
   })
   .filter(Boolean);
 };
 const defaultLabelLine=(label,value)=>{
  const name=String(label??'').trim();
  if(!name) return '';
  return `${esc(name)}: ${esc(String(value??''))}`;
 };

 /*
  * ============================================================
  * ĐIỀU 1 - CHỨC NĂNG
  * ============================================================
  */

 const funcs=c.funcs.map(f=>{

  const desc=cleanLines(f.desc);

  /*
   * Nếu desc là HTML rich text:
   * không tách bằng newline vì editor có thể dùng <br>.
   *
   * Nếu là dữ liệu cũ dạng text:
   * vẫn giữ cách xử lý mỗi dòng thành một bullet.
   */
  const isRichDesc=isRich(desc);

  let body='';

  if(isRichDesc){

   /*
    * Editor tạo các dòng bằng <br>.
    * Chuyển mỗi dòng thành một <li>.
    */
   const parts=desc
    .replace(/<br\s*\/?>/gi,'\n')
    .split(/\r?\n/)
    .map(x=>x.trim())
    .filter(Boolean);

   body=parts
    .map(x=>`<li>${rich(x)}</li>`)
    .join('\n');

  }else{

   body=desc
    .split(/\r?\n/)
    .filter(x=>x.trim())
    .map(x=>`
      <li>
       ${rich(x.trim())}
      </li>
    `)
    .join('');
  }

  return`
   <li>
    <strong>${esc(f.name)}</strong>

    ${body
     ?`
      <ul>
       ${body}
      </ul>
     `
     :''
    }
   </li>
  `;

 }).join('\n');


 /*
  * ============================================================
  * ĐIỀU 5 -> ĐIỀU 9
  * ============================================================
  */

 const art=t=>{

  const heading=esc(t.h||'');

  const paragraphs=(Array.isArray(t.p)?t.p:String(t.p||'').split(/\n+/).filter(Boolean))
   .map(x=>{

    x=String(x??'');

    /*
     * Điều khoản có dạng:
     *
     * 5.1. Nội dung...
     *
     * Tách số điều khoản ra để vẫn in đậm phần 5.1.
     */
    const m=x.match(
     /^(\d+\.\d+\.)\s*([\s\S]*)$/
    );

    if(m){

     return`
      <p>
       <b>${esc(m[1])}</b>
       ${rich(m[2])}
      </p>
     `;
    }

    return`<p>${rich(x)}</p>`;
   })
   .join('\n');

  return`
   <h2>${heading}</h2>
   ${paragraphs}
  `;
 };


 /*
  * ============================================================
  * NỘI DUNG GỐC
  * ============================================================
  */

 const content=`

  <div class="national">
   <div>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
   <div class="sub">Độc lập – Tự do – Hạnh phúc</div>
  </div>


  <div class="title">
   ${esc(c.title1==null?'HỢP ĐỒNG PHÁT TRIỂN':c.title1)}
  </div>


  ${
   (c.title2==null?'GIẢI PHÁP PHẦN MỀM':c.title2)
    ?`<div class="subtitle">
   ${esc(c.title2==null?'GIẢI PHÁP PHẦN MỀM':c.title2)}
  </div>`
    :''
  }


  <div class="contract-no">
   Số: ${esc(c.so||'')}
  </div>


  <div class="intro">

   <p>
    Căn cứ Bộ luật Dân sự hiện hành và nhu cầu hợp tác
    của hai bên.
   </p>

   <p>
    Hôm nay, ngày
    ${esc(c.day||'......')}
    tháng
    ${esc(c.month||todayMonth)}
    năm
    ${esc(c.year||todayYear)},
    chúng tôi gồm có:
   </p>

  </div>


  <div class="party">

   <p class="party-title">
    BÊN A: ${esc(A.name||'')}
   </p>

   ${
    defaultLabelLine(A.mstLabel,A.mst)
     ?line(defaultLabelLine(A.mstLabel,A.mst))
     :''
   }

   ${line(`Địa chỉ: ${esc(A.addr||'')}`)}

   ${
    defaultLabelLine(A.headLabel,[A.title,A.head].filter(Boolean).join(' '))
     ?line(defaultLabelLine(A.headLabel,[A.title,A.head].filter(Boolean).join(' ')))
     :''
   }

   ${line(
    A.pos
     ?`Chức vụ: ${esc(A.pos)}`
     :''
   )}

   ${
    defaultLabelLine(A.emailLabel,A.email)
     ?line(defaultLabelLine(A.emailLabel,A.email))
     :''
   }

   ${customLabelLines(A).map(line).join('')}

  </div>


  <div class="party">

   <p class="party-title">
    BÊN B: ${esc(B.name||'')}
   </p>

   <p>
    Mã số thuế: ${esc(B.mst||'')}
   </p>

   <p>
    Số tài khoản: ${esc(B.stk||'')}
   </p>

   <p>
    Địa chỉ: ${esc(B.addr||'')}
   </p>

   <p>
    Đại diện:
    ${esc(B.title||'')}
    ${esc(B.rep||'')}
   </p>

   <p>
    Chức vụ: ${esc(B.pos||'')}
   </p>

   ${customLabelLines(B).map(line).join('')}

  </div>


  <p class="agreement">
   Hai bên cùng thống nhất ký kết Hợp đồng phát triển
   phần mềm với các điều khoản sau:
  </p>


  <h2>
   ĐIỀU 1. NỘI DUNG HỢP ĐỒNG
  </h2>


  <p>
   Bên A đồng ý thuê và Bên B đồng ý triển khai hệ thống
   phần mềm với các nội dung sau:
  </p>


  <p>
   Phần mềm ${sw} có các chức năng theo bản mô tả
   chức năng đính kèm:
  </p>


  <p>
   <strong>
    Phần mềm ${sw} có các chức năng và nội dung công việc
    chính như sau:
   </strong>
  </p>


  <ol${c.funcs.length<2?' style="list-style:none;padding-left:1.5em;margin-left:0"':''}>
   ${funcs}
  </ol>


  <p>
   Các nội dung trên là phạm vi công việc Bên B thực hiện
   theo Hợp đồng. Các yêu cầu phát sinh ngoài phạm vi nêu
   trên sẽ được hai bên trao đổi và thống nhất riêng về
   nội dung, thời gian và chi phí thực hiện (nếu có).
  </p>


  <h2>
   ĐIỀU 2. GIÁ TRỊ HỢP ĐỒNG
  </h2>


  <table>

   <tbody>

    <tr>
     <th>STT</th>
     <th>Hạng mục</th>
     <th>Chi phí</th>
    </tr>

    ${
     c.items.map((r,i)=>`

      <tr>

       <td class="center">
        ${i+1}
       </td>

       <td>
        ${esc(r.name||'')}
       </td>

       <td class="right nowrap">
        ${vnd(money(r.cost))} VNĐ
       </td>

      </tr>

     `).join('\n')
    }


    <tr>

     <td colspan="2" class="right">
      <b>TỔNG CỘNG</b>
     </td>

     <td class="right nowrap">
      <b>${vnd(k.total)} VNĐ</b>
     </td>

    </tr>

   </tbody>

  </table>


  <p>
   (Bằng chữ: ${esc(k.words)})
  </p>


  <h2>
   ĐIỀU 3. TIẾN ĐỘ THANH TOÁN
  </h2>


  <table>

   <tbody>

    <tr>
     <th>Đợt</th>
     <th>Nội dung</th>
     <th>Tỷ lệ</th>
     <th>Số tiền</th>
    </tr>

    ${
     k.pays.map((p,i)=>`

      <tr>

       <td class="center">
        ${i+1}
       </td>

       <td>
        ${rich(p.content)}
       </td>

       <td class="center">
        ${pc(p.pct)}
       </td>

       <td class="right nowrap">
        ${vnd(money(p.amt))} VNĐ
       </td>

      </tr>

     `).join('\n')
    }

   </tbody>

  </table>


  <h2>
   ĐIỀU 4. THỜI GIAN TRIỂN KHAI
  </h2>


  <p>
   Tổng thời gian thực hiện:
   ${rich(c.total||'')}
  </p>


  <table>

   <tbody>

    <tr>
     <th>Giai đoạn</th>
     <th>Thời gian</th>
     <th>Nội dung</th>
    </tr>

    ${
     c.phases.map(p=>`

      <tr>

       <td class="center">
        ${esc(p.name||'')}
       </td>

       <td class="center">
        ${esc(p.time||'')}
       </td>

       <td>
        ${rich(p.content)}
       </td>

      </tr>

     `).join('\n')
    }

   </tbody>

  </table>


  ${
   (c.terms||[])
    .map(art)
    .join('\n')
  }


  <div class="signature">

   <div class="signature-col">

    <div class="signature-title">
     ĐẠI DIỆN BÊN A
    </div>

    <div class="signature-note">
     (Ký, ghi rõ họ tên &amp; đóng dấu)
    </div>

    <div class="signature-space"></div>

    <div class="signature-name">
     ${esc(String(A.head||'').toUpperCase())}
    </div>

   </div>


   <div class="signature-col">

    <div class="signature-title">
     ĐẠI DIỆN BÊN B
    </div>

    <div class="signature-note">
     (Ký, ghi rõ họ tên &amp; đóng dấu)
    </div>

    <div class="signature-space"></div>

    <div class="signature-name">
     ${esc(String(B.rep||'').toUpperCase())}
    </div>

   </div>

  </div>

 `;


 /*
  * ============================================================
  * PAGINATION
  * ============================================================
  *
  * Nguyên tắc:
  *
  * 1. Không dùng space-between cho trang nội dung.
  * 2. Nội dung chảy liên tục từ trên xuống dưới.
  * 3. p / h2 / div là block.
  * 4. ol được tách theo từng li.
  * 5. table được tách theo từng tr.
  * 6. Header table được lặp lại khi sang trang.
  * 7. OL tiếp tục số thứ tự khi sang trang.
  */


 const paginationScript=`

(function(){

 /*
  * ----------------------------------------------------------
  * TẠO TRANG
  * ----------------------------------------------------------
  */

 function createPage(root){

  const page=document.createElement('section');

  page.className='page';

  /*
   * Rất quan trọng:
   *
   * DOC_CSS gốc có thể chứa:
   *
   * justify-content:space-between
   *
   * Điều này làm trình duyệt kéo giãn khoảng trống.
   *
   * Với pagination động, phải ép nội dung chảy liên tục.
   */
  page.style.justifyContent='flex-start';

  root.appendChild(page);

  return page;
 }


 /*
  * ----------------------------------------------------------
  * KIỂM TRA CHIỀU CAO
  * ----------------------------------------------------------
  */

 function fits(page){

  return page.scrollHeight <= page.clientHeight + 1;
 }


 /*
  * ----------------------------------------------------------
  * THÊM BLOCK THƯỜNG
  * ----------------------------------------------------------
  */

 /*
  * Tạo trang mới nhưng KÉO THEO tiêu đề Điều đang nằm cuối trang cũ
  * (pair=true: kéo cả dòng dẫn ngay sau tiêu đề, dùng cho bảng),
  * để tiêu đề Điều luôn đi cùng nội dung của nó.
  */
 function pageWithLead(state,pair){

  var pg=state.page;
  var lead=[];
  var l=pg.lastElementChild;

  if(
   pair&&l&&l.tagName==='P'&&
   l.previousElementSibling&&
   l.previousElementSibling.tagName==='H2'
  ){
   lead=[l.previousElementSibling,l];
  }else if(l&&l.tagName==='H2'){
   lead=[l];
  }

  // Trang cũ chỉ có đúng phần tiêu đề thì không đẩy (tránh trang trống)
  if(lead.length&&pg.children.length<=lead.length){
   lead=[];
  }

  lead.forEach(function(x){pg.removeChild(x);});

  var np=createPage(state.root);
  state.page=np;

  lead.forEach(function(x){np.appendChild(x);});

  return np;
 }



 /*
  * ----------------------------------------------------------
  * TÁCH ĐOẠN VĂN QUA TRANG (giống Word)
  * ----------------------------------------------------------
  *
  * Một điều khoản không bắt buộc nằm trọn trên một trang: đoạn không
  * vừa chỗ còn lại thì tách theo từ, phần đầu ở lại trang cũ, phần
  * sau sang trang mới. Mỗi bên giữ tối thiểu 2 dòng (tránh dòng mồ côi).
  */
 function textNodesOf(el){

  var out=[];
  var w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,null);

  while(w.nextNode()){
   out.push(w.currentNode);
  }

  return out;
 }

 function countWords(el){

  var n=0;

  textNodesOf(el).forEach(function(t){
   var m=t.nodeValue.match(/\\S+/g);
   if(m)n+=m.length;
  });

  return n;
 }

 function pruneEmpty(el){

  Array.from(el.querySelectorAll('*')).reverse().forEach(function(x){

   if(x.tagName==='BR')return;

   if(!x.textContent.replace(/\\s+/g,'')&&!x.querySelector('br')){
    x.remove();
   }
  });
 }

 // Cắt đoạn p thành {head: k từ đầu, tail: phần còn lại}
 function cutParagraph(p,k){

  var head=p.cloneNode(true);
  var tail=p.cloneNode(true);
  var hn=textNodesOf(head);
  var tn=textNodesOf(tail);
  var seen=0;

  for(var i=0;i<hn.length;i++){

   var s=hn[i].nodeValue;
   var re=/\\S+/g;
   var m;
   var wc=0;
   var cut=-1;

   while((m=re.exec(s))){
    wc++;

    if(seen+wc===k){
     cut=m.index+m[0].length;
     break;
    }
   }

   if(cut>=0){

    hn[i].nodeValue=s.slice(0,cut);
    tn[i].nodeValue=s.slice(cut).replace(/^\\s+/,'');

    for(var j=i+1;j<hn.length;j++){
     hn[j].nodeValue='';
    }

    for(var j2=0;j2<i;j2++){
     tn[j2].nodeValue='';
    }

    break;
   }

   seen+=(s.match(/\\S+/g)||[]).length;
  }

  pruneEmpty(head);
  pruneEmpty(tail);

  // Nhớ đoạn gốc và khoảng từ [_w0,_w1) mà mỗi mảnh đang giữ, để balanceBeforeSignature
  // ghép hai mảnh lại rồi cắt ở chỗ khác (dồn thêm dòng sang trang sau).
  var base=p._w0||0;
  var tot=(p._w1!=null)?p._w1:base+countWords(p);
  var org=p._orig||p;

  head._orig=org;head._w0=base;head._w1=base+k;
  tail._orig=org;tail._w0=base+k;tail._w1=tot;

  head.style.textAlignLast='justify';   // dòng cuối của phần đầu vẫn dàn đều
  head.style.marginBottom='0';
  tail.style.marginTop='0';

  return {head:head,tail:tail};
 }

 function lineCount(el){

  var cs=getComputedStyle(el);
  var lh=parseFloat(cs.lineHeight);

  if(!lh||isNaN(lh)){
   lh=(parseFloat(cs.fontSize)||15)*1.3;
  }

  return Math.round(el.getBoundingClientRect().height/lh);
 }

 // Số dòng của phần tail khi đặt trên một trang (đo trên trang mới tạm)
 function tailLines(np,tail){

  np.appendChild(tail);

  var n=lineCount(tail);

  np.removeChild(tail);

  return n;
 }


 /*
  * Số từ đứng trước đầu mỗi dòng của đoạn p (p phải đang nằm trong DOM).
  * Cắt đoạn đúng ở đầu một dòng thì dòng cuối của phần đầu vẫn là dòng đầy như cũ,
  * không phải dàn chữ cho kín dòng (trông rất xấu).
  */
 function lineStartWords(p){

  var starts=[0];
  var lastTop=null;
  var count=0;
  var rg=document.createRange();

  textNodesOf(p).forEach(function(t){

   var re=/\\S+/g;
   var m;
   var v=t.nodeValue;

   while((m=re.exec(v))){

    rg.setStart(t,m.index);
    rg.setEnd(t,m.index+1);

    var r=rg.getClientRects()[0];

    if(r){
     if(lastTop!==null&&Math.abs(r.top-lastTop)>4){
      starts.push(count);
     }
     lastTop=r.top;
    }

    count++;
   }
  });

  return starts;
 }

 /*
  * Tách đoạn node để phần đầu lấp chỗ còn trống của trang hiện tại.
  * Trả về true nếu đã tách (state.page là trang mới chứa phần sau).
  */
 function splitParagraph(state,node){

  var pg=state.page;
  var total=countWords(node);

  if(total<8)return false;

  // Tìm k lớn nhất mà phần đầu còn vừa trang
  var lo=1;
  var hi=total-1;
  var best=0;

  while(lo<=hi){

   var mid=(lo+hi)>>1;
   var c=cutParagraph(node,mid);

   pg.appendChild(c.head);

   var ok=fits(pg);

   pg.removeChild(c.head);

   if(ok){
    best=mid;
    lo=mid+1;
   }else{
    hi=mid-1;
   }
  }

  if(!best)return false;

  // Chỉ cắt ở đầu một dòng: phần đầu ≥2 dòng, phần sau ≥2 dòng
  var cl=node.cloneNode(true);

  pg.appendChild(cl);
  var starts=lineStartWords(cl);
  pg.removeChild(cl);

  var kk=0;

  for(var j=starts.length-2;j>=2;j--){
   if(starts[j]<=best){
    kk=starts[j];
    break;
   }
  }

  if(!kk)return false;

  var np=createPage(state.root);
  var res=cutParagraph(node,kk);

  pg.appendChild(res.head);

  if(!fits(pg)||tailLines(np,res.tail)<2){
   pg.removeChild(res.head);
   np.remove();
   return false;
  }

  np.appendChild(res.tail);
  state.page=np;

  return true;
 }

 function addBlock(state,node){

  let page=state.page;

  const clone=node.cloneNode(true);

  page.appendChild(clone);

  if(fits(page)){
   return;
  }


  /*
   * Nếu block này là phần tử đầu tiên trên trang
   * mà vẫn cao hơn trang:
   *
   * giữ nguyên để tránh vòng lặp vô hạn.
   */
  if(page.children.length===1){
   return;
  }


  page.removeChild(clone);

  // Đoạn văn dài: tách qua trang thay vì đẩy cả đoạn
  if(node.tagName==='P'&&splitParagraph(state,node)){
   return;
  }



  page=pageWithLead(state,false);

  page.appendChild(clone);
 }


 /*
  * ----------------------------------------------------------
  * ORDERED LIST
  * ----------------------------------------------------------
  */

 function addOrderedList(state,sourceList){

  const items=Array.from(sourceList.children)
   .filter(x=>x.tagName==='LI');


  if(!items.length){

   addBlock(state,sourceList);

   return;
  }


  let page=state.page;
  let list=null;
  let startNumber=1;


  function newList(){

   list=document.createElement('ol');


   /*
    * Copy thuộc tính của OL gốc.
    */
   for(const attr of sourceList.attributes){

    list.setAttribute(
     attr.name,
     attr.value
    );
   }


   /*
    * Nếu sang trang mới:
    * tiếp tục số thứ tự.
    */
   if(startNumber!==1){

    list.setAttribute(
     'start',
     String(startNumber)
    );
   }


   page.appendChild(list);
  }


  newList();


  for(let i=0;i<items.length;i++){

   const li=items[i].cloneNode(true);

   list.appendChild(li);


   if(fits(page)){

    startNumber=i+2;

    continue;
   }


   /*
    * Không vừa.
    */
   list.removeChild(li);


   /*
    * Nếu list hiện tại chưa có item:
    * li quá cao.
    */
   if(list.children.length===0){

    list.remove();


    page=pageWithLead(state,false);


    startNumber=i+1;

    newList();

    list.appendChild(li);

    startNumber=i+2;

    continue;
   }


   /*
    * Sang trang mới.
    */
   page=createPage(state.root);

   state.page=page;


   startNumber=i+1;

   newList();

   list.appendChild(li);

   startNumber=i+2;
  }
 }


 /*
  * ----------------------------------------------------------
  * TABLE
  * ----------------------------------------------------------
  */

 function addTable(state,sourceTable){

  /*
   * Ưu tiên giữ NGUYÊN BẢNG trên một trang:
   *
   * 1. Thử đặt cả bảng vào trang hiện tại.
   * 2. Không vừa -> chuyển cả bảng (kèm tiêu đề Điều và dòng dẫn
   *    đứng ngay trước nó) sang trang kế tiếp rồi thử lại.
   * 3. Trang mới vẫn không đủ chỗ -> mới tách các dòng của bảng
   *    sang trang kế tiếp (code bên dưới).
   */
  var whole=sourceTable.cloneNode(true);
  var pg=state.page;

  pg.appendChild(whole);

  if(fits(pg)){
   return;
  }

  pg.removeChild(whole);

  var lead=[];
  var last=pg.lastElementChild;

  if(
   last&&last.tagName==='P'&&
   last.previousElementSibling&&
   last.previousElementSibling.tagName==='H2'
  ){
   lead=[last.previousElementSibling,last];
  }else if(last&&last.tagName==='H2'){
   lead=[last];
  }

  if(pg.children.length>lead.length){

   lead.forEach(function(x){pg.removeChild(x);});

   pg=createPage(state.root);
   state.page=pg;

   lead.forEach(function(x){pg.appendChild(x);});

   var whole2=sourceTable.cloneNode(true);
   pg.appendChild(whole2);

   if(fits(pg)){
    return;
   }

   pg.removeChild(whole2);
  }


  let rows=[];


  /*
   * Trường hợp table có tbody.
   */
  const tbodySource=sourceTable.querySelector(
   ':scope > tbody'
  );


  if(tbodySource){

   rows=Array.from(
    tbodySource.children
   ).filter(
    x=>x.tagName==='TR'
   );
  }


  /*
   * Fallback nếu TR nằm trực tiếp trong table.
   */
  if(!rows.length){

   rows=Array.from(
    sourceTable.children
   ).filter(
    x=>x.tagName==='TR'
   );
  }


  /*
   * Fallback cuối cùng.
   */
  if(!rows.length){

   rows=Array.from(
    sourceTable.querySelectorAll('tr')
   );
  }


  if(!rows.length){

   addBlock(state,sourceTable);

   return;
  }


  /*
   * Header là hàng đầu tiên có TH.
   */
  const header=
   rows[0].querySelector('th')
    ?rows[0]
    :null;


  let page=state.page;
  let table=null;
  let tbody=null;

  /*
   * Đo độ rộng các cột của CẢ bảng (khi đủ nội dung) rồi áp cố định
   * cho mọi phần của bảng ở các trang khác nhau, để cột không bị
   * tính lại theo từng trang.
   */
  var colPct=null;
  var prevTbody=null;   // mảnh bảng ngay trước mảnh hiện tại

  (function(){
   var m=sourceTable.cloneNode(true);
   page.appendChild(m);

   var best=null;
   var mr=m.querySelectorAll('tr');

   for(var q=0;q<mr.length;q++){
    if(!best||mr[q].cells.length>best.cells.length){
     best=mr[q];
    }
   }

   if(best&&best.cells.length>1){
    var ws=[];
    var tot=0;

    for(var q2=0;q2<best.cells.length;q2++){
     var w=best.cells[q2].getBoundingClientRect().width;
     ws.push(w);
     tot+=w;
    }

    if(tot>0){
     colPct=ws.map(function(w){return (w/tot*100).toFixed(3);});
    }
   }

   page.removeChild(m);
  })();


  function newTable(includeHeader){

   table=document.createElement('table');


   /*
    * Copy toàn bộ thuộc tính table.
    */
   for(const attr of sourceTable.attributes){

    table.setAttribute(
     attr.name,
     attr.value
    );
   }


   if(colPct){
    table.style.tableLayout='fixed';
    table.style.width='100%';

    var cg=document.createElement('colgroup');

    colPct.forEach(function(w){
     var cl=document.createElement('col');
     cl.style.width=w+'%';
     cg.appendChild(cl);
    });

    table.appendChild(cg);
   }

   tbody=document.createElement('tbody');

   table.appendChild(tbody);

   page.appendChild(table);


   if(includeHeader&&header){

    var hc=header.cloneNode(true);
    hc.__h=true;   // đánh dấu dòng tiêu đề lặp lại (không tính là dòng dữ liệu)
    tbody.appendChild(hc);
   }
  }


  newTable(true);


  const firstDataIndex=
   header
    ?1
    :0;


  for(
   let i=firstDataIndex;
   i<rows.length;
   i++
  ){

   const row=rows[i].cloneNode(true);

   tbody.appendChild(row);


   if(fits(page)){

    continue;
   }


   /*
    * Không vừa -> lấy row ra.
    */
   tbody.removeChild(row);


   /*
    * Kiểm tra bảng hiện tại có dữ liệu hay chưa.
    *
    * Không tính header.
    */
   const dataRows=
    Array.from(tbody.children)
     .filter(
      tr=>!tr.__h
     );


   /*
    * Nếu trang hiện tại mới chỉ có header:
    * row quá cao hoặc header + row không vừa.
    */
   if(dataRows.length===0){

    table.remove();


    page=pageWithLead(state,true);


    newTable(true);

    tbody.appendChild(row);

    continue;
   }


   /*
    * Sang trang mới.
    */
   page=createPage(state.root);

   state.page=page;

   prevTbody=tbody;

   newTable(true);

   tbody.appendChild(row);
  }

  /*
   * Mảnh cuối của bảng chỉ có đúng 1 dòng dữ liệu:
   * mang thêm 1 dòng cuối của mảnh trước sang cùng.
   */
  if(prevTbody){

   var dataOf=function(tb){
    return Array.from(tb.children).filter(function(tr){return !tr.__h;});
   };

   var curRows=dataOf(tbody);
   var prevRows=dataOf(prevTbody);

   if(curRows.length===1&&prevRows.length>1){

    var moved=prevRows[prevRows.length-1];

    tbody.insertBefore(moved,curRows[0]);

    if(!fits(page)){
     prevTbody.appendChild(moved);   // không đủ chỗ -> hoàn tác
    }
   }
  }
 }


 /*
  * ----------------------------------------------------------
  * CÂN KHOẢNG CÁCH CUỐI TRANG
  * ----------------------------------------------------------
  *
  * Sau khi chia trang, trang nào (trừ trang cuối) còn trống nhiều ở
  * đáy thì giãn nhẹ khoảng cách giữa các đoạn / tiêu đề Điều / mục
  * danh sách để phần trống được chia đều lên cả trang.
  *
  * - Tiêu đề Điều (h2) nhận nhiều hơn đoạn thường (để tách Điều rõ hơn).
  * - Mỗi khe có mức tối đa, nên trang quá trống vẫn không bị giãn lố.
  * - Không bao giờ làm tràn trang: tràn thì hoàn tác về khoảng cách gốc.
  */

 /*
  * Ghi lại khoảng cách thực tế (px) trước từng khối của trang: g0 = tự nhiên, g1 = sau khi cân.
  * Bản xuất Word đọc lại để dàn trang giống bản xem trước. Thứ tự: khối, rồi (với danh sách)
  * từng mục và các gạch đầu dòng con.
  */
 function nkey(t){
  return String(t==null?'':t).replace(/\\s+/g,' ').trim().toUpperCase().slice(0,40);
 }

 function keyOf(el){

  if(el.tagName==='TABLE')return '#T';

  if(el.tagName==='OL'||el.tagName==='UL'){
   var f=Array.from(el.children).filter(function(x){return x.tagName==='LI';})[0];
   return f?keyOf(f):'';
  }

  if(el.tagName==='LI'){
   var c=el.cloneNode(true);
   Array.from(c.querySelectorAll('ul,ol')).forEach(function(x){x.remove();});
   return nkey(c.textContent);
  }

  return nkey(el.textContent);
 }

 function gapBetween(a,b){
  return b.getBoundingClientRect().top-a.getBoundingClientRect().bottom;
 }

 function snap(page){

  var out=[];
  var kids=Array.from(page.children);

  kids.forEach(function(k,i){

   // Khối đầu trang không có khoảng cách thật: dùng khoảng cách "như đang chảy giữa trang"
   // (Word có thể đặt khối này giữa trang chứ không đầu trang)
   var g=i?gapBetween(kids[i-1],k):Math.max(
    parseFloat(getComputedStyle(k).marginTop)||0,
    k.tagName==='H2'?10:(k.tagName==='TABLE'?5:4)
   );

   out.push({key:keyOf(k),g:g});

   if(k.tagName==='OL'||k.tagName==='UL'){

    var lis=Array.from(k.children).filter(function(x){return x.tagName==='LI';});

    lis.forEach(function(li,j){

     if(j>0)out.push({key:keyOf(li),g:gapBetween(lis[j-1],li)});

     var sub=Array.from(li.children).filter(function(x){return x.tagName==='UL'||x.tagName==='OL';})[0];

     if(sub){

      var sl=Array.from(sub.children).filter(function(x){return x.tagName==='LI';});

      sl.forEach(function(x,m){

       out.push({key:keyOf(x),g:m?gapBetween(sl[m-1],x):(parseFloat(getComputedStyle(sub).marginTop)||0)});
      });
     }
    });
   }
  });

  return out;
 }

 function saveEnt(page,s0,lh,tp){

  var s1=snap(page);

  page._ent=s0.map(function(e,i){
   return {key:e.key,g0:e.g,g1:s1[i]?s1[i].g:e.g,lh:lh,tp:tp};
  });
 }

 function pageLimit(page){

  var r=page.getBoundingClientRect();
  var cs=getComputedStyle(page);

  return r.top+page.clientHeight-(parseFloat(cs.paddingBottom)||0);
 }

 function contentBottom(page){

  var l=page.lastElementChild;

  if(!l)return 0;

  var m=parseFloat(getComputedStyle(l).marginBottom)||0;

  return l.getBoundingClientRect().bottom+m;
 }

 function relaxPage(page){

   // (các hằng giãn phải khai báo TRƯỚC khi dựng targets, nếu không cap = undefined và bước giãn khoảng cách không chạy)
  // Chế độ đo kiểu Word (bản xuất .docx đo trong iframe ẩn, CSS đặt --emu:1): dòng/đệm bảng theo số đo của Word.
   var csR=getComputedStyle(document.documentElement);
   var EMU=csR.getPropertyValue('--emu').trim()==='1';
   var LH0=EMU?(parseFloat(csR.getPropertyValue('--lh0'))||1.3):1.3;
   var TP0=EMU?2.67:4;

   // Mức giãn TỐI ĐA (px / hệ số). Còn trống nhiều hơn thì để trống, không giãn thêm.
   // Giãn dòng tối đa = 1.55 theo đơn vị Word (Word 1.0 ≈ 1.15 em nên bản xem trước là 1.55×1.15 ≈ 1.78).
   var CAP_H=14, CAP_P=8, CAP_L=5;
   var LH_MAX=EMU?(parseFloat(csR.getPropertyValue('--lhmax'))||1.78):1.78;
   var TP_MAX=EMU?4:6;

  var s0=snap(page);
  var targets=[];
  var kids=Array.from(page.children);

  kids.forEach(function(k,i){

   var h=k.tagName==='H2';

   if(i>0){
    targets.push({el:k,kind:h?'h':'p',base:parseFloat(getComputedStyle(k).marginTop)||0,w:h?2.5:1,cap:h?CAP_H:CAP_P,add:0});
   }

   if(k.tagName==='OL'||k.tagName==='UL'){

    Array.from(k.children).forEach(function(li,j){

     if(j>0&&li.tagName==='LI'){
      targets.push({el:li,kind:'l',base:parseFloat(getComputedStyle(li).marginTop)||0,w:1,cap:CAP_L,add:0});
     }
    });
   }
  });


  var lh=LH0, tp=TP0;
  var hasTable=!!page.querySelector('table');

  function leftNow(){
   return pageLimit(page)-contentBottom(page)-2;
  }

  function apply(){
   targets.forEach(function(t){
    t.el.style.marginTop=(t.base+t.add)+'px';
   });
  }

  function reset(){
   targets.forEach(function(t){t.add=0;});
   apply();
   lh=LH0; tp=TP0;
   page.style.lineHeight='';
   page.style.removeProperty('--tp');
  }

  function record(){

   var sum={h:0,p:0,l:0}, cnt={h:0,p:0,l:0};

   targets.forEach(function(t){sum[t.kind]+=t.add;cnt[t.kind]++;});

   page._ex={
    h:cnt.h?sum.h/cnt.h:0,
    p:cnt.p?sum.p/cnt.p:0,
    l:cnt.l?sum.l/cnt.l:0,
    lh:lh,
    tp:tp
   };
  }

  // Bước 1: giãn khoảng cách giữa các khối (lặp vài lần vì margin của li có thể gộp)
  if(targets.length){

   for(var pass=0;pass<4;pass++){

    var left=leftNow();

    if(left<3)break;

    var pool=left;

    // Chia theo trọng số; khe chạm mức tối đa thì phần dư chia cho khe còn lại
    for(var k=0;k<6&&pool>0.5;k++){

     var open=targets.filter(function(t){return t.add<t.cap-0.01;});

     if(!open.length)break;

     var sw=open.reduce(function(a,t){return a+t.w;},0);
     var used=0;

     open.forEach(function(t){

      var give=Math.min(pool*t.w/sw,t.cap-t.add);

      t.add+=give;
      used+=give;
     });

     pool-=used;
    }

    apply();
   }
  }

  // Bước 2: còn trống nhiều -> tăng giãn dòng của cả trang (tối đa 1.5)
  if(leftNow()>=4){

   var lo=LH0, hi=LH_MAX;

   for(var q=0;q<9;q++){

    var mid=(lo+hi)/2;

    page.style.lineHeight=String(mid);

    if(contentBottom(page)<=pageLimit(page)-2)lo=mid;else hi=mid;
   }

   lh=lo;
   page.style.lineHeight=String(lo);
  }

  // Bước 3: vẫn còn trống và trang có bảng -> tăng đệm trên/dưới ô bảng (tối đa 12px)
  if(hasTable&&leftNow()>=4){

   var lo2=TP0, hi2=TP_MAX;

   for(var r=0;r<9;r++){

    var m2=(lo2+hi2)/2;

    page.style.setProperty('--tp',m2+'px');

    if(contentBottom(page)<=pageLimit(page)-2)lo2=m2;else hi2=m2;
   }

   tp=lo2;
   page.style.setProperty('--tp',lo2+'px');
  }

  if(!fits(page)||contentBottom(page)>pageLimit(page)){
   reset();
  }

  record();
  saveEnt(page,s0,lh,tp);
 }

 function relaxPages(root){

  var pages=Array.from(root.children);

  // Trang cuối giữ nguyên (có phần chữ ký)
  for(var i=0;i<pages.length-1;i++){
   relaxPage(pages[i]);
  }

  // Trang cuối: không giãn, chỉ ghi lại khoảng cách tự nhiên
  var last=pages[pages.length-1];

  if(last)saveEnt(last,snap(last),1.3,4);
 }


 /*
  * ----------------------------------------------------------
  * XỬ LÝ NGUỒN
  * ----------------------------------------------------------
  */

 /*
  * ----------------------------------------------------------
  * Ô CHỮ KÝ
  * ----------------------------------------------------------
  *
  * Không để ô chữ ký đứng một mình ở trang mới: nếu không đủ chỗ
  * thì kéo khối cuối cùng của điều khoản cuối (kèm tiêu đề Điều nếu
  * khối đó đứng ngay sau tiêu đề) sang trang mới cùng với chữ ký.
  */
 function addSignature(state,node){

  var pg=state.page;
  var clone=node.cloneNode(true);

  pg.appendChild(clone);

  if(fits(pg)){
   return;
  }

  pg.removeChild(clone);

  // Điều khoản cuối dài (≥4 dòng): giữ phần đầu ở trang cũ, chỉ kéo
  // phần cuối (≥2 dòng) sang trang mới cùng chữ ký.
  var last0=pg.lastElementChild;

  if(
   last0&&
   last0.tagName==='P'&&
   pg.children.length>1&&
   lineCount(last0)>=4
  ){

   var np0=createPage(state.root);
   var ls=lineStartWords(last0);
   var bk=ls.length>=4?ls[ls.length-2]:0;   // phần đi cùng chữ ký = đúng 2 dòng cuối

   if(bk){

    var parts=cutParagraph(last0,bk);

    pg.replaceChild(parts.head,last0);
    np0.appendChild(parts.tail);
    np0.appendChild(clone);

    if(lineCount(parts.head)>=2&&fits(np0)&&fits(pg)){
     state.page=np0;
     return;
    }

    // Không đạt: hoàn tác, dùng cách kéo cả đoạn bên dưới
    pg.replaceChild(last0,parts.head);
    np0.removeChild(clone);
   }

   np0.remove();
  }

  var carry=[];
  var last=pg.lastElementChild;

  if(last){
   carry=[last];

   var prev=last.previousElementSibling;

   if(prev&&prev.tagName==='H2'){
    carry.unshift(prev);
   }
  }

  // Trang cũ chỉ có đúng các khối này thì không kéo (tránh trang trống)
  if(!carry.length||pg.children.length<=carry.length){
   var solo=createPage(state.root);
   state.page=solo;
   solo.appendChild(clone);
   return;
  }

  carry.forEach(function(x){pg.removeChild(x);});

  var np=createPage(state.root);
  state.page=np;

  carry.forEach(function(x){np.appendChild(x);});
  np.appendChild(clone);

  // Trang mới vẫn không đủ chỗ: trả lại như cũ, chữ ký sang trang riêng
  if(!fits(np)){
   np.removeChild(clone);
   carry.forEach(function(x){pg.appendChild(x);});
   np.remove();

   var solo2=createPage(state.root);
   state.page=solo2;
   solo2.appendChild(clone);
  }
 }



 /*
  * ----------------------------------------------------------
  * CÂN TRANG TRƯỚC TRANG CHỮ KÝ
  * ----------------------------------------------------------
  *
  * Khối chữ ký khá cao nên thường không vừa trang cuối của nội dung: addSignature chỉ kéo
  * 2 dòng cuối sang trang chữ ký, còn trang liền trước (B) giữ lại toàn bộ chỗ trống của nó
  * (chỗ trống sẵn có + 2 dòng vừa nhả). relaxPage chỉ có một trang B để giãn nên khoảng cách
  * giữa các đoạn bị kéo rất rộng.
  *
  * Ở đây chia đều chỗ trống đó cho cả trang trước nữa (A): dồn vài dòng cuối của A xuống đầu B
  * (cắt ở ĐẦU MỘT DÒNG, mỗi bên >=2 dòng như bộ chia trang) cho tới khi chỗ trống của hai trang
  * xấp xỉ nhau; sau đó relaxPages giãn mỗi trang chỉ một nửa. Chỉ đụng tới đoạn văn (P);
  * cuối A là bảng/danh sách thì giữ nguyên.
  */
 function pageSlack(page){

  return pageLimit(page)-contentBottom(page);
 }

 function lineHeightPx(el){

  var cs=getComputedStyle(el);
  var lh=parseFloat(cs.lineHeight);

  if(!lh||isNaN(lh)){
   lh=(parseFloat(cs.fontSize)||15)*1.3;
  }

  return lh;
 }

 // Dồn bớt phần cuối của A xuống đầu B. Trả về true nếu đã dồn (chỗ trống hai trang gần nhau hơn).
 function shiftTail(root,A,B){

  var last=A.lastElementChild;
  var first=B.firstElementChild;

  if(!last||!first||last.tagName!=='P')return false;

  var gap=pageSlack(B)-pageSlack(A);
  var lh=lineHeightPx(last);

  // Chênh lệch dưới 2,5 dòng thì giãn một trang cũng không đáng kể
  if(gap<lh*2.5)return false;

  // Đoạn cuối A có phải là phần đầu của đoạn đã tách (phần sau nằm ở đầu B)?
  var merged=false;

  if(first._orig||last._orig){

   if(
    last._orig&&first._orig===last._orig&&
    last._w0===0&&
    first._w0===last._w1&&
    first._w1===countWords(last._orig)
   ){
    merged=true;
   }else{
    return false;
   }
  }

  var M=null;
  var starts;

  if(merged){

   // Ghép lại thành đoạn gốc nguyên vẹn, đo vị trí đầu dòng trên trang tạm (cùng bề rộng)
   M=last._orig.cloneNode(true);

   var scratch=createPage(root);

   scratch.appendChild(M);
   starts=lineStartWords(M);
   scratch.removeChild(M);
   scratch.remove();

  }else{

   starts=lineStartWords(last);
  }

  var total=starts.length;
  var h0=total;

  if(merged){

   h0=0;

   for(var i=0;i<starts.length;i++){
    if(starts[i]<last._w1)h0++;
   }
  }

  // Tiêu đề Điều đứng ngay trước đoạn: nếu dồn nguyên đoạn thì phải đi cùng
  var prev=last.previousElementSibling;
  var h2=(prev&&prev.tagName==='H2')?prev:null;
  var h2h=h2?h2.getBoundingClientRect().height+(parseFloat(getComputedStyle(h2).marginTop)||0):0;

  // Ứng viên: j = số dòng GIỮ LẠI ở A (0 = dồn nguyên đoạn; còn lại >=2 dòng ở A, >=2 dòng ở B)
  var cands=[];

  if(A.children.length>(h2?2:1)){
   var moved0=h0*lh+(merged?0:(parseFloat(getComputedStyle(last).marginTop)||0))+h2h;
   cands.push({j:0,est:Math.abs(gap-2*moved0)});
  }

  for(var j=2;j<h0;j++){

   if(!merged&&total-j<2)continue;

   cands.push({j:j,est:Math.abs(gap-2*(h0-j)*lh)});
  }

  cands=cands.filter(function(c){return c.est<gap-1;}).sort(function(a,b){return a.est-b.est;});

  for(var ci=0;ci<cands.length;ci++){

   var jj=cands[ci].j;
   var movedH2=false;
   var newHead=null;
   var newTail=null;

   if(jj===0){

    A.removeChild(last);

    if(merged){
     B.replaceChild(M.cloneNode(true),first);
    }else{
     B.insertBefore(last,first);
    }

    if(h2&&A.lastElementChild===h2){
     A.removeChild(h2);
     B.insertBefore(h2,B.firstChild);
     movedH2=true;
    }

   }else{

    var parts=cutParagraph(merged?M:last,starts[jj]);

    newHead=parts.head;
    newTail=parts.tail;

    A.replaceChild(newHead,last);

    if(merged){
     B.replaceChild(newTail,first);
    }else{
     B.insertBefore(newTail,first);
    }
   }

   var ok=
    A.children.length>0&&
    fits(A)&&fits(B)&&
    Math.abs(pageSlack(B)-pageSlack(A))<gap-1;

   if(ok)return true;

   // Không đạt: hoàn tác rồi thử ứng viên kế
   if(jj===0){

    if(movedH2){
     B.removeChild(h2);
     A.appendChild(h2);
    }

    if(merged){
     B.replaceChild(first,B.firstElementChild);
    }else{
     B.removeChild(last);
    }

    A.appendChild(last);

   }else{

    A.replaceChild(last,newHead);

    if(merged){
     B.replaceChild(first,newTail);
    }else{
     B.removeChild(newTail);
    }
   }
  }

  return false;
 }

 function balanceBeforeSignature(root){

  var pages=Array.from(root.children);
  var n=pages.length;

  // Cần ít nhất: trang A, trang B (liền trước chữ ký) và trang chữ ký
  if(n<3)return;

  var sig=pages[n-1];

  if(!sig.querySelector('.signature'))return;

  var A=pages[n-3];
  var B=pages[n-2];

  for(var it=0;it<10;it++){

   if(!shiftTail(root,A,B))break;
  }
 }

 function paginate(){

  const source=document.getElementById('source');
  const root=document.getElementById('document');


  if(!source||!root)return;


  root.innerHTML='';


  const nodes=
   Array.from(source.children);


  if(!nodes.length)return;


  const state={
   root:root,
   page:createPage(root)
  };


  for(const node of nodes){

   if(
    node.classList&&
    node.classList.contains('signature')
   ){

    addSignature(
     state,
     node
    );

    continue;
   }


   if(node.tagName==='OL'){

    addOrderedList(
     state,
     node
    );

    continue;
   }


   if(node.tagName==='TABLE'){

    addTable(
     state,
     node
    );

    continue;
   }


   addBlock(
    state,
    node
   );
  }

  try{
   balanceBeforeSignature(root);
  }catch(e){}

  relaxPages(root);
 }


 /*
  * ----------------------------------------------------------
  * CHỜ FONT
  * ----------------------------------------------------------
  */

 function start(){

  if(
   document.fonts&&
   document.fonts.ready
  ){

   document.fonts.ready.then(function(){

    requestAnimationFrame(function(){

     requestAnimationFrame(function(){

      paginate();

     });

    });

   });

  }else{

   requestAnimationFrame(function(){

    requestAnimationFrame(function(){

     paginate();

    });

   });

  }
 }


 if(
  document.readyState==='loading'
 ){

  document.addEventListener(
   'DOMContentLoaded',
   start
  );

 }else{

  start();

 }


 /*
  * ----------------------------------------------------------
  * RESIZE
  * ----------------------------------------------------------
  */

 let resizeTimer=0;


 window.addEventListener(
  'resize',
  function(){

   clearTimeout(resizeTimer);


   resizeTimer=setTimeout(
    function(){

     paginate();

    },
    150
   );

  }
 );


})();

`;


 /*
  * ============================================================
  * CSS OVERRIDE CHO PAGINATION
  * ============================================================
  *
  * Không sửa trực tiếp DOC_CSS để tránh ảnh hưởng các chỗ
  * khác đang sử dụng.
  */

 const paginationCss=`

/*
 * Trang được tạo bởi pagination động.
 */
.page{
 justify-content:flex-start !important;
}

/*
 * Không để flex tự giãn khoảng trống.
 */
.page > *{
 flex-shrink:0;
}

/*
 * Giữ khoảng cách thực tế của văn bản,
 * thay vì để space-between tạo khoảng trống lớn.
 */
.page h2{
 margin-top:7px;
 margin-bottom:4px;
}

.page p{
 margin-top:3px;
 margin-bottom:3px;
}

.page table{
 margin-top:5px;
 margin-bottom:5px;
}

.page th,
.page td{
 padding-top:var(--tp,4px);
 padding-bottom:var(--tp,4px);
}

.page ol{
 margin-top:3px;
 margin-bottom:4px;
}

.page ul{
 margin-top:3px;
 margin-bottom:4px;
}

.page .party{
 margin-top:5px;
 margin-bottom:5px;
}

.page .agreement{
 margin-top:7px;
}

.page .signature{
 margin-top:24px;
}

/*
 * Không để các trang nội dung kế tiếp bị đẩy khoảng trống
 * như bản CSS gốc.
 */
.page:not(:first-child){
 justify-content:flex-start !important;
}

/*
 * Khi in, vẫn giữ đúng A4 và margin của DOC_CSS.
 */
@media print{

 .page{
  justify-content:flex-start !important;
 }

}

`;


 /*
  * ============================================================
  * HTML CUỐI
  * ============================================================
  */

 return `<!DOCTYPE html>

<html lang="vi">

<head>

<meta charset="utf-8">

<title>
 Hợp đồng phát triển phần mềm - ${esc(c.so||'')}
</title>


<style>

${DOC_CSS}

${paginationCss}

</style>

</head>


<body>


<!--
 Nguồn liên tục.
 Pagination script sẽ chia thành các page A4.
-->

<div id="source">

${content}

</div>


<!--
 Các trang A4 sau khi phân trang.
-->

<div id="document"></div>


<script>

${paginationScript}

</script>


</body>

</html>`;
};
