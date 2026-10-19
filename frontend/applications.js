// Project workspaces share the app's state, but keep each school's records separate.
const ApplicationWorkspace = (() => {
  const materials = ['成绩单与学位材料', '语言与其他考试成绩', '个人简历', '个人陈述 / 文书', '推荐信', '其他项目要求'];
  const validSchool = id => ProgramWorkspace.items().find(s=>s.id===id) || (state.projectDocuments.includes(id)?ProgramWorkspace.resolve(id):undefined);
  function record(id) {
    if (!state.applicationDetails[id] || typeof state.applicationDetails[id] !== 'object') state.applicationDetails[id] = {};
    return state.applicationDetails[id];
  }
  function prepareDocument(id) {
    const school = ProgramWorkspace.resolve(id);
    if (!school) return null;
    const docId = `sop-${id}`;
    if (!documents.some(d => d.id === docId)) documents.push({
      id: docId, schoolId: school.schoolId || id, applicationId: id, name: 'Statement of Purpose', label: '项目个人陈述',
      subtitle: `${school.name} · ${record(id).projectName || school.program}${school.collegeName?' · '+school.collegeName:''}`,
      prompt: '先在项目官网核对正式文书题目和字数，再用真实经历组织回答。这里提供通用写作提纲。',
      initial: '申请动机\n\n[用真实经历说明你的学术兴趣。]\n\n学术与实践准备\n\n[写清楚问题、你的行动和可核实的成果。]\n\n为什么选择这个项目\n\n[核对课程与研究资源，说明它们与你目标的联系。]\n\n未来计划\n\n[写下你希望继续探索的方向。]',
    });
    return docId;
  }
  function open(id, tab = 'overview') {
    const school = validSchool(id); if (!school) return;
    const data = record(id);
    const completed = Array.isArray(data.materials) ? data.materials : [];
    const tabs = [['overview','项目详情'],['materials','材料清单'],['submission','提交核对'],['tracking','结果跟踪']];
    if (!tabs.some(([key]) => key === tab)) tab = 'overview';
    let body;
    if (tab === 'overview') body = `<form data-form="application" data-id="${id}" class="application-form"><label class="form-field">申请项目<input name="projectName" value="${escapeHTML(data.projectName || school.program)}" maxlength="150" required></label><label class="form-field">项目申请入口<input name="portalURL" type="url" placeholder="https://…" value="${escapeHTML(data.portalURL || '')}" maxlength="1000"></label><label class="form-field">申请笔记<textarea name="notes" rows="4" maxlength="5000" placeholder="记录项目要求、截止日期与下一步">${escapeHTML(data.notes || '')}</textarea></label><button class="primary-button" type="submit">保存项目资料 ${icon('check')}</button></form>`;
    if (tab === 'materials' || tab === 'submission') body = `<p>${tab === 'submission'?'提交前，再逐项核对一次。':'把需要准备的材料，逐项整理好。'}</p><p class="disclaimer">通用准备清单，可勾选的条目用于个人记录。具体要求、豁免条件与截止时间以项目官网为准。</p><div class="material-checklist">${materials.map((name,i)=>`<label><input type="checkbox" data-material="${i}" data-id="${id}" ${completed.includes(i)?'checked':''}><span>${name}</span>${i===3?`<button type="button" class="text-button" data-action="application-write" data-id="${id}">去写作 ↗</button>`:''}</label>`).join('')}</div><div class="application-progress" role="status">已整理 <strong id="material-count">${completed.length}</strong> / ${materials.length} 项</div>${tab==='submission'?'<p class="disclaimer">勾选仅记录本地准备进度。请到项目官方申请系统上传、付费并确认提交。</p>':''}`;
    if (tab === 'tracking') body = `<form data-form="application-tracking" data-id="${id}" class="application-form"><p>记录官方系统的通知，随时回来更新。</p><label class="form-field">结果记录<select name="result">${['等待通知','面试邀请','录取','候补','未录取','其他'].map(value=>`<option ${data.result===value?'selected':''}>${value}</option>`).join('')}</select></label><label class="form-field">跟进备注<textarea name="trackingNotes" rows="4" maxlength="5000" placeholder="记录通知日期、后续安排或需要确认的事情">${escapeHTML(data.trackingNotes || '')}</textarea></label><button class="primary-button" type="submit">保存跟踪记录 ${icon('check')}</button></form>`;
    const portal = safePortal(data.portalURL);
    openModal(`${school.name} · ${school.programId?school.programName+' · ':''}申请详情`, `<div class="application-context"><span class="eyebrow">YOUR APPLICATION</span><p>${escapeHTML(data.projectName || school.program)}</p>${school.collegeName?`<small>${escapeHTML(school.collegeName)}</small>`:''}<span class="phase-chip">${escapeHTML(state.statuses[id] || school.status)}</span></div><div class="application-tabs" role="tablist" aria-label="申请工作区">${tabs.map(([key,title])=>`<button role="tab" aria-selected="${key===tab}" data-action="application-tab" data-id="${id}" data-tab="${key}">${title}</button>`).join('')}</div><div class="application-panel" role="tabpanel">${body}</div><div class="modal-actions"><button class="secondary-button" data-action="application-write" data-id="${id}">${icon('document')}打开项目文书</button><a class="secondary-button" href="${escapeHTML(portal || (school.programId?school.url:school.homepage))}" target="_blank" rel="noopener noreferrer">${portal?'官方申请入口':school.programId?'官方项目参考入口':'学校官网'} ↗</a><button class="secondary-button" data-action="school" data-id="${school.schoolId || school.id}">查看学院与项目</button>${school.programId?`<button class="text-button program-remove-button" data-action="program-remove" data-id="${id}">移出此项目</button>`:''}</div><p class="profile-note">个人记录保存在此浏览器。</p>`);
  }
  function safePortal(value) {
    try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
  }
  function write(id) {
    if (!validSchool(id)) return;
    const docId = prepareDocument(id);
    if (!state.projectDocuments.includes(id)) state.projectDocuments.push(id);
    activeDoc = docId; state.activeDocumentId = docId; save(); closeModal(); goTo('documents');
  }
  function enter(id) {
    const school = validSchool(id); if (!school) return;
    const stage = state.statuses[id] || school.status;
    if (stage === '文书撰写') { write(id); return; }
    open(id, {'准备材料':'materials','准备提交':'submission','已提交':'tracking','收到结果':'tracking'}[stage] || 'overview');
  }
  function handle(action, button) {
    const id = button.dataset.id;
    if (action === 'application-detail') open(id);
    else if (action === 'application-enter') enter(id);
    else if (action === 'application-write') write(id);
    else if (action === 'application-tab') open(id, button.dataset.tab);
    else return false;
    return true;
  }
  function onChange(input) {
    if (!input.hasAttribute('data-material') || !validSchool(input.dataset.id)) return;
    const data = record(input.dataset.id);
    const index = Number(input.dataset.material);
    const checked = Array.isArray(data.materials) ? data.materials.filter(i => i !== index) : [];
    if (input.checked) checked.push(index);
    data.materials = checked; save();
    document.querySelector('#material-count').textContent = checked.length;
  }
  function onSubmit(form, values) {
    if (!['application','application-tracking'].includes(form.dataset.form)) return false;
    const id = form.dataset.id; if (!validSchool(id)) return true;
    const data = record(id);
    if (form.dataset.form === 'application') {
      const portal = String(values.get('portalURL') || '').trim();
      if (portal && !safePortal(portal)) { toast('申请入口请填写 HTTPS 链接'); return true; }
      Object.assign(data, {projectName:String(values.get('projectName') || '').trim().slice(0,150), portalURL:portal, notes:String(values.get('notes') || '').slice(0,5000)});
      const doc = documents.find(d => (d.applicationId || d.schoolId) === id);
      if (doc) doc.subtitle = `${validSchool(id).name} · ${data.projectName}${validSchool(id).collegeName?' · '+validSchool(id).collegeName:''}`;
    } else Object.assign(data, {result:String(values.get('result')), trackingNotes:String(values.get('trackingNotes') || '').slice(0,5000)});
    const persisted = save();
    render();
    if (form.dataset.form === 'application') open(id);
    toast(persisted?'项目记录已保存在此浏览器':'记录已更新，请保留备份');
    return true;
  }
  return {prepareDocument, open, enter, handle, onChange, onSubmit};
})();
