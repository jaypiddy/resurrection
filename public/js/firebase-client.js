import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

let app, db;

export async function initFirebaseClient() {
  if (app) return { app, db };
  try {
    const response = await fetch('/__/firebase/init.json');
    if (!response.ok) throw new Error("Local dev without firebase serve");
    const config = await response.json();
    app = initializeApp(config);
  } catch (e) {
    console.warn("Could not load /__/firebase/init.json. If testing locally without 'firebase serve', dynamic features will fail gracefully.");
    return { app: null, db: null };
  }
  
  if (app) {
    db = getFirestore(app);
  }
  return { app, db };
}

export async function getAgencyData(slug) {
  const { db } = await initFirebaseClient();
  if (!db) return null;
  
  try {
    const docRef = doc(db, "agencies", slug);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching agency data:", error);
    return null;
  }
}
