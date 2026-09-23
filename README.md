# Southern Trail NZ

2026 年 9 月 24 日至 10 月 6 日的新西兰南岛 13 天自驾行程手账。它是一个无需构建或后端的静态单页网站：提供每日行程、路线图、Google 地图目的地入口、灵动提醒窗、行前清单、预算和现场查阅工具。

正式站点：<https://oumuamua511.github.io/southern-trail-nz/>

## 本地预览

克隆仓库后，在根目录启动静态服务器。Windows：

```powershell
# Windows Python Launcher
py -m http.server 4173

# 或已在 PATH 中的 Python
python -m http.server 4173
```

macOS / Linux：

```bash
python3 -m http.server 4173
```

打开 <http://127.0.0.1:4173/>。页面不依赖安装包；浏览器和静态文件服务器即可运行。请使用 HTTP 服务预览，避免用 `file://` 打开，因为浏览器对本地存储和 Service Worker 的策略不同。

## 验证与维护

完整的 Node.js 22+ 验证命令，以及产品形态、实现结构、数据精度、隐私与离线边界、兼容性、维护规则和发布验收，统一见 [docs/DELIVERY.md](docs/DELIVERY.md)。

页面时间均为行程计划；航班状态、天气、路况、封路和活动运营情况应以航司、运营商及现场公告为准。
