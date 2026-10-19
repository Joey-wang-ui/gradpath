// Editorial discovery lists are starting points for research, not admissions predictions.
const ShortlistWorkspace = (() => {
  const directions = [
    {name:'计算机与数据', pattern:/计算机|软件|人工智能|机器学习|数据|computer|software|\bcs\b|\bai\b|data|information/i, schools:['stanford','mit','cmu','berkeley','umich','columbia','georgia-tech','uiuc','nyu','ucsd','maryland','northeastern']},
    {name:'工程与理科', pattern:/工程|机械|电子|电气|物理|化学|数学|engineering|physics|chemistry|math/i, schools:['mit','caltech','stanford','berkeley','umich','cornell','georgia-tech','uiuc','ucsd','wisconsin','maryland','case-western']},
    {name:'商科与经济', pattern:/商科|金融|管理|经济|会计|市场|business|finance|management|economics|accounting|marketing/i, schools:['upenn','mit','northwestern','columbia','uchicago','nyu','umich','berkeley','usc','boston-college','bu','rochester','villanova']},
    {name:'教育与社会科学', pattern:/教育|心理|社会|公共|政策|education|psychology|social|public|policy/i, schools:['harvard','stanford','upenn','northwestern','columbia','vanderbilt','umich','berkeley','nyu','wisconsin','bu','maryland','ohio-state']},
    {name:'人文与传播', pattern:/人文|历史|文学|语言|传媒|传播|新闻|艺术|设计|humanities|history|literature|communication|media|journalism|design/i, schools:['yale','harvard','northwestern','upenn','columbia','uchicago','nyu','usc','berkeley','bu','wisconsin','ucsb']},
    {name:'生命与健康', pattern:/生物|生命|健康|医学|护理|biology|biomedical|health|medicine|nursing/i, schools:['johns-hopkins','harvard','duke','upenn','stanford','washu','emory','unc','ucsd','uc-davis','case-western','rochester']},
  ];
  function preferences() {
    const stored = state.shortlistPreferences || {};
    return {tier:['all','10','30','50'].includes(stored.tier)?stored.tier:'all', control:['all','公立','私立'].includes(stored.control)?stored.control:'all'};
  }
  function suggest() {
    const major = String(state.profile.major || '').trim();
    const direction = directions.find(d => d.pattern.test(major));
    const pref = preferences();
    const candidates = rankedSchools.filter(s => (pref.tier==='all' || s.tier===pref.tier) && (pref.control==='all' || s.control===pref.control));
    const order = direction?.schools || [];
    const prioritized = [...candidates].sort((a,b) => {
      const ai = order.indexOf(a.id), bi = order.indexOf(b.id);
      return (ai<0?1000:ai)-(bi<0?1000:bi) || a.rankNumber-b.rankNumber || a.rankingSourceOrder-b.rankingSourceOrder;
    });
    const groups = [['10','高位探索','TOP 10'],['30','拓展比较','TOP 11–30'],['50','补充考察','TOP 31–50']].filter(([key])=>pref.tier==='all'||key===pref.tier).map(([key,title,range])=>({key,title,range,schools:prioritized.filter(s=>s.tier===key).slice(0,pref.tier==='all'?2:6)}));
    return {direction,groups,major};
  }
  function card(s, direction) {
    const curated = direction?.schools.includes(s.id);
    const saved = state.saved.includes(s.id);
    return `<article class="recommendation-card"><div class="recommendation-card-top">${schoolLogo(s)}<span class="rank-badge">${escapeHTML(s.rank)}</span></div><button class="recommendation-school" data-action="school" data-id="${s.id}"><h4>${escapeHTML(s.name)}</h4><span>${escapeHTML(s.english)}</span></button><div class="recommendation-meta">${escapeHTML(s.location)} · ${s.control}大学</div><p class="recommendation-reason">${curated?`${escapeHTML(direction.name)}方向的人工探索清单，建议先查课程与学位类型。`:'按所选排名区间补充比较，专业适配度尚待核验。'}</p><div class="recommendation-actions"><button class="${saved?'shortlist-saved':'shortlist-add'}" data-action="bookmark" data-id="${s.id}" aria-label="${saved?'移除':'加入'}${s.name}申请" aria-pressed="${saved}">${icon(saved?'check':'plus')}${saved?'已加入申请':'加入我的申请'}</button><button class="compare-toggle" data-action="compare-toggle" data-id="${s.id}" aria-label="对比${s.name}" aria-pressed="${comparisonIds.includes(s.id)}">${icon('compare')}${comparisonIds.includes(s.id)?'已选对比':'对比'}</button></div></article>`;
  }
  function render() {
    if (!state.profileSaved) return `<section class="shortlist-teaser"><span class="eyebrow">NEXT · BUILD YOUR SHORTLIST</span><h2>下一步，找到想去的地方。</h2><p>保存档案后，在这里查看选校建议，再把值得深入了解的学校加入申请。</p></section>`;
    const {direction,groups,major} = suggest();
    const pref = preferences();
    return `<section class="shortlist-section" id="shortlist-section" aria-label="选校建议"><div class="shortlist-heading"><div><span class="eyebrow">FROM YOUR PROFILE TO YOUR NEXT CHAPTER</span><h2 tabindex="-1" id="shortlist-title">从你的背景，到你的选校清单。</h2><p>先探索，再比较，慢慢确定适合自己的申请目标。</p></div><span class="shortlist-method">本地规则初筛</span></div><div class="shortlist-profile-summary"><span>${icon('user')}本次使用的档案</span>${[['目标方向',major||'待补充'],['GPA',state.profile.gpa||'待补充'],['语言',state.profile.language||'待补充'],['预算',state.profile.budget||'待补充']].map(([title,value])=>`<span><b>${title}</b>${escapeHTML(value)}</span>`).join('')}</div>${major?`<div class="shortlist-filters"><label>排名范围<select data-shortlist-filter="tier" aria-label="建议排名范围">${[['all','跨区间探索'],['10','Top 10'],['30','Top 11–30'],['50','Top 31–50']].map(([key,title])=>`<option value="${key}" ${pref.tier===key?'selected':''}>${title}</option>`).join('')}</select></label><label>学校性质<select data-shortlist-filter="control" aria-label="建议学校性质">${[['all','公立 + 私立'],['公立','公立大学'],['私立','私立大学']].map(([key,title])=>`<option value="${key}" ${pref.control===key?'selected':''}>${title}</option>`).join('')}</select></label><span>${direction?`探索方向：${escapeHTML(direction.name)}`:'方向尚待细化，先按排名区间探索'}</span></div><p class="shortlist-basis">推荐依据：${direction?'优先展示人工整理的方向探索院校，':'暂未识别到对应方向清单，'}按所选排名范围和学校性质筛选；各区间内按探索清单顺序、再按 PDF 名次排列。GPA、语言和预算用于下方核验提醒，尚未参与适配判断。</p><div class="shortlist-groups">${groups.map(group=>`<section class="shortlist-group"><div class="shortlist-group-title"><h3>${group.title}</h3><span>${group.range}</span></div>${group.schools.length?group.schools.map(s=>card(s,direction)).join(''):'<p class="shortlist-empty">当前区间没有符合条件的院校，试试调整学校性质或排名范围。</p>'}</section>`).join('')}</div>`:`<div class="shortlist-empty"><h3>先告诉我们，你想读什么。</h3><p>补充上方“目标专业”并再次保存，便可以开始选校探索。</p><button class="secondary-button" data-action="shortlist-edit">补充目标专业 ${icon('arrow')}</button></div>`}<div class="shortlist-verification"><h3>${icon('check')}定校之前，还差这几步。</h3><div>${[['课程与学位','核对具体硕士项目、课程设置、先修课与职业方向。'],['学术与语言',`${state.profile.gpa?'已记录 GPA；':'GPA 待补充；'}${state.profile.language?'已记录语言情况。':'语言情况待补充。'}逐个核对项目门槛、考试要求和豁免条件。`],['总成本与时间',`${state.profile.budget?'已记录预算，':'预算待补充，'}还需核对学费、生活费、奖学金及 2027 项目截止时间。`]].map(([title,text])=>`<div><strong>${title}</strong><p>${escapeHTML(text)}</p></div>`).join('')}</div></div><p class="shortlist-disclaimer">方向清单由人工整理，仅供发现院校，尚未逐项目核验。排名来自用户提供的 2027 PDF；区间不代表录取难度，也不构成冲刺、匹配或保底判断。</p><div class="shortlist-footer"><a class="secondary-button" href="#schools">查看完整资料库 ${icon('arrow')}</a><a class="primary-button" href="#applications">整理我的申请 ${icon('arrow')}</a></div></section>`;
  }
  function show() {
    document.querySelector('#shortlist-section')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
    document.querySelector('#shortlist-title')?.focus({preventScroll:true});
  }
  function onChange(input) {
    const key = input.dataset.shortlistFilter;
    if (!['tier','control'].includes(key)) return;
    state.shortlistPreferences = {...preferences(),[key]:input.value};save();
    const section = document.querySelector('#shortlist-section');
    section.outerHTML = render();
    document.querySelector(`[data-shortlist-filter="${key}"]`)?.focus({preventScroll:true});
  }
  function handle(action) {
    if (action !== 'shortlist-edit') return false;
    document.querySelector('[name="major"]')?.focus();
    return true;
  }
  return {render, show, onChange, handle};
})();
