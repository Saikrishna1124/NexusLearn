import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { Shield, Users, BookOpen, Activity, Globe } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { CourseManagement } from '../../components/admin/CourseManagement';
import { CourseRequestManagement } from '../../components/admin/CourseRequestManagement';

export const AdminDashboard = () => {
  const location = useLocation();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCourses: 0,
    totalEnrollments: 0
  });
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('AdminDashboard mounted, initializing listeners...');

    // Total Students listener
    const qStudents = query(collection(db, 'users'), where('role', '==', 'student'));
    const unsubscribeStudents = onSnapshot(qStudents, (snapshot) => {
      setStats(prev => ({ ...prev, totalStudents: snapshot.size }));

      const studentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sortedStudents = studentsData.sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setStudents(sortedStudents);
      setLoading(false);
    }, (err) => {
      console.error('Failed to fetch students:', err);
      setError(`Could not load students: ${err.message}`);
    });

    // Total Courses listener
    const qCourses = query(collection(db, 'courses'));
    const unsubscribeCourses = onSnapshot(qCourses, (snapshot) => {
      setStats(prev => ({ ...prev, totalCourses: snapshot.size }));
    });

    // Total Enrollments listener
    const qEnrollments = query(collection(db, 'enrollments'));
    const unsubscribeEnrollments = onSnapshot(qEnrollments, (snapshot) => {
      setStats(prev => ({ ...prev, totalEnrollments: snapshot.size }));
    });

    return () => {
      unsubscribeStudents();
      unsubscribeCourses();
      unsubscribeEnrollments();
    };
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-neonBlue border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(0,212,255,0.3)]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Platform Administration</h1>
          <p className="text-gray-400">Manage courses, monitor platform health, and view analytics.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-sm">
          <div className="text-xs font-mono text-neonBlue uppercase tracking-widest mb-4">Total Courses</div>
          <div className="flex items-end gap-3">
            <div className="text-5xl font-bold text-white">{stats?.totalCourses || 0}</div>
            <div className="text-neonGreen text-sm font-bold mb-2">+2 this week</div>
          </div>
        </div>
        <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-sm">
          <div className="text-xs font-mono text-neonBlue uppercase tracking-widest mb-4">Total Students</div>
          <div className="flex items-end gap-3">
            <div className="text-5xl font-bold text-white">{(stats?.totalStudents || 0).toLocaleString()}</div>
            <div className="text-neonGreen text-sm font-bold mb-2">+12%</div>
          </div>
        </div>
        <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-sm">
          <div className="text-xs font-mono text-neonBlue uppercase tracking-widest mb-4">System Status</div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-neonGreen animate-pulse shadow-[0_0_10px_#39ff14]" />
            <div className="text-2xl font-bold text-white uppercase tracking-tight">Optimal</div>
          </div>
        </div>
      </div>

      <CourseManagement />

      <CourseRequestManagement />

      <div className="grid lg:grid-cols-2 gap-8">
        {/* AI Usage Analytics - keeping as visual representation */}
        <div className="p-8 rounded-3xl bg-white/5 border border-white/10" id="registered-students">
          <h3 className="text-xl font-bold mb-6">Registered Students</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-500 text-sm border-b border-white/10">
                  <th className="pb-4 font-medium">Student</th>
                  <th className="pb-4 font-medium">Email</th>
                  <th className="pb-4 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {students.length > 0 ? (
                  students.map((student) => (
                    <tr key={student.id} className="border-b border-white/5 last:border-0">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={student.photoURL || `https://ui-avatars.com/api/?name=${student.displayName || 'User'}&background=4f46e5&color=fff`}
                            className="w-8 h-8 rounded-full border border-white/10"
                            alt={student.displayName}
                          />
                          <span className="font-medium">{student.displayName || 'Anonymous'}</span>
                        </div>
                      </td>
                      <td className="py-4 text-gray-400">{student.email}</td>
                      <td className="py-4 text-gray-400">
                        {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-500">
                      No students registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-white/5 border border-white/10">
          <h3 className="text-xl font-bold mb-6">AI Usage Analytics</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Tutor Queries</span>
                <span className="text-white">85% Capacity</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Quiz Generation</span>
                <span className="text-white">42% Capacity</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '42%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Summary Generation</span>
                <span className="text-white">68% Capacity</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '68%' }} />
              </div>
            </div>
          </div>

          <div className="mt-12 p-6 rounded-2xl bg-indigo-600/10 border border-indigo-600/20">
            <div className="flex items-center gap-4">
              <Shield className="w-6 h-6 text-indigo-400" />
              <div>
                <div className="font-bold">AI Governance</div>
                <div className="text-sm text-gray-400">0 flagged responses in the last 24h.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
