import React, { useState } from 'react';
import { Volume2, ArrowRight, Radio, BookOpen, BrainCircuit, Sun, Moon } from 'lucide-react';
import { morseAudio } from '../utils/audioSynth';
import { MORSE_TO_CHAR_MAP } from '../utils/morseData';

interface WelcomeScreenProps {
  onEnterStudio: (initialTab?: 'curriculum' | 'atlas' | 'scenarios' | 'mastery') => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

const FIRST_FOUR_LETTERS = [
  { char: 'A', code: '.-', word: 'Apple', clue: '1 Dot • + 1 Dash —' },
  { char: 'B', code: '-...', word: 'Bee', clue: '1 Dash — + 3 Dots •••' },
  { char: 'C', code: '-.-.', word: 'Cat', clue: 'Dash • Dash •' },
  { char: 'D', code: '-..', word: 'Dog', clue: '1 Dash — + 2 Dots ••' },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onEnterStudio,
  darkMode,
  onToggleDarkMode,
}) => {
  const [pattern, setPattern] = useState<string>('.-');
  const [heroImgError, setHeroImgError] = useState(false);
  const [treeImgError, setTreeImgError] = useState(false);
  const [keyerImgError, setKeyerImgError] = useState(false);
  const [radioImgError, setRadioImgError] = useState(false);

  const matchedChar = MORSE_TO_CHAR_MAP[pattern];

  const handleSelectLetter = (code: string) => {
    setPattern(code);
    morseAudio.playMorseSequence(code);
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col">
      {/* 3-Zone Top Bar */}
      <header className="border-b border-stone-200 dark:border-stone-800 bg-white/90 dark:bg-stone-900/90 backdrop-blur-xs sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <a
            href="#welcome"
            onClick={(e) => e.preventDefault()}
            className="font-display text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 whitespace-nowrap shrink-0"
          >
            Telegraphia
          </a>

          <nav
            aria-label="Welcome navigation"
            className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-600 dark:text-stone-300"
          >
            <button
              type="button"
              onClick={() => onEnterStudio('curriculum')}
              className="hover:text-stone-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              1. Learn A–Z
            </button>
            <button
              type="button"
              onClick={() => onEnterStudio('atlas')}
              className="hover:text-stone-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              2. Picture Chart
            </button>
            <button
              type="button"
              onClick={() => onEnterStudio('scenarios')}
              className="hover:text-stone-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              3. Real Practice
            </button>
            <button
              type="button"
              onClick={() => onEnterStudio('mastery')}
              className="hover:text-stone-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              4. My Progress
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onEnterStudio('curriculum')}
              className="px-4 py-2 text-xs font-semibold text-white bg-orange-700 hover:bg-orange-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Start Level 1 (A–D)
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-10 space-y-12">
        {/* Balanced 2-Column Beginner Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-stone-500 dark:text-stone-400">
                <span>BEGINNER-FRIENDLY · LEARN LIKE A · B · C · D</span>
                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  className="inline-flex items-center gap-1.5 font-sans font-medium text-stone-700 dark:text-stone-300 hover:text-orange-700 dark:hover:text-amber-400 cursor-pointer"
                >
                  {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  <span>{darkMode ? 'Daylight' : 'Dark Mode'}</span>
                </button>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-stone-900 dark:text-stone-100 leading-[1.1]">
                Every letter is made of just two simple sounds.
              </h1>
            </div>

            {/* Interactive 2-Sound Explainer + First 4 Letters (A B C D) */}
            <div className="border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 rounded-xl p-5 space-y-5">
              {/* The 2 Building Blocks */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    morseAudio.playElement('dit');
                    setPattern((p) => (p.length >= 4 ? '.' : p + '.'));
                  }}
                  className="p-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 hover:bg-orange-50 dark:bg-stone-950 dark:hover:bg-stone-800 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="text-left">
                    <div className="text-xs font-mono font-bold text-orange-700 dark:text-amber-400">
                      1. SHORT BEEP
                    </div>
                    <div className="font-display text-xl font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                      Dot (•)
                    </div>
                  </div>
                  <span className="w-5 h-5 rounded-full bg-orange-700 dark:bg-amber-400 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    morseAudio.playElement('dah');
                    setPattern((p) => (p.length >= 4 ? '-' : p + '-'));
                  }}
                  className="p-4 rounded-xl border border-stone-900 dark:border-stone-600 bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 text-white dark:text-stone-950 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="text-left">
                    <div className="text-xs font-mono font-bold text-amber-300 dark:text-orange-700">
                      2. LONG BEEP (3×)
                    </div>
                    <div className="font-display text-xl font-bold mt-0.5">
                      Dash (—)
                    </div>
                  </div>
                  <span className="w-10 h-3.5 rounded-sm bg-current shrink-0" />
                </button>
              </div>

              {/* Click A, B, C, or D to see & hear how they work */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-stone-500 dark:text-stone-400">
                  <span>CLICK A LETTER TO HEAR ITS SOUND:</span>
                  <span>
                    {matchedChar
                      ? `${matchedChar.char} is for ${matchedChar.mnemonicWord}`
                      : 'Custom Pattern'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {FIRST_FOUR_LETTERS.map((item) => {
                    const isSelected = pattern === item.code;
                    return (
                      <button
                        key={item.char}
                        type="button"
                        onClick={() => handleSelectLetter(item.code)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-orange-700 bg-orange-50/70 dark:border-amber-400 dark:bg-stone-800'
                            : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 hover:border-stone-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-display text-2xl font-bold text-stone-900 dark:text-stone-100">
                            {item.char}
                          </span>
                          <Volume2 className="w-3.5 h-3.5 text-orange-700 dark:text-amber-400" />
                        </div>
                        <div className="font-mono text-sm font-bold text-orange-700 dark:text-amber-400 mt-0.5">
                          {item.code.replace(/\./g, '•').replace(/-/g, '—')}
                        </div>
                        <div className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5">
                          {item.word}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Primary CTA */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onEnterStudio('curriculum')}
                className="inline-flex items-center gap-2 px-6 py-3.5 text-sm font-semibold text-white bg-orange-700 hover:bg-orange-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400 rounded-lg transition-colors cursor-pointer"
              >
                Start Level 1: Learn A · B · C · D
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onEnterStudio('atlas')}
                className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-medium text-stone-800 dark:text-stone-200 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-orange-700 dark:text-amber-400" />
                View A–Z Picture Chart
              </button>
            </div>
          </div>

          {/* Right Column: Studio Image */}
          <div className="lg:col-span-5 flex">
            <div className="relative w-full rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-200 dark:bg-stone-900 min-h-[340px]">
              {!heroImgError ? (
                <img
                  src="/src/assets/images/welcome_telegraph_hero_1794416363435.jpg"
                  alt="Brushed-brass telegraph key and acoustic tone generator on oak desk"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-8">
                  <Radio className="w-12 h-12 text-orange-700" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 text-white flex items-center justify-between font-mono text-xs">
                <span>• DOT = SHORT</span>
                <span className="text-amber-300">— DASH = LONG</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3 Step-by-Step Feature Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            type="button"
            onClick={() => onEnterStudio('curriculum')}
            className="group border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-orange-700 dark:hover:border-amber-400 rounded-xl overflow-hidden text-left transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="aspect-[16/10] w-full bg-stone-100 dark:bg-stone-800 overflow-hidden border-b border-stone-200 dark:border-stone-800">
              {!keyerImgError ? (
                <img
                  src="/src/assets/images/harmonic_keyer_studio_1794416366650.jpg"
                  alt="Morse paddle and tuning fork"
                  referrerPolicy="no-referrer"
                  onError={() => setKeyerImgError(true)}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Volume2 className="w-8 h-8 text-orange-700" />
                </div>
              )}
            </div>
            <div className="p-5 flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
                  STEP 1 · 4 LETTERS AT A TIME
                </div>
                <h2 className="font-display text-lg font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                  Learn A–Z with Picture Clues
                </h2>
              </div>
              <ArrowRight className="w-4 h-4 text-orange-700 dark:text-amber-400 shrink-0" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onEnterStudio('atlas')}
            className="group border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-orange-700 dark:hover:border-amber-400 rounded-xl overflow-hidden text-left transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="aspect-[16/10] w-full bg-stone-100 dark:bg-stone-800 overflow-hidden border-b border-stone-200 dark:border-stone-800">
              {!treeImgError ? (
                <img
                  src="/src/assets/images/mnemonic_visual_tree_1794416365417.jpg"
                  alt="Visual signal map"
                  referrerPolicy="no-referrer"
                  onError={() => setTreeImgError(true)}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-orange-700" />
                </div>
              )}
            </div>
            <div className="p-5 flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
                  STEP 2 · VISUAL MAP
                </div>
                <h2 className="font-display text-lg font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                  Interactive A–Z &amp; 0–9 Chart
                </h2>
              </div>
              <ArrowRight className="w-4 h-4 text-orange-700 dark:text-amber-400 shrink-0" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onEnterStudio('scenarios')}
            className="group border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-orange-700 dark:hover:border-amber-400 rounded-xl overflow-hidden text-left transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="aspect-[16/10] w-full bg-stone-100 dark:bg-stone-800 overflow-hidden border-b border-stone-200 dark:border-stone-800">
              {!radioImgError ? (
                <img
                  src="/src/assets/images/maritime_radio_room_1794416366823.jpg"
                  alt="Maritime radio station receiver"
                  referrerPolicy="no-referrer"
                  onError={() => setRadioImgError(true)}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BrainCircuit className="w-8 h-8 text-orange-700" />
                </div>
              )}
            </div>
            <div className="p-5 flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
                  STEP 3 · REAL MESSAGES
                </div>
                <h2 className="font-display text-lg font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                  Decode Words &amp; SOS Signals
                </h2>
              </div>
              <ArrowRight className="w-4 h-4 text-orange-700 dark:text-amber-400 shrink-0" />
            </div>
          </button>
        </section>
      </main>
    </div>
  );
};
