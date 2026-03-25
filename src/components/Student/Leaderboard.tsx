import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, Star } from 'lucide-react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { motion } from 'motion/react';

export const Leaderboard = () => {
    const [topStudents, setTopStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, 'users'),
            where('role', '==', 'student'),
            orderBy('skillPoints', 'desc'),
            limit(5)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const students = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTopStudents(students);
            setLoading(false);
        }, (error) => {
            console.error('Leaderboard error:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) return null;

    return (
        <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-neonBlue" />
                    Top Learners
                </h3>
                <div className="text-xs font-mono text-gray-500 uppercase tracking-widest">Global Ranking</div>
            </div>

            <div className="space-y-4">
                {topStudents.map((student, index) => (
                    <motion.div
                        key={student.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex items-center justify-between p-4 rounded-2xl border ${index === 0 ? 'bg-neonBlue/10 border-neonBlue/30' : 'bg-white/5 border-white/10'
                            }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-8 h-8 font-mono font-bold text-sm">
                                {index === 0 ? <Crown className="w-5 h-5 text-neonBlue" /> : index + 1}
                            </div>
                            <img
                                src={student.photoURL || `https://ui-avatars.com/api/?name=${student.displayName || 'User'}&background=4f46e5&color=fff`}
                                className="w-10 h-10 rounded-full border border-white/10"
                                alt={student.displayName}
                            />
                            <div>
                                <div className="font-bold text-white">{student.displayName || 'Anonymous'}</div>
                                <div className="text-xs text-gray-500 font-mono">Rank {index + 1}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-neonBlue font-bold font-mono">{student.skillPoints || 0}</div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-widest">Points</div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
