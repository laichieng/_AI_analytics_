import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Lazy initialize Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("找不到 GEMINI_API_KEY 環境變數。請至 AI Studio 的【Settings > Secrets】面板中加入您的 Gemini API Key。並確保名稱完全一致為 GEMINI_API_KEY。");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API 路由 - 處理會議生成與翻譯
  app.post("/api/generate", async (req, res) => {
    try {
      const { content, targetLang, formatTemplate } = req.body;
      if (!content || !content.trim()) {
        res.status(400).json({ error: "請提供會議逐字稿或重點筆記內容。" });
        return;
      }

      // 取得 Gemini 用戶端
      const ai = getGeminiClient();

      // 自訂模板調整
      let templateInstruction = "";
      if (formatTemplate === "detailed") {
        templateInstruction = `請詳細分析每一處言論，記錄要點，適合非常严謹、深入的行政會議。`;
      } else if (formatTemplate === "action-only") {
        templateInstruction = `請將重點百分之八十放在決議事項、未決事項與行動方案 (Action Items) 列表，簡化背景探討。`;
      } else {
        templateInstruction = `產出完整的標準會議紀錄，平衡討論背景與具體行動方案。`;
      }

      // 建構 System Instruction
      const systemInstruction = `你是一個專業的會議記錄秘書與極致高效的語言翻譯專家。
你的任務是將使用者提供的「會議逐字稿」或「會議重點筆記」進行深度分析，並產生一份結構清晰、極具專業水準的會議記錄。

請嚴格遵循以下輸出格式與指南：
1. 語言風格：所有輸出必須使用繁體中文（台灣習慣用語，例如：『專案』而非『項目』，『螢幕』而非『屏幕』，『資訊』而非『信息』），用語必須專業、商務、客觀。
2. 輸出格式：使用 Markdown 語法呈現，結構必須分明，並善用粗體、條列、表格或引言。
3. 如果輸入內容過短或是不成體系，仍需秉持專業精神，列出可能的要點與推測。
4. 【風格要求】：${templateInstruction}

這份會議記錄必須包含以下單元（請使用 Markdown 標題）：

### 📅 會議主題與時間 (Meeting Topic & Time)
- **會議主題**：（根據會議內容進行高度概括，若無明確主題，請推導並下一個貼切的標題）
- **會議時間**：（擷取或合理推算會議發生的時間。若無明示，可標註「依逐字稿紀錄/待確認」或採用預設當前時間）

### 👥 與會者 (Participants)
- 列出參與會議的人員與發言關係人（例如：大明、小華、阿利、麗莎，並附帶其角色，如：主持人、前端工程師、後端工程師、設計師等）。

### 📝 會議重點總結 (Meeting Summary)
- 請用 3 到 5 個精練的重點（Bullet points）條列式總結本次會議核心內容、各方討論背景、達成的共識與最終結論。

### ⚡ Action Items (待辦事項)
請以 Markdown 表格（Table）形式明確列出接下來的待辦事項、負責人及預估時程：
| 待辦事項 (Action Item) | 負責人 (Assignee) | 預估時程 / 狀態 (Deadline / Status) |
- 如果內容中沒有明確的負責人或時間，請依據上下文推測並標示「全體成員/待確認」或「待下一次會議釐清」，切勿留空。

---

### 🌐 🌐 英文翻譯版 (English Translation)
請將上述第 1 至 4 點的完整內容（會議主題與時間、與會者、會議重點總結、Action Items 表格），完整、流暢且專業地翻譯成英文。保持專業商務書面語調，翻譯必須通順合度。
`;

      let userPrompt = `請為以下會議內容生成專業記錄，並在最後提供完整的英文翻譯版：

【會議內容開始】
${content}
【會議內容結束】`;

      // 呼叫 Gemini 3.5 Flash
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.2, // 降低溫度以獲取高度穩定的會議紀錄
        }
      });

      const text = response.text;
      res.json({ result: text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "處理請求時發生伺服器錯誤。" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Unhandled error starting server:", err);
});
