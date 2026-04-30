export const dayOrder = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
] as const;
export type DayKey = (typeof dayOrder)[number];

export const exerciseGuide: Record<string, string[]> = {
  "Press banca con barra": [
    "Escapulas retraidas, pies firmes y gluteos en el banco.",
    "Baja la barra al esternon medio sin perder arco toracico.",
    "Empuja en diagonal leve hacia atras manteniendo antebrazos verticales.",
    "No rebotes; controla la negativa 2-3 segundos."
  ],
  "Press inclinado con mancuernas": [
    "Banco a 20-35 grados para priorizar pecho superior.",
    "Baja con codos a 45-60 grados del torso.",
    "Sube acercando mancuernas sin chocarlas.",
    "Mantiene hombros abajo y atras en todo el recorrido."
  ],
  "Cruce de poleas sentado": [
    "Ajusta poleas a altura de hombro y sientate estable.",
    "Inicia con pecho abierto y ligera flexion de codo.",
    "Cierra en arco hacia la linea media con squeeze de 1 segundo.",
    "Regresa lento sin perder tension continua."
  ],
  "Press militar con barra": [
    "Core y gluteos apretados para bloquear lumbar.",
    "Barra inicia en claviculas con munecas neutras.",
    "Empuja vertical, metiendo la cabeza bajo la barra arriba.",
    "Baja controlado al punto inicial sin rebotar."
  ],
  "Elevaciones laterales con polea a altura del muslo": [
    "Polea baja detras o al costado, brazo levemente adelantado.",
    "Eleva en plano escapular hasta casi paralelo al suelo.",
    "Conduce con codo, no con la mano.",
    "Pausa arriba y baja lento manteniendo deltoide en tension."
  ],
  "Rompecráneos en banco declinado con mancuernas": [
    "Codos fijos apuntando arriba durante todo el movimiento.",
    "Lleva mancuernas atras de la cabeza para mayor estiramiento.",
    "Extiende codo sin abrirlos hacia afuera.",
    "Controla la bajada para proteger codo."
  ],
  "Extensiones katana con codo fijo en banco, polea": [
    "Apoya brazo y fija el codo para evitar compensacion.",
    "Empieza desde estiramiento profundo del triceps largo.",
    "Extiende en diagonal hacia adelante-arriba.",
    "Mantiene ritmo controlado y squeeze al final."
  ],
  "Peso muerto convencional": [
    "Barra sobre mediopie, tibias cerca sin empujarla al frente.",
    "Toma aire, bloquea dorsal y cadera ligeramente sobre rodilla.",
    "Empuja el suelo, barra pegada al cuerpo en todo el ascenso.",
    "Desciende con bisagra de cadera y control."
  ],
  "Remo en T": [
    "Torso firme, pecho alto y abdomen activo.",
    "Inicia tirando con codos, no con biceps.",
    "Lleva agarre hacia abdomen bajo/medio segun enfoque.",
    "Negativa lenta para ganar tiempo bajo tension."
  ],
  "Jalon al pecho en polea (agarre prono)": [
    "Inclinate levemente atras sin balancear.",
    "Deprime escapulas antes de flexionar codos.",
    "Lleva la barra al pecho superior.",
    "Estira arriba controlando sin perder tension en dorsales."
  ],
  "Remo con mancuerna unilateral": [
    "Columna neutra y apoyo estable.",
    "Trae codo hacia cadera para enfatizar dorsal.",
    "Evita girar el torso para hacer trampa.",
    "Baja lento hasta extension casi completa."
  ],
  "Curl bayesian con polea": [
    "Da un paso al frente para empezar en estiramiento.",
    "Codo fijo atras del torso mientras flexionas.",
    "Supina fuerte en la parte alta.",
    "Desciende en 2-3 segundos sin soltar hombro."
  ],
  "Curl predicador unilateral con polea": [
    "Ajusta altura para que el codo quede bien apoyado.",
    "Flexiona sin despegar axila del banco.",
    "Aprieta arriba sin perder control de muneca.",
    "Baja completo para aprovechar estiramiento."
  ],
  "Sentadilla con barra": [
    "Respira profundo y bloquea core antes de bajar.",
    "Rompe paralelo manteniendo rodillas siguiendo punteras.",
    "Mantiene el peso en mediopie-talones.",
    "Sube empujando suelo sin colapsar cadera."
  ],
  "Prensa de piernas": [
    "Coloca pies segun enfoque (medio para global, alto para gluteo/femoral).",
    "Baja hasta rango util sin despegar lumbar.",
    "Empuja con toda la planta, no solo puntas.",
    "No bloquees rodillas de forma agresiva."
  ],
  "Extensiones de cuadriceps en maquina": [
    "Ajusta eje de maquina al eje de rodilla.",
    "Extiende hasta casi bloqueo con squeeze de cuadriceps.",
    "Controla la bajada completa.",
    "Evita impulso con cadera."
  ],
  "Peso muerto rumano con barra": [
    "Rodillas semirriguas y barra pegada a muslos.",
    "Haz bisagra de cadera llevando gluteos atras.",
    "Baja hasta sentir estiramiento en femoral sin redondear espalda.",
    "Sube apretando gluteo y manteniendo la barra cerca."
  ],
  "Curl femoral en maquina tumbado": [
    "Cadera pegada al banco todo el set.",
    "Flexiona rodilla llevando talones hacia gluteos.",
    "Pausa corta arriba para eliminar rebote.",
    "Baja controlado hasta extension casi completa."
  ],
  "Hip thrust con barra": [
    "Escapulas apoyadas en banco y barbilla recogida.",
    "Sube pelvis hasta linea hombro-cadera-rodilla.",
    "Mantiene tibia casi vertical en pico de contraccion.",
    "Pausa arriba y baja controlado."
  ],
  "Elevaciones de gemelo de pie en maquina": [
    "Rango completo: talon abajo y punta arriba maximo.",
    "Mantiene rodilla estable sin rebotes.",
    "Sube explosivo y pausa arriba 1 segundo.",
    "Baja lenta para maximizar estiramiento."
  ],
  "Curl con barra Z (EZ)": [
    "Agarre comodo en barra EZ para muneca.",
    "Codos pegados al torso sin adelantarlos.",
    "Flexiona hasta contraccion maxima del biceps.",
    "Desciende controlado evitando balanceo."
  ],
  "Fondos en paralelas (o press cerrado)": [
    "Torso levemente inclinado si buscas mas pecho; recto para triceps.",
    "Baja hasta que hombro no pierda control.",
    "Empuja fuerte extendiendo codos con control.",
    "No colapses escapulas al final."
  ],
  "Extensiones triceps unilateral con polea en diagonal": [
    "Codo fijo, brazo estable y hombro abajo.",
    "Extiende en diagonal buscando recorrido largo.",
    "Aprieta triceps al final 1 segundo.",
    "Regresa lento sin perder alineacion."
  ],
  "Rompecraneos en banco inclinado con mancuernas": [
    "Inclina banco para aumentar estiramiento de triceps largo.",
    "Codos fijos apuntando al techo.",
    "Extiende sin abrir codos lateralmente.",
    "Controla todo el recorrido para proteger articulacion."
  ],
  "Curl de muneca con mancuerna (antebrazos)": [
    "Apoya antebrazo para aislar flexores.",
    "Deja caer muneca en extension controlada.",
    "Flexiona al maximo sin mover codo.",
    "Haz reps limpias con ritmo continuo."
  ]
};

