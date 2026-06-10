/* ============================================
   brands.js — 品牌数据 & 匹配引擎
   ============================================ */

// ---- 别名表 ----
const BRAND_ALIASES = {
    // 中华
    '中华硬': '中华(硬)', '硬中华': '中华(硬)',
    '中华软': '中华(软)', '软中华': '中华(软)',
    '中华双中支': '中华(双中支)', '双中支': '中华(双中支)',
    '中华金中支': '中华(金中支)', '金中支': '中华(金中支)',
    '中华细支': '中华(细支)',
    // 利群
    '利群新版': '利群(新版)',
    '利群软红': '利群(软红长嘴)', '利群软红长嘴': '利群(软红长嘴)',
    '利群阳光': '利群(软阳光)', '利群软阳光': '利群(软阳光)',
    '利群西子阳光': '利群(西子阳光)', '西子阳光': '利群(西子阳光)',
    '利群夜西湖': '利群(夜西湖)', '夜西湖': '利群(夜西湖)',
    // 黄鹤楼
    '黄鹤楼软蓝': '黄鹤楼(软蓝)', '黄鹤楼蓝': '黄鹤楼(软蓝)', '黄鹤楼蓝软': '黄鹤楼(软蓝)',
    '黄鹤楼硬珍': '黄鹤楼(硬珍品)', '黄鹤楼珍品': '黄鹤楼(硬珍品)',
    '黄鹤楼软珍': '黄鹤楼(软珍品)', '黄鹤楼软珍品': '黄鹤楼(软珍品)',
    '黄鹤楼硬红': '黄鹤楼(硬红)',
    '黄鹤楼天下名楼': '黄鹤楼(天下名楼)', '天下名楼': '黄鹤楼(天下名楼)',
    // 芙蓉王
    '芙蓉王硬': '芙蓉王(硬)', '硬芙蓉王': '芙蓉王(硬)',
    '芙蓉王软蓝': '芙蓉王(软蓝)',
    '芙蓉王硬蓝': '芙蓉王(硬蓝)',
    // 玉溪
    '玉溪软': '玉溪(软)', '软玉溪': '玉溪(软)',
    '玉溪硬': '玉溪(硬)', '硬玉溪': '玉溪(硬)',
    '玉溪软尚善': '玉溪(软尚善)', '玉溪尚善': '玉溪(软尚善)', '软尚善': '玉溪(软尚善)',
    // 云烟
    '云烟软珍': '云烟(软珍品)', '云烟珍品': '云烟(软珍品)', '云烟软珍品': '云烟(软珍品)',
    '云烟紫': '云烟(紫)', '紫云': '云烟(紫)', '紫云烟': '云烟(紫)',
    '云烟细支珍品': '云烟(细支珍品)', '云烟细珍': '云烟(细支珍品)',
    '小熊猫': '云烟(小熊猫)', '云烟小熊猫': '云烟(小熊猫)',
    // 南京
    '南京炫赫门': '南京(炫赫门)', '炫赫门': '南京(炫赫门)',
    '南京红': '南京(红)', '红南京': '南京(红)',
    '南京雨花石': '南京(雨花石)', '雨花石': '南京(雨花石)',
    '南京九五': '南京(九五)', '九五至尊': '南京(九五)', '九五': '南京(九五)',
    // 苏烟
    '红杉树': '苏烟(五星红杉树)', '五星红杉树': '苏烟(五星红杉树)', '苏烟五星': '苏烟(五星红杉树)',
    '苏烟软金砂': '苏烟(软金砂)', '软金砂': '苏烟(软金砂)', '苏烟金砂': '苏烟(软金砂)',
    // 红塔山
    '红塔山1956': '红塔山(经典1956)', '红塔山经典': '红塔山(经典1956)', '红塔山经典1956': '红塔山(经典1956)',
    '红塔山大经典': '红塔山(大经典)', '大经典': '红塔山(大经典)',
    // 黄金叶
    '黄金叶乐途': '黄金叶(乐途)', '乐途': '黄金叶(乐途)',
    '黄金叶金满堂': '黄金叶(金满堂)', '金满堂': '黄金叶(金满堂)',
    '黄金叶天叶': '黄金叶(天叶)', '天叶': '黄金叶(天叶)',
    // 双喜
    '双喜软经典': '双喜(软经典)',
    '双喜硬经典': '双喜(硬经典)', '双喜经典': '双喜(硬经典)',
    // 黄山
    '黄山记忆': '黄山(记忆)',
    '黄山大红方印': '黄山(大红方印)', '大红方印': '黄山(大红方印)',
    // 白沙
    '和天下': '白沙(和天下)', '白沙和天下': '白沙(和天下)',
    '白沙精品': '白沙(精品)',
    // 其他
    '钻石荷花': '钻石(荷花)', '荷花': '钻石(荷花)',
    '贵烟跨越': '贵烟(跨越)', '跨越': '贵烟(跨越)',
};

// ---- 品牌索引 ----
let brandNameToIndex = {};

function buildBrandIndex(brands) {
    brandNameToIndex = {};
    brands.forEach((b, i) => {
        brandNameToIndex[normalizeText(b.name)] = i;
    });
}

// ---- 文本标准化 ----
function normalizeText(text) {
    if (!text) return '';
    return text
        .replace(/（/g, '(').replace(/）/g, ')')
        .replace(/【/g, '[').replace(/】/g, ']')
        .replace(/《/g, '<').replace(/》/g, '>')
        .replace(/０/g, '0').replace(/１/g, '1').replace(/２/g, '2')
        .replace(/３/g, '3').replace(/４/g, '4').replace(/５/g, '5')
        .replace(/６/g, '6').replace(/７/g, '7').replace(/８/g, '8').replace(/９/g, '9')
        .replace(/：/g, ':').replace(/，/g, ',').replace(/；/g, ';')
        .replace(/！/g, '!').replace(/？/g, '?').replace(/。/g, '.')
        .replace(/　/g, ' ')
        .replace(/\s+/g, '')
        .toLowerCase();
}

