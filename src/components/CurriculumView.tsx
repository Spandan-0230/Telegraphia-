import React, { useState, useEffect } from 'react';
import {
  Volume2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import {
  CHAR_TO_MORSE_MAP,
  CURRICULUM_LEVELS,
  MorseCharacter,
} from '../utils/morseData';
import {
  SRSCard,
  encodeToMorse,
  generateQuizQuestions,
  normalizeSignalPattern,
} from '../utils/morseEngine';
import { morseAudio } from '../utils/audioSynth';
import { VisualMnemonicArt } from './VisualMnemonicArt';

interface CurriculumViewProps {
  srsDeck: Record<string, SRSCard>;
  completedLevels: number[];
  onRecordAttempt: (char: string, isCorrect: boolean, responseTimeMs: number) => void;
  onCompleteLevel: (level: number) => void;
  wpm: number;
}

export const CurriculumView: React.FC<CurriculumViewProps> = ({
  srsDeck,
  completedLevels,
  onRecordAttempt,
  onCompleteLevel,
  wpm,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [selectedChar, setSelectedChar] = useState<string>('A');
  const [activeElementIdx, setActiveElementIdx] = useState<number | null>(null);

  // Guided Step 3 "Tap It Yourself" state for the currently selected letter
  const [guidedTaps, setGuidedTaps] = useState<string>('');
  const [practicedInLevel, setPracticedInLevel] = useState<string[]>([]);

  // Quiz state
  const [quizMode, setQuizMode] = useState<boolean>(false);
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [quizInput, setQuizInput] = useState<string>('');
  const [quizFeedback, setQuizFeedback] = useState<{
    status: 'idle' | 'correct' | 'incorrect';
    message: string;
  }>({ status: 'idle', message: '' });
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [quizScore, setQuizScore] = useState<{ correct: number; total: number }>({
    correct: 0,
    total: 0,
  });
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);

  const currentLevelObj =
    CURRICULUM_LEVELS.find((l) => l.level === selectedLevel) ?? CURRICULUM_LEVELS[0];
  const currentCharObj: MorseCharacter =
    CHAR_TO_MORSE_MAP[selectedChar] ?? CHAR_TO_MORSE_MAP[currentLevelObj.characters[0]];

  const quizQuestions = generateQuizQuestions(selectedLevel);
  const activeQuestion = quizQuestions[quizIndex];

  useEffect(() => {
    if (!currentLevelObj.characters.includes(selectedChar)) {
      setSelectedChar(currentLevelObj.characters[0]);
      setGuidedTaps('');
    }
  }, [selectedLevel, currentLevelObj, selectedChar]);

  const handlePlayCharacter = (charObj: MorseCharacter, customWpm?: number) => {
    setActiveElementIdx(null);
    morseAudio.playMorseSequence(charObj.code, {
      wpm: customWpm ?? wpm,
      onElementStart: (idx) => setActiveElementIdx(idx),
      onComplete: () => setActiveElementIdx(null),
    });
  };

  // Guided Step 3: User taps Dot (.) or Dash (-) to match the current character
  const targetElements = currentCharObj.code.split('') as ('.' | '-')[];
  const isGuidedComplete = guidedTaps === currentCharObj.code;

  const handleGuidedTap = (sig: '.' | '-') => {
    morseAudio.playElement(sig === '.' ? 'dit' : 'dah', wpm);

    if (isGuidedComplete) {
      setGuidedTaps(sig);
      return;
    }

    const nextIdx = guidedTaps.length;
    const expectedNext = targetElements[nextIdx];

    if (sig === expectedNext) {
      const updated = guidedTaps + sig;
      setGuidedTaps(updated);
      if (updated === currentCharObj.code) {
        onRecordAttempt(currentCharObj.char, true, 1000);
        setPracticedInLevel((prev) =>
          prev.includes(currentCharObj.char) ? prev : [...prev, currentCharObj.char]
        );
      }
    } else {
      // Reset and let them try from the first slot if they tapped the wrong one
      setGuidedTaps(sig === targetElements[0] ? sig : '');
    }
  };

  const handleNextLetterInLevel = () => {
    const idx = currentLevelObj.characters.indexOf(currentCharObj.char);
    if (idx >= 0 && idx + 1 < currentLevelObj.characters.length) {
      const nextChar = currentLevelObj.characters[idx + 1];
      setSelectedChar(nextChar);
      setGuidedTaps('');
      const nextObj = CHAR_TO_MORSE_MAP[nextChar];
      if (nextObj) handlePlayCharacter(nextObj);
    } else {
      handleStartQuiz();
    }
  };

  const handleStartQuiz = () => {
    setQuizMode(true);
    setQuizIndex(0);
    setQuizInput('');
    setQuizFeedback({ status: 'idle', message: '' });
    setQuizScore({ correct: 0, total: 0 });
    setQuizCompleted(false);
    setQuestionStartTime(Date.now());
    const firstQ = quizQuestions[0];
    if (firstQ) {
      setTimeout(() => {
        morseAudio.playMorseSequence(firstQ.targetCode, { wpm });
      }, 120);
    }
  };

  const handleSelectOption = (optionChar: string) => {
    if (!activeQuestion || quizFeedback.status !== 'idle') return;
    const elapsed = Date.now() - questionStartTime;
    const isCorrect = optionChar.toUpperCase() === activeQuestion.targetChar.toUpperCase();

    const optMorse = encodeToMorse(optionChar);
    if (optMorse) {
      morseAudio.playMorseSequence(optMorse, { wpm });
    }

    if (activeQuestion.targetChar.length === 1) {
      onRecordAttempt(activeQuestion.targetChar, isCorrect, elapsed);
    }

    setQuizScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    setQuizFeedback({
      status: isCorrect ? 'correct' : 'incorrect',
      message: isCorrect
        ? `Correct! ${activeQuestion.targetChar} is ${activeQuestion.targetCode.replace(/\./g, '•').replace(/-/g, '—')}`
        : `That was ${activeQuestion.targetChar} (${activeQuestion.targetCode.replace(/\./g, '•').replace(/-/g, '—')})`,
    });
  };

  const handleQuizSignalAppend = (sig: '.' | '-') => {
    if (quizFeedback.status !== 'idle') return;
    morseAudio.playElement(sig === '.' ? 'dit' : 'dah', wpm);
    setQuizInput((prev) => prev + sig);
  };

  const handleQuizInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (quizFeedback.status !== 'idle') return;
    const val = e.target.value;
    const lastChar = val.slice(-1);

    if (lastChar === '.' || lastChar === '•') {
      morseAudio.playElement('dit', wpm);
    } else if (lastChar === '-' || lastChar === '—' || lastChar === '_') {
      morseAudio.playElement('dah', wpm);
    } else if (lastChar && /[a-zA-Z0-9]/.test(lastChar)) {
      const code = CHAR_TO_MORSE_MAP[lastChar.toUpperCase()]?.code;
      if (code) morseAudio.playMorseSequence(code, { wpm });
    }

    setQuizInput(val);
  };

  const handleSubmitQuizInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuestion || quizFeedback.status !== 'idle') return;

    const elapsed = Date.now() - questionStartTime;
    let isCorrect = false;

    if (activeQuestion.type === 'encode-signal') {
      const normalized = normalizeSignalPattern(quizInput).replace(/\s+/g, '');
      isCorrect = normalized === activeQuestion.targetCode;
    } else {
      isCorrect = quizInput.trim().toUpperCase() === activeQuestion.targetChar.toUpperCase();
    }

    if (activeQuestion.targetChar.length === 1) {
      onRecordAttempt(activeQuestion.targetChar, isCorrect, elapsed);
    } else {
      activeQuestion.targetChar.split('').forEach((ch) => {
        if (CHAR_TO_MORSE_MAP[ch]) {
          onRecordAttempt(ch, isCorrect, elapsed / activeQuestion.targetChar.length);
        }
      });
    }

    setQuizScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    setQuizFeedback({
      status: isCorrect ? 'correct' : 'incorrect',
      message: isCorrect
        ? `Correct! ${activeQuestion.targetChar} = ${activeQuestion.targetCode.replace(/\./g, '•').replace(/-/g, '—')}`
        : `Answer: ${
            activeQuestion.type === 'encode-signal'
              ? activeQuestion.targetCode.replace(/\./g, '•').replace(/-/g, '—')
              : activeQuestion.targetChar
          }`,
    });
  };

  const handleNextQuestion = () => {
    if (quizIndex + 1 < quizQuestions.length) {
      const nextIdx = quizIndex + 1;
      setQuizIndex(nextIdx);
      setQuizInput('');
      setQuizFeedback({ status: 'idle', message: '' });
      setQuestionStartTime(Date.now());
      const nextQ = quizQuestions[nextIdx];
      if (nextQ) {
        morseAudio.playMorseSequence(nextQ.targetCode, { wpm });
      }
    } else {
      setQuizCompleted(true);
      onCompleteLevel(selectedLevel);
    }
  };

  const currentLetterIndex = currentLevelObj.characters.indexOf(currentCharObj.char);
  const nextLetterChar =
    currentLetterIndex >= 0 && currentLetterIndex + 1 < currentLevelObj.characters.length
      ? currentLevelObj.characters[currentLetterIndex + 1]
      : null;

  return (
    <div className="space-y-6">
      {/* Compact Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-stone-500 dark:text-stone-400">
            {currentLevelObj.subtitle.toUpperCase()}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 mt-0.5">
            {currentLevelObj.title}
          </h1>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!quizMode ? (
            <button
              type="button"
              onClick={handleStartQuiz}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-orange-700 hover:bg-orange-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Take Level {selectedLevel} Quiz ({quizQuestions.length} Questions)
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setQuizMode(false)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Return to Lesson
            </button>
          )}
        </div>
      </div>

      {/* 7-Level ABCD Segmented Bar */}
      <div
        role="tablist"
        aria-label="Curriculum Levels"
        className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2"
      >
        {CURRICULUM_LEVELS.map((lvl) => {
          const isSelected = lvl.level === selectedLevel;
          const isDone = completedLevels.includes(lvl.level);
          return (
            <button
              key={lvl.level}
              role="tab"
              aria-selected={isSelected}
              type="button"
              onClick={() => {
                setSelectedLevel(lvl.level);
                setQuizMode(false);
                setGuidedTaps('');
              }}
              className={`px-3 py-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-stone-900 text-white border-stone-900 dark:bg-stone-100 dark:text-stone-950 dark:border-stone-100'
                  : 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-mono font-semibold">LEVEL {lvl.level}</span>
                {isDone && (
                  <CheckCircle2
                    className={`w-3.5 h-3.5 ${
                      isSelected
                        ? 'text-amber-400 dark:text-orange-700'
                        : 'text-emerald-700 dark:text-emerald-400'
                    }`}
                  />
                )}
              </div>
              <div className="font-mono text-xs font-bold mt-1 truncate">
                {lvl.characters.join(' · ')}
              </div>
            </button>
          );
        })}
      </div>

      {quizMode ? (
        <section
          aria-label={`Level ${selectedLevel} Quiz`}
          className="border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 rounded-xl p-6 sm:p-8 max-w-2xl mx-auto space-y-6"
        >
          {quizCompleted ? (
            <div className="text-center py-4 space-y-5">
              <CheckCircle2 className="w-10 h-10 text-emerald-700 dark:text-emerald-400 mx-auto" />
              <div className="space-y-1">
                <div className="text-xs font-mono text-stone-500 dark:text-stone-400">
                  LEVEL {selectedLevel} COMPLETE
                </div>
                <h2 className="font-display text-3xl font-bold text-stone-900 dark:text-stone-100">
                  {quizScore.correct} / {quizScore.total} Correct (
                  {Math.round((quizScore.correct / Math.max(1, quizScore.total)) * 100)}%)
                </h2>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleStartQuiz}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium border border-stone-300 dark:border-stone-700 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Retry Quiz
                </button>
                {selectedLevel < CURRICULUM_LEVELS.length && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLevel((prev) => Math.min(CURRICULUM_LEVELS.length, prev + 1));
                      setQuizMode(false);
                      setGuidedTaps('');
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-orange-700 hover:bg-orange-800 dark:bg-amber-500 dark:text-stone-950 rounded-lg transition-colors cursor-pointer"
                  >
                    Next Level (Level {selectedLevel + 1})
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            activeQuestion && (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
                  <div className="text-xs text-stone-500 dark:text-stone-400 font-mono">
                    QUESTION {quizIndex + 1} OF {quizQuestions.length} · SCORE {quizScore.correct}/
                    {quizScore.total}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      morseAudio.playMorseSequence(activeQuestion.targetCode, { wpm })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-orange-700 dark:text-amber-400 border border-orange-300 dark:border-amber-500/40 rounded-md hover:bg-orange-50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Play Sound Again
                  </button>
                </div>

                <div className="space-y-1">
                  <h2 className="font-display text-xl font-bold text-stone-900 dark:text-stone-100">
                    {activeQuestion.promptText}
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Clue: {activeQuestion.mnemonicHint}
                  </p>
                </div>

                {activeQuestion.type === 'listen-identify' && activeQuestion.options ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {activeQuestion.options.map((opt) => {
                      const charInfo = CHAR_TO_MORSE_MAP[opt];
                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={quizFeedback.status !== 'idle'}
                          onClick={() => handleSelectOption(opt)}
                          className="p-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 hover:border-orange-700 dark:hover:border-amber-400 transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-60"
                        >
                          <span className="font-display text-3xl font-bold text-stone-900 dark:text-stone-100">
                            {opt}
                          </span>
                          {charInfo && (
                            <span className="text-xs text-stone-500 dark:text-stone-400">
                              {charInfo.mnemonicWord}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <form onSubmit={handleSubmitQuizInput} className="space-y-4">
                    {activeQuestion.type === 'encode-signal' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuizSignalAppend('.')}
                          className="flex-1 py-2.5 px-4 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 font-mono text-xs font-semibold hover:bg-orange-50 cursor-pointer"
                        >
                          + Dot (•)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuizSignalAppend('-')}
                          className="flex-1 py-2.5 px-4 rounded-lg border border-stone-800 dark:border-stone-600 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 font-mono text-xs font-semibold cursor-pointer"
                        >
                          + Dash (—)
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuizInput('')}
                          className="px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-800 text-xs text-stone-500 hover:text-stone-900 dark:hover:text-white cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <label htmlFor="quiz-answer-input" className="sr-only">
                        Your Quiz Answer
                      </label>
                      <input
                        id="quiz-answer-input"
                        type="text"
                        value={quizInput}
                        onChange={handleQuizInputChange}
                        placeholder={
                          activeQuestion.type === 'encode-signal'
                            ? 'Tap Dot (.) or Dash (-)...'
                            : 'Type the word...'
                        }
                        className="flex-1 px-4 py-3 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-base text-stone-900 dark:text-stone-100"
                      />
                      <button
                        type="submit"
                        disabled={!quizInput.trim() || quizFeedback.status !== 'idle'}
                        className="px-5 py-3 rounded-lg text-xs font-semibold text-white bg-orange-700 hover:bg-orange-800 dark:bg-amber-500 dark:text-stone-950 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Check
                      </button>
                    </div>
                  </form>
                )}

                {quizFeedback.status !== 'idle' && (
                  <div
                    className={`p-3.5 rounded-lg border flex items-center justify-between gap-4 ${
                      quizFeedback.status === 'correct'
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                        : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-mono font-semibold">
                      {quizFeedback.status === 'correct' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                      )}
                      <span>{quizFeedback.message}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleNextQuestion}
                      className="px-4 py-1.5 rounded-md text-xs font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {quizIndex + 1 < quizQuestions.length ? 'Next' : 'Finish'}
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </section>
      ) : (
        /* Guided 3-Step Learning Layout: Left (Step 1 See + Step 2 Hear) | Right (Step 3 Tap It Yourself) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column (7 cols): Choose Letter + See Picture Clue + Hear Sound Blocks */}
          <div className="lg:col-span-7 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 rounded-xl p-6 flex flex-col justify-between gap-5">
            {/* Character Selector Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {currentLevelObj.characters.map((ch) => {
                  const charData = CHAR_TO_MORSE_MAP[ch];
                  const isDone =
                    practicedInLevel.includes(ch) || srsDeck[ch]?.masteryStatus === 'mastered';
                  const isActive = ch === currentCharObj.char;

                  return (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => {
                        setSelectedChar(ch);
                        setGuidedTaps('');
                        if (charData) handlePlayCharacter(charData);
                      }}
                      className={`px-4 py-2.5 rounded-xl border transition-all flex items-center gap-2.5 cursor-pointer ${
                        isActive
                          ? 'bg-orange-700 text-white border-orange-800 dark:bg-amber-500 dark:text-stone-950 dark:border-amber-400'
                          : 'bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 border-stone-200 dark:border-stone-800 hover:border-stone-400'
                      }`}
                    >
                      <span className="font-display text-2xl font-bold">{ch}</span>
                      <div className="text-left">
                        <div className="font-mono text-xs font-bold">
                          {charData?.code.replace(/\./g, '•').replace(/-/g, '—')}
                        </div>
                        <div className="text-[10px] opacity-80">{charData?.mnemonicWord}</div>
                      </div>
                      {isDone && <CheckCircle2 className="w-3.5 h-3.5 opacity-90" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 1 & Step 2 Visual + Sound Card */}
            <VisualMnemonicArt
              character={currentCharObj}
              activeElementIndex={activeElementIdx}
              onPlayFull={() => handlePlayCharacter(currentCharObj, wpm)}
              onPlayElement={(type, idx) => {
                setActiveElementIdx(idx);
                const dur = morseAudio.playElement(type, wpm);
                setTimeout(() => setActiveElementIdx(null), dur + 60);
              }}
            />

            {/* Simple Word Chips using letters from this level */}
            <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono text-stone-500 dark:text-stone-400">
                HEAR WORDS WITH THESE LETTERS:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {currentLevelObj.practiceWords.map((word) => (
                  <button
                    key={word}
                    type="button"
                    onClick={() => morseAudio.playText(word, { wpm })}
                    className="px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 hover:border-orange-700 dark:hover:border-amber-400 font-mono text-xs font-semibold text-stone-800 dark:text-stone-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>{word}</span>
                    <Volume2 className="w-3 h-3 text-orange-700 dark:text-amber-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): Step 3 — Guided "Tap It Yourself" Practice Pad */}
          <div className="lg:col-span-5 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 rounded-xl p-6 flex flex-col justify-between gap-5">
            <div className="space-y-1">
              <div className="text-xs font-mono font-semibold text-orange-700 dark:text-amber-400">
                STEP 3 · TAP IT YOURSELF
              </div>
              <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-stone-100">
                Practice tapping “{currentCharObj.char}” ({currentCharObj.mnemonicWord})
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Tap the buttons below in order:{' '}
                <strong className="text-stone-800 dark:text-stone-200">
                  {currentCharObj.phonetic}
                </strong>
              </p>
            </div>

            {/* Visual Slot-by-Slot Progress for Current Letter */}
            <div className="p-5 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-stone-500 dark:text-stone-400">
                <span>YOUR TAPS</span>
                <span>
                  {guidedTaps.length} / {targetElements.length} COMPLETED
                </span>
              </div>

              <div className="flex items-center justify-center gap-3 py-2">
                {targetElements.map((expectedEl, idx) => {
                  const isFilled = idx < guidedTaps.length;
                  const isNext = idx === guidedTaps.length;
                  return (
                    <div
                      key={idx}
                      className={`flex-1 py-4 px-3 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                        isFilled
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-600 dark:border-emerald-500 text-emerald-900 dark:text-emerald-200'
                          : isNext
                          ? 'bg-white dark:bg-stone-900 border-orange-700 dark:border-amber-400 text-stone-900 dark:text-stone-100'
                          : 'bg-stone-100/60 dark:bg-stone-900/40 border-dashed border-stone-300 dark:border-stone-700 text-stone-400'
                      }`}
                    >
                      <span className="font-mono text-2xl font-bold">
                        {expectedEl === '.' ? '•' : '—'}
                      </span>
                      <span className="text-[11px] font-mono mt-1">
                        {isFilled
                          ? '✓ Done'
                          : expectedEl === '.'
                          ? 'Tap Dot'
                          : 'Tap Dash'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Big Friendly Dot & Dash Tap Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleGuidedTap('.')}
                className="py-4 px-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-100 hover:bg-orange-50 dark:bg-stone-800 dark:hover:bg-stone-700 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <span className="w-4 h-4 rounded-full bg-orange-700 dark:bg-amber-400" />
                <span className="font-mono text-sm font-bold text-stone-900 dark:text-stone-100">
                  Tap Dot (•)
                </span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400">
                  Short Beep
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleGuidedTap('-')}
                className="py-4 px-4 rounded-xl border border-stone-900 dark:border-stone-600 bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-950 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <span className="w-9 h-3 rounded-sm bg-current" />
                <span className="font-mono text-sm font-bold">Tap Dash (—)</span>
                <span className="text-[11px] opacity-75">Long Beep</span>
              </button>
            </div>

            {/* Success Banner or Reset/Next Controls */}
            {isGuidedComplete ? (
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <span>Awesome! You tapped {currentCharObj.char}!</span>
                </div>
                <button
                  type="button"
                  onClick={handleNextLetterInLevel}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shrink-0"
                >
                  <span>
                    {nextLetterChar ? `Next Letter (${nextLetterChar})` : 'Start Level Quiz'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                <button
                  type="button"
                  onClick={() => setGuidedTaps('')}
                  className="hover:text-stone-900 dark:hover:text-white underline cursor-pointer"
                >
                  Reset Taps
                </button>
                <button
                  type="button"
                  onClick={handleNextLetterInLevel}
                  className="inline-flex items-center gap-1 font-semibold text-orange-700 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  <span>
                    {nextLetterChar ? `Skip to ${nextLetterChar}` : 'Go to Level Quiz'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
