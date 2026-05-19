/* ═══════════════════════════════════════
   AdMate Help Center — app.js
═══════════════════════════════════════ */

const ADMIN = { id: 'admin', pw: 'admate2025' };

const CATS = [
  { id: 'facebook',  label: 'Facebook',    icon: '📘', color: '#1877F2', bg: '#E7F0FD', desc: '캠페인 설정, 픽셀, 맞춤 타겟 관리' },
  { id: 'instagram', label: 'Instagram',   icon: '📸', color: '#E1306C', bg: '#FDE8EF', desc: '쇼핑 태그, 스토리 광고, 인사이트' },
  { id: 'twitter',   label: 'X (Twitter)', icon: '🐦', color: '#14171A', bg: '#E7E8E8', desc: '프로모션, 트위터 카드, 타겟팅' },
  { id: 'google',    label: 'Google Ads',  icon: '🔍', color: '#4285F4', bg: '#E8F0FE', desc: '검색광고, 디스플레이, 전환 추적' },
];

const FAQS = [
  { q: '무료 체험 기간이 있나요?',            a: '네, 신규 가입 시 14일 무료 체험을 제공합니다. 신용카드 없이 시작 가능하며 모든 프리미엄 기능을 사용할 수 있습니다.' },
  { q: '어떤 광고 플랫폼과 연동 가능한가요?',  a: 'Facebook, Instagram, X(Twitter), Google Ads를 포함한 15개 이상의 플랫폼과 연동됩니다. MMP는 AppsFlyer, Adjust, Airbridge를 지원합니다.' },
  { q: '데이터는 얼마나 자주 업데이트되나요?', a: '기본 설정은 매 6시간마다 자동 동기화됩니다. 프리미엄 플랜은 실시간(최소 15분 간격) 업데이트를 지원합니다.' },
  { q: '여러 팀원이 함께 사용할 수 있나요?',  a: '팀 플랜은 무제한 팀원 초대를 지원합니다. 역할별 권한 설정(관리자, 편집자, 조회자)도 가능합니다.' },
  { q: 'API를 통한 데이터 추출이 가능한가요?', a: '네, REST API를 통해 모든 데이터를 프로그래밍 방식으로 추출할 수 있습니다. Python, Node.js, Java SDK를 제공합니다.' },
  { q: '데이터 보안은 어떻게 관리되나요?',    a: 'AES-256 암호화 저장 및 TLS 1.3 전송, ISO 27001 인증, GDPR 및 개인정보보호법을 준수합니다.' },
];

/* ─── 상태 ─── */
let articles         = {};
let isAdmin          = false;
let currentPage      = 'home';
let currentCat       = null;
let currentArticleId = null;
let isEditMode       = false;
let pendingDeleteId  = null;
let toastTimer       = null;
let wSteps           = [{ text: '', media: [] }];
let wMedia           = [];
let wExcerptMedia    = [];

/* ─── 유틸 ─── */
function nl2br(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

/* ─── API ─── */
async function api(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

async function uploadFile(file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  if (!res.ok) throw new Error('업로드 실패');
  return res.json();
}

async function deleteFile(url) {
  await fetch('/api/upload', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) }).catch(() => {});
}

/* ─── 로딩 ─── */
function showLoading(on) {
  let el = document.getElementById('global-loading');
  if (on) {
    if (!el) { el = document.createElement('div'); el.id = 'global-loading'; el.innerHTML = '<div class="loading-spinner"></div>'; document.body.appendChild(el); }
    el.style.display = 'flex';
  } else {
    if (el) el.style.display = 'none';
  }
}

/* ─── 데이터 로드 ─── */
async function loadArticles() {
  showLoading(true);
  try {
    articles = await api('GET', '/api/articles');
  } catch (e) {
    showToast('⚠️ 서버 연결 실패. npm start를 확인하세요.');
    articles = {};
  } finally {
    showLoading(false);
  }
}

/* ─── HASH ROUTING ─── */
function buildHash(page, catId, artId) {
  if (page === 'home')     return '#/';
  if (page === 'category') return '#/category/' + catId;
  if (page === 'article')  return '#/article/' + catId + '/' + artId;
  return '#/';
}

