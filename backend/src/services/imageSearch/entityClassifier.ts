import type { EntityCategory, ImageSearchOptions } from './imageSearch.types.js';

export interface EntityClassification {
  category: EntityCategory;
  confidence: number;
  entityName: string;
  secondaryContext?: string;
}

/**
 * Stop words and question phrases to strip from search topics
 */
const QUESTION_PREFIXES = [
  /^(who\s+is\s+|who\s+was\s+)/i,
  /^(what\s+is\s+|what\s+are\s+)/i,
  /^(how\s+does\s+|how\s+do\s+|how\s+to\s+|how\s+is\s+)/i,
  /^(why\s+does\s+|why\s+is\s+)/i,
  /^(tell\s+me\s+about\s+|explain\s+|biography\s+of\s+|history\s+of\s+)/i,
  /^(the\s+story\s+of\s+|guide\s+to\s+)/i,
];

const QUESTION_SUFFIXES = [
  /\s+(work|works|pumps?\s+blood|functions?|operate|explained)\??$/i,
  /\s*\?+$/,
];

/**
 * Keyword dictionaries for high-precision entity classification
 */
const INSTITUTION_KEYWORDS = [
  'university',
  'college',
  'institute',
  'school',
  'academy',
  'vidyalaya',
  'foundation',
  'corporation',
  'company',
  'agency',
  'hospital',
  'laboratory',
  'vignan',
  'iit',
  'nit',
  'bits',
  'stanford',
  'harvard',
  'oxford',
  'cambridge',
  'mit',
  'isro',
  'nasa',
  'cern',
  'who',
  'unesco',
  'unicef',
];

const PLACE_KEYWORDS = [
  'gate',
  'mahal',
  'tower',
  'bridge',
  'fort',
  'palace',
  'temple',
  'statue',
  'monument',
  'pyramid',
  'colosseum',
  'mountain',
  'everest',
  'river',
  'ganga',
  'yamuna',
  'amazon',
  'nile',
  'ocean',
  'canyon',
  'falls',
  'island',
  'india gate',
  'taj mahal',
  'eiffel tower',
  'red fort',
  'statue of unity',
];

const SCIENTIFIC_KEYWORDS = [
  'photosynthesis',
  'heart',
  'cardiac',
  'blood flow',
  'earthquake',
  'seismic',
  'tectonic',
  'plate tectonics',
  'water cycle',
  'solar system',
  'cell',
  'mitosis',
  'meiosis',
  'dna',
  'rna',
  'respiration',
  'digestive',
  'nervous system',
  'neuron',
  'brain',
  'lungs',
  'kidney',
  'atom',
  'molecule',
  'gravity',
  'magnetism',
  'electromagnetism',
  'light refraction',
  'photosynthetic',
  'chloroplast',
  'chlorophyll',
  'volcano',
  'osmosis',
  'ecosystem',
  'food chain',
  'carbon cycle',
];

const TECHNICAL_KEYWORDS = [
  'binary search',
  'search algorithm',
  'sorting',
  'bubble sort',
  'merge sort',
  'quicksort',
  'algorithm',
  'data structure',
  'linked list',
  'stack',
  'queue',
  'hash table',
  'tree',
  'graph',
  'artificial intelligence',
  'neural network',
  'machine learning',
  'deep learning',
  'operating system',
  'compiler',
  'database',
  'sql',
  'blockchain',
  'cryptography',
  'cybersecurity',
  'computer network',
  'tcp',
  'ip address',
  'udp',
  'recursion',
  'dynamic programming',
  'big o',
  'cpu',
  'gpu',
  'cloud computing',
];

const KNOWN_PEOPLE = [
  'narendra modi',
  'modi',
  'apj abdul kalam',
  'abdul kalam',
  'albert einstein',
  'einstein',
  'isaac newton',
  'newton',
  'alan turing',
  'turing',
  'marie curie',
  'mahatma gandhi',
  'gandhi',
  'charles darwin',
  'darwin',
  'nikola tesla',
  'tesla',
  'srinivasa ramanujan',
  'ramanujan',
  'stephen hawking',
  'william shakespeare',
  'shakespeare',
  'abraham lincoln',
  'george washington',
  'nelson mandela',
  'subhas chandra bose',
  'bhagat singh',
  'ada lovelace',
  'galileo',
  'galilei',
  'aristotle',
  'plato',
  'socrates',
  'steve jobs',
  'bill gates',
  'elon musk',
  'sundar pichai',
  'satya nadella',
];

const HONORIFICS = [
  /\b(shri|mr|mrs|ms|dr|prof|professor|sir|lord|president|prime\s+minister|pm|king|queen)\b/i,
];

