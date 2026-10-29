const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('XLSX builder emits OOXML package with typed numbers and text',()=>{
 const ctx={module:{exports:{}},TextEncoder,Uint8Array,Uint32Array,Blob,Date,URL,globalThis:null};ctx.globalThis=ctx;ctx.window=ctx;
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/common/zip-util.js'),'utf8'),{window:ctx,TextEncoder,Uint8Array,Uint32Array,Blob,Date});
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/common/xlsx-builder.js'),'utf8'),ctx);
 const blob=ctx.module.exports.build([{name:'Tiếng Việt',amount:123,cccd:'00123'}],{headers:['name','amount','cccd']});
 return blob.arrayBuffer().then(buf=>{const s=Buffer.from(buf).toString('latin1');assert.ok(s.includes('xl/workbook.xml'));assert.ok(s.includes('xl/worksheets/sheet1.xml'));assert.ok(s.includes('123'));assert.ok(s.includes('00123'));});
});
