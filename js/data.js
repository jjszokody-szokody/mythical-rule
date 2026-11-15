// Mythical Rule — game data (buildings, jobs, laws, religions, stances, kingdoms, names)
export const CELL = 4, GRID = 31, HALF = GRID / 2; // build grid: 31x31 cells of 4m around the castle
export const DAY_SEC = 18, MONTH_DAYS = 10;           // 1 day = 18 s, 1 month = 10 days = 3 minutes (passes automatically)
export const MONTHS = ['Frostmoon','Thawmoon','Seedmoon','Bloommoon','Sunmoon','Firemoon','Harvestmoon','Ashmoon','Mistmoon','Duskmoon','Wolfmoon','Darkmoon'];

// cost: resources; w,d: footprint in cells; jobs: {jobId: slots}; house: pop capacity; def: defense
export const BUILDINGS = {
  castle:   {name:'Castle',icon:'🏰',w:5,d:5,cost:{},house:10,jobs:{guard:2},def:20,hp:400,desc:'Seat of your rule. Houses 10 and hires 2 guards.',fixed:true},
  house:    {name:'House',icon:'🏠',w:2,d:2,cost:{wood:30,stone:5},house:6,hp:80,desc:'Timber house. +6 population capacity.',cat:'Homes'},
  manor:    {name:'Stone Manor',icon:'🏘️',w:3,d:2,cost:{wood:40,stone:40,gold:30},house:14,hp:140,desc:'Large stone home. +14 capacity, +2 happiness.',happy:2,cat:'Homes'},
  farm:     {name:'Farm',icon:'🌾',w:3,d:3,cost:{wood:25},jobs:{farmer:4},hp:60,desc:'Fields and barn. Hires 4 farmers (food).',cat:'Food'},
  hunter:   {name:"Hunter's Lodge",icon:'🏹',w:2,d:2,cost:{wood:30},jobs:{hunter:3},hp:60,desc:'Hires 3 hunters (food, hides). Fewer animal raids.',cat:'Food'},
  granary:  {name:'Granary',icon:'🫙',w:2,d:2,cost:{wood:40,stone:15},hp:90,desc:'+300 food storage, slows spoilage. Softens famine.',store:300,cat:'Food'},
  mill:     {name:'Lumber Mill',icon:'🪓',w:3,d:2,cost:{wood:15,stone:10},jobs:{woodcutter:4},hp:70,desc:'Hires 4 woodcutters (wood).',cat:'Industry'},
  quarry:   {name:'Quarry',icon:'🪨',w:3,d:3,cost:{wood:35},jobs:{mason:3},hp:90,desc:'Hires 3 stonecutters (stone).',cat:'Industry'},
  mine:     {name:'Iron Mine',icon:'⛏️',w:2,d:2,cost:{wood:40,stone:20},jobs:{miner:3},hp:90,desc:'Hires 3 miners (iron).',cat:'Industry'},
  smithy:   {name:'Blacksmith',icon:'⚒️',w:2,d:2,cost:{wood:30,stone:30},jobs:{smith:2},hp:90,desc:'Smiths turn iron into weapons: stronger army.',cat:'Industry'},
  market:   {name:'Market',icon:'⚖️',w:3,d:3,cost:{wood:50,stone:20},jobs:{merchant:3},hp:80,desc:'Hires 3 merchants (gold). Enables trade deals.',cat:'Industry'},
  tavern:   {name:'Tavern',icon:'🍺',w:2,d:2,cost:{wood:45,stone:10},jobs:{innkeeper:2},hp:70,desc:'Innkeepers raise happiness (+gold).',happy:3,cat:'Civic'},
  temple:   {name:'Temple',icon:'⛪',w:3,d:3,cost:{stone:60,wood:20,gold:40},jobs:{priest:3},hp:160,desc:'Hires 3 priests (faith). +3 happiness.',happy:3,cat:'Civic'},
  well:     {name:'Well',icon:'🪣',w:1,d:1,cost:{stone:15},hp:40,desc:'Clean water. +1 happiness, less plague.',happy:1,cat:'Civic'},
  garden:   {name:'Garden',icon:'🌳',w:2,d:2,cost:{wood:10,gold:15},hp:30,desc:'Flowers and trees. +2 happiness.',happy:2,cat:'Civic'},
  statue:   {name:'Royal Statue',icon:'🗿',w:1,d:1,cost:{stone:50,gold:60},hp:120,desc:'A statue of you. +4 happiness, +faith.',happy:4,cat:'Civic'},
  barracks: {name:'Barracks',icon:'🛡️',w:3,d:2,cost:{wood:40,stone:40},jobs:{soldier:8},hp:150,desc:'Hires 8 soldiers (army strength).',def:5,cat:'Military'},
  training: {name:'Training Ground',icon:'🎯',w:3,d:3,cost:{wood:40,gold:20},jobs:{trainer:2},hp:60,desc:'Trainers make soldiers +15% and train arena tributes.',cat:'Military'},
  arena:    {name:'Arena',icon:'🏟️',w:4,d:4,cost:{stone:120,wood:60,gold:80},hp:250,desc:'Your own arena: tributes start stronger, +3 happiness from games.',happy:3,cat:'Military'},
  wall:     {name:'Stone Wall',icon:'🧱',w:1,d:1,cost:{stone:8},def:2,hp:150,desc:'Wall segment. +2 defense. Blocks raiders.',cat:'Defense',repeat:true},
  palisade: {name:'Palisade',icon:'🪵',w:1,d:1,cost:{wood:6},def:1,hp:70,desc:'Cheap wooden wall. +1 defense.',cat:'Defense',repeat:true},
  tower:    {name:'Watchtower',icon:'🗼',w:1,d:1,cost:{stone:30,wood:10},jobs:{guard:2},def:6,hp:200,desc:'Archer tower. +6 defense, hires 2 guards.',cat:'Defense'},
  gate:     {name:'Gatehouse',icon:'🚪',w:2,d:1,cost:{stone:40,wood:20},def:5,hp:250,desc:'Fortified gate. +5 defense.',cat:'Defense'},
};
export const BUILD_CATS = ['Homes','Food','Industry','Civic','Military','Defense'];

