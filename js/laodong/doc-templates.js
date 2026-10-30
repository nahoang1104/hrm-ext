/* Mẫu nội dung văn bản nhân sự; thông tin đưa vào XML phải được escape tại docx-labor.js. */
(function(g){'use strict';g.LaborDocTemplates={
 labor:{title:'HỢP ĐỒNG LAO ĐỘNG',subject:'',body:[]},
 decision:{title:'QUYẾT ĐỊNH',subject:'Về việc {noiDung}',body:['Căn cứ nhu cầu tổ chức và quản lý nhân sự của đơn vị;','Xét đề nghị của bộ phận phụ trách nhân sự;','QUYẾT ĐỊNH:','Điều 1. {noiDung}.','Điều 2. Quyết định này có hiệu lực kể từ ngày {ngayHieuLuc}.','Điều 3. Các bộ phận, cá nhân có liên quan chịu trách nhiệm thi hành Quyết định này.']},
 notice:{title:'THÔNG BÁO',subject:'Về việc {noiDung}',body:['Kính gửi: {nguoiNhan}','Đơn vị thông báo nội dung như sau:','{noiDung}','Đề nghị các cá nhân, bộ phận liên quan phối hợp thực hiện kể từ ngày {ngayHieuLuc}.','Trân trọng thông báo.']},
 employment:{title:'GIẤY XÁC NHẬN CÔNG TÁC',subject:'',body:['Đơn vị xác nhận ông/bà: {hoTen}','Ngày sinh: {ngaySinh}','Chức danh: {chucDanh}','Bộ phận: {phongBan}','Thời gian công tác: từ {tuNgay} đến {denNgay}','Thu nhập/lương xác nhận (nếu có): {thuNhap} VNĐ/tháng.','Giấy xác nhận này được cấp theo đề nghị của người lao động để sử dụng vào mục đích hợp pháp.']},
 income:{title:'GIẤY XÁC NHẬN THU NHẬP',subject:'',body:['Đơn vị xác nhận ông/bà: {hoTen}','Chức danh: {chucDanh}','Thu nhập bình quân/tháng: {thuNhap} VNĐ.','Khoảng thời gian xác nhận: {tuNgay} đến {denNgay}.','Giấy xác nhận này được cấp theo đề nghị của người lao động.']}
};})(window);
