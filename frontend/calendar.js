// A local timeline for the current season; catalogue dates remain marked as examples.
const ApplicationCalendar = (() => {
  let opened=false;
  let selectedMonth;
  const root=()=>document.querySelector('#application-calendar');
  const trigger=()=>document.querySelector('.calendar-toggle');
  const monthKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
  function entries() {
    const projects=ProgramWorkspace.items().filter(s=>s.deadline).map(s=>{
      const [month,day]=s.deadline.split('.').map(Number);
      const date=new Date(state.cycleYear-(month>=8?1:0),month-1,day,12);
      return {date,title:s.name,description:s.program,example:true,action:'application-detail',id:s.id};
    });
    const personal=tasks.filter(t=>t.due&&!state.completed.includes(t.id)).flatMap(t=>{
      if(!/^\d{4}-\d{2}-\d{2}$/.test(t.due))return [];
      const date=new Date(`${t.due}T12:00:00`);
      return Number.isNaN(date.getTime())?[]:[{date,title:t.title,description:t.school||'个人申请待办',example:false,action:'task-detail',id:t.id}];
    });
    return [...projects,...personal].sort((a,b)=>a.date-b.date||a.title.localeCompare(b.title));
  }
  function draw() {
    const panel=root();if(!panel)return;
    const all=entries();
    const current=new Date();
    if(!selectedMonth){const next=all.find(item=>item.date>=new Date(current.getFullYear(),current.getMonth(),current.getDate()));selectedMonth=monthKey(next?.date||current);}
    const [year,month]=selectedMonth.split('-').map(Number);
    const visible=all.filter(item=>monthKey(item.date)===selectedMonth);
    panel.innerHTML=`<div class="calendar-panel-heading"><div><span>APPLICATION TIMELINE</span><h2>申请日历</h2></div><button class="icon-button" data-action="calendar-close" aria-label="收起申请日历">${icon('close')}</button></div><div class="calendar-month-controls"><button class="icon-button calendar-prev" data-action="calendar-month" data-offset="-1" aria-label="上一个月">${icon('arrow')}</button><h3 aria-live="polite">${year} 年 ${month} 月</h3><button class="icon-button" data-action="calendar-month" data-offset="1" aria-label="下一个月">${icon('arrow')}</button><button class="text-button" data-action="calendar-today">本月</button></div><p class="calendar-season">${state.cycleYear} Fall · ${visible.length} 项时间记录</p><div class="calendar-timeline" aria-live="polite">${visible.length?visible.map(item=>{
      const today=new Date(current.getFullYear(),current.getMonth(),current.getDate());
      const days=Math.round((item.date-new Date(today.getFullYear(),today.getMonth(),today.getDate(),12))/86400000);
      const status=item.example?'示例 · 待核验':days<0?'已过计划日期':days===0?'今天到期':`还有 ${days} 天`;
      return `<button class="calendar-event ${!item.example&&days<=7?'urgent':''}" data-action="${item.action}" data-id="${escapeHTML(item.id)}"><span class="calendar-event-date"><b>${String(item.date.getDate()).padStart(2,'0')}</b><small>${month} 月</small></span><span class="calendar-event-copy"><strong>${escapeHTML(item.title)}</strong><span>${escapeHTML(item.description)}</span><em class="${item.example?'example':''}">${status}</em></span>${icon('arrow')}</button>`;
    }).join(''):'<div class="calendar-empty">这个月暂无时间记录。<br>切换月份查看，或到“我的申请”添加带日期的待办。</div>'}</div><p class="calendar-source-note">院校示例日期按当前申请季排列，尚未核验；正式截止时间与时区请以项目官网为准。</p><a class="calendar-all" href="#applications">管理申请与待办 ${icon('arrow')}</a>`;
  }
  function close(focus=false) {
    opened=false;if(root())root().hidden=true;
    trigger()?.setAttribute('aria-expanded','false');
    if(focus)trigger()?.focus();
  }
  function toggle() {
    if(opened){close();return;}
    selectedMonth=undefined;opened=true;draw();root().hidden=false;
    trigger()?.setAttribute('aria-expanded','true');root().focus();
  }
  function handle(action,button) {
    if(action==='notifications')toggle();
    else if(action==='calendar-close')close(true);
    else if(action==='calendar-month'){
      const [year,month]=selectedMonth.split('-').map(Number);
      selectedMonth=monthKey(new Date(year,month-1+Number(button.dataset.offset),1));draw();
      root().querySelector(`[data-action="calendar-month"][data-offset="${button.dataset.offset}"]`)?.focus();
    }
    else if(action==='calendar-today'){selectedMonth=monthKey(new Date());draw();root().querySelector('[data-action="calendar-today"]').focus();}
    else return false;
    return true;
  }
  function outside(event){if(opened&&!event.target.closest('#application-calendar,.calendar-toggle,[data-action="notifications"]'))close();}
  function onKeydown(event){if(opened&&event.key==='Escape'){event.preventDefault();close(true);return true;}return false;}
  function sync(){if(opened)draw();}
  return {handle,close,outside,onKeydown,sync};
})();
