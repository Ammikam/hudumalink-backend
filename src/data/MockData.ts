// Mock data for Hudumalink

export interface Designer {
  id: string;
  name: string;
  avatar: string;
  coverImage: string;
  location: string;
  verified: boolean;
  superVerified: boolean;
  rating: number;
  reviewCount: number;
  projectsCompleted: number;
  responseTime: string;
  startingPrice: number;
  styles: string[];
  about: string;
  calendlylink?: string;
  videoUrl?: string;
  portfolio: PortfolioProject[];
  reviews: Review[];
}

export interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  beforeImage: string;
  afterImage: string;
  budget: number;
  timeline: string;
  style: string;
  location: string;
}

export interface Review {
  id: string;
  clientName: string;
  clientAvatar: string;
  rating: number;
  comment: string;
  projectImage?: string;
  date: string;
}

export interface Inspiration {
  id: string;
  image: string;
  title: string;
  style: string;
  designerId: string;
  designerName: string;
  likes: number;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  budget: number;
  timeline: string;
  style: string[];
  location: string;
  status: 'open' | 'in_progress' | 'completed';
  photos: string[];
  clientName: string;
  proposals: Proposal[];
  milestones: Milestone[];
  createdAt: string;
}

export interface Proposal {
  id: string;
  designerId: string;
  designerName: string;
  designerAvatar: string;
  coverLetter: string;
  quote: number;
  timeline: string;
  moodBoard: string[];
  status: 'pending' | 'accepted' | 'rejected';
  submittedAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  amount: number;
  status: 'pending' | 'in_progress' | 'completed' | 'approved';
  dueDate: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
}

export interface ActivityFeed {
  id: string;
  type: 'project_posted' | 'designer_hired' | 'project_completed';
  clientName: string;
  location: string;
  amount: number;
  projectType: string;
  timestamp: string;
}

