// Tiện ích giao diện dùng chung cho các màn hình hợp đồng/khách hàng. Dùng lại helper của HRM (js/app.js):
// avaBox, statRow, pager, empty, ask, toast, run. Các hàm đó chỉ được gọi lúc chạy nên thứ tự nạp script không quan trọng.
window.HDUI=(function(){
 const PAGE=25;
 // Phân trang phía trình duyệt, cùng dạng kết quả với API.listUsers: {items,total,page,pages,pageSize}
 const paged=(all,page)=>{const pages=Math.max(1,Math.ceil(all.length/PAGE)),p=Math.min(Math.max(1,+page||1),pages);
  return{items:all.slice((p-1)*PAGE,p*PAGE),total:all.length,page:p,pages,pageSize:PAGE}};
 // Tìm kiếm không phân biệt hoa/thường/dấu (giống HRM)
 const nd=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d');
 // Ô \"Người lập\": avatar chữ cái + họ tên + @username; hợp đồng cũ chưa gán thì hiện nhãn xám
 const emp=c=>c.employeeId?`<div class="usercell">${avaBox('',c.employeeName||c.employeeUser)}<div><div class="cell-main">${esc(c.employeeName||c.employeeUser)}</div>${c.employeeUser?`<div class="cell-sub">@${esc(c.employeeUser)}</div>`:''}</div></div>`:'<span class="tag slate">Chưa gán</span>';
 const day=s=>s?new Date(s).toLocaleDateString('vi-VN'):'—';
 // Phân trang: mỗi danh sách đăng ký hàm xử lý theo tên (nút/ô nhập số trang của HRM gọi HD_PAGE(tên, số trang))
 const pageHandlers={};
 return{PAGE,paged,nd,emp,day,pageHandlers}})();
window.HD_PAGE=(w,p)=>{const f=HDUI.pageHandlers[w];if(f)f(p)};
