(function(g){
 'use strict';
 const manager=()=>{if(!g.HRX?.isMgr())throw Error('Chỉ quản lý được truy cập dữ liệu thuế')};
 const yearOk=y=>Number.isInteger(Number(y))&&Number(y)>=2020&&Number(y)<=2100;
 const quarterMonths=q=>{const n=Number(q);if(n<1||n>4)throw Error('Quý không hợp lệ');return Array.from({length:12},(_,i)=>i+1).slice((n-1)*3,n*3).map(m=>String(m).padStart(2,'0'))};
 function visibleRows(rows,staff){if(g.HRX.isSA())return rows;const allowed=new Set(staff.filter(x=>x.role==='EMPLOYEE').map(x=>x.id));return rows.filter(x=>allowed.has(x.uid))}
 function quarterTotals(rows,staff,year,quarter){
  const months=quarterMonths(quarter),allowed=visibleRows(rows,staff).filter(r=>months.includes(String(r.ym||'').slice(5,7))&&r.tt==='DA_CHI');
  const names=new Map(staff.map(x=>[x.id,x.fullName||x.username||x.id])),by=new Map();
  for(const r of allowed){let x=by.get(r.uid);if(!x){x={uid:r.uid,name:names.get(r.uid)||r.uid,months:0,taxableIncome:0,exemptOvertime:0,insurance:0,taxWithheld:0,gross:0};by.set(r.uid,x)}const o=r.out||{};x.months++;x.taxableIncome+=Number(o.taxableIncome??o.gross??0);x.exemptOvertime+=Number(o.taxBreakdown?.overtimeExempt||0);x.insurance+=Number(o.insurance?.totalEmployee||0);x.taxWithheld+=Number(o.tax||0);x.gross+=Number(o.gross||0)}
  const people=[...by.values()].sort((a,b)=>a.name.localeCompare(b.name,'vi'));
  const totals=people.reduce((a,x)=>{for(const k of ['months','taxableIncome','exemptOvertime','insurance','taxWithheld','gross'])a[k]+=x[k];return a},{employees:people.length,months:0,taxableIncome:0,exemptOvertime:0,insurance:0,taxWithheld:0,gross:0});
  return {year:Number(year),quarter:Number(quarter),period:`${year}-Q${quarter}`,months:months.map(m=>`${year}-${m}`),people,totals};
 }
 function annualTotals(rows,staff,year){
  const allowed=visibleRows(rows,staff).filter(r=>String(r.ym||'').startsWith(String(year)+'-')&&r.tt==='DA_CHI');
  const names=new Map(staff.map(x=>[x.id,x.fullName||x.username||x.id])),by=new Map();
  for(const r of allowed){let x=by.get(r.uid);if(!x){x={uid:r.uid,name:names.get(r.uid)||r.uid,months:0,grossTaxable:0,insurance:0,personalDeduction:0,dependentDeduction:0,dependentMonths:0,taxWithheld:0,exemptOvertime:0,annualTax:0,balance:0,refund:0,payable:0};by.set(r.uid,x)}const o=r.out||{},tc=r.snapshot?.taxContext||{};x.months++;x.grossTaxable+=Number(o.taxableIncome??o.gross??0);x.insurance+=Number(o.insurance?.totalEmployee||0);x.personalDeduction+=Number(tc.personalDeduction??15500000);x.dependentMonths+=Math.max(0,Number(tc.dependentCount)||0);x.dependentDeduction+=Math.max(0,Number(tc.dependentCount)||0)*Number(tc.dependentDeduction??6200000);x.taxWithheld+=Number(o.tax||0);x.exemptOvertime+=Number(o.taxBreakdown?.overtimeExempt||0)}
  for(const x of by.values()){const base=Math.max(0,x.grossTaxable-x.insurance-x.personalDeduction-x.dependentDeduction),calc=g.CalcTax.progressive(base,'year');x.taxable=calc.taxable;x.annualTax=calc.tax;x.balance=x.annualTax-x.taxWithheld;x.refund=Math.max(0,-x.balance);x.payable=Math.max(0,x.balance)}
  const people=[...by.values()].sort((a,b)=>a.name.localeCompare(b.name,'vi'));
  const totals=people.reduce((a,x)=>{for(const k of ['months','grossTaxable','insurance','personalDeduction','dependentDeduction','taxWithheld','annualTax','refund','payable'])a[k]+=x[k];return a},{employees:people.length,months:0,grossTaxable:0,insurance:0,personalDeduction:0,dependentDeduction:0,taxWithheld:0,annualTax:0,refund:0,payable:0});
  return {year:Number(year),people,totals};
 }
 async function loadYear(year){return g.HX.load('payroll',Number(year))}
 async function quarterSummary(year,quarter){manager();if(!yearOk(year))throw Error('Năm không hợp lệ');if(Number(year)===2026&&Number(quarter)<3)throw Error('Mẫu theo Thông tư 89 áp dụng từ ngày 01/07/2026; quý I và quý II/2026 phải xử lý theo kỳ/mẫu chuyển tiếp trước đó.');const [rows,staff]=await Promise.all([loadYear(year),g.HRX.staff()]);return quarterTotals(rows,staff,year,quarter)}
 async function annualSummary(year){manager();if(!yearOk(year))throw Error('Năm không hợp lệ');const [rows,staff]=await Promise.all([loadYear(year),g.HRX.staff()]);return annualTotals(rows,staff,year)}
 async function saveDraft(year,quarter,summary){manager();const y=Number(year),q=Number(quarter),id=`${y}-Q${q}`,all=await g.HX.load('tax_returns',y),old=all.find(x=>x.id===id);if(old?.status==='SUBMITTED')throw Error('Tờ khai đã đánh dấu đã nộp, không thể ghi đè');const row={...(old||{}),id,type:'05/KK-TNCN',period:id,status:old?.status==='EXPORTED'?'EXPORTED':'DRAFT',data:JSON.stringify(summary),updated:new Date().toISOString()};await g.HX.save('tax_returns',y,row);await g.HRX.log('SAVE_TAX_RETURN_DRAFT',null,'Lưu dữ liệu nháp tờ khai TNCN '+id);return row}
 async function markExported(year,quarter,summary){const row=await saveDraft(year,quarter,summary);row.status='EXPORTED';row.exportedAt=new Date().toISOString();await g.HX.save('tax_returns',Number(year),row);await g.HRX.log('EXPORT_TAX_RETURN_SUMMARY',null,'Xuất bảng tổng hợp khấu trừ TNCN '+row.period);return row}
 async function markSubmitted(year,quarter,extra={}){manager();if(!g.HRX.isSA())throw Error('Chỉ SUPER_ADMIN được xác nhận đã nộp tờ khai');const y=Number(year),id=`${y}-Q${Number(quarter)}`,all=await g.HX.load('tax_returns',y),row=all.find(x=>x.id===id);if(!row)throw Error('Chưa có dữ liệu nháp tờ khai');row.status='SUBMITTED';row.submittedAt=extra.submittedAt||new Date().toISOString();row.transactionId=String(extra.transactionId||'').trim();row.amount=Math.max(0,Math.round(Number(extra.amount)||0));row.updated=new Date().toISOString();await g.HX.save('tax_returns',y,row);await g.HRX.log('SUBMIT_TAX_RETURN',null,'Xác nhận đã nộp tờ khai TNCN '+id);return row}
 async function returnStatus(year,quarter){manager();return (await g.HX.load('tax_returns',Number(year))).find(x=>x.id===`${year}-Q${Number(quarter)}`)||null}
 async function saveSettlement(year,summary){manager();const y=Number(year);if(!yearOk(y))throw Error('Năm không hợp lệ');const existing=await g.HX.load('tax_settle',y),saved=[];for(const p of summary.people){const old=existing.find(x=>x.id===p.uid+'_'+y);if(old?.status==='FINAL')continue;const row={...(old||{}),id:p.uid+'_'+y,uid:p.uid,year:y,data:JSON.stringify(p),status:'DRAFT'};await g.HX.save('tax_settle',y,row);saved.push(row)}await g.HRX.log('SAVE_TAX_SETTLEMENT_DRAFT',null,'Lưu quyết toán thuế TNCN năm '+y);return saved}
 g.TxAPI={quarterSummary,annualSummary,saveDraft,markExported,markSubmitted,returnStatus,saveSettlement,quarterTotals,annualTotals};
 if(typeof module!=='undefined'&&module.exports)module.exports={quarterTotals,annualTotals};
})(typeof window!=='undefined'?window:globalThis);
