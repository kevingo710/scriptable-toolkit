// ============================================================
// Resumen matutino para Scriptable
// Junta clima, calendario, recordatorios, batería y más,
// y devuelve un texto listo para que Atajos lo lea en voz alta.
// ============================================================

const CONFIG = {
  name: "",                     // Tu nombre para el saludo, ej. "Ana" (vacío = sin nombre)
  // Ubicación de respaldo si el GPS falla (ej. Madrid):
  fallbackLocation: { lat: 40.42, lon: -3.70, city: "Madrid" },
  excludedCalendars: [],        // Calendarios a ignorar, ej. ["Festivos", "Trabajo antiguo"]
  maxEvents: 6,             // Máximo de eventos que se leen con detalle
  maxReminders: 6,          // Máximo de tareas que se leen
  includeAirQuality: true,
  includeTomorrow: true,    // Avance del primer evento de mañana
  includeQuote: true,       // Frase para arrancar el día
  batteryWarning: 0.3,      // Avisa si la batería está por debajo (30 %)
}

// ---------- Utilidades ----------
const now = new Date()
const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0)
const endOfToday = new Date(startOfToday); endOfToday.setDate(endOfToday.getDate() + 1)

function fmt(date, pattern) {
  const df = new DateFormatter()
  df.locale = "es_ES"
  df.dateFormat = pattern
  return df.string(date)
}
const hora = (d) => fmt(d, "H:mm")

function listJoin(items) {
  if (items.length <= 1) return items.join("")
  return items.slice(0, -1).join(", ") + " y " + items[items.length - 1]
}

function durText(mins) {
  if (mins < 60) return `${mins} ${mins === 1 ? "minuto" : "minutos"}`
  const h = Math.floor(mins / 60), m = mins % 60
  const hs = `${h} ${h === 1 ? "hora" : "horas"}`
  return m ? `${hs} y ${m} minutos` : hs
}

const clean = (s) => (s || "")
  .replace(/\p{Extended_Pictographic}/gu, "")   // emojis
  .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "")        // banderas
  .replace(/[\u{1F3FB}-\u{1F3FF}]/gu, "")        // tonos de piel
  .replace(/[\u200D\uFE0F\u20E3]/g, "")          // caracteres invisibles de unión
  .replace(/\s+/g, " ")
  .trim()

async function safe(fn) {
  try { return await fn() } catch (e) { console.log(`Error: ${e}`); return null }
}

// ---------- Saludo y fecha ----------
function greetingText() {
  const h = now.getHours()
  const base = h < 12 ? "Buenos días" : h < 20 ? "Buenas tardes" : "Buenas noches"
  const saludo = CONFIG.name ? `${base}, ${CONFIG.name}.` : `${base}.`
  let s = `${saludo} Hoy es ${fmt(now, "EEEE d 'de' MMMM")}, son las ${hora(now)}.`
  const dow = now.getDay()
  if (dow === 1) s += " Arranca la semana."
  if (dow === 5) s += " Es viernes, último empujón de la semana."
  if (dow === 0 || dow === 6) s += " Es fin de semana."
  return s
}

// ---------- Ubicación ----------
async function getLocation() {
  try {
    Location.setAccuracyToThreeKilometers()
    const loc = await Location.current()
    let city = ""
    try {
      const geo = await Location.reverseGeocode(loc.latitude, loc.longitude, "es_ES")
      city = (geo && geo[0] && geo[0].locality) || ""
    } catch (e) {}
    return { lat: loc.latitude, lon: loc.longitude, city }
  } catch (e) {
    return CONFIG.fallbackLocation
  }
}

// ---------- Clima (Open-Meteo, gratis y sin clave) ----------
const WMO = {
  0: "despejado", 1: "mayormente despejado", 2: "parcialmente nublado", 3: "nublado",
  45: "niebla", 48: "niebla con escarcha",
  51: "llovizna ligera", 53: "llovizna", 55: "llovizna intensa",
  56: "llovizna helada", 57: "llovizna helada intensa",
  61: "lluvia ligera", 63: "lluvia", 65: "lluvia fuerte",
  66: "lluvia helada", 67: "lluvia helada fuerte",
  71: "nevada ligera", 73: "nieve", 75: "nevada fuerte", 77: "granizo fino",
  80: "chubascos ligeros", 81: "chubascos", 82: "chubascos fuertes",
  85: "chubascos de nieve", 86: "chubascos de nieve fuertes",
  95: "tormenta", 96: "tormenta con granizo", 99: "tormenta fuerte con granizo",
}

