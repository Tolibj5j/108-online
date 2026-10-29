import type { Card } from '../../../shared/types/index.ts';
import { CardFace } from './PlayingCard.tsx';

const c = (rank: Card['rank'], suit: Card['suit']): Card => ({ id: `r-${rank}${suit}`, rank, suit, deckIndex: 0 });

const SPECIALS: { card: Card; title: string; text: string }[] = [
  {
    card: c('6', 'H'),
    title: '6 — bitta karta oling',
    text: 'Keyingi o‘yinchi 1 ta karta oladi. U ham 6 tashlasa, jarima ortib boradi: 6 → +1, 6 → 6 → +2, 6 → 6 → 6 → +3. Javob bera olmagan o‘yinchi jami jarimani oladi.',
  },
  {
    card: c('7', 'C'),
    title: '7 — ikkita karta oling',
    text: 'Keyingi o‘yinchi 2 ta karta oladi. 7 ga 7 bilan javob berish mumkin: +2, +4, +6… 6 va 7 zanjirlari standart bo‘yicha alohida.',
  },
  {
    card: c('K', 'S'),
    title: 'Pika qiroli (K♠) — beshta karta',
    text: 'Keyingi o‘yinchi darhol 5 ta karta oladi va navbatini yo‘qotadi. Bu jarimani to‘plab ham, boshqaga o‘tkazib ham bo‘lmaydi.',
  },
  {
    card: c('A', 'D'),
    title: 'Tuz (A) — navbatni o‘tkazish',
    text: 'Keyingi o‘yinchining navbati o‘tkazib yuboriladi. Ikki kishilik o‘yinda navbat yana tuzni tashlagan o‘yinchiga qaytadi.',
  },
  {
    card: c('Q', 'H'),
    title: 'Dama (Q) — erkin yurish',
    text: 'A rejimi (standart): damadan keyin istalgan karta tashlash mumkin. B rejimi: damani tashlagan o‘yinchi keyingi mastni tanlaydi. Rejimni xost tanlaydi.',
  },
];

export function RulesContent() {
  return (
    <div className="space-y-6 text-[15px] leading-relaxed text-white/85">
      <section>
        <h3 className="mb-2 font-display text-lg font-bold text-gold-300">Maqsad</h3>
        <p>Qo‘lingizdagi barcha kartalarni birinchi bo‘lib tashlang. Oxirgi kartani tashlagan o‘yinchi darhol g‘olib bo‘ladi (oxirgi kartaning maxsus ta’siri qo‘llanmaydi).</p>
      </section>

      <section>
        <h3 className="mb-2 font-display text-lg font-bold text-gold-300">Kartalar</h3>
        <p>
          6 dan tuzgacha bo‘lgan standart kartalar: 4 mast × 9 qiymat = <b>36 karta</b> (bitta koloda) yoki <b>72 karta</b> (ikkita koloda). O‘yinda 2–6 kishi
          qatnashadi.
        </p>
      </section>

      <section>
        <h3 className="mb-2 font-display text-lg font-bold text-gold-300">Yurish</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>Ochiq turgan kartaga mast yoki qiymati mos kartani tashlang (xost “faqat mast” rejimini tanlashi mumkin).</li>
          <li>Mos karta bo‘lmasa, kolodadan 1 ta karta oling. Agar u ham mos kelmasa, navbat avtomatik o‘tadi; mos kelsa, tashlashingiz yoki o‘tkazishingiz mumkin.</li>
          <li>Kartani tanlash uchun bir marta bosing, tashlash uchun “Karta tashlash” tugmasini yoki shu kartani yana bir marta bosing.</li>
          <li>Koloda tugasa, tashlangan kartalar (eng ustkisidan tashqari) aralashtirilib yangi koloda bo‘ladi.</li>
          <li>Valet (J), 8, 9, 10 va boshqa qirollar — oddiy kartalar.</li>
        </ul>
      </section>

      <section>
        <h3 className="mb-3 font-display text-lg font-bold text-gold-300">Maxsus kartalar</h3>
        <div className="space-y-3">
          {SPECIALS.map((s) => (
            <div key={s.card.id} className="flex items-start gap-3 rounded-xl bg-black/20 p-3 ring-1 ring-white/10">
              <CardFace card={s.card} size="md" className="shrink-0 shadow-lg" />
              <div>
                <div className="font-semibold text-gold-200">{s.title}</div>
                <div className="mt-0.5 text-sm text-white/75">{s.text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-display text-lg font-bold text-gold-300">Ulanish uzilsa</h3>
        <p>
          Sahifani yangilasangiz yoki internet vaqtincha uzilsa, o‘yinga avtomatik qaytasiz. Ulanmagan o‘yinchining navbati 20 soniyadan so‘ng avtomatik o‘tkaziladi (u
          jarimani oladi yoki bitta karta oladi — uning kartalari hech qachon avtomatik tashlanmaydi). 2 daqiqadan ko‘proq ulanmagan o‘yinchi o‘yindan chiqariladi.
        </p>
      </section>
    </div>
  );
}
