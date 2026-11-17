# invoify-plus

> 现代化、高健壮性且支持批量管理的多币种开源发票生成平台。
> Modern, resilient, and batch-enabled multi-currency open-source invoice generator.

---

## 中文文档 (Chinese)

### 简介
`invoify-plus` 是基于开源发票应用 [invoify](https://github.com/al1abb/invoify) 的 A 路线二次开发增强版。采用 Next.js 15、TypeScript、Tailwind CSS 和 shadcn/ui 构建。无需注册账户，所有发票信息在浏览器本地进行 AES-GCM 256 位加密存储，并提供极速的高质量 PDF 渲染、多币种与多语言支持、批量管理及多格式导出能力。

---

### 功能与改进点

本项目严格遵循 A 路线二次开发规范，在原项目基础上完成了 5 项实质性功能与健壮性改进，详细变更记录见 [CHANGES.md](CHANGES.md)：

1. **批量发票管理与多格式批量导出增强**
   - **批量发票操作**：在「已保存发票」弹窗中新增全选/多选发票功能，支持一键批量删除或合并批量导出为 JSON 备份文件。
   - **表格导出优化**：为导出的 CSV 文件注入标准 UTF-8 BOM（`\uFEFF`），并规范扁平化发票基础信息与多行商品明细，确保在 Excel、Numbers 或 Google Sheets 中直接打开时中文及特殊货币符号绝无乱码。
2. **服务端 Chromium 启动机制与 PDF 导出健壮性加固**
   - **多层级回退机制**：彻底解决原项目在 Docker 生产阶段（执行 `npm prune --omit=dev` 剔除 puppeteer 后）因非 Serverless 误判导致的运行时崩溃问题。优先适配环境变量 `PUPPETEER_EXECUTABLE_PATH` / `CHROME_BIN` 及系统内置 Chromium 路径（如 Alpine `/usr/bin/chromium-browser`），并能自动回退到 `@sparticuz/chromium` + `puppeteer-core`。
   - **容器环境防崩优化**：注入 `--disable-dev-shm-usage` 与 `--disable-gpu` 启动参数，规避内存或共享内存受限容器下的崩溃。
   - **渲染防死锁保护**：在单页面队列锁中加入 45 秒超时与故障自愈清理，防止单个挂死渲染请求永久阻塞后续 PDF 导出。
3. **多币种离线兜底与大额/特殊币种金额大写计算修复**
   - **离线货币支持**：在外部汇率货币 API 离线、超时或限流时，自动兜底提供涵盖全球 30+ 种主流法币（USD, EUR, GBP, CNY, JPY, CAD, AUD 等）的完整离线列表，确保货币下拉选单随时可用。
   - **高精度金额大写转换**：重构金额大写转换算法中的浮点取整逻辑，修复 JavaScript 浮点减法精度缺陷，并增加对零值、无效数值（NaN）及负数的安全边界校验，彻底避免渲染白屏。
4. **完整简体中文本地化与发票模板 CJK 字体适配**
   - **全量汉化**：补全 `zh-CN.json` 缺失的全部关键模块（包括发票模版字段 `invoiceDocument`、外观图库 `gallery`、顶栏设置 `navbar`、落地页 `landing` 与元数据 `meta`）。
   - **中文化发票模板**：解除模板层对中文发票的强制英文降级限制，发票单据内的表头与结算项（项目、数量、单价、金额、小计、税率、总计等）完整呈现标准中文。
   - **CJK 字体渲染适配**：引入包括 PingFang SC、Microsoft YaHei、Noto Sans SC 在内的系统级 CJK 字体回退栈，保证打印及预览排版清晰美观。
5. **已保存发票状态就地变异污染修复**
   - 彻底修复了原项目中在点击加载已存发票时直接就地修改原始引用的 Bug（原实现会导致 Logo 与签名被错误抹除并破坏存储状态）。通过深拷贝隔离持久化数据源，保障数据完整性。

---

### 快速开始

#### 环境要求
- Node.js 20 及以上（推荐 Node.js 22 LTS）
- npm 10 及以上

#### 1. 安装依赖
```bash
npm ci
```

#### 2. 生成 PDF 离线样式与内嵌字体
```bash
npm run build:pdf-css
```
*(注：执行 `npm run dev` 或 `npm run build` 时会自动通过 predev / prebuild 钩子触发该步骤)*

#### 3. 配置环境变量（可选）
如果需要使用「发票邮件发送」功能，请在根目录创建 `.env.local` 文件（注意：不要填写任何真实密钥或账号）：
```env
# 可选：站点主域名（用于 SEO 与 Canonical URL）
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# 可选：Gmail 邮件发送配置（仅支持应用专用密码 App Password，不要填写真实密码）
NODEMAILER_EMAIL=your_email_placeholder@example.com
NODEMAILER_PW=your_app_password_placeholder
```

#### 4. 启动开发服务器
```bash
npm run dev
```
打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可。

#### 5. 生产构建与启动
```bash
npm run build
npm run start
```

---

### 来源与致谢

本项目基于 [invoify](https://github.com/al1abb/invoify) 二次开发，原项目由 al1abb 以 MIT 许可证开源。

---

### 许可证

沿用原项目 MIT 许可证，全文详见根目录 [LICENSE](LICENSE)。

---

## English Documentation

### Introduction
`invoify-plus` is an enhanced Route-A secondary development distribution of the open-source web invoice generator [invoify](https://github.com/al1abb/invoify). Built on Next.js 15, TypeScript, Tailwind CSS, and shadcn/ui. With zero account requirements, your business data is encrypted at rest using AES-GCM 256 in the browser local storage. It delivers fast and professional PDF generation, multi-currency / multilingual capabilities, batch management, and multi-format exports.

---

### Features & Enhancements

This project strictly adheres to the Route-A secondary development guidelines, delivering 5 substantive improvements over the original project (see [CHANGES.md](CHANGES.md) for full technical details):

1. **Batch Invoice Management & Robust Multi-Format Export**
   - **Batch Operations**: Added multi-select and select-all capabilities to the Saved Invoices modal, enabling one-click batch deletion and consolidated JSON export.
   - **CSV Export Improvements**: Injected standard UTF-8 BOM (`\uFEFF`) and normalized tabular item line unrolling, guaranteeing seamless spreadsheet imports in Excel, Apple Numbers, and Google Sheets without encoding issues.
2. **Serverless & Container Chromium PDF Export Hardening**
   - **Multi-Tier Browser Fallback**: Fixed a severe Docker production failure caused by `npm prune --omit=dev` pruning Puppeteer while running in non-serverless mode. Automatically checks `PUPPETEER_EXECUTABLE_PATH`, `CHROME_BIN`, system paths (e.g., Alpine `/usr/bin/chromium-browser`), and seamlessly falls back to `@sparticuz/chromium` + `puppeteer-core`.
   - **Container Stability**: Added `--disable-dev-shm-usage` and `--disable-gpu` to prevent container OOM issues.
   - **Anti-Deadlock Guard**: Implemented a 45-second timeout and crash recovery in the shared page queue lock, preventing hanging tasks from permanently blocking the queue.
3. **Offline Multi-Currency Fallback & Amount-in-Words Precision Fix**
   - **Built-in Currency Fallback**: When the external exchange rate API is unreachable, rate-limited, or offline, the currency selector immediately falls back to a curated list of 30+ major world currencies.
   - **High-Precision Amount-in-Words**: Fixed floating-point modulo/rounding bugs in amount calculation and added guards against zero, negative, and invalid values (NaN).
4. **Complete Simplified Chinese Localization & CJK Font Fallback**
   - **Full zh-CN Coverage**: Translated and completed all missing message keys (`invoiceDocument`, `gallery`, `navbar`, `landing`, `meta`).
   - **Localized Invoice Templates**: Removed hardcoded fallback restrictions for Chinese invoice templates, displaying native localized document labels.
   - **CJK Font Stack**: Added font fallbacks (PingFang SC, Microsoft YaHei, Noto Sans SC) ensuring crisp CJK text rendering in both live preview and PDF export.
5. **Saved Invoices In-Place Mutation Bug Fix**
   - Replaced in-place object mutations in `SavedInvoicesList` with deep cloning (`JSON.parse(JSON.stringify)`), preventing loss of user logos, signatures, and timestamps when loading saved invoices.

---

### Quick Start

#### Prerequisites
- Node.js 20 or later (Node.js 22 LTS recommended)
- npm 10 or later

#### 1. Install Dependencies
```bash
npm ci
```

#### 2. Compile PDF Stylesheet and Embedded Fonts
```bash
npm run build:pdf-css
```

#### 3. Environment Variables (Optional)
If you wish to use the email delivery feature, create a `.env.local` file with placeholders (never commit actual secrets):
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODEMAILER_EMAIL=your_email_placeholder@example.com
NODEMAILER_PW=your_app_password_placeholder
```

#### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

#### 5. Production Build & Run
```bash
npm run build
npm run start
```

---

### Provenance and Acknowledgments

This project is a secondary development based on [invoify](https://github.com/al1abb/invoify), originally open-sourced by al1abb under the MIT License.

*(English: This project is a secondary development based on [invoify](https://github.com/al1abb/invoify), originally open-sourced by al1abb under the MIT License.)*

---

### License

Distributed under the original MIT License. See [LICENSE](LICENSE) for the full text.
