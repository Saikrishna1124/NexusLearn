import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, doc, updateDoc, deleteDoc, orderBy, addDoc, getDocs, where, increment } from 'firebase/firestore';
import { db } from '../../firebase';
import { Check, X, Clock, User, BookOpen, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const CourseRequestManagement = () => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'course_requests'), orderBy('requestedAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, (error) => {
            console.error('Error fetching requests:', error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleStatusUpdate = async (requestId: string, status: 'approved' | 'rejected') => {
        try {
            const request = requests.find(r => r.id === requestId);
            if (!request) return;

            const requestRef = doc(db, 'course_requests', requestId);
            await updateDoc(requestRef, {
                status,
                updatedAt: new Date().toISOString()
            });

            if (status === 'approved') {
                // Create enrollment if it doesn't exist
                const qEnroll = query(
                    collection(db, 'enrollments'),
                    where('userId', '==', request.userId),
                    where('courseId', '==', request.courseId)
                );
                const enrollSnap = await getDocs(qEnroll);

                if (enrollSnap.empty) {
                    await addDoc(collection(db, 'enrollments'), {
                        userId: request.userId,
                        courseId: request.courseId,
                        enrolledAt: new Date().toISOString(),
                        progress: 0
                    });

                    // Increment enrollment count
                    const courseRef = doc(db, 'courses', request.courseId);
                    await updateDoc(courseRef, {
                        enrollmentCount: increment(1)
                    });
                }
            }
        } catch (error) {
            console.error(`Failed to ${status} request:`, error);
        }
    };

    const deleteRequest = async (requestId: string) => {
        if (!window.confirm('Are you sure you want to delete this request?')) return;
        try {
            await deleteDoc(doc(db, 'course_requests', requestId));
        } catch (error) {
            console.error('Failed to delete request:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-neonBlue" />
            </div>
        );
    }

    return (
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden" id="course-requests">
            <div className="p-8 border-b border-white/10 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Course Access Requests</h2>
                    <p className="text-gray-400 text-sm mt-1">Manage student requests to join courses.</p>
                </div>
                <div className="px-4 py-1 bg-neonBlue/10 text-neonBlue text-xs font-bold rounded-full border border-neonBlue/20">
                    {requests.filter(r => r.status === 'pending').length} Pending
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-gray-500 text-xs font-bold uppercase tracking-widest border-b border-white/5">
                            <th className="px-8 py-6">Student</th>
                            <th className="px-8 py-6">Course</th>
                            <th className="px-8 py-6">Status</th>
                            <th className="px-8 py-6">Requested</th>
                            <th className="px-8 py-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        <AnimatePresence mode="popLayout">
                            {requests.map((request) => (
                                <motion.tr
                                    key={request.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="group hover:bg-white/[0.02] transition-colors"
                                >
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                                <User className="w-5 h-5 text-gray-400" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-white">{request.userName}</div>
                                                <div className="text-xs text-gray-500">{request.userEmail}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="w-4 h-4 text-neonBlue" />
                                            <span className="font-medium text-gray-300">{request.courseTitle}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${request.status === 'approved' ? 'bg-neonGreen/10 text-neonGreen border-neonGreen/20' :
                                                request.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                    'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                            }`}>
                                            {request.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-gray-500 text-xs">
                                            <Clock className="w-3.5 h-3.5" />
                                            {new Date(request.requestedAt).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {request.status === 'pending' && (
                                                <>
                                                    <button
                                                        onClick={() => handleStatusUpdate(request.id, 'approved')}
                                                        className="p-2 bg-neonGreen/10 text-neonGreen border border-neonGreen/20 rounded-lg hover:bg-neonGreen hover:text-black transition-all"
                                                        title="Approve"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(request.id, 'rejected')}
                                                        className="p-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                                                        title="Reject"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => deleteRequest(request.id)}
                                                className="p-2 bg-white/5 text-gray-500 border border-white/10 rounded-lg hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all"
                                                title="Delete"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>

            {requests.length === 0 && (
                <div className="p-20 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-gray-600" />
                    </div>
                    <h3 className="text-xl font-bold text-white">No requests yet</h3>
                    <p className="text-gray-400 mt-2">When students request access to courses, they will appear here.</p>
                </div>
            )}
        </div>
    );
};
