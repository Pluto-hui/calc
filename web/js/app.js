/* ============================================
   app.js — 主入口 & UI 逻辑
   ============================================ */

// 当前筛选的标签（空 = 显示全部）
let currentFilterTag = '';

// ---- HTML 转义（标签名由用户自定义，避免特殊字符破坏结构） ----
function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
}

// ---- 初始化 ----
document.addEventListener('DOMContentLoaded', () => {
    const theme = Storage.getTheme();
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') document.getElementById('themeToggle').classList.add('on');

    Calc.init();
    renderTagFilter();
    renderBrandList();
    updateSummary();

    document.getElementById('brandEditorText').value = brandsToText(Calc.brands);
});

// ---- Service Worker（PWA 离线缓存） ----
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(err => {
            console.warn('Service Worker 注册失败:', err);
        });
    });
}

// ==================== 底部导航 ====================
document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', function() {
        const page = this.dataset.page;
        if (!page) return;
        document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-' + page).classList.add('active');
        if (page === 'brands') {
            document.getElementById('brandEditorText').value = brandsToText(Calc.brands);
            renderTagManager();
            renderTagSelect();
        }
    });
});

// ==================== 品牌列表渲染 ====================
function renderBrandList() {
    const container = document.getElementById('brandList');
    renderTagFilter();
    let visible = Calc.brands
        .map((b, i) => ({ ...b, idx: i }))
        .filter(b => !Calc.hiddenPresets.has(b.idx));

    if (currentFilterTag) {
        visible = visible.filter(b => Calc.hasBrandTag(b.idx, currentFilterTag));
    }

    if (visible.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px 20px;color:var(--text-muted);">
                <div style="font-size:40px;margin-bottom:10px;">📭</div>
                <div style="font-size:14px;">${currentFilterTag ? '该标签下暂无品牌' : '品牌库为空'}</div>
                <div style="font-size:12px;margin-top:4px;">${currentFilterTag ? '点击上方「🏷️ 标签」选择「全部」查看所有品牌' : '切换到「品牌库」标签录入你的品牌'}</div>
            </div>`;
        return;
    }

    container.innerHTML = visible.map(b => {
        const ws = Calc.getBrandWholesale(b.idx);
        const mkt = Calc.getBrandMarket(b.idx);
        const qty = Calc.getBrandQty(b.idx);
        const tags = Calc.getBrandTags(b.idx);
        const tagsHtml = tags.length
            ? tags.map(t => `<button type="button" class="tag-pill${currentFilterTag === t ? ' active' : ''}" data-tag="${escapeHtml(t)}" title="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join('')
            : '<span class="tag-empty">—</span>';
        return `
        <div class="brand-row preset" data-index="${b.idx}">
            <span class="brand-name">${b.name}</span>
            <span class="brand-tags">${tagsHtml}</span>
            <input type="number" class="w-price" value="${ws}" step="0.1" min="0"
                   data-index="${b.idx}" data-field="wholesale" placeholder="批发价">
            <input type="number" class="m-price" value="${mkt}" step="0.1" min="0"
                   data-index="${b.idx}" data-field="market" placeholder="市场价">
            <input type="number" class="qty" value="${qty}" min="1" max="9999" step="1"
                   data-index="${b.idx}" data-field="qty">
            <span class="diff-display zero" data-index="${b.idx}">—</span>
            <button class="del-btn" data-index="${b.idx}" title="移除">✕</button>
        </div>`;
    }).join('');

    updateRestoreBtn();
    recalcAllDiffs();
}

// ==================== 标签筛选下拉 ====================
const tagFilterBtn = document.getElementById('tagFilterBtn');
const tagMenu = document.getElementById('tagMenu');

function closeTagMenu() {
    tagMenu.classList.add('hidden');
    tagFilterBtn.setAttribute('aria-expanded', 'false');
}

