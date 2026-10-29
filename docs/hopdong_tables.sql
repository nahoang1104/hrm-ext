-- Chỉ dùng khi driver = 'kio'. Theo đúng yêu cầu của kio-api.js: mỗi bảng tối thiểu id + payload.
-- id PHẢI tự tăng: adapter chia mỗi bản ghi thành nhiều dòng payload (120 ký tự/dòng) rồi ghép lại theo khóa.
CREATE TABLE hd_contracts (id INT AUTO_INCREMENT PRIMARY KEY, payload VARCHAR(255));
CREATE TABLE hd_customers (id INT AUTO_INCREMENT PRIMARY KEY, payload VARCHAR(255));
