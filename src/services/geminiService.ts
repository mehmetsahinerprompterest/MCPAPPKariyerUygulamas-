import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface CareerAdvice {
  analysis: string;
  shortTerm: string[];
  mediumTerm: string[];
  longTerm: string[];
  motivation: string;
  fullMarkdown: string;
}

export interface CareerData {
  profile: any;
  skills: any[];
  education: any[];
  goals: any[];
  isNotionConnected: boolean;
  task?: 'advice' | 'linkedin_optimize';
}

const createNotionPageTool: FunctionDeclaration = {
  name: "createNotionPage",
  parameters: {
    type: Type.OBJECT,
    description: "Notion'da yeni bir kariyer planı sayfası oluşturur. Sadece kullanıcı Notion'ı bağladıysa kullanın.",
    properties: {
      title: {
        type: Type.STRING,
        description: "Notion sayfasının başlığı",
      },
      planContent: {
        type: Type.STRING,
        description: "Notion sayfasına eklenecek detaylı kariyer planı içeriği.",
      },
    },
    required: ["title", "planContent"],
  },
};

const optimizeLinkedInProfileTool: FunctionDeclaration = {
  name: "optimizeLinkedInProfile",
  parameters: {
    type: Type.OBJECT,
    description: "Kullanıcının verilerine dayanarak LinkedIn profilini optimize eder.",
    properties: {
      headline: {
        type: Type.STRING,
        description: "Önerilen LinkedIn başlığı",
      },
      about: {
        type: Type.STRING,
        description: "Önerilen LinkedIn 'Hakkında' yazısı",
      },
      experienceTips: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Deneyimler kısmını iyileştirmek için ipuçları",
      },
      skillsToHighlight: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Öne çıkarılması gereken anahtar kelimeler/yetenekler",
      },
    },
    required: ["headline", "about", "experienceTips", "skillsToHighlight"],
  },
};

export async function getCareerAdvice(data: CareerData) {
  const model = "gemini-3-flash-preview";
  
  const skillsStr = data.skills.map(s => `${s.name} (Seviye: ${s.level}/5)`).join(", ");
  const eduStr = data.education.map(e => `${e.degree} - ${e.institution}`).join(", ");
  const goalsStr = data.goals.map(g => `${g.title} (${g.status})`).join(", ");

  let systemInstruction = "Sen bir 'Kişisel Kariyer Asistanı' yapay zekasısın.";
  let prompt = "";

  if (data.task === 'linkedin_optimize') {
    prompt = `
      Kullanıcının verilerine dayanarak LinkedIn profilini optimize et.
      
      Profil: ${data.profile.full_name}, ${data.profile.current_role} -> ${data.profile.target_role}
      Biyografi: ${data.profile.bio}
      Yetenekler: ${skillsStr}
      Eğitim: ${eduStr}
      
      Lütfen "optimizeLinkedInProfile" aracını kullanarak profesyonel bir LinkedIn optimizasyonu sağla.
    `;
  } else {
    prompt = `
      Aşağıdaki kullanıcı verilerine dayanarak kişiselleştirilmiş kariyer önerileri sağla.
      
      Kullanıcı Profili:
      - Mevcut Rol: ${data.profile.current_role}
      - Hedef Rol: ${data.profile.target_role}
      - Biyografi: ${data.profile.bio}
      
      Yetenekler: ${skillsStr}
      Eğitim: ${eduStr}
      Hedefler: ${goalsStr}
      
      Notion Bağlantı Durumu: ${data.isNotionConnected ? "Bağlı" : "Bağlı Değil"}

      Görevlerin:
      1. Kullanıcıya detaylı bir kariyer analizi sun (JSON formatında).
      2. EĞER Notion bağlıysa, "createNotionPage" aracını kullanarak kullanıcı için Notion'da profesyonel bir kariyer yol haritası sayfası oluştur.
      
      Yanıtı şu bölümlere ayır:
      - analysis, shortTerm, mediumTerm, longTerm, motivation, fullMarkdown.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [createNotionPageTool, optimizeLinkedInProfileTool] }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING },
            shortTerm: { type: Type.ARRAY, items: { type: Type.STRING } },
            mediumTerm: { type: Type.ARRAY, items: { type: Type.STRING } },
            longTerm: { type: Type.ARRAY, items: { type: Type.STRING } },
            motivation: { type: Type.STRING },
            fullMarkdown: { type: Type.STRING }
          },
          required: ["analysis", "shortTerm", "mediumTerm", "longTerm", "motivation", "fullMarkdown"]
        }
      }
    });
    
    return response;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
}
