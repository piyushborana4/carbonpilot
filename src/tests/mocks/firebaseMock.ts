export const mockAuthUser = {
  uid: "test-user-123",
  email: "testuser@gmail.com",
  displayName: "Test Caretaker",
  emailVerified: true,
  isAnonymous: false,
  providerData: [{ providerId: "google.com", email: "testuser@gmail.com" }],
};

export const mockGetAuth = {
  currentUser: mockAuthUser,
};

export const mockDoc = jest.fn();
export const mockGetDocFromServer = jest.fn().mockResolvedValue({
  exists: () => true,
  data: () => ({ onboarded: true }),
});

jest.mock("../firebase-applet-config.json", () => ({
  apiKey: "test-api-key",
  authDomain: "test-auth-domain",
  projectId: "test-project-id",
  storageBucket: "test-storage-bucket",
  messagingSenderId: "test-sender-id",
  appId: "test-app-id",
  firestoreDatabaseId: "test-db-id"
}), { virtual: true });

jest.mock("../../firebase-applet-config.json", () => ({
  apiKey: "test-api-key",
  authDomain: "test-auth-domain",
  projectId: "test-project-id",
  storageBucket: "test-storage-bucket",
  messagingSenderId: "test-sender-id",
  appId: "test-app-id",
  firestoreDatabaseId: "test-db-id"
}), { virtual: true });

jest.mock("firebase/app", () => ({
  initializeApp: jest.fn().mockReturnValue({}),
}));

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn().mockReturnValue(mockGetAuth),
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({})),
  signInWithPopup: jest.fn().mockResolvedValue({ user: mockAuthUser }),
  signOut: jest.fn().mockResolvedValue(true),
}));

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn().mockReturnValue({}),
  doc: mockDoc,
  getDocFromServer: mockGetDocFromServer,
  getDoc: jest.fn().mockResolvedValue({ exists: () => false, data: () => ({}) }),
  collection: jest.fn(),
  addDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn().mockReturnValue(() => {}),
  increment: jest.fn(),
  arrayUnion: jest.fn(),
  arrayRemove: jest.fn(),
}));
