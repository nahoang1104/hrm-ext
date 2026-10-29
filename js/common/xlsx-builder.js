/* XLSX minimalista OOXML: usa ZipUtil, sem dependências. */
(function(g){
 const MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
 const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s};
 function build(rows,opts={}){
  rows=Array.isArray(rows)?rows:[];const headers=opts.headers||Object.keys(rows[0]||{}),sheet=opts.sheetName||'Sheet1';
  const xmlRows=[headers,...rows.map(r=>headers.map(h=>r&&Object.prototype.hasOwnProperty.call(r,h)?r[h]:''))].map((row,ri)=>'<row r="'+(ri+1)+'">'+row.map((v,ci)=>{
   const ref=col(ci)+(ri+1);
   if(v===null||v===undefined||v==='')return `<c r="${ref}" t="inlineStr"><is><t></t></is></c>`;
   if(typeof v==='number'&&Number.isFinite(v))return `<c r="${ref}"><v>${v}</v></c>`;
   if(typeof v==='boolean')return `<c r="${ref}" t="b"><v>${v?1:0}</v></c>`;
   return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  }).join('')+'</row>').join('');
  const files=[
   {name:'[Content_Types].xml',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'},
   {name:'_rels/.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
   {name:'xl/workbook.xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheet).slice(0,31)}" sheetId="1" r:id="rId1"/></sheets></workbook>`},
   {name:'xl/_rels/workbook.xml.rels',data:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'},
   {name:'xl/worksheets/sheet1.xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${xmlRows}</sheetData></worksheet>`}
  ];
  const zip=(g.ZipUtil||(typeof require==='function'?require('./zip-util.js'):null));if(!zip)throw Error('ZipUtil chưa được nạp');return zip.build(files,MIME);
 }
 function download(rows,opts={}){const blob=build(rows,opts),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=opts.filename||'export.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return blob}
 g.XLSXBuilder={build,download};
 if(typeof module!=='undefined'&&module.exports)module.exports={build};
})(typeof window!=='undefined'?window:globalThis);
