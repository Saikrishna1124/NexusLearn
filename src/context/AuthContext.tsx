import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'student' | 'instructor' | 'admin';
  photoURL: string;
  createdAt: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isInstructor: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser);
        if (firebaseUser) {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          const isAdminEmail = firebaseUser.email === 'admin@gmail.com' || firebaseUser.email === 'saikrishnagummadidala34@gmail.com';
          const isStudentEmail = firebaseUser.email === 'student@gmail.com';

          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            // Force roles for specific emails
            let updatedRole = data.role;
            if (isAdminEmail) updatedRole = 'admin';
            else if (isStudentEmail) updatedRole = 'student';

            if (data.role !== updatedRole) {
              const updatedProfile = { ...data, role: updatedRole as any };
              await setDoc(doc(db, 'users', firebaseUser.uid), updatedProfile, { merge: true });
              setProfile(updatedProfile);
            } else {
              setProfile(data);
            }
          } else {
            // Initial profile creation
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || (isAdminEmail ? 'Admin' : 'Student'),
              role: isAdminEmail ? 'admin' : 'student',
              photoURL: firebaseUser.photoURL || '',
              createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setProfile(newProfile);
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    isInstructor: profile?.role === 'instructor',
    isStudent: profile?.role === 'student',
  }), [user, profile, loading]);

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
