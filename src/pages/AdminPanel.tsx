import React, { useState, useEffect, FormEvent } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, updateDoc, getDocs, writeBatch, where, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Match, MatchStatus, Prediction, UserProfile } from '../types';
import { format } from 'date-fns';

const SEED_MATCHES = [
  { id: 'wc26_m1', homeTeam: 'Canadá', homeFlag: '🇨🇦', awayTeam: 'Togo', awayFlag: '🇹🇬', date: '2026-06-12T15:00:00Z', status: 'pending' },
  { id: 'wc26_m2', homeTeam: 'Estados Unidos', homeFlag: '🇺🇸', awayTeam: 'Bolivia', awayFlag: '🇧🇴', date: '2026-06-11T21:00:00Z', status: 'pending' },
  { id: 'wc26_m3', homeTeam: 'México', homeFlag: '🇲🇽', awayTeam: 'Sudáfrica', awayFlag: '🇿🇦', date: '2026-06-11T18:00:00Z', status: 'pending' },
  { id: 'wc26_m4', homeTeam: 'España', homeFlag: '🇪🇸', awayTeam: 'Escocia', awayFlag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', date: '2026-06-12T18:30:00Z', status: 'pending' },
  { id: 'wc26_m5', homeTeam: 'Argentina', homeFlag: '🇦🇷', awayTeam: 'Suecia', awayFlag: '🇸🇪', date: '2026-06-13T13:00:00Z', status: 'pending' },
  { id: 'wc26_m6', homeTeam: 'Francia', homeFlag: '🇫🇷', awayTeam: 'Australia', awayFlag: '🇦🇺', date: '2026-06-13T16:00:00Z', status: 'pending' },
  { id: 'wc26_m7', homeTeam: 'Uruguay', homeFlag: '🇺🇾', awayTeam: 'Argelia', awayFlag: '🇩🇿', date: '2026-06-13T19:00:00Z', status: 'pending' },
  { id: 'wc26_m8', homeTeam: 'Inglaterra', homeFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', awayTeam: 'Marruecos', awayFlag: '🇲🇦', date: '2026-06-14T12:00:00Z', status: 'pending' },
  { id: 'wc26_m9', homeTeam: 'Alemania', homeFlag: '🇩🇪', awayTeam: 'Camerún', awayFlag: '🇨🇲', date: '2026-06-14T15:00:00Z', status: 'pending' },
  { id: 'wc26_m10', homeTeam: 'Brasil', homeFlag: '🇧🇷', awayTeam: 'Corea del Sur', awayFlag: '🇰🇷', date: '2026-06-14T18:00:00Z', status: 'pending' },
  { id: 'wc26_m11', homeTeam: 'Países Bajos', homeFlag: '🇳🇱', awayTeam: 'Ecuador', awayFlag: '🇪🇨', date: '2026-06-15T14:00:00Z', status: 'pending' },
  { id: 'wc26_m12', homeTeam: 'Portugal', homeFlag: '🇵🇹', awayTeam: 'Arabia Saudita', awayFlag: '🇸🇦', date: '2026-06-15T17:00:00Z', status: 'pending' },
  { id: 'wc26_m13', homeTeam: 'Italia', homeFlag: '🇮🇹', awayTeam: 'Nigeria', awayFlag: '🇳🇬', date: '2026-06-15T20:00:00Z', status: 'pending' },
  { id: 'wc26_m14', homeTeam: 'Bélgica', homeFlag: '🇧🇪', awayTeam: 'Japón', awayFlag: '🇯🇵', date: '2026-06-16T15:00:00Z', status: 'pending' },
  { id: 'wc26_m15', homeTeam: 'Croacia', homeFlag: '🇭🇷', awayTeam: 'Costa Rica', awayFlag: '🇨🇷', date: '2026-06-16T18:00:00Z', status: 'pending' },
  { id: 'wc26_m16', homeTeam: 'Colombia', homeFlag: '🇨🇴', awayTeam: 'Ghana', awayFlag: '🇬🇭', date: '2026-06-16T21:00:00Z', status: 'pending' },
  { id: 'wc26_m17', homeTeam: 'México', homeFlag: '🇲🇽', awayTeam: 'Escocia', awayFlag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', date: '2026-06-17T18:00:00Z', status: 'pending' },
  { id: 'wc26_m18', homeTeam: 'Canadá', homeFlag: '🇨🇦', awayTeam: 'España', awayFlag: '🇪🇸', date: '2026-06-17T21:00:00Z', status: 'pending' },
  { id: 'wc26_m19', homeTeam: 'Estados Unidos', homeFlag: '🇺🇸', awayTeam: 'Togo', awayFlag: '🇹🇬', date: '2026-06-18T15:00:00Z', status: 'pending' },
  { id: 'wc26_m20', homeTeam: 'Argentina', homeFlag: '🇦🇷', awayTeam: 'Australia', awayFlag: '🇦🇺', date: '2026-06-18T18:00:00Z', status: 'pending' },
  { id: 'wc26_m21', homeTeam: 'Francia', homeFlag: '🇫🇷', awayTeam: 'Suecia', awayFlag: '🇸🇪', date: '2026-06-18T21:00:00Z', status: 'pending' },
  { id: 'wc26_m22', homeTeam: 'Inglaterra', homeFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', awayTeam: 'Camerún', awayFlag: '🇨🇲', date: '2026-06-19T15:00:00Z', status: 'pending' },
  { id: 'wc26_m23', homeTeam: 'Alemania', homeFlag: '🇩🇪', awayTeam: 'Marruecos', awayFlag: '🇲🇦', date: '2026-06-19T18:00:00Z', status: 'pending' },
  { id: 'wc26_m24', homeTeam: 'Brasil', homeFlag: '🇧🇷', awayTeam: 'Ecuador', awayFlag: '🇪🇨', date: '2026-06-19T21:00:00Z', status: 'pending' },
  { id: 'wc26_m25', homeTeam: 'Países Bajos', homeFlag: '🇳🇱', awayTeam: 'Corea del Sur', awayFlag: '🇰🇷', date: '2026-06-20T14:00:00Z', status: 'pending' },
  { id: 'wc26_m26', homeTeam: 'Portugal', homeFlag: '🇵🇹', awayTeam: 'Nigeria', awayFlag: '🇳🇬', date: '2026-06-20T17:00:00Z', status: 'pending' },
  { id: 'wc26_m27', homeTeam: 'Italia', homeFlag: '🇮🇹', awayTeam: 'Arabia Saudita', awayFlag: '🇸🇦', date: '2026-06-20T20:00:00Z', status: 'pending' },
  { id: 'wc26_m28', homeTeam: 'Bélgica', homeFlag: '🇧🇪', awayTeam: 'Colombia', awayFlag: '🇨🇴', date: '2026-06-21T15:00:00Z', status: 'pending' },
  { id: 'wc26_m29', homeTeam: 'Japón', homeFlag: '🇯🇵', awayTeam: 'Ghana', awayFlag: '🇬🇭', date: '2026-06-21T18:00:00Z', status: 'pending' },
  { id: 'wc26_m30', homeTeam: 'Croacia', homeFlag: '🇭🇷', awayTeam: 'Argelia', awayFlag: '🇩🇿', date: '2026-06-21T21:00:00Z', status: 'pending' },
];

export function AdminPanel() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [homeTeam, setHomeTeam] = useState('');
  const [homeFlag, setHomeFlag] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [awayFlag, setAwayFlag] = useState('');
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

  const handleCreateMatch = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newRef = doc(collection(db, 'matches'));
      await setDoc(newRef, {
        homeTeam,
        homeFlag: homeFlag.trim() || '🏳️',
        awayTeam,
        awayFlag: awayFlag.trim() || '🏳️',
        date: new Date(date).toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setHomeTeam('');
      setHomeFlag('');
      setAwayTeam('');
      setAwayFlag('');
      setDate('');
    } catch (e) {
      console.error(e);
      alert('Error creating match');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este partido? También se eliminarán los pronósticos de los usuarios para este encuentro.')) return;
    setLoading(true);
    try {
      const pQuery = query(collection(db, 'predictions'), where('matchId', '==', matchId));
      const pSnap = await getDocs(pQuery);
      const batch = writeBatch(db);
      pSnap.docs.forEach(d => {
        batch.delete(d.ref);
      });
      batch.delete(doc(db, 'matches', matchId));
      await batch.commit();
      alert('Partido y pronósticos asociados eliminados correctamente.');
    } catch (e: any) {
      console.error(e);
      alert('Error al eliminar partido: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedMatches = async () => {
    if (!window.confirm('¿Deseas cargar de forma automática los 30 partidos oficiales/predeterminados del Mundial 2026? Se importarán con sus banderas de países correspondientes.')) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      for (const m of SEED_MATCHES) {
        const mRef = doc(db, 'matches', m.id);
        batch.set(mRef, {
          homeTeam: m.homeTeam,
          homeFlag: m.homeFlag,
          awayTeam: m.awayTeam,
          awayFlag: m.awayFlag,
          date: m.date,
          status: m.status,
          createdAt: new Date().toISOString()
        });
      }
      await batch.commit();
      alert('¡30 partidos del Mundial 2026 cargados exitosamente de forma automática!');
    } catch (e: any) {
      console.error(e);
      alert('Error al cargar partidos predeterminados: ' + e.message);
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
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black italic tracking-tight text-white uppercase bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Admin Panel
          </h1>
          <p className="text-slate-400 text-xs font-medium tracking-wider uppercase">
            Gestión interna de partidos y distribución de puntos
          </p>
        </div>

        {/* Bulk Seeder Premium Button */}
        <button
          onClick={handleSeedMatches}
          disabled={loading}
          type="button"
          className="bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white font-bold uppercase tracking-widest text-xs rounded-2xl px-6 py-4 shadow-xl shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 border border-blue-400/20"
        >
          <span>🏆</span>
          <span>Cargar Partidos Mundial 2026</span>
        </button>
      </div>

      {/* Manual Creation Card */}
      <div className="bg-[#0F1420] p-6 rounded-3xl border border-slate-800 shadow-xl">
        <h2 className="text-lg font-bold mb-4 text-white uppercase tracking-wider flex items-center gap-2">
          <span>➕</span> Crear Partido Manualmente
        </h2>
        <form onSubmit={handleCreateMatch} className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
          <div>
             <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Local (ej: México)</label>
             <input required value={homeTeam} onChange={e=>setHomeTeam(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors" placeholder="México" />
          </div>
          <div className="w-full">
             <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Bandera Local (ej: 🇲🇽)</label>
             <input value={homeFlag} onChange={e=>setHomeFlag(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors text-center" placeholder="🇲🇽" />
          </div>
          <div>
             <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Visitante (ej: Togo)</label>
             <input required value={awayTeam} onChange={e=>setAwayTeam(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors" placeholder="Togo" />
          </div>
          <div className="w-full">
             <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Bandera Visit. (ej: 🇹🇬)</label>
             <input value={awayFlag} onChange={e=>setAwayFlag(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors text-center" placeholder="🇹🇬" />
          </div>
          <div className="sm:col-span-2">
             <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Fecha y Hora</label>
             <input required type="datetime-local" value={date} onChange={e=>setDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors [color-scheme:dark]" />
          </div>
          <div className="sm:col-span-3 flex justify-end">
             <button disabled={loading} type="submit" className="w-full sm:w-auto bg-blue-600 text-white font-extrabold uppercase tracking-widest text-[11px] rounded-xl px-6 py-4 hover:bg-blue-500 active:scale-98 transition-all cursor-pointer shadow-lg shadow-blue-600/10">
               {loading ? 'Procesando...' : 'Crear Encuentro'}
             </button>
          </div>
        </form>
      </div>

      {/* Match Management List */}
      <div className="bg-[#0F1420] p-6 rounded-3xl border border-slate-800 shadow-xl">
         <div className="flex items-center justify-between mb-6">
           <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
             <span>⚙️</span> Administrar Partidos ({matches.length})
           </h2>
           <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">ORDENADO POR FECHA DESC</span>
         </div>
         <div className="space-y-4">
            {matches.map(match => (
              <AdminMatchRow key={match.id} match={match} onFinalize={handleUpdateScore} onDelete={handleDeleteMatch} />
            ))}
            {matches.length === 0 && (
              <div className="text-center py-12 text-slate-500 font-mono text-sm uppercase tracking-widest border border-slate-800/60 border-dashed rounded-2xl">
                No hay partidos creados todavía en la base de datos. ¡Haz clic en el botón superior o crealos manualmente!
              </div>
            )}
         </div>
      </div>
    </div>
  );
}

function AdminMatchRow({ 
  match, 
  onFinalize,
  onDelete
}: { 
  match: Match, 
  onFinalize: (id: string, h: number, a: number) => Promise<void> | void, 
  onDelete: (id: string) => Promise<void> | void,
  key?: any 
}) {
    const [h, setH] = useState(match.homeScore?.toString() || '');
    const [a, setA] = useState(match.awayScore?.toString() || '');

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between border border-slate-800/80 p-5 rounded-2xl bg-slate-900/40 hover:bg-slate-900/60 transition-colors gap-4">
           <div>
               <div className="text-[10px] text-slate-500 mb-1.5 uppercase tracking-widest font-bold">
                 {format(new Date(match.date), 'dd/MM/yyyy - HH:mm')} HS
               </div>
               <div className="font-bold text-white text-base flex items-center gap-2 tracking-wide uppercase">
                 <span className="inline-block scale-110">{match.homeFlag}</span> 
                 <span>{match.homeTeam}</span> 
                 <span className="text-slate-500 font-normal px-1 text-xs">VS</span> 
                 <span className="inline-block scale-110">{match.awayFlag}</span> 
                 <span>{match.awayTeam}</span>
               </div>
               <div className="text-[10px] font-bold uppercase mt-1.5 tracking-widest text-slate-500/80 flex items-center gap-1.5">
                 <span>ESTADO:</span> 
                 <span className={match.status === 'finished' ? "text-slate-400 bg-slate-850 px-1.5 py-0.5 rounded" : "text-emerald-400 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10 font-bold"}>
                   {match.status === 'finished' ? 'FINALIZADO ✅' : 'PENDIENTE ⏳'}
                 </span>
               </div>
           </div>
           
           <div className="flex items-center gap-3 self-end md:self-center">
             {match.status === 'pending' ? (
                <div className="flex items-center gap-2">
                   <input type="number" min="0" value={h} onChange={e=>setH(e.target.value)} placeholder="0" className="w-12 h-10 bg-slate-950 border border-slate-705 text-white rounded-lg text-center font-bold font-mono focus:border-blue-500 focus:outline-none" />
                   <span className="text-slate-600 font-black font-mono">:</span>
                   <input type="number" min="0" value={a} onChange={e=>setA(e.target.value)} placeholder="0" className="w-12 h-10 bg-slate-950 border border-slate-705 text-white rounded-lg text-center font-bold font-mono focus:border-blue-500 focus:outline-none" />
                   <button 
                     onClick={() => onFinalize(match.id, parseInt(h), parseInt(a))} 
                     disabled={h==='' || a===''} 
                     className="bg-emerald-600 text-white px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                   >
                       Finalizar
                   </button>
                </div>
             ) : (
                 <div className="font-extrabold text-xl tracking-widest text-[#10b981] italic font-mono bg-emerald-500/5 border border-emerald-500/10 px-3 py-1 rounded-xl">
                     {match.homeScore} - {match.awayScore}
                 </div>
             )}

             <button 
               onClick={() => onDelete(match.id)}
               className="text-rose-400 hover:text-white bg-rose-500/5 hover:bg-rose-600 border border-rose-500/10 hover:border-rose-600 p-2.5 rounded-xl text-xs transition-all cursor-pointer duration-200"
               title="Eliminar partido de forma permanente"
             >
               🗑️
             </button>
           </div>
        </div>
    )
}
