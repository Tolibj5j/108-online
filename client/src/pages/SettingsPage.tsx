import { MAX_NAME_LENGTH } from '../../../shared/constants/index.ts';
import { Field, inputClass, ScreenFrame, Segmented, Toggle } from '../components/ui.tsx';
import { uz } from '../i18n/uz.ts';
import { playSound } from '../socket/sounds.ts';
import { goTo } from '../store/appStore.ts';
import { setPrefs, usePrefs } from '../store/preferences.ts';
import type { SortMode } from '../utils/cards.ts';

export function SettingsPage() {
  const name = usePrefs((p) => p.name);
  const sound = usePrefs((p) => p.sound);
  const reducedMotion = usePrefs((p) => p.reducedMotion);
  const sortHand = usePrefs((p) => p.sortHand);

  return (
    <ScreenFrame title={uz.settings.title} onBack={() => goTo('menu')}>
      <div className="space-y-5">
        <Field label={uz.settings.defaultName}>
          <input
            className={inputClass}
            value={name}
            maxLength={MAX_NAME_LENGTH}
            placeholder={uz.common.namePlaceholder}
            onChange={(e) => setPrefs({ name: e.target.value })}
          />
        </Field>
        <Toggle
          checked={sound}
          label={uz.settings.sound}
          onChange={(v) => {
            setPrefs({ sound: v });
            if (v) playSound('turn');
          }}
        />
        <Toggle checked={reducedMotion} label={uz.settings.reducedMotion} onChange={(v) => setPrefs({ reducedMotion: v })} />
        <Field label={uz.settings.sortHand}>
          <Segmented<SortMode>
            value={sortHand}
            options={(['suit', 'rank', 'none'] as const).map((m) => ({ value: m, label: uz.settings.sortModes[m] }))}
            onChange={(v) => setPrefs({ sortHand: v })}
          />
        </Field>
      </div>
    </ScreenFrame>
  );
}
