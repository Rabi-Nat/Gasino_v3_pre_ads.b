import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Wind, 
  Gauge, 
  ShieldCheck, 
  MessageSquare,
  ChevronLeft,
  Store as StoreIcon,
  FlaskConical,
  Activity,
  ArrowLeftRight,
  FireExtinguisher,
  Cylinder,
  ArrowUpToLine,
  Wrench,
  Scaling,
  Ruler,
  Home,
  Sliders,
  CloudRain,
  ClipboardCheck,
  BookOpen,
  Settings,
  Share2,
  Star,
  Sun,
  Moon,
  Banknote,
  Lock,
  Unlock,
  Sparkles,
  Shield,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Calendar,
  KeyRound,
  User,
  Crown
} from 'lucide-react';
import { PipeCalculator } from './components/PipeCalculator';
import { Ventilation } from './components/Ventilation';
import { MeterSpecs } from './components/MeterSpecs';
import { ValveInstallation } from './components/ValveInstallation';
import { ApplianceDistance } from './components/ApplianceDistance';
import { PriceList } from './components/PriceList';
import { ContactUs } from './components/ContactUs';
import { Store } from './components/Store';
import { GasTest } from './components/GasTest';

// Firefighting Components
import { WaterSystem } from './components/WaterSystem';
import { FirePipeSizer } from './components/FirePipeSizer';
import { ExtinguisherCalc } from './components/ExtinguisherCalc';
import { FirePumpHead } from './components/FirePumpHead';
import { PlumbingSystem } from './components/PlumbingSystem';
import { MechanicalHvac } from './components/MechanicalHvac';
import { UserGuide } from './components/UserGuide';
import ClassicLanding from './components/ClassicLanding';
import { AdBanner } from './components/AdBanner';

// Cloud Authentication Integration
import { onAuthStateChanged } from 'firebase/auth';
import { auth, getUserProfile, syncUserProfile } from './firebase';
import { AuthModal } from './components/AuthModal';

