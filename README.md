# Kişisel Kariyer Asistanı

Kariyer hedeflerinizi belirlemenize, becerilerinizi takip etmenize ve Gemini AI ile kişiselleştirilmiş öneriler almanıza olanak tanıyan üretime yakın bir kariyer asistanı uygulamasıdır. Notion, LinkedIn ve GitHub entegrasyonlarıyla çıktılar üretir.

- Hedef kitle: Hemen başlayıp değiştirmek isteyen yeni geliştiriciler.
- Docs: [Docs Ana Sayfası](docs/index.md)
- Amaç: Projeyi hızlıca çalıştırıp değiştirmek için net, adım adım rehberlik sağlamak.
- Hızlı başlangıç: 3 adımda kurulum ve çalıştırma.
- Derinleşmek için: Sistem Haritası, Mimari, API Referansı, QA & Kenar Durumlar, Dağıtım, Katkı Rehberi.

- [Sistem Haritası](#sistem-haritasi)
- [Hızlı Kurulum](#hizli-kurulum)
- [Mimari (Modüler Sayfalar)](#mimari-moduler-sayfalar)
- [API Referansı](#api-referansi)
- [QA & Kenar Durumlar](#qa--kenar-durumlar)
- [Dağıtım Rehberi](#dagitım-rehberi)
- [Katkı Rehberi](#katki-rehberi)

---

1️⃣ SYSTEM MAP

- Yüksek seviye mimari (metin tabanlı):
- Ön yüz (Frontend): React SPA (src/App.tsx) ve Vite ile sunulur; UI yerel durumda yönetilir.
- Arka uç (Backend): Express sunucusu (server.ts) REST API’lerini sağlar.
- Veritabanı: SQLite dosyası career_assistant.db üzerinden kalıcı veri saklama.
- Dış Servisler:
- Gemini AI: Kariyer analizleri ve öneriler üretir.
- Notion: Notion sayfası oluşturma ve içerik dışa aktarma.
- LinkedIn: OAuth akışı ve temel güncelleme akışları.
- GitHub: OAuth akışı, repo listesi ve README görüntüleme.

- 5 cümle özet:
- SPA, backend ile JSON/REST üzerinden iletişim kurar.
- Tüm veriler SQLite üzerinde saklanır.
- Gemini AI, kişiselleştirilmiş kariyer önerileri üretir ve gerektiğinde Notion işlemlerini tetikler.
- Notion/LinkedIn/GitHub OAuth akışları tokenlar ile çalışır.
- Hızlı, üretime dönük bir geliştirme akışını hedefler.

- Başlıklar: Frontend | Backend | Database | External Services

2️⃣ QUICK SETUP

- Prerequisites:
- Node.js 18+ ve npm
- Temel komut satırı becerisi

- Local kurulum:
- 1) Kaynağı alın (klonla):
-    git clone <repo-url>  
- 2) Dizin değiştirin:
-    cd proje-kökü
- 3) Bağımlılıkları kurun:
-    npm install

- Environment configuration (örnek .env.local):
- GEMINI_API_KEY=your-gemini-key
- NOTION_CLIENT_ID=your-notion-client-id
- NOTION_CLIENT_SECRET=your-notion-client-secret
- APP_URL=http://localhost:3000
- GITHUB_CLIENT_ID=your-github-client-id
- GITHUB_CLIENT_SECRET=your-github-client-secret
- NOTION_INTERNAL_SECRET=optional-secret

- Yaygın hatalar ve çözümler:
- GEMINI_API_KEY eksik → .env.local dosyasına ekle
- Notion bağlanma hatası → NOTION_CLIENT_ID/SECRET ve APP_URL doğru mu kontrol et
- Port çakışması → 3000 yerine farklı bir PORT kullan veya çalışan süreci durdur
- Node sürümü uyuşmuyor → Node.js 18+ kur ve yeniden npm install

- Çalıştırma komutları:
- npm install
- npm run dev  (geliştirme sunucusu)
- npm run build && npm run start  (prod için)

3️⃣ ARCHITECTURE (Modüler Sayfalar)

- Frontend yapısı (src/):
- App.tsx: Ana uygulama; sekmeler: dashboard, profilim, yetenekler, eğitim, github, hedefler, cv-optimizer, ai-coach
- main.tsx: Uygulama başlatma
- index.css: Tailwind + özel stil
- services/geminiService.ts: Gemini AI entegrasyonu
- lib/utils.ts: ortak yardımcılar

- Backend yapısı (server.ts):
- DB başlatma: profile, skills, education, goals tabloları
- Rotalar (örnekler):
- /api/profile: GET, PUT
- /api/skills: GET, POST, DELETE
- /api/education: GET, POST, DELETE
- /api/goals: GET, POST, PATCH
- Notion: /api/auth/notion/url, /api/auth/notion/manual, /auth/notion/callback, /api/notion/export
- LinkedIn: /api/auth/linkedin/url, /auth/linkedin/callback, /api/linkedin/update
- GitHub: /api/auth/github/url, /auth/github/callback, /api/github/repos, /api/github/readme

- Veritabanı şema mantığı:
- profile: id (PK, 1), full_name, current_role, target_role, bio, notion_token, linkedin_token, github_token
- skills: id (PK), name, level, category
- education: id (PK), institution, degree, field, start_date, end_date
- goals: id (PK), title, description, deadline, status

- State management mantığı:
- Frontend: React useState ile profil, yetenekler, eğitim, hedefler ve AI çıktıları yönetilir
- Global store yok; API çağrıları üzerinden akış sağlanır
- AI akışı: Gemini ile analiz; Notion eksportu ve CV/LinkedIn optimizer adımları entegre

4️⃣ API REFERANSI

- Aşağıdaki özet tabloda temel uç noktalar yer alır. İsteğe bağlı olarak dosyada daha detaylı açıklama ekleyebilirsiniz.

| Endpoint | Metod | Body | Yanıt Örneği | Notlar |
|---|---|---|---|---|
| GET /api/profile | GET | - | { id: 1, full_name: "...", current_role: "...", target_role: "...", bio: "..." } | Basit profil getirir |
| PUT /api/profile | PUT | { full_name, current_role, target_role, bio } | { success: true } | Profil güncelleme |
| GET /api/auth/notion/url | GET | - | { url: "..." } | Notion bağlanma linki |
| POST /api/auth/notion/manual | POST | { token } | { success: true } | Manuel Notion token kaydı |
| POST /api/notion/export | POST | { advice, title } | Notion API yanıtı | Notion’a dışa aktarım |
| GET /api/auth/github/url | GET | - | { url: "..." } | GitHub OAuth linki |
| GET /api/github/repos | GET | - | [ { id, name, language, stargazers_count } ] | Repo listesi |
| GET /api/github/readme | GET | ?owner=...&repo=... | { content: "readme text" } | README görüntüle |
| GET /api/skills | GET | - | [ { id, name, level, category } ] | Yetenekler |
| POST /api/skills | POST | { name, level, category } | { id: ... } | Yetenek ekle |
| DELETE /api/skills/:id | DELETE | - | { success: true } | Yetenek sil |
| GET /api/education | GET | - | [ { id, institution, degree, field, start_date, end_date } ] | Eğitimler |
| POST /api/education | POST | { institution, degree, field, start_date, end_date } | { id: ... } | Eğitim ekle |
| DELETE /api/education/:id | DELETE | - | { success: true } | Eğitim sil |
| GET /api/goals | GET | - | [ { id, title, description, deadline, status } ] | Hedefler |
| POST /api/goals | POST | { title, description, deadline } | { id: ... } | Hedef ekle |
| PATCH /api/goals/:id | PATCH | { status } | { success: true } | Hedef durumu güncelle |

5️⃣ QA & EDGE CASES

- Kritik hatalar: Notion bağlanmadan eksport, Gemini anahtarı yok, GitHub token eksik.
- OAuth yönlendirme sorunları için APP_URL ve istemci kimliklerini kontrol et.
- Notion tokenı süresi dolarsa eksport başarısız olabilir.
- GitHub API rate limitleri ve ağ hataları için yeniden dene.
- Test komutları:
- npm run lint
- npm run dev
- npm run build && npm run start
- Basit API smoke testi: curl -s http://localhost:3000/api/profile | jq

6️⃣ DEPLOY GUIDE

- VPS’a dağıtım adımları:
- Node.js 18+ kurulu olmalı; depo klonlanır; bağımlılıklar yüklenecek
- Ortam değişkenlerini ayarla (.env.local)
- Ön uç üretime hazırla: npm run build
- Arka uç çalıştır: npm run start (PM2 ile üretimde önerilir)
- Reverse proxy: Nginx örnek konfigürasyonu ve SSL için Let's Encrypt kurulumu
- Doğrulama: curl -I http://domain

7️⃣ CONTRIBUTION GUIDE

- Branch adı: feat/..., fix/..., chore/...
- PR kuralları: main/master hedefli, kısa açıklama + test talebi
- Commit formatı: type(scope): açıklama
- Kod inceleme akışı: PR oluştur, 1-2 yorumcu, geri bildirimler
- Yerelde test: npm run lint, npm run build


