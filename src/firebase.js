import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCt05N3CPt8ui96mmBd9oSvAFVNNDQdqWM",
    authDomain: "restaurante-fbf21.firebaseapp.com",
    projectId: "restaurante-fbf21",
    storageBucket: "restaurante-fbf21.firebasestorage.app",
    messagingSenderId: "832549582547",
    appId: "1:832549582547:web:88a56e20b8b23b2ead8626",
    measurementId: "G-DMX51ZHZ34"
};

const app = initializeApp(firebaseConfig);

const storage = getStorage(app);
export { storage }

const db = getFirestore(app);
export { db };