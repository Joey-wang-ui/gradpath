// Cross-university browsing uses the retained catalogue, never inferred admissions.
const ProgramSearch = (() => {
  const groups = [
    ['computing', '计算机与信息', ['计算机', '信息管理', '信息与数据', '工程与计算机']],
    ['data', '数据与统计', ['数据与统计', '数据科学', '商科与数据', '工程与数据']],
    ['business', '商科与经济', ['商科与经济', '商科', '金融', '工程与管理']],
    ['science', '工程与自然科学', ['工程', '自然科学', '地球科学', '环境']],
    ['arts', '艺术与设计', ['艺术与设计']],
    ['education', '教育与心理', ['教育', '教育与心理']],
    ['humanities', '人文与社会科学', ['人文', '社会科学', '传播']],
    ['public', '公共与国际事务', ['公共政策', '公共与国际事务', '国际事务']],
    ['health', '健康与医学', ['健康与医学', '公共卫生']],
    ['other', '其他学科', ['其他学科']],
  ];
  const aliases = [
    ['计算机', 'computer science', 'computing'], ['金融', 'finance', 'financial'],
    ['商业分析', 'business analytics'], ['数据科学', 'data science'],
    ['统计', 'statistics', 'statistical'], ['经济', 'economics', 'economic'],
    ['心理', 'psychology', 'psychological'], ['教育', 'education'],
    ['工程', 'engineering'], ['公共卫生', 'public health'],
  ];
  const schoolById = new Map(SchoolCatalog.schools.map(s => [s.id, s]));
  const entries = (SchoolCatalog.programDirectory?.schools || []).flatMap(entry =>
    entry.colleges.flatMap(college => college.programs.map(program => {
      const school = schoolById.get(entry.schoolId);
      const category = groups.find(([, , fields]) => fields.includes(program.field))?.[0] || 'other';
      return { program, college, school, category,
        text: [school.name, school.english, school.wordmark, program.name, program.english,
          program.degree, program.field, college.name, college.english].join(' ').toLocaleLowerCase() };
    }))
  ).sort((a, b) => (a.school.rankNumber ?? Infinity) - (b.school.rankNumber ?? Infinity)
    || a.school.english.localeCompare(b.school.english) || a.program.english.localeCompare(b.program.english));
  let query = '', category = 'all', school = 'all', degree = 'all', limit = 24;
  const degrees = [...new Set(entries.map(e => e.program.degree))].sort();
  function baseMatches() {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return entries.filter(entry => (school === 'all' || entry.school.id === school)
      && (degree === 'all' || entry.program.degree === degree)
      && terms.every(term => entry.text.includes(term)
        || aliases.some(set => set.includes(term) && set.some(alias => entry.text.includes(alias)))));
  }
  const matches = base => base.filter(entry => category === 'all' || entry.category === category);
  function cards(results) {
    if (!results.length) return `<div class="cross-program-empty">${icon('search')}<h2>暂时没有找到匹配专业</h2><p>试试其他关键词，或清空学校与专业分类筛选。</p><button class="secondary-button" data-action="cross-program-reset">清空筛选</button></div>`;
    return results.slice(0, limit).map(({ program, college, school }) => `<div class="cross-program-card" data-school-id="${school.id}"><div class="cross-program-school"><button data-action="school" data-id="${school.id}" aria-label="查看${escapeHTML(school.name)}院校资料">${icon('school')}<span><strong>${escapeHTML(school.name)}</strong><small>${escapeHTML(school.english)}</small></span></button><span>${escapeHTML(school.location)}</span></div>${ProgramWorkspace.renderCard(program, college)}<p class="cross-program-evidence">${icon('help')}${program.sourceEvidence?.length ? '名称与学位有官网目录依据 · 当季招生要求待核验' : '参考条目 · 名称与当季招生要求待进一步核对'}</p></div>`).join('');
  }
  function page() {
    const base = baseMatches(), results = matches(base);
    return `${heading('找到适合你的专业','跨院校看方向，把感兴趣的可能放在一起。','EXPLORE YOUR POSSIBILITIES')}
      <section class="cross-program-toolbar" aria-label="跨校专业搜索"><label class="cross-program-query">${icon('search')}<input id="cross-program-query" aria-label="搜索跨校专业" placeholder="搜索专业、方向或学校，如：计算机、Finance、纽约大学" value="${escapeHTML(query)}" maxlength="160" autocomplete="off"></label><div class="cross-program-filters"><select id="cross-program-school" aria-label="筛选专业所属学校"><option value="all">全部学校</option>${[...schoolById.values()].sort((a,b)=>a.name.localeCompare(b.name,'zh-CN')).map(s=>`<option value="${s.id}" ${school===s.id?'selected':''}>${escapeHTML(s.name)}</option>`).join('')}</select><select id="cross-program-degree" aria-label="筛选跨校专业学位"><option value="all">全部学位</option>${degrees.map(value=>`<option value="${escapeHTML(value)}" ${degree===value?'selected':''}>${escapeHTML(value)}</option>`).join('')}</select><button class="text-button" data-action="cross-program-reset">清空筛选</button></div></section>
      <div class="cross-program-layout"><aside class="cross-program-categories" aria-label="专业分类"><div class="cross-program-category-title">按专业分类</div>${[['all','全部专业'],...groups].map(([id,name])=>`<button data-action="cross-program-category" data-category="${id}" aria-pressed="${category===id}"><span>${name}</span><b>${id==='all'?base.length:base.filter(e=>e.category===id).length}</b></button>`).join('')}<p>分类沿用目录中的专业方向，<br>仅用于探索与筛选。</p></aside><section class="cross-program-results" aria-label="跨校专业结果"><div class="cross-program-summary"><strong id="cross-program-count" role="status">${results.length} 个专业 · ${new Set(results.map(e=>e.school.id)).size} 所学校</strong><span>按院校榜单顺序浏览</span></div><p class="cross-program-scope">当前收录 ${entries.length.toLocaleString()} 个硕士项目与方向，涵盖 ${schoolById.size} 份院校档案，目录仍在补全。分类与名称依据不代表当季招生要求已核验。</p><div id="cross-program-results" class="cross-program-grid">${cards(results)}</div><button class="secondary-button cross-program-more" data-action="cross-program-more" ${results.length<=limit?'hidden':''}>继续加载专业</button><p id="cross-program-progress" class="cross-program-progress">已展示 ${Math.min(limit,results.length)} / ${results.length} 个专业</p></section></div>`;
  }
  function refresh() {
    const root = document.querySelector('#cross-program-results');
    if (!root) return;
    const base = baseMatches(), results = matches(base);
    root.innerHTML = cards(results);
    document.querySelector('#cross-program-count').textContent = `${results.length} 个专业 · ${new Set(results.map(e=>e.school.id)).size} 所学校`;
    document.querySelector('#cross-program-progress').textContent = `已展示 ${Math.min(limit,results.length)} / ${results.length} 个专业`;
    document.querySelector('[data-action="cross-program-more"]').hidden = results.length <= limit;
    document.querySelectorAll('[data-action="cross-program-category"]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.category===category));
      button.querySelector('b').textContent = button.dataset.category==='all'?base.length:base.filter(e=>e.category===button.dataset.category).length;
    });
    hydrateIcons(root);
  }
  function handle(action, button) {
    if (action === 'cross-program-category') { category=button.dataset.category; limit=24; refresh(); }
    else if (action === 'cross-program-more') { limit+=24; refresh(); }
    else if (action === 'cross-program-reset') {
      query=''; category=school=degree='all'; limit=24; render();
      document.querySelector('#cross-program-query').focus();
    } else return false;
    return true;
  }
  function onInput(input) { if (input.id==='cross-program-query') { query=input.value; limit=24; refresh(); } }
  function onChange(input) {
    if (input.id==='cross-program-school') school=input.value;
    else if (input.id==='cross-program-degree') degree=input.value;
    else return;
    limit=24; refresh();
  }
  return { render:page, handle, onInput, onChange, total:entries.length };
})();
