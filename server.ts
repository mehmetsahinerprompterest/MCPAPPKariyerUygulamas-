import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("career_assistant.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    full_name TEXT,
    current_role TEXT,
    target_role TEXT,
    bio TEXT,
    notion_token TEXT,
    linkedin_token TEXT,
    github_token TEXT
  );

  CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    level INTEGER DEFAULT 1,
    category TEXT
  );

  CREATE TABLE IF NOT EXISTS education (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    institution TEXT NOT NULL,
    degree TEXT,
    field TEXT,
    start_date TEXT,
    end_date TEXT
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    deadline TEXT,
    status TEXT DEFAULT 'pending'
  );
`);

// Migration: Add github_token column if it doesn't exist
try {
  db.prepare("ALTER TABLE profile ADD COLUMN github_token TEXT").run();
} catch (e) {
  // Column might already exist
}

// Seed initial data if empty
const profileCount = db.prepare("SELECT COUNT(*) as count FROM profile").get() as { count: number };
if (profileCount.count === 0) {
  db.prepare("INSERT INTO profile (id, full_name, current_role, target_role, bio) VALUES (1, 'Kullanıcı', 'Yazılım Geliştirici', 'Kıdemli Yazılım Mimarı', 'Kariyerimde ilerlemek isteyen tutkulu bir profesyonelim.')").run();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/profile", (req, res) => {
    let profile = db.prepare("SELECT * FROM profile WHERE id = 1").get() as any;
    
    // If an internal secret is set in environment, prioritize it
    if (process.env.NOTION_INTERNAL_SECRET && (!profile || !profile.notion_token)) {
      db.prepare("UPDATE profile SET notion_token = ? WHERE id = 1").run(process.env.NOTION_INTERNAL_SECRET);
      profile = db.prepare("SELECT * FROM profile WHERE id = 1").get();
    }
    
    res.json(profile);
  });

  app.put("/api/profile", (req, res) => {
    const { full_name, current_role, target_role, bio } = req.body;
    db.prepare("UPDATE profile SET full_name = ?, current_role = ?, target_role = ?, bio = ? WHERE id = 1")
      .run(full_name, current_role, target_role, bio);
    res.json({ success: true });
  });

  // Notion OAuth Routes
  app.get("/api/auth/notion/url", (req, res) => {
    const clientId = process.env.NOTION_CLIENT_ID?.trim();
    const appUrl = process.env.APP_URL?.trim();
    
    if (!clientId || clientId.length < 5) {
      return res.status(400).json({ 
        error: "NOTION_CLIENT_ID bulunamadı veya geçersiz. Lütfen AI Studio 'Secrets' panelinden bu değişkeni doğru şekilde eklediğinizden emin olun." 
      });
    }

    if (!appUrl) {
      return res.status(500).json({ error: "APP_URL sistem değişkeni eksik." });
    }

    const redirectUri = `${appUrl}/auth/notion/callback`;
    const authUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}`;
    res.json({ url: authUrl });
  });

  app.post("/api/auth/notion/manual", (req, res) => {
    const { token } = req.body;
    if (!token || token.length < 10) {
      return res.status(400).json({ error: "Geçersiz Notion Secret formatı." });
    }
    db.prepare("UPDATE profile SET notion_token = ? WHERE id = 1").run(token);
    res.json({ success: true });
  });

  app.get("/auth/notion/callback", async (req, res) => {
    const { code } = req.query;
    const clientId = process.env.NOTION_CLIENT_ID;
    const clientSecret = process.env.NOTION_CLIENT_SECRET;
    const redirectUri = `${process.env.APP_URL}/auth/notion/callback`;

    if (!code || !clientId || !clientSecret) {
      return res.status(400).send("Missing code or configuration");
    }

    try {
      const response = await fetch("https://api.notion.com/v1/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
      });

      const data = await response.json();
      if (data.access_token) {
        db.prepare("UPDATE profile SET notion_token = ? WHERE id = 1").run(data.access_token);
        res.send(`
          <html>
            <body>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'NOTION_AUTH_SUCCESS' }, '*');
                  window.close();
                } else {
                  window.location.href = '/';
                }
              </script>
              <p>Notion bağlantısı başarılı! Bu pencere otomatik olarak kapanacaktır.</p>
            </body>
          </html>
        `);
      } else {
        res.status(400).send("Failed to get access token: " + JSON.stringify(data));
      }
    } catch (error) {
      console.error("Notion OAuth Error:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  app.post("/api/notion/export", async (req, res) => {
    const { advice, title } = req.body;
    const profile = db.prepare("SELECT notion_token FROM profile WHERE id = 1").get() as { notion_token: string };

    if (!profile?.notion_token) {
      return res.status(401).json({ error: "Notion not connected" });
    }

    try {
      const parentPageId = await getFirstAccessiblePage(profile.notion_token);
      
      const children = [
        {
          object: "block",
          type: "heading_1",
          heading_1: { rich_text: [{ text: { content: "Kariyer Analizi" } }] }
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ text: { content: advice.analysis } }] }
        },
        {
          object: "block",
          type: "heading_2",
          heading_2: { rich_text: [{ text: { content: "🚀 Başlangıç (Kısa Vade)" } }] }
        },
        ...advice.shortTerm.map((item: string) => ({
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: { rich_text: [{ text: { content: item } }] }
        })),
        {
          object: "block",
          type: "heading_2",
          heading_2: { rich_text: [{ text: { content: "📈 Orta Vade (3-12 Ay)" } }] }
        },
        ...advice.mediumTerm.map((item: string) => ({
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: { rich_text: [{ text: { content: item } }] }
        })),
        {
          object: "block",
          type: "heading_2",
          heading_2: { rich_text: [{ text: { content: "🎯 Uzun Vade (1-3 Yıl)" } }] }
        },
        ...advice.longTerm.map((item: string) => ({
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: { rich_text: [{ text: { content: item } }] }
        })),
        {
          object: "block",
          type: "divider",
          divider: {}
        },
        {
          object: "block",
          type: "quote",
          quote: { rich_text: [{ text: { content: advice.motivation } }] }
        }
      ];

      const response = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28",
          Authorization: `Bearer ${profile.notion_token}`,
        },
        body: JSON.stringify({
          parent: { type: "page_id", page_id: parentPageId },
          properties: {
            title: [{ text: { content: title || "Kariyer Planı" } }],
          },
          children: children.slice(0, 100) // Notion limit per request
        }),
      });

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Notion Export Error:", error);
      res.status(500).json({ error: "Failed to export to Notion" });
    }
  });

  async function getFirstAccessiblePage(token: string) {
    const response = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        filter: { property: "object", value: "page" },
        page_size: 1,
      }),
    });
    const data = await response.json();
    return data.results[0]?.id;
  }

  // LinkedIn OAuth Routes (Simulated for Demo/MCP logic)
  app.get("/api/auth/linkedin/url", (req, res) => {
    const redirectUri = `${process.env.APP_URL}/auth/linkedin/callback`;
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=MOCK_ID&redirect_uri=${encodeURIComponent(redirectUri)}&scope=r_liteprofile%20w_member_social`;
    res.json({ url: authUrl });
  });

  app.get("/auth/linkedin/callback", (req, res) => {
    db.prepare("UPDATE profile SET linkedin_token = ? WHERE id = 1").run("mock_linkedin_token_123");
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'LINKEDIN_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>LinkedIn bağlantısı başarılı! Profiliniz artık senkronize edilebilir.</p>
        </body>
      </html>
    `);
  });

  app.post("/api/linkedin/update", async (req, res) => {
    const { headline, about } = req.body;
    const profile = db.prepare("SELECT linkedin_token FROM profile WHERE id = 1").get() as { linkedin_token: string };

    if (!profile?.linkedin_token) {
      return res.status(401).json({ error: "LinkedIn not connected" });
    }

    // Simulate LinkedIn API call
    console.log("Updating LinkedIn Profile:", { headline, about });
    
    setTimeout(() => {
      res.json({ success: true, message: "LinkedIn profiliniz başarıyla güncellendi!" });
    }, 1500);
  });

  // GitHub Routes
  app.get("/api/auth/github/url", (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID?.trim();
    const appUrl = process.env.APP_URL?.trim().replace(/\/$/, "");
    
    if (!clientId) return res.status(500).json({ error: "GITHUB_CLIENT_ID ayarlanmamış." });
    if (!appUrl) return res.status(500).json({ error: "APP_URL ayarlanmamış." });
    
    const redirectUri = `${appUrl}/auth/github/callback`;
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo,user`;
    res.json({ url: authUrl });
  });

  app.get("/auth/github/callback", async (req, res) => {
    const { code } = req.query;
    const clientId = process.env.GITHUB_CLIENT_ID?.trim();
    const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();

    if (!code) return res.status(400).send("No code provided");
    if (!clientId || !clientSecret) return res.status(500).send("GitHub credentials missing in environment");

    try {
      const response = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code })
      });
      
      const data = await response.json() as any;
      
      if (data.error) {
        console.error("GitHub OAuth Error:", data.error, data.error_description);
        return res.status(400).send(`GitHub Auth Error: ${data.error_description || data.error}`);
      }

      if (data.access_token) {
        db.prepare("UPDATE profile SET github_token = ? WHERE id = 1").run(data.access_token);
        return res.send(`<html><body><script>if(window.opener){window.opener.postMessage({type:'GITHUB_AUTH_SUCCESS'},'*');window.close();}else{window.location.href='/';}</script></body></html>`);
      }
      
      res.status(500).send("Failed to obtain access token from GitHub");
    } catch (err: any) {
      console.error("GitHub Auth Exception:", err);
      res.status(500).send(`GitHub Auth Failed: ${err.message || "Unknown server error"}`);
    }
  });

  app.get("/api/github/repos", async (req, res) => {
    const profile = db.prepare("SELECT github_token FROM profile WHERE id = 1").get() as any;
    if (!profile?.github_token) return res.status(401).json({ error: "GitHub not connected" });

    try {
      const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=10", {
        headers: { Authorization: `token ${profile.github_token}` }
      });
      const repos = await response.json();
      res.json(repos);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch repos" });
    }
  });

  app.get("/api/github/readme", async (req, res) => {
    const { owner, repo } = req.query;
    const profile = db.prepare("SELECT github_token FROM profile WHERE id = 1").get() as any;
    if (!profile?.github_token) return res.status(401).json({ error: "GitHub not connected" });

    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
        headers: { 
          Authorization: `token ${profile.github_token}`,
          Accept: "application/vnd.github.v3.raw"
        }
      });
      const readme = await response.text();
      res.json({ content: readme });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch readme" });
    }
  });

  app.get("/api/skills", (req, res) => {
    const skills = db.prepare("SELECT * FROM skills").all();
    res.json(skills);
  });

  app.post("/api/skills", (req, res) => {
    const { name, level, category } = req.body;
    const result = db.prepare("INSERT INTO skills (name, level, category) VALUES (?, ?, ?)")
      .run(name, level, category);
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/skills/:id", (req, res) => {
    db.prepare("DELETE FROM skills WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/education", (req, res) => {
    const education = db.prepare("SELECT * FROM education").all();
    res.json(education);
  });

  app.post("/api/education", (req, res) => {
    const { institution, degree, field, start_date, end_date } = req.body;
    const result = db.prepare("INSERT INTO education (institution, degree, field, start_date, end_date) VALUES (?, ?, ?, ?, ?)")
      .run(institution, degree, field, start_date, end_date);
    res.json({ id: result.lastInsertRowid });
  });

  app.get("/api/education", (req, res) => {
    const edu = db.prepare("SELECT * FROM education").all();
    res.json(edu);
  });

  app.post("/api/education", (req, res) => {
    const { institution, degree, field, start_date, end_date } = req.body;
    const result = db.prepare("INSERT INTO education (institution, degree, field, start_date, end_date) VALUES (?, ?, ?, ?, ?)")
      .run(institution, degree, field, start_date, end_date);
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/education/:id", (req, res) => {
    db.prepare("DELETE FROM education WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/goals", (req, res) => {
    const goals = db.prepare("SELECT * FROM goals").all();
    res.json(goals);
  });

  app.post("/api/goals", (req, res) => {
    const { title, description, deadline } = req.body;
    const result = db.prepare("INSERT INTO goals (title, description, deadline) VALUES (?, ?, ?)")
      .run(title, description, deadline);
    res.json({ id: result.lastInsertRowid });
  });

  app.patch("/api/goals/:id", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE goals SET status = ? WHERE id = ?").run(status, req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
