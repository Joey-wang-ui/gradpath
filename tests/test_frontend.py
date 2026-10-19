"""Browser checks for the prototype's saved student workflows, using isolated contexts."""

from functools import partial
from html import escape
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import hashlib
import re
import shutil
from threading import Thread

from playwright.sync_api import expect, sync_playwright
import pytest


@pytest.fixture(scope="module")
def site():
    frontend = Path(__file__).resolve().parents[1] / "frontend"
    handler = partial(SimpleHTTPRequestHandler, directory=str(frontend))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{server.server_port}"
    server.shutdown()
    thread.join()
    server.server_close()


@pytest.fixture()
def page(site):
    with sync_playwright() as playwright:
        # Reuse system Chromium in cloud; otherwise use Playwright's managed browser.
        browser = playwright.chromium.launch(executable_path=shutil.which("chromium"))
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(site)
        yield page
        browser.close()
        assert not errors


def navigate(page, name, heading):
    if name == 'schools':
        trigger = page.locator('[data-nav="schools"]')
        if trigger.get_attribute('aria-expanded') != 'true':
            trigger.click()
        page.get_by_role('link', name='院校主页', exact=True).click()
    else:
        page.locator(f'[data-nav="{name}"]').click()
    page.get_by_role("heading", name=heading, exact=True).wait_for()


def test_project_filter_and_saved_application(page):
    navigate(page, "schools", "寻找属于你的下一站")
    page.get_by_role("button", name="Top 10", exact=True).click()
    assert page.locator(".school-card").count() == 11
    assert page.locator(".school-card .rank-badge").all_text_contents().count("#9 并列") == 3
    page.get_by_role("button", name="全部院校", exact=True).click()
    assert page.locator(".school-card").count() == 51
    search = page.get_by_role("textbox", name="搜索学校、专业或城市")
    search.fill("波士顿大学")
    assert page.locator(".school-card").count() == 1
    page.get_by_role("button", name="收藏波士顿大学", exact=True).click()
    page.reload()
    assert page.locator("#application-count").inner_text() == "5"
    navigate(page, "applications", "让每一份申请，都有条不紊")
    page.get_by_role("combobox", name="波士顿大学申请状态").select_option("已提交")
    page.reload()
    assert page.get_by_role("combobox", name="波士顿大学申请状态").input_value() == "已提交"


def test_document_persistence_export_and_task_progress(page):
    navigate(page, "applications", "让每一份申请，都有条不紊")
    page.get_by_role("button", name="完成：完成个人陈述的第一版提纲", exact=True).click()
    navigate(page, "overview", "GradPath · 留学申请工作台")
    assert "50" in page.locator(".stat-value").nth(2).inner_text()
    navigate(page, "documents", "写下你的申请故事")
    content = "A real research experience. 真实经历。"
    page.get_by_role("textbox", name="Statement of Purpose编辑器").fill(content)
    page.reload()
    assert page.get_by_role("textbox", name="Statement of Purpose编辑器").input_value() == content
    with page.expect_download() as download:
        page.get_by_role("button", name="导出文稿").click()
    assert Path(download.value.path()).read_text(encoding="utf-8") == content


def test_profile_is_rendered_as_text_and_assistant_discloses_demo(page):
    navigate(page, "profile", "从认识自己开始")
    page.get_by_role("textbox", name="怎么称呼你").fill("<Test Student>")
    page.get_by_role("button", name="保存我的档案").click()
    assert page.locator("#account-name").inner_text() == "<Test Student>"
    assert page.locator("#account-name test").count() == 0
    navigate(page, "overview", "GradPath · 留学申请工作台")
    page.get_by_role("button", name="帮我安排本周的申请任务").click()
    page.get_by_role("button", name="本地写作提示").click()
    page.get_by_text("交互演示 · 以下为本地规则回复，尚未连接 AI。").wait_for()
    page.keyboard.press("Escape")
    assert page.get_by_role("dialog").count() == 0


@pytest.mark.parametrize("route,title", [
    ("overview", "GradPath · 留学申请工作台"),
    ("schools", "寻找属于你的下一站"),
    ("applications", "让每一份申请，都有条不紊"),
    ("documents", "写下你的申请故事"),
    ("profile", "从认识自己开始"),
])
def test_mobile_pages_fit_viewport(page, route, title):
    page.set_viewport_size({"width": 390, "height": 844})
    navigate(page, route, title)
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")


@pytest.mark.parametrize("width", [1440, 390])
def test_single_file_preview_without_network_or_storage(page, width):
    """Preview hosts can serve one HTML document in an opaque-origin sandbox."""
    source = Path(__file__).resolve().parents[1] / "frontend" / "index.html"
    requests = []
    page.route("**/*", lambda route: (requests.append(route.request.url), route.abort()))
    page.set_viewport_size({"width": width, "height": 1000})
    page.set_content(
        '<style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%}</style>'
        f'<iframe title="独立预览" sandbox="allow-scripts allow-downloads" '
        f'srcdoc="{escape(source.read_text(encoding="utf-8"), quote=True)}"></iframe>'
    )
    preview = page.frame_locator("iframe")
    preview.get_by_role("heading", name="GradPath · 留学申请工作台", exact=True).wait_for()
    assert preview.locator(".sidebar").evaluate("el => getComputedStyle(el).position") == "fixed"
    assert preview.locator(".hero").evaluate("el => getComputedStyle(el).display") == "flex"
    preview.locator('[data-nav="schools"]').click()
    preview.get_by_role('link', name='院校主页', exact=True).click()
    preview.get_by_role("heading", name="寻找属于你的下一站", exact=True).wait_for()
    preview.get_by_role("button", name="Top 10", exact=True).click()
    assert preview.locator(".school-card").count() == 11
    preview.get_by_role("button", name="了解麻省理工学院", exact=True).click()
    program_dialog = preview.get_by_role("dialog", name="麻省理工学院", exact=True)
    expect(program_dialog.locator(".degree-card")).to_have_count(24)
    program_dialog.locator('[data-program="mit--business-analytics"] [data-action="program-add"]').click()
    preview.get_by_role("button", name="关闭对话框", exact=True).click()
    preview.locator('[data-nav="documents"]').click()
    preview.locator('[data-nav="programs"]').click()
    preview.get_by_role("textbox", name="搜索跨校专业").fill("Computer Science")
    expect(preview.locator(".cross-program-card")).to_have_count(24)
    preview.locator('[data-nav="documents"]').click()
    preview.get_by_role("textbox", name="Statement of Purpose编辑器").fill("预览中的文稿")
    assert preview.locator("#save-status").inner_text() == "未保存，请导出备份"
    assert not requests


