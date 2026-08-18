# dsh-task-board-model

这是 DSH Web GUI 任务看板的本地 fork，增加了**按任务选择模型与推理力度**的能力，同时保留原有看板、持久化、定时任务和真实会话执行功能。

## 新增能力

- 新建任务和任务详情都可以选择 provider/model；留空则使用运行时默认。
- 如果模型提供 reasoning 元数据，可以选择对应的推理力度。
- 选择结果沿用现有 `dsh.taskBoard.v1` localStorage 台账持久化。
- 模型和推理力度选项来自实时 `llm.models` catalog，不硬编码 provider/model 名称。
- 带模型 pin 的任务使用专用空白会话，在权限命令和 Prompt 之前调用 `sessions.selectModel`；未 pin 模型的任务仍沿用原来的空白会话复用路径。
- 工作区、agent 预设、权限、cron、归档、执行记录等原有功能不变。

### 重要的 DSH API 限制

当前 DSH 的 `sessions.selectModel` 成功后也会保存部署默认模型。专用会话能避免多个任务争抢复用的空白会话，但不能让模型选择对部署默认完全隔离。因此本插件明确披露这个行为，而不是假装 task pin 已经是全局无副作用的。未来若 DSH 提供类似 `persistDefault: false` 的参数，才能去掉这个限制。

## 构建与测试

```sh
cd /home/ubuntu/debug/dsh-task-board-model
pnpm install
pnpm run typecheck
pnpm test
pnpm run build
```

`build` 生成 host bundle `lib/index.js`、DSH lazy-CJS 浏览器 bundle `lib/client.js`，以及 `lib/types/` 下的声明文件。CSS 会嵌入浏览器 bundle，因为 DSH client module loader 需要自注册 bundle。

## 安装到 DSH Web

先构建，再链接到 web profile：

```sh
cd /home/ubuntu/debug/dsh-task-board-model
pnpm install
pnpm run build
dsh plugin --profile web add link:/home/ubuntu/debug/dsh-task-board-model
```

插件 patch 会自动禁用原来的 `web-ui-task-board` 聚合行（如果存在独立安装，也会禁用 `ui-task-board`），再插入 `ui-task-board-model`，避免两个看板争用同一套 DOM。请重启现有的 `dsh web` 进程；仅刷新浏览器无法加载新的 host/client 插件组合。重启后在 `http://127.0.0.1:3080` 刷新并检查侧边栏。

卸载：

```sh
dsh plugin --profile web remove dsh-task-board-model
```

卸载不会删除任务台账；如需清空，在浏览器控制台执行：

```js
localStorage.removeItem('dsh.taskBoard.v1')
```

## 主要文件

- `src/core/tasks.ts`：任务记录与模型选择归一化。
- `src/core/store.ts`：localStorage 校验与兼容修复。
- `src/core/execution.ts`：专用会话、模型应用及 Prompt 顺序。
- `src/core/controller.ts`：工作区、预设、模型选项快照。
- `src/client/board/NewTaskModal.tsx`、`TaskDetail.tsx`：模型/推理力度选择器。
- `src/client/index.ts`：DSH runtime 与模型 catalog 接线。
- `cordis.patch.yml`：profile bundle 替换行。

## 已完成验证

- `pnpm test`：8 个回归测试通过，包含运行时语言选择测试。
- `pnpm run typecheck`：通过。
- `pnpm run build`：host 与 lazy browser bundle 均通过。
- 用假的 `window.__ModuleLoader__.load` 加载构建出的浏览器 bundle，成功注册并导出 `apply`/`inject`。
- 临时执行 `dsh plugin --profile web add link:...` 并运行 `dsh --profile web --dump-config`，确认原 aggregate 行被禁用且插入了 `ui-task-board-model`；随后已移除临时 profile 链接。

## 许可证

BSD 3-Clause，继承自原始 task-board 包。
