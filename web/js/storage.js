/* ============================================
   storage.js — localStorage 读写封装
   ============================================ */

const STORAGE_KEY = 'cigarette_calc_data_v3';
const THEME_KEY = 'cigarette_calc_theme';

const Storage = {

    // ---- 品牌库 ----
    loadBrands() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                if (data.brands && Array.isArray(data.brands)) {
                    return data.brands;
                }
            }
        } catch (e) { /* ignore */ }
        return [];
    },

    saveBrands(brands) {
        try {
            const data = { brands, updatedAt: new Date().toISOString() };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('保存品牌库失败:', e);
            return false;
        }
    },

    // ---- 使用记录 ----
    loadRecords() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                if (data.records && Array.isArray(data.records)) {
                    return data.records;
                }
            }
        } catch (e) { /* ignore */ }
        return [];
    },

    saveRecords(records) {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const data = raw ? JSON.parse(raw) : {};
            data.records = records.slice(0, 100); // 最多保留100条
            data.updatedAt = new Date().toISOString();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('保存记录失败:', e);
            return false;
        }
    },

    // ---- 导出全部数据 ----
    exportAll() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : { brands: [], records: [] };
        } catch (e) {
            return { brands: [], records: [] };
        }
    },

    importAll(jsonData) {
        try {
            if (jsonData.brands && Array.isArray(jsonData.brands)) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    brands: jsonData.brands,
                    records: jsonData.records || [],
                    updatedAt: new Date().toISOString(),
                }));
                return true;
            }
        } catch (e) {
            console.error('导入失败:', e);
        }
        return false;
    },

    // ---- 主题 ----
    getTheme() {
        return localStorage.getItem(THEME_KEY) || 'light';
    },

    setTheme(theme) {
        localStorage.setItem(THEME_KEY, theme);
    },
};
