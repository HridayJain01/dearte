import bcrypt from 'bcryptjs';

/**
 * Taxonomy imagery, keyed by name. The product master (see data/taxonomy.js)
 * ships names only — artwork is uploaded per category/sub-category/collection
 * from the admin Configuration screen, so these maps start empty and the
 * backfill pass in bootstrap/seedDatabase.js becomes a no-op. Add an entry here
 * only for imagery that should exist on a brand new database.
 */
export const categoryImages = {};

export const subCategoryImages = {};

export const collectionImages = {};

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
  trustedBrands: [
    {
      id: 'brand-1',
      name: 'Maison Aurum',
      sector: 'Bridal retail',
      websiteUrl: '',
      logo: 'https://ui-avatars.com/api/?name=Maison+Aurum&background=F5E6E0&color=6B0F2E&bold=true',
      sortOrder: 1,
    },
    {
      id: 'brand-2',
      name: 'Noir Atelier',
      sector: 'Luxury ateliers',
      websiteUrl: '',
      logo: 'https://ui-avatars.com/api/?name=Noir+Atelier&background=EEE4DA&color=6B0F2E&bold=true',
      sortOrder: 2,
    },
    {
      id: 'brand-3',
      name: 'Velvet Gold',
      sector: 'Export trading',
      websiteUrl: '',
      logo: 'https://ui-avatars.com/api/?name=Velvet+Gold&background=F7EFE8&color=6B0F2E&bold=true',
      sortOrder: 3,
    },
    {
      id: 'brand-4',
      name: 'Sora Bridal',
      sector: 'Retail showrooms',
      websiteUrl: '',
      logo: 'https://ui-avatars.com/api/?name=Sora+Bridal&background=F0E6DE&color=6B0F2E&bold=true',
      sortOrder: 4,
    },
    {
      id: 'brand-5',
      name: 'The Gold Room',
      sector: 'Boutique chains',
      websiteUrl: '',
      logo: 'https://ui-avatars.com/api/?name=The+Gold+Room&background=EEE7DD&color=6B0F2E&bold=true',
      sortOrder: 5,
    },
    {
      id: 'brand-6',
      name: 'Aster & Co.',
      sector: 'Private label',
      websiteUrl: '',
      logo: 'https://ui-avatars.com/api/?name=Aster+and+Co&background=F5EBDD&color=6B0F2E&bold=true',
      sortOrder: 6,
    },
  ],
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
        'Private showroom event for bridal retailers with first access to the Celestial Dreams collection.',
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
          bullets: ['9K is available for select designs with a higher gold ratio.', '14K offers durability for daily wear.', '18K balances richness and resilience.'],
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
  // No demo products ship any more: the catalogue is populated from the product
  // master via the admin Excel importer, so a fresh database starts empty rather
  // than with stock-photo placeholder styles.
  products: [],
  users: [
    {
      id: 'user-admin',
      name: 'Dearte Admin',
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
  // Carts, wishlists, orders and catalogues all referenced the demo products that
  // no longer ship. They start empty; the seeded buyer still gets a default
  // "My Wishlist" collection from bootstrap/seedDatabase.js.
  carts: [],
  wishlists: [],
  orders: [],
  catalogues: [],
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
