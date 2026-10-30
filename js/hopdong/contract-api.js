window.ContractAPI=(function(){
 const T=HD_CONFIG.tables,S=DataStore;
 // Các trường thông tin khách hàng (giống Bên A ở màn hình tạo hợp đồng) + ghi chú (chỉ có ở bảng khách hàng)
 const FIELDS=[['mstLabel','Nhãn mã số'],['mst','Mã số'],['addr','Địa chỉ'],['headLabel','Nhãn người ký'],['title','Danh xưng'],['head','Họ tên người ký'],['pos','Chức vụ'],['emailLabel','Nhãn email'],['email','Email']];
 const norm=s=>String(s??'').trim().replace(/\s+/g,' ').toLowerCase();
 const val=s=>String(s??'').trim();
 const normCustoms=v=>Array.isArray(v)?v.map(x=>({name:String(x?.name??'').trim(),value:String(x?.value??'').trim()})).filter(x=>x.name||x.value):[];
 // [TỐC ĐỘ] Cột payload chỉ 255 ký tự -> bản ghi càng nhỏ càng ít request. Chỉ lưu phần KHÁC mẫu trống (SEED.blank):
 // Điều 5–9, Bên B, nhãn mặc định... đã có trong data.js. Tải về thì ghép lại với mẫu. Tắt bằng HD_CONFIG.slim=false.
 // id/số HĐ/ngày tháng luôn lưu vì mẫu của chúng đổi theo ngày.
 const KEEP=['id','so','day','month','year'],isObj=v=>v&&typeof v==='object'&&!Array.isArray(v),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const pack=c=>{const o=JSON.parse(JSON.stringify(c));if(HD_CONFIG.slim===false)return o;const d=SEED.blank();
  for(const k of Object.keys(o)){if(KEEP.includes(k)||!(k in d))continue;
   if(same(o[k],d[k]))delete o[k];
   else if(isObj(o[k])&&isObj(d[k]))for(const f of Object.keys(o[k]))if(same(o[k][f],d[k][f]))delete o[k][f]}
  return o};
 const unpack=c=>{const d=SEED.blank();
  for(const k of Object.keys(d)){if(KEEP.includes(k))continue;
   if(c[k]==null)c[k]=d[k];else if(isObj(d[k])&&isObj(c[k]))c[k]={...d[k],...c[k]}}
  return c};
 const pick=b=>{const o={};FIELDS.forEach(([k])=>o[k]=val(b[k]));o.customs=normCustoms(b.customs);return o};
 // ---- Người lập hợp đồng (liên kết với nhân sự HRM) ----
 // Mỗi hợp đồng ghi employeeId (id nhân sự trong HRM) + employeeUser/employeeName (chốt lúc lập, để vẫn đọc được khi nhân sự đổi tên hoặc bị xóa) + created.
 // Hợp đồng cũ (lập trước khi gộp HRM) không có employeeId: coi là "chưa gán", quản lý có thể gán trong form hợp đồng.
 // HD_ME (đồng bộ: id, username, role) và HD_WHO (bất đồng bộ: thêm họ tên) do js/app.js của HRM cung cấp.
 const me=()=>window.HD_ME?window.HD_ME():null,isMgr=u=>!!u&&u.role!=='EMPLOYEE';
 const EMP=['employeeId','employeeUser','employeeName'];
 // Quyền: quản lý trở lên xem và sửa mọi hợp đồng; nhân viên chỉ xem và sửa hợp đồng do mình lập (hợp đồng chưa gán chỉ quản lý thấy).
 // Thông tin khách hàng: chỉ quản lý trở lên được sửa; nhân viên chỉ thêm khách mới khi lưu hợp đồng.
 const canSee=c=>{const u=me();return !!u&&(isMgr(u)||(!!c.employeeId&&c.employeeId===u.id))};
 const canEdit=canSee;
 const visible=()=>DB.contracts.filter(canSee);
 // Nhật ký (HRM): HD_LOG do js/app.js cung cấp. Lỗi ghi nhật ký không chặn thao tác đã lưu nhưng có báo.
 const audit=async(action,target,desc)=>{try{if(window.HD_LOG)await window.HD_LOG(action,target,desc)}catch(e){if(typeof toast==='function')toast('Đã lưu nhưng không ghi được nhật ký: '+e.message,'warn')}};
 const hdesc=c=>`${c.so||'(chưa có số)'} (khách: ${c.benA?.name||'—'}, phần mềm: ${c.sw||'—'})`;
 const needAssign=async(id)=>{if(!isMgr(me()))throw new Error('Chỉ quản lý trở lên được gán nhân viên cho hợp đồng');if(window.HD_CAN_ASSIGN)await window.HD_CAN_ASSIGN(id)};
 const needMe=()=>{if(!me())throw new Error('Chưa đăng nhập')};
 // Gắn người lập khi LƯU: hợp đồng mới -> người đang đăng nhập (hoặc người quản lý đã chọn trong form); hợp đồng đã có -> giữ nguyên người lập đã lưu.
 const stamp=async c=>{const prev=DB.contracts.find(x=>x.id===c.id);
  if(prev){if(c.employeeId===undefined){EMP.forEach(k=>{if(prev[k]!==undefined)c[k]=prev[k]})}if(!c.created&&prev.created)c.created=prev.created;return}
  if(c.employeeId===undefined){const w=window.HD_WHO?await window.HD_WHO():null;if(w){c.employeeId=w.id;c.employeeUser=w.username;c.employeeName=w.fullName||w.username}}
  if(!c.created)c.created=new Date().toISOString()};
 const vi=(a,b)=>String(a).localeCompare(String(b),'vi',{sensitivity:'base'});
 let bootPromise=null;
 return{
  FIELDS,norm,
  async boot(){
   if(bootPromise)return bootPromise;
   bootPromise=(async()=>{
   const [contracts,customers]=await Promise.all([S.load(T.contracts),S.load(T.customers)]);
   DB.contracts=contracts;DB.customers=customers;
   DB.contracts.forEach(unpack);
   // Hợp đồng cũ chưa có customerId: liên kết theo tên đơn vị (chỉ ghi lại đúng những hợp đồng vừa được liên kết)
   const dirty=[];
   DB.contracts.forEach(c=>{if(!c.customerId&&c.benA?.name){const k=this.findCustomer(c.benA.name);if(k){c.customerId=k.id;dirty.push(c)}}});
   for(const c of dirty)try{await S.saveOne(T.contracts,pack(c))}catch(e){}
   this.loadedAt=Date.now();
   })();
   try{return await bootPromise}finally{bootPromise=null}
  },
  // Tải lại dữ liệu nếu đã cũ (nhiều nhân viên cùng lập hợp đồng nên không dùng mãi bản tải lúc mở trang)
  reset(){DB.contracts=[];DB.customers=[];this.loadedAt=0;bootPromise=null},
  async ensure(maxAge=300000){if(!this.loadedAt||Date.now()-this.loadedAt>maxAge)await this.boot()},
  findCustomer:name=>DB.customers.find(k=>norm(k.name)===norm(name)&&norm(name)),
  contractsOf:k=>visible().filter(c=>c.customerId===k.id||(!c.customerId&&norm(c.benA?.name)===norm(k.name))),
  async upsert(c){needMe();c=JSON.parse(JSON.stringify(c));const prev=DB.contracts.find(x=>x.id===c.id),u=me();
   if(prev&&!canEdit(prev))throw new Error('Bạn không có quyền sửa hợp đồng của nhân viên khác');
   await stamp(c);
   const changed=c.employeeId&&(!prev||prev.employeeId!==c.employeeId)&&c.employeeId!==u.id; // gán cho người khác (hoặc đổi người lập)
   if(changed)await needAssign(c.employeeId);
   if(prev&&(prev.employeeId||'')!==(c.employeeId||'')&&!isMgr(u))throw new Error('Chỉ quản lý trở lên được đổi nhân viên lập hợp đồng');
   c.updated=new Date().toISOString();
   const i=DB.contracts.findIndex(x=>x.id===c.id);i<0?DB.contracts.push(c):DB.contracts[i]=c;
   await S.saveOne(T.contracts,pack(c));
   await audit(prev?'UPDATE_CONTRACT':'CREATE_CONTRACT',c.employeeId||null,`${u.username} ${prev?'sửa':'tạo'} hợp đồng ${hdesc(c)}${c.employeeUser?' do '+c.employeeUser+' lập':''}`);
   if(prev&&(prev.employeeId||'')!==(c.employeeId||''))await audit('ASSIGN_CONTRACT',c.employeeId||null,`${u.username} ${c.employeeId?'gán hợp đồng '+hdesc(c)+' cho '+c.employeeUser:'bỏ gán nhân viên của hợp đồng '+hdesc(c)}`)},
  // Lưu hợp đồng + đối chiếu khách hàng:
  //  - chưa có tên đơn vị -> thêm khách hàng mới
  //  - đã có và thông tin khác lần trước -> hỏi (confirmFn) có cập nhật bảng khách hàng không
  async saveWithCustomer(c,confirmFn){
   const b=c.benA,res={created:false,updated:false};let k=this.findCustomer(b.name);
   if(!k){k={id:uid('kh'),name:val(b.name),...pick(b),note:''};DB.customers.push(k);res.created=true}
   else if(isMgr(me())){ // chỉ quản lý trở lên được cập nhật thông tin khách đã có; nhân viên: thông tin khác chỉ áp dụng riêng cho hợp đồng này
    const d=[
      ...FIELDS.filter(([f])=>val(k[f])!==val(b[f])).map(([f,label])=>({field:f,label,old:val(k[f]),now:val(b[f])})),
      ...(JSON.stringify(normCustoms(k.customs))!==JSON.stringify(normCustoms(b.customs))?[{field:'customs',label:'Nhãn tùy chọn',old:JSON.stringify(normCustoms(k.customs)),now:JSON.stringify(normCustoms(b.customs))}]:[])
    ];
    if(d.length&&await confirmFn(k,d)){Object.assign(k,pick(b));res.updated=true}
   }
   c.customerId=k.id;
   // Hợp đồng và khách hàng ở 2 bảng khác nhau -> ghi song song, mỗi bên chỉ ghi đúng 1 bản ghi
   await Promise.all([this.upsert(c),...(res.created||res.updated?[S.saveOne(T.customers,JSON.parse(JSON.stringify(k)))]:[])]);
   if(res.created||res.updated)await audit(res.created?'CREATE_CUSTOMER':'UPDATE_CUSTOMER',null,`${me().username} ${res.created?'thêm':'cập nhật'} khách hàng ${k.name} (khi lưu hợp đồng ${c.so||''})`);
   return res},
  async saveCustomer(k){needMe();if(!isMgr(me()))throw new Error('Chỉ quản lý trở lên được sửa thông tin khách hàng');
   k=JSON.parse(JSON.stringify(k));const i=DB.customers.findIndex(x=>x.id===k.id);i<0?DB.customers.push(k):DB.customers[i]=k;await S.saveOne(T.customers,k);
   await audit(i<0?'CREATE_CUSTOMER':'UPDATE_CUSTOMER',null,`${me().username} ${i<0?'thêm':'sửa'} khách hàng ${k.name}`)},
  async remove(id){needMe();const prev=DB.contracts.find(x=>x.id===id);if(prev&&!canEdit(prev))throw new Error('Bạn không có quyền xóa hợp đồng của nhân viên khác');
   if(prev)await audit('DELETE_CONTRACT',prev.employeeId||null,`${me().username} xóa hợp đồng ${hdesc(prev)}${prev.employeeUser?' do '+prev.employeeUser+' lập':''}`); // ghi nhật ký trước khi xóa
   DB.contracts=DB.contracts.filter(x=>x.id!==id);await S.removeOne(T.contracts,id)},
  get:id=>visible().find(x=>x.id===id),
  visible,canSee,
  canEdit,isMgr:()=>isMgr(me()),
  // ---- Nhân viên nào đã lập hợp đồng nào ----
  byEmployee:id=>visible().filter(c=>c.employeeId===id),
  unassigned:()=>visible().filter(c=>!c.employeeId),
  // Danh sách nhân viên đã lập ít nhất 1 hợp đồng (tên lấy theo hợp đồng cập nhật gần nhất của người đó)
  employees(){const m=new Map();[...visible()].sort((a,b)=>String(a.updated||'').localeCompare(String(b.updated||''))).forEach(c=>{if(c.employeeId)m.set(c.employeeId,{id:c.employeeId,user:c.employeeUser||'',name:c.employeeName||c.employeeUser||''})});
   return[...m.values()].sort((a,b)=>vi(a.name,b.name))}};
})();
