import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';

const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'];

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function pressKey(key) {
    setError('');
    if (key === 'clear') {
      setPin('');
    } else if (key === 'back') {
      setPin((p) => p.slice(0, -1));
    } else if (pin.length < 8) {
      setPin((p) => p + key);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!pin) return;
    setSubmitting(true);
    setError('');
    try {
      await login(pin);
      navigate('/orders');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Giris basarisiz oldu.');
      setPin('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-slate-100">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg"
      >
        <h1 className="mb-1 text-center text-3xl font-bold text-slate-800">Airport Cafe</h1>
        <p className="mb-6 text-center text-slate-500">PIN kodunuzu girin</p>

        {/* PIN'in kendisini asla ekranda goze gorunur yazmiyoruz, sadece
            kac hane girildigini nokta olarak gosteriyoruz. */}
        <div className="mb-6 flex h-14 items-center justify-center gap-3 rounded-xl bg-slate-50 text-3xl tracking-widest">
          {pin.length === 0 && <span className="text-base text-slate-400">••••</span>}
          {Array.from({ length: pin.length }).map((_, i) => (
            <span key={i} className="text-slate-800">
              ●
            </span>
          ))}
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <div className="mb-6 grid grid-cols-3 gap-3">
          {KEYPAD_KEYS.map((key) => (
            <button
              type="button"
              key={key}
              onClick={() => pressKey(key)}
              className="h-16 rounded-xl bg-slate-100 text-2xl font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-95"
            >
              {key === 'clear' ? 'Temizle' : key === 'back' ? '⌫' : key}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={!pin || submitting}
          className="h-14 w-full rounded-xl bg-indigo-600 text-xl font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {submitting ? 'Giris yapiliyor...' : 'Giris Yap'}
        </button>
      </form>
    </div>
  );
}
