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
    Filter,
    Search,
    User,
    BookOpen
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, updateDoc, doc, arrayUnion, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

interface SupportMessage {
    id: string;
    userId: string;
    userEmail: string;
    userName: string;
    subject: string;
    message: string;
    status: 'open' | 'replied' | 'closed';
    courseId?: string;
    courseTitle?: string;
    createdAt: string;
    updatedAt: string;
    replies?: any[];
}

export const SupportManagement = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [selectedMessage, setSelectedMessage] = useState<SupportMessage | null>(null);
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [filter, setFilter] = useState<'all' | 'open' | 'replied' | 'closed'>('all');
    const [search, setSearch] = useState('');

    useEffect(() => {
        const q = query(
            collection(db, 'support_messages'),
            orderBy('updatedAt', 'desc')
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
    }, [selectedMessage?.id]);

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !selectedMessage || !replyText.trim()) return;

        setIsSending(true);
        try {
            const reply = {
                senderId: user.uid,
                senderRole: 'admin',
                message: replyText,
                createdAt: new Date().toISOString()
            };

            await updateDoc(doc(db, 'support_messages', selectedMessage.id), {
                replies: arrayUnion(reply),
                updatedAt: new Date().toISOString(),
                status: 'replied'
            });
            setReplyText('');
        } catch (error) {
            console.error('Error sending reply:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleCloseTicket = async () => {
        if (!selectedMessage) return;
        try {
            await updateDoc(doc(db, 'support_messages', selectedMessage.id), {
                status: 'closed',
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error closing ticket:', error);
        }
    };

    const filteredMessages = messages.filter(m => {
        const matchesFilter = filter === 'all' || m.status === filter;
        const matchesSearch = m.subject.toLowerCase().includes(search.toLowerCase()) ||
            m.userName.toLowerCase().includes(search.toLowerCase()) ||
            m.userEmail.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="space-y-8" id="support-management">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold flex items-center gap-3">
                        <HelpCircle className="text-indigo-500" />
                        Support Management
                    </h2>
                    <p className="text-gray-400 mt-1">Manage student inquiries and provide assistance.</p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search tickets..."
                            className="bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:border-indigo-500 outline-none transition-all w-64"
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1">
                        {['all', 'open', 'replied', 'closed'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f as any)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filter === f ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-500 hover:text-white'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Tickets List */}
                <div className="lg:col-span-1 space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredMessages.length > 0 ? (
                        filteredMessages.map((msg) => (
                            <button
                                key={msg.id}
                                onClick={() => setSelectedMessage(msg)}
                                className={`w-full text-left p-6 rounded-[2rem] border transition-all group relative overflow-hidden ${selectedMessage?.id === msg.id
                                        ? 'bg-indigo-600/10 border-indigo-500/30'
                                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                {selectedMessage?.id === msg.id && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500" />
                                )}
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center">
                                            <User className="w-4 h-4 text-indigo-400" />
                                        </div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{msg.userName}</span>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${msg.status === 'open' ? 'bg-amber-500/10 text-amber-500' :
                                            msg.status === 'replied' ? 'bg-indigo-500/10 text-indigo-500' :
                                                'bg-emerald-500/10 text-emerald-500'
                                        }`}>
                                        {msg.status}
                                    </span>
                                </div>
                                <h4 className="font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1 mb-2">{msg.subject}</h4>
                                <p className="text-sm text-gray-500 line-clamp-2 mb-4">{msg.message}</p>
                                <div className="flex items-center justify-between text-[10px] text-gray-600">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(msg.updatedAt).toLocaleDateString()}
                                    </span>
                                    {msg.replies && msg.replies.length > 0 && (
                                        <span className="flex items-center gap-1">
                                            <MessageSquare className="w-3 h-3" />
                                            {msg.replies.length} replies
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="text-center py-24 bg-white/5 border border-white/10 rounded-[2rem]">
                            <MessageSquare className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                            <p className="text-gray-500">No tickets found.</p>
                        </div>
                    )}
                </div>

                {/* Ticket Detail */}
                <div className="lg:col-span-2">
                    {selectedMessage ? (
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden flex flex-col h-full min-h-[600px]">
                            {/* Detail Header */}
                            <div className="p-8 border-b border-white/10 bg-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center">
                                        <HelpCircle className="w-8 h-8 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold">{selectedMessage.subject}</h3>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className="text-sm text-gray-400 flex items-center gap-1">
                                                <User className="w-4 h-4" /> {selectedMessage.userName} ({selectedMessage.userEmail})
                                            </span>
                                            {selectedMessage.courseTitle && (
                                                <span className="text-sm text-indigo-400 flex items-center gap-1">
                                                    <BookOpen className="w-4 h-4" /> {selectedMessage.courseTitle}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {selectedMessage.status !== 'closed' && (
                                        <button
                                            onClick={handleCloseTicket}
                                            className="px-6 py-2 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-xl font-bold text-sm hover:bg-emerald-600 hover:text-white transition-all"
                                        >
                                            Close Ticket
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setSelectedMessage(null)}
                                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                                    >
                                        <X className="w-6 h-6 text-gray-500" />
                                    </button>
                                </div>
                            </div>

                            {/* Chat Content */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                {/* Original Message */}
                                <div className="flex gap-4 max-w-[80%]">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                                        <User className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-sm text-white">{selectedMessage.userName}</span>
                                            <span className="text-[10px] text-gray-600">{new Date(selectedMessage.createdAt).toLocaleString()}</span>
                                        </div>
                                        <div className="p-6 rounded-3xl rounded-tl-none bg-white/5 border border-white/10 text-gray-300 text-sm leading-relaxed whitespace-pre-wrap shadow-xl">
                                            {selectedMessage.message}
                                        </div>
                                    </div>
                                </div>

                                {/* Replies */}
                                {selectedMessage.replies?.map((reply, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex gap-4 max-w-[80%] ${reply.senderRole === 'admin' ? 'ml-auto flex-row-reverse' : ''}`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${reply.senderRole === 'admin' ? 'bg-indigo-600 text-white' : 'bg-white/10 text-gray-400'
                                            }`}>
                                            {reply.senderRole === 'admin' ? <HelpCircle className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                        </div>
                                        <div className={`space-y-2 ${reply.senderRole === 'admin' ? 'text-right' : ''}`}>
                                            <div className={`flex items-center gap-3 ${reply.senderRole === 'admin' ? 'flex-row-reverse' : ''}`}>
                                                <span className="font-bold text-sm text-white">{reply.senderRole === 'admin' ? 'Admin Support' : selectedMessage.userName}</span>
                                                <span className="text-[10px] text-gray-600">{new Date(reply.createdAt).toLocaleString()}</span>
                                            </div>
                                            <div className={`p-6 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap shadow-xl ${reply.senderRole === 'admin'
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
                            {selectedMessage.status !== 'closed' ? (
                                <div className="p-8 bg-white/5 border-t border-white/10">
                                    <form onSubmit={handleSendReply} className="relative">
                                        <textarea
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            placeholder="Type your reply to the student..."
                                            rows={4}
                                            className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-6 pr-20 text-white focus:border-indigo-500 outline-none transition-all resize-none shadow-inner"
                                            required
                                        />
                                        <button
                                            type="submit"
                                            disabled={isSending || !replyText.trim()}
                                            className="absolute bottom-6 right-6 w-12 h-12 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center shadow-lg shadow-indigo-600/40"
                                        >
                                            {isSending ? <Clock className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                                        </button>
                                    </form>
                                </div>
                            ) : (
                                <div className="p-8 bg-emerald-500/5 border-t border-emerald-500/10 text-center">
                                    <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold">
                                        <CheckCircle2 className="w-5 h-5" />
                                        This ticket has been resolved and closed.
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full min-h-[600px] flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-[2.5rem] text-center p-12">
                            <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mb-8">
                                <MessageSquare className="w-12 h-12 text-gray-700" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4">Select a ticket to view</h3>
                            <p className="text-gray-500 max-w-sm">Choose a support ticket from the list to view the conversation and provide assistance to the student.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
