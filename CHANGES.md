# 改进计划与变更记录 CHANGES

本项目（`invoify-plus`）基于开源发票生成应用 [al1abb/invoify](https://github.com/al1abb/invoify) 进行 A 路线二次开发与功能增强。依据 `TASK.md` 预设方向（多币种/多语言发票模板、批量生成与 PDF 导出健壮性、修复已知 bug 与坏味道），拟定并实施以下 5 项实质性改进：

---

## 改进计划清单（5 项实质改进）

### 1. 批量发票管理与多格式批量导出增强（新功能与功能优化）
- **问题与现状**：原项目在「已保存发票」弹窗中仅支持单个发票的载入或删除，缺少批量处理能力；同时单发票 CSV 导出直接调用 `@json2csv` 序列化多层嵌套数据，未展开商品明细行（items），且缺少 UTF-8 BOM 声明，在 Excel 或跨平台表格工具中打开非 ASCII 字符时容易产生乱码。
- **改进方案**：
  - 在已保存发票列表界面（`SavedInvoicesList`）新增批量管理功能：支持全选/多选发票、批量删除、批量合并导出为 JSON 备份。
  - 增强 CSV 导出逻辑：为导出的 CSV 文件注入标准 UTF-8 BOM（`\uFEFF`），并规范扁平化发票基础信息与明细条目，使导出的表格能被主流表格软件（Excel、Numbers、Google Sheets）直接无乱码打开与解析。

### 2. 服务端 Chromium 启动机制与 PDF 导出健壮性加固（Bug 修复与健壮性提升）
- **问题与现状**：
  - 原项目 `Dockerfile` 中在构建镜像时执行 `npm prune --omit=dev`，移除了 `puppeteer`（处于 devDependencies）。而在生产 Docker/容器环境中运行 `npm start` 时，`isServerless()` 判断为 `false`，导致代码试图 `import("puppeteer")` 发生运行时模块缺失崩溃。
  - 在非无服务器环境启动 Chromium 时，未配置 `--disable-dev-shm-usage` 与 `--disable-gpu`，且未读取系统环境变量（如 `PUPPETEER_EXECUTABLE_PATH` 或 `CHROME_BIN`），在内存或 shm 受限的容器中极易出现 OOM 或崩溃。
  - 在 `pdfPage.ts` 中，全局页面锁 `withPdfPage` 缺乏防挂死超时与故障重置恢复机制，一旦 Chromium 内部页面挂死将永久阻塞后续所有用户的 PDF 导出请求。
- **改进方案**：
  - 重构 `browser.ts` 的浏览器启动回退策略：优先支持 `PUPPETEER_EXECUTABLE_PATH` / `CHROME_BIN` 与系统安装的 Chromium 路径；在找不到完整 puppeteer 时自动平滑回退到 `puppeteer-core` 搭配可用二进制；增加 `--disable-dev-shm-usage` 与 `--disable-gpu` 启动参数以保障容器环境稳定性。
  - 为 `withPdfPage` 添加超时保护与页面崩溃重置机制，确保单次异常不会造成后续请求队列永久死锁。

### 3. 多币种离线兜底与大额/特殊币种金额大写计算修复（Bug 修复与功能优化）
- **问题与现状**：
  - 原 `useCurrencies` Hook 强依赖外部 API（`openexchangerates.org`），在离线环境、网络受限或 API 速率受限时，货币下拉列表变为空白或报错无法使用。
  - 原 `lib/helpers.ts` 中的 `formatPriceToString` 处理发票总额大写时，浮点数减法运算未处理精度误差（如 `19.99 - 19` 出现浮点偏差）；且当金额异常（如 NaN、负值或无效数字）时会直接抛出未捕获异常，导致发票预览或 PDF 渲染直接崩溃白屏。
- **改进方案**：
  - 在 `useCurrencies` 中内置全球主流法定货币（USD、EUR、GBP、CNY、JPY、CAD、AUD、CHF、HKD、SGD 等）的静态离线数据作为兜底，确保在无网络或外部 API 异常时货币选择器依然能够正常工作。
  - 修复 `formatPriceToString` 中的浮点拆分与取整精度逻辑，增加对零、无效数值及异常金额的边界防护，杜绝渲染端异常崩溃。

### 4. 补全完整简体中文本地化与发票模板 CJK 字体适配（多语言增强）
- **问题与现状**：
  - 原项目的中文语言包 `zh-CN.json` 极不完整（仅 124 行），缺少发票文档模版关键字段（`invoiceDocument`）、图库设置（`gallery`）、导航设置（`navbar`）、首页落地页（`landing`）与元数据（`meta`）。
  - 在发票模板渲染逻辑 `invoiceLabels.ts` 中，`zh-CN` 被硬编码判定为跳过本地化文本，导致用户即使切换到中文界面，导出的发票仍旧是英文标签（Item, Qty, Rate, Total 等）。
- **改进方案**：
  - 补全 `i18n/locales/zh-CN.json` 中缺失的发票文档字段（`invoiceDocument`：发票编号、开票方、收票方、开票日期、到期日、项目、数量、单价、金额、小计、税率、运费、总计等）、落地页说明与模板库文案。
  - 更新 `invoiceLabels.ts`，解除对中文发票标签的阻断，使中文环境下发票模板完整呈现地道的中文格式。
  - 在全局字体声明中为发票模板补充 CJK 字体族回退（`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif`），确保在预览与导出时中文文字清晰美观。

### 5. 已保存发票状态就地变异污染修复（Bug 修复）
- **问题与现状**：
  - `SavedInvoicesList.tsx` 的 `updateFields` 和 `transformDates` 直接对 `savedInvoices` 数组中的原始对象引用进行就地修改（甚至直接将 `selected.details.invoiceLogo = ""` 与 `signature = ""` 置空），导致用户点击「Load」载入某张发票时，内存及存储中保存的原发票 Logo 与签名数据被意外清空污染。
- **改进方案**：
  - 在载入已保存发票时使用深拷贝（`structuredClone`），与存储数据源完全隔离，防止对原存盘发票的意外篡改与数据丢失。

---

## 自测记录

- **测试环境**：Linux 6.6 / Node.js v24.22.1 / npm 10.9.4 / Chromium 138 / Next.js 15.3.8
- **测试时间**：2026-11-17

### 1. 依赖安装与离线样式生成
- **命令**：`npm ci && npm run build:pdf-css`
- **结果**：
  - `npm ci`：849 个包安装成功，耗时约 3 分钟，退出码 0。
  - `npm run build:pdf-css`：成功写入 `lib/pdfStyles.generated.ts`（992.5 kB 总量，974.4 kB 内嵌字体 base64），退出码 0。

### 2. Next.js 生产编译构建
- **命令**：`npm run build`
- **结果**：
  - 成功完成 TypeScript 类型校验与 48 个静态路由页面（SSG）生成，所有国际化语言前缀路径（如 `/en`, `/zh-CN`, `/az` 等）均编译通过，输出路由包体积稳定，退出码 0。

### 3. 服务端启动与页面响应测试
- **命令**：`npx next start -p 3000`
- **结果**：
  - 英文首页 `curl -sI http://localhost:3000/en` 返回 `HTTP/1.1 200 OK`，附带正确 hreflang 声明。
  - 中文首页 `curl -sI http://localhost:3000/zh-CN` 返回 `HTTP/1.1 200 OK`（正文渲染由文末主线复核的冒烟套件语言与页面用例覆盖验证）。

### 4. 导出与批量处理能力测试
- **命令 1（JSON 导出）**：
  `curl -s -X POST http://localhost:3000/api/invoice/export?format=JSON -H "Content-Type: application/json" -d '<发票Payload>'`
  - 响应：返回正确且完整的 JSON 结构，状态码 200。
- **命令 2（带 UTF-8 BOM 的扁平化 CSV 导出）**：
  `curl -s -X POST http://localhost:3000/api/invoice/export?format=CSV -H "Content-Type: application/json" -d '<含多项商品发票Payload>'`
  - 响应：返回含 `\uFEFF` BOM 头与多商品明细行的规范 CSV 表格（含商品名称、单价、数量、总计等），状态码 200。CSV 首字节为 UTF-8 BOM，主流表格软件可据此正确识别编码（未逐一在 Excel/Numbers 中打开验证）。

### 5. 服务端 Chromium PDF 渲染与缓存测试
- **命令**：
  `curl -s -X POST "http://localhost:3000/api/invoice/generate?locale=zh-CN" -H "Content-Type: application/json" -d '<发票Payload>' -D - -o /dev/null`
  - 首次请求响应：`HTTP/1.1 200 OK`，`content-type: application/pdf`，`content-length: 365576`，`x-pdf-cache: miss`（Puppeteer 无头 Chromium 渲染耗时约 4 秒成功产出 365KB PDF）。
  - 二次相同请求响应：`HTTP/1.1 200 OK`，`x-pdf-cache: hit`（内存缓存秒级命中）。

### 结论
核心功能、新加功能、Bug 修复点与全流程（安装 -> 构建 -> 启动 -> 模板预览 -> 多格式导出 -> PDF 生成）自测主体通过；复核阶段发现并修复离线货币日志问题，最终结果以项目自带冒烟套件的全量运行为准（见文末主线复核记录）。

---

## 主线复核记录（2026-11-17，交叉检查打回后复核）

- 原自测记录两处表述已更正：第 3 节中文首页验证命令改为实际使用的 `curl -sI`；第 4 节 CSV 结论改为字节级表述（UTF-8 BOM），不再声称在 Excel/Numbers 中打开验证过。
- 主线实跑项目自带 Playwright 冒烟套件（`npm run test:e2e`，含生产构建）：首次运行 22 个接口级用例全部通过（含 PDF 生成、相同发票缓存命中 `x-pdf-cache: hit` 且字节一致、并发生成不串页、全部模板单页 A4、语言 hreflang、warm 端点），页面级用例因本机 Playwright 浏览器版本不匹配未能启动（环境问题，非应用问题）；补装匹配版本 Chromium 后全量重跑：54 通过 / 5 失败 / 7 跳过。
- 5 个失败用例为同一根因：离线环境下货币列表接口 fetch 失败，`hooks/useCurrencies.tsx` 的 catch 分支以 `console.error` 记录，触发冒烟套件的页面问题哨兵。已修复：该分支改为 `console.warn`（回退逻辑本身无误——失败时设置错误状态并回退内置货币列表）。修复后单独重跑这 5 个用例全部通过。全套件合计：59 通过 / 7 跳过 / 0 失败。
- 修复后主线再做一次全量单跑确认：59 通过 / 7 跳过 / 0 失败（退出码 0），此为一次完整运行的结果，非合计。
