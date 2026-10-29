import type { CardSuit, ErrorCode, PenaltyReason, QueenRule, MatchRule, WinReason } from '../../../shared/types/index.ts';

export type ClientErrorCode = ErrorCode | 'TIMEOUT' | 'DISCONNECTED';

export const uz = {
  appTitle: '108 ONLINE',
  subtitle: 'Do‘stlaringiz bilan onlayn karta o‘ynang',

  menu: {
    create: 'Xona yaratish',
    join: 'Xonaga kirish',
    rules: 'O‘yin qoidalari',
    settings: 'Sozlamalar',
    resumeTitle: 'Tugallanmagan o‘yin',
    resume: (name: string, code: string) => `${name} sifatida ${code} xonasiga qaytish`,
    forget: 'Unutish',
  },

  common: {
    back: 'Orqaga',
    yourName: 'Ismingiz',
    namePlaceholder: 'Masalan: Aziz',
    roomCode: 'Xona kodi',
    loading: 'Yuklanmoqda…',
    you: 'Siz',
    host: 'Xost',
    close: 'Yopish',
    cancel: 'Bekor qilish',
    confirm: 'Tasdiqlash',
  },

  connection: {
    connecting: 'Serverga ulanmoqda…',
    lost: 'Aloqa uzildi. Qayta ulanmoqda…',
    restored: 'Aloqa tiklandi',
  },

  create: {
    title: 'Xona yaratish',
    maxPlayers: 'O‘yinchilar soni (maksimal)',
    deckCount: 'Kolodalar soni',
    deckOption: (n: number) => `${n} koloda · ${n * 36} karta`,
    handSize: 'Boshlang‘ich kartalar soni',
    queenRule: 'Dama (Q) qoidasi',
    matchRule: 'Karta moslash qoidasi',
    mixChains: '6 va 7 jarimalarini aralashtirishga ruxsat',
    mixChainsHint: 'Yoqilsa, 6 ga 7 bilan (va aksincha) javob berish mumkin',
    submit: 'Xona yaratish',
    notEnoughCards: (need: number, have: number) =>
      `To‘liq xonada ${need} ta karta kerak, kolodada esa ${have} ta. Kolodalarni ko‘paytiring yoki kartalarni kamaytiring.`,
  },

  queenRules: {
    'free-next': { title: 'A: Erkin yurish', desc: 'Damadan keyin istalgan karta tashlash mumkin' },
    'choose-suit': { title: 'B: Mast tanlash', desc: 'Damani tashlagan o‘yinchi keyingi mastni tanlaydi' },
  } satisfies Record<QueenRule, { title: string; desc: string }>,

  matchRules: {
    'rank-or-suit': { title: 'Qiymat yoki mast', desc: 'Karta mast yoki qiymati bo‘yicha mos kelishi kerak' },
    'suit-only': { title: 'Faqat mast', desc: 'Faqat bir xil mastdagi karta tashlanadi' },
  } satisfies Record<MatchRule, { title: string; desc: string }>,

  join: {
    title: 'Xonaga kirish',
    codePlaceholder: 'AB7KQ2',
    submit: 'Kirish',
    continueAs: (name: string) => `${name} sifatida davom etish`,
    orNew: 'yoki yangi o‘yinchi sifatida kiring',
  },

  lobby: {
    title: 'Kutish zali',
    invite: 'Do‘stlaringizni taklif qiling',
    copyLink: 'Havolani nusxalash',
    copied: 'Havola nusxalandi!',
    share: 'Ulashish',
    shareText: (code: string) => `108 ONLINE: ${code} xonasida birga o‘ynaymiz!`,
    players: 'O‘yinchilar',
    capacity: (n: number, max: number) => `${n} / ${max}`,
    ready: 'Tayyor',
    notReady: 'Tayyor emas',
    offline: 'Ulanmagan',
    imReady: 'Men tayyorman',
    cancelReady: 'Tayyor emasman',
    start: 'O‘yinni boshlash',
    waitingHost: 'Xost o‘yinni boshlashini kuting…',
    needPlayers: 'Kamida 2 o‘yinchi kerak',
    needReady: 'Barcha o‘yinchilar tayyor bo‘lishi kerak',
    settings: 'Xona sozlamalari',
    leave: 'Xonadan chiqish',
    emptySeat: 'Bo‘sh joy',
    wins: (n: number) => `${n} g‘alaba`,
  },

  game: {
    yourTurn: 'Sizning navbatingiz',
    waitingFor: (name: string) => `${name} yurmoqda…`,
    offlineTurn: (name: string) => `${name} ulanmagan — navbati avtomatik o‘tkaziladi`,
    selectCard: 'Karta tanlang va tashlang',
    noPlayable: 'Mos karta yo‘q — kolodadan karta oling',
    playOrPass: 'Karta tashlang yoki navbatni o‘tkazing',
    penaltyPrompt: (amount: number, kind: string) => `Jarima +${amount}: ${kind} tashlang yoki ${amount} ta karta oling`,
    play: 'Karta tashlash',
    draw: 'Karta olish',
    drawPenalty: (n: number) => `${n} ta karta oling`,
    pass: 'O‘tkazish',
    deck: 'Koloda',
    discard: 'Tashlangan',
    cardsLeft: (n: number) => `${n} ta karta`,
    activeSuit: 'Tanlangan mast',
    freePlay: 'Erkin yurish',
    pending: 'Jarima',
    chooseSuit: 'Mastni tanlang',
    leaveConfirm: 'O‘yindan chiqmoqchimisiz? Kartalaringiz kolodaga qaytariladi.',
    leave: 'Chiqish',
    log: 'O‘yin jurnali',
    room: 'Xona',
    turnSkipped: 'Navbat o‘tkazildi',
  },

  banners: {
    plus: (n: number) => `+${n} karta!`,
    kingSpades: 'Pika qiroli: 5 ta karta oling!',
    skip: (name: string) => `${name}: navbat o‘tkazildi`,
    freePlay: 'Dama: erkin yurish!',
    suitChosen: (suit: string) => `Dama: ${suit} tanlandi`,
    reshuffle: 'Kartalar aralashtirildi',
    drew: (name: string, n: number) => `${name}: +${n} karta`,
  },

  over: {
    title: 'O‘yin tugadi',
    youWon: 'Siz g‘alaba qozondingiz!',
    winner: (name: string) => `${name} g‘alaba qozondi!`,
    reasons: {
      'empty-hand': 'Barcha kartalarini birinchi bo‘lib tashladi',
      'last-player': 'Boshqa o‘yinchilar o‘yindan chiqdi',
      stalemate: 'Hech kim yura olmadi — eng kam kartali o‘yinchi g‘olib',
    } satisfies Record<WinReason, string>,
    results: 'Natijalar',
    playAgain: 'Yana o‘ynash',
    toLobby: 'Lobbiga qaytish',
    waitHost: 'Xost yangi o‘yinni boshlashini kuting…',
    cardsLeft: (n: number) => (n === 0 ? 'Karta qolmadi' : `${n} ta karta qoldi`),
  },

  settings: {
    title: 'Sozlamalar',
    defaultName: 'Standart ism',
    sound: 'Ovoz effektlari',
    reducedMotion: 'Animatsiyalarni kamaytirish',
    sortHand: 'Qo‘ldagi kartalarni saralash',
    sortModes: { suit: 'Mast bo‘yicha', rank: 'Qiymat bo‘yicha', none: 'Saralamaslik' },
    saved: 'Saqlandi',
  },

  suits: { S: 'Pika', H: 'Chirva', D: 'G‘isht', C: 'Chillak' } satisfies Record<CardSuit, string>,

  penaltyReasons: { six: '6', seven: '7', 'king-spades': 'K♠' } satisfies Record<PenaltyReason, string>,

  errors: {
    INVALID_INPUT: 'Noto‘g‘ri ma’lumot kiritildi',
    RATE_LIMITED: 'Juda tez! Biroz kuting',
    ROOM_NOT_FOUND: 'Xona topilmadi',
    ROOM_FULL: 'Xona to‘lgan',
    MATCH_IN_PROGRESS: 'Bu xonada o‘yin ketmoqda',
    NAME_TAKEN: 'Bu ism band, boshqa ism tanlang',
    NOT_IN_ROOM: 'Siz bu xonada emassiz',
    NOT_HOST: 'Faqat xost bu amalni bajara oladi',
    NOT_ENOUGH_PLAYERS: 'Kamida 2 o‘yinchi kerak',
    PLAYERS_NOT_READY: 'Barcha o‘yinchilar tayyor va onlayn bo‘lishi kerak',
    NOT_ENOUGH_CARDS: 'Kartalar yetmaydi: kolodalar sonini oshiring yoki kartalar sonini kamaytiring',
    INVALID_SETTINGS: 'Sozlamalar noto‘g‘ri',
    WRONG_STATUS: 'Hozir bu amalni bajarib bo‘lmaydi',
    GAME_NOT_ACTIVE: 'O‘yin faol emas',
    NOT_YOUR_TURN: 'Hozir sizning navbatingiz emas',
    CARD_NOT_IN_HAND: 'Bu karta sizda yo‘q',
    ILLEGAL_MOVE: 'Bu kartani tashlab bo‘lmaydi: mast yoki qiymat mos emas',
    MUST_RESPOND_TO_PENALTY: 'Jarima bor: mos karta tashlang yoki kartalarni oling',
    SUIT_REQUIRED: 'Mastni tanlang',
    ALREADY_DRAWN: 'Bu navbatda allaqachon karta oldingiz',
    MUST_DRAW_FIRST: 'Avval kolodadan karta oling',
    INVALID_SESSION: 'Sessiya eskirgan, qaytadan kiring',
    TIMEOUT: 'Server javob bermadi, qayta urinib ko‘ring',
    DISCONNECTED: 'Serverga ulanish yo‘q',
  } satisfies Record<ClientErrorCode, string>,

  sessionEnded: {
    replaced: 'Siz boshqa oynadan kirdingiz',
    removed: 'Siz xonadan chiqarildingiz (uzoq vaqt ulanmadingiz)',
    roomGone: 'Xona endi mavjud emas (server qayta ishga tushgan bo‘lishi mumkin)',
  },
};

export function errorText(code: ClientErrorCode): string {
  return uz.errors[code] ?? code;
}
