const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('Policy.at selects the correct effective base salary',async()=>{
 const rows=[];const ctx={Date,Promise,console};ctx.window=ctx;ctx.HX={async load(){return rows.slice()},async save(_name,_year,r){const i=rows.findIndex(x=>x.id===r.id);if(i<0)rows.push({...r});else rows[i]={...r}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/luong/policy-seed.js'),'utf8'),ctx);
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/luong/policy.js'),'utf8'),ctx);
 assert.equal((await ctx.Policy.at('2026-06-15')).baseSalary,2340000);
 assert.equal((await ctx.Policy.at('2026-07-15')).baseSalary,2530000);
});
