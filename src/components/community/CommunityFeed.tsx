import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    MessageSquare,
    Send,
    Image as ImageIcon,
    Link as LinkIcon,
    Video,
    MoreVertical,
    Heart,
    Share2,
    Plus,
    X,
    Clock,
    User,
    Globe,
    Camera,
    Trash2
} from 'lucide-react';
import { collection, addDoc, query, onSnapshot, orderBy, doc, updateDoc, deleteDoc, increment, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';

interface SocialPost {
    id: string;
    userId: string;
    userName: string;
    userPhoto: string;
    title: string;
    text: string;
    imageUrl?: string;
    videoUrl?: string;
    description?: string;
    createdAt: string;
    likes: number;
}

interface SocialReply {
    id: string;
    postId: string;
    userId: string;
    userName: string;
    userPhoto: string;
    text: string;
    createdAt: string;
}

export const CommunityFeed = () => {
    const { user, profile } = useAuth();
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [isPosting, setIsPosting] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // New Post State
    const [newTitle, setNewTitle] = useState('');
    const [newText, setNewText] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newVideoUrl, setNewVideoUrl] = useState('');
    const [newImageBase64, setNewImageBase64] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const q = query(collection(db, 'social_posts'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialPost)));
        });
        return () => unsubscribe();
    }, []);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewImageBase64(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newTitle.trim()) return;

        setIsPosting(true);
        try {
            await addDoc(collection(db, 'social_posts'), {
                userId: user.uid,
                userName: profile?.displayName || 'Student',
                userPhoto: profile?.photoURL || '',
                title: newTitle,
                text: newText,
                description: newDescription,
                videoUrl: newVideoUrl,
                imageUrl: newImageBase64,
                likes: 0,
                createdAt: new Date().toISOString()
            });

            // Reset form
            setNewTitle('');
            setNewText('');
            setNewDescription('');
            setNewVideoUrl('');
            setNewImageBase64(null);
            setShowCreateModal(false);
        } catch (error) {
            console.error('Error creating post:', error);
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold flex items-center gap-3">
                        <Globe className="text-indigo-500" />
                        Student Community
                    </h2>
                    <p className="text-gray-400 mt-1">Share insights, ask questions, and connect with peers.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                >
                    <Plus className="w-5 h-5" />
                    Create Post
                </button>
            </div>

            {/* Posts List */}
            <div className="space-y-6">
                {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                ))}
                {posts.length === 0 && (
                    <div className="text-center py-24 bg-white/5 border border-white/10 rounded-[2.5rem]">
                        <MessageSquare className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">No posts yet</h3>
                        <p className="text-gray-500">Be the first to share something with the community!</p>
                    </div>
                )}
            </div>

            {/* Create Post Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowCreateModal(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
                                <h3 className="text-2xl font-bold">Create Community Post</h3>
                                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                    <X className="w-6 h-6 text-gray-500" />
                                </button>
                            </div>

                            <form onSubmit={handleCreatePost} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-widest">Title</label>
                                        <input
                                            type="text"
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                            placeholder="Give your post a catchy title"
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500 outline-none transition-all"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-widest">Text Content</label>
                                        <textarea
                                            value={newText}
                                            onChange={(e) => setNewText(e.target.value)}
                                            placeholder="What's on your mind?"
                                            rows={4}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500 outline-none transition-all resize-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-widest">Video URL (Optional)</label>
                                            <div className="relative">
                                                <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                <input
                                                    type="url"
                                                    value={newVideoUrl}
                                                    onChange={(e) => setNewVideoUrl(e.target.value)}
                                                    placeholder="YouTube/Vimeo link"
                                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:border-indigo-500 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-widest">Photo (Optional)</label>
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-gray-400 hover:text-white hover:border-indigo-500 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Camera className="w-5 h-5" />
                                                {newImageBase64 ? 'Change Photo' : 'Upload Photo'}
                                            </button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleImageUpload}
                                                accept="image/*"
                                                className="hidden"
                                            />
                                        </div>
                                    </div>

                                    {newImageBase64 && (
                                        <div className="relative rounded-2xl overflow-hidden border border-white/10 aspect-video">
                                            <img src={newImageBase64} alt="Preview" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => setNewImageBase64(null)}
                                                className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white transition-all"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-widest">Description</label>
                                        <textarea
                                            value={newDescription}
                                            onChange={(e) => setNewDescription(e.target.value)}
                                            placeholder="Add a detailed description or context..."
                                            rows={3}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-indigo-500 outline-none transition-all resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 py-4 rounded-2xl font-bold border border-white/10 hover:bg-white/5 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isPosting || !newTitle.trim()}
                                        className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/20"
                                    >
                                        {isPosting ? <Clock className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                        Publish Post
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const PostCard = ({ post }: { post: SocialPost }) => {
    const { user, profile } = useAuth();
    const [replies, setReplies] = useState<SocialReply[]>([]);
    const [showReplies, setShowReplies] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [isLiked, setIsLiked] = useState(false);

    useEffect(() => {
        const q = query(
            collection(db, 'social_replies'),
            where('postId', '==', post.id),
            orderBy('createdAt', 'asc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setReplies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialReply)));
        });
        return () => unsubscribe();
    }, [post.id]);

    const handleLike = async () => {
        try {
            await updateDoc(doc(db, 'social_posts', post.id), {
                likes: increment(isLiked ? -1 : 1)
            });
            setIsLiked(!isLiked);
        } catch (error) {
            console.error('Error liking post:', error);
        }
    };

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !replyText.trim()) return;

        setIsReplying(true);
        try {
            await addDoc(collection(db, 'social_replies'), {
                postId: post.id,
                userId: user.uid,
                userName: profile?.displayName || 'Student',
                userPhoto: profile?.photoURL || '',
                text: replyText,
                createdAt: new Date().toISOString()
            });
            setReplyText('');
        } catch (error) {
            console.error('Error sending reply:', error);
        } finally {
            setIsReplying(false);
        }
    };

    const handleDeletePost = async () => {
        if (!window.confirm('Are you sure you want to delete this post?')) return;
        try {
            await deleteDoc(doc(db, 'social_posts', post.id));
        } catch (error) {
            console.error('Error deleting post:', error);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-sm"
        >
            {/* Post Header */}
            <div className="p-6 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-4">
                    <img
                        src={post.userPhoto || `https://ui-avatars.com/api/?name=${post.userName}&background=4f46e5&color=fff`}
                        className="w-10 h-10 rounded-xl border border-white/10"
                        alt={post.userName}
                    />
                    <div>
                        <div className="font-bold text-white">{post.userName}</div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1 uppercase tracking-widest font-bold">
                            <Clock className="w-3 h-3" />
                            {new Date(post.createdAt).toLocaleString()}
                        </div>
                    </div>
                </div>
                {user?.uid === post.userId && (
                    <button onClick={handleDeletePost} className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-lg transition-all">
                        <Trash2 className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Post Content */}
            <div className="p-8 space-y-6">
                <div>
                    <h3 className="text-2xl font-bold text-white mb-4">{post.title}</h3>
                    {post.text && <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{post.text}</p>}
                </div>

                {post.imageUrl && (
                    <div className="rounded-3xl overflow-hidden border border-white/10 bg-black/20">
                        <img src={post.imageUrl} alt="Post content" className="w-full h-auto max-h-[500px] object-contain mx-auto" />
                    </div>
                )}

                {post.videoUrl && (
                    <div className="rounded-3xl overflow-hidden border border-white/10 bg-black/20 aspect-video">
                        <iframe
                            src={post.videoUrl.replace('watch?v=', 'embed/')}
                            className="w-full h-full"
                            allowFullScreen
                        />
                    </div>
                )}

                {post.description && (
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/10 italic text-sm text-gray-400">
                        {post.description}
                    </div>
                )}
            </div>

            {/* Post Actions */}
            <div className="px-8 py-4 border-t border-white/5 flex items-center gap-6">
                <button
                    onClick={handleLike}
                    className={`flex items-center gap-2 transition-all ${isLiked ? 'text-rose-500' : 'text-gray-500 hover:text-rose-400'}`}
                >
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                    <span className="text-sm font-bold">{post.likes || 0}</span>
                </button>
                <button
                    onClick={() => setShowReplies(!showReplies)}
                    className={`flex items-center gap-2 transition-all ${showReplies ? 'text-indigo-400' : 'text-gray-500 hover:text-indigo-400'}`}
                >
                    <MessageSquare className="w-5 h-5" />
                    <span className="text-sm font-bold">{replies.length}</span>
                </button>
                <button className="flex items-center gap-2 text-gray-500 hover:text-white transition-all ml-auto">
                    <Share2 className="w-5 h-5" />
                </button>
            </div>

            {/* Replies Section */}
            <AnimatePresence>
                {showReplies && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-black/20"
                    >
                        <div className="p-8 space-y-6 border-t border-white/5">
                            {/* Reply List */}
                            <div className="space-y-6">
                                {replies.map((reply) => (
                                    <div key={reply.id} className="flex gap-4">
                                        <img
                                            src={reply.userPhoto || `https://ui-avatars.com/api/?name=${reply.userName}&background=4f46e5&color=fff`}
                                            className="w-8 h-8 rounded-lg border border-white/10 flex-shrink-0"
                                            alt={reply.userName}
                                        />
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-sm text-white">{reply.userName}</span>
                                                <span className="text-[10px] text-gray-600">{new Date(reply.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-sm text-gray-400 leading-relaxed">{reply.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Reply Input */}
                            <form onSubmit={handleSendReply} className="flex gap-4 pt-4 border-t border-white/5">
                                <img
                                    src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'User'}&background=4f46e5&color=fff`}
                                    className="w-8 h-8 rounded-lg border border-white/10 flex-shrink-0"
                                    alt="Your profile"
                                />
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Write a reply..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-all pr-10"
                                        required
                                    />
                                    <button
                                        type="submit"
                                        disabled={isReplying || !replyText.trim()}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-500 hover:text-indigo-400 transition-all disabled:opacity-50"
                                    >
                                        {isReplying ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
