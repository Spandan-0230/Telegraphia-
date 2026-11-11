import {
  CHAR_TO_MORSE_MAP,
  CURRICULUM_LEVELS,
  MORSE_CHARACTERS,
  MORSE_TO_CHAR_MAP,
  MorseCharacter,
} from './morseData';

export interface TimingConfig {
  dotMs: number;
  dashMs: number;
  intraCharGapMs: number;
  charGapMs: number;
  wordGapMs: number;
}

export interface SRSCard {
  char: string;
  interval: number;
  repetition: number;
  easeFactor: number;
  nextReviewAt: number;
  totalAttempts: number;
  correctAttempts: number;
  lastResponseMs: number;
  masteryStatus: 'unseen' | 'learning' | 'reviewing' | 'mastered';
}

export interface QuizQuestion {
  id: string;
  type: 'listen-identify' | 'encode-signal' | 'visual-mnemonic' | 'word-decode';
  targetChar: string;
  targetCode: string;
  promptText: string;
  options?: string[];
  mnemonicHint: string;
}

export interface TranscriptionResult {
  accuracyPercent: number;
  correctChars: number;
  totalChars: number;
  effectiveWpm: number;
  charDiff: { expected: string; actual: string; match: boolean }[];
}

export function normalizeSignalPattern(raw: string): string {
  return raw
    .trim()
    .replace(/[•·*]/g, '.')
    .replace(/[—–_]/g, '-')
    .replace(/[^.\-\s/]/g, '');
}

export function encodeToMorse(text: string): string {
  const normalized = text.toUpperCase().trim();
  if (!normalized) return '';

  const words = normalized.split(/\s+/);
  return words
    .map((word) =>
      word
        .split('')
        .map((ch) => CHAR_TO_MORSE_MAP[ch]?.code ?? '')
        .filter(Boolean)
        .join(' ')
    )
    .filter(Boolean)
    .join(' / ');
}

export function decodeFromMorse(morse: string): string {
  const cleaned = normalizeSignalPattern(morse);
  if (!cleaned) return '';

  const wordTokens = cleaned.split(/\s*\/\s*|\s{3,}/);
  return wordTokens
    .map((wordToken) =>
      wordToken
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((code) => MORSE_TO_CHAR_MAP[code]?.char ?? '?')
        .join('')
    )
    .join(' ');
}

export function calculateTimingMs(charWpm: number, farnsworthWpm?: number): TimingConfig {
  const safeCharWpm = Math.max(5, Math.min(50, charWpm));
  const effectiveFarnsworth = farnsworthWpm
    ? Math.max(5, Math.min(safeCharWpm, farnsworthWpm))
    : safeCharWpm;

  const dotMs = Math.round(1200 / safeCharWpm);
  const dashMs = dotMs * 3;
  const intraCharGapMs = dotMs;

  const farnsworthDotMs = Math.round(1200 / effectiveFarnsworth);
  const charGapMs = farnsworthDotMs * 3;
  const wordGapMs = farnsworthDotMs * 7;

  return {
    dotMs,
    dashMs,
    intraCharGapMs,
    charGapMs,
    wordGapMs,
  };
}

export function createInitialSRSDeck(nowMs: number = Date.now(), seedDemo = true): Record<string, SRSCard> {
  const deck: Record<string, SRSCard> = {};

  for (const item of MORSE_CHARACTERS) {
    if (seedDemo && (item.char === 'A' || item.char === 'B')) {
      deck[item.char] = {
        char: item.char,
        interval: 6,
        repetition: 3,
        easeFactor: 2.6,
        nextReviewAt: nowMs + 86400000 * 2,
        totalAttempts: 8,
        correctAttempts: 8,
        lastResponseMs: 920,
        masteryStatus: 'mastered',
      };
    } else if (seedDemo && (item.char === 'C' || item.char === 'D' || item.char === 'E' || item.char === 'F')) {
      deck[item.char] = {
        char: item.char,
        interval: 1,
        repetition: 1,
        easeFactor: 2.5,
        nextReviewAt: nowMs - 3600000,
        totalAttempts: 4,
        correctAttempts: 3,
        lastResponseMs: 1450,
        masteryStatus: 'reviewing',
      };
    } else if (seedDemo && (item.char === 'G' || item.char === 'H')) {
      deck[item.char] = {
        char: item.char,
        interval: 0,
        repetition: 1,
        easeFactor: 2.36,
        nextReviewAt: nowMs - 1800000,
        totalAttempts: 3,
        correctAttempts: 2,
        lastResponseMs: 1850,
        masteryStatus: 'learning',
      };
    } else {
      deck[item.char] = {
        char: item.char,
        interval: 0,
        repetition: 0,
        easeFactor: 2.5,
        nextReviewAt: nowMs,
        totalAttempts: 0,
        correctAttempts: 0,
        lastResponseMs: 0,
        masteryStatus: 'unseen',
      };
    }
  }

  return deck;
}