def test_project_comparison_shows_selected_programs(page):
    navigate(page, "schools", "寻找属于你的下一站")
    page.get_by_role("button", name="对比斯坦福大学", exact=True).click()
    page.get_by_role("button", name="对比哥伦比亚大学", exact=True).click()
    page.get_by_role("button", name="对比项目", exact=True).click()
    comparison = page.get_by_role("dialog", name="项目对比", exact=True)
    expect(comparison.get_by_text("斯坦福大学", exact=True)).to_be_visible()
    expect(comparison.get_by_text("哥伦比亚大学", exact=True)).to_be_visible()
    expect(comparison.get_by_text("MS · Computer Science", exact=True)).to_be_visible()
    expect(comparison.get_by_text("MS · Data Science", exact=True)).to_be_visible()
    page.keyboard.press("Escape")
    expect(page.get_by_role("dialog")).to_have_count(0)


def test_completed_task_can_be_undone_and_progress_restored(page):
    navigate(page, "applications", "让每一份申请，都有条不紊")
    task = page.get_by_role("button", name="完成：完成个人陈述的第一版提纲", exact=True)
    task.click()
    expect(task).to_have_count(0)
    expect(page.locator(".summary-chip").nth(1)).to_contain_text("50")
    page.get_by_role("button", name="撤销", exact=True).click()
    expect(task).to_be_visible()
    expect(page.locator(".summary-chip").nth(1)).to_contain_text("25")
    page.reload()
    expect(task).to_be_visible()
    expect(page.locator(".summary-chip").nth(1)).to_contain_text("25")


def test_custom_task_is_saved_across_reload(page):
    navigate(page, "applications", "让每一份申请，都有条不紊")
    title = "核对目标项目的推荐信截止时间"
    page.get_by_role("button", name="添加待办", exact=True).click()
    page.get_by_role("textbox", name="待办内容", exact=True).fill(title)
    page.get_by_role("button", name="创建待办", exact=True).click()
    task = page.get_by_role("button", name=f"完成：{title}", exact=True)
    expect(task).to_be_visible()
    page.reload()
    expect(task).to_be_visible()
    task.click()
    page.get_by_role("button", name="已完成", exact=True).click()
    expect(page.get_by_role("button", name=f"撤销完成：{title}", exact=True)).to_be_visible()


def test_document_focus_and_saved_version_restore(page):
    navigate(page, "documents", "写下你的申请故事")
    page.get_by_role("button", name="专注写作", exact=True).click()
    expect(page.locator("body")).to_have_class(re.compile(r"\bfocus-mode\b"))
    page.get_by_role("button", name="退出专注", exact=True).click()
    expect(page.locator("body")).not_to_have_class(re.compile(r"\bfocus-mode\b"))
    editor = page.get_by_role("textbox", name="Statement of Purpose编辑器")
    saved_draft = "My first research project taught me to test each hypothesis."
    editor.fill(saved_draft)
    page.get_by_role("button", name="保存版本", exact=True).click()
    editor.fill("An unfinished revision that I want to undo.")
    page.get_by_role("button", name="查看历史版本", exact=True).click()
    history = page.get_by_role("dialog", name="文书版本", exact=True)
    expect(history).to_contain_text(saved_draft)
    history.get_by_role("button", name="恢复此版本", exact=True).first.click()
    expect(editor).to_have_value(saved_draft)
    page.reload()
    expect(editor).to_have_value(saved_draft)


def test_global_search_opens_matching_project(page):
    page.get_by_role("button", name="搜索工作台", exact=True).click()
    search_dialog = page.get_by_role("dialog")
    search_dialog.get_by_role("textbox", name="搜索页面或项目", exact=True).fill("纽约")
    search_dialog.get_by_text("纽约大学", exact=True).click()
    details = page.get_by_role("dialog", name="纽约大学", exact=True)
    expect(details).to_contain_text("New York University")
    expect(details).to_contain_text("MS · Computer Science")


def test_uploaded_pdf_directory_preserves_source_order_and_retains_download(page):
    navigate(page, "schools", "寻找属于你的下一站")
    showcase = page.locator(".library-grid")
    expect(showcase.locator(".school-card")).to_have_count(51)
    assert showcase.locator(".school-card h3").all_text_contents()[:10] == [
        "麻省理工学院", "普林斯顿大学", "哈佛大学", "耶鲁大学", "加州理工学院",
        "斯坦福大学", "宾夕法尼亚大学", "杜克大学", "约翰斯·霍普金斯大学", "西北大学",
    ]
    assert showcase.locator(".rank-badge").all_text_contents()[:10] == [
        "#1", "#2", "#3", "#4", "#5 并列", "#5 并列", "#7", "#8", "#9 并列", "#9 并列",
    ]
    page.locator('[data-action="ranking-source"]').click()
    dialog = page.get_by_role("dialog")
    expect(dialog).to_contain_text("用户提供 PDF")
    expect(dialog).to_contain_text("并非 U.S. News 官方出版物")
    expect(dialog).to_contain_text("尚未独立核验官网")
    with page.expect_download() as download:
        dialog.get_by_role("button", name="下载来源 PDF", exact=True).click()
    manifest = json.loads((Path(__file__).resolve().parents[1] / "frontend/data/usnews-2027.json").read_text())
    assert hashlib.sha256(Path(download.value.path()).read_bytes()).hexdigest() == manifest["source"]["sha256"]


