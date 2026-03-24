import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
  Trophy,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { generateQuizQuestions } from '../services/aiService';
import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

interface Question {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

interface QuizSectionProps {
  courseId: string;
  courseTitle: string;
  courseContent: string;
  questions?: Question[];
  onComplete?: (score: number, total: number) => void;
}

export const QuizSection: React.FC<QuizSectionProps> = ({ courseId, courseTitle, courseContent, questions, onComplete }) => {
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Question[] | null>(questions || null);
  const [loading, setLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [previousResult, setPreviousResult] = useState<any>(null);

  useEffect(() => {
    fetchPreviousResult();
  }, [courseId, user]);

  const fetchPreviousResult = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'quiz_results'),
        where('userId', '==', user.uid),
        where('courseId', '==', courseId),
        orderBy('completedAt', 'desc'),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        setPreviousResult(snap.docs[0].data());
      }
    } catch (error) {
      console.error('Error fetching previous result:', error);
    }
  };

  const startQuiz = async () => {
    setLoading(true);
    try {
      // Use course content if available, otherwise fallback to title/description
      const contentForAI = courseContent || `Course Title: ${courseTitle}`;
      const questions = await generateQuizQuestions(contentForAI);
      setQuiz(questions);
      setCurrentQuestionIndex(0);
      setScore(0);
      setShowResults(false);
      setIsAnswered(false);
      setSelectedOption(null);
    } catch (error) {
      console.error('Failed to generate quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
  };

  const handleCheckAnswer = () => {
    if (selectedOption === null) return;
    setIsAnswered(true);
    if (selectedOption === quiz![currentQuestionIndex].correctAnswerIndex) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz!.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setShowResults(true);
    if (onComplete) {
      onComplete(score, quiz!.length);
    }
    if (!user) return;

    try {
      const result = {
        userId: user.uid,
        courseId,
        score,
        totalQuestions: quiz!.length,
        completedAt: new Date().toISOString(),
      };
      await addDoc(collection(db, 'quiz_results'), result);
      setPreviousResult(result);
    } catch (error) {
      console.error('Error saving quiz result:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-4 min-h-[300px]">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
        <p className="text-gray-400 animate-pulse">AI is crafting a personalized quiz for you...</p>
      </div>
    );
  }

  if (showResults) {
    const percentage = Math.round((score / quiz!.length) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-8 rounded-[2rem] bg-white/5 border border-white/10 text-center space-y-6"
      >
        <div className="w-20 h-20 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto">
          <Trophy className="w-10 h-10 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-2xl font-bold mb-2">Quiz Completed!</h3>
          <p className="text-gray-400">You scored {score} out of {quiz!.length}</p>
        </div>

        <div className="relative h-4 bg-white/5 rounded-full overflow-hidden max-w-md mx-auto">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            className={`h-full ${percentage >= 70 ? 'bg-emerald-500' : percentage >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
          />
        </div>

        <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={startQuiz}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
          <button
            onClick={() => setQuiz(null)}
            className="px-8 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-all"
          >
            Close Quiz
          </button>
        </div>
      </motion.div>
    );
  }

  if (quiz) {
    const currentQuestion = quiz[currentQuestionIndex];
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 rounded-[2rem] bg-white/5 border border-white/10 space-y-8"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 font-bold">
            <Brain className="w-5 h-5" />
            <span>AI Quiz</span>
          </div>
          <div className="text-sm text-gray-500">
            Question {currentQuestionIndex + 1} of {quiz.length}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white leading-tight">
            {currentQuestion.question}
          </h3>

          <div className="grid gap-3">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => handleOptionSelect(idx)}
                disabled={isAnswered}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between ${selectedOption === idx
                    ? isAnswered
                      ? idx === currentQuestion.correctAnswerIndex
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500 text-rose-400'
                      : 'bg-indigo-600/10 border-indigo-500 text-indigo-400'
                    : isAnswered && idx === currentQuestion.correctAnswerIndex
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
              >
                <span>{option}</span>
                {isAnswered && idx === currentQuestion.correctAnswerIndex && <CheckCircle2 className="w-5 h-5" />}
                {isAnswered && selectedOption === idx && idx !== currentQuestion.correctAnswerIndex && <XCircle className="w-5 h-5" />}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {isAnswered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className={`p-6 rounded-2xl border ${selectedOption === currentQuestion.correctAnswerIndex
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-rose-500/5 border-rose-500/20'
                }`}
            >
              <div className="flex items-start gap-3">
                <AlertCircle className={`w-5 h-5 mt-0.5 ${selectedOption === currentQuestion.correctAnswerIndex ? 'text-emerald-400' : 'text-rose-400'
                  }`} />
                <div>
                  <div className={`font-bold mb-1 ${selectedOption === currentQuestion.correctAnswerIndex ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                    {selectedOption === currentQuestion.correctAnswerIndex ? 'Correct!' : 'Incorrect'}
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {currentQuestion.explanation}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="pt-4">
          {!isAnswered ? (
            <button
              onClick={handleCheckAnswer}
              disabled={selectedOption === null}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-4 rounded-2xl font-bold transition-all"
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              className="w-full bg-white text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all"
            >
              {currentQuestionIndex < quiz.length - 1 ? 'Next Question' : 'Finish Quiz'}
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10">
      <div className="flex flex-col md:flex-row items-center gap-8">
        <div className="w-24 h-24 bg-indigo-600/10 rounded-3xl flex items-center justify-center flex-shrink-0">
          <Brain className="w-12 h-12 text-indigo-400" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-2xl font-bold mb-2">AI Knowledge Check</h3>
          <p className="text-gray-400 mb-6">
            Ready to test your understanding? Our AI will generate a unique quiz based on the course material.
          </p>

          {previousResult && (
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Last score: {previousResult.score}/{previousResult.totalQuestions}</span>
            </div>
          )}

          <button
            onClick={startQuiz}
            className="w-full md:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
          >
            <Sparkles className="w-5 h-5" />
            Generate & Start Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

const Sparkles = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);
