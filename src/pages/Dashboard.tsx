import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Match, Prediction } from '../types';
import { format, isPast } from 'date-fns';
import { Save, Check } from 'lucide-react';
import { cn } from '../components/Layout';

export function Dashboard() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [loading, setLoading] = useState(true);
  const [saves, setSaves] = useState<Record<string, 'idle' | 'saving' | 'saved'>>({});

  useEffect(() => {
    if (!user) return;
    
    // Subscribe to matches
    const qMatches = query(collection(db, 'matches'), orderBy('date', 'asc'));
    const unsubMatches = onSnapshot(qMatches, (snapshot) => {
      const ms: Match[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      setMatches(ms);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'matches'));

    // Subscribe to current user's predictions
    const qPredictions = query(collection(db, 'predictions'), where('userId', '==', user.uid));
    const unsubPredictions = onSnapshot(qPredictions, (snapshot) => {
      const pmap: Record<string, Prediction> = {};
      snapshot.docs.forEach(doc => {
        const p = { id: doc.id, ...doc.data() } as Prediction;
        pmap[p.matchId] = p;
      });
      setPredictions(pmap);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'predictions'));

    return () => { unsubMatches(); unsubPredictions(); };
  }, [user]);

  const handlePredict = async (match: Match, homeScore: number, awayScore: number) => {
    if (!user) return;
    if (match.status !== 'pending') return;

    setSaves(prev => ({ ...prev, [match.id]: 'saving' }));
    
    try {
      const existing = predictions[match.id];
      if (existing) {
        await updateDoc(doc(db, 'predictions', existing.id), {
          predictedHomeScore: homeScore,
          predictedAwayScore: awayScore,
          updatedAt: new Date().toISOString()
        });
      } else {
        const newRef = doc(collection(db, 'predictions'));
        await setDoc(newRef, {
          userId: user.uid,
          matchId: match.id,
          predictedHomeScore: homeScore,
          predictedAwayScore: awayScore,
          pointsEarned: 0,
          createdAt: new Date().toISOString()
        });
      }
      setSaves(prev => ({ ...prev, [match.id]: 'saved' }));
      setTimeout(() => setSaves(prev => ({ ...prev, [match.id]: 'idle' })), 2000);
    } catch (error) {
      console.error(error);
      setSaves(prev => ({ ...prev, [match.id]: 'idle' }));
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center py-12 text-blue-500 uppercase tracking-widest font-mono text-sm animate-pulse">Loading matches...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold uppercase italic tracking-tight text-white">Match Predictions</h1>
        <p className="text-slate-400 text-sm">Jornada 2 • 15 de Junio, 2026</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {matches.map(match => {
          const prediction = predictions[match.id];
          const isPending = match.status === 'pending';
          const matchDate = new Date(match.date);
          const saveState = saves[match.id] || 'idle';

          return (
            <div key={match.id} className={cn("rounded-3xl border p-6 flex flex-col relative overflow-hidden", isPending ? "bg-slate-900 border-slate-800" : "bg-gradient-to-r from-slate-900 to-[#1e293b] border-emerald-500/30")}>
              <div className="text-xs font-semibold text-slate-500 mb-6 text-center uppercase tracking-[0.2em]">
                {format(matchDate, 'MMM d, yyyy - HH:mm')}
              </div>
              
              <div className="flex items-center justify-around mb-6">
                <div className="flex-1 flex flex-col items-center">
                   {match.homeFlag && <div className="w-20 h-14 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center text-4xl mb-3 shadow-inner">{match.homeFlag}</div>}
                   <span className="font-bold text-white text-center uppercase tracking-widest text-sm">{match.homeTeam}</span>
                </div>
                <div className="text-slate-600 font-bold px-4">VS</div>
                <div className="flex-1 flex flex-col items-center">
                   {match.awayFlag && <div className="w-20 h-14 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center text-4xl mb-3 shadow-inner">{match.awayFlag}</div>}
                   <span className="font-bold text-white text-center uppercase tracking-widest text-sm">{match.awayTeam}</span>
                </div>
              </div>

              {!isPending ? (
                 <div className="mt-auto flex justify-between items-center bg-slate-950/50 rounded-2xl p-4 border border-slate-800">
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Final Score</div>
                        <div className="text-3xl tracking-tighter font-black text-white italic">
                          {match.homeScore} <span className="text-slate-600 text-xl font-normal mx-1">:</span> {match.awayScore}
                        </div>
                      </div>
                    </div>
                    {prediction && (
                      <div className="flex flex-col items-end text-right">
                        <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Tu apuesta</div>
                        <div className="text-sm font-bold text-emerald-400 uppercase tracking-wider italic">
                          {prediction.predictedHomeScore} - {prediction.predictedAwayScore}
                        </div>
                        <div className={cn("mt-2 px-3 py-1 rounded border text-[10px] font-mono", 
                            (prediction.pointsEarned || 0) > 0 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-slate-800/50 text-slate-500 border-slate-700"
                        )}>
                          +{(prediction.pointsEarned || 0)} PTS
                        </div>
                      </div>
                    )}
                 </div>
              ) : (
                <PredictionInput 
                   match={match} 
                   prediction={prediction} 
                   onSave={(h, a) => handlePredict(match, h, a)} 
                   saveState={saveState}
                />
              )}
            </div>
          );
        })}
        {matches.length === 0 && (
           <div className="lg:col-span-2 text-center py-12 text-slate-500 bg-[#0F1420] border border-slate-800 border-dashed rounded-3xl font-mono text-sm uppercase tracking-wider">
             No matches scheduled yet. Check back later!
           </div>
        )}
      </div>
    </div>
  );
}

function PredictionInput({ 
  match, 
  prediction, 
  onSave, 
  saveState 
}: { 
  match: Match, 
  prediction?: Prediction, 
  onSave: (h: number, a: number) => void,
  saveState: 'idle' | 'saving' | 'saved'
}) {
  const [homeScore, setHomeScore] = useState(prediction?.predictedHomeScore?.toString() || '');
  const [awayScore, setAwayScore] = useState(prediction?.predictedAwayScore?.toString() || '');

  const handleSave = () => {
    const h = parseInt(homeScore);
    const a = parseInt(awayScore);
    if (!isNaN(h) && !isNaN(a) && h >= 0 && a >= 0) {
      onSave(h, a);
    }
  };

  const isChanged = prediction 
    ? (homeScore !== prediction.predictedHomeScore?.toString() || awayScore !== prediction.predictedAwayScore?.toString())
    : (homeScore !== '' && awayScore !== '');

  return (
    <div className="bg-[#0F1420] rounded-2xl p-4 mt-auto border border-slate-800">
      <div className="flex items-center justify-center gap-4">
         <input 
            type="number" 
            min="0"
            max="50"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            className="w-16 h-12 text-center text-2xl font-black italic bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none placeholder:text-slate-800 transition-colors"
            placeholder="-"
         />
         <span className="text-slate-600 font-bold">:</span>
         <input 
            type="number" 
            min="0"
            max="50"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            className="w-16 h-12 text-center text-2xl font-black italic bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none placeholder:text-slate-800 transition-colors"
            placeholder="-"
         />
      </div>
      <div className="mt-4 flex justify-center">
         <button 
           onClick={handleSave}
           disabled={!isChanged || homeScore === '' || awayScore === '' || saveState === 'saving'}
           className={cn("px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all w-full",
             saveState === 'saved' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
             isChanged ? "bg-blue-600 text-white hover:bg-blue-500" :
             "bg-slate-800 text-slate-500"
           )}
         >
            {saveState === 'saving' && <span className="animate-pulse">Saving...</span>}
            {saveState === 'saved' && <><Check className="w-4 h-4"/> Saved</>}
            {saveState === 'idle' && (prediction && !isChanged ? "Saved" : "Save Prediction")}
         </button>
      </div>
    </div>
  )
}