export function updateSRSCard(
  card: SRSCard,
  isCorrect: boolean,
  responseTimeMs: number,
  nowMs: number = Date.now()
): SRSCard {
  const quality = !isCorrect ? 1 : responseTimeMs < 1500 ? 5 : responseTimeMs < 3200 ? 4 : 3;

  let repetition = card.repetition;
  let interval = card.interval;
  let easeFactor = card.easeFactor;

  if (quality >= 3) {
    if (repetition === 0) {
      interval = 1;
    } else if (repetition === 1) {
      interval = 3;
    } else {
      interval = Math.max(1, Math.round(interval * easeFactor));
    }
    repetition += 1;
  } else {
    repetition = 0;
    interval = 0;
  }

  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;
  if (easeFactor > 3.0) easeFactor = 3.0;
  easeFactor = Number(easeFactor.toFixed(2));

  const totalAttempts = card.totalAttempts + 1;
  const correctAttempts = card.correctAttempts + (isCorrect ? 1 : 0);
  const accuracy = correctAttempts / totalAttempts;

  let masteryStatus: SRSCard['masteryStatus'] = 'learning';
  if (repetition >= 3 && accuracy >= 0.8) {
    masteryStatus = 'mastered';
  } else if (repetition >= 1) {
    masteryStatus = 'reviewing';
  }

  const nextReviewOffsetMs =
    interval === 0 ? 10 * 60 * 1000 : interval * 24 * 60 * 60 * 1000;

  return {
    ...card,
    interval,
    repetition,
    easeFactor,
    nextReviewAt: nowMs + nextReviewOffsetMs,
    totalAttempts,
    correctAttempts,
    lastResponseMs: Math.round(responseTimeMs),
    masteryStatus,
  };
}

export function getDueCards(deck: Record<string, SRSCard>, nowMs: number = Date.now()): SRSCard[] {
  const allCards = Object.values(deck);
  const dueSeen = allCards
    .filter((c) => c.masteryStatus !== 'unseen' && c.nextReviewAt <= nowMs)
    .sort((a, b) => a.nextReviewAt - b.nextReviewAt);

  if (dueSeen.length >= 6) {
    return dueSeen;
  }

  const unseen = allCards
    .filter((c) => c.masteryStatus === 'unseen')
    .sort((a, b) => {
      const levelA = CHAR_TO_MORSE_MAP[a.char]?.level ?? 99;
      const levelB = CHAR_TO_MORSE_MAP[b.char]?.level ?? 99;
      return levelA - levelB;
    });

  return [...dueSeen, ...unseen.slice(0, Math.max(4, 8 - dueSeen.length))];
}

export function calculateMasterySummary(deck: Record<string, SRSCard>, nowMs: number = Date.now()) {
  const cards = Object.values(deck);
  const mastered = cards.filter((c) => c.masteryStatus === 'mastered').length;
  const reviewing = cards.filter((c) => c.masteryStatus === 'reviewing').length;
  const learning = cards.filter((c) => c.masteryStatus === 'learning').length;
  const unseen = cards.filter((c) => c.masteryStatus === 'unseen').length;
  const dueNow = cards.filter(
    (c) => c.masteryStatus !== 'unseen' && c.nextReviewAt <= nowMs
  ).length;

  const totalAttempts = cards.reduce((acc, c) => acc + c.totalAttempts, 0);
  const correctAttempts = cards.reduce((acc, c) => acc + c.correctAttempts, 0);
  const overallAccuracy =
    totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 100;

  return {
    total: cards.length,
    mastered,
    reviewing,
    learning,
    unseen,
    dueNow,
    overallAccuracy,
  };
}

