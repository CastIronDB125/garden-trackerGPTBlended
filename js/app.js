const STORAGE_KEY = 'garden-tracker-blended-v3';
const HOURLY_PROFILE_KEY = 'garden-tracker-hourly-profile';
const HOURLY_PROFILE_MODE_KEY = 'garden-tracker-hourly-profile-mode';
let plants = [];
let selectedId = null;
let currentTab = 'overview';
let currentFilter = 'All';
let weather = null;
let hourlyProfile = localStorage.getItem(HOURLY_PROFILE_KEY) || 'general';
let hourlyProfileMode = localStorage.getItem(HOURLY_PROFILE_MODE_KEY) || 'auto';
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
function isoToday() { return new Date().toISOString().slice(0, 10); }
function fmtDate(iso) { return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
function fmtTime(isoString) { return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
function fmtHour(isoString) { return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric' }); }
function daysSince(iso) { return Math.floor((TODAY - new Date(iso + 'T00:00:00')) / 86400000); }
function daysUntil(iso) { return Math.ceil((new Date(iso + 'T00:00:00') - TODAY) / 86400000); }
function addDays(iso, days) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }
function photoperiodHours(start, end) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return (mins / 60).toFixed(1);
}
function weatherCodeLabel(code) {
  if (code === 0) return 'Clear';
  if ([1,2].includes(code)) return 'Mostly clear';
  if (code === 3) return 'Cloudy';
  if ([45,48].includes(code)) return 'Fog';
  if ([51,53,55,56,57].includes(code)) return 'Drizzle';
  if ([61,63,65,66,67,80,81,82].includes(code)) return 'Rain';
  if ([71,73,75,77,85,86].includes(code)) return 'Snow';
  if ([95,96,99].includes(code)) return 'Thunder';
  return 'Mixed';
}
function weatherCodeIcon(code) {
  if (code === 0) return '☀';
  if ([1,2].includes(code)) return '⛅';
  if (code === 3) return '☁';
  if ([45,48].includes(code)) return '🌫';
  if ([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code)) return '🌧';
  if ([71,73,75,77,85,86].includes(code)) return '❄';
  if ([95,96,99].includes(code)) return '⛈';
  return '•';
}

function $(id) { return document.getElementById(id); }
function setText(id, text) { const el = $(id); if (el) el.textContent = text; }
function setHTML(id, html) { const el = $(id); if (el) el.innerHTML = html; }
function setClass(id, className) { const el = $(id); if (el) el.className = className; }
function isoNow() { return new Date().toISOString(); }
function humanDateTime(isoLike) {
  if (!isoLike) return '—';
  const d = new Date(isoLike);
  return Number.isNaN(d.getTime()) ? String(isoLike) : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function displayDateOnly(isoLike) {
  if (!isoLike) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoLike)) return fmtDate(isoLike);
  const d = new Date(isoLike);
  return Number.isNaN(d.getTime()) ? String(isoLike) : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function safeArray(arr) { return Array.isArray(arr) ? arr : []; }

function hourlyWindowForToday() {
  if (!weather?.hourly?.time) return [];
  const todayIso = isoToday();
  return weather.hourly.time.map((time, i) => ({
    time,
    temperature: weather.hourly.temperature_2m?.[i],
    apparent: weather.hourly.apparent_temperature?.[i],
    humidity: weather.hourly.relative_humidity_2m?.[i],
    precipProb: weather.hourly.precipitation_probability?.[i] || 0,
    precip: weather.hourly.precipitation?.[i] || 0,
    wind: weather.hourly.wind_speed_10m?.[i] || 0,
    gust: weather.hourly.wind_gusts_10m?.[i] || 0,
    uv: weather.hourly.uv_index?.[i] || 0,
    isDay: !!weather.hourly.is_day?.[i],
    code: weather.hourly.weather_code?.[i] ?? 0,
  })).filter(h => h.time.startsWith(todayIso));
}
const HOURLY_PROFILES = {
  general: {
    label: 'General',
    note: 'Balanced timing for mixed outdoor container crops when you want one sane default instead of weather-themed chaos.',
    outside: { idealMin: 58, idealMax: 78, okayMin: 48, okayMax: 84, windGood: 8, windOkay: 14, gustBad: 24, rainGood: 20, rainOkay: 45, uvWarn: 7, coldBad: 40, heatBad: 88, nightFloor: 55 },
    watering: { idealMin: 48, idealMax: 72, okayMax: 82, windGood: 10, rainOkay: 40, uvGood: 3 }
  },
  lettuce: {
    label: 'Lettuce / cool crops',
    note: 'Prefers cool, bright, calmer hours. This profile tolerates chill better and gets suspicious of heat much sooner.',
    outside: { idealMin: 45, idealMax: 68, okayMin: 34, okayMax: 74, windGood: 9, windOkay: 14, gustBad: 22, rainGood: 25, rainOkay: 50, uvWarn: 6, coldBad: 28, heatBad: 80, nightFloor: 38 },
    watering: { idealMin: 42, idealMax: 66, okayMax: 74, windGood: 9, rainOkay: 50, uvGood: 4 }
  },
  tomato: {
    label: 'Tomatoes',
    note: 'Likes warm-up windows and mild sun. Nights under 50°F get side-eye from this profile.',
    outside: { idealMin: 58, idealMax: 80, okayMin: 50, okayMax: 86, windGood: 8, windOkay: 14, gustBad: 22, rainGood: 20, rainOkay: 40, uvWarn: 7, coldBad: 45, heatBad: 90, nightFloor: 50 },
    watering: { idealMin: 50, idealMax: 74, okayMax: 84, windGood: 10, rainOkay: 40, uvGood: 3 }
  },
  pepper: {
    label: 'Peppers',
    note: 'Warmer and more delicate than tomatoes. Good exposure starts later and ends earlier when the air turns rude.',
    outside: { idealMin: 64, idealMax: 84, okayMin: 56, okayMax: 88, windGood: 7, windOkay: 12, gustBad: 20, rainGood: 15, rainOkay: 35, uvWarn: 7, coldBad: 50, heatBad: 92, nightFloor: 55 },
    watering: { idealMin: 54, idealMax: 76, okayMax: 86, windGood: 9, rainOkay: 35, uvGood: 3 }
  },
  superhot: {
    label: 'Superhots',
    note: 'Absolute heat goblins. This profile wants cozy temps, sheltered air, and almost no nonsense from wind or cold nights.',
    outside: { idealMin: 68, idealMax: 86, okayMin: 60, okayMax: 90, windGood: 6, windOkay: 10, gustBad: 18, rainGood: 10, rainOkay: 25, uvWarn: 6, coldBad: 55, heatBad: 94, nightFloor: 60 },
    watering: { idealMin: 58, idealMax: 78, okayMax: 88, windGood: 8, rainOkay: 30, uvGood: 3 }
  },
  bonsai: {
    label: 'Bonsai seedlings',
    note: 'Hardier to cool air than peppers, but still not fans of wind-whip, soggy media, or fresh-seedling drama.',
    outside: { idealMin: 48, idealMax: 72, okayMin: 36, okayMax: 80, windGood: 8, windOkay: 13, gustBad: 20, rainGood: 20, rainOkay: 45, uvWarn: 7, coldBad: 32, heatBad: 86, nightFloor: 40 },
    watering: { idealMin: 44, idealMax: 68, okayMax: 78, windGood: 10, rainOkay: 45, uvGood: 4 }
  }
};

function profileRules(profileKey) {
  return HOURLY_PROFILES[profileKey] || HOURLY_PROFILES.general;
}
function suggestedProfileForPlant(p) {
  if (!p) return 'general';
  if (p.category === 'Lettuce') return 'lettuce';
  if (p.category === 'Tomato') return 'tomato';
  if (p.category === 'Pepper') {
    return /ghost|reaper|primo|chinense|habanero/i.test(`${p.variety} ${p.name}`) ? 'superhot' : 'pepper';
  }
  if (p.category === 'Bonsai') return 'bonsai';
  return 'general';
}
function activeHourlyProfile() {
  if (hourlyProfileMode === 'auto') {
    const selectedPlant = plants.find(x => x.id === selectedId);
    return suggestedProfileForPlant(selectedPlant);
  }
  return hourlyProfile;
}
function activeHourlyProfileMeta() {
  const key = activeHourlyProfile();
  const selectedPlant = plants.find(x => x.id === selectedId);
  if (hourlyProfileMode === 'auto') {
    if (selectedPlant) return { key, source: `Auto from ${selectedPlant.name}`, plant: selectedPlant };
    return { key, source: 'Auto default', plant: null };
  }
  return { key, source: 'Manual override', plant: selectedPlant || null };
}
function destinationWeatherMode(meta = activeHourlyProfileMeta()) {
  const plant = meta?.plant || null;
  if (hourlyProfileMode !== 'auto' || !plant) {
    return { enabled: true, reason: '', action: '', plant };
  }
  if (plant.permanentIndoor || /permanent indoor/i.test(plant.destination || '')) {
    const label = plant.method === 'DWC' ? 'Permanent indoor DWC crop' : 'Permanent indoor plant';
    return {
      enabled: false,
      reason: `${label}. Outdoor timing is suppressed while Auto follows destination-aware logic.`,
      action: 'This plant lives indoors full-time, so hardening and bring-back windows are not relevant unless you switch to Manual override for temporary trips outside.',
      plant
    };
  }
  if (plant.hardenOff === false) {
    return {
      enabled: false,
      reason: `Destination-aware Auto mode sees ${plant.name} as a non-hardening plant.`,
      action: 'Outdoor timing is hidden because this plant is not marked for hardening or regular outdoor residence.',
      plant
    };
  }
  return { enabled: true, reason: '', action: '', plant };
}

function destinationWateringAdvice(meta = activeHourlyProfileMeta()) {
  const plant = meta?.plant || null;
  if (!plant) {
    return {
      windowLabel: 'Check plant panel',
      note: 'No plant selected, so watering advice stays generic.',
      stripMessage: 'Select a plant to swap generic forecast timing for destination-aware watering notes.'
    };
  }

  const latestSoilNote = () => {
    const stage = (plant.stage || '').toLowerCase();
    if (/seeds — sown, not sprouted|just germinated|cotyledons|true leaves/.test(stage)) {
      return 'Keep only the seedling zone evenly moist. Avoid soaking the whole container.';
    }
    if (/early vegetative|vegetative/.test(stage)) {
      return 'Water in a ring around the active root zone, then allow a light dry-back before the next pass.';
    }
    return 'Water only when the upper mix has begun drying and the container feels lighter.';
  };

  if (plant.method === 'DWC') {
    const dwc = latestDwcHealth(plant);
    return {
      windowLabel: 'Check AM / PM',
      note: `${meta.source}: indoor DWC routine — ${dwc.label.toLowerCase()}. ${dwc.note} Verify water level, bubbles, pH, EC/PPM, and solution temperature instead of using outdoor weather windows.`,
      stripMessage: `${plant.name} is permanent indoor DWC. Use the morning and evening check cadence: confirm air pump noise, splash/moisture at the net cup, root color, pH drift, EC/PPM, and water temperature.`
    };
  }

  if (plant.permanentIndoor || /permanent indoor/i.test(plant.destination || '')) {
    let note = latestSoilNote();
    if (plant.category === 'Herb') {
      if (/basil/i.test(plant.name)) note = 'Keep basil lightly and evenly moist while small, but do not keep the whole bowl soggy.';
      else if (/thyme/i.test(plant.name)) note = 'Err dry rather than wet. Tiny thyme roots hate living in a bog.';
      else if (/oregano/i.test(plant.name)) note = 'Water lightly, then let the surface breathe a bit. Thin crowded growth before it becomes a tiny forest brawl.';
      else if (/rosemary/i.test(plant.name)) note = 'Rosemary seed trays should stay barely moist, never swampy; patience beats pouring.';
    }
    const next = nextWaterCheckInfo(plant);
    return {
      windowLabel: next.label,
      note: `${meta.source}: ${note} ${next.note}`,
      stripMessage: `${plant.name} stays indoors, so use soil feel and pot weight instead of forecast timing. At your current 66–69°F and ~59% RH, broad every-other-day watering is probably too frequent for several small root systems in large pots.`
    };
  }

  if (plant.method === 'Bonsai') {
    return {
      windowLabel: 'Moist, not swampy',
      note: `${meta.source}: bonsai seedlings want evenly moist media with sharp drainage. Water thoroughly, then wait for slight surface drying — not chronic wet feet.`,
      stripMessage: `${plant.name} is a bonsai seedling. Think measured moisture, airflow, and drainage. Conifers especially do not want to be loved into mush.`
    };
  }

  const next = nextWaterCheckInfo(plant);
  return {
    windowLabel: next.label,
    note: `${meta.source}: for indoor waiting periods, water the root zone rather than the whole oversized container. ${next.note}`,
    stripMessage: `${plant.name} is not using outdoor timing right now. Check the top inch, pot weight, and root-zone dryness before watering again.`
  };
}
function scoreHourForOutdoors(hour, profileKey = hourlyProfile) {
  const r = profileRules(profileKey).outside;
  let score = 0;
  if (!hour.isDay) score -= 4;
  if (hour.temperature >= r.idealMin && hour.temperature <= r.idealMax) score += 3;
  else if (hour.temperature >= r.okayMin && hour.temperature <= r.okayMax) score += 1;
  if (hour.temperature < r.coldBad) score -= 3;
  if (hour.temperature > r.heatBad) score -= 2;
  if (hour.precipProb <= r.rainGood) score += 2;
  else if (hour.precipProb <= r.rainOkay) score += 1;
  else if (hour.precipProb >= 70) score -= 2;
  if (hour.wind <= r.windGood) score += 2;
  else if (hour.wind <= r.windOkay) score += 1;
  else score -= 1;
  if ((hour.gust || 0) > r.gustBad) score -= 1;
  if (hour.uv >= r.uvWarn) score -= 1;
  return score;
}
function scoreHourForWatering(hour, profileKey = hourlyProfile) {
  const r = profileRules(profileKey).watering;
  let score = 0;
  if (hour.isDay && hour.uv <= r.uvGood) score += 2;
  if (!hour.isDay || hour.uv < 1) score += 1;
  if (hour.temperature >= r.idealMin && hour.temperature <= r.idealMax) score += 2;
  else if (hour.temperature > r.okayMax) score -= 2;
  if (hour.wind <= r.windGood) score += 1;
  if (hour.precipProb <= r.rainOkay) score += 1;
  return score;
}
function classifyScore(score) {
  if (score >= 5) return 'good';
  if (score >= 2) return 'okay';
  return 'bad';
}
function summarizeHourTask(hour, profileKey = hourlyProfile) {
  const rules = profileRules(profileKey);
  const outsideScore = classifyScore(scoreHourForOutdoors(hour, profileKey));
  const wateringScore = classifyScore(scoreHourForWatering(hour, profileKey));
  let action = 'avoid outdoor exposure';
  if (outsideScore === 'good') action = hour.uv >= rules.outside.uvWarn ? 'good for shade-first hardening' : 'good for hardening';
  else if (outsideScore === 'okay') action = 'brief sheltered exposure only';
  let watering = 'skip watering unless the pots are truly dry';
  if (wateringScore === 'good') watering = 'decent watering window';
  else if (wateringScore === 'okay') watering = 'watering is okay but not elegant';
  return { outsideScore, wateringScore, action, watering };
}
function bringInReason(hour, profileKey = hourlyProfile) {
  const r = profileRules(profileKey).outside;
  if (!hour.isDay) return 'darkness starts';
  if (hour.temperature < r.nightFloor) return `temps slip below ${r.nightFloor}°F comfort`; 
  if (hour.precipProb >= Math.max(55, r.rainOkay + 10)) return 'rain odds turn rude';
  if (hour.wind > r.windOkay || (hour.gust || 0) > r.gustBad) return 'wind gets pushy';
  return '';
}
function contiguousLabel(hours) {
  if (!hours.length) return 'None';
  return `${fmtHour(hours[0].time)}–${fmtHour(hours[hours.length - 1].time)}`;
}
function savePlants() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
  const el = $('save-msg');
  if (!el) return;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => el.style.opacity = '0', 1800);
}
function loadPlants() {
  const raw = localStorage.getItem(STORAGE_KEY);
  try {
    plants = (raw ? JSON.parse(raw) : clone(PLANT_DATA)).map(normalizePlant);
  } catch {
    plants = clone(PLANT_DATA).map(normalizePlant);
  }
}
function cat(p) {
  if (p.method === 'DWC') return 'DWC';
  if (p.method === 'Bonsai') return 'Bonsai';
  if (p.category === 'Uncertain Seed') return 'Uncertain';
  return 'Soil';
}
function normalizePlant(p) {
  return {
    ...p,
    notes: Array.isArray(p.notes) ? p.notes : [],
    feeds: Array.isArray(p.feeds) ? p.feeds : [],
    phLog: Array.isArray(p.phLog) ? p.phLog : [],
    ecLog: Array.isArray(p.ecLog) ? p.ecLog : [],
    waterTempLog: Array.isArray(p.waterTempLog) ? p.waterTempLog : [],
    waterLog: Array.isArray(p.waterLog) ? p.waterLog : [],
    checkLog: Array.isArray(p.checkLog) ? p.checkLog : []
  };
}
function latestEntry(arr) { return Array.isArray(arr) && arr.length ? arr[arr.length - 1] : null; }
function latestDateFromEntry(entry) { return entry?.date || entry?.time || null; }
function hoursSinceDateTime(isoLike) {
  if (!isoLike) return null;
  const d = new Date(isoLike.length === 10 ? `${isoLike}T12:00:00` : isoLike);
  return Math.round(((new Date()) - d) / 36e5);
}
function wateringCheckIntervalHours(p) {
  if (p.method === 'DWC') return 12;
  if (p.category === 'Lettuce') return 18;
  if (p.category === 'Herb') {
    if (/thyme|rosemary/i.test(`${p.name} ${p.variety}`)) return 48;
    if (/oregano/i.test(`${p.name} ${p.variety}`)) return 36;
    return 24;
  }
  if (p.category === 'Bonsai') return /picea|pinus/i.test(p.variety || '') ? 24 : 20;
  const stage = (p.stage || '').toLowerCase();
  if (/sown|sprouted|cotyledons|true leaves/.test(stage)) return 20;
  return 30;
}
function nextWaterCheckInfo(p) {
  const interval = wateringCheckIntervalHours(p);
  const lastWater = latestEntry(p.waterLog);
  const lastCheck = latestEntry(p.checkLog);
  const lastAny = [lastWater, lastCheck].filter(Boolean).sort((a,b) => new Date(latestDateFromEntry(a)) - new Date(latestDateFromEntry(b))).at(-1) || null;
  const lastIso = latestDateFromEntry(lastAny);
  if (!lastIso) {
    return { status: 'warn', label: 'No water/check log', note: 'Start logging water or dry-back checks so the app can stop guessing.' };
  }
  const hours = hoursSinceDateTime(lastIso);
  const dueIn = interval - hours;
  if (hours === null) return { status: 'warn', label: 'Unknown', note: 'Time math broke in a small but annoying way.' };
  if (dueIn <= 0) return { status: 'bad', label: 'Check now', note: `${Math.abs(dueIn)} h past suggested check window.` };
  if (dueIn <= Math.max(4, interval * 0.25)) return { status: 'warn', label: `Due in ${dueIn} h`, note: `Last logged ${hours} h ago.` };
  return { status: 'good', label: `Due in ${dueIn} h`, note: `Last logged ${hours} h ago.` };
}
function latestDwcHealth(p) {
  const ph = latestEntry(p.phLog), ec = latestEntry(p.ecLog), wt = latestEntry(p.waterTempLog);
  const phAge = hoursSinceDateTime(ph?.date || null);
  const ecAge = hoursSinceDateTime(ec?.date || null);
  const wtAge = hoursSinceDateTime(wt?.date || null);
  const missing = [phAge, ecAge, wtAge].some(v => v === null);
  if (missing) return { status: 'bad', label: 'Missing metrics', note: 'Log pH, EC, and water temp.' };
  const stale = Math.max(phAge, ecAge, wtAge);
  if (stale > 48) return { status: 'bad', label: 'Metrics stale', note: `Oldest DWC metric is ${stale} h old.` };
  if (stale > 24) return { status: 'warn', label: 'Re-check today', note: `Oldest DWC metric is ${stale} h old.` };
  const wtBad = wt?.value > 72;
  const phBad = ph?.value < 5.6 || ph?.value > 6.3;
  if (wtBad || phBad) return { status: 'warn', label: 'Numbers need attention', note: `${phBad ? 'pH drifting' : 'pH okay'}${phBad && wtBad ? '; ' : ''}${wtBad ? 'water warm' : ''}.` };
  return { status: 'good', label: 'DWC checks current', note: `Latest pH/EC/temp are within a sane recent window.` };
}
function opsQueueItems() {
  const items = [];
  plants.forEach(p => {
    if (p.method === 'DWC') {
      const dwc = latestDwcHealth(p);
      if (dwc.status !== 'good') items.push({ priority: dwc.status === 'bad' ? 0 : 1, text: `${p.name}: ${dwc.label} — ${dwc.note}` });
      return;
    }
    const next = nextWaterCheckInfo(p);
    if (next.status !== 'good') items.push({ priority: next.status === 'bad' ? 0 : 1, text: `${p.name}: ${next.label} — ${next.note}` });
    if (p.category === 'Uncertain Seed' && daysSince(p.startDate) > 21 && /not sprouted/i.test(p.stage || '')) {
      items.push({ priority: 1, text: `${p.name}: still unsprouted after ${daysSince(p.startDate)} days. Old seed may just be doing old-seed crimes.` });
    }
  });
  return items.sort((a,b) => a.priority - b.priority).slice(0, 8);
}
function statusChip(status, text) { return `<span class="status-chip ${status}">${text}</span>`; }

