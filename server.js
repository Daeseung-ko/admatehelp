const express = require('express');
const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = 3000;

/* ── 절대경로 기준 디렉터리 ── */
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_DIR    = path.join(__dirname, 'data');
const DATA_FILE   = path.join(__dirname, 'data', 'articles.json');

[UPLOADS_DIR, DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

/* ── 초기 데이터 ── */
const INIT_DATA = {
  facebook: [
    { id: 1, title: 'Facebook 픽셀 설치 완벽 가이드',
      excerpt: '웹사이트에 Facebook 픽셀을 설치하고 전환 이벤트를 추적하는 방법을 단계별로 안내합니다.',
      date: '2025-11-20', views: 3241, media: [], excerptMedia: [],
      steps: [
        { text: "Meta Business Suite에 로그인 후 '이벤트 관리자'로 이동합니다.", media: [] },
        { text: "'+' 버튼을 클릭하고 '웹'을 선택합니다.", media: [] },
        { text: '픽셀 코드를 복사해 <head> 태그 사이에 붙여넣습니다.', media: [] },
      ]
    },
    { id: 2, title: '맞춤 타겟 생성 및 리타겟팅 설정',
      excerpt: '웹사이트 방문자 기반 맞춤 타겟을 만들고 리타겟팅 캠페인을 설정하는 전체 과정입니다.',
      date: '2025-11-15', views: 2180, media: [], excerptMedia: [],
      steps: [
        { text: '광고 관리자 → 타겟으로 이동합니다.', media: [] },
        { text: "'맞춤 타겟 만들기'를 선택합니다.", media: [] },
        { text: "소스를 '웹사이트'로 설정하고 조건을 구성합니다.", media: [] },
      ]
    },
  ],
  instagram: [
    { id: 3, title: 'Instagram 쇼핑 태그 설정하기',
      excerpt: 'Instagram 게시물에 제품을 태그해 쇼핑 경험을 제공하는 방법을 설명합니다.',
      date: '2025-11-18', views: 1950, media: [], excerptMedia: [],
      steps: [
        { text: '비즈니스 계정에서 설정 → 비즈니스로 이동합니다.', media: [] },
        { text: '쇼핑 섹션을 탭하고 카탈로그와 연결합니다.', media: [] },
        { text: '게시물 작성 시 제품 태그를 추가합니다.', media: [] },
      ]
    },
  ],
  twitter: [
    { id: 4, title: 'X Ads 캠페인 유형 선택 가이드',
      excerpt: 'X(Twitter) 광고의 다양한 캠페인 유형과 목적에 맞는 선택 방법을 안내합니다.',
      date: '2025-11-10', views: 1420, media: [], excerptMedia: [],
      steps: [
        { text: 'ads.twitter.com에 로그인합니다.', media: [] },
        { text: "'캠페인 만들기'를 클릭합니다.", media: [] },
        { text: '목표(인지도, 팔로워, 앱 설치 등)를 선택합니다.', media: [] },
      ]
    },
  ],
  google: [
    { id: 5, title: 'Google 검색광고 키워드 전략',
      excerpt: '효과적인 키워드 리서치부터 입찰 전략까지, 검색광고 성과를 높이는 방법을 다룹니다.',
      date: '2025-11-22', views: 4100, media: [], excerptMedia: [],
      steps: [
        { text: 'Google Keyword Planner에서 키워드를 조사합니다.', media: [] },
        { text: '매칭 유형(완전일치, 구문일치, 확장일치)을 설정합니다.', media: [] },
        { text: '광고 그룹별로 테마에 맞는 키워드를 묶습니다.', media: [] },
      ]
    },
    { id: 6, title: '전환 추적 태그(gtag) 설치 방법',
      excerpt: 'Google Ads 전환 추적을 설정하고 ROI를 정확하게 측정하는 방법을 단계별로 안내합니다.',
      date: '2025-11-08', views: 2860, media: [], excerptMedia: [],
      steps: [
        { text: 'Google Ads → 도구 → 전환 측정으로 이동합니다.', media: [] },
        { text: "'+' 전환 액션을 만듭니다.", media: [] },
        { text: 'gtag 스니펫을 웹사이트에 삽입합니다.', media: [] },
      ]
    },
  ],
};

/* ── JSON 읽기/쓰기 ── */
function loadArticles() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(INIT_DATA, null, 2), 'utf-8');
    return INIT_DATA;
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (e) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(INIT_DATA, null, 2), 'utf-8');
    return INIT_DATA;
  }
}

