import React, { useState } from 'react';
import {
  BrainCircuit,
  Volume2,
  CheckCircle2,
  Flame,
  Award,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { CHAR_TO_MORSE_MAP, MORSE_CHARACTERS } from '../utils/morseData';
import {
  SRSCard,
  calculateMasterySummary,
  getDueCards,
  normalizeSignalPattern,
} from '../utils/morseEngine';
import { morseAudio } from '../utils/audioSynth';

interface MasteryDashboardViewProps {
  srsDeck: Record<string, SRSCard>;
  streakDays: number;
  streakHistory: { date: string; signalsReviewed: number; avgWpm: number }[];
  onRecordAttempt: (char: string, isCorrect: boolean, responseTimeMs: number) => void;
  onResetProgress: () => void;
  wpm: number;
}

export const MasteryDashboardView: React.FC<MasteryDashboardViewProps> = ({
  srsDeck,
  streakDays,
  streakHistory,
  onRecordAttempt,
  onResetProgress,
  wpm,
}) => {
  const [reviewActive, setReviewActive] = useState<boolean>(false);
  const [reviewQueue, setReviewQueue] = useState<SRSCard[]>([]);
  const [reviewIdx, setReviewIdx] = useState<number>(0);
  const [reviewInput, setReviewInput] = useState<string>('');
  const [reviewStartMs, setReviewStartMs] = useState<number>(Date.now());
  const [reviewFeedback, setReviewFeedback] = useState<{
    status: 'idle' | 'correct' | 'incorrect';
    text: string;
  }>({ status: 'idle', text: '' });
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'due' | 'mastered' | 'reviewing' | 'learning'
  >('all');

  const summary = calculateMasterySummary(srsDeck);
  const dueCards = getDueCards(srsDeck);
  const currentCard = reviewQueue[reviewIdx];
  const currentCharMeta = currentCard ? CHAR_TO_MORSE_MAP[currentCard.char] : null;

  const handleStartSRSReview = () => {
    const queue = getDueCards(srsDeck);
    if (queue.length === 0) return;
    setReviewQueue(queue);
    setReviewIdx(0);
    setReviewInput('');
    setReviewFeedback({ status: 'idle', text: '' });
    setReviewStartMs(Date.now());
    setReviewActive(true);

    const firstMeta = CHAR_TO_MORSE_MAP[queue[0].char];
    if (firstMeta) {
      setTimeout(() => {
        morseAudio.playMorseSequence(firstMeta.code, { wpm });
      }, 100);
    }
  };

  const handleSubmitSRSReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCard || !currentCharMeta || reviewFeedback.status !== 'idle') return;

    const elapsed = Date.now() - reviewStartMs;
    const cleaned = normalizeSignalPattern(reviewInput).replace(/\s+/g, '');
    const isCodeMatch = cleaned === currentCharMeta.code;
    const isCharMatch = reviewInput.trim().toUpperCase() === currentCard.char;
    const isCorrect = isCodeMatch || isCharMatch;

    onRecordAttempt(currentCard.char, isCorrect, elapsed);

    setReviewFeedback({
      status: isCorrect ? 'correct' : 'incorrect',
      text: isCorrect
        ? `Interval Extended · ${currentCard.char} (${currentCharMeta.code.replace(/\./g, '•').replace(/-/g, '—')}) in ${(elapsed / 1000).toFixed(1)}s`
        : `Reset · ${currentCard.char} is ${currentCharMeta.code.replace(/\./g, '•').replace(/-/g, '—')} (${currentCharMeta.mnemonicWord})`,
    });
  };

  const handleNextSRSCard = () => {
    if (reviewIdx + 1 < reviewQueue.length) {
      const next = reviewIdx + 1;
      setReviewIdx(next);
      setReviewInput('');
      setReviewFeedback({ status: 'idle', text: '' });
      setReviewStartMs(Date.now());
      const nextMeta = CHAR_TO_MORSE_MAP[reviewQueue[next].char];
      if (nextMeta) {
        morseAudio.playMorseSequence(nextMeta.code, { wpm });
      }
    } else {
      setReviewActive(false);
    }
  };

  const filteredTableRows = MORSE_CHARACTERS.map((m) => ({
    meta: m,
    card: srsDeck[m.char],
  })).filter(({ card }) => {
    if (!card) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'due') {
      return card.masteryStatus !== 'unseen' && card.nextReviewAt <= Date.now();
    }
    return card.masteryStatus === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Compact Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-stone-500 dark:text-stone-400">
            SUPERMEMO SM-2 ENGINE · RETENTION LEDGER
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 mt-0.5">
            Mastery &amp; Spaced Repetition
          </h1>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!reviewActive ? (
            <button
              type="button"
              onClick={handleStartSRSReview}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-orange-700 hover:bg-orange-800 dark:bg-amber-500 dark:text-stone-950 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BrainCircuit className="w-4 h-4" />
              Start SM-2 Review ({dueCards.length} Due)
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setReviewActive(false)}
              className="px-4 py-2.5 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
            >
              Close Session
            </button>
          )}
        </div>
      </div>

      {/* Active SM-2 Review Drill */}
      {reviewActive && currentCard && currentCharMeta && (
        <section
          aria-label="Spaced Repetition Active Review"
          className="border border-orange-300 dark:border-amber-500/40 bg-white dark:bg-stone-900 rounded-xl p-6 max-w-2xl mx-auto space-y-5"
        >
          <div className="flex items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-3">
            <div className="text-xs font-mono text-stone-500 dark:text-stone-400">
              CARD {reviewIdx + 1}/{reviewQueue.length} · EASE {currentCard.easeFactor.toFixed(2)} ·
              INTERVAL {currentCard.interval}D
            </div>
            <button
              type="button"
              onClick={() => morseAudio.playMorseSequence(currentCharMeta.code, { wpm })}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-orange-700 dark:text-amber-400 border border-orange-300 dark:border-amber-500/40 rounded-md cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Replay
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-stone-100">
                Key “{currentCard.char}” ({currentCharMeta.mnemonicWord})
              </h2>
              <p className="text-xs font-mono text-stone-500 dark:text-stone-400 mt-0.5">
                {currentCharMeta.phonetic} · {currentCharMeta.mnemonicPhrase}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitSRSReview} className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  morseAudio.playElement('dit', wpm);
                  setReviewInput((p) => p + '.');
                }}
                className="flex-1 py-2.5 px-4 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 font-mono text-xs font-semibold cursor-pointer"
              >
                + Dit (.)
              </button>
              <button
                type="button"
                onClick={() => {
                  morseAudio.playElement('dah', wpm);
                  setReviewInput((p) => p + '-');
                }}
                className="flex-1 py-2.5 px-4 rounded-lg border border-stone-800 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 font-mono text-xs font-semibold cursor-pointer"
              >
                + Dah (-)
              </button>
              <button
                type="button"
                onClick={() => setReviewInput('')}
                className="px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-800 text-xs text-stone-500 cursor-pointer"
              >
                Clear
              </button>
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="srs-review-input" className="sr-only">
                Type Morse pattern or character
              </label>
              <input
                id="srs-review-input"
                type="text"
                value={reviewInput}
                onChange={(e) => {
                  const val = e.target.value;
                  const last = val.slice(-1);
                  if (last === '.') morseAudio.playElement('dit', wpm);
                  if (last === '-') morseAudio.playElement('dah', wpm);
                  setReviewInput(val);
                }}
                placeholder={`Type ${currentCharMeta.code} ...`}
                className="flex-1 px-4 py-2.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-base text-stone-900 dark:text-stone-100"
              />
              <button
                type="submit"
                disabled={!reviewInput.trim() || reviewFeedback.status !== 'idle'}
                className="px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-orange-700 hover:bg-orange-800 dark:bg-amber-500 dark:text-stone-950 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
              >
                Grade
              </button>
            </div>
          </form>

          {reviewFeedback.status !== 'idle' && (
            <div className="p-3.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex items-center justify-between gap-4">
              <span className="text-xs font-mono font-semibold text-stone-800 dark:text-stone-200">
                {reviewFeedback.text}
              </span>
              <button
                type="button"
                onClick={handleNextSRSCard}
                className="px-4 py-1.5 rounded-md text-xs font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 cursor-pointer whitespace-nowrap shrink-0"
              >
                {reviewIdx + 1 < reviewQueue.length ? 'Next' : 'Finish'}
              </button>
            </div>
          )}
        </section>
      )}

      {/* 4-Column KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 rounded-xl p-5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-mono text-stone-500 dark:text-stone-400">
            <span>MASTERED</span>
            <Award className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="font-mono text-3xl font-bold tabular-nums text-stone-900 dark:text-stone-100">
            {summary.mastered} <span className="text-sm font-normal text-stone-500">/ {summary.total}</span>
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400">
            {summary.reviewing} Reviewing · {summary.learning} Learning
          </div>
        </div>

        <div className="border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 rounded-xl p-5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-mono text-stone-500 dark:text-stone-400">
            <span>DUE NOW</span>
            <Clock className="w-4 h-4 text-orange-700 dark:text-amber-400" />
          </div>
          <div className="font-mono text-3xl font-bold tabular-nums text-orange-700 dark:text-amber-400">
            {summary.dueNow}
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400">
            Ready in SM-2 queue
          </div>
        </div>

        <div className="border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 rounded-xl p-5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-mono text-stone-500 dark:text-stone-400">
            <span>ACCURACY</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="font-mono text-3xl font-bold tabular-nums text-stone-900 dark:text-stone-100">
            {summary.overallAccuracy}%
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400">
            Cumulative signal recall
          </div>
        </div>

        <div className="border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 rounded-xl p-5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs font-mono text-stone-500 dark:text-stone-400">
            <span>STREAK</span>
            <Flame className="w-4 h-4 text-orange-700 dark:text-amber-400" />
          </div>
          <div className="font-mono text-3xl font-bold tabular-nums text-stone-900 dark:text-stone-100">
            {streakDays}d
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400">
            Consecutive active days
          </div>
        </div>
      </div>

      {/* 14-Day Activity Chart */}
      <section className="border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            14-Day Practice Volume
          </h2>
          <span className="text-xs font-mono text-stone-500 dark:text-stone-400">
            SIGNALS / DAY
          </span>
        </div>

        <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 items-end h-32">
          {streakHistory.map((day) => {
            const heightPct = Math.max(12, Math.min(100, Math.round((day.signalsReviewed / 45) * 100)));
            return (
              <div
                key={day.date}
                className="flex flex-col items-center justify-end h-full gap-1"
              >
                <span className="font-mono text-[10px] text-stone-500 dark:text-stone-400 tabular-nums">
                  {day.signalsReviewed}
                </span>
                <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-t flex items-end h-20 overflow-hidden">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full bg-orange-700 dark:bg-amber-500 rounded-t transition-all"
                  />
                </div>
                <span className="font-mono text-[10px] text-stone-500 dark:text-stone-400">
                  {day.date.replace('Day ', 'D')}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Compact SM-2 Signal Table */}
      <section className="border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            SM-2 Signal Deck ({filteredTableRows.length})
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-lg">
              {(['all', 'due', 'mastered', 'reviewing', 'learning'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onResetProgress}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-stone-500 hover:text-stone-900 dark:hover:text-white border border-stone-200 dark:border-stone-800 rounded-lg cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800 text-[11px] font-mono text-stone-500 dark:text-stone-400 bg-stone-50/60 dark:bg-stone-950/60">
                <th className="py-2.5 px-4">CHAR</th>
                <th className="py-2.5 px-4">PATTERN</th>
                <th className="py-2.5 px-4">MNEMONIC</th>
                <th className="py-2.5 px-4">STATUS</th>
                <th className="py-2.5 px-4 text-right">EASE</th>
                <th className="py-2.5 px-4 text-right">INTERVAL</th>
                <th className="py-2.5 px-4 text-right">ACCURACY</th>
                <th className="py-2.5 px-4 text-right">TONE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 dark:divide-stone-800 text-sm">
              {filteredTableRows.map(({ meta, card }) => {
                const acc =
                  card.totalAttempts > 0
                    ? `${Math.round((card.correctAttempts / card.totalAttempts) * 100)}%`
                    : '—';
                const isDue =
                  card.masteryStatus !== 'unseen' && card.nextReviewAt <= Date.now();

                return (
                  <tr
                    key={meta.char}
                    className="hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
                  >
                    <td className="py-2 px-4 font-display font-bold text-base text-stone-900 dark:text-stone-100">
                      {meta.char}
                    </td>
                    <td className="py-2 px-4 font-mono font-semibold text-orange-700 dark:text-amber-400">
                      {meta.code.replace(/\./g, '•').replace(/-/g, '—')}
                    </td>
                    <td className="py-2 px-4 text-xs text-stone-600 dark:text-stone-300">
                      {meta.mnemonicWord} · <span className="font-mono">{meta.phonetic}</span>
                    </td>
                    <td className="py-2 px-4 text-xs font-medium">
                      {card.masteryStatus === 'mastered' && (
                        <span className="text-emerald-700 dark:text-emerald-400">✓ Mastered</span>
                      )}
                      {card.masteryStatus === 'reviewing' && (
                        <span className="text-sky-700 dark:text-sky-400">
                          ↻ Reviewing {isDue ? '· Due' : ''}
                        </span>
                      )}
                      {card.masteryStatus === 'learning' && (
                        <span className="text-amber-700 dark:text-amber-400">
                          ▲ Learning {isDue ? '· Due' : ''}
                        </span>
                      )}
                      {card.masteryStatus === 'unseen' && (
                        <span className="text-stone-400 dark:text-stone-500">
                          Lvl {meta.level}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-xs tabular-nums text-stone-700 dark:text-stone-300">
                      {card.easeFactor.toFixed(2)}
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-xs tabular-nums text-stone-700 dark:text-stone-300">
                      {card.interval === 0 ? 'Today' : `${card.interval}d`}
                    </td>
                    <td className="py-2 px-4 text-right font-mono text-xs tabular-nums text-stone-700 dark:text-stone-300">
                      {acc}
                    </td>
                    <td className="py-2 px-4 text-right">
                      <button
                        type="button"
                        aria-label={`Play Morse audio for ${meta.char}`}
                        onClick={() => morseAudio.playMorseSequence(meta.code, { wpm })}
                        className="p-1.5 rounded-md hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
