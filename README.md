# Gradpath · 你的美研申请工作台

面向申请美国硕士的学生，整理院校、项目、申请材料和文书。页面使用中文界面，申请记录保存在浏览器中。

- 53 份院校档案、2027 用户提供榜单及校徽。
- 2,090 个硕士项目与方向；其中 1,957 条有官方目录快照依据，目录仍在补全。
- 全美院校地图、项目筛选、分申请季管理与文书编辑。
- 自包含网页，构建后约 0.87 MB。

## 在线网站

部署成功后的地址：<https://joey-wang-ui.github.io/gradpath/>

仓库的 GitHub Actions 工作流会构建并发布 GitHub Pages。首次使用时，请到 **Settings → Pages → Source** 选择 **GitHub Actions**，再运行 **Deploy Gradpath to GitHub Pages**。实际部署状态以 Actions 结果和 Pages 设置页为准。

网页源代码与公开目录可以被查看。API 密钥和个人申请草稿不应提交到仓库。

## 开发

```bash
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
python3.12 scripts/build_frontend.py
.venv/bin/python scripts/serve_gradpath.py --host 127.0.0.1 --port 3000
```

`index.html`、`frontend/index.html` 和 `frontend/gradpath.html` 为自包含网页；原图与数据来源均保留。公开部署仅复制构建后的网页，不发布服务端文件。

## GPT 文书助手

GitHub Pages 提供静态网站，不能运行 Python 后端。当前可以查看 GPT 助手界面；真实模型回复需要另行部署配套服务并配置服务端密钥。**不要把 OpenAI API Key 写到网页、GitHub Pages 或工作流中。**

配套接口、模拟调用验证与数据说明见 [backend/README.md](backend/README.md) 和 [frontend/data/README.md](frontend/data/README.md)。

## 校验

```bash
.venv/bin/python -m pytest -q tests
```

程序 ID 与既有草稿、材料按申请季区分。目录依据不代表当季招生要求已核验；综合大学榜单来自用户提供的整理 PDF，未独立核验 U.S. News 官方榜单。