export function generateQuizQuestions(levelNumber: number): QuizQuestion[] {
  const levelConfig =
    CURRICULUM_LEVELS.find((l) => l.level === levelNumber) ?? CURRICULUM_LEVELS[0];

  const cumulativeChars = MORSE_CHARACTERS.filter((c) => c.level <= levelNumber);
  const targetChars = levelConfig.characters
    .map((ch) => CHAR_TO_MORSE_MAP[ch])
    .filter((c): c is MorseCharacter => Boolean(c));

  const questions: QuizQuestion[] = [];

  targetChars.forEach((item, idx) => {
    const distractors = cumulativeChars
      .filter((c) => c.char !== item.char)
      .slice(0, 3)
      .map((c) => c.char);
    while (distractors.length < 3) {
      const fallback = MORSE_CHARACTERS.find(
        (c) => c.char !== item.char && !distractors.includes(c.char)
      );
      if (fallback) distractors.push(fallback.char);
      else break;
    }

    const options = [...distractors];
    options.splice(idx % (options.length + 1), 0, item.char);

    // As levels increase, prompts become more challenging (fewer visual hints)
    const showCodeInPrompt = levelNumber <= 3;

    questions.push({
      id: `lvl-${levelNumber}-listen-${item.char}`,
      type: 'listen-identify',
      targetChar: item.char,
      targetCode: item.code,
      promptText: showCodeInPrompt
        ? `Which letter has the signal ${item.code.replace(/\./g, '•').replace(/-/g, '—')} (${item.phonetic})?`
        : `Listen to the signal and pick the matching letter:`,
      options,
      mnemonicHint: `${item.char} is for ${item.mnemonicWord}: ${item.visualCue}`,
    });

    questions.push({
      id: `lvl-${levelNumber}-encode-${item.char}`,
      type: 'encode-signal',
      targetChar: item.char,
      targetCode: item.code,
      promptText: `Tap the Dots (•) and Dashes (—) for "${item.char}" (${item.mnemonicWord}):`,
      mnemonicHint:
        levelNumber <= 4
          ? `${item.phonetic} (${item.code.replace(/\./g, '•').replace(/-/g, '—')})`
          : `Memory clue: ${item.mnemonicWord} (${item.phonetic})`,
    });
  });

  const practiceWord = levelConfig.practiceWords[0] ?? 'CAB';
  questions.push({
    id: `lvl-${levelNumber}-word-${practiceWord}`,
    type: 'word-decode',
    targetChar: practiceWord,
    targetCode: encodeToMorse(practiceWord),
    promptText: `Bonus Word Challenge — Decode this ${practiceWord.length}-letter word:`,
    mnemonicHint: `Letters used: ${practiceWord
      .split('')
      .map((c) => `${c} (${CHAR_TO_MORSE_MAP[c]?.code.replace(/\./g, '•').replace(/-/g, '—')})`)
      .join('   ')}`,
  });

  return questions;
}

export function evaluateTranscription(
  expectedMessage: string,
  userCopy: string,
  elapsedSeconds: number
): TranscriptionResult {
  const expectedClean = expectedMessage.toUpperCase().trim().replace(/\s+/g, ' ');
  const actualClean = userCopy.toUpperCase().trim().replace(/\s+/g, ' ');

  const maxLen = Math.max(expectedClean.length, 1);
  const charDiff: { expected: string; actual: string; match: boolean }[] = [];
  let correctChars = 0;

  for (let i = 0; i < expectedClean.length; i++) {
    const exp = expectedClean[i];
    const act = actualClean[i] ?? '';
    const match = exp === act;
    if (match) correctChars += 1;
    charDiff.push({ expected: exp, actual: act || '·', match });
  }

  const accuracyPercent = Math.round((correctChars / maxLen) * 100);
  const wordsCopied = correctChars / 5;
  const safeMinutes = Math.max(elapsedSeconds / 60, 0.05);
  const effectiveWpm = Math.min(60, Math.max(0, Math.round(wordsCopied / safeMinutes)));

  return {
    accuracyPercent,
    correctChars,
    totalChars: expectedClean.length,
    effectiveWpm,
    charDiff,
  };
}