export class EntityClassifier {
  /**
   * Cleans a user topic into its core entity name and detects secondary context (e.g. location)
   */
  public cleanTopic(rawTopic: string): { cleanName: string; context?: string } {
    let text = rawTopic.trim();

    // Strip question phrases
    for (const prefix of QUESTION_PREFIXES) {
      text = text.replace(prefix, '');
    }
    for (const suffix of QUESTION_SUFFIXES) {
      text = text.replace(suffix, '');
    }

    text = text.trim();

    // Check for comma-separated secondary context (e.g. "Vignan University, Vadlamudi")
    if (text.includes(',')) {
      const parts = text.split(',').map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return {
          cleanName: parts[0],
          context: parts.slice(1).join(' '),
        };
      }
    }

    return { cleanName: text };
  }

  /**
   * Classifies a topic into an educational entity category
   */
  public classify(rawTopic: string): EntityClassification {
    const { cleanName, context } = this.cleanTopic(rawTopic);
    const lower = cleanName.toLowerCase();
    const rawLower = rawTopic.toLowerCase();

    // 1. Check known people & honorifics
    for (const person of KNOWN_PEOPLE) {
      if (lower === person || lower.includes(person) || rawLower.includes(person)) {
        return {
          category: 'person',
          confidence: 0.95,
          entityName: cleanName,
          secondaryContext: context,
        };
      }
    }

    for (const hon of HONORIFICS) {
      if (hon.test(cleanName) || hon.test(rawTopic)) {
        return {
          category: 'person',
          confidence: 0.85,
          entityName: cleanName,
          secondaryContext: context,
        };
      }
    }

    // 2. Check Institutions & Organizations
    for (const inst of INSTITUTION_KEYWORDS) {
      if (lower.includes(inst) || rawLower.includes(inst)) {
        return {
          category: 'institution',
          confidence: 0.92,
          entityName: cleanName,
          secondaryContext: context,
        };
      }
    }

    // 3. Check Places & Landmarks
    for (const place of PLACE_KEYWORDS) {
      if (lower.includes(place) || rawLower.includes(place)) {
        return {
          category: 'place',
          confidence: 0.88,
          entityName: cleanName,
          secondaryContext: context,
        };
      }
    }

    // 4. Check Technical Concepts
    for (const tech of TECHNICAL_KEYWORDS) {
      if (lower.includes(tech) || rawLower.includes(tech)) {
        return {
          category: 'technical',
          confidence: 0.9,
          entityName: cleanName,
          secondaryContext: context,
        };
      }
    }

    // 5. Check Scientific Concepts
    for (const sci of SCIENTIFIC_KEYWORDS) {
      if (lower.includes(sci) || rawLower.includes(sci)) {
        return {
          category: 'scientific',
          confidence: 0.9,
          entityName: cleanName,
          secondaryContext: context,
        };
      }
    }

    // 6. Heuristic: 2-3 capitalized words with no common concept verbs might be a person
    const words = cleanName.split(/\s+/).filter(Boolean);
    const isCapitalizedName =
      words.length >= 2 &&
      words.length <= 3 &&
      words.every((w) => /^[A-Z][a-z]+$/.test(w)) &&
      !['How', 'What', 'Why', 'Who', 'When', 'Where', 'The'].includes(words[0]);

    if (isCapitalizedName) {
      return {
        category: 'person',
        confidence: 0.7,
        entityName: cleanName,
        secondaryContext: context,
      };
    }

    // Default to other/general
    return {
      category: 'other',
      confidence: 0.5,
      entityName: cleanName,
      secondaryContext: context,
    };
  }

  /**
   * Generates prioritized, entity-aware search queries tailored to the illustration slot
   */
  public generateQueries(
    classification: EntityClassification,
    extraHint?: string,
    slotIndex: number = 0
  ): string[] {
    const { category, entityName, secondaryContext } = classification;
    const queries: string[] = [];
    const hintLower = (extraHint || '').toLowerCase();

    switch (category) {
      case 'person': {
        // For people, prioritize actual photographic portraits and official photos
        if (slotIndex === 0) {
          queries.push(`${entityName} official portrait`);
          queries.push(`${entityName} portrait`);
          queries.push(`${entityName} photograph`);
          queries.push(entityName);
        } else {
          // Second illustration: search for action/speech/event photograph or alternative portrait
          queries.push(`${entityName} speech photograph`);
          queries.push(`${entityName} official photograph`);
          queries.push(`${entityName} photograph`);
          queries.push(`${entityName} portrait`);
          queries.push(entityName);
        }
        break;
      }

      case 'institution': {
        // For institutions, search campus, building, or official landmark photos
        if (slotIndex === 0) {
          if (secondaryContext) {
            queries.push(`${entityName} ${secondaryContext}`);
            queries.push(`${entityName} ${secondaryContext} building`);
          }
          queries.push(`${entityName}`);
          queries.push(`${entityName} building`);
          queries.push(`${entityName} campus`);
        } else {
          // Second illustration: search building entrance, library or secondary landmark
          if (secondaryContext) {
            queries.push(`${entityName} ${secondaryContext} building`);
            queries.push(`${entityName} ${secondaryContext}`);
          }
          queries.push(`${entityName} building`);
          queries.push(`${entityName} entrance`);
          queries.push(`${entityName} library`);
          queries.push(`${entityName}`);
        }
        break;
      }

      case 'place': {
        // For places, search landmark architecture and view photographs
        if (secondaryContext) {
          queries.push(`${entityName} ${secondaryContext} landmark`);
        }
        queries.push(`${entityName} landmark photograph`);
        queries.push(`${entityName} architecture`);
        queries.push(entityName);
        break;
      }

      case 'scientific': {
        const lower = entityName.toLowerCase();
        if (lower.includes('photosynthesis')) {
          if (slotIndex === 0 || hintLower.includes('process') || hintLower.includes('sunlight')) {
            queries.push('photosynthesis process diagram');
            queries.push('photosynthesis diagram');
            queries.push('photosynthesis labeled diagram');
          } else {
            // Second slot: focus on chloroplast structure, light reactions or equation
            queries.push('chloroplast diagram');
            queries.push('photosynthesis equation diagram');
            queries.push('photosynthesis light reaction diagram');
            queries.push('photosynthesis diagram');
          }
        } else if (lower.includes('heart')) {
          if (slotIndex === 0 || hintLower.includes('anatomy') || hintLower.includes('chamber')) {
            queries.push('human heart diagram');
            queries.push('heart anatomy diagram');
            queries.push('human heart labeled anatomy');
          } else {
            // Second slot: focus on blood flow & cardiac cycle
            queries.push('heart diagram blood flow');
            queries.push('cardiac cycle diagram');
            queries.push('human heart blood flow diagram');
            queries.push('human heart diagram');
          }
        } else if (lower.includes('earthquake') || lower.includes('seismic') || lower.includes('tectonic')) {
          if (slotIndex === 0) {
            queries.push('earthquake fault line diagram');
            queries.push('tectonic plates diagram');
          } else {
            queries.push('seismic shock waves diagram');
            queries.push('earthquake focus epicenter diagram');
          }
        } else if (lower.includes('water cycle')) {
          if (slotIndex === 0) {
            queries.push('water cycle process diagram');
            queries.push('water cycle diagram');
          } else {
            queries.push('water cycle precipitation evaporation diagram');
            queries.push('water cycle diagram');
          }
        } else if (lower.includes('solar system')) {
          if (slotIndex === 0) {
            queries.push('solar system planets orbit diagram');
            queries.push('solar system diagram');
          } else {
            queries.push('inner rocky planets outer gas giants diagram');
            queries.push('solar system diagram');
          }
        } else {
          queries.push(`${entityName} process diagram`);
          queries.push(`${entityName} labeled diagram`);
          queries.push(`${entityName} diagram`);
        }
        break;
      }

      case 'technical': {
        const lower = entityName.toLowerCase();
        if (lower.includes('binary search')) {
          if (slotIndex === 0 || hintLower.includes('algorithm') || hintLower.includes('overview')) {
            queries.push('binary search diagram');
            queries.push('binary search algorithm diagram');
            queries.push('binary search algorithm');
          } else {
            // Second slot: focus on sorted array, halving range, or search tree
            queries.push('binary search sorted array diagram');
            queries.push('binary search tree');
            queries.push('binary search example');
            queries.push('binary search diagram');
          }
        } else if (lower.includes('artificial intelligence') || lower === 'ai') {
          if (slotIndex === 0 || hintLower.includes('overview') || hintLower.includes('system')) {
            queries.push('artificial intelligence diagram');
            queries.push('artificial intelligence workflow diagram');
            queries.push('artificial intelligence');
          } else {
            // Second slot: focus on neural networks, deep learning architecture
            queries.push('neural network architecture diagram');
            queries.push('deep learning neural network diagram');
            queries.push('machine learning diagram');
            queries.push('artificial intelligence diagram');
          }
        } else if (lower.includes('neural network')) {
          queries.push('neural network architecture diagram');
          queries.push('deep learning neural network diagram');
          queries.push('neural network diagram');
        } else {
          queries.push(`${entityName} algorithm diagram`);
          queries.push(`${entityName} architecture diagram`);
          queries.push(`${entityName} diagram`);
          queries.push(entityName);
        }
        break;
      }

      case 'other':
      default: {
        if (extraHint) {
          queries.push(`${entityName} ${extraHint}`);
        }
        queries.push(entityName);
        break;
      }
    }

    // If an extra hint contains specific keywords not yet in queries, add a targeted combined query
    if (extraHint && extraHint.trim().length > 3) {
      const cleanHint = extraHint
        .replace(/illustration|figure|\d+/gi, '')
        .trim();
      if (cleanHint.length > 3 && category !== 'person') {
        queries.push(`${entityName} ${cleanHint} diagram`);
      }
    }

    // Deduplicate and filter empty queries
    return Array.from(new Set(queries.map((q) => q.trim()))).filter((q) => q.length > 0);
  }
}

export const entityClassifier = new EntityClassifier();
