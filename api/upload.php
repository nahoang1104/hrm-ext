<?php
/**
 * api/upload.php — nhận file từ trình duyệt và ghi vào thư mục uploads/ trên MÁY CHỦ.
 *
 * Giao thức (POST, multipart/form-data, header "X-Requested-With: hrm"):
 *   action=put  owner=<id nhân sự>  type=profile|degrees|certificates  file=<tệp>
 *       -> {"ok":true,"path":"uploads/{owner}/{type}/{tên-ngẫu-nhiên}.{ext}"}
 *   action=del  path=uploads/{owner}/{type}/{tên}
 *       -> {"ok":true}
 * Đọc file: trình duyệt tải thẳng đường dẫn tĩnh "uploads/..." (tên 128 bit ngẫu nhiên, không đoán được).
 *
 * Tên file do SERVER tạo (client chỉ được chọn owner/type). Loại file xác định bằng chữ ký đầu file,
 * không tin tên/MIME client gửi. Chỉ ghi jpg/png/webp/pdf.
 *
 * LƯU Ý BẢO MẬT: HRM không có backend đăng nhập, quyền chỉ kiểm ở trình duyệt, nên file này KHÔNG biết
 * người gọi là ai. Nó chỉ chặn: gọi chéo trang (header tùy chỉnh + kiểm Origin), loại/dung lượng file sai,
 * đường dẫn lạ. Muốn chặn hẳn người lạ thì phải có phiên đăng nhập phía PHP.
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function fail($code, $msg) {
    http_response_code($code);
    echo json_encode(array('ok' => false, 'error' => $msg), JSON_UNESCAPED_UNICODE);
    exit;
}

// Giới hạn theo loại (khớp checkFile trong js/api/hr-api.js: ảnh đại diện ≤2MB, bằng/chứng chỉ ≤5MB)
$LIMIT = array('profile' => 2 * 1048576, 'degrees' => 5 * 1048576, 'certificates' => 5 * 1048576, 'labor_contracts' => 5 * 1048576, 'documents' => 5 * 1048576, 'leave' => 5 * 1048576, 'dependents' => 5 * 1048576);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail(405, 'Chỉ chấp nhận POST');
if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'hrm') fail(403, 'Yêu cầu không hợp lệ');

// Cùng nguồn gốc (bỏ qua nếu không có Origin). Chạy sau reverse proxy đổi Host thì sửa/bỏ đoạn này.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '') {
    $oh = parse_url($origin, PHP_URL_HOST);
    $op = parse_url($origin, PHP_URL_PORT);
    $o = $oh . ($op ? ':' . $op : '');
    if (strcasecmp($o, $_SERVER['HTTP_HOST'] ?? '') !== 0) fail(403, 'Nguồn gốc yêu cầu không hợp lệ');
}

$root = __DIR__ . '/../uploads';
if (!is_dir($root)) @mkdir($root, 0755, true);
$root = realpath($root);
if ($root === false) fail(500, 'Không tìm thấy thư mục uploads/ trên máy chủ');

$action = (string)($_POST['action'] ?? '');

if ($action === 'put') {
    $owner = (string)($_POST['owner'] ?? '');
    $type = (string)($_POST['type'] ?? '');
    if (!preg_match('/^[A-Za-z0-9_-]{1,64}$/', $owner)) fail(400, 'Mã chủ file không hợp lệ');
    if (!isset($LIMIT[$type])) fail(400, 'Loại file không hợp lệ');

    $f = $_FILES['file'] ?? null;
    if (!is_array($f)) fail(400, 'Thiếu file');
    if ($f['error'] !== UPLOAD_ERR_OK) {
        if ($f['error'] === UPLOAD_ERR_INI_SIZE || $f['error'] === UPLOAD_ERR_FORM_SIZE)
            fail(413, 'File vượt giới hạn của máy chủ (tăng upload_max_filesize và post_max_size trong php.ini)');
        fail(400, 'Tải file lên thất bại (mã ' . (int)$f['error'] . ')');
    }
    $tmp = $f['tmp_name'];
    if (!is_uploaded_file($tmp)) fail(400, 'File không hợp lệ');

    $size = filesize($tmp);
    if (!$size) fail(400, 'File rỗng');
    if ($size > $LIMIT[$type]) fail(413, 'File vượt quá ' . ($LIMIT[$type] / 1048576) . 'MB');

    // Xác định loại bằng chữ ký đầu file
    $fh = fopen($tmp, 'rb');
    $head = $fh ? fread($fh, 12) : '';
    if ($fh) fclose($fh);
    $hex = bin2hex($head);
    $mime = '';
    $ext = '';
    if (strpos($hex, '89504e47') === 0) { $mime = 'image/png'; $ext = 'png'; }
    elseif (strpos($hex, 'ffd8ff') === 0) { $mime = 'image/jpeg'; $ext = 'jpg'; }
    elseif (strpos($hex, '52494646') === 0 && substr($hex, 16, 8) === '57454250') { $mime = 'image/webp'; $ext = 'webp'; }
    elseif (strpos($hex, '25504446') === 0) { $mime = 'application/pdf'; $ext = 'pdf'; }
    if ($mime === '') fail(415, 'Định dạng file không hợp lệ (ảnh JPG/PNG/WebP' . ($type === 'profile' ? '' : ' hoặc PDF') . ')');
    if ($type === 'profile' && $mime === 'application/pdf') fail(415, 'Ảnh đại diện chỉ nhận JPG/PNG/WebP');
    if ($ext !== 'pdf' && function_exists('getimagesize') && @getimagesize($tmp) === false) fail(415, 'Nội dung ảnh không hợp lệ');

    $dir = $root . '/' . $owner . '/' . $type;
    if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir))
        fail(500, 'Không tạo được thư mục lưu file (kiểm tra quyền ghi của uploads/)');

    $name = sprintf('%d-%s.%s', (int)round(microtime(true) * 1000), bin2hex(random_bytes(16)), $ext);
    $dest = $dir . '/' . $name;
    if (!move_uploaded_file($tmp, $dest)) fail(500, 'Không ghi được file (kiểm tra quyền ghi của uploads/)');
    @chmod($dest, 0644);

    echo json_encode(array('ok' => true, 'path' => 'uploads/' . $owner . '/' . $type . '/' . $name, 'size' => $size, 'mime' => $mime));
    exit;
}

if ($action === 'del') {
    $path = (string)($_POST['path'] ?? '');
    if (!preg_match('#^uploads/([A-Za-z0-9_-]{1,64})/(profile|degrees|certificates|labor_contracts|documents|leave|dependents)/([A-Za-z0-9._-]{1,100}\.(?:jpg|png|webp|pdf))$#', $path, $m)
        || strpos($m[3], '..') !== false) fail(400, 'Đường dẫn không hợp lệ');

    $real = realpath($root . '/' . $m[1] . '/' . $m[2] . '/' . $m[3]);
    if ($real === false) { echo json_encode(array('ok' => true, 'deleted' => false)); exit; } // đã không còn
    if (strpos($real, $root . DIRECTORY_SEPARATOR) !== 0) fail(403, 'Đường dẫn không hợp lệ');

    echo json_encode(array('ok' => true, 'deleted' => (bool)@unlink($real)));
    exit;
}

fail(400, 'Hành động không hợp lệ');
