import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  Award,
  Users,
  Clock,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  CheckCircle2,
  Lock,
  Sparkles,
  Flame,
  Calendar,
  ExternalLink,
  Navigation,
  ChevronRight,
  TrendingUp,
  Star,
  Dumbbell,
  Receipt,
  Upload,
  Check,
  X,
  Instagram,
  Facebook,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Logo } from './Logo';
import { submitMemberBill, fetchPublicTrainers, fetchPublicSettings } from '../api/client';
import { Trainer } from '../types';
import gymBg from '../../assets/gym-bg.jpeg';

// ── Plan type (matches plansJson stored in settings) ─────────────────────────
export interface PlanItem {
  name:        string;
  price:       string;
  period:      string;
  badge:       string;
  badgeColor:  string;
  description: string;
  features:    string[];
  popular:     boolean;
}

// Default plans shown when admin has not yet saved custom plans
const DEFAULT_PLANS: PlanItem[] = [
  {
    name: 'Monthly',       price: 'Rs. 2,500',  period: '/ month',
    badge: 'FLEXIBLE',     badgeColor: 'bg-white/10 text-white border-white/20',
    description: 'Perfect for beginners & short-term members.',
    features: ['Full Gym & Cardio Access', 'Locker Room', 'Standard Workout Chart', 'QR Digital Pass'],
    popular: false,
  },
  {
    name: 'Quarterly',     price: 'Rs. 6,000',  period: '/ 3 months',
    badge: 'MOST POPULAR', badgeColor: 'bg-[#E51924] text-white border-red-500/50 shadow-lg shadow-red-500/20',
    description: 'Save 20% — ideal 90-day transformation plan.',
    features: ['Everything in Monthly', '1-on-1 Trainer Assessment', 'Body Composition Check', 'Custom Nutrition Outline'],
    popular: true,
  },
  {
    name: 'Half-Yearly',   price: 'Rs. 10,000', period: '/ 6 months',
    badge: 'SAVE 35%',     badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    description: 'Serious results for dedicated fitness enthusiasts.',
    features: ['Everything in Quarterly', 'Personalised Macro Diet', 'Customised Strength Programme', '2x Guest Passes / Month'],
    popular: false,
  },
  {
    name: 'Yearly',        price: 'Rs. 18,000', period: '/ year',
    badge: 'BEST VALUE',   badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    description: 'Ultimate savings & year-round unlimited access.',
    features: ['Unlimited VIP Access', '4x Trainer Sessions', 'Free Gym Merchandise', 'Priority Locker'],
    popular: false,
  },
];

interface PortfolioProps {
  onGoToAdmin: () => void;
}