function stripBrackets(text) {
    return text.replace(/[(\[{<].*?[)\]}>]/g, '').replace(/[（【《].*?[）】》]/g, '');
}

function extractKeywords(name) {
    const c = normalizeText(name).replace(/[()\[\]{}（）【】]/g, ' ');
    return c.split(/\s+/).filter(k => k.length >= 2);
}

// ---- 品牌匹配（多策略） ----
function matchBrand(text, brands) {
    if (!text || !brands.length) return null;
    const t = normalizeText(text);
    if (!t) return null;
    const tNoBr = stripBrackets(t);

    // 1. 查别名表
    for (const [alias, target] of Object.entries(BRAND_ALIASES)) {
        if (normalizeText(alias) === t || normalizeText(alias) === tNoBr) {
            const idx = brandNameToIndex[normalizeText(target)];
            if (idx !== undefined) return idx;
        }
    }

    // 2. 精确匹配
    if (brandNameToIndex[t] !== undefined) return brandNameToIndex[t];

    // 3. 去括号匹配
    for (let i = 0; i < brands.length; i++) {
        const n = normalizeText(brands[i].name);
        if (tNoBr === stripBrackets(n) && tNoBr.length >= 2) return i;
    }

    // 4. 包含匹配
    let best = null, bestScore = 0;
    for (let i = 0; i < brands.length; i++) {
        const n = normalizeText(brands[i].name);
        const nNoBr = stripBrackets(n);
        for (const [a, b] of [[t, n], [tNoBr, nNoBr]]) {
            if (a.includes(b) || b.includes(a)) {
                const s = Math.min(a.length, b.length) / Math.max(a.length, b.length);
                if (s > bestScore) { bestScore = s; best = i; }
            }
        }
    }
    if (bestScore >= 0.5) return best;

    // 5. 关键词匹配
    const ikw = extractKeywords(text);
    if (ikw.length >= 2) {
        for (let i = 0; i < brands.length; i++) {
            const bkw = extractKeywords(brands[i].name);
            const m = ikw.filter(ik => bkw.some(bk => bk.includes(ik) || ik.includes(bk)));
            const s = m.length / Math.max(ikw.length, bkw.length);
            if (s >= 0.6 && s > bestScore) { bestScore = s; best = i; }
        }
    }
    if (bestScore >= 0.6) return best;

    // 6. 长关键词
    if (ikw.length === 1 && ikw[0].length >= 3) {
        for (let i = 0; i < brands.length; i++) {
            if (normalizeText(brands[i].name).includes(ikw[0])) return i;
        }
    }

    return bestScore >= 0.5 ? best : null;
}

// ---- 行解析 ----
function parseLine(line) {
    let cleaned = line.replace(/[¥￥元]/g, '').replace(/条/g, '').trim();
    if (!cleaned) return null;

    let parts;
    if (cleaned.includes('\t')) {
        parts = cleaned.split('\t').map(p => p.trim()).filter(p => p);
    } else if (cleaned.includes(',')) {
        parts = cleaned.split(',').map(p => p.trim()).filter(p => p);
    } else if (cleaned.includes('，')) {
        parts = cleaned.split('，').map(p => p.trim()).filter(p => p);
    } else {
        parts = cleaned.split(/[\s]{2,}/).filter(p => p);
        if (parts.length < 2) parts = cleaned.split(/\s+/).filter(p => p);
    }
    if (parts.length < 2) return null;

    let numbers = [], textParts = [];
    parts.forEach(p => {
        const num = parseFloat(p);
        if (!isNaN(num) && num > 0 && num < 10000) numbers.push(num);
        else textParts.push(p);
    });
    if (numbers.length === 0) return null;

    const brandText = textParts.length > 0 ? textParts.join(' ') : (numbers.length >= 2 ? parts[0] : null);
    if (!brandText) return null;

    let wholesale = null, market;
    if (numbers.length >= 2) { wholesale = numbers[0]; market = numbers[1]; }
    else { market = numbers[0]; }

    return { brandText, wholesale, market };
}

// ---- 导出品牌库为文本 ----
function brandsToText(brands) {
    return brands.map(b => {
        const mkt = b.market !== undefined ? ` ${b.market}` : '';
        return `${b.name} ${b.wholesale}${mkt}`;
    }).join('\n');
}

// ---- 解析文本为品牌库 ----
function textToBrands(text) {
    const lines = text.split(/[\n\r]+/).filter(l => l.trim());
    const brands = [];
    const errors = [];

    lines.forEach((line, i) => {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 2) {
            errors.push(`第${i + 1}行格式错误`);
            return;
        }
        const wholesale = parseFloat(parts[parts.length - 1]);
        let name, market;

        if (parts.length >= 3) {
            // 品牌名 批发价 市场价
            const mp = parseFloat(parts[parts.length - 1]);
            const wp = parseFloat(parts[parts.length - 2]);
            if (!isNaN(wp) && !isNaN(mp)) {
                name = parts.slice(0, -2).join(' ');
                wholesale = wp;
                market = mp;
            } else {
                name = parts.slice(0, -1).join(' ');
            }
        } else {
            name = parts.slice(0, -1).join(' ');
        }

        if (!name || isNaN(wholesale) || wholesale <= 0) {
            errors.push(`第${i + 1}行无法解析`);
            return;
        }

        const brand = { name, wholesale };
        if (market !== undefined && !isNaN(market) && market > 0) {
            brand.market = market;
        }
        brands.push(brand);
    });

    return { brands, errors };
}