def test_school_directory_control_filter_and_unknown_deadline(page):
    navigate(page, "schools", "寻找属于你的下一站")
    page.get_by_role("combobox", name="院校性质").select_option("公立")
    assert 0 < page.locator(".school-card").count() < 51
    assert all("公立大学" in item for item in page.locator(".school-program").all_text_contents())
    page.get_by_role("combobox", name="院校性质").select_option("all")
    page.get_by_role("textbox", name="搜索学校、专业或城市").fill("普林斯顿")
    assert page.locator(".school-card").count() == 1
    page.get_by_role("button", name="了解普林斯顿大学", exact=True).click()
    dialog = page.get_by_role("dialog", name="普林斯顿大学")
    expect(dialog).to_contain_text("#2")
    expect(dialog).to_contain_text("用户提供 PDF 第 1 页")
    expect(dialog).to_contain_text("IPEDS HD2023")
    assert "null" not in dialog.inner_text()


def test_verified_catalog_preserves_tied_positions_in_directory(page):
    """Synthetic ranks exercise the UI only, without modifying any shipped data."""
    from scripts.school_catalog import load_catalog

    catalog = load_catalog()
    catalog["ranking"].update(status="verified", sourceTitle="2027 UI test fixture", verifiedAt="2026-10-19")
    for index, school in enumerate(catalog["schools"], start=1):
        rank = 2 if index == 3 else index
        school.update(rankNumber=rank, rank=f"#{rank}" + (" 并列" if rank == 2 else ""))
    source = Path(__file__).resolve().parents[1] / "frontend" / "gradpath-full.html"
    markup = source.read_text(encoding="utf-8")
    start = markup.index("const SchoolCatalog = ")
    end = markup.index("\n", start)
    fixture = "const SchoolCatalog = " + json.dumps(catalog) + ";"
    page.set_content(markup[:start] + fixture + markup[end:])
    navigate(page, "schools", "寻找属于你的下一站")
    showcase = page.locator(".library-grid")
    expect(showcase.locator(".school-card")).to_have_count(53)
    labels = showcase.locator(".rank-badge").all_text_contents()[:10]
    assert labels == ["#1", "#2 并列", "#2 并列", "#4", "#5", "#6", "#7", "#8", "#9", "#10"]


def test_status_opens_project_workspace_and_keeps_drafts_separate(page):
    navigate(page, "applications", "让每一份申请，都有条不紊")
    page.get_by_role("combobox", name="斯坦福大学申请状态").select_option("文书撰写")
    expect(page.locator(".document-project-context")).to_contain_text("斯坦福大学")
    editor = page.get_by_role("textbox", name="Statement of Purpose编辑器")
    editor.fill("Stanford-specific draft with my own research experience.")
    page.reload()
    expect(editor).to_have_value("Stanford-specific draft with my own research experience.")
    page.get_by_role("button", name="返回项目申请 ↗").click()
    expect(page.get_by_role("dialog", name="斯坦福大学 · 申请详情")).to_be_visible()
    page.keyboard.press("Escape")
    navigate(page, "applications", "让每一份申请，都有条不紊")
    page.get_by_role("button", name="打开哥伦比亚大学当前阶段").click()
    expect(page.locator(".document-project-context")).to_contain_text("哥伦比亚大学")
    expect(editor).not_to_have_value("Stanford-specific draft with my own research experience.")


def test_application_details_checklist_and_tracking_persist(page):
    navigate(page, "applications", "让每一份申请，都有条不紊")
    page.get_by_role("button", name="打开纽约大学当前阶段").click()
    dialog = page.get_by_role("dialog", name="纽约大学 · 申请详情")
    dialog.get_by_role("checkbox", name="成绩单与学位材料", exact=True).check()
    expect(dialog.locator("#material-count")).to_have_text("1")
    page.reload()
    page.get_by_role("button", name="打开纽约大学当前阶段").click()
    expect(dialog.get_by_role("checkbox", name="成绩单与学位材料", exact=True)).to_be_checked()
    dialog.get_by_role("tab", name="项目详情").click()
    dialog.get_by_role("textbox", name="申请项目", exact=True).fill("MS in Human-Computer Interaction")
    dialog.get_by_role("textbox", name="项目申请入口", exact=True).fill("https://www.nyu.edu/admissions.html")
    dialog.get_by_role("button", name="保存项目资料").click()
    page.keyboard.press("Escape")
    page.reload()
    expect(page.locator(".application-table")).to_contain_text("MS in Human-Computer Interaction")
    page.get_by_role("button", name="查看斯坦福大学申请详情", exact=True).click()
    other = page.get_by_role("dialog", name="斯坦福大学 · 申请详情")
    other.get_by_role("tab", name="材料清单").click()
    expect(other.get_by_role("checkbox", name="成绩单与学位材料", exact=True)).not_to_be_checked()
    page.keyboard.press("Escape")
    page.get_by_role("combobox", name="纽约大学申请状态").select_option("已提交")
    dialog.get_by_role("combobox", name="结果记录").select_option("面试邀请")
    dialog.get_by_role("button", name="保存跟踪记录").click()
    page.reload()
    page.get_by_role("button", name="打开纽约大学当前阶段").click()
    expect(dialog.get_by_role("combobox", name="结果记录")).to_have_value("面试邀请")


