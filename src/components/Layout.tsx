import { Outlet, Link, useLocation } from 'react-router';
import { useAuth } from '../lib/AuthContext';
import { auth, db, messaging } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import { useEffect } from 'react';
import { Trophy, Home, Settings, LogOut, BellRing } from 'lucide-react';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Layout() {
  const { user, isAdmin } = useAuth();
  const location = useLocation();

  useEffect(() => {
    async function setupNotifications() {
      if (!user || !messaging) return;
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // Note: In a real app you need the VAPID key in getToken({ vapidKey: '...' })
          const token = await getToken(messaging);
          if (token) {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const tokens = userSnap.data().fcmTokens || [];
              if (!tokens.includes(token)) {
                 await updateDoc(userRef, {
                   fcmTokens: [...tokens, token],
                   updatedAt: new Date().toISOString()
                 });
              }
            }
          }
        }
      } catch (e) {
        console.error("Error setting up notifications", e);
      }
    }
    setupNotifications();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
  };


  const navItems = [
    { name: 'Quiniela', path: '/', icon: Home },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    ...(isAdmin ? [{ name: 'Admin', path: '/admin', icon: Settings }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#0A0E17] text-white font-sans flex flex-col">
      <nav className="bg-[#111827] border-b border-slate-800 sticky top-0 z-10 shrink-0">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-emerald-400 rounded-lg flex items-center justify-center font-bold text-xl text-white shadow-lg">Q</div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">QUINIELA <span className="text-blue-500">2026</span></h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] hidden sm:block">World Cup Predictor</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-8">
             <div className="flex space-x-6 text-sm font-medium text-slate-400 uppercase tracking-wider">
               {navItems.map((item) => (
                 <Link key={item.path} to={item.path} className={cn("transition-colors pb-1", location.pathname === item.path ? "text-blue-400 border-b-2 border-blue-500" : "hover:text-white")}>
                   {item.name}
                 </Link>
               ))}
             </div>
             <div className="h-10 w-px bg-slate-800"></div>
             <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{user?.displayName || 'User'}</p>
                </div>
                <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
             </div>
          </div>
          <div className="sm:hidden flex items-center">
             <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
               <LogOut className="w-4 h-4" />
             </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <Outlet />
      </main>

      <nav className="bg-[#111827] border-t border-slate-800 sticky bottom-0 sm:hidden pb-safe">
        <div className="flex justify-around p-3">
           {navItems.map((item) => (
             <Link key={item.path} to={item.path} className={cn("flex flex-col items-center p-2 rounded-xl transition-colors", location.pathname === item.path ? "text-blue-400" : "text-slate-500 hover:text-slate-400")}>
               <item.icon className="w-6 h-6 mb-1" />
               <span className="text-[10px] uppercase font-bold tracking-wider">{item.name}</span>
             </Link>
           ))}
        </div>
      </nav>

      <footer className="hidden sm:flex h-12 bg-[#111827] border-t border-slate-800 items-center justify-between px-8 text-[10px] text-slate-500 font-mono shrink-0 uppercase tracking-[0.2em]">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
           <div className="flex items-center space-x-6">
             <span>Connected: Firebase</span>
             <span className="text-emerald-500">● Live Ticker Active</span>
           </div>
           <div>
             © 2026 MUNDIAL QUINIELA APP
           </div>
        </div>
      </footer>
    </div>
  );
}
