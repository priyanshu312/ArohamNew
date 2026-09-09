// Zero-side-effect Firebase compatibility stub.
// Prevents loading background device capability scanners, WebAuthn/FedCM, and installation tokens
// that trigger Chromium's "Access other apps and services on this device" dialog on site load.

export const firebaseApp = {} as any;
export const db = {} as any;

export const firebaseAuth = {
  currentUser: null,
  onAuthStateChanged: () => () => {},
  signOut: async () => {}
} as any;

// Firestore no-op shims.
// Firebase is intentionally stubbed (above), but several components still import
// doc()/collection()/setDoc()/etc. from "firebase/firestore" for "best effort"
// mirror writes. The real functions throw *synchronously* when handed a fake `db`
// (e.g. `doc(db, ...)`), which escaped the surrounding `.catch()` and surfaced as
// "Failed to connect to database" — breaking signup, newsletter, and profile save.
// These inert versions let those call sites keep working (as no-ops) until/unless
// Firebase is wired back up. Import them from "@nakshra/shared-services".
export const doc = (..._args: any[]): any => ({});
export const collection = (..._args: any[]): any => ({});
export const query = (..._args: any[]): any => ({});
export const where = (..._args: any[]): any => ({});
export const orderBy = (..._args: any[]): any => ({});
export const limit = (..._args: any[]): any => ({});
export const serverTimestamp = (): any => new Date().toISOString();
export const setDoc = async (..._args: any[]): Promise<void> => {};
export const addDoc = async (..._args: any[]): Promise<any> => ({ id: "stub" });
export const updateDoc = async (..._args: any[]): Promise<void> => {};
export const deleteDoc = async (..._args: any[]): Promise<void> => {};
export const getDoc = async (..._args: any[]): Promise<any> => ({
  exists: () => false,
  data: () => undefined,
});
export const getDocs = async (..._args: any[]): Promise<any> => ({
  empty: true,
  size: 0,
  docs: [] as any[],
  forEach: (_cb: any) => {},
});
