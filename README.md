<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
<title>Life Manager — All-in-One Offline Planner</title>
<style>
:root{
  --bg:#0f1720; --panel:#0b1220; --muted:#98a0b3; --accent:#4f46e5; --accent-2:#06b6d4; --card:#0f1726;
  --success:#16a34a; --danger:#ef4444; --orange:#f97316; --glass: rgba(255,255,255,0.03);
  --max-width:1200px; --radius:12px; --shadow: 0 6px 18px rgba(2,6,23,0.7);
  color-scheme: dark;
}
*{box-sizing:border-box;font-family:Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;}
html,body{height:100%;margin:0;background:
 linear-gradient(180deg,#071025 0%, #07172a 30%, #081428 100%); color:#e6eef8;}
.app{max-width:var(--max-width);margin:0 auto;padding:88px 12px 48px;}
.header{
  position:fixed;left:0;right:0;top:0;background:linear-gradient(180deg, rgba(2,6,23,0.7), rgba(2,6,23,0.45));
  backdrop-filter: blur(8px); padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.03);z-index:30;
  display:flex;align-items:center;gap:12px;
}
.brand{display:flex;gap:12px;align-items:center;}
.logo{
  width:54px;height:54px;border-radius:10px;background:linear-gradient(135deg,var(--accent),var(--accent-2));
  display:flex;align-items:center;justify-content:center;font-weight:700;color:white;font-size:18px;box-shadow:var(--shadow);
}
.title{font-size:16px;font-weight:700;margin-right:8px}
.header-right{margin-left:auto;display:flex;gap:8px;align-items:center;}
.btn{background:var(--glass);border:1px solid rgba(255,255,255,0.03);color:var(--muted);padding:8px 10px;border-radius:10px;font-size:13px;}
.primary{background:linear-gradient(90deg,var(--accent),var(--accent-2));color:white;border:none;box-shadow:0 8px 30px rgba(79,70,229,0.15)}
.icon{width:20px;height:20px;display:inline-block;vertical-align:middle}
.layout{display:grid;grid-template-columns: 1fr 360px;gap:12px;align-items:start;}
@media (max-width:900px){ .layout{grid-template-columns: 1fr; padding-bottom:180px;} .header{padding:8px;} .app{padding-top:100px;} }
.card{background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));border-radius:var(--radius);padding:12px;border:1px solid rgba(255,255,255,0.03);box-shadow:var(--shadow);}
.sidebar{position:sticky;top:76px;height:calc(100vh - 86px);overflow:auto;padding-bottom:120px;}
.live-dash{display:flex;flex-direction:column;gap:8px;position:relative;}
.dash-row{display:flex;gap:8px;align-items:center;justify-content:space-between;padding:8px;border-radius:10px;background:linear-gradient(180deg, rgba(255,255,255,0.01), transparent);}
.time-big{font-size:22px;font-weight:700}
.small{font-size:12px;color:var(--muted)}
.stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:8px}
.stat{padding:8px;border-radius:8px;background:rgba(255,255,255,0.02);display:flex;flex-direction:column}
.stat .num{font-weight:700;font-size:16px}
.quick-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.qbtn{flex:1 1 calc(50% - 8px);padding:12px;border-radius:10px;text-align:center;background:linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));font-weight:600;color:white}
@media (max-width:900px){ .qbtn{flex:1 1 48%} }

