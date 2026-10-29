import { MAX_HAND_SIZE, MAX_PLAYERS, MIN_HAND_SIZE, MIN_PLAYERS, totalCardsFor } from '../../../shared/constants/index.ts';
import type { MatchRule, QueenRule, RoomSettings } from '../../../shared/types/index.ts';
import { uz } from '../i18n/uz.ts';
import { Field, OptionCards, Segmented, Toggle } from './ui.tsx';

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** Room settings editor shared by "Create room" and the lobby (read-only for guests). */
export function SettingsForm({
  value,
  onChange,
  disabled = false,
  minPlayers = MIN_PLAYERS,
}: {
  value: RoomSettings;
  onChange: (patch: Partial<RoomSettings>) => void;
  disabled?: boolean;
  minPlayers?: number;
}) {
  const need = value.maxPlayers * value.handSize + 1;
  const have = totalCardsFor(value.deckCount);

  return (
    <div className="space-y-5">
      <Field label={uz.create.maxPlayers}>
        <Segmented
          ariaLabel={uz.create.maxPlayers}
          value={value.maxPlayers}
          disabled={disabled}
          options={range(Math.max(MIN_PLAYERS, minPlayers), MAX_PLAYERS).map((n) => ({ value: n, label: n }))}
          onChange={(maxPlayers) => onChange({ maxPlayers })}
        />
      </Field>

      <Field label={uz.create.deckCount}>
        <Segmented
          ariaLabel={uz.create.deckCount}
          value={value.deckCount}
          disabled={disabled}
          options={[1, 2].map((n) => ({ value: n as 1 | 2, label: uz.create.deckOption(n) }))}
          onChange={(deckCount) => onChange({ deckCount })}
        />
      </Field>

      <Field
        label={uz.create.handSize}
        hint={need > have ? <span className="text-amber-300">{uz.create.notEnoughCards(need, have)}</span> : undefined}
      >
        <Segmented
          ariaLabel={uz.create.handSize}
          value={value.handSize}
          disabled={disabled}
          options={range(MIN_HAND_SIZE, MAX_HAND_SIZE).map((n) => ({ value: n, label: n }))}
          onChange={(handSize) => onChange({ handSize })}
        />
      </Field>

      <Field label={uz.create.queenRule}>
        <OptionCards<QueenRule>
          value={value.queenRule}
          disabled={disabled}
          options={(['free-next', 'choose-suit'] as const).map((k) => ({ value: k, ...uz.queenRules[k] }))}
          onChange={(queenRule) => onChange({ queenRule })}
        />
      </Field>

      <Field label={uz.create.matchRule}>
        <OptionCards<MatchRule>
          value={value.matchRule}
          disabled={disabled}
          options={(['rank-or-suit', 'suit-only'] as const).map((k) => ({ value: k, ...uz.matchRules[k] }))}
          onChange={(matchRule) => onChange({ matchRule })}
        />
      </Field>

      <Toggle
        checked={value.mixPenaltyChains}
        disabled={disabled}
        onChange={(mixPenaltyChains) => onChange({ mixPenaltyChains })}
        label={uz.create.mixChains}
        hint={uz.create.mixChainsHint}
      />
    </div>
  );
}
