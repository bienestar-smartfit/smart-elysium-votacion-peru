/**
 * Smart Elysium Perú — votación de reconocimientos (sede Lima).
 * Backend en Google Apps Script sobre una hoja de cálculo de Google.
 *
 * Hojas que usa (se crean solas la primera vez):
 *   Votos     — una fila por persona y categoría (se reemplaza si cambia el voto)
 *   Votados   — personas que se pueden elegir: Nombre | Correo | Área | Origen
 *               (también acepta la pestaña con su nombre anterior, "Personas")
 *   Config    — estado de la votación, organizadores y resultados publicados
 */

var CATS = [
  {id:"c1", n:"El Oráculo de Delfos", f:"Data Driven", fe:"Decisiones basadas en datos",
   m:"El Oráculo poseía la sabiduría suprema y la visión clara para guiar el destino con precisión.",
   d:"Para la persona que siempre analiza, se guía por datos concretos y toma las decisiones más acertadas con excelencia para la compañía."},
  {id:"c2", n:"El Rayo de Zeus", f:"Move Fast", fe:"Moverse con agilidad",
   m:"El poder supremo de Zeus que actúa de forma inmediata, decisiva y a la velocidad del trueno.",
   d:"Para quien hace que las cosas sucedan a la velocidad que el negocio necesita, respondiendo con agilidad, dinamismo y efectividad ante cualquier reto."},
  {id:"c3", n:"La Fuerza de Hércules", f:"Ownership", fe:"Sentido de responsabilidad",
   m:"La determinación incansable, el compromiso absoluto y el asumir las grandes tareas con firmeza.",
   d:"Para quien se adueña de sus procesos, asume la responsabilidad total de sus proyectos y siempre entrega más de lo esperado con máxima calidad."},
  {id:"c4", n:"La Falange de Esparta", f:"Teamwork", fe:"Trabajo en equipo",
   m:"La formación donde el escudo de uno protegía al compañero de al lado: unidos eran invencibles.",
   d:"Para el área o colaborador que destaca por su colaboración constante, demostrando que conectados y alineados a un mismo propósito son imparables."},
  {id:"c5", n:"La Luz de Apolo", f:"Customer Centric", fe:"Enfoque en el cliente",
   m:"Apolo, dios del sol, iluminaba y guiaba a los mortales con calidez y dedicación.",
   d:"Para quien pone al cliente (interno o externo) en el centro de sus decisiones, con un servicio empático, cálido y memorable."},
  {id:"c6", n:"La Visión de Atenea", f:"Leading the Future", fe:"Liderazgo del futuro",
   m:"Atenea representa la estrategia, la sabiduría vanguardista y la habilidad de ir un paso adelante.",
   d:"Para el líder o profesional innovador que inspira al equipo, prevé las tendencias del entorno y está preparado para lo que viene."},
  {id:"c7", n:"Las Alas de Hermes", f:"Move Fast", fe:"Moverse con agilidad",
   m:"Hermes, el mensajero de sandalias aladas, destacaba por su velocidad y su capacidad de resolver sobre la marcha.",
   d:"Para quien destaca por su rapidez de respuesta, capacidad de adaptación y por resolver imprevistos con la agilidad que el negocio exige."},
  {id:"c8", n:"La Brújula de Nereo", f:"Data Driven", fe:"Decisiones basadas en datos",
   m:"Nereo, el anciano sabio del mar, nunca mentía y ofrecía datos exactos para navegar seguros en la tormenta.",
   d:"Para quien respalda sus argumentos con métricas precisas, guiando al equipo por el camino correcto con análisis riguroso de la información."},
  {id:"c9", n:"El Escudo de Prometeo", f:"Ownership", fe:"Sentido de responsabilidad",
   m:"Prometeo asumió las consecuencias de regalar el fuego y el conocimiento a la humanidad, protegiendo a su pueblo.",
   d:"Para quien «se pone la camiseta», protege los recursos de la empresa como propios y asume el liderazgo total de sus entregables."},
  {id:"c10", n:"El Vellocino de Oro", f:"Customer Centric", fe:"Enfoque en el cliente",
   m:"El tesoro más preciado de la mitología, símbolo de la excelencia por la que los héroes atravesaron grandes travesías.",
   d:"Para quien crea experiencias valiosas e inolvidables para el cliente, haciendo de cada interacción un tesoro dentro del área administrativa."},
  {id:"c11", n:"La Antorcha de Titán", f:"Leading the Future", fe:"Liderazgo del futuro",
   m:"Los titanes poseían la fuerza primigenia para abrir nuevos caminos y llevar la luz donde había oscuridad.",
   d:"Para el perfil visionario que propone ideas disruptivas, impulsa proyectos de innovación y prepara a su entorno para los retos del mañana."},
  {id:"c12", n:"La Armonía de las Musas", f:"Teamwork", fe:"Trabajo en equipo",
   m:"Nueve diosas que coordinaban sus talentos para crear una sinfonía donde todos brillaban juntos.",
   d:"Para el colaborador o equipo que fomenta la sinergia entre áreas, conecta departamentos y demuestra que el trabajo articulado nos hace imparables."}
];

