import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Megaphone, ExternalLink, MessageSquare, Sparkles } from 'lucide-react';

export interface AdvertisementData {
  id: string;
  imageUrl: string;
  targetUrl: string;
  title?: string;
  isActive: boolean;
  order?: number;
  mediaType?: 'image' | 'video';
  isVideo?: boolean;
}

// Helper to determine if the media is a video (either explicitly declared, or detected via url suffix)
export const isVideoSource = (ad: AdvertisementData): boolean => {
  if (ad.isVideo || ad.mediaType === 'video') return true;
  const url = ad.imageUrl;
  if (!url) return false;
  
  const cleanUrl = url.split('?')[0].toLowerCase();
  return (
    cleanUrl.endsWith('.mp4') ||
    cleanUrl.endsWith('.webm') ||
    cleanUrl.endsWith('.ogg') ||
    cleanUrl.endsWith('.mov') ||
    cleanUrl.endsWith('.m4v') ||
    url.toLowerCase().includes('.mp4?') ||
    url.toLowerCase().includes('.webm?') ||
    url.toLowerCase().includes('.mov?') ||
    url.toLowerCase().includes('.m4v?')
  );
};

interface AdBannerProps {
  onContactClick?: () => void;
}

export const AdBanner: React.FC<AdBannerProps> = ({ onContactClick }) => {
  const [ads, setAds] = useState<AdvertisementData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const adsCollection = collection(db, 'advertisements');
    const q = query(adsCollection, where('isActive', '==', true));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const adsList: AdvertisementData[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          adsList.push({
            id: doc.id,
            imageUrl: data.imageUrl || '',
            targetUrl: data.targetUrl || '',
            title: data.title || '',
            isActive: !!data.isActive,
            order: typeof data.order === 'number' ? data.order : 0,
            mediaType: data.mediaType || undefined,
            isVideo: !!data.isVideo,
          });
        });

        // Sort by order ascending
        adsList.sort((a, b) => (a.order || 0) - (b.order || 0));
        setAds(adsList);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'advertisements');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Auto rotate ads every 6 seconds if there are multiple
  useEffect(() => {
    if (ads.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [ads.length]);

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto h-28 md:h-36 bg-slate-100 dark:bg-slate-800/50 rounded-2xl md:rounded-[2rem] border border-slate-200/50 dark:border-slate-700/50 animate-pulse flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-blue-500 animate-spin" />
          <span className="text-xs text-slate-400 dark:text-slate-500 font-sans font-medium">در حال دریافت تبلیغات فعال...</span>
        </div>
      </div>
    );
  }

  // Fallback / Placeholder Banner if no active ads are stored in Firestore
  if (ads.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl mx-auto overflow-hidden rounded-2xl md:rounded-[2.2rem] bg-gradient-to-r from-blue-600/10 via-slate-50 to-blue-600/5 dark:from-blue-950/20 dark:via-slate-900/40 dark:to-blue-950/10 border border-blue-100/60 dark:border-blue-900/30 p-4 md:p-6 relative group"
        dir="rtl"
      >
        {/* Animated ambient corner light */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-all duration-700" />
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10 text-right">
          <div className="flex items-center gap-3 md:gap-4 select-none">
            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900 flex items-center justify-center shadow-sm shrink-0">
              <Megaphone className="text-blue-600 dark:text-blue-400 w-5 h-5 animate-bounce-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> تبلیغات هدفمند مهندسی
                </span>
              </div>
              <h3 className="text-sm md:text-base font-black text-slate-800 dark:text-slate-100 mt-1">
                محل درج آگهی شما در اپلیکیشن تخصصی گازینو
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium leading-relaxed">
                ارائه مستقیم خدمات و کالا به هزاران مهندس ناظر، طراح و مجری تاسیسات سراسر کشور
              </p>
            </div>
          </div>

          <button
            onClick={onContactClick}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs shadow-md md:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>ثبت آگهی و مشاوره</span>
          </button>
        </div>
      </motion.div>
    );
  }

  const currentAd = ads[currentIndex];

  const handleAdClick = () => {
    if (!currentAd.targetUrl) return;
    try {
      // Safely open the banner link in a new tab (e.g. web link or custom anchor)
      window.open(currentAd.targetUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.error("Failed to open advertisement link:", e);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto overflow-hidden rounded-2xl md:rounded-[2.2rem] border border-slate-200/60 dark:border-slate-800/40 shadow-md relative bg-white dark:bg-slate-900" dir="rtl">
      {/* Dynamic Slide Section */}
      <div 
        onClick={handleAdClick}
        className="cursor-pointer relative overflow-hidden group h-28 md:h-36 block w-full"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentAd.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 w-full h-full flex items-center justify-between"
          >
            {/* Full background banner media (image or video) with cover */}
            {isVideoSource(currentAd) ? (
              <video
                src={currentAd.imageUrl}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 select-none pointer-events-none"
              />
            ) : (
              <img 
                src={currentAd.imageUrl} 
                alt={currentAd.title || 'Gasino Sponsor'} 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 select-none pointer-events-none"
                referrerPolicy="no-referrer"
              />
            )}
            
            {/* Transparent overlay styling for readability and visual flair */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/30 to-transparent flex flex-col justify-end p-4 md:p-6" />

            {/* Title / Action Icon floating on top-left or top-right */}
            <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 text-right z-10 pointer-events-none">
              <span className="bg-blue-600/95 text-white text-[9px] md:text-[10px] font-black tracking-wider px-2 py-0.5 rounded-md uppercase">
                اسپانسر رسمی
              </span>
              <h4 className="text-white text-sm md:text-lg font-black mt-1 text-shadow">
                {currentAd.title || 'تبلیغ هدفمند گازینو'}
              </h4>
            </div>

            {/* Action hover indicator on left */}
            <div className="absolute left-4 bottom-4 md:left-6 md:bottom-6 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-blue-600 dark:text-blue-400 font-black text-[10px] shadow-sm">
                <span>مشاهده وب‌سایت</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide Indicators for multiple ads */}
      {ads.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
          {ads.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                idx === currentIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
              }`}
              title={`اسلاید ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
