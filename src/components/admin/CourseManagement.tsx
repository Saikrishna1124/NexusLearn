import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Eye, EyeOff, BookOpen, CheckCircle2, Edit2 } from 'lucide-react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../../firebase';
import AddCourseModal from '../modals/AddCourseModal';

export const CourseManagement = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, number>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Initializing CourseManagement listener...');
    const q = query(collection(db, 'courses'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`Fetched ${snapshot.docs.length} courses from Firestore`);
      setCourses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error('Firestore onSnapshot error in CourseManagement:', error);
      setError(`Database error: ${error.message}. Please check your connection.`);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'enrollments'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const counts: Record<string, number> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.courseId) {
          counts[data.courseId] = (counts[data.courseId] || 0) + 1;
        }
      });
      setEnrollmentCounts(counts);
    }, (error) => {
      console.error('Firestore onSnapshot error for enrollments in CourseManagement:', error);
    });
    return () => unsubscribe();
  }, []);

  const togglePublish = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`/api/courses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !currentStatus })
      });
    } catch (error) {
      console.error('Failed to toggle publish:', error);
    }
  };

  const deleteCourse = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    try {
      await fetch(`/api/courses/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to delete course:', error);
    }
  };

  const handleEdit = (course: any) => {
    setEditingCourse(course);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingCourse(null);
  };

  return (
    <div className="space-y-6" id="manage-courses">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Manage Courses</h3>
          <p className="text-sm text-gray-400">Add, edit, or remove courses from the platform.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-neonBlue text-black px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 shadow-[0_0_20px_rgba(0,212,255,0.2)]"
        >
          <Plus className="w-5 h-5" />
          Add New Course
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden backdrop-blur-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs font-mono text-neonBlue uppercase tracking-widest border-b border-white/10">
              <th className="p-6 font-medium">Course Title</th>
              <th className="p-6 font-medium">Students</th>
              <th className="p-6 font-medium">Status</th>
              <th className="p-6 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {courses.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-12 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <BookOpen className="w-8 h-8 opacity-20" />
                    <p>No courses added yet.</p>
                  </div>
                </td>
              </tr>
            ) : (
              courses.map((course) => (
                <tr key={course.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-neonBlue/10 overflow-hidden border border-white/10">
                        <img src={course.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-lg">{course.title}</div>
                        <div className="text-xs text-gray-500 font-mono">{course.level || 'Beginner'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="text-white font-bold">{enrollmentCounts[course.id] || 0}</div>
                  </td>
                  <td className="p-6">
                    {course.published ? (
                      <div className="flex items-center gap-2 text-neonGreen font-bold text-xs uppercase tracking-wider">
                        <div className="w-1.5 h-1.5 rounded-full bg-neonGreen shadow-[0_0_5px_#39ff14]" />
                        Active
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-500 font-bold text-xs uppercase tracking-wider">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                        Draft
                      </div>
                    )}
                  </td>
                  <td className="p-6">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => togglePublish(course.id, course.published)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-neonBlue"
                        title={course.published ? 'Unpublish' : 'Publish'}
                      >
                        {course.published ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => handleEdit(course)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                        title="Edit"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteCourse(course.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-gray-400 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showAddModal && (
          <AddCourseModal
            onClose={handleCloseModal}
            editingCourse={editingCourse}
            onAdd={(newCourse) => {
              // Course will be updated via onSnapshot
              handleCloseModal();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
