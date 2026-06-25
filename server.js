const express = require('express');
const path    = require('path');
const fs      = require('fs');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ══════════════════════════════════════════════
   환경 감지
   MONGODB_URI    있음 → MongoDB 사용 (Vercel)
   CLOUDINARY_*   있음 → Cloudinary 사용 (Vercel)
   없음           → 로컬 파일 시스템 사용
══════════════════════════════════════════════ */
const IS_VERCEL     = !!process.env.VERCEL;
const IS_MONGO      = !!process.env.MONGODB_URI;
const IS_CLOUDINARY = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY);

/* ─── 초기 데이터 ─── */
const INIT_DATA = {
  facebook: [
    {
      id: 1, title: 'Facebook 픽셀 설치 완벽 가이드',
      excerpt: '웹사이트에 Facebook 픽셀을 설치하고 전환 이벤트를 추적하는 방법을 단계별로 안내합니다.',
      date: '2025-11-20', views: 3241, media: [], excerptMedia: [],
      steps: [
        { text: "Meta Business Suite에 로그인 후 '이벤트 관리자'로 이동합니다.", media: [] },
        { text: "'+' 버튼을 클릭하고 '웹'을 선택합니다.", media: [] },
        { text: '<head> 태그 사이에 픽셀 코드를 붙여넣습니다.', media: [] },
      ],
    },
    {
      id: 2, title: '맞춤 타겟 생성 및 리타겟팅 설정',
      excerpt: '웹사이트 방문자 기반 맞춤 타겟을 만들고 리타겟팅 캠페인을 설정하는 전체 과정입니다.',
      date: '2025-11-15', views: 2180, media: [], excerptMedia: [],
      steps: [
        { text: '광고 관리자 → 타겟으로 이동합니다.', media: [] },
        { text: "'맞춤 타겟 만들기'를 선택합니다.", media: [] },
        { text: "소스를 '웹사이트'로 설정하고 조건을 구성합니다.", media: [] },
      ],
    },
  ],
  instagram: [
    {
      id: 3, title: 'Instagram 쇼핑 태그 설정하기',
      excerpt: 'Instagram 게시물에 제품을 태그해 쇼핑 경험을 제공하는 방법을 설명합니다.',
      date: '2025-11-18', views: 1950, media: [], excerptMedia: [],
      steps: [
        { text: '비즈니스 계정에서 설정 → 비즈니스로 이동합니다.', media: [] },
        { text: '쇼핑 섹션을 탭하고 카탈로그와 연결합니다.', media: [] },
        { text: '게시물 작성 시 제품 태그를 추가합니다.', media: [] },
      ],
    },
  ],
  twitter: [
    {
      id: 4, title: 'X Ads 캠페인 유형 선택 가이드',
      excerpt: 'X(Twitter) 광고의 다양한 캠페인 유형과 목적에 맞는 선택 방법을 안내합니다.',
      date: '2025-11-10', views: 1420, media: [], excerptMedia: [],
      steps: [
        { text: 'ads.twitter.com에 로그인합니다.', media: [] },
        { text: "'캠페인 만들기'를 클릭합니다.", media: [] },
        { text: '목표(인지도, 팔로워, 앱 설치 등)를 선택합니다.', media: [] },
      ],
    },
  ],
  google: [
    {
      id: 5, title: 'Google 검색광고 키워드 전략',
      excerpt: '효과적인 키워드 리서치부터 입찰 전략까지, 검색광고 성과를 높이는 방법을 다룹니다.',
      date: '2025-11-22', views: 4100, media: [], excerptMedia: [],
      steps: [
        { text: 'Google Keyword Planner에서 키워드를 조사합니다.', media: [] },
        { text: '매칭 유형(완전일치, 구문일치, 확장일치)을 설정합니다.', media: [] },
        { text: '광고 그룹별로 테마에 맞는 키워드를 묶습니다.', media: [] },
      ],
    },
    {
      id: 6, title: '전환 추적 태그(gtag) 설치 방법',
      excerpt: 'Google Ads 전환 추적을 설정하고 ROI를 정확하게 측정하는 방법을 단계별로 안내합니다.',
      date: '2025-11-08', views: 2860, media: [], excerptMedia: [],
      steps: [
        { text: 'Google Ads → 도구 → 전환 측정으로 이동합니다.', media: [] },
        { text: "'+' 전환 액션을 만듭니다.", media: [] },
        { text: 'gtag 스니펫을 웹사이트에 삽입합니다.', media: [] },
      ],
    },
  ],
};

