import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Authentication functions
export const signInWithGoogle = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
};

export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const signUpWithEmail = async (email: string, password: string): Promise<User> => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
};

// Firestore functions for game rooms
export const createRoom = async (roomCode: string, hostId: string, hostName: string) => {
  const roomRef = doc(db, 'rooms', roomCode);
  await setDoc(roomRef, {
    id: roomCode,
    hostId,
    createdAt: serverTimestamp(),
    status: 'lobby',
    players: [{
      id: hostId,
      displayName: hostName,
      ready: false,
      connected: true
    }],
    maxPlayers: 4,
    gameStarted: false
  });
  return roomCode;
};

export const joinRoom = async (roomCode: string, playerId: string, playerName: string) => {
  const roomRef = doc(db, 'rooms', roomCode);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    throw new Error('Room not found');
  }

  const roomData = roomSnap.data();
  if (roomData.players.length >= roomData.maxPlayers) {
    throw new Error('Room is full');
  }

  await updateDoc(roomRef, {
    players: [...roomData.players, {
      id: playerId,
      displayName: playerName,
      ready: false,
      connected: true
    }]
  });

  return roomData;
};

export const subscribeToRoom = (roomCode: string, callback: (roomData: any) => void) => {
  const roomRef = doc(db, 'rooms', roomCode);
  return onSnapshot(roomRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data());
    }
  });
};

export const updatePlayerReady = async (roomCode: string, playerId: string, ready: boolean) => {
  const roomRef = doc(db, 'rooms', roomCode);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) return;

  const roomData = roomSnap.data();
  const updatedPlayers = roomData.players.map((player: any) =>
    player.id === playerId ? { ...player, ready } : player
  );

  await updateDoc(roomRef, { players: updatedPlayers });
};

export default app;