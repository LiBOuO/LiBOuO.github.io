(() => {
  const fileInput   = document.getElementById('fileInput');
  const imgMeta     = document.getElementById('imgMeta');
  const previewCvs  = document.getElementById('previewCanvas');
  const overlayCvs  = document.getElementById('overlayCanvas');
  const topBar      = document.getElementById('topBar');
  const leftBar     = document.getElementById('leftBar');
  const stageWrap   = document.getElementById('stageWrap');
  const stageGrid   = document.getElementById('stageGrid');
  const canvasCell  = document.getElementById('canvasCell');
  const xListEl     = document.getElementById('xList');
  const yListEl     = document.getElementById('yList');
  const btnSplit    = document.getElementById('btnSplit');
  const btnZip      = document.getElementById('btnZip');
  const msg         = document.getElementById('msg');
  const result      = document.getElementById('result');

  let img = null, imgName = 'image', tilesCache = [];
  let xCuts = [], yCuts = [];
  let selected = null; // { axis: 'x'|'y', value: number } | null

  // ===== 讀圖 =====
  fileInput.addEventListener('change', (e) => {
    resetAll();
    const file = e.target.files?.[0];
    if (!file) return;

    imgName = (file.name || 'image').replace(/\.[^.]+$/, '') || 'image';
    const url = URL.createObjectURL(file);
    img = new Image();
    img.onload = () => {
      setupCanvases(img.naturalWidth, img.naturalHeight);
      drawBaseImage();
      drawOverlay();
      renderBars();
      renderLists();
      imgMeta.textContent = `圖片尺寸：${img.naturalWidth} × ${img.naturalHeight}px，檔名：${file.name}`;
      btnSplit.disabled = false;
      showMsg('預覽已自動縮放至螢幕寬度內；分割仍以原尺寸像素計算。', 'info');
      // 監聽視窗縮放，維持等比顯示
      window.addEventListener('resize', onResize, { passive: true });
    };
    img.onerror = () => {
      showMsg('無法讀取圖片，請更換檔案。', 'error');
      btnSplit.disabled = true;
    };
    img.src = url;
  });

  // ===== 畫布設定：原生像素 + 視覺等比縮放 =====
  function setupCanvases(W, H) {
    // 內部解析度保持原圖，確保裁切正確
    previewCvs.width = W;  previewCvs.height = H;
    overlayCvs.width = W;  overlayCvs.height = H;

    // 使用 CSS aspect-ratio 讓容器等比縮放，寬度自動吃滿可用空間
    canvasCell.style.aspectRatio = `${W} / ${H}`;
    setCanvasDisplaySize(); // 依螢幕寬度調整「顯示寬」
  }

  // 計算顯示寬度：盡量塞滿 stageWrap 的可用寬度（扣掉左側 bar）
  function setCanvasDisplaySize() {
    const barSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--bar-size')) || 36;
    const wrapWidth = stageWrap.clientWidth; // 可用外框寬
    const maxDisplayWidth = Math.max(240, wrapWidth - barSize - 24); // 預留些內距
    const naturalW = previewCvs.width;

    // 顯示寬不能超過原始寬，避免放大失真（你也可以改成允許放大）
    const displayW = Math.min(naturalW, maxDisplayWidth);
    canvasCell.style.width = displayW + 'px';
  }

  function onResize() {
    if (!img) return;
    setCanvasDisplaySize();
    // bar 與 overlay 會自動跟著容器縮放（% 對位），不需重畫內容
  }

  function drawBaseImage() {
    if (!img) return;
    const ctx = previewCvs.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, previewCvs.width, previewCvs.height);
    ctx.drawImage(img, 0, 0);
  }

  // ===== 新增分割線（bar 點擊） =====
  topBar.addEventListener('click', (ev) => {
    if (!img) return;
    const rect = topBar.getBoundingClientRect();
    const W = previewCvs.width;              // 原生寬
    const x = clamp(Math.round((ev.clientX - rect.left) / rect.width * W), 1, W - 1);
    if (!xCuts.includes(x)) xCuts.push(x);
    xCuts.sort((a, b) => a - b);
    select({ axis: 'x', value: x });
    drawOverlay(); renderBars(); renderLists();
  });

  leftBar.addEventListener('click', (ev) => {
    if (!img) return;
    const rect = leftBar.getBoundingClientRect();
    const H = previewCvs.height;             // 原生高
    const y = clamp(Math.round((ev.clientY - rect.top) / rect.height * H), 1, H - 1);
    if (!yCuts.includes(y)) yCuts.push(y);
    yCuts.sort((a, b) => a - b);
    select({ axis: 'y', value: y });
    drawOverlay(); renderBars(); renderLists();
  });

  // 點選 bar 上的點 → 高亮
  topBar.addEventListener('mousedown', (e) => {
    const t = e.target;
    if (t.classList.contains('dot') && t.dataset.v) {
      select({ axis: 'x', value: Number(t.dataset.v) });
      drawOverlay(); renderBars(); renderLists();
      e.stopPropagation();
    }
  });
  leftBar.addEventListener('mousedown', (e) => {
    const t = e.target;
    if (t.classList.contains('dot') && t.dataset.v) {
      select({ axis: 'y', value: Number(t.dataset.v) });
      drawOverlay(); renderBars(); renderLists();
      e.stopPropagation();
    }
  });

  // ===== 鍵盤刪除 =====
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selected) {
        removeCut(selected.axis, selected.value);
        selected = null;
        drawOverlay(); renderBars(); renderLists();
      }
    }
  });

  // ===== 分割與下載 =====
  btnSplit.addEventListener('click', async () => {
    if (!img) { showMsg('請先上傳圖片。', 'error'); return; }
    result.innerHTML = ''; tilesCache = []; clearMsg();

    const W = previewCvs.width, H = previewCvs.height;
    const xAll = finalizeCuts(xCuts, W);
    const yAll = finalizeCuts(yCuts, H);

    drawOverlay();
    await splitAndRender(img, xAll, yAll, imgName);

    btnZip.disabled = tilesCache.length === 0;
    showMsg(tilesCache.length ? `完成！產生 ${tilesCache.length} 張小圖。` : '未產生任何小圖。', 'info');
  });

  btnZip.addEventListener('click', async () => {
    if (!tilesCache.length || typeof JSZip === 'undefined') return;
    btnZip.disabled = true; btnZip.textContent = '正在打包…';
    try {
      const zip = new JSZip();
      for (const t of tilesCache) {
        const arrBuf = await t.blob.arrayBuffer();
        zip.file(t.name, arrBuf);
      }
      const content = await zip.generateAsync({ type: 'blob' });
      const zipName = `${imgName}_slices.zip`;
      if (typeof saveAs !== 'undefined') saveAs(content, zipName);
      else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(content);
        a.download = zipName;
        a.click();
      }
    } catch (err) {
      console.error(err);
      alert('打包失敗，請重試或個別下載。');
    } finally {
      btnZip.textContent = '全部下載（ZIP）';
      btnZip.disabled = false;
    }
  });

  // ===== 視覺層（線條 + 高亮） =====
  function drawOverlay() {
    const W = overlayCvs.width, H = overlayCvs.height;
    const ctx = overlayCvs.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    ctx.save();
    ctx.lineWidth = img.naturalWidth / 500; // 根據畫布高度調整線寬
    ctx.setLineDash([6, 4]);

    for (const x of xCuts) {
      ctx.strokeStyle = isSelected('x', x) ? 'rgba(138,210,255,0.95)' : 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke();
    }
    for (const y of yCuts) {
      ctx.strokeStyle = isSelected('y', y) ? 'rgba(138,210,255,0.95)' : 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke();
    }
    ctx.restore();
  }

  function renderBars() {
    topBar.querySelectorAll('.dot').forEach(n => n.remove());
    leftBar.querySelectorAll('.dot').forEach(n => n.remove());
    const W = previewCvs.width, H = previewCvs.height;

    xCuts.forEach(x => {
      const dot = document.createElement('div');
      dot.className = 'dot' + (isSelected('x', x) ? ' selected' : '');
      dot.dataset.v = String(x);
      dot.style.left = `${(x / W) * 100}%`;
      dot.style.top = '50%';
      topBar.appendChild(dot);
    });
    yCuts.forEach(y => {
      const dot = document.createElement('div');
      dot.className = 'dot' + (isSelected('y', y) ? ' selected' : '');
      dot.dataset.v = String(y);
      dot.style.top = `${(y / H) * 100}%`;
      dot.style.left = '50%';
      leftBar.appendChild(dot);
    });
  }

  function renderLists() {
    xListEl.innerHTML = '';
    yListEl.innerHTML = '';

    const W = previewCvs.width, H = previewCvs.height;

    const makeChip = (axis, val) => {
      const chip = document.createElement('div');
      chip.className = 'chip' + (isSelected(axis, val) ? ' selected' : '');
      chip.tabIndex = 0;

      const input = document.createElement('input');
      input.type = 'number';
      input.value = String(val);
      input.min = 1; input.max = axis === 'x' ? (W - 1) : (H - 1);
      input.step = 1; input.inputMode = 'numeric';
      input.setAttribute('aria-label', axis === 'x' ? 'X 座標' : 'Y 座標');

      chip.addEventListener('click', (e) => {
        if (e.target.closest('.icon-btn')) return;
        select({ axis, value: val });
        drawOverlay(); renderBars();
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
      });

      const original = () => val;
      const commit = () => {
        const next = Number(input.value);
        const min = 1, max = axis === 'x' ? (W - 1) : (H - 1);
        if (!Number.isInteger(next) || next < min || next > max) {
          chip.classList.add('error');
          showMsg(`無效座標：${next}。允許範圍為 ${min}〜${max}（不含邊界）。`, 'error');
          input.value = String(original());
          setTimeout(() => chip.classList.remove('error'), 700);
          return;
        }
        const arr = axis === 'x' ? xCuts : yCuts;
        if (arr.includes(next) && next !== val) {
          chip.classList.add('error');
          showMsg(`座標 ${next} 已存在，請輸入不重複的數值。`, 'error');
          input.value = String(original());
          setTimeout(() => chip.classList.remove('error'), 700);
          return;
        }
        const idx = arr.indexOf(val);
        if (idx !== -1) arr[idx] = next;
        arr.sort((a, b) => a - b);
        select({ axis, value: next });
        drawOverlay(); renderBars(); renderLists();
        showMsg('已更新座標。', 'info');
      };

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { commit(); input.blur(); }
        if (e.key === 'Escape') { input.value = String(original()); input.blur(); }
      });
      input.addEventListener('blur', commit);

      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn';
      delBtn.title = '刪除';
      delBtn.innerHTML = `
        <svg class="icon-trash" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
          <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6v8h2V9h-2zm4 0v8h2V9h-2zM7 9v8h2V9H7z"/>
        </svg>`;
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeCut(axis, val);
        if (selected && selected.axis === axis && selected.value === val) selected = null;
        drawOverlay(); renderBars(); renderLists();
      });

      chip.appendChild(input);
      chip.appendChild(delBtn);
      return chip;
    };

    xCuts.forEach(v => xListEl.appendChild(makeChip('x', v)));
    yCuts.forEach(v => yListEl.appendChild(makeChip('y', v)));
  }

  // ===== 分割核心 =====
  async function splitAndRender(image, xAll, yAll, baseName) {
    const off = document.createElement('canvas');
    const ctx = off.getContext('2d', { willReadFrequently: false });
    tilesCache = [];
    for (let yi = 0; yi < yAll.length - 1; yi++) {
      for (let xi = 0; xi < xAll.length - 1; xi++) {
        const x0 = xAll[xi], x1 = xAll[xi + 1];
        const y0 = yAll[yi], y1 = yAll[yi + 1];
        const w = x1 - x0, h = y1 - y0;
        if (w <= 0 || h <= 0) continue;

        off.width = w; off.height = h;
        ctx.clearRect(0, 0, w, h);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, x0, y0, w, h, 0, 0, w, h);

        const blob = await new Promise(res => off.toBlob(res, 'image/png'));
        if (!blob) continue;

        const tileName = `${baseName}_${x0}-${y0}_${x1}x${y1}.png`;
        tilesCache.push({ blob, name: tileName });

        const url = URL.createObjectURL(blob);
        const tileEl = document.createElement('div');
        tileEl.className = 'tile';
        tileEl.innerHTML = `
          <figure>
            <img src="${url}" alt="${tileName}" />
            <figcaption>${tileName}（${w}×${h}）</figcaption>
            <div class="row">
              <a class="btn" href="${url}" download="${tileName}">
                <button>下載</button>
              </a>
            </div>
          </figure>`;
        result.appendChild(tileEl);
      }
    }
  }

  // ===== 小工具 =====
  function finalizeCuts(list, maxVal) {
    const set = new Set([0, maxVal, ...list]);
    return Array.from(set).sort((a, b) => a - b);
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function isSelected(axis, v) { return selected && selected.axis === axis && selected.value === v; }
  function select(s) { selected = s; }
  function removeCut(axis, val) {
    if (axis === 'x') xCuts = xCuts.filter(x => x !== val);
    else yCuts = yCuts.filter(y => y !== val);
  }
  function resetAll() {
    result.innerHTML = ''; tilesCache = [];
    xCuts = []; yCuts = []; selected = null;
    imgMeta.textContent = ''; clearMsg();
    btnSplit.disabled = true; btnZip.disabled = true;
    previewCvs.getContext('2d').clearRect(0,0,previewCvs.width,previewCvs.height);
    overlayCvs.getContext('2d').clearRect(0,0,overlayCvs.width,overlayCvs.height);
    topBar.querySelectorAll('.dot').forEach(n => n.remove());
    leftBar.querySelectorAll('.dot').forEach(n => n.remove());
    xListEl.innerHTML = ''; yListEl.innerHTML = '';
    window.removeEventListener('resize', onResize);
  }
  function showMsg(text, type='info') {
    msg.textContent = text;
    msg.classList.toggle('error', type === 'error');
  }
  function clearMsg() { msg.textContent = ''; msg.classList.remove('error'); }
})();
