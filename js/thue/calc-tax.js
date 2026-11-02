(function(g){
 'use strict';
 const money=n=>Math.round(Number(n)||0);
 const MONTH=[{limit:10000000,rate:.05},{limit:30000000,rate:.10},{limit:60000000,rate:.20},{limit:100000000,rate:.30},{limit:Infinity,rate:.35}];
 const YEAR=[{limit:120000000,rate:.05},{limit:360000000,rate:.10},{limit:720000000,rate:.20},{limit:1200000000,rate:.30},{limit:Infinity,rate:.35}];
 function progressive(taxable,period='month'){
  const n=Math.max(0,Number(taxable)||0),bands=period==='year'?YEAR:MONTH;let left=n,prev=0,tax=0,details=[];
  for(const b of bands){const part=Math.max(0,Math.min(left,b.limit-prev));if(part>0){const amount=part*b.rate;tax+=amount;details.push({from:prev,to:b.limit,amount:money(part),rate:b.rate,tax:money(amount)});left-=part}prev=b.limit;if(left<=0)break}
  return {taxable:money(n),tax:money(tax),details,period};
 }
 function monthly(input={}){
  const resident=input.resident!==false,contract=input.contract||'LONG',gross=Math.max(0,Number(input.taxableIncome??input.gross)||0),insurance=Math.max(0,Number(input.mandatoryInsurance)||0),personal=Math.max(0,Number(input.personalDeduction??15500000)||0),dependentCount=Math.max(0,Math.floor(Number(input.dependentCount)||0)),dependentAmount=Math.max(0,Number(input.dependentDeduction??6200000)||0);
  if(!resident)return {method:'NON_RESIDENT',gross:money(gross),taxable:money(gross),tax:money(gross*.2),rate:.2,details:[{label:'Khấu trừ cá nhân không cư trú',base:money(gross),rate:.2,tax:money(gross*.2)}]};
  if(contract==='SHORT'||contract==='NONE'){
   const threshold=input.withholdingThreshold==null?null:Number(input.withholdingThreshold),eligible=input.withholdingEligible!==false&&threshold!==null&&gross>=threshold;
   const tax=eligible?money(gross*.1):0;
   return {method:'WITHHOLD_10',gross:money(gross),taxable:money(gross),tax,rate:.1,threshold,eligible,details:[{label:'Khấu trừ 10%',base:money(gross),rate:.1,tax}]};
  }
  const taxable=Math.max(0,gross-insurance-personal-dependentCount*dependentAmount),calc=progressive(taxable,'month');
  return {method:'PROGRESSIVE',gross:money(gross),insurance:money(insurance),personalDeduction:money(personal),dependentCount,dependentDeduction:money(dependentCount*dependentAmount),taxable:calc.taxable,tax:calc.tax,details:calc.details};
 }
 function annual(input={}){
  const taxable=Math.max(0,Number(input.taxableIncome)||0),dependentMonths=Array.isArray(input.dependentMonths)?input.dependentMonths:[],personalMonths=Math.max(0,Number(input.personalDeductionMonths??12)||0),personalAmount=Math.max(0,Number(input.personalDeduction??186000000)||0),dependentAmount=Math.max(0,Number(input.dependentDeduction??74400000)||0),depTotal=dependentMonths.reduce((s,n)=>s+Math.max(0,Number(n)||0),0)*dependentAmount/12;
  const insurance=Math.max(0,Number(input.mandatoryInsurance)||0),base=Math.max(0,taxable-insurance-personalAmount*personalMonths/12-depTotal),calc=progressive(base,'year'),withheld=money(input.taxWithheld||0),balance=calc.tax-withheld;
  return {gross:money(taxable),insurance:money(insurance),taxable:money(base),tax:calc.tax,taxWithheld:withheld,balance:money(balance),payable:Math.max(0,money(balance)),refund:Math.max(0,money(-balance)),details:calc.details};
 }
 g.CalcTax={progressive,monthly,annual};if(typeof module!=='undefined'&&module.exports)module.exports={progressive,monthly,annual};
})(typeof window!=='undefined'?window:globalThis);
