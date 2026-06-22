import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
// FIRESTORE
import { 
    getFirestore,
    collection,
    getDocs,
    addDoc,     // 👈 Agregado para crear pedidos
    updateDoc,  // 👈 Agregado para actualizar stock
    doc         // 👈 Agregado para apuntar a un producto específico
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
// REALTIME DATABASE
import { 
    getDatabase,
    ref,
    push,
    onValue,
    update
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBgoDcmxdIYRqo5gup302xLWaKO3AHsC5Y",
    authDomain: "e-commerce-2ff74.firebaseapp.com",
    databaseURL: "https://e-commerce-2ff74-default-rtdb.firebaseio.com",
    projectId: "e-commerce-2ff74",
    storageBucket: "e-commerce-2ff74.firebasestorage.app",
    messagingSenderId: "1079041764789",
    appId: "1:1079041764789:web:63cc75dfd3e5a4e9d4bdfc",
    measurementId: "G-0BLDR9NWTK"
};

const app = initializeApp(firebaseConfig);

// Instancias
export const firestoreDB = getFirestore(app);
export const realtimeDB = getDatabase(app);

// Exportaciones de Firestore (Organizadas)
export { collection, getDocs, addDoc, updateDoc, doc };

// Exportaciones de Realtime Database
export { ref, push, onValue, update };