function pushHash(page, catId, artId) {
  const h = buildHash(page, catId, artId);
  if (location.hash !== h) history.pushState(null, '', h);
}

function parseHash() {
  const parts = (location.hash || '#/').replace('#/', '').split('/').filter(Boolean);
  if (!parts.length) return { page: 'home' };
  if (parts[0] === 'category' && parts[1]) return { page: 'category', catId: parts[1] };
  if (parts[0] === 'article' && parts[1] && parts[2]) return { page: 'article', catId: parts[1], artId: parseInt(parts[2]) };
  return { page: 'home' };
}

function getArticleUrl(catId, artId) {
  return location.origin + location.pathname + buildHash('article', catId, artId);
}

/* ─── NAV ─── */
function updateNav() {
  document.getElementById('admin-badge').style.display      = isAdmin ? 'inline-flex' : 'none';
  document.getElementById('btn-admin-login').style.display  = isAdmin ? 'none' : 'inline-flex';
  document.getElementById('btn-admin-logout').style.display = isAdmin ? 'inline-flex' : 'none';
  document.querySelectorAll('.nav-link[data-cat]').forEach(el =>
    el.classList.toggle('active', el.dataset.cat === currentCat && currentPage === 'category')
  );
  const bw = document.getElementById('btn-write-new');
  if (bw) bw.style.display = isAdmin ? 'flex' : 'none';
}

/* ─── NAVIGATE ─── */
function navigate(page, catId, skipHash) {
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  currentPage = page;
  if (catId) currentCat = catId;
  if (!skipHash) pushHash(page, catId, currentArticleId);

  if (page === 'home') {
    document.getElementById('page-home').classList.add('active');
    renderHome();
  } else if (page === 'category') {
    document.getElementById('page-category').classList.add('active');
    document.getElementById('cat-search-input').value = '';
    renderCategoryPage();
  } else if (page === 'article') {
    document.getElementById('page-article').classList.add('active');
    renderArticlePage();
  } else if (page === 'write') {
    if (!isAdmin) { openLoginModal(); return; }
    document.getElementById('page-write').classList.add('active');
    initWriteForm();
  } else if (page === 'edit') {
    if (!isAdmin) return;
    document.getElementById('page-write').classList.add('active');
    initEditForm();
  }
  updateNav();
}

/* ─── HOME ─── */
function renderHome() {
  renderHomeCats();
  renderHomeArticles();
  renderFaqs();
  const total = Object.values(articles).reduce((s, a) => s + a.length, 0);
  document.getElementById('total-count').textContent = '총 ' + total + '개 문서';
}

function renderHomeCats() {
  document.getElementById('home-cat-grid').innerHTML = CATS.map(cat => {
    const cnt = (articles[cat.id] || []).length;
    return `<div class="cat-card" style="--cat-color:${cat.color}" onclick="navigate('category','${cat.id}')">
      <div class="cat-icon-wrap" style="background:${cat.bg}">${cat.icon}</div>
      <div class="cat-title">${cat.label}</div>
      <div class="cat-desc">${cat.desc}</div>
      <div class="cat-count">${cnt}개 문서</div>
    </div>`;
  }).join('');
}

function renderHomeArticles() {
  const all = CATS.flatMap(cat => (articles[cat.id] || []).map(a => ({ ...a, cat })));
  all.sort((a, b) => b.views - a.views);
  document.getElementById('home-art-grid').innerHTML = all.slice(0, 6).map(a => artCardHTML(a, a.cat)).join('');
}

function renderFaqs() {
  document.getElementById('faq-grid').innerHTML = FAQS.map((f, i) => `
    <div class="faq-item" id="faq-${i}" onclick="toggleFaq(${i})">
      <div class="faq-q"><div class="faq-question">${f.q}</div><button class="faq-toggle">+</button></div>
      <div class="faq-answer">${f.a}</div>
    </div>`).join('');
}

function toggleFaq(i) {
  const el = document.getElementById('faq-' + i);
  const open = el.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach(e => e.classList.remove('open'));
  if (!open) el.classList.add('open');
}

