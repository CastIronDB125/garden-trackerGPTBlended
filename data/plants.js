const LOCATION = {
  name: 'Bella Vista, AR',
  zone: '6b',
  lat: 36.4812,
  lon: -94.2724,
  timezone: 'America/Chicago',
  averageLastFrostWindow: 'Apr 11–20',
  conservativeLastFrost: '2026-04-20',
  warmSafePlanting: '2026-05-04',
  tomatoSafePlanting: '2026-04-27',
  lightsOn: '05:15',
  lightsOff: '22:45',
  roomTemp: '66–69°F',
  humidity: '59%',
  soil: 'FoxFarm Ocean Forest',
  nutrient: 'FoxFarm Big Bloom',
  lighting: [
    'Barrina T5 strips at roughly 2–6 in above canopy',
    'Spider Farmer SF300 at roughly 8 in above DWC',
    'Spider Farmer SF600 at roughly 12 in above canopy'
  ]
};

const STAGE_OPTIONS = [
  'Seeds — not yet sown',
  'Seeds — sown, not sprouted',
  'Just germinated / sprouted',
  'Seedling (cotyledons)',
  'Seedling (true leaves emerging)',
  'Early vegetative',
  'Vegetative',
  'Pre-flowering',
  'Flowering',
  'Fruiting',
  'Ready to harvest',
  'Hardening off',
  'Transplanted outdoors',
  'DWC — net pot placed',
  'DWC — roots reaching water',
  'DWC — established'
];

const HARDEN_SCHEDULE = [
  { day: 1, hours: 1, shade: true, notes: 'Dappled shade only; no wind abuse.' },
  { day: 2, hours: 2, shade: true, notes: 'Bright shade; retreat if gusty.' },
  { day: 3, hours: 3, shade: false, notes: 'Gentle morning sun only.' },
  { day: 4, hours: 4, shade: false, notes: 'Morning sun plus a little extra.' },
  { day: 5, hours: 5, shade: false, notes: 'Increase direct exposure gradually.' },
  { day: 6, hours: 6, shade: false, notes: 'Half-day outside.' },
  { day: 7, hours: 8, shade: false, notes: 'All-day light if lows behave.' },
  { day: 8, hours: 10, shade: false, notes: 'Near-full outdoor exposure.' },
  { day: 9, hours: 12, shade: false, notes: 'Full sun test day; still watch night lows.' },
  { day: 10, hours: 14, shade: false, notes: 'Ready for outdoor container life if forecast cooperates.' }
];

const COLD_TOLERANCE = {
  Lettuce: { level: 'HIGH', minNight: 28, note: 'Cool-season crop. Can harden earlier than tomatoes and peppers.' },
  Tomato: { level: 'MEDIUM', minNight: 50, note: 'Cold-sensitive below 50°F; harden gradually.' },
  Pepper: { level: 'LOW', minNight: 55, note: 'Peppers are warm-season drama royalty. Protect below 55°F.' },
  Superhot: { level: 'VERY LOW', minNight: 60, note: 'Superhots want consistently warm nights.' },
  Herb: { level: 'MEDIUM', minNight: 40, note: 'These stay indoors here, so hardening is mostly academic.' },
  Bonsai: { level: 'HIGH', minNight: 32, note: 'Species are cold-hardy, but seedlings still dislike slop and chaos.' },
  DWC: { level: 'N/A', minNight: 60, note: 'Permanent indoor system. Hardening not applicable.' },
  Uncertain: { level: 'N/A', minNight: 80, note: 'Germination focus only; warm media matters more than weather.' }
};