async function weatherText(loc) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
    `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m` +
    `&hourly=precipitation_probability` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunset` +
    `&timezone=auto&forecast_days=1`
  const d = await new Request(url).loadJSON()
  const c = d.current, day = d.daily
  const parts = []

  const t = Math.round(c.temperature_2m)
  const feels = Math.round(c.apparent_temperature)
  const place = loc.city ? ` en ${loc.city}` : ""
  let s = `Ahora mismo${place} hace ${t} grados, ${WMO[c.weather_code] || "tiempo variable"}`
  if (Math.abs(feels - t) >= 3) s += `, con sensación térmica de ${feels}`
  parts.push(s + ".")

  const max = Math.round(day.temperature_2m_max[0])
  const min = Math.round(day.temperature_2m_min[0])
  parts.push(`Previsión del día: ${WMO[day.weather_code[0]] || "variable"}, máxima de ${max} y mínima de ${min}.`)

  // Lluvia: probabilidad y a partir de qué hora
  const rainProb = day.precipitation_probability_max[0]
  if (rainProb >= 40) {
    const nowH = now.getHours()
    let rainHour = null
    d.hourly.time.forEach((ts, i) => {
      const h = parseInt(ts.slice(11, 13), 10)
      if (rainHour === null && h >= nowH && d.hourly.precipitation_probability[i] >= 50) rainHour = h
    })
    parts.push(`Probabilidad de lluvia del ${rainProb} por ciento${rainHour !== null ? `, sobre todo a partir de las ${rainHour}` : ""}. Lleva paraguas.`)
  }

  // Consejos de ropa y demás
  const tips = []
  if (min <= 8) tips.push("abrígate bien")
  else if (min <= 14) tips.push("lleva algo de abrigo")
  if (max - min >= 10) tips.push("vístete por capas, hay mucha diferencia de temperatura")
  if (day.uv_index_max[0] >= 6) tips.push("usa protector solar, el índice UV será alto")
  if (c.wind_speed_10m >= 35) tips.push(`hay viento fuerte, unos ${Math.round(c.wind_speed_10m)} kilómetros por hora`)
  if (tips.length) parts.push(`Consejo: ${listJoin(tips)}.`)

  parts.push(`El sol se pone a las ${day.sunset[0].slice(11, 16).replace(/^0/, "")}.`)
  return parts.join(" ")
}

async function airText(loc) {
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.lat}&longitude=${loc.lon}&current=european_aqi&timezone=auto`
  const d = await new Request(url).loadJSON()
  const aqi = d.current && d.current.european_aqi
  if (aqi == null || aqi <= 40) return null // Solo avisa si no es buena
  const level = aqi <= 60 ? "moderada" : aqi <= 80 ? "mala" : aqi <= 100 ? "muy mala" : "extremadamente mala"
  return `La calidad del aire hoy es ${level}.`
}

// ---------- Calendario ----------
async function getCalendars() {
  const cals = await Calendar.forEvents()
  return cals.filter((c) => !CONFIG.excludedCalendars.includes(c.title))
}

function isValidLocation(loc) {
  return loc && !/^https?:\/\//i.test(loc.trim())
}

async function eventsText(cals) {
  const evs = (await CalendarEvent.today(cals))
    .filter((e) => e.isAllDay || e.endDate > now)
    .sort((a, b) => a.startDate - b.startDate)

  if (!evs.length) return "No tienes eventos en el calendario hoy."

  const allDay = evs.filter((e) => e.isAllDay)
  const timed = evs.filter((e) => !e.isAllDay)
  const parts = [`Hoy tienes ${evs.length} ${evs.length === 1 ? "evento" : "eventos"}.`]

  if (allDay.length) parts.push(`Durante todo el día: ${listJoin(allDay.map((e) => clean(e.title)))}.`)

  const shown = timed.slice(0, CONFIG.maxEvents)
  for (const e of shown) {
    let s = `A las ${hora(e.startDate)}, ${clean(e.title)}`
    if (isValidLocation(e.location)) s += `, en ${clean(e.location.split("\n")[0])}`
    parts.push(s + ".")
  }
  if (timed.length > shown.length) parts.push(`Y ${timed.length - shown.length} más.`)

  const next = timed.find((e) => e.startDate > now)
  if (next) {
    const mins = Math.round((next.startDate - now) / 60000)
    if (mins <= 180) parts.push(`El primero empieza en ${durText(mins)}.`)
  }
  return parts.join(" ")
}