function toleranceFor(p) {
  if (p.method === 'DWC') return COLD_TOLERANCE.DWC;
  if (p.category === 'Lettuce') return COLD_TOLERANCE.Lettuce;
  if (p.category === 'Tomato') return COLD_TOLERANCE.Tomato;
  if (p.category === 'Pepper' && /chinense/i.test(p.variety) && !p.permanentIndoor) return COLD_TOLERANCE.Superhot;
  if (p.category === 'Pepper') return COLD_TOLERANCE.Pepper;
  if (p.category === 'Herb') return COLD_TOLERANCE.Herb;
  if (p.category === 'Bonsai') return COLD_TOLERANCE.Bonsai;
  return COLD_TOLERANCE.Uncertain;
}

async function fetchWeather() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LOCATION.lat}&longitude=${LOCATION.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,cloud_cover,wind_speed_10m,wind_gusts_10m,is_day,weather_code&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,uv_index,is_day,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,daylight_duration,uv_index_max,precipitation_probability_max,precipitation_sum,wind_speed_10m_max&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=${encodeURIComponent(LOCATION.timezone)}&forecast_days=10`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    setText('hero-updated', 'Loading…');
    const resp = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!resp.ok) throw new Error(`Weather HTTP ${resp.status}`);
    const data = await resp.json();
    if (!data?.current || !data?.daily || !data?.hourly) throw new Error('Weather payload missing expected sections');
    weather = data;
    renderWeatherHero();
    renderWeatherBar();
    renderHourlyProfileControls();
    renderHourlyWindow();
    if (selectedId) renderDetail();
  } catch (err) {
    console.warn('Weather fetch failed:', err);
    weather = null;
    setText('hero-location', `${LOCATION.name} · Zone ${LOCATION.zone}`);
    setText('hero-updated', 'Weather unavailable');
    setText('hero-summary', 'Live weather could not be loaded right now. The plant dashboard still works, but forecast-driven hardening guidance is offline.');
    setClass('hero-guidance', 'alert warn');
    setText('hero-guidance', err?.name === 'AbortError' ? 'Weather request timed out after 9 seconds. Check network access or try refresh.' : `Weather request failed: ${err.message || 'unknown error'}`);
    setHTML('readiness-list', '<li>Weather feed unavailable. Use the 10-day forecast from your local weather source before hardening anything tender.</li>');
    setHTML('grow-constants', [
      `Photoperiod: ${LOCATION.lightsOn}–${LOCATION.lightsOff} (${photoperiodHours(LOCATION.lightsOn, LOCATION.lightsOff)} h).`,
      `Room environment: ${LOCATION.roomTemp} and roughly ${LOCATION.humidity} RH.`,
      `Soil: ${LOCATION.soil}; nutrient in use: ${LOCATION.nutrient}.`,
      ...LOCATION.lighting
    ].map(x => `<li>${x}</li>`).join(''));
    setHTML('ops-queue', '<li>Live weather is offline. Indoor tracking still works.</li>');
    renderHourlyProfileControls();
    renderHourlyWindow();
  } finally {
    clearTimeout(timeout);
  }
}

function renderWeatherHero() {
  if (!weather) return;
  const current = weather.current;
  const daily = weather.daily;
  const todayLow = Math.round(daily.temperature_2m_min[0]);
  const todayHigh = Math.round(daily.temperature_2m_max[0]);
  const currentTemp = Math.round(current.temperature_2m);
  const apparent = Math.round(current.apparent_temperature);
  const humidity = Math.round(current.relative_humidity_2m);
  const wind = Math.round(current.wind_speed_10m);
  const gust = Math.round(current.wind_gusts_10m || 0);
  const precipProb = Math.round(daily.precipitation_probability_max[0] || 0);
  const precip = Number(daily.precipitation_sum[0] || 0).toFixed(2);
  const uv = Number(daily.uv_index_max[0] || 0).toFixed(1);
  const sunrise = fmtTime(daily.sunrise[0]);
  const sunset = fmtTime(daily.sunset[0]);
  const daylightHours = (daily.daylight_duration[0] / 3600).toFixed(1);
  const frostDays = daysUntil(LOCATION.conservativeLastFrost);

  document.getElementById('hero-location').textContent = `${LOCATION.name} · Zone ${LOCATION.zone}`;
  document.getElementById('hero-updated').textContent = `Updated ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  document.getElementById('hero-summary').textContent = `${weatherCodeLabel(current.weather_code)} now, ${currentTemp}°F with a feels-like of ${apparent}°F. Tonight bottoms out near ${todayLow}°F, so the hardening math should obey reality, not optimism.`;
  document.getElementById('wx-current-temp').textContent = `${currentTemp}°`;
  document.getElementById('wx-current-detail').textContent = `Feels like ${apparent}° · RH ${humidity}% · Wind ${wind} mph${gust ? `, gusts ${gust}` : ''}`;
  document.getElementById('wx-today-hi-lo').textContent = `${todayHigh}° / ${todayLow}°`;
  document.getElementById('wx-today-extra').textContent = `Rain ${precipProb}% · ${precip} in · UV ${uv}`;
  document.getElementById('wx-sunrise-sunset').textContent = `${sunrise} / ${sunset}`;
  document.getElementById('wx-daylight').textContent = `${daylightHours} h daylight`;
  document.getElementById('wx-frost-date').textContent = fmtDate(LOCATION.conservativeLastFrost);
  document.getElementById('wx-frost-countdown').textContent = frostDays >= 0 ? `${frostDays} days until conservative frost date` : `past this year's conservative frost date`;

  const guidance = buildGuidance(todayLow, todayHigh, precipProb, wind);
  const guideEl = document.getElementById('hero-guidance');
  guideEl.className = `alert ${guidance.level}`;
  guideEl.textContent = guidance.text;

  document.getElementById('readiness-list').innerHTML = [
    `Lettuce can usually start hardening first if lows stay above ${COLD_TOLERANCE.Lettuce.minNight}°F.`,
    `Tomatoes want nights above ${COLD_TOLERANCE.Tomato.minNight}°F and a gentle 7–10 day ramp.`,
    `Peppers should wait for consistently warmer nights above ${COLD_TOLERANCE.Pepper.minNight}°F; superhots prefer ${COLD_TOLERANCE.Superhot.minNight}°F+.`,
    `Bonsai seedlings can handle cooler air than peppers, but seedlings still hate wet feet and chaos.`
  ].map(x => `<li>${x}</li>`).join('');

  document.getElementById('grow-constants').innerHTML = [
    `Photoperiod: ${LOCATION.lightsOn}–${LOCATION.lightsOff} (${photoperiodHours(LOCATION.lightsOn, LOCATION.lightsOff)} h).`,
    `Room environment: ${LOCATION.roomTemp} and roughly ${LOCATION.humidity} RH.`,
    `Soil: ${LOCATION.soil}; nutrient in use: ${LOCATION.nutrient}.`,
    ...LOCATION.lighting
  ].map(x => `<li>${x}</li>`).join('');
  const ops = opsQueueItems();
  const opsEl = document.getElementById('ops-queue');
  if (opsEl) opsEl.innerHTML = ops.length ? ops.map(x => `<li>${x.text}</li>`).join('') : '<li>No overdue ops. The plant goblins are briefly at peace.</li>';
}