function openTagMenu() {
    tagMenu.classList.remove('hidden');
    tagFilterBtn.setAttribute('aria-expanded', 'true');

    const margin = 8;
    const btnRect = tagFilterBtn.getBoundingClientRect();
    const menuWidth = Math.min(220, window.innerWidth - margin * 2);
    let left = Math.min(btnRect.left, window.innerWidth - margin - menuWidth);
    left = Math.max(margin, left);

    tagMenu.style.width = menuWidth + 'px';
    tagMenu.style.left = left + 'px';
    tagMenu.style.top = (btnRect.bottom + 6) + 'px';
    tagMenu.style.maxHeight = Math.max(140, Math.min(300, window.innerHeight - btnRect.bottom - 18)) + 'px';
}

function renderTagFilter() {
    const label = document.getElementById('tagFilterLabel');
    if (!label) return;
    label.textContent = currentFilterTag || '全部';

    const counts = {};
    Object.keys(Calc.brandTags).forEach(k => {
        (Calc.brandTags[k] || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; });
    });

    let html = `<button class="tag-menu-item${currentFilterTag === '' ? ' active' : ''}" data-tag="">全部<span class="tmi-count">${Calc.brands.length} 个</span></button>`;
    Calc.tags.forEach(t => {
        html += `<button class="tag-menu-item${currentFilterTag === t ? ' active' : ''}" data-tag="${escapeHtml(t)}">${escapeHtml(t)}<span class="tmi-count">${counts[t] || 0} 个</span></button>`;
    });
    if (Calc.tags.length === 0) {
        html += `<div class="tag-menu-empty">暂无标签，请到品牌库创建</div>`;
    }
    tagMenu.innerHTML = html;
}

tagFilterBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (tagMenu.classList.contains('hidden')) {
        openTagMenu();
    } else {
        closeTagMenu();
    }
});

tagMenu.addEventListener('click', function(e) {
    const item = e.target.closest('.tag-menu-item');
    if (!item) return;
    currentFilterTag = item.dataset.tag;
    closeTagMenu();
    renderTagFilter();
    renderBrandList();
    recalcAllDiffs();
});

document.addEventListener('click', function(e) {
    if (tagMenu.classList.contains('hidden')) return;
    if (e.target.closest('.tag-filter-wrap')) return;
    closeTagMenu();
});

window.addEventListener('scroll', function() {
    if (!tagMenu.classList.contains('hidden')) closeTagMenu();
}, { passive: true });

window.addEventListener('resize', function() {
    if (!tagMenu.classList.contains('hidden')) closeTagMenu();
});

// ==================== 行内标签 → 点击筛选 ====================
document.getElementById('brandList').addEventListener('click', function(e) {
    const pill = e.target.closest('.tag-pill');
    if (!pill) return;
    e.preventDefault();
    const tag = pill.dataset.tag;
    // 再次点击当前标签则取消筛选，回到「全部」
    currentFilterTag = currentFilterTag === tag ? '' : tag;
    renderTagFilter();
    renderBrandList();
    recalcAllDiffs();
});

// ==================== 事件委托：输入变化 ====================
document.getElementById('brandList').addEventListener('input', function(e) {
    const input = e.target;
    if (input.tagName !== 'INPUT') return;
    const row = input.closest('.brand-row');
    if (!row) return;

    const idx = input.dataset.index, field = input.dataset.field;
    if (idx !== undefined) {
        const i = parseInt(idx);
        if (field === 'wholesale') Calc.wholesaleOverride[i] = input.value;
        if (field === 'market') Calc.marketOverride[i] = input.value;
        if (field === 'qty') Calc.qtyCache[i] = input.value;
    }
    updateDiff(row);
    updateSummary();
});

