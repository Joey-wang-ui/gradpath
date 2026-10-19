# 院校资料与 2027 排名

## 当前来源

`usnews-2027.json` 已按用户提供的 `USNews_2027_US_National_Universities_Top50.pdf` 逐行录入。该文件有 2 页、51 所学校，第 49 名有 3 所并列。所有学校、原名次、原表顺序及页码均保留，没有截断边界并列，也没有用历史名次补位。

文件第 2 页明确注明它是整理版，**并非 U.S. News 官方出版物**。因此排名状态为 `user-provided`，没有设为 `verified`；`verifiedAt` 为空。网站显示“用户提供 PDF · 未独立核验官网”，官方网址仅作为进一步核对的入口。

原始 PDF 和提取的文本保留在 `sources/`；JSON 记录 SHA-256、文件名、页数和导入日期。构建会验证文件校验和及完整名次，独立 HTML 内嵌该 PDF，来源面板可下载，无需额外网络请求。

## 学校档案

`schools.json` 共 53 份基础档案：51 所对应这份 PDF，另保留不在本份 PDF 内的普渡大学、佐治亚大学旧档案，避免已有收藏和申请记录丢失。默认“全部院校”只展示 PDF 的 51 所，“全部档案”可查看 53 所；其他旧档案不会继承 2027 名次。

补入维克森林大学、维拉诺瓦大学、凯斯西储大学。院校英文名称、UNITID、城市、州、学校性质和官网入口来自 NCES IPEDS HD2023，并保留固定 GitHub 镜像提交与原始来源。中文译名及视觉缩写由项目整理。PDF 中的中英文原名另外保留，便于逐行追溯。

先前 6 个项目及日期仍为明确标注的演示内容，其余学校没有杜撰硕士项目、申请截止日期、费用或成绩要求。综合大学排名不等于硕士专业排名。

## 展示与并列规则

首页不再陈列学校榜单，排名与来源保留在院校资料库。文件第 9 名有 3 所并列，所以按名次范围筛选“Top 10”会得到 **11 所**；完整名单中始终保留全部 51 所。

排序器先比较名次，再保留原文件顺序。无法验证来源、错误年份、非完整名次、重复学校、校验和不匹配都会阻止构建。

## 更新与官网核验

如后续独立核验官网，保留用户 PDF 的原始溯源，再提供真实的 U.S. News 2027 / National Universities HTTPS 来源、标题和核验日期，才可设为 `verified`。不要仅凭文件名将用户整理版升级为官网核验状态。

在仓库根目录运行 `python3.12 scripts/build_frontend.py`，生成 `frontend/index.html` 和 `frontend/gradpath.html`，两者均是独立 HTML。


## 学院与硕士项目目录

范围为全部硕士学位，不收录单独的博士或证书。当前覆盖 53 份院校档案，收录 2,090 个硕士项目与方向，其中 1,957 条按保留的官方目录 HTML 整理，分布于 20 所院校。条目数包含不同学位、专业方向和有条件的联合路径，并不等于独立申请项目数；目前不宣称已穷尽任一学校的全部硕士目录。

`programs.json` 保留全局 `status=reference`、`verifiedAt=null`。有快照的条目记录 `sourceEvidence`（原始 HTML、URL、SHA-256）和 `catalogueReviewedAt`，仅表示名称与学位的目录依据；不表示当季招生资格、截止日期、费用或网址可达性已完整核验。其余人工参考条目仍待逐页核对。未归类学院的项目放入明确标注的目录分组，不能把该分组算作真实学院。

`sources/catalogues/coverage-report.json` 逐校记录已收录量、有目录依据的条目数、仅参考条目、来源 URL、空的官方总量与 `completeCatalogueReviewed=false`。没有把 404、反爬页面、只有导航的目录或零候选误当成不存在硕士项目。抓取记录和候选条目都不会自动公开。

复现与补充流程：

```bash
# 所有目录 URL 必须位于所属大学 HTTPS 域名；输出只作候选。
python3.12 scripts/collect_programs.py --school mit --max-pages 1
# 按 manifest 捕获小批官方索引页，保留完整 HTML 与校验值。
.venv/bin/python scripts/fetch_catalogue_indexes.py manifest.json
# 根据已检查的站点结构，导入带有明确硕士学位标签的条目。
.venv/bin/python scripts/import_catalogue_indexes.py
# 单条或单批人工复核的记录也可以通过证据边界导入。
python3.12 scripts/import_reviewed_programs.py review.json
python3.12 scripts/build_frontend.py
```

批量学院/项目采集应先核对官方 robots.txt 和目录的实际分页，不通过猜测学科名生成硕士清单。`--from-reference` 只用于从保留的最早 160 条参考目录重建整批来源，日常增量导入不要使用，以免舍弃后加的人工记录。导入器保留既有 ID，拒绝跨校域名、坏校验值、来源文本不支持的名称和未经检查的招生字段。显式核对后可修正学院归属，仍沿用原 ID；不同校区/授课形式保留不同身份。

项目 ID 用于区分同校不同学位、学院及校区，并与申请季一起隔离材料、状态、草稿与版本。旧校级申请和旧草稿不重新分配到另一专业。

## 全美院校地图

学校主校区坐标来自 IPEDS HD2023 的 LATITUDE / LONGITUD，逐校按 UNITID 对应，包含全部 53 份档案。州界为固定提交的 PublicaMundi GeoJSON，保留在 `sources/us-states.geojson`，来源与校验值见 `map-source.json`。构建为离线 SVG（50 州及华盛顿特区），无需地图服务密钥或瓦片网络请求；阿拉斯加与夏威夷使用插图位置。

地图位置不是每个项目的实际授课地址，也不是最新校区位置保证。页面明确标注历史主校区数据，项目地点需另查官网。
