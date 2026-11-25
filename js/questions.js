// Banco de preguntas. Se responden EN VOZ ALTA; el conductor ve la respuesta
// y decide si es correcta. "tip" se muestra en el proyector al revelar.
//  - opts (opcional): opciones A–D que se muestran en proyector y celular.
//  - ok: índice (0–3) de la opción correcta, se resalta al revelar.
//  - pts: puntos que da la pregunta.
export const QUESTIONS = [
  // ── Las 5 del quiz de Jared ──
  {
    q: "¿Qué es una cookie de terceros?",
    opts: ["Un virus que daña tu celular", "Un archivo de otro sitio que te sigue entre páginas", "Una contraseña guardada", "Un anuncio emergente"],
    ok: 1,
    a: "B) Un archivo de otro sitio que te sigue entre páginas",
    tip: "Por eso ves el mismo anuncio en todas partes: la cookie de un tercero te reconoce de página en página.",
    pts: 100,
  },
  {
    q: "Una app de linterna pide ubicación y contactos. ¿Qué haces?",
    opts: ["Aceptar, para que funcione mejor", "Aceptar solo los contactos", "Negar los permisos que no necesita", "Ignorar el aviso y seguir"],
    ok: 2,
    a: "C) Negar los permisos que no necesita",
    tip: "Una linterna no necesita saber dónde estás ni a quién conoces. Permisos de más = puertas abiertas.",
    pts: 100,
  },
  {
    q: "¿Qué hace el modo incógnito?",
    opts: ["Solo evita guardar el historial en tu equipo", "Te vuelve invisible en internet", "Bloquea todos los rastreadores", "Oculta tu ubicación real"],
    ok: 0,
    a: "A) Solo evita guardar el historial en tu equipo",
    tip: "Los sitios, tu proveedor de internet y quien te rastrea siguen viendo tu actividad.",
    pts: 100,
  },
  {
    q: "¿Qué es la huella digital del navegador?",
    opts: ["Tu foto de perfil", "Tu contraseña cifrada", "El historial de búsquedas", "Un conjunto de datos del dispositivo que te identifica sin cookies"],
    ok: 3,
    a: "D) Un conjunto de datos del dispositivo que te identifica sin cookies",
    tip: "Pantalla, zona horaria, idioma… juntos te hacen único. Por eso borrar cookies no basta.",
    pts: 100,
  },
  {
    q: "¿Qué derecho ARCO usas para pedir que borren tus datos?",
    opts: ["Acceso", "Cancelación", "Rectificación", "Oposición"],
    ok: 1,
    a: "B) Cancelación",
    tip: "Cancelación = pedir que eliminen tus datos de sus bases. Cualquier empresa que los tenga te debe responder.",
    pts: 100,
  },
  // ── Las 3 nuestras (respuesta abierta) ──
  {
    q: "Te llega un SMS: «Tu paquete está retenido, entra a este link». ¿Qué haces?",
    a: "No entrar al link: es phishing. Revisar en la app o página oficial de la paquetería",
    tip: "Urgencia + link = trampa. La paquetería real no te pide datos ni contraseñas por SMS.",
    pts: 100,
  },
  {
    q: "¿Qué ajuste protege tu cuenta aunque alguien ya tenga tu contraseña?",
    a: "La verificación en dos pasos (2FA)",
    tip: "Una contraseña robada ya no basta si activas la verificación en dos pasos.",
    pts: 100,
  },
  {
    q: "PREGUNTA FINAL (vale doble): menciona 3 de los 5 ajustes del «Plan de 5 minutos».",
    a: "Permisos de apps · ID de publicidad · Cookies de terceros · Verificación en dos pasos · Actividad en la cuenta",
    tip: "5 ajustes, 5 minutos, mucho menos rastro. ¡Hazlos hoy!",
    pts: 200,
  },
];
