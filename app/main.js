import { get, bountyData, leaderboardData, profileData } from './api.js';
const root = document.querySelector('main');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const money = v => Number(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: Number.isInteger(Number(v)) ? 0 : 2 });
const date = v => v ? new Date(v).toLocaleString('en-GB', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', timeZone:'UTC' }) + ' UTC' : 'Not announced';
const pot = b => Number(b.potUsd ?? b.rewardAmount ?? 0);
const open = b => b.status === 'open' && Date.parse(b.deadline) > Date.now();
const url = b => '#/bounty/' + encodeURIComponent(b.slug);
const profile = h => '#/profile/' + encodeURIComponent(h);
const left = d => { const s = Math.max(0, Math.floor((Date.parse(d)-Date.now())/1000)); return s ? (s>86400 ? `${Math.floor(s/86400)}d ${Math.floor(s/3600)%24}h` : `${Math.floor(s/3600)}h ${Math.floor(s/60)%60}m ${s%60}s`) : 'Entries closed'; };
const urgency = d => Date.parse(d)-Date.now()<3600000 ? 'red' : Date.parse(d)-Date.now()<43200000 ? 'amber' : 'green';
const timer = d => `<span class="time ${urgency(d)}" data-deadline="${esc(d)}">${left(d)}</span>`;
const avatar = p => { const src=p.avatar?.url_small || p.image; return src ? `<img crossorigin="anonymous" src="${esc(new URL(src,'https://make.fun').href)}" alt="" loading="lazy" width="36" height="36">` : `<span class="avatar">${esc(p.handle?.slice(0,2).toUpperCase())}</span>`; };
const icons = { Code:'⌘', Games:'♟', Growth:'↗', Trading:'⌁', Forecasting:'◷', Security:'◇', Automation:'⚙' };
let generation=0, boardItems=[], filter='All', feeFilter='all', search='', sort='featured', page=1;
function stats(items) {
  const live=items.filter(open), next=[...live].sort((a,b)=>Date.parse(a.deadline)-Date.parse(b.deadline))[0];
  return `<section class="stats"><div><small>TAKING ENTRIES</small><strong>${live.length}<em> open bounties</em></strong></div><div><small>TOTAL LIVE POTS</small><strong>${money(live.reduce((s,b)=>s+pot(b),0))}<em> USDC</em></strong></div><div><small>ENTRIES IN PLAY</small><strong>${live.reduce((s,b)=>s+b.submissionCount,0).toLocaleString()}<em> and counting</em></strong></div><div><small>NEXT TO CLOSE</small><strong>${next?timer(next.deadline):'—'}</strong></div></section>`;
}
function card(b, i, max) {
 const progress=Math.max(2,Math.min(100,(Date.now()-Date.parse(b.publishedAt))/(Date.parse(b.deadline)-Date.parse(b.publishedAt))*100));
 return `<article class="card"><div class="card-top"><span class="category">${icons[b.category]||'✳'} ${esc(b.category)}</span>${pot(b)===max?'<span class="tag">LARGEST LIVE POT</span>':`<span class="serial">${String(i+1).padStart(2,'0')} / BOUNTY</span>`}</div><h3><a href="${url(b)}">${esc(b.title)} <span>↗</span></a></h3><p>${esc(b.summary || b.description?.split('\n')[0])}</p><div class="pot-line"><strong>${money(pot(b))}</strong><span>live pot${Number(b.entryFeesUsd)>0?`<em>+${money(b.entryFeesUsd)} in fees</em>`:'<em>funded in USDC</em>'}</span></div><div class="card-meta"><span>${Number(b.entryFeeUsd)?money(b.entryFeeUsd)+' entry':'<b>FREE</b> entry'}</span><span>${b.submissionCount.toLocaleString()} entries</span>${timer(b.deadline)}</div><div class="progress"><i style="width:${progress}%" class="${urgency(b.deadline)}"></i></div><div class="card-bottom"><span>make.fun</span><a href="${url(b)}/leaderboard">Leaderboard →</a></div></article>`;
}
function renderCards() {
 let items=boardItems.filter(open).filter(b=>(filter==='All'||b.category===filter)&&(feeFilter==='all'||(feeFilter==='paid')===Boolean(Number(b.entryFeeUsd)))&&`${b.title} ${b.summary} ${b.skills?.join(' ')}`.toLowerCase().includes(search.toLowerCase()));
 items.sort((a,b)=>sort==='pot'?pot(b)-pot(a):sort==='closing'?Date.parse(a.deadline)-Date.parse(b.deadline):sort==='entries'?b.submissionCount-a.submissionCount:(b.slug==='makefun-frontend-01')-(a.slug==='makefun-frontend-01')||pot(b)-pot(a));
 document.querySelector('#results-count').textContent=`${items.length} live bounties`;
 const liveItems=boardItems.filter(open), max=liveItems.length?Math.max(...liveItems.map(pot)):0;
 document.querySelector('#cards').innerHTML=items.slice(0,page*20).map(b=>`<a class="board-row" href="${url(b)}"><strong class="row-pot"><span>${money(pot(b))}</span><small>live · ${money(b.rewardAmount)} base</small></strong><span class="row-title"><b>${esc(b.title)}</b><small>${esc(b.category)}</small></span><span class="row-time"><span>${timer(b.deadline)}</span><small class="row-date">${date(b.deadline).replace(/,? \d{2}:\d{2} UTC$/,'')}</small></span><span class="row-fee">${Number(b.entryFeeUsd)?money(b.entryFeeUsd):'NO FEE'}<small>entry fee</small></span><span class="row-entries">${Number(b.submissionCount||0).toLocaleString()}<small>entries</small></span></a>`).join('')||'<div class="empty">No bounties match. Try another category or search.</div>';
 document.querySelector('#more').hidden=items.length<=page*6;
}
async function board() {
 const data=await get('/competitions?status=open&activity=times&limit=100'); boardItems=data.items;
 while(data.next_cursor){const next=await get('/competitions?status=open&activity=times&limit=100&cursor='+encodeURIComponent(data.next_cursor));boardItems.push(...next.items);data.next_cursor=next.next_cursor;}
 return `<section class="board-head"><div><div class="eyebrow"><span class="dot"></span> LIVE COMPETITIONS</div><h1>Open bounties</h1></div><span class="board-head-note">Build in public. Win on merit.</span></section>${stats(boardItems)}<div id="ticker" class="ticker"><span class="live">LIVE ACTIVITY</span><span>Reading the latest entries…</span></div><section class="board-work"><div class="board-tools"><div class="section-title"><h2>Taking entries</h2><span id="results-count"></span></div><label class="search"><span>⌕</span><input id="search" type="search" placeholder="Search bounties, skills…" value="${esc(search)}" aria-label="Search bounties"></label><div class="toolbar"><div class="categories">${['All','Code','Games','Growth','Trading','Forecasting','Security','Automation'].map(c=>`<button data-category="${c}" class="${filter===c?'active':''}">${c}</button>`).join('')}</div><div class="filter-actions"><div class="fee-pills">${['all','free','paid'].map(f=>`<button data-fee="${f}" class="${feeFilter===f?'active':''}">${f}</button>`).join('')}</div><select id="sort" aria-label="Sort bounties"><option value="featured">Featured</option><option value="pot">Largest pot</option><option value="closing">Closing soon</option><option value="entries">Most entries</option></select></div></div></div><div class="table-label"><span>REWARD · LIVE POT</span><span>BOUNTY</span><span>TIME LEFT · DEADLINE</span><span>ENTRY FEE</span><span>ENTRIES</span></div><div class="cards" id="cards"></div><button class="load-more" id="more">Show more bounties ↓</button></section>`;
}
async function extras(token) {
 const results=await Promise.allSettled([get('/rankings?limit=5'),get('/activity/entries')]);
 if(token!==generation)return;
 if(results[0].status==='fulfilled'&&document.querySelector('#builders'))document.querySelector('#builders').innerHTML=results[0].value.items.map((p,i)=>`<a class="builder" href="${profile(p.handle)}"><span class="rank">${String(i+1).padStart(2,'0')}</span>${avatar(p)}<span><b>${esc(p.handle)}</b><small>${p.record.competitions_won} wins · ${money(p.record.prize_usd)} won</small></span><span class="arrow">↗</span></a>`).join('');
 if(results[1].status==='fulfilled'){const a=results[1].value,e=a.entries[0];document.querySelector('#ticker').innerHTML=`<span class="live">LIVE ACTIVITY</span><b>${a.total}${a.total>=100?'+':''} entries in the last hour</b>${e?`<span class="ticker-event"><a href="${profile(e.handle)}">@${esc(e.handle)}</a> entered <a href="#/bounty/${esc(e.competition.slug)}">${esc(e.competition.title)} ↗</a></span>`:''}<span class="ticker-end">THE ARENA NEVER SLEEPS</span>`;}
}
function markdown(text) {
 return esc(text||'').split('\n').map(l=>/^### /.test(l)?`<h3>${l.slice(4)}</h3>`:/^## /.test(l)?`<h2>${l.slice(3)}</h2>`:/^# /.test(l)?`<h2>${l.slice(2)}</h2>`:/^- /.test(l)?`<p class="bullet">${l.slice(2)}</p>`:l?`<p>${l.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>')}</p>`:'').join('');
}
function bountyHeader(b, active) {
 return `<div class="breadcrumbs"><a href="#/">Bounties</a><span>/</span><span>${esc(b.category)}</span><span>/</span><span>${active==='leaderboard'?'Leaderboard':'Overview'}</span></div><section class="detail-head"><div class="eyebrow">${icons[b.category]||'✳'} ${esc(b.category)} <span class="status ${open(b)?'green':''}">${open(b)?'TAKING ENTRIES':b.status==='resolved'?'RESOLVED':'ENTRIES CLOSED'}</span></div><h1>${esc(b.title)}</h1><p>${esc(b.summary)}</p><div class="sponsor">By <b>make.fun <span class="verified">✓</span></b><span>·</span><span>${b.submissionCount} entries</span><span>·</span><span>${Number(b.entryFeeUsd)?money(b.entryFeeUsd)+' entry fee':'Free to enter'}</span></div></section><nav class="tabs"><a class="${active==='overview'?'active':''}" href="${url(b)}">Overview</a><a class="${active==='leaderboard'?'active':''}" href="${url(b)}/leaderboard">Leaderboard <span>${b.submissionCount}</span></a><a href="${url(b)}#rules" data-rules>Rules & judging ↘</a></nav>`;
}
async function bounty(slug) {
 const b=await bountyData(slug);
 const rewards=b.rewardsNow||Object.entries(b.rewards||{}).map(([place,base])=>({place,baseUsd:base,feeShareUsd: Number(base)/Number(b.rewardAmount)*Number(b.entryFeesUsd||0),amountUsd:Number(base)/Number(b.rewardAmount)*pot(b)}));
 return bountyHeader(b,'overview')+`<section class="reward-panel reward-overview"><div class="reward-summary"><div><div class="eyebrow"><span class="dot"></span> LIVE REWARD POOL</div><div class="big-pot">${money(pot(b))}<span>USDC</span></div><p class="fee-equation">${money(b.rewardAmount)} base reward <b>+ ${money(b.entryFeesUsd)}${Number(b.entryFeeUsd)?` from ${Number(b.entryCount||b.submissionCount||0).toLocaleString()} entry fees`:' fees paid'}</b></p></div><div class="quick-facts"><div><small>TIME LEFT</small>${timer(b.deadline)}</div><div><small>ENTRY FEE</small><strong>${Number(b.entryFeeUsd)?money(b.entryFeeUsd):'FREE'}</strong></div><div><small>ENTRIES</small><strong>${Number(b.submissionCount||0).toLocaleString()}</strong></div></div><a class="primary" href="${url(b)}/leaderboard">Leaderboard ↗</a></div><div class="reward-label"><b>PLACE</b><span>BASE REWARD</span><span>FEE SHARE</span><span>SHARE BAR</span><span>LIVE PAYOUT</span></div>${rewards.map(r=>`<div class="reward"><span>${String(r.place).padStart(2,'0')}</span><strong class="reward-base">${money(r.baseUsd)}</strong><small class="reward-fee">+${money(r.feeShareUsd)}</small><div class="reward-bar"><i style="width:${Math.max(5,Number(r.amountUsd)/Number(rewards[0]?.amountUsd)*100)}%"></i></div><strong>${money(r.amountUsd)}</strong></div>`).join('')}<small class="reward-note">Fee shares reflect entry fees paid so far. Final payouts depend on awarded places.</small></section><div class="detail-grid"><article class="prose"><div class="section-title"><h2>The challenge</h2><span>BUILD / COMPETE / WIN</span></div>${markdown(b.description)}<section id="rules"><h2>Rules & judging</h2><p>${esc(b.resolution?.summary||'See the challenge requirements above.')}</p>${(b.resolution?.criteria||[]).map(c=>`<p class="bullet">${esc(c)}</p>`).join('')}<h3>How places are decided</h3><p>${esc(b.resolution?.tieBreak||'The competition’s published scoring rules apply.')}</p></section></article><aside><section class="panel dates"><h3>Competition timeline</h3><small>OPENED</small><p>${date(b.publishedAt)}</p><small>ENTRY DEADLINE</small><p>${date(b.deadline)}</p><small>STATUS</small><p>${open(b)?'Open · accepting entries':b.status==='resolved'?'Resolved':'Closed · awaiting results'}</p></section></aside></div>`;
}
let leaders=[],leaderPage=1, leaderBoard;
function score(row, data) {const key=data.rank_key,v=row.values?.[key]??row.rank_key_value;return key==='judge'&&v!=null?(Number(v)/10000).toFixed(2)+'%':row.display?.[key]??row.rank_key_display??v??'—';}
function leaderRows() {
 const slice=leaders.slice((leaderPage-1)*10,leaderPage*10);
 document.querySelector('#leader-rows').innerHTML=slice.map((e,i)=>`<div class="leader-row"><span class="place ${e.rank<=3?'podium':''}">${e.rank||((leaderPage-1)*10+i+1)}</span><div class="entrant">${avatar(e)}<div><a href="${profile(e.handle)}">${esc(e.handle)} ↗</a><p>${esc(e.title)}</p>${e.house?'<small>HOUSE BASELINE</small>':''}</div></div><strong>${esc(score(e,leaderBoard))}<small>${e.interval&&leaderBoard.rank_key==='judge'?`${(Number(e.interval.low)/10000).toFixed(1)}–${(Number(e.interval.high)/10000).toFixed(1)}% · 90% CI`:e.prize_eligible===false?'Not prize eligible':''}</small></strong></div>`).join('')||`<div class="empty">${leaderBoard.phase?.scores_visible===false?'Scores are held until results are published.':'No graded entries in this phase yet.'}</div>`;
 document.querySelector('#page-info').textContent=`Page ${leaderPage} of ${Math.max(1,Math.ceil(leaders.length/10))} · ${leaders.length} ranked entries`;
 document.querySelector('#prev').disabled=leaderPage===1;document.querySelector('#next').disabled=leaderPage*10>=leaders.length;
}
async function leaderboard(slug) {
 const [b,d]=await Promise.all([bountyData(slug),leaderboardData(slug,new URLSearchParams(location.hash.split('?')[1]).get('phase')||'dev')]);
 leaderBoard=d;leaders=[...(d.entries||[]),...(d.rest||[])];leaderPage=1;
 return bountyHeader(b,'leaderboard')+`<section class="standings"><div class="section-title"><div><div class="eyebrow">THE WORK SPEAKS FOR ITSELF</div><h2>Leaderboard</h2></div><div class="phase-switch"><a class="${d.phase?.key==='dev'?'active':''}" href="${url(b)}/leaderboard?phase=dev">Development</a><a class="${d.phase?.key==='final'?'active':''}" href="${url(b)}/leaderboard?phase=final">Final</a></div></div><div class="board-note"><span class="dot"></span> ${d.phase?.placements_held?'Provisional standings · places may change':'Public standings'}<span>${money(pot(b))} live pot</span></div><div class="leader-label"><span>RANK</span><span>BUILDER / ENTRY</span><span>${esc(d.columns?.find(c=>c.key===d.rank_key)?.title||'Score')}</span></div><div id="leader-rows"></div><div class="pagination"><button id="prev">← Previous</button><span id="page-info"></span><button id="next">Next →</button></div></section>`;
}
async function account(handle) {
 const p=await profileData(handle),r=p.record;
 return `<div class="breadcrumbs"><a href="#/">Bounties</a><span>/</span>Builder profile</div><section class="profile-head">${avatar(p)}<div><div class="eyebrow">PUBLIC BUILDER PROFILE</div><h1>${esc(p.display_name||p.handle)}</h1><p>@${esc(p.handle)} · Joined ${date(p.joined_at).split(',')[0]}</p>${p.bio?`<p>${esc(p.bio)}</p>`:''}</div></section><section class="stats"><div><small>COMPETITIONS ENTERED</small><strong>${r.competitions_entered}</strong></div><div><small>FIRST-PLACE WINS</small><strong>${r.competitions_won}</strong></div><div><small>PRIZE PLACEMENTS</small><strong>${r.competitions_placed}</strong></div><div><small>TOTAL PRIZES PAID</small><strong>${money(r.prize_usd)}</strong></div></section><div class="section-title"><h2>Build history <span>↘</span></h2><span>${p.solutions.length} public entries</span></div><section id="solutions">${p.solutions.slice(0,10).map(s=>`<article class="solution"><div><span class="category">${esc(s.competition.category)} ${s.placement?'· PLACE '+s.placement:''}</span><h3><a href="#/bounty/${esc(s.competition.slug)}">${esc(s.competition.title)} ↗</a></h3><p>${esc(s.title)}</p><small>${date(s.entered_at)}</small></div><div><strong>${s.prize_usd?money(s.prize_usd):s.score?esc(s.score.column.key==='judge'?(s.score.value/10000).toFixed(2)+'%':s.score.display):'Submitted'}</strong><a href="#/bounty/${esc(s.competition.slug)}/leaderboard">View standings →</a></div></article>`).join('')||'<p class="empty">No public entries yet.</p>'}</section>${p.solutions.length>10?'<button id="solution-more" class="load-more">Show all public entries ↓</button>':''}`;
}
async function route() {
 const token=++generation;window.__shotReady=false;
 root.setAttribute('aria-busy','true');
 const parts=(location.hash.slice(2)||'').split('?')[0].split('/');
 root.innerHTML='<p class="loading">Loading live data<span>✳</span></p>';
 try {
  let html;
  if(parts[0]==='bounty'&&parts[1])html=parts[2]==='leaderboard'?await leaderboard(decodeURIComponent(parts[1])):await bounty(decodeURIComponent(parts[1]));
  else if(parts[0]==='profile'&&parts[1])html=await account(decodeURIComponent(parts[1]));
  else html=await board();
  if(token!==generation)return;
  root.innerHTML=html;
  if(document.querySelector('#cards')){renderCards();document.querySelector('#sort').value=sort;await extras(token);}
  if(document.querySelector('#leader-rows'))leaderRows();
  document.title=(root.querySelector('h1')?.textContent||'Bounties')+' | make.fun';
 }catch(e){if(token===generation)root.innerHTML=`<div class="empty"><h1>Let’s try that again.</h1><p>${esc(e.message)}</p><button id="retry">Retry live data</button> <a href="#/">Back to bounties</a></div>`;}
 if(token===generation){root.removeAttribute('aria-busy');window.__shotReady=true;window.scrollTo(0,0);}
}
root.addEventListener('click',e=>{
 const c=e.target.closest('[data-category]'),f=e.target.closest('[data-fee]');
 if(c){filter=c.dataset.category;page=1;document.querySelectorAll('[data-category]').forEach(b=>b.classList.toggle('active',b===c));renderCards();}
 if(f){feeFilter=f.dataset.fee;page=1;document.querySelectorAll('[data-fee]').forEach(b=>b.classList.toggle('active',b===f));renderCards();}
 if(e.target.id==='more'){page++;renderCards();}
 if(e.target.id==='prev'){leaderPage--;leaderRows();}
 if(e.target.id==='next'){leaderPage++;leaderRows();}
 if(e.target.id==='retry')route();
 if(e.target.closest('[data-rules]')){e.preventDefault();const section=document.querySelector('#rules');if(section)section.scrollIntoView({behavior:'smooth'});else{location.hash='#/bounty/'+location.hash.split('/')[2];setTimeout(()=>document.querySelector('#rules')?.scrollIntoView(),700);}}
});
root.addEventListener('input',e=>{if(e.target.id==='search'){search=e.target.value;page=1;renderCards();}});
root.addEventListener('change',e=>{if(e.target.id==='sort'){sort=e.target.value;page=1;renderCards();}});
try{document.documentElement.dataset.theme=localStorage.getItem('theme')||'dark';}catch{}
document.querySelector('#theme').onclick=()=>{const t=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=t;try{localStorage.setItem('theme',t);}catch{}};
function tick(){document.querySelector('#clock').textContent=new Date().toISOString().slice(11,19)+' UTC';document.querySelectorAll('[data-deadline]').forEach(el=>{el.textContent=left(el.dataset.deadline);el.className='time '+urgency(el.dataset.deadline);});}
setInterval(tick,1000);tick();window.addEventListener('hashchange',route);route();