/* ══════════════════════════════════════════════
   데이터 레이어
══════════════════════════════════════════════ */
let _mongo = null;

async function getDb() {
  if (_mongo) return _mongo;
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI 환경변수가 설정되지 않았습니다. Vercel 프로젝트 설정에서 환경변수를 추가해 주세요.');
  }
  const { MongoClient } = require('mongodb');
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  _mongo = client.db('admate');
  return _mongo;
}

const DATA_FILE = path.join(__dirname, 'data', 'articles.json');

async function loadArticles() {
  if (IS_MONGO) {
    const db  = await getDb();
    const doc = await db.collection('store').findOne({ key: 'main' });
    if (!doc) {
      await db.collection('store').insertOne({ key: 'main', data: INIT_DATA });
      return JSON.parse(JSON.stringify(INIT_DATA));
    }
    return doc.data;
  }
  if (!fs.existsSync(DATA_FILE)) {
    if (IS_VERCEL) return JSON.parse(JSON.stringify(INIT_DATA));
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(INIT_DATA, null, 2), 'utf-8');
    return JSON.parse(JSON.stringify(INIT_DATA));
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    fs.writeFileSync(DATA_FILE, JSON.stringify(INIT_DATA, null, 2), 'utf-8');
    return JSON.parse(JSON.stringify(INIT_DATA));
  }
}

async function saveArticles(data) {
  if (IS_MONGO) {
    const db = await getDb();
    await db.collection('store').replaceOne(
      { key: 'main' },
      { key: 'main', data },
      { upsert: true }
    );
    return;
  }
  if (IS_VERCEL) {
    throw new Error('Vercel에서는 MONGODB_URI 환경변수 설정 후 저장할 수 있습니다.');
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

/* ══════════════════════════════════════════════
   업로드 미들웨어
══════════════════════════════════════════════ */
let uploadMiddleware;

if (IS_CLOUDINARY) {
  const cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  const multer = require('multer');
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
      folder:        'admate-help',
      resource_type: file.mimetype.startsWith('video') ? 'video' : 'image',
      public_id:     `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    }),
  });
  uploadMiddleware = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });
} else {
  const multer      = require('multer');
  const UPLOADS_DIR = path.join(__dirname, 'uploads');
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext  = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9가-힣_-]/g, '_').slice(0, 40);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${base}${ext}`);
    },
  });
  uploadMiddleware = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

  app.use('/uploads', (req, res, next) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    next();
  }, express.static(UPLOADS_DIR));
}

/* ══════════════════════════════════════════════
   정적 파일
══════════════════════════════════════════════ */
app.use(express.static(__dirname));

/* ══════════════════════════════════════════════
   API 라우트
══════════════════════════════════════════════ */

/* 프론트엔드가 Cloudinary 직접 업로드할 때 필요한 설정 반환 */
app.get('/api/config', (req, res) => {
  res.json({
    cloudName:     process.env.CLOUDINARY_CLOUD_NAME    || '',
    uploadPreset:  process.env.CLOUDINARY_UPLOAD_PRESET || '',
    useCloudinary: IS_CLOUDINARY,
  });
});

/* 전체 게시글 */
app.get('/api/articles', async (req, res) => {
  try {
    res.json(await loadArticles());
  } catch (e) {
    console.error('[GET /api/articles]', e.message);
    res.status(500).json({
      error: e.message,
      hint: 'Vercel 프로젝트 Settings → Environment Variables 에서 MONGODB_URI, CLOUDINARY_* 환경변수를 설정했는지 확인하세요.'
    });
  }
});

