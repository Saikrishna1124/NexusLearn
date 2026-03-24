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
    HelpCircle,
    Plus,
    ArrowLeft,
    User,
    BookOpen
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

export const SupportSection = () => {
    const { user, profile } = useAuth();
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
            if (event.detail?.courseId) {
                setCourseContext({
                    id: event.detail.courseId,
                    title: event.detail.courseTitle || ''
                });
                setNewSubject(`Inquiry: ${event.detail.courseTitle || 'Course'}`);
                setView('new');
                // Scroll to support section
                const element = document.getElementById('support');
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            }
        };

        window.addEventListener('openSupportChat', handleOpenChat);
        return () => window.removeEventListener('openSupportChat', handleOpenChat);
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
                status: 'open'
            });
            setReplyText('');
        } catch (error) {
            console.error('Error sending reply:', error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="space-y-8" id="support">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold flex items-center gap-3">
                        <HelpCircle className="text-indigo-500" />
                        Support Center
                    </h2>
                    <p className="text-gray-400 mt-1">Get help with your courses and technical issues.</p>
                </div>
                {view !== 'new' && (
                    <button
                        onClick={() => setView('new')}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                    >
                        <Plus className="w-5 h-5" />
                        New Ticket
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[600px]">
                {/* Tickets List */}
                <div className="lg:col-span-1 space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                    {messages.length > 0 ? (
                        messages.map((msg) => (
                            <button
                                key={msg.id}
                                onClick={() => {
                                    setSelectedMessage(msg);
                                    setView('detail');
                                }}
                                className={`w-full text-left p-6 rounded-[2rem] border transition-all group relative overflow-hidden ${selectedMessage?.id === msg.id
                                        ? 'bg-indigo-600/10 border-indigo-500/30'
                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${msg.status === 'open' ? 'bg-amber-500/10 text-amber-500' :
                                            msg.status === 'replied' ? 'bg-indigo-500/10 text-indigo-500' :
                                                'bg-emerald-500/10 text-emerald-500'
                                        }`}>
                                        {msg.status}
                                    </span>
                                    <span className="text-[10px] text-gray-600 font-bold">{new Date(msg.createdAt).toLocaleDateString()}</span>
                                </div>
                                <h4 className="font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1 mb-2">{msg.subject}</h4>
                                <p className="text-sm text-gray-500 line-clamp-2">{msg.message}</p>
                                {msg.courseTitle && (
                                    <div className="mt-4 flex items-center gap-2 text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                                        <BookOpen className="w-3 h-3" />
                                        {msg.courseTitle}
                                    </div>
                                )}
                            </button>
                        ))
                    ) : (
                        <div className="text-center py-24 bg-white/5 border border-white/10 rounded-[2rem]">
                            <MessageSquare className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                            <p className="text-gray-500">No support tickets yet.</p>
                        </div>
                    )}
                </div>

                {/* Detail / New Form Area */}
                <div className="lg:col-span-2">
                    {view === 'new' ? (
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 h-full">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-bold">Create New Ticket</h3>
                                <button
                                    onClick={() => setView('list')}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X className="w-6 h-6 text-gray-500" />
                                </button>
                            </div>
                            <form onSubmit={handleSendMessage} className="space-y-6">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Subject</label>
                                    <input
                                        type="text"
                                        value={newSubject}
                                        onChange={(e) => setNewSubject(e.target.value)}
                                        placeholder="What do you need help with?"
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Detailed Description</label>
                                    <textarea
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Please provide as much detail as possible..."
                                        rows={8}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500 outline-none transition-all resize-none"
                                        required
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setView('list')}
                                        className="flex-1 py-4 rounded-2xl font-bold border border-white/10 hover:bg-white/5 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSending}
                                        className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                    >
                                        {isSending ? <Clock className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                        Submit Ticket
                                    </button>
                                </div>
                            </form>
                        </div>
                    ) : view === 'detail' && selectedMessage ? (
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col h-full">
                            {/* Detail Header */}
                            <div className="p-8 border-b border-white/10 bg-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center">
                                        <HelpCircle className="w-8 h-8 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold">{selectedMessage.subject}</h3>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${selectedMessage.status === 'open' ? 'bg-amber-500/10 text-amber-500' :
                                                    selectedMessage.status === 'replied' ? 'bg-indigo-500/10 text-indigo-500' :
                                                        'bg-emerald-500/10 text-emerald-500'
                                                }`}>
                                                {selectedMessage.status}
                                            </span>
                                            {selectedMessage.courseTitle && (
                                                <span className="text-xs text-indigo-400 font-medium flex items-center gap-1">
                                                    <BookOpen className="w-3 h-3" /> {selectedMessage.courseTitle}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setView('list')}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X className="w-6 h-6 text-gray-500" />
                                </button>
                            </div>

                            {/* Chat Content */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar max-h-[500px]">
                                {/* Original Message */}
                                <div className="flex gap-4 max-w-[85%]">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                                        <User className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-sm text-white">You</span>
                                            <span className="text-[10px] text-gray-600">{new Date(selectedMessage.createdAt).toLocaleString()}</span>
                                        </div>
                                        <div className="p-6 rounded-3xl rounded-tl-none bg-white/5 border border-white/10 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                                            {selectedMessage.message}
                                        </div>
                                    </div>
                                </div>

                                {/* Replies */}
                                {selectedMessage.replies?.map((reply, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex gap-4 max-w-[85%] ${reply.senderRole === 'admin' ? 'ml-auto flex-row-reverse' : ''}`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${reply.senderRole === 'admin' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-gray-400'
                                            }`}>
                                            {reply.senderRole === 'admin' ? <HelpCircle className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                        </div>
                                        <div className={`space-y-2 ${reply.senderRole === 'admin' ? 'text-right' : ''}`}>
                                            <div className={`flex items-center gap-3 ${reply.senderRole === 'admin' ? 'flex-row-reverse' : ''}`}>
                                                <span className="font-bold text-sm text-white">{reply.senderRole === 'admin' ? 'Admin Support' : 'You'}</span>
                                                <span className="text-[10px] text-gray-600">{new Date(reply.createdAt).toLocaleString()}</span>
                                            </div>
                                            <div className={`p-6 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap ${reply.senderRole === 'admin'
                                                    ? 'bg-indigo-600 text-white rounded-tr-none'
                                                    : 'bg-white/5 border border-white/10 text-gray-300 rounded-tl-none'
                                                }`}>
                                                {reply.message}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Reply Input */}
                            {selectedMessage.status !== 'closed' && (
                                <div className="p-8 bg-white/5 border-t border-white/10">
                                    <form onSubmit={handleSendReply} className="relative">
                                        <textarea
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            placeholder="Type your reply..."
                                            rows={3}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 pr-20 text-white focus:border-indigo-500 outline-none transition-all resize-none"
                                            required
                                        />
                                        <button
                                            type="submit"
                                            disabled={isSending || !replyText.trim()}
                                            className="absolute bottom-6 right-6 w-12 h-12 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center"
                                        >
                                            {isSending ? <Clock className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-[2.5rem] text-center p-12">
                            <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mb-8">
                                <MessageSquare className="w-12 h-12 text-gray-700" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4">Select a ticket to view</h3>
                            <p className="text-gray-500 max-w-sm">Choose a support ticket from the list to view the conversation and status updates.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