function buildGuidance(low, high, precipProb, wind) {
  if (low < 28) return { level: 'warn', text: `Hard no for hardening tender crops today. Overnight low near ${low}°F is lettuce-tolerable only for hardened plants, and absolutely rude for tomatoes and peppers.` };
  if (low < 50) return { level: 'info', text: `Reasonable day for lettuce or hardy bonsai exposure, but too cold tonight for tomatoes and peppers. Use the outdoors for brief cool-crop conditioning only.` };
  if (low < 55) return { level: 'info', text: `Tomatoes may harden carefully today if wind and sun are sane. Standard peppers should still be cautious tonight at ${low}°F.` };
  if (low < 60) return { level: 'good', text: `A decent general hardening day for tomatoes and many peppers. Superhots still prefer warmer nights, because of course they do.` };
  if (precipProb > 70 || wind > 18) return { level: 'warn', text: `Temperature is fine, but the forecast is messy. Rain/wind make for a shabby hardening day unless you use sheltered exposure.` };
  return { level: 'good', text: `Forecast is broadly friendly for hardening. Use the schedule, avoid abrupt full-sun heroics, and let the plants adapt instead of improvising tragedy.` };
}


function renderHourlyProfileControls() {
  const bar = document.getElementById('hourly-profile-bar');
  const note = document.getElementById('hourly-profile-note');
  if (!bar || !note) return;
  const meta = activeHourlyProfileMeta();
  const destinationMode = destinationWeatherMode(meta);
  bar.innerHTML = [`<button type="button" class="hourly-profile-btn ${hourlyProfileMode === 'auto' ? 'active' : ''}" data-hourly-mode="auto">Auto</button>`, ...Object.entries(HOURLY_PROFILES).map(([key, cfg]) => `<button type="button" class="hourly-profile-btn ${hourlyProfileMode === 'manual' && hourlyProfile === key ? 'active' : ''}" data-hourly-profile="${key}">${cfg.label}</button>`)].join('');
  note.textContent = destinationMode.enabled ? `${meta.source}: ${profileRules(meta.key).note}` : `${meta.source}: ${destinationMode.reason}`;
}

