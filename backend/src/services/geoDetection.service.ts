import type { LocationDetails, TopicCategory, TopicClassification } from '@ai-toon/shared';
import { geoapifyService } from './geoapify.service.js';

/**
 * Pre-compiled dictionary of known birthplaces and origins for notable personalities.
 * Used when users explicitly ask for the birthplace, native place, origin, or location of a person.
 */
const KNOWN_ENTITY_LOCATIONS: Record<string, string> = {
  // Cricketers & Athletes
  'virat kohli': 'New Delhi, Delhi, India',
  'kohli': 'New Delhi, Delhi, India',
  'ms dhoni': 'Ranchi, Jharkhand, India',
  'm.s. dhoni': 'Ranchi, Jharkhand, India',
  'dhoni': 'Ranchi, Jharkhand, India',
  'mahendra singh dhoni': 'Ranchi, Jharkhand, India',
  'sachin tendulkar': 'Mumbai, Maharashtra, India',
  'tendulkar': 'Mumbai, Maharashtra, India',
  'rohit sharma': 'Nagpur, Maharashtra, India',
  'kapil dev': 'Chandigarh, India',
  'rahul dravid': 'Indore, Madhya Pradesh, India',
  'sourav ganguly': 'Kolkata, West Bengal, India',
  'yuvraj singh': 'Chandigarh, India',
  'hardik pandya': 'Choryasi, Surat, Gujarat, India',
  'jasprit bumrah': 'Ahmedabad, Gujarat, India',
  'cristiano ronaldo': 'Funchal, Madeira, Portugal',
  'ronaldo': 'Funchal, Madeira, Portugal',
  'lionel messi': 'Rosario, Santa Fe, Argentina',
  'messi': 'Rosario, Santa Fe, Argentina',
  'usain bolt': 'Sherwood Content, Trelawny, Jamaica',
  'michael jordan': 'Brooklyn, New York, USA',
  'roger federer': 'Basel, Switzerland',
  'rafael nadal': 'Manacor, Mallorca, Spain',
  'neeraj chopra': 'Khandra, Panipat, Haryana, India',
  'pv sindhu': 'Hyderabad, Telangana, India',
  'p.v. sindhu': 'Hyderabad, Telangana, India',
  'sania mirza': 'Mumbai, Maharashtra, India',

  // Scientists & Inventors
  'albert einstein': 'Ulm, Baden-Württemberg, Germany',
  'einstein': 'Ulm, Baden-Württemberg, Germany',
  'isaac newton': 'Woolsthorpe-by-Colsterworth, Lincolnshire, England',
  'newton': 'Woolsthorpe-by-Colsterworth, Lincolnshire, England',
  'apj abdul kalam': 'Rameswaram, Tamil Nadu, India',
  'a.p.j. abdul kalam': 'Rameswaram, Tamil Nadu, India',
  'abdul kalam': 'Rameswaram, Tamil Nadu, India',
  'alan turing': 'Maida Vale, London, England',
  'marie curie': 'Warsaw, Poland',
  'stephen hawking': 'Oxford, Oxfordshire, England',
  'charles darwin': 'Shrewsbury, Shropshire, England',
  'nikola tesla': 'Smiljan, Croatia',
  'thomas edison': 'Milan, Ohio, USA',
  'galileo galilei': 'Pisa, Tuscany, Italy',
  'galileo': 'Pisa, Tuscany, Italy',
  'c.v. raman': 'Tiruchirappalli, Tamil Nadu, India',
  'cv raman': 'Tiruchirappalli, Tamil Nadu, India',
  'srinivasa ramanujan': 'Erode, Tamil Nadu, India',
  'ramanujan': 'Erode, Tamil Nadu, India',
  'homi bhabha': 'Mumbai, Maharashtra, India',
  'jagadish chandra bose': 'Bikrampur, Bengal Presidency',
  'vikram sarabhai': 'Ahmedabad, Gujarat, India',
  'ada lovelace': 'London, England',
  'richard feynman': 'Queens, New York City, USA',

  // Historical Personalities & Leaders
  'mahatma gandhi': 'Porbandar, Gujarat, India',
  'gandhi': 'Porbandar, Gujarat, India',
  'jawaharlal nehru': 'Prayagraj, Uttar Pradesh, India',
  'nehru': 'Prayagraj, Uttar Pradesh, India',
  'subhas chandra bose': 'Cuttack, Odisha, India',
  'subhash chandra bose': 'Cuttack, Odisha, India',
  'netaji': 'Cuttack, Odisha, India',
  'bhagat singh': 'Banga, Faisalabad District, Punjab',
  'sardar vallabhbhai patel': 'Nadiad, Gujarat, India',
  'sardar patel': 'Nadiad, Gujarat, India',
  'b.r. ambedkar': 'Mhow, Madhya Pradesh, India',
  'dr. b.r. ambedkar': 'Mhow, Madhya Pradesh, India',
  'ambedkar': 'Mhow, Madhya Pradesh, India',
  'narendra modi': 'Vadnagar, Mehsana, Gujarat, India',
  'modi': 'Vadnagar, Mehsana, Gujarat, India',
  'rabindranath tagore': 'Kolkata, West Bengal, India',
  'tagore': 'Kolkata, West Bengal, India',
  'william shakespeare': 'Stratford-upon-Avon, Warwickshire, England',
  'shakespeare': 'Stratford-upon-Avon, Warwickshire, England',
  'nelson mandela': 'Mvezo, Eastern Cape, South Africa',
  'mandela': 'Mvezo, Eastern Cape, South Africa',
  'abraham lincoln': 'Hodgenville, Kentucky, USA',
  'george washington': 'Westmoreland County, Virginia, USA',
  'leonardo da vinci': 'Vinci, Florence, Italy',
};

