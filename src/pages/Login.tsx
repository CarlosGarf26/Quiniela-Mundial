import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Link, useNavigate } from 'react-router';
import { Trophy } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to login');
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
          <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest">Sign In to Dashboard</p>
        </div>

        {error && <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 text-red-400 text-sm font-bold uppercase tracking-wider rounded-xl text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-950 border-2 border-slate-800 rounded-xl focus:border-blue-500 text-white outline-none transition-colors placeholder-slate-700 font-mono"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Password</label>
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
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs font-bold uppercase tracking-widest text-slate-500">
          New here? <Link to="/register" className="text-blue-400 hover:text-white transition-colors">Create account</Link>
        </p>
      </div>
    </div>
  );
}
