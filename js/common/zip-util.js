/* ZIP store (không nén), dùng chung DOCX/XLSX; không cần thư viện ngoài. */
(function(g){
 const CRC=(function(){const t=new Uint32Array(256);for(let n=0;n<256;n++){let v=n;for(let j=0;j<8;j++)v=v&1?0xEDB88320^(v>>>1):v>>>1;t[n]=v>>>0}return t})();
 const crc32=b=>{let v=0xFFFFFFFF;for(let i=0;i<b.length;i++)v=CRC[(v^b[i])&255]^(v>>>8);return(v^0xFFFFFFFF)>>>0};
 const u16=n=>[n&255,(n>>>8)&255],u32=n=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
 function build(files,mime){
  const enc=new TextEncoder(),now=new Date(),dTime=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1),dDate=((Math.max(1980,now.getFullYear())-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
  const parts=[],central=[];let offset=0;
  for(const f of files){const name=enc.encode(f.name),data=f.data instanceof Uint8Array?f.data: f.data instanceof ArrayBuffer?new Uint8Array(f.data):enc.encode(String(f.data??'')),crc=crc32(data);
   const local=Uint8Array.from([...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(dTime),...u16(dDate),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0)]);
   parts.push(local,name,data);
   central.push(Uint8Array.from([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(dTime),...u16(dDate),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset)]),name);
   offset+=local.length+name.length+data.length;
  }
  const cdSize=central.reduce((s,x)=>s+x.length,0),end=Uint8Array.from([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(cdSize),...u32(offset),...u16(0)]);
  return new Blob([...parts,...central,end],{type:mime||'application/octet-stream'});
 }
 g.ZipUtil={build,crc32};if(typeof module!=='undefined'&&module.exports)module.exports=g.ZipUtil;
})(typeof window!=='undefined'?window:globalThis);
