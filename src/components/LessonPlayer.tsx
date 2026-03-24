import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipForward, SkipBack, MessageSquare, Send, X, Loader2, BookOpen, ArrowLeft } from 'lucide-react';
import { getAITutorResponse } from '../services/aiService';

export const LessonPlayer = ({ lesson, onClose }: { lesson: any, onClose: () => void }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      const response = await getAITutorResponse(messages, lesson.content, userMessage);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      console.error('AI Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#050505] flex flex-col lg:flex-row">
      {/* Video / Content Area */}
      <div className="flex-1 flex flex-col border-r border-white/10">
        <div className="h-20 border-b border-white/10 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-6 h-6" />
              <span className="hidden sm:inline font-medium">Back</span>
            </button>
            <h2 className="text-xl font-bold">{lesson.title}</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">Progress: 45%</span>
            <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500" style={{ width: '45%' }} />
            </div>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          <div className="max-w-4xl mx-auto">
            <div className="aspect-video bg-indigo-600/10 rounded-3xl border border-white/10 flex items-center justify-center mb-8 relative group overflow-hidden">
              <img src="https://picsum.photos/seed/lesson/1280/720" className="absolute inset-0 w-full h-full object-cover opacity-50" alt="Lesson" />
              <button className="relative z-10 w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                <Play className="w-8 h-8 fill-white" />
              </button>
            </div>

            <div className="prose prose-invert max-w-none">
              <h1 className="text-3xl font-bold mb-6">Introduction to Neural Architectures</h1>
              <p className="text-gray-400 leading-relaxed mb-6">
                In this lesson, we explore the fundamental building blocks of modern neural networks.
                We'll cover perceptrons, activation functions, and the backpropagation algorithm that allows
                machines to learn from data.
              </p>
              <div className="p-6 rounded-2xl bg-indigo-600/5 border border-indigo-600/20 mb-8">
                <h4 className="flex items-center gap-2 text-indigo-400 font-bold mb-2">
                  <BookOpen className="w-5 h-5" />
                  Key Takeaways
                </h4>
                <ul className="list-disc list-inside text-gray-400 space-y-2">
                  <li>Understanding the mathematical model of a neuron</li>
                  <li>Differentiating between various activation functions (ReLU, Sigmoid, Tanh)</li>
                  <li>The role of loss functions in optimization</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Tutor Sidebar */}
      <div className="w-full lg:w-[400px] flex flex-col bg-black/40 backdrop-blur-xl">
        <div className="h-20 border-b border-white/10 flex items-center px-6 gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-bold">Nexus AI Tutor</h3>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-indigo-400" />
              </div>
              <p className="text-gray-400 text-sm">Ask me anything about this lesson!</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] p-4 rounded-2xl ${msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-none'
                }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
              </div>
            </motion.div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-none">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSendMessage} className="p-6 border-t border-white/10">
          <div className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm focus:border-indigo-500 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 rounded-lg text-white disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
