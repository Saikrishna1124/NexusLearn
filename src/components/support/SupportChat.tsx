import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    MessageSquare,
    Send,
    X,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    Clock,
    HelpCircle
} from 'lucide-react';
import { collection, addDoc, query, where, onSnapshot, orderBy, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

interface SupportMessage {
    id: string;
    subject: string;
    message: string;
    status: 'open' | 'replied' | 'closed';
    courseId?: string;
    courseTitle?: string;
    createdAt: string;
    updatedAt?: string;
    replies?: any[];
}

export const SupportChat = () => {
    const { user, profile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [selectedMessage, setSelectedMessage] = useState<SupportMessage | null>(null);
    const [newSubject, setNewSubject] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [view, setView] = useState<'list' | 'new' | 'detail'>('list');
    const [courseContext, setCourseContext] = useState<{ id: string, title: string } | null>(null);

    useEffect(() => {
        const handleOpenChat = (event: any) => {
            setIsOpen(true);
            if (event.detail?.courseId) {
                setCourseContext({
                    id: event.detail.courseId,
                    title: event.detail.courseTitle || ''
                });
                setNewSubject(`Inquiry: ${event.detail.courseTitle || 'Course'}`);
                setView('new');
            } else {
                setView('list');
            }
        };

        window.addEventListener('openSupportChat', handleOpenChat);

        const handleToggleChat = () => {
            setIsOpen(prev => !prev);
        };
        window.addEventListener('toggleSupportChat', handleToggleChat);

        return () => {
            window.removeEventListener('openSupportChat', handleOpenChat);
            window.removeEventListener('toggleSupportChat', handleToggleChat);
        };
    }, []);

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'support_messages'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupportMessage));
            setMessages(msgs);

            // Update selected message if it's currently open
            if (selectedMessage) {
                const updated = msgs.find(m => m.id === selectedMessage.id);
                if (updated) setSelectedMessage(updated);
            }
        });

        return () => unsubscribe();
    }, [user, selectedMessage?.id]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newSubject.trim() || !newMessage.trim()) return;

        setIsSending(true);
        try {
            await addDoc(collection(db, 'support_messages'), {
                userId: user.uid,
                userEmail: user.email,
                userName: profile?.displayName || 'Student',
                subject: newSubject,
                message: newMessage,
                courseId: courseContext?.id || null,
                courseTitle: courseContext?.title || null,
                status: 'open',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                replies: []
            });
            setNewSubject('');
            setNewMessage('');
            setCourseContext(null);
            setView('list');
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !selectedMessage || !replyText.trim()) return;

        setIsSending(true);
        try {
            const reply = {
                senderId: user.uid,
                senderRole: 'student',
                message: replyText,
                createdAt: new Date().toISOString()
            };

            await updateDoc(doc(db, 'support_messages', selectedMessage.id), {
                replies: arrayUnion(reply),
                updatedAt: new Date().toISOString(),
                status: 'open' // Re-open if it was replied/closed? Or just keep as is. Let's say 'open' to alert admin.
            });
            setReplyText('');
        } catch (error) {
            console.error('Error sending reply:', error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <>
            {/* Floating Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(true)}
                className="fixed bottom-8 right-28 w-16 h-16 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-600/40 flex items-center justify-center z-50 border border-white/10"
            >
                <MessageSquare className="w-8 h-8" />
                {messages.some(m => m.status === 'replied') && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-rose-500 rounded-full border-2 border-black animate-pulse" />
                )}
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.9 }}
                        className="fixed bottom-28 right-28 w-[400px] max-w-[calc(100vw-4rem)] h-[600px] max-h-[calc(100vh-10rem)] bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] shadow-2xl z-50 flex flex-col overflow-hidden backdrop-blur-xl"
                    >
                        {/* Header */}
                        <div className="p-6 bg-indigo-600 text-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                    <HelpCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold">Support Center</h3>
                                    <p className="text-xs text-indigo-200">We're here to help</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {view === 'list' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Your Tickets</h4>
                                        <button
                                            onClick={() => setView('new')}
                                            className="text-xs font-bold text-indigo-400 hover:text-indigo-300"
                                        >
                                            + New Ticket
                                        </button>
                                    </div>

                                    {messages.length > 0 ? (
                                        messages.map((msg) => (
                                            <button
                                                key={msg.id}
                                                onClick={() => {
                                                    setSelectedMessage(msg);
                                                    setView('detail');
                                                }}
                                                className="w-full text-left p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">{msg.subject}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${msg.status === 'open' ? 'bg-amber-500/10 text-amber-500' :
                                                            msg.status === 'replied' ? 'bg-indigo-500/10 text-indigo-500' :
                                                                'bg-emerald-500/10 text-emerald-500'
                                                        }`}>
                                                        {msg.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 line-clamp-1 mb-2">{msg.message}</p>
                                                <div className="flex items-center justify-between text-[10px] text-gray-600">
                                                    <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                                                    <ChevronRight className="w-3 h-3" />
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="text-center py-12">
                                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <MessageSquare className="w-8 h-8 text-gray-600" />
                                            </div>
                                            <p className="text-gray-500 text-sm">No support tickets yet.</p>
                                            <button
                                                onClick={() => setView('new')}
                                                className="mt-4 text-indigo-400 font-bold text-sm"
                                            >
                                                Create your first ticket
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {view === 'new' && (
                                <div className="space-y-6">
                                    <button
                                        onClick={() => setView('list')}
                                        className="text-xs font-bold text-gray-500 hover:text-white flex items-center gap-1"
                                    >
                                        <ChevronRight className="w-3 h-3 rotate-180" /> Back to list
                                    </button>
                                    <h4 className="text-xl font-bold">New Support Ticket</h4>
                                    <form onSubmit={handleSendMessage} className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Subject</label>
                                            <input
                                                type="text"
                                                value={newSubject}
                                                onChange={(e) => setNewSubject(e.target.value)}
                                                placeholder="e.g., Problem with Course Access"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-indigo-500 outline-none transition-all"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Message</label>
                                            <textarea
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                placeholder="Describe your issue in detail..."
                                                rows={6}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-indigo-500 outline-none transition-all resize-none"
                                                required
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isSending}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                        >
                                            {isSending ? <Clock className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                            Send Ticket
                                        </button>
                                    </form>
                                </div>
                            )}

                            {view === 'detail' && selectedMessage && (
                                <div className="space-y-6">
                                    <button
                                        onClick={() => setView('list')}
                                        className="text-xs font-bold text-gray-500 hover:text-white flex items-center gap-1"
                                    >
                                        <ChevronRight className="w-3 h-3 rotate-180" /> Back to list
                                    </button>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-start">
                                            <h4 className="text-xl font-bold">{selectedMessage.subject}</h4>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${selectedMessage.status === 'open' ? 'bg-amber-500/10 text-amber-500' :
                                                    selectedMessage.status === 'replied' ? 'bg-indigo-500/10 text-indigo-500' :
                                                        'bg-emerald-500/10 text-emerald-500'
                                                }`}>
                                                {selectedMessage.status}
                                            </span>
                                        </div>

                                        {/* Original Message */}
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                            <div className="flex justify-between text-[10px] text-gray-500 mb-2">
                                                <span className="font-bold">You</span>
                                                <span>{new Date(selectedMessage.createdAt).toLocaleString()}</span>
                                            </div>
                                            <p className="text-sm text-gray-300 whitespace-pre-wrap">{selectedMessage.message}</p>
                                        </div>

                                        {/* Replies */}
                                        <div className="space-y-4 pt-4 border-t border-white/5">
                                            {selectedMessage.replies?.map((reply, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`p-4 rounded-2xl border ${reply.senderRole === 'admin'
                                                            ? 'bg-indigo-600/10 border-indigo-500/20 ml-4'
                                                            : 'bg-white/5 border-white/10 mr-4'
                                                        }`}
                                                >
                                                    <div className="flex justify-between text-[10px] mb-2">
                                                        <span className={`font-bold ${reply.senderRole === 'admin' ? 'text-indigo-400' : 'text-gray-500'}`}>
                                                            {reply.senderRole === 'admin' ? 'Admin Support' : 'You'}
                                                        </span>
                                                        <span className="text-gray-600">{new Date(reply.createdAt).toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{reply.message}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Reply Input */}
                                        {selectedMessage.status !== 'closed' && (
                                            <form onSubmit={handleSendReply} className="pt-4">
                                                <div className="relative">
                                                    <textarea
                                                        value={replyText}
                                                        onChange={(e) => setReplyText(e.target.value)}
                                                        placeholder="Type your reply..."
                                                        rows={3}
                                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pr-12 text-sm text-white focus:border-indigo-500 outline-none transition-all resize-none"
                                                        required
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={isSending || !replyText.trim()}
                                                        className="absolute bottom-4 right-4 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
                                                    >
                                                        <Send className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-white/5 border-t border-white/10 text-center">
                            <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">Nexus AI Support System</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