var SHEET_VOTES = "Votos";
var SHEET_PEOPLE = "Votados";        // lista de personas que se pueden elegir
var SHEET_PEOPLE_OLD = "Personas";   // nombre anterior de la pestaña (se sigue aceptando)
var SHEET_CONFIG = "Config";
var VOTE_HEADERS = ["Fecha", "Votante", "CategoriaID", "Categoria", "NominadoCorreo", "NominadoNombre", "Ciudad"];
var CITIES = ["Lima"];   // Perú tiene una sola sede: se asigna sola

/* ---------------- web app ---------------- */

function doGet() {
  ensureSheets_();
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("Smart Elysium Perú")
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

/** Ejecuta esto una vez desde el editor para crear las hojas y autorizar el script. */
function setup() {
  ensureSheets_();
}

/* ---------------- API usada por la página ---------------- */

function getInitialData() {
  ensureSheets_();
  var me = currentEmail_();
  var cfg = readConfig_();
  var mine = me ? readMine_(me) : { picks: {}, city: "", sent: false };
  return {
    me: me,
    isAdmin: isAdmin_(me, cfg),
    status: cfg.estado,
    cats: CATS,
    cities: CITIES,
    people: readPeople_(),
    myPicks: mine.picks,
    myCity: mine.city,
    sent: mine.sent,
    results: cfg.estado === "publicada" ? safeJson_(cfg.resultados) : null
  };
}

/**
 * Envía los votos una sola vez: picks = { catId: {name, email} }, city = "Lima".
 * Exige sede y al menos una categoría; no permite volver a enviar ni cambiar.
 */
function submitVotes(picks, city) {
  var me = requireVoter_();
  if (readConfig_().estado !== "abierta") throw new Error("La votación está cerrada.");
  city = String(city || "").trim();
  if (CITIES.length === 1 && !city) city = CITIES[0];
  if (CITIES.indexOf(city) < 0) throw new Error("Sede no válida.");
  picks = picks || {};
  var rows = [];
  Object.keys(picks).forEach(function (catId) {
    var cat = findCat_(catId);
    var p = picks[catId] || {};
    var email = normEmail_(p.email);
    var name = String(p.name || "").trim().slice(0, 80);
    if (!name) return;
    if (email && email === me) throw new Error("No puedes votar por ti mismo (" + cat.n + ").");
    rows.push([new Date(), me, cat.id, cat.n, email, name, city]);
  });
  if (!rows.length) throw new Error("Elige al menos un nominado antes de enviar.");
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (readMine_(me).sent) throw new Error("Ya enviaste tus votos. No se pueden cambiar.");
    var sh = sheet_(SHEET_VOTES);
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    addNewPeople_(rows);
  } finally {
    lock.releaseLock();
  }
  return getInitialData();
}

