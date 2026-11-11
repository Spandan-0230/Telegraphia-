import React, { useState } from 'react';
import {
  Radio,
  Play,
  Square,
  CheckCircle2,
  RotateCcw,
  Volume2,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  CHAR_TO_MORSE_MAP,
  DECODING_SCENARIOS,
  DecodingScenario,
} from '../utils/morseData';
import {
  TranscriptionResult,
  decodeFromMorse,
  encodeToMorse,
  evaluateTranscription,
  normalizeSignalPattern,
} from '../utils/morseEngine';
import { morseAudio } from '../utils/audioSynth';

interface DecodingLabViewProps {
  onRecordScenarioComplete: (
    scenarioId: string,
    accuracy: number,
    effectiveWpm: number,
    practicedChars: string[]
  ) => void;
  defaultWpm: number;
}

export const DecodingLabView: React.FC<DecodingLabViewProps> = ({
  onRecordScenarioComplete,
  defaultWpm,
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    DECODING_SCENARIOS[0].id
  );
  const [practiceMode, setPracticeMode] = useState<'receive' | 'transmit'>('receive');
  const [scenarioWpm, setScenarioWpm] = useState<number>(defaultWpm);
  const [enableQrnNoise, setEnableQrnNoise] = useState<boolean>(true);
  const [showSignalTape, setShowSignalTape] = useState<boolean>(true);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeSymbolIdx, setActiveSymbolIdx] = useState<number | null>(null);
  const [userCopyText, setUserCopyText] = useState<string>('');
  const [transmitMorseInput, setTransmitMorseInput] = useState<string>('');
  const [startTimeMs, setStartTimeMs] = useState<number | null>(null);
  const [evaluation, setEvaluation] = useState<TranscriptionResult | null>(null);
  const [radioImgError, setRadioImgError] = useState<boolean>(false);

  const activeScenario: DecodingScenario =
    DECODING_SCENARIOS.find((s) => s.id === selectedScenarioId) ?? DECODING_SCENARIOS[0];
  const scenarioMorse = encodeToMorse(activeScenario.message);

  const handleSelectScenario = (scenario: DecodingScenario) => {
    morseAudio.stopAll();
    setIsPlaying(false);
    setActiveSymbolIdx(null);
    setSelectedScenarioId(scenario.id);
    setScenarioWpm(scenario.recommendedWpm);
    setUserCopyText('');
    setTransmitMorseInput('');
    setEvaluation(null);
    setStartTimeMs(null);
  };

  const handlePlayTransmission = () => {
    if (isPlaying) {
      morseAudio.stopAll();
      setIsPlaying(false);
      setActiveSymbolIdx(null);
      return;
    }

    if (!startTimeMs) {
      setStartTimeMs(Date.now());
    }
    setIsPlaying(true);
    setActiveSymbolIdx(null);

    morseAudio.playMorseSequence(scenarioMorse, {
      wpm: scenarioWpm,
      farnsworthWpm: Math.max(10, scenarioWpm - 3),
      noiseLevel: enableQrnNoise ? activeScenario.noiseLevel : 0,
      onElementStart: (idx) => setActiveSymbolIdx(idx),
      onComplete: () => {
        setIsPlaying(false);
        setActiveSymbolIdx(null);
      },
    });
  };

  const handleReceiveInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!startTimeMs) setStartTimeMs(Date.now());
    const val = e.target.value;
    const lastChar = val.slice(-1).toUpperCase();

    if (lastChar && CHAR_TO_MORSE_MAP[lastChar] && !isPlaying) {
      morseAudio.playMorseSequence(CHAR_TO_MORSE_MAP[lastChar].code, {
        wpm: Math.max(20, scenarioWpm + 4),
      });
    }

    setUserCopyText(val);
  };

  const handleTransmitMorseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!startTimeMs) setStartTimeMs(Date.now());
    const val = e.target.value;
    const last = val.slice(-1);
    if (last === '.' || last === '•') {
      morseAudio.playElement('dit', scenarioWpm);
    } else if (last === '-' || last === '—' || last === '_') {
      morseAudio.playElement('dah', scenarioWpm);
    }
    setTransmitMorseInput(normalizeSignalPattern(val));
  };

  const handleAppendTransmitElement = (sig: '.' | '-' | ' ' | ' / ') => {
    if (!startTimeMs) setStartTimeMs(Date.now());
    if (sig === '.') morseAudio.playElement('dit', scenarioWpm);
    if (sig === '-') morseAudio.playElement('dah', scenarioWpm);
    setTransmitMorseInput((prev) => prev + sig);
  };

  const handleEvaluate = (e: React.FormEvent) => {
    e.preventDefault();
    morseAudio.stopAll();
    setIsPlaying(false);

    const elapsedSec = startTimeMs ? Math.max(3, (Date.now() - startTimeMs) / 1000) : 15;
    const actualPlainText =
      practiceMode === 'receive' ? userCopyText : decodeFromMorse(transmitMorseInput);

    const res = evaluateTranscription(activeScenario.message, actualPlainText, elapsedSec);
    setEvaluation(res);

    const uniqueChars = Array.from(
      new Set(activeScenario.message.replace(/\s+/g, '').split(''))
    );
    onRecordScenarioComplete(
      activeScenario.id,
      res.accuracyPercent,
      res.effectiveWpm,
      uniqueChars
    );
  };

  return (
    <div className="space-y-6">
      {/* Compact Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-stone-500 dark:text-stone-400">
            FIELD COPY SIMULATOR · 6 LIVE DISPATCHES
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 mt-0.5">
            Real-World Decoding Lab
          </h1>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-1 p-1 bg-stone-200/70 dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800">
          <button
            type="button"
            onClick={() => {
              setPracticeMode('receive');
              setEvaluation(null);
            }}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              practiceMode === 'receive'
                ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Receive &amp; Decode
          </button>
          <button
            type="button"
            onClick={() => {
              setPracticeMode('transmit');
              setEvaluation(null);
            }}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              practiceMode === 'transmit'
                ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Transmit Keyer (. / -)
          </button>
        </div>
      </div>

      {/* Symmetrical 2-Column Split (items-stretch) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (4 cols): Station Card & Mission List */}
        <div className="lg:col-span-4 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 rounded-xl overflow-hidden flex flex-col justify-between">
          <div className="aspect-[16/9] bg-stone-100 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-800 relative">
            {!radioImgError ? (
              <img
                src="/src/assets/images/maritime_radio_room_1794416366823.jpg"
                alt="Coastal maritime radio receiver"
                referrerPolicy="no-referrer"
                onError={() => setRadioImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-6">
                <Radio className="w-8 h-8 text-orange-700" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-4 py-2.5 text-white flex items-center justify-between text-xs font-mono">
              <span>{activeScenario.frequencyKhz}</span>
              <span>{activeScenario.station}</span>
            </div>
          </div>

          <div className="p-4 flex-1 flex flex-col justify-between gap-2">
            {DECODING_SCENARIOS.map((sc) => {
              const isSelected = sc.id === activeScenario.id;
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => handleSelectScenario(sc)}
                  className={`w-full px-3.5 py-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-stone-900 text-white border-stone-900 dark:bg-stone-100 dark:text-stone-950 dark:border-stone-100'
                      : 'bg-stone-50 dark:bg-stone-950 text-stone-800 dark:text-stone-200 border-stone-200 dark:border-stone-800 hover:border-stone-400'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{sc.title}</div>
                    <div className="text-[11px] opacity-75 font-mono truncate">
                      {sc.difficulty} · {sc.frequencyKhz}
                    </div>
                  </div>
                  <span className="font-mono text-xs font-semibold shrink-0">
                    {sc.recommendedWpm} WPM
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column (8 cols): Interactive Receiver & Logbook Console */}
        <div className="lg:col-span-8 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 rounded-xl p-6 flex flex-col justify-between gap-6">
          {/* Station Header & Controls */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 dark:border-stone-800 pb-4">
              <div>
                <div className="text-xs font-mono text-stone-500 dark:text-stone-400">
                  {activeScenario.station.toUpperCase()} · {activeScenario.location.toUpperCase()}
                </div>
                <h2 className="font-display text-2xl font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                  {activeScenario.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={handlePlayTransmission}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isPlaying
                    ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950'
                    : 'bg-orange-700 hover:bg-orange-800 text-white dark:bg-amber-500 dark:text-stone-950'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    Stop Signal
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    Play Dispatch
                  </>
                )}
              </button>
            </div>

            {/* Compact Parameter Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-stone-50 dark:bg-stone-950 px-4 py-3 rounded-lg border border-stone-200 dark:border-stone-800 items-center">
              <div className="flex items-center gap-3">
                <label
                  htmlFor="scenario-wpm-slider"
                  className="text-xs font-mono text-stone-600 dark:text-stone-400 whitespace-nowrap"
                >
                  {scenarioWpm} WPM
                </label>
                <input
                  id="scenario-wpm-slider"
                  type="range"
                  min={10}
                  max={28}
                  value={scenarioWpm}
                  onChange={(e) => setScenarioWpm(Number(e.target.value))}
                  className="w-full accent-orange-700 dark:accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center sm:justify-center">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-stone-700 dark:text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableQrnNoise}
                    onChange={(e) => setEnableQrnNoise(e.target.checked)}
                    className="rounded border-stone-300 accent-orange-700"
                  />
                  Static (QRN)
                </label>
              </div>

              <div className="flex items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowSignalTape((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white cursor-pointer"
                >
                  {showSignalTape ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      Ear-Only Mode
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      Show Signal Tape
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Live Signal Tape */}
          <div className="border border-stone-200 dark:border-stone-800 rounded-xl p-5 bg-stone-50/70 dark:bg-stone-950 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-stone-500 dark:text-stone-400">
              <span>INCOMING CW STREAM</span>
              <span>{activeScenario.translationHint}</span>
            </div>

            {showSignalTape ? (
              <div
                aria-label="Incoming Morse signal tape"
                className="p-4 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 font-mono text-lg tracking-widest leading-relaxed select-all"
              >
                {(() => {
                  let symCounter = 0;
                  return scenarioMorse.split('').map((ch, idx) => {
                    if (ch === '.' || ch === '-') {
                      const myIndex = symCounter++;
                      const isCurrent = activeSymbolIdx === myIndex;
                      return (
                        <span
                          key={idx}
                          className={`inline-block px-0.5 rounded transition-colors ${
                            isCurrent
                              ? 'bg-orange-700 text-white dark:bg-amber-400 dark:text-stone-950 font-bold'
                              : 'text-stone-900 dark:text-stone-100'
                          }`}
                        >
                          {ch === '.' ? '•' : '—'}
                        </span>
                      );
                    }
                    return (
                      <span key={idx} className="text-stone-400 dark:text-stone-500">
                        {ch}
                      </span>
                    );
                  });
                })()}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-mono text-stone-500 dark:text-stone-400 text-center">
                SIGNAL TAPE HIDDEN · CLICK PLAY DISPATCH TO COPY BY EAR
              </div>
            )}
          </div>

          {/* Interactive Logbook Copy Input */}
          <form onSubmit={handleEvaluate} className="space-y-3">
            {practiceMode === 'receive' ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <label htmlFor="scenario-copy-input" className="sr-only">
                  Decoded Message
                </label>
                <input
                  id="scenario-copy-input"
                  type="text"
                  value={userCopyText}
                  onChange={handleReceiveInputChange}
                  placeholder="Type decoded message here (e.g. EAT SUN)..."
                  className="flex-1 px-4 py-3 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-base uppercase placeholder:normal-case text-stone-900 dark:text-stone-100"
                />
                <button
                  type="submit"
                  disabled={!userCopyText.trim()}
                  className="px-6 py-3 rounded-lg text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-950 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                >
                  Verify Logbook Copy
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAppendTransmitElement('.')}
                      className="px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 font-mono text-xs font-semibold cursor-pointer"
                    >
                      Dit (.)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAppendTransmitElement('-')}
                      className="px-4 py-2 rounded-lg border border-stone-800 bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950 font-mono text-xs font-semibold cursor-pointer"
                    >
                      Dah (-)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAppendTransmitElement(' ')}
                      className="px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-mono cursor-pointer"
                    >
                      Space
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAppendTransmitElement(' / ')}
                      className="px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 text-xs font-mono cursor-pointer"
                    >
                      Word (/)
                    </button>
                  </div>
                  <span className="font-mono text-xs text-orange-700 dark:text-amber-400">
                    LIVE: {decodeFromMorse(transmitMorseInput) || '—'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <label htmlFor="scenario-transmit-input" className="sr-only">
                    Transmit Morse Code
                  </label>
                  <input
                    id="scenario-transmit-input"
                    type="text"
                    value={transmitMorseInput}
                    onChange={handleTransmitMorseChange}
                    placeholder={`Key "${activeScenario.message}" in . and - ...`}
                    className="flex-1 px-4 py-3 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-950 font-mono text-base text-stone-900 dark:text-stone-100"
                  />
                  <button
                    type="submit"
                    disabled={!transmitMorseInput.trim()}
                    className="px-6 py-3 rounded-lg text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-950 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Verify Keying
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Evaluation Diff Result */}
          {evaluation && (
            <div className="border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs font-mono font-semibold text-stone-900 dark:text-stone-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                  <span>
                    MATCHED {evaluation.correctChars}/{evaluation.totalChars} CHARS ·{' '}
                    {evaluation.accuracyPercent}% ACCURACY · {evaluation.effectiveWpm} WPM
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      morseAudio.playMorseSequence(scenarioMorse, { wpm: scenarioWpm })
                    }
                    className="inline-flex items-center gap-1 font-medium text-stone-700 dark:text-stone-300 hover:underline cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Replay
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUserCopyText('');
                      setTransmitMorseInput('');
                      setEvaluation(null);
                      setStartTimeMs(null);
                    }}
                    className="inline-flex items-center gap-1 font-medium text-orange-700 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {evaluation.charDiff.map((item, i) => (
                  <div
                    key={i}
                    className={`px-2 py-1 rounded border font-mono text-xs flex flex-col items-center ${
                      item.match
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                        : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    }`}
                  >
                    <span className="font-bold">{item.expected === ' ' ? '␣' : item.expected}</span>
                    <span className="text-[10px] opacity-75">
                      {item.actual === ' ' ? '␣' : item.actual}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
