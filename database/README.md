# Beaver & Aura — 两端升级与本地验证

本次改动涉及用户端和管理端，必须连接**同一个 PostgreSQL 数据库**。不需要两端跨域互调：用户端直接读取同库的首页内容、员工排班和休息安排。

## 当前连接状态（2026-11-15）

- 本地用户端（3000）和管理端（3001）已切换到 Vercel 两个项目原本共用的 Neon `neondb`。`.env.local` 和 `.env.production.local` 均忽略提交；只更换了本地的 `DATABASE_URL`。
- 已完成完整备份、隔离恢复演练及三个增量 SQL 的事务升级，新增 4 张表和 15 个字段。旧顾客、预约和登录账号关联记录的数量及原字段内容校验一致。
- 升级前备份及日志：`/Users/dylanmengzhou/Documents/ChatGPT/.beavernail-backups/20261115T040832Z/`。原本的本地测试库配置分别保存在该目录的 `.env.web.local.before-online`、`.env.admin.local.before-online`。
- 当前本地管理端的保存操作会直接写入线上库。测试和 seed 仍限制在隔离库；运行 HTTP 联调前，必须将两端服务与测试进程一起切回隔离测试配置。
- 尚未将本次代码部署到 Vercel；线上现有站点继续运行原部署。

## 上线顺序

1. 备份现有数据库。
2. 用已有数据库连接执行一次增量脚本：`psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/20261114_studio.sql`。两个仓库的脚本相同，任选一份执行即可。脚本可重复执行，不会删除原有顾客、预约、价格、付款截图或员工账号。
   再执行 `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/20261114_weekly_closures.sql` 初始化全店固定休息日。可重复执行，已保存的星期设置会保留。
3. 在两端安装依赖并生成 Prisma Client：`npm ci --legacy-peer-deps`、`npx prisma generate`。这里使用 Node 24 验证；用户端原 Volta 配置仍为 Node 22.15.1，可按部署环境使用受支持的 Node 版本。
4. 管理端配置 `DATABASE_URL`、`JWT_SECRET`。`JWT_SECRET` 是登录和 API 验签共用的密钥，缺失时 API 会明确拒绝访问。用户端保留已有 `AUTH_SECRET`、`AUTH_URL`、Google/Kakao 等配置，并配置相同 `DATABASE_URL`。
5. 两端各自配置原有 `TELEGRAM_API`、`TELEGRAM_CHAT_ID`，再部署管理端和用户端。未配置 Telegram 时预约仍会保存，响应中 `notified: false`；发送失败不会把已保存的预约伪装为预约失败。
6. 管理员登录管理端 → 员工与工作室管理 → 工作室设置，检查首页、bella 和 nana 的业务与每周工作日，再开放新服务。

线上数据库已按上方记录完成增量升级；尚未部署本次代码。环境变量文件不可提交。

## 数据与兼容规则

- 保留原 `NailArtist` / `nailArtistId` 名称以兼容已有账号、外键及付款数据，界面按通用服务员工展示。
- 现有员工 `schedule = null` 时沿用原有服务时段：10:00 / 12:00 / 14:00 / 16:00 / 19:00 开始；首次保存排班后以管理端配置为准。现有员工默认开放美甲。
- bella 初始开放化妆，每次 120 分钟，每天 10:00–16:00；16:00 是下班时间，因此可约 10:00 / 12:00 / 14:00。工作日、时段、时长、开放业务都可修改；以后可同时开放两种业务。若数据库已有 bella 且已有新排班，重复执行不会覆盖配置。
- 预约保存 `serviceType`、`durationMinutes` 快照。员工后来修改时长，原有预约仍按当时的时长占位。预约重叠按真实起止时间检查，美甲和化妆共用同一员工的容量。
- 排班、预约、休息写入使用事务和锁；数据库触发器也拦截绕过新接口的员工重叠预约。
- 全店固定休息日默认每周一，可在管理端「休息安排」修改。首尔日期命中休息日时，全店所有服务暂停预约；移除该星期后，各员工按自己的排班接单。
- `TimeOff.nailArtistId = null` 表示全店休息；指定员工只影响本人。区间为 **[开始, 结束)**，按韩国时间处理。全天范围包含管理端填写的结束日期；局部时段与任一预约占用相交即不可约。
- 新增休息若与已有预约冲突，会返回预约清单并拒绝保存，不会自动取消。旧的“用预约记录占休息”的数据无法安全自动识别，仍保留；请人工确认后改用新休息记录，避免误删真实预约。
- `Reservation.note` 是工作人员的本次预约备注；`Reservation.customerRequest` 是顾客本次填写的需求；`User.customerNote` 是长期顾客备注。长期备注不会进入用户端会话或预约详情。
- 参考图是 `Reservation.referenceImageIds`，与原 `uploadImage` 付款截图完全独立。每次可不上传，或最多 4 张 JPG/PNG/WebP，每张 4MB。图片存在同库 `MediaAsset`，跨实例可持久读取；顾客参考图仅本人和管理端可查看，不通过公共图床公开。
- 旧 `/api/nail-artists` 调用未带业务参数时默认返回可做美甲的员工；化妆传 `serviceType=makeup`。旧固定时段客户端会把新排班以外的 16:00 / 19:00 等开始时间标记为不可约，提交时仍由服务端再次检查。
- 管理端所有 API 验证签名及有效期，工作室设置写入仅管理员可用；备注、参考图和认证 API 不作离线缓存。
- 首页轮播存在 `HomeContent`。管理端以照片墙展示，支持增删、替换、启停、长按拖动排序和三语标题/图片说明；至少保留一张启用的轮播图。用户端刷新页面读取最新内容，数据库不可用时保留现有默认图片。
- 用户端已登录且有待赴约预约时，首页优先展示预约和韩国日期天气，小轮播使用同一份首页照片配置；访客及无待赴约预约时显示介绍首屏。最近预约按韩国日期和时段排序，包含当天未来时段。
- 所有创建/取消预约的 Telegram 通知使用同一模板，包含最新长期备注、本次预约备注和顾客需求，转义 HTML，长内容自动拆分。

