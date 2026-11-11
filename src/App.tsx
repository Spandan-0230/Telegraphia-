/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Sun, Moon, Radio } from 'lucide-react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { CurriculumView } from './components/CurriculumView';
import { VisualAtlasView } from './components/VisualAtlasView';
import { DecodingLabView } from './components/DecodingLabView';
import { MasteryDashboardView } from './components/MasteryDashboardView';
import {
  SRSCard,
  calculateMasterySummary,
  createInitialSRSDeck,
  updateSRSCard,
} from './utils/morseEngine';
import { morseAudio } from './utils/audioSynth';

type StudioTab = 'curriculum' | 'atlas' | 'scenarios' | 'mastery';

const INITIAL_STREAK_HISTORY = [
  { date: 'Day 1', signalsReviewed: 14, avgWpm: 12 },
  { date: 'Day 2', signalsReviewed: 18, avgWpm: 13 },
  { date: 'Day 3', signalsReviewed: 22, avgWpm: 14 },
  { date: 'Day 4', signalsReviewed: 19, avgWpm: 14 },
  { date: 'Day 5', signalsReviewed: 26, avgWpm: 15 },
  { date: 'Day 6', signalsReviewed: 24, avgWpm: 15 },
  { date: 'Day 7', signalsReviewed: 31, avgWpm: 16 },
  { date: 'Day 8', signalsReviewed: 28, avgWpm: 16 },
  { date: 'Day 9', signalsReviewed: 35, avgWpm: 16 },
  { date: 'Day 10', signalsReviewed: 29, avgWpm: 17 },
  { date: 'Day 11', signalsReviewed: 38, avgWpm: 17 },
  { date: 'Day 12', signalsReviewed: 34, avgWpm: 18 },
  { date: 'Day 13', signalsReviewed: 41, avgWpm: 18 },
  { date: 'Today', signalsReviewed: 27, avgWpm: 18 },
];

