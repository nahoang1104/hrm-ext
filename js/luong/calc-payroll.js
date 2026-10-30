(function(g){
 const money=n=>Math.round(Number(n)||0);
 function calculate(input={}){
  const profile=input.profile||{}, changes=input.adjustments||{}, pc=Array.isArray(input.allowances)?input.allowances:[];
  const salaryMonthly=money(input.salaryMonthly??profile.salaryMonthly); if(!Number.isSafeInteger(salaryMonthly)||salaryMonthly<0)throw Error('Lương cơ bản tháng không hợp lệ');
  const attendance=input.attendance||null;
  const attendanceFactor=attendance&&Number(attendance.scheduledWorkDays)>0?Math.max(0,Math.min(1,Number(attendance.paidWorkDays||0)/Number(attendance.scheduledWorkDays))):1;
  const base=money(input.baseOverride==null?salaryMonthly*attendanceFactor:input.baseOverride);
  const allowances=pc.reduce((s,x)=>s+money(x.so),0), bonus=money(changes.bonus), other=money(changes.otherIncome), gross=base+allowances+bonus+other;
  const insurance=(g.CalcInsurance||{}).calc?g.CalcInsurance.calc({salaryBase:input.insuranceSalaryBase==null?base+pc.filter(x=>x.bh).reduce((s,x)=>s+money(x.so),0):money(input.insuranceSalaryBase),region:input.region,policy:input.policy,unpaidLeaveDays:input.unpaidLeaveDays}):{base:0,employee:{xh:0,yt:0,tn:0},employer:{xh:0,yt:0,tn:0},totalEmployee:0,totalEmployer:0};
  const tax=money(changes.tax), deduction=money(changes.deduction), advance=money(changes.advance), net=gross-insurance.totalEmployee-tax-deduction-advance;
  const lines=[{label:'Lương cơ bản theo ngày công',amount:base,note:attendance?`Lương tháng ${salaryMonthly.toLocaleString('vi-VN')} × ${Number(attendance.paidWorkDays||0)}/${Number(attendance.scheduledWorkDays||0)} ngày công hưởng lương.`:'Lương cơ bản tháng lấy từ hồ sơ nhân sự.'},...pc.map(x=>({label:'Phụ cấp: '+String(x.ten||''),amount:money(x.so),note:x.bh?'Tính vào cơ sở đóng BH theo cấu hình phụ cấp.':'Không tính vào cơ sở đóng BH theo cấu hình phụ cấp.'})),{label:'Thưởng',amount:bonus},{label:'Khoản cộng khác',amount:other},{label:'BHXH người lao động',amount:-insurance.employee.xh},{label:'BHYT người lao động',amount:-insurance.employee.yt},{label:'BHTN người lao động',amount:-insurance.employee.tn},{label:'Thuế TNCN (nhập/đối soát)',amount:-tax},{label:'Khấu trừ khác',amount:-deduction},{label:'Tạm ứng',amount:-advance}];
  return {base,salaryMonthly,attendance:attendance?{scheduledWorkDays:Number(attendance.scheduledWorkDays||0),paidWorkDays:Number(attendance.paidWorkDays||0),unpaidWorkDays:Number(attendance.unpaidWorkDays||0)}:null,allowances,bonus,other,gross,insurance,tax,deduction,advance,net,employerCost:gross+insurance.totalEmployer,lines,calculationMode:attendance?'ATTENDANCE_PRORATED':'MONTHLY_FIXED',warnings:insurance.warnings||[]};
 }
 g.CalcPayroll={calculate}; if(typeof module!=='undefined'&&module.exports)module.exports={calculate};
})(typeof window!=='undefined'?window:globalThis);
