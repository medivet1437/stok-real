import './style.css';
import * as XLSX from 'xlsx';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Share } from '@capacitor/share';

const KEY='stok-real-v1'; const blank=()=>({items:[],checks:[],settings:{}});
let db=(()=>{try{return JSON.parse(localStorage.getItem(KEY))||blank()}catch{return blank()}})();
const save=()=>localStorage.setItem(KEY,JSON.stringify(db));
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const now=()=>new Date().toLocaleString('id-ID');
const sys=()=>db.items.reduce((s,x)=>s+Number(x.quantity||0),0);
const checked=()=>new Set(db.checks.map(x=>x.itemCode));
function card(a,b){return `<div class="card"><b>${esc(b)}</b><span>${a}</span></div>`}
function render(){
 const c=checked(), real=db.checks.reduce((s,x)=>s+Number(x.real||0),0), diff=db.checks.reduce((s,x)=>s+Number(x.diff||0),0);
 document.querySelector('#app').innerHTML=`<header><div class="brand">STOK REAL</div><div class="sub">Pengecekan stok barang</div></header><main>
 <section class="cards">${card('Barang',db.items.length)}${card('Stok Sistem',sys())}${card('Stok Real',real)}${card('Sudah Dicek',c.size)}${card('Belum Dicek',Math.max(0,db.items.length-c.size))}${card('Selisih',diff)}</section>
 <div class="search">🔍 <input id="q" placeholder="Cari kode, nama, barcode, kategori..."></div>
 <section class="actions"><button class="primary" id="add">＋ INPUT BARANG</button><button class="secondary" id="import">📥 IMPORT iREAP</button><input id="file" type="file" accept=".xlsx,.xls,.csv" hidden></section>
 <section class="panel"><div class="panel-title">Barang</div><div id="list"></div></section>
 <nav><button data-tab="dashboard">🏠<small>Dashboard</small></button><button data-tab="history">📋<small>Riwayat</small></button><button data-tab="report">📊<small>Laporan</small></button><button data-tab="backup">💾<small>Backup</small></button></nav></main>`;
 drawList(''); q.oninput=e=>drawList(e.target.value); add.onclick=addItem; import.onclick=()=>file.click(); file.onchange=importFile;
 document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
}
function drawList(q){
 const n=q.toLowerCase().trim(), arr=db.items.filter(x=>[x.code,x.name,x.barcode,x.category].join(' ').toLowerCase().includes(n)), el=list;
 el.innerHTML=arr.slice(0,100).map(x=>`<article class="item"><div><strong>${esc(x.name)}</strong><div class="muted">${esc(x.code)} · ${esc(x.category||'-')}</div></div><div class="qty">${esc(x.quantity)} ${esc(x.uom||'')}</div><button class="check" data-code="${esc(x.code)}">CEK</button></article>`).join('')||'<div class="empty">Belum ada barang. Input manual atau import file iReap.</div>';
 el.querySelectorAll('.check').forEach(b=>b.onclick=()=>checkItem(b.dataset.code));
}
function addItem(){
 const code=prompt('Kode barang / barcode:'); if(!code)return;
 if(db.items.some(x=>x.code===code))return alert('Kode sudah ada.');
 const name=prompt('Nama barang:')||'', qty=Number(prompt('Stok sistem:')||0);
 db.items.push({code,name,barcode:code,category:'',quantity:qty,minStock:0,uom:'pcs',cost:0,value:0}); save(); render();
}
async function importFile(e){
 const f=e.target.files[0]; if(!f)return;
 try{const wb=XLSX.read(await f.arrayBuffer(),{type:'array'}), rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''}); let count=0;
 for(const r of rows){const code=String(r['Item Code']??r['Kode Barang']??r['Code']??'').trim(); if(!code)continue;
  const item={code,name:String(r['Item Name']??r['Nama Barang']??''),category:String(r['Category']??r['Kategori']??''),quantity:Number(r['Quantity']??r['Qty']??0)||0,minStock:Number(r['Min Stock']??0)||0,uom:String(r['UoM']??r['Satuan']??''),cost:Number(r['Cost @ IDR']??r['Cost']??0)||0,value:Number(r['Value IDR']??r['Value']??0)||0,barcode:String(r['Barcode']??code)};
  const i=db.items.findIndex(x=>x.code===code); if(i>=0)db.items[i]={...db.items[i],...item};else db.items.push(item);count++;
 } save();render();alert(`Import selesai: ${count} baris diproses.`)
 }catch(err){alert('Gagal membaca file: '+err.message)} e.target.value='';
}
async function checkItem(code){
 const x=db.items.find(i=>i.code===code); if(!x)return;
 const real=Number(prompt(`CEK REAL\n${x.name}\nStok sistem: ${x.quantity}\n\nMasukkan stok fisik:`)); if(!Number.isFinite(real))return;
 const note=prompt('Catatan (opsional):')||''; let photo='';
 try{const p=await Camera.getPhoto({quality:70,resultType:CameraResultType.DataUrl,source:CameraSource.Prompt});photo=p.dataUrl||''}catch{}
 db.checks.push({id:crypto.randomUUID(),itemCode:x.code,itemName:x.name,system:Number(x.quantity||0),real,diff:real-Number(x.quantity||0),note,photo,checkedAt:new Date().toISOString(),checkedAtText:now(),approved:false}); save();render();
}
function tab(t){
 if(t==='history'){document.querySelector('.panel').innerHTML='<div class="panel-title">Riwayat Pengecekan</div>'+(db.checks.slice().reverse().map(x=>`<article class="item"><div><strong>${esc(x.itemName)}</strong><div class="muted">${esc(x.checkedAtText)} · Sistem ${x.system} · Real ${x.real}</div></div><b>${x.diff>0?'+':''}${x.diff}</b></article>`).join('')||'<div class="empty">Belum ada riwayat.</div>')}
 if(t==='report'){const text=db.checks.map(x=>`${x.checkedAtText}\t${x.itemCode}\t${x.itemName}\t${x.system}\t${x.real}\t${x.diff}\t${x.note}`).join('\n');document.querySelector('.panel').innerHTML=`<div class="panel-title">Laporan</div><div class="report"><button class="primary" id="share">📤 SHARE DATA</button><pre>${esc(text||'Belum ada data')}</pre></div>`;share.onclick=async()=>{try{await Share.share({title:'STOK REAL',text:text||'Belum ada data'})}catch{navigator.share?.({title:'STOK REAL',text})}}}
 if(t==='backup'){document.querySelector('.panel').innerHTML='<div class="panel-title">Backup / Restore</div><div class="report"><button class="primary" id="backup">💾 BACKUP DATA</button><button class="secondary" id="restore">♻️ RESTORE DATA</button><input id="restoreFile" type="file" accept=".json" hidden><p class="muted">Backup menyimpan barang, stok, riwayat, foto, dan pengaturan.</p></div>';backup.onclick=()=>download('stok-real-backup.json',JSON.stringify(db,null,2),'application/json');restore.onclick=()=>restoreFile.click();restoreFile.onchange=restoreData}
}
function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click()}
function restoreData(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!Array.isArray(d.items)||!Array.isArray(d.checks))throw Error('Format tidak valid');if(confirm(`Restore ${d.items.length} barang dan ${d.checks.length} pengecekan?`)){db=d;save();render();alert('Restore berhasil.')}}catch(err){alert('Restore gagal: '+err.message)}};r.readAsText(f)}
render();