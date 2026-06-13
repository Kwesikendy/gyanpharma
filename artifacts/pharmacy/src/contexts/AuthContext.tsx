import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type UserRole = "admin" | "pharmacist";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Date | null;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  createUser: (email: string, password: string, displayName: string, role: UserRole) => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const profileDoc = await getDoc(doc(db, "users", user.uid));
        if (profileDoc.exists()) {
          const data = profileDoc.data();
          setUserProfile({
            uid: user.uid,
            email: user.email || "",
            displayName: data.displayName || user.email || "",
            role: data.role || "pharmacist",
            createdAt: data.createdAt?.toDate() || null,
          });
        } else {
          setUserProfile({
            uid: user.uid,
            email: user.email || "",
            displayName: user.email || "",
            role: "pharmacist",
            createdAt: null,
          });
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    await signOut(auth);
  }

  async function createUser(
    email: string,
    password: string,
    displayName: string,
    role: UserRole
  ) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", cred.user.uid), {
      email,
      displayName,
      role,
      createdAt: serverTimestamp(),
    });
  }

  const isAdmin = userProfile?.role === "admin";

  return (
    <AuthContext.Provider
      value={{ currentUser, userProfile, loading, login, logout, createUser, isAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
}
