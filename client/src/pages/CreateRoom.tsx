import { PlusCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { DEFAULT_SETTINGS, MAX_NAME_LENGTH } from '../../../shared/constants/index.ts';
import type { RoomSettings } from '../../../shared/types/index.ts';
import { SettingsForm } from '../components/SettingsForm.tsx';
import { Button, Field, inputClass, ScreenFrame } from '../components/ui.tsx';
import { uz } from '../i18n/uz.ts';
import { createRoom } from '../socket/actions.ts';
import { goTo, useApp } from '../store/appStore.ts';
import { prefsStore, setPrefs } from '../store/preferences.ts';

export function CreateRoom() {
  const [name, setName] = useState(() => prefsStore.get().name);
  const [settings, setSettings] = useState<RoomSettings>({ ...DEFAULT_SETTINGS });
  const [busy, setBusy] = useState(false);
  const connected = useApp((s) => s.connection === 'connected');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setPrefs({ name: trimmed });
    await createRoom(trimmed, settings);
    setBusy(false);
  };

  return (
    <ScreenFrame title={uz.create.title} onBack={() => goTo('menu')} wide>
      <form onSubmit={submit} className="space-y-6">
        <Field label={uz.common.yourName}>
          <input
            className={inputClass}
            value={name}
            maxLength={MAX_NAME_LENGTH}
            placeholder={uz.common.namePlaceholder}
            onChange={(e) => setName(e.target.value)}
            autoComplete="nickname"
            required
            autoFocus
          />
        </Field>
        <SettingsForm value={settings} onChange={(p) => setSettings((s) => ({ ...s, ...p }))} />
        <Button type="submit" className="w-full py-4 text-lg" disabled={busy || !connected || !name.trim()} icon={<PlusCircle className="h-5 w-5" />}>
          {uz.create.submit}
        </Button>
      </form>
    </ScreenFrame>
  );
}
