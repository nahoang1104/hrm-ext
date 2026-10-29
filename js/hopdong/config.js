// Mọi tên bảng khai báo tập trung tại đây (không khai báo rải rác trong module).
window.HD_CONFIG={driver:(typeof location!=='undefined'&&new URLSearchParams(location.search).get('driver'))||'kio', // 'kio' = KIO server (mặc định), 'local' = localStorage (mở index.html?driver=local)
 tables:{contracts:'hd_contracts',customers:'hd_customers'}};
