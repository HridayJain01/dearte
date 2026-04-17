import bcrypt from 'bcryptjs';

const placeholderSet = (keyword) => [
  `https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1200&q=80`,
  `https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1200&q=80`,
  `https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1200&q=80`,
  `https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=1200&q=80&${keyword}`,
];

const makeProduct = ({
  id,
  styleCode,
  name,
  category,
  subCategory,
  collection,
  metal,
  diamondWeight,
  goldWeight,
  diamondQuality,
  settingType,
  occasion,
  stockType,
  isNewArrival,
  isBestSeller,
  views,
  cartAdds,
  orderCount,
}) => {
  const kt18Net = goldWeight;
  const kt18Gross = Number((goldWeight * 1.05).toFixed(3));
  const stockQuantity = stockType === 'Ready Stock' ? 10 : 0;

  return {
    id,
    styleCode,
    name,
    category,
    subCategory,
    collection,
    metal,
    metalColor: metal.includes('Rose')
      ? 'Rose Gold'
      : metal.includes('White')
        ? 'White Gold'
        : metal.includes('Platinum')
          ? 'Platinum'
          : 'Yellow Gold',
    diamondWeight,
    goldWeight,
    kt18GrossWt: kt18Gross,
    kt18NetWt: kt18Net,
    kt14GrossWt: 0,
    kt14NetWt: 0,
    kt9GrossWt: 0,
    kt9NetWt: 0,
    diamondQuality,
    settingType,
    occasion,
    sku: `${styleCode}-SKU`,
    stockType,
    stockQuantity,
    status: 'Active',
    syncStatus: 'Manual',
    lastUpdated: '2026-04-12T09:00:00.000Z',
    isNewArrival,
    isBestSeller,
    description:
      'A couture-led jewellery silhouette built for B2B buyers who want statement craftsmanship with practical ordering flexibility.',
    images: placeholderSet(styleCode.toLowerCase()),
    video360:
      'https://player.vimeo.com/external/370467553.sd.mp4?s=4df4b3b89eb6e5747aa0f248ab0bf36d5ef4d9e0&profile_id=164&oauth2_token_id=57447761',
    customizationOptions: {
      goldColors: ['Yellow Gold', 'Rose Gold', 'White Gold'],
      goldCarats: ['14K', '18K', '22K'],
      diamondQualities: ['SI-IJ', 'VS-GH', 'VVS-EF'],
    },
    specifications: [
      { attribute: 'Metal', value: metal },
      { attribute: 'Diamond Weight', value: `${diamondWeight.toFixed(2)} ct` },
      { attribute: 'Gold Weight', value: `${goldWeight.toFixed(2)} g` },
      { attribute: '18kt Net Wt', value: `${kt18Net.toFixed(2)} g` },
      { attribute: 'Diamond Quality', value: diamondQuality },
      { attribute: 'Setting Type', value: settingType },
      { attribute: 'Occasion', value: occasion },
      { attribute: 'SKU', value: `${styleCode}-SKU` },
    ],
    views,
    cartAdds,
    orderCount,
  };
};

