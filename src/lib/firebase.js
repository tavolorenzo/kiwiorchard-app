/**
 * firebase.js
 * Inicialización de Firebase y helpers de Firestore.
 * Reemplaza sheets.js — sin CORS, sin Apps Script intermediario.
 */

import { initializeApp } from "firebase/app";
import {
    getAuth, GoogleAuthProvider,
    signInWithPopup, signOut,
    onAuthStateChanged
} from "firebase/auth";
import {
    getFirestore, doc, getDoc,
    getDocs, collection, addDoc,
    setDoc, updateDoc, deleteDoc,
    query, where, orderBy, serverTimestamp
} from "firebase/firestore";

// ── Inicialización ────────────────────────────────────────────

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ── Auth helpers ──────────────────────────────────────────────

const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

/**
 * Devuelve true si el usuario es admin.
 * Admin = el email configurado en VITE_ADMIN_EMAIL.
 */
export const isAdmin = (user) =>
    user?.email === import.meta.env.VITE_ADMIN_EMAIL;


// ── CONFIG — lectura ──────────────────────────────────────────

/** Lee todos los orchards */
export async function fetchOrchards() {
    const snap = await getDocs(collection(db, "orchards"));
    return snap.docs.map(d => d.data()).filter(o => o.active !== false);
}

/** Lee workers de la colección config */
export async function fetchWorkers() {
    const snap = await getDocs(collection(db, "config/workers/items"));
    return snap.docs.map(d => d.data());
}

/** Lee teams */
export async function fetchTeams() {
    const snap = await getDocs(collection(db, "config/teams/items"));
    return snap.docs.map(d => d.data());
}

/** Lee team_members */
export async function fetchTeamMembers() {
    const snap = await getDocs(collection(db, "config/team_members/items"));
    return snap.docs.map(d => d.data());
}


// ── ORCHARD DATA — lectura ────────────────────────────────────

/** Lee el MAP de un orchard (row_id → { total_bays, block_id, is_skirt }) */
export async function fetchMap(orchardId) {
    const snap = await getDocs(collection(db, `orchards/${orchardId}/map`));
    return snap.docs.map(d => d.data());
}

/** Lee los blocks de un orchard */
export async function fetchBlocks(orchardId) {
    const snap = await getDocs(collection(db, `orchards/${orchardId}/blocks`));
    return snap.docs.map(d => d.data());
}

/** Lee los jobs de un orchard, ordenados por fecha descendente */
export async function fetchJobs(orchardId) {
    const q = query(
        collection(db, `orchards/${orchardId}/jobs`),
        orderBy("date", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}


// ── JOBS — escritura ──────────────────────────────────────────

/**
 * Agrega un job nuevo a Firestore.
 * Genera el job_id como orchardId-año-secuencia.
 */
export async function appendJob(jobData) {
    const orchardId = jobData.orchard_id;
    const year = new Date().getFullYear();

    // Generar job_id secuencial
    const existing = await getDocs(
        query(collection(db, `orchards/${orchardId}/jobs`),
            where("date", ">=", `${year}-01-01`))
    );
    const next = existing.size + 1;
    const job_id = `${orchardId}-${year}-${String(next).padStart(3, "0")}`;

    const payload = {
        ...jobData,
        job_id,
        created_at: serverTimestamp(),
    };

    await setDoc(doc(db, `orchards/${orchardId}/jobs/${job_id}`), payload);
    return { success: true, job_id };
}


// ── CONFIG — escritura (admin only) ──────────────────────────

/** Crea o actualiza un worker */
export async function saveWorker(workerData) {
    const id = workerData.worker_id ?? `w-${Date.now()}`;
    await setDoc(
        doc(db, `config/workers/items/${id}`),
        { ...workerData, worker_id: id },
        { merge: true }
    );
    return id;
}

/** Activa o desactiva un worker */
export async function toggleWorker(worker_id, active) {
    await updateDoc(doc(db, `config/workers/items/${worker_id}`), { active });
}

/** Crea o actualiza un team */
export async function saveTeam(teamData) {
    const id = teamData.team_id ?? `t-${Date.now()}`;
    await setDoc(
        doc(db, `config/teams/items/${id}`),
        { ...teamData, team_id: id },
        { merge: true }
    );
    return id;
}

/** Activa o desactiva un team */
export async function toggleTeam(team_id, active) {
    await updateDoc(doc(db, `config/teams/items/${team_id}`), { active });
}

/**
 * Reemplaza los miembros de un team.
 * Borra los existentes e inserta los nuevos.
 */
export async function saveTeamMembers(team_id, members) {
    // Borrar miembros actuales del team
    const existing = await getDocs(
        query(collection(db, "config/team_members/items"),
            where("team_id", "==", team_id))
    );
    await Promise.all(existing.docs.map(d => deleteDoc(d.ref)));

    // Insertar nuevos
    await Promise.all(members.map((m, i) =>
        setDoc(
            doc(db, `config/team_members/items/tm-${team_id}-${String(i).padStart(3, "0")}`),
            { team_id, worker_id: m.worker_id, worker_name: m.worker_name }
        )
    ));
}