export default function App() {
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') return false;
    }
    return true;
  });

  const [activeTab, setActiveTab] = useState<StudioTab>('curriculum');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('telegraphia_dark') === 'true';
    }
    return false;
  });

  const [wpm, setWpm] = useState<number>(16);
  const [frequencyHz, setFrequencyHz] = useState<number>(600);
  const [muted, setMuted] = useState<boolean>(false);

  const [srsDeck, setSrsDeck] = useState<Record<string, SRSCard>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('telegraphia_srs_v1');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Fallback to seeded deck
        }
      }
    }
    return createInitialSRSDeck(Date.now(), true);
  });

  const [completedLevels, setCompletedLevels] = useState<number[]>([1]);
  const [streakDays, setStreakDays] = useState<number>(14);
  const [streakHistory, setStreakHistory] = useState(INITIAL_STREAK_HISTORY);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('telegraphia_dark', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    morseAudio.setConfig({ wpm, frequencyHz, muted });
  }, [wpm, frequencyHz, muted]);

  useEffect(() => {
    localStorage.setItem('telegraphia_srs_v1', JSON.stringify(srsDeck));
  }, [srsDeck]);

  const handleRecordAttempt = (
    char: string,
    isCorrect: boolean,
    responseTimeMs: number
  ) => {
    setSrsDeck((prev) => {
      const existing = prev[char];
      if (!existing) return prev;
      return {
        ...prev,
        [char]: updateSRSCard(existing, isCorrect, responseTimeMs),
      };
    });

    setStreakHistory((prev) =>
      prev.map((item, idx) =>
        idx === prev.length - 1
          ? { ...item, signalsReviewed: item.signalsReviewed + 1 }
          : item
      )
    );
  };

  const handleCompleteLevel = (lvl: number) => {
    setCompletedLevels((prev) => (prev.includes(lvl) ? prev : [...prev, lvl]));
  };

  const handleRecordScenarioComplete = (
    _scenarioId: string,
    accuracy: number,
    effectiveWpm: number,
    practicedChars: string[]
  ) => {
    const isGoodCopy = accuracy >= 75;
    setSrsDeck((prev) => {
      const next = { ...prev };
      practicedChars.forEach((ch) => {
        if (next[ch]) {
          next[ch] = updateSRSCard(next[ch], isGoodCopy, 1400);
        }
      });
      return next;
    });

    setStreakHistory((prev) =>
      prev.map((item, idx) =>
        idx === prev.length - 1
          ? {
              ...item,
              signalsReviewed: item.signalsReviewed + practicedChars.length,
              avgWpm: Math.max(item.avgWpm, effectiveWpm),
            }
          : item
      )
    );
  };

  const handleResetProgress = () => {
    const fresh = createInitialSRSDeck(Date.now(), true);
    setSrsDeck(fresh);
    setCompletedLevels([1]);
    setStreakDays(14);
    setStreakHistory(INITIAL_STREAK_HISTORY);
  };

  const masterySummary = calculateMasterySummary(srsDeck);

  if (showWelcome) {
    return (
      <WelcomeScreen
        onEnterStudio={(tab) => {
          if (tab) setActiveTab(tab);
          setShowWelcome(false);
        }}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="border-b border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xs sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-4 md:gap-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="#welcome"
            onClick={(e) => {
              e.preventDefault();
              setShowWelcome(true);
            }}
            className="font-display text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100 whitespace-nowrap shrink-0"
          >
            Telegraphia
          </a>

          {/* Zone 2: 4 concise single-line navigation links */}
          <nav
            aria-label="Main Studio Navigation"
            className="flex items-center gap-4 sm:gap-7 text-xs sm:text-sm font-medium text-stone-600 dark:text-stone-300"
          >
            <button
              type="button"
              onClick={() => setActiveTab('curriculum')}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 ${
                activeTab === 'curriculum'
                  ? 'text-orange-700 dark:text-amber-400 font-semibold underline underline-offset-8 decoration-2'
                  : 'hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              1. Learn A–Z
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('atlas')}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 ${
                activeTab === 'atlas'
                  ? 'text-orange-700 dark:text-amber-400 font-semibold underline underline-offset-8 decoration-2'
                  : 'hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              2. Picture Chart
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scenarios')}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 ${
                activeTab === 'scenarios'
                  ? 'text-orange-700 dark:text-amber-400 font-semibold underline underline-offset-8 decoration-2'
                  : 'hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              3. Real Practice
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mastery')}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 ${
                activeTab === 'mastery'
                  ? 'text-orange-700 dark:text-amber-400 font-semibold underline underline-offset-8 decoration-2'
                  : 'hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              4. My Progress
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('mastery')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-orange-700 hover:bg-orange-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Review Due ({masterySummary.dueNow})
            </button>
          </div>
        </div>
      </header>

      {/* Secondary Workspace Instrument Bar */}
      <div className="border-b border-stone-200 dark:border-stone-800 bg-stone-100/80 dark:bg-stone-900/60">
        <div className="max-w-[1200px] mx-auto px-6 py-2 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 text-stone-600 dark:text-stone-400 font-mono">
            <span>
              MASTERED <strong className="text-stone-900 dark:text-stone-100">{masterySummary.mastered}/36</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              ACCURACY <strong className="text-stone-900 dark:text-stone-100">{masterySummary.overallAccuracy}%</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              STREAK <strong className="text-stone-900 dark:text-stone-100">{streakDays}D</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <label htmlFor="global-wpm-select" className="text-stone-500 dark:text-stone-400 font-mono text-[11px]">
                SPEED
              </label>
              <select
                id="global-wpm-select"
                value={wpm}
                onChange={(e) => setWpm(Number(e.target.value))}
                className="bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-md px-2 py-1 font-mono text-xs text-stone-900 dark:text-stone-100"
              >
                <option value={12}>12 WPM</option>
                <option value={15}>15 WPM</option>
                <option value={16}>16 WPM</option>
                <option value={18}>18 WPM</option>
                <option value={22}>22 WPM</option>
                <option value={25}>25 WPM</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label htmlFor="global-freq-select" className="text-stone-500 dark:text-stone-400 font-mono text-[11px]">
                TONE
              </label>
              <select
                id="global-freq-select"
                value={frequencyHz}
                onChange={(e) => setFrequencyHz(Number(e.target.value))}
                className="bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-md px-2 py-1 font-mono text-xs text-stone-900 dark:text-stone-100"
              >
                <option value={500}>500 Hz</option>
                <option value={600}>600 Hz</option>
                <option value={700}>700 Hz</option>
                <option value={800}>800 Hz</option>
              </select>
            </div>

            <button
              type="button"
              onMouseDown={() => morseAudio.startManualTone()}
              onMouseUp={() => morseAudio.stopManualTone()}
              onMouseLeave={() => morseAudio.stopManualTone()}
              onClick={() => morseAudio.playElement('dit', wpm)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 font-mono text-xs font-medium text-stone-800 dark:text-stone-200 hover:border-orange-700 cursor-pointer"
            >
              <Radio className="w-3 h-3 text-orange-700 dark:text-amber-400" />
              Key
            </button>

            <button
              type="button"
              aria-label={muted ? 'Unmute CW audio' : 'Mute CW audio'}
              onClick={() => setMuted((m) => !m)}
              className="p-1.5 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 cursor-pointer"
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={() => setDarkMode((d) => !d)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 cursor-pointer"
            >
              {darkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Daylight</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-stone-700" />
                  <span>Dark</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-6 py-7">
        {activeTab === 'curriculum' && (
          <CurriculumView
            srsDeck={srsDeck}
            completedLevels={completedLevels}
            onRecordAttempt={handleRecordAttempt}
            onCompleteLevel={handleCompleteLevel}
            wpm={wpm}
          />
        )}

        {activeTab === 'atlas' && <VisualAtlasView srsDeck={srsDeck} wpm={wpm} />}

        {activeTab === 'scenarios' && (
          <DecodingLabView
            onRecordScenarioComplete={handleRecordScenarioComplete}
            defaultWpm={wpm}
          />
        )}

        {activeTab === 'mastery' && (
          <MasteryDashboardView
            srsDeck={srsDeck}
            streakDays={streakDays}
            streakHistory={streakHistory}
            onRecordAttempt={handleRecordAttempt}
            onResetProgress={handleResetProgress}
            wpm={wpm}
          />
        )}
      </main>
    </div>
  );
}