.main-column{display:flex;flex-direction:column;gap:12px}
.controls{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:6px}
.search{flex:1;display:flex;gap:8px}
.input{background:rgba(255,255,255,0.02);border-radius:10px;padding:8px 10px;border:1px solid rgba(255,255,255,0.03);color:#e6eef8;width:100%}
.filters{display:flex;gap:6px}
.list{display:flex;flex-direction:column;gap:8px}
.task{display:flex;gap:10px;align-items:center;padding:10px;border-radius:10px;background:linear-gradient(180deg, rgba(0,0,0,0.18), rgba(255,255,255,0.01));border:1px solid rgba(255,255,255,0.02)}
.task .left{flex:0 0 46px;height:46px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700}
.task .body{flex:1;display:flex;flex-direction:column}
.task .meta{display:flex;gap:8px;align-items:center;font-size:12px;color:var(--muted)}
.badge{padding:6px 8px;border-radius:8px;background:rgba(255,255,255,0.02);font-size:12px;color:var(--muted)}
.tag{display:inline-block;padding:4px 6px;border-radius:6px;background:rgba(255,255,255,0.02);font-size:11px;margin-right:6px}
.controls .btn{padding:8px 10px;border-radius:10px}
.footer-actions{display:flex;gap:6px;align-items:center;justify-content:flex-end;margin-top:6px}
.modal-backdrop{position:fixed;left:0;right:0;top:0;bottom:0;background:rgba(2,6,23,0.7);display:none;align-items:center;justify-content:center;z-index:50;padding:12px}
.modal{width:100%;max-width:820px;background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));border-radius:12px;padding:12px;border:1px solid rgba(255,255,255,0.03)}
.form-grid{display:grid;grid-template-columns:1fr 240px;gap:8px}
@media (max-width:900px){ .form-grid{grid-template-columns:1fr} }
.field{display:flex;flex-direction:column;gap:6px;margin-bottom:6px}
.label{font-size:12px;color:var(--muted)}
textarea.input{min-height:90px;resize:vertical}
.small-muted{font-size:12px;color:var(--muted)}
.row{display:flex;gap:8px;align-items:center}
.habit-calendar{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
.habit-day{padding:8px;border-radius:8px;text-align:center;background:rgba(255,255,255,0.02);font-size:12px}
.habit-day.done{background:linear-gradient(90deg,var(--accent),var(--accent-2));color:white}
.reminder{display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;background:rgba(255,255,255,0.02)}
.small-pill{padding:6px 8px;border-radius:999px;background:rgba(255,255,255,0.02);font-size:12px}
.kv{display:flex;justify-content:space-between;gap:8px}
.controls .select, .input, .btn{font-size:13px}
.history-list{max-height:220px;overflow:auto;padding:8px;border-radius:8px;background:rgba(255,255,255,0.01)}
.link{color:var(--accent);text-decoration:underline;cursor:pointer}
.footer{margin-top:20px;color:var(--muted);font-size:13px;text-align:center}
.small-action{font-size:12px;color:var(--muted);border:none;background:none}
.separator{height:1px;background:rgba(255,255,255,0.03);margin:8px 0;border-radius:2px}
.file-preview{max-width:100%;border-radius:8px;margin-top:8px}
.dragging{opacity:0.6;border:2px dashed rgba(255,255,255,0.06)}
</style>
</head>
<body>
<div class="header">
  <div class="brand">
    <div class="logo">LM</div>
    <div>
      <div class="title">Life Manager</div>
      <div class="small">Offline personal life & time management</div>
    </div>
  </div>
  <div class="header-right">
    <button class="btn" id="exportBtn" title="Export data">Export</button>
    <button class="btn" id="importBtn" title="Import data">Import</button>
    <button class="btn" id="undoBtn" title="Undo">Undo</button>
    <button class="btn" id="redoBtn" title="Redo">Redo</button>
    <button class="btn primary" id="newTaskBtn">+ New Task</button>
  </div>
</div>

<main class="app">
  <div class="layout">
    <section class="main-column">
      <div class="card controls">
        <div style="flex:1;display:flex;gap:8px;align-items:center">
          <div class="search" style="flex:1">
            <input id="searchInput" class="input" placeholder="Search tasks, tags, notes..." />
          </div>
          <div class="filters">
            <select id="filterCategory" class="input select">
              <option value="">All Categories</option>
            </select>
            <select id="sortSelect" class="input select">
              <option value="order">Order</option>
              <option value="start_desc">Start Time ↓</option>
              <option value="start_asc">Start Time ↑</option>
              <option value="priority">Priority</option>
              <option value="duration">Duration</option>
              <option value="created_desc">Created ↓</option>
            </select>
          </div>
        </div>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-weight:700">Tasks</div>
          <div class="small-muted">Tap a task to start/stop. Drag to reorder.</div>
        </div>
        <div id="tasksList" class="list" aria-live="polite"></div>
        <div class="footer-actions">
          <button class="btn" id="archiveCompleted">Archive Completed</button>
          <button class="btn" id="clearArchived">Clear Archived</button>
        </div>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:700">Journal</div>
          <button class="btn" id="newJournalBtn">+ New Entry</button>
        </div>
        <div id="journalList" style="margin-top:8px"></div>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:700">Habits</div>
          <div class="small-muted">Track daily habits and streaks</div>
        </div>
        <div id="habitsContainer" style="margin-top:8px"></div>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:700">Reminders</div>
          <div class="small-muted">Pending / upcoming / overdue</div>
        </div>
        <div id="remindersList" style="margin-top:8px"></div>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:700">Analytics</div>
          <div class="small-muted">Daily breakdown & productivity</div>
        </div>
        <div id="analytics" style="margin-top:8px"></div>
      </div>

    </section>

    <aside class="sidebar card">
      <div class="live-dash">
        <div class="dash-row">
          <div>
            <div id="dateLine" class="small"></div>
            <div class="time-big" id="timeBig">--:--</div>
            <div class="small" id="timeSec">--:--:--</div>
          </div>
          <div style="text-align:right">
            <div class="small">Active</div>
            <div id="activeTaskName" class="small-muted">None</div>
            <div id="activeDuration" class="small-muted">00:00:00</div>
          </div>
        </div>

        <div class="stat-grid" style="margin-top:8px">
          <div class="stat"><div class="small">Total Today</div><div class="num" id="totalToday">0h 0m</div></div>
          <div class="stat"><div class="small">Study Today</div><div class="num" id="studyToday">0h 0m</div></div>
          <div class="stat"><div class="small">Breaks</div><div class="num" id="breakToday">0h 0m</div></div>
          <div class="stat"><div class="small">Exercise</div><div class="num" id="exerciseToday">0h 0m</div></div>
        </div>

        <div class="separator"></div>
        <div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:700">Quick Actions</div><div class="small-muted">One-tap start</div></div>
        <div class="quick-actions" id="quickActions"></div>

        <div class="separator"></div>
        <div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:700">Categories</div><button class="btn" id="manageCats">Manage</button></div>
        <div id="catList" style="margin-top:8px;display:flex;flex-direction:column;gap:6px"></div>

        <div class="separator"></div>
        <div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:700">History</div><div class="small-muted">Undo/Redo stack</div></div>
        <div class="history-list" id="historyList"></div>

      </div>
    </aside>
  </div>

  <div class="footer">Life Manager — All data stored locally. Use Export/Import to move data between devices.</div>
</main>

<!-- Modal backdrop -->
<div id="modalBackdrop" class="modal-backdrop" role="dialog" aria-modal="true">
  <div class="modal" id="modal">
    <!-- dynamic content -->
  </div>
</div>

<script>
/* IndexedDB helper (promise-based, small)
   Stores object stores: tasks, categories, reminders, habits, journal, settings, history
*/
const DB_NAME = 'life_manager_db_v1';
const DB_VERSION = 1;
let db;
function openDB(){
  return new Promise((res,rej)=>{
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = e => {
      const d = e.target.result;
      if(!d.objectStoreNames.contains('tasks')) d.createObjectStore('tasks',{keyPath:'id'});
      if(!d.objectStoreNames.contains('categories')) d.createObjectStore('categories',{keyPath:'id'});
      if(!d.objectStoreNames.contains('reminders')) d.createObjectStore('reminders',{keyPath:'id'});
      if(!d.objectStoreNames.contains('habits')) d.createObjectStore('habits',{keyPath:'id'});
      if(!d.objectStoreNames.contains('journal')) d.createObjectStore('journal',{keyPath:'id'});
      if(!d.objectStoreNames.contains('settings')) d.createObjectStore('settings',{keyPath:'key'});
      if(!d.objectStoreNames.contains('history')) d.createObjectStore('history',{keyPath:'id',autoIncrement:true});
    };
    r.onsuccess = e => { db = e.target.result; res(db); };
    r.onerror = e => rej(e.target.error);
  });
}
function idbPut(store, value){ return new Promise((res,rej)=>{ const tx = db.transaction(store,'readwrite'); tx.objectStore(store).put(value); tx.oncomplete=()=>res(true); tx.onerror=()=>rej(tx.error); });}
function idbGetAll(store){ return new Promise((res,rej)=>{ const tx = db.transaction(store,'readonly'); const req = tx.objectStore(store).getAll(); req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error); });}
function idbGet(store,key){ return new Promise((res,rej)=>{ const tx = db.transaction(store,'readonly'); const req = tx.objectStore(store).get(key); req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error); });}
function idbDelete(store,key){ return new Promise((res,rej)=>{ const tx = db.transaction(store,'readwrite'); tx.objectStore(store).delete(key); tx.oncomplete=()=>res(true); tx.onerror=()=>rej(tx.error); });}

