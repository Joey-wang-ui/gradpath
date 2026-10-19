// Conversation stays in memory. Only explicitly attached context is sent to the server.
const GPTWorkspace = (() => {
  let messages = [];
  let session = '';
  let docId = '';
  let service = null;
  let controller = null;
  let generation = 0;
  let lastQuestion = '';
  let sharing = {profile:false, document:false, plans:false};
  const isOpen = () => Boolean(document.querySelector('#gpt-chat'));
  const contextDocument = () => documents.find(d=>d.id===docId);

  function drawMessages() {
    const root=document.querySelector('#gpt-messages');if(!root)return;
    root.innerHTML = messages.length ? messages.map(m=>`<article class="gpt-message ${m.role}"><span>${m.role==='user'?'你':'GRADPATH · GPT'}</span><div>${escapeHTML(m.content)}</div></article>`).join('') : '<div class="gpt-welcome"><span>✳</span><h3>从你的真实经历开始。</h3><p>一起梳理素材、搭建提纲，或逐段打磨表达。</p></div>';
    root.scrollTop=root.scrollHeight;
  }
  function showError(message, retry=false) {
    const root=document.querySelector('#gpt-feedback');if(!root)return;
    root.innerHTML=`<p role="alert">${escapeHTML(message)}</p>${retry?'<button class="text-button" data-action="gpt-retry">重试这次提问 ↗</button>':''}`;
  }
  function pending(value) {
    document.querySelector('#gpt-chat')?.setAttribute('aria-busy',String(value));
    document.querySelectorAll('#gpt-chat button[type="submit"], #gpt-chat input').forEach(el=>el.disabled=value);
    const cancel=document.querySelector('[data-action="gpt-cancel"]');if(cancel)cancel.hidden=!value;
    const progress=document.querySelector('#gpt-progress');if(progress)progress.textContent=value?'GPT 正在整理思路…':'';
  }
  async function checkService() {
    const marker=generation;
    const timeout=new AbortController();const timer=setTimeout(()=>timeout.abort(),7000);
    try {
      if(!/^https?:$/.test(location.protocol))throw new Error('standalone');
      const result=await fetch('/api/assistant/status',{signal:timeout.signal,cache:'no-store'});
      if(!result.ok)throw new Error('unavailable');
      const data=await result.json();
      if(typeof data.available!=='boolean')throw new Error('unavailable');
      if(marker!==generation||!isOpen())return;
      service=data;
      document.querySelector('#gpt-service').textContent=data.available?'GPT 已连接 · '+data.model:'GPT 尚未开启';
      if(!data.available)showError('GPT 服务尚未配置，请联系作者开启。也可以先使用本地写作提示。');
    } catch {
      if(marker!==generation||!isOpen())return;
      service={available:false};
      document.querySelector('#gpt-service').textContent='GPT 暂不可用';
      showError('当前预览未连接 GPT 服务。启动配套服务后即可使用，也可以先使用本地写作提示。');
    } finally {clearTimeout(timer);}
  }
  function snapshot() {
    const ctx={cycleYear:state.cycleYear};
    if(sharing.profile)ctx.profile={...state.profile};
    if(sharing.document) {
      const doc=contextDocument();
      if(doc)ctx.document={title:doc.name,project:doc.subtitle,prompt:doc.prompt,content:String(state.drafts[doc.id]??doc.initial)};
    }
    if(sharing.plans) {
      ctx.projects=ProgramWorkspace.items().slice(0,10).map(s=>`${s.name} · ${s.program}`);
      ctx.tasks=tasks.filter(t=>!state.completed.includes(t.id)).slice(0,10).map(t=>t.title);
    }
    return ctx;
  }
  function open(question='', options={}) {
    cancel();
    const wanted=options.document?activeDoc:'';
    const nextSession=`${state.cycleYear}:${wanted||'general'}`;
    if(session!==nextSession){messages=[];sharing={profile:false,document:false,plans:false};session=nextSession;}
    docId=wanted;service=null;
    const doc=contextDocument();
    openModal(doc?'和 GPT 打磨这篇文稿':'和申请搭子聊一聊',`<div id="gpt-chat" aria-busy="false"><div class="gpt-topline"><span class="gpt-provider">${icon('spark')}GPT · 申请与文书助手</span><span id="gpt-service" role="status">正在检查连接…</span></div>${doc?`<div class="gpt-document-context">${icon('document')}<div><strong>${escapeHTML(doc.name)}</strong><span>${escapeHTML(doc.subtitle)}</span></div></div>`:''}<div class="gpt-messages" id="gpt-messages" role="log" aria-label="与 GPT 的对话" aria-live="polite"></div><div id="gpt-progress" class="gpt-progress" role="status"></div><div id="gpt-feedback" class="gpt-feedback"></div><form data-form="gpt" class="gpt-form"><fieldset class="gpt-sharing"><legend>本次附上</legend><label><input type="checkbox" name="profile" ${sharing.profile?'checked':''}>个人背景</label>${doc?`<label><input type="checkbox" name="document" ${sharing.document?'checked':''}>当前文稿</label>`:''}<label><input type="checkbox" name="plans" ${sharing.plans?'checked':''}>项目与待办</label></fieldset><label class="sr-only" for="gpt-question">向 GPT 提问</label><textarea id="gpt-question" name="question" placeholder="想从哪里开始？例如：这段经历该怎么展开…" maxlength="4000" rows="3" required>${escapeHTML(question)}</textarea><div class="gpt-send-row"><span>发送后，问题及勾选的资料将交给 OpenAI 处理。</span><button class="primary-button" type="submit">发送 ${icon('send')}</button></div></form><div class="gpt-bottom-actions"><button class="text-button" data-action="gpt-local">本地写作提示 ↗</button><button class="text-button" data-action="gpt-clear">清空对话</button><button class="text-button" data-action="gpt-cancel" hidden>停止等待</button></div><p class="gpt-footnote">建议供你参考，原稿由你决定如何修改。对话仅在本次页面保留。</p></div>`);
    document.querySelector('.modal').classList.add('gpt-modal');
    drawMessages();checkService();
    document.querySelector('#gpt-question').focus();
  }
  async function send(question, retry=false) {
    if(controller)return;
    question=String(question||'').trim();if(!question)return;
    const form=document.querySelector('[data-form="gpt"]');if(!form)return;
    const data=new FormData(form);
    sharing={profile:data.has('profile'),document:data.has('document'),plans:data.has('plans')};
    if(!service?.available){showError('GPT 暂不可用，请联系作者开启服务，或先使用本地写作提示。');checkService();return;}
    const ctx=snapshot();
    if(ctx.document?.content.length>32000){showError('当前文稿超过 32,000 字符，请先缩短文稿，或取消附上当前文稿。');return;}
    document.querySelector('#gpt-feedback').innerHTML='';
    lastQuestion=question;
    if(!retry)messages.push({role:'user',content:question});
    drawMessages();pending(true);
    document.querySelector('#gpt-question').value='';
    const thisRequest=new AbortController();controller=thisRequest;
    const marker=generation;const timer=setTimeout(()=>thisRequest.abort('timeout'),55000);
    try {
      const response=await fetch('/api/assistant/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:messages.slice(-12),context:ctx}),signal:thisRequest.signal});
      const payload=await response.json();
      if(!response.ok)throw new Error(payload.error?.message||'GPT 暂时没有完成回复，请重试。');
      if(typeof payload.reply!=='string'||!payload.reply.trim())throw new Error('GPT 没有返回文本，请重试。');
      if(marker!==generation||!isOpen())return;
      messages.push({role:'assistant',content:payload.reply});drawMessages();
    } catch(error) {
      if(marker===generation&&isOpen())showError(error.name==='AbortError'?'等待超时，请稍后重试。':error.message||'连接失败，请重试。',true);
    } finally {
      clearTimeout(timer);
      if(controller===thisRequest){controller=null;if(marker===generation&&isOpen())pending(false);}
    }
  }
  function cancel() {generation++;if(controller){controller.abort();controller=null;}if(isOpen())pending(false);}
  function handle(action) {
    if(action==='gpt-document'){open('请帮我梳理这篇文稿的结构、具体贡献和还需要补充的细节。',{document:true});}
    else if(action==='gpt-retry')send(lastQuestion,true);
    else if(action==='gpt-clear'){cancel();messages=[];drawMessages();document.querySelector('#gpt-feedback').innerHTML='';checkService();}
    else if(action==='gpt-cancel'){cancel();showError('已停止等待；服务端可能仍在处理本次问题。',true);}
    else if(action==='gpt-local'){const question=document.querySelector('#gpt-question')?.value||lastQuestion||'文书不知道从哪里开始';cancel();localAssistantReply(question);}
    else return false;
    return true;
  }
  function onSubmit(form,data){if(form.dataset.form!=='gpt')return false;send(data.get('question'));return true;}
  return {open,handle,onSubmit,cancel};
})();
