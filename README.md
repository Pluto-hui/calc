# 💰 差价计算器

移动端商品差价计算工具，快速计算批发价与市场价之间的利润差价。

## 功能

- 📦 **品牌库管理** — 预设品牌批发价，支持增删改，数据本地存储
- 🧮 **差价实时计算** — 输入市场价自动计算单包/单条/N条利润
- 📥 **批量导入** — 从 Excel/微信复制粘贴价格表，智能匹配品牌
- 📊 **汇总统计** — 总成本、市场价合计、利润差价总和一目了然
- 🌙 **深色模式** — 支持浅色/深色主题切换
- 📱 **PWA 支持** — 可添加到手机主屏幕，离线也能用
- 💾 **数据导出** — 支持导出 CSV（Excel 可打开）和 JSON 备份

## 快速开始

直接在浏览器中打开 `web/index.html` 即可使用。

或部署到 GitHub Pages / Vercel / 任意静态托管服务。

## 项目结构

```
cigarette-calc/
├── web/
│   ├── index.html          # 主页面
│   ├── css/style.css       # 样式（CSS 变量支持主题切换）
│   ├── js/
│   │   ├── storage.js      # 数据持久化
│   │   ├── brands.js       # 品牌数据 & 模糊匹配引擎
│   │   ├── calculator.js   # 计算逻辑 & 状态管理
│   │   └── app.js          # UI 交互 & 页面控制
│   ├── manifest.json       # PWA 配置
│   ├── sw.js               # Service Worker（离线缓存）
│   └── assets/             # 图标资源
├── README.md
└── LICENSE
```

## 技术栈

- 纯前端 HTML + CSS + JavaScript
- CSS 变量实现主题切换
- Service Worker 实现 PWA 离线缓存
- localStorage 实现数据持久化
- 无需任何依赖和构建工具

## License

MIT