/* ─── CATEGORY ─── */
function renderCategoryPage() {
  const cat = CATS.find(c => c.id === currentCat);
  if (!cat) return;
  document.getElementById('cat-bc-current').textContent  = cat.label;
  document.getElementById('cat-page-icon').textContent   = cat.icon;
  document.getElementById('cat-page-title').textContent  = cat.label;
  document.getElementById('btn-write-new').style.display = isAdmin ? 'flex' : 'none';
  renderCategoryArticles();
}

function renderCategoryArticles() {
  const cat = CATS.find(c => c.id === currentCat);
  const q   = (document.getElementById('cat-search-input').value || '').toLowerCase();
  const list = (articles[currentCat] || []).filter(a => !q || a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q));
  document.getElementById('cat-page-sub').textContent = (articles[currentCat] || []).length + '개 문서 · 도움말 아티클';
  const grid = document.getElementById('cat-art-grid');
  const empty = document.getElementById('cat-empty');
  if (!list.length) { grid.innerHTML = ''; empty.style.display = 'block'; }
  else { empty.style.display = 'none'; grid.innerHTML = list.map(a => artCardHTML(a, cat)).join(''); }
}

function artCardHTML(a, cat) {
  return `<div class="art-card" onclick="openArticle('${cat.id}',${a.id})">
    <div class="art-card-top">
      <span class="art-tag" style="background:${cat.bg};color:${cat.color}">${cat.label}</span>
      <span class="art-date">${a.date}</span>
    </div>
    <div class="art-title">${a.title}</div>
    <div class="art-excerpt">${a.excerpt}</div>
    <div class="art-footer">
      <span class="art-read">읽어보기 →</span>
      <span class="art-views">👁 ${a.views.toLocaleString()}</span>
    </div>
  </div>`;
}

/* ─── ARTICLE ─── */
function openArticle(catId, artId) {
  currentCat = catId;
  currentArticleId = artId;
  navigate('article', catId);
}

function renderArticlePage() {
  const cat = CATS.find(c => c.id === currentCat);
  const art = (articles[currentCat] || []).find(a => a.id === currentArticleId);
  if (!art || !cat) return;

  document.getElementById('art-bc-cat').textContent   = cat.label;
  document.getElementById('art-bc-title').textContent = art.title.length > 30 ? art.title.slice(0, 30) + '…' : art.title;

  /* 요약 미디어 */
  let excerptMediaHTML = '';
  if (art.excerptMedia && art.excerptMedia.length > 0) {
    excerptMediaHTML = `<div class="media-gallery" style="margin-bottom:20px">
      ${art.excerptMedia.map(m => {
        const hasW = !!m.width, hasH = !!m.height;
        const ws = hasW ? `width:${m.width}px;` : 'max-width:100%;';
        const hs = hasH ? `height:${m.height}px;` : 'height:auto;';
        const fit = (hasW && hasH) ? 'object-fit:contain;' : '';
        const style = `display:block;${ws}${hs}${fit}border-radius:8px;border:1px solid #e8e6e1;`;
        return `<div class="media-gallery-item">
          ${m.type === 'image' ? `<img src="${m.url}" alt="" style="${style}">` : `<video src="${m.url}" controls style="${style}"></video>`}
        </div>`;
      }).join('')}
    </div>`;
  }

  /* 문서 전체 첨부 미디어 */
  let mediaHTML = '';
  if (art.media && art.media.length > 0) {
    mediaHTML = `<div style="margin-bottom:28px">
      <div class="media-section-title">첨부 미디어</div>
      <div class="media-gallery">
        ${art.media.map(m => `<div class="media-gallery-item">
          ${m.type === 'image' ? `<img src="${m.url}" alt="">` : `<video src="${m.url}" controls></video>`}
        </div>`).join('')}
      </div>
    </div>`;
  }

  /* 단계별 가이드 */
  let stepsHTML = '';
  if (art.steps && art.steps.length > 0) {
    const inner = art.steps.map((s, i) => {
      const stepMedia = (s.media || []).map(m => {
        const hasW = !!m.width, hasH = !!m.height;
        const ws  = hasW ? `width:${m.width}px;`   : 'max-width:100%;';
        const hs  = hasH ? `height:${m.height}px;` : 'height:auto;';
        const fit = (hasW && hasH) ? 'object-fit:contain;' : '';
        const style = `display:block;${ws}${hs}${fit}border-radius:8px;border:1px solid #e8e6e1;`;
        return `<div style="display:inline-block;margin-top:14px;margin-right:12px;">
          ${m.type === 'image' ? `<img src="${m.url}" alt="" style="${style}">` : `<video src="${m.url}" controls style="${style}"></video>`}
        </div>`;
      }).join('');
      return `<div class="step-item">
        <div class="step-circle ${i === 0 ? 'red' : ''}">${i + 1}</div>
        <div class="step-body">
          <div class="step-label">Step ${String(i + 1).padStart(2, '0')}</div>
          <div class="step-text">${nl2br(s.text)}</div>
          ${stepMedia}
        </div>
      </div>`;
    }).join('');
    stepsHTML = `<div class="steps-title">단계별 가이드</div><div class="steps-list">${inner}</div>`;
  }

  const adminActions = isAdmin ? `<div class="admin-actions">
    <button class="btn-edit" onclick="navigate('edit','${currentCat}')">✏️ 수정</button>
    <button class="btn-delete" onclick="openConfirmDelete(${art.id})">🗑 삭제</button>
  </div>` : '';

  document.getElementById('article-content').innerHTML = `
    <button class="btn-back" onclick="navigate('category','${currentCat}')">← 목록으로</button>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <span class="article-cat-tag" style="background:${cat.bg};color:${cat.color}">${cat.label}</span>
      <span class="article-meta-date">${art.date}</span>
    </div>
    <div class="article-title-row">
      <div class="article-h1">${art.title}</div>
      <button class="btn-copy-link" onclick="copyArticleLink()">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5.5 8.5L8.5 5.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          <path d="M6.5 10.5L5.207 11.793A3 3 0 0 1 1 11a3 3 0 0 1 .793-2.207L3.5 7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          <path d="M7.5 3.5L8.793 2.207A3 3 0 0 1 13 3a3 3 0 0 1-.793 2.207L10.5 7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
        </svg>
        링크 복사
      </button>
    </div>
    <div class="article-meta">
      <span class="article-views">👁 ${art.views.toLocaleString()}회 조회</span>
      ${adminActions}
    </div>
    <p class="article-body">${nl2br(art.excerpt)}</p>
    ${excerptMediaHTML}
    ${mediaHTML}
    ${stepsHTML}
  `;
}

