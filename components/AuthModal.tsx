import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  syncUserProfile, 
  getUserProfile 
} from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { 
  Phone, 
  Lock, 
  User, 
  X, 
  LogOut, 
  CheckCircle, 
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  Crown
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (userId: string, phoneNumber: string, isPremium: boolean) => void;
  currentUserId: string | null;
  currentUserPhone: string | null;
  currentUserName: string | null;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  currentUserId,
  currentUserPhone,
  currentUserName,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [wasLoggedInOnOpen, setWasLoggedInOnOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setWasLoggedInOnOpen(!!currentUserId);
    }
  }, [isOpen]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Validate and normalize phone numbers
  const validatePhone = (num: string) => {
    const cleanNum = num.trim().replace(/[\s-+]/g, '');
    if (!/^\d{10,12}$/.test(cleanNum)) {
      return null;
    }
    // Normalize to 11 digits format starting with 0
    let formatted = cleanNum;
    if (cleanNum.startsWith('98')) {
      formatted = '0' + cleanNum.substring(2);
    } else if (!cleanNum.startsWith('0') && cleanNum.length === 10) {
      formatted = '0' + cleanNum;
    }
    return formatted;
  };

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const formattedPhone = validatePhone(phoneNumber);
    if (!formattedPhone) {
      setError('لطفاً یک شماره موبایل معتبر (مانند ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید.');
      return;
    }

    if (password.length < 6) {
      setError('رمز عبور باید حداقل ۶ کاراکتر باشد.');
      return;
    }

    if (activeTab === 'register' && !fullName.trim()) {
      setError('لطفاً نام و نام خانوادگی خود را وارد کنید.');
      return;
    }

    // Map phone to internal email string to bypass Iranian SMS block & keep standard auth FREE
    const mappedEmail = `${formattedPhone}@gasino.internal`;

    setLoading(true);
    let success = false;
    try {
      if (activeTab === 'register') {
        // Register using standard credentials
        const credential = await createUserWithEmailAndPassword(auth, mappedEmail, password);
        const user = credential.user;
        
        // Save initial database record under standard structure in background (non-blocking)
        syncUserProfile(user.uid, formattedPhone, fullName, false, 0).catch(err => {
          console.warn("Background sync error:", err);
        });
        
        setSuccessMsg('ثبت‌نام شما با موفقیت انجام شد! 🎉');
        success = true;
        onAuthSuccess(user.uid, formattedPhone, false);
        onClose();
      } else {
        // Login
        const credential = await signInWithEmailAndPassword(auth, mappedEmail, password);
        const user = credential.user;
        
        // Non-blocking lookup of local cached profile if any
        let isPremiumActive = false;
        try {
          const cached = localStorage.getItem(`profile_${user.uid}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            isPremiumActive = parsed.isPremium || false;
          }
        } catch {
          // ignore
        }
        
        setSuccessMsg('ورود به حساب کاربری با موفقیت انجام شد! 🌟');
        success = true;
        onAuthSuccess(
          user.uid, 
          formattedPhone, 
          isPremiumActive
        );
        onClose();
      }
    } catch (err: any) {
      console.warn('Auth action error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('همکار گرامی، این شماره موبایل قبلاً ثبت‌نام شده است.\n\nراهنما: لطفاً از تب "ورود به حساب" در بالا استفاده کنید و رمز عبور خود را وارد نمایید.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('شماره موبایل یا رمز عبور اشتباه است.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('خطای فعال‌سازی: روش ثبت‌نام با ایمیل و رمز عبور (Email/Password) در کنسول فایربیس شما فعال نشده است.\n\nراهنما: لطفاً به آدرس console.firebase.google.com رفته، پروژه خود را انتخاب کنید، به مسیر Authentication > Sign-in method بروید و روش Email/Password را فعال (Enable) کنید.');
      } else {
        setError('خطایی رخ داد. لطفاً دوباره تلاش کنید.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutClick = () => {
    signOut(auth)
      .then(() => {
        onLogout();
        onClose();
      })
      .catch((err) => {
        console.warn('Logout error:', err);
      });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        id="auth-backdrop"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-150 p-6 no-print dark:bg-slate-900 dark:border-slate-800"
        id="auth-content"
      >
        {/* Head branding */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-sans text-lg font-bold text-slate-900 dark:text-white">
                {wasLoggedInOnOpen && currentUserId ? 'حساب کاربری گازینو' : 'ورود / عضویت'}
              </h3>
              <p className="font-sans text-xs text-slate-500 dark:text-slate-400">
                {wasLoggedInOnOpen && currentUserId ? 'مدیریت و همگام‌سازی اطلاعات' : 'محاسبات خود را در ابرها ذخیره کنید'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            id="auth-close-btn"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {wasLoggedInOnOpen && currentUserId ? (
          /* Profile view when logged in */
          <div className="space-y-6 py-2" id="logged-in-panel">
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-850">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-bold text-lg">
                  {currentUserName ? currentUserName[0] : <User className="h-6 w-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-sans text-base font-bold text-slate-900 truncate dark:text-white">
                    {currentUserName || 'کاربر گرامی'}
                  </h4>
                  <p className="font-mono text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {currentUserPhone || 'نامشخص'}
                  </p>
                </div>
                {/* Golden Badge if Premium */}
                {localStorage.getItem('isPremium') === 'true' && (
                  <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full text-xs font-bold border border-amber-500/20">
                    <Crown className="w-3.5 h-3.5" />
                    <span>طلایی</span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-blue-500/5 p-3.5 rounded-xl border border-blue-500/10">
              <strong>💡 راهنما:</strong> حساب کاربری شما به پایگاه داده ابری متصل است. در صورت خرید اشتراک طلایی، وضعیت اشتراک شما روی ابرها ذخیره شده و با نصب برنامه روی سایر دیوایس‌ها نیز بلافاصله فعال خواهد شد.
            </div>

            <button
              onClick={handleLogoutClick}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition-all hover:bg-rose-100 dark:bg-rose-900/15 dark:text-rose-400 dark:hover:bg-rose-900/25"
              id="logout-btn"
            >
              <LogOut className="h-4 w-4" />
              <span>خروج از حساب کاربری</span>
            </button>
          </div>
        ) : (
          /* Authentication Form */
          <div id="auth-form-panel">
            {/* Tabs selector */}
            <div className="flex rounded-lg bg-slate-100 p-1 mb-5 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => { setActiveTab('login'); setError(null); }}
                className={`flex-1 rounded-md py-2 text-center text-sm font-bold transition-all ${
                  activeTab === 'login' 
                    ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-white' 
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                id="tab-login"
              >
                ورود به حساب
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('register'); setError(null); }}
                className={`flex-1 rounded-md py-2 text-center text-sm font-bold transition-all ${
                  activeTab === 'register' 
                    ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-white' 
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                id="tab-register"
              >
                ایجاد حساب جدید
              </button>
            </div>

            <form onSubmit={handleAction} className="space-y-4">
              {/* Alert Feedback */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex gap-2 rounded-xl bg-rose-50 border border-rose-100 p-3.5 text-xs text-rose-700 dark:bg-rose-900/10 dark:border-rose-900/20 dark:text-rose-400"
                    id="auth-error-alert"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="whitespace-pre-line leading-relaxed">{error}</span>
                  </motion.div>
                )}
                {successMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3.5 text-xs text-emerald-700 dark:bg-emerald-900/10 dark:border-emerald-900/20 dark:text-emerald-400"
                    id="auth-success-alert"
                  >
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{successMsg}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Full Name for register */}
              {activeTab === 'register' && (
                <div className="space-y-1.5" id="fullname-field">
                  <label className="font-sans text-xs font-semibold text-slate-700 dark:text-slate-300">
                    نام و نام خانوادگی
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      dir="rtl"
                      placeholder="مانند: ربیع ناطقی"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 font-sans text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all dark:border-slate-800 dark:bg-slate-900"
                    />
                    <User className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  </div>
                </div>
              )}

              {/* Phone number field */}
              <div className="space-y-1.5" id="phone-field">
                <label className="font-sans text-xs font-semibold text-slate-700 dark:text-slate-300">
                  شماره موبایل
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    dir="ltr"
                    placeholder="09123456789"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d+]/g, ''))}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-4 pr-10 font-mono text-sm tracking-wider focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all dark:border-slate-800 dark:bg-slate-900 text-right"
                  />
                  <Phone className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5" id="pass-field">
                <label className="font-sans text-xs font-semibold text-slate-700 dark:text-slate-300">
                  رمز عبور
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    dir="ltr"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-10 font-mono text-sm tracking-widest focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all dark:border-slate-800 dark:bg-slate-900 text-right"
                  />
                  <Lock className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-3.5 text-slate-400 hover:text-slate-650 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 py-3.5 font-sans text-sm font-bold text-white transition-all shadow-md shadow-blue-500/10 hover:bg-blue-700 active:scale-98 disabled:opacity-50 disabled:pointer-events-none mt-2 flex items-center justify-center gap-2"
                id="auth-submit-btn"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <span>{activeTab === 'login' ? 'ورود به حساب کاربری' : 'ایجاد حساب جدید'}</span>
                )}
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </div>
  );
};
