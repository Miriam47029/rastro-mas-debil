// ─────────────────────────────────────────────────────────────
//  Pega aquí el objeto firebaseConfig de tu proyecto.
//  Mientras databaseURL tenga "TU_PROYECTO", el juego corre en
//  MODO DEMO LOCAL (solo funciona entre pestañas del mismo navegador).
// ─────────────────────────────────────────────────────────────
export const firebaseConfig = {
  apiKey: "AIzaSyDd-GsBenIdeJS2AIq3-NY-cIojYTnKf14",
  authDomain: "rastro-mas-debil.firebaseapp.com",
  databaseURL: "https://rastro-mas-debil-default-rtdb.firebaseio.com",
  projectId: "rastro-mas-debil",
  storageBucket: "rastro-mas-debil.firebasestorage.app",
  messagingSenderId: "441748253386",
  appId: "1:441748253386:web:1f7b155f9be6580b956233"
};

// PIN para abrir el panel del conductor (host.html).
// Es una protección ligera del lado del cliente: suficiente para un salón.
export const HOST_PIN = "2611";

// Sala por defecto (se puede cambiar con ?sala=XXXX en la URL).
export const DEFAULT_ROOM = "taller";