## 本地预览与测试

本次在 `127.0.0.1:55432/beaver_studio_test` 创建独立 PostgreSQL 测试库。所有测试和 seed 脚本都检查主机及库名，拒绝对线上库运行。未配置真实 Telegram，因此联调不会发送实际通知。

- 用户端：`http://localhost:3000`；管理端：`http://localhost:3001`。
- 用户端本地预览账号：`studio_preview` / `local-preview-only`，仅存在上述本地库。
- 初始化预览顾客和 nana：在用户端运行 `npx tsx --env-file=.env.local scripts/seed-local.ts`。bella 由增量 SQL 初始化。不创建员工登录密码。界面联调另保留了一条标明本地预览的示例预约及参考图，可在管理端查看。
- 两端规则单测：`npm run test:studio`。
- 管理端 HTTP/数据库联调：两端开发服务器启动后运行 `npm run test:integration`。覆盖身份验证、抢约、防重叠、员工独立休息/全店休息、已有预约冲突、跨端首页同步、两类备注、私有图片、登录上传及无图预约、旧日历/统计/结算接口兼容。
- 两端代码检查：`npx tsc --noEmit --incremental false`；生产构建：`npm run build -- --no-lint`（新模块另做 ESLint 检查，旧项目的全量 lint 历史问题未在本次扩大处理）。

`lib/studio/{booking,booking-db,validation,home,notifications,media,http}.ts`、Prisma schema 和增量 SQL 在两端保持一致；修改共享规则时需同步两份并运行测试。

## 满月日历本地预览

在管理端运行 `npm run seed:calendar -- 2026-11`，按当前员工排班填满该月所有可约时段，保留已有预约和休息安排。此脚本仅允许访问本机 `beaver_studio_test`，直接写入预览数据；不会发送 Telegram。预览顾客 ID 带 `calendar_preview_2026_11_` 前缀，预约备注带 `[本地预览 2026-11]`。重复运行只补空余时段。

查看完后可运行 `npm run seed:calendar -- 2026-11 --clear`，仅删除该脚本生成的该月顾客与预约。

## 服务、内容与业绩扩展

部署前执行 20261114_catalog_content_earnings.sql 并 prisma generate。新列为增量添加，历史数据不改写。
HomeContent 的 studio-content-v1 保存服务项目、价目表、提醒、活动、关于我们及联系方式；
两端的 content.ts、content-default.json、markdown.ts 和预约规则需保持一致。

管理员在「员工与排班」设置各项目的独立工作时段和提成比例，在订单结算录入含定金的实收金额。
营业额、实收、提成按预约月份及币种分别汇总，历史未录入的实收和提成保持未录入。
已结算订单保留当时比例，修改员工比例不重算旧订单。员工只能查看自己名下业绩。

会员专栏所有员工可查看，修改接口仅管理员可调用。
内容编辑器使用 @uiw/react-md-editor；marked + sanitize-html 在服务端渲染。
NEXT_PUBLIC_CUSTOMER_ORIGIN 指定实际顾客端预览地址，本机默认 http://localhost:3000，
正式环境默认 https://www.beavernail.com。内容保存后网页与小程序读取同一数据库。

完整回归：npx tsx --env-file=.env.local --test --test-concurrency=1 tests/*.integration.test.ts。
