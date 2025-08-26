import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, addDoc, serverTimestamp, runTransaction, getDocs, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { getDatabase, ref, onDisconnect, onValue, set as rset, serverTimestamp as rts } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-database.js";

const firebaseConfig={apiKey:"",authDomain:"",projectId:"",storageBucket:"",messagingSenderId:"",appId:"",databaseURL:""};

export const CONFIG_FILLED=Object.values(firebaseConfig).every(v=>String(v||"").length>0);

export const app=initializeApp(firebaseConfig);
export const auth=getAuth(app);
export const db=getFirestore(app);
export const rdb=getDatabase(app);
export { signInAnonymously,onAuthStateChanged,doc,getDoc,setDoc,updateDoc,onSnapshot,collection,query,where,addDoc,serverTimestamp,runTransaction,getDocs,orderBy,limit,ref,onDisconnect,onValue,rset,rts };