export const exerciseMediaEmbed: Record<string, string> = {
  "Press banca con barra":
    "https://www.youtube.com/results?search_query=bench+press+barbell+proper+form",
  "Press inclinado con mancuernas":
    "https://www.youtube.com/results?search_query=incline+dumbbell+press+proper+form",
  "Cruce de poleas sentado":
    "https://www.youtube.com/results?search_query=seated+cable+chest+fly+proper+form",
  "Press militar con barra":
    "https://www.youtube.com/results?search_query=barbell+overhead+press+proper+form",
  "Elevaciones laterales con polea a altura del muslo":
    "https://www.youtube.com/results?search_query=cable+lateral+raise+proper+form",
  "Rompecráneos en banco declinado con mancuernas":
    "https://www.youtube.com/results?search_query=decline+dumbbell+skullcrusher+proper+form",
  "Extensiones katana con codo fijo en banco, polea":
    "https://www.youtube.com/results?search_query=katana+triceps+extension+cable+proper+form",
  "Peso muerto convencional":
    "https://www.youtube.com/results?search_query=conventional+deadlift+proper+form",
  "Remo en T": "https://www.youtube.com/results?search_query=t+bar+row+proper+form",
  "Jalón al pecho en polea (agarre prono)":
    "https://www.youtube.com/results?search_query=lat+pulldown+pronated+grip+proper+form",
  "Remo con mancuerna unilateral":
    "https://www.youtube.com/results?search_query=one+arm+dumbbell+row+proper+form",
  "Curl bayesian con polea":
    "https://www.youtube.com/results?search_query=bayesian+cable+curl+proper+form",
  "Curl predicador unilateral con polea":
    "https://www.youtube.com/results?search_query=single+arm+preacher+cable+curl+proper+form",
  "Sentadilla con barra": "https://www.youtube.com/results?search_query=barbell+squat+proper+form",
  "Prensa de piernas": "https://www.youtube.com/results?search_query=leg+press+proper+form",
  "Extensiones de cuádriceps en máquina":
    "https://www.youtube.com/results?search_query=leg+extension+machine+proper+form",
  "Peso muerto rumano con barra":
    "https://www.youtube.com/results?search_query=barbell+romanian+deadlift+proper+form",
  "Curl femoral en máquina tumbado":
    "https://www.youtube.com/results?search_query=lying+leg+curl+proper+form",
  "Hip thrust con barra":
    "https://www.youtube.com/results?search_query=barbell+hip+thrust+proper+form",
  "Elevaciones de gemelo de pie en máquina":
    "https://www.youtube.com/results?search_query=standing+calf+raise+machine+proper+form",
  "Curl con barra Z (EZ)": "https://www.youtube.com/results?search_query=ez+bar+curl+proper+form",
  "Fondos en paralelas (o press cerrado)":
    "https://www.youtube.com/results?search_query=parallel+bar+dips+proper+form",
  "Extensiones tríceps unilateral con polea en diagonal":
    "https://www.youtube.com/results?search_query=single+arm+cable+triceps+extension+proper+form",
  "Rompecráneos en banco inclinado con mancuernas":
    "https://www.youtube.com/results?search_query=incline+dumbbell+skullcrusher+proper+form",
  "Curl de muñeca con mancuerna (antebrazos)":
    "https://www.youtube.com/results?search_query=dumbbell+wrist+curl+proper+form"
};