function renderHourlyWindow() {
  const strip = $('hourly-window-strip');
  if (!strip) return;
  if (!weather?.hourly) {
    setText('hourly-hardening-window', 'Weather offline');
    setText('hourly-hardening-note', 'Hardening windows need forecast data.');
    const indoorAdvice = destinationWateringAdvice(activeHourlyProfileMeta());
    setText('hourly-watering-window', indoorAdvice.windowLabel);
    setText('hourly-watering-note', indoorAdvice.note);
    setText('hourly-bringin-window', 'Manual check');
    setText('hourly-bringin-note', 'Use forecast or local weather until the live feed comes back.');
    strip.innerHTML = `<div class="empty-msg">${indoorAdvice.stripMessage}</div>`;
    return;
  }
  const activeProfileKey = activeHourlyProfile();
  const meta = activeHourlyProfileMeta();
  const destinationMode = destinationWeatherMode(meta);
  const profile = profileRules(activeProfileKey);
  const hours = hourlyWindowForToday();
  if (!hours.length) {
    strip.innerHTML = '<div class="empty-msg">Hourly window unavailable. Weather goblins withheld the granular prophecy.</div>';
    return;
  }
  if (!destinationMode.enabled) {
    const wateringAdvice = destinationWateringAdvice(meta);
    document.getElementById('hourly-hardening-window').textContent = 'Not applicable';
    document.getElementById('hourly-hardening-note').textContent = `${meta.source}: ${destinationMode.action}`;
    document.getElementById('hourly-watering-window').textContent = wateringAdvice.windowLabel;
    document.getElementById('hourly-watering-note').textContent = wateringAdvice.note;
    document.getElementById('hourly-bringin-window').textContent = 'Stay inside';
    document.getElementById('hourly-bringin-note').textContent = `${meta.source}: destination-aware logic keeps this plant indoors unless you override it manually.`;
    strip.innerHTML = `<div class="empty-msg">${destinationMode.reason} ${wateringAdvice.stripMessage}</div>`;
    return;
  }
  const now = new Date();
  const visibleHours = hours.filter(h => new Date(h.time) >= now).slice(0, 12);
  const hardeningGood = visibleHours.filter(h => classifyScore(scoreHourForOutdoors(h, activeProfileKey)) === 'good');
  const wateringGood = visibleHours.filter(h => classifyScore(scoreHourForWatering(h, activeProfileKey)) === 'good');
  const bringInCandidates = visibleHours.filter(h => !!bringInReason(h, activeProfileKey));
  document.getElementById('hourly-hardening-window').textContent = contiguousLabel(hardeningGood);
  document.getElementById('hourly-hardening-note').textContent = hardeningGood.length ? `${meta.source} · ${profile.label}: best for shade-first exposure and controlled hardening laps.` : `No truly pretty ${profile.label.toLowerCase()} hardening window in the next 12 hours for ${meta.source.toLowerCase()}.`;
  document.getElementById('hourly-watering-window').textContent = contiguousLabel(wateringGood);
  document.getElementById('hourly-watering-note').textContent = wateringGood.length ? `${meta.source} · ${profile.label}: calmer hours for container watering.` : 'Water only as-needed; the forecast is not offering a dreamy window.';
  document.getElementById('hourly-bringin-window').textContent = bringInCandidates.length ? fmtHour(bringInCandidates[0].time) : 'Tonight';
  document.getElementById('hourly-bringin-note').textContent = bringInCandidates.length ? `${meta.source} · ${profile.label}: ${bringInReason(bringInCandidates[0], activeProfileKey)}.` : `No obvious ${profile.label.toLowerCase()} bring-in cliff from the next 12-hour outlook for ${meta.source.toLowerCase()}.`;
  strip.innerHTML = visibleHours.map(h => {
    const summary = summarizeHourTask(h, activeProfileKey);
    const reason = bringInReason(h, activeProfileKey);
    return `<div class="hour-block ${summary.outsideScore}">
      <div class="hour-top">
        <div class="hour-time">${fmtHour(h.time)}</div>
        <div class="hour-score">${summary.outsideScore}</div>
      </div>
      <div class="hour-temp">${Math.round(h.temperature)}° ${weatherCodeIcon(h.code)}</div>
      <div class="hour-meta">Feels ${Math.round(h.apparent)}° · RH ${Math.round(h.humidity)}%</div>
      <div class="hour-meta">Wind ${Math.round(h.wind)} mph${h.gust ? `, gust ${Math.round(h.gust)}` : ''}</div>
      <div class="hour-meta">Rain ${Math.round(h.precipProb)}% · ${Number(h.precip || 0).toFixed(2)} in · UV ${Number(h.uv || 0).toFixed(1)}</div>
      <div class="hour-task"><strong>${profile.label}:</strong> ${summary.action}<br><strong>Water:</strong> ${summary.watering}<br><em>${reason ? `Bring in when ${reason}` : 'No immediate bring-in trigger'}</em></div>
    </div>`;
  }).join('');
}

