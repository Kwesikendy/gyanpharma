import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  User,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type UserRole = "admin" | "pharmacist" | "sales";

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
  const profileUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);

      // Clean up any previous profile listener
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }

      if (user) {
        // Safety timeout: if Firestore hasn't returned after 5s (e.g. first-ever load
        // with no cache), stop the spinner and use a minimal profile so the app stays accessible.
        const fallbackTimer = setTimeout(() => {
          setUserProfile((prev) =>
            prev
              ? prev
              : {
                  uid: user.uid,
                  email: user.email || "",
                  displayName: user.displayName || user.email || "",
                  role: "pharmacist",
                  createdAt: null,
                }
          );
          setLoading(false);
        }, 5000);

        // onSnapshot reads from the local Firestore cache IMMEDIATELY when offline,
        // so it will not hang the way getDoc does on a refresh without internet.
        const unsubProfile = onSnapshot(
          doc(db, "users", user.uid),
          (snap) => {
            clearTimeout(fallbackTimer);
            if (snap.exists()) {
              const data = snap.data();
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
                displayName: user.displayName || user.email || "",
                role: "pharmacist",
                createdAt: null,
              });
            }
            setLoading(false);
          },
          () => {
            // On error (e.g. permission denied), clear timeout and unblock the UI.
            clearTimeout(fallbackTimer);
            setUserProfile({
              uid: user.uid,
              email: user.email || "",
              displayName: user.displayName || user.email || "",
              role: "pharmacist",
              createdAt: null,
            });
            setLoading(false);
          }
        );

        profileUnsubRef.current = unsubProfile;
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (profileUnsubRef.current) profileUnsubRef.current();
    };
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
