window.DB={contracts:[],customers:[]};
// `esc` dùng chung với HRM: khai báo ở js/app.js (nạp sau, chỉ gọi lúc chạy nên không ảnh hưởng thứ tự nạp).
const vnd=n=>Math.round(+n||0).toLocaleString('vi-VN');
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,4);
// Đọc số tiền: bỏ mọi ký tự không phải số
const money=v=>+String(v??'').replace(/\D/g,'')||0;
// Số -> chữ tiếng Việt
const D=['không','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
function r3(n,full){const t=Math.floor(n/100),c=Math.floor(n%100/10),u=n%10,s=[];
 if(t||full)s.push(D[t]+' trăm');
 if(c>1){s.push(D[c]+' mươi');if(u==1)s.push('mốt');else if(u==5)s.push('lăm');else if(u)s.push(D[u])}
 else if(c==1){s.push('mười');if(u==5)s.push('lăm');else if(u)s.push(D[u])}
 else if(u){if(t||full)s.push('lẻ');s.push(D[u])}
 return s.join(' ')}
function words(n){n=Math.round(+n||0);if(n<=0)return 'Không đồng';
 const U=['','nghìn','triệu','tỷ','nghìn tỷ','triệu tỷ'],g=[];
 while(n>0){g.push(n%1000);n=Math.floor(n/1000)}
 const out=[];for(let i=g.length-1;i>=0;i--){if(!g[i])continue;out.push(r3(g[i],i<g.length-1)+(U[i]?' '+U[i]:''))}
 const s=out.join(' ').replace(/\s+/g,' ').trim();return s[0].toUpperCase()+s.slice(1)+' đồng chẵn'}
// Quy tắc nghiệp vụ Điều 2–3:
// - Tổng = Σ chi phí. Chế độ 'amt' (mặc định): nhập số tiền → tỷ lệ = tiền/tổng. Chế độ 'pct': nhập tỷ lệ → tiền = tổng×tỷ lệ.
// - Khi đổi chế độ, giá trị đã tính được vẫn giữ nguyên và trở thành ô nhập.
const r2=n=>Math.round(n*100)/100,fmtPct=n=>String(r2(+n||0)).replace('.',',');
function syncPays(c){const total=c.items.reduce((s,i)=>s+money(i.cost),0);
 // 'pct': tiền = tổng×tỷ lệ. 'amt': dòng đã được nhập tay (lock) giữ nguyên tiền, tỷ lệ = tiền/tổng; dòng chưa nhập tay theo tỷ lệ mặc định.
 c.pays.forEach(p=>{if(c.payMode!=='pct'&&p.lock){if(total)p.pct=money(p.amt)/total*100}else p.amt=Math.round(total*(+p.pct||0)/100)});
 return total}
function calc(c){const total=syncPays(c);
 return{total,words:words(total),pays:c.pays,pctSum:r2(c.pays.reduce((s,p)=>s+(+p.pct||0),0)),amtSum:c.pays.reduce((s,p)=>s+money(p.amt),0)}}

// Nội dung "rich": HTML do trình soạn thảo lưu (chỉ strong/em/u/br). Chuỗi thường được hiểu là văn bản.
const isRich=s=>/<\/?(strong|b|em|i|u|br)\b|&(amp|lt|gt|quot|#39|nbsp);/i.test(String(s??''));
// Văn bản dính thẻ HTML "lạc" (vd. <li style=...> dán nguyên chữ) -> bỏ thẻ, mỗi <li>/<p>/<div> thành một dòng, giữ strong/em/u
function cleanLines(s){s=String(s??'');if(!/<\/?(li|ul|ol|p|div|span|h[1-6]|table|tr|td|font)\b/i.test(s))return s;
 return s.replace(/<br\s*\/?>/gi,'\n').replace(/<\/(li|p|div|h[1-6]|tr)>/gi,'\n').replace(/<(?!\/?(?:strong|b|em|i|u)\b)[^>]*>/gi,'').replace(/&nbsp;/g,' ').replace(/\n{2,}/g,'\n').trim()}
