// The profile is shared; application lists, drafts and reviews belong to one season.
const SeasonWorkspace = (() => {
  const fields = ['saved','completed','drafts','statuses','customTasks','versions','applicationDetails','projectDocuments','activeDocumentId','cycleReview','programChoices'];
  const currentYear = new Date().getFullYear();
  const validYear = value => Number.isInteger(Number(value)) && Number(value)>=2000 && Number(value)<=2100;
  function phase(year = state.cycleYear) { return year<=currentYear?'申请复盘':year===currentYear+1?'进行中':'提前准备'; }
  function open() {
    const years = [...new Set([2026,2027,2028,state.cycleYear,...Object.keys(state.cycleArchives).map(Number)])].filter(validYear).sort((a,b)=>a-b);
    openModal('选择你的申请季', `<div class="season-intro"><span class="eyebrow">EVERY CHAPTER HAS ITS OWN SPACE</span><h3>回看走过的路，也准备下一站。</h3><p>选择入学年份。每个申请季单独保存选校清单、进度和文书，个人背景可以继续沿用。</p></div><div class="season-options">${years.map(year=>`<button class="season-option ${year===state.cycleYear?'selected':''}" data-action="switch-season" data-year="${year}" aria-pressed="${year===state.cycleYear}"><span class="season-year">${String(year).slice(-2)}</span><span><strong>${year} Fall</strong><small>${year<=currentYear?'回顾结果 · 整理个人总结':year===currentYear+1?'整理申请 · 继续往前':'提前探索 · 试用申请流程'}</small></span><b>${year===state.cycleYear?'当前申请季':phase(year)}</b>${icon(year===state.cycleYear?'check':'arrow')}</button>`).join('')}</div><form data-form="add-season" class="add-season-form"><label class="form-field">其他入学年份<input type="number" name="year" min="2000" max="2100" step="1" placeholder="例如：2025 或 2029" required></label><button class="secondary-button" type="submit">打开这个申请季 ${icon('arrow')}</button></form><p class="disclaimer">申请季与排名年份分别记录。切换申请季后，院校资料库仍展示当前收录的 2027 PDF 排名。</p>`);
  }
  function switchTo(value) {
    const year = Number(value); if (!validYear(year)) {toast('请填写 2000–2100 之间的年份');return;}
    if (year===state.cycleYear) {closeModal();return;}
    // Clone snapshots to prevent later checkbox/editor mutations from touching another season.
    state.cycleArchives[state.cycleYear] = JSON.parse(JSON.stringify(Object.fromEntries(fields.map(key=>[key,state[key]]))));
    const target = state.cycleArchives[year] || {};
    const defaults = {saved:[],completed:[],drafts:{},statuses:{},customTasks:[],versions:{},applicationDetails:{},projectDocuments:[],activeDocumentId:'sop',cycleReview:{},programChoices:{}};
    for (const key of fields) state[key] = JSON.parse(JSON.stringify(target[key] ?? defaults[key]));
    state.cycleYear = year;
    state.saved = state.saved.filter(id=>schools.some(s=>s.id===id));
    tasks.splice(0,tasks.length,...baseTasks.map(t=>({...t,school:t.id==='sop'?'通用申请材料':t.school})),...state.customTasks);
    documents.splice(0,documents.length,...baseDocuments.map(d=>({...d})));
    state.projectDocuments.forEach(id=>ApplicationWorkspace.prepareDocument(id));
    activeDoc = documents.some(d=>d.id===state.activeDocumentId)?state.activeDocumentId:'sop';
    comparisonIds=[];taskFilter='pending';applicationView='list';
    const persisted = save();closeModal();goTo('overview');
    toast(persisted?`已切换到 ${year} Fall · ${phase(year)}`:`已切换到 ${year} Fall，浏览器暂未允许保存`);
  }
  function sync() {
    const chooser = document.querySelector('.workspace-select');
    chooser.setAttribute('aria-label',`切换申请季，当前 ${state.cycleYear} Fall`);
    chooser.innerHTML = `<span class="workspace-icon">${String(state.cycleYear).slice(-2)}</span><span class="workspace-copy">我的申请季<small>${state.cycleYear} FALL <span>${phase()}</span></small></span><span class="chevrons" aria-hidden="true">⌃<br>⌄</span>`;
    document.querySelectorAll('[data-cycle-short]').forEach(el=>{el.textContent=String(state.cycleYear).slice(-2);});
    document.querySelector('.season-mobile-button').setAttribute('aria-label',`切换申请季，当前 ${state.cycleYear} Fall`);
    document.querySelectorAll('[data-cycle-label]').forEach(el=>{el.textContent=`${state.cycleYear} Fall`;});
  }
  function overview() {
    if (state.cycleYear>currentYear) {
      if (state.cycleYear===2027) return '';
      return `<section class="season-welcome"><span class="eyebrow">A NEW CHAPTER, AT YOUR OWN PACE</span><h2>${state.cycleYear} Fall，先从了解自己开始。</h2><p>这份申请空间属于新的申请季。完善背景、探索选校，再一步步试用材料与文书工作区。</p><a class="primary-button" href="#profile">从背景与选校开始 ${icon('arrow')}</a></section>`;
    }
    const data=state.cycleReview;
    return `<section class="season-review" aria-label="申请季复盘"><div><span class="eyebrow">LOOK BACK · MOVE FORWARD</span><h2>${state.cycleYear} Fall · 留下你的申请总结。</h2><p>申请的每一次选择，都能成为下一次出发的经验。记录只保存在你的浏览器。</p></div><form data-form="season-review"><label class="form-field">最终去向<input name="destination" maxlength="200" placeholder="学校、项目，或你的下一步计划" value="${escapeHTML(data.destination || '')}"></label><label class="form-field">我的申请总结<textarea name="reflection" rows="5" maxlength="10000" placeholder="哪些准备最有效？哪些地方想重来一次？有什么建议想留给未来的自己？">${escapeHTML(data.reflection || '')}</textarea></label><button class="primary-button" type="submit">保存这段申请经历 ${icon('check')}</button></form></section>`;
  }
  function handle(action, button) {
    if (action==='choose-season') open();
    else if (action==='switch-season') switchTo(button.dataset.year);
    else return false;
    return true;
  }
  function onSubmit(form, data) {
    if (form.dataset.form==='add-season') {switchTo(data.get('year'));return true;}
    if (form.dataset.form!=='season-review') return false;
    state.cycleReview = {destination:String(data.get('destination') || '').trim().slice(0,200),reflection:String(data.get('reflection') || '').slice(0,10000)};
    const persisted = save();toast(persisted?'这一年的申请总结已保存':'总结已更新，浏览器暂未允许保存');return true;
  }
  return {phase, open, sync, overview, handle, onSubmit};
})();