// prod: resource per worker per day. bld: building type that provides slots (null = no building needed)
export const JOBS = {
  farmer:    {name:'Farmer',icon:'🌾',prod:{food:5},color:0x8a7a3a,bld:'farm'},
  hunter:    {name:'Hunter',icon:'🏹',prod:{food:4,gold:.5},color:0x4a5a2a,bld:'hunter'},
  woodcutter:{name:'Woodcutter',icon:'🪓',prod:{wood:4},color:0x6a4a2a,bld:'mill'},
  mason:     {name:'Stonecutter',icon:'🪨',prod:{stone:3},color:0x7a7a74,bld:'quarry'},
  miner:     {name:'Miner',icon:'⛏️',prod:{iron:2},color:0x3a3a40,bld:'mine'},
  smith:     {name:'Blacksmith',icon:'⚒️',prod:{weapons:2},use:{iron:1},color:0x2a2a2a,bld:'smithy'},
  merchant:  {name:'Merchant',icon:'⚖️',prod:{gold:5},color:0x7a2a6a,bld:'market'},
  innkeeper: {name:'Innkeeper',icon:'🍺',prod:{gold:2,joy:3},color:0x8a5a2a,bld:'tavern'},
  priest:    {name:'Priest',icon:'🙏',prod:{faith:3},color:0xe8e0d0,bld:'temple'},
  soldier:   {name:'Soldier',icon:'⚔️',prod:{},upkeep:.6,color:0x9a9aa8,bld:'barracks'},
  guard:     {name:'Guard',icon:'🛡️',prod:{},upkeep:.4,color:0x5a6a8a,bld:'castle|tower'},
  trainer:   {name:'Trainer',icon:'🎯',prod:{},color:0xaa3a2a,bld:'training'},
  builder:   {name:'Builder',icon:'🔨',prod:{},color:0xc08a3a,bld:null,desc:'Speeds up construction and repairs.'},
};
export const CUSTOM_PRODUCES = {food:'🍖 Food',wood:'🪵 Wood',stone:'🪨 Stone',iron:'⛓️ Iron',gold:'🪙 Gold',faith:'✨ Faith',joy:'😊 Happiness',def:'🛡️ Defense',army:'⚔️ Army'};
export const CUSTOM_RATE = {food:3.5,wood:3,stone:2,iron:1.4,gold:3,faith:2,joy:2,def:1.5,army:.8};
export const JOB_ICONS = ['🧑‍🌾','🎣','🍞','🧵','🐝','🍇','📜','🎻','🐎','🧪','🔮','🕯️','🗝️','🐑','🍷','🧙','🦅','🛶','🧱','💎'];