async function tomorrowText(cals) {
  const evs = (await CalendarEvent.tomorrow(cals))
    .filter((e) => !e.isAllDay)
    .sort((a, b) => a.startDate - b.startDate)
  if (!evs.length) return null
  return `Para mañana, tu primer compromiso es ${clean(evs[0].title)} a las ${hora(evs[0].startDate)}.`
}

// ---------- Recordatorios ----------
async function remindersText() {
  const incomplete = await Reminder.allIncomplete()
  const today = [], overdue = []
  for (const r of incomplete) {
    if (!r.dueDate) continue
    if (r.dueDate < startOfToday) overdue.push(r)
    else if (r.dueDate < endOfToday) today.push(r)
  }
  // Prioridad alta primero (1 = alta, 9 = baja, 0 = sin prioridad)
  const prio = (r) => (r.priority === 0 ? 10 : r.priority)
  today.sort((a, b) => prio(a) - prio(b) || a.dueDate - b.dueDate)
  overdue.sort((a, b) => a.dueDate - b.dueDate)

  const parts = []
  if (today.length) {
    const shown = today.slice(0, CONFIG.maxReminders).map((r) => clean(r.title))
    parts.push(`Tus tareas para hoy son: ${listJoin(shown)}${today.length > shown.length ? `, y ${today.length - shown.length} más` : ""}.`)
  } else {
    parts.push("No tienes tareas programadas para hoy.")
  }
  if (overdue.length) {
    const shown = overdue.slice(0, 3).map((r) => clean(r.title))
    parts.push(`Tienes ${overdue.length} ${overdue.length === 1 ? "tarea atrasada" : "tareas atrasadas"}: ${listJoin(shown)}${overdue.length > 3 ? ", entre otras" : ""}.`)
  }
  return parts.join(" ")
}

// ---------- Batería ----------
function batteryText() {
  const level = Device.batteryLevel()
  if (Device.isCharging() || level >= CONFIG.batteryWarning) return null
  return `Tu batería está al ${Math.round(level * 100)} por ciento, cárgala antes de salir.`
}

// ---------- Frase para arrancar ----------
const QUOTES = [
  "Hoy no hace falta hacerlo todo, solo lo importante.",
  "Empieza por la tarea que más pereza te da y el resto será cuesta abajo.",
  "Un buen día se construye con pequeñas victorias.",
  "La constancia gana a la motivación. Hoy toca cumplir.",
  "Respira, organiza y ataca una cosa cada vez.",
  "Lo que hagas hoy lo agradecerá tu yo de mañana.",
  "No busques el día perfecto, haz que este cuente.",
  "Energía arriba: agua, movimiento y foco.",
  "Termina lo que empieces y el día se ordenará solo.",
  "Cada mañana es un nuevo intento. Aprovéchalo.",
]
const quoteText = () => QUOTES[Math.floor(Math.random() * QUOTES.length)]

// ---------- Montaje ----------
const sections = [greetingText()]

const loc = await safe(getLocation)
if (loc) {
  sections.push(await safe(() => weatherText(loc)))
  if (CONFIG.includeAirQuality) sections.push(await safe(() => airText(loc)))
} else {
  sections.push("No he podido obtener tu ubicación para el clima.")
}

const cals = await safe(getCalendars)
if (cals) {
  sections.push(await safe(() => eventsText(cals)))
}
sections.push(await safe(remindersText))
if (cals && CONFIG.includeTomorrow) sections.push(await safe(() => tomorrowText(cals)))
sections.push(await safe(async () => batteryText()))
if (CONFIG.includeQuote) sections.push(quoteText())
sections.push("Que tengas un gran día.")

const text = sections.filter(Boolean).join(" ")

// ---------- Salida ----------
if (config.runsInApp) {
  // Modo prueba: lo muestra y lo lee desde la propia app
  Speech.speak(text)
  await QuickLook.present(text)
}
Script.setShortcutOutput(text)
Script.complete()
