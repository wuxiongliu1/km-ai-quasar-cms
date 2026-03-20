# 需求一

## 基于quasar 的框架，生成如下布局

1. 标准的左侧边导航栏，右边页面布局
2. 左侧导航栏支持抽屉toggle
3. 左侧导航栏展开的时候，将右边页面往右边推，而不是覆盖在右边页面上
4. 主题颜色为清新绿，带一点透明

# 需求二

## 任务1：开发基础的 表格组件

1. 封装一个适合增删改查的通用的表格组件，该表格组件需要实现如下功能

- 后端分页
- 条件过滤，可配置那些字段参与过滤，基于配置的字段名称和字段类型生成对应的过滤input类型
- 更新单条数据
- 删除单条数据
- 批量删除单条数据
- 新增数据
- 更新，删除，批量删除，新增 这些功能开关默认关闭，除非输入参数指定开启这些功能
- 不同的页面模块，在使用该组件的时候，期望只传入数据的schema数组即可完成完整的数据数据表格功能

## 任务2：优化CrudTable表格组件

1. 现在约定CrudTable的增删改查方法是统一的格式

function create(data) {

}

function delete(data) {

}

function udpate(data) {

}

function query(data) {

}

CrudTable， 外部只要传入 一个path即可； 基于该父级path，每个方法对应的完整path如下

create: POST /path/\_create
delete: POST /path/\_delete
udpate: POST /path/\_udpate
query: POST /path/\_query

CrudTable 负责实现这四个方法，不需要外部调用组件实现；

## 需求三

点击导航栏中某一项之后的，面包屑导航优化

1. 当前面包屑导航是在各个内容页面中维护的，希望有个通用组件来维护，且不需要维护在各个页面中，希望维护在 MainLayout.vue 这个组件中

## 需求四

- bug修复

1. 左边抽屉导航栏样式有点问题； 首页在未选中的时候，仍然处于高亮模式。
2. CrudTable 新增， 删除，更新功能，没有实现
3. 点击删除时， $q.notify is not a function

## 需求五

1. 增加mock 服务，mock 内容管理，用户管理的crud 后端接口
2.

## 需求六

新增一个笔记管理页面，需要实现如下功能

1. 笔记的列表管理，使用 CurdTable实现
2. 笔记的编辑，使用单独的页面；笔记的编辑要支持Markdown；

## 需求七

新增用户登录注册功能

1. 登录和注册界面保持简洁，主题和当前主题一致
2. 登录使用用户名 加密码登录，密码需要加密传输
3. 注册基于邮箱注册，注册信息需要提供：用户名，密码，邮箱

## 需求八：样式优化

1. 调整左侧导航栏的样式，宽度稍微宽个20px
2. 导航菜单整体字体偏小，稍微调整到适合当前屏幕分辨率的文字大小，且支持不同分辨率不同的文字大小

## 需求九：优化

### 2.1 安全性优化

1. **密码传输加密方式**：
   - **现状**：`LoginPage.vue` 和 `RegisterPage.vue` 只是使用了原生的 `btoa()` (Base64) 编码密码。
   - **建议**：Base64 仅仅是编码，完全可逆，不具备安全性。建议前端引入 `crypto-js` 使用 SHA-256 或 AES 进行单向哈希/加密加密；或直接依赖 HTTPS 进行安全隧道传输，由后端来执行加盐和 bcrypt 摘要哈希处理。
2. **防范 XSS 注入**：
   - **现状**：`NoteEditPage.vue` 中的 Markdown 渲染部分，直接将转换后的 HTML 字符串挂载至 `v-html="renderedContent"`。
   - **建议**：用户的输入转为 HTML 显示存在巨大的跨站脚本攻击 (XSS) 风险。建议引入 `DOMPurify` 库，在将内容传入 `v-html` 之前先进行清洗，剔除恶意 `<script>` 或事件标签。

### 2.2 Markdown 解析器优化

- **现状**：`NoteEditPage.vue` 的 `renderMarkdown` 函数是用手写大量正则替换来实现解析。正则替换在遇到嵌套层级（如列表里包裹代码块或者引用）时非常容易出现解析崩溃的情况，难以维护并影响编辑体验。
- **建议**：摒弃手写的基于正则的 Markdown 解析，改用成熟且性能优越的 NPM 开源库（比如 `marked` 或 `markdown-it`）。若想进一步提升体验，可以直接接入成熟的 Markdown 编辑器组件，如 `md-editor-v3` 或 `mavon-editor`。

### 2.3 全局请求与错误处理 (Axios Interception)

- **现状**：每个页面的 API 请求在 Catch 回调里手动执行 `$q.notify` 推送错误信息 (例如 `CrudTable.vue` 第 338、434 行)。
- **建议**：在 `src/boot/axios.js` 中部署响应拦截器 (Response Interceptor)，在拦截器里统一处理错误，例如全局捕获 401 自动跳回登录页，全局捕获 5xx 显示服务器错误等。页面组件只需关注请求成功状态。这样可以极大减少重复的 `catch` 模板代码。

### 2.4 响应式 CSS 与 CSS Variables

- **现状**：`MainLayout.vue` 内部写了几十行的媒体查询 (`@media`) 限定了各种屏幕下的字体大小。
- **建议**：Quasar 提供 `Screen` 插件和一套完整的 responsive classes。可以合理借助 `q-mb-md` 、动态 `:class="$q.screen.lt.md ? 'text-body2' : 'text-body1'"` 或者注入 SCSS mixin 以及 CSS rem，而非在单文件里面写死具体的物理像素和范围查询。

### 2.6 Mock 数据持久化

- **现状**：如果没有采用 IndexedDB 或 localStorage 获取 Mock 数据，页面刷新将会导致表格新增和编辑的数据丢失。
- **建议**：可在 `mock.js` 中增加 `localStorage` 进行数据同步缓存的功能，使开发时的体验和真实应用完全一致，方便产品演示或本地快速迭代。

## 需求十：深色模式与主题切换

1. 支持深色和浅色的主题切换

## 需求十一：图表组件

1. 构建基础的图表组件
2. 在首页集成图表组件
3. 使用echarts

## 需求12：图片管理

1. 增加一个“图片资源管理”页面，用于支持拖拽上传图片、修改图片名称、图片分类管理等。
2. 图片默认上传到阿里云oss
3. 图片列表管理使用CrudTable组件
4. 实现上传图片到阿里云oss的方法： uploadToOSS
5. env配置oss 的参数已经完成，请移除 await simulateUpload(file, onProgress) 的方法，改为正式使用oss的sdk上传文件
