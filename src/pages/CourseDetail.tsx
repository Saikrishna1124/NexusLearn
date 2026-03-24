import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Sparkles, FileText, ArrowLeft, Loader2, MessageSquare, Book, Lock, Play, CheckCircle, Video, HelpCircle, StickyNote } from 'lucide-react';
import { doc, getDoc, query, collection, where, getDocs, updateDoc, setDoc, serverTimestamp, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { getAITutorResponse } from '../services/aiService';
import { QuizSection } from '../components/QuizSection';
import { CourseNotes } from '../components/CourseNotes';
import { useAuth } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';

export const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(false);
  const [summary, setSummary] = useState('');
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [startTime] = useState(Date.now());
  const [activeTopic, setActiveTopic] = useState<any>(null);
  const [completedTopics, setCompletedTopics] = useState<string[]>([]);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState<{ type: 'topic' | 'overall', data: any } | null>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    // Load YouTube IFrame API
    if (!window.hasOwnProperty('YT')) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  useEffect(() => {
    let player: any = null;

    const initPlayer = () => {
      if (activeTopic?.videoUrl && window.hasOwnProperty('YT') && (window as any).YT.Player) {
        const videoId = activeTopic.videoUrl.split('v=')[1]?.split('&')[0];
        if (videoId) {
          player = new (window as any).YT.Player('youtube-player', {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
              'autoplay': 0,
              'modestbranding': 1,
              'rel': 0
            },
            events: {
              'onStateChange': (event: any) => {
                if (event.data === (window as any).YT.PlayerState.ENDED) {
                  markTopicComplete(activeTopic.id);
                }
              }
            }
          });
          playerRef.current = player;
        }
      }
    };

    // If API is already loaded, init immediately
    if (window.hasOwnProperty('YT') && (window as any).YT.Player) {
      initPlayer();
    } else {
      // Wait for API to be ready
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [activeTopic]);

  useEffect(() => {
    const trackTime = async () => {
      if (!id || !user || isAdmin) return;

      return async () => {
        const endTime = Date.now();
        const durationSeconds = Math.floor((endTime - startTime) / 1000);

        if (durationSeconds < 5) return; // Don't track very short visits

        try {
          // Log session
          await addDoc(collection(db, 'sessions'), {
            userId: user.uid,
            courseId: id,
            courseTitle: course?.title || 'Course',
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            durationSeconds
          });

          const q = query(
            collection(db, 'enrollments'),
            where('userId', '==', user.uid),
            where('courseId', '==', id)
          );
          const snap = await getDocs(q);

          if (!snap.empty) {
            const enrollmentDoc = snap.docs[0];
            const currentData = enrollmentDoc.data();

            // Parse current timeSpent (e.g., "1h 20m 30s" or "45s")
            const parseTimeSpent = (timeStr: string) => {
              if (!timeStr || typeof timeStr !== 'string') return 0;
              let totalSeconds = 0;
              const h = timeStr.match(/(\d+)h/);
              const m = timeStr.match(/(\d+)m/);
              const s = timeStr.match(/(\d+)s/);
              if (h) totalSeconds += parseInt(h[1]) * 3600;
              if (m) totalSeconds += parseInt(m[1]) * 60;
              if (s) totalSeconds += parseInt(s[1]);
              return totalSeconds;
            };

            const formatTimeSpent = (totalSeconds: number) => {
              const h = Math.floor(totalSeconds / 3600);
              const m = Math.floor((totalSeconds % 3600) / 60);
              const s = totalSeconds % 60;
              let result = '';
              if (h > 0) result += `${h}h `;
              if (m > 0) result += `${m}m `;
              if (s > 0 || result === '') result += `${s}s`;
              return result.trim();
            };

            const totalSeconds = parseTimeSpent(currentData.timeSpent) + durationSeconds;
            await updateDoc(enrollmentDoc.ref, {
              timeSpent: formatTimeSpent(totalSeconds),
              lastAccessed: serverTimestamp()
            });
          } else {
            // Create enrollment if it doesn't exist (though it should via request approval)
            const formatTimeSpent = (totalSeconds: number) => {
              const h = Math.floor(totalSeconds / 3600);
              const m = Math.floor((totalSeconds % 3600) / 60);
              const s = totalSeconds % 60;
              let result = '';
              if (h > 0) result += `${h}h `;
              if (m > 0) result += `${m}m `;
              if (s > 0 || result === '') result += `${s}s`;
              return result.trim();
            };

            await addDoc(collection(db, 'enrollments'), {
              userId: user.uid,
              courseId: id,
              progress: 0,
              grade: 0,
              timeSpent: formatTimeSpent(durationSeconds),
              lastAccessed: serverTimestamp(),
              enrolledAt: serverTimestamp()
            });
          }
        } catch (error) {
          console.error('Error tracking time:', error);
        }
      };
    };

    const cleanupPromise = trackTime();
    return () => {
      cleanupPromise.then(cleanup => cleanup && cleanup());
    };
  }, [id, user, isAdmin, startTime]);

  useEffect(() => {
    const fetchCourseAndCheckAccess = async () => {
      if (!id || !user) return;

      try {
        // 1. Fetch Course
        const docSnap = await getDoc(doc(db, 'courses', id));
        if (!docSnap.exists()) {
          navigate('/student/dashboard');
          return;
        }
        const courseData = { id: docSnap.id, ...docSnap.data() };
        setCourse(courseData);

        // 2. Check Access & Enrollment
        if (isAdmin) {
          setIsApproved(true);
        } else {
          const q = query(
            collection(db, 'course_requests'),
            where('userId', '==', user.uid),
            where('courseId', '==', id),
            where('status', '==', 'approved')
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            setIsApproved(true);

            // Fetch enrollment for progress tracking
            const qEnroll = query(
              collection(db, 'enrollments'),
              where('userId', '==', user.uid),
              where('courseId', '==', id)
            );

            const unsubscribeEnroll = onSnapshot(qEnroll, (enrollSnap) => {
              if (!enrollSnap.empty) {
                const enrollDoc = enrollSnap.docs[0];
                setEnrollmentId(enrollDoc.id);
                setCompletedTopics(enrollDoc.data().completedTopics || []);
              }
            });

            return () => unsubscribeEnroll();
          } else {
            // Not approved, redirect back to catalog
            navigate('/student/courses');
          }
        }
      } catch (error) {
        console.error('Error fetching course or checking access:', error);
        navigate('/student/courses');
      } finally {
        setLoading(false);
      }
    };
    fetchCourseAndCheckAccess();
  }, [id, user, isAdmin, navigate]);

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

  const contactSupport = () => {
    const event = new CustomEvent('openSupportChat', {
      detail: {
        courseId: id,
        courseTitle: course?.title
      }
    });
    window.dispatchEvent(event);
  };

  const markTopicComplete = async (topicId: string) => {
    if (!enrollmentId || !course || completedTopics.includes(topicId)) return;

    const newCompletedTopics = [...completedTopics, topicId];
    const progress = Math.round((newCompletedTopics.length / (course.topics?.length || 1)) * 100);

    try {
      await updateDoc(doc(db, 'enrollments', enrollmentId), {
        completedTopics: newCompletedTopics,
        progress: progress
      });
    } catch (error) {
      console.error('Error marking topic complete:', error);
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
        {/* Main Content: Video/PDF Viewer */}
        <div className="lg:col-span-2 space-y-8">
          {activeTopic ? (
            <div className="space-y-6">
              <div className="bg-black rounded-[2rem] overflow-hidden aspect-video relative border border-white/10 shadow-2xl">
                {activeTopic.videoUrl ? (
                  <div id="youtube-player" className="w-full h-full" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                    <Video className="w-16 h-16 opacity-20" />
                    <p>No video available for this topic</p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{activeTopic.title}</h2>
                <div className="flex items-center gap-4">
                  {completedTopics.includes(activeTopic.id) ? (
                    <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-neonGreen/20 text-neonGreen font-bold">
                      <CheckCircle className="w-5 h-5" />
                      Completed
                    </div>
                  ) : (
                    <button
                      onClick={() => markTopicComplete(activeTopic.id)}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-bold transition-all border border-white/10"
                    >
                      Mark as Complete
                    </button>
                  )}
                  <button
                    onClick={() => setShowQuiz({ type: 'topic', data: activeTopic.quiz })}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all"
                  >
                    <HelpCircle className="w-5 h-5" />
                    {activeTopic.quiz ? 'Take Topic Quiz' : 'Generate Topic Quiz'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden aspect-[3/4] relative">
              <iframe
                src={course.pdfUrl}
                className="w-full h-full border-none"
                title="Course PDF"
              />
            </div>
          )}

          {showQuiz && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md overflow-y-auto">
              <div className="w-full max-w-4xl my-auto">
                <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 relative">
                  <button
                    onClick={() => setShowQuiz(null)}
                    className="absolute top-6 right-6 text-gray-500 hover:text-white"
                  >
                    Close Quiz
                  </button>
                  <QuizSection
                    courseId={course.id}
                    courseTitle={showQuiz.type === 'topic' ? `Quiz: ${activeTopic?.title}` : `Overall Course Quiz: ${course.title}`}
                    topicTitle={showQuiz.type === 'topic' ? activeTopic?.title : undefined}
                    courseContent={course.content || course.description || ''}
                    enrollmentId={enrollmentId}
                    questions={showQuiz.data}
                    onClose={() => setShowQuiz(null)}
                  />
                </div>
              </div>
            </div>
          )}

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

          <div id="course-notes">
            <CourseNotes courseId={course.id} />
          </div>
        </div>

        {/* Sidebar: Details & Topics */}
        <div className="space-y-8">
          <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-sm">
            <h1 className="text-3xl font-bold mb-4">{course.title}</h1>
            <p className="text-gray-400 leading-relaxed mb-6">{course.description}</p>

            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-mono text-neonBlue uppercase tracking-widest">Course Progress</h3>
                <span className="text-sm font-bold text-white">
                  {Math.round((completedTopics.length / (course.topics?.length || 1)) * 100)}%
                </span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(completedTopics.length / (course.topics?.length || 1)) * 100}%` }}
                  className="h-full bg-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Topics List */}
          <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-sm space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-indigo-400" />
              Course Topics
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => {
                  const element = document.getElementById('course-notes');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all flex items-center gap-4 text-left group mb-4"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-white/20">
                  <StickyNote className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm">Course Notepad</div>
                  <div className="text-[10px] uppercase tracking-wider opacity-50">Take Private Notes</div>
                </div>
              </button>

              <button
                onClick={() => setActiveTopic(null)}
                className={`w-full p-4 rounded-2xl border transition-all flex items-center gap-4 text-left ${!activeTopic
                  ? 'bg-indigo-600/20 border-indigo-500 text-white'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm">Course Material (PDF)</div>
                  <div className="text-[10px] uppercase tracking-wider opacity-50">Reference Guide</div>
                </div>
              </button>

              {course.topics?.map((topic: any, index: number) => (
                <button
                  key={topic.id}
                  onClick={() => setActiveTopic(topic)}
                  className={`w-full p-4 rounded-2xl border transition-all flex items-center gap-4 text-left ${activeTopic?.id === topic.id
                    ? 'bg-indigo-600/20 border-indigo-500 text-white'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 relative">
                    {completedTopics.includes(topic.id) ? (
                      <CheckCircle className="w-5 h-5 text-neonGreen" />
                    ) : (
                      <Play className={`w-5 h-5 ${activeTopic?.id === topic.id ? 'text-white' : 'text-gray-500'}`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm line-clamp-1">{topic.title}</div>
                    <div className="text-[10px] uppercase tracking-wider opacity-50">Topic {index + 1}</div>
                  </div>
                </button>
              ))}

              {course.overallQuiz && (
                <button
                  onClick={() => setShowQuiz({ type: 'overall', data: course.overallQuiz })}
                  className="w-full p-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all flex items-center gap-4 text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-white/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm">Final Course Quiz</div>
                    <div className="text-[10px] uppercase tracking-wider opacity-50">Comprehensive Test</div>
                  </div>
                </button>
              )}
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

          <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-400" />
              Need Help?
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              If you have any questions or problems with this course, feel free to contact our support team.
            </p>
            <button
              onClick={contactSupport}
              className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/10 flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-5 h-5" />
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