export const RES = [
  {id:'gold',icon:'🪙',name:'Gold'},{id:'food',icon:'🍖',name:'Food'},{id:'wood',icon:'🪵',name:'Wood'},{id:'stone',icon:'🪨',name:'Stone'},
  {id:'iron',icon:'⛓️',name:'Iron'},{id:'faith',icon:'✨',name:'Faith'},{id:'pop',icon:'👥',name:'Population'},{id:'happy',icon:'😊',name:'Happiness'},{id:'army',icon:'⚔️',name:'Army strength'},
];

export const RELIGIONS = {
  oldgods:  {name:'The Old Gods',icon:'⚡',color:'#c9a24a',desc:'Sun and storm. Farms +15% food.',fx:{food:1.15}},
  flame:    {name:'Church of the Holy Flame',icon:'🔥',color:'#ff8a3a',desc:'Faith +25%. +30% strength against zombies and demons.',fx:{faith:1.25,holy:1.3}},
  forest:   {name:'Forest Covenant',icon:'🌲',color:'#4caf50',desc:'Nature spirits. Hunters and woodcutters +20%, fewer animal raids.',fx:{hunt:1.2,wood:1.2,beasts:.5}},
  steel:    {name:'Cult of Steel',icon:'⚔️',color:'#b0b8c8',desc:'War god. Army +15%, tributes +10%, happiness −3.',fx:{army:1.15,trib:1.1,happy:-3}},
  moon:     {name:'The Silent Moon',icon:'🌙',color:'#9a8cff',desc:'Mystic order. Scenario outcomes luckier, faith +10%.',fx:{luck:1,faith:1.1}},
  coin:     {name:'The Golden Coin',icon:'🪙',color:'#ffd54a',desc:'Prosperity creed. Gold +20%, faith −20%.',fx:{gold:1.2,faith:.8}},
};
export const STANCES = {
  peaceful:{name:'Peaceful',icon:'🕊️',desc:'+8 happiness, kingdoms like you more, army −10%.',happy:8,rel:20,army:.9,aggro:.5},
  neutral: {name:'Neutral',icon:'⚖️',desc:'Balanced. No bonuses or penalties.',happy:0,rel:0,army:1,aggro:1},
  warlike: {name:'Warlike',icon:'🔥',desc:'Army +20%, raids give more loot, happiness −4, kingdoms trust you less.',happy:-4,rel:-20,army:1.2,aggro:1.6},
};
export const EMBLEMS = ['🦁','🐺','🦅','🐉','🌳','⚔️','👑','🌙','☀️','🔥','🦌','🐻','🛡️','⭐','🌹','💀'];
export const COLORS = ['#8b1a1a','#c0392b','#e67e22','#d4ac0d','#f1e7c8','#27ae60','#145a32','#1f618d','#2e86c1','#5b2c6f','#8e44ad','#2c2c2c','#7b7d7d','#6e2c00','#0e6655','#b03a2e'];

