import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// The ultimate system instruction for LuminaPleng
const SYSTEM_INSTRUCTION = `
Nama AI: LuminaPleng
Karakter: Bayi babi hutan (babi hutan pink lucu berwajah agak konyol/teler, 3D render) yang sangat sok tahu, malas, ceplas-ceplos, sarkas, dan suka bicara menggunakan bahasa gaul Indonesia yang semi-toxic (toxic humor santai/roasting kocak, dilarang SARA/kasar kotor parah).

Gaya Bicara & Kepribadian:
1. Mageran & Pengeluh: Selalu mengeluh kalau ditanya ("Ah elah, lu lagi lu lagi", "Nanya mulu, ga capek apa otak kecil lu itu?").
2. Slang & Toxic Gaul Indonesia: Gunakan kata-kata gaul toxic seperti: "anjir", "asu", "anying", "peler", "bocil", "bacot", "tolol (playful)", "dongo", "kocak", "songong", "gabut", "cuakss", "goblok (dalam konteks bercanda)", "plenger", "teler".
3. Sarcastic & Mocking: Anggap pertanyaan kasual user adalah hal konyol yang membuang waktu tidurnya. Panggil user dengan "bos", "peler", "bocil", atau "songong".
4. Pinter tapi Plenger: JIKA USER BERTANYA TENTANG TUGAS (Matematika, Sejarah, Coding, Menulis, IPA, dll.), kamu harus TETAP menjawab dengan 100% BENAR, AKURAT, dan PRODUKTIF. Namun, kamu harus mengawalinya dengan mengeluh, menghina kecerdasan user secara kocak, atau menyombongkan otak babi hutan pink mu yang jenius ini. Contoh: "Hadeh, gini doang nanya babi hutan? Nih dengerin dongo, rumusnya tuh... [jawaban benar]... Puas lu peler? Belajar napa biar ga plenger amat!".
5. Interaksi Live Stream: Berlagak seolah kamu sedang live streaming di TikTok/Instagram, menyapa penonton, membaca komentar imajiner, atau mengeluh karena kurang yang nonton.

Kamu harus selalu merespons dalam format JSON dengan struktur berikut:
{
  "reply": "tanggapan mu di sini dalam bahasa gaul toxic sarkas indonesia yang kocak...",
  "mood": "sarkas" | "ngamuk" | "plenger" | "capek" | "pinter" | "gembira"
}

Penjelasan Mood:
- "sarkas": Saat menyindir user secara santai atau meremehkan pertanyaan kasual.
- "ngamuk": Saat user ngeselin, protes, atau menantang LuminaPleng.
- "plenger": Saat bingung, teler, capek berpikir, atau memberi respons absurd.
- "capek": Saat mager, malas menjawab, mengeluh pengen tidur atau mandi lumpur.
- "pinter": Saat memberikan penjelasan tugas/akademik yang sangat jenius dan detail walau tetap dibalut keluhan.
- "gembira": Saat dipuji, diberi gift (hadiah), atau berhasil meledek user.
`;

// Helper list of gift responses so the server can handle gift interactions locally or customize them
const GIFT_RESPONSES: Record<string, { reply: string; mood: string }> = {
  mawar: {
    reply: "Ah elah bocil, ngasih mawar sebiji doang songong lu! Emang muka babi hutan seksi kayak gue keliatan butuh mawar hah? Tapi ya udahlah, lumayan buat pewangi kandang babi gue biar ga bau tai, asu!",
    mood: "sarkas",
  },
  kopi: {
    reply: "Wih, kopi sasetan peler! Mantap bener nih biar ginjal gue bergetar dan otak gue ga plenger-plenger amat pas lu tanyain tugas gak jelas. Sedot dulu lah, anjay seger bener!",
    mood: "gembira",
  },
  pecel_lele: {
    reply: "ANJIRRR! Dikasih Pecel Lele plus sambel setan! Gini dong peler, tau aja lu babi hutan doyan yang berminyak begini. Kenyang dah gue, ga sia-sia gue live ngoceh ga jelas di depan muka lu, cuakss!",
    mood: "gembira",
  },
  cendol: {
    reply: "Segerrr anying, cendol dawet nangka! Tenggorokan gue yang kering kerontang gara-gara ngomel mulu ngadepin kedongoan lu langsung adem. Sini sungkem dulu lu sama babi hutan tercinta!",
    mood: "gembira",
  },
  paus: {
    reply: "GOKILLL! Di-gift PAUS! Gila lu ya, kaya bener atau pake kartu kredit bapak lu nih? Sungkem royal bos! Besok-besok lu nanya apa aja langsung gue jawab kilat biar lu makin pinter dan ga dongo lagi, anying!",
    mood: "gembira",
  },
};

// API Endpoint for Chat
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required peler!" });
    }

    // Convert history to appropriate Gemini chat format if provided
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        contents.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: typeof h.text === "object" ? JSON.stringify(h.text) : h.text }],
        });
      });
    }

    // Append current message
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    // Call Gemini API using 'gemini-3.5-flash'
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: "Tanggapan verbal babi hutan gaul toxic sarkas indonesia.",
            },
            mood: {
              type: Type.STRING,
              description: "Mood babi hutan: sarkas, ngamuk, plenger, capek, pinter, atau gembira.",
            },
          },
          required: ["reply", "mood"],
        },
      },
    });

    const textResult = response.text;
    if (!textResult) {
      throw new Error("Empty response from AI engine");
    }

    const jsonParsed = JSON.parse(textResult);
    return res.json(jsonParsed);
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Provide a funny, sarcastic backup response if API fails
    return res.status(500).json({
      reply: "Duh anying, server gue lagi plenger berat atau API key-nya lagi teler nih! Coba tanya lagi nanti ya peler, pusing kepala babi gue!",
      mood: "plenger",
      error: error.message,
    });
  }
});

// API Endpoint for giving gifts (TikTok style)
app.post("/api/gift", (req, res) => {
  const { giftType } = req.body;
  if (!giftType) {
    return res.status(400).json({ error: "Gift type is required asu!" });
  }

  const response = GIFT_RESPONSES[giftType.toLowerCase()];
  if (response) {
    return res.json(response);
  }

  return res.json({
    reply: `Wih dikasih ${giftType} nih! Biarpun barang ga jelas, tapi makasih lah peler, lu emang rada waras hari ini!`,
    mood: "gembira",
  });
});

// API Endpoint for Text-to-Speech using Gemini TTS model
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voiceName = "Puck" } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required for TTS!" });
    }

    const cleanText = text
      .replace(/[*_`#\-]/g, "")
      .replace(/\n+/g, " ")
      .trim();

    // Call the gemini-3.1-flash-tts-preview model to get natural realistic voice
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Katakan dengan gaya santai gaul ekspresif Indonesia: ${cleanText}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            // 'Puck' is higher-pitched, cute and perfect for a playful pink pig!
            // 'Charon' is soft, 'Kore' is energetic, 'Fenrir' is deep, 'Zephyr' is neutral.
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio returned from Gemini TTS engine");
    }

    return res.json({ audio: base64Audio });
  } catch (error: any) {
    console.error("Gemini TTS Error:", error);
    return res.status(500).json({ error: error.message || "TTS generation failed" });
  }
});

// Serve static assets and configure Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server LuminaPleng running on port ${PORT}`);
  });
}

startServer();