def test_real_crests_public_contact_and_account_placeholder(page):
    navigate(page, "schools", "寻找属于你的下一站")
    images = page.locator(".library-grid img.school-crest")
    assert images.count() == 51
    assert images.evaluate_all("imgs => imgs.every(img => img.complete && img.naturalWidth > 0 && /^data:image\/(png|webp);base64,/.test(img.src))")
    page.get_by_role("button", name="联系作者", exact=True).click()
    dialog = page.get_by_role("dialog", name="联系作者")
    expect(dialog.locator('a[href="mailto:18906814376@163.com"]')).to_be_visible()
    expect(dialog.locator('a[href="https://github.com/Joey-wang-ui"]')).to_be_visible()
    page.keyboard.press("Escape")
    page.get_by_role("button", name="账户与登录").click()
    expect(page.get_by_role("dialog")).to_contain_text("登录功能，正在准备中")
    assert page.get_by_role("dialog").locator('input').count() == 0
    page.get_by_role("button", name="继续我的申请").click()
    expect(page.get_by_role("dialog")).to_have_count(0)


def test_profile_save_reveals_direction_suggestions_and_filters(page):
    navigate(page, "profile", "从认识自己开始")
    expect(page.get_by_role("region", name="选校建议")).to_have_count(0)
    page.get_by_role("textbox", name="目标专业", exact=True).fill("Computer Science")
    page.get_by_role("textbox", name="GPA / 成绩体系", exact=True).fill("3.7 / 4.0")
    page.get_by_role("textbox", name="总预算", exact=True).fill("50万元")
    page.get_by_role("button", name="保存我的档案", exact=True).click()
    section = page.get_by_role("region", name="选校建议")
    expect(section).to_be_visible()
    expect(section.locator("#shortlist-title")).to_be_focused()
    expect(section.locator(".recommendation-card")).to_have_count(6)
    expect(section).to_contain_text("计算机与数据")
    expect(section).to_contain_text("尚未参与适配判断")
    section.get_by_role("button", name="加入卡内基梅隆大学申请", exact=True).click()
    expect(section.get_by_role("button", name="移除卡内基梅隆大学申请", exact=True)).to_have_attribute("aria-pressed", "true")
    section.get_by_role("combobox", name="建议学校性质").select_option("公立")
    section.get_by_role("combobox", name="建议排名范围").select_option("50")
    assert section.locator(".recommendation-card").count() > 0
    assert all("公立大学" in value for value in section.locator(".recommendation-meta").all_text_contents())
    assert all(int(value.split()[0].lstrip("#")) > 30 for value in section.locator(".rank-badge").all_text_contents())
    page.reload()
    expect(section.get_by_role("combobox", name="建议学校性质")).to_have_value("公立")
    navigate(page, "applications", "让每一份申请，都有条不紊")
    expect(page.get_by_role("button", name="查看卡内基梅隆大学申请详情", exact=True)).to_be_visible()


def test_shortlist_missing_major_and_mobile_layout(page):
    page.set_viewport_size({"width": 390, "height": 844})
    navigate(page, "profile", "从认识自己开始")
    page.get_by_role("button", name="保存我的档案", exact=True).click()
    section = page.get_by_role("region", name="选校建议")
    expect(section).to_contain_text("先告诉我们，你想读什么")
    expect(section.locator(".recommendation-card")).to_have_count(0)
    section.get_by_role("button", name="补充目标专业").click()
    expect(page.get_by_role("textbox", name="目标专业", exact=True)).to_be_focused()
    page.get_by_role("textbox", name="目标专业", exact=True).fill("教育")
    page.get_by_role("button", name="保存我的档案", exact=True).click()
    expect(section).to_contain_text("教育与社会科学")
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
    page.locator('.season-mobile-button').click()
    expect(page.get_by_role("dialog", name="选择你的申请季")).to_be_visible()
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")


def test_seasons_keep_application_lists_and_drafts_separate(page):
    navigate(page, "applications", "让每一份申请，都有条不紊")
    page.get_by_role("combobox", name="斯坦福大学申请状态").select_option("文书撰写")
    editor = page.get_by_role("textbox", name="Statement of Purpose编辑器")
    editor.fill("A draft belonging only to Fall 2027.")
    page.locator('.workspace-select').click()
    page.get_by_role("button", name=re.compile(r"28 2028 Fall")).click()
    expect(page.locator("#application-count")).to_have_text("0")
    navigate(page, "documents", "写下你的申请故事")
    expect(editor).not_to_have_value("A draft belonging only to Fall 2027.")
    editor.fill("A different draft belonging to Fall 2028.")
    page.reload()
    expect(editor).to_have_value("A different draft belonging to Fall 2028.")
    page.locator('.workspace-select').click()
    page.get_by_role("button", name=re.compile(r"27 2027 Fall")).click()
    expect(page.locator("#application-count")).to_have_text("4")
    navigate(page, "documents", "写下你的申请故事")
    expect(editor).to_have_value("A draft belonging only to Fall 2027.")
    expect(page.locator(".document-project-context")).to_contain_text("斯坦福大学")


def test_historical_review_and_custom_season_persist(page):
    page.locator('.workspace-select').click()
    page.get_by_role("button", name=re.compile(r"26 2026 Fall")).click()
    review = page.get_by_role("region", name="申请季复盘")
    review.get_by_role("textbox", name="最终去向", exact=True).fill("我的新起点")
    review.get_by_role("textbox", name="我的申请总结", exact=True).fill("提前联系推荐人，给文书修改留出时间。")
    review.get_by_role("button", name="保存这段申请经历").click()
    page.reload()
    expect(review.get_by_role("textbox", name="我的申请总结", exact=True)).to_have_value("提前联系推荐人，给文书修改留出时间。")
    page.locator('.workspace-select').click()
    page.get_by_role("spinbutton", name="其他入学年份").fill("2025")
    page.get_by_role("button", name="打开这个申请季").click()
    expect(page.locator('.workspace-select')).to_contain_text("2025 FALL")
    expect(review.get_by_role("textbox", name="我的申请总结", exact=True)).to_be_empty()
    navigate(page, "schools", "寻找属于你的下一站")
    expect(page.locator('.ranking-source-strip')).to_contain_text("2027")
    page.locator('.workspace-select').click()
    page.get_by_role("button", name=re.compile(r"26 2026 Fall")).click()
    expect(review.get_by_role("textbox", name="最终去向", exact=True)).to_have_value("我的新起点")