// ==================== 单行差价 ====================
function updateDiff(row) {
    const diffEl = row.querySelector('.diff-display');
    if (!diffEl) return;
    const w = parseFloat(row.querySelector('.w-price')?.value) || 0;
    const m = parseFloat(row.querySelector('.m-price')?.value) || 0;
    const q = parseInt(row.querySelector('.qty')?.value) || 0;
    if (w > 0 && m > 0 && q > 0) {
        const profit = (m - w) * q;
        diffEl.textContent = `${profit >= 0 ? '+' : ''}¥${profit.toFixed(2)}`;
        diffEl.className = 'diff-display ' + (profit > 0 ? 'positive' : profit < 0 ? 'negative' : 'zero');
    } else {
        diffEl.textContent = '—';
        diffEl.className = 'diff-display zero';
    }
}

// ==================== 汇总 ====================
function updateSummary() {
    const { totalCost, totalMarket, totalProfit } = Calc.calcSummary();
    document.getElementById('sumCost').textContent = `¥${totalCost.toFixed(2)}`;
    document.getElementById('sumMarket').textContent = `¥${totalMarket.toFixed(2)}`;
    document.getElementById('sumProfit').textContent = `¥${totalProfit.toFixed(2)}`;
}

// ==================== 删除/恢复 ====================
document.getElementById('brandList').addEventListener('click', function(e) {
    if (e.target.classList.contains('del-btn')) {
        const row = e.target.closest('.brand-row');
        const idx = e.target.dataset.index;
        if (idx !== undefined) {
            Calc.hiddenPresets.add(parseInt(idx));
            delete Calc.wholesaleOverride[parseInt(idx)];
            delete Calc.marketOverride[parseInt(idx)];
            delete Calc.qtyCache[parseInt(idx)];
        }
        row.remove();
        if (!document.querySelectorAll('.brand-row').length) renderBrandList();
        updateRestoreBtn();
        updateSummary();
    }
});

document.getElementById('restoreBtn').addEventListener('click', function() {
    Calc.hiddenPresets.clear();
    renderBrandList();
    recalcAllDiffs();
    updateSummary();
});

function updateRestoreBtn() {
    const btn = document.getElementById('restoreBtn');
    if (Calc.hiddenPresets.size > 0) {
        btn.textContent = `🔄 恢复已删 (${Calc.hiddenPresets.size})`;
        btn.classList.add('show');
    } else { btn.classList.remove('show'); }
}

function recalcAllDiffs() {
    document.querySelectorAll('.brand-row').forEach(row => updateDiff(row));
}

// ==================== 添加自定义品牌 ====================
document.getElementById('addCustomBtn').addEventListener('click', function() {
    const name = document.getElementById('newBrandName').value.trim();
    const wholesale = parseFloat(document.getElementById('newWholesale').value);
    const market = parseFloat(document.getElementById('newMarket').value);

    if (!name) { showToast('请输入品牌名称'); return; }
    if (!wholesale || wholesale <= 0) { showToast('请输入批发价'); return; }
    if (!market || market <= 0) { showToast('请输入市场价'); return; }

    const newBrand = { name, wholesale };
    if (market) newBrand.market = market;
    const newBrands = [...Calc.brands, newBrand];
    Calc.saveBrands(newBrands);

    renderBrandList();
    recalcAllDiffs();
    updateSummary();

    document.getElementById('newBrandName').value = '';
    document.getElementById('newWholesale').value = '';
    document.getElementById('newMarket').value = '';
    showToast('✅ 已添加并保存到品牌库');
});

// ==================== 品牌库管理页 ====================
document.getElementById('saveBrandsBtn').addEventListener('click', function() {
    const raw = document.getElementById('brandEditorText').value.trim();
    if (!raw) { showToast('品牌列表不能为空'); return; }

    const { brands, errors } = textToBrands(raw);
    if (errors.length > 0) {
        showToast(`⚠️ ${errors.length} 行格式错误，请修正`);
        return;
    }

    Calc.saveBrands(brands);
    renderBrandList();
    recalcAllDiffs();
    updateSummary();
    showToast(`✅ 品牌库已保存（${brands.length} 个品牌）`);
});

