import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Sparkles, FileText, ArrowLeft, Loader2, MessageSquare, Book } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getAITutorResponse } from '../services/aiService';
import { QuizSection } from '../components/QuizSection';
import ReactMarkdown from 'react-markdown';

export const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState('');
  const [generatingSummary, setGeneratingSummary] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!id) return;
      try {
        const docSnap = await getDoc(doc(db, 'courses', id));
        if (docSnap.exists()) {
          setCourse({ id: docSnap.id, ...docSnap.data() });
        } else {
          navigate('/student/dashboard');
        }
      } catch (error) {
        console.error('Error fetching course:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [id, navigate]);

  const generateSummary = async () => {
    if (!course) return;
    setGeneratingSummary(true);
    try {
      const prompt = `Please provide a concise, professional summary of the following course content: ${course.title} - ${course.description}. Focus on key learning outcomes.`;
      const response = await getAITutorResponse([], prompt, "Generate a summary for this course.");
      setSummary(response);
    } catch (error) {
      console.error('Summary generation failed:', error);
    } finally {
      setGeneratingSummary(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/student/courses')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Catalog
        </button>
        <div className="flex items-center gap-4">
          <span className="px-3 py-1 rounded-full bg-indigo-600/20 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            Enrolled
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content: PDF Viewer */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden aspect-[3/4] relative">
            <iframe
              src={course.pdfUrl}
              className="w-full h-full border-none"
              title="Course PDF"
            />
          </div>

          {course.content && (
            <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-sm">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Book className="w-6 h-6 text-indigo-400" />
                Course Content
              </h3>
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown>{course.content}</ReactMarkdown>
              </div>
            </div>
          )}

          <QuizSection
            courseId={course.id}
            courseTitle={course.title}
            courseContent={course.content || course.description || ''}
          />
        </div>

        {/* Sidebar: Details & AI Summary */}
        <div className="space-y-8">
          <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-sm">
            <h1 className="text-3xl font-bold mb-4">{course.title}</h1>
            <p className="text-gray-400 leading-relaxed mb-8">{course.description}</p>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span>Full Course Material (PDF)</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <span>Self-paced Learning</span>
              </div>
            </div>
          </div>

          <div className="p-8 rounded-[2rem] bg-indigo-600/10 border border-indigo-600/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4">
              <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              AI Course Summary
            </h3>

            <AnimatePresence mode="wait">
              {!summary ? (
                <motion.div
                  key="generate"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <p className="text-gray-400 text-sm mb-6">
                    Get a concise AI-generated summary of this course to help you focus on the most important concepts.
                  </p>
                  <button
                    onClick={generateSummary}
                    disabled={generatingSummary}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {generatingSummary ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Generate AI Summary
                      </>
                    )}
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="summary"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="prose prose-invert prose-sm max-w-none"
                >
                  <div className="text-gray-300 leading-relaxed italic">
                    "{summary}"
                  </div>
                  <button
                    onClick={() => setSummary('')}
                    className="mt-4 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    Regenerate Summary
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              AI Tutor Support
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              Have questions about the material? Use the AI Tutor widget in the bottom corner for instant, context-aware help.
            </p>
            <div className="p-4 rounded-xl bg-black/30 border border-white/5 text-xs text-gray-500 italic">
              Tip: Ask "What are the main prerequisites for this course?"
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
