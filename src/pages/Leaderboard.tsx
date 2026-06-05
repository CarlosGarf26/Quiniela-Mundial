import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, limit, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile } from '../types';
import { Trophy, Medal } from 'lucide-react';
import { cn } from '../components/Layout';
import { useAuth } from '../lib/AuthContext';

export function Leaderboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();

  useEffect(() => {
     const q = query(collection(db, 'users'), orderBy('points', 'desc'), limit(100));
     const unsub = onSnapshot(q, (snapshot) => {
       const u: UserProfile[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
       setUsers(u);
       setLoading(false);
     }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));
     return () => unsub();
  }, []);

  if (loading) return <div className="flex-1 flex items-center justify-center py-12 text-blue-500 uppercase tracking-widest font-mono text-sm animate-pulse">Loading standings...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold uppercase italic tracking-tight text-white">Tabla General</h1>
        <p className="text-slate-400 text-sm">Top predictors in the tournament.</p>
      </div>

      <div className="bg-[#0F1420] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                <th className="px-6 py-4 text-center w-16">Rank</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {users.map((u, index) => {
                 const rank = index + 1;
                 const isCurrentUser = currentUser?.uid === u.id;
                 return (
                   <tr key={u.id} className={cn("transition-colors hover:bg-white/5", isCurrentUser && "bg-blue-600/10 hover:bg-blue-600/20")}>
                     <td className="px-6 py-4">
                       <div className="flex justify-center">
                         {rank === 1 ? <Medal className="w-6 h-6 text-yellow-500"/> :
                          rank === 2 ? <Medal className="w-6 h-6 text-slate-400"/> :
                          rank === 3 ? <Medal className="w-6 h-6 text-amber-600"/> :
                          <span className="text-slate-500 font-mono font-bold text-xs">{rank.toString().padStart(2, '0')}</span>}
                       </div>
                     </td>
                     <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <span className={cn("font-medium text-sm", isCurrentUser ? "text-blue-400 font-bold italic" : "text-white")}>
                             {u.displayName}
                           </span>
                           {isCurrentUser && <span className="px-2 py-0.5 rounded text-[8px] uppercase tracking-widest font-bold bg-blue-500 text-white">You</span>}
                        </div>
                     </td>
                     <td className="px-6 py-4 text-right">
                        <span className="font-bold font-mono text-emerald-400">{u.points}</span>
                     </td>
                   </tr>
                 )
              })}
              {users.length === 0 && (
                 <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-slate-500 font-mono text-sm uppercase tracking-widest">
                       No users yet.
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