/* Utilities */
const uid = (pfx='id') => pfx+'_'+Math.random().toString(36).slice(2,9);
const nowISO = ()=> new Date().toISOString();
function formatDurationSec(s){
  if(!s) return '00:00:00';
  const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
  return [h,m,sec].map(v=>String(v).padStart(2,'0')).join(':');
}
function humanHoursMin(totalSec){
  const h=Math.floor(totalSec/3600), m=Math.round((totalSec%3600)/60);
  return h+'h '+m+'m';
}
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function todayRange(){
  const s = new Date(); s.setHours(0,0,0,0);
  const e = new Date(); e.setHours(23,59,59,999);
  return [s,e];
}

/* Models and defaults */
const defaultCategories = [
  {id:'cat_study',name:'Study',color:'#4f46e5',icon:'📚',goalHours:4,visible:true,quick:true},
  {id:'cat_break',name:'Break',color:'#f97316',icon:'☕',goalHours:1,visible:true,quick:true},
  {id:'cat_exercise',name:'Exercise',color:'#16a34a',icon:'🏃',goalHours:1,visible:true,quick:true},
  {id:'cat_read',name:'Reading',color:'#06b6d4',icon:'📖',goalHours:1,visible:true,quick:true},
  {id:'cat_sleep',name:'Sleep',color:'#0ea5a3',icon:'😴',goalHours:8,visible:true,quick:false}
];

