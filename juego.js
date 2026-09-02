/* ==========================================================================
   AGROBOT PRO v17 · juego.js
   Todo el codigo del juego. Esta ordenado por secciones; busca con Ctrl+F
   las cabeceras "// =====" para saltar de una a otra:

     CONFIGURACION          ajustes, precios, edad minima, la clave de Gemini
     FRUTAS DE EL SALVADOR  las 20 frutas con nombre cientifico y biografia
     USER MEMORY            la cuenta del jugador
     CINEMATIC INTRO        la introduccion
     MENU CANVAS            el menu principal animado
     DRON / PLANTAS         todo el dibujo
     MONEDAS / MISION       la economia
     FARM INIT / FARM DRAW  el huerto
     CONTROLES DEL DRON     las teclas
     PYTHON TRANSPILER      el editor de codigo
     AIDEN AI ASSISTANT     el chat con Gemini
     TIENDA / SIEMBRA       comprar y sembrar
     EXPANSION v11          el mundo destruido
     v13                    AIDEN siempre encendido
     v14                    HUD movible, avatar, escuela de codigo, ayudas
     v15                    AIDEN termina sus frases
     v16                    la intro con musica
     v17                    si tu hablas, AIDEN se calla

   OJO: el orden importa. De la v13 en adelante son mejoras que reemplazan
   funciones de mas arriba, asi que no muevas bloques de sitio.
   ========================================================================== */

// ============================================================
//  CONFIGURACION (edita aqui, no hace falta tocar el resto)
// ============================================================
const AIDEN_CONFIG = {
  // AVISO: esta clave viaja dentro del HTML. Cualquiera que abra el archivo
  // puede leerla. Restringela por dominio en Google AI Studio, o dejala vacia
  // ('') y AIDEN seguira respondiendo con su base de conocimiento local.
  apiKey: 'AIzaSyDkeQYWwRvBNKjgwwplswJ_wK51aEPFqx0',
  modelos: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'],
  maxHistorial: 5,
  maxPalabras: 60
};

const VOICE_CONFIG = {
  rate: 0.9,          // mas bajo = habla mas despacio
  pitch: 1.0,         // 1.0 = voz natural (antes 1.2, sonaba chillona)
  volume: 1.0,
  prefer: ['es-US', 'es-MX', 'es-419', 'es-SV', 'es-CO', 'es-AR', 'es-ES']
};

const ECONOMIA = {
  monedasInicio: 50,    // REGALO al iniciar sesion: con esto se compran macetas y plantas
  porRiego: 2,          // monedas por regar
  porRescate: 10,       // monedas por SALVAR una planta en peligro
  porMision: 25,        // monedas al completar la mision
  precioMaceta: 15,     // comprar una maceta nueva (abre una casilla)
  precioPlanta: 10,     // comprar la planta que va dentro de la maceta
  precioAgua: 3,
  precioPista: 2,
  precioFertilizante: 8
};
const MACETAS_INICIALES = 2;              // solo 2 macetas al empezar
const POSICIONES_INICIALES = [[1, 1], [2, 1]];

// ------------------------------------------------------------
//  RESTRICCION DE EDAD: solo pueden entrar de 14 anios en adelante
// ------------------------------------------------------------
const EDAD_MINIMA = 14;

function edadPermitida(edad) {
  const e = parseInt(edad);
  return !isNaN(e) && e >= EDAD_MINIMA;
}

function mostrarBloqueoEdad(edad) {
  const e = parseInt(edad);
  const txt = document.getElementById('block-age-txt');
  if (txt) txt.textContent = isNaN(e) ? 'Edad no válida' : `Edad registrada: ${e} años · faltan ${EDAD_MINIMA - e} para poder entrar`;
  ['account-screen','intro','main-menu','game-screen','sow-screen'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const bl = document.getElementById('age-block-screen');
  if (bl) bl.style.display = 'flex';
  gameState = 'bloqueado';
  try { if (typeof pararReconocimiento === 'function') pararReconocimiento(); } catch (err) {}
  try { window.speechSynthesis.cancel(); } catch (err) {}
}

function volverDeBloqueo() {
  const bl = document.getElementById('age-block-screen');
  if (bl) bl.style.display = 'none';
  const acc = document.getElementById('account-screen');
  if (acc) acc.style.display = 'flex';
  gameState = 'account';
  const inp = document.getElementById('acc-age');
  if (inp) { inp.value = ''; inp.focus(); }
  if (typeof previewAgeMode === 'function') previewAgeMode();
}

// ------------------------------------------------------------
//  MODOS SEGUN LA EDAD: la edad decide la mision y los comandos
// ------------------------------------------------------------
const MODOS_EDAD = [
  { id:'semillita', min:0, max:8, nombre:'Semillita', emoji:'🌱',
    objetivo:{ tipo:'regar', meta:5, texto:'Riega 5 frutas' },
    consejo:'Muevete con las flechas o los botones de abajo y pulsa E para regar.',
    tono:'Explica como a un nino de 6 anos: frases muy cortas, palabras faciles, sin terminos tecnicos.' },
  { id:'explorador', min:9, max:12, nombre:'Explorador', emoji:'🧭',
    objetivo:{ tipo:'plantas', meta:4, texto:'Ten 4 macetas con planta' },
    consejo:'Riega para ganar monedas, y con ellas compra macetas (tecla B) y plantas (tecla R).',
    tono:'Explica como a un nino de 10 anos: claro, con un ejemplo corto de codigo cuando ayude.' },
  { id:'ingeniero', min:13, max:200, nombre:'Ingeniero', emoji:'🛠️',
    objetivo:{ tipo:'plantas', meta:6, texto:'Ten 6 macetas con planta' },
    consejo:'Escribe un programa con un bucle for que recorra granja.criticas() y riegue cada planta.',
    tono:'Explica como a un adolescente que ya programa: directo, con codigo cuando aporte.' }
];
function getAgeMode(edad) {
  const e = parseInt(edad);
  if (!e || isNaN(e)) return MODOS_EDAD[1];
  return MODOS_EDAD.find(m => e >= m.min && e <= m.max) || MODOS_EDAD[2];
}


// ============================================================
//  FRUTAS DE EL SALVADOR - 20 FRUTAS EN 2 NIVELES
// ============================================================
const LEVEL1_FRUITS = ['jocote','mango','maranon','mamon','zapote','anona','papaya','coco','guayaba','nance'];
const LEVEL2_FRUITS = ['guanabana','caimito','copinol','paterna','cincuya','tamarindo','arrayan','mamey','maracuya','pitaya'];
const PLANT_EMOJI = {
'jocote':'🟡','mango':'🥭','maranon':'🍎','mamon':'🟢','zapote':'🟤',
'anona':'🍈','papaya':'🍈','coco':'🥥','guineo':'🍌','nance':'🟡',
'guanabana':'🍈','caimito':'🟣','copinol':'🌰','paterna':'🫘','cincuya':'🍈',
'tamarindo':'🟫','arrayan':'🔴','mamey':'🟠','maracuya':'🟡','pitaya':'🐉',
'guayaba':'🍐','deposito':'💧','vacio':'🟫'
};
const TODAS_FRUTAS = [...LEVEL1_FRUITS, ...LEVEL2_FRUITS];
const PLANT_NAMES = {
'jocote':'Jocote','mango':'Mango','maranon':'Marañón','mamon':'Mamón (Talpa)','zapote':'Zapote',
'anona':'Anona','papaya':'Papaya','coco':'Coco','guayaba':'Guayaba','nance':'Nance',
'guanabana':'Guanábana','caimito':'Caimito','copinol':'Copinol','paterna':'Paterna','cincuya':'Cincuya',
'tamarindo':'Tamarindo','arrayan':'Arrayán','mamey':'Mamey','maracuya':'Maracuyá','pitaya':'Pitaya',
'vacio':'Tierra lista','deposito':'Depósito de agua'
};
const PLANT_NEEDS = {
'jocote':{agua:3,luz:5,peso_max:80},'mango':{agua:4,luz:5,peso_max:400},
'maranon':{agua:4,luz:5,peso_max:150},'mamon':{agua:3,luz:4,peso_max:60},
'zapote':{agua:3,luz:4,peso_max:300},'anona':{agua:4,luz:4,peso_max:500},
'papaya':{agua:5,luz:5,peso_max:4000},'coco':{agua:4,luz:5,peso_max:1500},
'guayaba':{agua:3,luz:4,peso_max:200},'nance':{agua:3,luz:5,peso_max:30},
'guanabana':{agua:4,luz:4,peso_max:4500},'caimito':{agua:3,luz:4,peso_max:150},
'copinol':{agua:2,luz:5,peso_max:80},'paterna':{agua:2,luz:4,peso_max:1000},
'cincuya':{agua:3,luz:4,peso_max:300},'tamarindo':{agua:2,luz:5,peso_max:200},
'arrayan':{agua:3,luz:4,peso_max:20},'mamey':{agua:4,luz:4,peso_max:1200},
'maracuya':{agua:4,luz:5,peso_max:250},'pitaya':{agua:2,luz:5,peso_max:400},
'vacio':{agua:0,luz:0,peso_max:1}
};

// Biografías completas de las 20 frutas
const PLANT_BIOGRAPHIES = {
jocote:{nombre:'Jocote',cientifico:'Spondias purpurea',origen:'Mesoamérica',emoji:'🟡',biografia:'El jocote es el rey del verano salvadoreño. Crece en racimos en árboles que pierden sus hojas antes de fructificar, entre febrero y abril. Se consume verde con sal y chile, o maduro como postre dulce.',datos:[{label:'Temporada',value:'Febrero-Abril'},{label:'Forma popular',value:'Verde con sal y chile'},{label:'Vitamina C',value:'Muy alto contenido'}],voz:'El jocote es el rey del verano salvadoreño.'},
mango:{nombre:'Mango',cientifico:'Mangifera indica',origen:'India',emoji:'🥭',biografia:'El mango es una de las frutas más populares de El Salvador. Existen muchas variedades locales: indio, azucarón, mechudo y jade. El mango verde rallado con alguashte es un clásico salvadoreño.',datos:[{label:'Variedades',value:'Indio, azucarón, mechudo, jade'},{label:'Clásico',value:'Verde rallado con alguashte'},{label:'Temporada',value:'Marzo-Junio'}],voz:'El mango tiene muchas variedades en El Salvador.'},
maranon:{nombre:'Marañón',cientifico:'Anacardium occidentale',origen:'Brasil',emoji:'🍎',biografia:'El marañón es un fruto exótico único. La semilla (nuez cashew) crece colgando fuera del fruto. El jugo de marañón es una bebida tradicional muy querida en las zonas costeras.',datos:[{label:'Curiosidad',value:'La semilla crece fuera del fruto'},{label:'Nuez',value:'Cashew o nuez de la India'},{label:'Vitamina C',value:'5 veces más que la naranja'}],voz:'El marañón es un fruto exótico donde la semilla crece fuera del fruto.'},
mamon:{nombre:'Mamón (Talpa)',cientifico:'Melicoccus bijugatus',origen:'América tropical',emoji:'🟢',biografia:'El mamón, también llamado talpa o quenepa, crece en grandes racimos. Su cáscara verde delgada se rompe fácilmente al morderla, revelando una pulpa anaranjada dulce-ácida.',datos:[{label:'Otros nombres',value:'Quenepa, limoncillo'},{label:'Consumo',value:'Chupando la pulpa'},{label:'Racimo',value:'Hasta 50 frutos'}],voz:'El mamón o talpa crece en grandes racimos y se consume chupando su pulpa.'},
zapote:{nombre:'Zapote',cientifico:'Manilkara zapota',origen:'América Central',emoji:'🟤',biografia:'El zapote es una fruta muy autóctona cultivada por los antiguos mayas. Su pulpa anaranjada es extremadamente dulce, con sabor acaramelado. De su savia se obtenía originalmente el chicle.',datos:[{label:'Origen maya',value:'Cultivado hace 2000 años'},{label:'Chicle',value:'Su savia fue base del chicle'},{label:'Longevidad',value:'Árboles de más de 100 años'}],voz:'El zapote es cultivado por los antiguos mayas y su savia fue base del chicle.'},
anona:{nombre:'Anona',cientifico:'Annona squamosa',origen:'América tropical',emoji:'🍈',biografia:'La anona tiene piel verde rugosa con escamas. Su pulpa blanca es cremosa y muy dulce, con sabor a piña, plátano y fresa. Se come fresca con cuchara.',datos:[{label:'Textura',value:'Cremosa, como natilla'},{label:'Sabor',value:'Piña, plátano y fresa'},{label:'Temporada',value:'Octubre-Enero'}],voz:'La anona tiene pulpa cremosa con sabor a piña, plátano y fresa.'},
papaya:{nombre:'Papaya',cientifico:'Carica papaya',origen:'América Central',emoji:'🍈',biografia:'La papaya es muy dulce y se cultiva en todo El Salvador. Los árboles son hierbas gigantes de hasta 8 metros. Contiene papaína, enzima que ayuda a la digestión.',datos:[{label:'Enzima',value:'Papaína (ayuda a digerir)'},{label:'Vitamina C',value:'2 veces más que la naranja'},{label:'Altura',value:'Hasta 8 metros'}],voz:'La papaya contiene papaína que ayuda a la digestión.'},
coco:{nombre:'Coco',cientifico:'Cocos nucifera',origen:'Trópicos',emoji:'🥥',biografia:'El coco es indispensable en la costa salvadoreña. Su agua es un isotónico natural muy hidratante. Las palmeras pueden producir hasta 200 cocos al año durante 60 años.',datos:[{label:'Agua de coco',value:'Isotónica natural'},{label:'Producción',value:'200 cocos por año/árbol'},{label:'Zona SV',value:'Costa de La Libertad'}],voz:'El coco es indispensable en la costa salvadoreña.'},
guayaba:{nombre:'Guayaba',cientifico:'Psidium guajava',origen:'Mesoamérica',emoji:'🍐',biografia:'La guayaba crece en casi todo El Salvador, incluso en patios y solares. Tiene cuatro veces más vitamina C que la naranja y su aroma se siente desde lejos cuando madura. Se come fresca, en refresco o como dulce de guayaba con queso.',datos:[{label:'Vitamina C',value:'4 veces más que la naranja'},{label:'Postre típico',value:'Dulce de guayaba con queso'},{label:'Aroma',value:'Muy intenso y dulce'}],voz:'La guayaba tiene cuatro veces más vitamina C que la naranja.'},
nance:{nombre:'Nance',cientifico:'Byrsonima crassifolia',origen:'América tropical',emoji:'🟡',biografia:'El nance es una fruta amarilla pequeña muy aromática. Se usa para hacer refrescos, el famoso coyol fermentado, y conservas en dulce de panela. Su temporada es una celebración.',datos:[{label:'Tamaño',value:'Pequeño, 1-2 cm'},{label:'Temporada',value:'Junio-Agosto'},{label:'Bebida',value:'Refresco y coyol fermentado'}],voz:'El nance es una fruta amarilla pequeña muy aromática.'},
guanabana:{nombre:'Guanábana',cientifico:'Annona muricata',origen:'América tropical',emoji:'🍈',biografia:'La guanábana es una fruta grande con espinas suaves que puede pesar hasta 4.5 kg. Su pulpa blanca es agridulce y cremosa, con sabor a piña, fresa y coco.',datos:[{label:'Peso máximo',value:'Hasta 4.5 kg'},{label:'Sabor',value:'Piña, fresa y coco'},{label:'Propiedades',value:'Estudiada por anticancerígenas'}],voz:'La guanábana puede pesar hasta cuatro kilos y medio.'},
caimito:{nombre:'Caimito',cientifico:'Chrysophyllum cainito',origen:'Antillas',emoji:'🟣',biografia:'El caimito es un fruto morado redondo que al cortarlo revela una estrella de cinco puntas en su interior. Su pulpa blanca es lechosa y muy dulce, con sabor a leche condensada.',datos:[{label:'Estrella interior',value:'Forma de estrella de 5 puntas'},{label:'Sabor',value:'Como leche condensada'},{label:'Árbol',value:'Hasta 20 metros'}],voz:'El caimito revela una estrella de cinco puntas en su interior.'},
copinol:{nombre:'Copinol',cientifico:'Sterculia apetala',origen:'América Central',emoji:'🌰',biografia:'El copinol tiene una cáscara dura como la madera que protege semillas con pulpa dulce anaranjada. Se debe golpear para abrirlo. Los árboles se llaman parrote.',datos:[{label:'Cáscara',value:'Dura como la madera'},{label:'Consumo',value:'Golpear para abrir'},{label:'Árbol',value:'Parrote o roble maicón'}],voz:'El copinol tiene cáscara dura como la madera.'},
paterna:{nombre:'Paterna',cientifico:'Enterolobium cyclocarpum',origen:'América tropical',emoji:'🫘',biografia:'La paterna es una leguminosa gigante con vainas en forma de oreja. Sus semillas tienen una capa blanca dulce. Los árboles, llamados conacaste, pueden vivir más de 200 años.',datos:[{label:'Otros nombres',value:'Conacaste, orejo'},{label:'Vainas',value:'Forma de oreja circular'},{label:'Longevidad',value:'Más de 200 años'}],voz:'La paterna tiene vainas en forma de oreja y los árboles viven más de 200 años.'},
cincuya:{nombre:'Cincuya',cientifico:'Annona diversifolia',origen:'Centroamérica',emoji:'🍈',biografia:'La cincuya es una variedad pequeña de anona con cáscara más lisa y pulpa harinosa muy dulce, con textura similar al plátano maduro.',datos:[{label:'Tamaño',value:'Más pequeña que la anona'},{label:'Textura',value:'Como plátano maduro'},{label:'Zona SV',value:'Occidente'}],voz:'La cincuya tiene textura similar al plátano maduro.'},
tamarindo:{nombre:'Tamarindo',cientifico:'Tamarindus indica',origen:'África',emoji:'🟫',biografia:'El tamarindo produce vainas marrones con pulpa ácida, clave para hacer el famoso agua de tamarindo. También se usa en dulces y en la salsa inglesa.',datos:[{label:'Bebida típica',value:'Agua de tamarindo'},{label:'Sabor',value:'Dulce-ácido característico'},{label:'Usos',value:'Refrescos, dulces, salsas'}],voz:'El tamarindo es clave para el agua de tamarindo.'},
arrayan:{nombre:'Arrayán',cientifico:'Eugenia stahlii',origen:'Caribe',emoji:'🔴',biografia:'El arrayán produce frutos pequeños y muy ácidos, perfectos para refrescos naturales. Es muy popular en las zonas montañosas de El Salvador.',datos:[{label:'Tamaño fruto',value:'Pequeño, 1-2 cm'},{label:'Sabor',value:'Muy ácido y aromático'},{label:'Uso',value:'Refrescos naturales'}],voz:'El arrayán produce frutos pequeños muy ácidos para refrescos.'},
mamey:{nombre:'Mamey',cientifico:'Pouteria sapota',origen:'México y Centroamérica',emoji:'🟠',biografia:'El mamey tiene pulpa rojiza cremosa con sabor a batata, calabaza, miel y vainilla. Los frutos pueden pesar hasta 2.5 kg. Los árboles viven más de 100 años.',datos:[{label:'Peso fruto',value:'Hasta 2.5 kg'},{label:'Sabor',value:'Batata, calabaza, miel y vainilla'},{label:'Textura',value:'Muy cremosa'}],voz:'El mamey tiene sabor a batata, calabaza, miel y vainilla.'},
maracuya:{nombre:'Maracuyá',cientifico:'Passiflora edulis',origen:'América del Sur',emoji:'🟡',biografia:'La maracuyá o fruto de la pasión es muy ácida y refrescante. Su pulpa gelatinosa tiene semillas negras comestibles. Es muy rica en vitamina C.',datos:[{label:'Vitamina C',value:'Muy alto contenido'},{label:'Pulpa',value:'Gelatinosa con semillas negras'},{label:'Planta',value:'Enredadera con flores espectaculares'}],voz:'La maracuyá es muy ácida y refrescante.'},
pitaya:{nombre:'Pitaya',cientifico:'Hylocereus undatus',origen:'América Central',emoji:'🐉',biografia:'La pitaya o fruta del dragón es un fruto exótico de cactus con piel fucsia y pulpa blanca con semillas negras. Su cactus florece solo una noche al año.',datos:[{label:'Flor',value:'Solo florece de noche'},{label:'Planta',value:'Cactus trepador'},{label:'Antioxidantes',value:'Muy alto contenido'}],voz:'La pitaya es un fruto exótico de cactus.'}
};

// ============================================================
//  USER MEMORY
// ============================================================
const STORAGE_KEY = 'agrobot_user_data';
function getUserData() { try { const d = localStorage.getItem(STORAGE_KEY); return d ? JSON.parse(d) : null; } catch(e) { return null; } }
function saveUserData(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); return true; } catch(e) { return false; } }
let currentUser = null;

function createAccount() {
const name = document.getElementById('acc-name').value.trim();
const age = parseInt(document.getElementById('acc-age').value);
const avatarEl = document.querySelector('.avatar-opt.selected');
const avatar = avatarEl ? avatarEl.dataset.avatar : '🧑‍🌾';
if (!name || name.length < 2) { showToast('⚠️ Ingresa un nombre válido', true); return; }
if (!age || age < 5 || age > 99) { showToast('⚠️ Ingresa una edad válida (5-99)', true); return; }
if (!edadPermitida(age)) { mostrarBloqueoEdad(age); return; }
currentUser = { name, age, avatar, avatarPhoto: pendingPhoto || null, created: Date.now(), level: 1, totalScore: 0, totalWatered: 0, totalRescues: 0, totalLines: 0, gamesPlayed: 0, bestScore: 0, lastPlayed: null, coins: 0, bonoRecibido: false, voz: '' };
saveUserData(currentUser);
renderAvatars();
showToast(`✅ ¡Cuenta creada! Bienvenido ${name}`);
setTimeout(startCinematicIntro, 800);
}

function loadAccount() {
const data = getUserData();
if (!data) { showToast('⚠️ No hay cuenta guardada.', true); return; }
if (!edadPermitida(data.age)) { mostrarBloqueoEdad(data.age); return; }
currentUser = normalizarUsuario(data);
if (pendingPhoto) currentUser.avatarPhoto = pendingPhoto;
saveUserData(currentUser);
renderAvatars();
showToast(`✅ ¡Bienvenido de vuelta, ${data.name}!`);
setTimeout(startCinematicIntro, 800);
}

function logoutAccount() {
if (confirm('¿Cerrar sesión?')) {
if (currentUser) saveUserData(currentUser);
currentUser = null;
document.getElementById('main-menu').style.display = 'none';
document.getElementById('account-screen').style.display = 'flex';
gameState = 'account';
}
}

function normalizarUsuario(u) {
if (typeof u.coins !== 'number') u.coins = 0;
if (typeof u.bonoRecibido !== 'boolean') u.bonoRecibido = false;
if (typeof u.avatarPhoto === 'undefined') u.avatarPhoto = null;
if (typeof u.voz !== 'string') u.voz = '';
if (typeof u.micro !== 'boolean') u.micro = true;
return u;
}

function updateUserStats() {
if (!currentUser) return;
currentUser.totalScore += score;
currentUser.totalWatered += totalWatered;
currentUser.totalRescues += totalRescues;
currentUser.totalLines += linesRun;
currentUser.gamesPlayed++;
if (score > currentUser.bestScore) currentUser.bestScore = score;
currentUser.lastPlayed = Date.now();
currentUser.level = Math.floor(currentUser.totalScore / 500) + 1;
saveUserData(currentUser);
}

// ------------------------------------------------------------
//  COMPATIBILIDAD: roundRect no existe en navegadores anteriores
//  a 2022. Sin esto, en una computadora vieja el dron y las macetas
//  no se dibujan y la consola se llena de errores.
// ------------------------------------------------------------
if (typeof CanvasRenderingContext2D !== 'undefined' &&
    !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    let rad = Array.isArray(r) ? (r[0] || 0) : (r || 0);
    rad = Math.min(rad, Math.abs(w) / 2, Math.abs(h) / 2);
    this.beginPath();
    this.moveTo(x + rad, y);
    this.arcTo(x + w, y,     x + w,   y + h, rad);
    this.arcTo(x + w, y + h, x,       y + h, rad);
    this.arcTo(x,     y + h, x,       y,     rad);
    this.arcTo(x,     y,     x + w,   y,     rad);
    this.closePath();
    return this;
  };
}

// ============================================================
//  GLOBALS & STATE
// ============================================================
// v7.0: 7x3 = 21 casillas -> 1 depósito + 20 parcelas = una parcela por fruta,
// exactamente las 20 frutas y ninguna repetida.
const GRID_COLS = 7, GRID_ROWS = 3;
const MAX_PARCELAS = GRID_COLS * GRID_ROWS - 1;
const SECTION_COLORS = ['#3d2817','#2d3828','#3d2d4a','#4a3d2d'];
const SECTION_BORDER = ['#4ade80','#5cb8ff','#c98fe0','#f39c3d'];
const WATER_INTERVAL_MS = 60 * 60 * 1000;
const DECAY_START_MS = WATER_INTERVAL_MS;
const DECAY_RATE_PER_HOUR = 2.0;

let gameState = 'account';
let currentLevel = 1;
let currentLevelFruits = LEVEL1_FRUITS;
let score = 0, totalWatered = 0, totalRescues = 0, linesRun = 0;
let gameTimer = 0, lastTime = 0;
let voiceEnabled = true, speechSynth = window.speechSynthesis;   // v13: la voz viene ENCENDIDA
let gamePausedForBio = false;
let farmGrid = [];
let drone = { x: 0, y: 0, px: 0, py: 0, tx: 0, ty: 0, moving: false, bucket: 10, maxBucket: 10, rotorAngle: 0, waterEffect: [], blinkLed: 0, hoverOffset: 0 };
let cmdQueue = [];
let cmdRunning = false;
let coins = 0;
let semillas = [];
let seleccionSiembra = [];
let mision = null;
let pendingPhoto = null;
let aidenHistory = [];
function barajar(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
let farmCanvas, farmCtx, cellW, cellH, originX, originY;
let panelW = 340;
let soilPattern = null;

function initFarmCanvas() {
farmCanvas = document.getElementById('farm-canvas');
farmCtx = farmCanvas.getContext('2d');
resizeFarmCanvas();
createSoilPattern();
}

function createSoilPattern() {
const pCanvas = document.createElement('canvas');
pCanvas.width = 64; pCanvas.height = 64;
const pCtx = pCanvas.getContext('2d');
pCtx.fillStyle = '#3d2817';
pCtx.fillRect(0, 0, 64, 64);
for (let i = 0; i < 300; i++) {
const x = Math.random() * 64, y = Math.random() * 64;
const r = Math.random() * 1.5;
const shade = 40 + Math.random() * 40;
pCtx.fillStyle = `rgba(${shade+20}, ${shade}, ${shade-10}, ${0.3 + Math.random() * 0.4})`;
pCtx.beginPath(); pCtx.arc(x, y, r, 0, Math.PI * 2); pCtx.fill();
}
soilPattern = farmCtx.createPattern(pCanvas, 'repeat');
}

function resizeFarmCanvas() {
// ARREGLO: en celulares el panel se va abajo, así que el lienzo mide
// el espacio REAL que le queda. Antes daba ancho negativo y el juego
// se rompía nada más abrirlo en una pantalla pequeña.
const panel = document.querySelector('.control-panel');
const rect = panel ? panel.getBoundingClientRect() : null;
const vertical = window.innerWidth <= 900;
if (vertical) {
panelW = 0;
farmCanvas.width = Math.max(280, window.innerWidth);
farmCanvas.height = Math.max(260, window.innerHeight - (rect ? rect.height : 0));
} else {
panelW = rect && rect.width ? Math.round(rect.width) : 340;
farmCanvas.width = Math.max(320, window.innerWidth - panelW);
farmCanvas.height = Math.max(260, window.innerHeight);
}
const availW = Math.max(120, farmCanvas.width - 40);
const availH = Math.max(120, farmCanvas.height - 90);
cellW = Math.max(26, Math.floor(Math.min(availW / GRID_COLS, availH / GRID_ROWS)));
cellH = cellW;
originX = Math.floor((farmCanvas.width - cellW * GRID_COLS) / 2);
originY = Math.floor((farmCanvas.height - cellH * GRID_ROWS) / 2 + (vertical ? 10 : 20));
syncDronePosition();
}

function gridToPixel(gx, gy) {
if (!isFinite(originX) || !isFinite(originY) || !isFinite(cellW) || !isFinite(cellH)) return { x: 100, y: 100 };
return { x: originX + gx * cellW + cellW / 2, y: originY + gy * cellH + cellH / 2 };
}

function syncDronePosition() {
if (!farmCanvas || !isFinite(cellW) || !isFinite(cellH)) return;
drone.x = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(drone.x)));
drone.y = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(drone.y)));
const p = gridToPixel(drone.x, drone.y);
drone.tx = p.x; drone.ty = p.y;
drone.px = p.x; drone.py = p.y;
drone.moving = false;
}

// ============================================================
//  CINEMATIC INTRO
// ============================================================
let starsCanvas, starsCtx, stars = [], globeCanvas, globeCtx;
let introAngle = 0;
let currentScene = 0;
let introStartTime = 0;
let introAnimFrame;
let particles = [];
let introAudioCtx = null;
let introAudioEnabled = false;
let introAudioNodes = [];

const SCENE_TIMINGS = [
{ id: 'cin-scene-1', duration: 3500 },
{ id: 'cin-scene-2', duration: 3000 },
{ id: 'cin-scene-3', duration: 4500 },
{ id: 'cin-scene-4', duration: 4500 },
{ id: 'cin-scene-5', duration: 6000 }
];

function startCinematicIntro() {
if (currentUser && !edadPermitida(currentUser.age)) { mostrarBloqueoEdad(currentUser.age); return; }
document.getElementById('account-screen').style.display = 'none';
document.getElementById('intro').classList.add('active');
gameState = 'intro';
if (currentUser) {
pintarAvatarEn('cin-avatar');
document.getElementById('cin-welcome').textContent = `¡Bienvenido, ${currentUser.name}!`;
}
initStars(); initGlobe(); initParticles();
currentScene = 0;
introStartTime = performance.now();
showScene(0);
runCinematicLoop();
}

function initStars() {
starsCanvas = document.getElementById('stars-canvas');
starsCtx = starsCanvas.getContext('2d');
starsCanvas.width = window.innerWidth;
starsCanvas.height = window.innerHeight;
stars = [];
for (let i = 0; i < 400; i++) {
stars.push({
x: Math.random() * starsCanvas.width,
y: Math.random() * starsCanvas.height,
r: Math.random() * 1.8 + 0.2,
twinkle: Math.random() * Math.PI * 2,
color: Math.random() > 0.9 ? `hsl(${200 + Math.random()*60}, 80%, 80%)` : '#fff'
});
}
}

function initParticles() {
particles = [];
for (let i = 0; i < 50; i++) {
particles.push({
x: Math.random() * window.innerWidth,
y: Math.random() * window.innerHeight,
vx: (Math.random() - 0.5) * 0.5,
vy: (Math.random() - 0.5) * 0.5,
size: Math.random() * 3 + 1,
alpha: Math.random() * 0.5 + 0.2,
color: `hsl(${180 + Math.random() * 40}, 70%, 60%)`
});
}
}

function initGlobe() {
globeCanvas = document.getElementById('globe-canvas');
globeCtx = globeCanvas.getContext('2d');
}

function showScene(idx) {
document.querySelectorAll('.cinematic-layer').forEach(el => el.classList.remove('visible'));
const scene = document.getElementById(SCENE_TIMINGS[idx].id);
if (scene) scene.classList.add('visible');
document.getElementById('cin-progress').textContent = `ESCENA ${idx + 1}/${SCENE_TIMINGS.length}`;
if (introAudioEnabled && introAudioCtx) playIntroSceneAudio(idx);
}

function runCinematicLoop() {
if (gameState !== 'intro') return;
const now = performance.now();
const elapsed = now - introStartTime;
let accum = 0, targetScene = 0;      
for (let i = 0; i < SCENE_TIMINGS.length; i++) {
if (elapsed >= accum && elapsed < accum + SCENE_TIMINGS[i].duration) { targetScene = i; break; }
accum += SCENE_TIMINGS[i].duration;
if (i === SCENE_TIMINGS.length - 1) targetScene = SCENE_TIMINGS.length;
}
if (targetScene !== currentScene && targetScene < SCENE_TIMINGS.length) {
currentScene = targetScene;
showScene(currentScene);
}
if (currentScene === 4) {
const sceneElapsed = elapsed - (SCENE_TIMINGS.slice(0, 4).reduce((a,b) => a + b.duration, 0));
const countdown = Math.max(0, 5 - Math.floor(sceneElapsed / 1000));
document.getElementById('intro-counter').textContent = countdown;
const pct = Math.min(100, (sceneElapsed / SCENE_TIMINGS[4].duration) * 100);
document.getElementById('loading-fill').style.width = pct + '%';
}
const totalDuration = SCENE_TIMINGS.reduce((a,b) => a + b.duration, 0);
if (elapsed >= totalDuration) { skipIntro(); return; }
drawStars(); drawParticles();
if (currentScene >= 2) { introAngle += 0.008; drawGlobe(introAngle); }
introAnimFrame = requestAnimationFrame(runCinematicLoop);
}

function drawStars() {
starsCtx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);
const bgGrad = starsCtx.createRadialGradient(starsCanvas.width/2, starsCanvas.height/2, 0, starsCanvas.width/2, starsCanvas.height/2, starsCanvas.width/2);
bgGrad.addColorStop(0, '#0a1929');
bgGrad.addColorStop(1, '#000');
starsCtx.fillStyle = bgGrad;
starsCtx.fillRect(0, 0, starsCanvas.width, starsCanvas.height);
stars.forEach(s => {
s.twinkle += 0.02;
const alpha = 0.4 + 0.6 * Math.abs(Math.sin(s.twinkle));
starsCtx.fillStyle = s.color === '#fff' ? `rgba(255,255,255,${alpha})` : s.color.replace(')', `,${alpha})`).replace('hsl','hsla');
starsCtx.beginPath();
starsCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
starsCtx.fill();
});
}

function drawParticles() {
particles.forEach(p => {
p.x += p.vx; p.y += p.vy;
if (p.x < 0) p.x = window.innerWidth;
if (p.x > window.innerWidth) p.x = 0;
if (p.y < 0) p.y = window.innerHeight;
if (p.y > window.innerHeight) p.y = 0;
starsCtx.globalAlpha = p.alpha;
starsCtx.fillStyle = p.color;
starsCtx.beginPath();
starsCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
starsCtx.fill();
});
starsCtx.globalAlpha = 1;
}

function drawGlobe(angle) {
const cx = 130, cy = 130, r = 115;
globeCtx.clearRect(0, 0, 260, 260);
const atmoGrad = globeCtx.createRadialGradient(cx, cy, r, cx, cy, r + 20);
atmoGrad.addColorStop(0, 'rgba(92,225,255,0.3)');
atmoGrad.addColorStop(1, 'transparent');
globeCtx.fillStyle = atmoGrad;
globeCtx.beginPath();
globeCtx.arc(cx, cy, r + 20, 0, Math.PI * 2);
globeCtx.fill();
const grad = globeCtx.createRadialGradient(cx - 30, cy - 30, 5, cx, cy, r);
grad.addColorStop(0, '#2a7ab8');
grad.addColorStop(0.4, '#0a5d94');
grad.addColorStop(0.8, '#053a66');
grad.addColorStop(1, '#021a33');
globeCtx.fillStyle = grad;
globeCtx.beginPath();
globeCtx.arc(cx, cy, r, 0, Math.PI * 2);
globeCtx.fill();
globeCtx.save();
globeCtx.beginPath();
globeCtx.arc(cx, cy, r, 0, Math.PI * 2);
globeCtx.clip();
const continents = [
{x:0.4,y:0.3,w:0.25,h:0.35,color:'#2d8a3e'},
{x:0.55,y:0.35,w:0.18,h:0.3,color:'#3a9a4e'},
{x:0.15,y:0.3,w:0.18,h:0.3,color:'#2d8a3e'},
{x:0.2,y:0.65,w:0.12,h:0.15,color:'#4aaa5e'},
{x:0.6,y:0.65,w:0.08,h:0.12,color:'#3a9a4e'}
];
continents.forEach(c => {
const ox = Math.sin(angle + c.x * 6) * 40;
if (Math.abs(ox) < r) {
globeCtx.fillStyle = 'rgba(0,0,0,0.3)';
globeCtx.beginPath();
globeCtx.ellipse(cx + ox + (c.x - 0.5) * r * 0.5 + 2, cy + (c.y - 0.5) * r * 1.6 + 2,
c.w * r * 0.8, c.h * r * 0.7, 0, 0, Math.PI * 2);
globeCtx.fill();
const cGrad = globeCtx.createRadialGradient(
cx + ox + (c.x - 0.5) * r * 0.5, cy + (c.y - 0.5) * r * 1.6, 0,
cx + ox + (c.x - 0.5) * r * 0.5, cy + (c.y - 0.5) * r * 1.6, c.w * r
);
cGrad.addColorStop(0, c.color);
cGrad.addColorStop(1, '#1a5a2a');
globeCtx.fillStyle = cGrad;
globeCtx.beginPath();
globeCtx.ellipse(cx + ox + (c.x - 0.5) * r * 0.5, cy + (c.y - 0.5) * r * 1.6,
c.w * r * 0.8, c.h * r * 0.7, 0, 0, Math.PI * 2);
globeCtx.fill();
}
});
globeCtx.restore();
globeCtx.strokeStyle = 'rgba(92,225,255,0.7)';
globeCtx.lineWidth = 2;
globeCtx.beginPath();
globeCtx.arc(cx, cy, r, 0, Math.PI * 2);
globeCtx.stroke();
}

// ============================================================
//  AUDIO SYSTEM
// ============================================================
function toggleIntroAudio() {
introAudioEnabled = !introAudioEnabled;
const btn = document.getElementById('audio-toggle');
if (introAudioEnabled) {
btn.textContent = '🔊 AUDIO ON';
btn.style.borderColor = 'var(--emerald)';
btn.style.color = 'var(--emerald)';
startIntroAudio();
} else {
btn.textContent = '🔇 AUDIO OFF';
btn.style.borderColor = 'var(--cyan)';
btn.style.color = 'var(--cyan)';
stopIntroAudio();
}
}

function startIntroAudio() {
try {
if (!introAudioCtx) introAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
if (introAudioCtx.state === 'suspended') introAudioCtx.resume();
playIntroAmbient();
playIntroSceneAudio(currentScene);
} catch(e) { console.warn('Audio no disponible:', e); }
}

function stopIntroAudio() {
introAudioNodes.forEach(node => { try { node.stop(); } catch(e) {} try { node.disconnect(); } catch(e) {} });
introAudioNodes = [];
}

function playIntroAmbient() {
if (!introAudioCtx) return;
const ctx = introAudioCtx;
const osc1 = ctx.createOscillator();
const gain1 = ctx.createGain();
osc1.type = 'sine'; osc1.frequency.value = 55; gain1.gain.value = 0.08;
osc1.connect(gain1); gain1.connect(ctx.destination); osc1.start();
introAudioNodes.push(osc1);
const osc2 = ctx.createOscillator();
const gain2 = ctx.createGain();
osc2.type = 'triangle'; osc2.frequency.value = 110; gain2.gain.value = 0.04;
osc2.connect(gain2); gain2.connect(ctx.destination); osc2.start();
introAudioNodes.push(osc2);
const lfo = ctx.createOscillator();
const lfoGain = ctx.createGain();
lfo.frequency.value = 0.2; lfoGain.gain.value = 5;
lfo.connect(lfoGain); lfoGain.connect(osc2.frequency); lfo.start();
introAudioNodes.push(lfo);
}

function playIntroSceneAudio(sceneIdx) {
if (!introAudioCtx) return;
const ctx = introAudioCtx;
const playTone = (freq, duration, delay, type='sine', vol=0.1) => {
setTimeout(() => {
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.type = type; osc.frequency.value = freq;
gain.gain.setValueAtTime(vol, ctx.currentTime);
gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
osc.connect(gain); gain.connect(ctx.destination);
osc.start(); osc.stop(ctx.currentTime + duration);
}, delay);
};
switch(sceneIdx) {
case 0: playTone(440, 1.5, 0, 'sine', 0.12); playTone(554, 1.2, 200, 'sine', 0.1); playTone(659, 1.0, 400, 'sine', 0.08); break;
case 1: playTone(523, 0.8, 0, 'triangle', 0.1); playTone(659, 0.8, 300, 'triangle', 0.1); playTone(784, 1.0, 600, 'triangle', 0.08); break;
case 2: playTone(220, 2, 0, 'sawtooth', 0.04); playTone(330, 1.5, 500, 'sine', 0.06); break;
case 3: playTone(440, 0.5, 0, 'square', 0.03); playTone(550, 0.5, 300, 'square', 0.03); playTone(660, 0.5, 600, 'square', 0.03); playTone(880, 1.0, 900, 'sine', 0.05); break;
case 4: for (let i = 0; i < 5; i++) playTone(880 - i*100, 0.3, i*1000, 'square', 0.08); playTone(1320, 2, 5000, 'sine', 0.15); break;
}
}

function skipIntro() {
cancelAnimationFrame(introAnimFrame);
stopIntroAudio();
document.getElementById('intro').classList.remove('active');
document.getElementById('main-menu').style.display = 'block';
gameState = 'menu';
updateMenuUser();
initMenuCanvas();
}

// La opción de repetir la intro se quitó a propósito: la cinemática solo
// se ve una vez, al crear la cuenta o al iniciar sesión.

function updateMenuUser() {
if (!currentUser) return;
pintarAvatarEn('menu-avatar');
const modo = getAgeMode(currentUser.age);
document.getElementById('menu-name').textContent = currentUser.name;
document.getElementById('menu-stats').textContent = `${modo.emoji} ${modo.nombre} · ${currentUser.totalScore} pts · ${currentUser.coins || 0} 🪙`;
}

// ============================================================
//  AVATAR (emoji o foto del jugador)
// ============================================================
function pintarAvatarEn(id) {
const el = document.getElementById(id);
if (!el || !currentUser) return;
if (currentUser.avatarPhoto) {
el.innerHTML = '<img alt="Tu foto" src="' + currentUser.avatarPhoto + '">';
} else {
el.textContent = currentUser.avatar || '🧑‍🌾';
}
}
function renderAvatars() { pintarAvatarEn('menu-avatar'); pintarAvatarEn('cin-avatar'); }

function pintarPreviewFoto(dataUrl) {
const prev = document.getElementById('photo-prev');
const clr = document.getElementById('photo-clear');
if (!prev) return;
if (dataUrl) {
prev.innerHTML = '<img alt="Tu foto" src="' + dataUrl + '">';
prev.classList.add('has-photo');
if (clr) clr.style.display = 'inline-block';
} else {
prev.textContent = '📷';
prev.classList.remove('has-photo');
if (clr) clr.style.display = 'none';
}
}

function handlePhotoUpload(ev) {
const file = ev.target.files && ev.target.files[0];
ev.target.value = '';
if (!file) return;
if (!file.type.startsWith('image/')) { showToast('⚠️ Elige un archivo de imagen', true); return; }
const reader = new FileReader();
reader.onload = () => {
const img = new Image();
img.onload = () => {
const c = document.createElement('canvas');
c.width = c.height = 160;
const g = c.getContext('2d');
const lado = Math.min(img.width, img.height);
g.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 160, 160);
pendingPhoto = c.toDataURL('image/jpeg', 0.82);
pintarPreviewFoto(pendingPhoto);
if (currentUser) { currentUser.avatarPhoto = pendingPhoto; saveUserData(currentUser); renderAvatars(); }
showToast('📷 Foto lista');
};
img.onerror = () => showToast('⚠️ No se pudo leer esa imagen', true);
img.src = reader.result;
};
reader.onerror = () => showToast('⚠️ No se pudo leer el archivo', true);
reader.readAsDataURL(file);
}

function clearPhoto() {
pendingPhoto = null;
pintarPreviewFoto(null);
if (currentUser) { currentUser.avatarPhoto = null; saveUserData(currentUser); renderAvatars(); }
}

function previewAgeMode() {
const hint = document.getElementById('age-hint');
const val = document.getElementById('acc-age').value;
if (!hint) return;
hint.style.color = '';
if (!val) { hint.textContent = `🔞 Edad mínima para jugar: ${EDAD_MINIMA} años. Tu edad también elige tu misión y tus comandos.`; return; }
if (!edadPermitida(val)) {
hint.style.color = '#ff8a8a';
hint.textContent = `🚫 Con ${parseInt(val)} años no puedes ingresar: el juego es para ${EDAD_MINIMA} años en adelante.`;
return;
}
const m = getAgeMode(val);
hint.textContent = `${m.emoji} Modo ${m.nombre} — tu misión será: ${m.objetivo.texto}.`;
}

// ============================================================
//  MENU CANVAS
// ============================================================
let menuCanvas, menuCtx;
let menuPlants = [], menuDrone = {x:100, y:200, vx:1.2, vy:0.4};
let menuAnimFrame;

function initMenuCanvas() {
menuCanvas = document.getElementById('menu-canvas');
menuCtx = menuCanvas.getContext('2d');
menuCanvas.width = window.innerWidth;
menuCanvas.height = window.innerHeight;
menuPlants = [];
const allFruits = [...LEVEL1_FRUITS, ...LEVEL2_FRUITS];
for (let i = 0; i < 14; i++) {
menuPlants.push({
x: Math.random() * menuCanvas.width,
y: menuCanvas.height - 40 - Math.random() * 120,
type: allFruits[Math.floor(Math.random() * allFruits.length)],
phase: Math.random() * Math.PI * 2,
size: 16 + Math.random() * 14
});
}
menuDrone = {x: 100, y: 200, vx: 1.5, vy: 0.6, rotor: 0};
cancelAnimationFrame(menuAnimFrame);
menuLoop();
}

function menuLoop() {
if (gameState !== 'menu') return;
menuCtx.clearRect(0, 0, menuCanvas.width, menuCanvas.height);
const t = performance.now() / 1000;
const sg = menuCtx.createLinearGradient(0, 0, 0, menuCanvas.height);
sg.addColorStop(0, '#0a0e27'); sg.addColorStop(0.4, '#1a0f3d');
sg.addColorStop(0.7, '#0f1b3d'); sg.addColorStop(1, '#1a3a2a');
menuCtx.fillStyle = sg;
menuCtx.fillRect(0, 0, menuCanvas.width, menuCanvas.height);
menuCtx.fillStyle = 'rgba(255,255,220,0.9)';
menuCtx.beginPath();
menuCtx.arc(menuCanvas.width - 150, 120, 40, 0, Math.PI * 2);
menuCtx.fill();
for (let i = 0; i < 100; i++) {
const sx = (i * 137.5) % menuCanvas.width;
const sy = (i * 79.3) % (menuCanvas.height * 0.6);
const alpha = 0.3 + 0.4 * Math.sin(t * 1.5 + i);
menuCtx.fillStyle = `rgba(255,255,255,${alpha})`;
menuCtx.fillRect(sx, sy, 1.5, 1.5);
}
menuCtx.fillStyle = '#0a1a2a';
menuCtx.beginPath();
menuCtx.moveTo(0, menuCanvas.height - 100);
for (let x = 0; x <= menuCanvas.width; x += 50) {
menuCtx.lineTo(x, menuCanvas.height - 100 - Math.sin(x * 0.01) * 40 - Math.cos(x * 0.02) * 20);
}
menuCtx.lineTo(menuCanvas.width, menuCanvas.height);
menuCtx.lineTo(0, menuCanvas.height);
menuCtx.closePath();
menuCtx.fill();
const groundGrad = menuCtx.createLinearGradient(0, menuCanvas.height - 60, 0, menuCanvas.height);
groundGrad.addColorStop(0, '#1a3a1a'); groundGrad.addColorStop(1, '#0a2a0a');
menuCtx.fillStyle = groundGrad;
menuCtx.fillRect(0, menuCanvas.height - 60, menuCanvas.width, 60);
menuPlants.forEach(p => {
const sway = Math.sin(t * 0.8 + p.phase) * 8;
menuCtx.font = `${p.size}px serif`;
menuCtx.textAlign = 'center';
menuCtx.save();
menuCtx.translate(p.x, p.y);
menuCtx.rotate(sway * 0.02);
menuCtx.fillText(PLANT_EMOJI[p.type] || '🍎', 0, 0);
menuCtx.restore();
});
menuDrone.x += menuDrone.vx;
menuDrone.y += menuDrone.vy * Math.sin(t * 0.5);
menuDrone.rotor += 0.2;
if (menuDrone.x > menuCanvas.width + 60) menuDrone.x = -60;
drawRealisticDrone(menuCtx, menuDrone.x, menuDrone.y, 1, menuDrone.rotor);
menuAnimFrame = requestAnimationFrame(menuLoop);
}

// ============================================================
//  DRÓN ULTRA REALISTA
// ============================================================
function drawRealisticDrone(ctx, x, y, scale, rotorA) {
ctx.save();
ctx.translate(x, y);
ctx.scale(scale, scale);

// Sombra del dron
ctx.fillStyle = 'rgba(0,0,0,0.4)';
ctx.beginPath();
ctx.ellipse(0, 35, 30, 8, 0, 0, Math.PI * 2);
ctx.fill();

// Efecto de propulsión (downwash)
const thrustGrad = ctx.createRadialGradient(0, 25, 0, 0, 25, 40);
thrustGrad.addColorStop(0, `rgba(92, 225, 255, ${0.2 + 0.1 * Math.sin(rotorA * 3)})`);
thrustGrad.addColorStop(0.5, 'rgba(0, 150, 255, 0.08)');
thrustGrad.addColorStop(1, 'transparent');
ctx.fillStyle = thrustGrad;
ctx.beginPath();
ctx.ellipse(0, 25, 40, 15, 0, 0, Math.PI * 2);
ctx.fill();

// Brazos del dron (4 brazos en X)
const armPositions = [[-28,-16],[28,-16],[-28,16],[28,16]];
armPositions.forEach(([ax,ay], idx) => {
// Brazo principal con gradiente metálico
const armGrad = ctx.createLinearGradient(0, 0, ax, ay);
armGrad.addColorStop(0, '#5a6a7a');
armGrad.addColorStop(0.5, '#3a4a5a');
armGrad.addColorStop(1, '#2a3a4a');
ctx.strokeStyle = armGrad;
ctx.lineWidth = 5;
ctx.lineCap = 'round';
ctx.beginPath();
ctx.moveTo(ax > 0 ? 12 : -12, ay > 0 ? 7 : -7);
ctx.lineTo(ax, ay);
ctx.stroke();

// Detalle de fibra de carbono
ctx.strokeStyle = 'rgba(100, 150, 200, 0.3)';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(ax > 0 ? 12 : -12, ay > 0 ? 7 : -7);
ctx.lineTo(ax, ay);
ctx.stroke();

// Motor
const motorGrad = ctx.createRadialGradient(ax, ay, 0, ax, ay, 9);
motorGrad.addColorStop(0, '#4a5a6a');
motorGrad.addColorStop(0.7, '#2a3a4a');
motorGrad.addColorStop(1, '#1a2a3a');
ctx.fillStyle = motorGrad;
ctx.beginPath();
ctx.arc(ax, ay, 9, 0, Math.PI * 2);
ctx.fill();

// Anillo del motor con LED
ctx.strokeStyle = `rgba(92,225,255,${0.7 + 0.3 * Math.sin(rotorA + idx)})`;
ctx.lineWidth = 2;
ctx.beginPath();
ctx.arc(ax, ay, 9, 0, Math.PI * 2);
ctx.stroke();

// Hélices con efecto de movimiento
ctx.save();
ctx.translate(ax, ay);
ctx.globalAlpha = 0.2;
ctx.fillStyle = 'rgba(200, 230, 255, 0.6)';
ctx.beginPath();
ctx.arc(0, 0, 18, 0, Math.PI * 2);
ctx.fill();
ctx.globalAlpha = 1;
ctx.rotate(rotorA * (idx % 2 === 0 ? 1 : -1));

// 2 palas de hélice
ctx.strokeStyle = 'rgba(255,255,255,0.9)';
ctx.lineWidth = 3;
ctx.lineCap = 'round';
ctx.beginPath();
ctx.moveTo(-16, 0); ctx.quadraticCurveTo(-8, -2, 0, 0);
ctx.stroke();
ctx.beginPath();
ctx.moveTo(16, 0); ctx.quadraticCurveTo(8, 2, 0, 0);
ctx.stroke();
ctx.rotate(Math.PI / 2);
ctx.beginPath();
ctx.moveTo(-16, 0); ctx.quadraticCurveTo(-8, -2, 0, 0);
ctx.stroke();
ctx.beginPath();
ctx.moveTo(16, 0); ctx.quadraticCurveTo(8, 2, 0, 0);
ctx.stroke();

// Centro de la hélice
ctx.fillStyle = '#1a2a3a';
ctx.beginPath();
ctx.arc(0, 0, 4, 0, Math.PI * 2);
ctx.fill();

// LED indicador en el motor
const ledColor = idx < 2 ? 'rgba(0, 255, 100,' : 'rgba(255, 50, 50,';
const ledBright = 0.6 + 0.4 * Math.sin(rotorA * 2 + idx);
ctx.fillStyle = `${ledColor}${ledBright})`;
ctx.beginPath();
ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
ctx.fill();

ctx.restore();
});

// Cuerpo principal del dron
ctx.fillStyle = 'rgba(0,0,0,0.5)';
ctx.beginPath();
ctx.roundRect(-24, -8, 48, 18, 5);
ctx.fill();

const bodyGrad = ctx.createLinearGradient(-22, -12, 22, 12);
bodyGrad.addColorStop(0, '#6a7a8a');
bodyGrad.addColorStop(0.3, '#4a5a6a');
bodyGrad.addColorStop(0.7, '#3a4a5a');
bodyGrad.addColorStop(1, '#2a3a4a');
ctx.fillStyle = bodyGrad;
ctx.beginPath();
ctx.roundRect(-22, -10, 44, 20, 6);
ctx.fill();

// Detalle de panel superior
ctx.strokeStyle = 'rgba(150, 200, 255, 0.4)';
ctx.lineWidth = 1.5;
ctx.beginPath();
ctx.roundRect(-22, -10, 44, 20, 6);
ctx.stroke();

// Líneas de ventilación
ctx.fillStyle = 'rgba(92, 225, 255, 0.1)';
ctx.beginPath();
ctx.roundRect(-18, -8, 36, 8, 3);
ctx.fill();
ctx.strokeStyle = 'rgba(92, 225, 255, 0.3)';
ctx.lineWidth = 0.8;
for (let i = -14; i <= 14; i += 7) {
ctx.beginPath();
ctx.moveTo(i, -7);
ctx.lineTo(i, -1);
ctx.stroke();
}

// Tanque de agua
const tankPct = drone.bucket / drone.maxBucket;
if (tankPct > 0) {
ctx.fillStyle = 'rgba(100, 200, 255, 0.15)';
ctx.beginPath();
ctx.roundRect(-16, 4, 32, 14, 4);
ctx.fill();

const waterGrad = ctx.createLinearGradient(-16, 4 + 14 * (1 - tankPct), -16, 18);
waterGrad.addColorStop(0, 'rgba(100, 200, 255, 0.8)');
waterGrad.addColorStop(1, 'rgba(52, 152, 219, 1)');
ctx.fillStyle = waterGrad;

const waveOffset = Math.sin(rotorA * 2) * 1;
ctx.beginPath();
ctx.moveTo(-15, 4 + 14 * (1 - tankPct) + waveOffset);
ctx.quadraticCurveTo(-7, 4 + 14 * (1 - tankPct) - waveOffset, 0, 4 + 14 * (1 - tankPct) + waveOffset * 0.5);
ctx.quadraticCurveTo(7, 4 + 14 * (1 - tankPct) - waveOffset * 0.5, 15, 4 + 14 * (1 - tankPct) + waveOffset);
ctx.lineTo(15, 17);
ctx.lineTo(-15, 17);
ctx.closePath();
ctx.fill();

ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
ctx.lineWidth = 1.5;
ctx.beginPath();
ctx.roundRect(-16, 4, 32, 14, 4);
ctx.stroke();
}

// LED principal frontal
const mainLedBright = 0.6 + 0.4 * Math.sin(rotorA * 3);
const mainLedGrad = ctx.createRadialGradient(0, -3, 0, 0, -3, 10);
mainLedGrad.addColorStop(0, `rgba(92, 225, 255, ${mainLedBright})`);
mainLedGrad.addColorStop(0.5, `rgba(0, 150, 255, ${mainLedBright * 0.5})`);
mainLedGrad.addColorStop(1, 'transparent');
ctx.fillStyle = mainLedGrad;
ctx.beginPath();
ctx.arc(0, -3, 10, 0, Math.PI * 2);
ctx.fill();

ctx.fillStyle = `rgba(92, 225, 255, ${mainLedBright})`;
ctx.beginPath();
ctx.arc(0, -3, 4, 0, Math.PI * 2);
ctx.fill();

// Antena
ctx.strokeStyle = '#5a6a7a';
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(0, -10);
ctx.lineTo(0, -18);
ctx.stroke();

const antLedBright = 0.5 + 0.5 * Math.sin(rotorA * 4);
ctx.fillStyle = `rgba(255, 100, 50, ${antLedBright})`;
ctx.beginPath();
ctx.arc(0, -18, 2, 0, Math.PI * 2);
ctx.fill();

// Cámara/sensor inferior
ctx.fillStyle = '#1a2a3a';
ctx.beginPath();
ctx.arc(0, 16, 5, 0, Math.PI * 2);
ctx.fill();
ctx.strokeStyle = 'rgba(92, 225, 255, 0.6)';
ctx.lineWidth = 1.5;
ctx.beginPath();
ctx.arc(0, 16, 5, 0, Math.PI * 2);
ctx.stroke();
ctx.fillStyle = `rgba(92, 225, 255, ${0.4 + 0.3 * Math.sin(rotorA * 2)})`;
ctx.beginPath();
ctx.arc(0, 16, 2.5, 0, Math.PI * 2);
ctx.fill();

ctx.restore();
}

// ============================================================
//  SISTEMA DE CRECIMIENTO REALISTA (5 ETAPAS)
// ============================================================
function getGrowthStage(health) {
if (health < 1) return 1;
if (health < 2) return 2;
if (health < 3) return 3;
if (health < 4) return 4;
return 5;
}

// ============================================================
//  DIBUJO DE PLANTAS ULTRA REALISTAS
// ============================================================
function drawRealisticPlant(ctx, type, x, y, size, health) {
const s = size / 40;
const hf = health / 5;
const stage = getGrowthStage(health);
ctx.save();
ctx.translate(x, y);

ctx.fillStyle = 'rgba(0,0,0,0.35)';
ctx.beginPath();
ctx.ellipse(0, size * 0.38, size * 0.32, size * 0.09, 0, 0, Math.PI * 2);
ctx.fill();

if (stage === 1) drawSprout(ctx, s, hf, type);
else if (stage === 2) drawSeedling(ctx, s, hf, type);
else if (stage === 3) drawGrowingPlant(ctx, s, hf, type);
else if (stage === 4) drawFloweringPlant(ctx, s, hf, type);
else drawMaturePlant(ctx, s, hf, type);

ctx.restore();
}

function drawSprout(ctx, s, hf, type) {
ctx.fillStyle = `rgba(${60+hf*30}, ${40+hf*20}, ${20+hf*10}, 0.6)`;
ctx.beginPath();
ctx.ellipse(0, 10*s, 6*s, 2*s, 0, 0, Math.PI * 2);
ctx.fill();
const stemGrad = ctx.createLinearGradient(-1*s, 10*s, 1*s, -2*s);
stemGrad.addColorStop(0, `rgb(${80+hf*40}, ${120+hf*60}, ${50+hf*30})`);
stemGrad.addColorStop(1, `rgb(${100+hf*50}, ${160+hf*70}, ${70+hf*40})`);
ctx.strokeStyle = stemGrad;
ctx.lineWidth = 1.5*s;
ctx.lineCap = 'round';
ctx.beginPath();
ctx.moveTo(0, 10*s);
ctx.quadraticCurveTo(0.5*s, 4*s, 0, -2*s);
ctx.stroke();
const leafGrad = ctx.createRadialGradient(-2*s, -2*s, 0, -2*s, -2*s, 3*s);
leafGrad.addColorStop(0, `rgb(${120+hf*60}, ${200+hf*55}, ${80+hf*40})`);
leafGrad.addColorStop(1, `rgb(${60+hf*30}, ${140+hf*40}, ${50+hf*20})`);
ctx.fillStyle = leafGrad;
ctx.beginPath();
ctx.ellipse(-2*s, -2*s, 2.5*s, 1.5*s, -0.4, 0, Math.PI * 2);
ctx.fill();
const leafGrad2 = ctx.createRadialGradient(2*s, -3*s, 0, 2*s, -3*s, 3*s);
leafGrad2.addColorStop(0, `rgb(${130+hf*60}, ${210+hf*50}, ${90+hf*40})`);
leafGrad2.addColorStop(1, `rgb(${70+hf*30}, ${150+hf*40}, ${60+hf*20})`);
ctx.fillStyle = leafGrad2;
ctx.beginPath();
ctx.ellipse(2*s, -3*s, 2.5*s, 1.5*s, 0.4, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = `rgba(255,255,255,${0.1+hf*0.1})`;
ctx.beginPath();
ctx.ellipse(-2*s, -2.5*s, 1*s, 0.5*s, -0.4, 0, Math.PI * 2);
ctx.fill();
}

function drawSeedling(ctx, s, hf, type) {
ctx.fillStyle = `rgba(${60+hf*30}, ${40+hf*20}, ${20+hf*10}, 0.5)`;
ctx.beginPath();
ctx.ellipse(0, 10*s, 7*s, 2.5*s, 0, 0, Math.PI * 2);
ctx.fill();
const stemGrad = ctx.createLinearGradient(-1*s, 10*s, 1*s, -8*s);
stemGrad.addColorStop(0, `rgb(${70+hf*30}, ${100+hf*40}, ${40+hf*20})`);
stemGrad.addColorStop(1, `rgb(${90+hf*40}, ${140+hf*50}, ${60+hf*30})`);
ctx.strokeStyle = stemGrad;
ctx.lineWidth = 2*s;
ctx.lineCap = 'round';
ctx.beginPath();
ctx.moveTo(0, 10*s);
ctx.quadraticCurveTo(0.5*s, 0, 0, -8*s);
ctx.stroke();
drawLeaf(ctx, s, hf, -4*s, 2*s, -0.5, 3.5*s, 2*s);
drawLeaf(ctx, s, hf, 4*s, 0, 0.5, 3.5*s, 2*s);
drawLeaf(ctx, s, hf, -3*s, -4*s, -0.6, 3*s, 1.8*s);
drawLeaf(ctx, s, hf, 3*s, -6*s, 0.6, 3*s, 1.8*s);
}

function drawGrowingPlant(ctx, s, hf, type) {
ctx.fillStyle = `rgba(${60+hf*30}, ${40+hf*20}, ${20+hf*10}, 0.5)`;
ctx.beginPath();
ctx.ellipse(0, 12*s, 9*s, 3*s, 0, 0, Math.PI * 2);
ctx.fill();
const trunkGrad = ctx.createLinearGradient(-2*s, 12*s, 2*s, -10*s);
trunkGrad.addColorStop(0, `rgb(${80+hf*20}, ${50+hf*15}, ${30+hf*10})`);
trunkGrad.addColorStop(0.5, `rgb(${90+hf*30}, ${70+hf*20}, ${40+hf*15})`);
trunkGrad.addColorStop(1, `rgb(${70+hf*25}, ${100+hf*40}, ${50+hf*20})`);
ctx.fillStyle = trunkGrad;
ctx.beginPath();
ctx.moveTo(-1.5*s, 12*s);
ctx.quadraticCurveTo(-2*s, 0, -1*s, -10*s);
ctx.lineTo(1*s, -10*s);
ctx.quadraticCurveTo(2*s, 0, 1.5*s, 12*s);
ctx.closePath();
ctx.fill();
drawBranch(ctx, s, hf, -1*s, 4*s, -0.8, 8*s);
drawBranch(ctx, s, hf, 1*s, 2*s, 0.8, 8*s);
drawBranch(ctx, s, hf, -0.5*s, -2*s, -0.6, 7*s);
drawBranch(ctx, s, hf, 0.5*s, -5*s, 0.6, 7*s);
ctx.fillStyle = `rgba(${200+hf*55}, ${220+hf*35}, ${100+hf*50}, 0.8)`;
for (let i = 0; i < 3; i++) {
const angle = (i / 3) * Math.PI * 2;
const cx = Math.cos(angle) * 5 * s;
const cy = -8 * s + Math.sin(angle) * 2 * s;
ctx.beginPath();
ctx.arc(cx, cy, 1.2*s, 0, Math.PI * 2);
ctx.fill();
}
}

function drawFloweringPlant(ctx, s, hf, type) {
ctx.fillStyle = `rgba(${60+hf*30}, ${40+hf*20}, ${20+hf*10}, 0.5)`;
ctx.beginPath();
ctx.ellipse(0, 12*s, 10*s, 3*s, 0, 0, Math.PI * 2);
ctx.fill();
const trunkGrad = ctx.createLinearGradient(-3*s, 12*s, 3*s, -12*s);
trunkGrad.addColorStop(0, `rgb(${90+hf*20}, ${60+hf*15}, ${35+hf*10})`);
trunkGrad.addColorStop(0.5, `rgb(${100+hf*25}, ${75+hf*20}, ${45+hf*15})`);
trunkGrad.addColorStop(1, `rgb(${80+hf*20}, ${90+hf*30}, ${50+hf*20})`);
ctx.fillStyle = trunkGrad;
ctx.beginPath();
ctx.moveTo(-2*s, 12*s);
ctx.quadraticCurveTo(-2.5*s, 0, -1.5*s, -12*s);
ctx.lineTo(1.5*s, -12*s);
ctx.quadraticCurveTo(2.5*s, 0, 2*s, 12*s);
ctx.closePath();
ctx.fill();
ctx.strokeStyle = `rgba(${60+hf*15}, ${40+hf*10}, ${20+hf*8}, 0.4)`;
ctx.lineWidth = 0.3*s;
for (let i = 0; i < 5; i++) {
const y = 10*s - i*4*s;
ctx.beginPath();
ctx.moveTo(-1.5*s, y);
ctx.quadraticCurveTo(0, y - 1*s, 1.5*s, y);
ctx.stroke();
}
drawBranch(ctx, s, hf, -1.5*s, 6*s, -0.9, 10*s);
drawBranch(ctx, s, hf, 1.5*s, 4*s, 0.9, 10*s);
drawBranch(ctx, s, hf, -1*s, 0, -0.7, 9*s);
drawBranch(ctx, s, hf, 1*s, -3*s, 0.7, 9*s);
drawBranch(ctx, s, hf, -0.5*s, -7*s, -0.5, 8*s);
drawBranch(ctx, s, hf, 0.5*s, -9*s, 0.5, 8*s);
drawFlowers(ctx, s, hf, type);
}

function drawMaturePlant(ctx, s, hf, type) {
ctx.fillStyle = `rgba(${60+hf*30}, ${40+hf*20}, ${20+hf*10}, 0.5)`;
ctx.beginPath();
ctx.ellipse(0, 12*s, 11*s, 3.5*s, 0, 0, Math.PI * 2);
ctx.fill();
const trunkGrad = ctx.createLinearGradient(-3*s, 12*s, 3*s, -12*s);
trunkGrad.addColorStop(0, `rgb(${100+hf*20}, ${70+hf*15}, ${40+hf*10})`);
trunkGrad.addColorStop(0.5, `rgb(${110+hf*25}, ${85+hf*20}, ${50+hf*15})`);
trunkGrad.addColorStop(1, `rgb(${90+hf*20}, ${100+hf*30}, ${55+hf*20})`);
ctx.fillStyle = trunkGrad;
ctx.beginPath();
ctx.moveTo(-2.5*s, 12*s);
ctx.quadraticCurveTo(-3*s, 0, -2*s, -12*s);
ctx.lineTo(2*s, -12*s);
ctx.quadraticCurveTo(3*s, 0, 2.5*s, 12*s);
ctx.closePath();
ctx.fill();
ctx.strokeStyle = `rgba(${60+hf*15}, ${40+hf*10}, ${20+hf*8}, 0.5)`;
ctx.lineWidth = 0.4*s;
for (let i = 0; i < 6; i++) {
const y = 10*s - i*4*s;
ctx.beginPath();
ctx.moveTo(-2*s, y);
ctx.quadraticCurveTo(0, y - 1.5*s, 2*s, y);
ctx.stroke();
}
drawBranch(ctx, s, hf, -2*s, 7*s, -1.0, 11*s);
drawBranch(ctx, s, hf, 2*s, 5*s, 1.0, 11*s);
drawBranch(ctx, s, hf, -1.5*s, 1*s, -0.8, 10*s);
drawBranch(ctx, s, hf, 1.5*s, -2*s, 0.8, 10*s);
drawBranch(ctx, s, hf, -1*s, -6*s, -0.6, 9*s);
drawBranch(ctx, s, hf, 1*s, -8*s, 0.6, 9*s);
drawFruit(ctx, s, hf, type);
}

function drawLeaf(ctx, s, hf, x, y, angle, length, width) {
ctx.save();
ctx.translate(x, y);
ctx.rotate(angle);
const leafGrad = ctx.createLinearGradient(0, 0, length, 0);
leafGrad.addColorStop(0, `rgb(${80+hf*40}, ${160+hf*60}, ${60+hf*30})`);
leafGrad.addColorStop(0.5, `rgb(${100+hf*50}, ${190+hf*60}, ${70+hf*40})`);
leafGrad.addColorStop(1, `rgb(${60+hf*30}, ${130+hf*40}, ${50+hf*20})`);
ctx.fillStyle = leafGrad;
ctx.beginPath();
ctx.moveTo(0, 0);
ctx.quadraticCurveTo(length * 0.5, -width, length, 0);
ctx.quadraticCurveTo(length * 0.5, width, 0, 0);
ctx.fill();
ctx.strokeStyle = `rgba(${40+hf*20}, ${80+hf*30}, ${30+hf*15}, 0.6)`;
ctx.lineWidth = 0.3*s;
ctx.beginPath();
ctx.moveTo(0, 0);
ctx.lineTo(length, 0);
ctx.stroke();
ctx.fillStyle = `rgba(255,255,255,${0.05+hf*0.1})`;
ctx.beginPath();
ctx.ellipse(length*0.4, -width*0.3, length*0.3, width*0.3, 0, 0, Math.PI * 2);
ctx.fill();
ctx.restore();
}

function drawBranch(ctx, s, hf, startX, startY, angle, length) {
ctx.save();
ctx.translate(startX, startY);
ctx.rotate(angle);
const branchGrad = ctx.createLinearGradient(0, 0, length, 0);
branchGrad.addColorStop(0, `rgb(${90+hf*20}, ${70+hf*15}, ${40+hf*10})`);
branchGrad.addColorStop(1, `rgb(${70+hf*20}, ${100+hf*30}, ${50+hf*15})`);
ctx.strokeStyle = branchGrad;
ctx.lineWidth = 1.5*s;
ctx.lineCap = 'round';
ctx.beginPath();
ctx.moveTo(0, 0);
ctx.quadraticCurveTo(length*0.5, -1*s, length, 0);
ctx.stroke();
drawLeaf(ctx, s, hf, length*0.3, -1*s, -0.3, 4*s, 2*s);
drawLeaf(ctx, s, hf, length*0.6, 1*s, 0.3, 4*s, 2*s);
drawLeaf(ctx, s, hf, length*0.9, -0.5*s, -0.4, 3.5*s, 1.8*s);
ctx.restore();
}

function drawFlowers(ctx, s, hf, type) {
const flowerPositions = [
{x: -6*s, y: -10*s}, {x: 6*s, y: -9*s},
{x: -4*s, y: -13*s}, {x: 4*s, y: -12*s},
{x: 0, y: -14*s}, {x: -8*s, y: -6*s}
];
flowerPositions.forEach(pos => {
for (let i = 0; i < 5; i++) {
const angle = (i / 5) * Math.PI * 2;
const px = pos.x + Math.cos(angle) * 2*s;
const py = pos.y + Math.sin(angle) * 2*s;
const petalGrad = ctx.createRadialGradient(px, py, 0, px, py, 1.8*s);
petalGrad.addColorStop(0, `rgba(255, 255, ${200+hf*55}, 0.9)`);
petalGrad.addColorStop(1, `rgba(255, 230, ${150+hf*50}, 0.7)`);
ctx.fillStyle = petalGrad;
ctx.beginPath();
ctx.ellipse(px, py, 1.5*s, 1*s, angle, 0, Math.PI * 2);
ctx.fill();
}
ctx.fillStyle = `rgb(255, ${200+hf*55}, 50)`;
ctx.beginPath();
ctx.arc(pos.x, pos.y, 0.8*s, 0, Math.PI * 2);
ctx.fill();
});
}

// ============================================================
//  FRUTAS MADURAS ESPECÍFICAS - TODAS LAS 20
// ============================================================
function drawFruit(ctx, s, hf, type) {
switch(type) {
case 'jocote': drawJocoteFruit(ctx, s, hf); break;
case 'mango': drawMangoFruit(ctx, s, hf); break;
case 'maranon': drawMaranonFruit(ctx, s, hf); break;
case 'mamon': drawMamonFruit(ctx, s, hf); break;
case 'zapote': drawZapoteFruit(ctx, s, hf); break;
case 'anona': drawAnonaFruit(ctx, s, hf); break;
case 'papaya': drawPapayaFruit(ctx, s, hf); break;
case 'coco': drawCocoFruit(ctx, s, hf); break;
case 'guayaba': drawGuayabaFruit(ctx, s, hf); break;
case 'nance': drawNanceFruit(ctx, s, hf); break;
case 'guanabana': drawGuanabanaFruit(ctx, s, hf); break;
case 'caimito': drawCaimitoFruit(ctx, s, hf); break;
case 'copinol': drawCopinolFruit(ctx, s, hf); break;
case 'paterna': drawPaternaFruit(ctx, s, hf); break;
case 'cincuya': drawCincuyaFruit(ctx, s, hf); break;
case 'tamarindo': drawTamarindoFruit(ctx, s, hf); break;
case 'arrayan': drawArrayanFruit(ctx, s, hf); break;
case 'mamey': drawMameyFruit(ctx, s, hf); break;
case 'maracuya': drawMaracuyaFruit(ctx, s, hf); break;
case 'pitaya': drawPitayaFruit(ctx, s, hf); break;
}
}

function drawJocoteFruit(ctx, s, hf) {
const positions = [[-5,-11],[5,-10],[-3,-13],[3,-12],[0,-14]];
positions.forEach(([px,py]) => {
ctx.strokeStyle = `rgb(${80+hf*20}, ${60+hf*15}, 30)`;
ctx.lineWidth = 0.5*s;
ctx.beginPath();
ctx.moveTo(px*s*0.8, py*s*0.8);
ctx.lineTo(px*s*0.8, (py+2)*s*0.8);
ctx.stroke();
const jocGrad = ctx.createRadialGradient((px-0.5)*s, (py-0.5)*s, 0, px*s, py*s, 3*s);
jocGrad.addColorStop(0, `rgb(255, ${220+hf*35}, ${100+hf*50})`);
jocGrad.addColorStop(0.6, `rgb(255, ${150+hf*40}, ${50+hf*30})`);
jocGrad.addColorStop(1, `rgb(${200+hf*30}, ${80+hf*20}, 30)`);
ctx.fillStyle = jocGrad;
ctx.beginPath();
ctx.ellipse(px*s, py*s, 2.5*s, 3*s, 0, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = `rgba(255,255,255,${0.2+hf*0.2})`;
ctx.beginPath();
ctx.ellipse((px-0.8)*s, (py-1)*s, 0.8*s, 0.5*s, -0.3, 0, Math.PI * 2);
ctx.fill();
});
}

function drawMangoFruit(ctx, s, hf) {
const positions = [[-4,-10],[4,-11],[0,-13]];
positions.forEach(([px,py]) => {
ctx.strokeStyle = `rgb(${80+hf*20}, ${60+hf*15}, 30)`;
ctx.lineWidth = 0.8*s;
ctx.beginPath();
ctx.moveTo(px*s, (py-3)*s);
ctx.lineTo(px*s, py*s);
ctx.stroke();
const mangoGrad = ctx.createRadialGradient((px-1.5)*s, (py-1)*s, 0, px*s, py*s, 5*s);
mangoGrad.addColorStop(0, `rgb(255, ${230+hf*25}, ${120+hf*50})`);
mangoGrad.addColorStop(0.5, `rgb(255, ${180+hf*40}, ${60+hf*40})`);
mangoGrad.addColorStop(0.8, `rgb(255, ${120+hf*40}, ${40+hf*30})`);
mangoGrad.addColorStop(1, `rgb(${200+hf*30}, ${60+hf*20}, 20)`);
ctx.fillStyle = mangoGrad;
ctx.beginPath();
ctx.ellipse(px*s, py*s, 4*s, 5*s, 0.2, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = `rgba(${200+hf*30}, ${50+hf*20}, ${30+hf*15}, ${0.3+hf*0.2})`;
ctx.beginPath();
ctx.ellipse((px+1.5)*s, (py-1)*s, 1.5*s, 2*s, 0.3, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = `rgba(255,255,255,${0.25+hf*0.15})`;
ctx.beginPath();
ctx.ellipse((px-1.5)*s, (py-2)*s, 1.5*s, 0.8*s, -0.3, 0, Math.PI * 2);
ctx.fill();
});
}

function drawMaranonFruit(ctx, s, hf) {
const positions = [[-4,-10],[4,-11]];
positions.forEach(([px,py]) => {
const fruitGrad = ctx.createRadialGradient((px-1)*s, (py-1)*s, 0, px*s, py*s, 4*s);
fruitGrad.addColorStop(0, `rgb(255, ${180+hf*50}, ${100+hf*50})`);
fruitGrad.addColorStop(0.7, `rgb(255, ${120+hf*40}, ${60+hf*30})`);
fruitGrad.addColorStop(1, `rgb(${200+hf*30}, ${60+hf*20}, 30)`);
ctx.fillStyle = fruitGrad;
ctx.beginPath();
ctx.ellipse(px*s, py*s, 3.5*s, 4*s, 0, 0, Math.PI * 2);
ctx.fill();
ctx.strokeStyle = `rgb(${80+hf*20}, ${60+hf*15}, 30)`;
ctx.lineWidth = 0.5*s;
ctx.beginPath();
ctx.moveTo(px*s, (py+4)*s);
ctx.lineTo(px*s, (py+6)*s);
ctx.stroke();
const nutGrad = ctx.createRadialGradient((px-0.5)*s, (py+7)*s, 0, px*s, (py+7)*s, 2*s);
nutGrad.addColorStop(0, `rgb(${150+hf*40}, ${120+hf*30}, ${80+hf*20})`);
nutGrad.addColorStop(1, `rgb(${80+hf*20}, ${60+hf*15}, 40)`);
ctx.fillStyle = nutGrad;
ctx.beginPath();
ctx.ellipse(px*s, (py+7)*s, 1.8*s, 2.5*s, 0, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = `rgba(255,255,255,${0.2+hf*0.15})`;
ctx.beginPath();
ctx.ellipse((px-1)*s, (py-1.5)*s, 1*s, 0.6*s, -0.3, 0, Math.PI * 2);
ctx.fill();
});
}

function drawMamonFruit(ctx, s, hf) {
const positions = [[-5,-10],[-2,-12],[2,-11],[5,-13],[0,-14],[-3,-8],[3,-9]];
positions.forEach(([px,py]) => {
const mamGrad = ctx.createRadialGradient((px-0.5)*s, (py-0.5)*s, 0, px*s, py*s, 2.5*s);
mamGrad.addColorStop(0, `rgb(${150+hf*50}, ${220+hf*35}, ${120+hf*40})`);
mamGrad.addColorStop(0.7, `rgb(${100+hf*30}, ${180+hf*40}, ${80+hf*30})`);
mamGrad.addColorStop(1, `rgb(${60+hf*20}, ${120+hf*30}, ${50+hf*20})`);
ctx.fillStyle = mamGrad;
ctx.beginPath();
ctx.ellipse(px*s, py*s, 2*s, 2.5*s, 0, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = `rgba(255,255,255,${0.15+hf*0.15})`;
ctx.beginPath();
ctx.ellipse((px-0.5)*s, (py-0.8)*s, 0.7*s, 0.4*s, -0.3, 0, Math.PI * 2);
ctx.fill();
});
}

function drawZapoteFruit(ctx, s, hf) {
const positions = [[-4,-10],[4,-11],[0,-13]];
positions.forEach(([px,py]) => {
const zapGrad = ctx.createRadialGradient((px-1)*s, (py-1)*s, 0, px*s, py*s, 4*s);
zapGrad.addColorStop(0, `rgb(${180+hf*40}, ${130+hf*30}, ${80+hf*25})`);
zapGrad.addColorStop(0.6, `rgb(${140+hf*30}, ${90+hf*20}, ${50+hf*15})`);
zapGrad.addColorStop(1, `rgb(${90+hf*20}, ${55+hf*15}, ${30+hf*10})`);
ctx.fillStyle = zapGrad;
ctx.beginPath();
ctx.ellipse(px*s, py*s, 3.5*s, 4*s, 0, 0, Math.PI * 2);
ctx.fill();
ctx.strokeStyle = `rgba(${60+hf*15}, ${40+hf*10}, 20, 0.4)`;
ctx.lineWidth = 0.3*s;
for (let i = 0; i < 4; i++) {
const angle = (i / 4) * Math.PI * 2;
ctx.beginPath();
ctx.arc(px*s, py*s, (2+i*0.5)*s, angle, angle + 0.5);
ctx.stroke();
}
ctx.fillStyle = `rgba(255,255,255,${0.15+hf*0.1})`;
ctx.beginPath();
ctx.ellipse((px-1)*s, (py-1.5)*s, 1*s, 0.6*s, -0.3, 0, Math.PI * 2);
ctx.fill();
});
}

function drawAnonaFruit(ctx, s, hf) {
const positions = [[-4,-10],[4,-11]];
positions.forEach(([px,py]) => {
const anoGrad = ctx.createRadialGradient((px-1)*s, (py-1)*s, 0, px*s, py*s, 5*s);
anoGrad.addColorStop(0, `rgb(${180+hf*50}, ${220+hf*35}, ${140+hf*40})`);
anoGrad.addColorStop(0.6, `rgb(${120+hf*30}, ${170+hf*40}, ${90+hf*30})`);
anoGrad.addColorStop(1, `rgb(${70+hf*20}, ${110+hf*30}, ${60+hf*20})`);
ctx.fillStyle = anoGrad;
ctx.beginPath();
ctx.ellipse(px*s, py*s, 4*s, 5*s, 0, 0, Math.PI * 2);
ctx.fill();
ctx.strokeStyle = `rgba(${200+hf*55}, ${230+hf*25}, ${180+hf*40}, ${0.5+hf*0.2})`;
ctx.lineWidth = 0.5*s;
for (let i = 0; i < 8; i++) {
const angle = (i / 8) * Math.PI * 2;
const r = 3.5*s;
const cx = px*s + Math.cos(angle) * r;
const cy = py*s + Math.sin(angle) * r * 1.2;
ctx.beginPath();
ctx.arc(cx, cy, 1.2*s, 0, Math.PI);
ctx.stroke();
}
ctx.fillStyle = `rgba(255,255,255,${0.2+hf*0.15})`;
ctx.beginPath();
ctx.ellipse((px-1.5)*s, (py-2)*s, 1.2*s, 0.7*s, -0.3, 0, Math.PI * 2);
ctx.fill();
});
}

function drawPapayaFruit(ctx, s, hf) {
const positions = [[-3,-9],[3,-10]];
positions.forEach(([px,py]) => {
const papGrad = ctx.createRadialGradient((px-1.5)*s, (py-2)*s, 0, px*s, py*s, 6*s);
papGrad.addColorStop(0, `rgb(255, ${220+hf*35}, ${120+hf*50})`);
papGrad.addColorStop(0.5, `rgb(255, ${180+hf*40}, ${80+hf*40})`);
papGrad.addColorStop(0.8, `rgb(255, ${140+hf*40}, ${50+hf*30})`);
papGrad.addColorStop(1, `rgb(${220+hf*30}, ${100+hf*20}, 30)`);
ctx.fillStyle = papGrad;
ctx.beginPath();
ctx.ellipse(px*s, py*s, 4.5*s, 6*s, 0, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = `rgba(255,255,255,${0.25+hf*0.15})`;
ctx.beginPath();
ctx.ellipse((px-2)*s, (py-3)*s, 1.5*s, 0.8*s, -0.3, 0, Math.PI * 2);
ctx.fill();
});
}

function drawCocoFruit(ctx, s, hf) {
const positions = [[-3,-10],[3,-11],[0,-13]];
positions.forEach(([px,py]) => {
const cocoGrad = ctx.createRadialGradient((px-1)*s, (py-1)*s, 0, px*s, py*s, 4*s);
cocoGrad.addColorStop(0, `rgb(${150+hf*30}, ${110+hf*25}, ${70+hf*20})`);
cocoGrad.addColorStop(0.6, `rgb(${110+hf*20}, ${75+hf*15}, ${45+hf*10})`);
cocoGrad.addColorStop(1, `rgb(${70+hf*15}, ${45+hf*10}, ${25+hf*8})`);
ctx.fillStyle = cocoGrad;
ctx.beginPath();
ctx.ellipse(px*s, py*s, 3.5*s, 4*s, 0, 0, Math.PI * 2);
ctx.fill();
ctx.strokeStyle = `rgba(${100+hf*20}, ${70+hf*15}, ${40+hf*10}, 0.6)`;
ctx.lineWidth = 0.4*s;
for (let i = 0; i < 12; i++) {
const angle = (i / 12) * Math.PI * 2;
const r1 = 2.5*s;
const r2 = 4*s;
ctx.beginPath();
ctx.moveTo(px*s + Math.cos(angle)*r1, py*s + Math.sin(angle)*r1);
ctx.lineTo(px*s + Math.cos(angle)*r2, py*s + Math.sin(angle)*r2);
ctx.stroke();
}
ctx.fillStyle = `rgb(${40+hf*10}, ${25+hf*8}, 15)`;
ctx.beginPath(); ctx.arc((px-1)*s, (py-1)*s, 0.7*s, 0, Math.PI*2); ctx.fill();
ctx.beginPath(); ctx.arc((px+1)*s, (py-1)*s, 0.7*s, 0, Math.PI*2); ctx.fill();
ctx.beginPath(); ctx.arc(px*s, (py+0.5)*s, 0.6*s, 0, Math.PI*2); ctx.fill();
});
}

function drawGuayabaFruit(ctx, s, hf) {
const positions = [[-4,-10],[4,-11],[0,-13]];
positions.forEach(([px,py]) => {
const guaGrad = ctx.createRadialGradient((px-1)*s, (py-1)*s, 0, px*s, py*s, 3.5*s);
guaGrad.addColorStop(0, `rgb(${220+hf*35}, ${230+hf*25}, ${130+hf*50})`);
guaGrad.addColorStop(0.6, `rgb(${180+hf*40}, ${200+hf*30}, ${90+hf*40})`);
guaGrad.addColorStop(1, `rgb(${120+hf*30}, ${150+hf*30}, ${60+hf*20})`);
ctx.fillStyle = guaGrad;
ctx.beginPath();
ctx.ellipse(px*s, py*s, 3*s, 3.5*s, 0, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = `rgb(${80+hf*30}, ${160+hf*40}, ${60+hf*25})`;
ctx.beginPath();
ctx.ellipse(px*s, (py-3.5)*s, 1.2*s, 0.6*s, 0.3, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = `rgba(255,255,255,${0.2+hf*0.15})`;
ctx.beginPath();
ctx.ellipse((px-1)*s, (py-1.5)*s, 0.9*s, 0.5*s, -0.3, 0, Math.PI * 2);
ctx.fill();
});
}

function drawNanceFruit(ctx, s, hf) {
const positions = [];
for (let i = 0; i < 15; i++) {
const angle = (i / 15) * Math.PI * 2;
const r = 4 + (i % 3) * 2;
positions.push([Math.cos(angle) * r, -10 + Math.sin(angle) * r * 0.5]);
}
positions.forEach(([px,py]) => {
const nanGrad = ctx.createRadialGradient((px-0.3)*s, (py-0.3)*s, 0, px*s, py*s, 1.5*s);
nanGrad.addColorStop(0, `rgb(255, ${240+hf*15}, ${150+hf*50})`);
nanGrad.addColorStop(0.7, `rgb(255, ${200+hf*30}, ${100+hf*50})`);
nanGrad.addColorStop(1, `rgb(${220+hf*30}, ${150+hf*30}, ${60+hf*20})`);
ctx.fillStyle = nanGrad;
ctx.beginPath();
ctx.arc(px*s, py*s, 1.2*s, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = `rgba(255,255,255,${0.2+hf*0.15})`;
ctx.beginPath();
ctx.arc((px-0.3)*s, (py-0.4)*s, 0.4*s, 0, Math.PI * 2);
ctx.fill();
});
}

function drawGuanabanaFruit(ctx, s, hf) {
const px = 0, py = -10;
const guaGrad = ctx.createRadialGradient((px-2)*s, (py-2)*s, 0, px*s, py*s, 7*s);
guaGrad.addColorStop(0, `rgb(${180+hf*50}, ${220+hf*35}, ${150+hf*40})`);
guaGrad.addColorStop(0.6, `rgb(${120+hf*30}, ${170+hf*40}, ${100+hf*30})`);
guaGrad.addColorStop(1, `rgb(${70+hf*20}, ${110+hf*30}, ${60+hf*20})`);
ctx.fillStyle = guaGrad;
ctx.beginPath();
ctx.ellipse(px*s, py*s, 5.5*s, 7*s, 0, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = `rgba(${200+hf*55}, ${230+hf*25}, ${180+hf*40}, ${0.5+hf*0.2})`;
for (let i = 0; i < 20; i++) {
const angle = (i / 20) * Math.PI * 2;
const r = 5*s;
const cx = px*s + Math.cos(angle) * r;
const cy = py*s + Math.sin(angle) * r * 1.2;
ctx.beginPath();
ctx.arc(cx, cy, 0.6*s, 0, Math.PI * 2);
ctx.fill();
}
ctx.fillStyle = `rgba(255,255,255,${0.2+hf*0.15})`;
ctx.beginPath();
ctx.ellipse((px-2)*s, (py-3)*s, 1.5*s, 0.8*s, -0.3, 0, Math.PI * 2);
ctx.fill();
}

function drawCaimitoFruit(ctx, s, hf) {
const positions = [[-4,-10],[4,-11]];
positions.forEach(([px,py]) => {
const caiGrad = ctx.createRadialGradient((px-1)*s, (py-1)*s, 0, px*s, py*s, 4*s);
caiGrad.addColorStop(0, `rgb(${200+hf*55}, ${130+hf*60}, ${220+hf*35})`);
caiGrad.addColorStop(0.6, `rgb(${140+hf*30}, ${70+hf*30}, ${170+hf*40})`);
caiGrad.addColorStop(1, `rgb(${80+hf*20}, ${30+hf*15}, ${110+hf*25})`);
ctx.fillStyle = caiGrad;
ctx.beginPath();
ctx.ellipse(px*s, py*s, 3.5*s, 4*s, 0, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = `rgba(255,255,255,${0.3+hf*0.2})`;
ctx.beginPath();
ctx.ellipse((px-1.2)*s, (py-1.8)*s, 1.2*s, 0.7*s, -0.3, 0, Math.PI * 2);
ctx.fill();
});
}

function drawCopinolFruit(ctx, s, hf) {
const positions = [[-3,-10],[3,-11]];
positions.forEach(([px,py]) => {
const copGrad = ctx.createRadialGradient((px-1)*s, (py-1)*s, 0, px*s, py*s, 4*s);
copGrad.addColorStop(0, `rgb(${160+hf*30}, ${120+hf*25}, ${70+hf*20})`);
copGrad.addColorStop(0.6, `rgb(${110+hf*20}, ${75+hf*15}, ${40+hf*10})`);
copGrad.addColorStop(1, `rgb(${70+hf*15}, ${45+hf*10}, ${25+hf*8})`);
ctx.fillStyle = copGrad;
ctx.beginPath();
ctx.ellipse(px*s, py*s, 3.5*s, 4.5*s, 0, 0, Math.PI * 2);
ctx.fill();
ctx.strokeStyle = `rgba(${50+hf*10}, ${30+hf*8}, 15, 0.6)`;
ctx.lineWidth = 0.4*s;
for (let i = 0; i < 5; i++) {
ctx.beginPath();
ctx.arc(px*s, py*s, (1.5+i*0.7)*s, 0, Math.PI * 2);
ctx.stroke();
}
});
}

function drawPaternaFruit(ctx, s, hf) {
const positions = [[-3,-10],[3,-11],[0,-13]];
positions.forEach(([px,py]) => {
const patGrad = ctx.createLinearGradient((px-2)*s, (py-4)*s, (px+2)*s, (py+4)*s);
patGrad.addColorStop(0, `rgb(${110+hf*25}, ${75+hf*20}, ${45+hf*15})`);
patGrad.addColorStop(1, `rgb(${70+hf*15}, ${45+hf*10}, ${25+hf*8})`);
ctx.fillStyle = patGrad;
ctx.beginPath();
ctx.ellipse(px*s, py*s, 2.5*s, 5*s, 0.2, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = `rgba(255,255,255,${0.7+hf*0.2})`;
for (let i = 0; i < 3; i++) {
ctx.beginPath();
ctx.arc(px*s, (py-2+i*2)*s, 0.8*s, 0, Math.PI * 2);
ctx.fill();
}
});
}

function drawCincuyaFruit(ctx, s, hf) {
const positions = [[-4,-10],[4,-11]];
positions.forEach(([px,py]) => {
const cinGrad = ctx.createRadialGradient((px-1)*s, (py-1)*s, 0, px*s, py*s, 4*s);
cinGrad.addColorStop(0, `rgb(${200+hf*55}, ${220+hf*35}, ${160+hf*40})`);
cinGrad.addColorStop(0.6, `rgb(${140+hf*30}, ${170+hf*40}, ${100+hf*30})`);
cinGrad.addColorStop(1, `rgb(${90+hf*20}, ${120+hf*30}, ${70+hf*20})`);
ctx.fillStyle = cinGrad;
ctx.beginPath();
ctx.ellipse(px*s, py*s, 3.5*s, 4*s, 0, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = `rgba(255,255,255,${0.2+hf*0.15})`;
ctx.beginPath();
ctx.ellipse((px-1)*s, (py-1.5)*s, 1*s, 0.6*s, -0.3, 0, Math.PI * 2);
ctx.fill();
});
}

function drawTamarindoFruit(ctx, s, hf) {
const positions = [[-4,-10],[4,-11],[0,-13]];
positions.forEach(([px,py]) => {
ctx.strokeStyle = `rgb(${130+hf*30}, ${85+hf*20}, ${45+hf*15})`;
ctx.lineWidth = 2.5*s;
ctx.lineCap = 'round';
ctx.beginPath();
ctx.moveTo((px-2)*s, (py-3)*s);
ctx.quadraticCurveTo((px-2.5)*s, py*s, px*s, (py+1)*s);
ctx.quadraticCurveTo((px+2)*s, (py+2)*s, (px+2)*s, py*s);
ctx.stroke();
ctx.fillStyle = `rgba(${90+hf*20}, ${55+hf*15}, 30, 0.5)`;
for (let i = 0; i < 5; i++) {
const t = i / 5;
const cx = (px-2)*s + t*4*s;
const cy = (py-3)*s + t*4*s + Math.sin(t*Math.PI)*1.5*s;
ctx.beginPath();
ctx.arc(cx, cy, 0.6*s, 0, Math.PI * 2);
ctx.fill();
}
});
}

function drawArrayanFruit(ctx, s, hf) {
const positions = [];
for (let i = 0; i < 12; i++) {
const angle = (i / 12) * Math.PI * 2;
const r = 3 + (i % 2) * 1.5;
positions.push([Math.cos(angle) * r, -10 + Math.sin(angle) * r * 0.5]);
}
positions.forEach(([px,py]) => {
const arrGrad = ctx.createRadialGradient((px-0.3)*s, (py-0.3)*s, 0, px*s, py*s, 1.5*s);
arrGrad.addColorStop(0, `rgb(255, ${120+hf*60}, ${100+hf*50})`);
arrGrad.addColorStop(0.7, `rgb(220, ${60+hf*30}, ${60+hf*30})`);
arrGrad.addColorStop(1, `rgb(${160+hf*30}, 30, 30)`);
ctx.fillStyle = arrGrad;
ctx.beginPath();
ctx.arc(px*s, py*s, 1.3*s, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = `rgba(255,255,255,${0.2+hf*0.15})`;
ctx.beginPath();
ctx.arc((px-0.3)*s, (py-0.4)*s, 0.4*s, 0, Math.PI * 2);
ctx.fill();
});
}

function drawMameyFruit(ctx, s, hf) {
const positions = [[-3,-10],[3,-11]];
positions.forEach(([px,py]) => {
const mamGrad = ctx.createRadialGradient((px-1.5)*s, (py-2)*s, 0, px*s, py*s, 5*s);
mamGrad.addColorStop(0, `rgb(255, ${170+hf*50}, ${100+hf*50})`);
mamGrad.addColorStop(0.5, `rgb(240, ${120+hf*40}, ${60+hf*30})`);
mamGrad.addColorStop(0.8, `rgb(${200+hf*30}, ${80+hf*25}, ${40+hf*15})`);
mamGrad.addColorStop(1, `rgb(${140+hf*20}, ${50+hf*15}, 25)`);
ctx.fillStyle = mamGrad;
ctx.beginPath();
ctx.ellipse(px*s, py*s, 4*s, 5.5*s, 0, 0, Math.PI * 2);
ctx.fill();
ctx.strokeStyle = `rgba(${100+hf*20}, ${50+hf*10}, 20, 0.4)`;
ctx.lineWidth = 0.3*s;
for (let i = 0; i < 6; i++) {
const y = (py-4)*s + i*1.5*s;
ctx.beginPath();
ctx.moveTo((px-3)*s, y);
ctx.lineTo((px+3)*s, y);
ctx.stroke();
}
ctx.fillStyle = `rgba(255,255,255,${0.2+hf*0.15})`;
ctx.beginPath();
ctx.ellipse((px-1.5)*s, (py-2.5)*s, 1.2*s, 0.7*s, -0.3, 0, Math.PI * 2);
ctx.fill();
});
}

function drawMaracuyaFruit(ctx, s, hf) {
const positions = [[-4,-10],[4,-11],[0,-13]];
positions.forEach(([px,py]) => {
const marGrad = ctx.createRadialGradient((px-1)*s, (py-1)*s, 0, px*s, py*s, 4*s);
marGrad.addColorStop(0, `rgb(255, ${230+hf*25}, ${130+hf*50})`);
marGrad.addColorStop(0.6, `rgb(240, ${180+hf*40}, ${80+hf*40})`);
marGrad.addColorStop(1, `rgb(${180+hf*30}, ${100+hf*25}, ${40+hf*15})`);
ctx.fillStyle = marGrad;
ctx.beginPath();
ctx.ellipse(px*s, py*s, 3.5*s, 4*s, 0, 0, Math.PI * 2);
ctx.fill();
ctx.strokeStyle = `rgba(${150+hf*30}, ${80+hf*20}, ${30+hf*10}, 0.3)`;
ctx.lineWidth = 0.3*s;
for (let i = 0; i < 4; i++) {
const y = (py-2)*s + i*1.5*s;
ctx.beginPath();
ctx.moveTo((px-2.5)*s, y);
ctx.quadraticCurveTo(px*s, y + 0.5*s, (px+2.5)*s, y);
ctx.stroke();
}
ctx.fillStyle = `rgba(255,255,255,${0.25+hf*0.15})`;
ctx.beginPath();
ctx.ellipse((px-1.2)*s, (py-1.8)*s, 1*s, 0.6*s, -0.3, 0, Math.PI * 2);
ctx.fill();
});
}

function drawPitayaFruit(ctx, s, hf) {
const positions = [[-4,-10],[4,-11]];
positions.forEach(([px,py]) => {
const pitGrad = ctx.createRadialGradient((px-1)*s, (py-1)*s, 0, px*s, py*s, 5*s);
pitGrad.addColorStop(0, `rgb(255, ${150+hf*60}, ${200+hf*55})`);
pitGrad.addColorStop(0.6, `rgb(230, ${80+hf*40}, ${160+hf*50})`);
pitGrad.addColorStop(1, `rgb(${180+hf*30}, ${40+hf*20}, ${120+hf*30})`);
ctx.fillStyle = pitGrad;
ctx.beginPath();
ctx.ellipse(px*s, py*s, 4*s, 5*s, 0, 0, Math.PI * 2);
ctx.fill();
ctx.fillStyle = `rgb(${100+hf*40}, ${200+hf*55}, ${100+hf*40})`;
for (let i = 0; i < 12; i++) {
const angle = (i / 12) * Math.PI * 2;
const r = 4*s;
const cx = px*s + Math.cos(angle) * r;
const cy = py*s + Math.sin(angle) * r * 1.2;
ctx.beginPath();
ctx.moveTo(cx, cy);
ctx.lineTo(cx + Math.cos(angle) * 2*s, cy + Math.sin(angle) * 2*s);
ctx.lineTo(cx + Math.cos(angle + 0.4) * 1.2*s, cy + Math.sin(angle + 0.4) * 1.2*s);
ctx.closePath();
ctx.fill();
}
ctx.fillStyle = `rgba(255,255,255,${0.25+hf*0.2})`;
ctx.beginPath();
ctx.ellipse((px-1.5)*s, (py-2)*s, 1.3*s, 0.7*s, -0.3, 0, Math.PI * 2);
ctx.fill();
});
}

// ============================================================
//  FOTOS REALES DE LAS FRUTAS (Wikipedia, con caché local)
// ============================================================
const WIKI_TITULOS = {
jocote:['Spondias purpurea', 'Jocote'],
mango:['Mangifera indica', 'Mango'],
maranon:['Anacardium occidentale', 'Marañón'],
mamon:['Melicoccus bijugatus', 'Mamón'],
zapote:['Manilkara zapota', 'Níspero (Manilkara zapota)'],
anona:['Annona squamosa', 'Anona'],
papaya:['Carica papaya', 'Papaya'],
coco:['Cocos nucifera', 'Coco'],
guayaba:['Psidium guajava', 'Guayaba'],
nance:['Byrsonima crassifolia', 'Nance'],
guanabana:['Annona muricata', 'Guanábana'],
caimito:['Chrysophyllum cainito', 'Caimito'],
copinol:['Sterculia apetala', 'Copinol'],
paterna:['Inga paterno', 'Paterna'],
cincuya:['Annona diversifolia', 'Cincuya'],
tamarindo:['Tamarindus indica', 'Tamarindo'],
arrayan:['Eugenia', 'Arrayán'],
mamey:['Pouteria sapota', 'Mamey'],
maracuya:['Passiflora edulis', 'Maracuyá'],
pitaya:['Hylocereus undatus', 'Pitaya']
};
const FOTOS_KEY = 'agrobot_fotos_v1';
let fotosCache = {};
try { fotosCache = JSON.parse(localStorage.getItem(FOTOS_KEY) || '{}'); } catch (e) { fotosCache = {}; }
function guardarFotos() { try { localStorage.setItem(FOTOS_KEY, JSON.stringify(fotosCache)); } catch (e) {} }

async function urlFotoFruta(tipo) {
if (Object.prototype.hasOwnProperty.call(fotosCache, tipo)) return fotosCache[tipo];
const titulos = WIKI_TITULOS[tipo] || [PLANT_NAMES[tipo] || tipo];
for (const t of titulos) {
try {
const r = await fetch('https://es.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(t));
if (!r.ok) continue;
const d = await r.json();
const u = (d.thumbnail && d.thumbnail.source) || (d.originalimage && d.originalimage.source);
if (u) { fotosCache[tipo] = u; guardarFotos(); return u; }
} catch (e) { /* sin internet: nos quedamos con el emoji */ }
}
fotosCache[tipo] = null;
guardarFotos();
return null;
}

function pintarFotoFruta(el, tipo) {
if (!el) return;
el.innerHTML = `<span class="foto-emoji">${PLANT_EMOJI[tipo] || '🍎'}</span>`;
el.dataset.tipo = tipo;
urlFotoFruta(tipo).then(u => {
if (u && el.dataset.tipo === tipo) {
const img = new Image();
img.alt = PLANT_NAMES[tipo] || tipo;
img.onload = () => { if (el.dataset.tipo === tipo) { el.innerHTML = ''; el.appendChild(img); } };
img.src = u;
}
});
}

function precargarFotos(lista) {
(lista || []).slice(0, 8).forEach(t => { urlFotoFruta(t); });
}

// ============================================================
//  MONEDAS
// ============================================================
function pintarMonedas() {
const h = document.getElementById('hud-coins'); if (h) h.textContent = coins;
const sc = document.getElementById('shop-coins'); if (sc) sc.textContent = coins;
}
function setCoins(n) {
coins = Math.max(0, Math.round(n));
if (currentUser) { currentUser.coins = coins; saveUserData(currentUser); }
pintarMonedas();
}
function addCoins(n, motivo) {
if (n <= 0) return;
setCoins(coins + n);
if (motivo) showToast(`🪙 +${n} · ${motivo}`);
}
function spendCoins(n) {
if (coins < n) { showToast(`🪙 Te faltan ${n - coins} monedas`, true); return false; }
setCoins(coins - n);
return true;
}
function bonoDeInicio() {
// Al iniciar sesión siempre se regalan monedas para empezar a comprar
return ECONOMIA.monedasInicio;
}

// ============================================================
//  AIDEN VA EXPLICANDO CADA COSA (una vez por partida)
// ============================================================
let explicado = {};
function explicar(clave, texto) {
if (explicado[clave]) return false;
explicado[clave] = true;
aidenSpeak(texto);
return true;
}

function explicarContexto(cell) {
if (!cell || gameState !== 'game') return;
if (cell.isDepot) {
explicar('depot', `Este es el depósito de agua 💧. Párate aquí y pulsa E para llenar la cubeta del dron. Cabe ${drone.maxBucket} de agua y cada riego gasta 1.`);
} else if (cell.locked) {
explicar('locked', `Este lugar tiene un candado 🔒: todavía no hay maceta. Pulsa B para comprarla por ${ECONOMIA.precioMaceta} monedas. En total puedes llegar a ${MAX_PARCELAS} macetas.`);
} else if (cell.isEmpty) {
explicar('maceta', `Esta maceta 🪴 está vacía. Pulsa R y te muestro las frutas que faltan; la que elijas cuesta ${ECONOMIA.precioPlanta} monedas. Ninguna fruta se repite en el huerto.`);
} else {
explicar('planta', `Esta es una planta. La barra de abajo es su salud ❤️: si se pone roja, se está muriendo. Pulsa E para regarla y ganas ${ECONOMIA.porRiego} monedas, o ${ECONOMIA.porRescate} si la salvas a tiempo.`);
if (cell.health < 2) explicar('peligro', `⚠️ ${PLANT_NAMES[cell.type]} está en peligro. Riégala ya: salvarla te da ${ECONOMIA.porRescate} monedas y suma a tu misión.`);
}
if (drone.bucket === 0) explicar('sinagua', 'Te quedaste sin agua. Vuelve al depósito en (0,0) y pulsa E, o compra una recarga a distancia en la tienda (ESC).');
}

// ============================================================
//  MISIÓN (depende de la edad del jugador)
// ============================================================
function iniciarMision() {
const m = getAgeMode(currentUser ? currentUser.age : 10);
mision = { modo: m, tipo: m.objetivo.tipo, meta: m.objetivo.meta, texto: m.objetivo.texto, completada: false };
const box = document.getElementById('mission-box');
if (box) box.classList.remove('done');
const mm = document.getElementById('mission-mode'); if (mm) mm.textContent = m.nombre;
const mt = document.getElementById('mission-text'); if (mt) mt.textContent = m.objetivo.texto;
}
function contarPlantas() {
let n = 0;
for (let x = 0; x < GRID_COLS; x++) for (let y = 0; y < GRID_ROWS; y++) {
const c = farmGrid[x] && farmGrid[x][y];
if (c && !c.isDepot && !c.isEmpty) n++;
}
return n;
}
function contarMacetas() {
let n = 0;
for (let x = 0; x < GRID_COLS; x++) for (let y = 0; y < GRID_ROWS; y++) {
const c = farmGrid[x] && farmGrid[x][y];
if (c && !c.isDepot && !c.locked) n++;
}
return n;
}
function saludPromedio() {
let total = 0, n = 0;
for (let x = 0; x < GRID_COLS; x++) for (let y = 0; y < GRID_ROWS; y++) {
const c = farmGrid[x] && farmGrid[x][y];
if (c && !c.isDepot && !c.isEmpty) { total += c.health; n++; }
}
return n ? total / n : 0;
}
function progresoMision() {
if (!mision) return 0;
if (mision.tipo === 'regar') return totalWatered;
if (mision.tipo === 'rescatar') return totalRescues;
if (mision.tipo === 'salud') return saludPromedio();
if (mision.tipo === 'plantas') return contarPlantas();
return 0;
}
function actualizarMision() {
if (!mision) return;
const p = progresoMision();
const pct = Math.max(0, Math.min(100, (p / mision.meta) * 100));
const fill = document.getElementById('mission-fill');
const txt = document.getElementById('mission-text');
if (fill) fill.style.width = pct + '%';
if (txt) {
const val = mision.tipo === 'salud' ? p.toFixed(1) : Math.floor(p);
const meta = mision.tipo === 'salud' ? mision.meta.toFixed(1) : mision.meta;
txt.textContent = mision.completada ? `✅ ${mision.texto} — ¡logrado!` : `${mision.texto} (${val}/${meta})`;
}
if (!mision.completada && p >= mision.meta) {
mision.completada = true;
const box = document.getElementById('mission-box');
if (box) box.classList.add('done');
addCoins(ECONOMIA.porMision, 'misión completada');
showToast(`🏅 ¡Misión ${mision.modo.nombre} completada!`);
aidenSpeak(`¡Lo lograste! ${mision.texto}. Te di ${ECONOMIA.porMision} monedas. Puedes gastarlas en la tienda (tecla ESC).`);
}
}

// ============================================================
//  FARM INIT
// ============================================================
function ponerMaceta(x, y) {
const base = farmGrid[x][y] || {};
farmGrid[x][y] = { type: 'vacio', locked: false, isEmpty: true, health: 0,
section: base.section || 0, weight: 0, stage: 1, lastWatered: Date.now(),
swayPhase: Math.random() * Math.PI * 2, sizeVar: 1 };
}

function sembrarEn(x, y, tipo, ahora, nueva) {
const needs = PLANT_NEEDS[tipo] || PLANT_NEEDS['vacio'];
const health = nueva ? 3.5 : (1 + Math.random() * 4);
const base = farmGrid[x][y] || {};
farmGrid[x][y] = {
type: tipo, isEmpty: false, locked: false, health: health, section: base.section || 0,
weight: Math.round((health / 5) * needs.peso_max),
stage: getGrowthStage(health),
lastWatered: nueva ? ahora : (ahora - Math.floor(Math.random() * 30 * 60 * 1000)),
swayPhase: Math.random() * Math.PI * 2,
sizeVar: 0.85 + Math.random() * 0.3
};
}

function initFarm() {
farmGrid = [];
const now = Date.now();
currentLevelFruits = currentLevel === 1 ? LEVEL1_FRUITS : LEVEL2_FRUITS;
// 1) las 20 casillas empiezan BLOQUEADAS: todavía no hay maceta en ellas
for (let x = 0; x < GRID_COLS; x++) {
farmGrid[x] = [];
for (let y = 0; y < GRID_ROWS; y++) {
const sect = (x < GRID_COLS/2 ? 0 : 1) + (y < GRID_ROWS/2 ? 0 : 2);
farmGrid[x][y] = { type: 'bloqueada', locked: true, isEmpty: true, health: 0, section: sect,
weight: 0, stage: 1, lastWatered: now, swayPhase: Math.random() * Math.PI * 2, sizeVar: 1 };
}
}
// 2) solo se regalan MACETAS_INICIALES macetas, con la fruta que eligió el jugador
let elegidas = seleccionSiembra.filter((f, i, a) => a.indexOf(f) === i && currentLevelFruits.includes(f));
if (elegidas.length === 0) elegidas = barajar(currentLevelFruits.slice());
elegidas = elegidas.slice(0, MACETAS_INICIALES);
POSICIONES_INICIALES.forEach((p, i) => {
ponerMaceta(p[0], p[1]);
if (elegidas[i]) sembrarEn(p[0], p[1], elegidas[i], now, true);
});
// 3) las demás frutas quedan disponibles para comprar más adelante
// las frutas NO se mezclan entre niveles: solo se pueden comprar las de este nivel
semillas = barajar(currentLevelFruits.filter(f => elegidas.indexOf(f) === -1));
farmGrid[0][0] = { type: 'deposito', health: 5, section: 0, isDepot: true, lastWatered: now };
drone = { x: 0, y: 0, px: 0, py: 0, tx: 0, ty: 0, moving: false,
bucket: 10, maxBucket: 10, rotorAngle: 0, waterEffect: [],
blinkLed: 0, hoverOffset: 0 };
score = 0; totalWatered = 0; totalRescues = 0; linesRun = 0;
gameTimer = 0;
cmdQueue = []; cmdRunning = false;
gamePausedForBio = false;
bioVistas = {};
syncDronePosition();
iniciarMision();
const levelName = currentLevel === 1 ? 'Frutas Clásicas' : 'Frutas Exóticas';
logConsole(`🪴 Huerto Nivel ${currentLevel}: ${levelName} listo.`, 'info');
logConsole(`🪴 Empiezas con ${MACETAS_INICIALES} macetas: ${elegidas.map(f => PLANT_NAMES[f]).join(' y ')}.`, 'info');
logConsole(`🔒 Hay ${MAX_PARCELAS - MACETAS_INICIALES} lugares cerrados. Compra la maceta (B, ${ECONOMIA.precioMaceta} 🪙) y luego la planta (R, ${ECONOMIA.precioPlanta} 🪙).`, 'info');
logConsole('⏰ Cada fruta necesita riego cada hora (tiempo real)', 'info');
if (currentUser) {
const m = getAgeMode(currentUser.age);
aidenSpeak(`¡Hola ${currentUser.name}! Eres ${m.nombre} ${m.emoji}.\nTe regalé ${ECONOMIA.monedasInicio} monedas 🪙. ¿Para qué sirven? Para dos cosas: comprar una maceta vacía (${ECONOMIA.precioMaceta} monedas, tecla B) y comprar la planta que va dentro (${ECONOMIA.precioPlanta} monedas, tecla R).\nGanas más monedas regando: ${ECONOMIA.porRiego} por riego y ${ECONOMIA.porRescate} si salvas una planta a punto de morir.\nTu misión: ${m.objetivo.texto}.`);
}
}

// ============================================================
//  FARM DRAW
// ============================================================
let farmAnimFrame, blinkPhase = 0;
function farmLoop(t) {
if (gameState !== 'game') return;
const dt = Math.min((t - lastTime) / 1000, 0.05);
lastTime = t;
gameTimer += dt;
blinkPhase += dt * 6;
// ARREGLO: la pausa se calcula de la ventana abierta de verdad, así el juego
// nunca se queda congelado aunque falle un temporizador o la voz.
gamePausedForBio = hayVentanaAbierta();
if (!gamePausedForBio) {
updateHUD();
updateDrone(dt);
processQueue();
checkHealthDecayRealTime();
}
// ARREGLO: red de seguridad. Si algo falla al dibujar, el juego avisa
// una vez y SIGUE corriendo, en vez de quedarse congelado para siempre.
try { drawFarm(); } catch (err) { avisarFalloDibujo(err); }
try { updatePlantInfoPanel(); } catch (err) { avisarFalloDibujo(err); }
farmAnimFrame = requestAnimationFrame(farmLoop);
}
let falloAvisado = false;
function avisarFalloDibujo(err) {
if (falloAvisado) return;
falloAvisado = true;
logConsole('⚠️ Hubo un problema al dibujar el huerto, pero el juego sigue: ' + err.message, 'error');
}

function updateHUD() {
document.getElementById('hud-pos').textContent = `(${drone.x},${drone.y})`;
document.getElementById('hud-water').textContent = `${Math.floor(drone.bucket)}/${drone.maxBucket}`;
let totalHealth = 0, count = 0, critical = 0;
for (let x = 0; x < GRID_COLS; x++) for (let y = 0; y < GRID_ROWS; y++) {
const c = farmGrid[x][y];
if (!c.isDepot && !c.isEmpty) {
totalHealth += c.health;
count++;
if (c.health < 2) critical++;
}
}
const avg = count > 0 ? (totalHealth / count).toFixed(1) : '0.0';
document.getElementById('hud-health').textContent = avg;
const critEl = document.getElementById('hud-critical');
critEl.textContent = critical;
critEl.style.color = critical > 0 ? 'var(--coral)' : 'var(--emerald)';
document.getElementById('hud-score').textContent = score;
const now = new Date();
const h = now.getHours().toString().padStart(2,'0');
const m = now.getMinutes().toString().padStart(2,'0');
document.getElementById('hud-time').textContent = `${h}:${m}`;
const levelEl = document.getElementById('hud-level');
levelEl.textContent = `N${currentLevel}`;
levelEl.className = `hud-val hud-level l${currentLevel}`;
const seedsEl = document.getElementById('hud-seeds');
if (seedsEl) seedsEl.textContent = `${contarMacetas()}/${MAX_PARCELAS}`;
pintarMonedas();
actualizarMision();
document.getElementById('stat-watered').textContent = totalWatered;
document.getElementById('stat-lines').textContent = linesRun;
document.getElementById('stat-rescues').textContent = totalRescues;
const eff = count > 0 ? Math.round((totalHealth / (count * 5)) * 100) : 100;
document.getElementById('stat-efficiency').textContent = eff + '%';
}

function updateDrone(dt) {
drone.rotorAngle += dt * 15;
drone.blinkLed += dt * 4;
drone.hoverOffset = Math.sin(gameTimer * 2) * 3;
const speed = 12;
const dx = drone.tx - drone.px;
const dy = drone.ty - drone.py;
const dist = Math.sqrt(dx * dx + dy * dy);
if (dist > 1) {
drone.px += dx * speed * dt;
drone.py += dy * speed * dt;
drone.moving = true;
} else {
drone.px = drone.tx;
drone.py = drone.ty;
drone.moving = false;
}
if (!isFinite(drone.px) || !isFinite(drone.py)) syncDronePosition();
drone.waterEffect = drone.waterEffect.filter(p => p.life > 0);
drone.waterEffect.forEach(p => {
p.x += p.vx * dt;
p.y += p.vy * dt;
p.vy += 30 * dt;
p.life -= dt * 2;
});
}

let lastDecayCheck = Date.now();
function checkHealthDecayRealTime() {
const now = Date.now();
const elapsed = now - lastDecayCheck;
if (elapsed < 10000) return;
lastDecayCheck = now;
for (let x = 0; x < GRID_COLS; x++) {
for (let y = 0; y < GRID_ROWS; y++) {
const cell = farmGrid[x][y];
if (cell.isDepot || cell.isEmpty) continue;
const timeSinceWatered = now - cell.lastWatered;
if (timeSinceWatered > DECAY_START_MS) {
const hoursWithoutWater = (timeSinceWatered - DECAY_START_MS) / (60 * 60 * 1000);
const decayAmount = hoursWithoutWater * DECAY_RATE_PER_HOUR * (elapsed / (60 * 60 * 1000));
cell.health = Math.max(0, cell.health - decayAmount);
const needs = PLANT_NEEDS[cell.type] || PLANT_NEEDS['vacio'];
cell.weight = Math.round((cell.health / 5) * needs.peso_max);
cell.stage = getGrowthStage(cell.health);
}
}
}
}

function drawFarm() {
const ctx = farmCtx;
ctx.clearRect(0, 0, farmCanvas.width, farmCanvas.height);
const skyGrad = ctx.createLinearGradient(0, 0, 0, farmCanvas.height);
skyGrad.addColorStop(0, '#0a1a3a');
skyGrad.addColorStop(0.3, '#1a2a4a');
skyGrad.addColorStop(0.6, '#2a3a3a');
skyGrad.addColorStop(1, '#1a3a1a');
ctx.fillStyle = skyGrad;
ctx.fillRect(0, 0, farmCanvas.width, farmCanvas.height);
const sunX = farmCanvas.width * 0.15;
const sunY = 80;
const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 60);
sunGrad.addColorStop(0, 'rgba(255, 230, 150, 0.9)');
sunGrad.addColorStop(0.3, 'rgba(255, 200, 100, 0.4)');
sunGrad.addColorStop(1, 'transparent');
ctx.fillStyle = sunGrad;
ctx.beginPath();
ctx.arc(sunX, sunY, 60, 0, Math.PI * 2);
ctx.fill();
const groundY = originY - 20;
const groundGrad = ctx.createLinearGradient(0, groundY, 0, farmCanvas.height);
groundGrad.addColorStop(0, '#2a4a1a');
groundGrad.addColorStop(0.3, '#1a3a1a');
groundGrad.addColorStop(1, '#0a2a0a');
ctx.fillStyle = groundGrad;
ctx.fillRect(0, groundY, farmCanvas.width, farmCanvas.height - groundY);
for (let x = 0; x < GRID_COLS; x++) {
for (let y = 0; y < GRID_ROWS; y++) {
const px = originX + x * cellW;
const py = originY + y * cellH;
const cell = farmGrid[x][y];
ctx.save();
ctx.beginPath();
ctx.rect(px + 1, py + 1, cellW - 2, cellH - 2);
ctx.clip();
if (soilPattern) {
ctx.fillStyle = soilPattern;
ctx.fillRect(px, py, cellW, cellH);
} else {
ctx.fillStyle = SECTION_COLORS[cell.section];
ctx.fillRect(px, py, cellW, cellH);
}
if (!cell.isDepot && !cell.isEmpty) {
const h = cell.health / 5;
const healthOverlay = h > 0.6 ? 'rgba(30, 80, 30, 0.3)' : h > 0.35 ? 'rgba(80, 80, 20, 0.3)' : 'rgba(100, 30, 30, 0.4)';
ctx.fillStyle = healthOverlay;
ctx.fillRect(px, py, cellW, cellH);
if (cell.health < 2 && Math.sin(blinkPhase) > 0) {
ctx.fillStyle = 'rgba(231,76,60,0.2)';
ctx.fillRect(px, py, cellW, cellH);
}
}
ctx.restore();
ctx.strokeStyle = SECTION_BORDER[cell.section];
ctx.lineWidth = 2;
ctx.globalAlpha = 0.8;
ctx.strokeRect(px + 1, py + 1, cellW - 2, cellH - 2);
ctx.globalAlpha = 1;
if (cell.isDepot) {
drawWaterDepot(ctx, px + cellW / 2, py + cellH / 2, cellW * 0.7);
} else if (cell.locked) {
ctx.save();
ctx.globalAlpha = 0.55;
ctx.fillStyle = 'rgba(0,0,0,0.55)';
ctx.fillRect(px + 2, py + 2, cellW - 4, cellH - 4);
ctx.globalAlpha = 1;
ctx.setLineDash([6, 5]);
ctx.strokeStyle = 'rgba(255,216,61,0.5)';
ctx.lineWidth = 2;
ctx.strokeRect(px + 8, py + 8, cellW - 16, cellH - 16);
ctx.setLineDash([]);
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.font = `${Math.max(15, cellW * 0.2)}px "Segoe UI", sans-serif`;
ctx.globalAlpha = 0.85;
ctx.fillStyle = 'rgba(255,255,255,0.9)';
ctx.fillText('🔒', px + cellW / 2, py + cellH / 2 - 6);
ctx.globalAlpha = 1;
if (cellW > 60) {
ctx.font = 'bold 12px "Segoe UI", sans-serif';
ctx.fillStyle = coins >= ECONOMIA.precioMaceta ? '#ffd83d' : 'rgba(255,216,61,0.45)';
ctx.fillText(`🪴 ${ECONOMIA.precioMaceta} 🪙`, px + cellW / 2, py + cellH / 2 + cellW * 0.16);
}
ctx.restore();
} else if (cell.isEmpty) {
ctx.save();
drawMaceta(ctx, px + cellW / 2, py + cellH * 0.72, cellW * 0.42);
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
if (cellW > 60) {
ctx.font = 'bold 12px "Segoe UI", sans-serif';
ctx.fillStyle = coins >= ECONOMIA.precioPlanta ? '#4ade80' : 'rgba(74,222,128,0.45)';
ctx.fillText(`🌱 R · ${ECONOMIA.precioPlanta} 🪙`, px + cellW / 2, py + cellH * 0.22);
}
ctx.restore();
} else {
const sway = Math.sin(blinkPhase * 0.3 + (cell.swayPhase || 0)) * 2;
const plantSize = cellW * 0.5 * (cell.sizeVar || 1);
ctx.save();
ctx.translate(px + cellW / 2, py + cellH / 2 + 5);
ctx.rotate(sway * 0.02);
drawRealisticPlant(ctx, cell.type, 0, 0, plantSize, cell.health);
ctx.restore();
if (cellW > 30) {
const barW = cellW - 12;
const barH = 5;
const barX = px + 6;
const barY = py + cellH - 9;
ctx.fillStyle = 'rgba(0,0,0,0.7)';
ctx.fillRect(barX, barY, barW, barH);
const hPct = Math.max(0, Math.min(1, cell.health / 5));
const hColor = hPct > 0.6 ? '#4ade80' : hPct > 0.35 ? '#ffd83d' : '#ff6b6b';
ctx.fillStyle = hColor;
ctx.fillRect(barX, barY, barW * hPct, barH);
}
// Nombre de la fruta bajo la planta (celdas grandes)
if (cellW > 90) {
ctx.font = 'bold 12px "Segoe UI", sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'bottom';
ctx.lineWidth = 3;
ctx.strokeStyle = 'rgba(0,0,0,0.85)';
ctx.strokeText(PLANT_NAMES[cell.type] || cell.type, px + cellW / 2, py + cellH - 12);
ctx.fillStyle = '#f2f7fa';
ctx.fillText(PLANT_NAMES[cell.type] || cell.type, px + cellW / 2, py + cellH - 12);
}
}
if (cellW > 40) {
ctx.font = 'bold 11px monospace';
ctx.fillStyle = 'rgba(255,255,255,0.65)';
ctx.textAlign = 'left';
ctx.textBaseline = 'top';
ctx.fillText(`${x},${y}`, px + 5, py + 4);
}
}
}
const sLabels = ['ZONA A','ZONA B','ZONA C','ZONA D'];
const sPositions = [
{x: originX + (GRID_COLS/4) * cellW, y: originY - 14},
{x: originX + (3*GRID_COLS/4) * cellW, y: originY - 14},
{x: originX + (GRID_COLS/4) * cellW, y: originY + (GRID_ROWS/2) * cellH + 6},
{x: originX + (3*GRID_COLS/4) * cellW, y: originY + (GRID_ROWS/2) * cellH + 6}
];
sPositions.forEach((p, i) => {
ctx.font = 'bold 12px monospace';
ctx.fillStyle = SECTION_BORDER[i];
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.shadowColor = SECTION_BORDER[i];
ctx.shadowBlur = 8;
ctx.fillText(sLabels[i], p.x, p.y);
ctx.shadowBlur = 0;
});
drone.waterEffect.forEach(p => {
// ARREGLO: si la gota ya se apagó, su radio se volvía NEGATIVO y el
// canvas lanzaba un error que congelaba todo el juego al pulsar E.
const radio = Math.max(0.1, 4 * p.life);
if (!isFinite(radio) || !isFinite(p.x) || !isFinite(p.y)) return;
ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
const wGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radio);
wGrad.addColorStop(0, 'rgba(100, 200, 255, 0.9)');
wGrad.addColorStop(1, 'rgba(52, 152, 219, 0)');
ctx.fillStyle = wGrad;
ctx.beginPath();
ctx.arc(p.x, p.y, radio, 0, Math.PI * 2);
ctx.fill();
});
ctx.globalAlpha = 1;
drawRealisticDrone(ctx, drone.px, drone.py, 1, drone.rotorAngle);
}

function drawMaceta(ctx, cx, baseY, w) {
const h = w * 0.5;
const labio = w * 0.14;
// cuerpo de la maceta (trapecio)
ctx.beginPath();
ctx.moveTo(cx - w / 2, baseY - h);
ctx.lineTo(cx + w / 2, baseY - h);
ctx.lineTo(cx + w * 0.36, baseY);
ctx.lineTo(cx - w * 0.36, baseY);
ctx.closePath();
const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
g.addColorStop(0, '#8a4b2a');
g.addColorStop(0.35, '#c9743f');
g.addColorStop(0.65, '#b0602f');
g.addColorStop(1, '#6e3a20');
ctx.fillStyle = g;
ctx.fill();
ctx.strokeStyle = 'rgba(60,28,14,0.85)';
ctx.lineWidth = 1.5;
ctx.stroke();
// labio superior
ctx.beginPath();
ctx.roundRect(cx - w / 2 - w * 0.05, baseY - h - labio, w + w * 0.1, labio, 3);
const g2 = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
g2.addColorStop(0, '#a3562f');
g2.addColorStop(0.4, '#d9834a');
g2.addColorStop(1, '#7d4224');
ctx.fillStyle = g2;
ctx.fill();
ctx.stroke();
// tierra dentro
ctx.beginPath();
ctx.ellipse(cx, baseY - h - labio * 0.35, w * 0.44, labio * 0.42, 0, 0, Math.PI * 2);
ctx.fillStyle = '#3b2416';
ctx.fill();
// brillo
ctx.globalAlpha = 0.18;
ctx.fillStyle = '#fff';
ctx.beginPath();
ctx.moveTo(cx - w * 0.34, baseY - h + 3);
ctx.lineTo(cx - w * 0.2, baseY - h + 3);
ctx.lineTo(cx - w * 0.16, baseY - 3);
ctx.lineTo(cx - w * 0.28, baseY - 3);
ctx.closePath();
ctx.fill();
ctx.globalAlpha = 1;
}

function drawWaterDepot(ctx, x, y, size) {
const tankGrad = ctx.createLinearGradient(x - size/2, y - size/2, x + size/2, y + size/2);
tankGrad.addColorStop(0, '#4a90c8');
tankGrad.addColorStop(0.5, '#2a6a9a');
tankGrad.addColorStop(1, '#1a4a6a');
ctx.fillStyle = tankGrad;
ctx.beginPath();
ctx.roundRect(x - size/2, y - size/2, size, size, 6);
ctx.fill();
ctx.strokeStyle = '#0a3d62';
ctx.lineWidth = 2;
ctx.stroke();
ctx.fillStyle = 'rgba(100, 200, 255, 0.9)';
ctx.beginPath();
ctx.moveTo(x, y - 5);
ctx.quadraticCurveTo(x + 8, y + 3, x, y + 10);
ctx.quadraticCurveTo(x - 8, y + 3, x, y - 5);
ctx.fill();
}

// ============================================================
//  CONTROLES DEL DRÓN
// ============================================================
const KEYS = {};
let moveInterval = null;
let ultimaAccion = 0;   // ARREGLO: evita que E se dispare dos veces seguidas
const TECLAS_JUEGO = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','e','r','b','m','t','v','i','c','l',' '];
const TECLAS_MOVER = ['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
// ARREGLO: 'E' y 'e' eran teclas distintas y con Shift se trababa el dron.
function normalizarTecla(k) { return (typeof k === 'string' && k.length === 1) ? k.toLowerCase() : k; }
document.addEventListener('keydown', e => {
if (gameState === 'account') return;
if (gameState === 'intro') { if (e.key === 'Escape') skipIntro(); return; }
// ARREGLO: con ESC se pausaba, pero ESC ya no despausaba (había que usar el ratón).
if (gameState === 'paused') { if (e.key === 'Escape') resumeGame(); return; }
if (gameState !== 'game') return;
const activeEl = document.activeElement;
const isTextInput = activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT');
if (e.key === 'Escape') { if (!isTextInput) { if (!cerrarVentanas()) togglePause(); } return; }
if (isTextInput) return;
const k = normalizarTecla(e.key);
if (TECLAS_JUEGO.includes(k)) e.preventDefault();
if (e.repeat) return;   // ARREGLO: el navegador repetía la tecla y abría/cerraba ventanas solo
if (KEYS[k]) return;
KEYS[k] = true;
handleKey(k);
if (TECLAS_MOVER.includes(k)) startContinuousMove(k);
});
document.addEventListener('keyup', e => {
const k = normalizarTecla(e.key);
delete KEYS[k];
if (TECLAS_MOVER.includes(k)) stopContinuousMove();
});
// ARREGLO: si cambias de ventana con una tecla apretada, ya no se queda pegada
window.addEventListener('blur', () => {
for (const k in KEYS) delete KEYS[k];
stopContinuousMove();
});
function startContinuousMove(key) {
stopContinuousMove();
moveInterval = setInterval(() => {
if (KEYS[key]) handleKey(key);
else stopContinuousMove();
}, 120);
}
function stopContinuousMove() {
if (moveInterval) { clearInterval(moveInterval); moveInterval = null; }
}
function handleKey(key) {
if (gameState !== 'game') return;
const activeEl = document.activeElement;
const isTextInput = activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT');
if (isTextInput) return;
const k = String(key).toLowerCase();
// ARREGLO: se mira la ventana que está abierta de verdad, no una variable
// que se podía quedar mal puesta. E o ESC siempre cierran lo que esté abierto.
if (hayVentanaAbierta()) {
if (k === 'e' || k === 'escape') cerrarVentanas();
return;
}
// ARREGLO: las acciones no se repiten más rápido que cada 180 ms.
if (k === 'e' || k === 'r' || k === 'b') {
const ahora = Date.now();
if (ahora - ultimaAccion < 180) return;
ultimaAccion = ahora;
}
switch (k) {
case 'arrowup': case 'w': moveDrone(0, -1); break;
case 'arrowdown': case 's': moveDrone(0, 1); break;
case 'arrowleft': case 'a': moveDrone(-1, 0); break;
case 'arrowright': case 'd': moveDrone(1, 0); break;
case 'e': droneAction(); break;
case 'r': intentarSembrar(); break;
case 'b': comprarMaceta(); break;
}
}
function moveDrone(dx, dy) {
const nx = Math.max(0, Math.min(GRID_COLS - 1, drone.x + dx));
const ny = Math.max(0, Math.min(GRID_ROWS - 1, drone.y + dy));
drone.x = nx; drone.y = ny;
const p = gridToPixel(drone.x, drone.y);
drone.px = p.x; drone.py = p.y;
drone.tx = p.x; drone.ty = p.y;
drone.moving = false;
}
function droneAction() {
if (drone.x < 0 || drone.x >= GRID_COLS || drone.y < 0 || drone.y >= GRID_ROWS) return;
const cell = farmGrid[drone.x][drone.y];
if (!cell) return;
if (cell.isDepot) {
drone.bucket = drone.maxBucket;
showToast('💧 ¡Cubeta llena!');
spawnWaterEffect(drone.px, drone.py, 'up');
logConsole('💧 Cubeta recargada: ' + drone.maxBucket + ' unidades', 'info');
} else if (cell.locked) {
comprarMaceta();
} else if (cell.isEmpty) {
intentarSembrar();
} else if (drone.bucket > 0) {
const prevHealth = cell.health;
cell.health = Math.min(5, cell.health + 2);
drone.bucket = Math.max(0, drone.bucket - 1);
score += 10;
totalWatered++;
cell.lastWatered = Date.now();
const needs = PLANT_NEEDS[cell.type] || PLANT_NEEDS['vacio'];
cell.weight = Math.round((cell.health / 5) * needs.peso_max);
cell.stage = getGrowthStage(cell.health);
if (prevHealth < 2) {
score += 40; totalRescues++;
addCoins(ECONOMIA.porRescate, `salvaste ${PLANT_NAMES[cell.type]}`);
showToast(`🌿 ¡Rescate! +50 pts`);
logConsole(`🌿 ¡${PLANT_NAMES[cell.type]} rescatada en (${drone.x},${drone.y})! +${ECONOMIA.porRescate} 🪙`, 'info');
} else {
addCoins(ECONOMIA.porRiego, '');
showToast(`💧 Regado: ${PLANT_EMOJI[cell.type]} ${PLANT_NAMES[cell.type]}`);
logConsole(`💧 Regado ${PLANT_NAMES[cell.type]} en (${drone.x},${drone.y}). Salud: ${cell.health.toFixed(1)}`, 'normal');
}
spawnWaterEffect(drone.px, drone.py, 'down');
showPlantBiography(cell.type);
} else {
showToast('⚠️ Sin agua. Ve a (0,0) para recargar.', true);
}
}
// ------------------------------------------------------------
//  COMPRAR MACETA (tecla B) y COMPRAR PLANTA (tecla R)
// ------------------------------------------------------------
function comprarMaceta() {
if (gameState !== 'game' || hayVentanaAbierta()) return false;
const cell = farmGrid[drone.x] && farmGrid[drone.x][drone.y];
if (!cell) return false;
if (cell.isDepot) { showToast('⚠️ Aquí está el depósito de agua', true); return false; }
if (!cell.locked) { showToast('🪴 Aquí ya hay una maceta', true); return false; }
if (!spendCoins(ECONOMIA.precioMaceta)) return false;
ponerMaceta(drone.x, drone.y);
explicar('compraste', 'Muy bien: acabas de gastar monedas por primera vez. Para eso sirven — cada maceta y cada planta se compran, y las monedas se ganan regando.');
showToast(`🪴 Maceta comprada (-${ECONOMIA.precioMaceta} 🪙)`);
logConsole(`🪴 Maceta puesta en (${drone.x},${drone.y}). Ya tienes ${contarMacetas()} de ${MAX_PARCELAS}.`, 'info');
aidenSpeak(`Maceta lista en (${drone.x},${drone.y}). Ahora pulsa R para comprar la planta que va dentro (${ECONOMIA.precioPlanta} monedas).`);
return true;
}

function intentarSembrar(tipoPedido) {
if (gameState !== 'game' || hayVentanaAbierta()) return false;
const cell = farmGrid[drone.x] && farmGrid[drone.x][drone.y];
if (!cell) return false;
if (cell.isDepot) { showToast('⚠️ Aquí está el depósito de agua', true); return false; }
if (cell.locked) { showToast(`🔒 Primero compra la maceta: tecla B (${ECONOMIA.precioMaceta} 🪙)`, true); return false; }
if (!cell.isEmpty) { showToast('⚠️ Esta maceta ya tiene planta', true); return false; }
if (semillas.length === 0 && !(typeof MUNDO !== 'undefined' && MUNDO.variantes.length)) { showToast('🌱 Ya sembraste las 10 frutas de este nivel. Investiga 🧬 en el laboratorio (tecla I) para desbloquear variantes.', true); return false; }
if (tipoPedido) {
const t = String(tipoPedido).toLowerCase();
const i = semillas.indexOf(t);
if (i === -1) { showToast(`⚠️ "${tipoPedido}" no está disponible`, true); logConsole(`⚠️ "${tipoPedido}" no existe o ya está sembrada. Usa granja.disponibles()`, 'error'); return false; }
if (!spendCoins(ECONOMIA.precioPlanta)) return false;
semillas.splice(i, 1);
plantarConfirmado(t);
return true;
}
abrirSelectorPlanta();
return true;
}

function plantarConfirmado(t) {
sembrarEn(drone.x, drone.y, t, Date.now(), true);
showToast(`🌱 Plantaste ${PLANT_NAMES[t]} (-${ECONOMIA.precioPlanta} 🪙)`);
logConsole(`🌱 ${PLANT_NAMES[t]} plantada en (${drone.x},${drone.y}). Quedan ${semillas.length} frutas por comprar.`, 'info');
aidenSpeak(`Plantaste ${PLANT_NAMES[t]}. Riégala pronto o su salud bajará.`);
}

// ------------------------------------------------------------
//  Selector: el jugador elige QUE fruto quiere sembrar
// ------------------------------------------------------------
function abrirSelectorPlanta() {
const pop = document.getElementById('picker-popup');
const grid = document.getElementById('picker-grid');
const info = document.getElementById('picker-info');
if (!pop || !grid) return;
grid.innerHTML = '';
semillas.forEach(f => {
const card = document.createElement('div');
const puedo = coins >= ECONOMIA.precioPlanta;
card.className = 'sow-card' + (puedo ? '' : ' sin-monedas');
card.innerHTML = `<div class="foto-fruta"><span class="foto-emoji">${PLANT_EMOJI[f]}</span></div>
<div class="sow-name">${PLANT_NAMES[f]}</div>
<div class="sow-tag">${ECONOMIA.precioPlanta} 🪙</div>`;
pintarFotoFruta(card.querySelector('.foto-fruta'), f);
card.onclick = () => elegirPlanta(f);
grid.appendChild(card);
});
if (info) info.textContent = `Maceta (${drone.x},${drone.y}) · Tienes ${coins} 🪙 · Cada planta cuesta ${ECONOMIA.precioPlanta}`;
gamePausedForBio = true;
pop.classList.add('visible');
}

function cerrarSelectorPlanta() {
const pop = document.getElementById('picker-popup');
if (pop) pop.classList.remove('visible');
gamePausedForBio = false;
}

function elegirPlanta(f) {
const i = semillas.indexOf(f);
if (i === -1) { cerrarSelectorPlanta(); return; }
if (coins < ECONOMIA.precioPlanta) { showToast(`🪙 Te faltan ${ECONOMIA.precioPlanta - coins} monedas. Riega para ganar más.`, true); return; }
spendCoins(ECONOMIA.precioPlanta);
semillas.splice(i, 1);
cerrarSelectorPlanta();
plantarConfirmado(f);
}

function spawnWaterEffect(x, y, dir) {
if (!isFinite(x) || !isFinite(y)) return;
for (let i = 0; i < 12; i++) {
const angle = (dir === 'down') ? (Math.PI * 0.5 + (Math.random() - 0.5)) : (Math.PI * 1.5 + (Math.random() - 0.5));
drone.waterEffect.push({
x: x + (Math.random() - 0.5) * 10,
y: y + (Math.random() - 0.5) * 5,
vx: Math.cos(angle) * (30 + Math.random() * 40),
vy: Math.sin(angle) * (30 + Math.random() * 40),
life: 1
});
}
}

// ============================================================
//  PYTHON TRANSPILER
// ============================================================
let consoleEl;
function initConsole() { consoleEl = document.getElementById('console-out'); }
function logConsole(msg, type = 'normal') {
if (!consoleEl) return;
const line = document.createElement('div');
line.className = type === 'error' ? 'console-err' : type === 'info' ? 'console-info' : '';
line.textContent = msg;
consoleEl.appendChild(line);
consoleEl.scrollTop = consoleEl.scrollHeight;
}
function clearCode() {
document.getElementById('python-editor').value = '';
consoleEl.innerHTML = '';
}

function transpilePython(py) {
let lines = py.split('\n');
let result = [];
for (let i = 0; i < lines.length; i++) {
let line = lines[i];
// Remover comentarios (solo si no están dentro de strings)
const commentIdx = line.indexOf('#');
if (commentIdx !== -1) {
const before = line.substring(0, commentIdx);
const quotes = (before.match(/'/g) || []).length + (before.match(/"/g) || []).length;
if (quotes % 2 === 0) line = line.substring(0, commentIdx);
}
if (line.trim() === '') { result.push(''); continue; }
let jsLine = line;

// Reemplazar funciones específicas PRIMERO
jsLine = jsLine.replace(/print\s*\(([^)]*)\)/g, 'console_log($1)');
jsLine = jsLine.replace(/drone\.ir_a\s*\(/g, 'drone_api.ir_a(');
jsLine = jsLine.replace(/drone\.arriba\s*\(/g, 'drone_api.arriba(');
jsLine = jsLine.replace(/drone\.abajo\s*\(/g, 'drone_api.abajo(');
jsLine = jsLine.replace(/drone\.izquierda\s*\(/g, 'drone_api.izquierda(');
jsLine = jsLine.replace(/drone\.derecha\s*\(/g, 'drone_api.derecha(');
jsLine = jsLine.replace(/drone\.recoger_cubeta\s*\(\s*\)/g, 'drone_api.recoger_cubeta()');
jsLine = jsLine.replace(/drone\.regar\s*\(\s*\)/g, 'drone_api.regar()');
jsLine = jsLine.replace(/drone\.sembrar\s*\(/g, 'drone_api.sembrar(');
jsLine = jsLine.replace(/drone\.comprar_maceta\s*\(\s*\)/g, 'drone_api.comprar_maceta()');
jsLine = jsLine.replace(/granja\.bloqueadas\s*\(\s*\)/g, 'granja_api.bloqueadas()');
jsLine = jsLine.replace(/granja\.disponibles\s*\(\s*\)/g, 'granja_api.disponibles()');
jsLine = jsLine.replace(/granja\.macetas\s*\(\s*\)/g, 'granja_api.macetas()');
jsLine = jsLine.replace(/granja\.vacias\s*\(\s*\)/g, 'granja_api.vacias()');
jsLine = jsLine.replace(/granja\.semillas\s*\(\s*\)/g, 'granja_api.semillas()');
jsLine = jsLine.replace(/granja\.monedas\s*\(\s*\)/g, 'granja_api.monedas()');
jsLine = jsLine.replace(/granja\.criticas\s*\(\s*\)/g, 'granja_api.criticas()');
jsLine = jsLine.replace(/granja\.salud\s*\(/g, 'granja_api.salud(');
jsLine = jsLine.replace(/granja\.info\s*\(/g, 'granja_api.info(');
jsLine = jsLine.replace(/granja\.tiempo_sin_riego\s*\(/g, 'granja_api.tiempo_sin_riego(');
jsLine = jsLine.replace(/granja\.nivel_cubeta\s*\(\s*\)/g, 'granja_api.nivel_cubeta()');
jsLine = jsLine.replace(/len\s*\(([^)]+)\)/g, '$1.length');
jsLine = jsLine.replace(/range\s*\((\d+)\)/g, 'Array($1).keys()');

// Estructuras de control
jsLine = jsLine.replace(/^(\s*)for\s+(\w+)\s*,\s*(\w+)\s+in\s+(.+):\s*$/, '$1for (const [$2,$3] of $4) {');
jsLine = jsLine.replace(/^(\s*)for\s+(\w+)\s+in\s+(.+):\s*$/, '$1for (const $2 of $3) {');
jsLine = jsLine.replace(/^(\s*)for\s+(\w+)\s+in\s+range\s*\((\d+)\)\s*:\s*$/, '$1for (let $2=0; $2<$3; $2++) {');
jsLine = jsLine.replace(/^(\s*)while\s+(.+):\s*$/, '$1while ($2) {');
jsLine = jsLine.replace(/^(\s*)if\s+(.+):\s*$/, '$1if ($2) {');
jsLine = jsLine.replace(/^(\s*)elif\s+(.+):\s*$/, '$1} else if ($2) {');
jsLine = jsLine.replace(/^(\s*)else\s*:\s*$/, '$1} else {');

// Operadores lógicos
jsLine = jsLine.replace(/\band\b/g, '&&');
jsLine = jsLine.replace(/\bor\b/g, '||');
jsLine = jsLine.replace(/\bnot\b/g, '!');
jsLine = jsLine.replace(/!=/g, '!==');

// NO convertir = en == (esto rompía las asignaciones)
// Solo convertir comparaciones dobles si aparecen
jsLine = jsLine.replace(/==/g, '===');

result.push(jsLine);
}

// Manejo de indentación
let finalResult = [];
let indentStack = [0];
for (let i = 0; i < result.length; i++) {
const line = result[i];
if (line.trim() === '') continue;
const match = line.match(/^(\s*)/);
const indent = match ? match[1].length : 0;
while (indentStack.length > 1 && indent < indentStack[indentStack.length - 1]) {
finalResult.push('}');
indentStack.pop();
}
if (line.trim().endsWith('{')) indentStack.push(indent + 4);
finalResult.push(line);
}
while (indentStack.length > 1) { finalResult.push('}'); indentStack.pop(); }

const prefix = 'const console_log = (...a) => { logConsole("📝 " + a.map(x => typeof x === "object" ? JSON.stringify(x) : String(x)).join(" ")); };\n';
return prefix + finalResult.join('\n');
}

function runCode() {
if (!currentUser || !edadPermitida(currentUser.age)) {
logConsole('🚫 Acceso bloqueado: se requieren ' + EDAD_MINIMA + ' años o más para ejecutar código.', 'error');
mostrarBloqueoEdad(currentUser ? currentUser.age : 0);
return;
}
const code = document.getElementById('python-editor').value.trim();
if (!code) { logConsole('⚠️ No hay código para ejecutar', 'error'); return; }
linesRun += code.split('\n').length;
logConsole(`> Ejecutando código (${code.split('\n').length} líneas)...`, 'info');
explicar('codigo', 'Acabas de ejecutar tu primer programa. El dron hace las órdenes una por una, en el mismo orden en que las escribiste. Si algo sale mal, la consola de abajo te dice qué línea falló.');
cmdQueue = [];
try {
const jsCode = transpilePython(code);
logConsole('🔧 Código transpilado correctamente', 'info');
const fn = new Function('drone_api', 'granja_api', 'logConsole', jsCode);
fn(droneAPI(), granjaAPI(), logConsole);
if (cmdQueue.length > 0) {
logConsole(`📋 ${cmdQueue.length} comandos en cola. Ejecutando...`, 'info');
cmdRunning = false;
setTimeout(() => processQueue(), 100);
} else {
logConsole('✅ Código ejecutado correctamente', 'info');
}
} catch(e) {
// ARREGLO: antes salía el error crudo de JavaScript, en inglés.
const explicado = explicarErrorCodigo(e);
logConsole('❌ ' + explicado, 'error');
aidenSpeak('Hay un error en tu programa. ' + explicado);
}
}

// Traduce los errores de JavaScript a algo que un niño entienda.
function explicarErrorCodigo(e) {
const m = String(e && e.message || '');
const cmd = m.match(/(?:drone|granja)[_.]?(?:api)?\.?([a-zA-Z_]+) is not a function/);
if (cmd) return `El comando "${cmd[1]}" no existe. Mira la lista en el manual (botón 📖) o usa los Comandos Rápidos.`;
if (/Unexpected token|Invalid or unexpected|Unexpected end/i.test(m))
return 'Hay algo mal escrito: revisa los paréntesis ( ), las comas y que cada línea esté completa.';
if (/is not defined/i.test(m)) {
const v = m.match(/([A-Za-z_$][\w$]*) is not defined/);
return `Escribiste "${v ? v[1] : 'algo'}" pero no existe. ¿Lo escribiste igual que en el manual? Recuerda: drone.  y  granja.`;
}
if (/Cannot read propert/i.test(m)) return 'Le pediste un dato a algo vacío. Revisa que la casilla tenga planta antes de preguntarle.';
if (/indent/i.test(m)) return 'Revisa los espacios del principio de las líneas: dentro de un "for" o un "if" van 4 espacios.';
return 'No pude ejecutar el programa. Revisa la línea y vuelve a intentarlo. (' + m + ')';
}

function droneAPI() {
return {
ir_a: (x, y) => {
const safeX = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(x)));
const safeY = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(y)));
cmdQueue.push({type:'move', x: safeX, y: safeY});
},
arriba: (n=1) => { cmdQueue.push({type:'rel', dx:0, dy:-Math.floor(n)}); },
abajo: (n=1) => { cmdQueue.push({type:'rel', dx:0, dy:Math.floor(n)}); },
izquierda: (n=1) => { cmdQueue.push({type:'rel', dx:-Math.floor(n), dy:0}); },
derecha: (n=1) => { cmdQueue.push({type:'rel', dx:Math.floor(n), dy:0}); },
recoger_cubeta: () => { cmdQueue.push({type:'refill'}); },
regar: () => { cmdQueue.push({type:'water'}); },
sembrar: (tipo) => { cmdQueue.push({type:'sow', tipo: tipo || null}); },
comprar_maceta: () => { cmdQueue.push({type:'pot'}); },
};
}

function granjaAPI() {
return {
criticas: () => {
const list = [];
const now = Date.now();
for (let x = 0; x < GRID_COLS; x++) for (let y = 0; y < GRID_ROWS; y++) {
const cell = farmGrid[x][y];
if (!cell.isDepot && !cell.isEmpty) {
const timeSinceWatered = now - cell.lastWatered;
if (cell.health < 2.5 || timeSinceWatered > DECAY_START_MS * 1.5) list.push([x, y]);
}
}
list.sort((a,b) => {
const timeA = now - farmGrid[a[0]][a[1]].lastWatered;
const timeB = now - farmGrid[b[0]][b[1]].lastWatered;
return timeB - timeA;
});
logConsole(`🔍 Plantas críticas: ${list.length}`, 'info');
return list;
},
salud: (x, y) => farmGrid[x]?.[y]?.health ?? -1,
info: (x, y) => {
const cell = farmGrid[x]?.[y];
if (!cell || cell.isDepot || cell.isEmpty) return null;
const needs = PLANT_NEEDS[cell.type] || PLANT_NEEDS['vacio'];
const minutesSinceWatered = Math.floor((Date.now() - cell.lastWatered) / 60000);
return {
nombre: PLANT_NAMES[cell.type], tipo: cell.type, emoji: PLANT_EMOJI[cell.type],
peso: cell.weight, peso_max: needs.peso_max, salud: cell.health, etapa: cell.stage,
minutos_sin_riego: minutesSinceWatered
};
},
tiempo_sin_riego: (x, y) => {
const cell = farmGrid[x]?.[y];
if (!cell || cell.isDepot) return -1;
return Math.floor((Date.now() - cell.lastWatered) / 60000);
},
nivel_cubeta: () => drone.bucket,
vacias: () => {
const list = [];
for (let x = 0; x < GRID_COLS; x++) for (let y = 0; y < GRID_ROWS; y++) {
const c = farmGrid[x][y];
if (c.isEmpty && !c.locked && !c.isDepot) list.push([x, y]);
}
logConsole(`🪴 Macetas vacías: ${list.length}`, 'info');
return list;
},
bloqueadas: () => {
const list = [];
for (let x = 0; x < GRID_COLS; x++) for (let y = 0; y < GRID_ROWS; y++) {
if (farmGrid[x][y].locked) list.push([x, y]);
}
logConsole(`🔒 Lugares sin maceta: ${list.length}`, 'info');
return list;
},
macetas: () => contarMacetas(),
disponibles: () => { logConsole('🌱 Frutas que puedes comprar: ' + semillas.join(', '), 'info'); return semillas.slice(); },
semillas: () => semillas.length,
monedas: () => coins,
};
}

function processQueue() {
if (gameState !== 'game' || cmdRunning || cmdQueue.length === 0) return;
executeNextCmd();
}

function executeNextCmd() {
if (cmdQueue.length === 0) {
cmdRunning = false;
logConsole('✅ Secuencia completada.', 'info');
return;
}
cmdRunning = true;
const cmd = cmdQueue.shift();
switch (cmd.type) {
case 'move':
drone.x = Math.max(0, Math.min(GRID_COLS - 1, cmd.x));
drone.y = Math.max(0, Math.min(GRID_ROWS - 1, cmd.y));
const p = gridToPixel(drone.x, drone.y);
drone.tx = p.x; drone.ty = p.y;
if (!isFinite(drone.px) || !isFinite(drone.py)) { drone.px = p.x; drone.py = p.y; }
break;
case 'rel':
drone.x = Math.max(0, Math.min(GRID_COLS-1, drone.x + cmd.dx));
drone.y = Math.max(0, Math.min(GRID_ROWS-1, drone.y + cmd.dy));
const p2 = gridToPixel(drone.x, drone.y);
drone.tx = p2.x; drone.ty = p2.y;
if (!isFinite(drone.px) || !isFinite(drone.py)) { drone.px = p2.x; drone.py = p2.y; }
break;
case 'refill':
if (drone.x === 0 && drone.y === 0) {
drone.bucket = drone.maxBucket;
showToast('💧 Cubeta recargada');
spawnWaterEffect(drone.px, drone.py, 'up');
logConsole('💧 Cubeta llena: ' + drone.maxBucket, 'normal');
} else {
logConsole('⚠️ Debes ir a (0,0) para recargar', 'error');
}
setTimeout(executeNextCmd, 300);
return;
case 'pot':
comprarMaceta();
setTimeout(executeNextCmd, 320);
return;
case 'sow':
intentarSembrar(cmd.tipo || (semillas.length ? semillas[0] : null));
setTimeout(executeNextCmd, 320);
return;
case 'water':
const cell = farmGrid[drone.x][drone.y];
if (cell && cell.locked) { logConsole('⚠️ Aquí no hay maceta. Usa drone.comprar_maceta() primero.', 'error'); break; }
if (cell && cell.isEmpty) { logConsole('⚠️ La maceta está vacía. Usa drone.sembrar("mango") primero.', 'error'); break; }
if (cell && !cell.isDepot) {
if (drone.bucket > 0) {
const prev = cell.health;
cell.health = Math.min(5, cell.health + 2);
drone.bucket--;
score += 10; totalWatered++;
cell.lastWatered = Date.now();
const needs = PLANT_NEEDS[cell.type];
cell.weight = Math.round((cell.health / 5) * needs.peso_max);
cell.stage = getGrowthStage(cell.health);
if (prev < 2) { score += 40; totalRescues++; addCoins(ECONOMIA.porRescate, `salvaste ${PLANT_NAMES[cell.type]}`); }
else { addCoins(ECONOMIA.porRiego, ''); }
spawnWaterEffect(drone.px, drone.py, 'down');
logConsole(`💧 Regado ${PLANT_NAMES[cell.type]} en (${drone.x},${drone.y}). Salud: ${cell.health.toFixed(1)}`, 'normal');
showPlantBiography(cell.type);
} else {
logConsole('⚠️ Sin agua en cubeta', 'error');
}
}
break;
}
setTimeout(executeNextCmd, 380);
}

function initQuickCmds() {
const container = document.getElementById('quick-cmds');
container.innerHTML = '<div class="code-label" style="margin-bottom:6px;">Comandos Rápidos</div>';
const modo = getAgeMode(currentUser ? currentUser.age : 10);
const porModo = {
semillita: [
{ label:'Ir al depósito', code:'drone.ir_a(0, 0)' },
{ label:'Llenar cubeta', code:'drone.ir_a(0, 0)\ndrone.recoger_cubeta()' },
{ label:'Regar aquí', code:'drone.regar()' },
{ label:'Comprar maceta aquí', code:'drone.comprar_maceta()' },
],
explorador: [
{ label:'Llenar cubeta', code:'drone.ir_a(0, 0)\ndrone.recoger_cubeta()' },
{ label:'Ver plantas en peligro', code:'criticas = granja.criticas()\nprint(criticas)' },
{ label:'Regar la primera en peligro', code:'drone.ir_a(0, 0)\ndrone.recoger_cubeta()\ncriticas = granja.criticas()\nfor x, y in criticas:\n    drone.ir_a(x, y)\n    drone.regar()' },
{ label:'Ver macetas vacías', code:'print(granja.vacias())' },
{ label:'Comprar maceta aquí', code:'drone.comprar_maceta()' },
],
ingeniero: [
{ label:'Rutina de riego', code:'drone.ir_a(0, 0)\ndrone.recoger_cubeta()\nfor x, y in granja.criticas():\n    drone.ir_a(x, y)\n    drone.regar()' },
{ label:'Regar solo lo urgente', code:'for x, y in granja.criticas():\n    if granja.salud(x, y) < 2:\n        drone.ir_a(x, y)\n        drone.regar()' },
{ label:'Abrir y sembrar un lugar', code:'for x, y in granja.bloqueadas():\n    drone.ir_a(x, y)\n    drone.comprar_maceta()\n    drone.sembrar()' },
{ label:'Informe del huerto', code:'print(granja.macetas())\nprint(granja.monedas())\nprint(granja.disponibles())' },
],
};
const cmds = porModo[modo.id] || porModo.explorador;
cmds.forEach(c => {
const btn = document.createElement('span');
btn.className = 'quick-cmd-btn';
btn.textContent = c.label;
btn.onclick = () => { document.getElementById('python-editor').value = c.code; };
container.appendChild(btn);
});
}

// ============================================================
//  AIDEN AI ASSISTANT (INTEGRACIÓN GEMINI)
// ============================================================
const AIDEN_TEMAS = [
{ etiqueta: '🪙 ¿Para qué sirven las monedas?', pregunta: '¿Para qué sirven las monedas?' },
{ etiqueta: '🪴 ¿Cómo compro una maceta?', pregunta: '¿Cómo compro una maceta?' },
{ etiqueta: '🌱 ¿Cómo planto una fruta?', pregunta: '¿Cómo planto una fruta en la maceta?' },
{ etiqueta: '💧 ¿Cómo riego?', pregunta: '¿Cómo riego una planta?' },
{ etiqueta: '🚨 ¿Cuál atiendo primero?', pregunta: '¿Qué planta está en peligro?' },
{ etiqueta: '🔁 ¿Cómo uso un for?', pregunta: '¿Cómo uso un bucle for?' },
{ etiqueta: '🎯 ¿Cuál es mi misión?', pregunta: '¿Cuál es mi misión?' },
{ etiqueta: '🥭 Cuéntame de una fruta', pregunta: '¿Qué es el jocote?' }
];

function initAidenTopics() {
const cont = document.getElementById('aiden-topics');
if (!cont) return;
cont.innerHTML = '';
AIDEN_TEMAS.forEach(t => {
const b = document.createElement('button');
b.className = 'topic-btn';
b.textContent = t.etiqueta;
b.onclick = () => {
const inp = document.getElementById('aiden-input');
if (inp) inp.value = t.pregunta;
askAiden();
};
cont.appendChild(b);
});
}

function chatVacio() {
const t = document.getElementById('aiden-thread');
if (!t || t.children.length) return;
const d = document.createElement('div');
d.className = 'aiden-empty';
d.textContent = 'Escríbeme lo que quieras sobre el huerto: las frutas, los comandos o las monedas. También puedes tocar una de las preguntas de abajo.';
t.appendChild(d);
}

function limpiarChat() {
const t = document.getElementById('aiden-thread');
if (t) t.innerHTML = '';
aidenHistory = [];
chatHistorial = [];
guardarHistorial();
explicado = {};
chatVacio();
}

const CHAT_KEY = 'agrobot_chat_v1';
const CHAT_MAX = 80;
let chatHistorial = [];
try { chatHistorial = JSON.parse(localStorage.getItem(CHAT_KEY) || '[]'); } catch (e) { chatHistorial = []; }
function guardarHistorial() {
try { localStorage.setItem(CHAT_KEY, JSON.stringify(chatHistorial.slice(-CHAT_MAX))); } catch (e) {}
}
function horaCorta(ts) {
const d = new Date(ts || Date.now());
return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}

function aidenBubble(text, who, opts) {
opts = opts || {};
const t = document.getElementById('aiden-thread');
if (!t) return null;
const vacio = t.querySelector('.aiden-empty');
if (vacio) vacio.remove();
const b = document.createElement('div');
b.className = 'bubble ' + (who || 'ai');
b.textContent = text;
if (!opts.temporal) {
const hora = document.createElement('span');
hora.className = 'bubble-time';
hora.textContent = horaCorta(opts.ts);
b.appendChild(hora);
}
t.appendChild(b);
while (t.children.length > CHAT_MAX + 10) t.removeChild(t.firstChild);
t.scrollTop = t.scrollHeight;
if (!opts.temporal && !opts.silencioso) {
chatHistorial.push({ r: (who || 'ai').split(' ')[0], t: text, ts: opts.ts || Date.now() });
if (chatHistorial.length > CHAT_MAX) chatHistorial = chatHistorial.slice(-CHAT_MAX);
guardarHistorial();
}
return b;
}

function cargarHistorial() {
const t = document.getElementById('aiden-thread');
if (!t) return;
t.innerHTML = '';
if (!chatHistorial.length) { chatVacio(); return; }
const sep = document.createElement('div');
sep.className = 'chat-day';
sep.textContent = 'Conversaciones anteriores';
t.appendChild(sep);
chatHistorial.slice(-CHAT_MAX).forEach(m => {
aidenBubble(m.t, m.r === 'me' ? 'me' : 'ai', { silencioso: true, ts: m.ts });
});
const sep2 = document.createElement('div');
sep2.className = 'chat-day';
sep2.textContent = 'Hoy';
t.appendChild(sep2);
t.scrollTop = t.scrollHeight;
}

function estadoDelHuerto() {
if (gameState !== 'game' || !farmGrid.length) return 'El jugador todavia no ha entrado al huerto.';
let criticas = 0, vacias = 0, viva = 0, bloqueadas = 0;
const nombres = [];
for (let x = 0; x < GRID_COLS; x++) for (let y = 0; y < GRID_ROWS; y++) {
const c = farmGrid[x][y];
if (!c || c.isDepot) continue;
if (c.locked) { bloqueadas++; continue; }
if (c.isEmpty) { vacias++; continue; }
viva++;
if (c.health < 2) { criticas++; if (nombres.length < 4) nombres.push(`${PLANT_NAMES[c.type]} en (${x},${y})`); }
}
return `Nivel ${currentLevel}. Dron en (${drone.x},${drone.y}) con ${Math.floor(drone.bucket)}/${drone.maxBucket} de agua. `
+ `${viva} plantas vivas, ${criticas} en peligro${nombres.length ? ' (' + nombres.join(', ') + ')' : ''}. `
+ `${contarMacetas()} macetas de ${MAX_PARCELAS}, ${vacias} macetas vacias, ${bloqueadas} lugares por comprar, `
+ `${semillas.length} frutas todavia sin plantar, ${coins} monedas.`;
}

function construirContexto() {
const modo = getAgeMode(currentUser ? currentUser.age : 10);
const nombre = currentUser ? currentUser.name : 'el jugador';
return [
'Eres AIDEN, el asistente del juego educativo AgroBot Pro.',
`Hablas con ${nombre}, que juega en modo ${modo.nombre}. ${modo.tono}`,
'',
'REGLAS DE RESPUESTA:',
`1. Responde SIEMPRE en espanol, en como maximo ${AIDEN_CONFIG.maxPalabras} palabras. Nada de introducciones.`,
'2. No uses markdown, ni asteriscos, ni titulos. Texto plano, porque se lee en voz alta.',
'3. Si preguntan como hacer algo en el juego, da la orden exacta, por ejemplo: drone.ir_a(2, 1) y luego drone.regar().',
'4. Si la pregunta no tiene nada que ver con el huerto, las frutas o programar el dron, dilo en una linea y ofrece un tema del juego.',
'5. Nunca pidas datos personales ni enlaces externos. Nunca inventes frutas ni comandos que no existan.',
'',
'ORDENES QUE EXISTEN:',
'drone.ir_a(x, y), drone.arriba(n), drone.abajo(n), drone.izquierda(n), drone.derecha(n),',
'drone.recoger_cubeta(), drone.regar(), drone.comprar_maceta(), drone.sembrar("mango"),',
'granja.criticas(), granja.salud(x, y), granja.info(x, y), granja.tiempo_sin_riego(x, y),',
'granja.nivel_cubeta(), granja.vacias(), granja.bloqueadas(), granja.macetas(), granja.disponibles(), granja.monedas().',
'Teclas: W A S D o flechas para mover, E hace lo que toque, B compra maceta, R compra planta, ESC pausa y tienda.',
'',
'REGLAS DEL JUEGO:',
`El huerto tiene ${MAX_PARCELAS} lugares para macetas y 20 frutas salvadorenas distintas: ninguna se repite nunca.`,
`El jugador empieza con solo ${MACETAS_INICIALES} macetas; las otras ${MAX_PARCELAS - MACETAS_INICIALES} estan cerradas y hay que comprarlas.`,
`Al iniciar sesion se regalan ${ECONOMIA.monedasInicio} monedas. Comprar una maceta cuesta ${ECONOMIA.precioMaceta} y la planta que va dentro cuesta ${ECONOMIA.precioPlanta}.`,
'Cada planta necesita riego cada hora real; si pasa mas tiempo su salud baja hasta 0 y se pierde.',
`Se ganan ${ECONOMIA.porRiego} monedas por regar y ${ECONOMIA.porRescate} por salvar una planta en peligro.`,
`Las monedas tambien sirven para recargar agua a distancia (${ECONOMIA.precioAgua}), pedir una pista (${ECONOMIA.precioPista}) o fertilizante (${ECONOMIA.precioFertilizante}).`,
'',
'FRUTAS: ' + TODAS_FRUTAS.map(f => PLANT_NAMES[f]).join(', ') + '.',
'',
'ESTADO ACTUAL: ' + estadoDelHuerto()
].join('\n');
}

async function consultarGemini(pregunta) {
if (!AIDEN_CONFIG.apiKey) return null;
const partes = [{ text: construirContexto() }];
aidenHistory.forEach(h => partes.push({ text: `Jugador: ${h.q}\nAIDEN: ${h.a}` }));
partes.push({ text: `Jugador: ${pregunta}\nAIDEN:` });
const cuerpo = JSON.stringify({ contents: [{ role: 'user', parts: partes }], generationConfig: { maxOutputTokens: 300 } });
for (const modelo of AIDEN_CONFIG.modelos) {
try {
const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
method: 'POST',
headers: { 'Content-Type': 'application/json', 'x-goog-api-key': AIDEN_CONFIG.apiKey },
body: cuerpo
});
if (!r.ok) { console.warn('AIDEN: ' + modelo + ' respondio ' + r.status); continue; }
const data = await r.json();
const cand = (data.candidates || [])[0];
const texto = cand && cand.content && Array.isArray(cand.content.parts)
? cand.content.parts.map(p => p.text || '').join('').trim() : '';
if (texto) return limpiarRespuesta(texto);
} catch (e) { console.warn('AIDEN: fallo ' + modelo, e); }
}
return null;
}

function limpiarRespuesta(t) {
return t.replace(/[*_#`]+/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

// ------------------------------------------------------------
//  Cerebro local: AIDEN responde aunque no haya internet ni clave
// ------------------------------------------------------------
function respuestaLocal(preguntaOriginal) {
const q = preguntaOriginal.toLowerCase()
.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const modo = getAgeMode(currentUser ? currentUser.age : 10);

for (const f of TODAS_FRUTAS) {
const nombre = PLANT_NAMES[f].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(' ')[0];
if (q.includes(nombre) || q.includes(f)) {
const bio = PLANT_BIOGRAPHIES[f];
const dato = bio.datos && bio.datos[0] ? ` ${bio.datos[0].label}: ${bio.datos[0].value}.` : '';
return `${bio.emoji} ${bio.nombre} (${bio.cientifico}). ${bio.biografia}${dato}`;
}
}
if (q.includes('moneda') || q.includes('coin') || q.includes('tienda') || q.includes('sirven') || q.includes('sirve')) {
return `Al entrar te regalo ${ECONOMIA.monedasInicio} monedas. Sirven sobre todo para hacer crecer tu huerto: una maceta cuesta ${ECONOMIA.precioMaceta} (tecla B) y la planta que va dentro cuesta ${ECONOMIA.precioPlanta} (tecla R). También puedes comprar agua a distancia (${ECONOMIA.precioAgua}), una pista mía (${ECONOMIA.precioPista}) o fertilizante (${ECONOMIA.precioFertilizante}). Ganas más regando: ${ECONOMIA.porRiego} por riego y ${ECONOMIA.porRescate} por salvar una planta. Tienes ${coins} 🪙.`;
}
if (q.includes('maceta') || q.includes('cuadro') || q.includes('bloque') || q.includes('cerrad') || q.includes('candado')) {
return `Empiezas con ${MACETAS_INICIALES} macetas de ${MAX_PARCELAS}. Los lugares con 🔒 están cerrados: ponte encima y pulsa B para comprar la maceta por ${ECONOMIA.precioMaceta} monedas. Ahora tienes ${contarMacetas()} macetas y ${coins} 🪙.`;
}
if (q.includes('sembrar') || q.includes('siembra') || q.includes('semilla') || q.includes('plantar') || q.includes('planta nueva') || q.includes('comprar')) {
return `Primero necesitas una maceta (tecla B, ${ECONOMIA.precioMaceta} 🪙). Cuando la maceta esté vacía, pulsa R y elige qué fruta plantar por ${ECONOMIA.precioPlanta} monedas. Te quedan ${semillas.length} frutas distintas por comprar, y ninguna se repite.`;
}
if (q.includes('regar') || q.includes('riego') || q.includes('riega') || q.includes('agua') || q.includes('cubeta')) {
return 'Ve al depósito en (0,0) y usa drone.recoger_cubeta(). Luego colócate sobre la planta y usa drone.regar() o la tecla E. Cada riego gasta una unidad de agua.';
}
if (q.includes('critic') || q.includes('peligro') || q.includes('muriendo') || q.includes('salvar')) {
const lista = granjaAPI().criticas();
if (lista.length === 0) return 'Ahora mismo no hay ninguna planta en peligro. Buen trabajo.';
const p = lista[0];
return `Hay ${lista.length} plantas en peligro. Empieza por ${PLANT_NAMES[farmGrid[p[0]][p[1]].type]} en (${p[0]},${p[1]}): drone.ir_a(${p[0]}, ${p[1]}) y luego drone.regar().`;
}
if (q.includes('for') || q.includes('bucle') || q.includes('repetir') || q.includes('loop')) {
return 'Un for repite lo mismo para cada casilla. Ejemplo:\nfor x, y in granja.criticas():\n    drone.ir_a(x, y)\n    drone.regar()';
}
if (q.includes(' if') || q.startsWith('if') || q.includes('condicion') || q.includes('decidir')) {
return 'Un if decide. Ejemplo:\nif granja.salud(2, 1) < 2:\n    drone.ir_a(2, 1)\n    drone.regar()';
}
if (q.includes('mision') || q.includes('objetivo') || q.includes('que hago') || q.includes('que tengo que hacer')) {
return `${modo.emoji} Eres ${modo.nombre}. Tu misión: ${mision ? mision.texto : modo.objetivo.texto}. ${modo.consejo}`;
}
if (q.includes('comando') || q.includes('orden') || q.includes('ayuda') || q.includes('como se juega')) {
return 'Órdenes: drone.ir_a(x, y), drone.recoger_cubeta(), drone.regar(), drone.sembrar(). Preguntas: granja.criticas(), granja.salud(x, y), granja.vacias(). Teclas: WASD mover, E regar, R sembrar, ESC pausa.';
}
if (q.includes('hola') || q.includes('buenas') || q.includes('quien eres')) {
return `Hola${currentUser ? ' ' + currentUser.name : ''}. Soy AIDEN. Puedo explicarte cualquiera de las 20 frutas, decirte qué comando usar o para qué sirven tus monedas. ¿Qué quieres saber?`;
}
return 'Puedo ayudarte con tres cosas: las 20 frutas salvadoreñas del huerto, los comandos para programar el dron, y en qué gastar tus monedas. Pregúntame por ejemplo "¿qué es el copinol?" o "¿cómo riego todas las plantas en peligro?".';
}

// ============================================================
//  MICRÓFONO SIEMPRE ESCUCHANDO + PALABRA CLAVE "AIDEN ACTIVATE"
// ============================================================
const PALABRAS_CLAVE = ['aiden activate', 'aiden actívate', 'aiden activate', 'aiden activar',
'ayden activate', 'aden activate', 'eiden activate', 'aiden active',
'hey aiden', 'oye aiden', 'aiden'];
const MIC = { rec: null, encendido: false, escuchando: false, soportado: false, temporizador: null, reiniciar: null, error: '' };

function normalizarVoz(t) {
return (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[.,;:!?¿¡]/g, ' ').replace(/\s+/g, ' ').trim();
}

function pintarMic(estado, texto) {
const dot = document.getElementById('mic-dot');
const txt = document.getElementById('mic-text');
const btn = document.getElementById('mic-btn');
const badge = document.getElementById('mic-badge');
const badgeTxt = document.getElementById('mic-badge-text');
if (dot) { dot.classList.remove('on', 'hot'); if (estado === 'on') dot.classList.add('on'); if (estado === 'hot') dot.classList.add('hot'); }
if (txt) txt.innerHTML = texto;
if (btn) btn.textContent = MIC.encendido ? 'Apagar' : 'Activar';
if (badge) {
badge.classList.toggle('visible', MIC.encendido);
badge.classList.toggle('hot', estado === 'hot');
}
if (badgeTxt) badgeTxt.textContent = estado === 'hot' ? '🎙️ Te escucho…' : 'Di "AIDEN" y tu pregunta';
}

function iniciarMicrofono(silencioso) {
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) {
MIC.soportado = false;
pintarMic('off', 'Tu navegador no permite micrófono. Usa Chrome o Edge y escribe abajo.');
return false;
}
MIC.soportado = true;
if (MIC.rec) { try { MIC.rec.stop(); } catch (e) {} }
const rec = new SR();
rec.lang = 'es-MX';
rec.continuous = true;
rec.interimResults = true;
rec.maxAlternatives = 1;

rec.onstart = () => {
MIC.encendido = true;
MIC.error = '';
pintarMic('on', 'Escuchando. Di <b>"AIDEN"</b> y luego tu pregunta.');
};

rec.onresult = (ev) => {
let finales = '', parcial = '';
for (let i = ev.resultIndex; i < ev.results.length; i++) {
const txt = ev.results[i][0].transcript;
if (ev.results[i].isFinal) finales += txt + ' '; else parcial += txt + ' ';
}
const vistaPrevia = normalizarVoz(finales + parcial);
if (vistaPrevia && MIC.escuchando) {
pintarMic('hot', '🎙️ <span class="mic-heard">' + vistaPrevia + '</span>');
}
if (!finales.trim()) {
// aun sin frase final: revisamos si ya se dijo la palabra clave
if (!MIC.escuchando && detectarClave(vistaPrevia) !== null) despertarAiden();
return;
}
const dicho = normalizarVoz(finales);
if (MIC.escuchando) {
detenerEspera();
if (dicho.length > 1) askAidenTexto(dicho, true);
return;
}
const resto = detectarClave(dicho);
if (resto === null) return;
if (resto.length > 1) { askAidenTexto(resto, true); }
else { despertarAiden(); }
};

rec.onerror = (ev) => {
if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
MIC.encendido = false;
MIC.error = 'permiso';
pintarMic('off', 'No diste permiso al micrófono. Toca el candado 🔒 de la barra del navegador y permite el micrófono.');
} else if (ev.error === 'audio-capture') {
MIC.encendido = false;
pintarMic('off', 'No encuentro un micrófono conectado.');
}
};

rec.onend = () => {
// se reinicia solo para quedar siempre activo mientras el juego esté abierto
if (MIC.encendido) {
clearTimeout(MIC.reiniciar);
MIC.reiniciar = setTimeout(() => { try { rec.start(); } catch (e) {} }, 350);
} else if (!MIC.error) {
pintarMic('off', 'Micrófono apagado');
}
};

MIC.rec = rec;
MIC.encendido = true;
try { rec.start(); } catch (e) { /* ya estaba iniciado */ }
if (!silencioso) showToast('🎙️ Micrófono activo. Di "AIDEN"');
return true;
}

function detectarClave(frase) {
for (const clave of PALABRAS_CLAVE) {
const i = frase.indexOf(clave);
if (i !== -1) return frase.slice(i + clave.length).trim();
}
return null;
}

function despertarAiden() {
MIC.escuchando = true;
pintarMic('hot', '🎙️ <b>Te escucho…</b> di tu pregunta.');
showToast('🎙️ AIDEN te escucha');
if (voiceEnabled) speak('Te escucho.');
clearTimeout(MIC.temporizador);
MIC.temporizador = setTimeout(() => {
detenerEspera();
pintarMic('on', 'Volví a dormir. Di <b>"AIDEN"</b> cuando quieras.');
}, 10000);
}

function detenerEspera() {
MIC.escuchando = false;
clearTimeout(MIC.temporizador);
pintarMic('on', 'Escuchando. Di <b>"AIDEN"</b> y luego tu pregunta.');
}

function apagarMicrofono() {
MIC.encendido = false;
MIC.escuchando = false;
clearTimeout(MIC.temporizador);
clearTimeout(MIC.reiniciar);
if (MIC.rec) { try { MIC.rec.stop(); } catch (e) {} }
pintarMic('off', 'Micrófono apagado');
}

function toggleMicrofono() {
if (MIC.encendido) apagarMicrofono();
else iniciarMicrofono(false);
if (currentUser) { currentUser.micro = MIC.encendido; saveUserData(currentUser); }
}

async function askAidenTexto(texto, porVoz) {
const inputEl = document.getElementById('aiden-input');
if (inputEl) inputEl.value = texto;
const tab = document.querySelectorAll('.panel-tab')[1];
if (tab && !tab.classList.contains('active')) switchTab('aiden', tab);
if (porVoz && !voiceEnabled) { voiceEnabled = true; actualizarBotonVoz(); }
await askAiden();
}

async function askAiden() {
const inputEl = document.getElementById('aiden-input');
const statusEl = document.getElementById('aiden-status');
const pregunta = inputEl.value.trim();
if (!pregunta) return;
inputEl.value = '';
aidenBubble(pregunta, 'me');
const pensando = aidenBubble('Pensando…', 'ai thinking', { temporal: true });
if (statusEl) statusEl.textContent = 'Pensando…';

let respuesta = null;
if (navigator.onLine !== false) respuesta = await consultarGemini(pregunta);
let enLinea = !!respuesta;
if (!respuesta) respuesta = respuestaLocal(pregunta);

if (pensando && pensando.parentNode) pensando.parentNode.removeChild(pensando);
aidenBubble(respuesta, 'ai');
if (statusEl) statusEl.textContent = enLinea ? 'Asistente IA · En línea' : 'Asistente IA · Modo sin conexión';
aidenHistory.push({ q: pregunta, a: respuesta });
if (aidenHistory.length > AIDEN_CONFIG.maxHistorial) aidenHistory.shift();
if (voiceEnabled) speak(respuesta.slice(0, 320));
}
// alias por compatibilidad
const askGemini = askAiden;

function aidenSpeak(msg) {
aidenBubble(msg, 'ai');
if (voiceEnabled) speak(msg);
}

// ============================================================
//  VOZ
// ============================================================
let vozElegida = '';

function vocesEspanol() {
if (!speechSynth) return [];
return speechSynth.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith('es'));
}

function listarVoces() {
const sel = document.getElementById('voice-select');
if (!sel) return;
const voces = vocesEspanol();
sel.innerHTML = '<option value="">Voz automática</option>';
voces.forEach(v => {
const o = document.createElement('option');
o.value = v.name;
o.textContent = `${v.name} (${v.lang})`;
sel.appendChild(o);
});
if (currentUser && currentUser.voz && voces.some(v => v.name === currentUser.voz)) {
vozElegida = currentUser.voz;
sel.value = vozElegida;
}
}

function setVoice(nombre) {
vozElegida = nombre || '';
if (currentUser) { currentUser.voz = vozElegida; saveUserData(currentUser); }
if (vozElegida) { voiceEnabled = true; actualizarBotonVoz(); }
speak('Hola, así sonaré desde ahora.');
}

function elegirVoz() {
const voces = vocesEspanol();
if (!voces.length) return null;
if (vozElegida) {
const v = voces.find(v => v.name === vozElegida);
if (v) return v;
}
// preferimos español de América: suena más cercano en El Salvador
for (const cod of VOICE_CONFIG.prefer) {
const v = voces.find(v => v.lang.toLowerCase() === cod.toLowerCase());
if (v) return v;
}
return voces[0];
}

function speak(text, opts) {
opts = opts || {};
if (!speechSynth || !text) { if (opts.onend) opts.onend(); return; }
speechSynth.cancel();
const utt = new SpeechSynthesisUtterance(text);
const v = elegirVoz();
if (v) { utt.voice = v; utt.lang = v.lang; } else { utt.lang = 'es-MX'; }
utt.rate = VOICE_CONFIG.rate;
utt.pitch = VOICE_CONFIG.pitch;
utt.volume = VOICE_CONFIG.volume;
utt.onend = () => { if (opts.onend) opts.onend(); };
utt.onerror = () => { if (opts.onend) opts.onend(); };
speechSynth.speak(utt);
}
// compatibilidad con llamadas antiguas
function speakText(text) { if (voiceEnabled) speak(text); }

function actualizarBotonVoz() {
const btn = document.getElementById('voice-btn');
if (!btn) return;
btn.textContent = voiceEnabled ? '🔊 VOZ ON' : '🔇 VOZ OFF';
btn.classList.toggle('speaking', voiceEnabled);
}

function toggleVoice() {
voiceEnabled = !voiceEnabled;
actualizarBotonVoz();
if (!voiceEnabled && speechSynth) speechSynth.cancel();
else speak('Voz activada.');
}

if (speechSynth) speechSynth.onvoiceschanged = () => { listarVoces(); };

// ============================================================
//  BIOGRAPHY POPUP
// ============================================================
function updatePlantInfoPanel() {
const panel = document.getElementById('plant-info');
if (drone.x < 0 || drone.x >= GRID_COLS || drone.y < 0 || drone.y >= GRID_ROWS) {
panel.classList.remove('visible');
return;
}
const cell = farmGrid[drone.x][drone.y];
if (!cell) { panel.classList.remove('visible'); return; }
if (cell.isDepot) {
panel.innerHTML = `
<div class="plant-info-header">
<div class="plant-info-emoji">💧</div>
<div class="plant-info-title">
<div class="plant-info-name">Depósito de Agua</div>
<div class="plant-info-type">Estación de recarga</div>
</div>
</div>
<div class="plant-info-row">
<span class="plant-info-label">💧 Agua en cubeta</span>
<span class="plant-info-value">${Math.floor(drone.bucket)}/${drone.maxBucket}</span>
</div>
`;
panel.classList.add('visible');
return;
}
if (cell.locked) {
panel.innerHTML = `
<div class="plant-info-header">
<div class="plant-info-emoji">🔒</div>
<div class="plant-info-title">
<div class="plant-info-name">Lugar cerrado</div>
<div class="plant-info-type">Aquí falta una maceta</div>
</div>
</div>
<div class="plant-info-row">
<span class="plant-info-label">🪴 Pulsa B para comprarla</span>
<span class="plant-info-value" style="color:${coins >= ECONOMIA.precioMaceta ? '#ffd83d' : '#ff6b6b'}">${ECONOMIA.precioMaceta} 🪙</span>
</div>
<div class="plant-info-row">
<span class="plant-info-label">Tienes</span>
<span class="plant-info-value">${coins} 🪙</span>
</div>
`;
panel.classList.add('visible');
return;
}
if (cell.isEmpty) {
panel.innerHTML = `
<div class="plant-info-header">
<div class="plant-info-emoji">🪴</div>
<div class="plant-info-title">
<div class="plant-info-name">Maceta vacía</div>
<div class="plant-info-type">Lista para una planta</div>
</div>
</div>
<div class="plant-info-row">
<span class="plant-info-label">🌱 Pulsa R y elige la fruta</span>
<span class="plant-info-value" style="color:${coins >= ECONOMIA.precioPlanta ? '#4ade80' : '#ff6b6b'}">${ECONOMIA.precioPlanta} 🪙</span>
</div>
<div class="plant-info-row">
<span class="plant-info-label">Frutas por comprar</span>
<span class="plant-info-value">${semillas.length}</span>
</div>
`;
panel.classList.add('visible');
return;
}
const needs = PLANT_NEEDS[cell.type];
const healthPct = (cell.health / 5) * 100;
const healthColor = healthPct > 60 ? '#4ade80' : healthPct > 35 ? '#ffd83d' : '#ff6b6b';
const now = Date.now();
const timeSinceWatered = now - cell.lastWatered;
const minutesSinceWatered = Math.floor(timeSinceWatered / 60000);
const hoursSinceWatered = Math.floor(minutesSinceWatered / 60);
const minsRemaining = minutesSinceWatered % 60;
let timeText = hoursSinceWatered > 0 ? `${hoursSinceWatered}h ${minsRemaining}m` : `${minutesSinceWatered} min`;
let timeColor = '#4ade80';
if (timeSinceWatered > DECAY_START_MS) timeColor = '#ff6b6b';
else if (timeSinceWatered > DECAY_START_MS * 0.7) timeColor = '#ffd83d';
const stageNames = {1:'🌱 Brote', 2:'🌿 Plántula', 3:'🌳 Crecimiento', 4:'🌸 Floración', 5:'🍎 Madura'};
const stageName = stageNames[cell.stage] || 'Desconocido';
panel.innerHTML = `
<div class="plant-info-header">
<div class="foto-fruta plant-info-thumb" id="pi-thumb"><span class="foto-emoji">${PLANT_EMOJI[cell.type] || '🍎'}</span></div>
<div class="plant-info-title">
<div class="plant-info-name">${PLANT_NAMES[cell.type] || cell.type}</div>
<div class="plant-info-type">Nivel ${currentLevel} · ${stageName}</div>
</div>
</div>
<div class="plant-info-row">
<span class="plant-info-label">❤️ Salud</span>
<span class="plant-info-value">${cell.health.toFixed(1)} / 5.0</span>
</div>
<div class="plant-info-bar">
<div class="plant-info-bar-fill" style="width:${healthPct}%;background:${healthColor}"></div>
</div>
<div class="plant-info-row">
<span class="plant-info-label">⏰ Sin riego</span>
<span class="plant-info-value" style="color:${timeColor}">${timeText}</span>
</div>
`;
panel.classList.add('visible');
const th = document.getElementById('pi-thumb');
if (th && th.dataset.tipo !== cell.type) pintarFotoFruta(th, cell.type);
explicarContexto(cell);
}

// ARREGLO TECLA E: lista de ventanas que pausan el juego.
const VENTANAS = ['bio-popup', 'picker-popup', 'shop-popup', 'mx-popup'];
function hayVentanaAbierta() {
return VENTANAS.some(id => {
const el = document.getElementById(id);
return el && el.classList.contains('visible');
});
}

let bioWatchdog = null;
let bioToken = 0;      // cada infografía tiene su número: los temporizadores viejos ya no cierran la nueva
let bioVistas = {};    // la biografía larga sale UNA vez por fruta en cada partida
function showPlantBiography(plantType) {
const bio = PLANT_BIOGRAPHIES[plantType];
if (!bio) return;
// ARREGLO: antes el juego se paraba 11 segundos CADA vez que regabas.
// Ahora la ficha completa sale la primera vez y luego solo un aviso corto.
if (bioVistas[plantType]) {
showToast(`${bio.emoji} ${bio.nombre} · ${bio.datos[0].label}: ${bio.datos[0].value}`);
return;
}
bioVistas[plantType] = true;
const miToken = ++bioToken;
gamePausedForBio = true;
const emojiEl = document.getElementById('bio-emoji');
if (emojiEl) emojiEl.textContent = bio.emoji;
document.getElementById('bio-title').textContent = bio.nombre;
document.getElementById('bio-scientific').textContent = bio.cientifico;
document.getElementById('bio-origin').textContent = `🌍 ${bio.origen}`;
document.getElementById('bio-body').textContent = bio.biografia;
const factsContainer = document.getElementById('bio-facts');
factsContainer.innerHTML = '';
bio.datos.forEach(d => {
const factEl = document.createElement('div');
factEl.className = 'bio-fact';
factEl.innerHTML = `<div class="bio-fact-label">${d.label}</div><div class="bio-fact-value">${d.value}</div>`;
factsContainer.appendChild(factEl);
});
const fotoEl = document.getElementById('bio-photo');
if (fotoEl) pintarFotoFruta(fotoEl, plantType);
document.getElementById('bio-popup').classList.add('visible');
document.getElementById('bio-voice-indicator').style.display = voiceEnabled ? 'flex' : 'none';
// SEGURO ANTI-CONGELAMIENTO: pase lo que pase, el juego se reanuda
clearTimeout(bioWatchdog);
bioWatchdog = setTimeout(() => { closeBio(miToken); }, 9000);
speakBiography(bio.voz, () => {
setTimeout(() => { closeBio(miToken); }, 1500);
});
}

function closeBio(token) {
// ARREGLO: un temporizador viejo ya no puede cerrar una ventana nueva.
if (token !== undefined && token !== bioToken) return;
clearTimeout(bioWatchdog);
bioWatchdog = null;
bioToken++;
const pop = document.getElementById('bio-popup');
if (pop) pop.classList.remove('visible');
const ind = document.getElementById('bio-voice-indicator');
if (ind) ind.style.display = 'none';
if (speechSynth) speechSynth.cancel();
gamePausedForBio = hayVentanaAbierta();
}

// Cerrar cualquier ventana que pause el juego (evita quedarse trabado)
function cerrarVentanas() {
let cerre = false;
const bio = document.getElementById('bio-popup');
if (bio && bio.classList.contains('visible')) { closeBio(); cerre = true; }
const pick = document.getElementById('picker-popup');
if (pick && pick.classList.contains('visible')) { cerrarSelectorPlanta(); cerre = true; }
const shop = document.getElementById('shop-popup');
if (shop && shop.classList.contains('visible')) { closeShop(); cerre = true; }
const mundo = document.getElementById('mx-popup');
if (mundo && mundo.classList.contains('visible')) {
if (typeof mxCerrar === 'function') mxCerrar(); else mundo.classList.remove('visible');
cerre = true;
}
gamePausedForBio = false;
return cerre;
}

function speakBiography(text, onComplete) {
const ind = document.getElementById('bio-voice-indicator');
if (!voiceEnabled || !speechSynth) {
if (ind) ind.style.display = 'none';
setTimeout(() => { if (onComplete) onComplete(); }, 3500);
return;
}
speak(text, { onend: () => {
if (ind) ind.style.display = 'none';
if (onComplete) onComplete();
}});
}

// ============================================================
//  UI HELPERS
// ============================================================
let toastTimeout;
function showToast(msg, warn = false) {
const toast = document.getElementById('toast');
toast.textContent = msg;
toast.style.borderColor = warn ? 'var(--warn)' : 'var(--cyan)';
toast.style.color = warn ? 'var(--warn)' : 'var(--cyan)';
toast.classList.add('show');
clearTimeout(toastTimeout);
toastTimeout = setTimeout(() => toast.classList.remove('show'), 2200);
}

function switchTab(name, el) {
document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
el.classList.add('active');
document.getElementById('tab-' + name).classList.add('active');
}

function openManual(tab) {
document.getElementById('manual-popup').style.display = 'flex';
if (tab) {
const btns = document.querySelectorAll('.m-tab');
btns.forEach(b => { if ((b.getAttribute('onclick') || '').includes(`'${tab}'`)) switchManualTab(tab, b); });
}
}
function closeManual() { document.getElementById('manual-popup').style.display = 'none'; }

function switchManualTab(name, el) {
document.querySelectorAll('.m-tab').forEach(t => t.classList.remove('active'));
document.querySelectorAll('.m-tab-panel').forEach(p => p.style.display = 'none');
el.classList.add('active');
document.getElementById('manual-' + name).style.display = 'block';
}

// ============================================================
//  TIENDA
// ============================================================
function openShop() {
pintarMonedas();
document.getElementById('shop-popup').classList.add('visible');
}
function closeShop() { document.getElementById('shop-popup').classList.remove('visible'); }

function buyItem(id) {
if (id === 'maceta') {
closeShop();
comprarMaceta();
return;
} else if (id === 'planta') {
const c = farmGrid[drone.x] && farmGrid[drone.x][drone.y];
if (!c || c.locked) { showToast('🔒 Ponte sobre una maceta vacía (o compra la maceta)', true); return; }
if (!c.isEmpty) { showToast('🪴 Esa maceta ya tiene planta', true); return; }
closeShop();
intentarSembrar();
return;
} else if (id === 'agua') {
if (drone.bucket >= drone.maxBucket) { showToast('💧 Tu cubeta ya está llena', true); return; }
if (!spendCoins(ECONOMIA.precioAgua)) return;
drone.bucket = drone.maxBucket;
showToast('💧 Cubeta llena sin volver al depósito');
logConsole('💧 Recarga comprada en la tienda.', 'info');
} else if (id === 'pista') {
if (!spendCoins(ECONOMIA.precioPista)) return;
const lista = granjaAPI().criticas();
if (lista.length === 0) aidenSpeak('Ninguna planta está en peligro ahora. Aprovecha para sembrar tierra vacía con la tecla R.');
else {
const p = lista[0];
const nom = PLANT_NAMES[farmGrid[p[0]][p[1]].type];
aidenSpeak(`Atiende primero ${nom} en (${p[0]},${p[1]}). Escribe:\ndrone.ir_a(0, 0)\ndrone.recoger_cubeta()\ndrone.ir_a(${p[0]}, ${p[1]})\ndrone.regar()`);
}
closeShop();
switchTab('aiden', document.querySelectorAll('.panel-tab')[1]);
} else if (id === 'fertilizante') {
if (!spendCoins(ECONOMIA.precioFertilizante)) return;
let n = 0;
for (let x = 0; x < GRID_COLS; x++) for (let y = 0; y < GRID_ROWS; y++) {
const c = farmGrid[x][y];
if (c && !c.isDepot && !c.isEmpty) {
c.health = Math.min(5, c.health + 1);
c.stage = getGrowthStage(c.health);
n++;
}
}
showToast(`🌿 Fertilizante aplicado a ${n} plantas`);
logConsole(`🌿 Fertilizante: +1 de salud a ${n} plantas.`, 'info');
}
pintarMonedas();
}

function togglePause() {
if (gameState === 'game') {
gameState = 'paused';
document.getElementById('pause-overlay').style.display = 'flex';
} else if (gameState === 'paused') {
resumeGame();
}
}

function resumeGame() {
gameState = 'game';
document.getElementById('pause-overlay').style.display = 'none';
lastTime = performance.now();
// ARREGLO: si ya había un bucle corriendo, se cancela; si no, el juego
// se aceleraba al doble cada vez que pausabas y reanudabas.
cancelAnimationFrame(farmAnimFrame);
farmAnimFrame = requestAnimationFrame(farmLoop);
}

function goToMenu() {
cerrarVentanas();
apagarMicrofono();
updateUserStats();
gameState = 'menu';
cancelAnimationFrame(farmAnimFrame);
document.getElementById('game-screen').style.display = 'none';
document.getElementById('pause-overlay').style.display = 'none';
document.getElementById('main-menu').style.display = 'block';
updateMenuUser();
cancelAnimationFrame(menuAnimFrame);
initMenuCanvas();
}

// ============================================================
//  PANTALLA DE SIEMBRA: el jugador elige qué frutos quiere
// ============================================================
function openSowScreen(level) {
currentLevel = level;
gameState = 'sow';
seleccionSiembra = (level === 1 ? LEVEL1_FRUITS : LEVEL2_FRUITS).slice(0, MACETAS_INICIALES);
document.getElementById('main-menu').style.display = 'none';
document.getElementById('sow-screen').classList.add('visible');
cancelAnimationFrame(menuAnimFrame);
renderSowGrid();
}

function renderSowGrid() {
const grid = document.getElementById('sow-grid');
if (!grid) return;
grid.innerHTML = '';
// solo las frutas del nivel elegido (nivel 1 clásicas, nivel 2 exóticas)
(currentLevel === 1 ? LEVEL1_FRUITS : LEVEL2_FRUITS).forEach(f => {
const on = seleccionSiembra.indexOf(f) !== -1;
const card = document.createElement('div');
card.className = 'sow-card' + (on ? ' on' : '');
card.innerHTML = `<div class="foto-fruta"><span class="foto-emoji">${PLANT_EMOJI[f]}</span></div>
<div class="sow-name">${PLANT_NAMES[f]}</div>
<div class="sow-tag">${LEVEL1_FRUITS.indexOf(f) !== -1 ? 'Clásica' : 'Exótica'}</div>`;
pintarFotoFruta(card.querySelector('.foto-fruta'), f);
card.onclick = () => toggleSow(f);
grid.appendChild(card);
});
const c = document.getElementById('sow-count');
if (c) c.textContent = `${seleccionSiembra.length} / ${MACETAS_INICIALES}`;
}

function toggleSow(f) {
const i = seleccionSiembra.indexOf(f);
if (i === -1) {
if (seleccionSiembra.length >= MACETAS_INICIALES) {
// al elegir una tercera, se suelta la primera: siempre quedan 2
seleccionSiembra.shift();
}
seleccionSiembra.push(f);
} else {
seleccionSiembra.splice(i, 1);
}
renderSowGrid();
}

function sowPreset(cual) {
if (cual === 'todas') seleccionSiembra = barajar((currentLevel === 1 ? LEVEL1_FRUITS : LEVEL2_FRUITS).slice()).slice(0, MACETAS_INICIALES);
else if (cual === 'ninguna') seleccionSiembra = [];
else seleccionSiembra = (currentLevel === 1 ? LEVEL1_FRUITS : LEVEL2_FRUITS).slice(0, MACETAS_INICIALES);
renderSowGrid();
}

function cancelSow() {
document.getElementById('sow-screen').classList.remove('visible');
document.getElementById('main-menu').style.display = 'block';
gameState = 'menu';
initMenuCanvas();
}

function confirmSow() {
if (seleccionSiembra.length !== MACETAS_INICIALES) { showToast(`🌱 Elige exactamente ${MACETAS_INICIALES} frutas`, true); return; }
document.getElementById('sow-screen').classList.remove('visible');
startGame(currentLevel);
}

function startGame(level) {
currentLevel = level;
gameState = 'game';
document.getElementById('main-menu').style.display = 'none';
document.getElementById('sow-screen').classList.remove('visible');
document.getElementById('game-screen').style.display = 'block';
cancelAnimationFrame(menuAnimFrame);
// monedas: se recuperan las guardadas y se regala el bono de inicio
coins = currentUser ? (currentUser.coins || 0) : 0;
const bono = bonoDeInicio();
initFarmCanvas();
initConsole();
aidenHistory = [];
explicado = {};
initAidenTopics();
cargarHistorial();
initFarm();
initQuickCmds();
listarVoces();
actualizarBotonVoz();
precargarFotos(seleccionSiembra);
if (!currentUser || currentUser.micro !== false) iniciarMicrofono(true);
else pintarMic('off', 'Micrófono apagado');
setCoins(coins + bono);
if (bono > 0) {
showToast(`🎁 ¡Te regalamos ${bono} monedas!`);
logConsole(`🎁 Regalo de bienvenida: ${bono} 🪙. Sirven para comprar macetas (${ECONOMIA.precioMaceta}) y plantas (${ECONOMIA.precioPlanta}). Total: ${coins} 🪙`, 'info');
}
syncDronePosition();
lastTime = performance.now();
requestAnimationFrame(farmLoop);
}

function initManualGrids() {
const gridL1 = document.getElementById('manual-grid-l1');
const gridL2 = document.getElementById('manual-grid-l2');
if (gridL1) {
gridL1.innerHTML = '';
LEVEL1_FRUITS.forEach(t => {
const card = document.createElement('div');
card.className = 'plant-card level1';
card.innerHTML = `<div class="emoji">${PLANT_EMOJI[t]}</div><div class="name">${PLANT_NAMES[t]}</div><div class="type">tipo:"${t}"</div>`;
gridL1.appendChild(card);
});
}
if (gridL2) {
gridL2.innerHTML = '';
LEVEL2_FRUITS.forEach(t => {
const card = document.createElement('div');
card.className = 'plant-card level2';
card.innerHTML = `<div class="emoji">${PLANT_EMOJI[t]}</div><div class="name">${PLANT_NAMES[t]}</div><div class="type">tipo:"${t}"</div>`;
gridL2.appendChild(card);
});
}
}

let vkbVisible = true;
let vkHoldTimers = {};
function vkPress(key) {
if (gameState === 'paused' && key === 'Escape') { resumeGame(); return; }
if (gameState !== 'game') return;
const elId = 'vk-' + (key === 'Escape' ? 'esc' : key);
const el = document.getElementById(elId);
if (el) el.classList.add('pressed');
handleKey(key);
if (['w','a','s','d'].includes(key)) {
vkHoldTimers[key] = setTimeout(function repeat() {
if (gameState === 'game') {
handleKey(key);
// los motores mejorados también hacen más rápidos los botones de la pantalla
const vel = (typeof MUNDO !== 'undefined') ? Math.max(55, 120 - (MUNDO.mejoras.motores || 0) * 22) : 120;
vkHoldTimers[key] = setTimeout(repeat, vel);
}
}, 300);
}
}
function vkRelease(key) {
const elId = 'vk-' + (key === 'Escape' ? 'esc' : key);
const el = document.getElementById(elId);
if (el) el.classList.remove('pressed');
if (vkHoldTimers[key]) {
clearTimeout(vkHoldTimers[key]);
delete vkHoldTimers[key];
}
}
function toggleVKB() {
vkbVisible = !vkbVisible;
const vkb = document.getElementById('vkb');
const btn = document.getElementById('vkb-toggle');
if (vkbVisible) {
vkb.classList.add('visible');
btn.style.opacity = '1';
} else {
vkb.classList.remove('visible');
btn.style.opacity = '0.4';
}
}

document.querySelectorAll('.avatar-opt').forEach(opt => {
opt.addEventListener('click', () => {
document.querySelectorAll('.avatar-opt').forEach(o => o.classList.remove('selected'));
opt.classList.add('selected');
});
});

window.addEventListener('resize', () => {
if (gameState === 'game') {
resizeFarmCanvas();
syncDronePosition();
}
else if (gameState === 'menu' && menuCanvas) {
menuCanvas.width = window.innerWidth;
menuCanvas.height = window.innerHeight;
}
if (starsCanvas) {
starsCanvas.width = window.innerWidth;
starsCanvas.height = window.innerHeight;
}
});

window.addEventListener('load', () => {
const savedUser = getUserData();
if (savedUser) {
normalizarUsuario(savedUser);
document.getElementById('acc-name').value = savedUser.name;
document.getElementById('acc-age').value = savedUser.age;
document.querySelectorAll('.avatar-opt').forEach(o => {
o.classList.remove('selected');
if (o.dataset.avatar === savedUser.avatar) o.classList.add('selected');
});
if (savedUser.avatarPhoto) { pendingPhoto = savedUser.avatarPhoto; pintarPreviewFoto(pendingPhoto); }
}
previewAgeMode();
listarVoces();
actualizarBotonVoz();
lastTime = performance.now();
initManualGrids();
});

// ============================================================
//  EXPANSIÓN v11 · MUNDO DESTRUIDO
//  Zonas, recursos, eventos, comunidades, construcción,
//  investigación, drones piratas, logros, ranking y finales.
//  Todo este bloque se apoya en el juego de arriba: no cambia
//  sus reglas, solo le agrega capas nuevas.
// ============================================================
const MX_ZONAS = [
{id:'ciudad', nombre:'Ciudad Abandonada', emoji:'🏚️', energia:4, seg:22, riesgo:0.30,
 desc:'Torres vacías y calles con chatarra. Alguien vivió aquí hace mucho.',
 loot:{piezas:[2,5], alimento:[0,2], monedas:[4,10]}},
{id:'desierto', nombre:'Desierto de Sal', emoji:'🏜️', energia:5, seg:26, riesgo:0.40,
 desc:'Antes fue un lago. Hoy solo queda sal, viento y silencio.',
 loot:{piezas:[1,3], agua:[0,3], monedas:[6,14]}},
{id:'bosque', nombre:'Bosque Seco', emoji:'🌲', energia:3, seg:18, riesgo:0.20,
 desc:'Árboles sin hojas. Bajo la tierra todavía hay semillas vivas.',
 loot:{alimento:[2,5], agua:[1,3], monedas:[3,8]}},
{id:'fabrica', nombre:'Fábrica Oxidada', emoji:'🏭', energia:6, seg:30, riesgo:0.50,
 desc:'Máquinas dormidas. Es el mejor lugar para conseguir repuestos.',
 loot:{piezas:[4,9], energia:[2,5], monedas:[5,12]}},
{id:'estacion', nombre:'Estación de Agua', emoji:'🚰', energia:5, seg:28, riesgo:0.35,
 desc:'La vieja planta potabilizadora. Sus tuberías guardan reservas.',
 loot:{agua:[3,8], piezas:[1,4], monedas:[4,9]}}
];

const MX_MEJORAS = [
{id:'motores', nombre:'Motores rápidos', emoji:'🌀', max:3, costo:{monedas:18, piezas:3},
 desc:'El dron se mueve más rápido cuando dejas la tecla apretada.'},
{id:'bateria', nombre:'Batería de larga duración', emoji:'🔋', max:3, costo:{monedas:20, piezas:4},
 desc:'Las expediciones gastan menos energía y duran menos tiempo.'},
{id:'capacidad', nombre:'Cubeta más grande', emoji:'🪣', max:3, costo:{monedas:22, piezas:3},
 desc:'+4 de agua en la cubeta por cada nivel.'},
{id:'sensores', nombre:'Sensores de humedad', emoji:'📡', max:3, costo:{monedas:16, piezas:5},
 desc:'Marca las plantas en peligro en el huerto y consigue más pistas del agua. En nivel 3 el mapa señala la zona.'},
{id:'herramientas', nombre:'Brazo cosechador', emoji:'🦾', max:3, costo:{monedas:24, piezas:6},
 desc:'Al regar una planta sana cosechas alimento 🍲 (y monedas desde el nivel 2, doble cosecha en el 3).'},
{id:'escuadron', nombre:'Dron explorador extra', emoji:'🚁', max:3, costo:{monedas:30, piezas:8},
 desc:'Un dron más para mandar de expedición al mismo tiempo.'}
];

const MX_EDIFICIOS = [
{id:'invernadero', nombre:'Invernadero', emoji:'🏠', max:3, costo:{monedas:25, piezas:5},
 desc:'Protege del sol: las plantas pierden salud 20% más lento por nivel.'},
{id:'solar', nombre:'Panel solar', emoji:'☀️', max:3, costo:{monedas:20, piezas:4},
 desc:'Genera +1 de energía ⚡ cada 20 segundos por nivel.'},
{id:'purificador', nombre:'Purificador de agua', emoji:'💧', max:3, costo:{monedas:28, piezas:6},
 desc:'Genera +1 de agua 💧 en la reserva cada 25 segundos por nivel.'},
{id:'baterias', nombre:'Banco de baterías', emoji:'🔌', max:3, costo:{monedas:18, piezas:5},
 desc:'Los paneles siguen produciendo durante un apagón y guardas +10 de energía por nivel.'},
{id:'reciclaje', nombre:'Reciclaje de agua', emoji:'♻️', max:3, costo:{monedas:26, piezas:7},
 desc:'20% de probabilidad por nivel de regar sin gastar agua de la cubeta.'}
];

const MX_INVESTIGACIONES = [
{id:'sequia', nombre:'Resistencia a la sequía', emoji:'🌵', seg:60, costo:{monedas:20, piezas:4, energia:5},
 desc:'Todas tus plantas aguantan 25% más tiempo sin agua.'},
{id:'genetica', nombre:'Cultivos experimentales', emoji:'🧬', seg:90, costo:{monedas:30, piezas:6, energia:8},
 desc:'Desbloquea variantes 🧬 de tus frutas: se pueden sembrar aunque ya no queden semillas y reciben la mitad del daño.'},
{id:'bioluz', nombre:'Cultivos futuristas', emoji:'✨', seg:120, costo:{monedas:35, piezas:8, energia:10},
 desc:'Las plantas bioluminiscentes te devuelven energía ⚡ cada vez que las riegas.'},
{id:'radar', nombre:'Radar subterráneo', emoji:'🛰️', seg:75, costo:{monedas:25, piezas:7, energia:6},
 desc:'Cada expedición te da una pista extra sobre dónde está el agua escondida.'}
];

const MX_COMUNIDADES = [
{id:'rioseco', nombre:'Río Seco', emoji:'🏘️', necesita:'agua', da:'alimento',
 desc:'Pozo agotado. Cambian comida por agua limpia.'},
{id:'valle', nombre:'Valle Nuevo', emoji:'🌾', necesita:'alimento', da:'piezas',
 desc:'Sus cultivos murieron. Tienen un taller lleno de repuestos.'},
{id:'chatarra', nombre:'Ciudad Chatarra', emoji:'⚙️', necesita:'piezas', da:'energia',
 desc:'Reparan de todo, pero se quedaron sin repuestos buenos.'},
{id:'faro', nombre:'Faro Solar', emoji:'🔆', necesita:'energia', da:'agua',
 desc:'Sus paneles se quemaron. A cambio comparten su reserva de agua.'}
];

const MX_LOGROS = [
{id:'sin_desperdicio', nombre:'No desperdicies agua', emoji:'💧', pista:'Riega mucho sin quedarte nunca en cero.'},
{id:'rescatista', nombre:'Rescata 5 comunidades', emoji:'🤝', pista:'Cumple 5 pedidos de las comunidades.'},
{id:'sin_bajas', nombre:'Misión sin pérdidas', emoji:'🛡️', pista:'Termina una misión sin que muera ninguna planta.'},
{id:'explorador', nombre:'Explorador total', emoji:'🗺️', pista:'Explora al 100% las cinco zonas del mundo.'},
{id:'acuifero', nombre:'El agua escondida', emoji:'🌊', pista:'Encuentra la reserva secreta de agua.'},
{id:'jardin', nombre:'Huerto completo', emoji:'🌳', pista:'Ten 10 plantas vivas al mismo tiempo.'},
{id:'cientifico', nombre:'Científico del fin del mundo', emoji:'🧪', pista:'Completa las cuatro investigaciones.'},
{id:'ingeniero', nombre:'Ingeniero jefe', emoji:'🏗️', pista:'Sube una construcción al nivel máximo.'},
{id:'cazador', nombre:'Cazador de piratas', emoji:'👾', pista:'Neutraliza 3 drones fuera de control.'},
{id:'planeta', nombre:'El planeta respira', emoji:'🌍', pista:'Sube el índice ecológico a 90%.'}
];

const MUNDO = {
recursos:{energia:12, piezas:4, alimento:2, agua:0},
topeEnergia:30,
eco:50, reputacion:0,
mejoras:{}, edificios:{}, investigando:null, investigado:{},
zonas:{}, expediciones:[], pistas:[], acuifero:null, acuiferoHallado:false,
comunidades:{}, entregas:0, evento:null, emergencia:null, pirata:null, piratasVencidos:0,
logros:{}, aprendizaje:{}, auto:false, autoT:0,
plantasMuertas:0, variantes:[], vecesRegado:0, sinAgua:false,
tActivo:0, ultimoEvento:0, ultimaEmergencia:0, iniciado:false, terminada:false,
puzzleActivo:null, dronAveriado:false, apagon:false
};
let mxPausa = false;
let mxSolarT = 0, mxAguaT = 0, mxTick = 0;

// ---------- utilidades ----------
function mxNum(r){ return Math.floor(r[0] + Math.random() * (r[1] - r[0] + 1)); }
function mxAzar(a){ return a[Math.floor(Math.random() * a.length)]; }
function mxNivel(obj, id){ return obj[id] || 0; }
function mxRec(k){ return MUNDO.recursos[k] || 0; }
function mxDar(k, n){
if (k === 'monedas') { addCoins(n, ''); return; }
MUNDO.recursos[k] = Math.max(0, (MUNDO.recursos[k] || 0) + n);
if (k === 'energia') MUNDO.recursos.energia = Math.min(MUNDO.recursos.energia, MUNDO.topeEnergia);
mxPintarHUD();
}
function mxPuede(costo){
for (const k in costo) {
if (k === 'monedas') { if (coins < costo[k]) return false; }
else if (mxRec(k) < costo[k]) return false;
}
return true;
}
function mxCobrar(costo){
if (!mxPuede(costo)) {
const falta = Object.keys(costo).map(k => `${costo[k]} ${mxIcono(k)}`).join(' + ');
showToast(`Te falta material: necesitas ${falta}`, true);
return false;
}
for (const k in costo) {
if (k === 'monedas') spendCoins(costo[k]);
else MUNDO.recursos[k] -= costo[k];
}
mxPintarHUD();
return true;
}
function mxIcono(k){
return ({monedas:'🪙', energia:'⚡', piezas:'🔩', alimento:'🍲', agua:'💧'})[k] || k;
}
function mxCostoTxt(c){ return Object.keys(c).map(k => `${c[k]} ${mxIcono(k)}`).join(' · '); }
function mxEco(n){
MUNDO.eco = Math.max(0, Math.min(100, MUNDO.eco + n));
mxPintarHUD();
}
function mxRep(n){ MUNDO.reputacion = Math.max(0, MUNDO.reputacion + n); mxPintarHUD(); }

// ---------- HUD ----------
function mxPintarHUD(){
const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
set('mx-energia', Math.floor(MUNDO.recursos.energia));
set('mx-piezas', Math.floor(MUNDO.recursos.piezas));
set('mx-alimento', Math.floor(MUNDO.recursos.alimento));
set('mx-agua', Math.floor(MUNDO.recursos.agua));
set('mx-eco', Math.round(MUNDO.eco));
set('mx-rep', MUNDO.reputacion);
set('mx-auto', MUNDO.auto ? 'ON' : 'OFF');
const dock = document.getElementById('mx-dock');
const res = document.getElementById('mx-res');
const enJuego = gameState === 'game';
if (dock) dock.classList.toggle('visible', enJuego);
if (res) res.classList.toggle('visible', enJuego);
}

// ---------- modal genérico ----------
function mxModal(titulo, html){
const pop = document.getElementById('mx-popup');
if (!pop) return;
document.getElementById('mx-title').textContent = titulo;
document.getElementById('mx-body').innerHTML = html;
pop.classList.add('visible');
gamePausedForBio = true;
}
function mxCerrar(){
const pop = document.getElementById('mx-popup');
if (pop) pop.classList.remove('visible');
gamePausedForBio = hayVentanaAbierta();
}
function mxRefrescar(){
const pop = document.getElementById('mx-popup');
if (!pop || !pop.classList.contains('visible')) return;
if (MUNDO.pantalla) MX.abrir(MUNDO.pantalla, true);
}

// ============================================================
//  PANTALLAS DEL MUNDO
// ============================================================
const MX = {};
MUNDO.pantalla = null;

MX.cerrar = mxCerrar;

MX.abrir = function(cual, silencioso){
if (gameState !== 'game') return;
MUNDO.pantalla = cual;
if (cual === 'zonas') mxPantallaZonas();
else if (cual === 'taller') mxPantallaTaller();
else if (cual === 'base') mxPantallaBase();
else if (cual === 'lab') mxPantallaLab();
else if (cual === 'comunidades') mxPantallaComunidades();
else if (cual === 'logros') mxPantallaLogros();
if (!silencioso) mxExplicarPantalla(cual);
};

const MX_EXPLICA = {
zonas:'Este es el mapa del mundo. Manda drones a explorar: traen piezas, comida y pistas del agua escondida.',
taller:'Aquí mejoras tu dron: motores, batería, cubeta, sensores y brazo cosechador.',
base:'Aquí construyes: invernadero, paneles solares, purificador, baterías y reciclaje de agua.',
lab:'En el laboratorio investigas cultivos resistentes y experimentales.',
comunidades:'Estas comunidades necesitan ayuda. Puedes intercambiar recursos con ellas.',
logros:'Aquí ves tus logros secretos y el ranking de partidas.'
};
function mxExplicarPantalla(cual){
if (MX_EXPLICA[cual]) explicar('mx_' + cual, MX_EXPLICA[cual]);
}

// ------------------------------------------------------------
//  MAPA DEL MUNDO Y EXPEDICIONES
// ------------------------------------------------------------
function mxDronesLibres(){
const total = 1 + mxNivel(MUNDO.mejoras, 'escuadron');
return total - MUNDO.expediciones.length;
}
function mxPantallaZonas(){
let h = `<div class="mx-sub">El mundo se secó hace años. Manda drones exploradores a estas zonas:
traen piezas 🔩, comida 🍲, agua 💧 y pistas sobre una reserva de agua escondida.
Drones libres: <b style="color:var(--cyan)">${mxDronesLibres()}</b> de ${1 + mxNivel(MUNDO.mejoras,'escuadron')}</div>`;
if (MUNDO.pistas.length) {
h += `<div class="mx-hint">🔎 Pistas del agua escondida:<br>${MUNDO.pistas.map(p => '• ' + p).join('<br>')}</div>`;
}
if (MUNDO.acuiferoHallado) h += `<div class="mx-hint">🌊 Ya encontraste la reserva secreta: tu purificador y tu depósito rinden más.</div>`;
MX_ZONAS.forEach(z => {
const st = MUNDO.zonas[z.id] || {explorado:0};
const exp = MUNDO.expediciones.find(e => e.zona === z.id);
const costo = mxCostoExpedicion(z);
let boton;
if (exp) boton = `<button class="mx-btn" disabled>⏳ ${Math.ceil(exp.restante)}s</button>`;
else if (mxDronesLibres() <= 0) boton = `<button class="mx-btn" disabled>Sin drones</button>`;
else boton = `<button class="mx-btn cyan" onclick="MX.explorar('${z.id}')">🚁 Explorar (${costo} ⚡)</button>`;
let extra = '';
if (st.explorado >= 100 && !MUNDO.acuiferoHallado)
extra = `<button class="mx-btn gold" style="margin-top:6px" onclick="MX.perforar('${z.id}')">⛏️ Perforar aquí (5 ⚡ · 3 🔩)</button>`;
const marca = (mxNivel(MUNDO.mejoras, 'sensores') >= 3 && !MUNDO.acuiferoHallado && z.id === MUNDO.acuifero)
? ' <span class="mx-tag on">📡 humedad detectada</span>' : '';
h += `<div class="mx-card">
<div class="mx-ico">${z.emoji}</div>
<div class="mx-info">
<div class="mx-name">${z.nombre} <span class="mx-tag ${st.explorado>=100?'on':''}">${Math.floor(st.explorado)}% explorado</span>${marca}</div>
<div class="mx-desc">${z.desc}</div>
<div class="mx-bar"><div class="mx-fill" style="width:${st.explorado}%"></div></div>
${extra}
</div>
<div>${boton}</div>
</div>`;
});
mxModal('🌎 Mapa del mundo destruido', h);
}
function mxCostoExpedicion(z){
return Math.max(1, z.energia - mxNivel(MUNDO.mejoras, 'bateria'));
}
MX.explorar = function(id){
const z = MX_ZONAS.find(x => x.id === id);
if (!z) return;
if (mxDronesLibres() <= 0) { showToast('🚁 No tienes drones libres', true); return; }
if (MUNDO.expediciones.some(e => e.zona === id)) return;
const costo = mxCostoExpedicion(z);
if (!mxCobrar({energia:costo})) return;
const dur = Math.max(8, z.seg - mxNivel(MUNDO.mejoras, 'bateria') * 3);
MUNDO.expediciones.push({zona:id, restante:dur, total:dur});
logConsole(`🚁 Dron enviado a ${z.nombre}. Vuelve en ${dur}s.`, 'info');
aidenSpeak(`Dron en camino a ${z.nombre}. Mientras tanto, sigue cuidando el huerto.`);
mxRefrescar();
};
function mxTerminarExpedicion(e){
const z = MX_ZONAS.find(x => x.id === e.zona);
const st = MUNDO.zonas[z.id] || (MUNDO.zonas[z.id] = {explorado:0});
st.explorado = Math.min(100, st.explorado + mxNum([18, 30]));
let texto = [];
for (const k in z.loot) {
const n = mxNum(z.loot[k]);
if (n > 0) { mxDar(k, n); texto.push(`${n} ${mxIcono(k)}`); }
}
// hallazgos especiales en lugares abandonados
if (Math.random() < 0.35) {
const hallazgo = mxAzar(['piezas', 'alimento', 'agua']);
mxDar(hallazgo, 3);
texto.push(`3 ${mxIcono(hallazgo)} (caja abandonada)`);
}
// pistas del agua escondida
const pistasMax = 3 + (MUNDO.investigado.radar ? 2 : 0) + mxNivel(MUNDO.mejoras, 'sensores');
if (!MUNDO.acuiferoHallado && MUNDO.pistas.length < pistasMax) {
mxNuevaPista();
// los sensores dan una pista extra
if (mxNivel(MUNDO.mejoras, 'sensores') >= 2 && MUNDO.pistas.length < pistasMax) mxNuevaPista();
}
// si el planeta está sano, las zonas reverdecen y dan más
if (MUNDO.eco >= 70) { mxDar('alimento', 2); texto.push('2 🍲 (la zona empieza a reverdecer 🌱)'); }
// riesgo: dron dañado o dron pirata
let incidente = '';
// planeta seco = viajes más peligrosos; batería mejorada = más seguros
const riesgo = z.riesgo - mxNivel(MUNDO.mejoras, 'bateria') * 0.05 + (MUNDO.eco < 30 ? 0.15 : 0);
if (Math.random() < riesgo) {
if (Math.random() < 0.5 && !MUNDO.pirata) { mxAparecePirata(); incidente = ' Un dron pirata te siguió hasta el huerto.'; }
else { mxDar('piezas', -1); incidente = ' El dron volvió golpeado y perdiste 1 🔩.'; }
}
if (st.explorado >= 100 && !st.premiado) {
st.premiado = true;
mxDar('piezas', 6); mxDar('monedas', 20); mxEco(4);
texto.push('6 🔩 + 20 🪙 por explorar la zona completa');
}
logConsole(`🚁 El dron volvió de ${z.nombre}: ${texto.join(', ') || 'sin nada útil'}.${incidente}`, 'info');
showToast(`${z.emoji} Expedición lista: ${texto.slice(0,2).join(', ')}`);
mxRevisarLogros();
mxRefrescar();
}
function mxNuevaPista(){
const falsas = MX_ZONAS.filter(z => z.id !== MUNDO.acuifero);
const zonaFalsa = mxAzar(falsas);
const real = MX_ZONAS.find(z => z.id === MUNDO.acuifero);
const opciones = [
`El agua NO está en ${zonaFalsa.nombre}.`,
`Los sensores marcan humedad cerca de ${real.nombre}.`,
`Un mapa viejo señala ${real.nombre} con una gota dibujada.`,
`Las plantas más verdes crecen camino a ${real.nombre}.`
];
const p = mxAzar(MUNDO.pistas.length === 0 ? [opciones[0], opciones[1]] : opciones);
if (!MUNDO.pistas.includes(p)) MUNDO.pistas.push(p);
}
MX.perforar = function(id){
if (MUNDO.acuiferoHallado) return;
if (!mxCobrar({energia:5, piezas:3})) return;
if (id === MUNDO.acuifero) {
MUNDO.acuiferoHallado = true;
mxDar('agua', 40); mxEco(10);
drone.maxBucket += 5;
aidenSpeak('¡Encontraste la reserva de agua escondida! El depósito ahora aguanta más y tu purificador rinde el doble.');
showToast('🌊 ¡Reserva de agua encontrada! +40 💧');
logConsole('🌊 Acuífero descubierto: +40 💧, cubeta más grande.', 'info');
mxRevisarLogros();
} else {
showToast('⛏️ Perforaste y solo salió polvo. Sigue las pistas.', true);
logConsole('⛏️ Perforación fallida: aquí no hay agua.', 'error');
if (!MUNDO.acuiferoHallado) mxNuevaPista();
}
mxRefrescar();
};

// ------------------------------------------------------------
//  TALLER DEL DRON
// ------------------------------------------------------------
function mxCostoNivel(base, nivel){
const c = {};
for (const k in base) c[k] = Math.round(base[k] * (1 + nivel * 0.6));
return c;
}
function mxPantallaTaller(){
let h = `<div class="mx-sub">Personaliza tu dron. Cada mejora cuesta monedas 🪙 y piezas 🔩 que traes de las expediciones.</div>` + mxTextoBonos();
MX_MEJORAS.forEach(m => {
const n = mxNivel(MUNDO.mejoras, m.id);
const costo = mxCostoNivel(m.costo, n);
const lleno = n >= m.max;
h += `<div class="mx-card ${lleno ? 'off' : ''}">
<div class="mx-ico">${m.emoji}</div>
<div class="mx-info">
<div class="mx-name">${m.nombre} <span class="mx-tag ${n?'on':''}">Nivel ${n}/${m.max}</span></div>
<div class="mx-desc">${m.desc}</div>
</div>
<div>${lleno ? '<button class="mx-btn" disabled>MÁX</button>'
: `<button class="mx-btn" onclick="MX.mejorar('${m.id}')">${mxCostoTxt(costo)}</button>`}</div>
</div>`;
});
mxModal('🔧 Taller del dron', h);
}
MX.mejorar = function(id){
const m = MX_MEJORAS.find(x => x.id === id);
const n = mxNivel(MUNDO.mejoras, id);
if (!m || n >= m.max) return;
if (!mxCobrar(mxCostoNivel(m.costo, n))) return;
MUNDO.mejoras[id] = n + 1;
if (id === 'capacidad') { drone.maxBucket += 4; }
showToast(`${m.emoji} ${m.nombre} nivel ${n + 1}`);
logConsole(`🔧 ${m.nombre} subió a nivel ${n + 1}.`, 'info');
aidenSpeak(`Mejora instalada: ${m.nombre}, nivel ${n + 1}. ${m.desc}`);
mxRefrescar();
};

// ------------------------------------------------------------
//  BASE: CONSTRUCCIÓN Y MEJORAS
// ------------------------------------------------------------
function mxPantallaBase(){
let h = `<div class="mx-sub">Construye la base de tu granja. Todo funciona solo mientras juegas: produce energía, agua y protege tus cultivos.</div>` + mxTextoBonos();
h += `<div class="mx-card">
<div class="mx-ico">🚰</div>
<div class="mx-info">
<div class="mx-name">Usar la reserva de agua</div>
<div class="mx-desc">Llena la cubeta del dron aquí mismo, sin volver al depósito. Tienes ${Math.floor(mxRec('agua'))} 💧 guardados.</div>
</div>
<div><button class="mx-btn cyan" onclick="MX.usarReserva()">Llenar (3 💧)</button></div>
</div>`;
MX_EDIFICIOS.forEach(ed => {
const n = mxNivel(MUNDO.edificios, ed.id);
const costo = mxCostoNivel(ed.costo, n);
const lleno = n >= ed.max;
h += `<div class="mx-card ${lleno ? 'off' : ''}">
<div class="mx-ico">${ed.emoji}</div>
<div class="mx-info">
<div class="mx-name">${ed.nombre} <span class="mx-tag ${n?'on':''}">Nivel ${n}/${ed.max}</span></div>
<div class="mx-desc">${ed.desc}</div>
</div>
<div>${lleno ? '<button class="mx-btn" disabled>MÁX</button>'
: `<button class="mx-btn" onclick="MX.construir('${ed.id}')">${mxCostoTxt(costo)}</button>`}</div>
</div>`;
});
mxModal('🏗️ Construcción de la base', h);
}
MX.usarReserva = function(){
if (drone.bucket >= drone.maxBucket) { showToast('💧 La cubeta ya está llena', true); return; }
if (mxRec('agua') < 3) { showToast('💧 Necesitas 3 de reserva. Construye un purificador.', true); return; }
mxDar('agua', -3);
drone.bucket = drone.maxBucket;
showToast('🚰 Cubeta llena con tu reserva');
logConsole('🚰 Usaste 3 💧 de la reserva para llenar la cubeta.', 'info');
mxRefrescar();
};
MX.construir = function(id){
const ed = MX_EDIFICIOS.find(x => x.id === id);
const n = mxNivel(MUNDO.edificios, id);
if (!ed || n >= ed.max) return;
if (!mxCobrar(mxCostoNivel(ed.costo, n))) return;
MUNDO.edificios[id] = n + 1;
if (id === 'baterias') MUNDO.topeEnergia += 10;
mxEco(3);
showToast(`${ed.emoji} ${ed.nombre} nivel ${n + 1} construido`);
logConsole(`🏗️ ${ed.nombre} nivel ${n + 1}: ${ed.desc}`, 'info');
mxRevisarLogros();
mxRefrescar();
};

// ------------------------------------------------------------
//  LABORATORIO: CULTIVOS EXPERIMENTALES Y FUTURISTAS
// ------------------------------------------------------------
function mxPantallaLab(){
let h = `<div class="mx-sub">Investigar toma tiempo real, pero el dron sigue trabajando mientras tanto.</div>`;
if (MUNDO.investigando) {
const inv = MX_INVESTIGACIONES.find(i => i.id === MUNDO.investigando.id);
const pct = 100 - (MUNDO.investigando.restante / inv.seg) * 100;
h += `<div class="mx-hint">🧪 Investigando <b>${inv.nombre}</b> — faltan ${Math.ceil(MUNDO.investigando.restante)}s
<div class="mx-bar"><div class="mx-fill" style="width:${pct}%"></div></div></div>`;
}
MX_INVESTIGACIONES.forEach(inv => {
const hecho = !!MUNDO.investigado[inv.id];
const ocupado = !!MUNDO.investigando;
h += `<div class="mx-card ${hecho ? 'off' : ''}">
<div class="mx-ico">${inv.emoji}</div>
<div class="mx-info">
<div class="mx-name">${inv.nombre} ${hecho ? '<span class="mx-tag on">Lista</span>' : `<span class="mx-tag">${inv.seg}s</span>`}</div>
<div class="mx-desc">${inv.desc}</div>
</div>
<div>${hecho ? '<button class="mx-btn" disabled>✔</button>'
: `<button class="mx-btn" ${ocupado ? 'disabled' : ''} onclick="MX.investigar('${inv.id}')">${mxCostoTxt(inv.costo)}</button>`}</div>
</div>`;
});
if (MUNDO.variantes.length) {
h += `<div class="mx-hint">🧬 Variantes desbloqueadas: ${MUNDO.variantes.map(f => PLANT_NAMES[f] + ' R-9').join(', ')}.
Cómpralas con la tecla R en cualquier maceta vacía.</div>`;
}
mxModal('🧬 Laboratorio de cultivos', h);
}
MX.investigar = function(id){
if (MUNDO.investigando) { showToast('🧪 Ya hay una investigación en marcha', true); return; }
const inv = MX_INVESTIGACIONES.find(x => x.id === id);
if (!inv || MUNDO.investigado[id]) return;
if (!mxCobrar(inv.costo)) return;
MUNDO.investigando = {id:id, restante:inv.seg};
logConsole(`🧪 Investigación iniciada: ${inv.nombre} (${inv.seg}s).`, 'info');
mxRefrescar();
};
function mxTerminarInvestigacion(){
const inv = MX_INVESTIGACIONES.find(x => x.id === MUNDO.investigando.id);
MUNDO.investigado[inv.id] = true;
MUNDO.investigando = null;
if (inv.id === 'genetica') {
MUNDO.variantes = currentLevelFruits.slice();
aidenSpeak('¡Cultivos experimentales listos! Ahora puedes sembrar variantes 🧬 resistentes de tus frutas. Pulsa R en una maceta vacía.');
}
mxEco(5);
showToast(`🧪 Investigación completa: ${inv.nombre}`);
logConsole(`🧪 ${inv.nombre}: ${inv.desc}`, 'info');
mxRevisarLogros();
mxRefrescar();
}

// ------------------------------------------------------------
//  COMUNIDADES, INTERCAMBIO Y EMERGENCIAS
// ------------------------------------------------------------
function mxComEstado(id){
if (!MUNDO.comunidades[id]) MUNDO.comunidades[id] = {ayudas:0, animo:50};
return MUNDO.comunidades[id];
}
function mxPantallaComunidades(){
let h = `<div class="mx-sub">Cada comunidad necesita algo distinto. Ayúdalas y te devolverán el favor: ganas reputación ⭐, recursos y el planeta mejora 🌍.</div>`;
if (MUNDO.emergencia) {
const e = MUNDO.emergencia;
const c = MX_COMUNIDADES.find(x => x.id === e.com);
h += `<div class="mx-hint">🚨 EMERGENCIA: ${c.nombre} necesita <b>${e.cantidad} ${mxIcono(e.recurso)}</b>
en ${Math.ceil(e.restante)}s. Tienes ${Math.floor(mxRec(e.recurso))}.
<br><button class="mx-btn rojo" style="margin-top:7px" onclick="MX.entregarEmergencia()">🚑 Entregar ahora</button></div>`;
}
MX_COMUNIDADES.forEach(c => {
const st = mxComEstado(c.id);
const precio = mxPrecioTrueque();
h += `<div class="mx-card">
<div class="mx-ico">${c.emoji}</div>
<div class="mx-info">
<div class="mx-name">${c.nombre} <span class="mx-tag ${st.ayudas?'on':''}">${st.ayudas} ayudas</span></div>
<div class="mx-desc">${c.desc}<br>Cambian <b>${precio.piden} ${mxIcono(c.necesita)}</b> por <b>${precio.dan} ${mxIcono(c.da)}</b>.</div>
</div>
<div><button class="mx-btn" onclick="MX.intercambiar('${c.id}')">🔄 Intercambiar</button></div>
</div>`;
});
h += `<div class="mx-sub" style="margin-top:10px">Reputación ⭐ ${MUNDO.reputacion} · Pedidos cumplidos: ${MUNDO.entregas}</div>`;
mxModal('🤝 Comunidades', h);
}
function mxPrecioTrueque(){
const bono = Math.floor(MUNDO.reputacion / 10);
return {piden:4, dan:4 + bono};
}
MX.intercambiar = function(id){
const c = MX_COMUNIDADES.find(x => x.id === id);
const p = mxPrecioTrueque();
if (mxRec(c.necesita) < p.piden) { showToast(`Te falta ${mxIcono(c.necesita)} para el trueque`, true); return; }
mxDar(c.necesita, -p.piden);
mxDar(c.da, p.dan);
mxRep(1);
const st = mxComEstado(id);
st.ayudas++;
showToast(`🔄 ${c.nombre}: -${p.piden} ${mxIcono(c.necesita)} +${p.dan} ${mxIcono(c.da)}`);
logConsole(`🔄 Trueque con ${c.nombre}.`, 'info');
mxRefrescar();
};

// ------------------------------------------------------------
//  LOGROS Y RANKING
// ------------------------------------------------------------
function mxPantallaLogros(){
let h = `<div class="mx-sub">Logros secretos: se desbloquean solos cuando juegas bien.</div>`;
MX_LOGROS.forEach(l => {
const on = !!MUNDO.logros[l.id];
h += `<div class="mx-card ${on ? '' : 'off'}">
<div class="mx-ico">${on ? l.emoji : '🔒'}</div>
<div class="mx-info">
<div class="mx-name">${on ? l.nombre : '???'}</div>
<div class="mx-desc">${l.pista}</div>
</div>
</div>`;
});
h += `<div class="mx-head" style="margin-top:16px"><h3>🥇 Ranking de jugadores</h3></div>` + mxTablaRanking();
h += `<div style="text-align:center;margin-top:14px">
<button class="mx-btn gold" onclick="MX.terminarPartida()">🏁 Terminar partida y ver mi final</button></div>`;
mxModal('🏆 Logros y ranking', h);
}
function mxLeerRanking(){
try { return JSON.parse(localStorage.getItem('agrobot_ranking') || '[]'); } catch(e) { return []; }
}
function mxTablaRanking(){
const r = mxLeerRanking();
if (!r.length) return `<div class="mx-sub">Todavía no hay partidas guardadas. Termina una partida para entrar al ranking.</div>`;
let h = `<table class="mx-rank"><tr><th>#</th><th>Jugador</th><th>Puntos</th><th>Minutos</th><th>🌍</th><th>Final</th></tr>`;
r.slice(0, 10).forEach((p, i) => {
const yo = currentUser && p.nombre === currentUser.name;
h += `<tr class="${yo ? 'yo' : ''}"><td>${i + 1}</td><td>${p.nombre}</td><td>${p.puntos}</td><td>${p.minutos}</td><td>${p.eco}%</td><td>${p.final}</td></tr>`;
});
return h + '</table>';
}
function mxLogro(id){
if (MUNDO.logros[id]) return;
const l = MX_LOGROS.find(x => x.id === id);
if (!l) return;
MUNDO.logros[id] = true;
addCoins(15, 'logro secreto');
showToast(`🏆 ¡Logro secreto! ${l.emoji} ${l.nombre}`);
logConsole(`🏆 Logro desbloqueado: ${l.nombre} (+15 🪙)`, 'info');
aidenSpeak(`¡Logro secreto desbloqueado! ${l.nombre}.`);
}
function mxRevisarLogros(){
if (MUNDO.vecesRegado >= 20 && !MUNDO.sinAgua) mxLogro('sin_desperdicio');
if (MUNDO.entregas >= 5) mxLogro('rescatista');
if (MX_ZONAS.every(z => (MUNDO.zonas[z.id] || {}).explorado >= 100)) mxLogro('explorador');
if (MUNDO.acuiferoHallado) mxLogro('acuifero');
if (contarPlantas() >= 10) mxLogro('jardin');
if (MX_INVESTIGACIONES.every(i => MUNDO.investigado[i.id])) mxLogro('cientifico');
if (MX_EDIFICIOS.some(e => mxNivel(MUNDO.edificios, e.id) >= e.max)) mxLogro('ingeniero');
if (MUNDO.piratasVencidos >= 3) mxLogro('cazador');
if (MUNDO.eco >= 90) mxLogro('planeta');
if (mision && mision.completada && MUNDO.plantasMuertas === 0) mxLogro('sin_bajas');
}

// ============================================================
//  EVENTOS INESPERADOS
// ============================================================
const MX_EVENTOS = [
{id:'arena', nombre:'Tormenta de arena', emoji:'🌪️', seg:45,
 aviso:'El viento tapa el sol: las plantas se secan al doble de rápido.',
 inicio(){ MUNDO.evento.mult = 2; }, fin(){}},
{id:'incendio', nombre:'Incendio cercano', emoji:'🔥', seg:40,
 aviso:'¡Fuego! Una planta se está quemando: riégala antes de que muera.',
 inicio(){ MUNDO.evento.celda = mxCeldaConPlanta(); },
 fin(){ MUNDO.evento.celda = null; }},
{id:'apagon', nombre:'Apagón general', emoji:'🔌', seg:0,
 aviso:'Se cayó la red eléctrica. Resuelve el rompecabezas para reiniciar el sistema.',
 inicio(){ MUNDO.apagon = true; mxAbrirPuzzle('Reiniciar el sistema eléctrico', () => {
   MUNDO.apagon = false; mxDar('energia', 5);
   showToast('🔌 ¡Energía restablecida! +5 ⚡');
 }); }, fin(){}},
{id:'inundacion', nombre:'Inundación repentina', emoji:'🌊', seg:20,
 aviso:'Llovió de golpe: recolectas agua, pero la tierra se lava.',
 inicio(){ mxDar('agua', 8); mxEco(-2); showToast('🌊 +8 💧 de la lluvia repentina'); }, fin(){}},
{id:'fallo', nombre:'Fallo del dron', emoji:'⚠️', seg:0,
 aviso:'Tu dron se trabó. Repáralo con un rompecabezas para volver a moverlo.',
 inicio(){ MUNDO.dronAveriado = true; mxAbrirPuzzle('Reparar el dron', () => {
   MUNDO.dronAveriado = false; showToast('🔧 ¡Dron reparado!');
 }); }, fin(){}},
{id:'piratas', nombre:'Drones fuera de control', emoji:'👾', seg:0,
 aviso:'Un dron abandonado entró al huerto y roba tus monedas.',
 inicio(){ mxAparecePirata(); }, fin(){}}
];

function mxCeldaConPlanta(){
const lista = [];
for (let x = 0; x < GRID_COLS; x++) for (let y = 0; y < GRID_ROWS; y++) {
const c = farmGrid[x] && farmGrid[x][y];
if (c && !c.isDepot && !c.isEmpty) lista.push([x, y]);
}
return lista.length ? mxAzar(lista) : null;
}
function mxLanzarEvento(){
if (MUNDO.evento || MUNDO.dronAveriado || MUNDO.apagon) return;
const ev = mxAzar(MX_EVENTOS);
MUNDO.evento = {id:ev.id, restante:ev.seg, total:ev.seg, mult:1, celda:null};
ev.inicio();
mxAlerta(`${ev.emoji} ${ev.nombre}`, ev.aviso, ev.seg);
logConsole(`${ev.emoji} EVENTO: ${ev.nombre}. ${ev.aviso}`, 'error');
aidenSpeak(`${ev.nombre}. ${ev.aviso}`);
if (ev.seg === 0) MUNDO.evento = null;
}
function mxTerminarEvento(){
const ev = MX_EVENTOS.find(e => e.id === MUNDO.evento.id);
if (ev) ev.fin();
MUNDO.evento = null;
mxAlerta(null);
logConsole('☀️ El clima se calmó.', 'info');
}
function mxAlerta(titulo, sub, seg){
const box = document.getElementById('mx-alert');
if (!box) return;
if (!titulo) { box.classList.remove('visible'); return; }
document.getElementById('mx-al-t').textContent = titulo;
document.getElementById('mx-al-s').textContent = sub || '';
box.classList.add('visible');
if (!seg) document.getElementById('mx-al-fill').style.width = '100%';
}

// ------------------------------------------------------------
//  DRONES ENEMIGOS / FUERA DE CONTROL
// ------------------------------------------------------------
function mxAparecePirata(){
if (MUNDO.pirata) return;
let x, y, intentos = 0;
do { x = Math.floor(Math.random() * GRID_COLS); y = Math.floor(Math.random() * GRID_ROWS); intentos++; }
while (intentos < 20 && (x === 0 && y === 0));
MUNDO.pirata = {x:x, y:y, vida:2, t:0};
mxAlerta('👾 Dron pirata en el huerto', 'Ve hasta su casilla y pulsa E para neutralizarlo.');
logConsole(`👾 Dron pirata en (${x},${y}). Ve a su casilla y pulsa E.`, 'error');
aidenSpeak('Cuidado: un dron fuera de control entró al huerto. Ve hasta su casilla y pulsa E para apagarlo.');
}
function mxPirataTick(dt){
const p = MUNDO.pirata;
if (!p) return;
p.t += dt;
if (p.t >= 12) {
p.t = 0;
if (coins >= 3) { setCoins(coins - 3); showToast('👾 El dron pirata te robó 3 🪙', true); }
else { const c = farmGrid[p.x] && farmGrid[p.x][p.y];
  if (c && !c.isDepot && !c.isEmpty) { c.health = Math.max(0, c.health - 0.5); showToast('👾 El pirata dañó una planta', true); } }
// se mueve
p.x = Math.max(0, Math.min(GRID_COLS - 1, p.x + mxAzar([-1, 0, 1])));
p.y = Math.max(0, Math.min(GRID_ROWS - 1, p.y + mxAzar([-1, 0, 1])));
}
}
function mxGolpearPirata(){
const p = MUNDO.pirata;
if (!p || p.x !== drone.x || p.y !== drone.y) return false;
p.vida--;
if (p.vida <= 0) {
MUNDO.pirata = null;
MUNDO.piratasVencidos++;
mxAlerta(null);
mxDar('piezas', 4); addCoins(10, 'dron pirata desarmado');
showToast('👾 ¡Dron pirata neutralizado! +4 🔩');
logConsole('👾 Pirata desarmado: recuperaste 4 piezas.', 'info');
mxRevisarLogros();
} else {
showToast('👾 ¡Le diste! Pulsa E otra vez para acabarlo');
}
return true;
}

// ------------------------------------------------------------
//  ROMPECABEZAS TECNOLÓGICOS
// ------------------------------------------------------------
const MX_PUZZLES = [
{tipo:'orden', enunciado:'Ordena las instrucciones para que el dron riegue la planta de (2,1):',
 correcto:['drone.ir_a(0, 0)', 'drone.recoger_cubeta()', 'drone.ir_a(2, 1)', 'drone.regar()']},
{tipo:'orden', enunciado:'Ordena los pasos para encender el sistema eléctrico:',
 correcto:['conectar_bateria()', 'abrir_valvula()', 'encender_panel()', 'reiniciar_sistema()']},
{tipo:'orden', enunciado:'Ordena las instrucciones para sembrar una fruta nueva:',
 correcto:['comprar_maceta()', 'elegir_fruta()', 'sembrar()', 'drone.regar()']},
{tipo:'opcion', enunciado:'¿Qué instrucción repite el riego 3 veces?',
 opciones:['for i in range(3): drone.regar()', 'if drone.regar() == 3', 'drone.regar(3 veces)'], correcta:0},
{tipo:'opcion', enunciado:'El dron está en (0,0) con la cubeta vacía. ¿Qué hace primero?',
 opciones:['drone.regar()', 'drone.recoger_cubeta()', 'drone.ir_a(5, 2)'], correcta:1},
{tipo:'opcion', enunciado:'¿Cuál comando pregunta qué plantas están en peligro?',
 opciones:['granja.criticas()', 'drone.criticas()', 'granja.regar()'], correcta:0}
];
function mxAbrirPuzzle(titulo, alResolver){
const base = mxAzar(MX_PUZZLES);
MUNDO.puzzleActivo = {def:base, orden:[], alResolver:alResolver, titulo:titulo};
mxDibujarPuzzle();
}
function mxDibujarPuzzle(){
const p = MUNDO.puzzleActivo;
if (!p) return;
let h = `<div class="mx-sub">${p.def.enunciado}</div>`;
if (p.def.tipo === 'orden') {
const mezcladas = p.mezcladas || (p.mezcladas = barajar(p.def.correcto.slice()));
h += `<div class="mx-slot">${p.orden.length ? p.orden.join('\n') : 'Aquí se arma tu programa...'}</div><div class="mx-seq">`;
mezcladas.forEach((c, i) => {
const usada = p.orden.includes(c);
h += `<div class="mx-pz ${usada ? 'usada' : ''}" onclick="MX.puzzleClick(${i})">${c}</div>`;
});
h += `</div><button class="mx-btn rojo" onclick="MX.puzzleReset()">↺ Empezar de nuevo</button>`;
} else {
h += `<div class="mx-grid2">`;
p.def.opciones.forEach((o, i) => {
h += `<button class="mx-op" onclick="MX.puzzleOpcion(${i})"><b>Opción ${i + 1}</b><small>${o}</small></button>`;
});
h += `</div>`;
}
mxModal('🧩 ' + p.titulo, h);
}
MX.puzzleClick = function(i){
const p = MUNDO.puzzleActivo;
if (!p) return;
const c = p.mezcladas[i];
if (p.orden.includes(c)) return;
p.orden.push(c);
if (p.orden.length === p.def.correcto.length) {
const bien = p.orden.every((v, k) => v === p.def.correcto[k]);
if (bien) mxPuzzleGanado();
else { showToast('🧩 Ese orden no funciona. Inténtalo otra vez', true); p.orden = []; mxDibujarPuzzle(); }
} else mxDibujarPuzzle();
};
MX.puzzleReset = function(){ if (MUNDO.puzzleActivo) { MUNDO.puzzleActivo.orden = []; mxDibujarPuzzle(); } };
MX.puzzleOpcion = function(i){
const p = MUNDO.puzzleActivo;
if (!p) return;
if (i === p.def.correcta) mxPuzzleGanado();
else { showToast('🧩 No es esa. Piensa en el orden de los pasos', true); }
};
MX.reintentarPuzzle = function(){
if (MUNDO.puzzleActivo) { mxDibujarPuzzle(); return; }
if (MUNDO.dronAveriado) mxAbrirPuzzle('Reparar el dron', () => {
MUNDO.dronAveriado = false; showToast('🔧 ¡Dron reparado!');
});
else if (MUNDO.apagon) mxAbrirPuzzle('Reiniciar el sistema eléctrico', () => {
MUNDO.apagon = false; mxDar('energia', 5); showToast('🔌 ¡Energía restablecida! +5 ⚡');
});
};
function mxPuzzleGanado(){
const p = MUNDO.puzzleActivo;
MUNDO.puzzleActivo = null;
mxCerrar();
addCoins(12, 'rompecabezas resuelto');
mxDar('piezas', 2);
logConsole('🧩 Rompecabezas resuelto: +12 🪙 y +2 🔩.', 'info');
mxAlerta(null);
if (p && p.alResolver) p.alResolver();
}

// ------------------------------------------------------------
//  MISIONES DE EMERGENCIA Y DECISIONES DIFÍCILES
// ------------------------------------------------------------
function mxLanzarEmergencia(){
if (MUNDO.emergencia) return;
const c = mxAzar(MX_COMUNIDADES);
const cantidad = mxNum([4, 8]);
MUNDO.emergencia = {com:c.id, recurso:c.necesita, cantidad:cantidad, restante:180, total:180};
logConsole(`🚨 EMERGENCIA: ${c.nombre} necesita ${cantidad} ${mxIcono(c.necesita)} en 3 minutos.`, 'error');
aidenSpeak(`Emergencia: la comunidad ${c.nombre} se quedó sin ${c.necesita}. Necesitan ${cantidad} en tres minutos.`);
// decisión difícil si tu propio huerto está en aprietos
const criticas = mxContarCriticas();
if (criticas > 0 && c.necesita === 'agua') mxDilema(c, cantidad, criticas);
else mxAlerta(`🚨 ${c.nombre} pide ayuda`, `${cantidad} ${mxIcono(c.necesita)} · abre 🤝 para entregar`, 180);
}
function mxContarCriticas(){
let n = 0;
for (let x = 0; x < GRID_COLS; x++) for (let y = 0; y < GRID_ROWS; y++) {
const c = farmGrid[x] && farmGrid[x][y];
if (c && !c.isDepot && !c.isEmpty && c.health < 2) n++;
}
return n;
}
function mxDilema(c, cantidad, criticas){
const h = `<div class="mx-sub">${c.emoji} <b>${c.nombre}</b> se quedó sin agua y te la pide.
Pero tú tienes <b style="color:var(--coral)">${criticas} planta(s) muriéndose</b> en tu huerto.
No alcanza para todo: decide.</div>
<div class="mx-grid2">
<button class="mx-op" onclick="MX.decidir('ayudar')"><b>🤝 Ayudar a la comunidad</b>
<small>Les das ${cantidad} 💧 de tu reserva ahora mismo. Ganas reputación y el planeta mejora, pero tus plantas críticas siguen esperando.</small></button>
<button class="mx-op" onclick="MX.decidir('guardar')"><b>🛡️ Guardar tus recursos</b>
<small>Salvas tu huerto: tus plantas críticas reciben agua de golpe. La comunidad se enoja y baja tu reputación.</small></button>
<button class="mx-op" onclick="MX.decidir('repartir')"><b>⚖️ Repartir a medias</b>
<small>Nadie queda perfecto: media ayuda para ellos y media para ti. Es lo más justo, pero lo menos eficiente.</small></button>
</div>`;
mxModal('⚖️ Decisión difícil', h);
}
MX.decidir = function(op){
const e = MUNDO.emergencia;
if (!e) { mxCerrar(); return; }
const c = MX_COMUNIDADES.find(x => x.id === e.com);
if (op === 'ayudar') {
if (mxRec('agua') >= e.cantidad) { mxDar('agua', -e.cantidad); mxCumplirEmergencia(true); }
else { showToast('💧 No te alcanza el agua de la reserva', true); }
} else if (op === 'guardar') {
mxRegarCriticas(2);
mxRep(-2); mxEco(-4);
MUNDO.emergencia = null; mxAlerta(null);
logConsole(`🛡️ Decidiste salvar tu huerto. ${c.nombre} lo entendió, pero perdiste reputación.`, 'error');
aidenSpeak('Elegiste tu huerto. A veces hay que cuidar lo propio para poder ayudar mañana.');
} else {
if (mxRec('agua') >= Math.ceil(e.cantidad / 2)) mxDar('agua', -Math.ceil(e.cantidad / 2));
mxRegarCriticas(1);
mxRep(1); mxEco(1);
MUNDO.entregas++;
MUNDO.emergencia = null; mxAlerta(null);
logConsole('⚖️ Repartiste el agua entre tu huerto y la comunidad.', 'info');
aidenSpeak('Repartiste el agua. Nadie quedó perfecto, pero nadie quedó solo.');
}
mxCerrar();
mxRevisarLogros();
};
function mxRegarCriticas(cuanto){
for (let x = 0; x < GRID_COLS; x++) for (let y = 0; y < GRID_ROWS; y++) {
const c = farmGrid[x] && farmGrid[x][y];
if (c && !c.isDepot && !c.isEmpty && c.health < 2) {
c.health = Math.min(5, c.health + cuanto);
c.lastWatered = Date.now();
c.stage = getGrowthStage(c.health);
}
}
}
MX.entregarEmergencia = function(){
const e = MUNDO.emergencia;
if (!e) return;
if (mxRec(e.recurso) < e.cantidad) { showToast(`Te faltan ${e.cantidad - Math.floor(mxRec(e.recurso))} ${mxIcono(e.recurso)}`, true); return; }
mxDar(e.recurso, -e.cantidad);
mxCumplirEmergencia(true);
mxCerrar();
};
function mxCumplirEmergencia(exito){
const e = MUNDO.emergencia;
if (!e) return;
const c = MX_COMUNIDADES.find(x => x.id === e.com);
const st = mxComEstado(c.id);
MUNDO.emergencia = null;
mxAlerta(null);
if (exito) {
st.ayudas++;
MUNDO.entregas++;
mxRep(3); mxEco(5);
addCoins(25, `rescataste a ${c.nombre}`);
mxDar(c.da, 4);
showToast(`🤝 ¡${c.nombre} a salvo! +25 🪙`);
logConsole(`🤝 Emergencia resuelta: ${c.nombre} te dio 4 ${mxIcono(c.da)} de agradecimiento.`, 'info');
aidenSpeak(`¡Lo lograste! ${c.nombre} está a salvo gracias a ti.`);
} else {
mxRep(-2); mxEco(-5);
showToast(`⏰ Se acabó el tiempo: ${c.nombre} se quedó sin ayuda`, true);
logConsole(`⏰ Emergencia fallida en ${c.nombre}.`, 'error');
aidenSpeak(`Se nos acabó el tiempo con ${c.nombre}. La próxima podemos organizarnos mejor.`);
}
mxRevisarLogros();
}

// ============================================================
//  IA DEL DRON: aprende de tus decisiones y trabaja solo
// ============================================================
MX.toggleAuto = function(){
MUNDO.auto = !MUNDO.auto;
mxPintarHUD();
showToast(MUNDO.auto ? '🤖 Piloto automático ACTIVADO' : '🤖 Piloto automático apagado');
if (MUNDO.auto) {
explicar('mx_auto', 'Activaste el piloto automático. El dron riega solo, y da prioridad a las frutas que TÚ riegas más seguido: aprende de tus decisiones.');
logConsole('🤖 IA del dron activada: prioriza según lo que tú riegas más.', 'info');
}
};
function mxPrioridad(cell){
// menos salud = más urgente; y suma lo que el jugador riega más seguido
const aprendido = (MUNDO.aprendizaje[cell.type] || 0) * 0.15;
return (5 - cell.health) + aprendido;
}
function mxAutoPaso(){
if (!MUNDO.auto || gameState !== 'game' || hayVentanaAbierta() || MUNDO.dronAveriado) return;
if (drone.bucket <= 0) {
if (drone.x === 0 && drone.y === 0) { droneAction(); return; }
mxIrHacia(0, 0); return;
}
let mejor = null, mejorP = -1;
for (let x = 0; x < GRID_COLS; x++) for (let y = 0; y < GRID_ROWS; y++) {
const c = farmGrid[x] && farmGrid[x][y];
if (!c || c.isDepot || c.isEmpty) continue;
if (c.health >= 4.6) continue;
const p = mxPrioridad(c);
if (p > mejorP) { mejorP = p; mejor = [x, y]; }
}
if (!mejor) return;
if (drone.x === mejor[0] && drone.y === mejor[1]) droneAction();
else mxIrHacia(mejor[0], mejor[1]);
}
function mxIrHacia(x, y){
if (drone.x !== x) moveDrone(drone.x < x ? 1 : -1, 0);
else if (drone.y !== y) moveDrone(0, drone.y < y ? 1 : -1);
}

// ============================================================
//  CICLO DEL MUNDO (corre 2 veces por segundo)
// ============================================================
function mxCiclo(){
mxPintarHUD();
if (gameState !== 'game' || !MUNDO.iniciado) return;
const dt = 0.5;
MUNDO.tActivo += dt;
mxTick++;

// --- expediciones ---
for (let i = MUNDO.expediciones.length - 1; i >= 0; i--) {
const e = MUNDO.expediciones[i];
e.restante -= dt;
if (e.restante <= 0) { MUNDO.expediciones.splice(i, 1); mxTerminarExpedicion(e); }
}
// --- investigación ---
if (MUNDO.investigando) {
MUNDO.investigando.restante -= dt;
if (MUNDO.investigando.restante <= 0) mxTerminarInvestigacion();
}
// --- producción de la base ---
if (!MUNDO.apagon || mxNivel(MUNDO.edificios, 'baterias') > 0) {
mxSolarT += dt;
const solar = mxNivel(MUNDO.edificios, 'solar');
if (solar > 0 && mxSolarT >= 20) { mxSolarT = 0; mxDar('energia', solar); }
}
mxAguaT += dt;
const pur = mxNivel(MUNDO.edificios, 'purificador');
if (pur > 0 && mxAguaT >= 25) { mxAguaT = 0; mxDar('agua', pur * (MUNDO.acuiferoHallado ? 2 : 1)); }

// --- evento activo ---
if (MUNDO.evento && MUNDO.evento.total > 0) {
MUNDO.evento.restante -= dt;
const f = document.getElementById('mx-al-fill');
if (f) f.style.width = Math.max(0, (MUNDO.evento.restante / MUNDO.evento.total) * 100) + '%';
if (MUNDO.evento.restante <= 0) mxTerminarEvento();
}
// --- emergencia contra reloj ---
if (MUNDO.emergencia) {
MUNDO.emergencia.restante -= dt;
if (!MUNDO.evento) {
const c = MX_COMUNIDADES.find(x => x.id === MUNDO.emergencia.com);
mxAlerta(`🚨 ${c.nombre} pide ayuda`,
`${MUNDO.emergencia.cantidad} ${mxIcono(MUNDO.emergencia.recurso)} · quedan ${Math.ceil(MUNDO.emergencia.restante)}s · abre 🤝`);
const f = document.getElementById('mx-al-fill');
if (f) f.style.width = Math.max(0, (MUNDO.emergencia.restante / MUNDO.emergencia.total) * 100) + '%';
}
if (MUNDO.emergencia.restante <= 0) mxCumplirEmergencia(false);
}
// --- avería o apagón pendientes: el aviso se queda hasta resolverlo ---
if ((MUNDO.dronAveriado || MUNDO.apagon) && !MUNDO.emergencia && !(MUNDO.evento && MUNDO.evento.total > 0)) {
mxAlerta(MUNDO.dronAveriado ? '⚠️ Dron averiado' : '🔌 Apagón general',
'Toca este aviso (o pulsa E) para resolver el rompecabezas');
}
// --- piratas ---
mxPirataTick(dt);
// --- salud: clima, invernadero e incendio ---
if (mxTick % 2 === 0) mxEfectosSalud();
// --- piloto automático ---
MUNDO.autoT += dt;
if (MUNDO.auto && MUNDO.autoT >= 1.2) { MUNDO.autoT = 0; mxAutoPaso(); }
// --- disparadores aleatorios ---
if (MUNDO.tActivo - MUNDO.ultimoEvento > 90 && Math.random() < 0.25) { MUNDO.ultimoEvento = MUNDO.tActivo; mxLanzarEvento(); }
if (MUNDO.tActivo > 60 && MUNDO.tActivo - MUNDO.ultimaEmergencia > 150 && Math.random() < 0.3) {
MUNDO.ultimaEmergencia = MUNDO.tActivo; mxLanzarEmergencia();
}
// --- estado del planeta y final por fracaso ---
if (mxTick % 20 === 0) { mxRevisarLogros(); mxRevisarFracaso(); }
}
function mxEfectosSalud(){
const b = mxBonos();
const tormenta = MUNDO.evento && MUNDO.evento.id === 'arena';
const mult = tormenta ? (MUNDO.evento.mult || 2) : 1;
const fuego = MUNDO.evento && MUNDO.evento.id === 'incendio' ? MUNDO.evento.celda : null;
for (let x = 0; x < GRID_COLS; x++) for (let y = 0; y < GRID_ROWS; y++) {
const c = farmGrid[x] && farmGrid[x][y];
if (!c || c.isDepot || c.isEmpty) continue;
const antes = c.health;
// las variantes experimentales aguantan de verdad: reciben la mitad del daño
const dureza = c.experimental ? 0.5 : 1;
if (tormenta && c.health > 0) c.health = Math.max(0, c.health - 0.04 * mult * dureza);
if (fuego && fuego[0] === x && fuego[1] === y) c.health = Math.max(0, c.health - 0.25 * dureza);
// el planeta seco castiga y el planeta sano ayuda: el mundo SÍ cambia el juego
if (b.castigoEco > 0 && c.health > 0) c.health = Math.max(0, c.health - b.castigoEco * dureza);
const proteccion = b.proteccion + (c.experimental ? 0.35 : 0);
if (proteccion > 0 && c.health > 0 && c.health < 5) c.health = Math.min(5, c.health + 0.06 * proteccion);
if (antes !== c.health) {
c.stage = getGrowthStage(c.health);
const needs = PLANT_NEEDS[c.type];
if (needs) c.weight = Math.round((c.health / 5) * needs.peso_max);
}
if (antes > 0 && c.health <= 0 && !c.muertaContada) {
c.muertaContada = true;
MUNDO.plantasMuertas++;
mxEco(-3);
logConsole(`💀 ${PLANT_NAMES[c.type]} murió en (${x},${y}). El terreno se seca un poco más.`, 'error');
}
}
}
// Calcula, en un solo lugar, todo lo que tus mejoras y construcciones
// están haciendo de verdad. Se usa en el juego y se muestra en los paneles.
function mxBonos(){
const inv = mxNivel(MUNDO.edificios, 'invernadero');
const sol = mxNivel(MUNDO.edificios, 'solar');
const pur = mxNivel(MUNDO.edificios, 'purificador');
const bat = mxNivel(MUNDO.edificios, 'baterias');
const rec = mxNivel(MUNDO.edificios, 'reciclaje');
const eco = MUNDO.eco;
return {
proteccion: inv * 0.2 + (MUNDO.investigado.sequia ? 0.25 : 0) + (eco >= 70 ? 0.2 : 0),
castigoEco: eco < 30 ? 0.03 : 0,
ecoBueno: eco >= 70,
velocidad: Math.max(55, 120 - mxNivel(MUNDO.mejoras, 'motores') * 22),
cubeta: drone.maxBucket,
energiaMin: sol * 3,
aguaMin: pur * (MUNDO.acuiferoHallado ? 2 : 1) * 2.4,
topeEnergia: MUNDO.topeEnergia,
reciclaje: Math.min(100, rec * 20),
baterias: bat,
sensores: mxNivel(MUNDO.mejoras, 'sensores'),
cosecha: mxNivel(MUNDO.mejoras, 'herramientas'),
drones: 1 + mxNivel(MUNDO.mejoras, 'escuadron'),
ahorroEnergia: mxNivel(MUNDO.mejoras, 'bateria')
};
}
function mxTextoBonos(){
const b = mxBonos();
const l = [];
l.push(`💧 Cubeta: <b>${b.cubeta}</b>`);
l.push(`🌀 Velocidad: <b>${(120 / b.velocidad).toFixed(1)}x</b>`);
l.push(`🏠 Protección de plantas: <b>+${Math.round(b.proteccion * 100)}%</b>`);
if (b.energiaMin) l.push(`☀️ Energía: <b>+${b.energiaMin}/min</b>`);
if (b.aguaMin) l.push(`💧 Agua: <b>+${b.aguaMin.toFixed(1)}/min</b>`);
if (b.reciclaje) l.push(`♻️ Riego gratis: <b>${b.reciclaje}%</b>`);
if (b.cosecha) l.push(`🦾 Cosecha: <b>${b.cosecha >= 3 ? 2 : 1} 🍲 por riego</b>`);
if (b.sensores) l.push(`📡 Sensores nivel <b>${b.sensores}</b>`);
l.push(`🚁 Drones: <b>${b.drones}</b>`);
if (b.ecoBueno) l.push(`🌍 El planeta sano protege tus plantas`);
if (b.castigoEco) l.push(`<span style="color:var(--coral)">🏜️ Planeta seco: las plantas se marchitan más rápido</span>`);
return `<div class="mx-hint">⚙️ Lo que tienes funcionando ahora:<br>${l.join(' · ')}</div>`;
}
function mxRevisarFracaso(){
if (MUNDO.terminada || MUNDO.fracasoMostrado) return;
const total = contarPlantas();
if (total > 0) {
let vivas = 0;
for (let x = 0; x < GRID_COLS; x++) for (let y = 0; y < GRID_ROWS; y++) {
const c = farmGrid[x] && farmGrid[x][y];
if (c && !c.isDepot && !c.isEmpty && c.health > 0) vivas++;
}
if (vivas === 0) { MUNDO.fracasoMostrado = true; MX.terminarPartida('fracaso'); }
}
}

// ============================================================
//  DIBUJO EXTRA SOBRE EL HUERTO
// ============================================================
function mxOverlay(){
if (gameState !== 'game' || !farmCtx) return;
const ctx = farmCtx;
// el mundo cambia según tus acciones
if (MUNDO.eco < 40) {
ctx.fillStyle = `rgba(190,140,60,${(40 - MUNDO.eco) / 220})`;
ctx.fillRect(0, 0, farmCanvas.width, farmCanvas.height);
} else if (MUNDO.eco > 65) {
ctx.fillStyle = `rgba(74,222,128,${(MUNDO.eco - 65) / 400})`;
ctx.fillRect(0, 0, farmCanvas.width, farmCanvas.height);
}
// marcas sobre las macetas
for (let x = 0; x < GRID_COLS; x++) for (let y = 0; y < GRID_ROWS; y++) {
const c = farmGrid[x] && farmGrid[x][y];
if (!c) continue;
const px = originX + x * cellW, py = originY + y * cellH;
if (c.experimental) {
ctx.font = '14px sans-serif';
ctx.fillText('🧬', px + cellW - 20, py + 16);
}
if (mxNivel(MUNDO.mejoras, 'sensores') > 0 && !c.isDepot && !c.isEmpty && c.health < 2) {
ctx.strokeStyle = 'rgba(255,138,138,0.9)';
ctx.lineWidth = 3;
ctx.setLineDash([5, 4]);
ctx.strokeRect(px + 3, py + 3, cellW - 6, cellH - 6);
ctx.setLineDash([]);
}
}
// incendio
if (MUNDO.evento && MUNDO.evento.id === 'incendio' && MUNDO.evento.celda) {
const [fx, fy] = MUNDO.evento.celda;
const px = originX + fx * cellW, py = originY + fy * cellH;
ctx.fillStyle = `rgba(255,120,40,${0.25 + 0.2 * Math.abs(Math.sin(blinkPhase))})`;
ctx.fillRect(px, py, cellW, cellH);
ctx.font = '26px sans-serif';
ctx.fillText('🔥', px + cellW / 2 - 13, py + cellH / 2 + 8);
}
// tormenta de arena
if (MUNDO.evento && MUNDO.evento.id === 'arena') {
ctx.fillStyle = 'rgba(210,170,90,0.20)';
ctx.fillRect(0, 0, farmCanvas.width, farmCanvas.height);
ctx.fillStyle = 'rgba(230,200,140,0.5)';
for (let i = 0; i < 60; i++) {
const sx = (i * 137 + gameTimer * 320) % farmCanvas.width;
const sy = (i * 83 + gameTimer * 40) % farmCanvas.height;
ctx.fillRect(sx, sy, 8, 1.5);
}
}
// apagón
if (MUNDO.apagon) {
ctx.fillStyle = 'rgba(0,0,20,0.45)';
ctx.fillRect(0, 0, farmCanvas.width, farmCanvas.height);
}
// dron pirata
if (MUNDO.pirata) {
const px = originX + MUNDO.pirata.x * cellW + cellW / 2;
const py = originY + MUNDO.pirata.y * cellH + cellH / 2;
ctx.save();
ctx.translate(px, py + Math.sin(gameTimer * 4) * 3);
ctx.fillStyle = 'rgba(255,60,60,0.25)';
ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
ctx.font = '26px sans-serif';
ctx.fillText('👾', -13, 9);
ctx.restore();
}
// expediciones en curso
if (MUNDO.expediciones.length) {
ctx.font = '11px sans-serif';
ctx.fillStyle = 'rgba(92,225,255,0.9)';
MUNDO.expediciones.forEach((e, i) => {
const z = MX_ZONAS.find(z => z.id === e.zona);
ctx.fillText(`🚁 ${z.emoji} ${Math.ceil(e.restante)}s`, 12, farmCanvas.height - 14 - i * 15);
});
}
// dron averiado
if (MUNDO.dronAveriado) {
ctx.font = '20px sans-serif';
ctx.fillText('⚠️', drone.px - 10, drone.py - 34);
}
}

// ============================================================
//  FINALES
// ============================================================
const MX_FINALES = {
ecologico:{emoji:'🌱', titulo:'Final ecológico', color:'var(--emerald)',
 texto:'Cuidaste el agua y ayudaste a los demás. Alrededor de tu granja la tierra vuelve a tener color: brotan hierbas donde antes solo había polvo. El planeta empieza a recuperarse.'},
tecnologico:{emoji:'🏭', titulo:'Final tecnológico', color:'var(--cyan)',
 texto:'Tus máquinas, drones y laboratorios mantuvieron viva la granja. La humanidad sobrevive gracias a la tecnología, aunque el planeta todavía necesita tiempo para sanar.'},
perfecto:{emoji:'🌎', titulo:'Final perfecto', color:'var(--gold)',
 texto:'Tecnología, comunidad y respeto por el agua. Recuperaste gran parte del planeta: las zonas exploradas reverdecen y las comunidades vuelven a sembrar por su cuenta.'},
fracaso:{emoji:'💀', titulo:'Final de fracaso', color:'var(--coral)',
 texto:'La granja colapsó. Sin plantas vivas no hay comida ni semillas. No pasa nada: vuelve a empezar y esta vez riega antes de que la salud baje de 2.'}
};
MX.terminarPartida = function(forzado){
if (MUNDO.terminada) return;
const eco = Math.round(MUNDO.eco);
const zonas = MX_ZONAS.filter(z => (MUNDO.zonas[z.id] || {}).explorado >= 100).length;
let tipo = forzado;
if (!tipo) {
if (eco >= 85 && MUNDO.reputacion >= 12 && zonas >= 4) tipo = 'perfecto';
else if (eco >= 65) tipo = 'ecologico';
else if (Object.keys(MUNDO.investigado).length >= 2 || Object.keys(MUNDO.edificios).length >= 3) tipo = 'tecnologico';
else if (eco < 25) tipo = 'fracaso';
else tipo = 'tecnologico';
}
MUNDO.terminada = true;
const f = MX_FINALES[tipo];
const minutos = Math.max(1, Math.round(gameTimer / 60));
mxGuardarRanking(tipo, minutos);
const h = `<div class="mx-final">
<div class="mx-em">${f.emoji}</div>
<h2 style="color:${f.color}">${f.titulo}</h2>
<div class="mx-sub" style="text-align:center">${f.texto}</div>
<div class="mx-stats">
<div class="mx-st"><b>${score}</b><small>PUNTOS</small></div>
<div class="mx-st"><b>${eco}%</b><small>PLANETA</small></div>
<div class="mx-st"><b>${MUNDO.reputacion}</b><small>REPUTACIÓN</small></div>
<div class="mx-st"><b>${totalWatered}</b><small>RIEGOS</small></div>
<div class="mx-st"><b>${totalRescues}</b><small>RESCATES</small></div>
<div class="mx-st"><b>${zonas}/5</b><small>ZONAS</small></div>
<div class="mx-st"><b>${Object.keys(MUNDO.logros).length}/${MX_LOGROS.length}</b><small>LOGROS</small></div>
<div class="mx-st"><b>${minutos}</b><small>MINUTOS</small></div>
</div>
${mxTablaRanking()}
<div style="margin-top:14px;display:flex;gap:9px;justify-content:center;flex-wrap:wrap">
<button class="mx-btn cyan" onclick="MX.cerrar()">Seguir jugando</button>
<button class="mx-btn gold" onclick="MX.cerrar(); goToMenu();">⌂ Menú principal</button>
</div></div>`;
mxModal('🏁 Fin de la partida', h);
aidenSpeak(`${f.titulo}. ${f.texto}`);
MUNDO.terminada = false; // permite seguir jugando y volver a terminar
};
function mxGuardarRanking(tipo, minutos){
const r = mxLeerRanking();
r.push({nombre: currentUser ? currentUser.name : 'Jugador', puntos: score, minutos: minutos,
eco: Math.round(MUNDO.eco), final: MX_FINALES[tipo].emoji + ' ' + MX_FINALES[tipo].titulo.replace('Final ', '')});
r.sort((a, b) => b.puntos - a.puntos);
try { localStorage.setItem('agrobot_ranking', JSON.stringify(r.slice(0, 20))); } catch(e) {}
}

// ============================================================
//  CONEXIÓN CON EL JUEGO ORIGINAL
// ============================================================
function mxReiniciarMundo(){
MUNDO.recursos = {energia:12, piezas:4, alimento:2, agua:0};
MUNDO.topeEnergia = 30;
MUNDO.eco = 50; MUNDO.reputacion = 0;
MUNDO.mejoras = {}; MUNDO.edificios = {}; MUNDO.investigando = null; MUNDO.investigado = {};
MUNDO.zonas = {}; MUNDO.expediciones = []; MUNDO.pistas = [];
MUNDO.acuifero = mxAzar(MX_ZONAS).id; MUNDO.acuiferoHallado = false;
MUNDO.comunidades = {}; MUNDO.entregas = 0; MUNDO.evento = null; MUNDO.emergencia = null;
MUNDO.pirata = null; MUNDO.piratasVencidos = 0; MUNDO.logros = {}; MUNDO.aprendizaje = {};
MUNDO.auto = false; MUNDO.autoT = 0; MUNDO.plantasMuertas = 0; MUNDO.variantes = [];
MUNDO.vecesRegado = 0; MUNDO.sinAgua = false; MUNDO.tActivo = 0;
MUNDO.ultimoEvento = 0; MUNDO.ultimaEmergencia = 0; MUNDO.terminada = false;
MUNDO.puzzleActivo = null; MUNDO.dronAveriado = false; MUNDO.apagon = false;
MUNDO.fracasoMostrado = false;
MUNDO.iniciado = true;
mxAlerta(null);
mxPintarHUD();
}

// --- al empezar una partida ---
const _initFarm_mx = initFarm;
initFarm = function(){
_initFarm_mx();
mxReiniciarMundo();
logConsole('🌎 Mundo destruido cargado: 5 zonas por explorar, comunidades que piden ayuda y eventos sorpresa.', 'info');
logConsole('⌨️ Teclas nuevas: M mapa · T taller · V base · I laboratorio · C comunidades · L logros · ESPACIO piloto automático.', 'info');
};

// --- riego: aprendizaje, cosecha, reciclaje, energía ---
function mxDespuesDeRegar(cell, aguaAntes){
MUNDO.vecesRegado++;
MUNDO.aprendizaje[cell.type] = (MUNDO.aprendizaje[cell.type] || 0) + 1;
mxEco(0.4);
cell.muertaContada = false;
// reciclaje de agua
const rec = mxNivel(MUNDO.edificios, 'reciclaje');
if (rec > 0 && Math.random() < 0.2 * rec) {
drone.bucket = Math.min(drone.maxBucket, aguaAntes);
showToast('♻️ Reciclaje: no gastaste agua');
}
// brazo cosechador
const herr = mxNivel(MUNDO.mejoras, 'herramientas');
if (herr > 0 && cell.health >= 4) {
mxDar('alimento', herr >= 3 ? 2 : 1);
if (herr >= 2) addCoins(2, '');
}
// cultivos futuristas
if (MUNDO.investigado.bioluz) mxDar('energia', cell.experimental ? 2 : 1);
// apagar incendio regando
if (MUNDO.evento && MUNDO.evento.id === 'incendio' && MUNDO.evento.celda
&& MUNDO.evento.celda[0] === drone.x && MUNDO.evento.celda[1] === drone.y) {
showToast('🔥 ¡Apagaste el incendio!');
logConsole('🔥 Incendio apagado a tiempo. +3 🌍', 'info');
mxEco(3); addCoins(15, 'apagaste el incendio');
mxTerminarEvento();
}
if (drone.bucket <= 0) MUNDO.sinAgua = true;
mxRevisarLogros();
}

const _droneAction_mx = droneAction;
droneAction = function(){
if (MUNDO.dronAveriado) {
showToast('⚠️ El dron está averiado: resuelve el rompecabezas', true);
MX.reintentarPuzzle();
return;
}
if (mxGolpearPirata()) return;
const cell = farmGrid[drone.x] && farmGrid[drone.x][drone.y];
const eraPlanta = cell && !cell.isDepot && !cell.isEmpty;
// ARREGLO: antes se miraba si SUBÍA la salud. Si la planta ya estaba sana
// (salud 5) no subía, así que la cosecha, el reciclaje y el aprendizaje
// de la IA no se activaban nunca justo cuando debían.
const regadoAntes = eraPlanta ? cell.lastWatered : 0;
const aguaAntes = drone.bucket;
_droneAction_mx();
if (eraPlanta && cell.lastWatered !== regadoAntes) mxDespuesDeRegar(cell, aguaAntes);
};

const _moveDrone_mx = moveDrone;
moveDrone = function(dx, dy){
if (MUNDO.dronAveriado) { showToast('⚠️ Dron averiado: repáralo primero', true); return; }
_moveDrone_mx(dx, dy);
};

// --- teclas nuevas ---
const MX_TECLAS = {
m:() => MX.abrir('zonas'), t:() => MX.abrir('taller'), v:() => MX.abrir('base'),
i:() => MX.abrir('lab'), c:() => MX.abrir('comunidades'), l:() => MX.abrir('logros'),
' ':() => MX.toggleAuto()
};
const _handleKey_mx = handleKey;
handleKey = function(key){
if (gameState !== 'game') return _handleKey_mx(key);
const activeEl = document.activeElement;
if (activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')) return;
const k = String(key).toLowerCase();
if (hayVentanaAbierta()) {
if (k === 'e' || k === 'escape') cerrarVentanas();
return;
}
if (k === 'escape') { togglePause(); return; }
if (MX_TECLAS[k]) { MX_TECLAS[k](); return; }
return _handleKey_mx(key);
};

// --- dibujo ---
const _drawFarm_mx = drawFarm;
drawFarm = function(){ _drawFarm_mx(); try { mxOverlay(); } catch(e) {} };

// --- variantes experimentales dentro del selector de plantas ---
const _abrirSelector_mx = abrirSelectorPlanta;
abrirSelectorPlanta = function(){
_abrirSelector_mx();
if (!MUNDO.variantes.length) return;
const grid = document.getElementById('picker-grid');
if (!grid) return;
MUNDO.variantes.forEach(f => {
const card = document.createElement('div');
const precio = ECONOMIA.precioPlanta + 5;
card.className = 'sow-card' + (coins >= precio ? '' : ' sin-monedas');
card.innerHTML = `<div class="foto-fruta"><span class="foto-emoji">${PLANT_EMOJI[f]}</span></div>
<div class="sow-name">🧬 ${PLANT_NAMES[f]} R-9</div>
<div class="sow-tag">${precio} 🪙 · resistente</div>`;
pintarFotoFruta(card.querySelector('.foto-fruta'), f);
card.onclick = () => MX.sembrarVariante(f);
grid.appendChild(card);
});
};
MX.sembrarVariante = function(f){
const precio = ECONOMIA.precioPlanta + 5;
if (coins < precio) { showToast(`🪙 Te faltan ${precio - coins} monedas`, true); return; }
const x = drone.x, y = drone.y;
const cell = farmGrid[x] && farmGrid[x][y];
if (!cell || cell.locked || cell.isDepot || !cell.isEmpty) { showToast('🪴 Ponte en una maceta vacía', true); return; }
spendCoins(precio);
cerrarSelectorPlanta();
sembrarEn(x, y, f, Date.now(), true);
farmGrid[x][y].experimental = true;
farmGrid[x][y].health = 4.5;
showToast(`🧬 Plantaste ${PLANT_NAMES[f]} R-9 (resistente)`);
logConsole(`🧬 Variante experimental de ${PLANT_NAMES[f]} sembrada en (${x},${y}).`, 'info');
aidenSpeak(`Sembraste la variante experimental de ${PLANT_NAMES[f]}. Aguanta más tiempo sin agua y te da energía extra.`);
};

// --- motores rápidos: el dron se mueve más rápido al dejar la tecla apretada ---
const _startMove_mx = startContinuousMove;
startContinuousMove = function(key){
stopContinuousMove();
const vel = Math.max(55, 120 - mxNivel(MUNDO.mejoras, 'motores') * 22);
moveInterval = setInterval(() => {
if (KEYS[key]) handleKey(key); else stopContinuousMove();
}, vel);
};

setInterval(mxCiclo, 500);
mxPintarHUD();


// ============================================================================
//  v13 · AIDEN SIEMPRE ENCENDIDO
//  1. Conexion con Gemini mucho mas robusta (reintentos, timeout, respaldo)
//  2. Sonido y voz ENCENDIDOS por defecto: solo se apagan desde AJUSTES
//  3. AIDEN empieza a hablarte desde que entras
//  4. Microfono SIEMPRE encendido y conversacion continua
//  5. AIDEN te va explicando todo desde el menu
// ============================================================================

// ---------------------------------------------------------------- AJUSTES ---
const AJ_KEY = 'agrobot_ajustes_v13';
const AJ = {
  sonido: true,        // interruptor general del sonido
  voz: true,           // AIDEN habla
  micro: true,         // microfono siempre escuchando
  guia: true,          // AIDEN va explicando todo solo
  efectos: true,       // musica y efectos
  velocidad: 0.95,
  volumen: 1.0
};
function ajCargar() {
  try {
    const d = JSON.parse(localStorage.getItem(AJ_KEY) || '{}');
    Object.keys(AJ).forEach(k => { if (typeof d[k] === typeof AJ[k]) AJ[k] = d[k]; });
  } catch (e) {}
}
function ajGuardar() { try { localStorage.setItem(AJ_KEY, JSON.stringify(AJ)); } catch (e) {} }
ajCargar();

function vozActiva() { return AJ.sonido && AJ.voz; }
function sincronizarVoz() { voiceEnabled = vozActiva(); try { actualizarBotonVoz(); } catch (e) {} }

// ------------------------------------------------- DESBLOQUEO DE AUDIO ------
// Los navegadores no dejan sonar nada hasta que el usuario toca la pantalla.
const AUDIO = { listo: false, cola: [] };
function desbloquearAudio() {
  if (AUDIO.listo) return;
  AUDIO.listo = true;
  try { if (introAudioCtx && introAudioCtx.state === 'suspended') introAudioCtx.resume(); } catch (e) {}
  try {
    if (speechSynth) {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0; speechSynth.speak(u);
    }
  } catch (e) {}
  if (AJ.micro) setTimeout(function () { micArrancar(true); }, 200);
  setTimeout(function () {
    const c = AUDIO.cola.slice(); AUDIO.cola = [];
    c.forEach(function (o) { vozDecir(o.t, o.o); });
  }, 260);
}
['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
  document.addEventListener(ev, desbloquearAudio, { passive: true });
});

// ------------------------------------------------------------------- VOZ ---
const VOZ = { cola: [], hablando: false, ultimo: '', ultimoTs: 0 };

function vozLimpiarTexto(t) {
  return String(t || '')
    .replace(/[*_#`>]/g, ' ')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/[\u2600-\u27BF\uE000-\uF8FF\uD83C-\uDBFF\uDC00-\uDFFF\uFE0F\u2190-\u21FF\u2B00-\u2BFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function vozPartir(texto) {
  const frases = String(texto).replace(/\s+/g, ' ').trim().split(/([.!?:;]+\s+)/);
  const trozos = []; let actual = '';
  frases.forEach(function (f) {
    if ((actual + f).length > 170 && actual.trim()) { trozos.push(actual.trim()); actual = f; }
    else actual += f;
  });
  if (actual.trim()) trozos.push(actual.trim());
  return trozos.length ? trozos : [String(texto)];
}
function vozParar() {
  VOZ.cola = []; VOZ.hablando = false;
  try { if (speechSynth) speechSynth.cancel(); } catch (e) {}
  micSilenciar(false);
  hudAiden('');
}
function vozDecir(texto, opts) {
  opts = opts || {};
  const limpio = vozLimpiarTexto(texto);
  if (!limpio) { if (opts.onend) opts.onend(); return; }
  if (!vozActiva()) { if (opts.onend) opts.onend(); return; }
  if (!AUDIO.listo) { if (AUDIO.cola.length < 8) AUDIO.cola.push({ t: texto, o: opts }); return; }
  if (limpio === VOZ.ultimo && Date.now() - VOZ.ultimoTs < 8000 && !opts.repetir) {
    if (opts.onend) opts.onend(); return;
  }
  if (opts.urgente) { VOZ.cola = []; try { speechSynth.cancel(); } catch (e) {} VOZ.hablando = false; }
  VOZ.cola.push({ texto: limpio, crudo: String(texto), onend: opts.onend });
  if (VOZ.cola.length > 12) VOZ.cola = VOZ.cola.slice(-12);
  vozSiguiente();
}
function vozSiguiente() {
  if (VOZ.hablando || !VOZ.cola.length || !speechSynth) return;
  const item = VOZ.cola.shift();
  VOZ.ultimo = item.texto; VOZ.ultimoTs = Date.now();
  VOZ.hablando = true;
  micSilenciar(true);                 // AIDEN no se escucha a si mismo
  hudAiden(item.crudo);
  const trozos = vozPartir(item.texto);
  let i = 0;
  function seguir() {
    if (i >= trozos.length) {
      VOZ.hablando = false;
      hudAiden('');
      setTimeout(function () { micSilenciar(false); }, 320);
      if (item.onend) { try { item.onend(); } catch (e) {} }
      setTimeout(vozSiguiente, 120);
      return;
    }
    const u = new SpeechSynthesisUtterance(trozos[i++]);
    let v = null;
    try { v = elegirVoz(); } catch (e) {}
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'es-MX'; }
    u.rate = AJ.velocidad;
    u.pitch = VOICE_CONFIG.pitch;
    u.volume = AJ.volumen;
    u.onend = seguir;
    u.onerror = seguir;
    try { speechSynth.speak(u); } catch (e) { seguir(); }
  }
  seguir();
}
// Chrome se duerme a los 15 s hablando: esto lo mantiene despierto
setInterval(function () { try { if (speechSynth && speechSynth.speaking) speechSynth.resume(); } catch (e) {} }, 7000);
// si la cola se traba, la destrabamos
setInterval(function () {
  if (VOZ.hablando && speechSynth && !speechSynth.speaking && !speechSynth.pending) {
    VOZ.hablando = false; micSilenciar(false); vozSiguiente();
  }
}, 2500);

speak = function (text, opts) {
  opts = opts || {};
  vozDecir(text, { onend: opts.onend, urgente: !!opts.onend });
};
speakText = function (text) { vozDecir(text); };
toggleVoice = function () {
  AJ.voz = !AJ.voz;
  if (AJ.voz) AJ.sonido = true; else vozParar();
  ajGuardar(); sincronizarVoz(); pintarAjustes();
  if (AJ.voz) vozDecir('Voz encendida. Aqui estoy.', { urgente: true, repetir: true });
  else showToast('🔇 Voz apagada · vuelve a encenderla en Ajustes');
};
setVoice = function (nombre) {
  vozElegida = nombre || '';
  if (currentUser) { currentUser.voz = vozElegida; saveUserData(currentUser); }
  AJ.voz = true; AJ.sonido = true; ajGuardar(); sincronizarVoz();
  const a = document.getElementById('voice-select'); if (a) a.value = vozElegida;
  const b = document.getElementById('aj-voz'); if (b) b.value = vozElegida;
  vozDecir('Hola, asi voy a sonar desde ahora.', { urgente: true, repetir: true });
};

// --------------------------------------------------------------- MICROFONO --
const MICV = { activo: false, silenciado: false, ultimoInicio: 0, ultimaFrase: '', ultimaTs: 0 };

function micSilenciar(v) { MICV.silenciado = !!v; pintarMicV(); }

function pintarMicV() {
  if (!AJ.micro) {
    MIC.encendido = false;
    try { pintarMic('off', 'Microfono apagado. Enciendelo en Ajustes ⚙️.'); } catch (e) {}
    hudMic('off', 'Micro apagado'); return;
  }
  MIC.encendido = true;
  if (MIC.error === 'permiso') { hudMic('off', 'Falta permiso del micro'); return; }
  if (MICV.silenciado) {
    try { pintarMic('on', 'AIDEN esta hablando…'); } catch (e) {}
    hudMic('on', 'AIDEN habla…'); return;
  }
  try { pintarMic('on', 'Te escucho <b>siempre</b>. Hablame cuando quieras.'); } catch (e) {}
  hudMic('hot', 'Escuchando…');
}

function micArrancar(silencioso) {
  if (!AJ.micro) return false;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    MIC.soportado = false;
    try { pintarMic('off', 'Tu navegador no permite microfono. Usa Chrome o Edge y escribeme abajo.'); } catch (e) {}
    hudMic('off', 'Sin microfono');
    return false;
  }
  MIC.soportado = true;
  if (MIC.rec) { try { MIC.rec.onend = null; MIC.rec.onresult = null; MIC.rec.stop(); } catch (e) {} }
  const rec = new SR();
  rec.lang = 'es-MX';
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.onstart = function () {
    MIC.encendido = true; MIC.error = ''; MICV.activo = true; MICV.ultimoInicio = Date.now();
    pintarMicV();
  };
  rec.onresult = micResultado;
  rec.onerror = function (ev) {
    MICV.activo = false;
    if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
      MIC.error = 'permiso';
      try { pintarMic('off', 'No diste permiso al microfono. Toca el candado 🔒 del navegador, permite el microfono y recarga la pagina.'); } catch (e) {}
      hudMic('off', 'Permite el micro');
    } else if (ev.error === 'audio-capture') {
      MIC.error = 'sinmic';
      try { pintarMic('off', 'No encuentro un microfono conectado.'); } catch (e) {}
      hudMic('off', 'Sin microfono');
    }
    // 'no-speech' y 'aborted' son normales: el vigilante lo vuelve a levantar
  };
  rec.onend = function () {
    MICV.activo = false;
    if (AJ.micro && MIC.error !== 'permiso') setTimeout(function () { try { rec.start(); } catch (e) {} }, 250);
    else { try { pintarMic('off', 'Microfono apagado'); } catch (e) {} }
  };
  MIC.rec = rec; MIC.encendido = true;
  try { rec.start(); } catch (e) {}
  if (!silencioso) showToast('🎙️ Microfono siempre encendido');
  return true;
}

function micApagarDeVerdad() {
  MICV.activo = false; MIC.encendido = false;
  if (MIC.rec) { try { MIC.rec.onend = null; MIC.rec.stop(); } catch (e) {} }
  try { pintarMic('off', 'Microfono apagado. Enciendelo en Ajustes ⚙️.'); } catch (e) {}
  hudMic('off', 'Micro apagado');
}

// vigilante: si el navegador corta el microfono, lo volvemos a levantar
setInterval(function () {
  if (!AJ.micro || !MIC.soportado || MIC.error === 'permiso') return;
  if (!MICV.activo && Date.now() - MICV.ultimoInicio > 2500) {
    MICV.ultimoInicio = Date.now();
    if (MIC.rec) { try { MIC.rec.start(); } catch (e) { micArrancar(true); } }
    else micArrancar(true);
  }
}, 3000);
document.addEventListener('visibilitychange', function () {
  if (!document.hidden && AJ.micro) setTimeout(function () { if (!MICV.activo) micArrancar(true); }, 400);
});

function micResultado(ev) {
  if (MICV.silenciado || VOZ.hablando) return;   // ignoramos el eco de AIDEN
  let finales = '', parcial = '';
  for (let i = ev.resultIndex; i < ev.results.length; i++) {
    const t = ev.results[i][0].transcript;
    if (ev.results[i].isFinal) finales += t + ' '; else parcial += t + ' ';
  }
  const previa = normalizarVoz(finales + parcial);
  if (previa) {
    try { pintarMic('hot', '🎙️ <span class="mic-heard">' + previa + '</span>'); } catch (e) {}
    hudMic('hot', previa.slice(0, 44));
  }
  if (!finales.trim()) return;
  let dicho = normalizarVoz(finales);
  if (!dicho) return;
  const resto = detectarClave(dicho);
  if (resto !== null) dicho = resto;
  if (!dicho) { vozDecir('Te escucho. Dime que necesitas.', { urgente: true, repetir: true }); return; }
  if (dicho.length < 4) return;
  if (dicho === MICV.ultimaFrase && Date.now() - MICV.ultimaTs < 3000) return;
  MICV.ultimaFrase = dicho; MICV.ultimaTs = Date.now();
  if (comandoDeVoz(dicho)) return;
  askAidenTexto(dicho, true);
}

// el juego llamaba a estas: ahora respetan los Ajustes
iniciarMicrofono = function (silencioso) { return micArrancar(silencioso); };
apagarMicrofono = function () { /* el microfono se queda encendido; solo se apaga desde Ajustes */ };
toggleMicrofono = function () {
  AJ.micro = !AJ.micro; ajGuardar();
  if (AJ.micro) { micArrancar(false); vozDecir('Microfono encendido. Ya te escucho.', { urgente: true, repetir: true }); }
  else { micApagarDeVerdad(); showToast('🎙️ Microfono apagado'); }
  pintarAjustes();
};

// ------------------------------------------------------- ORDENES POR VOZ ----
function comandoDeVoz(txt) {
  const t = ' ' + txt + ' ';
  function tiene() {
    for (let i = 0; i < arguments.length; i++) if (t.indexOf(arguments[i]) !== -1) return true;
    return false;
  }
  if (tiene('callate', 'silencio', 'no hables', 'apaga la voz', 'apagate')) {
    vozParar(); AJ.voz = false; ajGuardar(); sincronizarVoz(); pintarAjustes();
    showToast('🔇 Listo, me callo. Enciendeme en Ajustes ⚙️');
    return true;
  }
  if (tiene('habla otra vez', 'enciende la voz', 'puedes hablar', 'vuelve a hablar')) {
    AJ.voz = true; AJ.sonido = true; ajGuardar(); sincronizarVoz(); pintarAjustes();
    vozDecir('Listo, ya vuelvo a hablarte.', { urgente: true, repetir: true });
    return true;
  }
  if (tiene('ajustes', 'configuracion', 'opciones')) { abrirAjustes(); return true; }
  if (gameState === 'menu') {
    if (tiene('nivel uno', 'nivel 1', 'frutas clasicas', 'primer nivel')) {
      vozDecir('Vamos al nivel uno. Elige dos frutas para empezar.', { urgente: true, repetir: true });
      setTimeout(function () { openSowScreen(1); }, 500); return true;
    }
    if (tiene('nivel dos', 'nivel 2', 'frutas exoticas', 'segundo nivel')) {
      vozDecir('Vamos al nivel dos. Elige dos frutas exoticas.', { urgente: true, repetir: true });
      setTimeout(function () { openSowScreen(2); }, 500); return true;
    }
    if (tiene('manual', 'controles', 'instrucciones')) {
      openManual();
      vozDecir('Abri el manual. Ahi estan todos los controles y todas las ordenes del dron.', { urgente: true, repetir: true });
      return true;
    }
    if (tiene('explicame', 'explica otra vez', 'repite', 'que hago', 'no entiendo', 'ayudame')) {
      TOUR.hechos = {}; tourMenu(true); return true;
    }
  }
  if (gameState === 'game' && tiene('volver al menu', 'llevame al menu', 'salir al menu')) { goToMenu(); return true; }
  return false;
}

// ---------------------------------------------------------------- GEMINI ----
AIDEN_CONFIG.modelos = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest'];
AIDEN_CONFIG.maxHistorial = 6;
AIDEN_CONFIG.timeoutMs = 15000;

const GEM = { modelo: null, estado: 'probando', ultimoOk: 0, fallos: 0, probando: false };

function pintarEstadoGemini(forzar) {
  const mapa = {
    'ok': '🟢 Conectado con Gemini',
    'pensando': '🟡 Pensando…',
    'sin-clave': '🟠 Sin clave · uso mi memoria local',
    'sin-conexion': '🟠 Sin internet · uso mi memoria local',
    'clave': '🔴 La clave de Gemini no sirve o esta restringida',
    'error': '🟠 Gemini no responde · uso mi memoria local',
    'probando': '⚪ Probando la conexion…'
  };
  const est = forzar || GEM.estado;
  let txt = mapa[est] || 'Asistente IA';
  if (est === 'ok' && GEM.modelo) txt += ' · ' + GEM.modelo;
  const el = document.getElementById('aiden-status');
  if (el) el.textContent = txt;
  const el2 = document.getElementById('aj-conexion');
  if (el2) {
    el2.textContent = txt;
    el2.style.color = est === 'ok' ? 'var(--emerald)' : (est === 'clave' ? 'var(--coral)' : 'var(--gold)');
  }
}
function gemEstado(e) { GEM.estado = e; pintarEstadoGemini(); }

function gemPeticion(modelo, cuerpo, ms) {
  const ctrl = new AbortController();
  const reloj = setTimeout(function () { ctrl.abort(); }, ms || AIDEN_CONFIG.timeoutMs);
  return fetch('https://generativelanguage.googleapis.com/v1beta/models/' + modelo + ':generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': AIDEN_CONFIG.apiKey },
    body: JSON.stringify(cuerpo),
    signal: ctrl.signal
  }).then(function (r) {
    return r.text().then(function (crudo) {
      let data = null; try { data = JSON.parse(crudo); } catch (e) {}
      return { ok: r.ok, status: r.status, data: data, crudo: crudo };
    });
  }).catch(function (e) {
    return { ok: false, status: 0, crudo: '', error: (e && e.name === 'AbortError') ? 'timeout' : 'red' };
  }).finally(function () { clearTimeout(reloj); });
}

function gemCuerpo(pregunta) {
  const turnos = [];
  aidenHistory.slice(-AIDEN_CONFIG.maxHistorial).forEach(function (h) {
    turnos.push({ role: 'user', parts: [{ text: String(h.q) }] });
    turnos.push({ role: 'model', parts: [{ text: String(h.a) }] });
  });
  turnos.push({ role: 'user', parts: [{ text: String(pregunta) }] });
  return {
    systemInstruction: { parts: [{ text: construirContexto() }] },
    contents: turnos,
    generationConfig: {
      temperature: 0.6, topP: 0.9, maxOutputTokens: 400,
      thinkingConfig: { thinkingBudget: 0 }
    }
  };
}
function gemTexto(data) {
  const c = ((data && data.candidates) || [])[0];
  if (!c) return '';
  const partes = (c.content && c.content.parts) || [];
  return partes.map(function (p) { return p.text || ''; }).join('').trim();
}
function dormir(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

consultarGemini = async function (pregunta) {
  if (!AIDEN_CONFIG.apiKey) { gemEstado('sin-clave'); return null; }
  if (navigator.onLine === false) { gemEstado('sin-conexion'); return null; }
  const orden = GEM.modelo
    ? [GEM.modelo].concat(AIDEN_CONFIG.modelos.filter(function (m) { return m !== GEM.modelo; }))
    : AIDEN_CONFIG.modelos.slice();
  let cuerpo;
  try { cuerpo = gemCuerpo(pregunta); } catch (e) { return null; }

  for (let k = 0; k < orden.length; k++) {
    const modelo = orden[k];
    for (let intento = 0; intento < 3; intento++) {
      const r = await gemPeticion(modelo, cuerpo);
      if (r.ok) {
        const t = gemTexto(r.data);
        if (t) {
          GEM.modelo = modelo; GEM.fallos = 0; GEM.ultimoOk = Date.now();
          gemEstado('ok');
          return limpiarRespuesta(t);
        }
        if (intento === 0) { cuerpo.generationConfig.maxOutputTokens = 900; continue; }
        break;
      }
      if (r.status === 429 || r.status === 500 || r.status === 502 || r.status === 503 ||
          r.error === 'timeout' || r.error === 'red') {
        await dormir(500 * (intento + 1));
        continue;
      }
      if (r.status === 400 && (r.crudo || '').indexOf('thinking') !== -1 && cuerpo.generationConfig.thinkingConfig) {
        delete cuerpo.generationConfig.thinkingConfig;
        continue;
      }
      if (r.status === 401 || r.status === 403) { gemEstado('clave'); return null; }
      break;   // 400/404: probamos el siguiente modelo
    }
  }
  GEM.fallos++;
  gemEstado(navigator.onLine === false ? 'sin-conexion' : 'error');
  return null;
};

async function gemProbar(avisar) {
  if (GEM.probando) return;
  GEM.probando = true; gemEstado('probando');
  if (!AIDEN_CONFIG.apiKey) { GEM.probando = false; gemEstado('sin-clave'); return; }
  if (navigator.onLine === false) { GEM.probando = false; gemEstado('sin-conexion'); return; }
  const cuerpo = {
    contents: [{ role: 'user', parts: [{ text: 'Responde solo con la palabra listo.' }] }],
    generationConfig: { maxOutputTokens: 30, thinkingConfig: { thinkingBudget: 0 } }
  };
  for (let i = 0; i < AIDEN_CONFIG.modelos.length; i++) {
    const modelo = AIDEN_CONFIG.modelos[i];
    const r = await gemPeticion(modelo, cuerpo, 9000);
    if (r.ok && gemTexto(r.data)) {
      GEM.modelo = modelo; GEM.ultimoOk = Date.now(); gemEstado('ok'); GEM.probando = false;
      if (avisar) showToast('🟢 AIDEN conectado (' + modelo + ')');
      return;
    }
    if (r.status === 401 || r.status === 403) {
      gemEstado('clave'); GEM.probando = false;
      if (avisar) showToast('🔴 La clave de Gemini no sirve', true);
      return;
    }
  }
  GEM.probando = false;
  gemEstado(navigator.onLine === false ? 'sin-conexion' : 'error');
  if (avisar) showToast('🟠 No pude conectar. AIDEN sigue con su memoria local.', true);
}
window.addEventListener('online', function () { GEM.modelo = null; gemProbar(false); });
window.addEventListener('offline', function () { gemEstado('sin-conexion'); });
setInterval(function () {
  if (GEM.estado !== 'ok' && GEM.estado !== 'clave' && GEM.estado !== 'sin-clave') gemProbar(false);
}, 60000);

// ---------------------------------------------------- AIDEN RESPONDE -------
let aidenOcupado = false;

function respuestaSegura(pregunta) {
  try { return respuestaLocal(pregunta); }
  catch (e) {
    return 'Puedo explicarte las veinte frutas salvadorenas, los comandos del dron y para que sirven las monedas. Preguntame por ejemplo: como riego, o que es el jocote.';
  }
}

async function responderAiden(pregunta, porVoz) {
  if (!pregunta || aidenOcupado) return;
  aidenOcupado = true;
  try {
    try { aidenBubble(pregunta, 'me'); } catch (e) {}
    let pensando = null;
    try { pensando = aidenBubble('Pensando…', 'ai thinking', { temporal: true }); } catch (e) {}
    pintarEstadoGemini('pensando');
    hudAiden('Pensando…');

    let respuesta = null;
    try { respuesta = await consultarGemini(pregunta); } catch (e) { respuesta = null; }
    if (!respuesta) respuesta = respuestaSegura(pregunta);

    if (pensando && pensando.parentNode) pensando.parentNode.removeChild(pensando);
    try { aidenBubble(respuesta, 'ai'); } catch (e) {}
    aidenHistory.push({ q: pregunta, a: respuesta });
    if (aidenHistory.length > AIDEN_CONFIG.maxHistorial) aidenHistory.shift();
    pintarEstadoGemini();
    vozDecir(respuesta, { urgente: true, repetir: true });
    if (AJ.guia && porVoz && Math.random() < 0.4) {
      vozDecir('Sigo escuchandote. Preguntame otra cosa cuando quieras.');
    }
  } finally { aidenOcupado = false; }
}

askAiden = async function () {
  const inputEl = document.getElementById('aiden-input');
  const pregunta = inputEl ? inputEl.value.trim() : '';
  if (!pregunta) return;
  inputEl.value = '';
  await responderAiden(pregunta, false);
};
askAidenTexto = async function (texto, porVoz) {
  const inputEl = document.getElementById('aiden-input');
  if (inputEl) inputEl.value = '';
  if (gameState === 'game') {
    const tabs = document.querySelectorAll('.panel-tab');
    if (tabs && tabs[1] && !tabs[1].classList.contains('active')) switchTab('aiden', tabs[1]);
  }
  await responderAiden(texto, porVoz);
};
aidenSpeak = function (msg) {
  try { aidenBubble(msg, 'ai'); } catch (e) {}
  vozDecir(msg);
};

// -------------------------------------------------------- HUD DE AIDEN -----
function crearHud() {
  if (document.getElementById('aiden-hud')) return;
  const d = document.createElement('div');
  d.id = 'aiden-hud';
  d.innerHTML =
    '<div class="ah-orb" id="ah-orb">🤖</div>' +
    '<div class="ah-mid">' +
      '<div class="ah-txt" id="ah-txt">AIDEN listo · hablame cuando quieras</div>' +
      '<div class="ah-mic"><span class="ah-dot hot" id="ah-dot"></span><span id="ah-mic-txt">Escuchando…</span></div>' +
    '</div>' +
    '<div class="ah-btns">' +
      '<button class="ah-b" id="ah-mute" title="Silenciar o volver a hablar">🔊</button>' +
      '<button class="ah-b" id="ah-cfg" title="Ajustes">⚙️</button>' +
    '</div>';
  document.body.appendChild(d);
  const bMute = document.getElementById('ah-mute');
  const bCfg = document.getElementById('ah-cfg');
  const bOrb = document.getElementById('ah-orb');
  if (bMute) bMute.onclick = function () { toggleVoice(); pintarHud(); };
  if (bCfg) bCfg.onclick = function () { abrirAjustes(); };
  if (bOrb) bOrb.onclick = function () {
    vozParar();
    vozDecir('Te escucho. Dime que necesitas.', { urgente: true, repetir: true });
  };
}
let hudTimer = null;
function hudAiden(texto) {
  const el = document.getElementById('ah-txt');
  if (!el) return;
  clearTimeout(hudTimer);
  if (!texto) {
    hudTimer = setTimeout(function () { el.textContent = 'AIDEN listo · hablame cuando quieras'; }, 1500);
    return;
  }
  el.textContent = String(texto).slice(0, 170);
  const orb = document.getElementById('ah-orb');
  if (orb) { orb.classList.add('hablando'); setTimeout(function () { orb.classList.remove('hablando'); }, 1800); }
}
function hudMic(estado, texto) {
  const dot = document.getElementById('ah-dot');
  const t = document.getElementById('ah-mic-txt');
  if (dot) dot.className = 'ah-dot ' + (estado || 'off');
  if (t) t.textContent = texto || '';
}
function pintarHud() {
  crearHud();
  const hud = document.getElementById('aiden-hud');
  if (!hud) return;
  hud.style.display = (gameState === 'game' || gameState === 'bloqueado') ? 'none' : 'flex';
  const m = document.getElementById('ah-mute');
  if (m) m.textContent = vozActiva() ? '🔊' : '🔇';
}
setInterval(pintarHud, 900);

// ------------------------------------------------------------- AJUSTES UI --
function filaAjuste(clave, titulo, ayuda) {
  return '<div class="aj-row"><div class="aj-info"><div class="aj-lab">' + titulo + '</div>' +
    '<div class="aj-help">' + ayuda + '</div></div>' +
    '<button class="aj-sw" id="aj-sw-' + clave + '" onclick="alternarAjuste(\'' + clave + '\')"><span></span></button></div>';
}
function construirAjustes() {
  if (document.getElementById('ajustes-popup')) return;
  const d = document.createElement('div');
  d.id = 'ajustes-popup';
  d.innerHTML =
    '<div class="aj-box">' +
      '<div class="aj-head"><span class="aj-title">⚙️ AJUSTES DE SONIDO Y VOZ</span>' +
        '<button class="aj-close" onclick="cerrarAjustes()">✕</button></div>' +
      '<div class="aj-body">' +
        '<div class="aj-note">El sonido, la voz y el microfono vienen <b>siempre encendidos</b>. Este es el unico lugar donde se pueden apagar.</div>' +
        filaAjuste('sonido', '🔊 Sonido general', 'Si lo apagas, AIDEN deja de hablar y se quita la musica.') +
        filaAjuste('voz', '🗣️ Voz de AIDEN', 'AIDEN te lee en voz alta todo lo que responde.') +
        filaAjuste('micro', '🎙️ Microfono siempre encendido', 'Te escucha todo el tiempo: no tienes que tocar ningun boton.') +
        filaAjuste('guia', '🧭 Que AIDEN me explique todo', 'Te va guiando paso a paso desde el menu y dentro del huerto.') +
        filaAjuste('efectos', '🎵 Musica y efectos', 'Sonidos de la introduccion y del juego.') +
        '<div class="aj-row col"><label class="aj-lab">🏃 Velocidad de la voz: <b id="aj-vel-val">0.95</b></label>' +
          '<input type="range" id="aj-vel" min="0.6" max="1.4" step="0.05" oninput="setVelocidadVoz(this.value)"></div>' +
        '<div class="aj-row col"><label class="aj-lab">🔉 Volumen: <b id="aj-vol-val">100%</b></label>' +
          '<input type="range" id="aj-vol" min="0.1" max="1" step="0.05" oninput="setVolumenVoz(this.value)"></div>' +
        '<div class="aj-row col"><label class="aj-lab">🎤 Voz que usa AIDEN</label>' +
          '<select id="aj-voz" class="aj-sel" onchange="setVoice(this.value)"><option value="">Voz automatica</option></select></div>' +
        '<div class="aj-row col"><label class="aj-lab">📡 Conexion de AIDEN con Gemini</label>' +
          '<div id="aj-conexion" class="aj-con">…</div>' +
          '<button class="aj-btn" onclick="gemProbar(true)">🔄 Probar la conexion ahora</button></div>' +
        '<div class="aj-row col"><button class="aj-btn" onclick="probarVoz()">▶ Escuchar como suena AIDEN</button></div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(d);
  d.addEventListener('click', function (e) { if (e.target === d) cerrarAjustes(); });
}
function abrirAjustes() {
  construirAjustes();
  const p = document.getElementById('ajustes-popup');
  if (p) p.style.display = 'flex';
  try { listarVoces(); } catch (e) {}
  copiarVocesAAjustes();
  pintarAjustes();
  pintarEstadoGemini();
  if (AJ.guia) vozDecir('Estos son los ajustes. Aqui puedes apagar mi voz, la musica o el microfono, y volver a encenderlos cuando quieras.', { urgente: true });
}
function cerrarAjustes() {
  const p = document.getElementById('ajustes-popup');
  if (p) p.style.display = 'none';
}
function alternarAjuste(clave) {
  AJ[clave] = !AJ[clave];
  if (clave === 'sonido') { if (!AJ.sonido) vozParar(); else AJ.voz = true; }
  if (clave === 'voz') { if (!AJ.voz) vozParar(); else AJ.sonido = true; }
  if (clave === 'micro') { if (AJ.micro) micArrancar(false); else micApagarDeVerdad(); }
  if (clave === 'efectos') {
    try {
      if (!AJ.efectos && introAudioEnabled) _toggleIntroAudio13();
      else if (AJ.efectos && !introAudioEnabled && gameState === 'intro') _toggleIntroAudio13();
    } catch (e) {}
  }
  ajGuardar(); sincronizarVoz(); pintarAjustes(); pintarMicV();
  if (clave === 'voz' && AJ.voz) vozDecir('Listo, ya vuelvo a hablarte.', { urgente: true, repetir: true });
}
function setVelocidadVoz(v) {
  AJ.velocidad = parseFloat(v); ajGuardar();
  const e = document.getElementById('aj-vel-val'); if (e) e.textContent = AJ.velocidad.toFixed(2);
}
function setVolumenVoz(v) {
  AJ.volumen = parseFloat(v); ajGuardar();
  const e = document.getElementById('aj-vol-val'); if (e) e.textContent = Math.round(AJ.volumen * 100) + '%';
}
function probarVoz() {
  AJ.sonido = true; AJ.voz = true; ajGuardar(); sincronizarVoz(); pintarAjustes();
  vozDecir('Hola, soy AIDEN. Asi voy a sonar mientras juegas.', { urgente: true, repetir: true });
}
function pintarAjustes() {
  ['sonido', 'voz', 'micro', 'guia', 'efectos'].forEach(function (k) {
    const b = document.getElementById('aj-sw-' + k);
    if (b) b.classList.toggle('on', !!AJ[k]);
  });
  const v = document.getElementById('aj-vel'); if (v) v.value = AJ.velocidad;
  const vv = document.getElementById('aj-vel-val'); if (vv) vv.textContent = Number(AJ.velocidad).toFixed(2);
  const o = document.getElementById('aj-vol'); if (o) o.value = AJ.volumen;
  const ov = document.getElementById('aj-vol-val'); if (ov) ov.textContent = Math.round(AJ.volumen * 100) + '%';
  const m = document.getElementById('ah-mute'); if (m) m.textContent = vozActiva() ? '🔊' : '🔇';
}
function copiarVocesAAjustes() {
  const sel = document.getElementById('aj-voz');
  if (!sel || !speechSynth) return;
  let voces = [];
  try { voces = vocesEspanol(); } catch (e) {}
  sel.innerHTML = '<option value="">Voz automatica</option>';
  voces.forEach(function (v) {
    const o = document.createElement('option');
    o.value = v.name; o.textContent = v.name + ' (' + v.lang + ')';
    sel.appendChild(o);
  });
  if (currentUser && currentUser.voz) sel.value = currentUser.voz;
}

// ------------------------------------------------------ GUIA HABLADA -------
const TOUR = { hechos: {} };

function tourMenu(forzar) {
  if (!AJ.guia) return;
  if (TOUR.hechos.menu && !forzar) {
    vozDecir('Estas en el menu. Dime "nivel uno" o "nivel dos" y entramos, o toca el boton que quieras.', { urgente: true, repetir: true });
    return;
  }
  TOUR.hechos.menu = true;
  const nombre = currentUser ? currentUser.name : '';
  [
    'Hola ' + nombre + '. Soy AIDEN, tu asistente. Ya te estoy escuchando: el microfono queda encendido todo el tiempo, asi que puedes hablarme sin tocar nada.',
    'Esto es el menu principal. Desde aqui eliges con que frutas quieres jugar.',
    'El boton verde es el nivel uno, con las diez frutas clasicas de El Salvador: jocote, mango, maranon, mamon, zapote, anona, papaya, coco, guayaba y nance.',
    'El boton morado es el nivel dos, con las diez frutas exoticas: guanabana, caimito, copinol, paterna, cincuya, tamarindo, arrayan, mamey, maracuya y pitaya.',
    'Cuando entres a un nivel te voy a pedir que elijas dos frutas. Esas son las que van a nacer en tus dos primeras macetas.',
    'Dentro del huerto mueves el dron con las teclas W, A, S y D. Con la tecla E haces lo que toque: llenar la cubeta, regar o comprar. Con B compras una maceta y con R compras la planta que va dentro.',
    'Te regalo cincuenta monedas al empezar. Ganas mas monedas cada vez que riegas, y muchas mas cuando salvas una planta que se estaba muriendo.',
    'En el boton del manual estan todos los controles y todas las ordenes que puede hacer el dron.',
    'En ajustes puedes bajarme el volumen, cambiar mi voz, apagar la musica o apagar el microfono si necesitas silencio.',
    'Cuando quieras empezar, dime: nivel uno, o nivel dos. Aqui te espero.'
  ].forEach(function (p) { vozDecir(p); });
}
function tourSiembra() {
  if (!AJ.guia || TOUR.hechos.siembra) return;
  TOUR.hechos.siembra = true;
  vozDecir('Elige dos frutas tocandolas. Estas dos van a nacer en tus dos primeras macetas. Cuando estes listo, toca comenzar.', { urgente: true });
}

// entrenador dentro del huerto: AIDEN te dice que hacer si te quedas parado
let coachUltimo = 0;
setInterval(function () {
  if (gameState !== 'game' || !AJ.guia || VOZ.hablando || aidenOcupado) return;
  if (Date.now() - coachUltimo < 45000) return;
  if (typeof farmGrid === 'undefined' || !farmGrid.length) return;
  let consejo = '';
  try {
    const criticas = granjaAPI().criticas();
    if (criticas.length && drone.bucket > 0) {
      const p = criticas[0];
      consejo = 'Tienes una planta en peligro en la casilla ' + p[0] + ', ' + p[1] + '. Ve hasta ahi y pulsa E para regarla.';
    } else if (drone.bucket <= 0) {
      consejo = 'Te quedaste sin agua. Regresa al deposito de la esquina y pulsa E para llenar la cubeta.';
    } else if (typeof contarMacetas === 'function' && coins >= ECONOMIA.precioMaceta && contarMacetas() < MAX_PARCELAS) {
      consejo = 'Tienes ' + coins + ' monedas. Ponte sobre un lugar con candado y pulsa B para comprar una maceta nueva.';
    } else {
      consejo = 'Todo va bien. Aprovecha para regar las plantas que llevan mas tiempo sin agua y asi ganar mas monedas.';
    }
  } catch (e) {}
  if (consejo) { coachUltimo = Date.now(); aidenSpeak(consejo); }
}, 15000);

// ------------------------------------------------- ENGANCHES CON EL JUEGO ---
const _skipIntro13 = skipIntro;
skipIntro = function () {
  _skipIntro13();
  pintarHud();
  setTimeout(function () { tourMenu(false); }, 600);
};
const _goToMenu13 = goToMenu;
goToMenu = function () {
  _goToMenu13();
  if (AJ.micro) micArrancar(true);
  pintarHud();
  setTimeout(function () { tourMenu(false); }, 400);
};
const _openSow13 = openSowScreen;
openSowScreen = function (level) {
  _openSow13(level);
  pintarHud();
  setTimeout(tourSiembra, 300);
};
const _startCin13 = startCinematicIntro;
startCinematicIntro = function () {
  _startCin13();
  desbloquearAudio();
  sincronizarVoz();
  try { if (AJ.sonido && AJ.efectos && !introAudioEnabled) _toggleIntroAudio13(); } catch (e) {}
  if (AJ.guia) {
    vozDecir('Bienvenido ' + (currentUser ? currentUser.name : '') + '. Soy AIDEN y voy a acompanarte todo el juego. Ya puedes hablarme: el microfono esta encendido.', { urgente: true, repetir: true });
  }
  pintarHud();
};
const _startGame13 = startGame;
startGame = function (level) {
  _startGame13(level);
  sincronizarVoz();
  if (AJ.micro) micArrancar(true);
  pintarHud(); pintarEstadoGemini(); pintarMicV();
};
const _toggleIntroAudio13 = toggleIntroAudio;
toggleIntroAudio = function () {
  _toggleIntroAudio13();
  AJ.efectos = !!introAudioEnabled;
  if (AJ.efectos) AJ.sonido = true;
  ajGuardar(); pintarAjustes();
};

function montarBotonAjustes() {
  const cont = document.querySelector('#main-menu .menu-content');
  if (!cont || document.getElementById('btn-ajustes-menu')) return;
  const ref = cont.querySelector('.btn-manual');
  const b = document.createElement('button');
  b.id = 'btn-ajustes-menu';
  b.className = 'menu-btn btn-ajustes';
  b.textContent = '⚙️ AJUSTES';
  b.onclick = function () { abrirAjustes(); };
  if (ref) cont.insertBefore(b, ref); else cont.appendChild(b);
}

// ------------------------------------------------------------- ARRANQUE ----
function arrancarV13() {
  crearHud();
  montarBotonAjustes();
  construirAjustes();
  sincronizarVoz();
  pintarAjustes();
  pintarHud();
  pintarEstadoGemini();
  setTimeout(function () { gemProbar(false); }, 1200);
  if (speechSynth) {
    speechSynth.onvoiceschanged = function () {
      try { listarVoces(); } catch (e) {}
      copiarVocesAAjustes();
    };
  }
  document.addEventListener('pointerdown', function saludo() {
    document.removeEventListener('pointerdown', saludo);
    setTimeout(function () {
      if (gameState === 'account' && AJ.guia) {
        vozDecir('Hola. Soy AIDEN. Escribe tu nombre y tu edad, elige un avatar y toca crear cuenta para empezar. Ya te estoy escuchando por el microfono.', { repetir: true });
      }
    }, 500);
  }, { passive: true });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancarV13);
else arrancarV13();


// ============================================================================
//  v14 · AIDEN MOVIBLE, SIN REPETIRSE, Y ESCUELA DE PROGRAMACION
//  1. El cuadro de AIDEN se arrastra a donde quieras (arranca arriba)
//  2. AIDEN dice cada cosa UNA sola vez (solo repite si se lo pides)
//  3. Si tu empiezas a hablar, AIDEN se calla al instante para escucharte
//  4. La introduccion va ANTES del nombre/edad/avatar y trae imagenes
//  5. Puedes crear tu propio avatar y cambiarlo luego en Ajustes
//  6. AIDEN te ensena a programar: te explica linea por linea y guarda historial
//  7. Con las monedas compras ayudas (fertilizante, riego automatico, ayudante)
// ============================================================================

const V14 = {
  dichas: new Set(),      // todo lo que AIDEN ya dijo: no lo vuelve a decir solo
  ultimoDicho: '',        // por si le pides "repite"
  hablando: false,
  introHecha: false,
  cuentaLista: false
};

// frases de relleno que ya no queremos escuchar NUNCA
const V14_RELLENO = [
  'Sigo escuchandote. Preguntame otra cosa cuando quieras.',
  'Sigo escuchándote. Pregúntame otra cosa cuando quieras.'
];
function v14SembrarRelleno() { V14_RELLENO.forEach(function (f) { V14.dichas.add(v14Clave(f)); }); }

function v14Clave(t) {
  return String(t || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140);
}
v14SembrarRelleno();

// Si TU pides que te lo explique otra vez, AIDEN vuelve a poder decirlo todo
function v14OlvidarDicho() { V14.dichas.clear(); v14SembrarRelleno(); }

// ------------------------------------------------- 2. NADA DE REPETIRSE ----
const _vozDecir13 = vozDecir;
vozDecir = function (texto, opts) {
  opts = opts || {};
  const limpio = vozLimpiarTexto(texto);
  if (!limpio) { if (opts.onend) opts.onend(); return; }
  // mientras el navegador no deje sonar, dejamos que se encole tal cual
  if (!AUDIO.listo) return _vozDecir13(texto, opts);
  const clave = v14Clave(limpio);
  // una respuesta directa a algo que TU preguntaste siempre se dice
  const esRespuesta = !!(opts.urgente && opts.repetir) || !!opts.forzar;
  if (!esRespuesta && V14.dichas.has(clave)) { if (opts.onend) opts.onend(); return; }
  V14.dichas.add(clave);
  V14.ultimoDicho = String(texto);
  opts.repetir = true;   // el filtro de 8 segundos de v13 ya no hace falta
  return _vozDecir13(texto, opts);
};

const _tourMenu14 = tourMenu;
tourMenu = function (forzar) {
  if (forzar) v14OlvidarDicho();     // "explicame otra vez" => puede repetirlo todo
  return _tourMenu14(forzar);
};

function repetirUltimo() {
  if (!V14.ultimoDicho) {
    vozDecir('Todavia no te he dicho nada que pueda repetir.', { urgente: true, forzar: true });
    return;
  }
  vozDecir(V14.ultimoDicho, { urgente: true, forzar: true });
  try { aidenBubble('🔁 ' + V14.ultimoDicho, 'ai'); } catch (e) {}
}

// ------------------------------- 3. SI TU HABLAS, AIDEN SE CALLA AL VUELO ---
// El microfono ya NO se apaga mientras AIDEN habla: se queda escuchando.
micSilenciar = function (v) {
  MICV.silenciado = false;
  V14.hablando = !!v;
  pintarMicV();
};

// Detecta si lo que entro por el microfono es el eco del propio AIDEN
function v14EsEco(frase) {
  const ref = v14Clave(VOZ.ultimo || '');
  if (!ref) return false;
  const palabras = v14Clave(frase).split(' ').filter(p => p.length > 3);
  if (!palabras.length) return false;
  let dentro = 0;
  palabras.forEach(p => { if (ref.indexOf(p) !== -1) dentro++; });
  return (dentro / palabras.length) >= 0.5;
}

let v14UltimoCorte = 0;
micResultado = function (ev) {
  let finales = '', parcial = '';
  for (let i = ev.resultIndex; i < ev.results.length; i++) {
    const t = ev.results[i][0].transcript;
    if (ev.results[i].isFinal) finales += t + ' '; else parcial += t + ' ';
  }
  const previa = normalizarVoz(finales + parcial);

  // ---- AIDEN esta hablando y tu abres la boca: se calla ----
  if (VOZ.hablando || speechSynth && speechSynth.speaking) {
    const palabras = previa ? previa.split(' ').filter(Boolean) : [];
    if (palabras.length >= 2 && !v14EsEco(previa) && Date.now() - v14UltimoCorte > 900) {
      v14UltimoCorte = Date.now();
      const pendiente = VOZ.ultimo;
      vozParar();
      V14.ultimoDicho = pendiente || V14.ultimoDicho;
      hudAiden('Te escucho…');
      try { showToast('🤫 Me callo, dime'); } catch (e) {}
    } else {
      return;   // era eco o ruido: lo ignoramos
    }
  }

  if (previa) {
    try { pintarMic('hot', '🎙️ <span class="mic-heard">' + previa + '</span>'); } catch (e) {}
    hudMic('hot', previa.slice(0, 44));
  }
  if (!finales.trim()) return;
  let dicho = normalizarVoz(finales);
  if (!dicho) return;
  const resto = detectarClave(dicho);
  if (resto !== null) dicho = resto;
  if (!dicho) { vozDecir('Te escucho. Dime que necesitas.', { urgente: true, forzar: true }); return; }
  if (dicho.length < 4) return;
  if (dicho === MICV.ultimaFrase && Date.now() - MICV.ultimaTs < 3000) return;
  MICV.ultimaFrase = dicho; MICV.ultimaTs = Date.now();
  if (comandoDeVoz(dicho)) return;
  askAidenTexto(dicho, true);
};

// "repite" / "otra vez" / "no te escuche"
const _comandoDeVoz13 = comandoDeVoz;
comandoDeVoz = function (txt) {
  const t = ' ' + txt + ' ';
  if (/ (repite|repitelo|repitemelo|otra vez|que dijiste|no te escuche|no te oi|volve a decir|vuelve a decir) /.test(t)) {
    repetirUltimo(); return true;
  }
  if (/ (mi avatar|cambiar avatar|crear avatar|mi personaje) /.test(t)) { abrirAvatar(); return true; }
  if (/ (explicame el codigo|explica mi codigo|escuela|historial|que aprendi) /.test(t)) { abrirEscuela('pasos'); return true; }
  return _comandoDeVoz13(txt);
};

// ------------------------------------------- 1. EL CUADRO DE AIDEN SE MUEVE -
const HUD_KEY = 'agrobot_hud_v14';
const HUD = { x: null, y: null, mini: false, preset: 'arriba' };
try {
  const g = JSON.parse(localStorage.getItem(HUD_KEY) || '{}');
  if (typeof g.x === 'number') HUD.x = g.x;
  if (typeof g.y === 'number') HUD.y = g.y;
  if (typeof g.mini === 'boolean') HUD.mini = g.mini;
  if (typeof g.preset === 'string') HUD.preset = g.preset;
} catch (e) {}
function hudGuardar() { try { localStorage.setItem(HUD_KEY, JSON.stringify(HUD)); } catch (e) {} }

function hudEl() { return document.getElementById('aiden-hud'); }

function hudColocar(x, y, guardar) {
  const el = hudEl(); if (!el) return;
  const w = el.offsetWidth || 320, h = el.offsetHeight || 60;
  const maxX = Math.max(4, window.innerWidth - w - 4);
  const maxY = Math.max(4, window.innerHeight - h - 4);
  const px = Math.min(Math.max(4, x), maxX);
  const py = Math.min(Math.max(4, y), maxY);
  el.style.left = px + 'px';
  el.style.top = py + 'px';
  el.style.right = 'auto';
  el.style.bottom = 'auto';
  HUD.x = px; HUD.y = py;
  if (guardar !== false) hudGuardar();
}

const HUD_PRESETS = ['arriba', 'derecha', 'abajo', 'izquierda'];
function hudPreset(donde) {
  const el = hudEl(); if (!el) return;
  el.classList.remove('mini');
  const w = el.offsetWidth || 320, h = el.offsetHeight || 60;
  if (HUD.mini) el.classList.add('mini');
  let x = 14, y = 14;
  if (donde === 'arriba') { x = (window.innerWidth - w) / 2; y = 14; }
  else if (donde === 'abajo') { x = (window.innerWidth - w) / 2; y = window.innerHeight - h - 14; }
  else if (donde === 'izquierda') { x = 14; y = (window.innerHeight - h) / 2; }
  else if (donde === 'derecha') { x = window.innerWidth - w - 14; y = (window.innerHeight - h) / 2; }
  HUD.preset = donde;
  hudColocar(x, y);
  const nombres = { arriba: '⬆️ arriba', abajo: '⬇️ abajo', izquierda: '⬅️ a la izquierda', derecha: '➡️ a la derecha' };
  try { showToast('🤖 AIDEN ' + (nombres[donde] || donde)); } catch (e) {}
}

function hudSiguientePosicion() {
  const i = HUD_PRESETS.indexOf(HUD.preset);
  hudPreset(HUD_PRESETS[(i + 1) % HUD_PRESETS.length]);
}

function hudArrastrable(el) {
  if (!el || el.dataset.mov === '1') return;
  el.dataset.mov = '1';
  let ax = 0, ay = 0, moviendo = false, partioEn = 0;
  el.addEventListener('pointerdown', function (e) {
    if (e.target.closest && e.target.closest('button')) return;
    moviendo = true; partioEn = Date.now();
    const r = el.getBoundingClientRect();
    ax = e.clientX - r.left; ay = e.clientY - r.top;
    el.classList.add('arrastrando');
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    e.preventDefault();
  });
  el.addEventListener('pointermove', function (e) {
    if (!moviendo) return;
    hudColocar(e.clientX - ax, e.clientY - ay, false);
  });
  function soltar(e) {
    if (!moviendo) return;
    moviendo = false;
    el.classList.remove('arrastrando');
    hudGuardar();
    try { el.releasePointerCapture(e.pointerId); } catch (err) {}
  }
  el.addEventListener('pointerup', soltar);
  el.addEventListener('pointercancel', soltar);
}

// Reconstruimos el cuadro de AIDEN con asa, botón de mover y de encoger
crearHud = function () {
  if (document.getElementById('aiden-hud')) return;
  const d = document.createElement('div');
  d.id = 'aiden-hud';
  d.innerHTML =
    '<div class="ah-grip" title="Arrastra para mover a AIDEN"></div>' +
    '<div class="ah-orb" id="ah-orb">🤖</div>' +
    '<div class="ah-mid">' +
      '<div class="ah-txt" id="ah-txt">AIDEN listo · arrástrame a donde quieras</div>' +
      '<div class="ah-mic"><span class="ah-dot hot" id="ah-dot"></span><span id="ah-mic-txt">Escuchando…</span></div>' +
    '</div>' +
    '<div class="ah-btns">' +
      '<button class="ah-b" id="ah-mover" title="Mover: arriba, derecha, abajo, izquierda">✥</button>' +
      '<button class="ah-b" id="ah-mute" title="Silenciar o volver a hablar">🔊</button>' +
      '<button class="ah-b" id="ah-cfg" title="Ajustes">⚙️</button>' +
      '<button class="ah-b" id="ah-mini" title="Encoger o agrandar">▁</button>' +
    '</div>';
  document.body.appendChild(d);

  const bMute = document.getElementById('ah-mute');
  const bCfg = document.getElementById('ah-cfg');
  const bOrb = document.getElementById('ah-orb');
  const bMov = document.getElementById('ah-mover');
  const bMin = document.getElementById('ah-mini');
  if (bMute) bMute.onclick = function () { toggleVoice(); pintarHud(); };
  if (bCfg) bCfg.onclick = function () { abrirAjustes(); };
  if (bMov) bMov.onclick = function () { hudSiguientePosicion(); };
  if (bMin) bMin.onclick = function () {
    HUD.mini = !HUD.mini; hudGuardar();
    d.classList.toggle('mini', HUD.mini);
    bMin.textContent = HUD.mini ? '▔' : '▁';
    hudColocar(HUD.x != null ? HUD.x : 14, HUD.y != null ? HUD.y : 14);
  };
  if (bOrb) bOrb.onclick = function () {
    vozParar();
    vozDecir('Te escucho. Dime que necesitas.', { urgente: true, forzar: true });
  };

  d.classList.toggle('mini', HUD.mini);
  if (bMin) bMin.textContent = HUD.mini ? '▔' : '▁';
  hudArrastrable(d);

  // Arranca ARRIBA la primera vez; si ya lo moviste, se queda donde lo dejaste
  requestAnimationFrame(function () {
    if (HUD.x == null || HUD.y == null) hudPreset('arriba');
    else hudColocar(HUD.x, HUD.y, false);
  });
};

// El cuadro se ve SIEMPRE (menu, intro, cuenta y dentro del huerto)
setInterval(function () {
  const el = hudEl(); if (!el) { crearHud(); return; }
  const ocultar = (gameState === 'bloqueado');
  el.classList.toggle('v14-oculto', ocultar);
  el.classList.toggle('v14-visible', !ocultar);
}, 500);
window.addEventListener('resize', function () {
  if (HUD.x != null) hudColocar(HUD.x, HUD.y, false);
});

// ============================================================================
//  5. CREA TU PROPIO AVATAR (y cámbialo cuando quieras desde Ajustes)
// ============================================================================
const AV_CARAS = ['🧑‍🌾','👩‍🌾','🧑‍🔬','👩‍🔬','👨‍💻','👩‍💻','🧑‍🚀','🦸','🦹','🤖','👽','🐱','🦊','🐼','🐸','🦉','🐢','🦁','🐨','🐵','🌻','🌱'];
const AV_ACC   = ['','🎩','🧢','👑','👓','🕶️','🎧','🌟','🍃','🔧','🎀','⚡','🌈','🔥','❄️','🍄'];
const AV_FONDOS = [
  'linear-gradient(135deg,#0f3460,#16537e)',
  'linear-gradient(135deg,#1b4332,#2d6a4f)',
  'linear-gradient(135deg,#3d1a5b,#6a2c8f)',
  'linear-gradient(135deg,#5c2b1a,#a8541f)',
  'linear-gradient(135deg,#1a1a2e,#4a4e69)',
  'linear-gradient(135deg,#7a1f3d,#c9184a)',
  'linear-gradient(135deg,#0b3d3b,#0f766e)',
  'linear-gradient(135deg,#3f3000,#a37f00)'
];
const AV_BORDES = ['#5ce1ff','#4ade80','#ffd83d','#ff8fb8','#b47ad0','#f39c3d','#2fd9b8','#ff8a8a'];

const AV = { borrador: { cara: '🧑‍🌾', acc: '', fondo: 0, borde: 0 } };

function avatarHTML(a) {
  if (!a) return '';
  const fondo = AV_FONDOS[a.fondo] || AV_FONDOS[0];
  const borde = AV_BORDES[a.borde] || AV_BORDES[0];
  return '<span class="av-comp" style="background:' + fondo + ';box-shadow:inset 0 0 0 3px ' + borde + '">' +
         '<span class="av-cara">' + (a.cara || '🧑‍🌾') + '</span>' +
         (a.acc ? '<span class="av-acc">' + a.acc + '</span>' : '') +
         '</span>';
}

// Ahora el avatar puede ser: tu foto, tu avatar creado, o un emoji suelto
pintarAvatarEn = function (id) {
  const el = document.getElementById(id);
  if (!el || !currentUser) return;
  if (currentUser.avatarPhoto) {
    el.innerHTML = '<img alt="Tu foto" src="' + currentUser.avatarPhoto + '">';
  } else if (currentUser.avatarCustom) {
    el.innerHTML = avatarHTML(currentUser.avatarCustom);
  } else {
    el.textContent = currentUser.avatar || '🧑‍🌾';
  }
};

function avPintarPreview() {
  const p = document.getElementById('av-prev');
  if (!p) return;
  if (pendingPhoto) p.innerHTML = '<img alt="Tu foto" src="' + pendingPhoto + '">';
  else p.innerHTML = avatarHTML(AV.borrador);
  document.querySelectorAll('#avatar-popup .av-op').forEach(function (o) {
    const g = o.dataset.grupo, v = o.dataset.valor;
    let on = false;
    if (g === 'cara') on = (AV.borrador.cara === v);
    else if (g === 'acc') on = (AV.borrador.acc === v);
    else if (g === 'fondo') on = (AV.borrador.fondo === parseInt(v));
    else if (g === 'borde') on = (AV.borrador.borde === parseInt(v));
    o.classList.toggle('on', on);
  });
  const q = document.getElementById('av-quitar');
  if (q) q.style.display = pendingPhoto ? 'block' : 'none';
}

function avOpciones(grupo, lista, render) {
  return lista.map(function (v, i) {
    const valor = (grupo === 'fondo' || grupo === 'borde') ? i : v;
    return '<div class="av-op' + (grupo === 'fondo' || grupo === 'borde' ? ' color' : '') +
      '" data-grupo="' + grupo + '" data-valor="' + valor + '" ' + render(v, i) + '</div>';
  }).join('');
}

function construirAvatarPopup() {
  if (document.getElementById('avatar-popup')) return;
  const d = document.createElement('div');
  d.id = 'avatar-popup';
  d.innerHTML =
    '<div class="av-box">' +
      '<div class="av-head"><span>🎨 CREA TU PROPIO AVATAR</span>' +
        '<button class="aj-close" onclick="cerrarAvatar()">✕</button></div>' +
      '<div class="av-body">' +
        '<div class="av-prev-row">' +
          '<div class="av-prev" id="av-prev"></div>' +
          '<div class="av-tip">Este eres <b>tú</b> dentro del juego.<br>' +
          'Elige la cara, el fondo, un accesorio y el color del borde.<br>' +
          'Puedes <b>cambiarlo cuando quieras</b> desde ⚙️ Ajustes.</div>' +
        '</div>' +
        '<div class="av-lab">1 · Tu cara</div>' +
        '<div class="av-fila">' + avOpciones('cara', AV_CARAS, function (v) { return '>' + v; }) + '</div>' +
        '<div class="av-lab">2 · Color de fondo</div>' +
        '<div class="av-fila">' + avOpciones('fondo', AV_FONDOS, function (v) { return 'style="background:' + v + '">'; }) + '</div>' +
        '<div class="av-lab">3 · Accesorio</div>' +
        '<div class="av-fila">' + avOpciones('acc', AV_ACC, function (v) { return '>' + (v || '🚫'); }) + '</div>' +
        '<div class="av-lab">4 · Color del borde</div>' +
        '<div class="av-fila">' + avOpciones('borde', AV_BORDES, function (v) { return 'style="background:' + v + '">'; }) + '</div>' +
        '<div class="av-acciones">' +
          '<button class="av-btn" onclick="avAleatorio()">🎲 Sorpréndeme</button>' +
          '<button class="av-btn" onclick="document.getElementById(\'photo-input\').click()">📷 Usar mi foto</button>' +
          '<button class="av-btn gris" id="av-quitar" onclick="avQuitarFoto()">Quitar foto</button>' +
          '<button class="av-btn ok" onclick="avGuardar()">✅ Guardar mi avatar</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(d);
  d.addEventListener('click', function (e) { if (e.target === d) cerrarAvatar(); });
  d.querySelectorAll('.av-op').forEach(function (o) {
    o.onclick = function () {
      const g = o.dataset.grupo, v = o.dataset.valor;
      if (g === 'cara') AV.borrador.cara = v;
      else if (g === 'acc') AV.borrador.acc = v;
      else if (g === 'fondo') AV.borrador.fondo = parseInt(v);
      else if (g === 'borde') AV.borrador.borde = parseInt(v);
      if (g === 'cara' || g === 'acc') pendingPhoto = null;
      avPintarPreview();
    };
  });
}

function abrirAvatar() {
  construirAvatarPopup();
  if (currentUser && currentUser.avatarCustom) {
    AV.borrador = JSON.parse(JSON.stringify(currentUser.avatarCustom));
  }
  if (currentUser && currentUser.avatarPhoto) pendingPhoto = currentUser.avatarPhoto;
  document.getElementById('avatar-popup').style.display = 'flex';
  avPintarPreview();
  vozDecir('Aqui armas tu avatar. Elige la cara, el fondo, un accesorio y el color del borde. Cuando te guste, toca guardar.', { urgente: true });
}
function cerrarAvatar() {
  const p = document.getElementById('avatar-popup');
  if (p) p.style.display = 'none';
}
function avAleatorio() {
  pendingPhoto = null;
  AV.borrador = {
    cara: AV_CARAS[Math.floor(Math.random() * AV_CARAS.length)],
    acc: AV_ACC[Math.floor(Math.random() * AV_ACC.length)],
    fondo: Math.floor(Math.random() * AV_FONDOS.length),
    borde: Math.floor(Math.random() * AV_BORDES.length)
  };
  avPintarPreview();
}
function avQuitarFoto() {
  pendingPhoto = null;
  if (currentUser) { currentUser.avatarPhoto = null; saveUserData(currentUser); renderAvatars(); }
  pintarPreviewFoto(null);
  avPintarPreview();
}
function avGuardar() {
  if (currentUser) {
    currentUser.avatarCustom = JSON.parse(JSON.stringify(AV.borrador));
    currentUser.avatar = AV.borrador.cara;
    currentUser.avatarPhoto = pendingPhoto || null;
    saveUserData(currentUser);
    renderAvatars();
  }
  avPintarAtajo();
  cerrarAvatar();
  showToast('🎨 Avatar guardado');
  vozDecir('Listo, ese es tu avatar. Lo puedes cambiar cuando quieras desde Ajustes.', { urgente: true });
}

// Botón grande en la pantalla de la cuenta + miniatura de lo que llevas hecho
function avPintarAtajo() {
  const mini = document.getElementById('av-atajo-prev');
  if (mini) mini.innerHTML = pendingPhoto
    ? '<img alt="Tu foto" src="' + pendingPhoto + '">'
    : avatarHTML(AV.borrador);
}
function montarAtajoAvatar() {
  const picker = document.getElementById('avatar-picker');
  if (!picker || document.getElementById('av-atajo')) return;
  const caja = document.createElement('div');
  caja.id = 'av-atajo';
  caja.style.cssText = 'display:flex;align-items:center;gap:12px;margin-top:10px;';
  caja.innerHTML =
    '<div class="avatar-photo-prev has-photo" id="av-atajo-prev" style="font-size:1.6rem"></div>' +
    '<div style="flex:1;min-width:0">' +
      '<button class="mini-btn" type="button" onclick="abrirAvatar()">🎨 Crear mi avatar</button>' +
      '<div class="field-hint">Arma tu personaje a tu gusto: cara, fondo, accesorio y color. ' +
      'Después lo cambias desde ⚙️ Ajustes.</div>' +
    '</div>';
  picker.parentNode.insertBefore(caja, picker.nextSibling);
  // los emojis de siempre también alimentan el creador
  document.querySelectorAll('.avatar-opt').forEach(function (o) {
    o.addEventListener('click', function () {
      AV.borrador.cara = o.dataset.avatar;
      pendingPhoto = null;
      avPintarAtajo(); avPintarPreview();
    });
  });
  avPintarAtajo();
}

// La foto subida también actualiza el creador
const _handlePhoto14 = handlePhotoUpload;
handlePhotoUpload = function (ev) {
  _handlePhoto14(ev);
  setTimeout(function () { avPintarPreview(); avPintarAtajo(); }, 700);
};

// ============================================================================
//  4. LA INTRODUCCIÓN VA ANTES DE PEDIRTE NOMBRE, EDAD Y AVATAR
// ============================================================================
function mostrarPantallaCuenta() {
  ['intro'].forEach(function (id) {
    const e = document.getElementById(id); if (e) e.classList.remove('active');
  });
  const menu = document.getElementById('main-menu'); if (menu) menu.style.display = 'none';
  const acc = document.getElementById('account-screen'); if (acc) acc.style.display = 'flex';
  gameState = 'account';
  V14.cuentaLista = true;
  montarAtajoAvatar();
  try { previewAgeMode(); } catch (e) {}
  vozDecir('Ya viste de que trata el juego. Ahora escribe tu nombre, tu edad, y arma tu avatar como mas te guste. Luego toca crear cuenta.', { urgente: true });
}

function entrarAlMenu() {
  const acc = document.getElementById('account-screen'); if (acc) acc.style.display = 'none';
  const intro = document.getElementById('intro'); if (intro) intro.classList.remove('active');
  const menu = document.getElementById('main-menu'); if (menu) menu.style.display = 'block';
  gameState = 'menu';
  updateMenuUser();
  cancelAnimationFrame(menuAnimFrame);
  initMenuCanvas();
  if (AJ.micro) micArrancar(true);
  pintarHud();
  setTimeout(function () { tourMenu(false); }, 500);
}

// Al terminar (o saltar) la intro: si no hay cuenta, se pide; si ya hay, al menú
skipIntro = function () {
  cancelAnimationFrame(introAnimFrame);
  try { stopIntroAudio(); } catch (e) {}
  const intro = document.getElementById('intro');
  if (intro) intro.classList.remove('active');
  if (!currentUser) mostrarPantallaCuenta();
  else entrarAlMenu();
  pintarHud();
};

createAccount = function () {
  const name = (document.getElementById('acc-name').value || '').trim();
  const age = parseInt(document.getElementById('acc-age').value);
  if (!name || name.length < 2) { showToast('⚠️ Ingresa un nombre válido', true); return; }
  if (!age || age < 5 || age > 99) { showToast('⚠️ Ingresa una edad válida (5-99)', true); return; }
  if (!edadPermitida(age)) { mostrarBloqueoEdad(age); return; }
  const sel = document.querySelector('.avatar-opt.selected');
  if (sel && !AV.borrador.cara) AV.borrador.cara = sel.dataset.avatar;
  currentUser = {
    name: name, age: age,
    avatar: AV.borrador.cara || (sel ? sel.dataset.avatar : '🧑‍🌾'),
    avatarCustom: JSON.parse(JSON.stringify(AV.borrador)),
    avatarPhoto: pendingPhoto || null,
    created: Date.now(), level: 1, totalScore: 0, totalWatered: 0, totalRescues: 0,
    totalLines: 0, gamesPlayed: 0, bestScore: 0, lastPlayed: null,
    coins: 0, bonoRecibido: false, voz: ''
  };
  saveUserData(currentUser);
  renderAvatars();
  showToast('✅ ¡Cuenta creada! Bienvenido ' + name);
  vozDecir('Bienvenido ' + name + '. Ya tienes tu cuenta y tu avatar. Vamos al menu.', { urgente: true, forzar: true });
  setTimeout(entrarAlMenu, 700);
};

loadAccount = function () {
  const data = getUserData();
  if (!data) { showToast('⚠️ No hay cuenta guardada.', true); return; }
  if (!edadPermitida(data.age)) { mostrarBloqueoEdad(data.age); return; }
  currentUser = normalizarUsuario(data);
  if (!currentUser.avatarCustom) currentUser.avatarCustom = JSON.parse(JSON.stringify(AV.borrador));
  if (pendingPhoto) currentUser.avatarPhoto = pendingPhoto;
  saveUserData(currentUser);
  renderAvatars();
  showToast('✅ ¡Bienvenido de vuelta, ' + data.name + '!');
  setTimeout(entrarAlMenu, 600);
};

// ============================================================================
//  6. INTRODUCCIÓN NUEVA: con imágenes reales de las frutas y del juego
// ============================================================================
function escenaNueva(id, html) {
  const intro = document.getElementById('intro');
  if (!intro || document.getElementById(id)) return;
  const d = document.createElement('div');
  d.className = 'cinematic-layer';
  d.id = id;
  d.innerHTML = '<div class="cin-scene cin-wide">' + html + '</div>';
  const prog = document.getElementById('cin-progress');
  intro.insertBefore(d, prog || null);
}

function construirEscenasV14() {
  // --- El huerto: qué vas a hacer ---
  escenaNueva('cin-scene-6',
    '<div class="cin-titulo">TU HUERTO Y TU DRON</div>' +
    '<div class="cin-sub">20 macetas · 20 frutas salvadoreñas · ninguna se repite</div>' +
    '<div class="cin-huerto">' +
      '<div class="cin-maceta">🥭</div><div class="cin-maceta">🥥</div>' +
      '<div class="cin-maceta">🍈</div><div class="cin-maceta cerrada">🔒</div>' +
      '<div class="cin-maceta cerrada">🔒</div>' +
      '<div class="cin-maceta">💧</div><div class="cin-maceta">🐉</div>' +
      '<div class="cin-maceta cerrada">🔒</div><div class="cin-maceta cerrada">🔒</div>' +
      '<div class="cin-maceta cerrada">🔒</div>' +
    '</div>' +
    '<div class="cin-dron">🛸</div>' +
    '<div class="cin-cards">' +
      '<div class="cin-card"><span class="ico">🕹️</span><div class="tit">Con las teclas</div>' +
        '<div class="txt">W A S D para volar, E para regar, B maceta, R planta.</div></div>' +
      '<div class="cin-card"><span class="ico">💻</span><div class="tit">O programando</div>' +
        '<div class="txt">Escribes Python y el dron hace solo todo el trabajo.</div></div>' +
      '<div class="cin-card"><span class="ico">🔒</span><div class="tit">Vas creciendo</div>' +
        '<div class="txt">Empiezas con 2 macetas: las otras 18 las compras.</div></div>' +
    '</div>');

  // --- Galería de frutas con fotos reales ---
  escenaNueva('cin-scene-7',
    '<div class="cin-titulo">LAS FRUTAS DE EL SALVADOR</div>' +
    '<div class="cin-sub">Cada una tiene su historia, su ciencia y su temporada</div>' +
    '<div class="cin-galeria" id="cin-galeria"></div>');

  // --- Programación explicada ---
  escenaNueva('cin-scene-8',
    '<div class="cin-titulo">APRENDES PYTHON DE VERDAD</div>' +
    '<div class="cin-sub">AIDEN te explica cada línea mientras la escribes</div>' +
    '<div class="cin-mock">' +
      '<div class="cin-editor">' +
        '<span class="cm"># mi programa</span><br>' +
        '<span class="fn">drone</span>.<span class="fn">ir_a</span>(<span class="nu">0</span>, <span class="nu">0</span>)<br>' +
        '<span class="fn">drone</span>.<span class="fn">recoger_cubeta</span>()<br>' +
        '<span class="kw">for</span> x, y <span class="kw">in</span> <span class="fn">granja</span>.<span class="fn">criticas</span>():<br>' +
        '&nbsp;&nbsp;&nbsp;&nbsp;<span class="fn">drone</span>.<span class="fn">ir_a</span>(x, y)<br>' +
        '&nbsp;&nbsp;&nbsp;&nbsp;<span class="fn">drone</span>.<span class="fn">regar</span>()<br>' +
      '</div>' +
      '<div class="cin-explica">' +
        '<div class="fila"><b>ir_a(0, 0)</b> — mandas el dron a una casilla. Los números entre paréntesis son los datos que necesita.</div>' +
        '<div class="fila"><b>for … in …</b> — un <b>bucle</b>: repite lo mismo para cada planta. En tu día: “para cada maceta del corredor, ponle agua”.</div>' +
        '<div class="fila"><b>granja.criticas()</b> — le preguntas al huerto cuáles están en peligro y te devuelve una <b>lista</b>.</div>' +
        '<div class="fila">🧠 AIDEN te guarda un <b>historial</b> de todo lo que programas.</div>' +
      '</div>' +
    '</div>');

  // --- Monedas y ayudas ---
  escenaNueva('cin-scene-9',
    '<div class="cin-titulo">MONEDAS, TIENDA Y AYUDANTES</div>' +
    '<div class="cin-sub">Ganas monedas regando y salvando plantas · el huerto no depende solo de ti</div>' +
    '<div class="cin-cards">' +
      '<div class="cin-card"><span class="ico">🪴</span><div class="tit">Maceta · 15 🪙</div>' +
        '<div class="txt">Abre un lugar nuevo del huerto.</div></div>' +
      '<div class="cin-card"><span class="ico">🌱</span><div class="tit">Planta · 10 🪙</div>' +
        '<div class="txt">Eliges qué fruta va dentro.</div></div>' +
      '<div class="cin-card"><span class="ico">🌿</span><div class="tit">Fertilizante · 8 🪙</div>' +
        '<div class="txt">+1 de salud a todo el huerto de golpe.</div></div>' +
      '<div class="cin-card"><span class="ico">💦</span><div class="tit">Riego automático</div>' +
        '<div class="txt">Riega solo las plantas que se están secando.</div></div>' +
      '<div class="cin-card"><span class="ico">🤖</span><div class="tit">Dron ayudante</div>' +
        '<div class="txt">Trabaja contigo mientras tú programas.</div></div>' +
    '</div>');

  // --- El mundo destruido ---
  escenaNueva('cin-scene-10',
    '<div class="cin-titulo">Y AFUERA… UN MUNDO POR RECUPERAR</div>' +
    '<div class="cin-sub">Explora, busca agua, ayuda a la gente y decide cómo termina la historia</div>' +
    '<div class="cin-cards">' +
      '<div class="cin-card"><span class="ico">🏚️</span><div class="tit">Ciudad abandonada</div>' +
        '<div class="txt">Chatarra, piezas y pistas de agua.</div></div>' +
      '<div class="cin-card"><span class="ico">🏜️</span><div class="tit">Desierto de sal</div>' +
        '<div class="txt">Peligroso, pero paga bien.</div></div>' +
      '<div class="cin-card"><span class="ico">🤝</span><div class="tit">Comunidades</div>' +
        '<div class="txt">Cada una necesita algo distinto.</div></div>' +
      '<div class="cin-card"><span class="ico">👾</span><div class="tit">Drones piratas</div>' +
        '<div class="txt">Te roban si te descuidas.</div></div>' +
      '<div class="cin-card"><span class="ico">🌱</span><div class="tit">4 finales</div>' +
        '<div class="txt">Ecológico, tecnológico, perfecto… o fracaso.</div></div>' +
    '</div>');
}

function pintarGaleriaIntro() {
  const g = document.getElementById('cin-galeria');
  if (!g || g.children.length) return;
  const lista = ['jocote','mango','maranon','zapote','anona','coco','guayaba','nance',
                 'guanabana','caimito','tamarindo','maracuya','pitaya','mamey'];
  lista.forEach(function (f) {
    const c = document.createElement('div');
    c.className = 'cin-fruta';
    c.innerHTML = '<div class="foto-fruta"><span class="foto-emoji">' + (PLANT_EMOJI[f] || '🍎') + '</span></div>' +
                  '<div class="nom">' + (PLANT_NAMES[f] || f) + '</div>';
    g.appendChild(c);
    try { pintarFotoFruta(c.querySelector('.foto-fruta'), f); } catch (e) {}
  });
}

// Escena 4 de siempre, con el texto puesto al día
function actualizarEscena4() {
  const s = document.getElementById('cin-scene-4');
  if (!s) return;
  const t = s.querySelector('.cin-text');
  if (t) t.innerHTML =
    '🌱 Tú eliges qué sembrar: <span class="highlight">20 frutas salvadoreñas</span>, sin repetir<br>' +
    '💻 Eres el <span class="highlight">programador</span> del dron: Python de verdad, explicado paso a paso<br>' +
    '🪙 Ganas <span class="highlight">monedas</span> por cada planta que salves<br>' +
    '🌿 Y las gastas en <span class="highlight">fertilizante, riego automático y ayudantes</span><br>' +
    '🎙️ AIDEN te escucha siempre: háblale sin tocar nada';
}

// Orden nuevo de la película
function ordenarEscenasV14() {
  SCENE_TIMINGS.length = 0;
  SCENE_TIMINGS.push(
    { id: 'cin-scene-1',  duration: 3000 },   // logo
    { id: 'cin-scene-3',  duration: 3600 },   // el planeta
    { id: 'cin-scene-6',  duration: 4200 },   // el huerto y el dron
    { id: 'cin-scene-7',  duration: 4200 },   // fotos de las frutas
    { id: 'cin-scene-8',  duration: 4600 },   // programación
    { id: 'cin-scene-9',  duration: 4200 },   // monedas y ayudantes
    { id: 'cin-scene-10', duration: 4000 },   // mundo destruido
    { id: 'cin-scene-4',  duration: 4200 },   // resumen
    { id: 'cin-scene-5',  duration: 3600 }    // cuenta atrás
  );
}

// El bucle de la intro, ahora con cualquier número de escenas
runCinematicLoop = function () {
  if (gameState !== 'intro') return;
  const elapsed = performance.now() - introStartTime;
  const total = SCENE_TIMINGS.reduce(function (a, b) { return a + b.duration; }, 0);
  let accum = 0, target = SCENE_TIMINGS.length - 1;
  for (let i = 0; i < SCENE_TIMINGS.length; i++) {
    if (elapsed >= accum && elapsed < accum + SCENE_TIMINGS[i].duration) { target = i; break; }
    accum += SCENE_TIMINGS[i].duration;
  }
  if (target !== currentScene) { currentScene = target; showScene(currentScene); }
  const ultimo = SCENE_TIMINGS.length - 1;
  if (currentScene === ultimo) {
    const inicio = SCENE_TIMINGS.slice(0, ultimo).reduce(function (a, b) { return a + b.duration; }, 0);
    const se = elapsed - inicio;
    const c = document.getElementById('intro-counter');
    if (c) c.textContent = Math.max(0, Math.ceil((SCENE_TIMINGS[ultimo].duration - se) / 1000));
    const f = document.getElementById('loading-fill');
    if (f) f.style.width = Math.min(100, (se / SCENE_TIMINGS[ultimo].duration) * 100) + '%';
  }
  if (elapsed >= total) { skipIntro(); return; }
  try { drawStars(); drawParticles(); } catch (e) {}
  if (currentScene === 1) { introAngle += 0.008; try { drawGlobe(introAngle); } catch (e) {} }
  introAnimFrame = requestAnimationFrame(runCinematicLoop);
};

const NARRA_INTRO = [
  'Hola, soy AIDEN. Antes de pedirte tus datos te enseno de que trata esto.',
  'Eres el ultimo agricultor inteligente de El Salvador y manejas un dron que riega veinte frutas distintas.',
  'Puedes jugar con las teclas, o programar al dron en Python. Yo te explico cada linea que escribas.',
  'Con las monedas compras macetas, plantas, fertilizante, riego automatico y hasta un dron ayudante, para que el huerto no dependa solo de ti.',
  'Afuera hay un mundo por recuperar: ciudades vacias, comunidades que necesitan ayuda y cuatro finales distintos.',
  'Cuando termine esto te voy a pedir tu nombre, tu edad y vas a armar tu avatar como quieras.'
];

startCinematicIntro = function () {
  if (currentUser && !edadPermitida(currentUser.age)) { mostrarBloqueoEdad(currentUser.age); return; }
  const acc = document.getElementById('account-screen'); if (acc) acc.style.display = 'none';
  const menu = document.getElementById('main-menu'); if (menu) menu.style.display = 'none';
  document.getElementById('intro').classList.add('active');
  gameState = 'intro';
  construirEscenasV14();
  actualizarEscena4();
  ordenarEscenasV14();
  pintarGaleriaIntro();
  try { initStars(); initGlobe(); initParticles(); } catch (e) {}
  currentScene = -1;
  introStartTime = performance.now();
  showScene(0);
  runCinematicLoop();
  sincronizarVoz();
  try { if (AJ.sonido && AJ.efectos && !introAudioEnabled) _toggleIntroAudio13(); } catch (e) {}
  if (AJ.guia) NARRA_INTRO.forEach(function (p) { vozDecir(p); });
  pintarHud();
};

// ============================================================================
//  7. AIDEN TE ENSEÑA A PROGRAMAR: qué es cada línea, para qué te sirve
//     en tu día a día, y un historial de todo lo que has programado
// ============================================================================
const LECCIONES = {
  funcion: {
    titulo: 'Llamar a una función',
    py: 'objeto.funcion(datos)',
    que: 'Una función es una orden que ya está hecha. Escribes su nombre, y entre paréntesis le pasas los datos que necesita para trabajar.',
    vida: 'En tu casa es como el botón de la licuadora: no te importa cómo funciona por dentro, tú solo la enciendes. Si mañana quieres regar una planta con un sistema real, escribirías regar(minutos=5) y listo.'
  },
  bucle: {
    titulo: 'El bucle for',
    py: 'for cosa in lista:',
    que: 'Un bucle repite las mismas órdenes para cada elemento de una lista. Lo que va debajo, con 4 espacios, es lo que se repite.',
    vida: 'Es exactamente lo que haces cuando riegas: "para cada maceta del corredor, echarle agua". En vez de escribir la orden 20 veces, la escribes 1 vez y Python la repite 20.'
  },
  mientras: {
    titulo: 'El bucle while',
    py: 'while condicion:',
    que: 'Repite algo mientras se siga cumpliendo una condición. Cuando deja de cumplirse, se detiene.',
    vida: 'Mientras quede agua en la cubeta, seguir regando. Igual que cuando llenas un balde: sigues hasta que se llena.'
  },
  condicion: {
    titulo: 'La condición if',
    py: 'if algo < 2:',
    que: 'Decide. Si la condición es verdadera hace una cosa; si no, la salta (o hace lo del else).',
    vida: 'Es meter el dedo en la tierra antes de regar: SI está seca, riego; si no, ahorro el agua. Así no desperdicias.'
  },
  variable: {
    titulo: 'Guardar en una variable',
    py: 'nombre = valor',
    que: 'Una variable es una cajita con nombre donde guardas un dato para usarlo después.',
    vida: 'Es como apuntar en un papel "litros_por_planta = 2". Lo escribes una vez y lo usas todas las veces que quieras; si cambias de idea, lo cambias en un solo lugar.'
  },
  lista: {
    titulo: 'Las listas',
    py: 'granja.criticas()',
    que: 'Una lista es un montón de datos ordenados en fila. Aquí cada elemento es una casilla (x, y).',
    vida: 'Es tu lista del mandado o tu lista de plantas por regar. La recorres de arriba abajo y vas tachando.'
  },
  imprimir: {
    titulo: 'print()',
    py: 'print("hola")',
    que: 'Hace que el programa escriba algo en la consola. Sirve para ver qué está pasando por dentro.',
    vida: 'Es hablar en voz alta mientras trabajas: "voy por la tercera maceta". Cuando algo falla, print te dice dónde te quedaste.'
  },
  comentario: {
    titulo: 'Comentarios con #',
    py: '# esto es una nota',
    que: 'Todo lo que va después de # no lo ejecuta la computadora: es una nota para ti o para quien lea tu código.',
    vida: 'Como la etiqueta que le pones a un frasco. En un mes ya no te acuerdas para qué era, y la nota te lo recuerda.'
  }
};

function analizarLinea(cruda) {
  const l = String(cruda || '');
  const t = l.trim();
  if (!t) return null;
  if (t.startsWith('#')) return { linea: l, concepto: 'comentario', texto: 'Es una nota tuya. La computadora la salta.' };

  let m;
  if ((m = t.match(/^for\s+([\w,\s]+)\s+in\s+(.+):$/)))
    return { linea: l, concepto: 'bucle', texto: 'Bucle: repite las órdenes de abajo una vez por cada elemento de ' + m[2].trim() + '. En cada vuelta, ' + m[1].trim() + ' toma un valor distinto.' };
  if ((m = t.match(/^while\s+(.+):$/)))
    return { linea: l, concepto: 'mientras', texto: 'Repite lo de abajo mientras se cumpla que ' + m[1].trim() + '.' };
  if ((m = t.match(/^if\s+(.+):$/)))
    return { linea: l, concepto: 'condicion', texto: 'Solo hace lo de abajo si se cumple que ' + m[1].trim() + '.' };
  if (/^elif\s+/.test(t)) return { linea: l, concepto: 'condicion', texto: 'Si lo anterior no se cumplió, prueba con esta otra condición.' };
  if (/^else\s*:$/.test(t)) return { linea: l, concepto: 'condicion', texto: 'Si nada de lo anterior se cumplió, hace esto.' };
  if ((m = t.match(/^print\s*\((.*)\)$/)))
    return { linea: l, concepto: 'imprimir', texto: 'Escribe en la consola: ' + (m[1] || '(vacío)') + '. Sirve para ver qué está pasando.' };

  if ((m = t.match(/^drone\.ir_a\s*\(\s*([^,]+),\s*([^)]+)\)/)))
    return { linea: l, concepto: 'funcion', texto: 'El dron vuela hasta la casilla (' + m[1].trim() + ', ' + m[2].trim() + '). Los dos números son la columna y la fila.' };
  if (/^drone\.recoger_cubeta\s*\(/.test(t))
    return { linea: l, concepto: 'funcion', texto: 'Llena la cubeta de agua. Solo funciona si el dron está en el depósito (0,0).' };
  if (/^drone\.regar\s*\(/.test(t))
    return { linea: l, concepto: 'funcion', texto: 'Riega la planta de la casilla donde está el dron: le sube la salud y gasta 1 de agua.' };
  if ((m = t.match(/^drone\.(arriba|abajo|izquierda|derecha)\s*\(\s*(\d*)\s*\)/)))
    return { linea: l, concepto: 'funcion', texto: 'Mueve el dron ' + m[1] + ' ' + (m[2] || '1') + ' casilla(s) desde donde está ahora.' };
  if (/^drone\.comprar_maceta\s*\(/.test(t))
    return { linea: l, concepto: 'funcion', texto: 'Compra la maceta del lugar donde está el dron. Cuesta ' + ECONOMIA.precioMaceta + ' monedas.' };
  if ((m = t.match(/^drone\.sembrar\s*\(\s*["']([^"']*)["']\s*\)/)))
    return { linea: l, concepto: 'funcion', texto: 'Siembra ' + (PLANT_NAMES[m[1]] || m[1]) + ' en la maceta vacía donde está el dron. Cuesta ' + ECONOMIA.precioPlanta + ' monedas.' };

  if (/granja\.criticas\s*\(/.test(t))
    return { linea: l, concepto: 'lista', texto: 'Le preguntas al huerto qué plantas están en peligro. Te devuelve una lista de casillas.' };
  if ((m = t.match(/granja\.salud\s*\(\s*([^,]+),\s*([^)]+)\)/)))
    return { linea: l, concepto: 'funcion', texto: 'Pregunta la salud (de 0 a 5) de la casilla (' + m[1].trim() + ', ' + m[2].trim() + ').' };
  if (/granja\.nivel_cubeta\s*\(/.test(t))
    return { linea: l, concepto: 'funcion', texto: 'Pregunta cuánta agua le queda al dron.' };
  if (/granja\.(vacias|bloqueadas|disponibles)\s*\(/.test(t))
    return { linea: l, concepto: 'lista', texto: 'Te devuelve una lista con esos lugares o frutas.' };
  if (/granja\.(monedas|macetas)\s*\(/.test(t))
    return { linea: l, concepto: 'funcion', texto: 'Pregunta ese dato al huerto y te devuelve un número.' };

  if ((m = t.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/)))
    return { linea: l, concepto: 'variable', texto: 'Guardas en la cajita "' + m[1] + '" el valor de ' + m[2].trim() + ' para usarlo después.' };

  return { linea: l, concepto: 'funcion', texto: 'Esta línea llama a una orden del juego. Si no funciona, revísala en el manual 📘.' };
}

function analizarCodigo(code) {
  return String(code || '').split('\n').map(function (l, i) {
    const a = analizarLinea(l);
    if (!a) return null;
    a.n = i + 1;
    return a;
  }).filter(Boolean);
}

// ------------------------------------------------- HISTORIAL DE PROGRAMAS ---
const CODE_KEY = 'agrobot_codigo_v14';
const CODE_MAX = 25;
let codeHist = [];
try { codeHist = JSON.parse(localStorage.getItem(CODE_KEY) || '[]'); } catch (e) { codeHist = []; }
function guardarCodeHist() { try { localStorage.setItem(CODE_KEY, JSON.stringify(codeHist.slice(-CODE_MAX))); } catch (e) {} }
function apuntarPrograma(code, ok) {
  const limpio = String(code || '').trim();
  if (!limpio) return;
  const ultimo = codeHist[codeHist.length - 1];
  if (ultimo && ultimo.c === limpio) { ultimo.ts = Date.now(); ultimo.veces = (ultimo.veces || 1) + 1; }
  else codeHist.push({ c: limpio, ts: Date.now(), n: limpio.split('\n').length, ok: !!ok, veces: 1 });
  if (codeHist.length > CODE_MAX) codeHist = codeHist.slice(-CODE_MAX);
  guardarCodeHist();
}
function fechaCorta(ts) {
  const d = new Date(ts || Date.now());
  return d.getDate() + '/' + (d.getMonth() + 1) + ' · ' +
    d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}

// ------------------------------------------------- LA VENTANA DE LA ESCUELA -
const ESC = { pasos: [], i: 0, tab: 'pasos' };

function construirEscuela() {
  if (document.getElementById('escuela-popup')) return;
  const d = document.createElement('div');
  d.id = 'escuela-popup';
  d.innerHTML =
    '<div class="es-box">' +
      '<div class="es-head"><span>🧠 ESCUELA DE CÓDIGO · AIDEN</span>' +
        '<button class="aj-close" onclick="cerrarEscuela()">✕</button></div>' +
      '<div class="es-tabs">' +
        '<div class="es-tab on" data-t="pasos" onclick="escuelaTab(\'pasos\')">Paso a paso</div>' +
        '<div class="es-tab" data-t="lecciones" onclick="escuelaTab(\'lecciones\')">Lo que aprendes</div>' +
        '<div class="es-tab" data-t="historial" onclick="escuelaTab(\'historial\')">Historial</div>' +
      '</div>' +
      '<div class="es-body" id="es-body"></div>' +
    '</div>';
  document.body.appendChild(d);
  d.addEventListener('click', function (e) { if (e.target === d) cerrarEscuela(); });
}

function abrirEscuela(tab) {
  construirEscuela();
  const code = (document.getElementById('python-editor') || {}).value || '';
  ESC.pasos = analizarCodigo(code);
  ESC.i = 0;
  document.getElementById('escuela-popup').style.display = 'flex';
  escuelaTab(tab || 'pasos');
}
function cerrarEscuela() {
  const p = document.getElementById('escuela-popup');
  if (p) p.style.display = 'none';
}
function escuelaTab(t) {
  ESC.tab = t;
  document.querySelectorAll('#escuela-popup .es-tab').forEach(function (e) {
    e.classList.toggle('on', e.dataset.t === t);
  });
  if (t === 'pasos') pintarPasos();
  else if (t === 'lecciones') pintarLecciones();
  else pintarHistorialCodigo();
}

function pintarPasos(hablar) {
  const b = document.getElementById('es-body');
  if (!b) return;
  if (!ESC.pasos.length) {
    b.innerHTML = '<div class="es-vacio">Todavía no has escrito nada en el editor.<br>' +
      'Escribe una orden, por ejemplo <b>drone.ir_a(0, 0)</b>, y vuelve aquí:<br>' +
      'te voy explicando línea por línea qué hace y para qué te sirve en la vida real.</div>';
    return;
  }
  const p = ESC.pasos[ESC.i];
  const lec = LECCIONES[p.concepto] || LECCIONES.funcion;
  b.innerHTML =
    '<div class="es-paso">' +
      '<div class="es-num">Paso ' + (ESC.i + 1) + ' de ' + ESC.pasos.length + ' · línea ' + p.n + ' · esto es ' + lec.titulo + '</div>' +
      '<div class="es-code">' + p.linea.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</div>' +
      '<div class="es-que">' + p.texto + '</div>' +
      '<div class="es-vida">🌎 En tu día a día: ' + lec.vida + '</div>' +
    '</div>' +
    '<div class="es-nav">' +
      '<button onclick="pasoAnterior()"' + (ESC.i === 0 ? ' disabled' : '') + '>◀ Anterior</button>' +
      '<button onclick="escucharPaso()">🔊 Explícamelo</button>' +
      '<button onclick="pasoSiguiente()"' + (ESC.i >= ESC.pasos.length - 1 ? ' disabled' : '') + '>Siguiente ▶</button>' +
    '</div>';
  if (hablar) escucharPaso();
}
function pasoSiguiente() { if (ESC.i < ESC.pasos.length - 1) { ESC.i++; pintarPasos(true); } }
function pasoAnterior() { if (ESC.i > 0) { ESC.i--; pintarPasos(true); } }
function escucharPaso() {
  const p = ESC.pasos[ESC.i]; if (!p) return;
  const lec = LECCIONES[p.concepto] || LECCIONES.funcion;
  vozDecir('Linea ' + p.n + '. ' + p.texto + ' Esto se llama ' + lec.titulo + ' en Python. ' + lec.vida,
    { urgente: true, forzar: true });
}

function pintarLecciones() {
  const b = document.getElementById('es-body');
  if (!b) return;
  const usados = {};
  ESC.pasos.forEach(function (p) { usados[p.concepto] = true; });
  const claves = Object.keys(LECCIONES);
  const orden = claves.filter(function (k) { return usados[k]; }).concat(claves.filter(function (k) { return !usados[k]; }));
  b.innerHTML =
    '<div class="es-vacio" style="padding:0 0 12px;text-align:left">Estás programando en <b>Python</b>, ' +
    'el mismo lenguaje que se usa de verdad para ciencia de datos, robots y páginas web. ' +
    'Esto es lo que ya estás usando (arriba lo que hay en tu programa de ahora):</div>' +
    orden.map(function (k) {
      const l = LECCIONES[k];
      return '<div class="es-lec"' + (usados[k] ? ' style="border-color:var(--emerald)"' : '') + '>' +
        '<h4>' + (usados[k] ? '✅ ' : '') + l.titulo + '</h4>' +
        '<span class="py">' + l.py.replace(/</g, '&lt;') + '</span>' +
        '<p>' + l.que + '</p>' +
        '<p class="vida">🌎 Te sirve para: ' + l.vida + '</p>' +
      '</div>';
    }).join('');
}

function pintarHistorialCodigo() {
  const b = document.getElementById('es-body');
  if (!b) return;
  if (!codeHist.length) {
    b.innerHTML = '<div class="es-vacio">Aquí se va a guardar todo lo que programes.<br>' +
      'Escribe un programa, toca ▶ EJECUTAR y vuelve: podrás volver a cargarlo o pedirme que te lo explique.</div>';
    return;
  }
  b.innerHTML = codeHist.slice().reverse().map(function (h, i) {
    const idx = codeHist.length - 1 - i;
    return '<div class="es-hist">' +
      '<div class="fecha">' + fechaCorta(h.ts) + ' · ' + h.n + ' línea(s)' +
        (h.veces > 1 ? ' · ejecutado ' + h.veces + ' veces' : '') +
        (h.ok ? ' · ✅' : ' · ⚠️') + '</div>' +
      '<pre>' + String(h.c).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</pre>' +
      '<div class="fila">' +
        '<button onclick="cargarPrograma(' + idx + ')">📥 Cargar en el editor</button>' +
        '<button onclick="explicarPrograma(' + idx + ')">🧠 Explícamelo</button>' +
      '</div>' +
    '</div>';
  }).join('');
}
function cargarPrograma(i) {
  const h = codeHist[i]; if (!h) return;
  const ed = document.getElementById('python-editor');
  if (ed) { ed.value = h.c; ed.focus(); }
  cerrarEscuela();
  showToast('📥 Programa cargado en el editor');
  pintarAyudaLinea();
}
function explicarPrograma(i) {
  const h = codeHist[i]; if (!h) return;
  ESC.pasos = analizarCodigo(h.c); ESC.i = 0;
  escuelaTab('pasos');
}

// ------------------------------------- AYUDA EN VIVO MIENTRAS ESCRIBES -----
function lineaDelCursor(ta) {
  const pos = ta.selectionStart || 0;
  const antes = ta.value.slice(0, pos);
  const n = antes.split('\n').length - 1;
  return { n: n + 1, texto: ta.value.split('\n')[n] || '' };
}
function pintarAyudaLinea() {
  const caja = document.getElementById('linea-ayuda');
  const ta = document.getElementById('python-editor');
  if (!caja || !ta) return;
  const info = lineaDelCursor(ta);
  const a = analizarLinea(info.texto);
  if (!a) {
    caja.innerHTML = '<span class="la-tag">LÍNEA ' + info.n + '</span>' +
      'Escribe una orden y aquí te digo qué hace. Ejemplo: <b>drone.ir_a(2, 1)</b>';
    return;
  }
  const lec = LECCIONES[a.concepto] || LECCIONES.funcion;
  caja.innerHTML = '<span class="la-tag">LÍNEA ' + info.n + ' · ' + lec.titulo.toUpperCase() + '</span>' +
    a.texto + '<span class="la-vida">🌎 ' + lec.vida.split('.')[0] + '.</span>';
}

function montarEscuelaEnEditor() {
  const wrap = document.querySelector('.code-editor-wrap');
  const acciones = wrap && wrap.querySelector('.code-actions');
  if (!wrap || !acciones || document.getElementById('linea-ayuda')) return;
  const ayuda = document.createElement('div');
  ayuda.id = 'linea-ayuda';
  const btns = document.createElement('div');
  btns.className = 'esc-btns';
  btns.innerHTML =
    '<button class="esc-b" type="button" onclick="abrirEscuela(\'pasos\')">🧠 Explícame paso a paso</button>' +
    '<button class="esc-b" type="button" onclick="abrirEscuela(\'lecciones\')">📚 Qué estoy aprendiendo</button>' +
    '<button class="esc-b" type="button" onclick="abrirEscuela(\'historial\')">📜 Mi historial</button>';
  acciones.parentNode.insertBefore(ayuda, acciones.nextSibling);
  acciones.parentNode.insertBefore(btns, ayuda.nextSibling);
  const ta = document.getElementById('python-editor');
  if (ta) {
    let t = null;
    ['input', 'click', 'keyup'].forEach(function (ev) {
      ta.addEventListener(ev, function () {
        clearTimeout(t);
        t = setTimeout(pintarAyudaLinea, 280);
      });
    });
  }
  pintarAyudaLinea();
}

// ------------------------------------------- AL EJECUTAR: EXPLICA Y GUARDA --
const _runCode14 = runCode;
runCode = function () {
  const ed = document.getElementById('python-editor');
  const code = ed ? ed.value.trim() : '';
  _runCode14();
  if (!code) return;
  apuntarPrograma(code, true);
  const pasos = analizarCodigo(code);
  if (!pasos.length) return;
  logConsole('🧠 AIDEN te explica tu programa (' + pasos.length + ' órdenes):', 'info');
  pasos.forEach(function (p) { logConsole('   ' + p.n + '. ' + p.texto); });
  const conceptos = [];
  pasos.forEach(function (p) { if (conceptos.indexOf(p.concepto) === -1) conceptos.push(p.concepto); });
  const nombres = conceptos.map(function (c) { return (LECCIONES[c] || LECCIONES.funcion).titulo; });
  logConsole('📚 Esto es Python. En este programa usaste: ' + nombres.join(', ') + '.', 'info');
  const principal = LECCIONES[conceptos[0]] || LECCIONES.funcion;
  vozDecir('Estas programando en Python. En este programa usaste ' + nombres.join(', ') +
    '. ' + principal.vida + ' Si quieres te lo explico linea por linea: toca explicame paso a paso.',
    { urgente: true, forzar: true });
  ESC.pasos = pasos; ESC.i = 0;
};

// ============================================================================
//  8. LAS MONEDAS NO SON SOLO PARA COMPRAR: SON TUS AYUDANTES
//     Fertilizante, riego automático y dron ayudante cuidan el huerto por ti.
// ============================================================================
ECONOMIA.precioRiego = 30;
ECONOMIA.precioAbono = 20;
ECONOMIA.precioAyudante = 40;

const AYUDAS = { riego: 0, abono: 0, ayudante: 0 };   // hasta qué hora dura cada una
const DURA = { riego: 5 * 60 * 1000, abono: 5 * 60 * 1000, ayudante: 8 * 60 * 1000 };

function ayudaActiva(k) { return AYUDAS[k] > Date.now(); }

function montarAyudasHud() {
  if (document.getElementById('ayudas-hud')) return;
  const d = document.createElement('div');
  d.id = 'ayudas-hud';
  document.body.appendChild(d);
}
function pintarAyudasHud() {
  const d = document.getElementById('ayudas-hud');
  if (!d) return;
  const chips = [];
  const nombres = { riego: '💦 Riego automático', abono: '🧪 Súper abono', ayudante: '🤖 Dron ayudante' };
  Object.keys(AYUDAS).forEach(function (k) {
    if (!ayudaActiva(k)) return;
    const seg = Math.ceil((AYUDAS[k] - Date.now()) / 1000);
    const m = Math.floor(seg / 60), s = seg % 60;
    chips.push('<div class="ay-chip">' + nombres[k] + ' · ' + m + ':' + (s < 10 ? '0' : '') + s + '</div>');
  });
  d.innerHTML = chips.join('');
  d.style.display = (chips.length && gameState === 'game') ? 'flex' : 'none';
}

// El súper abono evita que las plantas pierdan salud
const _decay14 = checkHealthDecayRealTime;
checkHealthDecayRealTime = function () {
  if (ayudaActiva('abono')) { lastDecayCheck = Date.now(); return; }
  return _decay14();
};

// El riego automático y el dron ayudante trabajan solos
let ultimaAyuda = 0;
setInterval(function () {
  pintarAyudasHud();
  if (gameState !== 'game' || typeof farmGrid === 'undefined' || !farmGrid.length) return;
  const riega = ayudaActiva('riego') || ayudaActiva('ayudante');
  if (!riega) return;
  const cada = ayudaActiva('ayudante') ? 6000 : 10000;
  if (Date.now() - ultimaAyuda < cada) return;
  ultimaAyuda = Date.now();
  let peor = null, peorSalud = 99;
  for (let x = 0; x < GRID_COLS; x++) for (let y = 0; y < GRID_ROWS; y++) {
    const c = farmGrid[x][y];
    if (!c || c.isDepot || c.isEmpty || c.locked) continue;
    if (c.health < peorSalud) { peorSalud = c.health; peor = [x, y, c]; }
  }
  if (!peor || peorSalud >= 4.4) return;
  const c = peor[2];
  c.health = Math.min(5, c.health + 1.2);
  c.lastWatered = Date.now();
  const needs = PLANT_NEEDS[c.type] || PLANT_NEEDS['vacio'];
  c.weight = Math.round((c.health / 5) * needs.peso_max);
  c.stage = getGrowthStage(c.health);
  try { logConsole('🤖 Tu ayudante regó ' + PLANT_NAMES[c.type] + ' en (' + peor[0] + ',' + peor[1] + ').', 'info'); } catch (e) {}
}, 2000);

function activarAyuda(k, precio, texto) {
  if (!spendCoins(precio)) return;
  AYUDAS[k] = Math.max(Date.now(), AYUDAS[k]) + DURA[k];
  montarAyudasHud(); pintarAyudasHud();
  showToast(texto);
  try { closeShop(); } catch (e) {}
}

const _buyItem14 = buyItem;
buyItem = function (id) {
  if (id === 'riego') {
    activarAyuda('riego', ECONOMIA.precioRiego, '💦 Riego automático encendido por 5 minutos');
    vozDecir('Encendi el riego automatico. Durante cinco minutos voy regando sola la planta que peor este, para que tu puedas programar tranquilo.', { urgente: true, forzar: true });
  } else if (id === 'abono') {
    activarAyuda('abono', ECONOMIA.precioAbono, '🧪 Súper abono: 5 minutos sin perder salud');
    vozDecir('Puse super abono. Durante cinco minutos ninguna planta pierde salud, aunque no las riegues.', { urgente: true, forzar: true });
  } else if (id === 'ayudante') {
    activarAyuda('ayudante', ECONOMIA.precioAyudante, '🤖 Dron ayudante contratado por 8 minutos');
    vozDecir('Contrataste un dron ayudante. Trabaja contigo ocho minutos y siempre atiende primero la planta mas debil.', { urgente: true, forzar: true });
  } else {
    return _buyItem14(id);
  }
  pintarMonedas();
};

function montarTiendaAyudas() {
  const box = document.querySelector('#shop-popup .shop-box');
  if (!box || document.getElementById('shop-ayudas')) return;
  const d = document.createElement('div');
  d.id = 'shop-ayudas';
  d.innerHTML =
    '<div class="shop-sub" style="margin:14px 0 8px"><b>🌿 Ayudas para que el huerto no dependa solo de ti.</b> ' +
    'Aquí es donde de verdad se aprovechan las monedas: pagas una vez y el huerto se cuida un rato solo ' +
    'mientras tú programas, exploras el mundo o descansas.</div>' +
    '<div class="shop-item ayuda">' +
      '<div class="si-emoji">💦</div>' +
      '<div class="si-info"><div class="si-name">Riego automático · 5 min</div>' +
      '<div class="si-desc">Riega sola la planta que peor esté, cada 10 segundos.</div></div>' +
      '<button class="shop-buy" onclick="buyItem(\'riego\')">' + ECONOMIA.precioRiego + ' 🪙</button>' +
    '</div>' +
    '<div class="shop-item ayuda">' +
      '<div class="si-emoji">🧪</div>' +
      '<div class="si-info"><div class="si-name">Súper abono · 5 min</div>' +
      '<div class="si-desc">Ninguna planta pierde salud durante ese rato.</div></div>' +
      '<button class="shop-buy" onclick="buyItem(\'abono\')">' + ECONOMIA.precioAbono + ' 🪙</button>' +
    '</div>' +
    '<div class="shop-item ayuda">' +
      '<div class="si-emoji">🤖</div>' +
      '<div class="si-info"><div class="si-name">Dron ayudante · 8 min</div>' +
      '<div class="si-desc">Un segundo dron riega contigo cada 6 segundos.</div></div>' +
      '<button class="shop-buy" onclick="buyItem(\'ayudante\')">' + ECONOMIA.precioAyudante + ' 🪙</button>' +
    '</div>';
  box.appendChild(d);
}

// AIDEN ya sabe explicar todo esto
const _contexto14 = construirContexto;
construirContexto = function () {
  return _contexto14() + '\n' +
    'AYUDAS QUE SE COMPRAN CON MONEDAS (muy importante, explicalas cuando pregunten para que sirven las monedas):\n' +
    '- Fertilizante (' + ECONOMIA.precioFertilizante + '): sube 1 de salud a TODAS las plantas de golpe.\n' +
    '- Riego automatico (' + ECONOMIA.precioRiego + '): durante 5 minutos el huerto se riega solo.\n' +
    '- Super abono (' + ECONOMIA.precioAbono + '): durante 5 minutos ninguna planta pierde salud.\n' +
    '- Dron ayudante (' + ECONOMIA.precioAyudante + '): durante 8 minutos un segundo dron riega contigo.\n' +
    'Idea clave: las monedas sirven para que el huerto NO dependa solo del jugador.\n' +
    'ENSENAR A PROGRAMAR: cuando expliques codigo di siempre (1) que lenguaje es (Python), ' +
    '(2) como se llama lo que esta usando (bucle for, condicion if, variable, funcion, lista) ' +
    'y (3) un ejemplo de la vida diaria, como regar plantas de verdad. Explica paso a paso, una idea por frase.\n' +
    'El jugador tiene un boton "Explicame paso a paso" y un historial de todos sus programas.';
};

AIDEN_TEMAS.push(
  { etiqueta: '🌿 ¿Cómo cuido las plantas sin mí?', pregunta: '¿Qué ayudas compro con monedas para que el huerto se cuide solo?' },
  { etiqueta: '🐍 ¿Qué es Python?', pregunta: '¿Qué lenguaje estoy usando y para qué me sirve en mi vida diaria?' },
  { etiqueta: '🧠 Explícame mi programa', pregunta: 'Explícame paso a paso lo que escribí en el editor' }
);

// ============================================================================
//  AJUSTES: botón para cambiar tu avatar cuando quieras
// ============================================================================
function montarAjusteAvatar() {
  const body = document.querySelector('#ajustes-popup .aj-body');
  if (!body || document.getElementById('aj-avatar-row')) return;
  const d = document.createElement('div');
  d.id = 'aj-avatar-row';
  d.className = 'aj-row col';
  d.innerHTML = '<label class="aj-lab">🎨 Mi avatar</label>' +
    '<div class="aj-help">Cámbiale la cara, el fondo, el accesorio o el color cuando quieras.</div>' +
    '<button class="aj-btn" onclick="cerrarAjustes(); abrirAvatar();">🎨 Editar mi avatar</button>';
  body.insertBefore(d, body.firstChild.nextSibling);
}
const _abrirAjustes14 = abrirAjustes;
abrirAjustes = function () { _abrirAjustes14(); montarAjusteAvatar(); };

// ============================================================================
//  ARRANQUE v14
// ============================================================================
const _startGame14 = startGame;
startGame = function (level) {
  _startGame14(level);
  montarEscuelaEnEditor();
  montarTiendaAyudas();
  montarAyudasHud();
  try { initAidenTopics(); } catch (e) {}
  pintarAyudasHud();
};

function arrancarV14() {
  crearHud();
  montarAyudasHud();
  montarAtajoAvatar();
  construirEscuela();
  construirAvatarPopup();
  try { montarTiendaAyudas(); } catch (e) {}

  // el micrófono se reinicia para que use el nuevo oído (el que corta a AIDEN)
  if (AJ.micro) setTimeout(function () { micArrancar(true); }, 400);

  try { montarEscuelaEnEditor(); } catch (e) {}
  try { initAidenTopics(); } catch (e) {}

  // LA INTRO VA PRIMERO, antes de pedir nombre, edad y avatar
  const guardado = getUserData();
  if (guardado) {
    try { normalizarUsuario(guardado); } catch (e) {}
    if (guardado.avatarCustom) AV.borrador = JSON.parse(JSON.stringify(guardado.avatarCustom));
    else if (guardado.avatar) AV.borrador.cara = guardado.avatar;
    if (guardado.avatarPhoto) pendingPhoto = guardado.avatarPhoto;
  }
  window.addEventListener('load', function () {
    setTimeout(function () { try { avPintarAtajo(); avPintarPreview(); } catch (e) {} }, 120);
  });
  const acc = document.getElementById('account-screen');
  if (acc) acc.style.display = 'none';
  const menu = document.getElementById('main-menu');
  if (menu) menu.style.display = 'none';
  setTimeout(function () {
    if (gameState === 'bloqueado') return;
    startCinematicIntro();
  }, 260);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancarV14);
else setTimeout(arrancarV14, 60);


// ============================================================================
//  v15 · QUE SE LE ENTIENDA A AIDEN DENTRO DEL HUERTO
//  Problema: AIDEN se cortaba a media frase y no se entendía nada.
//  Ahora:
//   1. NADA le corta una frase por la mitad: siempre la termina.
//   2. Solo TÚ lo cortas, y solo si le das una orden ("AIDEN", "espera",
//      "cállate", "repite"…). El ruido, la tele o su propio eco ya no cuentan.
//   3. Si le preguntas algo mientras habla, te oye, termina la frase y
//      enseguida te contesta a ti.
//   4. La ficha de la fruta ya no se cierra a la mitad de la explicación.
// ============================================================================

const V15 = {
  enCurso: false,        // hay una frase sonando ahora mismo
  gen: 0,                // generación: al cortar, la frase vieja ya no sigue
  ping: 0,               // última señal de vida de la voz
  pendiente: null,       // lo que dijiste mientras AIDEN hablaba
  dichoReciente: [],     // para reconocer su propio eco
  avisoPendiente: 0
};

V15.recordar = function (t) {
  V15.dichoReciente.push({ t: v14Clave(t), ts: Date.now() });
  if (V15.dichoReciente.length > 12) V15.dichoReciente.shift();
};
// Es eco solo si repite CASI LITERAL lo que AIDEN acaba de decir.
// Así, si le preguntas por algo que él mencionó, sí te hace caso.
V15.esEco = function (frase) {
  const f = v14Clave(frase);
  if (!f) return false;
  const ahora = Date.now();
  const palabras = f.split(' ').filter(function (p) { return p.length > 3; });
  for (let i = V15.dichoReciente.length - 1; i >= 0; i--) {
    const d = V15.dichoReciente[i];
    if (ahora - d.ts > 12000) continue;
    if (f.length > 8 && d.t.indexOf(f) !== -1) return true;      // literal
    if (palabras.length >= 3) {
      let dentro = 0;
      palabras.forEach(function (p) { if (d.t.indexOf(p) !== -1) dentro++; });
      if (dentro / palabras.length >= 0.75) return true;
    }
  }
  return false;
};

// Palabras con las que TÚ sí puedes cortarlo
const V15_ORDENES = [
  ' aiden ', ' ayden ', ' aden ', ' eiden ', ' oye ', ' oiga ',
  ' espera ', ' esperate ', ' esperame ', ' detente ', ' deten ',
  ' callate ', ' calla ', ' silencio ', ' no hables ', ' apagate ',
  ' repite ', ' repitelo ', ' otra vez ', ' no entiendo ', ' no entendi ',
  ' ya entendi ', ' ya se ', ' mas despacio ', ' ayuda ', ' ayudame ',
  ' que hago ', ' ya basta ', ' basta '
];
V15.esOrden = function (frase) {
  const t = ' ' + v14Clave(frase) + ' ';
  for (let i = 0; i < V15_ORDENES.length; i++) if (t.indexOf(V15_ORDENES[i]) !== -1) return true;
  return false;
};

// ------------------------------------------ CORTAR EN FRASES COMPLETAS -----
// Antes partía por número de letras y a veces rompía una idea a la mitad.
// Ahora corta SOLO donde termina una frase; si una frase es larguísima,
// la parte en las comas, nunca en medio de una palabra.
vozPartir = function (texto) {
  const limpio = String(texto).replace(/\s+/g, ' ').trim();
  if (!limpio) return [];
  const frases = limpio.match(/[^.!?…]+[.!?…]*/g) || [limpio];
  const trozos = [];
  let actual = '';
  frases.forEach(function (f) {
    const fr = f.trim();
    if (!fr) return;
    if (fr.length > 230) {                       // frase kilométrica: cortar en comas
      if (actual) { trozos.push(actual.trim()); actual = ''; }
      let parte = '';
      // Se corta en las comas SIN usar lookbehind: los Safari e iOS antiguos
      // no lo soportan y el archivo entero dejaba de cargar.
      const pedazos = fr.split(',').map(function (p, k, arr) {
        return (k < arr.length - 1 ? p.trim() + ',' : p.trim());
      }).filter(function (p) { return p.length; });
      pedazos.forEach(function (p) {
        // si un pedazo sigue siendo enorme (sin comas), lo cortamos por
        // palabras: nunca a media palabra. Chrome corta la voz a los 15 s.
        const sueltos = p.length <= 200 ? [p] : (function () {
          const out = []; let acum = '';
          p.split(' ').forEach(function (w) {
            if ((acum + ' ' + w).trim().length > 200 && acum) { out.push(acum.trim()); acum = w; }
            else acum = (acum ? acum + ' ' : '') + w;
          });
          if (acum.trim()) out.push(acum.trim());
          return out;
        })();
        sueltos.forEach(function (q) {
          if ((parte + ' ' + q).trim().length > 200 && parte) { trozos.push(parte.trim()); parte = q; }
          else parte = (parte ? parte + ' ' : '') + q;
        });
      });
      if (parte.trim()) trozos.push(parte.trim());
      return;
    }
    if ((actual + ' ' + fr).trim().length > 200 && actual) { trozos.push(actual.trim()); actual = fr; }
    else actual = (actual ? actual + ' ' : '') + fr;
  });
  if (actual.trim()) trozos.push(actual.trim());
  return trozos.length ? trozos : [limpio];
};

// --------------------------------------------------- HABLAR SIN CORTARSE ---
vozDecir = function (texto, opts) {
  opts = opts || {};
  const limpio = vozLimpiarTexto(texto);
  if (!limpio) { if (opts.onend) opts.onend(); return; }
  if (!vozActiva()) { if (opts.onend) opts.onend(); return; }
  if (!AUDIO.listo) { if (AUDIO.cola.length < 10) AUDIO.cola.push({ t: texto, o: opts }); return; }

  const clave = v14Clave(limpio);
  const esRespuesta = !!(opts.urgente && opts.repetir) || !!opts.forzar || !!opts.cortar;
  if (!esRespuesta && V14.dichas.has(clave)) { if (opts.onend) opts.onend(); return; }
  V14.dichas.add(clave);
  V14.ultimoDicho = String(texto);
  V15.recordar(limpio);

  const item = { texto: limpio, crudo: String(texto), onend: opts.onend };

  if (opts.cortar) {
    // Solo una orden tuya llega hasta aquí: se calla de golpe y te atiende.
    VOZ.cola = [];
    V15.enCurso = false; VOZ.hablando = false; V15.gen++;
    try { if (speechSynth) speechSynth.cancel(); } catch (e) {}
    VOZ.cola.push(item);
  } else if (opts.urgente) {
    // Respuesta a algo que preguntaste: pasa al frente de la fila,
    // pero la frase que está sonando SE TERMINA.
    VOZ.cola = [item];
  } else {
    VOZ.cola.push(item);
    if (VOZ.cola.length > 8) VOZ.cola = VOZ.cola.slice(-8);
  }
  vozSiguiente();
};

vozSiguiente = function () {
  if (V15.enCurso) { VOZ.hablando = true; return; }   // deja terminar la frase
  if (!VOZ.cola.length || !speechSynth) { VOZ.hablando = false; return; }

  const item = VOZ.cola.shift();
  VOZ.ultimo = item.texto; VOZ.ultimoTs = Date.now();
  VOZ.hablando = true; V15.enCurso = true; V15.ping = Date.now();
  const miGen = ++V15.gen;
  hudAiden(item.crudo);
  pintarMicV();

  const trozos = vozPartir(item.texto);
  let i = 0;
  function seguir() {
    if (miGen !== V15.gen) return;   // nos cortaron: esta frase ya no sigue
    V15.ping = Date.now();
    if (i >= trozos.length) {
      V15.enCurso = false; VOZ.hablando = false;
      hudAiden('');
      pintarMicV();
      if (item.onend) { try { item.onend(); } catch (e) {} }
      setTimeout(V15.trasHablar, 220);
      return;
    }
    const u = new SpeechSynthesisUtterance(trozos[i++]);
    let v = null;
    try { v = elegirVoz(); } catch (e) {}
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'es-MX'; }
    u.rate = AJ.velocidad;
    u.pitch = VOICE_CONFIG.pitch;
    u.volume = AJ.volumen;
    u.onend = function () { setTimeout(seguir, 140); };   // respiro entre frases
    u.onerror = function () { setTimeout(seguir, 140); };
    u.onboundary = function () { V15.ping = Date.now(); };
    try { speechSynth.speak(u); } catch (e) { seguir(); }
  }
  seguir();
};

// Cuando termina de hablar: si le preguntaste algo mientras tanto, te contesta.
V15.trasHablar = function () {
  if (V15.pendiente) {
    const p = V15.pendiente; V15.pendiente = null;
    if (typeof comandoDeVoz === 'function' && comandoDeVoz(p)) return;
    try { showToast('🎙️ Ahora sí, te contesto'); } catch (e) {}
    askAidenTexto(p, true);
    return;
  }
  vozSiguiente();
};

vozParar = function () {
  VOZ.cola = []; VOZ.hablando = false; V15.enCurso = false; V15.gen++;
  try { if (speechSynth) speechSynth.cancel(); } catch (e) {}
  micSilenciar(false);
  hudAiden('');
  pintarMicV();
};

// La ficha de la fruta y los avisos ya NO cortan: hacen fila.
speak = function (text, opts) {
  opts = opts || {};
  vozDecir(text, { onend: opts.onend });
};
speakText = function (text) { vozDecir(text); };

// Vigilante propio: solo actúa si la voz lleva 8 s de verdad trabada.
setInterval(function () {
  if (!V15.enCurso) return;
  if (speechSynth && (speechSynth.speaking || speechSynth.pending)) { V15.ping = Date.now(); return; }
  if (Date.now() - V15.ping < 8000) return;
  V15.enCurso = false; VOZ.hablando = false; V15.gen++;
  vozSiguiente();
}, 2500);

// ------------------------------------------ EL MICRÓFONO YA NO LO CORTA ----
micResultado = function (ev) {
  let finales = '', parcial = '';
  for (let i = ev.resultIndex; i < ev.results.length; i++) {
    const t = ev.results[i][0].transcript;
    if (ev.results[i].isFinal) finales += t + ' '; else parcial += t + ' ';
  }
  const previa = normalizarVoz(finales + parcial);
  const hablando = V15.enCurso || VOZ.hablando || !!(speechSynth && speechSynth.speaking);

  if (hablando) {
    if (!previa) return;
    if (V15.esEco(previa)) return;                       // es su propia voz
    const palabras = previa.split(' ').filter(Boolean);

    if (V15.esOrden(previa)) {                           // TÚ mandas: se calla ya
      VOZ.cola = []; V15.enCurso = false; VOZ.hablando = false; V15.gen++;
      try { if (speechSynth) speechSynth.cancel(); } catch (e) {}
      hudAiden('Te escucho…');
      pintarMicV();
      try { showToast('🤫 Te escucho'); } catch (e) {}
      // sigue abajo y procesa lo que dijiste
    } else {
      // No es una orden: lo apuntamos y AIDEN TERMINA su frase.
      if (finales.trim() && palabras.length >= 2) {
        V15.pendiente = normalizarVoz(finales);
        if (Date.now() - V15.avisoPendiente > 6000) {
          V15.avisoPendiente = Date.now();
          try { showToast('🎙️ Te oí · te contesto al terminar la frase'); } catch (e) {}
        }
        hudMic('hot', 'Anotado: ' + V15.pendiente.slice(0, 32));
      } else {
        hudMic('on', 'Explicando… di "AIDEN" para cortarme');
      }
      return;
    }
  }

  if (previa) {
    try { pintarMic('hot', '🎙️ <span class="mic-heard">' + previa + '</span>'); } catch (e) {}
    hudMic('hot', previa.slice(0, 44));
  }
  if (!finales.trim()) return;
  let dicho = normalizarVoz(finales);
  if (!dicho) return;
  const resto = detectarClave(dicho);
  if (resto !== null) dicho = resto;
  if (!dicho) { vozDecir('Te escucho. Dime que necesitas.', { cortar: true, forzar: true }); return; }
  if (dicho.length < 4) return;
  if (dicho === MICV.ultimaFrase && Date.now() - MICV.ultimaTs < 3000) return;
  MICV.ultimaFrase = dicho; MICV.ultimaTs = Date.now();
  if (comandoDeVoz(dicho)) return;
  askAidenTexto(dicho, true);
};

// El indicador del micro ahora dice qué está pasando de verdad
pintarMicV = function () {
  if (!AJ.micro) {
    MIC.encendido = false;
    try { pintarMic('off', 'Microfono apagado. Enciendelo en Ajustes ⚙️.'); } catch (e) {}
    hudMic('off', 'Micro apagado'); return;
  }
  MIC.encendido = true;
  if (MIC.error === 'permiso') { hudMic('off', 'Falta permiso del micro'); return; }
  if (V15.enCurso || VOZ.hablando) {
    try { pintarMic('on', 'Estoy explicando. Te sigo escuchando: di <b>"AIDEN"</b> o <b>"espera"</b> para cortarme.'); } catch (e) {}
    hudMic('on', 'Explicando · di "AIDEN" para cortarme'); return;
  }
  try { pintarMic('on', 'Te escucho <b>siempre</b>. Hablame cuando quieras.'); } catch (e) {}
  hudMic('hot', 'Escuchando…');
};

// ------------------------------- LA FICHA DE LA FRUTA ESPERA A QUE TERMINE --
closeBio = function (token) {
  if (token !== undefined && token !== bioToken) return;
  // Cierre automático: si AIDEN sigue contando la fruta, lo dejamos acabar.
  if (token !== undefined && (V15.enCurso || VOZ.hablando)) {
    bioWatchdog = setTimeout(function () { closeBio(token); }, 900);
    return;
  }
  clearTimeout(bioWatchdog);
  bioWatchdog = null;
  bioToken++;
  const pop = document.getElementById('bio-popup');
  if (pop) pop.classList.remove('visible');
  const ind = document.getElementById('bio-voice-indicator');
  if (ind) ind.style.display = 'none';
  gamePausedForBio = hayVentanaAbierta();
};

// La biografía se lee entera; si no hay voz, se cierra sola en 7 s.
speakBiography = function (text, onComplete) {
  const ind = document.getElementById('bio-voice-indicator');
  if (!vozActiva() || !speechSynth) {
    if (ind) ind.style.display = 'none';
    setTimeout(function () { if (onComplete) onComplete(); }, 7000);
    return;
  }
  vozDecir(text, { onend: function () {
    if (ind) ind.style.display = 'none';
    if (onComplete) onComplete();
  }});
};

// Dentro del huerto: menos avisos sueltos y más pausa entre consejos,
// para que dé tiempo a escuchar y entender cada uno.
const _explicar15 = explicar;
explicar = function (clave, texto) {
  if (explicado[clave]) return false;
  // si ya hay varias cosas en fila, este consejo espera su turno tranquilo
  if (VOZ.cola.length >= 4) return false;
  return _explicar15(clave, texto);
};

// El entrenador del huerto ya no habla encima de nada
const _aidenSpeak15 = aidenSpeak;
aidenSpeak = function (msg) {
  try { aidenBubble(msg, 'ai'); } catch (e) {}
  vozDecir(msg);
};

// Se puede leer lo que AIDEN va diciendo, no solo oírlo
hudAiden = function (texto) {
  const el = document.getElementById('ah-txt');
  if (!el) return;
  clearTimeout(hudTimer);
  if (!texto) {
    hudTimer = setTimeout(function () {
      el.textContent = 'AIDEN listo · arrástrame a donde quieras';
    }, 2500);
    return;
  }
  el.textContent = String(texto).slice(0, 320);
  el.scrollTop = 0;
  const orb = document.getElementById('ah-orb');
  if (orb) { orb.classList.add('hablando'); setTimeout(function () { orb.classList.remove('hablando'); }, 2200); }
};


// ============================================================================
//  v16 · INTRO CON MÚSICA, CORTA Y LLAMATIVA
//  Antes: párrafos largos que nadie alcanzaba a leer y solo pitidos sueltos.
//  Ahora: 8 escenas de 3 segundos, una idea por escena, y una canción de
//  verdad (bajo, acordes, melodía y batería) que crece hasta el arranque.
//  La música se baja sola cuando AIDEN habla, para que se le entienda.
// ============================================================================

// ------------------------------------------------------------- LA CANCIÓN --
const NOTAS = {
  A2:110.00, C3:130.81, D3:146.83, E3:164.81, F3:174.61, G3:196.00,
  A3:220.00, B3:246.94, C4:261.63, D4:293.66, E4:329.63, F4:349.23,
  G4:392.00, A4:440.00, B4:493.88, C5:523.25, D5:587.33, E5:659.25,
  G5:783.99, A5:880.00
};
// Am · F · C · G  (suena esperanzador, tipo "vamos a reconstruir el mundo")
const MUS_COMPASES = [
  { bajo: 'A2', pad: ['A3', 'C4', 'E4'], arp: ['A4', 'C5', 'E5', 'C5'] },
  { bajo: 'F3', pad: ['F3', 'A3', 'C4'], arp: ['F4', 'A4', 'C5', 'A4'] },
  { bajo: 'C3', pad: ['C4', 'E4', 'G4'], arp: ['C5', 'E5', 'G5', 'E5'] },
  { bajo: 'G3', pad: ['G3', 'B3', 'D4'], arp: ['B4', 'D5', 'G5', 'D5'] }
];
const MUS = {
  ctx: null, master: null, on: false, compas: 0, sigT: 0, reloj: null,
  capas: 1, bpm: 104, nodos: []
};

function musCtx() {
  if (!MUS.ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    MUS.ctx = new AC();
    MUS.master = MUS.ctx.createGain();
    MUS.master.gain.value = 0.0;
    MUS.master.connect(MUS.ctx.destination);
    introAudioCtx = MUS.ctx;   // el resto del juego usa esta referencia
  }
  if (MUS.ctx.state === 'suspended') { try { MUS.ctx.resume(); } catch (e) {} }
  return MUS.ctx;
}

function musTono(freq, t, dur, tipo, vol, ataque) {
  const c = MUS.ctx;
  const o = c.createOscillator(), g = c.createGain();
  o.type = tipo; o.frequency.setValueAtTime(freq, t);
  const a = ataque || 0.012;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(MUS.master);
  o.start(t); o.stop(t + dur + 0.05);
  MUS.nodos.push(o);
  if (MUS.nodos.length > 140) MUS.nodos.splice(0, 60);
}

function musGolpe(t, agudo) {
  const c = MUS.ctx;
  if (agudo) {                       // charles: ruidito corto
    const buf = c.createBuffer(1, 1400, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = c.createGain(); g.gain.value = 0.05;
    s.connect(f); f.connect(g); g.connect(MUS.master);
    s.start(t);
  } else {                           // bombo
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.13);
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g); g.connect(MUS.master);
    o.start(t); o.stop(t + 0.25);
  }
}

function musProgramarCompas(t) {
  const c = MUS_COMPASES[MUS.compas % MUS_COMPASES.length];
  const negra = 60 / MUS.bpm;
  const corchea = negra / 2;
  const capas = MUS.capas;

  // pad: la base, siempre
  c.pad.forEach(function (n) {
    musTono(NOTAS[n], t, negra * 3.8, 'sine', 0.055, 0.35);
  });
  // bajo
  if (capas >= 1) {
    musTono(NOTAS[c.bajo], t, negra * 0.9, 'triangle', 0.13);
    musTono(NOTAS[c.bajo], t + negra * 2, negra * 0.9, 'triangle', 0.11);
  }
  // batería suave
  if (capas >= 2) {
    for (let b = 0; b < 4; b++) {
      if (b === 0 || b === 2) musGolpe(t + b * negra, false);
      musGolpe(t + b * negra + corchea, true);
    }
  }
  // melodía arpegiada
  if (capas >= 3) {
    for (let i = 0; i < 8; i++) {
      const n = c.arp[i % c.arp.length];
      musTono(NOTAS[n], t + i * corchea, corchea * 0.85, 'square', 0.035);
    }
  }
  // contramelodía brillante en el clímax
  if (capas >= 4) {
    c.arp.forEach(function (n, i) {
      musTono(NOTAS[n] * 2, t + i * negra, negra * 0.6, 'triangle', 0.028);
    });
  }
  MUS.compas++;
}

function musLatido() {
  const el = document.getElementById('intro');
  if (!el) return;
  el.classList.add('beat');
  setTimeout(function () { el.classList.remove('beat'); }, 110);
}

function musCiclo() {
  if (!MUS.on || !MUS.ctx) return;
  const ahora = MUS.ctx.currentTime;
  const largoCompas = (60 / MUS.bpm) * 4;
  if (MUS.sigT < ahora - 0.2) MUS.sigT = ahora + 0.1;   // el navegador tenía el audio dormido
  while (MUS.sigT < ahora + 0.6) {
    musProgramarCompas(MUS.sigT);
    const t0 = MUS.sigT, negra = 60 / MUS.bpm;
    for (let b = 0; b < 4; b += 2) {
      const espera = (t0 + b * negra - ahora) * 1000;
      if (espera > 0 && espera < 4000) setTimeout(musLatido, espera);
    }
    MUS.sigT += largoCompas;
  }
  // la música se agacha cuando AIDEN habla, para que se le entienda
  const hablando = (typeof V15 !== 'undefined' && (V15.enCurso || VOZ.hablando));
  const objetivo = hablando ? 0.14 : 0.45;
  try { MUS.master.gain.setTargetAtTime(objetivo, MUS.ctx.currentTime, 0.25); } catch (e) {}
}

startIntroAudio = function () {
  if (!musCtx()) return;
  if (MUS.on) return;
  MUS.on = true;
  MUS.compas = 0; MUS.capas = 1;
  MUS.sigT = MUS.ctx.currentTime + 0.15;
  try { MUS.master.gain.setValueAtTime(0.0001, MUS.ctx.currentTime); } catch (e) {}
  clearInterval(MUS.reloj);
  MUS.reloj = setInterval(musCiclo, 180);
  musCiclo();
};

stopIntroAudio = function () {
  MUS.on = false;
  clearInterval(MUS.reloj); MUS.reloj = null;
  if (MUS.ctx && MUS.master) {
    try { MUS.master.gain.setTargetAtTime(0.0001, MUS.ctx.currentTime, 0.15); } catch (e) {}
  }
  setTimeout(function () {
    MUS.nodos.forEach(function (n) { try { n.stop(); } catch (e) {} });
    MUS.nodos = [];
  }, 400);
};

// El "pitido por escena" de antes ahora solo sube o baja capas de la canción
playIntroSceneAudio = function (idx) {
  if (!MUS.on) return;
  MUS.capas = idx <= 0 ? 1 : idx <= 2 ? 2 : idx <= 5 ? 3 : 4;
  MUS.bpm = idx >= 6 ? 116 : 104;
};
playIntroAmbient = function () { /* la canción ya lo cubre */ };

// ------------------------------------------------- LAS 8 ESCENAS, CORTAS ---
function escenaV16(id, html) {
  let d = document.getElementById(id);
  if (!d) {
    const intro = document.getElementById('intro');
    if (!intro) return;
    d = document.createElement('div');
    d.className = 'cinematic-layer';
    d.id = id;
    const prog = document.getElementById('cin-progress');
    intro.insertBefore(d, prog || null);
  }
  d.innerHTML = '<div class="cin-scene cin-wide">' + html + '</div>';
}

function icono(em, tit, txt) {
  return '<div class="cin-ico cin-beat"><span class="em">' + em + '</span>' +
         '<div class="tx"><b>' + tit + '</b>' + txt + '</div></div>';
}

construirEscenasV14 = function () {
  // 1 · el logo
  escenaV16('cin-scene-1',
    '<div class="cin-kicker">El Salvador · año 2087</div>' +
    '<div class="cin-logo cin-beat">AGROBOT PRO</div>' +
    '<div class="cin-tagline">El último huerto del planeta</div>');

  // 2 · el problema (con el planeta girando)
  escenaV16('cin-scene-3',
    '<div class="cin-big">EL MUNDO SE SECÓ</div>' +
    '<div class="globe-container cin-beat">' +
      '<canvas id="globe-canvas" width="260" height="260"></canvas>' +
      '<div class="scan-line"></div>' +
    '</div>' +
    '<div class="cin-linea">Quedan <b>20 frutas</b> de El Salvador.<br>Y quedas <b>tú</b>.</div>');

  // 3 · el dron
  escenaV16('cin-scene-6',
    '<div class="cin-big">TIENES UN DRON</div>' +
    '<div class="cin-dron cin-beat">🛸</div>' +
    '<div class="cin-huerto">' +
      '<div class="cin-maceta">🥭</div><div class="cin-maceta">🥥</div>' +
      '<div class="cin-maceta">🍈</div><div class="cin-maceta">💧</div>' +
      '<div class="cin-maceta cerrada">🔒</div>' +
    '</div>' +
    '<div class="cin-linea">Tú das la orden. Él riega.</div>');

  // 4 · las frutas
  escenaV16('cin-scene-7',
    '<div class="cin-big">20 FRUTAS DE AQUÍ</div>' +
    '<div class="cin-galeria" id="cin-galeria"></div>' +
    '<div class="cin-linea">Jocote, mamey, pitaya… <b>ninguna se repite</b>.</div>');

  // 5 · programar
  escenaV16('cin-scene-8',
    '<div class="cin-big">ESCRIBES PYTHON</div>' +
    '<div class="cin-editor cin-beat">' +
      '<span class="kw">for</span> x, y <span class="kw">in</span> <span class="fn">granja</span>.<span class="fn">criticas</span>():<br>' +
      '&nbsp;&nbsp;&nbsp;&nbsp;<span class="fn">drone</span>.<span class="fn">regar</span>()<span class="cursor"></span><br>' +
      '<span class="cm"># y el dron las riega todas</span>' +
    '</div>' +
    '<div class="cin-linea">Python de verdad. <b>AIDEN te explica cada línea.</b></div>');

  // 6 · monedas
  escenaV16('cin-scene-9',
    '<div class="cin-big">RIEGAS · GANAS · CRECES</div>' +
    '<div class="cin-iconos">' +
      icono('🪙', 'Monedas', 'por cada planta') +
      icono('🪴', 'Macetas', 'de 2 a 20') +
      icono('🌿', 'Fertilizante', 'sube la salud') +
      icono('🤖', 'Ayudante', 'riega por ti') +
    '</div>');

  // 7 · el mundo de afuera
  escenaV16('cin-scene-10',
    '<div class="cin-big">Y AFUERA… UN MUNDO</div>' +
    '<div class="cin-iconos">' +
      icono('🌎', 'Explora', '5 zonas') +
      icono('🤝', 'Ayuda', 'a la gente') +
      icono('👾', 'Cuidado', 'drones piratas') +
      icono('🌱', 'Decide', '4 finales') +
    '</div>');

  // 8 · arranque
  escenaV16('cin-scene-5',
    '<div class="cin-big">¿LISTO?</div>' +
    '<div class="cin-counter cin-beat" id="intro-counter">3</div>' +
    '<div class="loading-bar"><div class="loading-fill" id="loading-fill"></div></div>');

  // la escena 2 y la 4 viejas ya no se usan
  ['cin-scene-2', 'cin-scene-4'].forEach(function (id) {
    const e = document.getElementById(id);
    if (e && e.parentNode) e.parentNode.removeChild(e);
  });
};

actualizarEscena4 = function () { /* esa escena se eliminó: era demasiado texto */ };

ordenarEscenasV14 = function () {
  SCENE_TIMINGS.length = 0;
  SCENE_TIMINGS.push(
    { id: 'cin-scene-1',  duration: 2600 },
    { id: 'cin-scene-3',  duration: 3000 },
    { id: 'cin-scene-6',  duration: 2900 },
    { id: 'cin-scene-7',  duration: 2900 },
    { id: 'cin-scene-8',  duration: 3200 },
    { id: 'cin-scene-9',  duration: 2800 },
    { id: 'cin-scene-10', duration: 2800 },
    { id: 'cin-scene-5',  duration: 3000 }
  );
};

// menos frutas en la galería: se ven más grandes y se leen de un vistazo
pintarGaleriaIntro = function () {
  const g = document.getElementById('cin-galeria');
  if (!g || g.children.length) return;
  ['jocote', 'mango', 'maranon', 'zapote', 'coco', 'guanabana', 'maracuya', 'pitaya']
  .forEach(function (f) {
    const c = document.createElement('div');
    c.className = 'cin-fruta';
    c.innerHTML = '<div class="foto-fruta"><span class="foto-emoji">' + (PLANT_EMOJI[f] || '🍎') + '</span></div>' +
                  '<div class="nom">' + (PLANT_NAMES[f] || f) + '</div>';
    g.appendChild(c);
    try { pintarFotoFruta(c.querySelector('.foto-fruta'), f); } catch (e) {}
  });
};

// puntitos en vez de "ESCENA 4/9", y las animaciones se reinician en cada escena
showScene = function (idx) {
  document.querySelectorAll('.cinematic-layer').forEach(function (el) { el.classList.remove('visible'); });
  const scene = document.getElementById(SCENE_TIMINGS[idx].id);
  if (scene) {
    void scene.offsetWidth;           // reinicia la animación de entrada
    scene.classList.add('visible');
  }
  const prog = document.getElementById('cin-progress');
  if (prog) {
    prog.innerHTML = SCENE_TIMINGS.map(function (s, i) {
      return '<span class="cin-dot' + (i === idx ? ' on' : (i < idx ? ' ya' : '')) + '"></span>';
    }).join('');
  }
  try { playIntroSceneAudio(idx); } catch (e) {}
};

// ------------------------------------------------- LO QUE DICE AIDEN -------
// Cinco frases cortas. Una por idea. Nada de párrafos.
NARRA_INTRO.length = 0;
NARRA_INTRO.push(
  'El mundo se seco. Quedan veinte frutas de El Salvador, y quedas tu.',
  'Tienes un dron: tu le das la orden y el riega.',
  'Puedes jugar con las teclas, o escribir Python de verdad. Yo te explico cada linea.',
  'Riegas, ganas monedas, y con ellas compras macetas, plantas y ayudantes.',
  'Vamos. Solo necesito tu nombre, tu edad y tu avatar.'
);

// el botón de audio ahora habla de la música
(function () {
  const b = document.getElementById('audio-toggle');
  if (b) b.textContent = '🎵 MÚSICA';
})();
const _toggleIntroAudio16 = toggleIntroAudio;
toggleIntroAudio = function () {
  _toggleIntroAudio16();
  const b = document.getElementById('audio-toggle');
  if (b) b.textContent = introAudioEnabled ? '🎵 MÚSICA' : '🔇 SIN MÚSICA';
};

// la canción sigue sonando bajita en el menú, y se calla dentro del huerto
function musMenu() {
  if (!AJ.sonido || !AJ.efectos) return;
  setTimeout(function () {
    startIntroAudio();
    MUS.capas = 2; MUS.bpm = 92;
    introAudioEnabled = true;
  }, 350);
}
const _skipIntro16 = skipIntro;
skipIntro = function () { _skipIntro16(); musMenu(); };
const _goToMenu16 = goToMenu;
goToMenu = function () { _goToMenu16(); musMenu(); };
const _startGame16 = startGame;
startGame = function (level) { stopIntroAudio(); introAudioEnabled = false; _startGame16(level); };


// ============================================================================
//  v17 · CUANDO TÚ HABLAS, AIDEN SE CALLA
//  Antes solo se callaba si le decías una palabra clave ("AIDEN", "espera").
//  Ahora, en cuanto abres la boca para preguntarle algo, se calla al instante
//  y te deja hablar tranquilo hasta que termines.
//  Y si al final era solo ruido, retoma la explicación donde se quedó:
//  no se pierde nada.
// ============================================================================

const V17 = {
  silencio: false,     // AIDEN está callado porque tú estás hablando
  desde: 0,            // cuándo se calló
  actual: null,        // qué frase y qué trozo estaba diciendo
  cortado: null,       // lo que le quedó pendiente por decir
  manual: false        // apretaste el botón de "HABLAR"
};

// ---------------------------------------------------- AIDEN SE CALLA -------
function v17Callar(aviso) {
  const a = V17.actual;
  if (a && a.trozos && a.i > 0 && a.i <= a.trozos.length) {
    // guardamos desde el trozo que se estaba diciendo, para no perderlo
    V17.cortado = { crudo: a.item.crudo, trozos: a.trozos.slice(a.i - 1) };
  }
  V17.actual = null;
  VOZ.cola = [];
  V15.enCurso = false; VOZ.hablando = false; V15.gen++;
  try { if (speechSynth) speechSynth.cancel(); } catch (e) {}
  V17.silencio = true; V17.desde = Date.now();
  hudAiden('🤫 Te escucho…');
  hudMic('hot', 'Habla, te escucho');
  try { pintarMic('hot', '🤫 Me callé. <b>Habla tranquilo</b>, te escucho.'); } catch (e) {}
  try { if (MUS.on && MUS.master && MUS.ctx) MUS.master.gain.setTargetAtTime(0.03, MUS.ctx.currentTime, 0.1); } catch (e) {}
  if (aviso) { try { showToast(aviso); } catch (e) {} }
  v17PintarBoton();
}

// Vuelve a hablar: retoma justo donde lo cortaste
function v17Retomar(avisar) {
  V17.silencio = false; V17.manual = false;
  V17.desde = 0;
  pintarMicV(); v17PintarBoton();
  if (V17.cortado) {
    const c = V17.cortado; V17.cortado = null;
    if (avisar) V14.dichas.delete(v14Clave(c.trozos.join(' ')));
    VOZ.cola.unshift({ texto: c.trozos.join(' '), crudo: c.crudo, onend: null });
  }
  vozSiguiente();
}

// Si de verdad te contesta algo, lo de antes ya no hace falta
function v17Atendido() {
  V17.cortado = null;
  V17.silencio = false; V17.manual = false;
  pintarMicV(); v17PintarBoton();
}

// Vigilante: si te callaste sin decir nada (era ruido), retoma solo
setInterval(function () {
  if (!V17.silencio) return;
  if (V17.manual) return;                                   // apretaste el botón: tú mandas
  if (typeof aidenOcupado !== 'undefined' && aidenOcupado) { V17.desde = Date.now(); return; }
  if (Date.now() - V17.desde < 2800) return;
  v17Retomar(true);
}, 500);

// ------------------------------------ HABLAR SIN QUE NADIE LO INTERRUMPA ---
vozSiguiente = function () {
  if (V17.silencio) { VOZ.hablando = false; return; }   // tú tienes la palabra
  if (V15.enCurso) { VOZ.hablando = true; return; }
  if (!VOZ.cola.length || !speechSynth) { VOZ.hablando = false; return; }

  const item = VOZ.cola.shift();
  VOZ.ultimo = item.texto; VOZ.ultimoTs = Date.now();
  VOZ.hablando = true; V15.enCurso = true; V15.ping = Date.now();
  const miGen = ++V15.gen;
  hudAiden(item.crudo);
  pintarMicV();

  const trozos = vozPartir(item.texto);
  V17.actual = { item: item, trozos: trozos, i: 0 };
  let i = 0;
  function seguir() {
    if (miGen !== V15.gen) return;
    V15.ping = Date.now();
    if (i >= trozos.length) {
      V15.enCurso = false; VOZ.hablando = false;
      V17.actual = null;
      hudAiden('');
      pintarMicV();
      if (item.onend) { try { item.onend(); } catch (e) {} }
      setTimeout(V15.trasHablar, 220);
      return;
    }
    const u = new SpeechSynthesisUtterance(trozos[i++]);
    V17.actual.i = i;
    let v = null;
    try { v = elegirVoz(); } catch (e) {}
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'es-MX'; }
    u.rate = AJ.velocidad;
    u.pitch = VOICE_CONFIG.pitch;
    u.volume = AJ.volumen;
    u.onend = function () { setTimeout(seguir, 140); };
    u.onerror = function () { setTimeout(seguir, 140); };
    u.onboundary = function () { V15.ping = Date.now(); };
    try { speechSynth.speak(u); } catch (e) { seguir(); }
  }
  seguir();
};

// ------------------------------------------------- EL MICRÓFONO MANDA -----
micResultado = function (ev) {
  let finales = '', parcial = '';
  for (let i = ev.resultIndex; i < ev.results.length; i++) {
    const t = ev.results[i][0].transcript;
    if (ev.results[i].isFinal) finales += t + ' '; else parcial += t + ' ';
  }
  const previa = normalizarVoz(finales + parcial);
  if (!previa) return;

  const hablando = V15.enCurso || VOZ.hablando || !!(speechSynth && speechSynth.speaking);

  // ¿es su propia voz saliendo por la bocina? entonces no cuenta
  if (hablando && V15.esEco(previa)) return;

  const palabras = previa.split(' ').filter(Boolean);
  const quiereHablar = palabras.length >= 2 || V15.esOrden(previa);

  // EN CUANTO EMPIEZAS A HABLAR, SE CALLA
  if (quiereHablar && (hablando || (!V17.silencio && VOZ.cola.length))) {
    v17Callar('🤫 Te escucho');
  }
  if (V17.silencio) V17.desde = Date.now();   // sigues hablando: sigue callado

  try { pintarMic('hot', '🎙️ <span class="mic-heard">' + previa + '</span>'); } catch (e) {}
  hudMic('hot', previa.slice(0, 44));

  if (!finales.trim()) return;                // todavía no terminas la frase

  let dicho = normalizarVoz(finales);
  if (!dicho) return;
  const resto = detectarClave(dicho);
  if (resto !== null) dicho = resto;
  if (!dicho) {
    v17Atendido();
    vozDecir('Te escucho. Dime que necesitas.', { cortar: true, forzar: true });
    return;
  }
  if (dicho.length < 4) return;               // muy corto: seguimos esperando
  if (dicho === MICV.ultimaFrase && Date.now() - MICV.ultimaTs < 3000) return;
  MICV.ultimaFrase = dicho; MICV.ultimaTs = Date.now();

  v17Atendido();                              // ya te oí completo: te contesto
  if (comandoDeVoz(dicho)) return;
  askAidenTexto(dicho, true);
};

// "sigue" / "continúa" para que retome lo que estaba explicando
const _comandoDeVoz17 = comandoDeVoz;
comandoDeVoz = function (txt) {
  const t = ' ' + v14Clave(txt) + ' ';
  if (/ (sigue|continua|seguile|dale|termina de explicar|que decias) /.test(t)) {
    if (V17.cortado) { v17Retomar(true); return true; }
  }
  return _comandoDeVoz17(txt);
};

// ---------------------------------------------- BOTÓN GRANDE DE "HABLAR" ---
function v17PintarBoton() {
  const b = document.getElementById('btn-hablar');
  if (!b) return;
  const on = V17.silencio;
  b.textContent = on ? '🎙️ TE ESCUCHO…' : '🎤 QUIERO HABLAR';
  b.classList.toggle('activo', on);
}

function v17BotonHablar() {
  if (V17.silencio) {          // ya terminé de hablar: que siga
    v17Retomar(true);
    return;
  }
  V17.manual = true;
  v17Callar('🎤 Habla, AIDEN se calló');
  // por si te arrepientes: a los 12 s vuelve solo
  setTimeout(function () {
    if (V17.manual && V17.silencio && Date.now() - V17.desde > 11000) v17Retomar(true);
  }, 12000);
}

function montarBotonHablar() {
  const fila = document.querySelector('.mic-row');
  if (!fila || document.getElementById('btn-hablar')) return;
  const b = document.createElement('button');
  b.id = 'btn-hablar';
  b.className = 'mic-btn hablar';
  b.type = 'button';
  b.onclick = v17BotonHablar;
  fila.appendChild(b);
  v17PintarBoton();

  // si te pones a escribirle, también se calla
  const inp = document.getElementById('aiden-input');
  if (inp && !inp.dataset.v17) {
    inp.dataset.v17 = '1';
    inp.addEventListener('focus', function () {
      if (V15.enCurso || VOZ.hablando || VOZ.cola.length) { V17.manual = true; v17Callar('✍️ Escribe tranquilo'); }
    });
  }
}

// El indicador del micro también avisa que está callado a propósito
pintarMicV = function () {
  if (!AJ.micro) {
    MIC.encendido = false;
    try { pintarMic('off', 'Microfono apagado. Enciendelo en Ajustes ⚙️.'); } catch (e) {}
    hudMic('off', 'Micro apagado'); v17PintarBoton(); return;
  }
  MIC.encendido = true;
  if (MIC.error === 'permiso') { hudMic('off', 'Falta permiso del micro'); return; }
  if (V17.silencio) {
    try { pintarMic('hot', '🤫 Me callé para oírte. <b>Habla</b>.'); } catch (e) {}
    hudMic('hot', 'Te escucho · habla'); v17PintarBoton(); return;
  }
  if (V15.enCurso || VOZ.hablando) {
    try { pintarMic('on', 'Estoy explicando. <b>Si hablas, me callo</b> y te escucho.'); } catch (e) {}
    hudMic('on', 'Explicando · háblame y me callo'); v17PintarBoton(); return;
  }
  try { pintarMic('on', 'Te escucho <b>siempre</b>. Hablame cuando quieras.'); } catch (e) {}
  hudMic('hot', 'Escuchando…');
  v17PintarBoton();
};

// Cuando termina de contestar, la música vuelve a su volumen
const _responder17 = responderAiden;
responderAiden = async function (pregunta, porVoz) {
  v17Atendido();
  return _responder17(pregunta, porVoz);
};

// Tocar el orbe del HUD = "quiero hablar"
function v17EngancharOrbe() {
  const o = document.getElementById('ah-orb');
  if (!o || o.dataset.v17) return;
  o.dataset.v17 = '1';
  o.onclick = function () {
    if (V17.silencio) v17Retomar(true);
    else { V17.manual = true; v17Callar('🎤 Habla, te escucho'); }
  };
}

const _startGame17 = startGame;
startGame = function (level) {
  _startGame17(level);
  setTimeout(function () { montarBotonHablar(); v17EngancharOrbe(); }, 250);
};

setInterval(function () { montarBotonHablar(); v17EngancharOrbe(); }, 1500);