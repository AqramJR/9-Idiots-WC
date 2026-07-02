import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';
import type { StoredIdentity, User } from '@/types';
import { loadIdentity, saveIdentity, clearIdentity } from '@/utils/storage';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  identity: StoredIdentity | null;
  profile: User | null;
  authReady: boolean;
  authError: string | null;
  isAdmin: boolean;
  join: (name: string, avatar: string) => Promise<void>;
  logout: () => void;
  adminSignIn: (email: string, password: string) => Promise<void>;
  adminSignOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [identity, setIdentity] = useState<StoredIdentity | null>(loadIdentity());
  const [profile, setProfile] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Establish (or restore) a Firebase auth session.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error('Anonymous sign-in failed', err);
          const code = (err as { code?: string })?.code ?? '';
          setAuthError(
            code === 'auth/admin-restricted-operation' || code === 'auth/operation-not-allowed'
              ? 'Anonymous sign-in is not enabled for this Firebase project. Enable it in Firebase Console → Authentication → Sign-in method → Anonymous.'
              : `Sign-in failed (${code || 'unknown error'}). Check your Firebase config in .env.`
          );
          setAuthReady(true); // stop showing an infinite spinner; JoinForm will show the error instead
        }
        return; // onAuthStateChanged will fire again with the new user
      }
      setAuthError(null);
      setFirebaseUser(user);
      setIsAdmin(user.providerData.some((p) => p.providerId === 'password'));
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Subscribe to this user's Firestore profile once we know who they are.
  useEffect(() => {
    if (!identity?.userId) {
      setProfile(null);
      return;
    }
    const ref = doc(db, 'users', identity.userId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setProfile({ id: snap.id, ...(snap.data() as Omit<User, 'id'>) });
      } else {
        setProfile(null);
      }
    });
    return () => unsub();
  }, [identity?.userId]);

  const join = async (name: string, avatar: string) => {
    // Wait for anonymous auth to be ready so request.auth.uid matches the doc id.
    const uid = auth.currentUser?.uid ?? firebaseUser?.uid;
    if (!uid) {
      throw new Error(
        authError ?? 'Not authenticated yet — please wait a second and try again.'
      );
    }

    const newIdentity: StoredIdentity = { userId: uid, name, avatar };
    await setDoc(
      doc(db, 'users', uid),
      {
        name,
        avatar: avatar || '⚽',
        points: 0,
        exactPredictions: 0,
        correctOutcomes: 0,
        wrongPredictions: 0,
        totalPredictions: 0,
        createdAt: Date.now(),
      },
      { merge: true }
    );
    saveIdentity(newIdentity);
    setIdentity(newIdentity);
  };

  const logout = () => {
    clearIdentity();
    setIdentity(null);
    setProfile(null);
  };

  const adminSignIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const adminSignOut = async () => {
    await signOut(auth);
    setIsAdmin(false);
    // A fresh anonymous session will be created automatically by the
    // onAuthStateChanged listener above.
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        identity,
        profile,
        authReady,
        authError,
        isAdmin,
        join,
        logout,
        adminSignIn,
        adminSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
