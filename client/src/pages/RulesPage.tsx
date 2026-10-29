import { RulesContent } from '../components/RulesContent.tsx';
import { ScreenFrame } from '../components/ui.tsx';
import { uz } from '../i18n/uz.ts';
import { goTo } from '../store/appStore.ts';

export function RulesPage() {
  return (
    <ScreenFrame title={uz.menu.rules} onBack={() => goTo('menu')} wide>
      <RulesContent />
    </ScreenFrame>
  );
}
