import React from 'react';
import { motion } from 'motion/react';
import { Starfield } from '../components/3d/Starfield';
import { BookOpen, Cpu, Globe, Shield, Zap, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { profile, loading } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Cpu className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-400">
              NexusLearn
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-4">
            {!loading && profile ? (
              <Link to="/dashboard" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full font-medium transition-all">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-white hover:text-indigo-400 transition-colors">Login</Link>
                <Link to="/signup" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full font-medium transition-all">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

const FeatureCard = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <motion.div 
    whileHover={{ y: -10 }}
    className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all"
  >
    <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center mb-6">
      <Icon className="text-indigo-400 w-6 h-6" />
    </div>
    <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
    <p className="text-gray-400 leading-relaxed">{description}</p>
  </motion.div>
);

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#050505] text-white relative">
      <Starfield />
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="lg:col-span-2 text-center max-w-4xl mx-auto"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600/10 border border-indigo-600/20 text-indigo-400 text-sm font-medium mb-8">
                <Zap className="w-4 h-4" />
                <span>Next-Gen AI Learning Platform</span>
              </div>
              <h1 className="text-6xl lg:text-8xl font-bold tracking-tight mb-8 leading-[1.1]">
                Master the Future with <span className="text-indigo-500">AI-Powered</span> Education.
              </h1>
              <p className="text-xl text-gray-400 mb-10 leading-relaxed max-w-2xl mx-auto">
                NexusLearn combines cutting-edge AI tutoring with immersive 3D experiences to deliver the most effective learning journey ever created.
              </p>
              <div className="flex justify-center gap-6">
                <Link to="/signup" className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-full font-bold text-xl flex items-center gap-2 transition-all group shadow-lg shadow-indigo-600/20">
                  Start Learning Now
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
              className="relative hidden lg:block h-[600px]"
            >
              {/* Starfield is already in the background, so we don't need Hero3D here */}
            </motion.div>
          </div>
        </div>
        
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/20 blur-[120px] rounded-full -z-10" />
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">Why Choose NexusLearn?</h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              We've reimagined education from the ground up using the latest advancements in artificial intelligence.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <FeatureCard 
              icon={Zap}
              title="Adaptive Learning"
              description="The platform adjusts to your pace, identifying knowledge gaps and suggesting targeted study plans."
            />
            <FeatureCard 
              icon={Shield}
              title="Verified Mastery"
              description="Earn blockchain-verified certificates that prove your skills to top employers worldwide."
            />
          </div>
        </div>
      </section>


      {/* Stats Section */}
      <section className="py-20 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
            <div>
              <div className="text-4xl font-bold text-indigo-400 mb-2">50k+</div>
              <div className="text-gray-500 uppercase tracking-widest text-xs font-bold">Students</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-indigo-400 mb-2">200+</div>
              <div className="text-gray-500 uppercase tracking-widest text-xs font-bold">Courses</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-indigo-400 mb-2">98%</div>
              <div className="text-gray-500 uppercase tracking-widest text-xs font-bold">Success Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-indigo-400 mb-2">24/7</div>
              <div className="text-gray-500 uppercase tracking-widest text-xs font-bold">AI Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <Cpu className="text-indigo-500 w-6 h-6" />
              <span className="text-xl font-bold">NexusLearn</span>
            </div>
            <div className="flex gap-8 text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
            <div className="text-gray-500 text-sm">
              © 2026 NexusLearn AI. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