const PLANT_DATA = [
  {
    id: 'bell-dwc',
    name: 'California Wonder Bell',
    variety: 'Capsicum annuum',
    category: 'Pepper',
    categoryGroup: 'Pepper',
    method: 'DWC',
    location: 'Bottom shelf DWC bucket (left)',
    destination: 'Permanent indoor DWC',
    hardenOff: false,
    permanentIndoor: true,
    startDate: '2026-02-18',
    stage: 'DWC — net pot placed',
    lightHours: 17.5,
    nickname: null,
    viability: null,
    notes: [], feeds: [], phLog: [], ecLog: [], waterTempLog: [],
    info: 'Bell pepper in DWC. Track pH, EC, and water temperature before changing anything dramatic.'
  },
  {
    id: 'habanero-dwc',
    name: 'Habanero',
    variety: 'Capsicum chinense',
    category: 'Pepper',
    categoryGroup: 'DWC',
    method: 'DWC',
    location: 'Bottom shelf DWC bucket (right)',
    destination: 'Permanent indoor DWC',
    hardenOff: false,
    permanentIndoor: true,
    startDate: '2026-02-18',
    stage: 'DWC — roots reaching water',
    lightHours: 17.5,
    nickname: null,
    viability: null,
    notes: [], feeds: [], phLog: [], ecLog: [], waterTempLog: [],
    info: 'Carryover hydro habanero. Watch for re-establishment stress and do not let the crown stay soaked.'
  },
  {
    id: 'grand-bell-mix', name: 'Grand Bell Mix', variety: 'Capsicum annuum', category: 'Pepper', categoryGroup: 'Pepper', method: 'Soil', location: 'SF600 soil zone', destination: 'Outdoor container', hardenOff: true, permanentIndoor: false, startDate: '2026-02-18', stage: 'Early vegetative', lightHours: 17.5, nickname: null, viability: null, notes: [], feeds: [], phLog: [], ecLog: [], waterTempLog: [], info: 'Avoid soaking the entire oversized container until roots expand.'
  },
  {
    id: 'jalapeno-early', name: 'Jalapeño Early', variety: 'Capsicum annuum', category: 'Pepper', categoryGroup: 'Pepper', method: 'Soil', location: 'SF600 soil zone', destination: 'Outdoor container', hardenOff: true, permanentIndoor: false, startDate: '2026-02-18', stage: 'Early vegetative', lightHours: 17.5, nickname: null, viability: null, notes: [], feeds: [], phLog: [], ecLog: [], waterTempLog: [], info: 'Warm crop. Let the root zone breathe between waterings.'
  },
  {
    id: 'poblano', name: 'Poblano', variety: 'Capsicum annuum', category: 'Pepper', categoryGroup: 'Pepper', method: 'Soil', location: 'SF600 soil zone', destination: 'Outdoor container', hardenOff: true, permanentIndoor: false, startDate: '2026-02-18', stage: 'Early vegetative', lightHours: 17.5, nickname: null, viability: null, notes: [], feeds: [], phLog: [], ecLog: [], waterTempLog: [], info: 'Watch for overwatering in a large pot with a small root system.'
  },
  {
    id: 'serrano', name: 'Serrano', variety: 'Capsicum annuum', category: 'Pepper', categoryGroup: 'Pepper', method: 'Soil', location: 'SF600 soil zone', destination: 'Outdoor container', hardenOff: true, permanentIndoor: false, startDate: '2026-02-18', stage: 'Early vegetative', lightHours: 17.5, nickname: null, viability: null, notes: [], feeds: [], phLog: [], ecLog: [], waterTempLog: [], info: 'Strong light and patient watering should keep this one happy.'
  },
  {
    id: 'sweet-banana', name: 'Sweet Banana Pepper', variety: 'Capsicum annuum', category: 'Pepper', categoryGroup: 'Pepper', method: 'Soil', location: 'SF600 soil zone', destination: 'Outdoor container', hardenOff: true, permanentIndoor: false, startDate: '2026-02-18', stage: 'Early vegetative', lightHours: 17.5, nickname: null, viability: null, notes: [], feeds: [], phLog: [], ecLog: [], waterTempLog: [], info: 'Keep warm and do not broad-soak the container every other day unless the root zone truly needs it.'
  },
  {
    id: 'chocolate-reaper', name: 'Chocolate Reaper', variety: 'Capsicum chinense (non-isolated)', category: 'Pepper', categoryGroup: 'Superhot', method: 'Soil', location: 'Germination tray / soil zone', destination: 'Outdoor container', hardenOff: true, permanentIndoor: false, startDate: '2026-03-14', stage: 'Seeds — sown, not sprouted', lightHours: 17.5, nickname: null, viability: null, notes: [], feeds: [], phLog: [], ecLog: [], waterTempLog: [], info: 'Superhot. Warm germination conditions matter more than pep talks.'
  },
  {
    id: 'culinary-blend', name: 'Culinary Blend Tomato', variety: 'Solanum lycopersicum', category: 'Tomato', categoryGroup: 'Tomato', method: 'Soil', location: 'SF600 soil zone', destination: 'Outdoor container', hardenOff: true, permanentIndoor: false, startDate: '2026-02-18', stage: 'Early vegetative', lightHours: 17.5, nickname: null, viability: null, notes: [], feeds: [], phLog: [], ecLog: [], waterTempLog: [], info: 'Tomatoes tolerate deeper transplanting; old lower leaf grumbling is less important than healthy top growth.'
  },
  {
    id: 'cherry-tomato', name: 'Cherry Tomato', variety: 'Solanum lycopersicum var. cerasiforme', category: 'Tomato', categoryGroup: 'Tomato', method: 'Soil', location: 'SF600 soil zone', destination: 'Outdoor container', hardenOff: true, permanentIndoor: false, startDate: '2026-02-18', stage: 'Early vegetative', lightHours: 17.5, nickname: null, viability: null, notes: [], feeds: [], phLog: [], ecLog: [], waterTempLog: [], info: 'Strong light and gradual hardening should make this a productive little chaos engine.'
  },
  {
    id: 'bibb-lettuce', name: 'Bibb Lettuce', variety: 'Lactuca sativa (Bibb)', category: 'Lettuce', categoryGroup: 'Lettuce', method: 'Soil', location: 'Planter box / rack', destination: 'Outdoor container', hardenOff: true, permanentIndoor: false, startDate: '2026-02-18', stage: 'Seedling (true leaves emerging)', lightHours: 16, nickname: null, viability: null, notes: [], feeds: [], phLog: [], ecLog: [], waterTempLog: [], info: 'Cooler and steadier is better. Lettuce is often the most visibly dramatic crop in a warm indoor setup.'
  },
  {
    id: 'iceberg-lettuce', name: 'Iceberg Lettuce', variety: 'Lactuca sativa (Iceberg)', category: 'Lettuce', categoryGroup: 'Lettuce', method: 'Soil', location: 'Planter box / rack', destination: 'Outdoor container', hardenOff: true, permanentIndoor: false, startDate: '2026-02-18', stage: 'Seedling (true leaves emerging)', lightHours: 16, nickname: null, viability: null, notes: [], feeds: [], phLog: [], ecLog: [], waterTempLog: [], info: 'Cool-season crop. Good hardening candidate before tomatoes and peppers.'
  },
  {
    id: 'basil', name: 'Basil', variety: 'Ocimum basilicum', category: 'Herb', categoryGroup: 'Herb', method: 'Soil', location: 'Top shelf herb bowl', destination: 'Permanent indoor', hardenOff: false, permanentIndoor: true, startDate: '2026-02-18', stage: 'Just germinated / sprouted', lightHours: 17.5, nickname: null, viability: null, notes: [], feeds: [], phLog: [], ecLog: [], waterTempLog: [], info: 'Warmth and steady moisture while tiny. Long-term, basil usually wants more room and feed than thyme or oregano.'
  },
  {
    id: 'thyme', name: 'Thyme', variety: 'Thymus vulgaris', category: 'Herb', categoryGroup: 'Herb', method: 'Soil', location: 'Top shelf herb bowl', destination: 'Permanent indoor', hardenOff: false, permanentIndoor: true, startDate: '2026-02-18', stage: 'Just germinated / sprouted', lightHours: 16, nickname: null, viability: null, notes: [], feeds: [], phLog: [], ecLog: [], waterTempLog: [], info: 'Tiny and slow early on. Overwatering is the classic thyme villain.'
  },
  {
    id: 'oregano', name: 'Oregano', variety: 'Origanum vulgare', category: 'Herb', categoryGroup: 'Herb', method: 'Soil', location: 'Top shelf herb bowl', destination: 'Permanent indoor', hardenOff: false, permanentIndoor: true, startDate: '2026-02-18', stage: 'Just germinated / sprouted', lightHours: 16, nickname: null, viability: null, notes: [], feeds: [], phLog: [], ecLog: [], waterTempLog: [], info: 'Usually the strongest herb germinator here. Thin before it becomes a tiny forest brawl.'
  },
  {
    id: 'rosemary', name: 'Rosemary', variety: 'Salvia rosmarinus', category: 'Herb', categoryGroup: 'Herb', method: 'Soil', location: 'Top shelf / germination tray', destination: 'Permanent indoor', hardenOff: false, permanentIndoor: true, startDate: '2026-02-18', stage: 'Seeds — sown, not sprouted', lightHours: 16, nickname: null, viability: null, notes: [], feeds: [], phLog: [], ecLog: [], waterTempLog: [], info: 'Fresh seed but still slow and fussy. Patience is not optional.'
  },
  {
    id: 'freddy-elm', name: 'Siberian Elm', variety: 'Ulmus pumila', category: 'Bonsai', categoryGroup: 'Bonsai', method: 'Bonsai', location: 'Top shelf bonsai zone', destination: 'Outdoor container / bonsai training TBD', hardenOff: true, permanentIndoor: false, startDate: '2026-02-16', stage: 'Seedling (true leaves emerging)', lightHours: 16, nickname: 'Freddy', viability: null, notes: [], feeds: [], phLog: [], ecLog: [], waterTempLog: [], info: 'Most forgiving bonsai starter of the bunch. Training plan still gloriously TBD.'
  },
  {
    id: 'ochitsuki-spruce', name: 'Colorado Blue Spruce', variety: 'Picea pungens', category: 'Bonsai', categoryGroup: 'Bonsai', method: 'Bonsai', location: 'Top shelf bonsai zone', destination: 'Outdoor container / bonsai training TBD', hardenOff: true, permanentIndoor: false, startDate: '2026-02-16', stage: 'Seedling (true leaves emerging)', lightHours: 16, nickname: 'Ochitsuki', viability: null, notes: [], feeds: [], phLog: [], ecLog: [], waterTempLog: [], info: 'Conifer seedling. Strong light and excellent drainage, not emotional puddling.'
  },
  {
    id: 'shizuku-jbp', name: 'Japanese Black Pine', variety: 'Pinus thunbergii', category: 'Bonsai', categoryGroup: 'Bonsai', method: 'Bonsai', location: 'Top shelf bonsai zone', destination: 'Outdoor container / bonsai training TBD', hardenOff: true, permanentIndoor: false, startDate: '2026-02-16', stage: 'Seedling (true leaves emerging)', lightHours: 16, nickname: 'Shizuku', viability: null, notes: [], feeds: [], phLog: [], ecLog: [], waterTempLog: [], info: 'Long-game bonsai project. Conifers do not enjoy being loved into mush.'
  },
  {
    id: 'chocolate-ghost', name: 'Chocolate Ghost', variety: 'Capsicum chinense', category: 'Uncertain Seed', categoryGroup: 'Uncertain', method: 'Soil', location: 'Heat mat / germination tray', destination: 'Outdoor container if it wakes up', hardenOff: true, permanentIndoor: false, startDate: '2026-02-18', stage: 'Seeds — sown, not sprouted', lightHours: 17.5, nickname: null, viability: 'Old seed; low viability expected.', notes: [], feeds: [], phLog: [], ecLog: [], waterTempLog: [], info: 'Old superhot seed. Warm media and patience, not miracles.'
  },
  {
    id: 'chocolate-primo-reaper', name: 'Chocolate Primo Reaper', variety: 'Capsicum chinense', category: 'Uncertain Seed', categoryGroup: 'Uncertain', method: 'Soil', location: 'Heat mat / germination tray', destination: 'Outdoor container if it wakes up', hardenOff: true, permanentIndoor: false, startDate: '2026-02-18', stage: 'Seeds — sown, not sprouted', lightHours: 17.5, nickname: null, viability: 'Old seed; low viability expected.', notes: [], feeds: [], phLog: [], ecLog: [], waterTempLog: [], info: 'Same deal: old superhot seed and no promises from the universe.'
  },
  {
    id: 'tasmanian-habanero', name: 'Tasmanian Habanero', variety: 'Capsicum chinense', category: 'Uncertain Seed', categoryGroup: 'Uncertain', method: 'Soil', location: 'Heat mat / germination tray', destination: 'Outdoor container if it wakes up', hardenOff: true, permanentIndoor: false, startDate: '2026-02-18', stage: 'Seeds — sown, not sprouted', lightHours: 17.5, nickname: null, viability: 'Old seed; low viability expected.', notes: [], feeds: [], phLog: [], ecLog: [], waterTempLog: [], info: 'Low-odds germination lottery ticket.'
  }
];
