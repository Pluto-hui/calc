/* ============================================
   calculator.js — 状态管理 & 计算逻辑
   ============================================ */

const Calc = {
    brands: [],              // 当前品牌库 [{name, wholesale, market?}]
    hiddenPresets: new Set(),
    tags: [],                // 标签名列表 ['高价位卷烟', '中华烟', ...]
    brandTags: {},           // 品牌索引 → 标签名数组 { 0: ['中华烟','高价位卷烟'] }
    marketOverride: {},      // {index: value} 临时覆盖市场价
    wholesaleOverride: {},   // {index: value} 临时覆盖批发价
    qtyCache: {},            // {index: value}
    usageRecords: [],        // 使用记录

    init() {
        this.brands = Storage.loadBrands();
        this.tags = Storage.loadTags();
        this.brandTags = Storage.loadBrandTags();
        this.usageRecords = Storage.loadRecords();
        buildBrandIndex(this.brands);
    },

    addTag(name) {
        const n = (name || '').trim();
        if (!n || this.tags.includes(n)) return false;
        this.tags.push(n);
        Storage.saveTags(this.tags);
        return true;
    },

    deleteTag(name) {
        this.tags = this.tags.filter(t => t !== name);
        Storage.saveTags(this.tags);
        Object.keys(this.brandTags).forEach(k => {
            this.brandTags[k] = this.brandTags[k].filter(t => t !== name);
            if (this.brandTags[k].length === 0) delete this.brandTags[k];
        });
        Storage.saveBrandTags(this.brandTags);
    },

    toggleBrandTag(brandIdx, tagName) {
        const key = String(brandIdx);
        if (!this.brandTags[key]) this.brandTags[key] = [];
        const arr = this.brandTags[key];
        const pos = arr.indexOf(tagName);
        if (pos >= 0) {
            arr.splice(pos, 1);
            if (arr.length === 0) delete this.brandTags[key];
        } else {
            arr.push(tagName);
        }
        Storage.saveBrandTags(this.brandTags);
    },

    getBrandTags(brandIdx) {
        return this.brandTags[String(brandIdx)] || [];
    },

    hasBrandTag(brandIdx, tagName) {
        return this.getBrandTags(brandIdx).includes(tagName);
    },

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

    calcProfit(idx) {
        const w = parseFloat(this.getBrandWholesale(idx)) || 0;
        const m = parseFloat(this.getBrandMarket(idx)) || 0;
        const q = parseInt(this.getBrandQty(idx)) || 0;
        if (w > 0 && m > 0 && q > 0) {
            return (m - w) * q;
        }
        return null;
    },

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

    saveBrands(newBrands) {
        // 先按品牌名快照标签，避免品牌列表增删/排序后索引错位
        const tagsByName = {};
        this.brands.forEach((b, i) => {
            const tags = this.brandTags[String(i)];
            if (tags && tags.length) tagsByName[b.name] = tags.slice();
        });

        this.brands = newBrands;
        Storage.saveBrands(newBrands);
        buildBrandIndex(newBrands);
        const valid = new Set(newBrands.map((_, i) => i));
        this.hiddenPresets = new Set([...this.hiddenPresets].filter(i => valid.has(i)));

        const rebuiltBrandTags = {};
        newBrands.forEach((b, i) => {
            const tags = tagsByName[b.name];
            if (tags && tags.length) rebuiltBrandTags[i] = tags.slice();
        });
        this.brandTags = rebuiltBrandTags;
        Storage.saveBrandTags(this.brandTags);
        [this.marketOverride, this.wholesaleOverride, this.qtyCache].forEach(cache => {
            Object.keys(cache).forEach(k => {
                if (!valid.has(parseInt(k))) delete cache[k];
            });
        });
    },

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

    exportJSON() {
        return JSON.stringify({
            version: 3,
            exportedAt: new Date().toISOString(),
            brands: this.brands,
            records: this.usageRecords,
        }, null, 2);
    },

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

    addRecord(result) {
        this.usageRecords.unshift({
            ...result,
            time: Date.now(),
        });
        if (this.usageRecords.length > 50) this.usageRecords.length = 50;
        Storage.saveRecords(this.usageRecords);
    },
};