/**
 * Patterns matching explicit requests for geographical coordinates, locations, or birthplaces
 */
const EXPLICIT_LOCATION_PATTERNS = [
  /\b(birthplace|birth\s+place|native\s+place|origin|hometown|home\s+town)\s+(of|for)\b/i,
  /^where\s+(is|was|are|were)\s+(.+?)\s+(from|born|located|situated|found|placed)\??$/i,
  /^where\s+(is|was)\s+(.+?)\??$/i,
  /\b(location|geography|map|coordinates|directions|where\s+to\s+find)\s+(of|to|for)\b/i,
  /\bwhat\s+is\s+the\s+location\s+of\b/i,
  /\bhow\s+to\s+reach\b/i,
];

/**
 * Known individuals (Athletes, Scientists, Leaders, Writers, Celebrities).
 * Primary educational lessons on these individuals MUST NOT display a map.
 */
const KNOWN_PEOPLE_LIST = new Set([
  'virat kohli',
  'kohli',
  'ms dhoni',
  'm.s. dhoni',
  'dhoni',
  'mahendra singh dhoni',
  'sachin tendulkar',
  'tendulkar',
  'rohit sharma',
  'kapil dev',
  'rahul dravid',
  'sourav ganguly',
  'yuvraj singh',
  'hardik pandya',
  'jasprit bumrah',
  'ravindra jadeja',
  'sunil gavaskar',
  'anil kumble',
  'vvs laxman',
  'shikhar dhawan',
  'rishabh pant',
  'kl rahul',
  'shubman gill',
  'suresh raina',
  'babar azam',
  'cristiano ronaldo',
  'ronaldo',
  'lionel messi',
  'messi',
  'usain bolt',
  'michael jordan',
  'roger federer',
  'rafael nadal',
  'novak djokovic',
  'lebron james',
  'muhammad ali',
  'pele',
  'diego maradona',
  'maradona',
  'serena williams',
  'neeraj chopra',
  'pv sindhu',
  'p.v. sindhu',
  'sania mirza',
  'saina nehwal',
  'dhyan chand',
  'milkha singh',
  'mary kom',
  'viswanathan anand',
  'magnus carlsen',
  'albert einstein',
  'einstein',
  'isaac newton',
  'newton',
  'apj abdul kalam',
  'a.p.j. abdul kalam',
  'abdul kalam',
  'alan turing',
  'turing',
  'marie curie',
  'curie',
  'stephen hawking',
  'hawking',
  'charles darwin',
  'darwin',
  'nikola tesla',
  'tesla',
  'thomas edison',
  'edison',
  'galileo galilei',
  'galileo',
  'alexander graham bell',
  'louis pasteur',
  'c.v. raman',
  'cv raman',
  'srinivasa ramanujan',
  'ramanujan',
  'homi bhabha',
  'jagadish chandra bose',
  'vikram sarabhai',
  'aryabhata',
  'ada lovelace',
  'richard feynman',
  'feynman',
  'niels bohr',
  'max planck',
  'ernest rutherford',
  'james clerk maxwell',
  'michael faraday',
  'gregor mendel',
  'dmitri mendeleev',
  'enrico fermi',
  'robert oppenheimer',
  'oppenheimer',
  'john von neumann',
  'mahatma gandhi',
  'gandhi',
  'jawaharlal nehru',
  'nehru',
  'subhas chandra bose',
  'subhash chandra bose',
  'netaji',
  'bhagat singh',
  'sardar vallabhbhai patel',
  'sardar patel',
  'b.r. ambedkar',
  'dr. b.r. ambedkar',
  'ambedkar',
  'narendra modi',
  'modi',
  'atal bihari vajpayee',
  'indira gandhi',
  'lal bahadur shastri',
  'abraham lincoln',
  'lincoln',
  'george washington',
  'nelson mandela',
  'mandela',
  'winston churchill',
  'martin luther king',
  'martin luther king jr',
  'alexander the great',
  'julius caesar',
  'caesar',
  'napoleon bonaparte',
  'napoleon',
  'ashoka',
  'emperor ashoka',
  'akbar',
  'emperor akbar',
  'chhatrapati shivaji',
  'shivaji maharaj',
  'shivaji',
  'rani lakshmibai',
  'alluri sitarama raju',
  'tipu sultan',
  'krishnadevaraya',
  'cleopatra',
  'mother teresa',
  'william shakespeare',
  'shakespeare',
  'rabindranath tagore',
  'tagore',
  'aristotle',
  'plato',
  'socrates',
  'swami vivekananda',
  'vivekananda',
  'gautama buddha',
  'buddha',
  'leonardo da vinci',
  'da vinci',
  'michelangelo',
  'pablo picasso',
  'vincent van gogh',
  'beethoven',
  'mozart',
  'steve jobs',
  'bill gates',
  'elon musk',
  'sundar pichai',
  'satya nadella',
]);

