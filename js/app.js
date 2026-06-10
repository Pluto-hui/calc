/* ============================================
   app.js — 主入口 & UI 逻辑
   ============================================ */

// ---- 初始化 ----
document.addEventListener('DOMContentLoaded', () => {
    // 主题
    const theme = Storage.getTheme();
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') document.getElementById('themeToggle').classList.add('on');

    // 数据
    Calc.init();
    renderBrandList();
    updateSummary();

    // 品牌库编辑框
    document.getElementById('brandEditorText').value = brandsToText(Calc.brands);
});

// ==================== 底部导航 ====================
document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', function() {
        const page = this.dataset.page;
        // 切换 tab 高亮
        document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        // 切换页面
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-' + page).classList.add('active');
        // 进入品牌库页时刷新内容
        if (page === 'brands') {
            document.getElementById('brandEditorText').value = brandsToText(Calc.brands);
        }
    });
});

// ==================== 品牌列表渲染 ====================
function renderBrandList() {
    const container = document.getElementById('brandList');
    const visible = Calc.brands
        .map((b, i) => ({ ...b, idx: i }))
        .filter(b => !Calc.hiddenPresets.has(b.idx));

    if (visible.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px 20px;color:var(--text-muted);">
                <div style="font-size:40px;margin-bottom:10px;">📭</div>
                <div style="font-size:14px;">品牌库为空</div>
                <div style="font-size:12px;margin-top:4px;">切换到「品牌库」标签录入你的品牌</div>
            </div>`;
        return;
    }

    container.innerHTML = visible.map(b => {
        const ws = Calc.getBrandWholesale(b.idx);
        const mkt = Calc.getBrandMarket(b.idx);
        const qty = Calc.getBrandQty(b.idx);
        return `
        <div class="brand-row preset" data-index="${b.idx}">
            <span class="brand-name">${b.name}</span>
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
}

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

    // 追加到品牌库
    const newBrand = { name, wholesale };
    if (market) newBrand.market = market;
    const newBrands = [...Calc.brands, newBrand];
    Calc.saveBrands(newBrands);

    // 重渲染
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

// ==================== 设置页 ====================
// 主题切换
document.getElementById('themeToggle').addEventListener('click', function() {
    const isDark = this.classList.toggle('on');
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    Storage.setTheme(theme);
});

// ==================== 截图导出 ====================
document.getElementById('exportScreenshot').addEventListener('click', function() {
    const btn = document.getElementById('exportScreenshot');
    btn.textContent = '⏳';
    btn.disabled = true;

    // 检查 html2canvas 是否已加载
    if (typeof html2canvas === 'undefined') {
        // 动态加载
        const script = document.createElement('script');
        script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
        script.onload = function() { captureScreenshot(); };
        script.onerror = function() {
            showToast('❌ 加载失败，请检查网络');
            btn.textContent = '📸 截图';
            btn.disabled = false;
        };
        document.head.appendChild(script);
    } else {
        captureScreenshot();
    }

    function captureScreenshot() {
        // 切换到计算器页面
        document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        const calcTab = document.querySelector('.tab-item[data-page="calc"]');
        if (calcTab) calcTab.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const calcPage = document.getElementById('page-calc');
        if (calcPage) calcPage.classList.add('active');

        // 短暂延迟等页面渲染
        setTimeout(() => {
            const target = document.getElementById('page-calc');
            html2canvas(target, {
                backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),
                scale: 2,
                useCORS: true,
                allowTaint: true,
                windowWidth: 500,
            }).then(canvas => {
                // 下载图片
                canvas.toBlob(function(blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = '差价计算_' + new Date().toISOString().slice(0, 10) + '.png';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    showToast('✅ 截图已下载');
                }, 'image/png');
            }).catch(err => {
                console.error('截图失败:', err);
                showToast('❌ 截图失败，请重试');
            }).finally(() => {
                btn.textContent = '📸 截图';
                btn.disabled = false;
            });
        }, 100);
    }
});

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
        // 关闭二维码放大弹窗
        const qrOverlay = document.getElementById('qrOverlay');
        if (qrOverlay && !qrOverlay.classList.contains('hidden')) {
            qrOverlay.classList.add('hidden');
        }
    }
});

// ==================== 二维码生成 ====================
(function initQRCode() {
    const container = document.getElementById('qrContainer');
    const urlEl = document.getElementById('qrUrl');
    if (!container || !urlEl) return;

    // GitHub Pages 部署后的 URL
    const pageUrl = 'https://pluto-hui.github.io/calc';
    urlEl.textContent = pageUrl;

    // 使用 api.qrserver.com 生成二维码
    const qrImg = document.createElement('img');
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(pageUrl)}`;
    qrImg.alt = '扫码使用差价计算器';
    qrImg.onload = function() {
        container.innerHTML = '';
        container.appendChild(qrImg);
    };
    qrImg.onerror = function() {
        container.innerHTML = '<div class="qr-placeholder">二维码加载失败<br>请访问: ' + pageUrl + '</div>';
    };

    // 点击放大二维码
    container.addEventListener('click', function() {
        const existOverlay = document.getElementById('qrOverlay');
        if (existOverlay) existOverlay.remove();

        const overlay = document.createElement('div');
        overlay.id = 'qrOverlay';
        overlay.className = 'qr-overlay';
        const bigImg = document.createElement('img');
        bigImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(pageUrl)}`;
        bigImg.alt = '扫码使用差价计算器';
        overlay.appendChild(bigImg);
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) overlay.remove();
        });
        document.body.appendChild(overlay);
    });
})();

// ==================== 分享功能 ====================
document.getElementById('shareBtn').addEventListener('click', function() {
    const { totalCost, totalMarket, totalProfit } = Calc.calcSummary();

    // 生成分享摘要
    const lines = [];
    Calc.brands.forEach((b, i) => {
        if (Calc.hiddenPresets.has(i)) return;
        const w = parseFloat(Calc.getBrandWholesale(i)) || 0;
        const m = parseFloat(Calc.getBrandMarket(i)) || 0;
        const profit = Calc.calcProfit(i);
        if (w > 0 && m > 0 && profit !== null) {
            const sign = profit >= 0 ? '+' : '';
            lines.push(`${b.name} ${sign}¥${profit.toFixed(2)}`);
        }
    });

    const shareText = [
        '💰 差价计算结果',
        ...lines.slice(0, 10),  // 最多显示10行
        lines.length > 10 ? `...共${lines.length}个品牌` : '',
        `──────────────`,
        `总成本 ¥${totalCost.toFixed(2)} | 市场价 ¥${totalMarket.toFixed(2)}`,
        `💰 总利润 ¥${totalProfit.toFixed(2)}`,
    ].filter(l => l).join('\n');

    // 优先使用 Web Share API（移动端原生分享）
    if (navigator.share) {
        navigator.share({
            title: '差价计算结果',
            text: shareText,
        }).catch(() => {
            // 用户取消分享
        });
    } else {
        // PC 端降级：复制到剪贴板
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareText).then(() => {
                showToast('✅ 已复制到剪贴板');
            }).catch(() => {
                fallbackCopy(shareText);
            });
        } else {
            fallbackCopy(shareText);
        }
    }
});

// 降级复制方案（旧浏览器）
function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
        document.execCommand('copy');
        showToast('✅ 已复制到剪贴板');
    } catch (e) {
        showToast('❌ 复制失败，请手动截图');
    }
    document.body.removeChild(textarea);
}