function copyArticleLink() {
  const url = getArticleUrl(currentCat, currentArticleId);
  navigator.clipboard.writeText(url).then(() => showToast('🔗 링크가 복사되었습니다.')).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = url; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta); showToast('🔗 링크가 복사되었습니다.');
  });
}

/* ═══════════════════════════════════════
   WRITE / EDIT FORM
═══════════════════════════════════════ */
function initWriteForm(existing) {
  isEditMode = !!existing;
  wSteps = existing
    ? (existing.steps || []).map(s => ({ text: s.text || '', media: (s.media || []).map(m => ({ ...m })) }))
    : [{ text: '', media: [] }];
  if (!wSteps.length) wSteps = [{ text: '', media: [] }];
  wMedia        = existing ? [...(existing.media        || [])] : [];
  wExcerptMedia = existing ? [...(existing.excerptMedia || [])] : [];

  const cat = CATS.find(c => c.id === currentCat);
  document.getElementById('write-page-title').textContent = isEditMode ? '✏️ 문서 수정' : '📝 새 문서 작성';
  document.getElementById('write-page-sub').textContent   = cat ? (isEditMode ? cat.label + ' 카테고리 문서 수정' : cat.label + ' 카테고리에 새 문서 작성') : '';
  document.getElementById('w-title').value   = existing?.title   || '';
  document.getElementById('w-excerpt').value = existing?.excerpt || '';
  document.querySelector('.btn-submit').textContent = isEditMode ? '수정 완료' : '문서 발행';

  renderStepsEditor();
  renderExcerptMediaPreview();
  renderMediaPreview();
}

function initEditForm() {
  const art = (articles[currentCat] || []).find(a => a.id === currentArticleId);
  if (art) initWriteForm(art);
}

function cancelWrite() {
  if (isEditMode) navigate('article', currentCat);
  else navigate('category', currentCat);
}