function saveArticles(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/* ── Multer ── */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9가-힣_-]/g, '_').slice(0, 40);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${base}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

/* ── 미들웨어 ── */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  next();
}, express.static(UPLOADS_DIR));
app.use(express.static(__dirname));

/* ════════ API ════════ */

/* 전체 게시글 */
app.get('/api/articles', (req, res) => {
  res.json(loadArticles());
});

/* 게시글 생성 */
app.post('/api/articles/:catId', (req, res) => {
  try {
    const data = loadArticles();
    const { catId } = req.params;
    if (!data[catId]) return res.status(400).json({ error: '유효하지 않은 카테고리' });
    const newArt = { ...req.body, id: Date.now(), date: new Date().toISOString().slice(0, 10), views: 0 };
    data[catId].unshift(newArt);
    saveArticles(data);
    console.log(`[CREATE] ${catId} "${newArt.title}"`);
    res.json(newArt);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* 게시글 수정 */
app.put('/api/articles/:catId/:id', (req, res) => {
  try {
    const data = loadArticles();
    const { catId } = req.params;
    const list = data[catId] || [];
    const idx  = list.findIndex(a => String(a.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ error: '게시글 없음' });
    data[catId][idx] = { ...list[idx], ...req.body, id: list[idx].id };
    saveArticles(data);
    res.json(data[catId][idx]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* 게시글 삭제 */
app.delete('/api/articles/:catId/:id', (req, res) => {
  const { catId } = req.params;
  const rawId = String(req.params.id);
  console.log(`\n[DELETE] catId=${catId} id=${rawId}`);
  try {
    const data = loadArticles();
    const list = data[catId] || [];
    console.log(`[DELETE] IDs: [${list.map(a => a.id).join(', ')}]`);

    const art = list.find(a => String(a.id) === rawId);
    if (art) {
      /* 미디어 파일 삭제 */
      [...(art.media || []), ...(art.excerptMedia || []), ...(art.steps || []).flatMap(s => s.media || [])].forEach(m => {
        try {
          if (!m?.url) return;
          const fp = path.join(__dirname, m.url.replace(/^\//, ''));
          if (fs.existsSync(fp)) { fs.unlinkSync(fp); }
        } catch (fe) { console.warn('[DELETE FILE WARN]', fe.message); }
      });
      data[catId] = list.filter(a => String(a.id) !== rawId);
      saveArticles(data);
      console.log(`[DELETE] 완료 ✓ "${art.title}"`);
    } else {
      console.warn(`[DELETE] ID ${rawId} 없음`);
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('[DELETE ERROR]', e.message);
    res.json({ ok: true });
  }
});

/* 미디어 업로드 */
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '파일 없음' });
  const isVideo = req.file.mimetype.startsWith('video');
  res.json({ url: '/uploads/' + req.file.filename, name: req.file.originalname, type: isVideo ? 'video' : 'image', size: req.file.size });
});

/* 미디어 삭제 */
app.delete('/api/upload', (req, res) => {
  try {
    const { url } = req.body;
    if (url) {
      const fp = path.join(__dirname, url.replace(/^\//, ''));
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
  } catch (e) {}
  res.json({ ok: true });
});

/* 디버그 */
app.get('/api/debug', (req, res) => {
  const data = loadArticles();
  res.json({ file: DATA_FILE, exists: fs.existsSync(DATA_FILE), summary: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.map(a => ({ id: a.id, title: a.title }))])) });
});

/* 초기화 */
app.post('/api/reset', (req, res) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(INIT_DATA, null, 2), 'utf-8');
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log('\n  ╔══════════════════════════════════╗');
  console.log(`  ║  AdMate Help Center              ║`);
  console.log(`  ║  http://localhost:${PORT}            ║`);
  console.log('  ╚══════════════════════════════════╝\n');
  console.log(`  📁 데이터: ${DATA_FILE}`);
  console.log(`  🖼  미디어: ${UPLOADS_DIR}/\n`);
});