// Mock Designers
export const designers: Designer[] = [
  {
    id: '1',
    name: 'Wanjiku Muthoni',
    avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200',
    coverImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200',
    location: 'Nairobi, Westlands',
    calendlylink:'https://calendly.com/devammikam/30min',
    verified: true,
    superVerified: true,
    rating: 4.9,
    reviewCount: 127,
    projectsCompleted: 89,
    responseTime: '2 hours',
    startingPrice: 250000,
    styles: ['Modern', 'African Fusion', 'Minimalist'],
    about: 'Award-winning interior designer with 12 years of experience transforming Kenyan homes and commercial spaces. I specialize in blending contemporary design with authentic African aesthetics, creating spaces that tell stories while remaining functional and beautiful. Featured in Kenyan Homes Magazine and winner of the 2023 East African Design Excellence Award.',
    portfolio: [
      {
        id: 'p1',
        title: 'Kileleshwa Modern Villa',
        description: 'Complete transformation of a 4-bedroom villa with open-plan living and African art integration.',
        beforeImage: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
        afterImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800',
        budget: 2500000,
        timeline: '3 months',
        style: 'Modern African',
        location: 'Kileleshwa, Nairobi',
      },
      {
        id: 'p2',
        title: 'Karen Luxury Penthouse',
        description: 'Luxury penthouse redesign with panoramic views and custom furniture.',
        beforeImage: 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800',
        afterImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
        budget: 4500000,
        timeline: '4 months',
        style: 'Luxury',
        location: 'Karen, Nairobi',
      },
      {
        id: 'p3',
        title: 'Lavington Family Home',
        description: 'Warm, family-friendly design with child-safe features and playful elements.',
        beforeImage: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
        afterImage: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800',
        budget: 1800000,
        timeline: '2 months',
        style: 'Contemporary',
        location: 'Lavington, Nairobi',
      },
    ],
    reviews: [
      {
        id: 'r1',
        clientName: 'James Ochieng',
        clientAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
        rating: 5,
        comment: 'Wanjiku transformed our dated apartment into a stunning modern home. Her attention to detail and understanding of African aesthetics is unmatched. Highly recommend!',
        projectImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400',
        date: '2024-01-15',
      },
      {
        id: 'r2',
        clientName: 'Grace Kamau',
        clientAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
        rating: 5,
        comment: 'Working with Wanjiku was a dream. She understood our vision perfectly and delivered beyond expectations. Our friends can\'t stop complimenting our new living room!',
        date: '2024-01-08',
      },
    ],
  },
  {
    id: '2',
    name: 'David Kiprotich',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200',
    coverImage: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200',
    location: 'Nairobi, Kilimani',
    verified: true,
    superVerified: false,
    rating: 4.8,
    reviewCount: 94,
    projectsCompleted: 67,
    responseTime: '4 hours',
    startingPrice: 180000,
    styles: ['Minimalist', 'Scandinavian', 'Modern'],
    about: 'I believe in the power of minimalism – spaces that breathe, inspire calm, and promote productivity. With a background in architecture and 8 years in interior design, I create homes and offices that are both beautiful and highly functional.',
    portfolio: [
      {
        id: 'p4',
        title: 'Kilimani Apartment Makeover',
        description: 'Minimalist transformation of a 2-bedroom apartment with smart storage solutions.',
        beforeImage: 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800',
        afterImage: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
        budget: 850000,
        timeline: '6 weeks',
        style: 'Minimalist',
        location: 'Kilimani, Nairobi',
      },
    ],
    reviews: [
      {
        id: 'r3',
        clientName: 'Mary Wambui',
        clientAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
        rating: 5,
        comment: 'David has an incredible eye for clean, functional design. Our office transformation boosted team morale significantly!',
        date: '2024-01-20',
      },
    ],
  },
  {
    id: '3',
    name: 'Amina Hassan',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200',
    coverImage: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200',
    location: 'Mombasa, Nyali',
    verified: true,
    superVerified: true,
    rating: 4.9,
    reviewCount: 156,
    projectsCompleted: 112,
    responseTime: '1 hour',
    startingPrice: 200000,
    styles: ['Coastal', 'Bohemian', 'African Fusion'],
    about: 'Born and raised in Mombasa, I bring the warmth and vibrancy of coastal Kenya to every project. My designs celebrate color, texture, and the beauty of handcrafted elements. I work closely with local artisans to create one-of-a-kind spaces.',
    portfolio: [
      {
        id: 'p5',
        title: 'Nyali Beach Villa',
        description: 'Coastal-inspired villa with ocean views and artisan furniture.',
        beforeImage: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
        afterImage: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800',
        budget: 3200000,
        timeline: '4 months',
        style: 'Coastal',
        location: 'Nyali, Mombasa',
      },
    ],
    reviews: [
      {
        id: 'r4',
        clientName: 'Hassan Omar',
        clientAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
        rating: 5,
        comment: 'Amina captured the essence of coastal living perfectly. Our home feels like a resort!',
        date: '2024-02-01',
      },
    ],
  },
  {
    id: '4',
    name: 'Peter Njoroge',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
    coverImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200',
    location: 'Nairobi, Karen',
    verified: true,
    superVerified: false,
    rating: 4.7,
    reviewCount: 78,
    projectsCompleted: 54,
    responseTime: '3 hours',
    startingPrice: 350000,
    styles: ['Luxury', 'Classic', 'Contemporary'],
    about: 'Specializing in high-end residential and commercial projects. With experience working on some of Nairobi\'s most prestigious properties, I deliver luxury that stands the test of time.',
    portfolio: [],
    reviews: [],
  },
  {
    id: '5',
    name: 'Faith Akinyi',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    coverImage: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200',
    location: 'Kisumu, Milimani',
    verified: true,
    superVerified: false,
    rating: 4.8,
    reviewCount: 45,
    projectsCompleted: 32,
    responseTime: '2 hours',
    startingPrice: 120000,
    styles: ['Budget-Friendly', 'Modern', 'Airbnb'],
    about: 'Making beautiful design accessible to everyone. I specialize in budget-friendly transformations that don\'t compromise on style. Perfect for first-time homeowners and Airbnb hosts.',
    portfolio: [],
    reviews: [],
  },
  {
    id: '6',
    name: 'Samuel Mutua',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200',
    coverImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200',
    location: 'Nairobi, Runda',
    verified: true,
    superVerified: true,
    rating: 4.9,
    reviewCount: 203,
    projectsCompleted: 145,
    responseTime: '30 minutes',
    startingPrice: 500000,
    styles: ['Luxury', 'Modern', 'Smart Home'],
    about: 'Creating intelligent luxury spaces with integrated smart home technology. My designs combine aesthetic excellence with cutting-edge automation for the ultimate living experience.',
    portfolio: [],
    reviews: [],
  },
];