/* ─── STEPS EDITOR ─── */
function renderStepsEditor() {
  document.getElementById('steps-editor').innerHTML = wSteps.map((s, si) => buildStepBlock(s, si)).join('');
}

function buildStepBlock(s, si) {
  return `<div class="step-editor-block" id="step-block-${si}">
    <div class="step-editor-header">
      <div class="step-editor-num">${si + 1}</div>
      <span class="step-editor-label">단계 ${si + 1}</span>
      ${wSteps.length > 1 ? `<button class="btn-remove-step" onclick="removeStep(${si})">×</button>` : ''}
    </div>
    <textarea class="step-editor-input" id="step-text-${si}"
      placeholder="${si + 1}단계 내용을 입력하세요" rows="2"
      oninput="wSteps[${si}].text=this.value">${s.text}</textarea>
    <div class="step-media-list" id="step-media-list-${si}">${buildStepMediaItems(si)}</div>
    <div class="step-upload-row">
      <button class="step-upload-btn" onclick="document.getElementById('step-img-${si}').click()">🖼️ 이미지 추가</button>
      <button class="step-upload-btn" onclick="document.getElementById('step-vid-${si}').click()">🎬 동영상 추가</button>
      <input type="file" id="step-img-${si}" accept="image/*"  multiple hidden onchange="handleStepMedia(this.files,${si})">
      <input type="file" id="step-vid-${si}" accept="video/*" multiple hidden onchange="handleStepMedia(this.files,${si})">
    </div>
  </div>`;
}

