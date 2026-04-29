import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser);
        if (firebaseUser) {
          // Listen for real-time profile updates
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
                console.warn("Could not save new profile to Firestore (possibly due to rules). Proceeding with local profile.");
              }
              setProfile(newProfile);
            }
            setLoading(false);
          }, (error) => {
            console.error("Profile listener error:", error);
            // Fallback for when Firestore rules deny read
            const isAdminEmail = firebaseUser.email === 'admin@gmail.com' ||
              firebaseUser.email === 'saikrishnagummadidala34@gmail.com' ||
              firebaseUser.email === '2303031460056@paruluniversity.ac.in';
            const fallbackProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || (isAdminEmail ? 'Admin' : 'Student'),
              role: isAdminEmail ? 'admin' : 'student',
              photoURL: firebaseUser.photoURL || '',
              createdAt: new Date().toISOString(),
              skillPoints: 0,
            };
            setProfile(fallbackProfile);
            setLoading(false);
          });
        } else {
          if (unsubscribeProfile) unsubscribeProfile();
          setProfile(null);
          setLoading(false);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setProfile(null);
        setLoading(false);
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