let STORE = {tasks:[],categories:[],reminders:[],habits:[],journal:[],settings:{},history:[]};
let HISTORY_STACK = JSON.parse(localStorage.getItem('lm_history')||'[]');
let REDO_STACK = JSON.parse(localStorage.getItem('lm_redo')||'[]');

/* Persistence helpers */
async function saveStateSnapshot(action, payload){
  const snapshot = {id: uid('snap'), timestamp: nowISO(), action, payload};
  await idbPut('history', snapshot);
  // push to in-memory list and localStorage for UI
  HISTORY_STACK.push(snapshot);
  localStorage.setItem('lm_history', JSON.stringify(HISTORY_STACK.slice(-200)));
  REDO_STACK = []; localStorage.setItem('lm_redo', JSON.stringify(REDO_STACK));
  renderHistory();
}
async function persistItem(storeName, item){
  await idbPut(storeName, item);
  await refreshStore();
  saveStateSnapshot('put_'+storeName, {id:item.id});
}
async function deleteItem(storeName, id){
  await idbDelete(storeName, id);
  await refreshStore();
  saveStateSnapshot('delete_'+storeName, {id});
}

/* Load all data */
async function refreshStore(){
  STORE.tasks = (await idbGetAll('tasks')) || [];
  STORE.categories = (await idbGetAll('categories')) || [];
  STORE.reminders = (await idbGetAll('reminders')) || [];
  STORE.habits = (await idbGetAll('habits')) || [];
  STORE.journal = (await idbGetAll('journal')) || [];
  // settings: map by key
  const allSettings = (await idbGetAll('settings')) || [];
  STORE.settings = {}; allSettings.forEach(s => STORE.settings[s.key]=s.value);
  renderAll();
}

