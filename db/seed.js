// ═══════════════════════════════════════════════════════════════
//  Syllabus Seed  –  CBSE | ICSE | Karnataka State Board
//  Classes 1–12  ·  Academic Year 2025-26 / 2026-27
//  Sources: cbseacademic.nic.in, cisce.org, kseab.karnataka.gov.in
// ═══════════════════════════════════════════════════════════════

'use strict';
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── helpers ───────────────────────────────────────────────────
const sub = (board, cls, name, icon, color, isCompet = false, stream = null, order = 0) =>
  ({ board, class_num: cls, stream, name, icon, color, is_compet: isCompet, sort_order: order });

const chs = (...names) => names.map((n, i) => ({ name: n, ch_type: 'regular', sort_order: i }));
const neet = (...names) => names.map((n, i) => ({ name: n, ch_type: 'neet', sort_order: i }));

// ══════════════════════════════════════════════════════════════
//  SYLLABUS DATA
// ══════════════════════════════════════════════════════════════

const SYLLABUS = [

  // ────────────────────────────────────────────────────────────
  //  CBSE  Classes 1 – 5  (foundational)
  // ────────────────────────────────────────────────────────────
  ...['cbse'].flatMap(b => [1,2].flatMap(cls => [
    { ...sub(b,cls,'English','📖','#fb923c',false,null,1), chapters: chs('My First Day','Reading Fun','Stories Around Us','Poems & Rhymes','Creative Writing') },
    { ...sub(b,cls,'Hindi','📝','#f472b6',false,null,2), chapters: chs('वर्णमाला','छोटी कहानियाँ','कविताएँ','व्याकरण परिचय','रचना') },
    { ...sub(b,cls,'Mathematics','📐','#a78bfa',false,null,3), chapters: chs('Numbers 1–100','Addition & Subtraction','Shapes & Space','Measurement','Patterns') },
  ])),

  ...['cbse'].flatMap(b => [3,4,5].flatMap(cls => [
    { ...sub(b,cls,'English','📖','#fb923c',false,null,1), chapters: chs('Reading Comprehension','Grammar – Parts of Speech','Story Writing','Letter Writing','Poetry') },
    { ...sub(b,cls,'Hindi','📝','#f472b6',false,null,2), chapters: chs('गद्य पाठ','काव्य खंड','व्याकरण','पत्र लेखन','रचनात्मक लेखन') },
    { ...sub(b,cls,'Mathematics','📐','#a78bfa',false,null,3), chapters: chs('Large Numbers','Operations (+ – × ÷)','Fractions & Decimals','Geometry Basics','Data Handling','Measurement & Money') },
    { ...sub(b,cls,'EVS / Science','🌿','#4ade80',false,null,4), chapters: chs('Plants & Animals','Food & Health','Water & Air','Our Body','Earth & Sky','Community & Safety') },
  ])),

  // ────────────────────────────────────────────────────────────
  //  CBSE  Class 6
  // ────────────────────────────────────────────────────────────
  { ...sub('cbse',6,'English','📖','#fb923c',false,null,1), chapters: chs('Who Did Patrick\'s Homework','How the Dog Found Himself a Master','Taro\'s Reward','An Indian – American Woman in Space','A Different Kind of School','Who I Am','Fair Play','A Game of Chance','Desert Animals','The Banyan Tree') },
  { ...sub('cbse',6,'Hindi','📝','#f472b6',false,null,2), chapters: chs('वह चिड़िया जो','बचपन','नादान दोस्त','चाँद से थोड़ी सी गप्पें','अक्षरों का महत्व','पार नज़र के','साथी हाथ बढ़ाना','ऐसे – ऐसे','टिकट अलबम','झाँसी की रानी') },
  { ...sub('cbse',6,'Mathematics','📐','#a78bfa',false,null,3), chapters: chs('Knowing Our Numbers','Whole Numbers','Playing with Numbers','Basic Geometrical Ideas','Understanding Elementary Shapes','Integers','Fractions','Decimals','Data Handling','Mensuration','Algebra','Ratio and Proportion','Symmetry','Practical Geometry') },
  { ...sub('cbse',6,'Science','🔬','#22d3ee',false,null,4), chapters: chs('Food – Where Does It Come From?','Components of Food','Fibre to Fabric','Sorting Materials into Groups','Separation of Substances','Changes Around Us','Getting to Know Plants','Body Movements','The Living Organisms','Motion and Measurement of Distances','Light, Shadows and Reflections','Electricity and Circuits','Fun with Magnets','Water','Air Around Us','Garbage In, Garbage Out') },
  { ...sub('cbse',6,'Social Science','🌍','#fbbf24',false,null,5), chapters: chs('What, Where, How and When?','From Hunting–Gathering to Growing Food','In the Earliest Cities','What Books and Burials Tell Us','Kingdoms, Kings and an Early Republic','New Questions and Ideas','Ashoka, The Emperor Who Gave Up War','Vital Villages, Thriving Towns','Traders, Kings and Pilgrims','New Empires and Kingdoms','The Earth in the Solar System','Globe: Latitudes and Longitudes','Motions of the Earth','Maps','Major Domains of the Earth','Major Landforms of the Earth','Our Country – India','India: Climate, Vegetation and Wildlife','Understanding Diversity','Diversity and Discrimination','What is Government?','Key Elements of a Democratic Government','Panchayati Raj','Rural Administration','Urban Administration','Rural Livelihoods','Urban Livelihoods') },
  { ...sub('cbse',6,'Sanskrit','🕉','#a78bfa',false,null,6), chapters: chs('शब्द परिचयः 1','शब्द परिचयः 2','सर्वनामाः','विद्यालयः','वृक्षाः','समुद्रतटः','बकस्य प्रतीक्षा','सूक्तिस्तबकः','क्रीडास्पर्धा','कृषिकाः कर्मवीराः','पुष्पोत्सवः','दशमः त्वम् असि','विमानयानं रचयाम','अहह, आम् आम्','मातुलचन्द्र') },

  // ────────────────────────────────────────────────────────────
  //  CBSE  Class 7
  // ────────────────────────────────────────────────────────────
  { ...sub('cbse',7,'English','📖','#fb923c',false,null,1), chapters: chs('Three Questions','A Gift of Chappals','Gopal and the Hilsa Fish','The Ashes That Made Trees Bloom','Quality','Expert Detectives','The Invention of Vita-Wonk','Fire: Friend and Foe','A Bicycle in Good Repair','The Story of Cricket') },
  { ...sub('cbse',7,'Hindi','📝','#f472b6',false,null,2), chapters: chs('हम पंछी उन्मुक्त गगन के','दादी माँ','हिमालय की बेटियाँ','कठपुतली','मिठाईवाला','रक्त और हमारा शरीर','पापा खो गए','शाम – एक किसान','चिड़िया की बच्ची','अपूर्व अनुभव') },
  { ...sub('cbse',7,'Mathematics','📐','#a78bfa',false,null,3), chapters: chs('Integers','Fractions and Decimals','Data Handling','Simple Equations','Lines and Angles','The Triangle and its Properties','Congruence of Triangles','Comparing Quantities','Rational Numbers','Practical Geometry','Perimeter and Area','Algebraic Expressions','Exponents and Powers','Symmetry','Visualising Solid Shapes') },
  { ...sub('cbse',7,'Science','🔬','#22d3ee',false,null,4), chapters: chs('Nutrition in Plants','Nutrition in Animals','Heat','Acids, Bases and Salts','Physical and Chemical Changes','Respiration in Organisms','Transportation in Animals and Plants','Reproduction in Plants','Motion and Time','Electric Current and Its Effects','Light','Forests: Our Lifeline','Wastewater Story') },
  { ...sub('cbse',7,'Social Science','🌍','#fbbf24',false,null,5), chapters: chs('Tracing Changes Through a Thousand Years','New Kings and Kingdoms','The Delhi Sultans','The Mughal Empire','Rulers and Buildings','Towns, Traders and Craftspersons','Tribes, Nomads and Settled Communities','Devotional Paths to the Divine','The Making of Regional Cultures','Eighteenth-Century Political Formations','Environment','Inside Our Earth','Our Changing Earth','Air','Water','Natural Vegetation and Wildlife','Human Environment – Settlement, Transport and Communication','Human Environment Interactions','Life in the Temperate Grasslands','Life in the Deserts','On Equality','Role of the Government in Health','How the State Government Works','Growing Up as Boys and Girls','Women Change the World','Understanding Media','Understanding Advertising','Markets Around Us','A Shirt in the Market') },

  // ────────────────────────────────────────────────────────────
  //  CBSE  Class 8
  // ────────────────────────────────────────────────────────────
  { ...sub('cbse',8,'English','📖','#fb923c',false,null,1), chapters: chs('The Best Christmas Present in the World','The Tsunami','Glimpses of the Past','Bepin Choudhury\'s Lapse of Memory','The Summit Within','This is Jody\'s Fawn','A Visit to Cambridge','A Short Monsoon Diary','The Great Stone Face I','The Great Stone Face II') },
  { ...sub('cbse',8,'Hindi','📝','#f472b6',false,null,2), chapters: chs('ध्वनि','लाख की चूड़ियाँ','बस की यात्रा','दीवानों की हस्ती','चिट्ठियों की अनूठी दुनिया','भगवान के डाकिए','क्या निराश हुआ जाए','यह सबसे कठिन समय नहीं','कबीर की साखियाँ','कामचोर') },
  { ...sub('cbse',8,'Mathematics','📐','#a78bfa',false,null,3), chapters: chs('Rational Numbers','Linear Equations in One Variable','Understanding Quadrilaterals','Practical Geometry','Data Handling','Squares and Square Roots','Cubes and Cube Roots','Comparing Quantities','Algebraic Expressions and Identities','Visualising Solid Shapes','Mensuration','Exponents and Powers','Direct and Inverse Proportions','Factorisation','Introduction to Graphs','Playing with Numbers') },
  { ...sub('cbse',8,'Science','🔬','#22d3ee',false,null,4), chapters: chs('Crop Production and Management','Microorganisms: Friend and Foe','Synthetic Fibres and Plastics','Materials: Metals and Non-Metals','Coal and Petroleum','Combustion and Flame','Conservation of Plants and Animals','Cell – Structure and Functions','Reproduction in Animals','Reaching the Age of Adolescence','Force and Pressure','Friction','Sound','Chemical Effects of Electric Current','Some Natural Phenomena','Light','Stars and the Solar System','Pollution of Air and Water') },
  { ...sub('cbse',8,'Social Science','🌍','#fbbf24',false,null,5), chapters: chs('How, When and Where','From Trade to Territory','Ruling the Countryside','Tribals, Dikus and the Vision of a Golden Age','When People Rebel – 1857 and After','Colonialism and the City','Weavers, Iron Smelters and Factory Owners','Civilising the "Native"','Women, Caste and Reform','The Changing World of Visual Arts','Resources','Land, Soil, Water, Natural Vegetation and Wildlife Resources','Mineral and Power Resources','Agriculture','Industries','Human Resources','The Indian Constitution','Understanding Secularism','Why Do We Need a Parliament?','Understanding Laws','Judiciary','Understanding Our Criminal Justice System','Understanding Marginalisation','Confronting Marginalisation','Public Facilities','Law and Social Justice') },

  // ────────────────────────────────────────────────────────────
  //  CBSE  Class 9  (2026-27 NEP aligned)
  // ────────────────────────────────────────────────────────────
  { ...sub('cbse',9,'English','📖','#fb923c',false,null,1), chapters: chs('Kaveri – Chapter 1','Kaveri – Chapter 2','Kaveri – Chapter 3','Kaveri – Chapter 4','Kaveri – Chapter 5','Kaveri – Chapter 6','Kaveri – Chapter 7','Kaveri – Chapter 8') },
  { ...sub('cbse',9,'Hindi','📝','#f472b6',false,null,2), chapters: chs('दो बैलों की कथा','ल्हासा की ओर','उपभोक्तावाद की संस्कृति','साँवले सपनों की याद','नाना साहब की पुत्री','प्रेमचंद के फटे जूते','मेरे बचपन के दिन','एक कुत्ता और एक मैना','कैदी और कोकिला','ग्राम श्री','चंद्र गहना से लौटती बेर','मेघ आए','यमराज की दिशा','बच्चे काम पर जा रहे हैं') },
  { ...sub('cbse',9,'Mathematics','📐','#a78bfa',false,null,3), chapters: chs('Number System','Introduction to Polynomials','Sequences and Progressions','Exploring Algebraic Identities','Linear Equations in Two Variables','Coordinate Geometry','Introduction to Euclid\'s Geometry: Axioms and Postulates','Lines and Angles','Triangles – Congruence Theorems','4-gons (Quadrilaterals)','Circles','Area and Perimeter','Surface Area and Volume','Statistics','Introduction to Probability') },
  { ...sub('cbse',9,'Physics','⚡','#22d3ee',true,null,4), chapters: [
    ...chs('Motion','Force and Laws of Motion','Work, Energy and Simple Machines','Sound'),
    ...neet('Vectors & Scalars','Kinematics (Advanced)','Newton\'s Laws – Problem Sets','Oscillations & Waves'),
  ]},
  { ...sub('cbse',9,'Chemistry','🧪','#fbbf24',true,null,5), chapters: [
    ...chs('Mixtures and Their Separation','Structure of an Atom','Atoms and Molecules'),
    ...neet('Mole Concept','Atomic Structure (Advanced)','Chemical Bonding Basics','Periodic Table Trends'),
  ]},
  { ...sub('cbse',9,'Biology','🧬','#4ade80',true,null,6), chapters: [
    ...chs('Cell','Tissues','Diversity','Reproduction','Earth as a System: Energy, Matter & Life'),
    ...neet('Cell Biology (Advanced)','Biomolecules & Organelles','Plant Kingdom Basics','Animal Kingdom Basics'),
  ]},
  { ...sub('cbse',9,'Soc. Studies','🌍','#f472b6',false,null,7), chapters: chs('Shaping of the Earth\'s Surface','Oceans','Early Humans and Beginning of Civilisation','State and Society (up to 1000 CE)','Democracy','Elections','Building Blocks in Economics','The Price Puzzle: What Drives the Market','Resistance and Resilience (1000 CE–1700 CE)','India and the World-I','Authority','From Ideas to Startups','Smart Ways to Manage Your Finances') },

  // ────────────────────────────────────────────────────────────
  //  CBSE  Class 10
  // ────────────────────────────────────────────────────────────
  { ...sub('cbse',10,'English','📖','#fb923c',false,null,1), chapters: chs('A Letter to God','Nelson Mandela: Long Walk to Freedom','Two Stories About Flying','From the Diary of Anne Frank','Glimpses of India','Mijbil the Otter','Madam Rides the Bus','The Sermon at Benares','The Proposal','A Triumph of Surgery','The Thief\'s Story','The Midnight Visitor','A Question of Trust','Footprints Without Feet','The Making of a Scientist','The Necklace','Bholi','The Book That Saved the Earth') },
  { ...sub('cbse',10,'Hindi','📝','#f472b6',false,null,2), chapters: chs('सूरदास – पद','तुलसीदास – राम-लक्ष्मण-परशुराम संवाद','देव – सवैया और कवित्त','जयशंकर प्रसाद – आत्मकथ्य','सूर्यकांत त्रिपाठी "निराला"','नागार्जुन – यह दंतुरहित मुस्कान','गिरिजाकुमार माथुर – छाया मत छूना','ऋतुराज – कन्यादान','मंगलेश डबराल – संगतकार','नेताजी का चश्मा','बालगोबिन भगत','लखनवी अंदाज़','एक कहानी यह भी','स्त्री शिक्षा के विरोधी कुतर्कों का खंडन','नौबतखाने में इबादत','संस्कृति','माता का आँचल','जॉर्ज पंचम की नाक') },
  { ...sub('cbse',10,'Mathematics','📐','#a78bfa',false,null,3), chapters: chs('Real Numbers','Polynomials','Pair of Linear Equations in Two Variables','Quadratic Equations','Arithmetic Progressions','Triangles','Coordinate Geometry','Introduction to Trigonometry','Some Applications of Trigonometry','Circles','Areas Related to Circles','Surface Areas and Volumes','Statistics','Probability') },
  { ...sub('cbse',10,'Physics','⚡','#22d3ee',true,null,4), chapters: chs('Light – Reflection and Refraction','Human Eye and the Colourful World','Electricity','Magnetic Effects of Electric Current','Sources of Energy') },
  { ...sub('cbse',10,'Chemistry','🧪','#fbbf24',true,null,5), chapters: chs('Chemical Reactions and Equations','Acids, Bases and Salts','Metals and Non-Metals','Carbon and its Compounds','Periodic Classification of Elements') },
  { ...sub('cbse',10,'Biology','🧬','#4ade80',true,null,6), chapters: chs('Life Processes','Control and Coordination','How do Organisms Reproduce?','Heredity and Evolution','Our Environment','Management of Natural Resources') },
  { ...sub('cbse',10,'Soc. Studies','🌍','#f472b6',false,null,7), chapters: chs('The Rise of Nationalism in Europe','Nationalism in India','The Making of a Global World','The Age of Industrialisation','Print Culture and the Modern World','Resources and Development','Forest and Wildlife Resources','Water Resources','Agriculture','Minerals and Energy Resources','Manufacturing Industries','Lifelines of National Economy','Power Sharing','Federalism','Democracy and Diversity','Gender, Religion and Caste','Popular Struggles and Movements','Political Parties','Outcomes of Democracy','Challenges to Democracy','Development','Sectors of the Indian Economy','Money and Credit','Globalisation and the Indian Economy','Consumer Rights') },

  // ────────────────────────────────────────────────────────────
  //  CBSE  Class 11 – SCIENCE stream
  // ────────────────────────────────────────────────────────────
  { ...sub('cbse',11,'Physics','⚡','#22d3ee',true,'science',1), chapters: chs('Physical World','Units and Measurements','Motion in a Straight Line','Motion in a Plane','Laws of Motion','Work, Energy and Power','System of Particles and Rotational Motion','Gravitation','Mechanical Properties of Solids','Mechanical Properties of Fluids','Thermal Properties of Matter','Thermodynamics','Kinetic Theory','Oscillations','Waves') },
  { ...sub('cbse',11,'Chemistry','🧪','#fbbf24',true,'science',2), chapters: chs('Some Basic Concepts of Chemistry','Structure of Atom','Classification of Elements and Periodicity','Chemical Bonding and Molecular Structure','States of Matter','Thermodynamics','Equilibrium','Redox Reactions','Hydrogen','The s-Block Elements','The p-Block Elements','Organic Chemistry – Basic Principles','Hydrocarbons','Environmental Chemistry') },
  { ...sub('cbse',11,'Biology','🧬','#4ade80',true,'science',3), chapters: chs('The Living World','Biological Classification','Plant Kingdom','Animal Kingdom','Morphology of Flowering Plants','Anatomy of Flowering Plants','Structural Organisation in Animals','Cell – The Unit of Life','Biomolecules','Cell Cycle and Cell Division','Transport in Plants','Mineral Nutrition','Photosynthesis in Higher Plants','Respiration in Plants','Plant Growth and Development','Digestion and Absorption','Breathing and Exchange of Gases','Body Fluids and Circulation','Excretory Products and their Elimination','Locomotion and Movement','Neural Control and Coordination','Chemical Coordination and Integration') },
  { ...sub('cbse',11,'Mathematics','📐','#a78bfa',false,'science',4), chapters: chs('Sets','Relations and Functions','Trigonometric Functions','Principle of Mathematical Induction','Complex Numbers and Quadratic Equations','Linear Inequalities','Permutations and Combinations','Binomial Theorem','Sequences and Series','Straight Lines','Conic Sections','Introduction to 3D Geometry','Limits and Derivatives','Mathematical Reasoning','Statistics','Probability') },
  { ...sub('cbse',11,'English','📖','#fb923c',false,'science',5), chapters: chs('The Portrait of a Lady','We\'re Not Afraid to Die','Discovering Tut','The Ailing Planet','The Browning Version','Childhood','The Adventure','Silk Road','Father to Son','The Voice of the Rain','Poem – Laburnum Top','Poem – The Ghat of the Only World','Poem – Albert Einstein at School') },
  { ...sub('cbse',11,'Computer Science','💻','#818cf8',false,'science',6), chapters: chs('Computer Overview','Introduction to Python','Flow of Control','Functions','String Manipulation','Lists','Tuples and Dictionaries','Societal Impacts') },

  // ────────────────────────────────────────────────────────────
  //  CBSE  Class 11 – COMMERCE stream
  // ────────────────────────────────────────────────────────────
  { ...sub('cbse',11,'Accountancy','📊','#22d3ee',false,'commerce',1), chapters: chs('Introduction to Accounting','Theory Base of Accounting','Recording of Transactions – I','Recording of Transactions – II','Bank Reconciliation Statement','Trial Balance and Rectification of Errors','Depreciation, Provisions and Reserves','Bills of Exchange','Financial Statements – I','Financial Statements – II','Accounts from Incomplete Records','Applications of Computers in Accounting') },
  { ...sub('cbse',11,'Business Studies','🏢','#fbbf24',false,'commerce',2), chapters: chs('Nature and Purpose of Business','Forms of Business Organisation','Public, Private and Global Enterprises','Business Services','Emerging Modes of Business','Social Responsibility of Business','Formation of a Company','Sources of Business Finance','Small Business','Internal Trade','International Business – I','International Business – II') },
  { ...sub('cbse',11,'Economics','📈','#4ade80',false,'commerce',3), chapters: chs('Indian Economy on the Eve of Independence','Indian Economy 1950–1990','Liberalisation, Privatisation and Globalisation','Poverty','Human Capital Formation in India','Rural Development','Employment: Growth, Informalisation','Infrastructure','Environment and Sustainable Development','Comparative Development Experiences','Introduction to Microeconomics','Theory of Consumer Behaviour','Production and Costs','The Theory of the Firm Under Perfect Competition','Market Equilibrium','Non-Competitive Markets') },
  { ...sub('cbse',11,'Mathematics','📐','#a78bfa',false,'commerce',4), chapters: chs('Sets','Relations and Functions','Trigonometric Functions','Complex Numbers','Linear Inequalities','Permutations and Combinations','Binomial Theorem','Sequences and Series','Straight Lines','Conic Sections','Limits and Derivatives','Statistics','Probability') },
  { ...sub('cbse',11,'English','📖','#fb923c',false,'commerce',5), chapters: chs('The Portrait of a Lady','We\'re Not Afraid to Die','Discovering Tut','The Ailing Planet','The Browning Version','Childhood','The Adventure','Silk Road') },

  // ────────────────────────────────────────────────────────────
  //  CBSE  Class 11 – ARTS / HUMANITIES stream
  // ────────────────────────────────────────────────────────────
  { ...sub('cbse',11,'History','🏛','#f97316',false,'arts',1), chapters: chs('From the Beginning of Time','Early Cities','An Empire Across Three Continents','The Central Islamic Lands','Nomadic Empires','Three Orders','Changing Cultural Traditions','Confrontation of Cultures','The Industrial Revolution','Displacing Indigenous Peoples','Paths to Modernisation') },
  { ...sub('cbse',11,'Political Science','⚖','#22d3ee',false,'arts',2), chapters: chs('Political Theory – An Introduction','Freedom','Equality','Social Justice','Rights','Citizenship','Nationalism','Secularism','Peace','Development','Origin & Growth of Indian Constitution','Philosophy of the Indian Constitution','Fundamental Rights','Executive','Legislature','Judiciary','Federalism','Local Governments','Constitution as a Living Document','The Constitution of India') },
  { ...sub('cbse',11,'Geography','🗺','#4ade80',false,'arts',3), chapters: chs('Geography as a Discipline','The Origin and Evolution of the Earth','Interior of the Earth','Distribution of Oceans and Continents','Minerals and Rocks','Geomorphic Processes','Landforms and their Evolution','Composition and Structure of Atmosphere','Solar Radiation, Heat Balance','Atmospheric Circulation','Water in the Atmosphere','World Climate and Climate Change','Water (Oceans)','Movements of Ocean Water','Life on the Earth','Biodiversity and Conservation','India – Location','Structure and Physiography','Drainage System','Climate','Natural Vegetation','Soils') },
  { ...sub('cbse',11,'Economics','📈','#4ade80',false,'arts',4), chapters: chs('Introduction','Collection of Data','Organisation of Data','Presentation of Data','Measures of Central Tendency','Measures of Dispersion','Correlation','Index Numbers','Use of Statistical Tools') },
  { ...sub('cbse',11,'English','📖','#fb923c',false,'arts',5), chapters: chs('The Portrait of a Lady','We\'re Not Afraid to Die','Discovering Tut','The Ailing Planet','The Browning Version','Childhood','The Adventure','Silk Road') },

  // ────────────────────────────────────────────────────────────
  //  CBSE  Class 12 – SCIENCE stream
  // ────────────────────────────────────────────────────────────
  { ...sub('cbse',12,'Physics','⚡','#22d3ee',true,'science',1), chapters: chs('Electric Charges and Fields','Electrostatic Potential and Capacitance','Current Electricity','Moving Charges and Magnetism','Magnetism and Matter','Electromagnetic Induction','Alternating Current','Electromagnetic Waves','Ray Optics and Optical Instruments','Wave Optics','Dual Nature of Radiation and Matter','Atoms','Nuclei','Semiconductor Electronics','Communication Systems') },
  { ...sub('cbse',12,'Chemistry','🧪','#fbbf24',true,'science',2), chapters: chs('The Solid State','Solutions','Electrochemistry','Chemical Kinetics','Surface Chemistry','General Principles and Processes of Isolation of Elements','The p-Block Elements','The d and f-Block Elements','Coordination Compounds','Haloalkanes and Haloarenes','Alcohols, Phenols and Ethers','Aldehydes, Ketones and Carboxylic Acids','Amines','Biomolecules','Polymers','Chemistry in Everyday Life') },
  { ...sub('cbse',12,'Biology','🧬','#4ade80',true,'science',3), chapters: chs('Reproduction in Organisms','Sexual Reproduction in Flowering Plants','Human Reproduction','Reproductive Health','Principles of Inheritance and Variation','Molecular Basis of Inheritance','Evolution','Human Health and Disease','Strategies for Enhancement in Food Production','Microbes in Human Welfare','Biotechnology – Principles and Processes','Biotechnology and its Applications','Organisms and Populations','Ecosystem','Biodiversity and Conservation','Environmental Issues') },
  { ...sub('cbse',12,'Mathematics','📐','#a78bfa',false,'science',4), chapters: chs('Relations and Functions','Inverse Trigonometric Functions','Matrices','Determinants','Continuity and Differentiability','Application of Derivatives','Integrals','Application of Integrals','Differential Equations','Vector Algebra','Three Dimensional Geometry','Linear Programming','Probability') },
  { ...sub('cbse',12,'English','📖','#fb923c',false,'science',5), chapters: chs('The Last Lesson','Lost Spring','Deep Water','The Rattrap','Indigo','Poets and Pancakes','The Interview','Going Places','My Mother at Sixty-six','An Elementary School Classroom in a Slum','Keeping Quiet','A Thing of Beauty','A Roadside Stand','Aunt Jennifer\'s Tigers') },

  // ────────────────────────────────────────────────────────────
  //  CBSE  Class 12 – COMMERCE stream
  // ────────────────────────────────────────────────────────────
  { ...sub('cbse',12,'Accountancy','📊','#22d3ee',false,'commerce',1), chapters: chs('Accounting for Partnership – Basic Concepts','Reconstitution – Admission of a Partner','Reconstitution – Retirement or Death','Dissolution of Partnership Firm','Accounting for Share Capital','Issue and Redemption of Debentures','Financial Statements of a Company','Analysis of Financial Statements','Accounting Ratios','Cash Flow Statement') },
  { ...sub('cbse',12,'Business Studies','🏢','#fbbf24',false,'commerce',2), chapters: chs('Nature and Significance of Management','Principles of Management','Business Environment','Planning','Organising','Staffing','Directing','Controlling','Financial Management','Financial Markets','Marketing Management','Consumer Protection','Entrepreneurship Development') },
  { ...sub('cbse',12,'Economics','📈','#4ade80',false,'commerce',3), chapters: chs('Macroeconomics – Introduction','National Income Accounting','Money and Banking','Determination of Income and Employment','Government Budget and the Economy','Open Economy Macroeconomics','Microeconomics – Introduction','Theory of Consumer Behaviour','Production and Costs','The Theory of the Firm Under Perfect Competition','Non-Competitive Markets') },

  // ════════════════════════════════════════════════════════════
  //  ICSE  Classes 6–10
  // ════════════════════════════════════════════════════════════

  // ICSE 6
  { ...sub('icse',6,'English Language','📖','#fb923c',false,null,1), chapters: chs('Comprehension Passages','Formal & Informal Letters','Notice Writing','Essay Writing','Grammar – Parts of Speech','Grammar – Tenses','Grammar – Voice and Narration','Sentence Types & Transformation') },
  { ...sub('icse',6,'Mathematics','📐','#a78bfa',false,null,2), chapters: chs('Number System','Integers','Fractions','Decimals','Percentage','Ratio and Proportion','Algebra – Introduction','Geometry – Lines and Angles','Triangles – Basic','Mensuration – Perimeter and Area','Data Handling') },
  { ...sub('icse',6,'Science','🔬','#22d3ee',false,null,3), chapters: chs('Matter and Its Composition','Physical and Chemical Changes','Elements, Compounds, Mixtures','Cell – Structure and Functions','Plants – Food Making','Digestion in Animals','Adaptation in Animals','Motion and Measurement','Energy – Forms and Sources','Electricity and Magnets') },
  { ...sub('icse',6,'History & Civics','🏛','#fbbf24',false,null,4), chapters: chs('The Harappan Civilisation','The Vedic Age','The Age of the Mahājanapadas','Jainism and Buddhism','The Mauryan Empire','Ancient India – Art & Culture','Our Constitution – An Introduction','Organs of Government','Local Self-Government') },
  { ...sub('icse',6,'Geography','🗺','#4ade80',false,null,5), chapters: chs('The Earth in the Solar System','Latitudes and Longitudes','Motions of the Earth','Structure of the Earth','Landforms','Rocks','Soil','Water on Earth','Atmosphere – Composition and Structure') },

  // ICSE 7
  { ...sub('icse',7,'English Language','📖','#fb923c',false,null,1), chapters: chs('Comprehension','Précis Writing','Letter Writing – Formal and Informal','Essay Writing','Grammar – Clauses','Grammar – Conditionals','Reported Speech','Transformation of Sentences','Vocabulary') },
  { ...sub('icse',7,'Mathematics','📐','#a78bfa',false,null,2), chapters: chs('Integers','Fractions and Decimals','Rational Numbers','Exponents and Powers','Algebraic Expressions','Linear Equations','Ratio and Proportion','Unitary Method','Geometry – Congruence','Triangles – Properties','Mensuration – Area of Quadrilaterals','Data Handling – Statistics') },
  { ...sub('icse',7,'Physics','⚡','#22d3ee',false,null,3), chapters: chs('Physical Quantities and Measurement','Motion','Speed, Velocity and Acceleration','Energy','Light','Sound','Magnetism','Current Electricity') },
  { ...sub('icse',7,'Chemistry','🧪','#fbbf24',false,null,4), chapters: chs('Matter and its Composition','Physical and Chemical Changes','Elements, Compounds, Mixtures','Atomic Structure','Language of Chemistry','Chemical Changes and Reactions') },
  { ...sub('icse',7,'Biology','🧬','#4ade80',false,null,5), chapters: chs('Tissue Organisation','Circulatory System','Excretion','Nervous System','Photosynthesis','Transpiration','Reproduction in Plants','Dispersal of Seeds') },
  { ...sub('icse',7,'History & Civics','🏛','#f97316',false,null,6), chapters: chs('Medieval India – Delhi Sultanate','The Mughal Empire','Bhakti and Sufi Movements','Advent of Europeans','The Maratha Empire','Our Parliament','State Legislature','The Judiciary') },
  { ...sub('icse',7,'Geography','🗺','#4ade80',false,null,7), chapters: chs('Natural Regions of the World','India – Physical Features','India – Drainage','India – Climate','India – Soils and Natural Vegetation','India – Agriculture','India – Industries','India – Transport') },

  // ICSE 8
  { ...sub('icse',8,'English Language','📖','#fb923c',false,null,1), chapters: chs('Comprehension Passages','Précis Writing','Letter Writing','Notice and E-mail','Essay Writing','Grammar – Determiners','Grammar – Modals','Grammar – Active and Passive','Transformation and Synthesis') },
  { ...sub('icse',8,'Mathematics','📐','#a78bfa',false,null,2), chapters: chs('Rational Numbers','Exponents and Powers','Squares and Square Roots','Cubes and Cube Roots','Playing with Numbers','Sets','Ratio, Proportion and Variation','Percentage','Profit, Loss and Discount','Compound Interest','Algebraic Expressions & Identities','Linear Equations','Understanding Shapes','Congruence of Triangles','Mensuration – Surface Area and Volume','Data Handling – Pie Charts') },
  { ...sub('icse',8,'Physics','⚡','#22d3ee',false,null,3), chapters: chs('Force and Pressure','Energy','Light – Reflection','Light – Refraction','Sound','Electricity','Electromagnets and Motors') },
  { ...sub('icse',8,'Chemistry','🧪','#fbbf24',false,null,4), chapters: chs('Matter','Atomic Structure','Language of Chemistry','Water','Sulphur','Hydrogen Chloride','Ammonia','Acids, Bases and Salts') },
  { ...sub('icse',8,'Biology','🧬','#4ade80',false,null,5), chapters: chs('Transportation in Plants','Transportation in Animals','Reproduction in Animals','Adolescence','Microorganisms','Conservation of Nature','Pollution') },
  { ...sub('icse',8,'History & Civics','🏛','#f97316',false,null,6), chapters: chs('From Trade to Dominion','The Revolt of 1857','The Freedom Struggle','The Indian Independence Act','Formation of India and Pakistan','The Fundamental Rights and Duties','The Constitution – A Living Document','Emergency Provisions') },
  { ...sub('icse',8,'Geography','🗺','#4ade80',false,null,7), chapters: chs('Resources','Agriculture','Industries','Transport and Communication','Social Issues','Environmental Issues','Map Work') },

  // ICSE 9
  { ...sub('icse',9,'English Language','📖','#fb923c',false,null,1), chapters: chs('Unseen Comprehension','Composition – Descriptive Essay','Composition – Narrative Essay','Composition – Argumentative Essay','Letter Writing – Formal','Letter Writing – Informal','Notice Writing','E-mail Writing','Grammar – All Topics') },
  { ...sub('icse',9,'English Literature','📚','#f97316',false,null,2), chapters: chs('Prescribed Prose Chapters','Prescribed Poetry Poems','Drama – Prescribed Play','Short Stories') },
  { ...sub('icse',9,'Mathematics','📐','#a78bfa',false,null,3), chapters: chs('Rational and Irrational Numbers','Compound Interest','Expansions (Algebraic Identities)','Factorisation','Simultaneous Linear Equations','Indices / Exponents','Logarithms','Triangles – Congruence','Rectilinear Figures','Constructions','Circle – Chord Properties','Statistics – Frequency Distributions','Trigonometry – Ratios','Coordinate Geometry') },
  { ...sub('icse',9,'Physics','⚡','#22d3ee',true,null,4), chapters: chs('Measurements and Experimentation','Motion in One Dimension','Laws of Motion','Fluids – Upthrust and Archimedes','Heat – Temperature and Scales','Heat – Calorimetry','Refraction of Light','Spherical Lenses','Sound – Production and Propagation','Electricity') },
  { ...sub('icse',9,'Chemistry','🧪','#fbbf24',true,null,5), chapters: chs('The Language of Chemistry','Chemical Changes and Reactions','Water','Atomic Structure','The Periodic Table','Study of Gas Laws','Hydrogen – First Element','Atmospheric Pollution') },
  { ...sub('icse',9,'Biology','🧬','#4ade80',true,null,6), chapters: chs('Basic Biology – Cell Theory','Flowering Plants – Structure','Respiration','Transpiration','Photosynthesis','Excretion in Plants and Animals','The Nervous System','Reproduction in Plants','Reproduction in Humans','Population – Food and Health') },
  { ...sub('icse',9,'History & Civics','🏛','#f97316',false,null,7), chapters: chs('The Harappan Civilisation','The Vedic Age','Jainism and Buddhism','The Mauryan Empire','The Gupta Age','Medieval India – Sultanate','Mughal Empire','Advent of Europeans','Rise of Marathas','Revolt of 1857','The Indian National Movement I','Growth of Nationalism','The Indian Constitution','Structure of Government','The Union Legislature','The Union Executive','The Judiciary','The Election Commission') },
  { ...sub('icse',9,'Geography','🗺','#4ade80',false,null,8), chapters: chs('Interpreting Topographical Maps','The Earth as a Planet','Globe – Latitudes and Longitudes','Structure of the Earth','Rocks','Weathering','Denudation','Hydrosphere','Composition and Structure of the Atmosphere','Insolation','Atmospheric Pressure and Winds','Humidity','Climate – World Patterns') },

  // ICSE 10
  { ...sub('icse',10,'English Language','📖','#fb923c',false,null,1), chapters: chs('Unseen Comprehension','Composition – Argumentative Essay','Composition – Discursive Essay','Notice and E-mail Writing','Letter Writing (Official / Formal)','Grammar – Synthesis','Grammar – Transformation','Grammar – Error Correction') },
  { ...sub('icse',10,'English Literature','📚','#f97316',false,null,2), chapters: chs('Prose – All Prescribed Chapters','Poetry – All Prescribed Poems','Drama – All Prescribed Acts','Short Stories – All') },
  { ...sub('icse',10,'Mathematics','📐','#a78bfa',false,null,3), chapters: chs('Goods and Services Tax','Banking','Shares and Dividends','Linear Inequations','Quadratic Equations','Ratio and Proportion','Factorisation of Polynomials','Matrices','Arithmetic Progression','Geometric Progression','Co-ordinate Geometry','Equation of a Line','Similarity','Circles – Angle Properties','Tangent and Secant Theorems','Constructions','Trigonometric Identities','Angles of Elevation and Depression','Mensuration – Cylinder, Cone, Sphere','Probability','Statistics – Measures of Central Tendency','Statistics – Ogive Graphs') },
  { ...sub('icse',10,'Physics','⚡','#22d3ee',true,null,4), chapters: chs('Force, Work, Power and Energy','Simple Machines','Refraction of Light at a Plane Surface','Refraction Through a Lens','Spectrum','Sound','Electricity – Ohm\'s Law','Household Circuits','Magnetism','Electromagnetic Induction','Calorimetry','Radioactivity and Nuclear Energy') },
  { ...sub('icse',10,'Chemistry','🧪','#fbbf24',true,null,5), chapters: chs('Periodic Table and Periodicity','Chemical Bonding','Study of Acids, Bases and Salts','Analytical Chemistry','Mole Concept and Stoichiometry','Electrolysis','Metallurgy','Sulphur','Nitrogen and Ammonia','Chlorine and Hydrogen Chloride','Organic Chemistry – Intro','Hydrocarbons','Alcohols') },
  { ...sub('icse',10,'Biology','🧬','#4ade80',true,null,6), chapters: chs('Cell Division – Mitosis and Meiosis','Structure of a Chromosome','Genetics – Mendel\'s Laws','Genetics – Sex Determination','Evolution – Theories','Human Evolution','The Circulatory System','The Excretory System','The Nervous System','The Endocrine System','The Reproductive System','Immunity and Vaccination','Pollution') },
  { ...sub('icse',10,'History & Civics','🏛','#f97316',false,null,7), chapters: chs('Rise of Nationalism in India','Indian National Movement II','The World Between the Wars','World War II','The United Nations','Non-Aligned Movement','The Constitution of India','Fundamental Rights and Duties','The Union Parliament','The Union Executive','The Judiciary','Local Self-Government') },
  { ...sub('icse',10,'Geography','🗺','#4ade80',false,null,8), chapters: chs('Soils in India','Natural Vegetation of India','Agriculture in India','Mineral Resources in India','Power Resources in India','Manufacturing Industries','Transport in India','Waste Management','Topographical Map Work') },

  // ════════════════════════════════════════════════════════════
  //  KARNATAKA STATE BOARD  (KSEAB/KSEEB)
  //  Classes 1–5 : similar to CBSE with Kannada
  //  Classes 6–10: closely follows NCERT (Kannada medium option)
  //  Classes 11–12: PUC (Pre-University Course)
  // ════════════════════════════════════════════════════════════

  // Karnataka 1–5
  ...['karnataka'].flatMap(b => [1,2].flatMap(cls => [
    { ...sub(b,cls,'Kannada','🅺','#f97316',false,null,1), chapters: chs('ಅಕ್ಷರ ಮಾಲೆ','ಸಣ್ಣ ಕಥೆಗಳು','ಕವನಗಳು','ವ್ಯಾಕರಣ ಪರಿಚಯ','ರಚನೆ') },
    { ...sub(b,cls,'English','📖','#fb923c',false,null,2), chapters: chs('Alphabet and Phonics','Simple Words','Short Stories','Poems','Basic Grammar') },
    { ...sub(b,cls,'Mathematics','📐','#a78bfa',false,null,3), chapters: chs('Numbers','Addition & Subtraction','Shapes','Patterns','Measurement') },
  ])),

  ...['karnataka'].flatMap(b => [3,4,5].flatMap(cls => [
    { ...sub(b,cls,'Kannada','🅺','#f97316',false,null,1), chapters: chs('ಗದ್ಯ ಭಾಗ','ಪದ್ಯ ಭಾಗ','ಕಥೆಗಳು','ವ್ಯಾಕರಣ','ಪತ್ರ ಲೇಖನ') },
    { ...sub(b,cls,'English','📖','#fb923c',false,null,2), chapters: chs('Reading Comprehension','Grammar Basics','Story Writing','Letter Writing','Vocabulary') },
    { ...sub(b,cls,'Mathematics','📐','#a78bfa',false,null,3), chapters: chs('Numbers and Operations','Fractions & Decimals','Shapes and Geometry','Measurement','Data Handling','Problem Solving') },
    { ...sub(b,cls,'EVS','🌿','#4ade80',false,null,4), chapters: chs('Plants and Animals','Our Body','Food and Health','Water and Air','Our Community','Earth and Sky') },
  ])),

  // Karnataka 6
  { ...sub('karnataka',6,'Kannada','🅺','#f97316',false,null,1), chapters: chs('ಜೀವನದ ದಾರಿ','ನಮ್ಮ ಭಾರತ','ಕಾಡಿನ ಕಥೆ','ಮಕ್ಕಳ ಲೋಕ','ಪ್ರಕೃತಿಯ ಮಡಿಲು','ಸಾಹಿತ್ಯ ಸ್ಪರ್ಶ','ವ್ಯಾಕರಣ','ಗ್ರಂಥ ರಚನೆ') },
  { ...sub('karnataka',6,'English','📖','#fb923c',false,null,2), chapters: chs('Reading and Comprehension','Creative Writing','Grammar – Tenses & Voice','Letter Writing','Vocabulary Building') },
  { ...sub('karnataka',6,'Hindi','📝','#f472b6',false,null,3), chapters: chs('वसंत पाठ 1–5','वसंत पाठ 6–10','दूर्वा पाठ','व्याकरण','रचना') },
  { ...sub('karnataka',6,'Mathematics','📐','#a78bfa',false,null,4), chapters: chs('Knowing Our Numbers','Whole Numbers','Playing with Numbers','Basic Geometrical Ideas','Understanding Elementary Shapes','Integers','Fractions','Decimals','Data Handling','Mensuration','Algebra','Ratio and Proportion','Symmetry','Practical Geometry') },
  { ...sub('karnataka',6,'Science','🔬','#22d3ee',false,null,5), chapters: chs('Food – Where Does It Come From?','Components of Food','Fibre to Fabric','Sorting Materials','Separation of Substances','Changes Around Us','Getting to Know Plants','Body Movements','Living Organisms and Surroundings','Motion and Measurement','Light, Shadows and Reflections','Electricity and Circuits','Fun with Magnets','Water','Air Around Us','Garbage In, Garbage Out') },
  { ...sub('karnataka',6,'Social Science','🌍','#fbbf24',false,null,6), chapters: chs('Ancient Civilisations of the World','The Vedic Period','Kingdoms and Republics','The Mauryan Empire','The Gupta Empire','India in the Medieval Ages','Indian Ocean and Its Importance','Physical Features of India','Rivers of India','Climate of India','Natural Vegetation','Local Government','State Government') },

  // Karnataka 7–8 (summary format; follows NCERT closely)
  { ...sub('karnataka',7,'Kannada','🅺','#f97316',false,null,1), chapters: chs('ಗದ್ಯ ಪಾಠಗಳು 1–5','ಗದ್ಯ ಪಾಠಗಳು 6–10','ಪದ್ಯ ಭಾಗ','ವ್ಯಾಕರಣ','ರಚನಾ ಭಾಗ') },
  { ...sub('karnataka',7,'Mathematics','📐','#a78bfa',false,null,2), chapters: chs('Integers','Fractions and Decimals','Data Handling','Simple Equations','Lines and Angles','Triangle and Its Properties','Congruence of Triangles','Comparing Quantities','Rational Numbers','Practical Geometry','Perimeter and Area','Algebraic Expressions','Exponents and Powers','Symmetry','Visualising Solid Shapes') },
  { ...sub('karnataka',7,'Science','🔬','#22d3ee',false,null,3), chapters: chs('Nutrition in Plants','Nutrition in Animals','Heat','Acids, Bases and Salts','Physical and Chemical Changes','Respiration in Organisms','Transportation','Reproduction in Plants','Motion and Time','Electric Current and Its Effects','Light','Forests – Our Lifeline','Wastewater Story') },
  { ...sub('karnataka',7,'Social Science','🌍','#fbbf24',false,null,4), chapters: chs('The Age of Medievval India','Vijayanagara Empire','Bahmani Sultanate','Adil Shahi Dynasty','Mysore Kingdom','Colonial Period in Karnataka','Rivers and Drainage','Agriculture in Karnataka','Industries in Karnataka','Transport','Democratic Government','State Government Working') },
  { ...sub('karnataka',7,'English','📖','#fb923c',false,null,5), chapters: chs('Prose Lessons 1–5','Prose Lessons 6–10','Poetry','Grammar & Vocabulary','Writing Skills') },

  { ...sub('karnataka',8,'Kannada','🅺','#f97316',false,null,1), chapters: chs('ಗದ್ಯ ಪಾಠಗಳು 1–5','ಗದ್ಯ ಪಾಠಗಳು 6–10','ಪದ್ಯ ಭಾಗ','ಮೌಲ್ಯ ಪರಿಚಯ','ವ್ಯಾಕರಣ ಮತ್ತು ರಚನೆ') },
  { ...sub('karnataka',8,'Mathematics','📐','#a78bfa',false,null,2), chapters: chs('Rational Numbers','Linear Equations','Understanding Quadrilaterals','Practical Geometry','Data Handling','Squares and Square Roots','Cubes and Cube Roots','Comparing Quantities','Algebraic Expressions','Solid Shapes','Mensuration','Exponents and Powers','Direct and Inverse Proportions','Factorisation','Introduction to Graphs','Playing with Numbers') },
  { ...sub('karnataka',8,'Science','🔬','#22d3ee',false,null,3), chapters: chs('Crop Production','Microorganisms','Synthetic Fibres and Plastics','Materials: Metals and Non-Metals','Coal and Petroleum','Combustion and Flame','Conservation of Plants and Animals','Cell Structure','Reproduction in Animals','Reaching Adolescence','Force and Pressure','Friction','Sound','Chemical Effects of Electricity','Natural Phenomena','Light','Stars and the Solar System','Pollution') },
  { ...sub('karnataka',8,'Social Science','🌍','#fbbf24',false,null,4), chapters: chs('Modern Karnataka – Hyder Ali and Tipu Sultan','British Conquest of Mysore','Freedom Struggle in Karnataka','Unification of Karnataka','Physical Features of Karnataka','Rivers and Dams of Karnataka','Agriculture','Industries','Transport and Communication','Indian Constitution','Panchayati Raj','State Government') },

  // Karnataka 9 (SSLC Prep Year – follows old NCERT / state board)
  { ...sub('karnataka',9,'Kannada','🅺','#f97316',false,null,1), chapters: chs('ಕನ್ನಡ ಗದ್ಯ ಭಾಗ 1','ಕನ್ನಡ ಗದ್ಯ ಭಾಗ 2','ಕನ್ನಡ ಕವನ ಮಾಲೆ','ವ್ಯಾಕರಣ','ಪ್ರಬಂಧ ರಚನೆ') },
  { ...sub('karnataka',9,'English','📖','#fb923c',false,null,2), chapters: chs('Prose – Lessons 1–5','Prose – Lessons 6–10','Poetry','Supplementary Reader','Grammar & Writing') },
  { ...sub('karnataka',9,'Hindi','📝','#f472b6',false,null,3), chapters: chs('गद्य पाठ 1–5','गद्य पाठ 6–10','काव्य भाग','व्याकरण','पत्र एवं निबंध') },
  { ...sub('karnataka',9,'Mathematics','📐','#a78bfa',false,null,4), chapters: chs('Number Systems','Introduction to Polynomials','Coordinate Geometry','Linear Equations in Two Variables','Introduction to Euclid\'s Geometry','Lines and Angles','Triangles','Quadrilaterals','Areas of Parallelograms and Triangles','Circles','Constructions','Heron\'s Formula','Surface Areas and Volumes','Statistics','Probability') },
  { ...sub('karnataka',9,'Science','🔬','#22d3ee',true,null,5), chapters: chs('Matter in Our Surroundings','Is Matter Around Us Pure?','Atoms and Molecules','Structure of the Atom','The Fundamental Unit of Life','Tissues','Diversity in Living Organisms','Motion','Force and Laws of Motion','Gravitation','Work and Energy','Sound','Why Do We Fall Ill?','Natural Resources','Improvement in Food Resources') },
  { ...sub('karnataka',9,'Social Science','🌍','#fbbf24',false,null,6), chapters: chs('French Revolution','Socialism and Russian Revolution','Nazism and Rise of Hitler','Forest Society and Colonialism','Pastoralists in the Modern World','India – Size and Location','Physical Features of India','Drainage','Climate','Natural Vegetation and Wildlife','Population','What is Democracy?','Constitutional Design','Electoral Politics','Working of Institutions','Democratic Rights','The Story of Village Palampur','People as Resource','Poverty as a Challenge','Food Security in India') },

  // Karnataka 10 (SSLC – Board Exam Year)
  { ...sub('karnataka',10,'Kannada','🅺','#f97316',false,null,1), chapters: chs('ಕನ್ನಡ ಗದ್ಯ ಭಾಗ 1','ಕನ್ನಡ ಗದ್ಯ ಭಾಗ 2','ಕಾವ್ಯ ಮಂಜರಿ','ವ್ಯಾಕರಣ','ಪ್ರಬಂಧ') },
  { ...sub('karnataka',10,'English','📖','#fb923c',false,null,2), chapters: chs('Prose Lessons 1–5','Prose Lessons 6–10','Poetry – All Poems','Supplementary Reader','Grammar and Writing') },
  { ...sub('karnataka',10,'Hindi','📝','#f472b6',false,null,3), chapters: chs('काव्य खंड 1–5','काव्य खंड 6–9','गद्य खंड 1–4','गद्य खंड 5–8','व्याकरण','लेखन') },
  { ...sub('karnataka',10,'Mathematics','📐','#a78bfa',false,null,4), chapters: chs('Real Numbers','Polynomials','Pair of Linear Equations','Quadratic Equations','Arithmetic Progressions','Triangles','Coordinate Geometry','Introduction to Trigonometry','Applications of Trigonometry','Circles','Areas Related to Circles','Surface Areas and Volumes','Statistics','Probability') },
  { ...sub('karnataka',10,'Science','🔬','#22d3ee',true,null,5), chapters: chs('Chemical Reactions and Equations','Acids, Bases and Salts','Metals and Non-Metals','Carbon and Its Compounds','Periodic Classification of Elements','Life Processes','Control and Coordination','Reproduction in Organisms','Heredity and Evolution','Light – Reflection and Refraction','Human Eye and Colourful World','Electricity','Magnetic Effects of Current','Sources of Energy','Our Environment','Management of Natural Resources') },
  { ...sub('karnataka',10,'Social Science','🌍','#fbbf24',false,null,6), chapters: chs('The Rise of Nationalism in Europe','Nationalism in India','The Making of a Global World','Age of Industrialisation','Print Culture and Modern World','Resources and Development','Forest and Wildlife Resources','Water Resources','Agriculture','Minerals and Energy Resources','Manufacturing Industries','Lifelines of National Economy','Power Sharing','Federalism','Democracy and Diversity','Gender, Religion and Caste','Popular Struggles and Movements','Political Parties','Outcomes of Democracy','Development','Sectors of the Indian Economy','Money and Credit','Globalisation and Indian Economy','Consumer Rights') },

  // Karnataka PUC 11 – SCIENCE
  { ...sub('karnataka',11,'Physics','⚡','#22d3ee',true,'science',1), chapters: chs('Physical World','Units and Measurements','Motion in a Straight Line','Motion in a Plane','Laws of Motion','Work, Energy and Power','System of Particles and Rotational Motion','Gravitation','Mechanical Properties of Solids','Mechanical Properties of Fluids','Thermal Properties of Matter','Thermodynamics','Kinetic Theory','Oscillations','Waves') },
  { ...sub('karnataka',11,'Chemistry','🧪','#fbbf24',true,'science',2), chapters: chs('Some Basic Concepts of Chemistry','Structure of Atom','Classification of Elements and Periodicity in Properties','Chemical Bonding and Molecular Structure','States of Matter','Thermodynamics','Equilibrium','Redox Reactions','Hydrogen','The s-Block Elements','The p-Block Elements','Organic Chemistry – Basic Principles','Hydrocarbons','Environmental Chemistry') },
  { ...sub('karnataka',11,'Mathematics','📐','#a78bfa',false,'science',3), chapters: chs('Sets','Relations and Functions','Trigonometric Functions','Principle of Mathematical Induction','Complex Numbers and Quadratic Equations','Linear Inequalities','Permutations and Combinations','Binomial Theorem','Sequences and Series','Straight Lines','Conic Sections','Introduction to 3D Geometry','Limits and Derivatives','Mathematical Reasoning','Statistics','Probability') },
  { ...sub('karnataka',11,'Biology','🧬','#4ade80',true,'science',4), chapters: chs('The Living World','Biological Classification','Plant Kingdom','Animal Kingdom','Morphology of Flowering Plants','Anatomy of Flowering Plants','Structural Organisation in Animals','Cell – The Unit of Life','Biomolecules','Cell Cycle and Division','Transport in Plants','Mineral Nutrition','Photosynthesis','Respiration in Plants','Plant Growth and Development','Digestion and Absorption','Breathing and Exchange of Gases','Body Fluids and Circulation','Excretory Products and Elimination','Locomotion and Movement','Neural Control and Coordination','Chemical Coordination and Integration') },
  { ...sub('karnataka',11,'Kannada','🅺','#f97316',false,'science',5), chapters: chs('ಗದ್ಯ ಭಾಗ 1–5','ಗದ್ಯ ಭಾಗ 6–10','ಕಾವ್ಯ ಭಾಗ','ವ್ಯಾಕರಣ','ಪ್ರಬಂಧ ಲೇಖನ') },
  { ...sub('karnataka',11,'English','📖','#fb923c',false,'science',6), chapters: chs('Reading Comprehension','Writing Skills','Grammar – Advanced','Literature Appreciation','Project Work') },

  // Karnataka PUC 12 – SCIENCE
  { ...sub('karnataka',12,'Physics','⚡','#22d3ee',true,'science',1), chapters: chs('Electric Charges and Fields','Electrostatic Potential and Capacitance','Current Electricity','Moving Charges and Magnetism','Magnetism and Matter','Electromagnetic Induction','Alternating Current','Electromagnetic Waves','Ray Optics and Optical Instruments','Wave Optics','Dual Nature of Radiation','Atoms','Nuclei','Semiconductor Electronics','Communication Systems') },
  { ...sub('karnataka',12,'Chemistry','🧪','#fbbf24',true,'science',2), chapters: chs('The Solid State','Solutions','Electrochemistry','Chemical Kinetics','Surface Chemistry','General Principles of Metallurgy','The p-Block Elements','The d and f Block Elements','Coordination Compounds','Haloalkanes and Haloarenes','Alcohols, Phenols and Ethers','Aldehydes, Ketones and Carboxylic Acids','Amines','Biomolecules','Polymers','Chemistry in Everyday Life') },
  { ...sub('karnataka',12,'Mathematics','📐','#a78bfa',false,'science',3), chapters: chs('Relations and Functions','Inverse Trigonometric Functions','Matrices','Determinants','Continuity and Differentiability','Application of Derivatives','Integrals','Application of Integrals','Differential Equations','Vector Algebra','Three Dimensional Geometry','Linear Programming','Probability') },
  { ...sub('karnataka',12,'Biology','🧬','#4ade80',true,'science',4), chapters: chs('Reproduction in Organisms','Sexual Reproduction in Flowering Plants','Human Reproduction','Reproductive Health','Principles of Inheritance and Variation','Molecular Basis of Inheritance','Evolution','Human Health and Disease','Strategies for Enhancement in Food Production','Microbes in Human Welfare','Biotechnology – Principles and Processes','Biotechnology and Its Applications','Organisms and Populations','Ecosystem','Biodiversity and Conservation','Environmental Issues') },
  { ...sub('karnataka',12,'Kannada','🅺','#f97316',false,'science',5), chapters: chs('ಗದ್ಯ ಭಾಗ','ಕಾವ್ಯ ಭಾಗ','ನಾಟಕ ಭಾಗ','ಪ್ರಬಂಧ ಲೇಖನ','ವ್ಯಾಕರಣ') },
  { ...sub('karnataka',12,'English','📖','#fb923c',false,'science',6), chapters: chs('Reading Skills','Writing Skills','Grammar – Advanced','Literature','Project & Viva') },

  // Karnataka PUC 11 & 12 – COMMERCE
  { ...sub('karnataka',11,'Accountancy','📊','#22d3ee',false,'commerce',1), chapters: chs('Introduction to Accounting','Theory Base of Accounting','Recording Transactions I','Recording Transactions II','Bank Reconciliation Statement','Trial Balance & Rectification','Depreciation, Provisions & Reserves','Bills of Exchange','Financial Statements I','Financial Statements II','Incomplete Records','Computerised Accounting') },
  { ...sub('karnataka',11,'Business Studies','🏢','#fbbf24',false,'commerce',2), chapters: chs('Nature and Purpose of Business','Forms of Business Organisation','Public, Private and Global Enterprises','Business Services','Emerging Modes of Business','Social Responsibility','Formation of a Company','Sources of Business Finance','Small Business','Internal Trade','International Business') },
  { ...sub('karnataka',11,'Economics','📈','#4ade80',false,'commerce',3), chapters: chs('Indian Economy on the Eve of Independence','Indian Economy 1950–1990','Liberalisation, Privatisation and Globalisation','Poverty','Human Capital Formation','Rural Development','Employment – Growth & Informalisation','Infrastructure','Environment and Sustainable Development','Comparative Development Experiences') },
  { ...sub('karnataka',12,'Accountancy','📊','#22d3ee',false,'commerce',1), chapters: chs('Accounting for Partnership – Basics','Reconstitution – Admission','Reconstitution – Retirement/Death','Dissolution of Partnership Firm','Accounting for Share Capital','Issue and Redemption of Debentures','Financial Statements of a Company','Analysis of Financial Statements','Accounting Ratios','Cash Flow Statement') },
  { ...sub('karnataka',12,'Business Studies','🏢','#fbbf24',false,'commerce',2), chapters: chs('Nature and Significance of Management','Principles of Management','Business Environment','Planning','Organising','Staffing','Directing','Controlling','Financial Management','Financial Markets','Marketing Management','Consumer Protection','Entrepreneurship') },
  { ...sub('karnataka',12,'Economics','📈','#4ade80',false,'commerce',3), chapters: chs('Macroeconomics – Introduction','National Income Accounting','Money and Banking','Determination of Income and Employment','Government Budget','Open Economy Macroeconomics') },

];

// ══════════════════════════════════════════════════════════════
//  SEED RUNNER
// ══════════════════════════════════════════════════════════════
async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // clear existing
    await client.query('DELETE FROM chapters');
    await client.query('DELETE FROM subjects');
    console.log('Cleared existing syllabus data');

    for (const subj of SYLLABUS) {
      const { chapters, ...s } = subj;
      const res = await client.query(
        `INSERT INTO subjects (board, class_num, stream, name, icon, color, is_compet, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [s.board, s.class_num, s.stream, s.name, s.icon, s.color, s.is_compet, s.sort_order]
      );
      const sid = res.rows[0].id;

      for (const ch of chapters) {
        await client.query(
          `INSERT INTO chapters (subject_id, name, ch_type, sort_order)
           VALUES ($1,$2,$3,$4)`,
          [sid, ch.name, ch.ch_type || 'regular', ch.sort_order || 0]
        );
      }
    }

    await client.query('COMMIT');
    const counts = await client.query('SELECT COUNT(*) FROM subjects');
    const chCounts = await client.query('SELECT COUNT(*) FROM chapters');
    console.log(`✅ Seeded ${counts.rows[0].count} subjects, ${chCounts.rows[0].count} chapters`);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', e.message);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
