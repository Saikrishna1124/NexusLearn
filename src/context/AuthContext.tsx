import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { auth } from '../firebase';
import { signOut, User as FirebaseUser } from 'firebase/auth';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'student' | 'admin';
  photoURL: string;
  createdAt: string;
  skillPoints: number;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isStudent: boolean;
  token: string | null;
  logout: () => Promise<void>;
  loginWithFirebase: (firebaseUser: FirebaseUser) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('nexus_token'));
  const [loading, setLoading] = useState(true);

  // 🔥 Fetch profile ONLY from backend
  const fetchProfile = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/profile', {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      if (!res.ok) throw new Error("Invalid token");

      const data = await res.json();
      setProfile(data);
      return true;
    } catch (err) {
      console.log("Invalid token → clearing");
      localStorage.removeItem('nexus_token');
      setToken(null);
      setProfile(null);
      return false;
    }
  };

  // 🔥 On app load → validate token and restore Firebase session
  useEffect(() => {
    import('firebase/auth').then(({ onAuthStateChanged }) => {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser && token) {
          setUser(firebaseUser);
          const success = await fetchProfile(token);
          if (!success) {
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      return () => unsubscribe();
    });
  }, [token]);

  const loginWithFirebase = async (firebaseUser: FirebaseUser) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName
      })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${res.statusText}`);
    }

    const data = await res.json();

    localStorage.setItem('nexus_token', data.token);
    setToken(data.token);

    const profileFetched = await fetchProfile(data.token);
    if (!profileFetched) {
      throw new Error("Failed to fetch user profile after login");
    }

    // 🔥 SET USER ONLY AFTER EVERYTHING SUCCEEDS
    setUser(firebaseUser);
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem('nexus_token');
    setToken(null);
    setProfile(null);
    setUser(null);
  };

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    isStudent: profile?.role === 'student',
    token,
    logout,
    loginWithFirebase
  }), [user, profile, loading, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};