/* Bootstrapping default categories */
async function ensureDefaults(){
  const cats = await idbGetAll('categories');
  if(!cats || cats.length===0){
    for(const c of defaultCategories) await idbPut('categories', c);
  }
  // ensure root settings
  const s = await idbGet('settings','app');
  if(!s) await idbPut('settings',{key:'app', value:{createdAt:nowISO()}});
}

/* UI bindings */
const elements = {};
function $id(id){ return document.getElementById(id); }

function renderAll(){
  renderCategories();
  renderQuickActions();
  renderTasks();
  renderHabits();
  renderReminders();
  renderJournal();
  renderStats();
  renderHistory();
}

/* Tasks render, create/edit */
function renderTasks(){
  const list = $id('tasksList'); list.innerHTML='';
  const q = $id('searchInput').value.trim().toLowerCase();
  const catFilter = $id('filterCategory').value;
  let tasks = STORE.tasks.filter(t=>!t.archived);
  if(catFilter) tasks = tasks.filter(t=>t.categoryId===catFilter);
  if(q) tasks = tasks.filter(t=>{
    return (t.name||'').toLowerCase().includes(q) || (t.tags||[]).join(' ').toLowerCase().includes(q) || (t.notes||'').toLowerCase().includes(q);
  });
  const sort = $id('sortSelect').value;
  if(sort==='start_desc') tasks.sort((a,b)=> (b.startTime||'').localeCompare(a.startTime||''));
  else if(sort==='start_asc') tasks.sort((a,b)=> (a.startTime||'').localeCompare(b.startTime||''));
  else if(sort==='priority') tasks.sort((a,b)=> (b.priority||0)-(a.priority||0));
  else if(sort==='duration') tasks.sort((a,b)=> (b.manualDuration||b.duration||0)-(a.manualDuration||a.duration||0));
  // default order by index or createdAt
  tasks.forEach((t, idx) => {
    const el = document.createElement('div'); el.className='task'; el.draggable=true;
    el.dataset.id = t.id;
    el.innerHTML = `
      <div class="left" style="background:${t.color||'#222'}">${t.icon||'〰'}</div>
      <div class="body">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:700">${escapeHtml(t.name||'Untitled')}</div>
          <div style="display:flex;gap:6px;align-items:center">
            <div class="badge">${t.status||'idle'}</div>
            <div class="small-muted">${t.priority?('P'+t.priority):''}</div>
          </div>
        </div>
        <div class="meta">
          <div class="small-muted">${t.categoryName||''}</div>
          <div class="tag">${t.tags?t.tags.join(', '):''}</div>
          <div style="margin-left:auto" class="small-muted">${formatDurationSec(Math.floor((t.manualDuration||t.duration||0)))}</div>
        </div>
      </div>
    `;
    // click to toggle start/stop
    el.addEventListener('click', async (ev)=>{
      ev.stopPropagation();
      await toggleTaskRunning(t.id);
    });
    // edit on long press or context menu
    el.addEventListener('contextmenu', ev=>{ ev.preventDefault(); openTaskEditor(t.id); });
    // drag events for reorder
    el.addEventListener('dragstart', e=>{ e.dataTransfer.set# Vishal
