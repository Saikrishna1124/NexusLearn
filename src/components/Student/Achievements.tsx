import React from 'react';
import { Award, Zap, Book, Target, Shield, Flame } from 'lucide-react';
import { motion } from 'motion/react';

interface AchievementProps {
    enrolledCount: number;
    completedCount: number;
    quizResults: any[];
    skillPoints: number;
}

export const Achievements = ({ enrolledCount, completedCount, quizResults, skillPoints }: AchievementProps) => {
    const ACHIEVEMENTS = [
        {
            id: 'first_course',
            title: 'First Step',
            description: 'Enrolled in your first course.',
            icon: Zap,
            color: 'text-neonBlue',
            bg: 'bg-neonBlue/10',
            border: 'border-neonBlue/20',
            unlocked: enrolledCount > 0,
        },
        {
            id: 'quiz_master',
            title: 'Quiz Master',
            description: 'Scored 100% on a quiz.',
            icon: Award,
            color: 'text-neonGreen',
            bg: 'bg-neonGreen/10',
            border: 'border-neonGreen/20',
            unlocked: quizResults.some(r => r.score === 100),
        },
        {
            id: 'fast_learner',
            title: 'Fast Learner',
            description: 'Earned over 500 skill points.',
            icon: Flame,
            color: 'text-red-400',
            bg: 'bg-red-400/10',
            border: 'border-red-400/20',
            unlocked: skillPoints >= 500,
        },
        {
            id: 'knowledge_seeker',
            title: 'Knowledge Seeker',
            description: 'Enrolled in 3+ courses.',
            icon: Book,
            color: 'text-indigo-400',
            bg: 'bg-indigo-400/10',
            border: 'border-indigo-400/20',
            unlocked: enrolledCount >= 3,
        },
        {
            id: 'focused',
            title: 'Focused',
            description: 'Completed 2+ courses.',
            icon: Target,
            color: 'text-amber-400',
            bg: 'bg-amber-400/10',
            border: 'border-amber-400/20',
            unlocked: completedCount >= 2,
        },
        {
            id: 'secure',
            title: 'Rising Star',
            description: 'Earned over 1000 skill points.',
            icon: Shield,
            color: 'text-emerald-400',
            bg: 'bg-emerald-400/10',
            border: 'border-emerald-400/20',
            unlocked: skillPoints >= 1000,
        },
    ];

    return (
        <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold flex items-center gap-3">
                    <Award className="w-6 h-6 text-neonGreen" />
                    Achievements
                </h3>
                <div className="text-xs font-mono text-gray-500 uppercase tracking-widest">Your Milestones</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {ACHIEVEMENTS.map((achievement, index) => (
                    <motion.div
                        key={achievement.id}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-2xl border flex flex-col items-center text-center transition-all ${achievement.unlocked ? `${achievement.bg} ${achievement.border}` : 'bg-white/5 border-white/5 opacity-40 grayscale'
                            }`}
                    >
                        <div className={`p-3 rounded-xl mb-3 ${achievement.unlocked ? achievement.color : 'text-gray-500'}`}>
                            <achievement.icon className="w-6 h-6" />
                        </div>
                        <div className={`text-sm font-bold mb-1 ${achievement.unlocked ? 'text-white' : 'text-gray-500'}`}>
                            {achievement.title}
                        </div>
                        <div className="text-[10px] text-gray-500 leading-tight">
                            {achievement.description}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};
