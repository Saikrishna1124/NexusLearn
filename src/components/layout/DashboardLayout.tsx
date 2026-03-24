import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Cpu,
  Bell,
  Search,
  ChevronRight,
  ArrowLeft,
  GraduationCap,
  Globe,
  Terminal,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { logout } from '../../firebase';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Starfield } from '../3d/Starfield';
import { AITutorWidget } from '../AITutorWidget';

const SidebarItem = ({ icon: Icon, label, active, to, onClick }: { icon: any, label: string, active?: boolean, to?: string, onClick?: () => void }) => {
  const content = (
    <>
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
      {active && <ChevronRight className="ml-auto w-4 h-4" />}
    </>
  );

  const className = `w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${active
      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
      : 'text-gray-400 hover:bg-white/5 hover:text-white'
    }`;

  if (to) {
    return (
      <Link to={to} onClick={onClick} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  );
};

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = profile?.role === 'admin'
    ? [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
      { icon: BookOpen, label: 'Manage Courses', path: '/admin/dashboard#manage-courses' },
      { icon: Bell, label: 'Course Requests', path: '/admin/dashboard#course-requests' },
      { icon: HelpCircle, label: 'Support Tickets', path: '/admin/dashboard#support-management' },
      { icon: GraduationCap, label: 'Student View', path: '/admin/dashboard#registered-students' },
    ]
    : [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/student/dashboard' },
      { icon: Globe, label: 'Community', path: '/student/community' },
      { icon: BookOpen, label: 'Browse Courses', path: '/student/courses' },
      { icon: HelpCircle, label: 'Support', path: '/student/dashboard#support' },
      { icon: GraduationCap, label: 'My Learning', path: '/student/dashboard#my-learning' },
      { icon: Terminal, label: 'Code Playground', path: '/student/playground' },
    ];

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0 }}
        className="bg-black/50 border-r border-white/10 backdrop-blur-xl overflow-hidden flex-shrink-0 relative z-50"
      >
        <div className="w-[280px] h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Cpu className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold">NexusLearn</span>
          </div>

          <div className="flex-1 space-y-2">
            {menuItems.map((item) => (
              <SidebarItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                to={item.path}
                active={location.pathname === item.path.split('#')[0] && (item.path.includes('#') ? location.hash === '#' + item.path.split('#')[1] : location.hash === '')}
                onClick={() => {
                  if (item.path.includes('#')) {
                    const hash = item.path.split('#')[1];
                    const element = document.getElementById(hash);
                    if (element) {
                      setTimeout(() => {
                        element.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    } else {
                      // If element is not found, navigate to the path first
                      navigate(item.path);
                      setTimeout(() => {
                        const newElement = document.getElementById(hash);
                        if (newElement) {
                          newElement.scrollIntoView({ behavior: 'smooth' });
                        }
                      }, 500);
                    }
                  }
                }}
              />
            ))}
          </div>

          <div className="pt-6 border-t border-white/10">
            <SidebarItem icon={LogOut} label="Logout" onClick={logout} />
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Background Animation */}
        <Starfield />

        {/* Header */}
        <header className="h-20 border-b border-white/10 flex items-center justify-between px-8 bg-black/20 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-400" />
            </button>
            <button
              onClick={() => {
                if (location.pathname.startsWith('/courses/')) {
                  navigate('/student/courses');
                } else if (location.pathname === '/student/courses') {
                  navigate('/student/dashboard');
                } else {
                  navigate(-1);
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 rounded-lg transition-colors text-gray-400 text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative p-2 hover:bg-white/5 rounded-lg transition-colors">
              <Bell className="w-6 h-6 text-gray-400" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-black" />
            </button>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold">{profile?.displayName || 'User'}</div>
                <div className="text-xs text-indigo-400 capitalize">{profile?.role}</div>
              </div>
              <img
                src={profile?.photoURL || `https://ui-avatars.com/api/?name=${profile?.displayName || 'User'}&background=4f46e5&color=fff`}
                className="w-10 h-10 rounded-xl border border-white/10"
                alt="Profile"
              />
              <button
                onClick={logout}
                className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded-lg transition-all"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10">
          {children}
        </div>

        {/* AI Tutor Floating Widget */}
        <AITutorWidget />
      </main>
    </div>
  );
};
