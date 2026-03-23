import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, BookOpen, Users, ArrowRight, Loader2, Star, Clock, LayoutDashboard, LogOut, ChevronLeft } from 'lucide-react';
import { collection, onSnapshot, query, where, addDoc, getDocs } from 'firebase/firestore';
import { db, logout } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const CourseCatalog = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const q = isAdmin
      ? query(collection(db, 'courses'))
      : query(collection(db, 'courses'), where('published', '==', true));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedCourses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourses(fetchedCourses);
      setLoading(false);
    }, (error) => {
      console.error('Firestore onSnapshot error:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const enroll = async (courseId: string) => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'enrollments'),
        where('userId', '==', user.uid),
        where('courseId', '==', courseId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        navigate(`/courses/${courseId}`);
        return;
      }

      await addDoc(collection(db, 'enrollments'), {
        userId: user.uid,
        courseId,
        enrolledAt: new Date().toISOString(),
        progress: 0
      });
      navigate(`/courses/${courseId}`);
    } catch (error) {
      console.error('Enrollment failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const filteredCourses = courses.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-neonBlue" />
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {/* Header Section */}
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/student/dashboard')}
              className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-5xl font-bold tracking-tight">
                Explore <span className="text-neonBlue">Courses</span>
              </h1>
              <p className="text-gray-400 mt-2 text-lg">Discover your next learning adventure.</p>
              {profile?.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin/dashboard')}
                  className="mt-2 flex items-center gap-2 text-neonBlue hover:text-white transition-colors text-sm font-bold"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Admin Dashboard
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 bg-neonBlue/10 border border-neonBlue/20 text-neonBlue px-6 py-3 rounded-xl font-bold hover:bg-neonBlue/20 transition-all"
            >
              <LayoutDashboard className="w-5 h-5" />
              My Dashboard
            </button>

            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-neonBlue transition-colors" />
              <input
                type="text"
                placeholder="Search courses..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-64 bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-neonBlue focus:bg-white/10 outline-none transition-all"
              />
            </div>

            <button
              onClick={handleLogout}
              className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredCourses.map((course) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -8 }}
            className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden group flex flex-col hover:border-neonBlue/30 transition-all duration-500 shadow-2xl"
          >
            {/* Thumbnail Area */}
            <div className="aspect-[16/10] relative overflow-hidden m-4 rounded-[2rem]">
              <img
                src={course.thumbnailUrl || `https://picsum.photos/seed/${course.id}/800/500`}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                alt={course.title}
              />
              {/* Badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="px-3 py-1 bg-neonGreen text-black text-[10px] font-black uppercase tracking-tighter rounded-lg">
                  Free
                </span>
                <span className="px-3 py-1 bg-white/10 backdrop-blur-md text-neonBlue text-[10px] font-black uppercase tracking-tighter rounded-lg border border-white/10">
                  {course.level || 'Intermediate'}
                </span>
              </div>
            </div>

            {/* Content Area */}
            <div className="px-8 pb-8 pt-2 flex-1 flex flex-col">
              <div className="mb-4">
                <p className="text-gray-500 text-xs font-medium mb-1">{course.instructor || 'Nexus Instructor'}</p>
                <h3 className="text-2xl font-bold text-white leading-tight group-hover:text-neonBlue transition-colors">
                  {course.title}
                </h3>
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-6 mb-8 text-gray-400 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                  <span>{course.rating || '5'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>{course.enrollmentCount || 0} students</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{course.duration || '0h 0m'}</span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => enroll(course.id)}
                className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-white group-hover:bg-neonBlue group-hover:text-black group-hover:border-transparent transition-all duration-300"
              >
                View Course
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-32 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
          <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-gray-600" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">No matches found</h3>
          <p className="text-gray-400 max-w-xs mx-auto">We couldn't find any courses matching "{search}". Try a different keyword.</p>
        </div>
      )}
    </div>
  );
};