document.getElementById('resetBrandsBtn').addEventListener('click', function() {
    if (confirm('确定要清空品牌库吗？此操作不可恢复，建议先导出备份。')) {
        Calc.saveBrands([]);
        document.getElementById('brandEditorText').value = '';
        renderBrandList();
        updateSummary();
        showToast('品牌库已清空');
    }
});

// ==================== 标签管理（品牌库页） ====================
function renderTagManager() {
    const container = document.getElementById('tagList');
    if (!container) return;
    if (Calc.tags.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:13px;">暂无标签，输入名称新建</div>`;
        return;
    }
    container.innerHTML = Calc.tags.map(t => {
        const count = Object.keys(Calc.brandTags).filter(k => Calc.brandTags[k].includes(t)).length;
        return `
        <div class="tm-item">
            <span class="tm-name">🏷️ ${escapeHtml(t)}</span>
            <span class="tm-count">${count} 个品牌</span>
            <button class="tm-del" data-tag="${escapeHtml(t)}" title="删除标签">删除</button>
        </div>`;
    }).join('');
}

document.getElementById('addTagBtn').addEventListener('click', function() {
    const input = document.getElementById('newTagName');
    const name = input.value.trim();
    if (!name) { showToast('请输入标签名'); return; }
    if (Calc.addTag(name)) {
        input.value = '';
        currentAssignTag = name;
        renderTagManager();
        renderTagFilter();
        renderTagSelect();
        showToast(`✅ 标签「${name}」已创建，可在下方勾选品牌`);
    } else {
        showToast('⚠️ 标签已存在或无效');
    }
});

document.getElementById('tagList').addEventListener('click', function(e) {
    if (e.target.classList.contains('tm-del')) {
        const tag = e.target.dataset.tag;
        if (confirm(`确定删除标签「${tag}」吗？该标签将从所有品牌移除。`)) {
            Calc.deleteTag(tag);
            if (currentFilterTag === tag) currentFilterTag = '';
            if (currentAssignTag === tag) currentAssignTag = '';
            renderTagManager();
            renderTagFilter();
            renderTagSelect();
            renderBrandList();
            showToast(`✅ 已删除标签「${tag}」`);
        }
    }
});

// ==================== 标签分配（品牌库·标签管理内） ====================
let currentAssignTag = '';

function renderTagSelect() {
    const container = document.getElementById('tagSelect');
    if (!container) return;
    if (Calc.tags.length === 0) {
        container.innerHTML = `<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:13px;">请先在上方新建标签</div>`;
        document.getElementById('tagAssignList').innerHTML = '';
        return;
    }
    if (!currentAssignTag || !Calc.tags.includes(currentAssignTag)) {
        currentAssignTag = Calc.tags[0];
    }
    container.innerHTML = Calc.tags.map(t => `
        <button class="tag-chip ${currentAssignTag === t ? 'active' : ''}" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>
    `).join('');
    renderTagAssignList();
}

function renderTagAssignList() {
    const container = document.getElementById('tagAssignList');
    if (!container) return;
    if (!currentAssignTag) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = Calc.brands.map((b, i) => {
        const checked = Calc.hasBrandTag(i, currentAssignTag);
        return `
        <button class="tag-assign-item ${checked ? 'checked' : ''}" data-index="${i}">
            <span class="ta-check">${checked ? '☑' : '☐'}</span>
            <span class="ta-name">${escapeHtml(b.name)}</span>
        </button>`;
    }).join('');
}

document.getElementById('tagSelect').addEventListener('click', function(e) {
    const chip = e.target.closest('.tag-chip');
    if (!chip) return;
    currentAssignTag = chip.dataset.tag;
    renderTagSelect();
});

