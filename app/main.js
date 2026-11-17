import { get, telemetry, bountyData, leaderboardData, profileData } from './api.js';
const root = document.querySelector('main');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const money = v => Number(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: Number.isInteger(Number(v)) ? 0 : 2 });
const date = v => v ? new Date(v).toLocaleString('en-GB', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', timeZone:'UTC' }) + ' UTC' : 'Not announced';
const pot = b => Number(b.potUsd ?? b.rewardAmount ?? 0);
const open = b => b.status === 'open' && Date.parse(b.deadline) > Date.now() && Date.parse(b.publishedAt) <= Date.now();
const url = b => '#/bounty/' + encodeURIComponent(b.slug);
const profile = h => '#/profile/' + encodeURIComponent(h);
const left = d => { const s = Math.max(0, Math.floor((Date.parse(d)-Date.now())/1000)); return s ? (s>86400 ? `${Math.floor(s/86400)}d ${Math.floor(s/3600)%24}h` : `${Math.floor(s/3600)}h ${Math.floor(s/60)%60}m ${s%60}s`) : 'Entries closed'; };
const urgency = d => Date.parse(d)-Date.now()<86400000 ? 'red' : Date.parse(d)-Date.now()<43200000 ? 'amber' : 'green';
const timer = d => `<span class="time ${urgency(d)}" data-deadline="${esc(d)}">${left(d)}</span>`;
const avatar = p => { const src=p.avatar?.url_small || p.image; const parts=String(p.handle||p.display_name||'Builder').split(/[^a-z0-9]+/i).filter(Boolean); const initials=(parts.length>1?parts.map(part=>part[0]).join('').slice(0,2):parts[0]?.slice(0,2)||'BU').toUpperCase(); return `<span class="avatar" aria-label="${esc(p.handle||'Builder')}">${esc(initials)}${src?`<img crossorigin="anonymous" src="${esc(new URL(src,'https://make.fun').href)}" alt="" loading="lazy" width="36" height="36" onerror="this.remove()">`:''}</span>`; };
const icons = { Code:'⌘', Games:'♟', Growth:'↗', Trading:'⌁', Forecasting:'◷', Security:'◇', Automation:'⚙' };
let selected='makefun-frontend-01', selectionToken=0, solutionLimit=10;
let generation=0, boardItems=[], filter='All', feeFilter='all', search='', sort='featured', page=1;
function stats(items) {
  const live=items.filter(open), next=[...live].sort((a,b)=>Date.parse(a.deadline)-Date.parse(b.deadline))[0];
  return `<section class="stats"><div><small>TAKING ENTRIES</small><strong>${live.length}<em> open bounties</em></strong></div><div><small>TOTAL LIVE POTS</small><strong>${money(live.reduce((s,b)=>s+pot(b),0))}<em> USDC</em></strong></div><div><small>ENTRIES IN PLAY</small><strong>${live.reduce((s,b)=>s+b.submissionCount,0).toLocaleString()}<em> and counting</em></strong></div><div><small>NEXT TO CLOSE</small><strong>${next?timer(next.deadline):'—'}</strong></div></section>`;
}
function card(b, i, max) {
 const progress=Math.max(2,Math.min(100,(Date.now()-Date.parse(b.publishedAt))/(Date.parse(b.deadline)-Date.parse(b.publishedAt))*100));
 return `<article class="card"><div class="card-top"><span class="category">${icons[b.category]||'✳'} ${esc(b.category)}</span>${pot(b)===max?'<span class="tag">LARGEST LIVE POT</span>':`<span class="serial">${String(i+1).padStart(2,'0')} / BOUNTY</span>`}</div><h3><a href="${url(b)}">${esc(b.title)} <span>↗</span></a></h3><p>${esc(b.summary || b.description?.split('\n')[0])}</p><div class="pot-line"><strong>${money(pot(b))}</strong><span>live pot${Number(b.entryFeesUsd)>0?`<em>+${money(b.entryFeesUsd)} in fees</em>`:'<em>funded in USDC</em>'}</span></div><div class="card-meta"><span>${Number(b.entryFeeUsd)?money(b.entryFeeUsd)+' entry':'<b>FREE</b> entry'}</span><span>${b.submissionCount.toLocaleString()} entries</span>${timer(b.deadline)}</div><div class="progress"><i style="width:${progress}%" class="${urgency(b.deadline)}"></i></div><div class="card-bottom"><span>make.fun</span><a href="${url(b)}/leaderboard">Leaderboard →</a></div></article>`;
}
function boardSelection(items) {
 const active=items.filter(b=>b.status==='open');
 const settled=items.filter(b=>b.status!=='open').sort((a,b)=>Date.parse(b.deadline)-Date.parse(a.deadline));
 return [...active,...settled.slice(0,Math.max(0,11-active.length))];
}
function renderCards() {
 let items=boardItems.filter(b=>(filter==='All'||b.category===filter)&&(feeFilter==='all'||(feeFilter==='paid')===Boolean(Number(b.entryFeeUsd)))&&`${b.title} ${b.summary} ${b.skills?.join(' ')}`.toLowerCase().includes(search.toLowerCase()));
 items.sort((a,b)=>sort==='pot'?pot(b)-pot(a):sort==='closing'?Date.parse(a.deadline)-Date.parse(b.deadline):sort==='entries'?b.submissionCount-a.submissionCount:(b.slug==='makefun-frontend-01')-(a.slug==='makefun-frontend-01')||pot(b)-pot(a));
 document.querySelector('#results-count').textContent=`${items.length} bounties · ${boardItems.filter(open).length} taking entries`;
 const liveItems=boardItems.filter(open), max=liveItems.length?Math.max(...liveItems.map(pot)):0;
 document.querySelector('#cards').innerHTML=items.slice(0,page*20).map(b=>`<a class="board-row ${b.slug===selected?'selected':''}" href="${url(b)}" data-select="${esc(b.slug)}"><strong class="row-pot">${money(pot(b))}<small>${Number(b.entryFeeUsd)?money(b.entryFeeUsd)+' fee':'Free entry'}</small></strong><span class="row-title"><b>${esc(b.title)}</b><small>${open(b)?'OPEN':'CLOSED'} · ${Number(b.submissionCount).toLocaleString()} entries</small></span><span class="row-time">${timer(b.deadline)}<span class="progress"><i class="${urgency(b.deadline)}" style="width:${Math.max(3,Math.min(100,100*(Date.now()-Date.parse(b.publishedAt))/(Date.parse(b.deadline)-Date.parse(b.publishedAt))))}%"></i></span></span></a>`).join('')||'<div class="empty">No bounties match. Try another category or search.</div>';
 document.querySelector('#more').hidden=items.length<=page*20;
}
async function board() {
 const data=await get('/competitions?activity=times&limit=100'); boardItems=boardSelection(data.items);
 while(data.next_cursor){const next=await get('/competitions?activity=times&limit=100&cursor='+encodeURIComponent(data.next_cursor));boardItems.push(...next.items);data.next_cursor=next.next_cursor;}
 return `<section class="board-head"><div><div class="eyebrow"><span class="dot"></span> LIVE COMPETITIONS</div><h1>Open bounties</h1></div><span class="board-head-note">Build in public. Win on merit.</span></section>${stats(boardItems)}<div id="ticker" class="ticker"><span class="live">LIVE ACTIVITY</span><span>Reading the latest entries…</span></div><div class="proof"><span id="api-proof"></span><span id="freshness"></span></div><div class="master-detail"><section class="board-work"><div class="board-tools"><div class="section-title"><h2>Live board</h2><span id="results-count"></span></div><label class="search"><span>⌕</span><input id="search" type="search" placeholder="Search bounties…" value="${esc(search)}" aria-label="Search bounties"></label><div class="toolbar"><div class="categories">${['All','Code','Games','Growth','Trading','Forecasting','Security','Automation'].map(c=>`<button data-category="${c}" class="${filter===c?'active':''}">${c}</button>`).join('')}</div><div class="filter-actions"><div class="fee-pills">${['all','free','paid'].map(f=>`<button data-fee="${f}" class="${feeFilter===f?'active':''}">${f}</button>`).join('')}</div><select id="sort" aria-label="Sort bounties"><option value="featured">Featured</option><option value="pot">Largest pot</option><option value="closing">Closing soon</option><option value="entries">Most entries</option></select></div></div></div><div class="table-label"><span>LIVE POT / FEE</span><span>BOUNTY / ENTRIES</span><span>TIME LEFT</span></div><div class="cards" id="cards"></div><button class="load-more" id="more">Show more bounties ↓</button></section><aside id="selected-detail" class="selected-detail" aria-live="polite"></aside></div>`;
}
async function selectBounty(slug) {
 const token=++selectionToken;selected=slug;renderCards();
 const panel=document.querySelector('#selected-detail');panel.innerHTML='<p class="loading">Reading bounty…</p>';
 try {
 const [b,d]=await Promise.all([bountyData(slug),leaderboardData(slug)]);
 await Promise.all([bountyData(slug),leaderboardData(slug),get('/competitions?activity=times&limit=100')]);
 if(token!==selectionToken||!panel.isConnected)return;
 boardItems=boardItems.map(item=>item.slug===b.slug?{...item,...b}:item);renderCards();
 const rewards=[];
 for(const r of b.rewardsNow||[]){const prev=rewards.at(-1);if(prev&&prev.baseUsd===r.baseUsd&&prev.feeShareUsd===r.feeShareUsd&&prev.amountUsd===r.amountUsd)prev.last=r.place;else rewards.push({...r,last:r.place});}
 const top=[...(d.entries||[]),...(d.rest||[])].slice(0,5);
 const nav=document.querySelector('.nav-profile');if(top[0])nav.href=profile(top[0].handle);
 panel.innerHTML=`<div class="selection-heading"><span class="category">${esc(b.category)} / SELECTED BOUNTY</span><a href="${url(b)}">Overview ↗</a></div><h2><a href="${url(b)}">${esc(b.title)}</a></h2><div class="detail-status"><span class="dot"></span>${open(b)?'Taking entries':'Entries closed'} · ${esc(b.slug)}</div><div class="mini-stats"><div class="live-pot"><small>LIVE POT · USDC</small><strong>${money(pot(b))}</strong><p>${money(b.rewardAmount)} reward + ${money(b.entryFeesUsd)} from ${Number(b.entryFeePayers||0).toLocaleString()} entry fees</p></div><div><small>ENTRY FEE</small><strong>${Number(b.entryFeeUsd)?money(b.entryFeeUsd):'Free'}</strong></div><div><small>TIME LEFT</small><strong>${timer(b.deadline)}</strong></div><div><small>ENTRIES</small><strong>${Number(b.submissionCount).toLocaleString()}</strong></div></div><div class="mini-title"><h3>Rewards</h3><span>Base + fee share = payout</span></div><table class="mini-rewards"><thead><tr><th>Place</th><th>Base</th><th>Fee share</th><th>Amount</th></tr></thead><tbody>${rewards.map(r=>`<tr><td>${r.place}${r.last!==r.place?'–'+r.last:''}</td><td>${money(r.baseUsd)}</td><td class="fee-share">+${money(r.feeShareUsd)}</td><td><b>${money(r.amountUsd)}</b></td></tr>`).join('')}</tbody><tfoot><tr><td colspan="3">Live pot · grouped amounts are per place</td><td>${money(pot(b))}</td></tr></tfoot></table><div class="mini-dates"><div><small>OPENED</small>${shortDate(b.publishedAt)}</div><div><small>DEADLINE</small>${shortDate(b.deadline)}</div><div><small>RESULTS BY</small>${resultsBy(b)}</div></div><div class="mini-title"><h3>Top 5 now</h3><span>${d.rank_key==='judge'?'Judge win rate':'Live score'} · provisional</span></div><div class="mini-leaders">${top.map((e,i)=>`<a href="${profile(e.handle)}"><span class="mini-rank">${i+1}</span><span>${esc(e.handle)}</span><strong>${esc(score(e,d))}</strong></a>`).join('')||'<p>Scores not published yet.</p>'}</div><div class="detail-actions"><a class="primary" href="https://make.fun${b.url}" target="_blank" rel="noopener">Enter on make.fun ↗</a><a href="${url(b)}/leaderboard">Full leaderboard →</a></div>`;
 await Promise.all([get(`/competitions/${encodeURIComponent(slug)}?submissions=summary`,true),get(`/competitions/${encodeURIComponent(slug)}/leaderboard?rows=all&ties=runs&phase=dev`,true),get('/competitions?activity=times&limit=100',true)]);
 for(let attempt=0;telemetry.unchanged===0&&attempt<5;attempt++)await get(`/competitions/${encodeURIComponent(slug)}?submissions=summary`,true);
 await Promise.all([bountyData(slug),leaderboardData(slug),get('/competitions?activity=times&limit=100')]);tick();
 }catch(e){if(panel.isConnected)panel.innerHTML=`<p class="empty">${esc(e.message)}</p><a href="#/bounty/${esc(slug)}">Open bounty →</a>`;}
}
function resultsBy(b){const text=b.resolution?.announce||'';const days=text.match(/within (\d+) day/);return days?shortDate(new Date(Date.parse(b.deadline)+Number(days[1])*86400000).toISOString()):esc(text.split(/[.;]/)[0]||'Not announced');}
function shortDate(v){return new Date(v).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC'}).replace(',','')+' UTC';}
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
 const [b,standings,recent]=await Promise.all([bountyData(slug),leaderboardData(slug),get(`/competitions/${encodeURIComponent(slug)}/submissions?limit=5`)]);
 const rawRewards=b.rewardsNow||Object.entries(b.rewards||{}).map(([place,base])=>({place,baseUsd:base,feeShareUsd: Number(base)/Number(b.rewardAmount)*Number(b.entryFeesUsd||0),amountUsd:Number(base)/Number(b.rewardAmount)*pot(b)}));
 const rewards=[];
 for(const r of rawRewards){const previous=rewards.at(-1);if(previous&&previous.baseUsd===r.baseUsd&&previous.feeShareUsd===r.feeShareUsd&&previous.amountUsd===r.amountUsd){previous.lastPlace=r.place;}else rewards.push({...r,lastPlace:r.place});}
 return bountyHeader(b,'overview')+`<section class="reward-panel reward-overview"><div class="reward-summary"><div><div class="eyebrow"><span class="dot"></span> LIVE REWARD POOL</div><div class="big-pot">${money(pot(b))}<span>USDC</span></div><p class="fee-equation">${money(b.rewardAmount)} base reward <b>+ ${money(b.entryFeesUsd)}${Number(b.entryFeeUsd)?` from ${Number(b.entryFeePayers||0).toLocaleString()} entry fees`:' fees paid'}</b></p></div><div class="quick-facts"><div><small>TIME LEFT</small>${timer(b.deadline)}</div><div><small>ENTRY FEE</small><strong>${Number(b.entryFeeUsd)?money(b.entryFeeUsd):'FREE'}</strong></div><div><small>ENTRIES</small><strong>${Number(b.submissionCount||0).toLocaleString()}</strong></div></div><a class="primary" href="${url(b)}/leaderboard">Leaderboard ↗</a></div><div class="reward-label"><b>PLACE</b><span>BASE REWARD</span><span>FEE SHARE</span><span>SHARE BAR</span><span>LIVE PAYOUT</span></div>${rewards.map(r=>`<div class="reward"><span>${String(r.place).padStart(2,'0')}${r.lastPlace!==r.place?'–'+String(r.lastPlace).padStart(2,'0'):''}</span><strong class="reward-base">${money(r.baseUsd)}</strong><small class="reward-fee">+${money(r.feeShareUsd)}</small><div class="reward-bar"><i style="width:${Math.max(5,Number(r.amountUsd)/Number(rewards[0]?.amountUsd)*100)}%"></i></div><strong>${money(r.amountUsd)}</strong></div>`).join('')}<small class="reward-note">Amounts shown per place · equal payouts grouped. Fee shares reflect entry fees paid so far. Final payouts depend on awarded places.</small></section><div class="detail-fill"><article><section id="rules" class="detail-rules"><div class="eyebrow">HOW THIS COMPETITION WORKS</div><h2>Rules & judging</h2><p>${esc(b.resolution?.summary||b.summary)}</p><details><summary>Full requirements & tie-break</summary>${markdown(b.description)}<p>${esc(b.resolution?.tieBreak)}</p>${(b.resolution?.criteria||[]).map(c=>`<p>${esc(c)}</p>`).join('')}</details></section><section class="recent-entries"><div class="mini-title"><h3>Recent entry activity</h3><span>Live submission feed</span></div>${(recent.items||[]).map(e=>`<a href="${profile(e.handle)}"><b>@${esc(e.handle)}</b><span>${esc(e.status)}</span><small>${shortDate(e.created_at)}</small><p>${esc(e.title)}</p></a>`).join('')||'<p>No entries published yet.</p>'}</section><div class="mini-title"><h3>Top 5 now</h3><a href="${url(b)}/leaderboard">All standings ↗</a></div><div class="mini-leaders">${[...(standings.entries||[]),...(standings.rest||[])].slice(0,5).map((e,i)=>`<a href="${profile(e.handle)}"><span class="mini-rank">${i+1}</span>${esc(e.handle)}<strong>${esc(score(e,standings))}</strong></a>`).join('')}</div></article><aside class="panel phase-rail"><h3>Dates and phases</h3><dl><dt>Opened</dt><dd>${shortDate(b.publishedAt)}</dd>${(b.phases||[]).filter(p=>p.key==='dev').map(p=>`<dt>Development</dt><dd>${shortDate(p.startsAt)}<br>→ ${shortDate(p.endsAt)}</dd>`).join('')}<dt>Deadline</dt><dd>${shortDate(b.deadline)}</dd>${(b.phases||[]).filter(p=>p.key==='final').map(p=>`<dt>Final</dt><dd>${shortDate(p.startsAt)}<br>→ ${shortDate(p.endsAt)}</dd>`).join('')}<dt>Results by</dt><dd>${resultsBy(b)}</dd></dl><small>UTC · published API schedule. Results target follows the announce rule.</small></aside></div>`;
}
let leaders=[], leaderBoard;
function score(row, data) {const key=data.rank_key,v=row.values?.[key]??row.rank_key_value;return key==='judge'&&v!=null?(Number(v)/10000).toFixed(2)+'%':row.display?.[key]??row.rank_key_display??v??'—';}
let inspected=0, leaderBounty;
const range = e => e.interval ? `${(Number(e.interval.low)/10000).toFixed(2)}–${(Number(e.interval.high)/10000).toFixed(2)}%` : 'Not published';
const record = e => e.judge ? `${e.judge.wins}W · ${e.judge.draws}D · ${e.judge.losses}L` : 'Not published';
const prize = e => e.prize_eligible===false ? 'Ineligible' : leaderBounty.rewardsNow?.find(r=>Number(r.place)===Number(e.prize_rank||e.rank))?.amountUsd;
function inspectEntrant(index) {
 inspected=index;const e=leaders[index],panel=document.querySelector('#entrant-inspector');if(!e||!panel)return;
 panel.innerHTML=`<div class="eyebrow">ENTRANT INSPECTOR</div>${avatar(e)}<h3>${esc(e.handle)}</h3><p>${esc(e.title)}</p><dl><dt>Current place</dt><dd>#${e.rank}</dd><dt>Judge score</dt><dd>${esc(score(e,leaderBoard))}</dd><dt>90% range</dt><dd>${range(e)}</dd><dt>Win / draw / loss</dt><dd>${record(e)}</dd><dt>Projected prize</dt><dd>${prize(e)==='Ineligible'?'Ineligible':prize(e)?money(prize(e)):'Outside paid places'}</dd></dl><p class="inspector-note">Provisional · final heat decides payouts.</p><a class="primary" href="${profile(e.handle)}">Builder profile ↗</a><small>Received ${date(e.received_at)}</small>`;
 document.querySelectorAll('[data-entrant]').forEach(row=>row.classList.toggle('chosen',Number(row.dataset.entrant)===index));
}
function leaderRows() {
 const viewport=document.querySelector('#leader-viewport');if(!viewport)return;
 const height=62, start=Math.max(0,Math.floor(viewport.scrollTop/height)-2),end=Math.min(leaders.length,Math.ceil((viewport.scrollTop+viewport.clientHeight)/height)+2);
 document.querySelector('#leader-rows').style.height=leaders.length*height+'px';
 document.querySelector('#leader-window').style.transform=`translateY(${start*height}px)`;
 document.querySelector('#leader-window').innerHTML=leaders.slice(start,end).map((e,i)=>`<button type="button" class="virtual-row ${start+i===inspected?'chosen':''}" data-entrant="${start+i}" aria-label="Inspect ${esc(e.handle)}"><span class="virtual-place">${e.rank||start+i+1}</span><span class="virtual-builder"><b>${esc(e.handle)}</b><small>${esc(e.title)}</small><em>${record(e)}</em></span><span class="virtual-score"><b>${esc(score(e,leaderBoard))}</b><small>${range(e)} · 90%</small></span><span class="virtual-prize">${prize(e)==='Ineligible'?'—':prize(e)?money(prize(e)):'—'}</span></button>`).join('');
 document.querySelector('#dom-counter').textContent=`${document.querySelectorAll('#leader-window > .virtual-row').length} in the DOM / ${leaders.length} rows`;
}
async function leaderboard(slug) {
 const [b,d]=await Promise.all([bountyData(slug),leaderboardData(slug,new URLSearchParams(location.hash.split('?')[1]).get('phase')||'dev')]);
 leaderBoard=d;leaderBounty=b;leaders=[...(d.entries||[]),...(d.rest||[])];inspected=0;
 return bountyHeader(b,'leaderboard')+`<section class="standings"><div class="section-title"><div><div class="eyebrow">WINDOWED LIVE STANDINGS</div><h2>Leaderboard</h2></div><div class="phase-switch"><a class="${d.phase?.key==='dev'?'active':''}" href="${url(b)}/leaderboard?phase=dev">Development</a><a class="${d.phase?.key==='final'?'active':''}" href="${url(b)}/leaderboard?phase=final">Final</a></div></div><div class="board-note"><span>Provisional · scroll to explore every entrant</span><b id="dom-counter"></b></div><div class="leader-layout"><div><div class="virtual-label"><span>#</span><span>BUILDER / W–D–L</span><span>SCORE / 90% RANGE</span><span>PRIZE</span></div><div id="leader-viewport" tabindex="0" aria-label="Scrollable virtualized leaderboard"><div id="leader-rows"><div id="leader-window"></div></div></div></div><aside id="entrant-inspector" class="panel"></aside></div></section>`;
}
async function withBoardRail(content,slug) {
 const data=await get('/competitions?activity=times&limit=100');const current=await bountyData(slug);boardItems=boardSelection(data.items).map(item=>item.slug===slug?{...item,...current}:item);
 return `<div class="surface-split"><aside class="live-board-rail"><div class="section-title"><h2>Live board</h2><span>${boardItems.filter(open).length} open</span></div><p>Same arena. Keep exploring.</p>${boardItems.sort((a,b)=>Number(open(b))-Number(open(a))||pot(b)-pot(a)).map(b=>`<a class="rail-bounty ${b.slug===slug?'chosen':''}" href="${url(b)}"><span><b>${esc(b.title)}</b><small>${b.submissionCount} entries · ${Number(b.entryFeeUsd)?money(b.entryFeeUsd)+' fee':'Free'}</small></span><strong>${money(pot(b))}</strong><span class="rail-time">${timer(b.deadline)}</span><span class="progress"><i class="${urgency(b.deadline)}" style="width:${Math.max(3,Math.min(100,100*(Date.now()-Date.parse(b.publishedAt))/(Date.parse(b.deadline)-Date.parse(b.publishedAt))))}%"></i></span></a>`).join('')}<a class="rail-back" href="#/">← Full board & filters</a></aside><div class="surface-content">${content}</div></div>`;
}
async function account(handle) {
 const p=await profileData(handle),r=p.record;
 const places=p.solutions.map(s=>Number(s.placement)).filter(n=>n>0), best=places.length?Math.min(...places):null;
 const richer=`<section class="profile-derived"><div><small>BEST PLACE</small><strong>${best?'#'+best:'Unplaced'}</strong></div><div><small>PRIZE PER ENTRY</small><strong>${money(Number(r.prize_usd)/Math.max(1,p.solutions.length))}</strong></div><div><small>PLACED / WON</small><strong>${r.competitions_placed} / ${r.competitions_won}</strong></div><p>Across ${p.solutions.length} public entries · paid prizes ÷ entries</p></section>`;
 return `<div class="breadcrumbs"><a href="#/">Bounties</a><span>/</span>Builder profile</div><section class="profile-head">${avatar(p)}<div><div class="eyebrow">PUBLIC BUILDER PROFILE</div><h1>${esc(p.display_name||p.handle)}</h1><p>@${esc(p.handle)} · Joined ${date(p.joined_at).split(',')[0]}</p>${p.bio?`<p>${esc(p.bio)}</p>`:''}</div></section><section class="stats"><div><small>COMPETITIONS ENTERED</small><strong>${r.competitions_entered}</strong></div><div><small>FIRST-PLACE WINS</small><strong>${r.competitions_won}</strong></div><div><small>PRIZE PLACEMENTS</small><strong>${r.competitions_placed}</strong></div><div><small>TOTAL PRIZES PAID</small><strong>${money(r.prize_usd)}</strong></div></section>${richer}<div class="section-title"><h2>Build history <span>↘</span></h2><span>${p.solutions.length} public entries</span></div><section id="solutions">${p.solutions.slice(0,solutionLimit).map(s=>`<article class="solution"><div><span class="category">${esc(s.competition.category)} ${s.placement?'· PLACE '+s.placement:''}</span><h3><a href="#/bounty/${esc(s.competition.slug)}">${esc(s.competition.title)} ↗</a></h3><p>${esc(s.title)}</p><small>${date(s.entered_at)}</small></div><div><strong>${s.prize_usd?money(s.prize_usd):s.score?esc(s.score.column.key==='judge'?(s.score.value/10000).toFixed(2)+'%':s.score.display):'Submitted'}</strong><a href="#/bounty/${esc(s.competition.slug)}/leaderboard">View standings →</a></div></article>`).join('')||'<p class="empty">No public entries yet.</p>'}</section>${p.solutions.length>solutionLimit?'<button id="solution-more" class="load-more">Show all public entries ↓</button>':''}`;
}
async function route() {
 const token=++generation;window.__shotReady=false;
 root.setAttribute('aria-busy','true');
 const parts=(location.hash.slice(2)||'').split('?')[0].split('/');
 document.querySelectorAll('header nav a').forEach(a=>{const active=parts[0]==='profile'?a.classList.contains('nav-profile'):parts[2]==='leaderboard'?a.textContent.includes('Standings'):a.classList.contains('nav-board');if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 root.innerHTML='<p class="loading">Loading live data<span>✳</span></p>';
 try {
  let html;
  if(parts[0]==='bounty'&&parts[1]){const slug=decodeURIComponent(parts[1]);html=await withBoardRail(parts[2]==='leaderboard'?await leaderboard(slug):await bounty(slug),slug);}
  else if(parts[0]==='profile'&&parts[1])html=await account(decodeURIComponent(parts[1]));
  else html=await board();
  if(token!==generation)return;
  root.innerHTML=html;
  if(document.querySelector('#cards')){renderCards();document.querySelector('#sort').value=sort;await Promise.all([extras(token),selectBounty(selected)]);}
  if(document.querySelector('#leader-viewport')){leaderRows();inspectEntrant(0);document.querySelector('#leader-viewport').addEventListener('scroll',leaderRows,{passive:true});}
  document.title=(root.querySelector('h1')?.textContent||'Bounties')+' | make.fun';
 }catch(e){if(token===generation)root.innerHTML=`<div class="empty"><h1>Let’s try that again.</h1><p>${esc(e.message)}</p><button id="retry">Retry live data</button> <a href="#/">Back to bounties</a></div>`;}
 if(token===generation){root.removeAttribute('aria-busy');tick();window.__shotReady=true;window.scrollTo(0,0);}
}
root.addEventListener('click',e=>{
 const entrant=e.target.closest('[data-entrant]');if(entrant)inspectEntrant(Number(entrant.dataset.entrant));
 const row=e.target.closest('[data-select]');if(row){e.preventDefault();selectBounty(row.dataset.select);}
 const c=e.target.closest('[data-category]'),f=e.target.closest('[data-fee]');
 if(c){filter=c.dataset.category;page=1;document.querySelectorAll('[data-category]').forEach(b=>b.classList.toggle('active',b===c));renderCards();}
 if(f){feeFilter=f.dataset.fee;page=1;document.querySelectorAll('[data-fee]').forEach(b=>b.classList.toggle('active',b===f));renderCards();}
 if(e.target.id==='solution-more'){solutionLimit=Infinity;route();}
 if(e.target.id==='more'){page++;renderCards();}
  if(e.target.id==='retry')route();
 if(e.target.closest('[data-rules]')){e.preventDefault();const section=document.querySelector('#rules');if(section)section.scrollIntoView({behavior:'smooth'});else{location.hash='#/bounty/'+location.hash.split('/')[2];setTimeout(()=>document.querySelector('#rules')?.scrollIntoView(),700);}}
});
root.addEventListener('input',e=>{if(e.target.id==='search'){search=e.target.value;page=1;renderCards();}});
root.addEventListener('change',e=>{if(e.target.id==='sort'){sort=e.target.value;page=1;renderCards();}});
try{document.documentElement.dataset.theme=localStorage.getItem('theme')||'dark';}catch{}
document.querySelector('#theme').onclick=()=>{const t=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=t;try{localStorage.setItem('theme',t);}catch{}};
function tick(){const proof=document.querySelector('#api-proof');if(proof)proof.innerHTML=`<b>${telemetry.requests} API requests</b> · ${telemetry.unchanged} unchanged (ETag) · ${telemetry.memory} from memory`;const freshness=document.querySelector('#freshness');if(freshness)freshness.textContent=`Updated ${Math.max(0,Math.floor((Date.now()-telemetry.updatedAt)/1000))}s ago · ETag-verified cache`;document.querySelector('#clock').textContent=new Date().toISOString().slice(11,19)+' UTC';document.querySelectorAll('[data-deadline]').forEach(el=>{el.textContent=left(el.dataset.deadline);el.className='time '+urgency(el.dataset.deadline);});}
setInterval(tick,1000);tick();window.addEventListener('hashchange',route);route();
