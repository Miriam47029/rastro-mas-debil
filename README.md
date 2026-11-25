# El Rastro Más Débil 🛡️

Concurso de botón en tiempo real para el cierre del taller **Privacidad para Mortales**.
Los alumnos entran con su nombre desde el celular. Cuando sale la pregunta, el primero en presionar
tiene la palabra y responde en voz alta. El conductor marca ✔ o ✖: si acierta, su celular se pone verde y
suma puntos; si falla, se pone rojo y el turno queda libre para los demás. Al final aparece el podio con confeti.

## Pantallas

| Archivo | Quién lo abre | Para qué |
|---|---|---|
| `index.html` | Alumnos (QR) | Escribir nombre y presionar el botón |
| `pantalla.html` | Laptop conectada al proyector | QR de entrada, pregunta, quién tiene la palabra, marcador y podio |
| `host.html` | Celular del conductor (PIN `2611`) | Iniciar, ✔ Correcto / ✖ Incorrecto, siguiente, sumar o quitar puntos y sacar jugadores |

## 1. Conectar Firebase

1. Pega tu `firebaseConfig` en **`js/firebase-config.js`**. Ahí también puedes cambiar el PIN.
2. En Firebase, ve a **Realtime Database → Reglas**, pega el contenido de `database.rules.json` y dale **Publicar**.

> Mientras el archivo tenga `TU_PROYECTO`, el juego corre en **modo demo local**: funciona entre pestañas
> del mismo navegador, así que sirve para probar sin internet.

## 2. Subir a GitHub Pages

1. En GitHub, crea un repositorio **público** llamado `rastro-mas-debil`.
2. Ve a *Add file → Upload files* y arrastra **todo el contenido** de esta carpeta, con las carpetas `css/`, `js/` y `vendor/`. Luego haz *Commit*.
3. Entra a *Settings → Pages → Build and deployment*, elige **Deploy from a branch** con la rama `main` y la carpeta `/ (root)`, y dale *Save*.
4. Espera 1 o 2 minutos. El juego queda en:
   - Jugadores: `https://TU_USUARIO.github.io/rastro-mas-debil/`
   - Proyector: `https://TU_USUARIO.github.io/rastro-mas-debil/pantalla.html`
   - Conductor: `https://TU_USUARIO.github.io/rastro-mas-debil/host.html`

## 3. El día del taller

1. Abre **pantalla.html** en la laptop del proyector, haz clic en *Iniciar pantalla 🔊* (esto activa el sonido) y presiona **F** para pantalla completa.
2. Abre **host.html** en tu celular, entra con el PIN y presiona **Vaciar sala** para empezar limpio.
3. Los alumnos escanean el QR y escriben su nombre. Sus nombres van apareciendo en el proyector.
4. Presiona **▶ Iniciar**. En cada pregunta:
   - Alguien presiona: suena el proyector y en tu panel aparece su nombre con **✔ / ✖**. Tú ves la respuesta correcta.
   - **✖** lo deja fuera de esa pregunta y libera el botón para los demás.
   - **✔** le suma los puntos y revela la respuesta con su explicación.
   - Si nadie sabe, usa *Nadie sabe · revelar respuesta*.
   - Si alguien presionó por accidente, usa *Fue sin querer · reabrir sin castigo*.
5. Después de la última pregunta, presiona **🏆 Mostrar podio**.

## Personalizar

- **Preguntas:** `js/questions.js` (`q` es la pregunta, `a` la respuesta que solo ve el conductor, `tip` la explicación y `pts` los puntos).
- **Tiempo de la cuenta regresiva** (solo visual): `ANSWER_SECONDS` en `js/screen.js`.
- **Varias salas:** agrega `?sala=grupoB` a las tres URLs.

## Notas técnicas

- Quién presionó primero lo decide un `runTransaction` sobre `rooms/{sala}/state`. Gana el primero que llega al servidor de Firebase, no el que tenga el celular más rápido.
- El plan gratuito (Spark) aguanta 100 conexiones simultáneas, de sobra para un grupo.
- Los sonidos se generan con Web Audio y QR y confeti están en `vendor/`, así que no depende de otros CDNs.
- El PIN del conductor es una protección ligera del lado del cliente, suficiente para un salón.
