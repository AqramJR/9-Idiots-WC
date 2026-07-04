import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';
import type { StoredIdentity, User } from '@/types';

// Firebase Auth needs an email; we synthesize one from the username so the
// UI can be plain "username + password" with no real email required.
const EMAIL_DOMAIN = '9idiotswc.local';

function usernameToEmail(username: string): string {
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  return `${clean}@${EMAIL_DOMAIN}`;
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
}

function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That username is already taken.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'Wrong username or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts — please wait a bit and try again.';
    default:
      return code ? `Something went wrong (${code}).` : 'Something went wrong. Please try again.';
  }
}

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  identity: StoredIdentity | null;
  profile: User | null;
  authReady: boolean; // Firebase auth state has resolved at least once
  profileLoading: boolean; // true while we're still fetching the Firestore profile doc
  adminLoading: boolean; // true while we're still checking the admins collection
  authError: string | null;
  isAdmin: boolean;
  signUp: (username: string, password: string, avatar: string, keepLoggedIn: boolean) => Promise<void>;
  logIn: (username: string, password: string, keepLoggedIn: boolean) => Promise<void>;
  logOut: () => Promise<void>;
  updateProfile: (name: string, avatar: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Track Firebase's own auth session — this is what makes "keep me logged
  // in" work across visits/devices, no localStorage juggling required.
  //
  // IMPORTANT: profileLoading/adminLoading are flipped to `true` in THIS
  // SAME callback, synchronously alongside firebaseUser — not in a separate
  // effect keyed on firebaseUser. If we set them in a separate effect, there
  // is exactly one render where firebaseUser is already truthy but
  // profileLoading/adminLoading still hold their previous (stale) values,
  // since effects run after render. Consumers like /admin were reading
  // `identity`/`isAdmin` during that one-render gap and seeing "not logged
  // in" or "not admin" for a split second — enough to trigger a redirect
  // before the real data ever had a chance to load. Setting all three states
  // in one batch here closes that gap completely.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (user) {
        setProfileLoading(true);
        setAdminLoading(true);
      } else {
        setProfile(null);
        setProfileLoading(false);
        setIsAdmin(false);
        setAdminLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to this user's Firestore profile once we know who they are.
  useEffect(() => {
    if (!firebaseUser) return;
    const ref = doc(db, 'users', firebaseUser.uid);
    const unsub = onSnapshot(ref, (snap) => {
      setProfile(snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<User, 'id'>) }) : null);
      setProfileLoading(false);
    });
    return () => unsub();
  }, [firebaseUser]);

  // Subscribe to admin status (existence of admins/{uid}).
  useEffect(() => {
    if (!firebaseUser) return;
    const ref = doc(db, 'admins', firebaseUser.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setIsAdmin(snap.exists());
        setAdminLoading(false);
      },
      () => {
        setIsAdmin(false); // no read access (not an admin) — that IS the answer
        setAdminLoading(false);
      }
    );
    return () => unsub();
  }, [firebaseUser]);

  // Derived, not stored — this is the fix for the old bug where a separate
  // localStorage "identity" blob could go stale and get overwritten with
  // fresh zeros. There is exactly one source of truth now: Firebase Auth
  // (who you are) + Firestore (your stats).
  const identity: StoredIdentity | null = useMemo(() => {
    if (!firebaseUser || !profile) return null;
    return { userId: firebaseUser.uid, name: profile.name, avatar: profile.avatar };
  }, [firebaseUser, profile]);

  const signUp = async (username: string, password: string, avatar: string, keepLoggedIn: boolean) => {
    setAuthError(null);
    const clean = normalizeUsername(username);
    if (clean.length < 3) throw new Error('Username must be at least 3 characters (letters, numbers, _ only).');
    try {
      await setPersistence(auth, keepLoggedIn ? browserLocalPersistence : browserSessionPersistence);
      const cred = await createUserWithEmailAndPassword(auth, usernameToEmail(clean), password);
      await setDoc(doc(db, 'users', cred.user.uid), {
        username: clean,
        name: username.trim(), // keep the display casing they typed
        avatar: avatar || '⚽',
        points: 0,
        bonusPoints: 0,
        exactPredictions: 0,
        correctOutcomes: 0,
        wrongPredictions: 0,
        totalPredictions: 0,
        bonusExact: 0,
        bonusCorrect: 0,
        bonusTotalPredictions: 0,
        createdAt: Date.now(),
      });
    } catch (err) {
      const message = friendlyAuthError(err);
      setAuthError(message);
      throw new Error(message);
    }
  };

  const logIn = async (username: string, password: string, keepLoggedIn: boolean) => {
    setAuthError(null);
    try {
      await setPersistence(auth, keepLoggedIn ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, usernameToEmail(username), password);
    } catch (err) {
      const message = friendlyAuthError(err);
      setAuthError(message);
      throw new Error(message);
    }
  };

  const logOut = async () => {
    await signOut(auth);
  };

  const updateProfile = async (name: string, avatar: string) => {
    if (!firebaseUser) throw new Error('Not logged in.');
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Name cannot be empty.');
    await updateDoc(doc(db, 'users', firebaseUser.uid), { name: trimmed, avatar: avatar || '⚽' });
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        identity,
        profile,
        authReady,
        profileLoading,
        adminLoading,
        authError,
        isAdmin,
        signUp,
        logIn,
        logOut,
        updateProfile,
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