def open_program_browser(page, school_name):
    navigate(page, 'schools', '寻找属于你的下一站')
    page.get_by_role('button', name=f'了解{school_name}', exact=True).click()
    return page.get_by_role('dialog', name=school_name, exact=True)


def test_college_filter_degree_search_and_restricted_route(page):
    dialog = open_program_browser(page, '哥伦比亚大学')
    expect(dialog.locator('.degree-card')).to_have_count(4)
    dialog.locator('[data-college="columbia-unit-1"]').click()
    expect(dialog.locator('.degree-card')).to_have_count(2)
    dialog.get_by_role('textbox', name='搜索本校硕士项目').fill('Not a real matching programme')
    expect(dialog.locator('.degree-card')).to_have_count(0)
    dialog.get_by_role('button', name='重置筛选').click()
    expect(dialog.locator('.degree-card')).to_have_count(4)
    dialog.get_by_role('textbox', name='搜索本校硕士项目').fill('Data Science')
    expect(dialog.locator('.degree-card')).to_have_count(1)
    dialog.locator('.degree-title').click()
    detail = page.get_by_role('dialog', name='数据科学硕士', exact=True)
    expect(detail).to_contain_text('数据科学研究所（跨学院）')
    expect(detail.get_by_role('link', name='项目官网 ↗', exact=True)).to_have_attribute('href', 'https://datascience.columbia.edu/education/programs/m-s-in-data-science/')
    detail.get_by_role('button', name='← 哥伦比亚大学 · 学院与项目').click()
    expect(dialog.get_by_role('textbox', name='搜索本校硕士项目')).to_have_value('Data Science')
    expect(dialog.locator('.degree-card')).to_have_count(1)
    page.keyboard.press('Escape')
    dialog = open_program_browser(page, '加州理工学院')
    expect(dialog.locator('.degree-card')).to_have_count(3)
    expect(dialog.locator('[data-action="program-add"]')).to_have_count(0)
    assert dialog.get_by_role('link', name='先核对招生路径 ↗', exact=True).count() == 3


def test_same_university_degrees_keep_separate_drafts_materials_and_seasons(page):
    dialog = open_program_browser(page, '纽约大学')
    for pid in ['nyu--courant-computer-science', 'nyu--tandon-computer-science']:
        dialog.locator(f'[data-program="{pid}"] [data-action="program-add"]').click()
    page.keyboard.press('Escape')
    expect(page.locator('#application-count')).to_have_text('5')
    navigate(page, 'applications', '让每一份申请，都有条不紊')
    page.get_by_role('combobox', name='纽约大学 计算机科学硕士（柯朗）申请状态', exact=True).select_option('文书撰写')
    editor = page.get_by_role('textbox', name='Statement of Purpose编辑器')
    editor.fill('My Courant draft: numerical research and mathematical foundations.')
    page.get_by_role('button', name='返回项目申请 ↗').click()
    dialog = page.get_by_role('dialog', name='纽约大学 · 计算机科学硕士（柯朗） · 申请详情', exact=True)
    dialog.get_by_role('tab', name='材料清单').click()
    dialog.get_by_role('checkbox', name='成绩单与学位材料', exact=True).check()
    page.keyboard.press('Escape')
    navigate(page, 'applications', '让每一份申请，都有条不紊')
    page.get_by_role('combobox', name='纽约大学 计算机科学硕士（坦登）申请状态', exact=True).select_option('文书撰写')
    expect(editor).not_to_have_value('My Courant draft: numerical research and mathematical foundations.')
    expect(page.locator('.document-project-context')).to_contain_text('坦登工程学院')
    editor.fill('My Tandon draft: engineering practice and systems design.')
    page.reload()
    expect(editor).to_have_value('My Tandon draft: engineering practice and systems design.')
    page.get_by_role('button', name='返回项目申请 ↗').click()
    other = page.get_by_role('dialog', name='纽约大学 · 计算机科学硕士（坦登） · 申请详情', exact=True)
    other.get_by_role('tab', name='材料清单').click()
    expect(other.get_by_role('checkbox', name='成绩单与学位材料', exact=True)).not_to_be_checked()
    page.keyboard.press('Escape')
    page.locator('.workspace-select').click()
    page.get_by_role('button', name=re.compile(r'28 2028 Fall')).click()
    expect(page.locator('#application-count')).to_have_text('0')
    page.locator('.workspace-select').click()
    page.get_by_role('button', name=re.compile(r'27 2027 Fall')).click()
    expect(page.locator('#application-count')).to_have_text('5')
    navigate(page, 'documents', '写下你的申请故事')
    expect(editor).to_have_value('My Tandon draft: engineering practice and systems design.')
    page.locator('[data-action="select-doc"][data-id="sop-nyu--courant-computer-science"]').click()
    expect(editor).to_have_value('My Courant draft: numerical research and mathematical foundations.')
    page.get_by_role('button', name='返回项目申请 ↗').click()
    page.get_by_role('dialog').get_by_role('tab', name='材料清单').click()
    expect(page.get_by_role('dialog').get_by_role('checkbox', name='成绩单与学位材料', exact=True)).to_be_checked()


