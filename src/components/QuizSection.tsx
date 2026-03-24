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
  AlertCircle,
  Sparkles,
  Play
} from 'lucide-react';
import { generateQuizQuestions, generateTopicQuiz } from '../services/aiService';
import { collection, addDoc, query, where, getDocs, orderBy, limit, updateDoc, doc } from 'firebase/firestore';
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
  enrollmentId?: string | null;
  topicTitle?: string;
  questions?: Question[];
  onComplete?: (score: number, total: number) => void;
  onClose?: () => void;
}

export const QuizSection: React.FC<QuizSectionProps> = ({
  courseId,
  courseTitle,
  courseContent,
  enrollmentId,
  topicTitle,
  questions,
  onComplete,
  onClose
}) => {
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Question[] | null>(questions || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    try {
      let generatedQuestions;
      if (topicTitle) {
        generatedQuestions = await generateTopicQuiz(topicTitle, courseContent);
      } else {
        const contentForAI = courseContent || `Course Title: ${courseTitle}`;
        generatedQuestions = await generateQuizQuestions(contentForAI);
      }

      if (!generatedQuestions || !Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
        throw new Error("Invalid quiz format received from AI");
      }

      setQuiz(generatedQuestions);
      setCurrentQuestionIndex(0);
      setScore(0);
      setShowResults(false);
      setIsAnswered(false);
      setSelectedOption(null);
    } catch (error: any) {
      console.error('Failed to generate quiz:', error);
      setError(error.message || "AI failed to generate a quiz. This can happen if the course content is too brief or if there's a connection issue. Please try again.");
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

      // Update enrollment grade if enrollmentId is provided
      if (enrollmentId) {
        const percentage = Math.round((score / quiz!.length) * 100);
        await updateDoc(doc(db, 'enrollments', enrollmentId), {
          grade: percentage
        });
      }

      setPreviousResult(result);
    } catch (error) {
      console.error('Error saving quiz result:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-6 min-h-[400px]">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-indigo-500/20 rounded-full" />
          <div className="absolute top-0 left-0 w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <Brain className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-indigo-400" />
        </div>
        <div className="text-center space-y-2">
          <h4 className="text-xl font-bold text-white">Nexus AI is Thinking...</h4>
          <p className="text-gray-400 animate-pulse max-w-xs">Crafting a personalized quiz based on {topicTitle ? `"${topicTitle}"` : 'the course material'}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-[2rem] bg-rose-500/5 border border-rose-500/20 text-center space-y-6 min-h-[300px] flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-rose-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">Generation Failed</h3>
          <p className="text-gray-400 max-w-md mx-auto">{error}</p>
        </div>
        <button
          onClick={startQuiz}
          className="px-8 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          Try Again
        </button>
      </div>
    );
  }

  if (showResults) {
    const percentage = Math.round((score / quiz!.length) * 100);
    const isPerfect = score === quiz!.length;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-8 rounded-[2rem] bg-white/5 border border-white/10 text-center space-y-6"
      >
        <div className="w-20 h-20 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto">
          <Trophy className="w-10 h-10 text-indigo-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold">Quiz Completed!</h3>
          <p className="text-gray-400">You scored {score} out of {quiz!.length}</p>
          <div className="text-4xl font-black text-white mt-4">{percentage}%</div>
          {isPerfect && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-bold mt-4 italic"
            >
              "Are you even human? 0 mistakes. if you're a supercomputer just admit it."
            </motion.div>
          )}
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
            onClick={() => {
              if (onClose) onClose();
              setQuiz(null);
            }}
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
          <h3 className="text-2xl font-bold mb-2">
            {questions ? 'Knowledge Check Ready' : 'AI Knowledge Check'}
          </h3>
          <p className="text-gray-400 mb-6">
            {questions
              ? `A pre-made quiz is available for ${topicTitle ? `"${topicTitle}"` : 'this section'}. You can also generate a new one using AI.`
              : 'Ready to test your understanding? Our AI will generate a unique quiz based on the course material.'
            }
          </p>

          {previousResult && (
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>Last score: {previousResult.score}/{previousResult.totalQuestions}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            {questions && (
              <button
                onClick={() => {
                  setQuiz(questions);
                  setCurrentQuestionIndex(0);
                  setScore(0);
                  setShowResults(false);
                  setIsAnswered(false);
                  setSelectedOption(null);
                }}
                className="px-8 py-4 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-2 transition-all hover:bg-gray-200"
              >
                <Play className="w-5 h-5 fill-black" />
                Start Provided Quiz
              </button>
            )}
            <button
              onClick={startQuiz}
              className={`px-8 py-4 ${questions ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30' : 'bg-indigo-600 text-white hover:bg-indigo-700'} rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20`}
            >
              <Sparkles className="w-5 h-5" />
              {questions ? 'Generate New AI Quiz' : 'Generate & Start Quiz'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

