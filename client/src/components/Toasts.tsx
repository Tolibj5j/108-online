import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, Loader2, WifiOff } from 'lucide-react';
import { uz } from '../i18n/uz.ts';
import { useApp } from '../store/appStore.ts';

export function Toasts() {
  const toasts = useApp((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`flex max-w-md items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-xl ring-1 backdrop-blur ${
              t.tone === 'error'
                ? 'bg-red-950/90 text-red-50 ring-red-400/40'
                : t.tone === 'success'
                  ? 'bg-emerald-950/90 text-emerald-50 ring-emerald-400/40'
                  : 'bg-wood-900/95 text-gold-100 ring-gold-500/40'
            }`}
          >
            {t.tone === 'error' ? <AlertCircle className="h-4 w-4 shrink-0" /> : t.tone === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Info className="h-4 w-4 shrink-0" />}
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function ConnectionBanner() {
  const connection = useApp((s) => s.connection);
  const everConnected = useApp((s) => s.everConnected);
  if (connection === 'connected') return null;
  const lost = everConnected;
  return (
    <div className="fixed inset-x-0 bottom-3 z-[55] flex justify-center px-3">
      <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-xl ring-1 ${lost ? 'bg-red-950/90 text-red-50 ring-red-400/40' : 'bg-wood-900/90 text-gold-100 ring-gold-500/30'}`}>
        {lost ? <WifiOff className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
        {lost ? uz.connection.lost : uz.connection.connecting}
      </div>
    </div>
  );
}
