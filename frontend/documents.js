// Loaded before app.js in both the regular app and the standalone preview.
// App state is read only when a workspace method is called.
const WritingWorkspace = (() => {
  let versionSequence = 0;

  const getDocument = (id = activeDoc) => documents.find(doc => doc.id === id) || documents[0];
  const getValue = doc => String(state.drafts[doc.id] ?? doc.initial);
  const currentValue = doc => {
    const editor = document.querySelector('#document-editor');
    return editor && doc.id === activeDoc ? editor.value : getValue(doc);
  };
  const getVersions = id => Array.isArray(state.versions?.[id])
    ? state.versions[id].filter(item => item && typeof item.id === 'string' && typeof item.content === 'string')
    : [];

  function measure(value) {
    const text = value.trim();
    return {
      characters: value.replace(/\s/g, '').length,
      words: (value.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || []).length,
      paragraphs: text ? text.split(/\n\s*\n/).filter(part => part.trim()).length : 0,
      placeholders: (value.match(/\[[^\]\n]+\]|【[^】\n]+】/g) || []).length,
    };
  }

  function saveStatus() {
    return typeof storageAvailable !== 'undefined' && !storageAvailable
      ? '未保存，请导出备份'
      : '内容自动保存在此浏览器';
  }

  function steps(doc, value) {
    const stats = measure(value);
    const started = value.trim().length > 0 && value !== doc.initial;
    return [
      {title: '留下真实的素材', detail: '先写清楚经历，再寻找表达。', done: started},
      {title: '把故事慢慢展开', detail: '补全模板，连接行动与收获。', done: started && !stats.placeholders && stats.characters >= 80},
      {title: '留住一个好版本', detail: '手动保存节点，随时回看。', done: getVersions(doc.id).length > 0},
    ];
  }

  function progressHTML(doc, value) {
    return steps(doc, value).map((step, index) => `<div class="writing-step ${step.done ? 'is-complete' : ''}"><b>${step.done ? '✓' : String(index + 1).padStart(2, '0')}</b><div><strong>${step.title}</strong><span>${step.detail}</span></div></div>`).join('');
  }

  function renderWorkspace() {
    const doc = getDocument();
    const value = getValue(doc);
    const stats = measure(value);
    const focused = document.body.classList.contains('focus-mode');
    return `${heading('写下你的申请故事', '从一段真实经历开始，慢慢写出属于自己的答案。', 'A SPACE FOR YOUR OWN WORDS', `<button class="secondary-button focus-button" data-action="focus-writing" aria-pressed="${focused}">${icon(focused ? 'close' : 'focus')}${focused ? '退出专注' : '专注写作'}</button>`)}
      ${doc.schoolId?`<div class="document-project-context"><span>${escapeHTML(doc.subtitle)}</span><button class="text-button" data-action="application-detail" data-id="${doc.applicationId || doc.schoolId}">返回项目申请 ↗</button></div>`:''}
      <div class="document-layout">
        <aside class="document-list" aria-label="文书列表">
          ${documents.map((item, index) => `<button class="document-card ${doc.id === item.id ? 'active' : ''}" data-action="select-doc" data-id="${escapeHTML(item.id)}" aria-pressed="${doc.id === item.id}"><div class="document-card-top">${icon('document')}<span>0${index + 1}</span></div><h3>${escapeHTML(item.name)}</h3><p>${escapeHTML(item.subtitle)}</p><div class="document-card-bottom"><span>${escapeHTML(item.label)}</span><span>${Object.prototype.hasOwnProperty.call(state.drafts, item.id) ? '草稿已编辑' : '从这里开始'} ↗</span></div></button>`).join('')}
          <section class="writing-tips"><div class="eyebrow">A LITTLE WRITING RITUAL</div><h3>好故事，一步步写成。</h3><div id="writing-progress">${progressHTML(doc, value)}</div></section>
        </aside>
        <section class="editor" aria-label="文书编辑区">
          <div class="editor-top"><div class="editor-title-meta"><span class="eyebrow">${escapeHTML(doc.label)} · YOUR DRAFT</span><h2>${escapeHTML(doc.name)}</h2><p>${escapeHTML(doc.subtitle)}</p></div><span class="save-status" id="save-status" role="status">${saveStatus()}</span></div>
          <div class="editor-tools"><div class="editor-tool-group"><button class="primary-button gpt-writing-button" data-action="gpt-document">${icon('spark')}与 GPT 打磨</button><button class="secondary-button" data-action="save-version">${icon('plus')}保存版本</button><button class="secondary-button" data-action="version-history" aria-label="查看历史版本">${icon('clock')}查看历史版本<span id="version-count">${getVersions(doc.id).length ? ` · ${getVersions(doc.id).length}` : ''}</span></button></div><button class="secondary-button" data-action="writing-check">${icon('check')}写作检查</button></div>
          <div class="editor-prompt"><span>${icon('spark')}写作小提示</span><p>${escapeHTML(doc.prompt)}</p></div>
          <div class="document-meta"><span>PRIVATE DRAFT · 仅此浏览器</span><span id="paragraph-count">${stats.paragraphs} 段内容</span></div>
          <textarea id="document-editor" aria-label="${escapeHTML(doc.name)}编辑器" spellcheck="false" placeholder="把光标放在这里，开始你的故事…">${escapeHTML(value)}</textarea>
          <div class="editor-bottom"><span id="word-count">${wordCount(value)}</span><button class="secondary-button" data-action="export">${icon('download')}导出文稿</button></div>
        </section>
      </div><p class="profile-note">草稿和版本保存在当前浏览器。定期导出一份，让认真写下的每一句话都有备份。</p>`;
  }

  function updateSaveStatus(persisted) {
    const status = document.querySelector('#save-status');
    if (status) status.textContent = persisted ? '✓ 已保存到此浏览器' : '未保存，请导出备份';
  }

  function onInput(textarea) {
    const doc = getDocument();
    state.drafts[doc.id] = textarea.value;
    updateSaveStatus(save());
    const count = document.querySelector('#word-count');
    const paragraphs = document.querySelector('#paragraph-count');
    const progress = document.querySelector('#writing-progress');
    if (count) count.textContent = wordCount(textarea.value);
    if (paragraphs) paragraphs.textContent = `${measure(textarea.value).paragraphs} 段内容`;
    if (progress) progress.innerHTML = progressHTML(doc, textarea.value);
  }

  function addVersion(doc, content) {
    const snapshot = {
      id: `draft-${Date.now()}-${++versionSequence}`,
      date: new Date().toISOString(),
      content,
    };
    if (!state.versions || typeof state.versions !== 'object' || Array.isArray(state.versions)) state.versions = {};
    state.versions[doc.id] = [snapshot, ...getVersions(doc.id)].slice(0, 12);
    return snapshot;
  }

  function formattedDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '时间未记录' : date.toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
  }

  function showHistory() {
    const doc = getDocument();
    const history = getVersions(doc.id);
    openModal('文书版本', `<p>${escapeHTML(doc.name)} · ${history.length} 个已保存版本</p><div class="draft-history">${history.length ? history.map((version, index) => `<article class="draft-history-item"><div class="draft-history-heading"><strong>${index === 0 ? '最近保存' : `历史版本 ${history.length - index}`}</strong><time>${escapeHTML(formattedDate(version.date))}</time></div><p>${escapeHTML(version.content.slice(0, 130) || '空白文稿')}${version.content.length > 130 ? '…' : ''}</p><div class="draft-history-bottom"><span>${escapeHTML(wordCount(version.content))}</span><button class="secondary-button" data-action="restore-version" data-id="${escapeHTML(doc.id)}" data-version="${escapeHTML(version.id)}">恢复此版本</button></div></article>`).join('') : '<div class="empty-state">还没有保存过版本。<br>写到一个满意的节点，点击「保存版本」。</div>'}</div><p class="disclaimer">最多保留最近 12 个手动版本。恢复前会保留当前内容；版本也只保存在当前浏览器。</p>`);
  }

  function showCheck() {
    const doc = getDocument();
    const value = currentValue(doc);
    const stats = measure(value);
    const checks = [
      {done: Boolean(value.trim()), title: '内容已开始', detail: value.trim() ? `${stats.characters} 个非空白字符，${stats.words} 个英文词。` : '先写下一段经历，哪怕只有一句话。'},
      {done: stats.placeholders === 0, title: '模板占位符', detail: stats.placeholders ? `发现 ${stats.placeholders} 处方括号占位内容，提交前请替换成真实信息。` : '未发现方括号占位内容。'},
      {done: stats.paragraphs > 1, title: '段落结构', detail: stats.paragraphs > 1 ? `当前有 ${stats.paragraphs} 段内容，可以逐段核对每段的作用。` : '可以使用空行分段，让经历、行动与思考更容易阅读。'},
    ];
    openModal('写作检查', `<p>${escapeHTML(doc.name)}</p>${checks.map(check => `<div class="guide-step"><b>${check.done ? '✓' : '·'}</b><div><h3>${check.title}</h3><p>${escapeHTML(check.detail)}</p></div></div>`).join('')}<p class="disclaimer">这是本地格式检查。请另外核对项目正式题目、字数上限，以及每段经历和成果的真实性。</p><div class="modal-actions"><button class="primary-button" data-action="close-modal">继续写作 ${icon('arrow')}</button></div>`);
  }

  function handle(action, button) {
    if (action === 'select-doc') {
      if (documents.some(doc => doc.id === button.dataset.id)) {activeDoc = button.dataset.id; state.activeDocumentId = activeDoc; save();}
      render();
      return true;
    }
    if (action === 'focus-writing') {
      const editor = document.querySelector('#document-editor');
      const cursor = editor?.selectionStart || 0;
      document.body.classList.toggle('focus-mode');
      render();
      const nextEditor = document.querySelector('#document-editor');
      nextEditor?.focus({preventScroll: true});
      nextEditor?.setSelectionRange(cursor, cursor);
      return true;
    }
    if (action === 'save-version') {
      const doc = getDocument();
      const value = currentValue(doc);
      state.drafts[doc.id] = value;
      addVersion(doc, value);
      const persisted = save();
      render();
      updateSaveStatus(persisted);
      toast(persisted ? '已保存一个新版本，随时可以回来看看' : '版本暂存于本次页面，请导出备份');
      return true;
    }
    if (action === 'version-history') {
      showHistory();
      return true;
    }
    if (action === 'restore-version') {
      const doc = getDocument(button.dataset.id);
      const version = getVersions(doc.id).find(item => item.id === button.dataset.version);
      if (!version) { toast('没有找到这个版本，请重新打开版本记录'); return true; }
      addVersion(doc, currentValue(doc));
      state.drafts[doc.id] = version.content;
      activeDoc = doc.id;
      state.activeDocumentId = activeDoc;
      const persisted = save();
      closeModal();
      render();
      updateSaveStatus(persisted);
      toast(persisted ? '已恢复版本，恢复前的内容也已保留' : '已恢复版本，请导出备份');
      return true;
    }
    if (action === 'writing-check') {
      showCheck();
      return true;
    }
    if (action === 'export') {
      const doc = getDocument();
      const content = currentValue(doc);
      const url = URL.createObjectURL(new Blob([content], {type: 'text/plain;charset=utf-8'}));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Gradpath-${doc.name}-${doc.subtitle}-${state.cycleYear}Fall.txt`.replace(/[\\/:*?"<>|]/g,'-');
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('文稿已导出为 TXT 文件');
      return true;
    }
    return false;
  }

  return {render: renderWorkspace, handle, onInput};
})();