function renderWeatherBar() {
  const bar = document.getElementById('weather-bar');
  if (!weather) return;
  bar.innerHTML = weather.daily.time.map((date, i) => {
    const label = i === 0 ? 'Today' : new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
    const hi = Math.round(weather.daily.temperature_2m_max[i]);
    const lo = Math.round(weather.daily.temperature_2m_min[i]);
    const pop = Math.round(weather.daily.precipitation_probability_max[i] || 0);
    const frost = lo <= 36;
    return `<div class="weather-day ${frost ? 'frost-risk' : ''}">
      <div class="wd-label">${label}</div>
      <div class="wd-icon">${weatherCodeIcon(weather.daily.weather_code[i])}</div>
      <div class="wd-hi">${hi}°</div>
      <div class="wd-lo ${frost ? 'frost-lo' : ''}">${lo}°</div>
      <div class="wd-pop">${pop}% rain</div>
    </div>`;
  }).join('');
}

function renderSidebar() {
  const filters = ['All', 'DWC', 'Soil', 'Bonsai', 'Uncertain', 'Harden Off', 'Permanent Indoor'];
  document.getElementById('filter-bar').innerHTML = filters.map(f => `<button class="filter-btn ${currentFilter === f ? 'active' : ''}" data-filter="${f}">${f}</button>`).join('');

  let list = plants;
  if (currentFilter === 'DWC') list = plants.filter(p => cat(p) === 'DWC');
  if (currentFilter === 'Soil') list = plants.filter(p => cat(p) === 'Soil');
  if (currentFilter === 'Bonsai') list = plants.filter(p => cat(p) === 'Bonsai');
  if (currentFilter === 'Uncertain') list = plants.filter(p => cat(p) === 'Uncertain');
  if (currentFilter === 'Harden Off') list = plants.filter(p => p.hardenOff);
  if (currentFilter === 'Permanent Indoor') list = plants.filter(p => p.permanentIndoor);

  document.getElementById('plant-list').innerHTML = list.map(p => {
    const age = p.startDate ? daysSince(p.startDate) : null;
    return `<div class="plant-item ${selectedId === p.id ? 'active' : ''}" data-id="${p.id}">
      <div class="plant-name">${p.name}</div>
      <div class="plant-sub">${p.stage}</div>
      <div class="plant-badges">
        <span class="badge badge-${cat(p).toLowerCase().replace(/\s+/g,'-')}">${cat(p)}</span>
        ${p.permanentIndoor ? '<span class="badge badge-permanent">indoor</span>' : ''}
        ${p.hardenOff ? '<span class="badge badge-harden">harden</span>' : ''}
        ${p.nickname ? `<span class="badge badge-bonsai">${p.nickname}</span>` : ''}
        ${p.viability ? '<span class="badge badge-uncertain">low viability</span>' : ''}
      </div>
      ${age !== null ? `<div class="plant-days">Day ${age}</div>` : ''}
    </div>`;
  }).join('');
}