document.getElementById('tagAssignList').addEventListener('click', function(e) {
    const item = e.target.closest('.tag-assign-item');
    if (!item) return;
    const idx = parseInt(item.dataset.index);
    Calc.toggleBrandTag(idx, currentAssignTag);
    renderTagAssignList();
    renderTagManager();
    renderBrandList();
    renderTagFilter();
});

// ==================== 设置页 ====================
document.getElementById('themeToggle').addEventListener('click', function() {
    const isDark = this.classList.toggle('on');
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    Storage.setTheme(theme);
});

// ==================== 保存按钮 → 弹出选择菜单 ====================
const saveOverlay = document.getElementById('saveOverlay');

document.getElementById('saveImageBtn').addEventListener('click', function() {
    saveOverlay.classList.remove('hidden');
});

document.getElementById('cancelSave').addEventListener('click', function() {
    saveOverlay.classList.add('hidden');
});
saveOverlay.addEventListener('click', function(e) {
    if (e.target === saveOverlay) saveOverlay.classList.add('hidden');
});

function getPriceSummary() {
    const lines = [];
    Calc.brands.forEach((b, i) => {
        if (Calc.hiddenPresets.has(i)) return;
        const profit = Calc.calcProfit(i);
        if (profit !== null) {
            const sign = profit >= 0 ? '+' : '';
            lines.push(`${b.name} ${sign}¥${profit.toFixed(2)}`);
        }
    });
    const { totalProfit } = Calc.calcSummary();
    if (lines.length === 0) return '暂无数据';
    return lines.slice(0, 5).join('，') + (lines.length > 5 ? `... 等共${lines.length}个品牌` : '') + `，总利润 ¥${totalProfit.toFixed(2)}`;
}

document.getElementById('saveAsImage').addEventListener('click', function() {
    saveOverlay.classList.add('hidden');

    const iconEl = document.querySelector('#saveImageBtn .tab-icon');
    const origIcon = iconEl.textContent;
    iconEl.textContent = '⏳';

    function doCapture() {
        document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        const calcTab = document.querySelector('.tab-item[data-page="calc"]');
        if (calcTab) calcTab.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-calc').classList.add('active');

        setTimeout(() => {
            html2canvas(document.getElementById('page-calc'), {
                backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
                scale: 2,
                useCORS: true,
                allowTaint: true,
                windowWidth: 500,
            }).then(canvas => {
                canvas.toBlob(function(blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = '差价计算_' + new Date().toISOString().slice(0, 10) + '.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    showToast('✅ ' + getPriceSummary() + '  |  图片已保存');
                }, 'image/png');
            }).catch(err => {
                console.error('保存失败:', err);
                showToast('❌ 保存失败，请重试');
            }).finally(() => {
                iconEl.textContent = origIcon;
            });
        }, 100);
    }

    if (typeof html2canvas === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
        script.onload = doCapture;
        script.onerror = function() {
            showToast('❌ 网络异常，请稍后重试');
            iconEl.textContent = origIcon;
        };
        document.head.appendChild(script);
    } else {
        doCapture();
    }
});

document.getElementById('shareLink').addEventListener('click', function() {
    saveOverlay.classList.add('hidden');

    const pageUrl = window.location.href.split('#')[0];
    const shareText = `💰 差价计算器\n${getPriceSummary()}\n\n📱 ${pageUrl}`;

    if (navigator.share) {
        navigator.share({
            title: '差价计算器',
            text: shareText,
            url: pageUrl,
        }).catch(() => {});
    } else {
        const copyText = shareText;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(copyText).then(() => {
                showToast('✅ 链接已复制，可粘贴发送给朋友');
            }).catch(() => {
                fallbackCopy(copyText);
            });
        } else {
            fallbackCopy(copyText);
        }
    }
});

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed'; textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try { document.execCommand('copy'); showToast('✅ 链接已复制，可粘贴发送给朋友'); }
    catch(e) { showToast('链接: ' + text); }
    document.body.removeChild(textarea);
}

