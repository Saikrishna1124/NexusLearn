import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const quizSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      question: { type: Type.STRING },
      options: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      correctAnswerIndex: { type: Type.INTEGER },
      explanation: { type: Type.STRING }
    },
    required: ["question", "options", "correctAnswerIndex", "explanation"]
  }
};

export const generateLessonSummary = async (content: string) => {
  if (!content || content.trim().length < 10) {
    return "Content is too short to summarize.";
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: `Summarize the following lesson content in 3 key bullet points:\n\n${content}`,
      config: {
        systemInstruction: "You are an expert academic summarizer. Be concise and professional.",
      },
    });
    return response.text || "Failed to generate summary.";
  } catch (error) {
    console.error("Error generating summary:", error);
    return "AI failed to generate a summary at this time.";
  }
};

export const generateQuizQuestions = async (content: string) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key is missing. Please check your environment settings.");
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: `Generate exactly 5 high-quality multiple choice questions based on this content. 
    
    CONTENT:
    ${content || "General knowledge questions related to education."}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: quizSchema,
    },
  });

  try {
    const text = response.text;
    if (!text) throw new Error("AI returned an empty response");
    return JSON.parse(text);
  } catch (e) {
    console.error("Quiz Generation Error:", e, response.text);
    throw new Error("Failed to generate a valid quiz. The content might be too complex or restricted.");
  }
};

export const generateTopicQuiz = async (topicName: string, courseContent: string) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key is missing.");
  }

  const prompt = courseContent && courseContent.trim().length > 20
    ? `Generate exactly 5 high-quality multiple choice questions specifically about the topic "${topicName}" within the context of this course.
    
    COURSE CONTEXT:
    ${courseContent}`
    : `Generate exactly 5 high-quality multiple choice questions about the topic "${topicName}". Ensure they are educational and challenging.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: quizSchema,
    },
  });

  try {
    const text = response.text;
    if (!text) throw new Error("AI returned an empty response");
    return JSON.parse(text);
  } catch (e) {
    console.error("Topic Quiz Generation Error:", e, response.text);
    throw new Error(`Failed to generate quiz for "${topicName}". Please try again.`);
  }
};

export const generateOverallQuiz = async (courseTitle: string, courseContent: string) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API key is missing.");
  }

  const prompt = courseContent && courseContent.trim().length > 20
    ? `Generate 10 to 15 high-quality multiple choice questions covering the entire course "${courseTitle}".
    
    COURSE CONTENT:
    ${courseContent}`
    : `Generate 10 high-quality multiple choice questions for a course titled "${courseTitle}".`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: quizSchema,
    },
  });

  try {
    const text = response.text;
    if (!text) throw new Error("AI returned an empty response");
    return JSON.parse(text);
  } catch (e) {
    console.error("Overall Quiz Generation Error:", e, response.text);
    throw new Error(`Failed to generate overall quiz for "${courseTitle}".`);
  }
};

export const getAITutorResponse = async (history: { role: 'user' | 'model', text: string }[], lessonContext: string, userMessage: string) => {
  const chat = ai.chats.create({
    model: "gemini-3.1-flash-lite-preview",
    config: {
      systemInstruction: `You are Nexus, a premium AI tutor. 
      Provide concise, direct, and helpful answers like ChatGPT. 
      Avoid long-winded explanations unless specifically asked.
      Use the provided lesson context to inform your answers.
      
      LESSON CONTEXT:
      ${lessonContext}`,
    },
  });

  // Convert history to Gemini format
  const contents = history.map(h => ({
    role: h.role,
    parts: [{ text: h.text }]
  }));

  const response = await chat.sendMessage({ message: userMessage });
  return response.text;
};
