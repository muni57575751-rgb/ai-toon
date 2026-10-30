import type { Story } from '@ai-toon/shared';

export const BUILT_IN_EXAMPLE_STORIES: Story[] = [
  {
    id: 'example_photosynthesis',
    title: 'How Plants Make Food: The Magic of Photosynthesis',
    topic: 'Photosynthesis',
    tone: 'funny',
    language: 'en',
    difficulty: 'beginner',
    introduction: 'Plants don\'t need grocery stores or chef hats to eat! Through a super-cool process called photosynthesis, green leaves turn sunshine, water, and air into delicious plant food and fresh oxygen.',
    keyPoints: [
      {
        pointNumber: 1,
        heading: 'Solar Collectors Inside Leaves (Chloroplasts)',
        bulletPoints: [
          'Plant cells contain microscopic food-making factories called chloroplasts.',
          'These chloroplasts are packed with a bright green pigment called chlorophyll, which grabs energy directly from sunlight like a solar panel.',
        ],
      },
      {
        pointNumber: 2,
        heading: 'The Underground Water Delivery (Roots & Xylem)',
        bulletPoints: [
          'Thirsty plants drink water and soil minerals deep underground through their spreading root networks.',
          'Special internal plant pipelines called xylem pump this water all the way up the stem to every leaf.',
        ],
      },
      {
        pointNumber: 3,
        heading: 'Inhaling Carbon Dioxide (Stomata Trapdoors)',
        bulletPoints: [
          'On the underside of every leaf are thousands of microscopic doorways called stomata.',
          'These tiny valves open wide to breathe in carbon dioxide gas floating through the air.',
        ],
      },
      {
        pointNumber: 4,
        heading: 'The Sweet Chemical Reaction (Making Glucose)',
        bulletPoints: [
          'Using the sun\'s light energy, the plant mixes water and carbon dioxide together.',
          'This reaction creates glucose—a sweet, energy-rich sugar that helps stems, leaves, flowers, and fruits grow big and strong.',
        ],
      },
      {
        pointNumber: 5,
        heading: 'The Clean Air Bonus (Releasing Oxygen)',
        bulletPoints: [
          'As a happy bonus, photosynthesis creates pure oxygen as an extra product.',
          'The plant releases this fresh oxygen back out through its stomata into the atmosphere for humans and animals to breathe.',
        ],
      },
    ],
    illustrations: [
      {
        id: 'ill_photo_1',
        title: 'Chef Chlorophyll at the Solar Kitchen',
        caption: 'Inside plant chloroplasts, green chlorophyll pigments capture sunlight to power the food-making process.',
        description: 'A cheerful cartoon leaf character wearing a chef hat, capturing golden sunbeams in a shiny solar frying pan.',
        keyword: 'photosynthesis_chlorophyll',
        positionIndex: 2,
      },
      {
        id: 'ill_photo_2',
        title: 'The Photosynthesis Equation: Sun + Water + CO₂ = Sugar + Oxygen',
        caption: 'Plants turn water and carbon dioxide into energy-packed glucose sugar and release life-giving oxygen.',
        description: 'A colorful cartoon diagram showing water droplets climbing tree roots, air bubbles entering leaves, and sparkling sugar cubes and oxygen balloons floating out.',
        keyword: 'photosynthesis_sugar_oxygen',
        positionIndex: 4,
      },
    ],
    keyTakeaway: 'Photosynthesis is nature\'s ultimate solar-powered kitchen: plants use sunlight, water, and carbon dioxide to make food for themselves and clean oxygen for the entire planet!',
    quizQuestions: [
      {
        id: 'quiz_photo_1',
        question: 'What is the green pigment in leaves that absorbs sunlight for photosynthesis?',
        options: [
          { id: 'a', text: 'Melanin' },
          { id: 'b', text: 'Chlorophyll' },
          { id: 'c', text: 'Hemoglobin' },
          { id: 'd', text: 'Carotene' },
        ],
        correctOptionId: 'b',
        explanation: 'Chlorophyll is the green pigment inside plant chloroplasts that captures light energy from the sun.',
      },
      {
        id: 'quiz_photo_2',
        question: 'Which gas do plants take in from the atmosphere through microscopic leaf pores (stomata)?',
        options: [
          { id: 'a', text: 'Nitrogen' },
          { id: 'b', text: 'Helium' },
          { id: 'c', text: 'Carbon Dioxide' },
          { id: 'd', text: 'Methane' },
        ],
        correctOptionId: 'c',
        explanation: 'Plants absorb carbon dioxide (CO₂) from the air through microscopic openings called stomata.',
      },
      {
        id: 'quiz_photo_3',
        question: 'What essential gas is released into the air as a byproduct of photosynthesis?',
        options: [
          { id: 'a', text: 'Oxygen' },
          { id: 'b', text: 'Carbon Monoxide' },
          { id: 'c', text: 'Hydrogen' },
          { id: 'd', text: 'Argon' },
        ],
        correctOptionId: 'a',
        explanation: 'Photosynthesis converts water and carbon dioxide into glucose, releasing oxygen (O₂) into the atmosphere for living things to breathe.',
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    isCached: false,
    isExample: true,
    requiresMap: false,
    topicCategory: 'SCIENCE_CONCEPT',
    provider: 'AI Toon Built-in Catalog',
    summary: 'How green leaves turn sunlight, water, and carbon dioxide into glucose sugar and fresh oxygen.',
    keyTakeaways: ['Plants capture sunlight using chlorophyll.', 'Photosynthesis makes glucose sugar for plant energy.', 'Oxygen is released for all living creatures.'],
  },
  {
    id: 'example_solar_system',
    title: 'Wonders of Our Solar System: The Sun and Its 8 Worlds',
    topic: 'The Solar System',
    tone: 'adventure',
    language: 'en',
    difficulty: 'intermediate',
    introduction: 'Our solar system is a bustling cosmic neighborhood bound together by gravity, centered around a dazzling yellow star we call the Sun.',
    keyPoints: [
      {
        pointNumber: 1,
        heading: 'The Blazing Centerpiece: The Sun',
        bulletPoints: [
          'The Sun contains over 99.8% of all the mass in the entire solar system.',
          'Its tremendous gravitational grip acts like an invisible cosmic tether, keeping every planet, moon, and asteroid in stable orbit.',
        ],
      },
      {
        pointNumber: 2,
        heading: 'The Rocky Inner Planets (Terrestrial Worlds)',
        bulletPoints: [
          'The four inner planets closest to the Sun are Mercury, Venus, Earth, and Mars.',
          'These worlds have solid, rocky surfaces; Earth is uniquely blessed with liquid oceans and breathable air, while Mars features red iron-oxide dust.',
        ],
      },
      {
        pointNumber: 3,
        heading: 'The Asteroid Belt: The Cosmic Highway Divider',
        bulletPoints: [
          'Between Mars and Jupiter lies a vast donut-shaped region filled with millions of rocky remnants called asteroids.',
          'This belt cleanly marks the boundary separating the inner rocky planets from the outer giants.',
        ],
      },
      {
        pointNumber: 4,
        heading: 'The Gas & Ice Giants: Jupiter, Saturn, Uranus & Neptune',
        bulletPoints: [
          'Jupiter is the king of planets with a swirling hurricane storm (the Great Red Spot) larger than planet Earth.',
          'Saturn boasts breathtaking rings made of billions of shimmering water-ice chunks, while Uranus and Neptune are freezing, high-wind ice giants.',
        ],
      },
      {
        pointNumber: 5,
        heading: 'The Outer Frontier: Kuiper Belt and Beyond',
        bulletPoints: [
          'Past Neptune lies the chilly Kuiper Belt, home to icy dwarf planets like Pluto and long-period comets.',
          'Comets are giant "dirty snowballs" that sprout brilliant glowing tails when their orbits bring them close to the warming Sun.',
        ],
      },
    ],
    illustrations: [
      {
        id: 'ill_solar_1',
        title: 'The Inner Rocky Squad vs. The Outer Giants',
        caption: 'Our solar system features four dense terrestrial planets up close and four gargantuan gas and ice giants in the outer orbit.',
        description: 'A vibrant cartoon solar system map showing the smiling Sun shining on rocky Mercury, Venus, Earth, Mars, followed by massive striped Jupiter and ringed Saturn.',
        keyword: 'solar_system_planets',
        positionIndex: 2,
      },
      {
        id: 'ill_solar_2',
        title: 'Saturn\'s Sparkling Ice Rings & Asteroid Belt',
        caption: 'Saturn\'s famous rings consist of countless chunks of reflective water-ice and rock orbiting in harmony.',
        description: 'A playful astronaut cat peering out of a spaceship window at golden-striped Saturn adorned with shining ice rings in deep space.',
        keyword: 'saturn_rings_space',
        positionIndex: 4,
      },
    ],
    keyTakeaway: 'Our solar system consists of eight distinct planetary worlds governed by the Sun\'s gravity, ranging from sun-baked inner rocks to majestic, ringed outer giants!',
    quizQuestions: [
      {
        id: 'quiz_solar_1',
        question: 'Which is the largest planet in our solar system?',
        options: [
          { id: 'a', text: 'Saturn' },
          { id: 'b', text: 'Jupiter' },
          { id: 'c', text: 'Neptune' },
          { id: 'd', text: 'Earth' },
        ],
        correctOptionId: 'b',
        explanation: 'Jupiter is the largest planet in the solar system, with more mass than all other planets combined.',
      },
      {
        id: 'quiz_solar_2',
        question: 'What keeps the planets in orbit around the Sun instead of drifting into deep space?',
        options: [
          { id: 'a', text: 'Magnetic force' },
          { id: 'b', text: 'Solar wind' },
          { id: 'c', text: 'The Sun\'s gravitational pull' },
          { id: 'd', text: 'Atmospheric pressure' },
        ],
        correctOptionId: 'c',
        explanation: 'The immense mass of the Sun produces powerful gravitational attraction that holds all orbiting bodies in stable elliptical paths.',
      },
      {
        id: 'quiz_solar_3',
        question: 'What are the magnificent rings of Saturn primarily composed of?',
        options: [
          { id: 'a', text: 'Water ice chunks and dust' },
          { id: 'b', text: 'Molten gold and copper' },
          { id: 'c', text: 'Solid diamond sheets' },
          { id: 'd', text: 'Burning gases' },
        ],
        correctOptionId: 'a',
        explanation: 'Saturn\'s rings are made almost entirely of billions of pieces of water ice, ranging from tiny specks to house-sized boulders.',
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    isCached: false,
    isExample: true,
    requiresMap: false,
    topicCategory: 'SCIENCE_CONCEPT',
    provider: 'AI Toon Built-in Catalog',
    summary: 'Explore our 8 planetary worlds orbiting around the powerful central Sun.',
    keyTakeaways: ['The Sun makes up over 99.8% of the system\'s mass.', 'The four inner planets are rocky, outer four are giants.', 'Gravity keeps all orbits stable.'],
  },
  {
    id: 'example_water_cycle',
    title: 'Earth\'s Endless Water Ride: The Global Water Cycle',
    topic: 'The Water Cycle',
    tone: 'comic',
    language: 'en',
    difficulty: 'beginner',
    introduction: 'Every sip of water you drink today was once part of a cloud, a prehistoric glacier, or even a dinosaur\'s bath! Water on Earth is constantly moving in a giant, endless recycling loop.',
    keyPoints: [
      {
        pointNumber: 1,
        heading: 'Evaporation: The Skyward Lift',
        bulletPoints: [
          'The Sun\'s heat warms surface water in oceans, lakes, and rivers.',
          'This heat energy transforms liquid water into invisible gas called water vapor, which rises gracefully into the warm air.',
        ],
      },
      {
        pointNumber: 2,
        heading: 'Transpiration: Plants Joining the Cycle',
        bulletPoints: [
          'It\'s not just oceans that give off water—trees and plants also release moisture from tiny leaf pores.',
          'This plant "perspiration" process is called transpiration and adds millions of gallons of vapor to the sky every day.',
        ],
      },
      {
        pointNumber: 3,
        heading: 'Condensation: Building Fluffy Clouds',
        bulletPoints: [
          'As water vapor climbs miles high into the cold upper atmosphere, it cools down and clumps together.',
          'Billions of tiny cooled water droplets cling to airborne dust particles, puffing up to form white cumulus clouds.',
        ],
      },
      {
        pointNumber: 4,
        heading: 'Precipitation: The Rainy Skydive',
        bulletPoints: [
          'When cloud droplets bump into each other and become too heavy to float in the air currents, gravity takes over.',
          'They tumble down to Earth as precipitation—which can be rain, snow, sleet, or hail depending on the temperature.',
        ],
      },
      {
        pointNumber: 5,
        heading: 'Collection & Runoff: Returning to the Source',
        bulletPoints: [
          'Fallen rainwater trickles through soil into underground aquifers or runs down mountain streams into rivers.',
          'Eventually, it returns to the lakes and vast oceans, ready to be heated by the sun and start the entire ride all over again!',
        ],
      },
    ],
    illustrations: [
      {
        id: 'ill_water_1',
        title: 'Evaporation & Condensation in the Sky',
        caption: 'Solar energy evaporates surface water into vapor, which cools in the upper atmosphere to form clouds.',
        description: 'Smiling cartoon water droplets gaining tiny vapor wings under a warm sun, ascending together into a puffy cloud squad.',
        keyword: 'water_evaporation_cloud',
        positionIndex: 2,
      },
      {
        id: 'ill_water_2',
        title: 'Precipitation & The Return Flow',
        caption: 'Raindrops parachute from heavy clouds to water soils and rivers, returning to lakes in an endless cycle.',
        description: 'Energetic cartoon raindrops with safety goggles skydiving into a glistening blue river that curves through green hills.',
        keyword: 'precipitation_river_cycle',
        positionIndex: 4,
      },
    ],
    keyTakeaway: 'The water cycle is Earth\'s natural recycling engine: water continuously evaporates, condenses into clouds, precipitates as rain, and collects to repeat the cycle forever!',
    quizQuestions: [
      {
        id: 'quiz_water_1',
        question: 'What process turns liquid water from oceans and lakes into invisible gas vapor?',
        options: [
          { id: 'a', text: 'Condensation' },
          { id: 'b', text: 'Evaporation' },
          { id: 'c', text: 'Precipitation' },
          { id: 'd', text: 'Filtration' },
        ],
        correctOptionId: 'b',
        explanation: 'Evaporation is the process where heat energy causes liquid water to transform into gaseous water vapor.',
      },
      {
        id: 'quiz_water_2',
        question: 'When rising water vapor cools high in the sky and clumps together on dust particles, it forms:',
        options: [
          { id: 'a', text: 'Clouds' },
          { id: 'b', text: 'Rainbows' },
          { id: 'c', text: 'Hurricanes' },
          { id: 'd', text: 'Sandstorms' },
        ],
        correctOptionId: 'a',
        explanation: 'Condensation occurs as water vapor cools in the upper atmosphere, clustering into billions of micro-droplets that form clouds.',
      },
      {
        id: 'quiz_water_3',
        question: 'What is it called when water drops fall from clouds as rain, snow, sleet, or hail?',
        options: [
          { id: 'a', text: 'Transpiration' },
          { id: 'b', text: 'Sublimation' },
          { id: 'c', text: 'Precipitation' },
          { id: 'd', text: 'Photosynthesis' },
        ],
        correctOptionId: 'c',
        explanation: 'Precipitation is any liquid or frozen water that forms in the atmosphere and falls back down to Earth\'s surface.',
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    isCached: false,
    isExample: true,
    requiresMap: false,
    topicCategory: 'SCIENCE_CONCEPT',
    provider: 'AI Toon Built-in Catalog',
    summary: 'Discover how water continuously journeys through evaporation, condensation, and precipitation.',
    keyTakeaways: ['Water changes states between liquid, vapor, and ice.', 'The Sun powers the entire water cycle.', 'All water on Earth is continuously recycled.'],
  },
];