def test_new_degree_preserves_legacy_draft_and_can_be_removed_with_undo(page):
    navigate(page, 'applications', '让每一份申请，都有条不紊')
    page.get_by_role('combobox', name='斯坦福大学申请状态', exact=True).select_option('文书撰写')
    editor = page.get_by_role('textbox', name='Statement of Purpose编辑器')
    editor.fill('An existing student draft from before the programme directory.')
    dialog = open_program_browser(page, '斯坦福大学')
    add = dialog.locator('[data-program="stanford--management-science"] [data-action="program-add"]')
    add.click()
    add.click()
    project = page.get_by_role('dialog', name='斯坦福大学 · 管理科学与工程硕士 · 申请详情', exact=True)
    project.get_by_role('button', name='打开项目文书').click()
    expect(editor).not_to_have_value('An existing student draft from before the programme directory.')
    editor.fill('A new MS&E statement, separate from the prior application.')
    page.get_by_role('button', name='返回项目申请 ↗').click()
    page.get_by_role('button', name='移出此项目', exact=True).click()
    expect(page.locator('#application-count')).to_have_text('4')
    page.get_by_role('button', name='撤销', exact=True).click()
    expect(page.locator('#application-count')).to_have_text('5')
    page.reload()
    page.locator('[data-action="select-doc"][data-id="sop-stanford"]').click()
    expect(editor).to_have_value('An existing student draft from before the programme directory.')
    page.locator('[data-action="select-doc"][data-id="sop-stanford--management-science"]').click()
    expect(editor).to_have_value('A new MS&E statement, separate from the prior application.')


def test_mobile_university_and_degree_details_fit_dialog(page):
    page.set_viewport_size({'width':390,'height':844})
    dialog = open_program_browser(page, '哥伦比亚大学')
    expect(dialog.locator('.degree-card')).to_have_count(4)
    assert dialog.evaluate('el=>el.scrollWidth <= el.clientWidth')
    dialog.locator('[data-college="columbia-unit-2"]').click()
    expect(dialog.locator('.degree-card')).to_have_count(1)
    dialog.locator('.degree-title').click()
    detail = page.get_by_role('dialog', name='数据科学硕士', exact=True)
    expect(detail.get_by_role('button', name='加入我的申请', exact=True)).to_be_visible()
    assert detail.evaluate('el=>el.scrollWidth <= el.clientWidth')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')


def mock_gpt(page, reply='请把你的具体行动写清楚。', fail_first=False):
    page.route('**/api/assistant/status', lambda route:route.fulfill(json={'available':True,'model':'test-gpt','provider':'OpenAI'}))
    sent=[]
    def answer(route):
        sent.append(route.request.post_data_json)
        if fail_first and len(sent)==1:
            route.fulfill(status=504,json={'error':{'code':'timeout','message':'GPT 回复超时，请稍后重试。'}})
        else:route.fulfill(json={'reply':reply,'model':'test-gpt','provider':'OpenAI'})
    page.route('**/api/assistant/chat',answer)
    return sent


def test_gpt_context_is_opt_in_and_reply_does_not_replace_draft(page):
    sent=mock_gpt(page,reply='<img src=x onerror=alert(1)> 请补充研究方法。')
    navigate(page,'documents','写下你的申请故事')
    draft='My real research contribution. 我设计了实验。'
    page.locator('#document-editor').fill(draft)
    page.get_by_role('button',name='与 GPT 打磨').click()
    page.get_by_text('GPT 已连接 · test-gpt',exact=True).wait_for()
    page.get_by_role('textbox',name='向 GPT 提问').fill('这篇文书如何展开？')
    page.get_by_role('button',name='发送',exact=True).click()
    page.locator('.gpt-message.assistant').wait_for()
    assert 'document' not in sent[0]['context'] and 'profile' not in sent[0]['context']
    assert page.locator('.gpt-message.assistant img').count()==0
    page.get_by_role('checkbox',name='当前文稿',exact=True).check()
    page.get_by_role('textbox',name='向 GPT 提问').fill('请对照原稿给建议')
    page.get_by_role('button',name='发送',exact=True).click()
    expect(page.locator('.gpt-message.assistant')).to_have_count(2)
    assert sent[1]['context']['document']['content']==draft
    assert [m['role'] for m in sent[1]['messages']]==['user','assistant','user']
    page.keyboard.press('Escape')
    assert page.locator('#document-editor').input_value()==draft
    page.reload()
    assert page.locator('#document-editor').input_value()==draft


def test_gpt_retry_preserves_question_and_new_document_clears_context(page):
    sent=mock_gpt(page,fail_first=True)
    navigate(page,'documents','写下你的申请故事')
    page.get_by_role('button',name='与 GPT 打磨').click()
    page.get_by_text('GPT 已连接 · test-gpt',exact=True).wait_for()
    page.get_by_role('textbox',name='向 GPT 提问').fill('保留这个问题')
    page.get_by_role('button',name='发送',exact=True).click()
    page.get_by_role('button',name='重试这次提问').click()
    page.locator('.gpt-message.assistant').wait_for()
    assert sent[0]==sent[1]
    assert len(sent[1]['messages'])==1
    page.keyboard.press('Escape')
    page.locator('[data-action="select-doc"][data-id="resume"]').click()
    page.get_by_role('button',name='与 GPT 打磨').click()
    expect(page.locator('.gpt-message')).to_have_count(0)
    assert not page.get_by_role('checkbox',name='当前文稿',exact=True).is_checked()


def test_map_filters_zoom_and_opens_programmes(page):
    navigate(page,'schools','寻找属于你的下一站')
    page.get_by_role('link',name='地图查看',exact=True).click()
    page.get_by_role('heading',name='全美院校地图').wait_for()
    assert page.locator('.map-states path').count()==51
    expect(page.locator('#map-count')).to_have_text('51 所院校')
    page.get_by_role('combobox',name='地图院校档案范围').select_option('all')
    expect(page.locator('#map-count')).to_have_text('53 所院校')
    page.get_by_role('textbox',name='搜索地图中的学校或城市').fill('麻省理工')
    expect(page.locator('#map-count')).to_have_text('1 所院校')
    page.locator('.map-marker').press('Enter')
    expect(page.locator('#map-selected h2')).to_have_text('麻省理工学院')
    page.get_by_role('button',name='放大地图',exact=True).click()
    assert 'scale(1.6)' in page.locator('#map-transform').get_attribute('transform')
    page.get_by_role('button',name='重置地图视图',exact=True).click()
    assert 'scale(1)' in page.locator('#map-transform').get_attribute('transform')
    page.get_by_role('button',name='学院与项目',exact=True).click()
    expect(page.get_by_role('dialog')).to_contain_text('Massachusetts Institute of Technology')


