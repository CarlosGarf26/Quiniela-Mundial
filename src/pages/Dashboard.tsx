import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Match, Prediction } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Save, Check, Lock, Unlock, Calendar, Clock, Award, AlertTriangle, FileText, CheckCircle2, ListChecks, HelpCircle } from 'lucide-react';
import { cn } from '../components/Layout';

export function Dashboard() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [loading, setLoading] = useState(true);
  const [saves, setSaves] = useState<Record<string, 'idle' | 'saving' | 'saved'>>({});
  const [activeTab, setActiveTab] = useState<'quiniela' | 'proximos' | 'resultados'>('quiniela');

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

  const handleSavePrediction = async (match: Match, homeScore: number, awayScore: number, isDefinitive: boolean) => {
    if (!user) return;
    if (match.status !== 'pending') return;

    setSaves(prev => ({ ...prev, [match.id]: 'saving' }));
    
    try {
      const existing = predictions[match.id];
      if (existing) {
        if (existing.isDefinitive) {
          throw new Error("Esta predicción ya ha sido confirmada como definitiva y no puede ser modificada.");
        }
        await updateDoc(doc(db, 'predictions', existing.id), {
          predictedHomeScore: homeScore,
          predictedAwayScore: awayScore,
          isDefinitive,
          updatedAt: new Date().toISOString()
        });
      } else {
        const newRef = doc(collection(db, 'predictions'));
        await setDoc(newRef, {
          userId: user.uid,
          matchId: match.id,
          predictedHomeScore: homeScore,
          predictedAwayScore: awayScore,
          isDefinitive,
          pointsEarned: 0,
          createdAt: new Date().toISOString()
        });
      }
      setSaves(prev => ({ ...prev, [match.id]: 'saved' }));
      setTimeout(() => setSaves(prev => ({ ...prev, [match.id]: 'idle' })), 2000);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Error al guardar la predicción');
      setSaves(prev => ({ ...prev, [match.id]: 'idle' }));
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-blue-500 uppercase tracking-widest font-mono text-sm animate-pulse">
        <Clock className="w-8 h-8 mb-4 animate-spin text-blue-400" />
        Cargando partidos...
      </div>
    );
  }

  // Calculate statistics
  const predsArray = Object.values(predictions) as Prediction[];
  const totalPoints = predsArray.reduce((sum, p) => sum + (p.pointsEarned || 0), 0);
  const totalPredictions = predsArray.length;
  const definitiveCount = predsArray.filter(p => p.isDefinitive).length;
  const draftCount = predsArray.filter(p => !p.isDefinitive).length;
  const pendingPendingPredictions = matches.filter(m => m.status === 'pending' && !predictions[m.id]?.isDefinitive).length;

  return (
    <div className="space-y-8">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black italic tracking-tight text-white uppercase bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Panel de Quiniela
          </h1>
          <p className="text-slate-400 text-xs font-medium tracking-wider uppercase">
            Mundial 2026 • Estado actual de tus pronósticos
          </p>
        </div>

        {/* Mini Stats Grid */}
        <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800/80 max-w-md w-full md:w-auto">
          <div className="text-center px-2 py-1.5 rounded-xl bg-slate-950/40 border border-slate-800/40">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider font-mono">Pts</div>
            <div className="text-lg font-black text-emerald-400 italic font-mono">{totalPoints}</div>
          </div>
          <div className="text-center px-2 py-1.5 rounded-xl bg-slate-950/40 border border-slate-800/40">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider font-mono">Bloqueados</div>
            <div className="text-lg font-black text-blue-400 italic font-mono">{definitiveCount}</div>
          </div>
          <div className="text-center px-2 py-1.5 rounded-xl bg-slate-950/40 border border-slate-800/40">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider font-mono">Borrador</div>
            <div className="text-lg font-black text-amber-500 italic font-mono">{draftCount}</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex p-1 bg-slate-900 border border-slate-800/80 rounded-2xl max-w-lg">
        <button
          onClick={() => setActiveTab('quiniela')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
            activeTab === 'quiniela' 
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          )}
        >
          <ListChecks className="w-4 h-4" />
          Llenar Quiniela
          {pendingPendingPredictions > 0 && (
            <span className="ml-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] px-1.5 py-0.5 rounded-md font-mono">
              {pendingPendingPredictions}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('proximos')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
            activeTab === 'proximos' 
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          )}
        >
          <Calendar className="w-4 h-4" />
          Próximos Partidos
        </button>

        <button
          onClick={() => setActiveTab('resultados')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
            activeTab === 'resultados' 
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          )}
        >
          <Award className="w-4 h-4" />
          Resultados
        </button>
      </div>

      {/* Warning Tip for Draft Mode */}
      {activeTab === 'quiniela' && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-sm text-slate-300">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-amber-400">¿Cómo funciona la Quiniela?</span> Puedes guardar tus pronósticos como un <span className="font-bold text-amber-400">Borrador</span> temporal e irlos modificando. Para asegurarlos, haz clic en <span className="font-bold text-emerald-400">🔒 Guardar Definitiva</span>. Una vez confirmada como definitiva, <span className="underline">no existirá ningún modo de cambiarla o cancelarla</span>, garantizando un juego limpio y seguro.
          </div>
        </div>
      )}

      {/* Content Rendering based on Selected Tab */}
      <div className="grid gap-6 lg:grid-cols-2">
        {activeTab === 'quiniela' && (
          <>
            {matches.filter(m => m.status === 'pending').map(match => {
              const prediction = predictions[match.id];
              const saveState = saves[match.id] || 'idle';

              return (
                <div 
                  key={match.id} 
                  className={cn(
                    "rounded-3xl border p-6 flex flex-col relative overflow-hidden transition-all duration-300 shadow-xl", 
                    prediction?.isDefinitive 
                      ? "bg-gradient-to-b from-slate-900/40 to-slate-950/90 border-slate-800/50 opacity-90 hover:opacity-100" 
                      : prediction 
                        ? "bg-[#0c1421] border-amber-500/10 shadow-amber-900/5"
                        : "bg-[#0F1420] border-slate-800/80"
                  )}
                >
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {format(new Date(match.date), "d 'de' MMMM, HH:mm", { locale: es })}
                    </span>
                    {prediction?.isDefinitive ? (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                        <Lock className="w-3 h-3" /> DEFINITIVA 🔒
                      </span>
                    ) : prediction ? (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                        <Unlock className="w-3 h-3 animate-pulse" /> BORRADOR 📝
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        PENDIENTE 🔮
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-around mb-6">
                    <div className="flex-1 flex flex-col items-center">
                       {match.homeFlag && (
                         <div className="w-18 h-12 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center text-3xl mb-3 shadow-inner">
                           {match.homeFlag}
                         </div>
                       )}
                       <span className="font-bold text-white text-center uppercase tracking-widest text-xs sm:text-sm">{match.homeTeam}</span>
                    </div>
                    <div className="text-slate-600 font-extrabold px-3 text-xs tracking-wider">VS</div>
                    <div className="flex-1 flex flex-col items-center">
                       {match.awayFlag && (
                         <div className="w-18 h-12 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center text-3xl mb-3 shadow-inner">
                           {match.awayFlag}
                         </div>
                       )}
                       <span className="font-bold text-white text-center uppercase tracking-widest text-xs sm:text-sm">{match.awayTeam}</span>
                    </div>
                  </div>

                  <PredictionInputRow 
                    match={match} 
                    prediction={prediction} 
                    onSave={handleSavePrediction} 
                    saveState={saveState}
                  />
                </div>
              );
            })}
            {matches.filter(m => m.status === 'pending').length === 0 && (
              <div className="lg:col-span-2 text-center py-16 text-slate-500 bg-[#0F1420] border border-slate-800/60 border-dashed rounded-3xl font-mono text-sm uppercase tracking-wider">
                No hay partidos pendientes en este momento.
              </div>
            )}
          </>
        )}

        {activeTab === 'proximos' && (
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Calendario de Próximos Partidos
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {matches.filter(m => m.status === 'pending').map(match => {
                const prediction = predictions[match.id];
                return (
                  <div key={match.id} className="bg-[#0F1420] border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/60 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                          {format(new Date(match.date), "EE d 'de' MMM, HH:mm", { locale: es })}
                        </span>
                        {prediction ? (
                          prediction.isDefinitive ? (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded-md border border-emerald-500/10 flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Dictado Definitivo
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/5 px-2 py-0.5 rounded-md border border-amber-500/10 flex items-center gap-1">
                              <Unlock className="w-3 h-3" /> Borrador Guardado
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-800/40 px-2 py-0.5 rounded-md border border-slate-700/40">
                            Sin Pronóstico
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between py-2 border-b border-slate-800/50">
                        <span className="text-sm font-semibold text-white tracking-wide uppercase">{match.homeTeam}</span>
                        <span className="text-slate-400 font-bold font-mono text-sm">{match.homeFlag}</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-semibold text-white tracking-wide uppercase">{match.awayTeam}</span>
                        <span className="text-slate-400 font-bold font-mono text-sm">{match.awayFlag}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 uppercase font-mono">Tu pronóstico:</span>
                      {prediction ? (
                        <span className={cn("text-sm font-black tracking-wide font-mono italic", prediction.isDefinitive ? "text-emerald-400" : "text-amber-400")}>
                          {prediction.predictedHomeScore} - {prediction.predictedAwayScore}
                        </span>
                      ) : (
                        <span className="text-xs font-bold font-mono text-rose-500/80 uppercase">
                          No Apostado ⚠️
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {matches.filter(m => m.status === 'pending').length === 0 && (
                <div className="md:col-span-2 text-center py-16 text-slate-500 bg-[#0F1420] border border-slate-800/60 border-dashed rounded-3xl font-mono text-sm uppercase tracking-wider">
                  No hay partidos programados pendientes.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'resultados' && (
          <>
            {matches.filter(m => m.status === 'finished').map(match => {
              const prediction = predictions[match.id];

              return (
                <div key={match.id} className="rounded-3xl border bg-gradient-to-r from-slate-950 to-[#0c1322] border-emerald-500/10 p-6 flex flex-col relative overflow-hidden shadow-xl">
                  <div className="text-xs font-semibold text-slate-500 mb-6 text-center uppercase tracking-[0.15em]">
                    {format(new Date(match.date), "d 'de' MMMM, HH:mm", { locale: es })}
                  </div>
                  
                  <div className="flex items-center justify-around mb-6">
                    <div className="flex-1 flex flex-col items-center">
                       {match.homeFlag && <div className="w-18 h-12 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center text-3xl mb-3 shadow-inner">{match.homeFlag}</div>}
                       <span className="font-bold text-white text-center uppercase tracking-widest text-xs">{match.homeTeam}</span>
                    </div>
                    <div className="text-slate-700 font-bold px-3">VS</div>
                    <div className="flex-1 flex flex-col items-center">
                       {match.awayFlag && <div className="w-18 h-12 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center text-3xl mb-3 shadow-inner">{match.awayFlag}</div>}
                       <span className="font-bold text-white text-center uppercase tracking-widest text-xs">{match.awayTeam}</span>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col gap-4 bg-slate-950/40 rounded-2xl p-4 border border-slate-800/80">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Marcador Oficial</div>
                        <div className="text-3xl tracking-tighter font-black text-white italic font-mono">
                          {match.homeScore} <span className="text-slate-600 text-xl font-normal mx-1">:</span> {match.awayScore}
                        </div>
                      </div>

                      {prediction ? (
                        <div className="flex flex-col items-end text-right">
                          <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">
                            Tu predicción ({prediction.isDefinitive ? 'Definitiva' : 'Borrador'})
                          </div>
                          <div className={cn("text-base font-extrabold font-mono tracking-wider italic", prediction.isDefinitive ? "text-emerald-400" : "text-amber-500")}>
                            {prediction.predictedHomeScore} - {prediction.predictedAwayScore}
                          </div>
                          <div className={cn("mt-2 px-3 py-1 rounded-lg border text-[10px] font-mono font-bold uppercase tracking-wider", 
                              (prediction.pointsEarned || 0) > 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-800/50 text-slate-500 border-slate-700"
                          )}>
                            +{prediction.pointsEarned || 0} PTS
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end text-right">
                          <span className="text-xs font-bold text-rose-500/80 uppercase font-mono italic">No apostaste ⚠️</span>
                          <span className="text-[10px] text-slate-600 uppercase font-bold mt-1">+0 PTS</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {matches.filter(m => m.status === 'finished').length === 0 && (
              <div className="lg:col-span-2 text-center py-16 text-slate-500 bg-[#0F1420] border border-slate-800/60 border-dashed rounded-3xl font-mono text-sm uppercase tracking-wider">
                No hay partidos finalizados aún en esta tanda.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PredictionInputRow({ 
  match, 
  prediction, 
  onSave, 
  saveState 
}: { 
  match: Match, 
  prediction?: Prediction, 
  onSave: (match: Match, h: number, a: number, isDef: boolean) => Promise<void>,
  saveState: 'idle' | 'saving' | 'saved'
}) {
  const [homeScore, setHomeScore] = useState(prediction?.predictedHomeScore?.toString() || '');
  const [awayScore, setAwayScore] = useState(prediction?.predictedAwayScore?.toString() || '');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (prediction) {
      setHomeScore(prediction.predictedHomeScore?.toString() || '');
      setAwayScore(prediction.predictedAwayScore?.toString() || '');
    }
  }, [prediction]);

  const isAlreadyDefinitive = prediction?.isDefinitive || false;

  const handleAction = async (isDef: boolean) => {
    const h = parseInt(homeScore);
    const a = parseInt(awayScore);
    if (!isNaN(h) && !isNaN(a) && h >= 0 && a >= 0) {
      await onSave(match, h, a, isDef);
      setShowConfirm(false);
    }
  };

  const isChanged = prediction 
    ? (homeScore !== prediction.predictedHomeScore?.toString() || awayScore !== prediction.predictedAwayScore?.toString())
    : (homeScore !== '' && awayScore !== '');

  const hasCompleteInput = homeScore !== '' && awayScore !== '';

  if (isAlreadyDefinitive) {
    return (
      <div className="bg-slate-950/60 rounded-2xl p-4.5 mt-auto border border-emerald-500/10">
        <div className="flex items-center justify-center gap-4 mb-4">
           <div className="w-16 h-12 flex items-center justify-center text-2xl font-black italic bg-slate-950/40 border border-slate-800 rounded-lg text-emerald-400 font-mono">
             {homeScore}
           </div>
           <span className="text-slate-600 font-extrabold font-mono">:</span>
           <div className="w-16 h-12 flex items-center justify-center text-2xl font-black italic bg-slate-950/40 border border-slate-800 rounded-lg text-emerald-400 font-mono">
             {awayScore}
           </div>
        </div>
        <div className="px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-400">
           <Lock className="w-3.5 h-3.5 text-emerald-400" />
           <span>Predicción guardada definitivamente</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950/40 rounded-2xl p-4 mt-auto border border-slate-800/60">
      <div className="flex items-center justify-center gap-4">
         <input 
            type="number" 
            min="0"
            max="50"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            className="w-16 h-12 text-center text-2xl font-black italic bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none placeholder:text-slate-800 transition-colors font-mono"
            placeholder="-"
         />
         <span className="text-slate-600 font-bold">:</span>
         <input 
            type="number" 
            min="0"
            max="50"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            className="w-16 h-12 text-center text-2xl font-black italic bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-blue-500 focus:outline-none placeholder:text-slate-800 transition-colors font-mono"
            placeholder="-"
         />
      </div>

      {showConfirm ? (
        <div className="mt-4 p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 text-center animate-fade-in">
          <p className="text-[11px] font-bold text-rose-400 uppercase tracking-widest mb-3">
             ⚠️ ¿Seguro de guardar como definitiva? No podrás cambiarla después.
          </p>
          <div className="grid grid-cols-2 gap-2">
             <button 
               onClick={() => handleAction(true)}
               disabled={saveState === 'saving'}
               className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-colors"
             >
                <Check className="w-3.5 h-3.5" /> Sí, Confirmar
             </button>
             <button 
               onClick={() => setShowConfirm(false)}
               className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider cursor-pointer transition-colors"
             >
                Cancelar
             </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
             {/* Save as Draft */}
             <button 
               onClick={() => handleAction(false)}
               disabled={!isChanged || !hasCompleteInput || saveState === 'saving'}
               className={cn(
                 "py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border",
                 saveState === 'saved' && !prediction?.isDefinitive ? "bg-amber-500/10 text-amber-500 border-amber-500/25" :
                 (isChanged && hasCompleteInput) ? "bg-slate-800 hover:bg-slate-700 text-amber-500 border-slate-700/60" :
                 "bg-slate-900/40 text-slate-500 border-slate-800/60 opacity-60"
               )}
             >
                {saveState === 'saving' && <span className="animate-pulse">Guardando...</span>}
                {saveState === 'saved' && !prediction?.isDefinitive ? <><Check className="w-3.5 h-3.5" /> Guardado!</> : "Borrador 📝"}
             </button>

             {/* Save as Definitive */}
             <button 
               onClick={() => setShowConfirm(true)}
               disabled={!hasCompleteInput || saveState === 'saving'}
               className={cn(
                 "py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border",
                 hasCompleteInput ? "bg-emerald-600/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-600/20" :
                 "bg-slate-900/40 text-slate-500 border-slate-800/60 opacity-60"
               )}
             >
                Definitiva 🔒
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
