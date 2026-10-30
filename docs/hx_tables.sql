-- Schema tương thích với adapter hiện tại https://kio.dvqt.vn/list.js + krud.js.
-- Đã kiểm tra js/api/kio-api.js: adapter chỉ gửi/đọc trường payload; không sửa adapter.
-- HX lưu mỗi bản ghi bằng nhiều dòng H1|key|revision|part|count|data, theo cách của js/hopdong/data-store.js.
-- KIO có thể tự tạo bảng khi insert đầu tiên; file này là tài liệu/schema tham khảo, không tự chạy.

CREATE TABLE IF NOT EXISTS hx_company (id INT AUTO_INCREMENT PRIMARY KEY, payload VARCHAR(255));
CREATE TABLE IF NOT EXISTS hx_policy (id INT AUTO_INCREMENT PRIMARY KEY, payload VARCHAR(255));
CREATE TABLE IF NOT EXISTS hx_counters (id INT AUTO_INCREMENT PRIMARY KEY, payload VARCHAR(255));
CREATE TABLE IF NOT EXISTS hx_labor_contracts (id INT AUTO_INCREMENT PRIMARY KEY, payload VARCHAR(255));
CREATE TABLE IF NOT EXISTS hx_contract_annex (id INT AUTO_INCREMENT PRIMARY KEY, payload VARCHAR(255));
CREATE TABLE IF NOT EXISTS hx_shifts (id INT AUTO_INCREMENT PRIMARY KEY, payload VARCHAR(255));
CREATE TABLE IF NOT EXISTS hx_holidays (id INT AUTO_INCREMENT PRIMARY KEY, payload VARCHAR(255));
CREATE TABLE IF NOT EXISTS hx_dependents (id INT AUTO_INCREMENT PRIMARY KEY, payload VARCHAR(255));

CREATE TABLE IF NOT EXISTS hx_documents_2026 (id INT AUTO_INCREMENT PRIMARY KEY, payload VARCHAR(255));
CREATE TABLE IF NOT EXISTS hx_documents_2027 (id INT AUTO_INCREMENT PRIMARY KEY, payload VARCHAR(255));
CREATE TABLE IF NOT EXISTS hx_timesheets_2026 (id INT AUTO_INCREMENT PRIMARY KEY, payload VARCHAR(255));
CREATE TABLE IF NOT EXISTS hx_timesheets_2027 (id INT AUTO_INCREMENT PRIMARY KEY, payload VARCHAR(255));
CREATE TABLE IF NOT EXISTS hx_leave_2026 (id INT AUTO_INCREMENT PRIMARY KEY, payload VARCHAR(255));
CREATE TABLE IF NOT EXISTS hx_leave_2027 (id INT AUTO_INCREMENT PRIMARY KEY, payload VARCHAR(255));
CREATE TABLE IF NOT EXISTS hx_payroll_2026 (id INT AUTO_INCREMENT PRIMARY KEY, payload VARCHAR(255));
CREATE TABLE IF NOT EXISTS hx_payroll_2027 (id INT AUTO_INCREMENT PRIMARY KEY, payload VARCHAR(255));
CREATE TABLE IF NOT EXISTS hx_tax_returns_2026 (id INT AUTO_INCREMENT PRIMARY KEY, payload VARCHAR(255));
CREATE TABLE IF NOT EXISTS hx_tax_returns_2027 (id INT AUTO_INCREMENT PRIMARY KEY, payload VARCHAR(255));
CREATE TABLE IF NOT EXISTS hx_tax_settle_2026 (id INT AUTO_INCREMENT PRIMARY KEY, payload VARCHAR(255));
CREATE TABLE IF NOT EXISTS hx_tax_settle_2027 (id INT AUTO_INCREMENT PRIMARY KEY, payload VARCHAR(255));

-- P2: annual leave entitlement configuration (one record per employee).
CREATE TABLE IF NOT EXISTS hx_leave_entitlements (id INT AUTO_INCREMENT PRIMARY KEY, payload VARCHAR(255) NOT NULL);
