import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, updateDoc, getDocs, writeBatch, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Match, MatchStatus, Prediction, UserProfile } from '../types';
import { format } from 'date-fns';

export function AdminPanel() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const qMatches = query(collection(db, 'matches'), orderBy('date', 'desc'));
    const unsubMatches = onSnapshot(qMatches, (snapshot) => {
      const ms: Match[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      setMatches(ms);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'matches'));
    return () => unsubMatches();
  }, []);

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newRef = doc(collection(db, 'matches'));
      await setDoc(newRef, {
        homeTeam,
        awayTeam,
        date: new Date(date).toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setHomeTeam('');
      setAwayTeam('');
      setDate('');
    } catch (e) {
      console.error(e);
      alert('Error creating match');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateScore = async (matchId: string, homeScore: number, awayScore: number) => {
    if (!window.confirm(`Are you sure you want to finalize this match and distribute points? (${homeScore} - ${awayScore})`)) return;
    
    // 1. Fetch all predictions for this match
    try {
        const pQuery = query(collection(db, 'predictions'), where('matchId', '==', matchId));
        const pSnap = await getDocs(pQuery);
        const predictions = pSnap.docs.map(d => ({id: d.id, ...d.data()}) as Prediction);

        // 2. Fetch all users to update their points
        const uQuery = query(collection(db, 'users'));
        const uSnap = await getDocs(uQuery);
        const users = new Map<string, UserProfile>();
        uSnap.docs.forEach(d => users.set(d.id, {id: d.id, ...d.data()} as UserProfile));

        const batch = writeBatch(db);

        // Update match status
        const matchRef = doc(db, 'matches', matchId);
        batch.update(matchRef, {
            homeScore,
            awayScore,
            status: 'finished',
            updatedAt: new Date().toISOString()
        });

        // 3. Calculate points
        const userPointGains = new Map<string, number>();

        const actualResult = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw';

        for (const pred of predictions) {
            let pts = 0;
            const predResult = pred.predictedHomeScore > pred.predictedAwayScore ? 'home' : pred.predictedHomeScore < pred.predictedAwayScore ? 'away' : 'draw';
            
            if (pred.predictedHomeScore === homeScore && pred.predictedAwayScore === awayScore) {
                pts = 3; // exact score
            } else if (actualResult === predResult) {
                pts = 1; // exact outcome
            }

            if (pts > 0) {
               const pRef = doc(db, 'predictions', pred.id);
               batch.update(pRef, { pointsEarned: pts, updatedAt: new Date().toISOString() });
               userPointGains.set(pred.userId, (userPointGains.get(pred.userId) || 0) + pts);
            }
        }

        // 4. Update users
        userPointGains.forEach((gained, userId) => {
            const u = users.get(userId);
            if (u) {
                const uRef = doc(db, 'users', userId);
                batch.update(uRef, { points: u.points + gained, updatedAt: new Date().toISOString() });
            }
        });

        await batch.commit();
        alert('Match finalized and points distributed!');
    } catch (e: any) {
        console.error(e);
        alert('Error: ' + e.message);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold uppercase italic tracking-tight text-white">Admin Panel</h1>
      </div>

      <div className="bg-[#0F1420] p-6 rounded-3xl border border-slate-800 shadow-xl">
        <h2 className="text-lg font-bold mb-4 text-white uppercase tracking-wider">Add New Match</h2>
        <form onSubmit={handleCreateMatch} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
             <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Home Team</label>
             <input required value={homeTeam} onChange={e=>setHomeTeam(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors" />
          </div>
          <div>
             <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Away Team</label>
             <input required value={awayTeam} onChange={e=>setAwayTeam(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors" />
          </div>
          <div>
             <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Date & Time</label>
             <input required type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors [color-scheme:dark]" />
          </div>
          <button disabled={loading} type="submit" className="bg-blue-600 text-white font-bold uppercase tracking-widest text-xs rounded-xl px-4 py-3.5 hover:bg-blue-500 transition-colors cursor-pointer">
            Create Match
          </button>
        </form>
      </div>

      <div className="bg-[#0F1420] p-6 rounded-3xl border border-slate-800 shadow-xl">
         <h2 className="text-lg font-bold mb-4 text-white uppercase tracking-wider">Manage Matches</h2>
         <div className="space-y-4">
            {matches.map(match => (
              <AdminMatchRow key={match.id} match={match} onFinalize={handleUpdateScore} />
            ))}
         </div>
      </div>
    </div>
  );
}

function AdminMatchRow({ match, onFinalize }: { match: Match, onFinalize: (id: string, h: number, a: number) => void }) {
    const [h, setH] = useState(match.homeScore?.toString() || '');
    const [a, setA] = useState(match.awayScore?.toString() || '');

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border border-slate-800 p-4 rounded-xl bg-slate-900/50">
           <div>
               <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-widest font-bold">{format(new Date(match.date), 'MMM d, yyyy - HH:mm')}</div>
               <div className="font-bold text-white uppercase tracking-wider">{match.homeTeam} vs {match.awayTeam}</div>
               <div className="text-[10px] font-bold uppercase mt-1 tracking-widest text-slate-500">Status: <span className={match.status === 'finished' ? "text-slate-400" : "text-emerald-400"}>{match.status}</span></div>
           </div>
           
           {match.status === 'pending' ? (
              <div className="mt-4 sm:mt-0 flex items-center gap-3">
                 <input type="number" min="0" value={h} onChange={e=>setH(e.target.value)} placeholder="0" className="w-14 bg-slate-950 border border-slate-700 text-white rounded-lg p-2 text-center focus:border-blue-500 focus:outline-none" />
                 <span className="text-slate-600 font-bold">:</span>
                 <input type="number" min="0" value={a} onChange={e=>setA(e.target.value)} placeholder="0" className="w-14 bg-slate-950 border border-slate-700 text-white rounded-lg p-2 text-center focus:border-blue-500 focus:outline-none" />
                 <button onClick={() => onFinalize(match.id, parseInt(h), parseInt(a))} disabled={h==='' || a===''} className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50">
                     Finalize
                 </button>
              </div>
           ) : (
               <div className="mt-4 sm:mt-0 font-black text-2xl tracking-widest text-white italic">
                   {match.homeScore} <span className="text-slate-600 text-xl font-normal mx-1">:</span> {match.awayScore}
               </div>
           )}
        </div>
    )
}