/* 게시글 생성 */
app.post('/api/articles/:catId', async (req, res) => {
  try {
    const data = await loadArticles();
    const { catId } = req.params;
    if (!data[catId]) return res.status(400).json({ error: '유효하지 않은 카테고리' });
    const art = { ...req.body, id: Date.now(), date: new Date().toISOString().slice(0, 10) };
    data[catId].unshift(art);
    await saveArticles(data);
    console.log(`[CREATE] ${catId} "${art.title}"`);
    res.json(art);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* 게시글 수정 */
app.put('/api/articles/:catId/:id', async (req, res) => {
  try {
    const data = await loadArticles();
    const { catId } = req.params;
    const list = data[catId] || [];
    const idx  = list.findIndex(a => String(a.id) === String(req.params.id));
    if (idx === -1) return res.status(404).json({ error: '게시글 없음' });
    data[catId][idx] = { ...list[idx], ...req.body, id: list[idx].id };
    await saveArticles(data);
    res.json(data[catId][idx]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* 게시글 삭제 */
app.delete('/api/articles/:catId/:id', async (req, res) => {
  const { catId } = req.params;
  const rawId = String(req.params.id);
  console.log(`[DELETE] catId=${catId} id=${rawId}`);
  try {
    const data = await loadArticles();
    const list = data[catId] || [];
    const art  = list.find(a => String(a.id) === rawId);

    if (art) {
      const allMedia = [
        ...(art.media        || []),
        ...(art.excerptMedia || []),
        ...(art.steps || []).flatMap(s => s.media || []),
      ];
      for (const m of allMedia) {
        try {
          if (!m?.url) continue;
          if (IS_CLOUDINARY && m.url.includes('cloudinary.com')) {
            const cl    = require('cloudinary').v2;
            const match = m.url.match(/\/upload\/(?:v\d+\/)?(.+?)\.[^.]+$/);
            if (match) await cl.uploader.destroy(match[1], { resource_type: m.type === 'video' ? 'video' : 'image' });
          } else if (!IS_MONGO) {
            const fp = path.join(__dirname, m.url.replace(/^\//, ''));
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
          }
        } catch (fe) { console.warn('[DELETE MEDIA WARN]', fe.message); }
      }
      data[catId] = list.filter(a => String(a.id) !== rawId);
      await saveArticles(data);
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
app.post('/api/upload', uploadMiddleware.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '파일 없음' });
  const isVideo = req.file.mimetype.startsWith('video');
  const url     = IS_CLOUDINARY
    ? (req.file.path || req.file.secure_url)
    : '/uploads/' + req.file.filename;
  res.json({ url, name: req.file.originalname, type: isVideo ? 'video' : 'image', size: req.file.size });
});

/* 미디어 삭제 */
app.delete('/api/upload', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.json({ ok: true });
    if (IS_CLOUDINARY && url.includes('cloudinary.com')) {
      const cl    = require('cloudinary').v2;
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.[^.]+$/);
      if (match) await cl.uploader.destroy(match[1], { resource_type: url.includes('/video/') ? 'video' : 'image' });
    } else if (!IS_MONGO) {
      const fp = path.join(__dirname, url.replace(/^\//, ''));
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
  } catch (e) { console.warn('[DELETE UPLOAD WARN]', e.message); }
  res.json({ ok: true });
});

/* 디버그 */
app.get('/api/debug', async (req, res) => {
  try {
    const data = await loadArticles();
    res.json({
      mode:      IS_MONGO ? 'mongodb' : 'local-json',
      storage:   IS_CLOUDINARY ? 'cloudinary' : 'local-uploads',
      summary:   Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.map(a => ({ id: a.id, title: a.title }))])),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* 초기화 */
app.post('/api/reset', async (req, res) => {
  try { await saveArticles(JSON.parse(JSON.stringify(INIT_DATA))); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

/* SPA 폴백 */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* ══════════════════════════════════════════════
   시작
   로컬: node server.js → listen
   Vercel: module.exports = app
══════════════════════════════════════════════ */
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log('\n  ╔══════════════════════════════════════╗');
    console.log(`  ║  AdMate Help Center                  ║`);
    console.log(`  ║  http://localhost:${PORT}                ║`);
    console.log('  ╚══════════════════════════════════════╝\n');
    console.log(`  데이터: ${IS_MONGO ? '☁️  MongoDB Atlas' : '💾 로컬 JSON (data/articles.json)'}`);
    console.log(`  미디어: ${IS_CLOUDINARY ? '☁️  Cloudinary' : '📁 로컬 (uploads/)'}\n`);
  });
}

module.exports = app;
