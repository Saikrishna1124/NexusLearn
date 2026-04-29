import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

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
  setToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [token, setTokenState] = useState<string | null>(localStorage.getItem('nexus_token'));
  const [loading, setLoading] = useState(true);

  const setToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem('nexus_token', newToken);
    } else {
      localStorage.removeItem('nexus_token');
    }
    setTokenState(newToken);
  };

  const logout = async () => {
    await signOut(auth);
    setToken(null);
    setProfile(null);
    setUser(null);
  };

  const fetchProfile = async (authToken: string) => {
    try {
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        return true;
      } else if (response.status === 401) {
        // Token expired or invalid
        setToken(null);
        return false;
      }
      return false;
    } catch (error) {
      console.error("Error fetching profile from API:", error);
      return false;
    }
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      const storedToken = localStorage.getItem('nexus_token');
      
      if (firebaseUser) {
        // If we have a firebase user but no token, we might need to get one
        // If we have a token, we prioritize the backend profile
        if (storedToken) {
          const success = await fetchProfile(storedToken);
          if (success) {
            setLoading(false);
            return;
          }
        }

        // Fallback to Firestore listener if no token or API fetch failed
        unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), async (userDoc) => {
          const isAdminEmail = firebaseUser.email === 'admin@gmail.com' ||
            firebaseUser.email === 'saikrishnagummadidala34@gmail.com' ||
            firebaseUser.email === '2303031460056@paruluniversity.ac.in';
          const isStudentEmail = firebaseUser.email === 'student@gmail.com';

          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            let updatedRole = data.role;
            if (isAdminEmail) updatedRole = 'admin';
            else if (isStudentEmail) updatedRole = 'student';

            if (data.role !== updatedRole) {
              const updatedProfile = { ...data, role: updatedRole as any };
              try {
                await setDoc(doc(db, 'users', firebaseUser.uid), updatedProfile, { merge: true });
              } catch (e) {
                console.error("Failed to update user role:", e);
              }
              setProfile(updatedProfile);
            } else {
              setProfile(data);
            }
          } else {
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || (isAdminEmail ? 'Admin' : 'Student'),
              role: isAdminEmail ? 'admin' : 'student',
              photoURL: firebaseUser.photoURL || '',
              createdAt: new Date().toISOString(),
              skillPoints: 0,
            };
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            } catch (e) {
              console.warn("Could not save profile to Firestore.");
            }
            setProfile(newProfile);
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile listener error:", error);
          setLoading(false);
        });
      } else {
        if (unsubscribeProfile) unsubscribeProfile();
        if (!storedToken) {
           setProfile(null);
           setLoading(false);
        } else {
           // We have a token but no firebase user (could happen if firebase session expired but JWT is alive)
           const success = await fetchProfile(storedToken);
           if (!success) setProfile(null);
           setLoading(false);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    isStudent: profile?.role === 'student',
    token,
    logout,
    setToken
  }), [user, profile, loading, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new AuthContextError('useAuth must be used within an AuthProvider');
  }
  return context;
};

class AuthContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthContextError';
  }
}
