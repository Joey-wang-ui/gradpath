// Source-backed reference entries; admission terms are deliberately left to official pages.
const ProgramWorkspace = (() => {
  const directory = SchoolCatalog.programDirectory || {schools:[]};
  const universityIndex = new Map(directory.schools.map(s=>[s.schoolId,s]));
  const programIndex = new Map();
  directory.schools.forEach(s=>s.colleges.forEach(c=>c.programs.forEach(p=>programIndex.set(p.id,{...p,schoolId:s.schoolId,college:c}))));
  let viewingSchool = '';
  let detailFromSearch = false;
  let collegeFilter = 'all';
  let query = '';
  let degreeFilter='all',modeFilter='all',visibleLimit=24;
  const modeNames={'unknown':'形式待核对','on-campus':'线下','online':'线上','hybrid':'混合'};
  const label = p => `${p.degree} · ${p.english}`;
  function choices(id) {
    const values = state.programChoices?.[id];
    return Array.isArray(values)?[...new Set(values)].filter(pid=>programIndex.get(pid)?.schoolId===id):[];
  }
  function resolve(id) {
    const p=programIndex.get(id);
    if (!p) return schools.find(s=>s.id===id);
    const s=schools.find(s=>s.id===p.schoolId);
    return s?{...s,id:p.id,schoolId:s.id,programId:p.id,programName:p.name,program:label(p),collegeName:p.college.name,degree:p.degree,field:p.field,url:p.url,status:'了解项目',deadline:null,isProgramExample:false}:undefined;
  }
  function hasLegacyWork(id) {
    return Boolean(state.statuses[id] || Object.keys(state.applicationDetails[id] || {}).length || state.projectDocuments.includes(id) || state.drafts[`sop-${id}`] !== undefined || state.versions[`sop-${id}`]?.length);
  }
  function items() {
    return schools.filter(s=>state.saved.includes(s.id)).flatMap(s=>{
      const ids=choices(s.id);
      const keepLegacy = hasLegacyWork(s.id) || (!ids.length && !Object.prototype.hasOwnProperty.call(state.programChoices,s.id));
      return [...(keepLegacy?[s]:[]),...ids.map(resolve)];
    });
  }
  function selected(id) { const p=programIndex.get(id);return p && state.saved.includes(p.schoolId) && choices(p.schoolId).includes(id); }
  function addButton(p) {
    if (p.admissionMode==='check-route') return `<a class="secondary-button" href="${escapeHTML(p.url)}" target="_blank" rel="noopener noreferrer">先核对招生路径 ↗</a>`;
    const added=selected(p.id);
    return `<button class="${added?'secondary-button':'primary-button'}" data-action="program-add" data-id="${p.id}">${icon(added?'check':'plus')}${added?'已加入 · 打开申请':'加入我的申请'}</button>`;
  }
  function card(p,c) {
    return `<article class="degree-card" data-program="${p.id}"><div class="degree-card-top"><span class="degree-field">${escapeHTML(p.field)}</span><span class="degree-type">${escapeHTML(p.degree)}</span></div><button class="degree-title" data-action="program-detail" data-id="${p.id}"><h3>${escapeHTML(p.name)}</h3><span>${escapeHTML(label(p))}</span></button><div class="degree-college">${icon('school')}${escapeHTML(c.name)}</div>${p.campus || p.deliveryMode && p.deliveryMode!=='unknown'?`<p class="degree-location">${escapeHTML([p.campus,p.deliveryMode!=='unknown'?modeNames[p.deliveryMode]:''].filter(Boolean).join(' · '))}</p>`:''}${p.admissionMode==='check-route'?'<p class="degree-route-note">需先确认独立硕士招生路径</p>':''}<div class="degree-card-actions"><button class="degree-more" data-action="program-detail" data-id="${p.id}">了解项目 ${icon('arrow')}</button>${addButton(p)}</div></article>`;
  }
  function matching() {
    const school=universityIndex.get(viewingSchool);
    const text=query.trim().toLocaleLowerCase();
    return (school?.colleges || []).filter(c=>collegeFilter==='all'||c.id===collegeFilter).flatMap(c=>c.programs.filter(p=>(degreeFilter==='all'||p.degree===degreeFilter)&&(modeFilter==='all'||(p.deliveryMode||'unknown')===modeFilter)&&`${p.name} ${p.english} ${p.degree} ${p.field} ${c.name} ${c.english}`.toLocaleLowerCase().includes(text)).map(p=>({p,c})));
  }
  function resultHTML() {
    const matches=matching();
    return matches.length?matches.slice(0,visibleLimit).map(({p,c})=>card(p,c)).join('')+(matches.length>visibleLimit?`<button class="secondary-button degree-load-more" data-action="program-more">继续查看 · 还有 ${matches.length-visibleLimit} 个项目 ${icon('arrow')}</button>`:''):`<div class="degree-empty">${icon('search')}<h3>换个方向，再找找。</h3><p>当前收录范围里没有匹配项目，可清除筛选或前往全校研究生入口继续查询。</p><button class="secondary-button" data-action="program-reset">重置筛选</button></div>`;
  }
  function facts(s) {
    return `<details class="university-source"><summary>院校资料与排名来源 ${icon('help')}</summary><p>基础档案来源：IPEDS HD2023。${s.rankNumber===null?'此校未列入本份用户 PDF，保留既有基础档案。':`2027 名次录入自用户提供 PDF 第 ${s.rankingSourcePage} 页，未独立核验官网。`}</p><p>部分项目已按保留的官网目录页面整理名称和学位，未核对的参考条目另行标注。收录量不代表全校完整目录；招生方式与当季要求请到官方页面确认。</p></details>`;
  }
  function open(id, reset=true) {
    const s=schools.find(s=>s.id===id); const entry=universityIndex.get(id); if(!s)return;
    if(reset || viewingSchool!==id){collegeFilter='all';query='';degreeFilter=modeFilter='all';visibleLimit=24;}
    viewingSchool=id;
    const units=entry?.colleges || [];
    const count=units.reduce((n,c)=>n+c.programs.length,0);
    const reviewed=units.reduce((n,c)=>n+c.programs.filter(p=>p.sourceEvidence?.length).length,0);
    const unitCount=units.filter(c=>c.unitType!=='directory').length;
    const codes=[...new Set(units.flatMap(c=>c.programs.map(p=>p.degree)))].sort();
    openModal(s.name,`<div class="university-profile" style="--school-color:${s.color};--school-bg:${s.bg}"><div class="university-profile-main">${schoolLogo(s)}<div><span class="eyebrow">FIND YOUR PROGRAM, WRITE YOUR NEXT CHAPTER</span><h3>${escapeHTML(s.english)}</h3><p>${escapeHTML(s.location)}<span>·</span>${s.control}大学<span>·</span><b>${escapeHTML(s.rank)}</b></p></div></div><div class="university-profile-links"><a class="secondary-button" href="${escapeHTML(s.homepage)}" target="_blank" rel="noopener noreferrer">学校官网 ↗</a><a class="primary-button" href="${escapeHTML(entry?.catalogURL || s.homepage)}" target="_blank" rel="noopener noreferrer">全校研究生入口 ↗</a></div></div><div class="degree-intro"><div><span class="eyebrow">SCHOOLS & MASTER’S PROGRAMS</span><h2>找到你的学术方向。</h2><p>已收录 ${count} 个硕士项目与方向 · ${unitCount} 个已归类学术单位</p></div><span class="degree-reference-label">${reviewed?`${reviewed} 条按官网目录整理`:'参考条目 · 待核对'}</span></div><div class="program-browser"><aside class="college-browser" aria-label="学院筛选"><button data-action="program-college" data-college="all" aria-pressed="${collegeFilter==='all'}"><span>全部学院</span><b>${count}</b></button>${units.map(c=>`<button data-action="program-college" data-college="${c.id}" aria-pressed="${collegeFilter===c.id}"><span>${escapeHTML(c.name)}<small>${escapeHTML(c.english)}</small></span><b>${c.programs.length}</b></button>`).join('')}<p>先看课程与学位，再确认申请方式。</p></aside><section class="degree-results-area" aria-label="硕士项目"><label class="degree-search">${icon('search')}<input id="program-search" aria-label="搜索本校硕士项目" placeholder="搜索项目、专业方向或学位…" value="${escapeHTML(query)}" maxlength="120"></label><div class="degree-filter-row"><select id="program-degree" aria-label="筛选硕士学位"><option value="all">全部硕士学位</option>${codes.map(code=>`<option value="${escapeHTML(code)}" ${degreeFilter===code?'selected':''}>${escapeHTML(code)}</option>`).join('')}</select><select id="program-mode" aria-label="筛选授课形式"><option value="all">全部授课形式</option>${Object.entries(modeNames).map(([key,name])=>`<option value="${key}" ${modeFilter===key?'selected':''}>${name}</option>`).join('')}</select></div><div class="degree-results-summary"><span>按兴趣，找到值得深入了解的项目</span><b id="degree-result-count" role="status">${matching().length} 个结果</b></div><div class="degree-grid" id="degree-results">${resultHTML()}</div><p class="degree-scope">当前目录持续补充。校内衔接、联合学位与专业方向需先确认申请路径；完整范围请查全校研究生入口。</p></section></div>${facts(s)}<div class="university-bottom-actions"><button class="text-button" data-action="bookmark" data-id="${id}" data-modal="true">${icon(state.saved.includes(id)?'bookmark':'plus')}${state.saved.includes(id)?'已关注院校 · 点击移除':'先关注这所院校'}</button><a class="text-button" href="#applications">查看我的申请 ${icon('arrow')}</a></div>`);
    document.querySelector('.modal').classList.add('university-modal');
  }
  function detail(id, fromSearch = false) {
    detailFromSearch = fromSearch;
    const p=programIndex.get(id);if(!p)return;
    if(viewingSchool!==p.schoolId){viewingSchool=p.schoolId;collegeFilter='all';query='';}
    const s=schools.find(s=>s.id===p.schoolId);
    openModal(p.name,`<button class="degree-back" data-action="program-back">${fromSearch?'← 返回专业搜索':'← '+escapeHTML(s.name)+' · 学院与项目'}</button><div class="degree-detail-hero"><span class="eyebrow">YOUR NEXT ACADEMIC CHAPTER</span><div class="degree-detail-tags"><span>${escapeHTML(p.degree)}</span><span>${escapeHTML(p.field)}</span></div><h3>${escapeHTML(p.english)}</h3><p>${escapeHTML(p.college.name)}<br><small>${escapeHTML(p.college.english)}</small></p></div><div class="degree-detail-facts"><div><span>所属院校</span><strong>${escapeHTML(s.name)}</strong></div><div><span>目标申请季</span><strong>${state.cycleYear} Fall</strong></div><div><span>学位</span><strong>${escapeHTML(p.degree)}</strong></div><div><span>申请方式</span><strong>${p.admissionMode==='check-route'?'先核对硕士招生路径':'按当季官方要求确认'}</strong></div></div><div class="degree-check-note"><h4>定项之前，先确认这几件事。</h4><p>${escapeHTML(p.note)}</p><ul><li>课程设置与学位类型是否符合你的目标</li><li>先修课、语言成绩与材料要求</li><li>本申请季是否招生、截止时间与项目总费用</li></ul></div><div class="degree-source-line"><span>官方参考入口</span><a href="${escapeHTML(p.url)}" target="_blank" rel="noopener noreferrer">${p.sourceLevel==='program'?'项目页面':'学院 / 目录入口'} ↗</a></div><p class="disclaimer">${p.sourceEvidence?.length?`项目名称与学位按 ${escapeHTML(p.catalogueReviewedAt)} 保留的官方目录页面整理；当季招生要求仍待核验。`:'此参考条目尚未逐页核对当前官网。'}未提供未经核验的截止日期、费用或录取概率。</p><div class="modal-actions">${addButton(p)}<a class="secondary-button" href="${escapeHTML(p.url)}" target="_blank" rel="noopener noreferrer">${p.sourceLevel==='program'?'项目官网':'学院 / 目录入口'} ↗</a></div>`);
    document.querySelector('.modal').classList.add('degree-detail-modal');
  }
  function add(id) {
    const p=programIndex.get(id);if(!p || p.admissionMode==='check-route')return;
    if(selected(id)){ApplicationWorkspace.open(id);return;}
    if(!state.saved.includes(p.schoolId))state.saved.push(p.schoolId);
    state.programChoices[p.schoolId]=[...choices(p.schoolId),id];
    save();render();
    document.querySelectorAll(`[data-action="program-add"][data-id="${id}"]`).forEach(b=>{b.className='secondary-button';b.innerHTML=`${icon('check')}已加入 · 打开申请`;});
    toast('已加入当前申请季，同校不同项目分别记录');
  }
  function remove(id) {
    const p=programIndex.get(id);if(!p)return;
    state.programChoices[p.schoolId]=choices(p.schoolId).filter(pid=>pid!==id);save();closeModal();render();
    toast('已移出清单，已有文稿与项目记录仍保留',()=>{state.programChoices[p.schoolId]=[...choices(p.schoolId),id];if(!state.saved.includes(p.schoolId))state.saved.push(p.schoolId);save();render();});
  }
  function refresh() {
    document.querySelector('#degree-results').innerHTML=resultHTML();
    document.querySelector('#degree-result-count').textContent=`${matching().length} 个结果`;
  }
  function handle(action,button) {
    if(action==='program-college'){visibleLimit=24;collegeFilter=button.dataset.college;document.querySelectorAll('[data-action="program-college"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.college===collegeFilter)));refresh();}
    else if(action==='program-more'){visibleLimit+=24;refresh();}
    else if(action==='program-detail')detail(button.dataset.id,Boolean(button.closest('#cross-program-results')));
    else if(action==='program-add')add(button.dataset.id);
    else if(action==='program-remove')remove(button.dataset.id);
    else if(action==='program-back'){if(detailFromSearch){closeModal();document.querySelector('#cross-program-query')?.focus();}else open(viewingSchool,false);}
    else if(action==='program-reset'){collegeFilter='all';query='';degreeFilter=modeFilter='all';visibleLimit=24;open(viewingSchool,false);}
    else return false;
    return true;
  }
  function onInput(input) {if(input.id==='program-search'){query=input.value;visibleLimit=24;refresh();}}
  function onChange(input){if(input.id==='program-degree')degreeFilter=input.value;else if(input.id==='program-mode')modeFilter=input.value;else return;visibleLimit=24;refresh();}
  return {open, handle, onInput, onChange, items, resolve, choices, addButton, get:id=>programIndex.get(id)};
})();