export const Portfolio: React.FC<PortfolioProps> = ({ onGoToAdmin }) => {
  const [trialName, setTrialName] = useState('');
  const [trialPhone, setTrialPhone] = useState('');
  const [trialSlot, setTrialSlot] = useState('Morning (7 AM - 10 AM)');
  const [trialGoal, setTrialGoal] = useState('Weight Loss & Fat Shred');
  const [activeTransformationTab, setActiveTransformationTab] = useState<'all' | 'fatloss' | 'muscle'>('all');
  const [activeTrainerModal, setActiveTrainerModal] = useState<any | null>(null);
  const [liveTrainers, setLiveTrainers] = useState<Trainer[]>([]);

  // ── Dynamic site settings fetched from the admin portal ──────────────────
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({
    gymName:            'Armstrong Gym & Fitness Club',
    gymPhone:           '{siteSettings.gymPhone}',
    gymAddress:         'Rimjhim Tower, Safoor, Gulzar-e-Hijri, Scheme 33, Karachi 75270',
    gymMapsUrl:         'https://maps.app.goo.gl/1gbbwvmXgQaLRVNM9',
    gymInstagramUrl:    'https://www.instagram.com/p/CWTOqdbIXqD/',
    gymFacebookUrl:     'https://www.facebook.com/p/ArmStrong-gym-100064082887275/',
    gymWhatsappBooking: '923322464479',
    gymTimingsWeekday:  'Mon – Sat: 6:00 AM – 11:00 PM',
    gymTimingsSunday:   'Sunday: 8:00 AM – 8:00 PM',
    statMembers:        '500+',
    statCoaches:        '10+',
    statFloorSize:      '5,000',
    statSuccessRate:    '98%',
    heroTagline:        "Karachi's hardcore fitness sanctuary built for heavy lifters, fat loss seekers, and athletic transformations.",
    plansJson:          '[]',
  });

  const [plans, setPlans] = useState<PlanItem[]>(DEFAULT_PLANS);

  useEffect(() => {
    fetchPublicSettings()
      .then((data: Record<string, string>) => {
        setSiteSettings(prev => ({ ...prev, ...data }));
        try {
          const parsed: PlanItem[] = JSON.parse(data.plansJson || '[]');
          if (Array.isArray(parsed) && parsed.length > 0) setPlans(parsed);
        } catch { /* keep defaults */ }
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  // ── Structured data (JSON-LD) for local SEO ──────────────────────────────
  useEffect(() => {
    const schemas = [
      // 1. LocalBusiness + GymOrSportsActivityLocation
      {
        '@context': 'https://schema.org',
        '@type': ['LocalBusiness', 'GymOrSportsActivityLocation'],
        '@id': 'https://armstrong-gym.vercel.app/#gym',
        name: 'Armstrong Gym & Fitness Club',
        description:
          'Premium strength training facility in Gulzar-e-Hijri, Karachi. Heavy lifting equipment, certified coaches, QR attendance, and personalised nutrition plans.',
        url: 'https://armstrong-gym.vercel.app/',
        telephone: '+923322464479',
        email: 'info@armstronggym.pk',
        image: 'https://armstrong-gym.vercel.app/og-image.jpg',
        logo: 'https://armstrong-gym.vercel.app/logo.jpg',
        priceRange: '₨₨',
        currenciesAccepted: 'PKR',
        paymentAccepted: 'Cash, JazzCash, EasyPaisa, Bank Transfer',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Rimjhim Tower, Safoor, near KESC Society, Gulzar-e-Hijri, Scheme 33',
          addressLocality: 'Karachi',
          addressRegion: 'Sindh',
          postalCode: '75270',
          addressCountry: 'PK',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 24.9508,
          longitude: 67.1147,
        },
        hasMap: 'https://maps.app.goo.gl/1gbbwvmXgQaLRVNM9',
        openingHoursSpecification: [
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            opens: '05:00',
            closes: '23:00',
          },
          {
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: 'Sunday',
            opens: '06:00',
            closes: '20:00',
          },
        ],
        amenityFeature: [
          { '@type': 'LocationFeatureSpecification', name: 'Olympic Barbells', value: true },
          { '@type': 'LocationFeatureSpecification', name: 'Power Cages',      value: true },
          { '@type': 'LocationFeatureSpecification', name: 'Steam Sauna',      value: true },
          { '@type': 'LocationFeatureSpecification', name: 'Locker Rooms',     value: true },
          { '@type': 'LocationFeatureSpecification', name: 'Free Wi-Fi',       value: true },
          { '@type': 'LocationFeatureSpecification', name: 'QR Code Attendance', value: true },
          { '@type': 'LocationFeatureSpecification', name: 'Personal Training', value: true },
        ],
        sameAs: [
          'https://maps.app.goo.gl/1gbbwvmXgQaLRVNM9',
          'https://www.instagram.com/p/CWTOqdbIXqD/',
          'https://www.facebook.com/p/ArmStrong-gym-100064082887275/',
        ],
      },
      // 2. FAQ — common membership questions for Google rich results
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What are the membership plans at Armstrong Gym?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Armstrong Gym offers Monthly (Rs. 2,500), Quarterly (Rs. 6,000), Half-Yearly (Rs. 10,000), Yearly (Rs. 18,000), Student Pass (Rs. 1,800/month) and VIP Personal Coaching (Rs. 12,000/month) plans. No admission or joining fees.',
            },
          },
          {
            '@type': 'Question',
            name: 'Where is Armstrong Gym located?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Armstrong Gym is located at {siteSettings.gymAddress}. Google Maps: https://maps.app.goo.gl/1gbbwvmXgQaLRVNM9',
            },
          },
          {
            '@type': 'Question',
            name: 'What are Armstrong Gym\'s opening hours?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Monday to Saturday: 5:00 AM – 11:00 PM. Sunday: 6:00 AM – 8:00 PM.',
            },
          },
          {
            '@type': 'Question',
            name: 'Does Armstrong Gym offer personal training?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. Armstrong Gym has certified master coaches specialising in powerlifting, bodybuilding, HIIT, fat loss, and sports nutrition. Book a 1-on-1 session via WhatsApp.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can I get a free trial at Armstrong Gym?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. Armstrong Gym offers a free 1-day VIP trial pass. Fill in the form on the website and receive your pass via WhatsApp.',
            },
          },
        ],
      },
    ];

    // Inject one <script type="application/ld+json"> per schema
    const scriptTags: HTMLScriptElement[] = schemas.map((schema, i) => {
      const el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id   = `ld-json-${i}`;
      el.text = JSON.stringify(schema);
      document.head.appendChild(el);
      return el;
    });

    // Clean up when Portfolio unmounts (e.g. user navigates to admin)
    return () => {
      scriptTags.forEach((el) => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
    };
  }, []);

  // Fetch live trainers from the backend on mount
  useEffect(() => {
    fetchPublicTrainers()
      .then((data) => setLiveTrainers(data))
      .catch(() => { /* silently fall back to static data */ });
  }, []);

  // Client Payment Bill Submission Modal state
  const [showBillModal, setShowBillModal] = useState(false);
  const [billMemberQuery, setBillMemberQuery] = useState('');
  const [billAmount, setBillAmount] = useState<number>(0);
  const [billMethod, setBillMethod] = useState('UPI');
  const [billTxnId, setBillTxnId] = useState('');
  const [billUrl, setBillUrl] = useState('');
  const [billNotes, setBillNotes] = useState('');
  const [isSubmittingBill, setIsSubmittingBill] = useState(false);

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, WEBP)');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Image size should be under 8MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setBillUrl(event.target.result as string);
        toast.success('Bill image attached successfully!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billMemberQuery) {
      toast.error('Please enter your Member Name or Phone Number');
      return;
    }
    if (!billAmount || billAmount <= 0) {
      toast.error('Please enter a valid paid amount');
      return;
    }

    setIsSubmittingBill(true);
    try {
      const res = await submitMemberBill({
        memberQuery: billMemberQuery,
        amount: Number(billAmount),
        paymentMethod: billMethod,
        transactionId: billTxnId,
        billUrl: billUrl,
        notes: billNotes,
      });

      toast.success('Transaction bill submitted successfully! Sent to Gym Admin for portal verification.');
      setShowBillModal(false);
      setBillMemberQuery('');
      setBillAmount(0);
      setBillTxnId('');
      setBillUrl('');
      setBillNotes('');
    } catch (err: any) {
      toast.error(err.message || 'Error submitting payment bill');
    } finally {
      setIsSubmittingBill(false);
    }
  };

  const handleTrialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trialName || !trialPhone) {
      toast.error('Please fill in your name and phone number');
      return;
    }
    const waNum = siteSettings.gymWhatsappBooking || '923322464479';
    const msg = encodeURIComponent(`Hi! Free trial request from ${trialName} (${trialPhone}). Slot: ${trialSlot}, Goal: ${trialGoal}`);
    window.open(`https://wa.me/${waNum}?text=${msg}`, '_blank');
    toast.success(`Free Trial Pass booked for ${trialName}! Details sent via WhatsApp.`);
    setTrialName('');
    setTrialPhone('');
  };

  const openWhatsAppCoach = (coachName: string) => {
    const num  = siteSettings.gymWhatsappBooking || '923322464479';
    const text = encodeURIComponent(`Hi! I want to book a 1-on-1 personal coaching session with ${coachName} at Armstrong Gym.`);
    window.open(`https://wa.me/${num}?text=${text}`, '_blank');
  };

  // Plans are loaded dynamically from admin settings (see siteSettings.plansJson)


  // Trainers are loaded live from the DB — admin manages them in the Trainers module.
  // The Trainer DB table has role, experience, clientsCount, shiftTiming, bio, photoUrl
  // columns that display directly here with no static fallback needed.
  const trainers = liveTrainers
    .filter((t) => t.status === 'Active')
    .map((t) => ({
      id:   t.id,
      name: t.name,
      role: t.role || t.specialty || 'Fitness Coach',
      specialty:           t.specialty || '',
      experience:          t.experience || '',
      shift:               t.shiftTiming || (t.shift ? `${t.shift} Shift` : ''),
      transformationsCount: t.clientsCount || '',
      image: t.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=1a1a1a&color=E51924&size=300`,
      bio:   t.bio || t.specialty || '',
    }));

  // Transformations shown here come from real client data.
  // Add entries via the admin portal (Trainers → client results).
  const transformations: Array<{
    id: number; clientName: string; age: number;
    category: 'fatloss' | 'muscle'; duration: string;
    statPrimary: string; statSecondary: string;
    beforeImg: string; afterImg: string;
    trainer: string; quote: string;
  }> = [];

  const filteredTransformations = transformations.filter(
    (t) => activeTransformationTab === 'all' || t.category === activeTransformationTab
  );

  return (
    <div className="min-h-screen bg-transparent text-white font-sans selection:bg-[#E51924] selection:text-white relative overflow-x-hidden">
      {/* Landing page background image */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-85 filter contrast-110 saturate-110 pointer-events-none -z-20"
        style={{
          backgroundImage: `url(${gymBg})`,
        }}
      />
      <div className="fixed inset-0 bg-black/70 pointer-events-none -z-10" />
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_18%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.05),transparent_15%),linear-gradient(180deg,rgba(10,10,10,0.2),rgba(10,10,10,0.8))] opacity-70" />
      </div>

      {/* Top Floating Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/10 px-3 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <a href="#" className="hover:opacity-90 transition-opacity">
            <Logo size="md" showText={true} />
          </a>

          <div className="hidden lg:flex items-center gap-8 text-xs font-extrabold uppercase tracking-widest text-white/70">
            <a href="#about" className="hover:text-[#E51924] transition-colors">
              About
            </a>
            <a href="#packages" className="hover:text-[#E51924] transition-colors">
              Packages
            </a>
            <a href="#trainers" className="hover:text-[#E51924] transition-colors">
              Trainers
            </a>
            <a href="#transformations" className="hover:text-[#E51924] transition-colors flex items-center gap-1">
              <span>Transformations</span>
              <span className="px-1.5 py-0.5 rounded-full bg-[#E51924] text-white text-[8px] font-black">NEW</span>
            </a>
            <a href="#location" className="hover:text-[#E51924] transition-colors">
              Location / Map
            </a>
            <a href="#trial" className="hover:text-[#E51924] transition-colors">
              Free Pass
            </a>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={siteSettings.gymInstagramUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Armstrong Gym Instagram"
              className="p-2 rounded-full glass-card hover:bg-white/10 border border-white/10 text-white/60 hover:text-[#E51924] transition-colors"
            >
              {/* Instagram icon */}
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a
              href={siteSettings.gymFacebookUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Armstrong Gym Facebook"
              className="p-2 rounded-full glass-card hover:bg-white/10 border border-white/10 text-white/60 hover:text-[#E51924] transition-colors"
            >
              {/* Facebook icon */}
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            <button
              onClick={() => setShowBillModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs font-black uppercase tracking-wider transition-all"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Submit Bill</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-36 pb-12 sm:pb-20 px-4 sm:px-6 overflow-hidden">
        {/* Subtle dark hero background picture overlay */}
        <div 
          className="absolute top-0 right-0 w-full lg:w-2/3 h-full bg-cover bg-center bg-no-repeat opacity-20 filter contrast-125 saturate-50 pointer-events-none -z-10 mix-blend-screen"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1600&q=80')`,
            maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
          }}
        />
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-white text-xs font-extrabold uppercase tracking-widest">
              <Flame className="w-4 h-4 text-[#E51924] animate-pulse" />
              <span>PREMIUM HEAVY LIFT FACILITY • KARACHI</span>
            </div>

            <h1 className="text-3xl xs:text-5xl sm:text-7xl font-black tracking-wide text-white leading-none uppercase">
              BUILD UNSTOPPABLE{' '}
              <span className="text-[#E51924]">
                STRENGTH.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-white/70 font-medium leading-relaxed max-w-xl">
              Welcome to Armstrong Gym & Fitness — Karachi’s hardcore fitness sanctuary built for heavy lifters, fat loss seekers, and athletic transformations. Equipped with heavy free weights, competition platforms, and certified master coaches.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="#trial"
                className="px-8 py-4 rounded-full bg-[#E51924] hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/30 hover:scale-102 transition-all flex items-center gap-2"
              >
                <span>Claim Free 1-Day Trial Pass</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </a>

              <a
                href={siteSettings.gymMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="px-8 py-4 rounded-full glass-card hover:bg-white/10 text-white border border-white/20 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2"
              >
                <MapPin className="w-4 h-4 text-[#E51924]" />
                <span>Navigate on Map</span>
              </a>
            </div>

            {/* Live Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/10">
              <div>
                <p className="stat-val text-2xl sm:text-4xl text-white">{siteSettings.statMembers}</p>
                <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-white/40">Active Members</p>
              </div>
              <div>
                <p className="stat-val text-2xl sm:text-4xl text-[#E51924]">{siteSettings.statCoaches}</p>
                <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-white/40">Coaches</p>
              </div>
              <div>
                <p className="stat-val text-2xl sm:text-4xl text-white">{siteSettings.statFloorSize}</p>
                <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-white/40">Sq Ft Space</p>
              </div>
              <div>
                <p className="stat-val text-2xl sm:text-4xl text-[#E51924]">{siteSettings.statSuccessRate}</p>
                <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-white/40">Success Rate</p>
              </div>
            </div>
          </div>

          {/* Hero Media Card */}
          <div className="relative">
            <div className="relative mx-auto rounded-3xl overflow-hidden glass-card p-2.5 border border-white/15 shadow-2xl group">
              <img
                src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80"
                alt="Armstrong Gym Facility Floor"
                className="w-full h-[460px] object-cover rounded-2xl group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-80" />
              
              <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl glass-card border border-white/15 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-wider text-white">Armstrong Gym & Fitness — Karachi</p>
                  <p className="text-xs text-white/60 flex items-center gap-1.5 mt-0.5 font-mono">
                    <MapPin className="w-3.5 h-3.5 text-[#E51924]" />
                    {siteSettings.gymAddress}
                  </p>
                </div>
                <a
                  href="https://maps.app.goo.gl/1gbbwvmXgQaLRVNM9"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 rounded-full bg-[#E51924] text-white text-[10px] font-extrabold uppercase tracking-widest border border-red-500/40 hover:bg-red-600 transition-colors flex items-center gap-1"
                >
                  <span>Open Map</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Facilities & Features */}
      <section id="about" className="py-12 sm:py-20 px-4 sm:px-6 border-y border-white/10 relative">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <p className="text-[10px] font-black text-[#E51924] uppercase tracking-[0.3em]">
              WORLD-CLASS AMENITIES
            </p>
            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-wide text-white">
              Built for Heavy Lifters & Goal Seekers
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-4 hover:border-white/20 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-[#E51924] flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <Dumbbell className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider text-white">Heavy Free Weights & Rogue Barbells</h3>
              <p className="text-xs text-white/60 leading-relaxed font-medium">
                Rogue Olympic barbells, bumper plates, power cages, dumbbells up to 60kg, and dedicated rubberized deadlift platforms.
              </p>
            </div>

            <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-4 hover:border-white/20 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider text-white">Smart QR Code Attendance</h3>
              <p className="text-xs text-white/60 leading-relaxed font-medium">
                Seamless digital pass entry. Instant QR check-in on arrival, workout tracking, and automated renewal reminders on WhatsApp.
              </p>
            </div>

            <div className="p-8 rounded-3xl glass-card border border-white/10 space-y-4 hover:border-white/20 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider text-white">Certified Master Coaches</h3>
              <p className="text-xs text-white/60 leading-relaxed font-medium">
                Customized workout splits, body fat analysis, clinical macro diet plans, and 1-on-1 personal coaching tailored to your body type.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Membership Packages Section */}
      <section id="packages" className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <p className="text-[10px] font-black text-[#E51924] uppercase tracking-[0.3em]">
              TRANSPARENT MEMBERSHIP PACKAGES
            </p>
            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-wide text-white">Choose Your Training Pass</h2>
            <p className="text-xs text-white/50 uppercase tracking-wider font-bold">
              No admission fees. Flexible monthly, quarterly, yearly & VIP coaching packages.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`rounded-3xl p-7 flex flex-col justify-between relative transition-all duration-300 ${
                  plan.popular
                    ? 'glass-card border-2 border-[#E51924] shadow-2xl shadow-red-500/10 scale-102'
                    : 'glass-card border border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${plan.badgeColor}`}>
                      {plan.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-black uppercase tracking-wider text-white">{plan.name}</h3>
                  <div className="flex items-baseline gap-1.5 my-3">
                    <span className="stat-val text-2xl sm:text-4xl text-[#E51924]">{plan.price}</span>
                    <span className="text-xs text-white/40 font-mono">{plan.period}</span>
                  </div>
                  <p className="text-xs text-white/60 font-medium leading-relaxed mb-6">{plan.description}</p>

                  <div className="pt-4 border-t border-white/10 space-y-3">
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-white/80 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-[#E51924] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8">
                  <a
                    href="#trial"
                    className={`w-full py-3.5 rounded-full font-black text-xs uppercase tracking-widest text-center block transition-all ${
                      plan.popular
                        ? 'bg-[#E51924] hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
                        : 'bg-white/5 hover:bg-white/10 text-white border border-white/20'
                    }`}
                  >
                    Select {plan.name}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trainers Showcase Section */}
      <section id="trainers" className="py-12 sm:py-20 px-4 sm:px-6 border-t border-white/10 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <p className="text-[10px] font-black text-[#E51924] uppercase tracking-[0.3em]">
              MEET THE CHAMPIONS
            </p>
            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-wide text-white">Elite Gym Trainers</h2>
            <p className="text-xs text-white/50 uppercase tracking-wider font-bold">
              Certified master coaches ready to transform your strength, physique, and athletic output.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {trainers.map((t) => (
              <div
                key={t.id}
                className="glass-card border border-white/10 rounded-3xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6 group hover:border-white/20 transition-all relative overflow-hidden"
              >
                <img
                  src={t.image}
                  alt={t.name}
                  className="w-36 h-44 rounded-2xl object-cover shrink-0 group-hover:scale-105 transition-transform shadow-xl"
                />

                <div className="space-y-3 text-center sm:text-left flex-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="text-[9px] font-black font-mono px-2.5 py-0.5 rounded-full bg-red-500/20 text-[#E51924] border border-red-500/30">
                      {t.experience}
                    </span>
                    <span className="text-[9px] font-black font-mono px-2.5 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/10">
                      {t.transformationsCount}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-black uppercase tracking-wider text-white">{t.name}</h3>
                    <p className="text-xs text-[#E51924] font-bold uppercase tracking-wider">{t.role}</p>
                  </div>

                  <p className="text-xs text-white/70 font-medium leading-relaxed">{t.specialty}</p>

                  <div className="pt-2 text-[11px] text-white/40 space-y-1 font-mono">
                    <p className="flex items-center gap-1.5 justify-center sm:justify-start">
                      <Clock className="w-3.5 h-3.5 text-[#E51924]" />
                      <span>{t.shift}</span>
                    </p>
                  </div>

                  <div className="pt-3 flex items-center gap-3 justify-center sm:justify-start">
                    <button
                      onClick={() => openWhatsAppCoach(t.name)}
                      className="px-5 py-2 rounded-full bg-[#E51924] hover:bg-red-600 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-red-500/20"
                    >
                      <span>Book PT with {t.name.split(' ')[0]}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Client Progress / Transformations (Before & After) Section */}
      <section id="transformations" className="py-12 sm:py-20 px-4 sm:px-6 border-t border-white/10 relative">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <p className="text-[10px] font-black text-[#E51924] uppercase tracking-[0.3em]">
              REAL RESULTS • NO EXCUSES
            </p>
            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-wide text-white">Client Transformations</h2>
            <p className="text-xs text-white/50 uppercase tracking-wider font-bold">
              Real Armstrong Gym members who crushed their weight loss & muscle gain goals.
            </p>

            {/* Filter Tabs */}
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setActiveTransformationTab('all')}
                className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                  activeTransformationTab === 'all'
                    ? 'bg-[#E51924] text-white shadow-lg shadow-red-500/20'
                    : 'glass-card text-white/60 hover:text-white'
                }`}
              >
                All Transformations
              </button>
              <button
                onClick={() => setActiveTransformationTab('fatloss')}
                className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                  activeTransformationTab === 'fatloss'
                    ? 'bg-[#E51924] text-white shadow-lg shadow-red-500/20'
                    : 'glass-card text-white/60 hover:text-white'
                }`}
              >
                Fat Loss
              </button>
              <button
                onClick={() => setActiveTransformationTab('muscle')}
                className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                  activeTransformationTab === 'muscle'
                    ? 'bg-[#E51924] text-white shadow-lg shadow-red-500/20'
                    : 'glass-card text-white/60 hover:text-white'
                }`}
              >
                Muscle Gain
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredTransformations.length === 0 && (
              <div className="col-span-full glass-card border border-white/10 rounded-3xl p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-[#E51924]/10 text-[#E51924] flex items-center justify-center mx-auto">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Transformations Coming Soon
                </h3>
                <p className="text-xs text-white/50 max-w-md mx-auto">
                  Real client before &amp; after results will be posted here by the gym admin. Check back soon!
                </p>
                <a href="#trial"
                  className="inline-block mt-2 px-6 py-2.5 rounded-full bg-[#E51924] hover:bg-red-600 text-white text-xs font-black uppercase tracking-widest transition-all">
                  Start Your Transformation
                </a>
              </div>
            )}
            {filteredTransformations.map((t) => (
              <div
                key={t.id}
                className="glass-card border border-white/15 rounded-3xl p-6 space-y-6 hover:border-white/25 transition-all shadow-xl"
              >
                {/* Client Header & Stats */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-wider text-white">
                      {t.clientName} <span className="text-xs text-white/40 font-normal">({t.age} yrs)</span>
                    </h3>
                    <p className="text-xs text-white/50 font-mono mt-0.5">
                      Coach: <strong className="text-white">{t.trainer}</strong>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black text-[#E51924] px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 uppercase tracking-widest block">
                      {t.statPrimary}
                    </span>
                    <span className="text-[10px] text-white/50 font-mono block mt-1">
                      Timeframe: {t.duration}
                    </span>
                  </div>
                </div>

                {/* Side by Side Transformation Photos */}
                <div className="grid grid-cols-2 gap-3 relative group">
                  <div className="relative rounded-2xl overflow-hidden border border-white/10">
                    <img
                      src={t.beforeImg}
                      alt={`${t.clientName} Before`}
                      className="w-full h-56 object-cover filter contrast-110 grayscale"
                    />
                    <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-white/80 font-black text-[9px] uppercase tracking-widest border border-white/20">
                      BEFORE
                    </div>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden border border-[#E51924]/40 shadow-lg shadow-red-500/10">
                    <img
                      src={t.afterImg}
                      alt={`${t.clientName} After`}
                      className="w-full h-56 object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-[#E51924] text-white font-black text-[9px] uppercase tracking-widest shadow-md">
                      AFTER
                    </div>
                  </div>
                </div>

                {/* Result Pill & Testimonial Quote */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-xl">
                    <span>Key Milestone: {t.statSecondary}</span>
                    <Sparkles className="w-4 h-4" />
                  </div>

                  <p className="text-xs text-white/70 italic leading-relaxed font-medium bg-white/5 p-3.5 rounded-2xl border border-white/10">
                    "{t.quote}"
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location / Google Maps Navigation Section */}
      <section id="location" className="py-12 sm:py-20 px-4 sm:px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <p className="text-[10px] font-black text-[#E51924] uppercase tracking-[0.3em]">
              FIND OUR GYM
            </p>
            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-wide text-white">Location & Map Navigation</h2>
            <p className="text-xs text-white/50 uppercase tracking-wider font-bold">
              Visit us at {siteSettings.gymAddress}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {/* Location Details Card */}
            <div className="glass-card border border-white/15 rounded-3xl p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#E51924] text-white flex items-center justify-center shadow-lg shadow-red-500/20">
                    <Navigation className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-wider text-white">Armstrong Gym HQ</h3>
                    <p className="text-xs text-white/50 font-mono">Gulzar-e-Hijri Branch</p>
                  </div>
                </div>

                <div className="space-y-4 text-xs font-medium text-white/80">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-[#E51924] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white uppercase">Address</p>
                      <p className="text-white/60 leading-relaxed mt-0.5">
                        Rimjhim Tower, Safoor, near KESC Society, Gulzar-e-Hijri, Scheme 33, Karachi 75270
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-[#E51924] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white uppercase">Front Desk Phone</p>
                      <p className="text-white/60 font-mono mt-0.5">{siteSettings.gymPhone}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-[#E51924] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white uppercase">Facility Timings</p>
                      <p className="text-white/60 font-mono mt-0.5">{siteSettings.gymTimingsWeekday}</p>
                      <p className="text-white/60 font-mono">{siteSettings.gymTimingsSunday}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 space-y-3">
                <a
                  href={siteSettings.gymMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-4 rounded-full bg-[#E51924] hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest text-center shadow-xl shadow-red-500/20 transition-all flex items-center justify-center gap-2 group"
                >
                  <MapPin className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Open Route in Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <p className="text-[10px] text-center text-white/40 font-mono">
                  Direct Link: {siteSettings.gymMapsUrl}
                </p>
              </div>
            </div>

            {/* Google Map Interactive Iframe Container */}
            <div className="lg:col-span-2 glass-card border border-white/15 rounded-3xl p-2.5 overflow-hidden min-h-[400px] flex flex-col relative group">
              <iframe
                title="Armstrong Gym Location Map"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3619.876!2d67.1147!3d24.9508!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sArmstrong%20Gym%20Karachi!5e0!3m2!1sen!2spk!4v1700000000000!5m2!1sen!2spk"
                className="w-full h-full min-h-[250px] sm:min-h-[380px] rounded-2xl border-0 filter contrast-125 brightness-90"
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />

              {/* Floating Overlay Badge */}
              <div className="absolute top-6 left-6 p-4 rounded-2xl glass-card border border-white/20 shadow-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#E51924] text-white flex items-center justify-center font-bold shadow-md">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-white">Armstrong Gym & Fitness</p>
                  <a
                    href={siteSettings.gymMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-[#E51924] font-bold hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <span>{siteSettings.gymMapsUrl.replace("https://","")}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Free Trial Form Section */}
      <section id="trial" className="py-12 sm:py-20 px-4 sm:px-6 relative">
        <div className="max-w-3xl mx-auto glass-card border border-white/20 rounded-3xl p-5 sm:p-12 shadow-2xl relative overflow-hidden">
          {/* Background image overlay inside card */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15 filter contrast-125 saturate-50 pointer-events-none -z-10"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=1200&q=80')`
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/80 via-[#0A0A0A]/90 to-[#0A0A0A] pointer-events-none -z-10" />

          <div className="text-center space-y-3 mb-8">
            <span className="text-[10px] font-black text-[#E51924] tracking-[0.3em] uppercase">
              1-DAY VIP ACCESS
            </span>
            <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-wide text-white">Book Your Free Pass</h2>
            <p className="text-xs text-white/50 uppercase tracking-wider font-bold">
              Test out the Rogue equipment, cardio floor & steam bath before committing.
            </p>
          </div>

          <form onSubmit={handleTrialSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-white/70 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="E.G. TARIQ MAHMOOD"
                  value={trialName}
                  onChange={(e) => setTrialName(e.target.value)}
                  className="w-full px-4 py-3.5 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924] uppercase font-bold tracking-wider"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-white/70 mb-1">
                  WhatsApp / Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="0332 2464479"
                  value={trialPhone}
                  onChange={(e) => setTrialPhone(e.target.value)}
                  className="w-full px-4 py-3.5 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924] uppercase font-bold tracking-wider"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-white/70 mb-1">
                  Primary Fitness Goal
                </label>
                <select
                  value={trialGoal}
                  onChange={(e) => setTrialGoal(e.target.value)}
                  className="w-full px-4 py-3.5 text-xs bg-[#0A0A0A] text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924] uppercase font-bold tracking-wider"
                >
                  <option value="Weight Loss & Fat Shred">Weight Loss & Fat Shred</option>
                  <option value="Muscle Gain & Bodybuilding">Muscle Gain & Bodybuilding</option>
                  <option value="Powerlifting & Strength">Powerlifting & Strength</option>
                  <option value="General Fitness & Stamina">General Fitness & Stamina</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-white/70 mb-1">
                  Preferred Time Slot
                </label>
                <select
                  value={trialSlot}
                  onChange={(e) => setTrialSlot(e.target.value)}
                  className="w-full px-4 py-3.5 text-xs bg-[#0A0A0A] text-white rounded-xl border border-white/10 focus:outline-none focus:border-[#E51924] uppercase font-bold tracking-wider"
                >
                  <option value="Morning (7 AM - 10 AM)">Morning (7 AM - 10 AM)</option>
                  <option value="Afternoon (12 PM - 4 PM)">Afternoon (12 PM - 4 PM)</option>
                  <option value="Evening (5 PM - 9 PM)">Evening (5 PM - 9 PM)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-full bg-[#E51924] hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20 hover:scale-101 transition-all"
            >
              Get Free Pass via WhatsApp
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 sm:py-12 px-4 sm:px-6 text-center text-xs text-white/40 space-y-6">
        <div className="flex justify-center items-center">
          <Logo size="md" showText={true} />
        </div>
        <p className="max-w-md mx-auto text-white/50 leading-relaxed font-medium">
          Armstrong Gym &amp; Fitness Club • {siteSettings.gymAddress}.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a href={`tel:${siteSettings.gymPhone}`} className="text-white/60 hover:text-[#E51924] transition-colors font-mono">
            {siteSettings.gymPhone}
          </a>
          <span className="text-white/20" aria-hidden="true">•</span>
          <a href="https://www.instagram.com/p/CWTOqdbIXqD/" target="_blank" rel="noreferrer"
            className="text-white/60 hover:text-[#E51924] transition-colors font-bold uppercase tracking-widest text-[10px]">
            Instagram
          </a>
          <span className="text-white/20" aria-hidden="true">•</span>
          <a href="https://www.facebook.com/p/ArmStrong-gym-100064082887275/" target="_blank" rel="noreferrer"
            className="text-white/60 hover:text-[#E51924] transition-colors font-bold uppercase tracking-widest text-[10px]">
            Facebook
          </a>
          <span className="text-white/20" aria-hidden="true">•</span>
          <a href="https://maps.app.goo.gl/1gbbwvmXgQaLRVNM9" target="_blank" rel="noreferrer"
            className="text-white/60 hover:text-[#E51924] transition-colors font-bold uppercase tracking-widest text-[10px]">
            Google Maps
          </a>
        </div>
        <p>© {new Date().getFullYear()} Armstrong Gym &amp; Fitness Club. All Rights Reserved.</p>
      </footer>

      {/* Client Submit Payment Bill Modal */}
      {showBillModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/15 rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setShowBillModal(false)}
              className="absolute top-5 right-5 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                <Receipt className="w-3 h-3" />
                <span>MEMBER PORTAL VERIFICATION</span>
              </span>
              <h2 className="text-xl font-black text-white uppercase tracking-wide">
                Submit Payment Bill & Receipt
              </h2>
              <p className="text-xs text-white/60">
                Paid your fee via GPay/UPI/Cash? Upload transaction details so gym admin can verify and update your portal balance.
              </p>
            </div>

            <form onSubmit={handleBillSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">
                  Your Full Name or Member Phone *
                </label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Tariq Mahmood or +92 300 1234567"
                  value={billMemberQuery}
                  onChange={(e) => setBillMemberQuery(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1">
                    Amount Paid (Rs.) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="E.g. 2500"
                    value={billAmount || ''}
                    onChange={(e) => setBillAmount(Number(e.target.value))}
                    className="w-full px-4 py-2.5 text-xs bg-white/5 text-emerald-400 font-mono font-bold rounded-xl border border-white/10 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={billMethod}
                    onChange={(e) => setBillMethod(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs bg-[#1A1A1A] text-white rounded-xl border border-white/10 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                    <option value="Cash">Cash at Counter</option>
                    <option value="Card">Debit / Credit Card</option>
                    <option value="Net Banking">Net Banking</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">
                  UPI UTR / Transaction Reference ID
                </label>
                <input
                  type="text"
                  placeholder="E.g. UTR-9821389012"
                  value={billTxnId}
                  onChange={(e) => setBillTxnId(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-white/5 text-cyan-400 font-mono rounded-xl border border-white/10 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 mb-1.5">
                  Attach Payment Receipt / Bill Image *
                </label>
                
                <input
                  type="file"
                  id="client-bill-file-upload"
                  accept="image/*"
                  onChange={handleImageFileUpload}
                  className="hidden"
                />

                {!billUrl ? (
                  <label
                    htmlFor="client-bill-file-upload"
                    className="flex flex-col items-center justify-center p-4 bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/20 hover:border-[#E51924] rounded-2xl cursor-pointer transition-all group text-center space-y-2"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#E51924]/20 text-[#E51924] flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-white group-hover:text-[#E51924] transition-colors">
                        Click to Upload Bill Image
                      </p>
                      <p className="text-[10px] text-white/50">
                        Supports PNG, JPG, JPEG, WEBP (Max 8MB)
                      </p>
                    </div>
                  </label>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 bg-black/80 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Image Attached Ready
                      </span>
                      <button
                        type="button"
                        onClick={() => setBillUrl('')}
                        className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-[10px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <X className="w-3 h-3" /> Remove Image
                      </button>
                    </div>
                    {billUrl.startsWith('data:image') || billUrl.startsWith('http') ? (
                      <div className="h-32 w-full rounded-xl overflow-hidden border border-white/10 bg-black flex items-center justify-center">
                        <img
                          src={billUrl}
                          alt="Uploaded Bill Receipt"
                          className="h-full w-full object-contain"
                        />
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Optional Image URL Fallback */}
                <div className="mt-2 text-right">
                  <details className="text-[10px] text-white/40 cursor-pointer">
                    <summary className="hover:text-white/70">Or paste image URL instead</summary>
                    <input
                      type="url"
                      placeholder="https://... image link"
                      value={billUrl.startsWith('data:') ? '' : billUrl}
                      onChange={(e) => setBillUrl(e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 text-xs bg-white/5 text-white font-mono rounded-lg border border-white/10 focus:outline-none focus:border-[#E51924]"
                    />
                  </details>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 mb-1">
                  Additional Notes
                </label>
                <input
                  type="text"
                  placeholder="E.g. Paid via PhonePe at 2 PM today"
                  value={billNotes}
                  onChange={(e) => setBillNotes(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-white/5 text-white rounded-xl border border-white/10 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowBillModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingBill}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20"
                >
                  {isSubmittingBill ? 'Submitting...' : 'Submit Receipt for Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
