/**
 * The blog's starting topic queue. Admin → Blog can add, remove and reorder
 * these; when fewer than five are left the job asks the model for more.
 *
 * `hints` steer which catalogue pieces a post links to (names are matched
 * against the live taxonomy, so plurals are fine). `months` (1–12) marks a
 * seasonal topic: it jumps the queue in those months and waits otherwise.
 * Collection stories are told only from the product facts the job supplies;
 * the prompt forbids inventing a design inspiration or a workshop story.
 */

export const BLOG_TOPICS = [
  // Market
  { title: 'Lab-Grown Diamond Jewellery in India: What Retailers Should Know', angle: 'Who is buying, why, and how a store can position lab-grown alongside its existing range.', keywords: ['lab-grown diamond jewellery India', 'lab grown diamonds retailers'], hints: {} },
  { title: 'Why Younger Buyers Are Choosing Lab-Grown Diamonds', angle: 'Values, design taste and budget priorities of first-time fine jewellery buyers.', keywords: ['lab grown diamonds millennials', 'lab-grown engagement rings'], hints: { occasion: 'Engagement' } },
  { title: 'Lab-Grown vs Natural Diamonds: An Honest Comparison for Jewellers', angle: 'Same material, different origin; what actually differs for the retailer and the wearer.', keywords: ['lab grown vs natural diamonds', 'are lab grown diamonds real'], hints: { category: 'Rings' } },
  { title: 'How Lab-Grown Diamonds Are Changing Bridal Jewellery', angle: 'Bigger looks within the same budget, and new design freedom for bridal ranges.', keywords: ['lab grown bridal jewellery', 'lab-grown diamond engagement ring'], hints: { occasion: 'Engagement', category: 'Rings' } },
  { title: 'Lab-Grown Diamonds and Sustainability: What You Can Truthfully Say', angle: 'Claims a retailer can make with confidence, and the ones to avoid.', keywords: ['sustainable diamonds', 'ethical lab grown diamonds'], hints: {} },
  { title: 'Pricing Lab-Grown Diamond Jewellery in Your Store', angle: 'A framework for positioning and margins, without quoting market prices.', keywords: ['pricing lab grown diamond jewellery', 'jewellery retail margins'], hints: {} },

  // Styling
  { title: 'Ways to Style Diamond Studs from Desk to Dinner', angle: 'Everyday to evening styling ideas a sales associate can share at the counter.', keywords: ['diamond stud earrings styling', 'everyday diamond earrings'], hints: { category: 'Earring' } },
  { title: 'Stacking Rings: How to Build a Stack That Sells', angle: 'Mixing bands, textures and metals; how to display stacks to lift basket size.', keywords: ['stackable diamond rings', 'ring stacking ideas'], hints: { category: 'Rings' } },
  { title: 'Tennis Bracelets: The Everyday Luxury Customers Want', angle: 'Why the tennis bracelet is a staple and how to present it.', keywords: ['diamond tennis bracelet', 'lab grown tennis bracelet'], hints: { category: 'Bracelet' } },
  { title: 'Rose, White or Yellow Gold: Matching Metal to Skin Tone', angle: 'A practical guide sales staff can use with customers.', keywords: ['gold colour skin tone', 'rose gold vs yellow gold'], hints: {} },
  { title: 'Layering Necklaces and Pendants: A Styling Guide', angle: 'Lengths, weights and combinations that look intentional.', keywords: ['layering necklaces', 'diamond pendant styling'], hints: { category: 'Necklace' } },
  { title: 'Modern Mangalsutras: Tradition Meets Everyday Wear', angle: 'How contemporary designs keep the meaning while suiting daily wear.', keywords: ['modern mangalsutra designs', 'diamond mangalsutra'], hints: { category: 'Necklace' } },
  { title: "Men's Diamond Jewellery: Rings, Studs and Kadas", angle: 'A growing category and how to merchandise it.', keywords: ['mens diamond jewellery', 'diamond kada for men'], hints: { category: 'Kada' } },

  // Seasonal
  { title: 'Festive Jewellery Edit: Diwali Looks with Lab-Grown Diamonds', angle: 'Festive styling ideas across price points and categories.', keywords: ['diwali jewellery', 'festive diamond jewellery'], hints: { occasion: 'Festive' }, months: [9, 10] },
  { title: 'Diwali Stocking Checklist for Jewellery Retailers', angle: 'What to have on the counter before the festive rush, by category.', keywords: ['diwali jewellery stock', 'festive season jewellery retail'], hints: { occasion: 'Festive' }, months: [8, 9] },
  { title: 'Wedding Season Guide: Jewellery for Every Function', angle: 'Engagement to reception: pieces by function and by who is wearing them.', keywords: ['wedding jewellery guide', 'bridal diamond jewellery'], hints: { occasion: 'Traditional' }, months: [10, 11, 12, 1] },
  { title: 'Gifting Season Playbook: Easy-to-Gift Diamond Pieces', angle: 'Pieces that suit gifting and how to present them.', keywords: ['diamond jewellery gifts', 'jewellery gifting ideas'], hints: { occasion: 'Gifting' }, months: [11, 12, 1] },
  { title: "Planning for Valentine's Day at the Jewellery Counter", angle: 'Assortment and display ideas for the Valentine rush.', keywords: ['valentine jewellery', 'diamond gifts for her'], hints: { occasion: 'Valentine' }, months: [12, 1] },
  { title: 'Akshaya Tritiya: Preparing Your Store for Auspicious Buying', angle: 'Why buyers shop on the day and how to prepare the range.', keywords: ['akshaya tritiya jewellery', 'auspicious jewellery buying'], hints: { occasion: 'Religious' }, months: [3, 4] },

  // Retail education
  { title: 'How to Explain Lab-Grown Diamonds to a Sceptical Customer', angle: 'Questions customers ask and clear, honest answers.', keywords: ['explain lab grown diamonds', 'lab grown diamond questions'], hints: {} },
  { title: 'Building a Lab-Grown Bridal Counter: Assortment Planning', angle: 'Which bridal pieces to stock and how deep to go.', keywords: ['bridal jewellery assortment', 'lab grown bridal collection'], hints: { occasion: 'Engagement' } },
  { title: 'Merchandising Fine Jewellery: Display Tips That Increase Sales', angle: 'Lighting, grouping and storytelling at the counter.', keywords: ['jewellery display ideas', 'jewellery merchandising'], hints: {} },
  { title: 'Private Label Jewellery: How Retailers Can Build Their Own Line', angle: 'What a private label programme involves and how to start one.', keywords: ['private label jewellery', 'jewellery manufacturer for retailers'], hints: {} },
  { title: 'Hallmarking and HUID: What Buyers Ask and How to Answer', angle: 'Explaining hallmarking to customers simply.', keywords: ['bis hallmark', 'huid jewellery'], hints: {} },

  // Guides
  { title: 'The 4Cs for Lab-Grown Diamonds, Explained Simply', angle: 'Cut, colour, clarity and carat in plain language.', keywords: ['4cs of diamonds', 'lab grown diamond grading'], hints: { category: 'Rings' } },
  { title: 'CVD vs HPHT: How Lab-Grown Diamonds Are Made', angle: 'The two growth methods and why the finished stone is still a diamond.', keywords: ['cvd vs hpht', 'how lab grown diamonds are made'], hints: {} },
  { title: '9K, 14K or 18K Gold: Choosing the Right Karat', angle: 'Purity, durability and colour trade-offs for each karat.', keywords: ['9k vs 14k vs 18k gold', 'gold karat guide'], hints: {} },
  { title: 'Diamond Shapes Guide: Round, Oval, Pear and Beyond', angle: 'How each shape looks, wears and suits different pieces.', keywords: ['diamond shapes guide', 'oval vs round diamond'], hints: { category: 'Rings' } },
  { title: 'How to Care for Diamond Jewellery at Home', angle: 'Cleaning, storage and when to bring pieces in for a check.', keywords: ['clean diamond jewellery', 'diamond jewellery care'], hints: {} },
  { title: 'Ring Sizing for Retailers: Getting It Right the First Time', angle: 'Measuring, common mistakes and resizing basics.', keywords: ['ring size guide india', 'how to measure ring size'], hints: { category: 'Rings' } },
  { title: 'VVS-VS Clarity and EF Colour: What the Grade Means', angle: 'What this grade looks like to the eye and why it suits fine jewellery.', keywords: ['vvs vs clarity', 'ef colour diamond'], hints: {} },

  // Collection stories
  { title: 'Inside the Celestial Dreams Collection', angle: 'Describe the pieces using only the product facts supplied.', keywords: ['celestial jewellery', 'star diamond jewellery'], hints: { collection: 'Celestial Dreams' } },
  { title: 'Ocean Whisper: A Closer Look at the Collection', angle: 'Describe the pieces using only the product facts supplied.', keywords: ['ocean inspired jewellery'], hints: { collection: 'Ocean Whisper' } },
  { title: 'Aura Geometry: Clean Lines for the Modern Wearer', angle: 'Describe the pieces using only the product facts supplied.', keywords: ['geometric diamond jewellery'], hints: { collection: 'Aura Geometry' } },
  { title: 'Prithvi: A Closer Look at the Collection', angle: 'Describe the pieces using only the product facts supplied.', keywords: ['earth inspired jewellery'], hints: { collection: 'Prithvi' } },
  { title: 'Monsoon Magic: Jewellery for the Rainy Season', angle: 'Describe the pieces using only the product facts supplied.', keywords: ['monsoon jewellery'], hints: { collection: 'Monsoon Magic' }, months: [6, 7, 8] },
];