function renderDetail() {
  const detail = document.getElementById('detail');
  const p = plants.find(x => x.id === selectedId);
  if (!p) {
    detail.innerHTML = '<div class="empty-detail">← Select a plant to view details</div>';
    return;
  }
  const tabs = ['overview', 'log', 'feed', 'light'];
  if (p.method === 'DWC') tabs.splice(2, 0, 'dwc');
  if (p.hardenOff) tabs.push('harden off');
  const age = p.startDate ? daysSince(p.startDate) : null;

  detail.innerHTML = `<div class="detail-header" id="detail-header">
    <div class="detail-title-row">
      <div>
        <div class="detail-title">${p.name}</div>
        <div class="detail-meta">${p.variety} · ${p.location}</div>
        <div class="detail-meta dim">${p.startDate ? `Started ${fmtDate(p.startDate)} · Day ${age}` : 'No start date'} · ${p.destination}</div>
      </div>
      <div class="header-badges">
        <span class="badge badge-${cat(p).toLowerCase().replace(/\s+/g,'-')}">${cat(p)}</span>
        ${p.permanentIndoor ? '<span class="badge badge-permanent">permanent indoor</span>' : ''}
        ${p.nickname ? `<span class="badge badge-bonsai">${p.nickname}</span>` : ''}
      </div>
    </div>
    <div class="tab-bar">${tabs.map(t => `<button class="tab ${currentTab === t ? 'active' : ''}" data-tab="${t}">${t}</button>`).join('')}</div>
  </div>
  <div id="tab-content"></div>`;
  renderTab(p);
}

function renderTab(p) {
  const tc = document.getElementById('tab-content');
  if (currentTab === 'overview') return renderOverview(p, tc);
  if (currentTab === 'log') return renderLog(p, tc);
  if (currentTab === 'feed') return renderFeed(p, tc);
  if (currentTab === 'light') return renderLight(p, tc);
  if (currentTab === 'dwc') return renderDWC(p, tc);
  if (currentTab === 'harden off') return renderHarden(p, tc);
}

function renderOverview(p, tc) {
  const lastWater = latestEntry(p.waterLog);
  const lastCheck = latestEntry(p.checkLog);
  const waterStatus = p.method === 'DWC' ? latestDwcHealth(p) : nextWaterCheckInfo(p);
  const lastWaterLabel = lastWater ? `${lastWater.amount || 'Watered'} · ${humanDateTime(lastWater.date)}` : 'No watering logged';
  const lastCheckLabel = lastCheck ? `${lastCheck.result || 'Check'} · ${humanDateTime(lastCheck.date)}` : 'No dry-back check logged';
  tc.innerHTML = `<div class="metrics-row">
    <div class="metric"><div class="metric-label">Method</div><div class="metric-value sm">${p.method}</div></div>
    <div class="metric"><div class="metric-label">Light</div><div class="metric-value sm">${p.lightHours} h/day</div></div>
    <div class="metric"><div class="metric-label">Stage</div><div class="metric-value sm">${p.stage}</div></div>
    <div class="metric"><div class="metric-label">Destination</div><div class="metric-value sm">${p.destination}</div></div>
  </div>
  <div class="mini-grid">
    <div class="card">
      <div class="card-label">Watering status</div>
      <div class="metric-value sm">${waterStatus.label}</div>
      <div class="metric-hint">${waterStatus.note}</div>
      ${statusChip(waterStatus.status, p.method === 'DWC' ? 'reservoir ops' : 'dry-back cadence')}
      <div class="quick-actions">
        <button class="btn btn-ghost" id="log-water-btn" type="button">Log watered</button>
        <button class="btn btn-ghost" id="log-check-btn" type="button">Log dry check</button>
      </div>
    </div>
    <div class="card">
      <div class="card-label">Last care events</div>
      <div class="metric-hint">${lastWaterLabel}</div>
      <div class="metric-hint" style="margin-top:6px">${lastCheckLabel}</div>
      ${p.method === 'DWC' ? `<div class="metric-hint" style="margin-top:6px">${latestDwcHealth(p).note}</div>` : ''}
    </div>
  </div>
  <div class="card">
    <div class="card-label">Update growth stage</div>
    <select id="stage-select" class="input full">${STAGE_OPTIONS.map(s => `<option ${s === p.stage ? 'selected' : ''}>${s}</option>`).join('')}</select>
  </div>
  <div class="card">
    <div class="card-label">Care notes</div>
    <div class="card-value dim">${p.info || 'No care note saved.'}</div>
    ${p.viability ? `<div class="alert warn" style="margin-top:10px">${p.viability}</div>` : ''}
  </div>
  <div class="card">
    <div class="card-label">Recent notes</div>
    ${p.notes.length ? `<ul class="log-list">${[...p.notes].reverse().slice(0, 5).map(n => `<li><span class="log-text">${n.text}</span><span class="log-date">${displayDateOnly(n.date)}</span></li>`).join('')}</ul>` : '<div class="empty-msg">No notes yet.</div>'}
  </div>`;
}

