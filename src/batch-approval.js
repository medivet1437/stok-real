/* STOK REAL — Batch Approval / Batch Signature
   Adds batch signing without changing the existing localStorage data model.
*/
(() => {
  const KEY = 'stok-real-final-v1';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const fmt = n => Number(n || 0).toLocaleString('id-ID', {maximumFractionDigits: 2});
  const dt = iso => new Date(iso || Date.now()).toLocaleString('id-ID');

  function load(){
    try { return JSON.parse(localStorage.getItem(KEY)) || {items:[],imports:[],checks:[],settings:{storeName:'STOK REAL'}}; }
    catch { return {items:[],imports:[],checks:[],settings:{storeName:'STOK REAL'}}; }
  }
  function save(db){ localStorage.setItem(KEY, JSON.stringify(db)); }

  function closeModal(){ document.querySelector('.modal')?.remove(); }

  function signature(canvas){
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2; ctx.lineCap = 'round';
    let down=false, last=null;
    const pos=e=>{
      const r=canvas.getBoundingClientRect(), t=e.touches?.[0];
      return {x:(t?t.clientX:e.clientX)-r.left,y:(t?t.clientY:e.clientY)-r.top};
    };
    const start=e=>{down=true;last=pos(e);e.preventDefault()};
    const move=e=>{if(!down)return;const p=pos(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;e.preventDefault()};
    const end=()=>down=false;
    canvas.addEventListener('pointerdown',start);
    canvas.addEventListener('pointermove',move);
    canvas.addEventListener('pointerup',end);
    canvas.addEventListener('pointerleave',end);
    canvas.addEventListener('touchstart',start,{passive:false});
    canvas.addEventListener('touchmove',move,{passive:false});
    canvas.addEventListener('touchend',end);
    return ()=>canvas.toDataURL('image/png');
  }

  function openBatch(ids){
    const db=load();
    const selected=ids.map(id=>db.checks.find(x=>x.id===id)).filter(x=>x && !x.locked);
    if(!selected.length){ alert('Pilih minimal satu pemeriksaan yang masih menunggu persetujuan.'); return; }

    const totalDiff=selected.reduce((s,x)=>s+Number(x.diff||0),0);
    const modal=document.createElement('div');
    modal.className='modal';
    modal.innerHTML=`<div class="sheet">
      <h2>✍️ Pengesahan Pemeriksaan</h2>
      <div class="detail">
        <b>${selected.length} pemeriksaan akan disahkan</b>
        <p>Total selisih: <strong>${totalDiff>0?'+':''}${fmt(totalDiff)}</strong></p>
        <div class="muted">${dt(new Date().toISOString())}</div>
      </div>
      <div class="form">
        <div class="field"><label>Nama Pemeriksa</label><input id="bsChecker" required></div>
        <div class="field"><label>Tanda tangan Pemeriksa</label><canvas class="sig" id="bsSig1"></canvas></div>
        <div class="field"><label>Nama Penjaga Toko</label><input id="bsGuardian" required></div>
        <div class="field"><label>Tanda tangan Penjaga Toko</label><canvas class="sig" id="bsSig2"></canvas></div>
        <div class="sheet-actions">
          <button type="button" class="ghost" id="bsCancel">Batal</button>
          <button type="button" class="primary" id="bsSave">🔒 SAHKAN ${selected.length} PEMERIKSAAN</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(modal);
    const s1=signature(document.getElementById('bsSig1'));
    const s2=signature(document.getElementById('bsSig2'));
    document.getElementById('bsCancel').onclick=()=>modal.remove();
    document.getElementById('bsSave').onclick=()=>{
      const checker=document.getElementById('bsChecker').value.trim();
      const guardian=document.getElementById('bsGuardian').value.trim();
      if(!checker || !guardian){ alert('Nama pemeriksa dan penjaga wajib diisi.'); return; }
      const sig1=s1(), sig2=s2();
      if(!sig1 || !sig2){ alert('Tanda tangan belum tersedia.'); return; }
      const now=new Date().toISOString();
      const current=load();
      let count=0;
      selected.forEach(item=>{
        const x=current.checks.find(z=>z.id===item.id);
        if(!x || x.locked) return;
        x.checkerName=checker;
        x.guardianName=guardian;
        x.checkerSignature=sig1;
        x.guardianSignature=sig2;
        x.approved=true;
        x.locked=true;
        x.approvedAt=now;
        x.approvalBatchId=x.approvalBatchId || crypto.randomUUID();
        count++;
      });
      save(current);
      modal.remove();
      if(typeof window.__stokRealRefresh==='function') window.__stokRealRefresh();
      alert(`${count} pemeriksaan berhasil disahkan dan dikunci.`);
    };
  }

  function enhanceHistory(){
    const panel=document.querySelector('#content .panel');
    if(!panel) return;
    const title=panel.querySelector('.panel-title');
    if(!title || title.textContent.trim()!=='Riwayat Pengecekan') return;
    if(panel.querySelector('#batchApprovalBar')) return;

    const bar=document.createElement('div');
    bar.id='batchApprovalBar';
    bar.style.cssText='display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0';
    bar.innerHTML=`<button class="secondary" id="selectPending">☑️ Pilih semua yang menunggu</button>
      <button class="primary" id="batchApprove" disabled>✍️ Tanda tangan & sahkan (<span id="batchCount">0</span>)</button>`;
    title.insertAdjacentElement('afterend',bar);

    const hist=panel.querySelector('#hist');
    if(!hist) return;

    function decorate(){
      const db=load();
      hist.querySelectorAll('.item').forEach(article=>{
        const button=article.querySelector('[data-id]');
        if(!button) return;
        const id=button.dataset.id;
        const x=db.checks.find(z=>z.id===id);
        if(!x || x.locked) return;
        if(article.querySelector('.batch-check')) return;
        const label=document.createElement('label');
        label.className='batch-check';
        label.style.cssText='display:flex;align-items:center;gap:7px;margin:8px 0;font-weight:700';
        label.innerHTML=`<input type="checkbox" class="batch-box" value="${esc(id)}"> Pilih untuk disahkan`;
        article.insertBefore(label,article.firstChild);
      });
      update();
    }
    function boxes(){return [...panel.querySelectorAll('.batch-box')]}
    function update(){
      const n=boxes().filter(x=>x.checked).length;
      const count=panel.querySelector('#batchCount');
      const btn=panel.querySelector('#batchApprove');
      if(count) count.textContent=n;
      if(btn) btn.disabled=n===0;
    }

    hist.addEventListener('change',e=>{if(e.target.classList.contains('batch-box'))update()});
    panel.querySelector('#selectPending').onclick=()=>{
      const all=boxes(), anyUnchecked=all.some(x=>!x.checked);
      all.forEach(x=>x.checked=anyUnchecked);
      update();
    };
    panel.querySelector('#batchApprove').onclick=()=>{
      openBatch(boxes().filter(x=>x.checked).map(x=>x.value));
    };

    // Existing app re-renders #hist when searching; observe and decorate again.
    const mo=new MutationObserver(()=>decorate());
    mo.observe(hist,{childList:true,subtree:true});
    decorate();

    window.__stokRealRefresh=()=>{
      if(typeof window.render==='function') window.render();
      else location.reload();
    };
  }

  // The original app opens a signature dialog immediately after every saved check.
  // Close that dialog so signing can be done later in batches.
  function suppressImmediateApproval(){
    const modal=document.querySelector('.modal');
    if(!modal) return;
    const heading=modal.querySelector('h2');
    if(heading && heading.textContent.includes('Persetujuan Hasil Cek') && !modal.dataset.batchSuppressed){
      modal.dataset.batchSuppressed='1';
      modal.remove();
      const note=document.createElement('div');
      note.textContent='✓ Cek tersimpan. Tanda tangan dapat dilakukan sekaligus dari Riwayat.';
      note.style.cssText='position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#1b7f52;color:white;padding:12px 16px;border-radius:12px;z-index:99999;font-weight:700;box-shadow:0 4px 18px rgba(0,0,0,.25);text-align:center;max-width:90%';
      document.body.appendChild(note);
      setTimeout(()=>note.remove(),2600);
    }
  }

  const observer=new MutationObserver(()=>{
    suppressImmediateApproval();
    enhanceHistory();
  });
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',()=>{suppressImmediateApproval();enhanceHistory()});
})();