/* ---------------- organizadores ---------------- */

function getTally() {
  requireAdmin_();
  var rows = readVotes_();
  var out = { status: readConfig_().estado, all: summary_(rows), byCity: {} };
  CITIES.forEach(function (c) {
    out.byCity[c] = summary_(rows.filter(function (r) { return r.city === c; }));
  });
  return out;
}

/** status: "abierta" | "cerrada" | "publicada" */
function setStatus(status) {
  requireAdmin_();
  if (["abierta", "cerrada", "publicada"].indexOf(status) < 0) throw new Error("Estado no válido.");
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (status === "publicada") {
      var rows = readVotes_();
      var results = {};
      CITIES.forEach(function (c) {
        var t = tally_(rows.filter(function (r) { return r.city === c; }));
        results[c] = {};
        Object.keys(t).forEach(function (cid) {
          results[c][cid] = t[cid].slice(0, 3).map(function (x) { return { name: x.name, count: x.count }; });
        });
      });
      writeConfig_("resultados", JSON.stringify(results));
      writeConfig_("publicada_el", new Date());
    } else {
      writeConfig_("resultados", "");
    }
    writeConfig_("estado", status);
  } finally {
    lock.releaseLock();
  }
  return getInitialData();
}

function summary_(rows) {
  var voters = {};
  rows.forEach(function (r) { voters[r.voter] = true; });
  return { tally: tally_(rows), voters: Object.keys(voters).length };
}

/* ---------------- helpers ---------------- */

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheet_(name) { return ss_().getSheetByName(name); }

function ensureSheets_() {
  var ss = ss_();
  var v = ss.getSheetByName(SHEET_VOTES);
  if (!v) {
    v = ss.insertSheet(SHEET_VOTES);
    v.appendRow(VOTE_HEADERS);
    v.setFrozenRows(1);
  } else if (String(v.getRange(1, 7).getValue()) !== "Ciudad") {
    v.getRange(1, 7).setValue("Ciudad");
  }
  if (!peopleSheet_()) {
    var p = ss.insertSheet(SHEET_PEOPLE);
    p.appendRow(["Nombre", "Correo", "Área", "Origen"]);
    p.setFrozenRows(1);
  }
  if (!ss.getSheetByName(SHEET_CONFIG)) {
    var c = ss.insertSheet(SHEET_CONFIG);
    c.appendRow(["Clave", "Valor", "Notas"]);
    c.appendRow(["estado", "abierta", "abierta | cerrada | publicada"]);
    c.appendRow(["organizadores", "", "Correos separados por coma. El dueño del script siempre es organizador."]);
    c.appendRow(["resultados", "", "Lo llena el botón Publicar resultados"]);
    c.appendRow(["publicada_el", "", ""]);
    c.setFrozenRows(1);
  }
}

function readConfig_() {
  var values = sheet_(SHEET_CONFIG).getDataRange().getValues();
  var cfg = { estado: "abierta", organizadores: "", resultados: "" };
  for (var i = 1; i < values.length; i++) {
    var k = String(values[i][0]).trim();
    if (k) cfg[k] = values[i][1];
  }
  cfg.estado = String(cfg.estado || "abierta").trim().toLowerCase();
  return cfg;
}

function writeConfig_(key, value) {
  var sh = sheet_(SHEET_CONFIG);
  var values = sh.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === key) { sh.getRange(i + 1, 2).setValue(value); return; }
  }
  sh.appendRow([key, value, ""]);
}

function currentEmail_() {
  return normEmail_(Session.getActiveUser().getEmail());
}

function requireVoter_() {
  var me = currentEmail_();
  if (!me) throw new Error("No pudimos identificar tu cuenta. Entra con tu correo corporativo.");
  return me;
}