function renderLog(p, tc) {
  tc.innerHTML = `<div class="card">
    <div class="card-label">Add observation</div>
    <div class="inline-form">
      <input class="input grow" id="note-text" placeholder="Leaf color, stretch, transplant drama, weather reaction…" />
      <button class="btn" id="add-note-btn" type="button">Add note</button>
    </div>
  </div>
  <div class="card">
    <div class="card-label">All notes <span class="count">${p.notes.length}</span></div>
    ${p.notes.length ? `<ul class="log-list">${[...p.notes].reverse().map(n => `<li><span class="log-text">${n.text}</span><span class="log-date">${displayDateOnly(n.date)}</span></li>`).join('')}</ul>` : '<div class="empty-msg">No notes yet.</div>'}
  </div>`;
}

function renderFeed(p, tc) {
  tc.innerHTML = `<div class="card">
    <div class="card-label">Log feeding</div>
    <div class="inline-form">
      <input class="input grow" id="feed-text" placeholder="Example: Big Bloom 1 tsp/gal" />
      <button class="btn" id="add-feed-btn" type="button">Log feed</button>
    </div>
    ${p.method === 'DWC' ? '<div class="alert info" style="margin-top:10px">Big Bloom alone is incomplete for DWC. Track pH, EC, and water temperature before changing feed strength.</div>' : ''}
  </div>
  <div class="card">
    <div class="card-label">Feed history <span class="count">${p.feeds.length}</span></div>
    ${p.feeds.length ? `<ul class="log-list">${[...p.feeds].reverse().map(f => `<li><span class="log-text">${f.text}</span><span class="log-date">${displayDateOnly(f.date)}</span></li>`).join('')}</ul>` : '<div class="empty-msg">No feeds logged yet.</div>'}
  </div>`;
}

function renderLight(p, tc) {
  const recommended = p.category === 'Lettuce' ? '14–16 h' : p.category === 'Bonsai' ? '12–16 h' : '16–18 h';
  const percent = Math.max(0, Math.min(100, Math.round(((p.lightHours - 10) / 10) * 100)));
  tc.innerHTML = `<div class="card">
    <div class="card-label">Daily light hours</div>
    <div class="light-display"><div class="light-val">${p.lightHours}</div><div class="light-sub">hours per day</div></div>
    <input class="light-slider" id="light-slider" type="range" min="10" max="20" step="0.5" value="${p.lightHours}" />
    <div class="range-labels"><span>10h</span><span>14h</span><span>18h</span><span>20h</span></div>
    <div class="light-bar-wrap"><div class="light-bar-fill" style="width:${percent}%"></div></div>
  </div>
  <div class="card">
    <div class="card-label">Stage recommendations</div>
    <table class="rec-table">
      <tr><td>Current crop class</td><td class="info">${p.category}</td></tr>
      <tr><td>Recommended band</td><td class="ok">${recommended}</td></tr>
      <tr><td>Room photoperiod</td><td>${photoperiodHours(LOCATION.lightsOn, LOCATION.lightsOff)} h</td></tr>
      <tr><td>Lighting note</td><td>${LOCATION.lighting[0]}</td></tr>
    </table>
  </div>`;
}

function renderDWC(p, tc) {
  const lastPh = p.phLog.at(-1);
  const lastEc = p.ecLog.at(-1);
  const lastWt = p.waterTempLog.at(-1);
  tc.innerHTML = `<div class="alert warn">DWC success is mostly chemistry plus oxygen. Hardware looks fine; missing measurements are where the goblin hides.</div>
  <div class="metrics-row">
    <div class="metric"><div class="metric-label">Last pH</div><div class="metric-value ${lastPh && lastPh.value >= 5.8 && lastPh.value <= 6.2 ? 'ok' : 'bad'}">${lastPh ? lastPh.value.toFixed(1) : '—'}</div><div class="metric-hint">Target 5.8–6.2</div></div>
    <div class="metric"><div class="metric-label">Last EC</div><div class="metric-value ${lastEc ? 'ok' : ''}">${lastEc ? lastEc.value.toFixed(2) : '—'}</div><div class="metric-hint">Seedling 0.8–1.2</div></div>
    <div class="metric"><div class="metric-label">Water temp</div><div class="metric-value ${lastWt && lastWt.value <= 72 ? 'ok' : lastWt ? 'bad' : ''}">${lastWt ? Math.round(lastWt.value) : '—'}${lastWt ? '<span class="metric-unit">°F</span>' : ''}</div><div class="metric-hint">Cooler is safer</div></div>
    <div class="metric"><div class="metric-label">Photoperiod</div><div class="metric-value sm">${p.lightHours} h</div><div class="metric-hint">SF300 about 8 in above canopy</div></div>
  </div>
  <div class="card">
    <div class="card-label">Log DWC metrics</div>
    <div class="triple-form">
      <input class="input" id="ph-input" type="number" step="0.01" placeholder="pH" />
      <input class="input" id="ec-input" type="number" step="0.01" placeholder="EC" />
      <input class="input" id="wt-input" type="number" step="0.1" placeholder="Water temp °F" />
      <button class="btn" id="log-dwc-btn" type="button">Log metrics</button>
    </div>
  </div>
  <div class="card">
    <div class="card-label">Recent metric history</div>
    <div class="two-col-grid">
      <div>
        <h4 class="mini-head">pH</h4>
        ${p.phLog.length ? `<ul class="log-list">${[...p.phLog].reverse().slice(0, 8).map(e => `<li><span class="log-text">${e.value.toFixed(1)}</span><span class="log-date">${displayDateOnly(e.date)}</span></li>`).join('')}</ul>` : '<div class="empty-msg">No pH logs yet.</div>'}
      </div>
      <div>
        <h4 class="mini-head">EC / Temp</h4>
        ${p.ecLog.length || p.waterTempLog.length ? `<ul class="log-list">${[...Array(Math.max(p.ecLog.length, p.waterTempLog.length)).keys()].reverse().slice(0,8).map(i => {
          const ec = p.ecLog[p.ecLog.length - 1 - i];
          const wt = p.waterTempLog[p.waterTempLog.length - 1 - i];
          return `<li><span class="log-text">${ec ? `EC ${ec.value.toFixed(2)}` : 'EC —'} ${wt ? `· Temp ${Math.round(wt.value)}°F` : ''}</span><span class="log-date">${displayDateOnly((ec || wt)?.date || '')}</span></li>`;
        }).join('')}</ul>` : '<div class="empty-msg">No EC or temperature logs yet.</div>'}
      </div>
    </div>
  </div>`;
}