/**
 * Patterns matching person titles, honorifics, and biographical descriptors
 */
const PERSON_DESCRIPTOR_PATTERNS = [
  /\b(biography\s+of|life\s+of|story\s+of)\s+([a-z\s]+)/i,
  /\b(dr|prof|sir|lord|saint|mr|mrs|ms|president|prime\s+minister|king|queen|emperor|empress|cricketer|captain|batsman|bowler|footballer|actor|actress|author|poet|philosopher|scientist|mathematician|physicist|inventor)\b/i,
];

/**
 * Science concepts (biology, physics, chemistry, astronomy, earth science).
 * Maps MUST NOT be rendered.
 */
const SCIENCE_PATTERNS = [
  /\bphotosynthesis\b/i,
  /\bsolar\s+system\b/i,
  /\brespiration\b/i,
  /\bmitosis\b/i,
  /\bmeiosis\b/i,
  /\bgravity\b/i,
  /\bgravitational\b/i,
  /\bthermodynamics\b/i,
  /\bwater\s+cycle\b/i,
  /\bcirculatory\s+system\b/i,
  /\bdigestive\s+system\b/i,
  /\bnervous\s+system\b/i,
  /\bevolution\b/i,
  /\bnatural\s+selection\b/i,
  /\bquantum\b/i,
  /\bnewton('?s)?\s+law/i,
  /\blaws?\s+of\s+motion\b/i,
  /\bcell\s+structure\b/i,
  /\bdna\b/i,
  /\brna\b/i,
  /\becosystem\b/i,
  /\bfood\s+(chain|web)\b/i,
  /\bperiodic\s+table\b/i,
  /\bplate\s+tectonics\b/i,
  /\belectromagnetism\b/i,
  /\brefraction\b/i,
  /\breflection\b/i,
  /\batom(ic)?\b/i,
  /\bmolecule\b/i,
  /\bosmosis\b/i,
  /\bgenetics\b/i,
  /\bcarbon\s+cycle\b/i,
  /\bblack\s+hole\b/i,
  /\bspeed\s+of\s+light\b/i,
  /\brelativity\b/i,
  /\bkinetic\s+energy\b/i,
  /\bpotential\s+energy\b/i,
  /\bchemical\s+bonding\b/i,
  /\bacids?\s+and\s+bases?\b/i,
  /\bchloroplast\b/i,
  /\bchlorophyll\b/i,
  /\bmitochondria\b/i,
];

/**
 * Computer science, mathematics, and technology concepts.
 * Maps MUST NOT be rendered.
 */
const TECHNOLOGY_PATTERNS = [
  /\bbinary\s+search\b/i,
  /\b(linear|bubble|merge|quick|heap|insertion)\s+sort\b/i,
  /\balgorithm\b/i,
  /\bdata\s+structure\b/i,
  /\blinked\s+list\b/i,
  /\bstack\b/i,
  /\bqueue\b/i,
  /\bhash\s+(table|map)\b/i,
  /\bbinary\s+tree\b/i,
  /\bdynamic\s+programming\b/i,
  /\brecursion\b/i,
  /\bbig\s+o\b/i,
  /\bartificial\s+intelligence\b/i,
  /\bmachine\s+learning\b/i,
  /\bdeep\s+learning\b/i,
  /\bneural\s+network\b/i,
  /\boperating\s+system\b/i,
  /\bcompiler\b/i,
  /\bdatabase\b/i,
  /\bsql\b/i,
  /\bblockchain\b/i,
  /\bcryptography\b/i,
  /\bcybersecurity\b/i,
  /\bcomputer\s+network\b/i,
  /\btcp\/?ip\b/i,
  /\bcloud\s+computing\b/i,
  /\bobject\s+oriented\s+programming\b/i,
];

/**
 * Foods, recipes, sweets, and beverages.
 * Maps MUST NOT be rendered.
 */
const FOOD_PATTERNS = [
  /\bbiryani\b/i,
  /\bjalebi\b/i,
  /\bsamosa\b/i,
  /\bdosa\b/i,
  /\bidli\b/i,
  /\bgulab\s+jamun\b/i,
  /\bladd(oo|u)\b/i,
  /\bpizza\b/i,
  /\bburger\b/i,
  /\bpasta\b/i,
  /\bice\s*cream\b/i,
  /\bchocolate\b/i,
  /\broti\b/i,
  /\bnaan\b/i,
  /\bcurry\b/i,
  /\bsandwich\b/i,
  /\btacos\b/i,
  /\bsushi\b/i,
  /\bpaneer\b/i,
  /\bpulao\b/i,
  /\brash?gulla\b/i,
  /\bkheer\b/i,
  /\bkebab\b/i,
  /\bhalwa\b/i,
  /\bpav\s+bhaji\b/i,
  /\bvada\s+pav\b/i,
  /\bchole\s+bhature\b/i,
];

/**
 * Wildlife, animals, and birds.
 * Maps MUST NOT be rendered.
 */
const ANIMAL_PATTERNS = [
  /\btiger\b/i,
  /\blion\b/i,
  /\belephant\b/i,
  /\bpeacock\b/i,
  /\bcheetah\b/i,
  /\bgiraffe\b/i,
  /\bzebra\b/i,
  /\bkangaroo\b/i,
  /\bpanda\b/i,
  /\bwhale\b/i,
  /\bdolphin\b/i,
  /\beagle\b/i,
  /\bpenguin\b/i,
  /\bchameleon\b/i,
  /\boctopus\b/i,
  /\bkoala\b/i,
  /\bchimpanzee\b/i,
  /\bgorilla\b/i,
  /\bwolf\b/i,
  /\bbear\b/i,
  /\bcrocodile\b/i,
  /\bsnake\b/i,
  /\bshark\b/i,
];

/**
 * Major historical events, wars, and revolutions.
 * Maps MUST NOT be rendered unless user explicitly queries the battlefield/location.
 */
const HISTORICAL_EVENT_PATTERNS = [
  /\bworld\s+war\s+(1|2|i|ii|one|two)\b/i,
  /\bfrench\s+revolution\b/i,
  /\bindustrial\s+revolution\b/i,
  /\bamerican\s+civil\s+war\b/i,
  /\bcold\s+war\b/i,
  /\bd-day\b/i,
  /\bquit\s+india\s+movement\b/i,
  /\bdandi\s+march\b/i,
  /\bnon-?cooperation\s+movement\b/i,
  /\bbattle\s+of\s+(plassey|buxar|panipat)\b/i,
  /\bsepoy\s+mutiny\b/i,
  /\brevolt\s+of\s+1857\b/i,
  /\brenaissance\b/i,
];

/**
 * Universities and academic institutions where physical campus location is educational.
 * SHOW MAP when physical campus is relevant.
 */
const INSTITUTION_PATTERNS = [
  /\boxford(\s+university)?\b/i,
  /\bcambridge(\s+university)?\b/i,
  /\bharvard(\s+university)?\b/i,
  /\bstanford(\s+university)?\b/i,
  /\bmit\b/i,
  /\bmassachusetts\s+institute\s+of\s+technology\b/i,
  /\bcaltech\b/i,
  /\bprinceton(\s+university)?\b/i,
  /\byale(\s+university)?\b/i,
  /\biit\s+(madras|bombay|delhi|kanpur|kharagpur|roorkee)\b/i,
  /\bvignan('?s)?\s+(university|foundation)?\b/i,
  /\bandhra\s+university\b/i,
  /\bosmania\s+university\b/i,
  /\bdelhi\s+university\b/i,
  /\biisc(\s+bangalore)?\b/i,
  /\baiims(\s+delhi)?\b/i,
  /\bbits\s+pilani\b/i,
  /\buniversity\b/i,
  /\bcollege\b/i,
  /\bacademy\b/i,
];

/**
 * Explicit physical places, cities, districts, states, countries, monuments, natural landmarks.
 */
const PLACE_SEEDS = new Set([
  'guntur',
  'tirupati',
  'india',
  'donakonda',
  'ganga donakonda',
  'pedanandipadu',
  'mount everest',
  'everest',
  'taj mahal',
  'new delhi',
  'delhi',
  'hyderabad',
  'vijayawada',
  'visakhapatnam',
  'bengaluru',
  'bangalore',
  'chennai',
  'mumbai',
  'kolkata',
  'london',
  'paris',
  'tokyo',
  'new york',
  'rome',
  'nepal',
  'japan',
  'australia',
  'andhra pradesh',
  'telangana',
  'prakasam',
  'agra',
  'red fort',
  'india gate',
  'eiffel tower',
  'statue of unity',
  'grand canyon',
  'niagara falls',
  'amazon river',
  'ganga river',
  'himalayas',
  'sahara desert',
  'great barrier reef',
  'colosseum',
  'pyramids of giza',
  'qutub minar',
  'charminar',
  'kapila theertham',
  'tirumala hills',
]);

const GEOGRAPHICAL_INDICATOR_PATTERNS = [
  /\bvillage\b/i,
  /\btown\b/i,
  /\bcity\b/i,
  /\bdistrict\b/i,
  /\bmandal\b/i,
  /\btehsil\b/i,
  /\btaluk\b/i,
  /\bstate\b/i,
  /\bcountry\b/i,
  /\bprovince\b/i,
  /\btemple\b/i,
  /\bmonument\b/i,
  /\bfort\b/i,
  /\bpalace\b/i,
  /\bmountain\b/i,
  /\bpeak\b/i,
  /\bhills?\b/i,
  /\bglen\b/i,
  /\bvalley\b/i,
  /\briver\b/i,
  /\blake\b/i,
  /\bocean\b/i,
  /\bsea\b/i,
  /\bisland\b/i,
  /\bpeninsula\b/i,
  /\bwaterfall\b/i,
  /\bcave\b/i,
  /\bdesert\b/i,
  /\bplateau\b/i,
  /\bforest\b/i,
  /\bstupa\b/i,
];

export class GeoDetectionService {
  /**
   * Primary context-aware classification method.
   * Categorizes the user's educational topic and determines whether a map is genuinely relevant.
   */
  public classifyTopic(rawTopic: string): TopicClassification {
    const topic = (rawTopic || '').trim();
    if (!topic || topic.length < 2) {
      return {
        category: 'GENERAL_TOPIC',
        confidence: 1.0,
        requiresMap: false,
        reasoning: 'Topic string is empty or insufficient.',
      };
    }

    const lower = topic.toLowerCase();
    const cleanLower = lower.replace(/[?!.,]+/g, '').trim();

    // =========================================================================
    // 1. EXPLICIT LOCATION QUESTIONS (e.g. "Birthplace of Virat Kohli", "Where is Virat Kohli from?")
    // =========================================================================
    for (const pattern of EXPLICIT_LOCATION_PATTERNS) {
      if (pattern.test(topic)) {
        const extractedEntity = this.extractSubjectFromQuestion(topic);
        const resolvedPlace = KNOWN_ENTITY_LOCATIONS[extractedEntity.toLowerCase()] || extractedEntity;

        return {
          category: 'PLACE',
          confidence: 0.95,
          requiresMap: true,
          resolvedLocationQuery: resolvedPlace,
          reasoning: `User explicitly requested geographical origin or location of "${extractedEntity}". Map will display resolved place: "${resolvedPlace}".`,
        };
      }
    }

    // =========================================================================
    // 2. PERSON CLASSIFICATION (MUST HIDE MAP)
    // =========================================================================
    // Check known people dictionary
    if (KNOWN_PEOPLE_LIST.has(cleanLower)) {
      return {
        category: 'PERSON',
        confidence: 0.98,
        requiresMap: false,
        reasoning: `Topic "${topic}" represents an individual person. Biographical topics do not display maps.`,
      };
    }

    // Check if topic begins or ends with known person name (e.g., "Virat Kohli career", "Albert Einstein biography")
    for (const person of KNOWN_PEOPLE_LIST) {
      if (cleanLower === person || cleanLower.startsWith(person + ' ') || cleanLower.endsWith(' ' + person)) {
        return {
          category: 'PERSON',
          confidence: 0.95,
          requiresMap: false,
          reasoning: `Topic contains reference to individual person "${person}". Geographical map is not relevant.`,
        };
      }
    }

    // Check person titles or descriptors
    for (const pat of PERSON_DESCRIPTOR_PATTERNS) {
      if (pat.test(topic)) {
        return {
          category: 'PERSON',
          confidence: 0.85,
          requiresMap: false,
          reasoning: 'Topic matches personal biographical or professional descriptor.',
        };
      }
    }

    // =========================================================================
    // 3. SCIENCE CONCEPT (MUST HIDE MAP)
    // =========================================================================
    for (const pat of SCIENCE_PATTERNS) {
      if (pat.test(topic)) {
        return {
          category: 'SCIENCE_CONCEPT',
          confidence: 0.95,
          requiresMap: false,
          reasoning: 'Topic represents a scientific, biological, or physical principle.',
        };
      }
    }

    // =========================================================================
    // 4. TECHNOLOGY CONCEPT (MUST HIDE MAP)
    // =========================================================================
    for (const pat of TECHNOLOGY_PATTERNS) {
      if (pat.test(topic)) {
        return {
          category: 'TECHNOLOGY_CONCEPT',
          confidence: 0.95,
          requiresMap: false,
          reasoning: 'Topic represents a computer science, algorithm, or engineering concept.',
        };
      }
    }

    // =========================================================================
    // 5. FOOD CONCEPT (MUST HIDE MAP)
    // =========================================================================
    for (const pat of FOOD_PATTERNS) {
      if (pat.test(topic)) {
        return {
          category: 'FOOD',
          confidence: 0.95,
          requiresMap: false,
          reasoning: 'Topic represents food, culinary preparations, or recipes.',
        };
      }
    }

    // =========================================================================
    // 6. ANIMAL CONCEPT (MUST HIDE MAP)
    // =========================================================================
    for (const pat of ANIMAL_PATTERNS) {
      if (pat.test(topic)) {
        return {
          category: 'ANIMAL',
          confidence: 0.95,
          requiresMap: false,
          reasoning: 'Topic represents wildlife, animals, or biological species.',
        };
      }
    }

    // =========================================================================
    // 7. HISTORICAL EVENT (MUST HIDE MAP)
    // =========================================================================
    for (const pat of HISTORICAL_EVENT_PATTERNS) {
      if (pat.test(topic)) {
        return {
          category: 'HISTORICAL_EVENT',
          confidence: 0.9,
          requiresMap: false,
          reasoning: 'Topic represents a historical event or period.',
        };
      }
    }

    // =========================================================================
    // 8. INSTITUTION / UNIVERSITY (SHOW MAP when physical campus is relevant)
    // =========================================================================
    for (const pat of INSTITUTION_PATTERNS) {
      if (pat.test(topic)) {
        return {
          category: 'INSTITUTION',
          confidence: 0.92,
          requiresMap: true,
          resolvedLocationQuery: topic,
          reasoning: `Topic represents an academic institution where physical campus location is educational.`,
        };
      }
    }

    // =========================================================================
    // 9. PLACE / GEOGRAPHICAL ENTITY (SHOW MAP)
    // =========================================================================
    // Check known place seeds
    if (PLACE_SEEDS.has(cleanLower)) {
      return {
        category: 'PLACE',
        confidence: 0.98,
        requiresMap: true,
        resolvedLocationQuery: topic,
        reasoning: `Topic "${topic}" is an authoritative known geographical place or physical landmark.`,
      };
    }

    // Check geographical indicator patterns (village, city, river, mountain, monument, etc.)
    for (const pat of GEOGRAPHICAL_INDICATOR_PATTERNS) {
      if (pat.test(topic)) {
        return {
          category: 'PLACE',
          confidence: 0.9,
          requiresMap: true,
          resolvedLocationQuery: topic,
          reasoning: `Topic contains geographical descriptor matching ${pat}.`,
        };
      }
    }

    // =========================================================================
    // 10. GENERAL TOPIC (DEFAULT TO NO MAP TO PREVENT FALSE POSITIVES)
    // =========================================================================
    return {
      category: 'GENERAL_TOPIC',
      confidence: 0.7,
      requiresMap: false,
      reasoning: 'Topic does not exhibit genuine geographical intent. Map is hidden by default.',
    };
  }

  /**
   * Evaluates the educational topic, determines map requirements,
   * and geocodes only when genuinely relevant.
   */
  public async evaluateTopic(topic: string): Promise<{
    location: LocationDetails | null;
    classification: TopicClassification;
    requiresMap: boolean;
  }> {
    const classification = this.classifyTopic(topic);

    // If classified as not requiring a map (Person, Science, Tech, Food, Animal, General):
    // DO NOT query geocoding services. Returns location: null, requiresMap: false.
    if (!classification.requiresMap) {
      return {
        location: null,
        classification,
        requiresMap: false,
      };
    }

    // If classified as requiring a map (Place, Institution, or Explicit Location Request):
    const targetQuery = (classification.resolvedLocationQuery || topic).trim();
    try {
      const location = await geoapifyService.geocodeLocation(targetQuery);
      if (location && location.isLocation) {
        // Tag location with category and explicit map requirement
        location.requiresMap = true;
        location.topicCategory = classification.category;

        return {
          location,
          classification,
          requiresMap: true,
        };
      }
    } catch (err) {
      console.warn(`[GeoDetection] Geocoding lookup failed for query "${targetQuery}":`, err);
    }

    // If geocoding failed or returned no coordinates, graceful degradation
    return {
      location: null,
      classification,
      requiresMap: false,
    };
  }

  /**
   * Backwards-compatible method used across backend routes and story generator.
   * Returns LocationDetails ONLY when the topic requires a map and resolves to verified coordinates.
   * Returns null for all non-geographical topics.
   */
  public async detectAndGeocode(topic: string): Promise<LocationDetails | null> {
    const result = await this.evaluateTopic(topic);
    return result.requiresMap ? result.location : null;
  }

  /**
   * Extracts target subject from natural questions (e.g. "Birthplace of Virat Kohli" -> "Virat Kohli")
   */
  private extractSubjectFromQuestion(question: string): string {
    const clean = question.trim();

    // "Birthplace of Virat Kohli" / "Hometown of MS Dhoni"
    const birthMatch = clean.match(/(?:birthplace|birth\s+place|native\s+place|origin|hometown|home\s+town|location|geography|map|coordinates)\s+(?:of|for)\s+(.+)/i);
    if (birthMatch && birthMatch[1]) {
      return birthMatch[1].replace(/[?!.,]+/g, '').trim();
    }

    // "Where is Virat Kohli from?" / "Where was Albert Einstein born?"
    const whereFromMatch = clean.match(/^where\s+(?:is|was|are|were)\s+(.+?)\s+(?:from|born|located|situated|found)\??$/i);
    if (whereFromMatch && whereFromMatch[1]) {
      return whereFromMatch[1].replace(/[?!.,]+/g, '').trim();
    }

    // "Where is Taj Mahal?"
    const whereIsMatch = clean.match(/^where\s+(?:is|was)\s+(.+?)\??$/i);
    if (whereIsMatch && whereIsMatch[1]) {
      return whereIsMatch[1].replace(/[?!.,]+/g, '').trim();
    }

    return clean;
  }
}

export const geoDetectionService = new GeoDetectionService();