function buildStepMediaItems(si) {
  return (wSteps[si].media || []).map((m, mi) => {
    const pw = m.width  ? m.width  + 'px' : '200px';
    const ph = m.height ? m.height + 'px' : 'auto';
    return `<div class="step-media-item" id="step-media-${si}-${mi}">
      <div class="step-media-preview">
        ${m.type === 'image'
          ? `<img src="${m.url}" alt="" style="width:${pw};height:${ph}">`
          : `<video src="${m.url}" muted style="width:${pw};height:${ph}"></video>`}
      </div>
      <div class="step-media-info">
        <div class="step-media-top">
          <button class="btn-remove-step-media" onclick="removeStepMedia(${si},${mi})">×</button>
        </div>
        <div class="step-media-size">
          <div class="size-field">
            <label class="size-label">너비 (px)</label>
            <input class="size-input" type="number" min="50" max="1200" placeholder="자동" value="${m.width || ''}"
              oninput="previewStepSize(${si},${mi},'width',this.value)"
              onchange="updateStepSize(${si},${mi},'width',this.value)">
          </div>
          <div class="size-sep">×</div>
          <div class="size-field">
            <label class="size-label">높이 (px)</label>
            <input class="size-input" type="number" min="50" max="1200" placeholder="자동" value="${m.height || ''}"
              oninput="previewStepSize(${si},${mi},'height',this.value)"
              onchange="updateStepSize(${si},${mi},'height',this.value)">
          </div>
          <button class="btn-size-reset" onclick="resetStepSize(${si},${mi})">↺</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

async function handleStepMedia(files, si) {
  for (const file of Array.from(files)) {
    showToast('⏫ 업로드 중...');
    try {
      const result = await uploadFile(file);
      wSteps[si].media.push({ ...result, width: null, height: null });
      refreshStepMediaList(si);
      showToast('✅ 저장되었습니다.');
    } catch (e) { showToast('⚠️ 업로드 실패: ' + e.message); }
  }
}

function removeStepMedia(si, mi) {
  const m = wSteps[si].media[mi];
  if (m?.url) deleteFile(m.url);
  wSteps[si].media.splice(mi, 1);
  refreshStepMediaList(si);
}

function previewStepSize(si, mi, prop, val) {
  const tag = wSteps[si].media[mi].type === 'image' ? 'img' : 'video';
  const el  = document.querySelector(`#step-media-${si}-${mi} .step-media-preview ${tag}`);
  if (!el) return;
  const num = parseInt(val);
  if (prop === 'width')  el.style.width  = num > 0 ? num + 'px' : '200px';
  if (prop === 'height') el.style.height = num > 0 ? num + 'px' : 'auto';
}

function updateStepSize(si, mi, prop, val) {
  wSteps[si].media[mi][prop] = parseInt(val) > 0 ? parseInt(val) : null;
}

function resetStepSize(si, mi) {
  wSteps[si].media[mi].width = null;
  wSteps[si].media[mi].height = null;
  refreshStepMediaList(si);
}

function refreshStepMediaList(si) {
  const el = document.getElementById('step-media-list-' + si);
  if (el) el.innerHTML = buildStepMediaItems(si);
}

function addStep() {
  wSteps.forEach((s, i) => { const el = document.getElementById('step-text-' + i); if (el) s.text = el.value; });
  wSteps.push({ text: '', media: [] });
  renderStepsEditor();
}

function removeStep(i) {
  wSteps.forEach((s, idx) => { const el = document.getElementById('step-text-' + idx); if (el) s.text = el.value; });
  wSteps.splice(i, 1)[0].media?.forEach(m => m.url && deleteFile(m.url));
  renderStepsEditor();
}

/* ─── 요약 미디어 ─── */
async function handleExcerptMedia(files) {
  for (const file of Array.from(files)) {
    showToast('⏫ 업로드 중...');
    try {
      const result = await uploadFile(file);
      wExcerptMedia.push({ ...result, width: null, height: null });
      renderExcerptMediaPreview();
      showToast('✅ 저장되었습니다.');
    } catch (e) { showToast('⚠️ 업로드 실패: ' + e.message); }
  }
}

function renderExcerptMediaPreview() {
  const list = document.getElementById('excerpt-media-list');
  if (!list) return;
  list.innerHTML = wExcerptMedia.map((m, i) => buildExcerptMediaItem(m, i)).join('');
}

function buildExcerptMediaItem(m, i) {
  const pw = m.width  ? m.width  + 'px' : '200px';
  const ph = m.height ? m.height + 'px' : 'auto';
  return `<div class="step-media-item" id="excerpt-media-${i}">
    <div class="step-media-preview">
      ${m.type === 'image'
        ? `<img src="${m.url}" alt="" style="width:${pw};height:${ph}">`
        : `<video src="${m.url}" muted style="width:${pw};height:${ph}"></video>`}
    </div>
    <div class="step-media-info">
      <div class="step-media-top">
        <button class="btn-remove-step-media" onclick="removeExcerptMedia(${i})">×</button>
      </div>
      <div class="step-media-size">
        <div class="size-field">
          <label class="size-label">너비 (px)</label>
          <input class="size-input" type="number" min="50" max="1200" placeholder="자동" value="${m.width || ''}"
            oninput="previewExcerptSize(${i},'width',this.value)"
            onchange="updateExcerptSize(${i},'width',this.value)">
        </div>
        <div class="size-sep">×</div>
        <div class="size-field">
          <label class="size-label">높이 (px)</label>
          <input class="size-input" type="number" min="50" max="1200" placeholder="자동" value="${m.height || ''}"
            oninput="previewExcerptSize(${i},'height',this.value)"
            onchange="updateExcerptSize(${i},'height',this.value)">
        </div>
        <button class="btn-size-reset" onclick="resetExcerptSize(${i})">↺</button>
      </div>
    </div>
  </div>`;
}

function removeExcerptMedia(i) {
  const m = wExcerptMedia[i];
  if (m?.url) deleteFile(m.url);
  wExcerptMedia.splice(i, 1);
  renderExcerptMediaPreview();
}

function previewExcerptSize(i, prop, val) {
  const tag = wExcerptMedia[i].type === 'image' ? 'img' : 'video';
  const el  = document.querySelector(`#excerpt-media-${i} .step-media-preview ${tag}`);
  if (!el) return;
  const num = parseInt(val);
  if (prop === 'width')  el.style.width  = num > 0 ? num + 'px' : '200px';
  if (prop === 'height') el.style.height = num > 0 ? num + 'px' : 'auto';
}

function updateExcerptSize(i, prop, val) {
  wExcerptMedia[i][prop] = parseInt(val) > 0 ? parseInt(val) : null;
}

function resetExcerptSize(i) {
  wExcerptMedia[i].width = null;
  wExcerptMedia[i].height = null;
  renderExcerptMediaPreview();
}

/* ─── 문서 전체 첨부 미디어 ─── */
async function handleMediaUpload(files) {
  for (const file of Array.from(files)) {
    showToast('⏫ 업로드 중...');
    try {
      const result = await uploadFile(file);
      wMedia.push(result);
      renderMediaPreview();
      showToast('✅ 저장되었습니다.');
    } catch (e) { showToast('⚠️ 업로드 실패: ' + e.message); }
  }
}

function renderMediaPreview() {
  const grid = document.getElementById('media-preview-grid');
  if (!wMedia.length) { grid.innerHTML = ''; return; }
  grid.innerHTML = wMedia.map((m, i) => `
    <div class="media-thumb ${m.type === 'video' ? 'video-thumb' : ''}">
      ${m.type === 'image' ? `<img src="${m.url}" alt="">` : `<video src="${m.url}" muted></video>`}
      <button class="btn-remove-media" onclick="removeMedia(${i})">×</button>
    </div>`).join('');
}

function removeMedia(i) {
  const m = wMedia[i];
  if (m?.url) deleteFile(m.url);
  wMedia.splice(i, 1);
  renderMediaPreview();
}

/* ─── SAVE ─── */
async function saveArticle() {
  const title   = document.getElementById('w-title').value.trim();
  const excerpt = document.getElementById('w-excerpt').value.trim();
  if (!title)   { showToast('⚠️ 제목을 입력해 주세요.'); return; }
  if (!excerpt) { showToast('⚠️ 요약을 입력해 주세요.'); return; }

  const finalSteps = wSteps
    .map((s, i) => { const el = document.getElementById('step-text-' + i); return { text: (el ? el.value : s.text).trim(), media: s.media || [] }; })
    .filter(s => s.text || s.media.length > 0);

  const payload = { title, excerpt, excerptMedia: [...wExcerptMedia], steps: finalSteps, media: [...wMedia] };

  showLoading(true);
  try {
    if (isEditMode) {
      const updated = await api('PUT', `/api/articles/${currentCat}/${currentArticleId}`, payload);
      const idx = articles[currentCat].findIndex(a => a.id === updated.id);
      if (idx !== -1) articles[currentCat][idx] = updated;
      showToast('✅ 문서가 수정되어 저장되었습니다.');
      navigate('article', currentCat);
    } else {
      const created = await api('POST', `/api/articles/${currentCat}`, payload);
      articles[currentCat].unshift(created);
      showToast('✅ 문서가 발행되어 저장되었습니다.');
      navigate('category', currentCat);
    }
  } catch (e) {
    showToast('⚠️ 저장 실패: ' + e.message);
  } finally {
    showLoading(false);
  }
}

/* ─── DELETE ─── */
function openConfirmDelete(artId) {
  pendingDeleteId = artId;
  document.getElementById('confirm-overlay').classList.add('show');
}

function closeConfirm() {
  document.getElementById('confirm-overlay').classList.remove('show');
}

async function confirmDelete() {
  if (!pendingDeleteId) return;

  /* ID를 먼저 저장한 뒤 모달 닫기 */
  const catToNav   = currentCat;
  const idToDelete = String(pendingDeleteId);
  pendingDeleteId  = null;
  closeConfirm();

  /* 클라이언트 메모리에서 즉시 제거 → 화면 반영 */
  articles[catToNav] = (articles[catToNav] || []).filter(a => String(a.id) !== idToDelete);
  navigate('category', catToNav);
  showToast('🗑 문서가 삭제되었습니다.');

  /* 서버에 삭제 요청 (백그라운드) */
  try {
    await api('DELETE', `/api/articles/${catToNav}/${idToDelete}`);
  } catch (e) {
    console.error('[DELETE] 서버 삭제 실패:', e.message);
  }
}

/* ─── SEARCH ─── */
function onHeroSearch(val) {
  const q  = val.trim().toLowerCase();
  const dd = document.getElementById('search-dropdown');
  if (q.length < 2) { dd.classList.remove('show'); dd.innerHTML = ''; return; }
  const results = CATS.flatMap(cat =>
    (articles[cat.id] || []).filter(a => a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q)).map(a => ({ ...a, cat }))
  );
  dd.innerHTML = results.length === 0
    ? '<div class="search-no-result">검색 결과가 없습니다</div>'
    : results.slice(0, 8).map(a => `
        <div class="search-result-item" onclick="openArticle('${a.cat.id}',${a.id});closeSearchDropdown()">
          <span class="search-result-tag" style="background:${a.cat.bg};color:${a.cat.color}">${a.cat.label}</span>
          <div>
            <div class="search-result-title">${a.title}</div>
            <div class="search-result-exc">${a.excerpt.slice(0, 60)}…</div>
          </div>
        </div>`).join('');
  dd.classList.add('show');
}

function closeSearchDropdown() { document.getElementById('search-dropdown').classList.remove('show'); }

function fillHeroSearch(val) {
  document.getElementById('hero-search').value = val;
  onHeroSearch(val);
}

document.addEventListener('click', e => { if (!e.target.closest('.search-wrap')) closeSearchDropdown(); });

/* ─── LOGIN ─── */
function openLoginModal() {
  document.getElementById('login-id').value = '';
  document.getElementById('login-pw').value = '';
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('login-overlay').classList.add('show');
  setTimeout(() => document.getElementById('login-id').focus(), 50);
}

function closeLoginModal() { document.getElementById('login-overlay').classList.remove('show'); }

function doLogin() {
  const id = document.getElementById('login-id').value.trim();
  const pw = document.getElementById('login-pw').value;
  if (id === ADMIN.id && pw === ADMIN.pw) {
    isAdmin = true;
    localStorage.setItem('admate_admin', '1');
    closeLoginModal();
    showToast('✅ 관리자로 로그인되었습니다.');
    updateNav();
    if (currentPage === 'category') document.getElementById('btn-write-new').style.display = 'flex';
    if (currentPage === 'article')  renderArticlePage();
  } else {
    const err = document.getElementById('login-error');
    err.textContent = '아이디 또는 비밀번호가 올바르지 않습니다.';
    err.style.display = 'block';
  }
}

function logout() {
  isAdmin = false;
  localStorage.removeItem('admate_admin');
  showToast('로그아웃 되었습니다.');
  updateNav();
  if (currentPage === 'write' || currentPage === 'edit') navigate('home');
  else if (currentPage === 'article')  renderArticlePage();
  else if (currentPage === 'category') document.getElementById('btn-write-new').style.display = 'none';
}

/* ─── TICKET ─── */
function submitTicket() {
  const email = document.getElementById('t-email').value.trim();
  const type  = document.getElementById('t-type').value;
  const msg   = document.getElementById('t-msg').value.trim();
  if (!email || !type || !msg) { showToast('⚠️ 모든 항목을 입력해 주세요.'); return; }
  if (!email.includes('@')) { showToast('⚠️ 올바른 이메일 주소를 입력해 주세요.'); return; }
  document.getElementById('t-email').value = '';
  document.getElementById('t-type').selectedIndex = 0;
  document.getElementById('t-msg').value = '';
  showToast('✅ 티켓이 접수되었습니다. 빠른 시일 내 답변드리겠습니다.');
}

/* ─── TOAST ─── */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ─── OVERLAY CLOSE ─── */
document.getElementById('login-overlay').addEventListener('click', function(e) { if (e.target === this) closeLoginModal(); });
document.getElementById('confirm-overlay').addEventListener('click', function(e) { if (e.target === this) closeConfirm(); });

/* ─── POPSTATE ─── */
window.addEventListener('popstate', () => {
  const { page, catId, artId } = parseHash();
  if (page === 'article' && catId && artId) { currentCat = catId; currentArticleId = artId; navigate('article', catId, true); }
  else if (page === 'category' && catId) navigate('category', catId, true);
  else navigate('home', null, true);
});

/* ─── INIT ─── */
(async () => {
  if (localStorage.getItem('admate_admin') === '1') isAdmin = true;
  await loadArticles();
  const { page, catId, artId } = parseHash();
  if (page === 'article' && catId && artId) { currentCat = catId; currentArticleId = artId; navigate('article', catId, true); }
  else if (page === 'category' && catId) navigate('category', catId, true);
  else { renderHome(); updateNav(); }
})();