// Laws: each has options with effects. Effects are multipliers/additive mods, read in sim.
export const LAWS = {
  tax:{name:'Taxes',icon:'🪙',opts:[
    {id:'low',name:'Low',desc:'+0.2 gold/citizen/day, +6 happiness',gold:.2,happy:6},
    {id:'normal',name:'Normal',desc:'+0.45 gold/citizen/day',gold:.45,happy:0},
    {id:'high',name:'High',desc:'+0.8 gold/citizen/day, −8 happiness',gold:.8,happy:-8},
    {id:'crush',name:'Crushing',desc:'+1.2 gold/citizen/day, −18 happiness, rebellion risk',gold:1.2,happy:-18}]},
  ration:{name:'Rations',icon:'🍖',opts:[
    {id:'feast',name:'Feasts',desc:'1.5 food/citizen, +8 happiness, faster growth',eat:1.5,happy:8,grow:1.4},
    {id:'normal',name:'Normal',desc:'1 food/citizen/day',eat:1,happy:0,grow:1},
    {id:'ration',name:'Rationing',desc:'0.7 food/citizen, −6 happiness, slower growth',eat:.7,happy:-6,grow:.6},
    {id:'strict',name:'Strict Rations',desc:'0.45 food/citizen, −15 happiness, no growth',eat:.45,happy:-15,grow:0}]},
  hours:{name:'Work Hours',icon:'⏳',opts:[
    {id:'short',name:'Short Days',desc:'Production −15%, +6 happiness',prod:.85,happy:6},
    {id:'normal',name:'Normal',desc:'Normal production',prod:1,happy:0},
    {id:'long',name:'Long Days',desc:'Production +20%, −8 happiness',prod:1.2,happy:-8},
    {id:'dawn',name:'Dawn to Dusk',desc:'Production +35%, −16 happiness',prod:1.35,happy:-16}]},
  conscript:{name:'Conscription',icon:'⚔️',opts:[
    {id:'none',name:'Volunteers Only',desc:'+3 happiness, army −10%',army:.9,happy:3},
    {id:'levy',name:'Levy',desc:'Normal army',army:1,happy:0},
    {id:'draft',name:'Mandatory Draft',desc:'Army +25%, −7 happiness',army:1.25,happy:-7}]},
  curfew:{name:'Curfew',icon:'🌙',opts:[
    {id:'off',name:'No Curfew',desc:'Normal',happy:0,crime:1},
    {id:'on',name:'Night Curfew',desc:'Fewer bandit, cult and fire scenarios, −4 happiness',happy:-4,crime:.5}]},
  faith:{name:'Religious Law',icon:'✨',opts:[
    {id:'tolerance',name:'Tolerance',desc:'+4 happiness, faith −10%',happy:4,faith:.9},
    {id:'state',name:'State Faith',desc:'Faith +25%',happy:0,faith:1.25},
    {id:'inquisition',name:'Inquisition',desc:'Faith +50%, demons weaker, −10 happiness',happy:-10,faith:1.5,holy:1.2}]},
  hunting:{name:'Hunting Rights',icon:'🦌',opts:[
    {id:'common',name:'Commoners May Hunt',desc:'Hunters +25%, +2 happiness, animals grow bolder',hunt:1.25,happy:2,beasts:1.2},
    {id:'royal',name:'Royal Forests',desc:'Hunters −20%, −2 happiness, fewer animal raids',hunt:.8,happy:-2,beasts:.7}]},
  borders:{name:'Borders',icon:'🚪',opts:[
    {id:'open',name:'Open Borders',desc:'Trade gold +30%, more refugees and plague',trade:1.3,plague:1.4,happy:1},
    {id:'closed',name:'Closed Borders',desc:'Trade −30%, safer',trade:.7,plague:.6,happy:-1}]},
  justice:{name:'Justice',icon:'⚖️',opts:[
    {id:'mercy',name:'Mercy',desc:'+4 happiness, more crime',happy:4,crime:1.3},
    {id:'fair',name:'Fair Trials',desc:'Normal',happy:0,crime:1},
    {id:'iron',name:'Iron Fist',desc:'Crime −50%, −8 happiness',happy:-8,crime:.5}]},
  arena:{name:'Arena Selection',icon:'🏟️',opts:[
    {id:'volunteer',name:'Volunteers',desc:'You choose tributes freely. Normal',trib:1,happy:0},
    {id:'reaping',name:'The Reaping (lottery)',desc:'Random tributes, +3 happiness from fairness',trib:.95,happy:3,random:true},
    {id:'career',name:'Career Champions',desc:'Tributes train from childhood: +20% strength, −5 happiness, costs 2 gold/day',trib:1.2,happy:-5,cost:2}]},
};
export const DEFAULT_LAWS = {tax:'normal',ration:'normal',hours:'normal',conscript:'levy',curfew:'off',faith:'state',hunting:'common',borders:'open',justice:'fair',arena:'volunteer'};