export type RoutineExerciseSeed = {
  name: string;
  sets: string;
  sTier: boolean;
};

export const defaultRoutineByDay: Record<DayKey, RoutineExerciseSeed[]> = {
  monday: [
    { name: "Press banca con barra", sets: "4 × 6-8", sTier: false },
    { name: "Press inclinado con mancuernas", sets: "3 × 8-10", sTier: false },
    { name: "Cruce de poleas sentado", sets: "3 × 12-15", sTier: true },
    { name: "Press militar con barra", sets: "3 × 8-10", sTier: false },
    { name: "Elevaciones laterales con polea a altura del muslo", sets: "4 × 15-20", sTier: true },
    { name: "Rompecráneos en banco declinado con mancuernas", sets: "3 × 10-12", sTier: true }
  ],
  tuesday: [
    { name: "Peso muerto convencional", sets: "4 × 5-6", sTier: false },
    { name: "Remo en T", sets: "4 × 8-10", sTier: true },
    { name: "Jalón al pecho en polea (agarre prono)", sets: "3 × 10-12", sTier: false },
    { name: "Remo con mancuerna unilateral", sets: "3 × 10-12", sTier: false },
    { name: "Curl bayesian con polea", sets: "3 × 12-15", sTier: true }
  ],
  wednesday: [
    { name: "Sentadilla con barra", sets: "4 × 6-8", sTier: false },
    { name: "Prensa de piernas", sets: "3 × 10-12", sTier: false },
    { name: "Extensiones de cuádriceps en máquina", sets: "3 × 12-15", sTier: false },
    { name: "Peso muerto rumano con barra", sets: "3 × 10-12", sTier: false },
    { name: "Curl femoral en máquina tumbado", sets: "3 × 12-15", sTier: false },
    { name: "Hip thrust con barra", sets: "3 × 12-15", sTier: false },
    { name: "Elevaciones de gemelo de pie en máquina", sets: "4 × 15-20", sTier: false }
  ],
  thursday: [
    { name: "Curl con barra Z (EZ)", sets: "4 × 8-10", sTier: false },
    { name: "Curl bayesian con polea", sets: "3 × 12-15", sTier: true },
    { name: "Curl predicador unilateral con polea", sets: "3 × 12-15", sTier: true },
    { name: "Fondos en paralelas (o press cerrado)", sets: "3 × 8-10", sTier: false },
    { name: "Extensiones tríceps unilateral con polea en diagonal", sets: "3 × 12-15", sTier: true },
    { name: "Rompecráneos en banco inclinado con mancuernas", sets: "3 × 10-12", sTier: true },
    { name: "Extensiones katana con codo fijo en banco, polea", sets: "3 × 12-15", sTier: true },
    { name: "Curl de muñeca con mancuerna (antebrazos)", sets: "3 × 15-20", sTier: false }
  ],
  friday: [],
  saturday: [],
  sunday: []
};