function renderHarden(p, tc) {
  const tol = toleranceFor(p);
  const defaultStart = p.category === 'Lettuce' ? addDays(LOCATION.conservativeLastFrost, -14) : p.category === 'Tomato' ? addDays(LOCATION.conservativeLastFrost, -3) : /chinense/i.test(p.variety) ? addDays(LOCATION.conservativeLastFrost, 14) : addDays(LOCATION.conservativeLastFrost, 7);
  const startDate = p.hardenStart || defaultStart;
  const currentDay = Math.max(1, Math.min(10, daysSince(startDate) + 1));
  const progress = Math.max(0, Math.min(100, currentDay * 10));

  tc.innerHTML = `<div class="harden-dates-row">
    <div class="hdc frost"><div class="hdc-label">Conservative frost date</div><div class="hdc-val">${fmtDate(LOCATION.conservativeLastFrost)}</div><div class="hdc-days">${daysUntil(LOCATION.conservativeLastFrost)} days away</div></div>
    <div class="hdc safe"><div class="hdc-label">Suggested harden start</div><div class="hdc-val">${fmtDate(startDate)}</div><div class="hdc-days">${daysUntil(startDate)} days from today</div></div>
    <div class="hdc ideal"><div class="hdc-label">Tolerance floor</div><div class="hdc-val">${tol.minNight}°F</div><div class="hdc-days">${tol.level} cold tolerance</div></div>
  </div>
  <div class="alert info">${tol.note}</div>
  <div class="harden-progress"><div class="hp-track"><div class="hp-fill" style="width:${progress}%"></div></div><div class="hp-label">Schedule progress if you start on ${fmtDate(startDate)}: day ${currentDay} of 10</div></div>
  <div class="card">
    <div class="card-label">Set or reset hardening start</div>
    <div class="inline-form">
      <input class="input" id="harden-start-input" type="date" value="${startDate}" />
      <button class="btn" id="set-harden-btn" type="button">Save date</button>
    </div>
  </div>
  <div class="card">
    <div class="card-label">10-day hardening plan</div>
    <table class="harden-table">
      <thead><tr><th>Day</th><th>Date</th><th>Outside</th><th>Forecast low</th><th>Notes</th></tr></thead>
      <tbody>
      ${HARDEN_SCHEDULE.map(step => {
        const date = addDays(startDate, step.day - 1);
        const wxIndex = weather ? weather.daily.time.indexOf(date) : -1;
        const low = wxIndex >= 0 ? Math.round(weather.daily.temperature_2m_min[wxIndex]) : null;
        const lowClass = low === null ? '' : low >= tol.minNight ? 'ok' : low >= tol.minNight - 5 ? 'warn' : 'bad';
        const rowClass = step.day === currentDay ? 'today-row' : step.day < currentDay ? 'past-row' : '';
        return `<tr class="${rowClass}">
          <td>${step.day}</td>
          <td>${fmtDate(date)}</td>
          <td>${step.hours} h ${step.shade ? '<span class="shade-tag">shade</span>' : '<span class="sun-tag">sun</span>'}</td>
          <td class="${lowClass}">${low === null ? '—' : `${low}°F`}</td>
          <td class="notes-col">${step.notes}</td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>
  </div>`;
}

function exportData() {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), plants }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `garden-tracker-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importData(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed.plants)) throw new Error('Invalid backup');
      plants = parsed.plants.map(normalizePlant);
      savePlants();
      renderSidebar();
      renderDetail();
      renderWeatherHero();
      renderHourlyWindow();
    } catch (err) {
      alert('Import failed. The JSON gremlin bit the file.');
    }
  };
  reader.readAsText(file);
}

function bindEvents() {
  const hourlyBar = document.getElementById('hourly-profile-bar');
  if (hourlyBar) hourlyBar.addEventListener('click', e => {
    const autoBtn = e.target.closest('[data-hourly-mode]');
    if (autoBtn) {
      hourlyProfileMode = autoBtn.dataset.hourlyMode;
      localStorage.setItem(HOURLY_PROFILE_MODE_KEY, hourlyProfileMode);
      renderHourlyProfileControls();
      renderHourlyWindow();
      return;
    }
    const btn = e.target.closest('[data-hourly-profile]');
    if (!btn) return;
    hourlyProfileMode = 'manual';
    hourlyProfile = btn.dataset.hourlyProfile;
    localStorage.setItem(HOURLY_PROFILE_KEY, hourlyProfile);
    localStorage.setItem(HOURLY_PROFILE_MODE_KEY, hourlyProfileMode);
    renderHourlyProfileControls();
    renderHourlyWindow();
  });
  document.getElementById('tab-content').addEventListener('click', e => {
    const plant = plants.find(x => x.id === selectedId);
    if (!plant) return;
    if (e.target.closest('#log-water-btn')) {
      const stamp = new Date().toISOString();
      const amount = plant.method === 'DWC' ? 'Reservoir check / top-off' : 'Watered';
      plant.waterLog.push({ date: stamp, amount });
      savePlants();
      renderDetail();
      renderHourlyWindow();
      renderWeatherHero();
      return;
    }
    if (e.target.closest('#log-check-btn')) {
      const stamp = new Date().toISOString();
      plant.checkLog.push({ date: stamp, result: 'Dry-back checked' });
      savePlants();
      renderDetail();
      renderHourlyWindow();
      renderWeatherHero();
      return;
    }
  });
  document.getElementById('filter-bar').addEventListener('click', e => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    currentFilter = btn.dataset.filter;
    renderSidebar();
  });
  document.getElementById('plant-list').addEventListener('click', e => {
    const item = e.target.closest('[data-id]');
    if (!item) return;
    selectedId = item.dataset.id;
    currentTab = 'overview';
    renderSidebar();
    renderDetail();
    if (hourlyProfileMode === 'auto') {
      renderHourlyProfileControls();
      renderHourlyWindow();
    }
  });
  document.getElementById('detail').addEventListener('click', e => {
    const tab = e.target.closest('[data-tab]');
    if (tab) {
      currentTab = tab.dataset.tab;
      renderDetail();
      return;
    }
    if (e.target.id === 'add-note-btn') {
      const input = document.getElementById('note-text');
      if (!input.value.trim()) return;
      const p = plants.find(x => x.id === selectedId);
      p.notes.push({ text: input.value.trim(), date: isoNow() });
      input.value = '';
      savePlants();
      renderDetail();
      renderSidebar();
      return;
    }
    if (e.target.id === 'add-feed-btn') {
      const input = document.getElementById('feed-text');
      if (!input.value.trim()) return;
      const p = plants.find(x => x.id === selectedId);
      p.feeds.push({ text: input.value.trim(), date: isoNow() });
      input.value = '';
      savePlants();
      renderDetail();
      return;
    }
    if (e.target.id === 'log-dwc-btn') {
      const p = plants.find(x => x.id === selectedId);
      const ph = parseFloat(document.getElementById('ph-input').value);
      const ec = parseFloat(document.getElementById('ec-input').value);
      const wt = parseFloat(document.getElementById('wt-input').value);
      const date = isoNow();
      if (!Number.isNaN(ph)) p.phLog.push({ value: ph, date });
      if (!Number.isNaN(ec)) p.ecLog.push({ value: ec, date });
      if (!Number.isNaN(wt)) p.waterTempLog.push({ value: wt, date });
      savePlants();
      renderDetail();
      return;
    }
    if (e.target.id === 'set-harden-btn') {
      const val = document.getElementById('harden-start-input').value;
      const p = plants.find(x => x.id === selectedId);
      p.hardenStart = val;
      savePlants();
      renderDetail();
    }
  });
  document.getElementById('detail').addEventListener('change', e => {
    if (e.target.id === 'stage-select') {
      const p = plants.find(x => x.id === selectedId);
      p.stage = e.target.value;
      savePlants();
      renderSidebar();
    }
    if (e.target.id === 'light-slider') {
      const p = plants.find(x => x.id === selectedId);
      p.lightHours = Number(e.target.value);
      savePlants();
      renderDetail();
    }
  });
  document.getElementById('export-btn').addEventListener('click', exportData);
  document.getElementById('import-input').addEventListener('change', importData);
}

function init() {
  loadPlants();
  if (!selectedId && plants.length) selectedId = plants[0].id;
  renderSidebar();
  renderDetail();
  renderHourlyProfileControls();
  renderHourlyWindow();
  bindEvents();
  fetchWeather();
}

init();
