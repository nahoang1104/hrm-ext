(function(g){
 const round=n=>Math.round(Number(n)||0);
 function calcInsurance(input={}){
  const policy=input.policy||{}, region=String(input.region||'I').toUpperCase();
  const min=Number(policy['minimumWage'+region]||0), cap=Number(policy.insuranceCap||0);
  const raw=Number(input.salaryBase||0), base=round(Math.min(cap||raw,Math.max(min,raw)));
  const exempt=Number(input.unpaidLeaveDays||0)>=14;
  const rates={employee:{xh:Number(policy.employeeSI??8)/100,yt:Number(policy.employeeHI??1.5)/100,tn:Number(policy.employeeUI??1)/100},employer:{xh:Number(policy.employerSI??17.5)/100,yt:Number(policy.employerHI??3)/100,tn:Number(policy.employerUI??1)/100}};
  const calc=side=>Object.fromEntries(Object.entries(rates[side]).map(([k,v])=>[k,exempt?0:round(base*v)]));
  return {base:exempt?0:base,rawBase:raw,min,cap,exempt,employee:calc('employee'),employer:calc('employer'),totalEmployee:exempt?0:Object.values(calc('employee')).reduce((a,b)=>a+b,0),totalEmployer:exempt?0:Object.values(calc('employer')).reduce((a,b)=>a+b,0),warnings:raw<min?[`Cơ sở đóng BH (${raw.toLocaleString('vi-VN')}) thấp hơn sàn vùng ${region} (${min.toLocaleString('vi-VN')})`]:[]};
 }
 g.CalcInsurance={calc:calcInsurance}; if(typeof module!=='undefined'&&module.exports)module.exports={calc:calcInsurance};
})(typeof window!=='undefined'?window:globalThis);
