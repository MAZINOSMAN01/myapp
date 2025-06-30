// src/context/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, DocumentData } from 'firebase/firestore'; // ** إضافة جديدة **
import { app, db } from '../firebase/config'; // ** تعديل: استيراد db أيضاً **

// تعريف شكل ملف المستخدم من Firestore
interface UserProfile {
  name: string;
  email: string;
  role: 'High Manager' | 'Engineer' | 'Technician'; // تحديد الأدوار الممكنة
  status: string;
}

// تعريف شكل الـ Context
interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null; // ** إضافة جديدة **
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // ** إضافة جديدة **
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      // ** هذا هو المنطق الجديد **
      if (user) {
        // إذا كان هناك مستخدم، اذهب إلى Firestore واجلب ملفه الشخصي
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile);
        } else {
          // في حالة عدم وجود ملف شخصي (قد تحدث في حالات نادرة)
          console.error("No user profile found in Firestore for UID:", user.uid);
          setUserProfile(null);
        }
      } else {
        // إذا قام المستخدم بتسجيل الخروج، قم بمسح بيانات الملف الشخصي
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile, // ** إضافة جديدة **
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}