// Mock Inspiration Images
export const inspirations: Inspiration[] = [
  { id: 'i1', image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600', title: 'Modern Living Room', style: 'Modern', designerId: '1', designerName: 'Wanjiku Muthoni', likes: 342 },
  { id: 'i2', image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600', title: 'Minimalist Bedroom', style: 'Minimalist', designerId: '2', designerName: 'David Kiprotich', likes: 289 },
  { id: 'i3', image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600', title: 'Bohemian Kitchen', style: 'Bohemian', designerId: '3', designerName: 'Amina Hassan', likes: 456 },
  { id: 'i4', image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600', title: 'Luxury Dining', style: 'Luxury', designerId: '4', designerName: 'Peter Njoroge', likes: 521 },
  { id: 'i5', image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600', title: 'Cozy Studio', style: 'Budget-Friendly', designerId: '5', designerName: 'Faith Akinyi', likes: 178 },
  { id: 'i6', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600', title: 'Smart Home Office', style: 'Modern', designerId: '6', designerName: 'Samuel Mutua', likes: 634 },
  { id: 'i7', image: 'https://images.unsplash.com/photo-1616137466211-f939a420be84?w=600', title: 'African Fusion Living', style: 'African Fusion', designerId: '1', designerName: 'Wanjiku Muthoni', likes: 412 },
  { id: 'i8', image: 'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=600', title: 'Coastal Retreat', style: 'Coastal', designerId: '3', designerName: 'Amina Hassan', likes: 389 },
  { id: 'i9', image: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=600', title: 'Contemporary Bathroom', style: 'Modern', designerId: '2', designerName: 'David Kiprotich', likes: 267 },
  { id: 'i10', image: 'https://images.unsplash.com/photo-1615529328331-f8917597711f?w=600', title: 'Airbnb Ready Space', style: 'Airbnb', designerId: '5', designerName: 'Faith Akinyi', likes: 198 },
  { id: 'i11', image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600', title: 'Executive Office', style: 'Luxury', designerId: '6', designerName: 'Samuel Mutua', likes: 445 },
  { id: 'i12', image: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=600', title: 'Warm Kitchen', style: 'African Fusion', designerId: '1', designerName: 'Wanjiku Muthoni', likes: 378 },
  { id: 'i13', image: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600', title: 'Garden Villa', style: 'Luxury', designerId: '4', designerName: 'Peter Njoroge', likes: 567 },
  { id: 'i14', image: 'https://images.unsplash.com/photo-1615873968403-89e068629265?w=600', title: 'Kids Room', style: 'Budget-Friendly', designerId: '5', designerName: 'Faith Akinyi', likes: 234 },
  { id: 'i15', image: 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=600', title: 'Master Suite', style: 'Luxury', designerId: '6', designerName: 'Samuel Mutua', likes: 489 },
  { id: 'i16', image: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600', title: 'Zen Bathroom', style: 'Minimalist', designerId: '2', designerName: 'David Kiprotich', likes: 312 },
  { id: 'i17', image: 'https://images.unsplash.com/photo-1600489000022-c2086d79f9d4?w=600', title: 'Rooftop Lounge', style: 'Modern', designerId: '1', designerName: 'Wanjiku Muthoni', likes: 398 },
  { id: 'i18', image: 'https://images.unsplash.com/photo-1616047006789-b7af5afb8c20?w=600', title: 'Coastal Bedroom', style: 'Coastal', designerId: '3', designerName: 'Amina Hassan', likes: 356 },
];

// Activity Feed
export const activityFeed: ActivityFeed[] = [
  { id: 'a1', type: 'project_posted', clientName: 'Faith', location: 'Westlands', amount: 1200000, projectType: 'living room', timestamp: '2 min ago' },
  { id: 'a2', type: 'designer_hired', clientName: 'John', location: 'Karen', amount: 3500000, projectType: 'full house', timestamp: '5 min ago' },
  { id: 'a3', type: 'project_completed', clientName: 'Grace', location: 'Kilimani', amount: 890000, projectType: 'bedroom', timestamp: '12 min ago' },
  { id: 'a4', type: 'project_posted', clientName: 'Peter', location: 'Lavington', amount: 2100000, projectType: 'kitchen', timestamp: '18 min ago' },
  { id: 'a5', type: 'designer_hired', clientName: 'Amina', location: 'Nyali', amount: 1800000, projectType: 'apartment', timestamp: '25 min ago' },
];

// Mock Projects
export const projects: Project[] = [
  {
    id: 'proj1',
    title: 'Modern Living Room Transformation',
    description: 'Looking to transform my dated living room into a modern, comfortable space. Open to African fusion elements. Budget flexible for the right designer.',
    budget: 1500000,
    timeline: '2-3 months',
    style: ['Modern', 'African Fusion'],
    location: 'Westlands, Nairobi',
    status: 'in_progress',
    photos: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600',
      'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=600',
    ],
    clientName: 'John Kamau',
    proposals: [
      {
        id: 'prop1',
        designerId: '1',
        designerName: 'Wanjiku Muthoni',
        designerAvatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200',
        coverLetter: 'I would love to bring my signature African Fusion style to your living room. With over 89 completed projects, I understand how to balance modern aesthetics with cultural warmth. I propose using locally sourced materials and partnering with Kenyan artisans for custom pieces.',
        quote: 1350000,
        timeline: '10 weeks',
        moodBoard: [
          'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400',
          'https://images.unsplash.com/photo-1616137466211-f939a420be84?w=400',
          'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=400',
        ],
        status: 'pending',
        submittedAt: '2024-02-10',
      },
      {
        id: 'prop2',
        designerId: '2',
        designerName: 'David Kiprotich',
        designerAvatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200',
        coverLetter: 'A minimalist approach could work beautifully for your space. Clean lines, neutral tones, and strategic lighting can make your living room feel twice as large while maintaining warmth and functionality.',
        quote: 1200000,
        timeline: '8 weeks',
        moodBoard: [
          'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400',
          'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=400',
        ],
        status: 'pending',
        submittedAt: '2024-02-11',
      },
      {
        id: 'prop3',
        designerId: '6',
        designerName: 'Samuel Mutua',
        designerAvatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200',
        coverLetter: 'Let me bring smart home integration to your living room. Imagine controlling lighting, entertainment, and climate with voice commands or your phone. Modern living deserves modern technology.',
        quote: 1650000,
        timeline: '12 weeks',
        moodBoard: [
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
          'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=400',
        ],
        status: 'pending',
        submittedAt: '2024-02-12',
      },
      {
        id: 'prop4',
        designerId: '4',
        designerName: 'Peter Njoroge',
        designerAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
        coverLetter: 'Your living room has excellent potential for a luxury transformation. I specialize in creating timeless, sophisticated spaces that impress guests while remaining comfortable for daily living.',
        quote: 1800000,
        timeline: '14 weeks',
        moodBoard: [
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400',
          'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=400',
        ],
        status: 'pending',
        submittedAt: '2024-02-13',
      },
    ],
    milestones: [
      { id: 'm1', title: 'Design Concept Approval', description: 'Review and approve final design concepts and mood boards', amount: 200000, status: 'completed', dueDate: '2024-02-20' },
      { id: 'm2', title: 'Material Selection', description: 'Select all materials, fabrics, and finishes', amount: 150000, status: 'in_progress', dueDate: '2024-03-01' },
      { id: 'm3', title: 'Furniture Procurement', description: 'Order and receive all furniture pieces', amount: 600000, status: 'pending', dueDate: '2024-03-15' },
      { id: 'm4', title: 'Installation & Styling', description: 'Final installation and styling of the space', amount: 400000, status: 'pending', dueDate: '2024-04-01' },
    ],
    createdAt: '2024-02-08',
  },
];

// Mock Messages
export const messages: Message[] = [
  { id: 'msg1', senderId: '1', senderName: 'Wanjiku Muthoni', senderAvatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200', content: 'Hi John! Thank you for considering my proposal. I\'m excited about the potential of your living room space.', timestamp: '10:30 AM', isOwn: false },
  { id: 'msg2', senderId: 'client', senderName: 'You', senderAvatar: '', content: 'Hi Wanjiku! I loved your portfolio, especially the Kileleshwa project. Can you tell me more about the African fusion elements you\'d incorporate?', timestamp: '10:32 AM', isOwn: true },
  { id: 'msg3', senderId: '1', senderName: 'Wanjiku Muthoni', senderAvatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200', content: 'Absolutely! I work with local artisans in Nairobi to create custom pieces - think hand-carved wooden accents, woven textiles from Western Kenya, and contemporary art from Kenyan artists.', timestamp: '10:35 AM', isOwn: false },
  { id: 'msg4', senderId: '1', senderName: 'Wanjiku Muthoni', senderAvatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200', content: 'Would you like me to share some examples of pieces we could incorporate? I have connections with amazing craftspeople in Lamu and Kisumu as well.', timestamp: '10:36 AM', isOwn: false },
  { id: 'msg5', senderId: 'client', senderName: 'You', senderAvatar: '', content: 'That sounds amazing! Yes please, I\'d love to see examples. Also, what\'s your availability like for a site visit?', timestamp: '10:40 AM', isOwn: true },
];

// Quote Calculator Data
export const roomTypes = [
  { value: 'living', label: 'Living Room', basePrice: 250000 },
  { value: 'bedroom', label: 'Bedroom', basePrice: 180000 },
  { value: 'kitchen', label: 'Kitchen', basePrice: 350000 },
  { value: 'bathroom', label: 'Bathroom', basePrice: 200000 },
  { value: 'office', label: 'Home Office', basePrice: 150000 },
  { value: 'full', label: 'Full House', basePrice: 1200000 },
];

export const roomSizes = [
  { value: 'small', label: 'Small (< 15 sqm)', multiplier: 0.8 },
  { value: 'medium', label: 'Medium (15-30 sqm)', multiplier: 1 },
  { value: 'large', label: 'Large (30-50 sqm)', multiplier: 1.4 },
  { value: 'xlarge', label: 'Extra Large (> 50 sqm)', multiplier: 1.8 },
];

export const designStyles = [
  { value: 'modern', label: 'Modern', multiplier: 1 },
  { value: 'african', label: 'African Fusion', multiplier: 1.15 },
  { value: 'luxury', label: 'Luxury', multiplier: 1.5 },
  { value: 'minimalist', label: 'Minimalist', multiplier: 0.9 },
  { value: 'bohemian', label: 'Bohemian', multiplier: 1.1 },
  { value: 'budget', label: 'Budget-Friendly', multiplier: 0.7 },
];

// Helper function to format currency
export const formatCurrency = (amount: number): string => {
  return `KSh ${amount.toLocaleString('en-KE')}`;
};

// Helper function to format phone number
export const formatPhone = (phone: string): string => {
  if (phone.startsWith('0')) {
    return `+254 ${phone.slice(1)}`;
  }
  return phone;
};
