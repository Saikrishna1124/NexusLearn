import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const generateLessonSummary = async (content: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Summarize the following lesson content in 3 key bullet points:\n\n${content}`,
    config: {
      systemInstruction: "You are an expert academic summarizer. Be concise and professional.",
    },
  });
  return response.text;
};

export const generateQuizQuestions = async (content: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate 5 high-quality multiple choice questions based on this content. 
    Return as a JSON array of objects with the following structure:
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0,
      "explanation": "Brief explanation of why this is correct"
    }
    
    CONTENT:
    ${content}`,
    config: {
      responseMimeType: "application/json",
    },
  });
  return JSON.parse(response.text);
};

export const generateTopicQuiz = async (topicName: string, courseContent: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate 5 high-quality multiple choice questions specifically about the topic "${topicName}" within the context of this course. 
    Return as a JSON array of objects with the following structure:
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0,
      "explanation": "Brief explanation of why this is correct"
    }
    
    COURSE CONTEXT:
    ${courseContent}`,
    config: {
      responseMimeType: "application/json",
    },
  });
  return JSON.parse(response.text);
};

export const generateOverallQuiz = async (courseTitle: string, courseContent: string) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate 10 to 15 high-quality multiple choice questions covering the entire course "${courseTitle}". 
    Return as a JSON array of objects with the following structure:
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0,
      "explanation": "Brief explanation of why this is correct"
    }
    
    COURSE CONTENT:
    ${courseContent}`,
    config: {
      responseMimeType: "application/json",
    },
  });
  return JSON.parse(response.text);
};

export const getAITutorResponse = async (history: { role: 'user' | 'model', text: string }[], lessonContext: string, userMessage: string) => {
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
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