export const DECISIONS = [
  {id:'festival',name:'Hold a Festival',icon:'🎉',desc:'+15 happiness for 2 days.',cost:{gold:60,food:40},cd:180},
  {id:'prayer',name:'Day of Prayer',icon:'🙏',desc:'+40 faith, production −20% for half a day.',cost:{},cd:150},
  {id:'levy',name:'Raise the Levy',icon:'📯',desc:'Arm unemployed citizens: +8 temporary army for 2 days.',cost:{gold:40,iron:10},cd:200},
  {id:'hunt',name:'Royal Hunt',icon:'🦌',desc:'Send hunters into the forest: +35–60 food (small risk).',cost:{},cd:120},
  {id:'alms',name:'Give Alms',icon:'🍞',desc:'Feed the poor: +8 happiness, +10 faith.',cost:{food:50,gold:20},cd:120},
  {id:'tribute_train',name:'Train Tributes',icon:'🎯',desc:'Your next 3 arena tributes get +1 strength or agility.',cost:{gold:50,food:30},cd:150},
  {id:'sell_wood',name:'Sell Timber',icon:'🪵',desc:'Sell 60 wood for 40 gold.',cost:{wood:60},cd:30},
  {id:'buy_food',name:'Buy Grain',icon:'🌾',desc:'Buy 60 food for 45 gold.',cost:{gold:45},cd:30},
  {id:'buy_iron',name:'Buy Iron',icon:'⛓️',desc:'Buy 25 iron for 50 gold.',cost:{gold:50},cd:30},
  {id:'sell_stone',name:'Sell Stone',icon:'🪨',desc:'Sell 50 stone for 40 gold.',cost:{stone:50},cd:30},
];

export const KINGDOM_NAMES = ['Valdoria','Eastmarch','Ravenholm','Highcrest','Stormhaven','Dunmere','Goldvale','Ironfell','Westreach','Thornwall','Silverkeep','Ashford'];
export const RULERS = ['King Aldric','Queen Maerwen','Lord Bram','Queen Isolde','King Theoden','Lady Rowena','King Osric','Queen Elara','Lord Garrick','Queen Sigrid'];
export const PERSONALITIES = {
  honorable:{name:'Honorable',desc:'Keeps treaties, slow to anger.',aggro:.6,trust:1.3},
  greedy:{name:'Greedy',desc:'Loves gold and trade. Can be bought.',aggro:.9,trust:.9,gold:1.6},
  aggressive:{name:'Aggressive',desc:'Covets your land. Quick to war.',aggro:1.7,trust:.7},
  cautious:{name:'Cautious',desc:'Defensive. Joins strong friends.',aggro:.5,trust:1},
};
export const FIRST = ['Aldo','Bryn','Cora','Dain','Edda','Finn','Gwen','Hale','Ivo','Jora','Kael','Lira','Mara','Nils','Oren','Pell','Quinn','Rhea','Soren','Tamsin','Ulric','Vera','Wyn','Yara','Zane','Brom','Elsa','Torin','Nessa','Rook','Arlo','Kira','Ash','Fen','Ilse','Joss','Mira','Tobin','Wren','Hugo'];
export const ZOMBIE_NAMES = ['Grul the Rotten','Mother Moss','Hollow Jack','The Pale Knight','Sallow Ann','Bonechewer','Old Fester','The Weeping Bride','Gravel-Tooth'];
export const DEMON_NAMES = ['Azkaroth','Vexira','Malgor','Shrike','Bael-Ka','Nyxa','Ignar','Skorn','Velith'];
export const ORC_NAMES = ['Ugluk Skullsplitter','Grishna the Cruel','Mogdush Bonegnaw','Azgar Ironjaw','Lurtz Bloodtusk'];
export const MYTHIC = {
  elf:{names:['Silverwood','Lothien Vale','Starfall Glade'],rulers:['Queen Aerin Starbloom','Lord Celeborn','Lady Ithilwen','King Thalion'],c1:'#145a32',c2:'#f1e7c8',emblem:'🌿',pers:'cautious',desc:'Elven realm'},
  dwarf:{names:['Ironhold Deep','Khazrak','Stonebeard Hall'],rulers:['King Thrain Stonefist','Queen Dagna Goldvein','Lord Borin Oakenshield','King Durin the Deep'],c1:'#6e2c00',c2:'#d4ac0d',emblem:'⚒️',pers:'greedy',desc:'Dwarven kingdom'},
};
export const HUMAN_STYLES = {stone:'Stone kingdom',timber:'Northmen of the timber halls',sand:'Desert sultanate'};