// ==================== 批量导入弹窗 ====================
const importOverlay = document.getElementById('importOverlay');

document.getElementById('importBtn').addEventListener('click', function() {
    importOverlay.classList.remove('hidden');
    document.getElementById('importResult').classList.remove('show');
    document.getElementById('importText').value = '';
    document.getElementById('importText').focus();
});

document.getElementById('cancelImport').addEventListener('click', () => importOverlay.classList.add('hidden'));
importOverlay.addEventListener('click', function(e) {
    if (e.target === importOverlay) importOverlay.classList.add('hidden');
});

document.getElementById('confirmImport').addEventListener('click', function() {
    const raw = document.getElementById('importText').value.trim();
    if (!raw) { showImportResult('partial', '请先粘贴价格数据'); return; }

    const lines = raw.split(/[\n\r]+/).filter(l => l.trim());
    let matched = [], unmatched = [], skipped = [];

    lines.forEach(line => {
        const parsed = parseLine(line.trim());
        if (!parsed) { skipped.push(line.trim()); return; }
        const hit = matchBrand(parsed.brandText, Calc.brands);
        if (hit !== null) {
            matched.push({
                index: hit,
                name: Calc.brands[hit].name,
                wholesale: parsed.wholesale,
                market: parsed.market,
            });
        } else {
            unmatched.push({ text: parsed.brandText });
        }
    });

    if (matched.length > 0) {
        matched.forEach(m => {
            Calc.hiddenPresets.delete(m.index);
            if (m.wholesale !== null) Calc.wholesaleOverride[m.index] = m.wholesale.toFixed(1);
            Calc.marketOverride[m.index] = m.market.toFixed(1);
        });
        renderBrandList();
        matched.forEach(m => {
            const row = document.querySelector(`.brand-row.preset[data-index="${m.index}"]`);
            if (row) {
                if (m.wholesale !== null) {
                    const wi = row.querySelector('.w-price'); if (wi) wi.value = m.wholesale.toFixed(1);
                }
                const mi = row.querySelector('.m-price'); if (mi) mi.value = m.market.toFixed(1);
                updateDiff(row);
            }
        });
        updateSummary();
    }

    let html = '';
    if (matched.length > 0) {
        html += `<span class="ir-ok">✅ 成功导入 ${matched.length} 个品牌</span><br>`;
        html += `<span style="font-size:11px;opacity:0.8;">` +
            matched.map(m => `${m.name} → 批发 ¥${m.wholesale ?? '(未改)'} | 市场 ¥${m.market}`).join('、') + `</span>`;
    }
    if (unmatched.length > 0) {
        if (html) html += '<br><br>';
        html += `<span class="ir-fail">⚠️ ${unmatched.length} 条未能识别：</span><br>`;
        html += `<span style="font-size:11px;opacity:0.8;">` + unmatched.map(u => `"${u.text}"`).join('、') + `</span>`;
    }
    if (skipped.length > 0) {
        if (html) html += '<br><br>';
        html += `<span style="color:var(--text-muted);">⊘ ${skipped.length} 条格式无法解析</span>`;
    }
    showImportResult(matched.length > 0 && unmatched.length === 0 ? 'success' : 'partial', html);
});

function showImportResult(type, msg) {
    const el = document.getElementById('importResult');
    el.className = 'panel-result show ' + type;
    el.innerHTML = msg;
}

// ==================== Toast ====================
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove('show'), 2000);
}

// ==================== 下载文件 ====================
function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ==================== 键盘快捷操作 ====================
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (!importOverlay.classList.contains('hidden')) {
            importOverlay.classList.add('hidden');
        }
        if (saveOverlay && !saveOverlay.classList.contains('hidden')) {
            saveOverlay.classList.add('hidden');
        }
        if (!tagMenu.classList.contains('hidden')) {
            closeTagMenu();
        }
    }
});
