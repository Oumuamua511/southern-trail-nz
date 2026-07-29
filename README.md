# Southern Trail NZ

2026 年新西兰南岛 13 天自驾手账，以单页静态网站交付。页面包含每日行程、真实南岛路线图、住宿、预算、行前清单和旅行贴士。

正式站点：<https://oumuamua511.github.io/southern-trail-nz/>

完整产品形态、技术实现、数据来源、维护边界和发布清单见 [正式交付说明](docs/DELIVERY.md)。

## 本地运行

项目没有安装或构建步骤。克隆后在仓库根目录启动任意静态服务器：

```bash
python3 -m http.server 4173
```

然后访问 `http://127.0.0.1:4173/`。

如需使用 Node.js 静态服务器：

```bash
npx serve .
```

## 发布前验证

静态校验需要 Node.js 22 或更新版本：

```bash
node scripts/verify-map.mjs
node scripts/verify-release.mjs
npx --yes html-validate@11.6.0 --rule no-inline-style:off index.html
git diff --check
```

GitHub Actions 会在开发分支、`master` 和面向 `master` 的拉取请求中执行同一组结构与 HTML 校验。

## 仓库结构

```text
.
├── .github/workflows/verify.yml # 跨环境静态发布校验
├── assets/icons/                # 16 枚本地图标与视觉规范
├── docs/DELIVERY.md             # 正式产品与技术交付说明
├── scripts/
│   ├── verify-map.mjs           # 地图结构、里程与无障碍契约
│   └── verify-release.mjs       # 全站资源、脚本与发布契约
├── index.html                   # 正式页面与全部运行时代码
├── .gitignore
└── README.md
```

开发过程中的原始地理数据、生成脚本、截图、临时修复脚本、签证和票据资料不属于正式交付内容，也不应提交到仓库。
