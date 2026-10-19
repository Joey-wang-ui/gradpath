const icons = {
  map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/>',
  message:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3H13a8.5 8.5 0 0 1 8 8v.5Z"/>',
  dashboard:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  school:'<path d="m2 9 10-6 10 6-10 6-10-6Z"/><path d="M6 12v6c4 3 8 3 12 0v-6M22 9v8"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/>',
  document:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  settings:'<path d="m10 3-1 3-3 1-3 3 2 2-1 4 3 2 3-1 2 4 3-1 1-3 4-1 1-3-3-2V7l-3-2-3 1-2-3Z"/><circle cx="12" cy="12" r="3"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 17h.01"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  bookmark:'<path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16l-6-4-6 4Z"/>',
  location:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  spark:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
  send:'<path d="m4 12 16-8-5 16-4-7-7-1ZM11 13l9-9"/>',
  search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  compare:'<path d="M8 3v18M16 3v18M4 7h8M12 17h8M4 4l4 3 4-3M12 20l4-3 4 3"/>',
  focus:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  history:'<path d="M3 11a9 9 0 1 1 2 7M3 5v6h6M12 7v5l3 2"/>',
  undo:'<path d="m8 4-5 5 5 5M3 9h10a7 7 0 0 1 0 14"/>',
  list:'<path d="M9 5h12M9 12h12M9 19h12M3 5h.01M3 12h.01M3 19h.01"/>',
  columns:'<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="12" rx="1"/><rect x="17" y="4" width="4" height="9" rx="1"/>',
};
const icon = name => `<i data-icon="${name}"><svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.spark}</svg></i>`;
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const schools = SchoolCatalog.schools;
const rankingEdition = SchoolCatalog.ranking;
const rankingAvailable = ['verified','user-provided'].includes(rankingEdition.status);
const rankingSourceLabel = rankingEdition.status==='user-provided'?'用户提供 PDF · 未独立核验官网':rankingEdition.status==='verified'?'官网来源已核验':'排名来源待核验';
const rankedSchools = schools.filter(s => s.rankNumber !== null).sort((a,b) => a.rankNumber-b.rankNumber || (a.rankingSourceOrder??Infinity)-(b.rankingSourceOrder??Infinity) || a.english.localeCompare(b.english));
const tasks = [
  {id:'sop',title:'完成个人陈述的第一版提纲',school:'通用申请材料',category:'文书准备',tag:'优先完成',color:'',doc:'sop'},
  {id:'resume',title:'更新简历中的科研与实习经历',school:'通用申请材料',category:'简历优化',tag:'进行中',color:'blue',doc:'resume'},
  {id:'letter',title:'联系两位推荐人，确认推荐意向',school:'通用申请材料',category:'推荐信',tag:'待开始',color:'sage'},
  {id:'transcript',title:'整理成绩单与语言成绩',school:'通用申请材料',category:'基础材料',tag:'已完成',color:'sage'},
];
const documents = [
  {id:'sop',name:'Statement of Purpose',subtitle:'通用材料 · 个人陈述',label:'个人陈述',prompt:'写作起点：为什么选择这个方向？哪些真实经历支持你的选择？你希望在项目中进一步学习什么？此处为通用练习提纲，正式题目与字数以项目官网为准。',initial:'我的申请动机\n\n[从一个真实经历出发，说明你为什么对这个方向感兴趣。]\n\n学术准备与实践经历\n\n[选择 1–2 段经历，写清楚问题、你的行动、结果与反思。]\n\n为什么选择这个项目\n\n[查证课程、研究方向与资源，连接到自己的学习目标。]\n\n未来计划\n\n[说明你想解决的问题，以及项目如何支持下一步。]'},
  {id:'resume',name:'Academic Resume',subtitle:'通用材料 · 学术简历',label:'学术简历',prompt:'优先展示与申请方向相关的教育、科研和实践经历。使用真实信息，用具体行动和可核实的成果描述你的贡献。',initial:'EDUCATION\n[学校 · 专业 · 就读时间]\n\nRESEARCH EXPERIENCE\n[项目名称 · 你的角色]\n• 问题与研究目标\n• 你的方法与具体贡献\n• 可核实的成果\n\nPROFESSIONAL EXPERIENCE\n[公司 / 机构 · 职位 · 时间]\n\nSKILLS\n[技能、语言与相关工具]'},
  {id:'story',name:'My Story Bank',subtitle:'个人素材库 · 所有项目共用',label:'经历素材',prompt:'先记录事实，再组织表达。保存能体现学习能力、主动性、协作和成长的真实经历，后续按不同项目要求取用。',initial:'值得记录的一次经历\n\n背景：\n遇到的挑战：\n我具体做了什么：\n结果与证据：\n我学到了什么：\n\n下一段经历\n\n'},
];
const baseTasks = tasks.map(task=>({...task}));
const baseDocuments = documents.map(doc=>({...doc}));
const STORAGE_KEY = 'gradpath-prototype-v1';
let storageAvailable = true;
let stored = {};
try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch { storageAvailable = false; }
const customTasks = Array.isArray(stored.customTasks) ? stored.customTasks.filter(t => t && /^custom-[a-z0-9-]+$/.test(t.id) && typeof t.title === 'string').map(t => ({...t, title:t.title.slice(0,120), custom:true})) : [];
tasks.push(...customTasks);
const state = {
  saved: Array.isArray(stored.saved) ? stored.saved.filter(id => schools.some(s => s.id === id)) : ['stanford','columbia','nyu','umich'],
  completed: Array.isArray(stored.completed) ? stored.completed.filter(id => tasks.some(t => t.id === id)) : ['transcript'],
  drafts: stored.drafts && typeof stored.drafts === 'object' ? stored.drafts : {},
  statuses: stored.statuses && typeof stored.statuses === 'object' ? stored.statuses : {},
  profile: stored.profile && typeof stored.profile === 'object' ? stored.profile : {name:'同学',major:'',school:'',gpa:'',language:'',budget:'',goals:''},
  customTasks,
  cycleYear: Number.isInteger(stored.cycleYear) && stored.cycleYear>=2000 && stored.cycleYear<=2100 ? stored.cycleYear : 2027,
  cycleArchives: stored.cycleArchives && typeof stored.cycleArchives==='object' ? stored.cycleArchives : {},
  cycleReview: stored.cycleReview && typeof stored.cycleReview==='object' ? stored.cycleReview : {},
  profileSaved: Boolean(stored.profileSaved || stored.profile?.major),
  shortlistPreferences: stored.shortlistPreferences || {},
  programChoices: stored.programChoices && typeof stored.programChoices==='object' && !Array.isArray(stored.programChoices) ? stored.programChoices : {},
  applicationDetails: stored.applicationDetails && typeof stored.applicationDetails === 'object' ? stored.applicationDetails : {},
  projectDocuments: Array.isArray(stored.projectDocuments) ? stored.projectDocuments.filter(id=>Boolean(ProgramWorkspace.resolve(id))) : [],
  activeDocumentId: stored.activeDocumentId || 'sop',
  versions: stored.versions && typeof stored.versions === 'object' ? stored.versions : {},
};
if (state.profile.name === '林同学') state.profile.name = '同学';
let activePage = 'overview';
let libraryNavOpen = false;
let activeTier = 'all';
let search = '';
let taskFilter = 'pending';
state.projectDocuments.forEach(id => ApplicationWorkspace.prepareDocument(id));
let activeDoc = documents.some(d=>d.id===state.activeDocumentId)?state.activeDocumentId:'sop';
let applicationView = 'list';
let activeDiscipline = 'all';
let schoolSort = 'default';
let comparisonIds = [];
let undoAction = null;
let commandIndex = -1;
let modalReturnFocus;
let toastTimer;
const save = () => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); storageAvailable = true; return true; }
  catch { storageAvailable = false; toast('浏览器未允许保存，当前内容仅在本次打开期间保留'); return false; }
};
function hydrateIcons(root = document) { root.querySelectorAll('i[data-icon]:empty').forEach(el => {el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[el.dataset.icon] || icons.spark}</svg>`;}); }
const campus = `<svg class="campus-art" viewBox="0 0 370 270" fill="none" aria-hidden="true">
 <circle cx="245" cy="100" r="71" fill="#dfe6ef"/><circle cx="316" cy="49" r="15" fill="#cbd7e7"/>
 <path d="M35 250c54-22 96-18 145-15 66 4 126-18 185-5" stroke="#a9b8cb" stroke-width="1.3"/>
 <path d="m70 221 30-2m-9 13 28-2m151 9 40-2m-17-9 22-2" stroke="#b2bfd0"/>
 <path d="M119 216V127h90v89M112 127h104l-52-28-52 28Z" fill="#ebf0f6" stroke="#8395ac" stroke-width="1.2"/>
 <path d="M125 134h78m-76 8v67m12-67v67m13-67v67m13-67v67m13-67v67m13-67v67m12-67v67M116 211h97v8h-97z" stroke="#8d9db1"/>
 <path d="M211 216V152h76v64M207 151h84l-42-20-42 20Z" fill="#dde5ef" stroke="#8395ac"/>
 <path d="M220 163h9v15h-9zm19 0h9v15h-9zm19 0h9v15h-9zm-38 27h9v15h-9zm19 0h9v15h-9zm19 0h9v15h-9z" fill="#bac7d9" stroke="#93a2b6"/>
 <path d="M147 106V76h34v30m-37-30h40l-20-23-20 23Z" fill="#e3e9f2" stroke="#8395ac"/>
 <path d="M161 54V38m0 0 25 5-25 6" stroke="#8395ac"/><circle cx="164" cy="88" r="8" stroke="#8c9cb2"/><path d="M164 83v5l4 2" stroke="#8c9cb2"/>
 <path d="M160 215v-27a8 8 0 0 1 16 0v27" fill="#a8b8ce" stroke="#7c90aa"/>
 <path d="M151 220h34l17 20h-68l17-20Z" stroke="#9eaec2"/>
 <path d="M93 221v-69m0 16c-20 0-25-18-17-31-13-13-2-36 17-33 18-3 31 17 20 32 10 19-2 34-20 32Z" fill="#ccd8e7" stroke="#91a3ba"/><path d="m93 154-11-13m11 4 11-12" stroke="#8a9db5"/>
 <path d="M307 227v-66m0 19c-22 0-27-17-16-32-11-14-2-29 16-28 18-1 27 14 16 28 10 16 5 32-16 32Z" fill="#b5c5db" stroke="#8599b4"/><path d="m307 169-10-13m10 5 9-11" stroke="#8598b1"/>
 <path d="m241 81 7-3 7 3m17-15 6-3 6 3M57 96l7-3 7 3" stroke="#95a4b8" stroke-linecap="round"/>
 <path d="M50 244c3-22 14-28 22-23 9-22 24-20 29-4 12-7 25 5 26 24m162-1c4-13 12-20 20-14 5-18 21-17 28-2 15-5 23 3 24 15" fill="#d2dce9" stroke="#a0b0c5"/>
 <path d="M63 240v-9m10 9 4-14m18 13-1-12m225 9 2-11m11 12 4-7" stroke="#99abc2"/>
 </svg>`;

function heading(title, sub, eyebrow, action = '') {
  return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${sub?`<p>${sub}</p>`:''}</div>${action}</div>`;
}
function schoolLogo(s) {
  return `<div class="school-logo ${s.crestDataURL?'has-crest':''}" style="--school-color:${s.color};--school-bg:${s.bg}">${s.crestDataURL?`<img class="school-crest" ${s.crestFit==='cover'?'style="object-fit:cover"':''} src="${s.crestDataURL}" alt="${escapeHTML(s.name)}校徽" width="64" height="64" decoding="async">`:`<span>${s.initial}</span>`}</div>`;
}
function schoolCard(s) {
  const saved = state.saved.includes(s.id);
  const compared = comparisonIds.includes(s.id);
  return `<article class="school-card" style="--school-color:${s.color};--school-bg:${s.bg}">
    <div class="school-cover"><div class="school-cover-lines"></div><span class="school-cover-word">${escapeHTML(s.wordmark)}</span><span class="rank-badge ${s.rankNumber===null?'rank-pending':''}">${s.rankNumber===null?'基础资料':escapeHTML(s.rank)}</span></div>
    <div class="school-top">${schoolLogo(s)}<button class="icon-button school-bookmark ${saved?'saved':''}" aria-label="${saved?'取消收藏':'收藏'}${s.name}" aria-pressed="${saved}" data-action="bookmark" data-id="${s.id}">${icon('bookmark')}</button></div>
    <button class="school-link" data-action="school" data-id="${s.id}"><h3>${s.name}</h3><div class="school-english">${escapeHTML(s.english)}</div><p class="school-program"><span class="control-dot ${s.control==='公立'?'public':''}"></span>${s.control}大学 <span>·</span> ${s.stateCode}</p></button>
    <div class="school-bottom"><span class="location">${icon('location')}${escapeHTML(s.location)}</span><span class="school-date">${s.rankNumber===null?(rankingAvailable?'未列入本份榜单':'2027待核验'):rankingEdition.status==='user-provided'?'PDF · 2027':`U.S. News ${rankingEdition.year}`}</span></div>
    <div class="school-card-actions"><button class="compare-toggle ${compared?'selected':''}" aria-label="对比${s.name}" aria-pressed="${compared}" data-action="compare-toggle" data-id="${s.id}">${icon(compared?'check':'compare')}${compared?'已选对比':'加入对比'}</button><button class="school-detail-link" data-action="school" data-id="${s.id}" aria-label="了解${s.name}">了解项目 ${icon('arrow')}</button></div>
  </article>`;
}
function taskRows() {
  const visible = tasks.filter(t => taskFilter === 'all' || (taskFilter === 'completed' ? state.completed.includes(t.id) : !state.completed.includes(t.id)));
  return visible.length ? visible.map(t => `<div class="task-row ${state.completed.includes(t.id)?'completed':''}"><button class="task-check" data-action="task" data-id="${escapeHTML(t.id)}" aria-label="${state.completed.includes(t.id)?'撤销完成':'完成'}：${escapeHTML(t.title)}" aria-pressed="${state.completed.includes(t.id)}">${state.completed.includes(t.id)?'✓':''}</button><div class="task-copy"><strong>${escapeHTML(t.title)}</strong><p>${escapeHTML(t.school||'通用申请材料')}<span></span>${escapeHTML(t.category||'个人待办')}${t.due?`<span></span>${escapeHTML(t.due)}`:''}</p></div><span class="task-tag ${t.color==='blue'?'blue':t.color==='sage'?'sage':''}">${state.completed.includes(t.id)?'已完成':escapeHTML(t.tag||'待开始')}</span><button class="task-arrow" aria-label="查看${escapeHTML(t.title)}" data-action="${t.doc?'edit-doc':'task-detail'}" data-id="${escapeHTML(t.doc||t.id)}">↗</button></div>`).join('') : `<div class="empty-state"><span class="empty-icon">${icon('check')}</span><strong>${taskFilter==='completed'?'每一份进步，都值得记录':'今天的清单，已经清空'}</strong><p>${taskFilter==='completed'?'完成第一项任务，记录申请路上的小小进展。':'给自己一点掌声，再安排下一步吧。'}</p><button class="secondary-button" data-action="add-task">${icon('plus')}添加待办</button></div>`;
}
function deadlineRows() {
  // A Fall application cycle crosses January: sort fall dates before spring dates.
  const dateOrder = school => {const [month,day]=school.deadline.split('.').map(Number);return (month<8?month+12:month)*100+day;};
  const dated=ProgramWorkspace.items().filter(s=>s.deadline);
  return dated.length ? dated.sort((a,b)=>dateOrder(a)-dateOrder(b)).slice(0,3).map(s=>`<div class="deadline-row"><div class="deadline-date"><span>${s.month}</span>${s.day}</div><div><div class="deadline-name">${s.name}</div><div class="deadline-meta">${s.program.replace(' · ',' / ')}<b>示例待核验</b></div></div></div>`).join('') : '<p class="library-note">学校没有统一的研究生申请截止日期。选择具体项目后，再核验当季时间。</p>';
}
function assistantCard() {
  return `<section class="assistant-card"><div class="assistant-heading"><span class="assistant-mark">✺</span><div><h2>AI 留学申请助手</h2><p>GRADPATH ASSISTANT</p></div><span class="assistant-caption">申请与文书</span></div><p class="assistant-intro">选校、文书、申请安排，从你的问题开始。</p><div class="suggestions"><button class="suggestion" data-action="chat" data-question="帮我安排本周的申请任务">${icon('calendar')}帮我安排本周的申请任务<span>↗</span></button><button class="suggestion" data-action="chat" data-question="我的选校清单合理吗？">${icon('school')}我的选校清单合理吗？<span>↗</span></button><button class="suggestion" data-action="chat" data-question="文书不知道从哪里开始">${icon('document')}文书不知道从哪里开始<span>↗</span></button></div><form class="assistant-input" data-form="chat"><input name="question" placeholder="聊聊你的申请困惑…" aria-label="向申请助手提问" maxlength="1000" required><button aria-label="发送问题">${icon('send')}</button></form><div class="assistant-note">建议仅供参考 · 重要信息请核对官网</div></section>`;
}
function overview() {
  const percent = Math.round(state.completed.length / tasks.length * 100);
  return `${heading('GradPath · <span class="overview-title">留学申请工作台</span>','','YOUR NEXT CHAPTER',`<button class="date-label" data-action="choose-season">${icon('calendar')}<span data-cycle-label>${state.cycleYear} Fall</span><span>${SeasonWorkspace.phase()}</span>${icon('arrow')}</button>`)}
    ${SeasonWorkspace.overview()}<div class="main-grid"><div class="main-column">
    <section class="hero"><div class="hero-copy"><div class="hero-topline">选校 · 专业搜索 · 申请管理</div><h2>查院校，找专业，<br>规划你的<span class="hero-title-accent">留学申请。</span></h2><p>搜索不同学校的专业，整理申请材料，跟进申请进度。<br>不知道下一步做什么？问问 AI 助手。</p><div class="hero-actions"><a href="#programs" class="primary-button">搜索专业 ${icon('arrow')}</a><a href="#applications" class="hero-secondary">我的申请 ${icon('arrow')}</a></div></div><div class="hero-scene" aria-hidden="true"><svg class="journey-orbits" viewBox="0 0 360 300"><ellipse cx="180" cy="150" rx="174" ry="106" transform="rotate(-25 180 150)"/><g class="journey-orbit-track"><circle class="journey-orbit-dash" cx="180" cy="150" r="139"/><circle class="journey-orbit-node" cx="180" cy="11" r="5"/></g><path class="journey-orbit-cross" d="M14 117h16m-8-8v16M323 218h16m-8-8v16"/></svg><span class="scene-spark">✺</span>${campus}<span class="orbit-label orbit-one">${icon('school')}Dream bigger.</span><span class="orbit-label orbit-two">${icon('check')}One step closer</span><span class="scene-caption">YOUR NEXT CHAPTER<br><b>BEGINS HERE ↗</b></span></div></section>

    <div class="stats-grid"><button class="stat-card" data-action="navigate" data-page="applications"><div class="stat-label">申请项目 ${icon('school')}</div><div class="stat-value">${String(ProgramWorkspace.items().length).padStart(2,'0')}<small>个项目</small></div><div class="stat-foot"><span>查看申请</span> ${icon('arrow')}</div></button><button class="stat-card" data-action="navigate" data-page="documents"><div class="stat-label">文书工作区 ${icon('document')}</div><div class="stat-value">${String(documents.length).padStart(2,'0')}<small>份文档</small></div><div class="stat-foot"><span>继续写作</span>${icon('arrow')}</div></button><button class="stat-card" data-action="navigate" data-page="applications"><div class="stat-label">材料准备进度 ${icon('folder')}</div><div class="stat-value">${percent}<small>% 已完成</small></div><div class="stat-foot"><div class="tiny-bar"><span style="width:${percent}%"></span></div><span>${state.completed.length}/${tasks.length}</span></div></button></div>

    </div>
    <aside class="right-column">${assistantCard()}<section class="deadline-card"><div class="section-heading"><h2>申请日期提醒</h2><button class="icon-button" data-action="notifications" aria-label="打开申请日历">${icon('calendar')}</button></div><p class="date-disclaimer">示例日期 · 请先核对项目当季官网</p>${deadlineRows()}</section></aside></div>`;
}
function matchingSchools() {
  const query = search.trim().toLowerCase();
  const result = schools.filter(s=>(activeTier==='all'?(!rankingAvailable||s.rankNumber!==null):activeTier==='directory'?true:activeTier==='saved'?state.saved.includes(s.id):s.tier===activeTier) && (activeDiscipline==='all'||s.control===activeDiscipline) && `${s.name} ${s.english} ${s.wordmark} ${s.program} ${s.location} ${s.control}`.toLowerCase().includes(query));
  if (schoolSort==='default') result.sort((a,b)=>(a.rankNumber??Infinity)-(b.rankNumber??Infinity)||(a.rankingSourceOrder??Infinity)-(b.rankingSourceOrder??Infinity)||a.english.localeCompare(b.english));
  if (schoolSort==='name') result.sort((a,b)=>a.english.localeCompare(b.english));
  if (schoolSort==='deadline') result.sort((a,b)=>cycleDate(a)-cycleDate(b));
  return result;
}
function cycleDate(school) { if(!school.deadline)return Infinity;const [month,day]=school.deadline.split('.').map(Number);return (month<8?month+12:month)*100+day; }
function library() {
  return `${heading('寻找属于你的下一站','从一所学校开始，看看更大的世界。','THE UNIVERSITY EDIT',`<div class="library-heading-actions"><button class="secondary-button" data-action="show-comparison">${icon('compare')}院校对比</button></div>`)}
    <div class="catalog-hero"><div class="catalog-hero-copy"><span class="eyebrow">YOUR AMBITION, WITHOUT BORDERS</span><h2>把世界，<br>放进你的选校清单。</h2><p>了解学校与城市，收藏值得奔赴的可能。<br>${rankingEdition.status==='user-provided'?'按你提供的 2027 PDF 整理，完整保留并列学校。':'2027 排名独立核验，基础资料持续整理。'}</p><div class="catalog-stats"><span><strong>${rankingAvailable?rankedSchools.length:schools.length}</strong>${rankingAvailable?'榜单收录院校':'基础院校'}</span><span><strong>${ProgramSearch.total.toLocaleString()}</strong>已收录专业</span><span><strong>2027</strong>目标榜单年份</span></div></div><div class="catalog-hero-art" aria-hidden="true"><span>THE<br>UNIVERSITY<br>EDIT.</span><div class="catalog-orbit"></div><b>↗</b></div></div>
    <div class="ranking-source-strip"><span class="source-status-dot ${rankingEdition.status==='verified'?'verified':''}"></span><strong>U.S. News 2027 · National Universities</strong><span>${rankingSourceLabel}</span><button data-action="ranking-source">查看来源 ${icon('arrow')}</button></div>
    <div class="toolbar"><label class="search-box">${icon('search')}<input id="school-search" placeholder="搜索中英文校名、州或城市…" value="${escapeHTML(search)}" aria-label="搜索学校、专业或城市"><button class="icon-button" data-action="clear-school-search" aria-label="清空搜索" ${search?'':'hidden'}>${icon('close')}</button><kbd>/</kbd></label><select id="discipline-filter" class="filter-select" aria-label="院校性质">${[['all','全部院校性质'],['公立','公立大学'],['私立','私立大学']].map(([value,label])=>`<option value="${value}" ${activeDiscipline===value?'selected':''}>${label}</option>`).join('')}</select></div>
    <div class="explore-filter-row"><div class="filter-buttons" aria-label="排名区间筛选">${[['all','全部院校'],['10','Top 10'],['30','Top 11–30'],['50','Top 31–50'],['saved','我的收藏'],['directory','全部档案']].map(([value,label])=>`<button data-action="tier" data-tier="${value}" class="${activeTier===value?'active':''}" aria-pressed="${activeTier===value}">${value==='saved'?icon('bookmark'):''}${label}</button>`).join('')}</div><select id="school-sort" class="filter-select" aria-label="项目排序">${[['default','2027排名 / 名称'],['name','学校名称 A–Z'],['deadline','示例项目截止日期']].map(([value,label])=>`<option value="${value}" ${schoolSort===value?'selected':''}>${label}</option>`).join('')}</select></div>
    <div class="section-heading"><h2>${rankingAvailable?'2027 院校榜单':'院校基础目录'} <span id="result-count">${matchingSchools().length} 个结果</span></h2><span class="view-all">收藏心动，或加入对比</span></div><div class="school-grid library-grid" id="school-results">${libraryResults()}</div><p class="library-note data-note">${icon('help')}${rankingEdition.status==='user-provided'?'按用户提供 PDF 收录 51 所，第 49 名有 3 所并列。保留原名次；文件为整理版，未独立核验官网。':'基础院校名录不代表 2027 前 50。'} 学校基础信息来自 IPEDS HD2023；硕士项目要求需单独核验。</p>`;
}
function libraryResults() {
  if (['10','30','50'].includes(activeTier) && !rankingAvailable) return `<div class="empty-state ranking-empty"><span class="empty-icon">${icon('clock')}</span><strong>2027 排名正在等待官方核验</strong><p>暂未给任何学校分配 2027 名次。你仍可浏览基础目录，收藏感兴趣的学校。</p><button class="primary-button" data-action="reset-filters">浏览基础目录 ${icon('arrow')}</button><button class="text-button" data-action="ranking-source">查看榜单来源与状态 ↗</button></div>`;
  return matchingSchools().map(schoolCard).join('') || `<div class="empty-state"><span class="empty-icon">${icon('search')}</span><strong>暂时没有找到匹配的项目。</strong><p>换个关键词，也许会遇见新的可能。</p><button class="secondary-button" data-action="reset-filters">重置筛选 ${icon('arrow')}</button></div>`;
}
function applications() {
  const selected = ProgramWorkspace.items();
  const submitted = selected.filter(s=>['已提交','收到结果'].includes(state.statuses[s.id]||s.status)).length;
  return `${heading('让每一份申请，都有条不紊','目标、材料与进度，在一个地方慢慢靠近。','MAKE ROOM FOR YOUR AMBITION',`<a class="primary-button" href="#schools">${icon('plus')}添加申请项目</a>`)}
    <div class="application-summary"><div class="summary-chip"><span>正在奔赴的目标</span><strong>${String(selected.length).padStart(2,'0')}<small>个项目</small></strong>${icon('school')}</div><div class="summary-chip"><span>材料准备进度</span><strong>${Math.round(state.completed.length/tasks.length*100)}<small>% 已完成</small></strong>${icon('folder')}</div><div class="summary-chip"><span>已经迈出的那一步</span><strong>${String(submitted).padStart(2,'0')}<small>份已提交</small></strong>${icon('send')}</div></div>
    <div class="section-heading"><h2>我的项目 <span>${selected.length} 个申请目标</span></h2><div class="segmented" aria-label="申请视图"><button data-action="application-view" data-view="list" class="${applicationView==='list'?'active':''}">${icon('list')}列表</button><button data-action="application-view" data-view="board" class="${applicationView==='board'?'active':''}">${icon('columns')}看板</button></div></div>
    ${selected.length?(applicationView==='board'?applicationBoard(selected):applicationTable(selected)):`<div class="empty-state"><span class="empty-icon">${icon('school')}</span><strong>每一份申请，都从一次心动开始。</strong><p>去看看有哪些项目，值得你向前一步。</p><a href="#schools" class="primary-button">探索项目 ${icon('arrow')}</a></div>`}
    <p class="library-note data-note">${icon('help')}我的清单 · 选择状态进入对应工作区${applicationView==='board'?'或拖动卡片':''}即可更新进度。截止日期需核验。</p>
    <section class="application-tasks"><div class="section-heading"><h2>材料待办 <span>${tasks.length-state.completed.length} 项待完成</span></h2><button class="view-all" data-action="add-task">${icon('plus')}添加待办</button></div><div class="task-panel-top"><span>让准备，少一点手忙脚乱</span><div class="segmented"><button data-action="task-filter" data-filter="all" class="${taskFilter==='all'?'active':''}">全部</button><button data-action="task-filter" data-filter="pending" class="${taskFilter==='pending'?'active':''}">待完成</button><button data-action="task-filter" data-filter="completed" class="${taskFilter==='completed'?'active':''}">已完成</button></div></div><div class="tasks-panel">${taskRows()}</div></section>`;
}
const applicationStatuses = ['了解项目','准备材料','文书撰写','准备提交','已提交','收到结果'];
function statusSelect(s) {
  return `<div class="application-stage"><select class="status-select" data-status="${s.id}" aria-label="${s.name}${s.programId?` ${s.programName}`:''}申请状态">${applicationStatuses.map(status=>`<option ${status===(state.statuses[s.id]||s.status)?'selected':''}>${status}</option>`).join('')}</select><button class="application-stage-link" data-action="application-enter" data-id="${s.id}" aria-label="打开${s.name}${s.programId?` ${s.programName}`:''}当前阶段">打开工作区 ↗</button></div>`;
}
function applicationTable(selected) {
  return `<div class="application-table"><table><thead><tr><th>学校 / 申请项目</th><th>2027 排名</th><th>截止日期 · 示例</th><th>申请状态</th><th></th></tr></thead><tbody>${selected.map(s=>`<tr><td><div class="application-school">${schoolLogo(s)}<div><button class="application-name" data-action="application-detail" data-id="${s.id}">${s.name}</button><small>${escapeHTML(state.applicationDetails[s.id]?.projectName || s.program)}</small>${s.collegeName?`<small class="application-college">${escapeHTML(s.collegeName)}</small>`:''}</div></div></td><td><span class="rank-badge">${s.rank}</span></td><td><strong>${s.deadline||'按项目核验'}</strong><span class="table-note">待核验</span></td><td>${statusSelect(s)}</td><td><button class="icon-button" data-action="application-detail" data-id="${s.id}" aria-label="查看${s.name}${s.programId?` ${s.programName}`:''}申请详情">${icon('arrow')}</button></td></tr>`).join('')}</tbody></table></div>`;
}
function applicationBoard(selected) {
  return `<div class="application-board">${applicationStatuses.map((status,i)=>`<section class="board-column" data-drop-status="${status}"><div class="board-heading"><span class="board-dot" style="--dot-color:${['#9ca5a0','#c39e68','#879e81','#719596','#458373','#90ab5b'][i]}"></span><strong>${status}</strong><span>${selected.filter(s=>(state.statuses[s.id]||s.status)===status).length}</span></div>${selected.filter(s=>(state.statuses[s.id]||s.status)===status).map(s=>`<article class="board-card" draggable="true" data-drag-school="${s.id}">${schoolLogo(s)}<button data-action="application-detail" data-id="${s.id}"><h3>${s.name}</h3><p>${s.program}</p></button><small>${s.deadline?s.deadline+' · 示例截止':'截止日期按具体项目核验'}</small>${statusSelect(s)}</article>`).join('')}<div class="board-drop-hint">拖放项目到这里</div></section>`).join('')}</div>`;
}
function wordCount(value) {
  const chinese = (value.match(/[\u3400-\u9fff]/g)||[]).length;
  const words = (value.replace(/[\u3400-\u9fff]/g,' ').match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)||[]).length;
  return `${chinese} 个中文字 · ${words} 个英文词`;
}
function documentPage() {
  return WritingWorkspace.render();
}
function profilePage() {
  const field = (name,label,placeholder,type='text') => `<label class="form-field">${label}<input name="${name}" type="${type}" placeholder="${placeholder}" value="${escapeHTML(state.profile[name]||'')}" maxlength="${name==='name'?30:150}" ${name==='name'?'required':''}></label>`;
  const filled=['major','school','gpa','language','budget','goals'].filter(key=>String(state.profile[key]||'').trim()).length;
  return `${heading('从认识自己开始','你的经历和期待，值得被认真看见。','EVERY JOURNEY STARTS WITH YOU')}<div class="profile-layout"><form class="profile-card" data-form="profile"><h2>我的申请档案</h2><p>整理背景，理清目标。之后的选校和文书，都从这里出发。</p><div class="form-grid">${field('name','怎么称呼你','例如：同学')}${field('major','目标专业','例如：计算机科学、金融、教育')}${field('school','本科院校与专业','填写你的教育背景')}${field('gpa','GPA / 成绩体系','例如：3.7 / 4.0')}${field('language','语言成绩','例如：TOEFL 105 / 待考')}${field('budget','总预算','例如：人民币 50–70 万元')}<label class="form-field full">经历与申请目标<textarea name="goals" rows="5" maxlength="5000" placeholder="记录科研、实习、感兴趣的方向，以及你希望通过读研获得什么。">${escapeHTML(state.profile.goals||'')}</textarea></label></div><button class="primary-button" type="submit">保存我的档案 ${icon('check')}</button><div class="profile-note">保存后查看选校建议 · 仅保存在此浏览器</div></form><aside class="profile-aside"><span class="eyebrow">A LITTLE MORE ABOUT YOU</span><div class="profile-progress-ring" style="--progress:${filled/6*100}%"><strong>${Math.round(filled/6*100)}<small>%</small></strong></div><h2>让你的轮廓，更清晰</h2><p>已填写 ${filled} / 6 项背景资料。<br>不必一次填完，随时回来补充。</p><div class="profile-advice">${icon('spark')}专业兴趣、预算和职业目标，比一个孤立的排名更能帮助你选择。</div></aside></div>${ShortlistWorkspace.render()}`;
}
const pages = {programs:ProgramSearch.render,map:MapWorkspace.render,overview, schools:library, applications, documents:documentPage, profile:profilePage};
const pageNames = {programs:'专业搜索',map:'院校地图',overview:'申请总览',schools:'院校资料库',applications:'我的申请',documents:'文书工作区',profile:'我的背景'};
function render() {
  SeasonWorkspace.sync();
  if (activePage !== 'documents') document.body.classList.remove('focus-mode');
  document.querySelector('#main-content').dataset.page = activePage;
  document.querySelector('#main-content').innerHTML = pages[activePage]();
  document.querySelector('#breadcrumb-title').textContent = pageNames[activePage];
  document.querySelector('#breadcrumb-section').textContent = ['schools','programs','map'].includes(activePage)?'探索':'我的工作台';
  document.querySelectorAll('[data-nav]').forEach(el => {
    const active = el.dataset.nav === (activePage === 'map' ? 'schools' : activePage);
    el.classList.toggle('active', active);
    if (active && el.dataset.nav !== 'schools') el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
  syncLibraryNav();
  document.querySelector('#application-count').textContent = ProgramWorkspace.items().length;
  document.querySelector('#account-name').textContent = state.profile.name || '同学';
  document.title = `${pageNames[activePage]} · Gradpath`;
  renderCompareBar();
  VisualMotion.reveal(document.querySelector('#main-content'));
}
function goTo(target, updateURL = true) {
  activePage = pages[target] ? target : 'overview';
  libraryNavOpen = (activePage === 'schools' || activePage === 'map') && !matchMedia('(max-width: 760px)').matches;
  // Single-file previews may run in srcdoc with an opaque origin. A normal
  // fragment link can replace that document, so always render navigation here.
  if (updateURL && location.hash !== `#${activePage}`) {
    try { history.pushState(null, '', `#${activePage}`); } catch { /* The preview can still navigate in memory. */ }
  }
  render();
  window.scrollTo(0,0);
}
function navigate() { goTo(location.hash.slice(1) || 'overview', false); }
function syncLibraryNav() {
  const trigger = document.querySelector('[data-action="toggle-library-nav"]');
  trigger.setAttribute('aria-expanded', String(libraryNavOpen));
  document.querySelector('#library-subnav').hidden = !libraryNavOpen;
  document.querySelectorAll('[data-library-page]').forEach(link => {
    const current = link.dataset.libraryPage === activePage;
    link.classList.toggle('active', current);
    if (current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}
function closeLibraryNav(returnFocus = false) {
  libraryNavOpen = false;
  syncLibraryNav();
  if (returnFocus) document.querySelector('[data-action="toggle-library-nav"]').focus();
}

function toast(message, undo = null) {
  clearTimeout(toastTimer);
  undoAction = undo;
  const el = document.querySelector('#toast');
  el.innerHTML = `${icon('check')}<span>${escapeHTML(message)}</span>${undo?'<button class="toast-undo" data-action="undo">撤销</button>':''}`;
  el.classList.add('visible');
  toastTimer=setTimeout(()=>{el.classList.remove('visible');undoAction=null;},undo?6500:3200);
}
function openModal(title,body) {
  if(!document.querySelector('.modal')) modalReturnFocus=document.activeElement;
  document.querySelector('#modal-root').innerHTML=`<div class="modal-overlay"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-header"><h2 id="modal-title">${escapeHTML(title)}</h2><button class="icon-button" data-action="close-modal" aria-label="关闭对话框">${icon('close')}</button></div>${body}</section></div>`;
  document.body.style.overflow='hidden';
  document.querySelector('.modal .icon-button').focus();
}
function closeModal() {GPTWorkspace.cancel();document.querySelector('#modal-root').innerHTML='';document.body.style.overflow='';if(modalReturnFocus?.isConnected)modalReturnFocus.focus();}
function schoolDetail(id) { ProgramWorkspace.open(id); }

function rankingSourceDialog() {
  const uploaded=rankingEdition.status==='user-provided';
  openModal('2027 榜单来源与核验状态',`<div class="ranking-source-detail"><span class="eyebrow">SOURCE & EDITION</span><h3>U.S. News · 2027</h3><p>全美综合大学 / National Universities</p><div class="detail-grid"><div><span>目标排名年份</span><strong>2027</strong></div><div><span>排名资料来源</span><strong>${uploaded?'用户提供 PDF':rankingEdition.status==='verified'?'官网来源已核验':'等待官方来源核验'}</strong></div><div><span>本份榜单收录</span><strong>${rankedSchools.length} 所院校</strong></div><div><span>${uploaded?'文件导入日期':'来源核验日期'}</span><strong>${uploaded?rankingEdition.importedAt:rankingEdition.verifiedAt||'尚未核验'}</strong></div></div><p>${uploaded?'已逐行录入你提供的 PDF，保留 51 所学校和全部并列名次。文件明确注明：这是便于阅读的整理版，并非 U.S. News 官方出版物；本站尚未独立核验官网。完整院校资料库保留原表顺序与全部并列名次，首页不再陈列学校榜单。':rankingEdition.status==='verified'?`核验日期：${rankingEdition.verifiedAt}。并列名次按原榜单保留，前 50 名不截断边界并列学校。`:'尚未取得可核验的 2027 官方榜单，现有基础目录不等于当年前 50。不会使用 2026 排名或其他榜单替代。'}</p>${uploaded?`<div class="source-document"><span>${icon('document')}</span><div><strong>${escapeHTML(rankingEdition.source.fileName)}</strong><p>${rankingEdition.source.pages} 页 · 51 所学校 · 原始文件已保留</p></div><button class="secondary-button" data-action="download-ranking">${icon('download')}下载来源 PDF</button></div>`:''}<p class="disclaimer">学校名称、城市、性质与官网入口来自 IPEDS HD2023，与 PDF 排名分别标注。综合大学排名不等于各硕士项目排名。</p><div class="modal-actions"><a class="${uploaded?'secondary-button':'primary-button'}" href="${rankingEdition.sourceURL}" target="_blank" rel="noopener noreferrer">U.S. News 官网入口 ↗</a><a class="secondary-button" href="${SchoolCatalog.sources[0].url}" target="_blank" rel="noopener noreferrer">IPEDS 资料来源 ↗</a></div></div>`);
}
function downloadRankingSource() {
  if(!SchoolCatalog.sourcePDFBase64)return;
  const bytes=Uint8Array.from(atob(SchoolCatalog.sourcePDFBase64),char=>char.charCodeAt(0));
  const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
  const link=document.createElement('a');link.href=url;link.download=rankingEdition.source.fileName;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);toast('来源 PDF 已导出');
}
function assistantReply(question) { GPTWorkspace.open(question); }
function localAssistantReply(question) {
  let reply;
  if(/文书|SOP|sop|写作|经历/.test(question)) reply='可以先从一个真实经历开始，而不是急着写开头。\n\n1. 你遇到了什么具体问题？\n2. 你采取了哪些行动，贡献是什么？\n3. 这段经历如何影响了你的学习目标？\n\n去「文书工作区 → My Story Bank」记录这三点，再根据目标项目的正式题目组织内容。';
  else if(/选校|项目|学校|清单/.test(question)) reply=`你的演示清单里有 ${ProgramWorkspace.items().length} 个项目。\n\n建议先补全本科专业、成绩、先修课、预算与职业目标，再逐项比较课程内容和申请要求。排名可以作为浏览入口，项目是否适合你还需要具体分析。\n\n项目目录可以作为探索入口；当季申请要求仍需逐项核对，暂时不能据此给出可靠的背景匹配结论。`;
  else reply=`先把注意力放在能推进的一小步上：\n\n${tasks.filter(t=>!state.completed.includes(t.id)).map((t,i)=>`${i+1}. ${t.title}`).join('\n') || '你已经完成当前示例待办，可以继续核对项目官网和材料要求。'}\n\n下一步可以先挑一项，在「我的申请」中更新进度。`;
  openModal('和申请搭子聊一聊',`<p class="disclaimer">交互演示 · 以下为本地规则回复，尚未连接 AI。</p><div class="chat-question">你：${escapeHTML(question)}</div><div class="chat-message">${escapeHTML(reply)}</div><form class="assistant-input" data-form="chat"><input name="question" placeholder="继续聊聊你的申请…" aria-label="继续向申请助手提问" maxlength="1000" required><button aria-label="发送问题">${icon('send')}</button></form><div class="modal-actions"><a href="#documents" class="secondary-button" data-action="close-link">打开文书工作区 ↗</a><a href="#profile" class="secondary-button" data-action="close-link">完善个人背景 ↗</a></div>`);
}

function renderCompareBar() {
  const root = document.querySelector('#compare-root');
  if (!root) return;
  const selected = schools.filter(s=>comparisonIds.includes(s.id));
  root.innerHTML = selected.length ? `<div class="compare-bar"><span class="compare-bar-label">${icon('compare')}项目对比 <small>${selected.length}/3</small></span><div class="compare-chips">${selected.map(s=>`<button class="compare-chip" data-action="compare-toggle" data-id="${s.id}" aria-label="从对比移除${s.name}">${escapeHTML(s.name)} ×</button>`).join('')}</div><button class="compare-go primary-button" data-action="show-comparison" ${selected.length<2?'disabled':''}>对比项目 ${icon('arrow')}</button><button class="icon-button" data-action="clear-comparison" aria-label="清空对比">${icon('close')}</button></div>` : '';
}
function showComparison() {
  const selected=schools.filter(s=>comparisonIds.includes(s.id));
  if(selected.length<2){toast('在项目卡片上选择 2–3 个项目，就能一起比较');return;}
  const rows=[['项目方向',s=>s.program],['所在城市',s=>s.location],['2027 排名',s=>s.rank],['项目截止日期',s=>s.deadline?`${s.deadline} · 示例待核验`:'按具体项目核验'],['我的申请状态',s=>state.saved.includes(s.id)?state.statuses[s.id]||s.status:'尚未收藏']];
  openModal('项目对比',`<p>把不同的可能，放在一起认真看看。</p><div class="comparison-scroll"><div class="comparison-grid" style="--compare-count:${selected.length}"><div class="comparison-cell comparison-label">比较维度</div>${selected.map(s=>`<div class="comparison-cell comparison-header">${schoolLogo(s)}<strong>${s.name}</strong><small>${s.english}</small></div>`).join('')}${rows.map(([label,getValue])=>`<div class="comparison-cell comparison-label">${label}</div>${selected.map(s=>`<div class="comparison-cell">${escapeHTML(getValue(s))}</div>`).join('')}`).join('')}<div class="comparison-cell comparison-label">了解更多</div>${selected.map(s=>`<div class="comparison-cell"><a class="secondary-button" target="_blank" rel="noopener noreferrer" href="${s.url}">项目官网 ↗</a></div>`).join('')}</div></div><p class="disclaimer">院校基础资料与 2027 排名分开核验。示例项目日期不代表学校统一截止日期；具体硕士项目以官网为准。</p>`);
  document.querySelector('.modal').classList.add('comparison-modal');
}
function addTaskDialog() {
  openModal('安排下一小步',`<p>不用一次做完所有事。从一个具体、可完成的小目标开始。</p><form data-form="task" class="task-add-form"><label class="form-field">待办内容<input name="title" placeholder="例如：整理一段最有代表性的科研经历" maxlength="120" required></label><div class="form-grid"><label class="form-field">关联项目<select name="school"><option>通用申请材料</option>${schools.filter(s=>state.saved.includes(s.id)).map(s=>`<option>${s.name}</option>`).join('')}</select></label><label class="form-field">计划完成日期<input name="due" type="date"></label></div><div class="modal-actions"><button class="primary-button" type="submit">${icon('plus')}创建待办</button><button type="button" class="secondary-button" data-action="close-modal">稍后再说</button></div></form>`);
  document.querySelector('[name="title"]').focus();
}
function commandResults(query='') {
  const q=query.trim().toLowerCase();
  const routes=Object.entries(pageNames).filter(([key,name])=>`${key} ${name}`.toLowerCase().includes(q));
  const projects=schools.filter(s=>`${s.name} ${s.english} ${s.program} ${s.location}`.toLowerCase().includes(q));
  return `${routes.length?'<div class="command-section-label">工作台页面</div>':''}${routes.map(([route,name])=>`<button class="command-result" data-action="command-route" data-page="${route}">${icon(({overview:'dashboard',schools:'school',programs:'search',applications:'folder',documents:'document',profile:'user'})[route])}<span><strong>${name}</strong><small>打开页面</small></span>${icon('arrow')}</button>`).join('')}${projects.length?'<div class="command-section-label">申请项目</div>':''}${projects.map(s=>`<button class="command-result" data-action="command-school" data-id="${s.id}">${schoolLogo(s)}<span><strong>${s.name}</strong><small>${s.program}</small></span>${icon('arrow')}</button>`).join('')}${routes.length+projects.length===0?'<div class="empty-state">暂时没有匹配结果，换个关键词试试。</div>':''}`;
}
function showCommand() {
  commandIndex=-1;
  openModal('去你想去的地方',`<label class="command-search">${icon('search')}<input id="command-query" aria-label="搜索页面或项目" placeholder="搜索学校、专业或页面…" autocomplete="off" maxlength="150"><kbd>ESC</kbd></label><div class="command-results" id="command-results">${commandResults()}</div><div class="command-footer"><span>↑ ↓ 选择 · Enter 打开</span><span>让思路，少一点绕路。</span></div>`);
  document.querySelector('.modal').classList.add('command-modal');
  document.querySelector('#command-query').focus();
}
function refreshLibrary() {
  document.querySelector('#school-results').innerHTML=libraryResults();
  VisualMotion.reveal(document.querySelector('#school-results'));
  document.querySelector('#result-count').textContent=`${matchingSchools().length} 个结果`;
  document.querySelector('[data-action="clear-school-search"]').hidden=!search;
}

document.addEventListener('click',event=>{
  if (libraryNavOpen && matchMedia('(max-width: 760px)').matches && !event.target.closest('.library-nav-group')) closeLibraryNav();
  if(event.target.classList.contains('modal-overlay')){closeModal();return;}
  const link = event.target.closest('a[href^="#"]');
  if (link && pages[link.getAttribute('href').slice(1)]) {
    event.preventDefault();
    closeModal();
    goTo(link.getAttribute('href').slice(1));
    if (link.hasAttribute('data-library-page') && matchMedia('(max-width: 760px)').matches) closeLibraryNav(true);
    return;
  }
  const button=event.target.closest('[data-action]');if(!button)return;
  const {action,id}=button.dataset;
  if(GPTWorkspace.handle(action,button))return;
  if(WritingWorkspace.handle(action,button))return;
  if(MapWorkspace.handle(action,button))return;
  if(ProgramSearch.handle(action,button))return;
  if(ProgramWorkspace.handle(action,button))return;
  if(ApplicationWorkspace.handle(action,button))return;
  if(ShortlistWorkspace.handle(action,button))return;
  if(SeasonWorkspace.handle(action,button))return;
  if (action === 'toggle-library-nav') {
    libraryNavOpen = !libraryNavOpen;
    syncLibraryNav();
    return;
  }
  if(action==='contact-author')contactAuthor();
  if(action==='account')accountDialog();
  if(action==='close-modal'||action==='close-link'){closeModal();return;}
  if(action==='navigate')goTo(button.dataset.page);
  if(action==='undo') {const undo=undoAction;undoAction=null;clearTimeout(toastTimer);document.querySelector('#toast').classList.remove('visible');if(undo)undo();return;}
  if(action==='add-task')addTaskDialog();
  if(action==='command')showCommand();
  if(action==='ranking-source')rankingSourceDialog();
  if(action==='download-ranking')downloadRankingSource();
  if(action==='command-route'){closeModal();goTo(button.dataset.page);}
  if(action==='command-school'){closeModal();schoolDetail(id);}
  if(action==='reset-filters'){search='';activeTier='all';activeDiscipline='all';schoolSort='default';render();}
  if(action==='clear-school-search'){search='';const input=document.querySelector('#school-search');input.value='';refreshLibrary();input.focus();}
  if(action==='application-view'){applicationView=button.dataset.view;render();}
  if(action==='compare-toggle') {
    if(comparisonIds.includes(id)) comparisonIds=comparisonIds.filter(value=>value!==id);
    else if(comparisonIds.length<3)comparisonIds.push(id);
    else {toast('一次最多对比 3 个项目，先移除一个再试试');return;}
    const focused=document.activeElement;
    document.querySelectorAll(`.compare-toggle[data-id="${id}"]`).forEach(el=>{const selected=comparisonIds.includes(id);el.classList.toggle('selected',selected);el.setAttribute('aria-pressed',String(selected));el.innerHTML=`${icon(selected?'check':'compare')}${selected?'已选对比':'加入对比'}`;});
    renderCompareBar();
    if(!focused?.isConnected)document.querySelector(`.compare-toggle[data-id="${id}"]`)?.focus();
  }
  if(action==='show-comparison')showComparison();
  if(action==='clear-comparison'){comparisonIds=[];render();}
  if(action==='bookmark'){
    const removed=state.saved.includes(id);
    state.saved=removed?state.saved.filter(value=>value!==id):[...state.saved,id];
    save();render();if(button.dataset.modal)schoolDetail(id);
    toast(removed?'已从我的申请清单移除':'已加入我的申请清单',()=>{state.saved=removed?[...state.saved,id]:state.saved.filter(value=>value!==id);save();render();if(document.querySelector('.modal'))schoolDetail(id);});
  }
  if(action==='school')schoolDetail(id);
  if(action==='task'){
    const previous=[...state.completed];
    const completed=!state.completed.includes(id);
    state.completed=completed?[...state.completed,id]:state.completed.filter(value=>value!==id);
    save();closeModal();render();
    toast(completed?'又往前一步，做得很好。':'已恢复为待完成',()=>{state.completed=previous;save();render();});
  }
  if(action==='task-filter'){taskFilter=button.dataset.filter;render();}
  if(action==='tier'){activeTier=button.dataset.tier;render();}
  if(action==='edit-doc'){activeDoc=id;state.activeDocumentId=id;save();goTo('documents');}
  if(action==='profile')goTo('profile');
  if(action==='chat')assistantReply(button.dataset.question);
  if(action==='notifications')openModal('申请日历',`${deadlineRows()}<p class="disclaimer">以上为原型示例日期，未按所选申请季核验。实际截止日期与时区请以项目官网为准。</p><a href="#applications" class="primary-button" data-action="close-link">查看我的申请 →</a>`);
  if(action==='task-detail'){
    const task=tasks.find(t=>t.id===id);
    if(!task)return;
    openModal(task.title,`<p>${task.custom?`这是你安排的下一小步。${task.due?`计划在 ${escapeHTML(task.due)} 完成。`:''}<br>关联项目：${escapeHTML(task.school)}`:id==='letter'?'提前联系了解你的老师或合作导师，说明申请目标，并提供简历、经历摘要与项目截止日期。确认推荐人的意愿后，再按项目要求发送正式邀请。':'整理已有成绩单与语言考试报告，逐项核对项目对官方送分、翻译件和有效期的要求。'}</p><p class="disclaimer">具体申请要求以各项目官网为准。</p><div class="modal-actions"><button class="primary-button" data-action="task" data-id="${escapeHTML(id)}">${state.completed.includes(id)?'恢复为待完成':'标记为已完成'} ${icon('check')}</button></div>`);
  }
  if(action==='guide')openModal('你的申请路线图',`<p>每个人的节奏不同。把申请拆成几个清晰的阶段，一步一步来。</p>${[['认识自己','整理教育背景、真实经历、兴趣、预算和读研目标。'],['探索项目','按专业和目标比较项目，核验官网要求，形成申请清单。'],['准备材料','联系推荐人、整理成绩与语言材料，记录文书经历素材。'],['打磨与提交','按项目题目修改文书，核对材料完整性、截止时间和提交状态。'],['等待与选择','记录结果，比较课程、费用与发展方向，做出适合自己的选择。']].map(([title,desc],i)=>`<div class="guide-step"><b>${i+1}</b><div><h3>${title}</h3><p>${desc}</p></div></div>`).join('')}`);
});
document.addEventListener('input',event=>{
  ProgramSearch.onInput(event.target);
  ProgramWorkspace.onInput(event.target);
  MapWorkspace.onInput(event.target);
  if(event.target.id==='school-search'){
    search=event.target.value;refreshLibrary();
  }
  if(event.target.id==='document-editor'){
    WritingWorkspace.onInput(event.target);
  }
  if(event.target.id==='command-query'){commandIndex=-1;document.querySelector('#command-results').innerHTML=commandResults(event.target.value);}
});
document.addEventListener('change',event=>{
  ProgramSearch.onChange(event.target);
  ProgramWorkspace.onChange(event.target);
  ApplicationWorkspace.onChange(event.target);
  MapWorkspace.onChange(event.target);
  ShortlistWorkspace.onChange(event.target);
  if(event.target.dataset.status){const id=event.target.dataset.status;state.statuses[id]=event.target.value;save();render();ApplicationWorkspace.enter(id);}
  if(event.target.id==='discipline-filter'){activeDiscipline=event.target.value;refreshLibrary();}
  if(event.target.id==='school-sort'){schoolSort=event.target.value;refreshLibrary();}
});
document.addEventListener('submit',event=>{
  const form=event.target.closest('[data-form]');if(!form)return;event.preventDefault();
  const data=new FormData(form);
  if(GPTWorkspace.onSubmit(form,data))return;
  if(ApplicationWorkspace.onSubmit(form,data))return;
  if(SeasonWorkspace.onSubmit(form,data))return;
  if(form.dataset.form==='chat'){const question=String(data.get('question')||'').trim();if(question)assistantReply(question);}
  if(form.dataset.form==='task') {
    const title=String(data.get('title')||'').trim().slice(0,120);if(!title)return;
    const task={id:`custom-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,title,school:String(data.get('school')||'通用申请材料'),due:String(data.get('due')||''),category:'个人待办',tag:'待开始',color:'sage',custom:true};
    tasks.push(task);state.customTasks.push(task);save();taskFilter='pending';closeModal();render();toast('新的小目标已加入清单');
  }
  if(form.dataset.form==='profile'){
    state.profile=Object.fromEntries([...data].map(([key,value])=>[key,String(value).trim()]));
    state.profileSaved=true;
    const persisted=save();render();ShortlistWorkspace.show();toast(persisted?'档案已保存，接下来看看选校建议':'档案已更新，暂未保存到浏览器');
  }
});
document.addEventListener('pointerdown',MapWorkspace.pointerDown);
document.addEventListener('pointermove',MapWorkspace.pointerMove);
document.addEventListener('pointerup',MapWorkspace.pointerUp);
document.addEventListener('pointercancel',MapWorkspace.pointerUp);
document.addEventListener('keydown',event=>{
  if (event.key === 'Escape' && libraryNavOpen && !document.querySelector('.modal')) { closeLibraryNav(true); return; }
  MapWorkspace.onKeydown(event);
  const editing=event.target.matches('input,textarea,select,[contenteditable="true"]');
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();showCommand();return;}
  if(event.key==='/'&&!editing&&!document.querySelector('.modal')){event.preventDefault();if(activePage==='schools')document.querySelector('#school-search')?.focus();else showCommand();return;}
  if(event.target.id==='command-query'&&['ArrowDown','ArrowUp','Enter'].includes(event.key)) {
    const results=[...document.querySelectorAll('.command-result')];
    if(results.length){event.preventDefault();if(event.key==='Enter'){results[Math.max(0,commandIndex)]?.click();return;}commandIndex=commandIndex===-1?(event.key==='ArrowDown'?0:results.length-1):(commandIndex+(event.key==='ArrowDown'?1:-1)+results.length)%results.length;results.forEach((el,i)=>el.classList.toggle('highlighted',i===commandIndex));results[commandIndex].scrollIntoView({block:'nearest'});}
    return;
  }
  const modal=document.querySelector('.modal');if(!modal)return;
  if(event.key==='Escape')closeModal();
  if(event.key==='Tab'){
    const focusable=[...modal.querySelectorAll('button,a[href],input,textarea,select')].filter(el=>!el.disabled);
    const first=focusable[0],last=focusable.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});
document.addEventListener('dragstart',event=>{const card=event.target.closest('[data-drag-school]');if(card){event.dataTransfer.setData('text/plain',card.dataset.dragSchool);event.dataTransfer.effectAllowed='move';card.classList.add('dragging');}});
document.addEventListener('dragend',event=>{event.target.closest('[data-drag-school]')?.classList.remove('dragging');document.querySelectorAll('.drop-ready').forEach(el=>el.classList.remove('drop-ready'));});
document.addEventListener('dragover',event=>{const column=event.target.closest('[data-drop-status]');if(column){event.preventDefault();column.classList.add('drop-ready');}});
document.addEventListener('dragleave',event=>{const column=event.target.closest('[data-drop-status]');if(column&&!column.contains(event.relatedTarget))column.classList.remove('drop-ready');});
document.addEventListener('drop',event=>{const column=event.target.closest('[data-drop-status]');if(!column)return;event.preventDefault();const id=event.dataTransfer.getData('text/plain');if(!ProgramWorkspace.items().some(s=>s.id===id))return;state.statuses[id]=column.dataset.dropStatus;save();render();toast(`已更新为「${column.dataset.dropStatus}」`);});
window.addEventListener('hashchange',()=>{closeModal();navigate();});
window.addEventListener('popstate',()=>{closeModal();navigate();});
VisualMotion.init();
hydrateIcons();navigate();

function contactAuthor() {
  openModal('联系作者', `<div class="contact-intro"><span class="contact-symbol">${icon('message')}</span><span class="eyebrow">LET’S MAKE THE NEXT CHAPTER BETTER</span><h3>关于申请，关于这个小站。</h3><p>欢迎交流申请经验、分享使用感受，或一起讨论新的想法。</p></div><div class="contact-links"><a href="https://www.xiaohongshu.com/user/profile/62a89f570000000019028f30" target="_blank" rel="noopener noreferrer"><span>XIAOHONGSHU · 小红书</span><strong>我的小红书主页</strong><b>去主页聊聊 ↗</b></a><a href="https://github.com/Joey-wang-ui" target="_blank" rel="noopener noreferrer"><span>GITHUB · 主页</span><strong>Joey-wang-ui</strong><b>去逛逛 ↗</b></a></div><p class="profile-note">期待与你交流，让申请这段路更清晰一点。</p>`);
}
function accountDialog() {
  openModal('你的专属申请空间', `<div class="account-placeholder"><span class="eyebrow">YOUR SPACE, COMING SOON</span><div class="account-illustration">${icon('user')}</div><h3>登录功能，正在准备中。</h3><p>未来可以拥有自己的账号，<br>在不同设备上继续整理申请、打磨文书。</p><span class="phase-chip">即将开放</span></div><p class="disclaimer">目前无需登录即可使用，内容保存在当前浏览器。换设备前记得导出重要文稿。</p><div class="modal-actions"><button class="primary-button" data-action="close-modal">继续我的申请 ${icon('arrow')}</button><button class="secondary-button" data-action="contact-author">联系作者</button></div>`);
}