export const seedData = {
  banners: [
    {
      id: 'banner-1',
      title: 'Editorial Brilliance for Modern Retailers',
      subtitle:
        'Curated bridal and occasion jewellery collections synced from Smart Jewel ERP Plus.',
      ctaLabel: 'Browse Collections',
      ctaLink: '/products',
      image:
        'https://images.unsplash.com/photo-1620656798579-1984d8c6e25f?auto=format&fit=crop&w=1800&q=80',
      active: true,
    },
    {
      id: 'banner-2',
      title: 'Ready Stock Meets Make to Order',
      subtitle:
        'A premium B2B ordering workflow designed for sales teams, showrooms, and export partners.',
      ctaLabel: 'See Best Sellers',
      ctaLink: '/products?sort=best-sellers',
      image:
        'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1800&q=80',
      active: true,
    },
    {
      id: 'banner-3',
      title: 'Catalogues Tailored for Each Buyer',
      subtitle:
        'Assign private collections, manage buyer approvals, and close orders without exposing pricing.',
      ctaLabel: 'Explore Catalogues',
      ctaLink: '/catalogue',
      image:
        'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1800&q=80',
      active: true,
    },
  ],
  companyInfo: {
    founded: 'Founded 2007',
    tagline: 'Crafted for legacy retail partners and contemporary jewellery houses.',
    certifications: ['BIS Hallmarked', 'IGI Guided Grading', 'Responsible Sourcing'],
    mission:
      'Elevate wholesale jewellery buying with a polished digital experience rooted in trust, beauty, and fulfilment precision.',
  },
  testimonials: [
    {
      id: 'test-1',
      name: 'Rhea Mehta',
      company: 'Aurum Bridal Studio',
      rating: 5,
      status: 'Approved',
      review:
        'The catalogue-driven buying workflow feels incredibly premium and helps our buyers move faster with fewer back-and-forths.',
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    },
    {
      id: 'test-2',
      name: 'Nikhil Shah',
      company: 'House of Solitaires',
      rating: 5,
      status: 'Approved',
      review:
        'Our sales team loves the user activation flow and private catalogues. It feels built for jewellery trade, not generic ecommerce.',
      avatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    },
    {
      id: 'test-3',
      name: 'Mona Kapoor',
      company: 'Velvet Gold Exports',
      rating: 4,
      status: 'Pending',
      review:
        'The product data sync and customization options are exactly what our B2B orders needed.',
      avatar:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    },
  ],
  events: [
    {
      id: 'event-1',
      title: 'Mumbai Bridal Buying Preview',
      date: '2026-05-18',
      description:
        'Private showroom event for bridal retailers with first access to the Radiant Vows collection.',
      image:
        'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
    },
    {
      id: 'event-2',
      title: 'Dubai Export Partner Showcase',
      date: '2026-06-06',
      description:
        'A curated event for export buyers focusing on flexible catalogue assignments and MTO planning.',
      image:
        'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1200&q=80',
    },
  ],
  careers: [
    {
      id: 'job-1',
      title: 'Senior Sales Coordinator',
      location: 'Mumbai',
      type: 'Full Time',
      description:
        'Support key B2B accounts, coordinate catalogue releases, and manage retailer onboarding.',
    },
    {
      id: 'job-2',
      title: 'Catalogue Merchandiser',
      location: 'Surat',
      type: 'Full Time',
      description:
        'Own collection presentation, product hierarchy, and digital merchandising for private buyer catalogues.',
    },
  ],
  faq: [
    {
      id: 'faq-1',
      question: 'Why are prices not shown?',
      answer:
        'DeArte is a trade-only platform. Pricing is confirmed directly by the assigned sales representative after review.',
    },
    {
      id: 'faq-2',
      question: 'Can I place Make to Order requests?',
      answer:
        'Yes. Products marked Make to Order can be customized and submitted for review through the standard checkout flow.',
    },
    {
      id: 'faq-3',
      question: 'How do private catalogues work?',
      answer:
        'Sales reps can assign curated catalogues to specific buyers, and only those buyers can view them in their account.',
    },
  ],
  staticPages: {
    'privacy-policy': {
      title: 'Privacy Policy',
      body: [
        'We collect only the information required to service trade accounts, manage orders, and support catalogue assignments.',
        'Buyer data is never sold and is only shared with authorized internal teams and integrated business systems.',
        'Users may request updates to their business account information through the profile area or support desk.',
      ],
    },
    terms: {
      title: 'Terms & Conditions',
      body: [
        'Access is restricted to approved business buyers and authorized DeArte team members.',
        'Order submissions are subject to review, inventory verification, and final sales confirmation.',
        'Pricing and fulfilment timelines are communicated outside the storefront after order review.',
      ],
    },
    'return-policy': {
      title: 'Return Policy',
      body: [
        'Returns are reviewed case by case according to customization status, product condition, and agreed trade terms.',
        'Make to Order pieces are generally non-returnable unless a manufacturing issue is confirmed.',
        'Contact your sales representative within 48 hours of delivery for support.',
      ],
    },
  },
  education: {
    diamond: {
      title: 'Diamond Guide',
      intro:
        'A quick reference for the 4 Cs and how DeArte communicates diamond quality to retail buyers.',
      sections: [
        {
          title: 'The 4 Cs',
          bullets: [
            'Cut determines brilliance and light performance.',
            'Color grades describe the absence of visible tint.',
            'Clarity reflects the internal and external characteristics of the stone.',
            'Carat indicates weight and impacts visual scale.',
          ],
        },
        {
          title: 'Grade Comparison',
          bullets: ['SI-IJ: value-forward everyday assortment', 'VS-GH: premium commercial quality', 'VVS-EF: high-luxury refined brilliance'],
        },
      ],
    },
    metals: {
      title: 'Metals Guide',
      intro:
        'Understand purity, wearability, and tone selection across DeArte gold and platinum options.',
      sections: [
        {
          title: 'Gold Purity',
          bullets: ['14K offers durability for daily wear.', '18K balances richness and resilience.', '22K delivers higher gold content with a softer feel.'],
        },
        {
          title: 'Metal Colors',
          bullets: ['Yellow Gold is timeless and warm.', 'Rose Gold feels romantic and contemporary.', 'White Gold offers a cooler editorial finish.', 'Platinum provides weight and prestige.'],
        },
      ],
    },
    'ethical-sourcing': {
      title: 'Ethical Sources',
      intro:
        'DeArte works with audited sourcing partners and documented supply chains across stones and metals.',
      sections: [
        {
          title: 'Commitment',
          bullets: ['Supplier vetting for compliance and traceability.', 'Preference for responsible sourcing practices and supporting certifications.', 'Transparent documentation for partner verification.'],
        },
      ],
    },
    'size-guide': {
      title: 'Size Guide',
      intro:
        'Reference charts and simple measuring instructions for rings, bracelets, and necklaces.',
      sections: [
        {
          title: 'Ring Sizes',
          bullets: ['Use a paper strip or ring sizer to measure finger circumference.', 'Match Indian sizes to international equivalents before finalizing MTO submissions.'],
        },
        {
          title: 'Jewellery Lengths',
          bullets: ['Bracelets should sit comfortably with a half-inch allowance.', 'Necklace lengths should be chosen according to neckline, pendant weight, and styling intent.'],
        },
      ],
    },
  },
  siteSettings: {
    companyName: 'DeArte Jewellery',
    email: 'care@deartejewellery.com',
    phone: '+91 98765 43210',
    whatsapp: 'https://wa.me/919876543210',
    instagram: 'https://instagram.com',
    linkedin: 'https://linkedin.com',
    facebook: 'https://facebook.com',
    address: 'Opera House, Mumbai, Maharashtra 400004',
    hours: 'Mon - Sat, 10:30 AM - 7:00 PM',
    mapsEmbed:
      'https://www.google.com/maps?q=Opera%20House%20Mumbai&output=embed',
    newsletterBlurb: 'Receive collection launches, trade event invitations, and catalogue updates.',
  },
  roles: [
    { id: 'role-1', name: 'Super Admin', permissions: ['all'] },
    { id: 'role-2', name: 'Sales Manager', permissions: ['dashboard', 'users', 'catalogues', 'orders'] },
    { id: 'role-3', name: 'Catalogue Manager', permissions: ['catalogues', 'products'] },
    { id: 'role-4', name: 'Report Viewer', permissions: ['reports'] },
  ],
  products: [
    makeProduct({
      id: 'prod-1',
      styleCode: 'DAR-1001',
      name: 'Radiant Vows Solitaire Ring',
      category: 'Rings',
      subCategory: 'Engagement Rings',
      collection: 'Radiant Vows',
      metal: '18K Yellow Gold',
      diamondWeight: 0.45,
      goldWeight: 4.2,
      diamondQuality: 'VS-GH',
      settingType: 'Prong',
      occasion: 'Wedding',
      stockType: 'Ready Stock',
      isNewArrival: true,
      isBestSeller: true,
      views: 124,
      cartAdds: 41,
      orderCount: 19,
    }),
    makeProduct({
      id: 'prod-2',
      styleCode: 'DAR-1002',
      name: 'Moonleaf Halo Earrings',
      category: 'Earrings',
      subCategory: 'Stud Earrings',
      collection: 'Moonleaf',
      metal: '18K Rose Gold',
      diamondWeight: 0.62,
      goldWeight: 5.1,
      diamondQuality: 'VVS-EF',
      settingType: 'Halo',
      occasion: 'Celebration',
      stockType: 'Make to Order',
      isNewArrival: true,
      isBestSeller: false,
      views: 98,
      cartAdds: 20,
      orderCount: 11,
    }),
    makeProduct({
      id: 'prod-3',
      styleCode: 'DAR-1003',
      name: 'Heirloom Bloom Necklace',
      category: 'Necklaces',
      subCategory: 'Pendant Sets',
      collection: 'Heirloom Bloom',
      metal: '18K White Gold',
      diamondWeight: 1.1,
      goldWeight: 9.3,
      diamondQuality: 'VS-GH',
      settingType: 'Cluster',
      occasion: 'Reception',
      stockType: 'Make to Order',
      isNewArrival: false,
      isBestSeller: true,
      views: 160,
      cartAdds: 52,
      orderCount: 24,
    }),
    makeProduct({
      id: 'prod-4',
      styleCode: 'DAR-1004',
      name: 'Sage Crest Bangle',
      category: 'Bangles',
      subCategory: 'Diamond Bangles',
      collection: 'Sage Crest',
      metal: '18K Yellow Gold',
      diamondWeight: 0.8,
      goldWeight: 16.4,
      diamondQuality: 'VS-GH',
      settingType: 'Channel',
      occasion: 'Festive',
      stockType: 'Ready Stock',
      isNewArrival: false,
      isBestSeller: true,
      views: 140,
      cartAdds: 45,
      orderCount: 20,
    }),
    makeProduct({
      id: 'prod-5',
      styleCode: 'DAR-1005',
      name: 'Velvet Arc Tennis Bracelet',
      category: 'Bracelets',
      subCategory: 'Tennis Bracelets',
      collection: 'Velvet Arc',
      metal: 'Platinum Finish',
      diamondWeight: 1.45,
      goldWeight: 11.2,
      diamondQuality: 'VVS-EF',
      settingType: 'Line',
      occasion: 'Evening',
      stockType: 'Make to Order',
      isNewArrival: true,
      isBestSeller: true,
      views: 180,
      cartAdds: 60,
      orderCount: 27,
    }),
    makeProduct({
      id: 'prod-6',
      styleCode: 'DAR-1006',
      name: 'Petal Crest Drop Earrings',
      category: 'Earrings',
      subCategory: 'Drop Earrings',
      collection: 'Petal Crest',
      metal: '18K Rose Gold',
      diamondWeight: 0.72,
      goldWeight: 6.3,
      diamondQuality: 'SI-IJ',
      settingType: 'Pave',
      occasion: 'Cocktail',
      stockType: 'Ready Stock',
      isNewArrival: true,
      isBestSeller: false,
      views: 77,
      cartAdds: 14,
      orderCount: 8,
    }),
    makeProduct({
      id: 'prod-7',
      styleCode: 'DAR-1007',
      name: 'Opaline Promise Ring',
      category: 'Rings',
      subCategory: 'Cocktail Rings',
      collection: 'Opaline',
      metal: '18K White Gold',
      diamondWeight: 0.92,
      goldWeight: 7.4,
      diamondQuality: 'VS-GH',
      settingType: 'Bezel',
      occasion: 'Engagement',
      stockType: 'Make to Order',
      isNewArrival: false,
      isBestSeller: false,
      views: 69,
      cartAdds: 13,
      orderCount: 4,
    }),
    makeProduct({
      id: 'prod-8',
      styleCode: 'DAR-1008',
      name: 'Golden Vale Pendant',
      category: 'Necklaces',
      subCategory: 'Pendants',
      collection: 'Golden Vale',
      metal: '18K Yellow Gold',
      diamondWeight: 0.36,
      goldWeight: 3.8,
      diamondQuality: 'SI-IJ',
      settingType: 'Prong',
      occasion: 'Daily Wear',
      stockType: 'Ready Stock',
      isNewArrival: false,
      isBestSeller: false,
      views: 52,
      cartAdds: 8,
      orderCount: 3,
    }),
    makeProduct({
      id: 'prod-9',
      styleCode: 'DAR-1009',
      name: 'Champagne Reed Choker',
      category: 'Necklaces',
      subCategory: 'Chokers',
      collection: 'Champagne Reed',
      metal: '18K Rose Gold',
      diamondWeight: 1.84,
      goldWeight: 15.5,
      diamondQuality: 'VVS-EF',
      settingType: 'Micro Pave',
      occasion: 'Bridal',
      stockType: 'Make to Order',
      isNewArrival: true,
      isBestSeller: true,
      views: 205,
      cartAdds: 76,
      orderCount: 31,
    }),
    makeProduct({
      id: 'prod-10',
      styleCode: 'DAR-1010',
      name: 'Lustre Peak Kada',
      category: 'Bangles',
      subCategory: 'Kadas',
      collection: 'Lustre Peak',
      metal: '18K Yellow Gold',
      diamondWeight: 0.58,
      goldWeight: 18.8,
      diamondQuality: 'VS-GH',
      settingType: 'Flush',
      occasion: 'Festive',
      stockType: 'Ready Stock',
      isNewArrival: false,
      isBestSeller: false,
      views: 94,
      cartAdds: 19,
      orderCount: 10,
    }),
  ],
  users: [
    {
      id: 'user-admin',
      name: 'Aarav Shah',
      email: 'admin@dearte.com',
      mobile: '9999999999',
      address: 'BKC, Mumbai',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      pinCode: '400051',
      companyName: 'DeArte Jewellery',
      gstNumber: '27ABCDE1234F1Z5',
      passwordHash: bcrypt.hashSync('Admin@123', 10),
      role: 'admin',
      status: 'Active',
      registeredAt: '2026-04-02T08:15:00.000Z',
      kycDocuments: ['GST Certificate', 'Trade License'],
    },
    {
      id: 'user-buyer-1',
      name: 'Samaira Kapoor',
      email: 'buyer@lumina.com',
      mobile: '9876501234',
      address: 'Zaveri Bazaar',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      pinCode: '400002',
      companyName: 'Lumina Jewels',
      gstNumber: '27AAACL1234F1ZB',
      passwordHash: bcrypt.hashSync('Buyer@123', 10),
      role: 'buyer',
      status: 'Active',
      registeredAt: '2026-04-10T11:45:00.000Z',
      kycDocuments: ['GST Certificate'],
    },
    {
      id: 'user-buyer-2',
      name: 'Dev Khanna',
      email: 'pending@heritagegold.com',
      mobile: '9876509999',
      address: 'C G Road',
      city: 'Ahmedabad',
      state: 'Gujarat',
      country: 'India',
      pinCode: '380009',
      companyName: 'Heritage Gold',
      gstNumber: '24AAACH1234H1ZP',
      passwordHash: bcrypt.hashSync('Buyer@123', 10),
      role: 'buyer',
      status: 'Inactive',
      registeredAt: '2026-04-12T09:10:00.000Z',
      kycDocuments: ['GST Certificate', 'Import Export Code'],
    },
  ],
  carts: [
    {
      userId: 'user-buyer-1',
      items: [
        {
          id: 'cart-1',
          productId: 'prod-1',
          quantity: 3,
          customization: {
            goldColor: 'Yellow Gold',
            goldCarat: '18K',
            diamondQuality: 'VS-GH',
          },
        },
        {
          id: 'cart-2',
          productId: 'prod-9',
          quantity: 1,
          customization: {
            goldColor: 'Rose Gold',
            goldCarat: '18K',
            diamondQuality: 'VVS-EF',
          },
        },
      ],
      specialInstructions: 'Need dispatch planning for wedding season buy.',
    },
  ],
  wishlists: [
    {
      userId: 'user-buyer-1',
      collections: [
        { id: 'wish-col-1', name: 'Wedding Season' },
        { id: 'wish-col-2', name: 'Export Order' },
      ],
      items: [
        { id: 'wish-1', productId: 'prod-3', collectionId: 'wish-col-1' },
        { id: 'wish-2', productId: 'prod-5', collectionId: 'wish-col-2' },
      ],
    },
  ],
  orders: [
    {
      id: 'order-1001',
      orderId: 'DAR-ORD-1001',
      userId: 'user-buyer-1',
      date: '2026-04-11T13:20:00.000Z',
      status: 'Reviewed',
      paymentMethod: 'Offline Payment',
      orderTypeSplit: ['Ready Stock', 'Make to Order'],
      shippingAddress: 'Zaveri Bazaar, Mumbai',
      notes: 'Pack catalogue references along with confirmation.',
      items: [
        {
          productId: 'prod-4',
          quantity: 2,
          customization: {
            goldColor: 'Yellow Gold',
            goldCarat: '18K',
            diamondQuality: 'VS-GH',
          },
        },
      ],
    },
  ],
  catalogues: [
    {
      id: 'cat-1',
      name: 'Bridal Icons',
      description: 'A curated bridal edit for high-intent retail appointments.',
      createdAt: '2026-04-08T10:00:00.000Z',
      productIds: ['prod-1', 'prod-3', 'prod-9'],
      assignedUserIds: ['user-buyer-1'],
    },
    {
      id: 'cat-2',
      name: 'Ready Stock Fast Movers',
      description: 'Quick-order pieces for rapid showroom replenishment.',
      createdAt: '2026-04-09T09:20:00.000Z',
      productIds: ['prod-4', 'prod-6', 'prod-8', 'prod-10'],
      assignedUserIds: ['user-buyer-1'],
    },
  ],
  promotions: {
    bannersOrder: ['banner-1', 'banner-2', 'banner-3'],
    popupAds: [
      {
        id: 'popup-1',
        image:
          'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80',
        frequency: 'once_per_session',
        startDate: '2026-04-12',
        endDate: '2026-05-12',
        active: true,
      },
    ],
  },
  inventoryMovements: [],

  syncLogs: [
    {
      id: 'sync-1',
      time: '2026-04-12T07:00:00.000Z',
      recordsSynced: 10,
      errors: 0,
      status: 'Success',
      nextRun: '2026-04-12T10:00:00.000Z',
    },
  ],
  reports: {
    productWise: [],
    categoryWise: [],
    loginLog: [
      { id: 'log-1', email: 'buyer@lumina.com', timestamp: '2026-04-12T08:30:00.000Z', ip: '103.91.22.1', device: 'Chrome on macOS' },
      { id: 'log-2', email: 'admin@dearte.com', timestamp: '2026-04-12T08:45:00.000Z', ip: '103.91.22.2', device: 'Safari on macOS' },
    ],
  },
};
