import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Upload, CheckCircle, AlertCircle, ArrowLeft, Save, FileText, Image as ImageIcon } from 'lucide-react';
import GlassPanel from '../ui/GlassPanel';

interface InstructorCourseFormProps {
  courseId?: string;
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
  instructorId: string;
  instructorName: string;
}

export const InstructorCourseForm = ({ 
  courseId, 
  initialData, 
  onSuccess, 
  onCancel, 
  instructorId, 
  instructorName 
}: InstructorCourseFormProps) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [difficulty, setDifficulty] = useState(initialData?.level || 'Beginner');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setDifficulty(initialData.level || 'Beginner');
    }
  }, [initialData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setFile(selectedFile);
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setThumbnail(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('level', difficulty);
    formData.append('instructor', instructorName);
    formData.append('instructorId', instructorId);

    if (file) formData.append('pdf', file);
    if (thumbnail) formData.append('thumbnail', thumbnail);

    try {
      const url = courseId ? `/api/courses/${courseId}` : '/api/courses';
      const method = courseId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${courseId ? 'update' : 'create'} course`);
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      console.error('Form submission error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center p-12 text-center space-y-4"
      >
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h3 className="text-2xl font-bold text-white">Success!</h3>
        <p className="text-gray-400">Course has been {courseId ? 'updated' : 'created'} successfully.</p>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onCancel}
          className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-3xl font-bold">{courseId ? 'Edit Course' : 'Create New Course'}</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <GlassPanel className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-mono text-indigo-400 uppercase tracking-widest">Course Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-6 text-white focus:outline-none focus:border-indigo-500/50 text-lg"
                  placeholder="e.g. Master Class in Web Development"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-indigo-400 uppercase tracking-widest">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-4 px-6 text-white focus:outline-none focus:border-indigo-500/50 h-48 resize-none"
                  placeholder="What will students learn in this course?"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-indigo-400 uppercase tracking-widest">Difficulty Level</label>
                <div className="flex gap-4">
                  {['Beginner', 'Intermediate', 'Advanced'].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setDifficulty(level)}
                      className={`flex-1 py-4 rounded-xl border transition-all font-bold text-sm ${
                        difficulty === level
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400 shadow-[0_0_20px_rgba(79,70,229,0.1)]'
                          : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/30'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </GlassPanel>
          </div>

          <div className="space-y-6">
            <GlassPanel className="p-8 space-y-6">
              <div className="space-y-4">
                <label className="text-xs font-mono text-indigo-400 uppercase tracking-widest">Course Thumbnail</label>
                <div className="relative group">
                  <input
                    type="file"
                    id="thumbnail-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                  />
                  <label
                    htmlFor="thumbnail-upload"
                    className="aspect-video border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-indigo-500/50 cursor-pointer transition-all bg-black/20 overflow-hidden"
                  >
                    {thumbnail ? (
                      <img 
                        src={URL.createObjectURL(thumbnail)} 
                        className="w-full h-full object-cover" 
                        alt="Preview" 
                      />
                    ) : initialData?.thumbnailUrl ? (
                      <img 
                        src={initialData.thumbnailUrl} 
                        className="w-full h-full object-cover" 
                        alt="Current" 
                      />
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 text-gray-500 group-hover:text-indigo-400" />
                        <span className="text-xs font-bold text-gray-400">Upload Image</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-mono text-indigo-400 uppercase tracking-widest">Course Materials (PDF)</label>
                <input
                  type="file"
                  id="pdf-upload"
                  className="hidden"
                  accept=".pdf"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="pdf-upload"
                  className={`w-full p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                    file 
                      ? 'border-green-500/50 bg-green-500/5 text-green-400' 
                      : 'border-white/10 bg-black/20 hover:border-indigo-500/50 text-gray-400'
                  }`}
                >
                  <FileText className={`w-8 h-8 ${file ? 'text-green-400' : 'text-gray-500'}`} />
                  <span className="text-xs font-bold truncate max-w-full px-4">
                    {file ? file.name : 'Upload PDF Document'}
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-all shadow-[0_0_30px_rgba(79,70,229,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {isSubmitting ? 'Saving...' : courseId ? 'Update Course' : 'Create Course'}
              </button>
            </GlassPanel>
          </div>
        </div>
      </form>
    </div>
  );
};
