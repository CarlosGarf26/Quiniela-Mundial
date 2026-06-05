import { useState, FormEvent } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Link, useNavigate } from 'react-router';
import { Trophy } from 'lucide-react';

const mapAuthErrorToSpanish = (errCode: string): string => {
  switch (errCode) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'El correo electrónico o la contraseña son incorrectos. Por favor, verifícalos.';
    case 'auth/invalid-email':
      return 'El formato del correo electrónico ingresado no es válido.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos fallidos consecutivos. Por favor, inténtalo de nuevo en unos minutos.';
    case 'auth/network-request-failed':
      return 'Error de red. Verifica tu conexión a internet.';
    case 'auth/popup-closed-by-user':
      return 'Se cerró la ventana de inicio de sesión de Google antes de completarse.';
    default:
      return 'Ocurrió un error inesperado al iniciar sesión. Por favor intenta de nuevo.';
  }
};

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      const errorCode = err.code || (err.message && err.message.match(/\((auth\/[^)]+)\)/)?.[1]);
      if (errorCode && errorCode.startsWith('auth/')) {
        setError(mapAuthErrorToSpanish(errorCode));
      } else {
        const details = err.code ? `[${err.code}] ${err.message}` : err.message;
        setError(details || 'Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user doc exists in firestore, if not, create it
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          displayName: user.displayName || 'Nuevo Usuario',
          email: user.email || '',
          points: 0,
          fcmTokens: [],
          isAdmin: user.email?.toLowerCase().includes('admin') || false,
          createdAt: new Date().toISOString()
        });
      }
      
      navigate('/');
    } catch (err: any) {
      console.error(err);
      const errorCode = err.code || (err.message && err.message.match(/\((auth\/[^)]+)\)/)?.[1]);
      if (errorCode && errorCode.startsWith('auth/')) {
        setError(mapAuthErrorToSpanish(errorCode));
      } else {
        const details = err.code ? `[${err.code}] ${err.message}` : err.message;
        setError(details || 'Error al iniciar sesión con Google');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A0E17] p-4 text-white">
      <div className="w-full max-w-md bg-[#0F1420] rounded-[32px] shadow-2xl border border-slate-800 p-8 relative overflow-hidden">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-emerald-400 rounded-2xl flex items-center justify-center font-bold text-4xl mb-6 shadow-lg border border-white/10">Q</div>
          <h1 className="text-3xl font-bold tracking-tight text-white uppercase italic">QUINIELA <span className="text-blue-500">2026</span></h1>
          <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest">Iniciar Sesión</p>
        </div>

        {error && <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 text-red-400 text-sm font-bold uppercase tracking-wider rounded-xl text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-950 border-2 border-slate-800 rounded-xl focus:border-blue-500 text-white outline-none transition-colors placeholder-slate-700 font-mono"
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-950 border-2 border-slate-800 rounded-xl focus:border-blue-500 text-white outline-none transition-colors placeholder-slate-700 font-mono"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold uppercase tracking-widest text-xs rounded-xl transition-colors cursor-pointer"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#0F1420] px-2 text-slate-500 font-bold tracking-widest text-[9px]">O conéctate con</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-4 bg-slate-950 border-2 border-slate-800 hover:bg-slate-900 text-white font-bold uppercase tracking-widest text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          Ingresar con Google
        </button>

        <p className="mt-8 text-center text-xs font-bold uppercase tracking-widest text-slate-500">
          ¿Nuevo aquí? <Link to="/register" className="text-blue-400 hover:text-white transition-colors">Crear cuenta</Link>
        </p>
      </div>
    </div>
  );
}
