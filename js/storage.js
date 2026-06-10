/* ============================================
   storage.js — localStorage 读写封装
   ============================================ */

const STORAGE_KEY = 'cigarette_calc_data_v3';
const THEME_KEY = 'cigarette_calc_theme';

// ---- 默认品牌库（首次使用时自动加载） ----
const DEFAULT_BRANDS = [
    // 中华系列
    { name: '中华(硬)', wholesale: 381.0 },
    { name: '中华(软)', wholesale: 583.5 },
    { name: '中华(双中支)', wholesale: 450.0 },
    { name: '中华(金中支)', wholesale: 678.0 },
    { name: '中华(细支)', wholesale: 424.0 },
    // 利群系列
    { name: '利群(新版)', wholesale: 122.0 },
    { name: '利群(软红长嘴)', wholesale: 190.0 },
    { name: '利群(软阳光)', wholesale: 280.0 },
    { name: '利群(西子阳光)', wholesale: 220.0 },
    { name: '利群(夜西湖)', wholesale: 158.0 },
    // 黄鹤楼系列
    { name: '黄鹤楼(软蓝)', wholesale: 170.0 },
    { name: '黄鹤楼(硬珍品)', wholesale: 265.0 },
    { name: '黄鹤楼(软珍品)', wholesale: 530.0 },
    { name: '黄鹤楼(硬红)', wholesale: 170.0 },
    { name: '黄鹤楼(天下名楼)', wholesale: 140.0 },
    // 芙蓉王系列
    { name: '芙蓉王(硬)', wholesale: 218.0 },
    { name: '芙蓉王(软蓝)', wholesale: 500.0 },
    { name: '芙蓉王(硬蓝)', wholesale: 265.0 },
    // 玉溪系列
    { name: '玉溪(软)', wholesale: 201.0 },
    { name: '玉溪(硬)', wholesale: 206.0 },
    { name: '玉溪(软尚善)', wholesale: 220.0 },
    // 云烟系列
    { name: '云烟(软珍品)', wholesale: 206.0 },
    { name: '云烟(紫)', wholesale: 97.0 },
    { name: '云烟(细支珍品)', wholesale: 212.0 },
    // 南京系列
    { name: '南京(炫赫门)', wholesale: 143.0 },
    { name: '南京(红)', wholesale: 106.0 },
    { name: '南京(雨花石)', wholesale: 455.0 },
    { name: '南京(九五)', wholesale: 848.0 },
    // 苏烟系列
    { name: '苏烟(五星红杉树)', wholesale: 178.0 },
    { name: '苏烟(软金砂)', wholesale: 424.0 },
    // 红塔山系列
    { name: '红塔山(经典1956)', wholesale: 66.0 },
    { name: '红塔山(大经典)', wholesale: 85.0 },
    // 黄金叶系列
    { name: '黄金叶(乐途)', wholesale: 130.0 },
    { name: '黄金叶(金满堂)', wholesale: 95.0 },
    { name: '黄金叶(天叶)', wholesale: 848.0 },
    // 双喜系列
    { name: '双喜(软经典)', wholesale: 72.0 },
    { name: '双喜(硬经典)', wholesale: 85.0 },
    // 黄山系列
    { name: '黄山(记忆)', wholesale: 106.0 },
    { name: '黄山(大红方印)', wholesale: 265.0 },
    // 白沙系列
    { name: '白沙(和天下)', wholesale: 848.0 },
    { name: '白沙(精品)', wholesale: 72.0 },
    // 其他
    { name: '钻石(荷花)', wholesale: 280.0 },
    { name: '贵烟(跨越)', wholesale: 190.0 },
    { name: '云烟(小熊猫)', wholesale: 178.0 },
];

const HAS_LOADED_DEFAULTS = 'cigarette_calc_defaults_loaded';

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

        // 首次使用：自动加载默认品牌库
        if (!localStorage.getItem(HAS_LOADED_DEFAULTS)) {
            localStorage.setItem(HAS_LOADED_DEFAULTS, '1');
            Storage.saveBrands(DEFAULT_BRANDS);
            return [...DEFAULT_BRANDS];
        }

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
