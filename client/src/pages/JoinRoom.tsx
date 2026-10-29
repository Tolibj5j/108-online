import { DoorOpen, RotateCcw } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { MAX_NAME_LENGTH, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '../../../shared/constants/index.ts';
import { Button, Field, inputClass, ScreenFrame } from '../components/ui.tsx';
import { uz } from '../i18n/uz.ts';
import { joinRoom, resume, setRoomInUrl } from '../socket/actions.ts';
import { sessions } from '../socket/session.ts';
import { appStore, goTo, useApp } from '../store/appStore.ts';
import { prefsStore, setPrefs } from '../store/preferences.ts';

const cleanCode = (v: string) =>
  [...v.toUpperCase()]
    .filter((ch) => ROOM_CODE_ALPHABET.includes(ch))
    .join('')
    .slice(0, ROOM_CODE_LENGTH);

export function JoinRoom() {
  const joinCode = useApp((s) => s.joinCode);
  const connected = useApp((s) => s.connection === 'connected');
  const resuming = useApp((s) => s.resuming);
  const [code, setCode] = useState(() => cleanCode(joinCode));
  const [name, setName] = useState(() => prefsStore.get().name);
  const [busy, setBusy] = useState(false);
  const [remembered, setRemembered] = useState(() => sessions.remembered());
  const canContinue = remembered && remembered.roomCode === code;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (code.length !== ROOM_CODE_LENGTH || !name.trim()) return;
    setBusy(true);
    setPrefs({ name: name.trim() });
    await joinRoom(code, name.trim());
    setBusy(false);
  };

  return (
    <ScreenFrame
      title={uz.join.title}
      onBack={() => {
        setRoomInUrl(null);
        appStore.set({ joinCode: '' });
        goTo('menu');
      }}
    >
      {canContinue && (
        <div className="mb-6 rounded-xl bg-gold-500/10 p-3 ring-1 ring-gold-500/40">
          <Button
            className="w-full"
            icon={<RotateCcw className="h-5 w-5" />}
            disabled={!connected || resuming}
            onClick={async () => {
              const r = await resume(remembered.token, true);
              if (!r.ok) setRemembered(sessions.remembered());
            }}
          >
            {uz.join.continueAs(remembered.name)}
          </Button>
          <p className="mt-2 text-center text-xs text-white/60">{uz.join.orNew}</p>
        </div>
      )}
      <form onSubmit={submit} className="space-y-5">
        <Field label={uz.common.roomCode}>
          <input
            className={`${inputClass} text-center font-mono text-2xl uppercase tracking-[0.4em]`}
            value={code}
            placeholder={uz.join.codePlaceholder}
            onChange={(e) => setCode(cleanCode(e.target.value))}
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            required
            autoFocus={!code}
          />
        </Field>
        <Field label={uz.common.yourName}>
          <input
            className={inputClass}
            value={name}
            maxLength={MAX_NAME_LENGTH}
            placeholder={uz.common.namePlaceholder}
            onChange={(e) => setName(e.target.value)}
            autoComplete="nickname"
            required
            autoFocus={!!code}
          />
        </Field>
        <Button
          type="submit"
          className="w-full py-4 text-lg"
          disabled={busy || !connected || code.length !== ROOM_CODE_LENGTH || !name.trim()}
          icon={<DoorOpen className="h-5 w-5" />}
        >
          {uz.join.submit}
        </Button>
      </form>
    </ScreenFrame>
  );
}
