import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Play, ArrowRight, GraduationCap, Search, ArrowLeft } from 'lucide-react';
import { collection, onSnapshot, query, where, getDocs, doc, getDoc, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';

export const StudentDashboard = () => {
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [recommendedCourses, setRecommendedCourses] = useState<any[]>([]);
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

    // Fetch approved course requests
    const qReq = query(
      collection(db, 'course_requests'),
      where('userId', '==', user.uid),
      where('status', '==', 'approved')
    );

    const unsubscribeReq = onSnapshot(qReq, async (snapshot) => {
      const approvedIds = snapshot.docs.map(d => d.data().courseId);

      const coursesData = await Promise.all(
        snapshot.docs.map(async (requestDoc) => {
          const request = requestDoc.data();
          const courseDoc = await getDoc(doc(db, 'courses', request.courseId));
          if (!courseDoc.exists()) return null;

          // Try to find enrollment for progress
          const qEnroll = query(
            collection(db, 'enrollments'),
            where('userId', '==', user.uid),
            where('courseId', '==', request.courseId)
          );
          const enrollSnap = await getDocs(qEnroll);
          const enrollment = !enrollSnap.empty ? enrollSnap.docs[0].data() : { progress: 0 };

          return {
            id: courseDoc.id,
            ...courseDoc.data(),
            progress: enrollment.progress,
            enrolledAt: request.requestedAt
          };
        })
      );
      setEnrolledCourses(coursesData.filter(Boolean));
      setLoading(false);

      // Fetch recommended (not requested/approved) courses
      const qCourses = query(collection(db, 'courses'), where('published', '==', true));
      const coursesSnap = await getDocs(qCourses);
      const allCourses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Fetch all user requests to filter out
      const qAllReq = query(collection(db, 'course_requests'), where('userId', '==', user.uid));
      const allReqSnap = await getDocs(qAllReq);
      const requestedIds = allReqSnap.docs.map(d => d.data().courseId);

      setRecommendedCourses(allCourses.filter(c => !requestedIds.includes(c.id)).slice(0, 3));
    });

    return () => unsubscribeReq();
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
      // Redirect to catalog to see pending status
      navigate('/student/courses');
    } catch (error) {
      console.error('Request failed:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Welcome back, Explorer!</h1>
          <p className="text-gray-400 text-lg">Ready to continue your journey into the future of tech?</p>
          {profile?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="mt-4 flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Admin Dashboard
            </button>
          )}
        </div>
        <Link
          to="/student/courses"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all shadow-lg shadow-indigo-600/20"
        >
          <Search className="w-6 h-6" />
          Browse All Courses
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8" id="my-learning">
        {enrolledCourses.length > 0 ? (
          enrolledCourses.map((course) => (
            <motion.div
              key={course.id}
              whileHover={{ y: -5 }}
              onClick={() => navigate(`/courses/${course.id}`)}
              className="p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-sm group cursor-pointer"
            >
              <div className="flex gap-6">
                <div className="w-32 h-32 rounded-3xl bg-indigo-600/20 overflow-hidden flex-shrink-0">
                  <img
                    src={course.thumbnailUrl}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    alt={course.title}
                  />
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="text-2xl font-bold text-white mb-2">{course.title}</h3>
                  <div className="text-gray-400 mb-4 line-clamp-1 text-sm">{course.description}</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-indigo-400 font-medium">{course.progress || 0}% Complete</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                        style={{ width: `${course.progress || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : !loading && (
          <div className="col-span-full py-24 text-center bg-white/5 border border-white/10 rounded-[3rem] backdrop-blur-xl relative overflow-hidden group">
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

      {recommendedCourses.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Recommended for You</h2>
            <Link to="/student/courses" className="text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-bold flex items-center gap-2">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendedCourses.map((course) => (
              <motion.div
                key={course.id}
                whileHover={{ y: -5 }}
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
                <div className="p-6">
                  <h4 className="font-bold text-white mb-2 line-clamp-1">{course.title}</h4>
                  <p className="text-gray-400 text-xs line-clamp-2">{course.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
