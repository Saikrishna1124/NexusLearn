import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen,
  Play,
  ArrowRight,
  GraduationCap,
  Search,
  ArrowLeft,
  Terminal,
  Trophy,
  Clock,
  Target,
  Zap,
  Cpu,
  Activity,
  Calendar
} from 'lucide-react';
import { collection, onSnapshot, query, where, getDocs, doc, getDoc, addDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';

import { SupportSection } from '../../components/support/SupportSection';

const StatCard = ({ icon: Icon, label, value, color }: { icon: any, label: string, value: string | number, color: string }) => (
  <motion.div
    whileHover={{ y: -5 }}
    className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm flex items-center gap-4"
  >
    <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center flex-shrink-0`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <div>
      <div className="text-gray-400 text-sm font-medium">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  </motion.div>
);

export const StudentDashboard = () => {
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [recommendedCourses, setRecommendedCourses] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    totalPoints: 0,
    learningHours: 0
  });
  const location = useLocation();

  useEffect(() => {
    if (!loading && location.hash) {
      const hash = location.hash.replace('#', '');
      const element = document.getElementById(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [loading, location.hash]);

  useEffect(() => {
    if (!user) return;

    // Fetch enrollments for real-time updates
    const qEnroll = query(
      collection(db, 'enrollments'),
      where('userId', '==', user.uid)
    );

    const unsubscribeEnroll = onSnapshot(qEnroll, async (snapshot) => {
      const coursesData = await Promise.all(
        snapshot.docs.map(async (enrollDoc) => {
          const enrollment = enrollDoc.data();
          const courseDoc = await getDoc(doc(db, 'courses', enrollment.courseId));
          if (!courseDoc.exists()) return null;

          return {
            id: courseDoc.id,
            ...courseDoc.data(),
            progress: enrollment.progress || 0,
            grade: enrollment.grade || 0,
            timeSpent: enrollment.timeSpent || '0s',
            enrolledAt: enrollment.enrolledAt
          };
        })
      );

      const validCourses = coursesData.filter((c): c is any => !!c);
      setEnrolledCourses(validCourses);

      // Calculate stats
      const completed = validCourses.filter(c => c.progress === 100).length;
      const totalPoints = validCourses.reduce((acc, curr) => acc + (Number(curr.grade) || 0), 0);

      setStats({
        totalCourses: validCourses.length,
        completedCourses: completed,
        totalPoints: totalPoints * 10,
        learningHours: Math.floor(validCourses.length * 3.5) // Mock hours based on courses
      });

      setLoading(false);

      // Fetch recommended (not enrolled) courses
      const qCourses = query(collection(db, 'courses'), where('published', '==', true));
      const coursesSnap = await getDocs(qCourses);
      const allCourses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const enrolledIds = validCourses.map(c => c.id);
      setRecommendedCourses(allCourses.filter(c => !enrolledIds.includes(c.id)).slice(0, 3));
    });

    // Fetch recent sessions
    const qSessions = query(
      collection(db, 'sessions'),
      where('userId', '==', user.uid),
      orderBy('endTime', 'desc'),
      limit(5)
    );

    const unsubscribeSessions = onSnapshot(qSessions, (snapshot) => {
      const sessionsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSessions(sessionsData);
    });

    // Fetch quiz results for performance chart
    const qQuiz = query(
      collection(db, 'quiz_results'),
      where('userId', '==', user.uid),
      orderBy('completedAt', 'asc')
    );

    const unsubscribeQuiz = onSnapshot(qQuiz, (snapshot) => {
      const results = snapshot.docs.map(d => {
        const data = d.data();
        return {
          date: new Date(data.completedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
          score: Math.round((data.score / data.totalQuestions) * 100),
          fullDate: data.completedAt
        };
      });
      setQuizResults(results);
    });

    return () => {
      unsubscribeEnroll();
      unsubscribeSessions();
      unsubscribeQuiz();
    };
  }, [user]);

  const requestAccess = async (course: any) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'course_requests'), {
        userId: user.uid,
        userEmail: user.email,
        userName: profile?.displayName || 'Student',
        courseId: course.id,
        courseTitle: course.title,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      navigate('/student/courses');
    } catch (error) {
      console.error('Request failed:', error);
    }
  };

  const overallProgress = enrolledCourses.length > 0
    ? Math.round(enrolledCourses.reduce((acc, curr) => acc + (curr.progress || 0), 0) / enrolledCourses.length)
    : 0;

  const chartData = [
    {
      name: 'Progress',
      value: overallProgress,
      fill: '#4f46e5',
    },
    {
      name: 'Remaining',
      value: 100 - overallProgress,
      fill: 'rgba(255, 255, 255, 0.05)',
    }
  ];

  return (
    <div className="space-y-10 pb-12">
      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider"
          >
            <Zap className="w-3 h-3" />
            Nexus Learning Path Active
          </motion.div>
          <h1 className="text-5xl font-bold tracking-tight">
            Welcome back, <span className="text-indigo-500">{profile?.displayName?.split(' ')[0] || 'Explorer'}</span>!
          </h1>
          <p className="text-gray-400 text-lg max-w-xl leading-relaxed">
            Your progress is looking great! You've completed <span className="text-white font-bold">{stats.completedCourses} courses</span>.
            Ready to tackle your next challenge?
          </p>
          {profile?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Admin Dashboard
            </button>
          )}
        </div>

        {/* Overall Progress Circle */}
        <div className="relative w-48 h-48 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={0}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white">{overallProgress}%</span>
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Overall</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <Link
            to="/student/playground"
            className="px-8 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all border border-white/10 hover:bg-white/5 bg-black/20 backdrop-blur-sm"
          >
            <Terminal className="w-5 h-5 text-indigo-400" />
            Code Playground
          </Link>
          <Link
            to="/student/courses"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-xl shadow-indigo-600/20"
          >
            <Search className="w-5 h-5" />
            Browse Courses
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={BookOpen}
          label="Active Courses"
          value={stats.totalCourses}
          color="bg-blue-500/20 text-blue-400"
        />
        <StatCard
          icon={Trophy}
          label="Completed"
          value={stats.completedCourses}
          color="bg-emerald-500/20 text-emerald-400"
        />
        <StatCard
          icon={Target}
          label="Skill Points"
          value={stats.totalPoints}
          color="bg-amber-500/20 text-amber-400"
        />
        <StatCard
          icon={Clock}
          label="Learning Hours"
          value={`${stats.learningHours}h`}
          color="bg-purple-500/20 text-purple-400"
        />
      </div>

      {/* Course Progress Breakdown */}
      {enrolledCourses.length > 0 && (
        <div className="p-8 rounded-[3rem] bg-white/5 border border-white/10 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
            <Activity className="text-indigo-500" />
            Course Progress Breakdown
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {enrolledCourses.map((course) => {
              const data = [
                { name: 'Completed', value: course.progress || 0, fill: '#4f46e5' },
                { name: 'Remaining', value: 100 - (course.progress || 0), fill: 'rgba(255, 255, 255, 0.05)' }
              ];
              return (
                <div key={course.id} className="flex flex-col items-center gap-4">
                  <div className="relative w-32 h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={55}
                          paddingAngle={0}
                          dataKey="value"
                          startAngle={90}
                          endAngle={-270}
                        >
                          {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-bold text-white">{course.progress || 0}%</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-white line-clamp-1">{course.title}</div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Completion</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Advanced Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Quiz Performance Trend */}
        <div className="p-8 rounded-[3rem] bg-white/5 border border-white/10 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
            <Trophy className="text-amber-500" />
            Quiz Performance Trend
          </h2>
          <div className="h-[300px] w-full">
            {quizResults.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={quizResults}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    dot={{ fill: '#4f46e5', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 italic">
                Complete your first quiz to see performance trends
              </div>
            )}
          </div>
        </div>

        {/* Learning Activity Timeline */}
        <div className="p-8 rounded-[3rem] bg-white/5 border border-white/10 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
            <Clock className="text-indigo-500" />
            Learning Activity
          </h2>
          <div className="h-[300px] w-full">
            {sessions.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[...sessions].reverse().map(s => ({
                  date: new Date(s.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' }),
                  minutes: Math.round(s.durationSeconds / 60)
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}m`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="minutes" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 italic">
                Start learning to track your activity
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        {/* Left Column: My Learning */}
        <div className="xl:col-span-2 space-y-8" id="my-learning">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <GraduationCap className="text-indigo-500" />
              My Learning
            </h2>
            {enrolledCourses.length > 0 && (
              <span className="text-sm text-gray-400 font-medium px-4 py-1 rounded-full bg-white/5 border border-white/10">
                {enrolledCourses.length} Enrolled
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6">
            {enrolledCourses.length > 0 ? (
              enrolledCourses.map((course) => (
                <motion.div
                  key={course.id}
                  whileHover={{ x: 10 }}
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="p-6 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-sm group cursor-pointer hover:bg-white/10 transition-all"
                >
                  <div className="flex flex-col sm:flex-row gap-8 items-center">
                    <div className="w-full sm:w-44 aspect-square rounded-3xl bg-indigo-600/20 overflow-hidden flex-shrink-0 relative">
                      <img
                        src={course.thumbnailUrl}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        alt={course.title}
                      />
                      <div className="absolute inset-0 bg-indigo-600/10 mix-blend-overlay" />
                    </div>
                    <div className="flex-1 w-full space-y-5">
                      <div>
                        <h3 className="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors">{course.title}</h3>
                        <p className="text-gray-400 text-sm line-clamp-1 mt-1">{course.description}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Grade</div>
                          <div className="text-xl font-bold text-indigo-400">{course.grade || 0}%</div>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                          <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">Time</div>
                          <div className="text-xl font-bold text-white">{course.timeSpent || '0s'}</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between text-sm font-bold">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-indigo-400">{course.progress || 0}%</span>
                        </div>
                        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${course.progress || 0}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600/10 border border-indigo-600/20 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <Play className="w-6 h-6 fill-current" />
                    </div>
                  </div>
                </motion.div>
              ))
            ) : !loading && (
              <div className="py-24 text-center bg-white/5 border border-white/10 rounded-[3rem] backdrop-blur-xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-24 h-24 bg-indigo-600/20 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-500">
                    <GraduationCap className="w-12 h-12 text-indigo-400" />
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-4">No courses enrolled yet</h3>
                  <p className="text-gray-400 text-lg mb-10 max-w-md mx-auto">
                    Your learning journey is waiting. Explore our AI-curated catalog and start mastering new skills today.
                  </p>
                  <Link
                    to="/student/courses"
                    className="inline-flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40"
                  >
                    Browse Catalog <ArrowRight className="w-6 h-6" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Recommendations & AI Tutor & Activity */}
        <div className="space-y-10">
          {/* Recent Activity */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Activity className="text-indigo-500" />
              Recent Activity
            </h2>
            <div className="space-y-4">
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <div key={session.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="font-bold text-sm text-white">{session.courseTitle}</div>
                      <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                        {Math.floor(session.durationSeconds / 60)}m {session.durationSeconds % 60}s
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(session.startTime).toLocaleDateString()}</span>
                      <span className="mx-1">•</span>
                      <span>{new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>-</span>
                      <span>{new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm italic">
                  No recent activity logged.
                </div>
              )}
            </div>
          </div>

          {recommendedCourses.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Recommended</h2>
                <Link to="/student/courses" className="text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-bold flex items-center gap-2">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="space-y-4">
                {recommendedCourses.map((course) => (
                  <motion.div
                    key={course.id}
                    whileHover={{ scale: 1.02 }}
                    className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden group flex flex-col"
                  >
                    <div className="aspect-video relative overflow-hidden">
                      <img src={course.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
                        <button
                          onClick={() => requestAccess(course)}
                          className="bg-white text-black px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2"
                        >
                          Request Access <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-5">
                      <h4 className="font-bold text-white mb-1 line-clamp-1">{course.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Activity className="w-3 h-3 text-indigo-400" />
                        AI Curated for your interests
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* AI Tutor Card */}
          <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-all" />
            <div className="relative z-10 space-y-5">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <Cpu className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white">Need Help?</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Your AI Tutor is ready to help you with any course material, coding challenges, or career advice.
              </p>
              <button
                onClick={() => navigate('/student/playground')}
                className="w-full py-4 bg-white text-black rounded-2xl font-bold text-sm hover:bg-indigo-50 transition-all active:scale-95 shadow-lg shadow-white/5"
              >
                Start AI Session
              </button>
            </div>
          </div>
        </div>
      </div>
      <div id="support" />
      <SupportSection />
    </div>
  );
};
