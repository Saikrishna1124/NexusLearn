import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StickyNote, Save, Loader2, CheckCircle, Trash2, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';

interface CourseNotesProps {
    courseId: string;
}

export const CourseNotes: React.FC<CourseNotesProps> = ({ courseId }) => {
    const { user } = useAuth();
    const [note, setNote] = useState<string>('');
    const [noteId, setNoteId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user || !courseId) return;

        const q = query(
            collection(db, 'course_notes'),
            where('userId', '==', user.uid),
            where('courseId', '==', courseId)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const noteDoc = snapshot.docs[0];
                setNoteId(noteDoc.id);
                setNote(noteDoc.data().content || '');
                if (noteDoc.data().updatedAt) {
                    setLastSaved(noteDoc.data().updatedAt.toDate());
                }
            }
            setLoading(false);
        }, (err) => {
            console.error('Error fetching notes:', err);
            setError('Failed to load notes');
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, courseId]);

    const saveNote = useCallback(async () => {
        if (!user || !courseId) return;
        setSaving(true);
        setError(null);

        try {
            if (noteId) {
                await updateDoc(doc(db, 'course_notes', noteId), {
                    content: note,
                    updatedAt: serverTimestamp()
                });
            } else {
                const docRef = await addDoc(collection(db, 'course_notes'), {
                    userId: user.uid,
                    courseId,
                    content: note,
                    updatedAt: serverTimestamp()
                });
                setNoteId(docRef.id);
            }
            setLastSaved(new Date());
        } catch (err) {
            console.error('Error saving note:', err);
            setError('Failed to save note');
        } finally {
            setSaving(false);
        }
    }, [user, courseId, note, noteId]);

    // Auto-save logic with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (note && !loading) {
                saveNote();
            }
        }, 2000); // Auto-save after 2 seconds of inactivity

        return () => clearTimeout(timer);
    }, [note, saveNote, loading]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8 bg-white/5 rounded-[2rem] border border-white/10">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-sm space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold flex items-center gap-3">
                    <StickyNote className="w-6 h-6 text-indigo-400" />
                    Course Notepad
                </h3>
                <div className="flex items-center gap-4">
                    {lastSaved && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                            Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                    <button
                        onClick={saveNote}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Notes
                    </button>
                </div>
            </div>

            <div className="relative">
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Start taking notes for this course..."
                    className="w-full h-64 bg-black/20 border border-white/10 rounded-2xl p-6 text-gray-300 focus:outline-none focus:border-indigo-500/50 transition-all resize-none font-sans leading-relaxed"
                />
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/20 rounded-l-2xl" />
            </div>

            {error && (
                <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-400/10 p-3 rounded-xl border border-rose-400/20">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            <p className="text-xs text-gray-500 italic">
                Tip: Your notes are private and specific to this course. Use them to keep track of key concepts, timestamps, or questions.
            </p>
        </div>
    );
};
