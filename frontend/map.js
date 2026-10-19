// Portable SVG geography: no map tiles, API credentials, or external requests.
const MapWorkspace = (() => {
  const geography=SchoolCatalog.map || {width:1120,height:720,states:[],points:[]};
  const points=new Map(geography.points.map(p=>[p.id,p]));
  let query='',region='all',tier='all',scope='ranked',savedOnly=false,selectedId='',clusterIds=[];
  let zoom=1,panX=0,panY=0,drag=null;
  const regionNames={all:'全美探索',east:'东部',midwest:'中西部',south:'南部',west:'西部'};
  function matching() {
    const q=query.trim().toLowerCase();
    return schools.filter(s=>points.has(s.id)&&(scope==='all'||s.rankNumber!==null)&&(region==='all'||points.get(s.id).region===region)&&(tier==='all'||s.tier===tier)&&(!savedOnly||state.saved.includes(s.id))&&`${s.name} ${s.english} ${s.location} ${s.stateCode}`.toLowerCase().includes(q)).sort((a,b)=>(a.rankNumber??999)-(b.rankNumber??999)||a.english.localeCompare(b.english));
  }
  function clusters() {
    const groups=[];
    for(const s of matching()) {
      const p=points.get(s.id);const group=groups.find(g=>Math.hypot(g.x-p.x,g.y-p.y)<27/zoom);
      if(group){group.ids.push(s.id);group.x=(group.x*(group.ids.length-1)+p.x)/group.ids.length;group.y=(group.y*(group.ids.length-1)+p.y)/group.ids.length;}
      else groups.push({x:p.x,y:p.y,ids:[s.id]});
    }
    return groups;
  }
  function pinsHTML() {
    return clusters().map(g=>{
      const multiple=g.ids.length>1,s=schools.find(s=>s.id===g.ids[0]);const active=g.ids.includes(selectedId);
      return `<g class="map-marker ${multiple?'is-cluster':''} ${active?'is-selected':''}" transform="translate(${g.x},${g.y})" role="button" tabindex="0" aria-label="${multiple?`查看附近 ${g.ids.length} 所院校`:escapeHTML('在地图中选择'+s.name)}" data-action="${multiple?'map-cluster':'map-select'}" data-id="${g.ids[0]}" data-schools="${g.ids.join(',')}"><title>${multiple?g.ids.map(id=>schools.find(s=>s.id===id).name).join(' / '):escapeHTML(s.name)}</title><circle class="map-hit" r="${24/zoom}"/><circle class="map-pin-ring" r="${(multiple?16:13)/zoom}"/><circle class="map-pin-dot" r="${(multiple?12:7)/zoom}"/>${multiple?`<text text-anchor="middle" dominant-baseline="central" font-size="${12/zoom}">${g.ids.length}</text>`:''}</g>`;
    }).join('');
  }
  function selectedHTML() {
    const s=matching().find(s=>s.id===selectedId);
    if(!s)return `<div class="map-start"><span class="eyebrow">A PLACE FOR YOUR NEXT CHAPTER</span><h2>下一站，会在哪里？</h2><p>点击地图标记或下方学校，了解城市与院校，再去挑选适合自己的硕士项目。</p><span>${icon('location')}从地图，走向你的申请清单。</span></div>`;
    const count=SchoolCatalog.programDirectory?.schools.find(r=>r.schoolId===s.id)?.colleges.reduce((n,c)=>n+c.programs.length,0)||0;
    return `<div class="map-school-detail"><div class="map-school-top">${schoolLogo(s)}<span class="rank-badge">${escapeHTML(s.rank)}</span></div><h2>${escapeHTML(s.name)}</h2><p>${escapeHTML(s.english)}</p><div class="map-school-location">${icon('location')}${escapeHTML(s.location)}<span>${s.control}大学</span></div><div class="map-program-count">${count} 个已收录硕士条目<span>主校区位置 · IPEDS 2023</span></div><div class="map-school-actions"><button class="primary-button" data-action="school" data-id="${s.id}">学院与项目 ${icon('arrow')}</button><button class="icon-button ${state.saved.includes(s.id)?'saved':''}" data-action="bookmark" data-id="${s.id}" aria-label="${state.saved.includes(s.id)?'取消关注':'关注'}${s.name}">${icon('bookmark')}</button></div></div>`;
  }
  function listHTML() {
    const all=matching();const visible=clusterIds.length?all.filter(s=>clusterIds.includes(s.id)):all;
    return `${clusterIds.length?`<div class="map-cluster-caption">附近 ${visible.length} 所院校<button data-action="map-clear-cluster">显示全部 ×</button></div>`:''}${visible.length?visible.map(s=>`<button class="map-list-school ${selectedId===s.id?'selected':''}" data-action="map-select" data-id="${s.id}" aria-pressed="${selectedId===s.id}"><span><strong>${escapeHTML(s.name)}</strong><small>${escapeHTML(s.location)}</small></span><b>${escapeHTML(s.rankNumber===null?'档案':s.rank)}</b>${icon('arrow')}</button>`).join(''):`<div class="map-list-empty">没有符合条件的学校。<button data-action="map-reset-filters">重置筛选</button></div>`}`;
  }
  function renderMap() {
    const results=matching();
    return `${heading('全美院校地图','沿着城市，发现下一站。查看资料库收录院校的主校区位置。','FIND YOUR PLACE IN THE WORLD',`<a class="secondary-button" href="#schools">${icon('list')}切换院校列表</a>`)}<section class="map-workspace"><div class="map-filters"><label class="map-search">${icon('search')}<input id="map-search" aria-label="搜索地图中的学校或城市" placeholder="搜索院校、城市或州…" value="${escapeHTML(query)}" maxlength="100"></label><select id="map-region" aria-label="地图区域">${Object.entries(regionNames).map(([key,title])=>`<option value="${key}" ${region===key?'selected':''}>${title}</option>`).join('')}</select><select id="map-tier" aria-label="地图排名范围">${[['all','全部排名范围'],['10','Top 10'],['30','Top 11–30'],['50','Top 31–50']].map(([key,title])=>`<option value="${key}" ${tier===key?'selected':''}>${title}</option>`).join('')}</select><button class="map-saved-filter ${savedOnly?'active':''}" data-action="map-saved" aria-pressed="${savedOnly}">${icon('bookmark')}只看已关注</button></div><div class="map-layout"><div class="map-main"><div class="map-stage-heading"><div><span class="map-live-dot"></span><strong id="map-count" role="status">${results.length} 所院校</strong><span id="map-region-label">${regionNames[region]}</span></div><div class="map-stage-legend"><i></i>院校 / 附近多所院校</div></div><div class="map-viewport" id="map-viewport"><svg id="university-map" viewBox="0 0 1120 720" aria-label="美国各州院校分布地图"><defs><pattern id="map-water-dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r=".7" fill="#c9d7d3" opacity=".6"/></pattern></defs><rect width="1120" height="720" fill="url(#map-water-dots)"/><g id="map-transform" transform="translate(${panX},${panY}) scale(${zoom})"><g class="map-states">${geography.states.map(s=>`<path d="${s.path}" data-state="${s.code}"><title>${s.name}</title></path>`).join('')}</g><g class="map-state-labels">${geography.states.filter(s=>!['DC','DE','RI','CT','MA','NJ'].includes(s.code)).map(s=>`<text x="${s.labelX}" y="${s.labelY}">${s.code}</text>`).join('')}</g><text class="map-ocean-label" x="65" y="380" transform="rotate(-65 65 380)">PACIFIC OCEAN</text><text class="map-ocean-label" x="985" y="460" transform="rotate(-60 985 460)">ATLANTIC OCEAN</text><g id="map-pins">${pinsHTML()}</g></g></svg><div class="map-controls"><button data-action="map-zoom-in" aria-label="放大地图">+</button><button data-action="map-zoom-out" aria-label="缩小地图">−</button><button data-action="map-reset-view" aria-label="重置地图视图">${icon('focus')}</button></div><span class="map-pan-hint">拖动平移 · 点击聚合标记查看附近学校</span></div><div class="map-footnote"><span>校区坐标：NCES IPEDS HD2023 · 州界：PublicaMundi</span><label>展示范围<select id="map-scope" aria-label="地图院校档案范围"><option value="ranked" ${scope==='ranked'?'selected':''}>PDF 榜单院校</option><option value="all" ${scope==='all'?'selected':''}>全部 53 份档案</option></select></label></div></div><aside class="map-sidebar" aria-label="地图院校详情"><div id="map-selected">${selectedHTML()}</div><div class="map-list-heading"><span>在地图中发现</span><button data-action="map-reset-filters">重置筛选</button></div><div id="map-school-list" class="map-school-list">${listHTML()}</div></aside></div></section><p class="profile-note">地图显示当前资料库中的学校。位置为历史主校区坐标，不代表每个项目的实际上课校区；具体项目位置请另查学院官网。</p>`;
  }
  function refresh() {
    if(!document.querySelector('#map-viewport'))return;
    const matches=matching();
    if(selectedId&&!matches.some(s=>s.id===selectedId))selectedId='';
    document.querySelector('#map-pins').innerHTML=pinsHTML();
    document.querySelector('#map-selected').innerHTML=selectedHTML();
    document.querySelector('#map-school-list').innerHTML=listHTML();
    document.querySelector('#map-count').textContent=`${matches.length} 所院校`;
    document.querySelector('#map-region-label').textContent=regionNames[region];
  }
  function transform() {
    const el=document.querySelector('#map-transform');if(el)el.setAttribute('transform',`translate(${panX},${panY}) scale(${zoom})`);
    const pins=document.querySelector('#map-pins');if(pins)pins.innerHTML=pinsHTML();
  }
  function changeZoom(next) {
    const clamped=Math.max(1,Math.min(8,next));const factor=clamped/zoom;
    panX=560-(560-panX)*factor;panY=360-(360-panY)*factor;zoom=clamped;transform();
  }
  function resetFilters() {query='';region='all';tier='all';savedOnly=false;clusterIds=[];render();}
  function handle(action,button) {
    if(!action.startsWith('map-'))return false;
    if(action==='map-select'){selectedId=button.dataset.id;clusterIds=[];refresh();}
    else if(action==='map-cluster'){clusterIds=button.dataset.schools.split(',');selectedId='';refresh();}
    else if(action==='map-clear-cluster'){clusterIds=[];refresh();}
    else if(action==='map-saved'){savedOnly=!savedOnly;clusterIds=[];button.classList.toggle('active',savedOnly);button.setAttribute('aria-pressed',String(savedOnly));refresh();}
    else if(action==='map-reset-filters')resetFilters();
    else if(action==='map-zoom-in')changeZoom(zoom*1.6);
    else if(action==='map-zoom-out')changeZoom(zoom/1.6);
    else if(action==='map-reset-view'){zoom=1;panX=panY=0;transform();}
    return true;
  }
  function onInput(input) {if(input.id==='map-search'){query=input.value;clusterIds=[];refresh();}}
  function onChange(input) {
    if(input.id==='map-region')region=input.value;
    else if(input.id==='map-tier')tier=input.value;
    else if(input.id==='map-scope')scope=input.value;
    else return;
    clusterIds=[];refresh();
  }
  function pointerDown(event) {
    if(!event.target.closest('#university-map')||event.target.closest('[data-action]')||event.button!==0)return;
    drag={x:event.clientX,y:event.clientY,panX,panY};document.querySelector('#map-viewport').classList.add('dragging');
  }
  function pointerMove(event) {if(!drag)return;const rect=document.querySelector('#university-map')?.getBoundingClientRect();if(!rect){drag=null;return;}panX=drag.panX+(event.clientX-drag.x)*1120/rect.width;panY=drag.panY+(event.clientY-drag.y)*720/rect.height;transform();}
  function pointerUp(){drag=null;document.querySelector('#map-viewport')?.classList.remove('dragging');}
  function onKeydown(event){if(event.target.matches('.map-marker')&&['Enter',' '].includes(event.key)){event.preventDefault();event.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}}
  return {render:renderMap,handle,onInput,onChange,pointerDown,pointerMove,pointerUp,onKeydown};
})();