function isAdmin_(me, cfg) {
  if (!me) return false;
  var owner = normEmail_(Session.getEffectiveUser().getEmail());
  if (me === owner) return true;
  return String(cfg.organizadores || "").split(/[,;\s]+/).map(normEmail_).indexOf(me) >= 0;
}

function requireAdmin_() {
  var me = requireVoter_();
  if (!isAdmin_(me, readConfig_())) throw new Error("Solo los organizadores pueden hacer esto.");
  return me;
}

function findCat_(id) {
  for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i];
  throw new Error("Categoría no válida.");
}

function readVotes_() {
  var values = sheet_(SHEET_VOTES).getDataRange().getValues();
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (!r[1] || !r[2]) continue;
    out.push({ voter: normEmail_(r[1]), cat: String(r[2]), email: normEmail_(r[4]), name: String(r[5] || "").trim(), city: String(r[6] || "").trim() });
  }
  return out;
}

function readMine_(me) {
  var picks = {}, city = "", sent = false;
  readVotes_().forEach(function (r) {
    if (r.voter === me) { picks[r.cat] = { email: r.email, name: r.name }; city = r.city || city; sent = true; }
  });
  return { picks: picks, city: city, sent: sent };
}

function peopleSheet_() {
  return ss_().getSheetByName(SHEET_PEOPLE) || ss_().getSheetByName(SHEET_PEOPLE_OLD);
}

/** Lista actualizada de personas; la página la vuelve a pedir cada minuto. */
function getPeople() {
  requireVoter_();
  return readPeople_();
}

/** Agrega a la pestaña de votados los nombres nuevos que escribieron los votantes. */
function addNewPeople_(rows) {
  var sh = peopleSheet_();
  var known = {};
  readPeople_().forEach(function (p) { known[normName_(p.name)] = true; });
  var add = [];
  rows.forEach(function (r) {
    var key = normName_(r[5]);
    if (!r[4] && key && !known[key]) { known[key] = true; add.push([r[5], "", "", "Agregado al votar"]); }
  });
  if (add.length) sh.getRange(sh.getLastRow() + 1, 1, add.length, 4).setValues(add);
}

function readPeople_() {
  var sh = peopleSheet_();
  if (!sh) return [];
  var values = sh.getDataRange().getValues();
  var out = [], seen = {};
  for (var i = 0; i < values.length; i++) {
    var name = String(values[i][0] || "").replace(/\s+/g, " ").trim();
    if (!name) continue;
    if (i === 0 && /nombre|name|colaborador/i.test(name)) continue;   // fila de títulos
    var key = normName_(name);
    if (seen[key]) continue;
    seen[key] = true;
    var b = String(values[i][1] || "").trim(), c = String(values[i][2] || "").trim();
    var email = b.indexOf("@") > 0 ? normEmail_(b) : "";
    var area = email ? c : (b && b.indexOf("@") < 0 ? b : c);
    out.push({ name: name, email: email, area: area.slice(0, 60) });
  }
  return out;
}

function tally_(rows) {
  var t = {};
  CATS.forEach(function (c) { t[c.id] = {}; });
  rows.forEach(function (r) {
    if (!t[r.cat] || !r.name) return;
    var key = r.email ? "e:" + r.email : "n:" + normName_(r.name);
    if (!t[r.cat][key]) t[r.cat][key] = { name: r.name, email: r.email, count: 0 };
    t[r.cat][key].count++;
  });
  var out = {};
  Object.keys(t).forEach(function (cid) {
    out[cid] = Object.keys(t[cid]).map(function (k) { return t[cid][k]; })
      .sort(function (a, b) { return b.count - a.count || a.name.localeCompare(b.name); });
  });
  return out;
}

function normEmail_(e) { return String(e || "").trim().toLowerCase(); }
function normName_(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
}
function safeJson_(s) { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } }
