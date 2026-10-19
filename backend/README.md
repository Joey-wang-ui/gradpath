# GPT 文书小助手

在仓库根目录安装并启动（Python 3.12）：

```bash
.venv/bin/python -m pip install -r requirements-dev.txt
python3.12 scripts/build_frontend.py
.venv/bin/python scripts/serve_gradpath.py --host 127.0.0.1 --port 8000
```

服务同时提供独立前端与同源的 `/api/assistant/status`、`/api/assistant/chat`。在真实部署中，由站点反向代理将 `/api/assistant/*` 转发至该服务；静态 HTML 预览无法单独调用 GPT。不需要 MySQL。

服务端变量：

- `GRADPATH_OPENAI_API_KEY`：OpenAI API 密钥，只在安全的环境设置或未跟踪的仓库根 `.env` 中配置。
- `GRADPATH_OPENAI_MODEL`：可选，默认 `gpt-4.1-mini`。模型必须对该 API 项目可用。

已存在的 `OPENAI_API_KEY` 也可复用。云环境配置保留 `OPENAI_` 前缀，新的绑定使用项目专属的 `GRADPATH_OPENAI_API_KEY`。OpenAI API 账户额度独立于 ChatGPT 订阅。

使用 Responses API，设置 `store=False`；服务不把学生文本写入日志、文件或数据库。OpenAI 自身的数据处理与保留规则仍适用，`store=False` 不代表零数据保留。只发送问题、最近对话、申请季及用户当次明确勾选的背景、当前文稿、最多 10 个项目/任务。浏览器对话仅驻留内存；关闭页面后不保留。文稿仍在浏览器保存，模型建议不会自动写回原稿。

错误、未配置、超时、请求过大及频率限制都有独立响应。接口只接受 JSON，拒绝浏览器跨站请求，限每来源 IP 每分钟 10 次、最多 4 个并发 GPT 请求。取消浏览器等待不保证取消已经发出的模型调用。静态文件只开放两个构建后的 HTML 入口，不开放仓库、数据目录或 `.env`。本服务用于当前开发接入；公网运营前应由部署层提供 HTTPS、用户鉴权、按账户配额与持久化限流。目前没有用户登录。

离线验证不调用付费 API：

```bash
.venv/bin/python -m pytest -q tests/test_assistant.py
```

测试通过官方 SDK 的模拟 HTTP transport 检查完整 Responses 请求与解析，并验证同源边界、错误隐藏和密钥缺失状态。真实 GPT 回复仍需要配置有效密钥与可用额度。
