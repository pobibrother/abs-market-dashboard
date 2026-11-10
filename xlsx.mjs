const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function archive(files){
  const parts=[], directory=[]; let offset=0;
  for(const [path,xml] of Object.entries(files)){
    const data=Buffer.from(xml),name=Buffer.from(path);
    let crc=-1; for(const byte of data){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}
    const head=Buffer.alloc(30);head.writeUInt32LE(0x04034b50);head.writeUInt16LE(20,4);head.writeUInt32LE((~crc)>>>0,14);
    head.writeUInt32LE(data.length,18);head.writeUInt32LE(data.length,22);head.writeUInt16LE(name.length,26);
    const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);head.copy(central,6,4,28);central.writeUInt32LE(offset,42);
    parts.push(head,name,data);directory.push(central,name);offset+=head.length+name.length+data.length;
  }
  const index=Buffer.concat(directory),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(directory.length/2,8);end.writeUInt16LE(directory.length/2,10);end.writeUInt32LE(index.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...parts,index,end]);
}
export function workbook(rows){
  const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main', rel='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const relationships=(type,target)=>'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="'+rel+'/'+type+'" Target="'+target+'"/></Relationships>';
  const data=[['SPC명','회차','신용보강 주체','등급','거래금리(%)','발행액(억원)','발행일','만기','평가서 주소','PF구분','종류','발행주관사'],...rows.map(r=>[r.name,r.issue,r.support,r.grade,r.rate??'대기',r.amount,r.date,r.maturity,r.reports.map(a=>a.url).join('\n'),r.pf,r.kind,r.manager])];
  return archive({'[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels':relationships('officeDocument','xl/workbook.xml'),'xl/_rels/workbook.xml.rels':relationships('worksheet','worksheets/sheet1.xml'),
    'xl/workbook.xml':'<workbook xmlns="'+ns+'" xmlns:r="'+rel+'"><sheets><sheet name="발행 회차" sheetId="1" r:id="rId1"/></sheets></workbook>',
    'xl/worksheets/sheet1.xml':'<worksheet xmlns="'+ns+'"><sheetData>'+data.map((row,i)=>'<row r="'+(i+1)+'">'+row.map(v=>typeof v==='number'?'<c><v>'+v+'</v></c>':'<c t="inlineStr"><is><t>'+esc(v)+'</t></is></c>').join('')+'</row>').join('')+'</sheetData></worksheet>'});
}