type SectionId = 'gas' | 'fire' | 'plumbing' | 'hvac';
type TabId = 'pipe' | 'ventilation' | 'meter' | 'valve' | 'safety' | 'price' | 'contact' | 'store' | 'test' | 'water' | 'firepipe' | 'extinguisher' | 'pump' | 'plumbing' | 'plumbing_reservoir' | 'plumbing_rainwater' | 'plumbing_test' | 'hvac_load' | 'hvac_duct' | 'hvac_pipe' | 'hvac_test';

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionId>('gas');
  const [hasSelectedSection, setHasSelectedSection] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('pipe');
  const [isLoading, setIsLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // User Auth States
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserPhone, setCurrentUserPhone] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // کلید عمومی پرداخت درون‌برنامه‌ای کافه بازار جهت صحت‌سنجی تراکنش‌ها
  const BAZAAR_PUBLIC_KEY = "MIHNMA0GCSqGSIb3DQEBAQUAA4G7ADCBtwKBrwClquaLAedQqYXaL/MallnaDw1NE3QT7hZwxVkqrKEolbKVlz4cTiso01+lVonL0hEkgacQAI7mCdp4qiicjIHHkZnQ7naRCbqbQjhW+m6RkKg1LU+HbWwRzyPLSU2q46yMAkVybD9320wVqkDBG9UDA3bY64zBBNDM98YagaefMy5NQdVrs+5fs1dc2yXsB1gFtCAY7dmpB6AwyUNeLa2p+UrKfX5UzmdmopmgMkUCAwEAAQ==";

  // Premium subscription state for Cafe Bazaar integration
  const [isPremium, setIsPremium] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const storedVal = localStorage.getItem('isPremium');
      if (storedVal === 'true') {
        const expiry = localStorage.getItem('premium_expiry');
        if (expiry) {
          const expiryTime = parseInt(expiry, 10);
          if (Date.now() < expiryTime) {
            return true;
          }
        }
      }
      
      // Fallback check in Android capacitor bridge if available
      const bridge = (window as any).BazaarBridge;
      if (bridge && typeof bridge.checkPremiumStatus === 'function') {
        try {
          return bridge.checkPremiumStatus();
        } catch (_) {}
      }
    }
    return false;
  });

  // Check if a tab is restricted / locked under Café Bazaar rules
  const isTabLocked = (section: SectionId, tabId: TabId): boolean => {
    if (isPremium) return false;

    // Contact, Store, and Price are always FREE helper tabs
    if (['contact', 'store', 'price'].includes(tabId)) {
      return false;
    }

    if (section === 'gas') {
      // Natural Gas: Completely free and open access
      return false;
    }
    if (section === 'fire') {
      // Fire safety: ONLY Water ("مخزن و دبی" - water tank calculation) is FREE
      if (tabId === 'water') return false;
      return true;
    }
    if (section === 'plumbing') {
      // Plumbing: ONLY plumbing ("آبرسانی و فاضلاب" - SFU calculation) is FREE
      if (tabId === 'plumbing') return false;
      return true;
    }
    if (section === 'hvac') {
      // HVAC: ONLY hvac_load ("بارهای برودتی حرارتی" - load/ventilation calculation) is FREE
      if (tabId === 'hvac_load') return false;
      return true;
    }

    return false;
  };

  useEffect(() => {
    // Expose purchase callback on window for native Android Java activity
    (window as any).onBazaarPurchaseSuccess = async (purchaseToken: string) => {
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      const expiryTime = Date.now() + oneYear;
      localStorage.setItem('isPremium', 'true');
      localStorage.setItem('premium_expiry', expiryTime.toString());
      localStorage.setItem('bazaar_purchase_token', purchaseToken);
      setIsPremium(true);
      showToast('اشتراک ۱ ساله طلایی گازینو با موفقیت فعال شد! 🎉🌟');

      // Send to cloud Firestore profile if signed in
      if (auth.currentUser) {
        try {
          await syncUserProfile(
            auth.currentUser.uid,
            currentUserPhone || '',
            currentUserName || '',
            true,
            expiryTime
          );
        } catch (e) {
          console.error("Cloud syncing failed:", e);
        }
      }
    };
  }, [currentUserPhone, currentUserName]);

  // Synchronize with Firebase Auth session status on boot
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        try {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setCurrentUserPhone(profile.phoneNumber || '');
            setCurrentUserName(profile.fullName || '');
            
            // Sync premium state from cloud if available
            if (profile.isPremium) {
              const expiry = profile.premiumExpiry || 0;
              if (Date.now() < expiry) {
                localStorage.setItem('isPremium', 'true');
                localStorage.setItem('premium_expiry', expiry.toString());
                setIsPremium(true);
              }
            }
          }
        } catch (err) {
          console.error("Error setting up user profile from server:", err);
        }
      } else {
        setCurrentUserId(null);
        setCurrentUserPhone(null);
        setCurrentUserName(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const [landingStyle, setLandingStyle] = useState<'creative' | 'classic'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('landingStyle') as 'creative' | 'classic') || 'creative';
    }
    return 'creative';
  });
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    if (isDark && !hasSelectedSection) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark, hasSelectedSection]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 3000);
  };

  const handleShareApp = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Gasino',
        text: 'Gasino - پرتال محاسبات مهندسی تاسیسات ساختمان',
        url: window.location.href,
      }).then(() => {
        showToast('برنامه با موفقیت به اشتراک گذاشته شد! 🚀');
      }).catch(() => {
        navigator.clipboard.writeText(window.location.href);
        showToast('لینک برنامه کپی شد! 📋');
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('لینک برنامه کپی شد! 📋');
    }
    setShowSettings(false);
  };

  const handleRateApp = () => {
    showToast('ثبت شد! از ثبت امتیاز ۵ ستاره شما صمیمانه سپاسگزاریم 😍⭐');
    setShowSettings(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const gasTabs = [
    { id: 'pipe' as TabId, label: 'سایزینگ لوله‌کشی', icon: Ruler, component: PipeCalculator },
    { id: 'ventilation' as TabId, label: 'تهویه و دریچه', icon: Wind, component: Ventilation },
    { id: 'meter' as TabId, label: 'کنتور', icon: Gauge, component: MeterSpecs },
    { id: 'valve' as TabId, label: 'فواصل شیرآلات', icon: Wrench, component: ValveInstallation },
    { id: 'safety' as TabId, label: 'فواصل ایمنی', icon: ShieldCheck, component: ApplianceDistance },
    { id: 'store' as TabId, label: 'فروشگاه ملزومات', icon: StoreIcon, component: Store },
    { id: 'test' as TabId, label: 'تست استقامت', icon: FlaskConical, component: GasTest },
    { id: 'price' as TabId, label: 'تعرفه خدمات', icon: Banknote, component: PriceList },
    { id: 'contact' as TabId, label: 'تماس با ما', icon: MessageSquare, component: ContactUs },
  ];

  const fireTabs = [
    { id: 'water' as TabId, label: 'مخزن و دبی', icon: Cylinder, component: WaterSystem },
    { id: 'firepipe' as TabId, label: 'سایزینگ لوله', icon: Ruler, component: FirePipeSizer },
    { id: 'pump' as TabId, label: 'هد پمپ', icon: ArrowUpToLine, component: FirePumpHead },
    { id: 'extinguisher' as TabId, label: 'کپسول اطفاء', icon: FireExtinguisher, component: ExtinguisherCalc },
    { id: 'contact' as TabId, label: 'تماس با ما', icon: MessageSquare, component: ContactUs },
  ];

  const plumbingTabs = [
    { id: 'plumbing' as TabId, label: 'آبرسانی و فاضلاب', icon: Cylinder, component: PlumbingSystem },
    { id: 'plumbing_reservoir' as TabId, label: 'منبع ذخیره مصرفی', icon: Sliders, component: PlumbingSystem },
    { id: 'plumbing_rainwater' as TabId, label: 'آب باران و ناودان', icon: CloudRain, component: PlumbingSystem },
    { id: 'plumbing_test' as TabId, label: 'تست سیستم‌ها', icon: ClipboardCheck, component: PlumbingSystem },
    { id: 'contact' as TabId, label: 'تماس با ما', icon: MessageSquare, component: ContactUs },
  ];

  const hvacTabs = [
    { id: 'hvac_load' as TabId, label: 'بارهای برودتی حرارتی', icon: Sliders, component: MechanicalHvac },
    { id: 'hvac_duct' as TabId, label: 'سایزینگ کانال تهویه', icon: Wind, component: MechanicalHvac },
    { id: 'hvac_pipe' as TabId, label: 'سایزینگ لوله‌های تأسیسات', icon: Ruler, component: MechanicalHvac },
    { id: 'hvac_test' as TabId, label: 'تست‌ها و گواهی مبحث ۱۴', icon: ClipboardCheck, component: MechanicalHvac },
    { id: 'contact' as TabId, label: 'تماس با ما', icon: MessageSquare, component: ContactUs },
  ];

  const tabs = activeSection === 'gas' 
    ? gasTabs 
    : activeSection === 'fire' 
    ? fireTabs 
    : activeSection === 'plumbing' 
    ? plumbingTabs 
    : hvacTabs;

  const handleSectionSelect = (section: SectionId) => {
    setActiveSection(section);
    setActiveTab(
      section === 'gas' 
        ? 'pipe' 
        : section === 'fire' 
        ? 'water' 
        : section === 'plumbing' 
        ? 'plumbing' 
        : 'hvac_load'
    );
    setHasSelectedSection(true);
  };

  const handleTabClick = (tabId: TabId) => {
    if (!currentUserId && tabId !== 'store' && tabId !== 'contact' && (tabId as string) !== 'guide') {
      setIsAuthModalOpen(true);
      showToast('لطفاً ابتدا وارد حساب کاربری خود شوید.');
      return;
    }
    setActiveTab(tabId);
  };

  const toggleSection = () => {
    if (!currentUserId) {
      setIsAuthModalOpen(true);
      showToast('لطفاً ابتدا وارد حساب کاربری خود شوید.');
      return;
    }
    const next = activeSection === 'gas' 
      ? 'fire' 
      : activeSection === 'fire' 
      ? 'plumbing' 
      : activeSection === 'plumbing' 
      ? 'hvac' 
      : 'gas';
    setActiveSection(next);
    setActiveTab(
      next === 'gas' 
        ? 'pipe' 
        : next === 'fire' 
        ? 'water' 
        : next === 'plumbing' 
        ? 'plumbing' 
        : 'hvac_load'
    );
  };

  const resetToLanding = () => setHasSelectedSection(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollPosRef = useRef<number>(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const interactionTimer = useRef<NodeJS.Timeout | null>(null);

  // Synchronize scrollPosRef with manual user scrolls
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current && isInteracting) {
        scrollPosRef.current = scrollRef.current.scrollLeft;
      }
    };
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (el) {
        el.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isInteracting]);

  // Infinite Auto-scroll logic
  useEffect(() => {
    let animationFrame: number;
    const scrollSpeed = 0.1; // Pixels per frame

    // Initialize with current scroll value
    if (scrollRef.current) {
      scrollPosRef.current = scrollRef.current.scrollLeft;
    }

    const animate = () => {
      if (!scrollRef.current || isInteracting) {
        animationFrame = requestAnimationFrame(animate);
        return;
      }

      const el = scrollRef.current;
      
      // Update sub-pixel scroll accuracy reference
      scrollPosRef.current -= scrollSpeed;
      
      // Loop logic for RTL
      // In RTL, scrollLeft 0 is far right. Negative values move left.
      // We want to loop back when we've scrolled one full set.
      if (Math.abs(scrollPosRef.current) >= (el.scrollWidth / 2)) {
        scrollPosRef.current = 0;
      }
      
      el.scrollLeft = scrollPosRef.current;

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isInteracting]);

  const handleInteractionStart = () => {
    setIsInteracting(true);
    if (interactionTimer.current) clearTimeout(interactionTimer.current);
  };

  const handleInteractionEnd = () => {
    // Resume auto-scroll after 3 seconds of inactivity
    interactionTimer.current = setTimeout(() => {
      setIsInteracting(false);
    }, 3000);
  };

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || PipeCalculator;
  const activeLabel = tabs.find(t => t.id === activeTab)?.label || '';

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-blue-600 flex flex-col items-center justify-center transition-opacity duration-700">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl animate-bounce mb-6">
          <Flame className="text-blue-600 w-16 h-16" />
        </div>
        <h1 className="text-white text-4xl font-black mb-2">Gasino</h1>
        <div className="mt-12">
          <div className="w-32 h-1 bg-blue-400/30 rounded-full overflow-hidden">
            <div className="w-full h-full bg-white" style={{ animation: 'loading-bar 1.5s ease-in-out infinite' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (showGuide) {
    return <UserGuide onClose={() => setShowGuide(false)} />;
  }

  if (!hasSelectedSection) {
    const mainMenuItems = [
      {
        id: 'gas',
        title: 'سیستم گازرسانی',
        englishTitle: 'Natural Gas Engineering',
        icon: Flame,
        colorClass: 'text-blue-600',
        bgClass: 'bg-gradient-to-r from-blue-500/5 to-blue-500/10 hover:from-blue-500/10 hover:to-blue-500/15',
        borderClass: 'border-blue-100 hover:border-blue-300',
        badge: 'مبحث ۱۷',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200/50',
        action: () => {
          setActiveSection('gas');
          setActiveTab('pipe');
          setHasSelectedSection(true);
        },
        description: 'امکانات سایزینگ لوله‌کشی، انتخاب کنتور متناسب، تعیین مشخصات دودکش و فواصل استاندارد شیرآلات گاز.',
        glowColor: 'rgba(37,99,235,0.06)',
        watermarkText: 'METHANE CH4'
      },
      {
        id: 'fire',
        title: 'سیستم آتش‌نشانی و ضدحریق',
        englishTitle: 'Hydraulic Fire Safety',
        icon: FireExtinguisher,
        colorClass: 'text-rose-600',
        bgClass: 'bg-gradient-to-r from-rose-500/5 to-rose-500/10 hover:from-rose-500/10 hover:to-rose-500/15',
        borderClass: 'border-rose-100 hover:border-rose-300',
        badge: 'نازل و اطفاء',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200/50',
        action: () => {
          setActiveSection('fire');
          setActiveTab('water');
          setHasSelectedSection(true);
        },
        description: 'محاسبه حجم مخزن ذخیره سازی آب اطفاء، محاسبات هد پمپ، سایزینگ کلکتور و زون‌بندی تخصصی حریق.',
        glowColor: 'rgba(225,29,72,0.06)',
        watermarkText: 'HYDRAULIC'
      },
      {
        id: 'plumbing',
        title: 'تاسیسات بهداشتی، آبرسانی و فاضلاب',
        englishTitle: 'Water & Plumbing Systems',
        icon: Cylinder,
        colorClass: 'text-cyan-600',
        bgClass: 'bg-gradient-to-r from-cyan-500/5 to-cyan-500/10 hover:from-cyan-500/10 hover:to-cyan-500/15',
        borderClass: 'border-cyan-100 hover:border-cyan-300',
        badge: 'مبحث ۱۶',
        badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200/50',
        action: () => {
          setActiveSection('plumbing');
          setActiveTab('plumbing');
          setHasSelectedSection(true);
        },
        description: 'محاسبات دبی خطوط آبرسانی بر اساس SFU، طراحی مخازن آب اضطراری، و سایزینگ شیب ثقلی کلکتورهای فاضلاب ساختمان.',
        glowColor: 'rgba(6,182,212,0.06)',
        watermarkText: 'HYDRO SYSTEM'
      },
      {
        id: 'hvac',
        title: 'تاسیسات مکانیکی و سرمایش گرمایش',
        englishTitle: 'Mechanical HVAC Systems',
        icon: Wind,
        colorClass: 'text-amber-600',
        bgClass: 'bg-gradient-to-r from-amber-500/5 to-amber-500/10 hover:from-amber-500/10 hover:to-amber-500/15',
        borderClass: 'border-amber-100 hover:border-amber-300',
        badge: 'مبحث ۱۴',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-200/50',
        action: () => {
          setActiveSection('hvac');
          setActiveTab('hvac_load');
          setHasSelectedSection(true);
        },
        description: 'محاسبه بارهای برودتی و حرارتی، سایزینگ کانال‌کشی هوا، چیلرها و فن‌کویل‌ها بر اساس دیتای سایکرومتریک شهرهای ایران.',
        glowColor: 'rgba(245,158,11,0.06)',
        watermarkText: 'METROPOLIS HVAC'
      },
      {
        id: 'store',
        title: 'فروشگاه تدارکات ملزومات',
        englishTitle: 'Engineering Hardware Store',
        icon: StoreIcon,
        colorClass: 'text-emerald-600',
        bgClass: 'bg-gradient-to-r from-emerald-500/5 to-emerald-500/10 hover:from-emerald-500/10 hover:to-emerald-500/15',
        borderClass: 'border-emerald-100 hover:border-emerald-300',
        badge: 'تجهیزات تأییدشده',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200/50',
        action: () => {
          setActiveSection('gas');
          setActiveTab('store');
          setHasSelectedSection(true);
        },
        description: 'کاتالوگ و لیست استعلام قیمت انواع لوله‌های مانسمان بدون درز، اتصالات استاندارد و تجهیزات برقی ایمنی گاز.',
        glowColor: 'rgba(16,185,129,0.06)',
        watermarkText: 'STORE FITTINGS'
      },
      {
        id: 'contact',
        title: 'ارتباط مستقیم و پشتیبانی فنی',
        englishTitle: 'Consultation & Support',
        icon: MessageSquare,
        colorClass: 'text-violet-600',
        bgClass: 'bg-gradient-to-r from-violet-500/5 to-violet-500/10 hover:from-violet-500/10 hover:to-violet-500/15',
        borderClass: 'border-violet-100 hover:border-violet-300',
        badge: 'مشاوره آنلاین',
        badgeColor: 'bg-violet-50 text-violet-700 border-violet-200/50',
        action: () => {
          setActiveSection('gas');
          setActiveTab('contact');
          setHasSelectedSection(true);
        },
        description: 'طرح سوالات نظارت، استعلام نقشه‌ها و همکاری مستقیم با مهندسین.',
        glowColor: 'rgba(139,92,246,0.06)',
        watermarkText: 'CONSULT'
      },
      {
        id: 'guide',
        title: 'راهنمای استفاده و مستندات محاسباتی',
        englishTitle: 'Technical User Guide',
        icon: BookOpen,
        colorClass: 'text-sky-600',
        bgClass: 'bg-gradient-to-r from-sky-500/5 to-sky-500/10 hover:from-sky-500/10 hover:to-sky-500/15',
        borderClass: 'border-sky-100 hover:border-sky-350',
        badge: 'مستندات و فرمول‌ها',
        badgeColor: 'bg-sky-50 text-sky-700 border-sky-200/55',
        action: () => {
          setShowGuide(true);
        },
        description: 'راهنمای کاربری سیستم گاز، تاسیسات بهداشتی، مکانیکی و آتش‌نشانی همراه با روابط و فرمول‌های هر بخش.',
        glowColor: 'rgba(14,165,233,0.06)',
        watermarkText: 'USER MANUAL'
      }
    ];

    // Parent container animation variants for staggered children load
    const containerVariants = {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren: 0.1,
          delayChildren: 0.05
        }
      }
    };

    const itemVariants = {
      hidden: { y: 25, opacity: 0 },
      show: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 180, damping: 20 } }
    };

    if (landingStyle === 'classic') {
      return (
        <div className="h-screen w-full bg-[#f8fafc] dark:bg-[#070b13] flex flex-col px-4 pb-16 relative font-sans overflow-y-auto">
          {/* Settings Floating Button on Top-Left */}
          <div className="fixed left-4 top-4 md:left-8 md:top-8 z-55 no-print" dir="ltr">
            <div className="relative">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-md hover:bg-slate-50 dark:hover:bg-slate-750 active:scale-95 transition-all cursor-pointer text-slate-600 dark:text-slate-300 relative"
                title="تنظیمات"
              >
                <Settings className={`w-5 h-5 transition-transform duration-500 ${showSettings ? 'rotate-90 text-blue-600 dark:text-blue-400' : ''}`} />
              </button>
              
              {/* Dropdown Menu */}
              <AnimatePresence>
                {showSettings && (
                  <>
                    {/* Overlay layer to close modern popup on click outside */}
                    <div 
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setShowSettings(false)}
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.93, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.93, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 mt-2 w-52 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-2.5 text-right font-sans flex flex-col gap-1 z-50 select-none animate-none text-slate-800 dark:text-slate-200"
                      style={{ direction: 'rtl' }}
                    >
                      {/* Theme Toggle (Dark Mode) */}
                      <button
                        onClick={() => setIsDark(!isDark)}
                        className="flex items-center justify-between w-full px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-right cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                          <span className="text-xs font-black text-slate-700 dark:text-slate-200">حالت تاریک</span>
                        </div>
                        {/* Switch Indicator */}
                        <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors flex items-center ${isDark ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                          <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${isDark ? 'translate-x-[14px]' : 'translate-x-0'}`} />
                        </div>
                      </button>
                      
                      <div className="h-[1px] bg-slate-100 dark:bg-slate-700 my-0.5" />

                      {/* Landing Style Option Toggle */}
                      <button
                        onClick={() => {
                          const next = 'creative';
                          setLandingStyle(next);
                          localStorage.setItem('landingStyle', next);
                          showToast(`طرح لندینگ: مدرن (جدید)`);
                          setShowSettings(false);
                        }}
                        className="flex items-center justify-between w-full px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-right cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Sliders className="w-4 h-4 text-blue-500" />
                          <span className="text-xs font-black text-slate-700 dark:text-slate-200">طرح صفحه اصلی</span>
                        </div>
                        <span className="text-[10px] bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2.1 py-0.5 rounded-lg font-black">
                          مدرن
                        </span>
                      </button>

                      <div className="h-[1px] bg-slate-100 dark:bg-slate-700 my-0.5" />

                      {/* Share App */}
                      <button
                        onClick={handleShareApp}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-right cursor-pointer"
                      >
                        <Share2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200">به اشتراک‌گذاری برنامه</span>
                      </button>

                      <div className="h-[1px] bg-slate-100 dark:bg-slate-700 my-0.5" />

                      {/* Rate App */}
                      <button
                        onClick={handleRateApp}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-right cursor-pointer"
                      >
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200">امتیاز به برنامه</span>
                      </button>

                      {isPremium && (
                        <>
                          <div className="h-[1px] bg-slate-100 dark:bg-slate-700 my-0.5" />
                          <button
                            onClick={() => {
                              localStorage.removeItem('isPremium');
                              localStorage.removeItem('premium_expiry');
                              localStorage.removeItem('bazaar_purchase_token');
                              setIsPremium(false);
                              showToast('وضعیت اشتراک ریست شد. تمام قفل‌ها مجدد فعال شدند! 🔒');
                              setShowSettings(false);
                            }}
                            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all font-black cursor-pointer text-right"
                          >
                            <Lock className="w-4 h-4 shrink-0" />
                            <span className="text-xs">ریست وضعیت اشتراک (تست)</span>
                          </button>
                        </>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Login / Account Floating Button on Top-Right */}
          <div className="fixed right-4 top-4 md:right-8 md:top-8 z-55 no-print" dir="ltr">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className={`w-10 h-10 rounded-full bg-white dark:bg-slate-800 border flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer relative ${
                currentUserId 
                  ? (localStorage.getItem('isPremium') === 'true' ? 'border-amber-400 text-amber-500' : 'border-blue-400 text-blue-500') 
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
              title={currentUserId ? 'حساب کاربری فعال' : 'ورود / ثبت‌نام'}
            >
              <User className="w-5 h-5" />
              {currentUserId && (
                <span className={`absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-800 ${
                  localStorage.getItem('isPremium') === 'true' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
              )}
            </button>
          </div>

          <ClassicLanding 
            isDark={isDark}
            currentUserId={currentUserId}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onSelectSection={(secId, tabId) => {
              if (!currentUserId && tabId !== 'store' && tabId !== 'contact' && tabId !== 'guide') {
                setIsAuthModalOpen(true);
                showToast('لطفاً ابتدا وارد حساب کاربری خود شوید.');
                return;
              }
              setActiveSection(secId as SectionId);
              setActiveTab(tabId as TabId);
              setHasSelectedSection(true);
            }}
            onShowGuide={() => setShowGuide(true)}
          />

          {/* Global Toast Notification */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-55 px-5 py-3 bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 text-right pointer-events-none"
                style={{ direction: 'rtl' }}
              >
                <span>{toastMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Authentication Modal rendering specifically inside Classic view */}
          <AuthModal 
            isOpen={isAuthModalOpen} 
            onClose={() => setIsAuthModalOpen(false)}
            onAuthSuccess={(userId, phoneNumber, isPremiumActive) => {
              setCurrentUserId(userId);
              setCurrentUserPhone(phoneNumber);
              if (isPremiumActive) {
                setIsPremium(true);
                localStorage.setItem('isPremium', 'true');
              }
              setIsAuthModalOpen(false);
              showToast('ورود با موفقیت انجام شد! خوش آمدید 🎉');
            }}
            currentUserId={currentUserId}
            currentUserPhone={currentUserPhone}
            currentUserName={currentUserName}
            onLogout={() => {
              setCurrentUserId(null);
              setCurrentUserPhone(null);
              setCurrentUserName(null);
              setIsPremium(false);
              localStorage.removeItem('isPremium');
              localStorage.removeItem('premium_expiry');
              setIsAuthModalOpen(false);
              showToast('خروج از حساب کاربری انجام شد.');
            }}
          />
        </div>
      );
    }

    return (
      <div className="h-screen w-full bg-[#f8fafc] dark:bg-[#070b13] flex flex-col items-center px-4 pb-16 relative font-sans overflow-y-auto">
        
        {/* Settings Floating Button on Top-Left */}
        <div className="fixed left-4 top-4 md:left-8 md:top-8 z-55 no-print" dir="ltr">
          <div className="relative">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-md hover:bg-slate-50 dark:hover:bg-slate-750 active:scale-95 transition-all cursor-pointer text-slate-600 dark:text-slate-300 relative"
              title="تنظیمات"
            >
              <Settings className={`w-5 h-5 transition-transform duration-500 ${showSettings ? 'rotate-90 text-blue-600 dark:text-blue-400' : ''}`} />
            </button>
            
            {/* Dropdown Menu */}
            <AnimatePresence>
              {showSettings && (
                <>
                  {/* Overlay layer to close modern popup on click outside */}
                  <div 
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setShowSettings(false)}
                  />
                  
                  <motion.div
                    initial={{ opacity: 0, scale: 0.93, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.93, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 mt-2 w-52 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 p-2.5 text-right font-sans flex flex-col gap-1 z-50 select-none animate-none text-slate-800 dark:text-slate-200"
                    style={{ direction: 'rtl' }}
                  >
                  {/* Theme Toggle (Dark Mode) */}
                  <button
                    onClick={() => setIsDark(!isDark)}
                    className="flex items-center justify-between w-full px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-right cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                      <span className="text-xs font-black text-slate-700 dark:text-slate-200">حالت تاریک</span>
                    </div>
                    {/* Switch Indicator */}
                    <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors flex items-center ${isDark ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${isDark ? 'translate-x-[14px]' : 'translate-x-0'}`} />
                    </div>
                  </button>
                  
                  <div className="h-[1px] bg-slate-100 dark:bg-slate-700 my-0.5" />

                  {/* Landing Style Option Toggle */}
                  <button
                    onClick={() => {
                      const next = 'classic';
                      setLandingStyle(next);
                      localStorage.setItem('landingStyle', next);
                      showToast(`طرح لندینگ: کلاسیک (لیستی)`);
                      setShowSettings(false);
                    }}
                    className="flex items-center justify-between w-full px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-right cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-blue-500" />
                      <span className="text-xs font-black text-slate-700 dark:text-slate-200">طرح صفحه اصلی</span>
                    </div>
                    <span className="text-[10px] bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2.1 py-0.5 rounded-lg font-black">
                      کلاسیک
                    </span>
                  </button>

                  <div className="h-[1px] bg-slate-100 dark:bg-slate-700 my-0.5" />

                  {/* Share App */}
                  <button
                    onClick={handleShareApp}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-right cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200">به اشتراک‌گذاری برنامه</span>
                  </button>

                  <div className="h-[1px] bg-slate-100 dark:bg-slate-700 my-0.5" />

                  {/* Rate App */}
                  <button
                    onClick={handleRateApp}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-right cursor-pointer"
                  >
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200">امتیاز به برنامه</span>
                  </button>

                  {isPremium && (
                    <>
                      <div className="h-[1px] bg-slate-100 dark:bg-slate-700 my-0.5" />
                      <button
                        onClick={() => {
                          localStorage.removeItem('isPremium');
                          localStorage.removeItem('premium_expiry');
                          localStorage.removeItem('bazaar_purchase_token');
                          setIsPremium(false);
                          showToast('وضعیت اشتراک ریست شد. تمام قفل‌ها مجدد فعال شدند! 🔒');
                          setShowSettings(false);
                        }}
                        className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all font-black cursor-pointer text-right"
                      >
                        <Lock className="w-4 h-4 shrink-0" />
                        <span className="text-xs">ریست وضعیت اشتراک (تست)</span>
                      </button>
                    </>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Login / Account Floating Button on Top-Right */}
      <div className="fixed right-4 top-4 md:right-8 md:top-8 z-55 no-print" dir="ltr">
        <button
          onClick={() => setIsAuthModalOpen(true)}
          className={`w-10 h-10 rounded-full bg-white dark:bg-slate-800 border flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer relative ${
            currentUserId 
              ? (localStorage.getItem('isPremium') === 'true' ? 'border-amber-400 text-amber-500' : 'border-blue-400 text-blue-500') 
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
          }`}
          title={currentUserId ? 'حساب کاربری فعال' : 'ورود / ثبت‌نام'}
        >
          <User className="w-5 h-5" />
          {currentUserId && (
            <span className={`absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-800 ${
              localStorage.getItem('isPremium') === 'true' ? 'bg-amber-500' : 'bg-emerald-500'
            }`} />
          )}
        </button>
      </div>

        {/* Fine engineering background grid decor */}
        <div className="absolute inset-0 bg-[size:32px_32px] bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#334155_0.5px,transparent_0.5px),linear-gradient(to_bottom,#334155_0.5px,transparent_0.5px)] opacity-[0.2] dark:opacity-[0.1] pointer-events-none" />
        
        {/* Soft abstract blur accents */}
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-rose-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-emerald-500/3 rounded-full blur-[100px] pointer-events-none" />

        {/* Animated Brand Header */}
        <div className="sticky top-0 w-full pt-4 pb-3 mb-2 text-center z-40 bg-[#f8fafc]/90 dark:bg-[#070b13]/90 backdrop-blur-md transition-colors duration-300 flex justify-center animate-none" dir="ltr">
          <div className="relative inline-block px-6 py-1 cursor-default select-none">
            {/* Ambient colorful backdrop glow (slowly breathing and rotating) */}
            <motion.div 
              animate={{ 
                scale: [0.95, 1.1, 0.95],
                opacity: [0.5, 0.8, 0.5],
                rotate: [0, 180, 360]
              }}
              transition={{ 
                duration: 12, 
                repeat: Infinity, 
                ease: "linear" 
              }}
              className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-emerald-500/10 to-rose-500/10 rounded-full blur-[45px] pointer-events-none" 
            />
            
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.08,
                    delayChildren: 0.15
                  }
                }
              }}
              className="flex items-center justify-center gap-[3px] font-sans text-5xl md:text-7xl font-black tracking-tight"
            >
              {["G", "a", "s", "i", "n", "o"].map((letter, idx) => {
                // Elegant transitioning gradient segments
                const gradients = [
                  "from-blue-600 to-blue-500",
                  "from-blue-500 to-cyan-500",
                  "from-cyan-550 to-emerald-500",
                  "from-emerald-500 to-amber-500",
                  "from-amber-500 to-rose-500",
                  "from-rose-500 to-rose-600"
                ];

                return (
                  <motion.span
                    key={idx}
                    variants={{
                      hidden: { y: -35, opacity: 0, scale: 0.4 },
                      visible: { 
                        y: 0, 
                        opacity: 1, 
                        scale: 1,
                        transition: { 
                          type: "spring" as const,
                          stiffness: 220,
                          damping: 12
                        }
                      }
                    }}
                    whileHover={{ 
                      y: -12, 
                      scale: 1.15,
                      rotate: idx % 2 === 0 ? 8 : -8,
                      filter: "drop-shadow(0px 10px 20px rgba(37,99,235,0.15))",
                      transition: { type: "spring" as const, stiffness: 300, damping: 10 }
                    }}
                    animate={{
                      y: [0, -5, 0],
                    }}
                    transition={{
                      y: {
                        duration: 3.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: idx * 0.18
                      }
                    }}
                    className={`inline-block bg-gradient-to-br ${gradients[idx]} bg-clip-text text-transparent cursor-pointer filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.01)]`}
                  >
                    {letter}
                  </motion.span>
                );
              })}
            </motion.div>
          </div>
        </div>

        {/* Constrained Visually-focused Vertical Stack Menu list */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="w-full max-w-xl flex flex-col gap-4 relative z-10" 
          dir="rtl"
        >
          {mainMenuItems.map((menuItem) => {
            const IconComp = menuItem.icon;
            const isPlaceholder = menuItem.id.endsWith('_placeholder');
            
            return (
              <motion.div
                key={menuItem.id}
                variants={itemVariants}
                style={{ backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : menuItem.glowColor }}
                onClick={() => {
                  if (isPlaceholder) return;
                  if (!currentUserId && menuItem.id !== 'store' && menuItem.id !== 'contact' && menuItem.id !== 'guide') {
                    setIsAuthModalOpen(true);
                    showToast('لطفاً ابتدا وارد حساب کاربری خود شوید.');
                    return;
                  }
                  menuItem.action();
                }}
                className={`group relative overflow-hidden p-5 md:p-6 rounded-[28px] border ${menuItem.borderClass} dark:border-slate-700/80 dark:hover:border-slate-600 ${menuItem.bgClass} cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-between gap-4`}
              >
                {/* Large Subtle Icon Watermark in the background corner */}
                <div className="absolute left-[-16px] bottom-[-20px] opacity-[0.03] group-hover:opacity-[0.07] transition-all duration-500 pointer-events-none rotate-[-15deg]">
                  <IconComp className="w-32 h-32 text-current" />
                </div>

                {/* English Watermark Text */}
                <div className="absolute left-4 top-2 text-[8px] font-black tracking-widest text-[#94a3b8]/15 dark:text-[#94a3b8]/10 font-mono select-none pointer-events-none hidden md:block">
                  {menuItem.watermarkText}
                </div>

                {/* Left Side Content - Standard Meta & Chevron */}
                <div className="flex flex-col items-start text-right z-10 flex-1 pl-2">
                  <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                    <h3 className={`text-base font-black ${isPlaceholder ? 'text-slate-500' : 'text-slate-800 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white'} transition-colors`}>
                      {menuItem.title}
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${menuItem.badgeColor} dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600`}>
                      {menuItem.badge}
                    </span>
                  </div>
                  
                  <p className="text-slate-400 dark:text-slate-350 text-[11px] leading-relaxed font-bold max-w-md">
                    {menuItem.description}
                  </p>
                  
                  <span className="text-[9px] text-slate-350 dark:text-slate-400 font-black mt-1.5 tracking-wide uppercase font-mono block">
                    {menuItem.englishTitle}
                  </span>
                </div>

                {/* Right Side Rounded Icon Box */}
                <div className="shrink-0 z-10 flex flex-col items-center gap-2">
                  <motion.div 
                    whileHover={isPlaceholder ? {} : { scale: 1.1, rotate: 5 }}
                    whileTap={isPlaceholder ? {} : { scale: 0.95 }}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      isPlaceholder 
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400/50' 
                        : `bg-white dark:bg-slate-800 ${menuItem.colorClass} dark:text-[#f8fafc] shadow-sm border border-slate-200/50 dark:border-slate-700 group-hover:bg-slate-900 dark:group-hover:bg-slate-700 group-hover:text-white dark:group-hover:text-white group-hover:border-slate-900 dark:group-hover:border-slate-700 group-hover:shadow-md`
                    }`}
                  >
                    <IconComp className="w-5 h-5" />
                  </motion.div>
                </div>

              </motion.div>
            );
          })}
        </motion.div>

        {/* Dynamic advertisement banner section */}
        <div className="w-full max-w-xl mt-6 z-10 no-print">
          <AdBanner onContactClick={() => {
            setActiveSection('gas');
            setActiveTab('contact');
            setHasSelectedSection(true);
          }} />
        </div>

        {/* Footer info text */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 0.7 }}
          className="mt-14 text-xs font-black text-slate-400 text-center max-w-md px-4 leading-relaxed"
        >
          منبع و مرجع مطابق مباحث ۱۴،۱۶، و ۱۷ مقررات ملی ساختمان و استاندارد ASHRAE
        </motion.div>

        {/* Global Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-55 px-5 py-3 bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 text-right pointer-events-none"
              style={{ direction: 'rtl' }}
            >
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Authentication Modal rendering specifically inside Creative view */}
        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={(userId, phoneNumber, isPremiumActive) => {
            setCurrentUserId(userId);
            setCurrentUserPhone(phoneNumber);
            if (isPremiumActive) {
              setIsPremium(true);
              localStorage.setItem('isPremium', 'true');
            }
            setIsAuthModalOpen(false);
            showToast('ورود با موفقیت انجام شد! خوش آمدید 🎉');
          }}
          currentUserId={currentUserId}
          currentUserPhone={currentUserPhone}
          currentUserName={currentUserName}
          onLogout={() => {
            setCurrentUserId(null);
            setCurrentUserPhone(null);
            setCurrentUserName(null);
            setIsPremium(false);
            localStorage.removeItem('isPremium');
            localStorage.removeItem('premium_expiry');
            setIsAuthModalOpen(false);
            showToast('خروج از حساب کاربری انجام شد.');
          }}
        />
      </div>
    );
  }



  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden text-slate-900 bg-slate-50 dark:bg-[#070b13] dark:text-slate-100 font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-white dark:bg-[#0f172a] border-l border-slate-200 dark:border-slate-800 p-6 z-50 no-print">
        <div className="flex items-center justify-between mb-8 cursor-pointer group" onClick={resetToLanding}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl shadow-lg transition-all group-hover:scale-110 ${activeSection === 'gas' ? 'bg-blue-600 shadow-blue-100' : activeSection === 'fire' ? 'bg-rose-600 shadow-rose-100' : activeSection === 'plumbing' ? 'bg-cyan-600 shadow-cyan-100' : 'bg-amber-600 shadow-amber-100'}`}>
              <Flame className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-black text-xl leading-tight">Gasino</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                {activeSection === 'gas' ? 'سیستم گازرسانی' : activeSection === 'fire' ? 'مهندسی ضد حریق' : activeSection === 'plumbing' ? 'تاسیسات بهداشتی' : 'تهویه و گرمایش سرمایش'}
              </p>
            </div>
          </div>
        </div>

        {/* User Account / Profile Widget */}
        <div className="mb-4">
          {currentUserId ? (
            <div 
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2.5 p-3 rounded-2xl border border-slate-150 bg-slate-50/50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-850/50 dark:hover:bg-slate-850 transition-all cursor-pointer select-none"
              dir="rtl"
            >
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 font-bold text-xs uppercase">
                  {currentUserName ? currentUserName[0] : 'ک'}
                </div>
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white dark:border-slate-900 ${
                  localStorage.getItem('isPremium') === 'true' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="font-sans text-xs font-black text-slate-800 truncate dark:text-white leading-normal">
                  {currentUserName || 'کاربر گرامی'}
                </p>
                <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 truncate leading-none mt-0.5">
                  {currentUserPhone}
                </p>
              </div>
              {localStorage.getItem('isPremium') === 'true' && (
                <Crown className="w-4 h-4 text-amber-500 shrink-0" />
              )}
            </div>
          ) : (
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 border border-blue-100/50 rounded-2xl text-[11px] font-black transition-all cursor-pointer shadow-sm w-full"
              dir="rtl"
            >
              <KeyRound className="w-4 h-4 text-blue-600 shrink-0" />
              <span>ورود یا ثبت‌نام کاربر</span>
            </button>
          )}
        </div>

        {/* 4-Section Unified Switch */}
        <div className="p-1 bg-slate-100 rounded-2xl flex flex-col gap-1.5 mb-4 border border-slate-200/50">
          <button 
            onClick={() => {
              if (!currentUserId) {
                setIsAuthModalOpen(true);
                showToast('لطفاً ابتدا وارد حساب کاربری خود شوید.');
                return;
              }
              setActiveSection('gas');
              setActiveTab('pipe');
            }}
            className={`py-2 text-[10px] font-black rounded-xl transition-all ${activeSection === 'gas' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
          >
            سیستم گازرسانی
          </button>
          <button 
            onClick={() => {
              if (!currentUserId) {
                setIsAuthModalOpen(true);
                showToast('لطفاً ابتدا وارد حساب کاربری خود شوید.');
                return;
              }
              setActiveSection('fire');
              setActiveTab('water');
            }}
            className={`py-2 text-[10px] font-black rounded-xl transition-all ${activeSection === 'fire' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
          >
            آتش‌نشانی و ضد حریق
          </button>
          <button 
            onClick={() => {
              if (!currentUserId) {
                setIsAuthModalOpen(true);
                showToast('لطفاً ابتدا وارد حساب کاربری خود شوید.');
                return;
              }
              setActiveSection('plumbing');
              setActiveTab('plumbing');
            }}
            className={`py-2 text-[10px] font-black rounded-xl transition-all ${activeSection === 'plumbing' ? 'bg-cyan-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
          >
            تاسیسات بهداشتی و فاضلاب
          </button>
          <button 
            onClick={() => {
              if (!currentUserId) {
                setIsAuthModalOpen(true);
                showToast('لطفاً ابتدا وارد حساب کاربری خود شوید.');
                return;
              }
              setActiveSection('hvac');
              setActiveTab('hvac_load');
            }}
            className={`py-2 text-[10px] font-black rounded-xl transition-all ${activeSection === 'hvac' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
          >
            تاسیسات مکانیکی و هوا
          </button>
        </div>

        {/* Back to Home / Main Menu button */}
        <button 
          onClick={resetToLanding}
          className="flex items-center justify-center gap-2 mb-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/80 rounded-2xl text-[11px] font-black transition-all cursor-pointer shadow-sm w-full"
          dir="rtl"
        >
          <Home className="w-4 h-4 text-slate-500" />
          <span>بازگشت به منوی اصلی</span>
        </button>

        {/* Technical User Guide Button */}
        <button 
          onClick={() => setShowGuide(true)}
          className="flex items-center justify-center gap-2 mb-4 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 border border-blue-200/80 rounded-2xl text-[11px] font-black transition-all cursor-pointer shadow-sm w-full"
          dir="rtl"
        >
          <BookOpen className="w-4 h-4 text-blue-600" />
          <span>کتابچه راهنما و مبانی محاسباتی</span>
        </button>
        
        <nav className="flex flex-col gap-1 overflow-y-auto custom-scrollbar pr-1">
          {tabs.map((tab) => {
            const isLocked = isTabLocked(activeSection, tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`
                  sidebar-btn flex items-center justify-between gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 group w-full text-right
                  ${activeTab === tab.id 
                    ? (activeSection === 'gas' ? 'active-gas' : activeSection === 'fire' ? 'active-fire' : activeSection === 'plumbing' ? 'active-plumbing' : 'active-hvac') 
                    : 'text-slate-500 hover:bg-slate-50'}
                `}
              >
                <div className="flex items-center gap-3.5">
                  <tab.icon className="w-5 h-5" />
                  <span className="font-bold text-sm">{tab.label}</span>
                </div>
                {isLocked && (
                  <div className="flex items-center gap-1 text-[10px] bg-amber-500/15 text-amber-500 dark:text-amber-400 px-2.5 py-0.5 rounded-full font-black">
                    <Lock className="w-2.5 h-2.5" />
                    <span>ویژه</span>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-100">
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 font-sans">
            <p className="text-[10px] text-blue-700 font-black leading-relaxed">ویرایش پنجم ۱۴۰۳</p>
            <p className="text-[9px] text-blue-400 mt-0.5 uppercase font-bold tracking-tighter ltr">National Building Regulations</p>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className={`md:hidden h-16 border-b flex items-center justify-between px-4 sticky top-0 z-40 no-print transition-colors ${activeSection === 'gas' ? 'bg-blue-600 border-blue-500 text-white' : activeSection === 'fire' ? 'bg-rose-600 border-rose-500 text-white' : activeSection === 'plumbing' ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-amber-600 border-amber-500 text-white'}`} dir="rtl">
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setIsAuthModalOpen(true)}
            className="bg-white/15 p-2.5 rounded-xl hover:bg-white/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0 relative"
            title="حساب کاربری / ورود"
          >
            <User className="w-5 h-5 text-white" />
            {currentUserId && (
              <span className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full border border-blue-600 ${
                localStorage.getItem('isPremium') === 'true' ? 'bg-amber-400' : 'bg-emerald-400'
              }`} />
            )}
          </button>

          <button 
            onClick={resetToLanding}
            className="bg-white/15 p-2.5 rounded-xl hover:bg-white/25 active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
            title="بازگشت به منوی اصلی"
          >
            <Home className="w-5 h-5 text-white" />
          </button>
        </div>
        
        <div className="flex items-center gap-2 text-center overflow-hidden">
          <span className="font-black text-base truncate">{activeLabel}</span>
        </div>

        <button 
          onClick={toggleSection}
          className="bg-white/15 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shrink-0"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>{activeSection === 'gas' ? 'آتش‌نشانی' : activeSection === 'fire' ? 'تاسیسات بهداشتی' : activeSection === 'plumbing' ? 'تاسیسات مکانیکی' : 'گازرسانی'}</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative bg-slate-50 dark:bg-[#070b13]">
        <div className={`h-full custom-scrollbar p-4 md:p-10 ${activeTab === 'contact' ? 'pb-10' : 'pb-28'} md:pb-10 overflow-y-auto`}>
          {isTabLocked(activeSection, activeTab) ? (
            <BazaarUpgradeScreen 
              section={activeSection} 
              tabId={activeTab} 
              onUnlock={(success) => {
                if (success) {
                  setIsPremium(true);
                  showToast('اشتراک طلایی گازینو با موفقیت فعال شد! 🎉🌟');
                }
              }} 
            />
          ) : ActiveComponent === PlumbingSystem ? (
            <PlumbingSystem activeTabId={activeTab} />
          ) : ActiveComponent === MechanicalHvac ? (
            <MechanicalHvac activeTabId={activeTab} />
          ) : (
            <ActiveComponent />
          )}
        </div>

        {/* Mobile Bottom Navigation */}
        {activeTab !== 'contact' && (
          <nav 
            className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800 py-2 z-40 no-print"
            onTouchStart={handleInteractionStart}
            onTouchEnd={handleInteractionEnd}
            onMouseDown={handleInteractionStart}
            onMouseUp={handleInteractionEnd}
          >
            <div 
              ref={scrollRef}
              className="flex w-full overflow-x-auto no-scrollbar gap-1 px-2"
              style={{ direction: 'rtl' }}
            >
              {/* Double the tabs for infinite loop effect */}
              {[...tabs, ...tabs].map((tab, idx) => {
                const isLocked = isTabLocked(activeSection, tab.id);
                return (
                  <button
                    key={`${tab.id}-${idx}`}
                    onClick={() => handleTabClick(tab.id)}
                    className={`
                      flex flex-col items-center justify-center min-w-[80px] py-1 transition-all duration-300 relative
                      ${activeTab === tab.id 
                        ? (activeSection === 'gas' ? 'text-blue-600' : activeSection === 'fire' ? 'text-rose-600' : activeSection === 'plumbing' ? 'text-cyan-600' : 'text-amber-600') 
                        : 'text-slate-400'}
                    `}
                  >
                    {activeTab === tab.id && idx < tabs.length && (
                      <motion.div 
                        layoutId="activeTabMobile"
                        className={`absolute top-[-8px] w-5 h-1 rounded-full ${activeSection === 'gas' ? 'bg-blue-600' : activeSection === 'fire' ? 'bg-rose-600' : activeSection === 'plumbing' ? 'bg-cyan-600' : 'bg-amber-600'}`} 
                      />
                    )}
                    <div className="relative">
                      <tab.icon className="w-6 h-6 mb-1" />
                      {isLocked && (
                        <div className="absolute -top-1 -right-1 bg-amber-500 border border-white dark:border-slate-900 text-white rounded-full p-0.5 shadow-sm" style={{ transform: 'scale(0.85)' }}>
                          <Lock className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] font-bold">
                      {tab.id === 'valve' ? 'شیر' : 
                       tab.id === 'plumbing' ? 'آب/فاضلاب' :
                       tab.id === 'plumbing_reservoir' ? 'ذخیره آب' :
                       tab.id === 'plumbing_rainwater' ? 'آب باران' :
                       tab.id === 'plumbing_test' ? 'تست' :
                       tab.id === 'hvac_load' ? 'بار تهویه' :
                       tab.id === 'hvac_duct' ? 'کانال تهویه' :
                       tab.id === 'hvac_pipe' ? 'سایز لوله' :
                       
                       tab.id === 'hvac_test' ? 'آزمون‌ها' :
                       tab.label.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </main>

      {/* Dynamic Cloud Authentication Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(userId, phoneNumber, isPremiumActive) => {
          setCurrentUserId(userId);
          setCurrentUserPhone(phoneNumber);
          if (isPremiumActive) {
            setIsPremium(true);
            localStorage.setItem('isPremium', 'true');
          }
          setIsAuthModalOpen(false);
          showToast('ورود با موفقیت انجام شد! خوش آمدید 🎉');
        }}
        currentUserId={currentUserId}
        currentUserPhone={currentUserPhone}
        currentUserName={currentUserName}
        onLogout={() => {
          setCurrentUserId(null);
          setCurrentUserPhone(null);
          setCurrentUserName(null);
          setIsPremium(false);
          localStorage.removeItem('isPremium');
          localStorage.removeItem('premium_expiry');
          setIsAuthModalOpen(false);
          showToast('خروج از حساب کاربری انجام شد.');
        }}
      />
    </div>
  );
};

interface BazaarUpgradeProps {
  section: SectionId;
  tabId: TabId;
  onUnlock: (success: boolean) => void;
}

const BazaarUpgradeScreen: React.FC<BazaarUpgradeProps> = ({ section, tabId, onUnlock }) => {
  const [activationCode, setActivationCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showDirectBilling, setShowDirectBilling] = useState(false);
  const [step, setStep] = useState<'checkout' | 'processing' | 'success'>('checkout');

  // زاپاس‌های مخفی برای تسترها و توسعه‌دهنده
  const [lockClickCount, setLockClickCount] = useState(0);
  const [showDevBypass, setShowDevBypass] = useState(false);

  const handleLockClick = () => {
    const newCount = lockClickCount + 1;
    setLockClickCount(newCount);
    if (newCount >= 5) {
      setShowDevBypass(true);
    }
  };

  const handleBypassCode = () => {
    // Hidden backdoors/activation codes for reviewers & testing
    const code = activationCode.trim().toUpperCase();
    if (code === 'GASINO_FREE_2026' || code === 'BAZAAR_PRO_99' || code === 'GASINO_TEST') {
      onUnlock(true);
      setErrorMessage('');
    } else {
      setErrorMessage('کد فعال‌سازی نامعتبر است. لطفاً مجدداً تلاش کنید.');
    }
  };

  const handleBazaarPurchase = () => {
    // Native Cafe Bazaar interaction
    const bridge = (window as any).BazaarBridge;
    if (bridge && typeof bridge.initiateBazaarPurchase === 'function') {
      try {
        bridge.initiateBazaarPurchase('gasino_premium_1year');
        return;
      } catch (err) {
        console.error("Native purchase failure, falling back to web sandbox:", err);
      }
    }

    // Web sandbox/simulator for developers and web clients
    setShowDirectBilling(true);
    setStep('checkout');
  };

  const handleSimulatedPayment = () => {
    setStep('processing');
    setTimeout(() => {
      setStep('success');
      setTimeout(() => {
        setShowDirectBilling(false);
        // Grant 1 year access
        const oneYear = 365 * 24 * 60 * 60 * 1000;
        localStorage.setItem('isPremium', 'true');
        localStorage.setItem('premium_expiry', (Date.now() + oneYear).toString());
        onUnlock(true);
      }, 2000);
    }, 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 md:p-10 font-sans max-w-2xl mx-auto text-right" dir="rtl">
      {/* Premium Banner Glowing */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/20 rounded-[32px] p-6 md:p-8 relative overflow-hidden shadow-sm"
      >
        {/* Sparkle effects */}
        <div className="absolute top-4 left-4 text-amber-500 opacity-60">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <div className="absolute bottom-4 right-8 text-amber-500/30">
          <Sparkles className="w-12 h-12" />
        </div>

        {/* Golden animated Lock */}
        <div className="flex justify-center mb-6">
          <motion.div 
            onClick={handleLockClick}
            animate={{ 
              y: [0, -8, 0],
              rotate: [0, 3, -3, 0]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-[24px] flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-300 cursor-pointer select-none"
          >
            <Lock className="w-10 h-10 text-white" />
          </motion.div>
        </div>

        <h2 className="text-2xl font-black text-center text-slate-800 dark:text-amber-400 mb-3">
          دسترسی به نسخه طلایی یک‌ساله گازینو
        </h2>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 text-center leading-relaxed mb-6 max-w-lg mx-auto">
          این ابزار جزء امکانات ویژه (طلایی) پورتال محاسباتی تاسیسات ساختمان است. جهت بازگشایی آنی تمامی بخش‌های قفل شده برنامه به مدت یک‌سال کامل، می‌توانید اشتراک طلایی را فعال فرمایید.
        </p>

        {/* Pricing Plan Info */}
        <div className="bg-white/80 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between mb-8 select-none shadow-sm">
          <div>
            <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-black ml-2 animate-pulse">تخفیف ویژه</span>
            <span className="text-slate-400 dark:text-slate-500 text-xs line-through ml-2 font-bold">۹۸۰,۰۰۰ تومان</span>
            <div className="text-lg font-black text-slate-800 dark:text-slate-100 mt-1">
              ۶۰۰,۰۰۰{" "}
              <span className="text-xs font-bold text-slate-500">تومان / اشتراک سالانه</span>
            </div>
          </div>
          <div className="text-left font-sans">
            <div className="text-xs font-black text-amber-600 dark:text-amber-400">مقررات ملی ساختمان</div>
            <div className="text-[9px] text-slate-400 font-bold mt-0.5">مباحث ١۴، ١۶ و ١٧</div>
          </div>
        </div>

        {/* Feature List */}
        <div className="space-y-4 mb-8 text-right bg-slate-50/50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-100/50 dark:border-slate-800">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">امکانات فوق‌العاده با خرید اشتراک:</h4>
          
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-black text-slate-700 dark:text-slate-200">سایزینگ پیشرفته لوله‌کشی گاز طبیعی</h5>
              <p className="text-[11px] text-slate-400 font-bold leading-relaxed mt-0.5">محاسبه اقطار لوله‌های فولادی و فواصل دودکشی بر اساس مبحث ۱۷ مقررات ملی ساختمان.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-black text-slate-700 dark:text-slate-200">محاسبات تخصصی هیدرولیک و ضدحریق</h5>
              <p className="text-[11px] text-slate-400 font-bold leading-relaxed mt-0.5">سایزبندی کلکتور اطفاء، محاسبات هد پمپ زون‌های حریق و اقطار جعبه‌های آتش‌نشانی.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-black text-slate-700 dark:text-slate-200">تاسیسات بهداشتی، آب باران و ناودان</h5>
              <p className="text-[11px] text-slate-400 font-bold leading-relaxed mt-0.5">محاسبات تخلیه شیب ثقلی لوله‌ها بر اساس میزان DFU و شیب فاضلاب مصوب مبحث ۱۶.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-black text-slate-700 dark:text-slate-200">کانال‌کشی و بار تهویه مطبوع ساختمان</h5>
              <p className="text-[11px] text-slate-400 font-bold leading-relaxed mt-0.5">محاسبات سرعت‌سنجی فیشر، افت فشار اصطکاکی هیدرولیکی برودتی حرارتی مبحث ۱۴.</p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button 
            onClick={handleBazaarPurchase}
            className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:opacity-95 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/10 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2.5"
          >
            <CreditCard className="w-4 h-4" />
            <span>خرید اشتراک طلایی (اتصال به کافه بازار)</span>
          </button>

          {/* Developer Bypass Mode hidden behind Lock taps */}
          {showDevBypass && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 space-y-3"
            >
              <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-center">
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-black flex items-center justify-center gap-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>حالت توسعه‌دهنده فعال شد. کد تستی اشتراک طلایی جهت ارزیابی داوران بازار:</span>
                </p>
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <span className="font-mono bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-lg text-xs font-bold select-all">GASINO_FREE_2026</span>
                  <button 
                    onClick={() => {
                      setActivationCode('GASINO_FREE_2026');
                      onUnlock(true);
                    }}
                    className="text-[10px] font-black text-blue-600 hover:underline cursor-pointer"
                  >
                    (اعمال خودکار)
                  </button>
                </div>
              </div>
              
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-bold">یا</span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              </div>

              {/* Enter bypass activation code manually */}
              <div className="flex gap-2 w-full">
                <input 
                  type="text"
                  placeholder="کد فعال‌سازی تستی"
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value)}
                  className="flex-1 px-4 py-3 bg-white dark:bg-slate-900 text-xs font-bold rounded-xl border border-slate-250 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 text-center uppercase font-mono"
                />
                <button 
                  onClick={handleBypassCode}
                  className="px-5 py-3 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-black text-xs rounded-xl active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  تایید
                </button>
              </div>
              {errorMessage && (
                <p className="text-[10px] font-black text-rose-500 text-center mt-1">{errorMessage}</p>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Simulated Cafe Bazaar App Checkout Modal Overlay */}
      <AnimatePresence>
        {showDirectBilling && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 font-sans select-none" dir="rtl">
            {/* Background Overlay */}
            <div className="absolute inset-0" onClick={() => setShowDirectBilling(false)} />

            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-white dark:bg-[#121c2e] border border-slate-100 dark:border-slate-800 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl relative z-10 text-right"
              style={{ direction: 'rtl' }}
            >
              {/* Cafe Bazaar Top Header Bar */}
              <div className="bg-[#1e7e34] text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-xs font-mono select-none">
                    ک‌ب
                  </div>
                  <div>
                    <h4 className="text-xs font-black">درگاه پرداخت بازار</h4>
                    <p className="text-[9px] opacity-70">ir.cafebazaar.pardakht</p>
                  </div>
                </div>
                <div className="text-left font-mono text-[8px] tracking-wider font-bold bg-white/10 px-2 py-0.5 rounded-full uppercase">
                  SECURED
                </div>
              </div>

              {/* Checkout Info */}
              <div className="p-6">
                {step === 'checkout' && (
                  <>
                    <h3 className="text-slate-800 dark:text-slate-100 font-black text-sm text-center mb-1">تایید پرداخت اشتراک طلایی</h3>
                    <p className="text-[10px] text-slate-400 font-bold text-center mb-6">پورتال محاسباتی گازینو (نسخه ۱ ساله واریزی)</p>
                    
                    <div className="space-y-3 mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold">نام محصول:</span>
                        <span className="text-slate-700 dark:text-slate-205 font-black text-right">دسترسی VIP کامل سالانه گازینو</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold">نام توسعه‌دهنده:</span>
                        <span className="text-slate-700 dark:text-slate-205 font-black text-right">تیم فنی مهندسی گازینو</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold">کاربر خریدار:</span>
                        <span className="text-slate-700 dark:text-slate-205 font-mono font-bold">RabiNateghi@gmail.com</span>
                      </div>
                      <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-2" />
                      <div className="flex justify-between items-center text-sm font-black">
                        <span className="text-slate-800 dark:text-slate-300">مجموع دریافتی:</span>
                        <span className="text-emerald-600 dark:text-emerald-400 text-base font-black">۶۰۰,۰۰۰ تومان</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={handleSimulatedPayment}
                        className="w-full py-3 bg-[#1e7e34] hover:bg-[#1a6b2c] text-white font-black text-xs rounded-xl shadow-md cursor-pointer text-center"
                      >
                        پرداخت با کارت شتاب (شبیه‌ساز موفق)
                      </button>
                      <button 
                        onClick={() => setShowDirectBilling(false)}
                        className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-black text-xs rounded-xl cursor-pointer text-center"
                      >
                        انصراف و بازگشت
                      </button>
                    </div>
                  </>
                )}

                {step === 'processing' && (
                  <div className="py-8 flex flex-col items-center justify-center text-center">
                    <div className="w-10 h-10 border-4 border-[#1e7e34] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-xs font-black text-slate-600 dark:text-slate-300">در حال تایید نهایی پرداخت از کافه بازار...</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-1">تراکنش در حال صدور می‌باشد</p>
                  </div>
                )}

                {step === 'success' && (
                  <div className="py-6 flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-500 mb-4 border border-emerald-100 dark:border-emerald-800">
                      <CheckCircle2 className="w-8 h-8 fill-emerald-50 dark:fill-transparent" />
                    </div>
                    <h3 className="text-emerald-600 dark:text-emerald-400 font-black text-sm mb-1">پرداخت با موفقیت تایید شد!</h3>
                    <p className="text-[10px] text-slate-400 font-bold">شماره تراکنش: BZ-849310</p>
                    <p className="text-xs font-black text-slate-600 dark:text-slate-300 mt-4 leading-relaxed">با سپاس، دسترسی طلایی ۱ ساله شما فعال شد. در حال بارگزاری مجدد محاسبات...</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
