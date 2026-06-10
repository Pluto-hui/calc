/* ============================================
   calculator.js — 状态管理 & 计算逻辑
   ============================================ */

const Calc = {

    // ---- 数据 ----
    brands: [],              // 当前品牌库 [{name, wholesale, market?}]
    hiddenPresets: new Set(),
    marketOverride: {},      // {index: value} 临时覆盖市场价
    wholesaleOverride: {},   // {index: value} 临时覆盖批发价
    qtyCache: {},            // {index: value}
    usageRecords: [],        // 使用记录

    // ---- 初始化 ----
    init() {
        this.brands = Storage.loadBrands();
        this.usageRecords = Storage.loadRecords();
        buildBrandIndex(this.brands);
    },

    // ---- 获取品牌显示数据 ----
    getBrandWholesale(idx) {
        return this.wholesaleOverride[idx] !== undefined
            ? this.wholesaleOverride[idx]
            : this.brands[idx].wholesale;
    },

    getBrandMarket(idx) {
        if (this.marketOverride[idx] !== undefined) return this.marketOverride[idx];
        if (this.brands[idx].market !== undefined) return this.brands[idx].market;
        return '';
    },

    getBrandQty(idx) {
        return this.qtyCache[idx] || 1;
    },

    // ---- 计算单行利润 ----
    calcProfit(idx) {
        const w = parseFloat(this.getBrandWholesale(idx)) || 0;
        const m = parseFloat(this.getBrandMarket(idx)) || 0;
        const q = parseInt(this.getBrandQty(idx)) || 0;
        if (w > 0 && m > 0 && q > 0) {
            return (m - w) * q;
        }
        return null;
    },

    // ---- 计算汇总 ----
    calcSummary() {
        let totalCost = 0, totalMarket = 0, totalProfit = 0;

        this.brands.forEach((b, i) => {
            if (this.hiddenPresets.has(i)) return;
            const w = parseFloat(this.getBrandWholesale(i)) || 0;
            const m = parseFloat(this.getBrandMarket(i)) || 0;
            const q = parseInt(this.getBrandQty(i)) || 0;
            if (w > 0 && m > 0 && q > 0) {
                totalCost += w * q;
                totalMarket += m * q;
                totalProfit += (m - w) * q;
            }
        });

        return { totalCost, totalMarket, totalProfit };
    },

    // ---- 保存品牌库 ----
    saveBrands(newBrands) {
        this.brands = newBrands;
        Storage.saveBrands(newBrands);
        buildBrandIndex(newBrands);
        // 清理与新品牌库不匹配的缓存
        const valid = new Set(newBrands.map((_, i) => i));
        this.hiddenPresets = new Set([...this.hiddenPresets].filter(i => valid.has(i)));
        [this.marketOverride, this.wholesaleOverride, this.qtyCache].forEach(cache => {
            Object.keys(cache).forEach(k => {
                if (!valid.has(parseInt(k))) delete cache[k];
            });
        });
    },

    // ---- 导出 CSV ----
    exportCSV() {
        const rows = [['品牌', '批发价(条)', '市场价(条)', '数量(条)', '单条差价', '小计差价']];
        this.brands.forEach((b, i) => {
            if (this.hiddenPresets.has(i)) return;
            const w = this.getBrandWholesale(i);
            const m = this.getBrandMarket(i);
            const q = this.getBrandQty(i);
            const diff = parseFloat(m) - parseFloat(w);
            const subtotal = (parseFloat(m) - parseFloat(w)) * parseInt(q);
            if (w && m && diff) {
                rows.push([b.name, w, m, q, diff.toFixed(2), subtotal.toFixed(2)]);
            }
        });

        const sum = this.calcSummary();
        rows.push([]);
        rows.push(['汇总', '', '', '', '', '']);
        rows.push(['总成本', sum.totalCost.toFixed(2), '', '', '', '']);
        rows.push(['市场价合计', sum.totalMarket.toFixed(2), '', '', '', '']);
        rows.push(['利润差价总和', sum.totalProfit.toFixed(2), '', '', '', '']);

        return rows.map(r => r.join(',')).join('\n');
    },

    // ---- 导出备份 JSON ----
    exportJSON() {
        return JSON.stringify({
            version: 3,
            exportedAt: new Date().toISOString(),
            brands: this.brands,
            records: this.usageRecords,
        }, null, 2);
    },

    // ---- 导入备份 JSON ----
    importJSON(jsonStr) {
        try {
            const data = JSON.parse(jsonStr);
            if (data.brands && Array.isArray(data.brands)) {
                this.saveBrands(data.brands);
                if (data.records) this.usageRecords = data.records;
                return true;
            }
        } catch (e) {
            console.error('JSON 解析失败:', e);
        }
        return false;
    },

    // ---- 添加使用记录 ----
    addRecord(result) {
        this.usageRecords.unshift({
            ...result,
            time: Date.now(),
        });
        if (this.usageRecords.length > 50) this.usageRecords.length = 50;
        Storage.saveRecords(this.usageRecords);
    },
};
