import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Users, BookOpen, Activity, Globe } from 'lucide-react';
import { CourseManagement } from '../../components/admin/CourseManagement';
import { CourseRequestManagement } from '../../components/admin/CourseRequestManagement';

export const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCourses: 0,
    totalEnrollments: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('AdminDashboard mounted, fetching stats...');
    setLoading(true);
    fetch('/api/stats')
      .then(async res => {
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || errorData.details || 'Failed to fetch stats');
        }
        return res.json();
      })
      .then(data => {
        setStats(data);
        setError(null);
      })
      .catch(err => {
        console.error('Failed to fetch stats:', err);
        setError(`Could not load dashboard statistics: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, []);

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
        <div className="p-8 rounded-3xl bg-white/5 border border-white/10">
          <h3 className="text-xl font-bold mb-6">Recent User Registrations</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-500 text-sm border-b border-white/10">
                  <th className="pb-4 font-medium">User</th>
                  <th className="pb-4 font-medium">Role</th>
                  <th className="pb-4 font-medium">Status</th>
                  <th className="pb-4 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/20" />
                        <span className="font-medium">User {i}</span>
                      </div>
                    </td>
                    <td className="py-4 capitalize text-gray-400">Student</td>
                    <td className="py-4">
                      <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400 text-xs">Active</span>
                    </td>
                    <td className="py-4 text-gray-400">2h ago</td>
                  </tr>
                ))}
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
