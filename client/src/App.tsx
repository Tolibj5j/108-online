import { MotionConfig } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { ConnectionBanner, Toasts } from './components/Toasts.tsx';
import { uz } from './i18n/uz.ts';
import { CreateRoom } from './pages/CreateRoom.tsx';
import { GamePage } from './pages/GamePage.tsx';
import { JoinRoom } from './pages/JoinRoom.tsx';
import { Lobby } from './pages/Lobby.tsx';
import { MainMenu } from './pages/MainMenu.tsx';
import { RulesPage } from './pages/RulesPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { initConnection } from './socket/actions.ts';
import { sessions } from './socket/session.ts';
import { useApp } from './store/appStore.ts';
import { usePrefs } from './store/preferences.ts';

function Screen() {
  const state = useApp((s) => s.state);
  const screen = useApp((s) => s.screen);
  const resuming = useApp((s) => s.resuming);
  const connection = useApp((s) => s.connection);

  if (state) {
    if (state.room.status === 'lobby' || !state.game) return <Lobby state={state} />;
    return <GamePage state={state} />;
  }

  // While this tab is restoring its own session, avoid flashing the menu.
  if ((resuming || connection === 'connecting') && sessions.tab()) {
    return (
      <div className="flex min-h-dvh items-center justify-center gap-3 text-gold-200">
        <Loader2 className="h-6 w-6 animate-spin" /> {uz.common.loading}
      </div>
    );
  }

  switch (screen) {
    case 'create':
      return <CreateRoom />;
    case 'join':
      return <JoinRoom />;
    case 'rules':
      return <RulesPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <MainMenu />;
  }
}

export function App() {
  const reducedMotion = usePrefs((p) => p.reducedMotion);
  useEffect(() => initConnection(), []);
  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'user'}>
      <main className="app-bg min-h-dvh text-white">
        <Screen />
      </main>
      <Toasts />
      <ConnectionBanner />
    </MotionConfig>
  );
}