def test_large_catalogue_search_and_pagination(page):
    navigate(page,'schools','寻找属于你的下一站')
    page.get_by_role('textbox',name='搜索学校、专业或城市').fill('波士顿大学')
    page.get_by_role('button',name='了解波士顿大学',exact=True).click()
    expect(page.locator('.degree-card')).to_have_count(24)
    page.get_by_role('button',name=re.compile('继续查看')).click()
    expect(page.locator('.degree-card')).to_have_count(48)
    page.get_by_role('textbox',name='搜索本校硕士项目').fill('Computer Science')
    assert 1<=page.locator('.degree-card').count()<24
    page.get_by_role('combobox',name='筛选硕士学位').select_option('MS')
    assert all(t=='MS' for t in page.locator('.degree-type').all_text_contents())
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')


def test_motion_has_no_toolbar_control_and_ignores_retired_preference(page):
    page.evaluate("localStorage.setItem('gradpath-motion', 'paused')")
    page.reload()
    expect(page.locator('.motion-control')).to_have_count(0)
    assert page.locator('.journey-orbit-track').evaluate("el => getComputedStyle(el).animationName") == 'chapter-spin'
    navigate(page, 'schools', '寻找属于你的下一站')
    page.reload()
    expect(page.locator('.motion-control')).to_have_count(0)
    navigate(page, 'overview', 'GradPath · 留学申请工作台')
    assert page.locator('.journey-orbit-track').evaluate("el => getComputedStyle(el).animationName") == 'chapter-spin'


def test_motion_follows_live_system_preference(page):
    page.emulate_media(reduced_motion='reduce')
    expect(page.locator('html')).to_have_attribute('data-motion', 'paused')
    page.wait_for_function("document.getAnimations().every(a => a.playState !== 'running')")
    page.emulate_media(reduced_motion='no-preference')
    expect(page.locator('html')).to_have_attribute('data-motion', 'playing')
    assert page.locator('.journey-orbit-track').evaluate("el => getComputedStyle(el).animationName") == 'chapter-spin'
    expect(page.locator('.motion-control')).to_have_count(0)


def test_reducing_motion_clears_pointer_depth(page):
    page.wait_for_timeout(800)
    hero = page.locator('.hero')
    bounds = hero.bounding_box()
    page.mouse.move(bounds['x'] + bounds['width'] * .8, bounds['y'] + bounds['height'] * .3)
    page.wait_for_function("document.querySelector('.hero').style.getPropertyValue('--scene-x') !== ''")
    page.emulate_media(reduced_motion='reduce')
    expect(page.locator('html')).to_have_attribute('data-motion', 'paused')
    assert hero.evaluate("el => el.style.getPropertyValue('--scene-x')") == ''
    page.mouse.move(bounds['x'] + bounds['width'] * .7, bounds['y'] + bounds['height'] * .4)
    page.wait_for_timeout(50)
    assert hero.evaluate("el => el.style.getPropertyValue('--scene-x')") == ''


@pytest.mark.parametrize('width', [1440, 390])
def test_library_navigation_branches_and_current_page(page, width):
    page.set_viewport_size({'width': width, 'height': 900})
    trigger = page.get_by_role('button', name='院校资料库', exact=True)
    submenu = page.get_by_role('group', name='院校资料库分页面')
    expect(trigger).to_have_attribute('aria-expanded', 'false')
    url_before = page.url
    trigger.click()
    expect(page.get_by_role('heading', name='GradPath · 留学申请工作台', exact=True)).to_be_visible()
    assert page.url == url_before
    expect(trigger).to_have_attribute('aria-expanded', 'true')
    submenu.get_by_role('link', name='院校主页', exact=True).click()
    expect(page.get_by_role('heading', name='寻找属于你的下一站')).to_be_visible()
    if width < 761:
        trigger.click()
    expect(submenu.get_by_role('link', name='院校主页')).to_have_attribute('aria-current', 'page')
    assert page.locator('.library-heading-actions a[href="#map"]').count() == 0
    submenu.get_by_role('link', name='地图查看', exact=True).click()
    expect(page.get_by_role('heading', name='全美院校地图')).to_be_visible()
    expect(page.locator('[data-library-page="map"]')).to_have_attribute('aria-current', 'page')
    assert page.locator('nav [aria-current="page"]').count() == 1
    if width < 761:
        expect(submenu).to_be_hidden()
        trigger.click()
    expect(submenu).to_be_visible()
    submenu.get_by_role('link', name='院校主页', exact=True).click()
    expect(page.get_by_role('heading', name='寻找属于你的下一站')).to_be_visible()
    if width < 761:
        trigger.click()
    trigger.click()
    expect(submenu).to_be_hidden()
    trigger.focus()
    page.keyboard.press('Enter')
    expect(submenu).to_be_visible()
    page.keyboard.press('Escape')
    expect(submenu).to_be_hidden()
    expect(trigger).to_be_focused()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')


def test_library_navigation_direct_map_and_browser_history(page, site):
    page.goto(site + '/#map')
    expect(page.get_by_role('heading', name='全美院校地图')).to_be_visible()
    expect(page.locator('[data-library-page="map"]')).to_have_attribute('aria-current', 'page')
    page.get_by_role('link', name='院校主页', exact=True).click()
    expect(page.get_by_role('heading', name='寻找属于你的下一站')).to_be_visible()
    page.go_back()
    expect(page.get_by_role('heading', name='全美院校地图')).to_be_visible()
    expect(page.locator('[data-library-page="map"]')).to_have_attribute('aria-current', 'page')
    page.reload()
    expect(page.get_by_role('button', name='院校资料库', exact=True)).to_have_attribute('aria-expanded', 'true')
    expect(page.locator('[data-library-page="map"]')).to_have_attribute('aria-current', 'page')


def test_mobile_library_menu_dismisses_on_outside_click(page):
    page.set_viewport_size({'width': 320, 'height': 844})
    page.get_by_role('button', name='院校资料库', exact=True).click()
    expect(page.get_by_role('group', name='院校资料库分页面')).to_be_visible()
    page.get_by_role('heading', name='GradPath · 留学申请工作台', exact=True).click()
    expect(page.get_by_role('group', name='院校资料库分页面')).to_be_hidden()
    expect(page.get_by_role('button', name='院校资料库', exact=True)).to_have_attribute('aria-expanded', 'false')


def test_compact_home_keeps_application_entries_and_agent(page):
    expect(page.locator('.hero')).to_be_visible()
    expect(page.locator('.assistant-card')).to_be_visible()
    expect(page.locator('.stats-grid .stat-card')).to_have_count(3)
    expect(page.locator('.deadline-card')).to_be_visible()
    expect(page.locator('.featured-section, .tasks-panel, .journey-note')).to_have_count(0)
    page.get_by_role('link', name='搜索专业', exact=False).click()
    expect(page.get_by_role('heading', name='专业搜索')).to_be_visible()
    expect(page.locator('[data-nav="programs"]')).to_have_attribute('aria-current', 'page')


def test_cross_school_search_categories_and_combined_filters(page):
    navigate(page, 'programs', '专业搜索')
    search = page.get_by_role('textbox', name='搜索跨校专业')
    search.fill('Computer Science')
    expect(page.get_by_role('complementary', name='专业分类').get_by_role('button', name=re.compile('艺术与设计'))).to_be_disabled()
    assert len(set(page.locator('.cross-program-card').evaluate_all('els => els.map(el => el.dataset.schoolId)'))) > 1
    page.get_by_role('complementary', name='专业分类').get_by_role('button', name=re.compile('计算机与信息')).click()
    page.get_by_role('combobox', name='筛选专业所属学校').select_option('nyu')
    page.get_by_role('combobox', name='筛选跨校专业学位').select_option('MS')
    assert page.locator('.cross-program-card').count() >= 2
    assert set(page.locator('.cross-program-card').evaluate_all('els => els.map(el => el.dataset.schoolId)')) == {'nyu'}
    assert set(page.locator('.cross-program-card .degree-type').all_text_contents()) == {'MS'}
    card = page.locator('[data-program="nyu--tandon-computer-science"]')
    card.locator('[data-action="program-detail"]').first.click()
    expect(page.get_by_role('dialog')).to_contain_text('纽约大学')
    page.get_by_role('button', name='← 返回专业搜索', exact=True).click()
    expect(page.get_by_role('dialog')).to_have_count(0)
    expect(search).to_have_value('Computer Science')
    expect(page.get_by_role('combobox', name='筛选专业所属学校')).to_have_value('nyu')


def test_cross_school_paging_empty_reset_and_chinese_alias(page):
    navigate(page, 'programs', '专业搜索')
    expect(page.locator('.cross-program-card')).to_have_count(24)
    page.get_by_role('button', name='继续加载专业', exact=True).click()
    expect(page.locator('.cross-program-card')).to_have_count(48)
    page.get_by_role('button', name=re.compile('数据与统计')).click()
    expect(page.locator('.cross-program-card')).to_have_count(24)
    search = page.get_by_role('textbox', name='搜索跨校专业')
    search.fill('<img src=x onerror=alert(1)>')
    expect(page.get_by_role('heading', name='暂时没有找到匹配专业')).to_be_visible()
    expect(page.locator('#cross-program-results img')).to_have_count(0)
    expect(page.locator('[data-action="cross-program-more"]')).to_be_hidden()
    page.locator('.cross-program-filters [data-action="cross-program-reset"]').click()
    expect(search).to_be_empty()
    expect(page.locator('.cross-program-card')).to_have_count(24)
    search.fill('金融')
    page.get_by_role('combobox', name='筛选专业所属学校').select_option('mit')
    expect(page.locator('[data-program="mit--finance"]')).to_be_visible()
    search.fill('纽约大学 计算机')
    page.get_by_role('combobox', name='筛选专业所属学校').select_option('all')
    assert page.locator('.cross-program-card').count() >= 2
    assert set(page.locator('.cross-program-card').evaluate_all('els => els.map(el => el.dataset.schoolId)')) == {'nyu'}


def test_cross_school_additions_persist_for_separate_universities(page):
    navigate(page, 'programs', '专业搜索')
    page.get_by_role('textbox', name='搜索跨校专业').fill('Computer Science')
    school = page.get_by_role('combobox', name='筛选专业所属学校')
    school.select_option('nyu')
    page.locator('[data-program="nyu--tandon-computer-science"] [data-action="program-add"]').click()
    school.select_option('stanford')
    page.locator('[data-program="stanford--computer-science"] [data-action="program-add"]').click()
    navigate(page, 'applications', '让每一份申请，都有条不紊')
    expect(page.locator('[data-status="nyu--tandon-computer-science"]')).to_have_count(1)
    expect(page.locator('[data-status="stanford--computer-science"]')).to_have_count(1)
    page.reload()
    expect(page.locator('[data-status="nyu--tandon-computer-science"]')).to_have_count(1)
    expect(page.locator('[data-status="stanford--computer-science"]')).to_have_count(1)


@pytest.mark.parametrize('width', [320, 390, 768])
def test_program_search_fits_mobile_and_category_filters(page, width):
    page.set_viewport_size({'width':width, 'height':844})
    navigate(page, 'programs', '专业搜索')
    page.get_by_role('button', name=re.compile('艺术与设计')).click()
    expect(page.get_by_role('button', name=re.compile('艺术与设计'))).to_have_attribute('aria-pressed', 'true')
    assert set(page.locator('.cross-program-card .degree-field').all_text_contents()) == {'艺术与设计'}
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    expect(page.locator('.motion-control')).to_have_count(0)
