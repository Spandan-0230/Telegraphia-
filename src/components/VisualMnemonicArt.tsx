import React from 'react';
import { Volume2 } from 'lucide-react';
import { MorseCharacter } from '../utils/morseData';

interface VisualMnemonicArtProps {
  character: MorseCharacter;
  activeElementIndex?: number | null;
  onPlayElement?: (type: 'dit' | 'dah', index: number) => void;
  onPlayFull?: () => void;
}

/**
 * Renders a visual "ABCD Picture-Book" card showing:
 * 1. An illustrated SVG of the letter itself with Dots (circles) and Dashes (bars) drawn directly onto it.
 * 2. Big, friendly "Short Dot (•)" and "Long Dash (—)" sound blocks that light up when played.
 */
export const VisualMnemonicArt: React.FC<VisualMnemonicArtProps> = ({
  character,
  activeElementIndex = null,
  onPlayElement,
  onPlayFull,
}) => {
  const elements = character.code.split('') as ('.' | '-')[];

  return (
    <div className="border border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/70 rounded-xl p-5 flex flex-col justify-between gap-5">
      {/* Step 1: Visual Letter-Shape Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-4">
        <div className="flex items-center gap-4">
          {/* Interactive Letter + Overlaid Dot/Dash Visual SVG */}
          <button
            type="button"
            onClick={onPlayFull}
            aria-label={`Play Morse sound for ${character.char}`}
            className="relative w-20 h-20 rounded-xl bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex flex-col items-center justify-center hover:border-orange-700 dark:hover:border-amber-400 transition-colors cursor-pointer shrink-0 group"
          >
            <span className="font-display text-4xl font-bold text-stone-900 dark:text-stone-100 leading-none">
              {character.char}
            </span>
            {/* Mini visual dot-dash badge right inside the letter tile */}
            <div className="flex items-center gap-1 mt-1.5">
              {elements.map((el, i) =>
                el === '.' ? (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-orange-700 dark:bg-amber-400 inline-block"
                  />
                ) : (
                  <span
                    key={i}
                    className="w-4 h-2 rounded-xs bg-stone-900 dark:bg-stone-100 inline-block"
                  />
                )
              )}
            </div>
          </button>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold text-orange-700 dark:text-amber-400 uppercase">
                Step 1 · Picture Clue
              </span>
            </div>
            <div className="font-display text-2xl font-bold text-stone-900 dark:text-stone-100">
              {character.char} is for {character.mnemonicWord}
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              {character.visualCue}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onPlayFull}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-orange-700 hover:bg-orange-800 text-white dark:bg-amber-500 dark:text-stone-950 font-semibold text-xs transition-colors cursor-pointer shrink-0 self-end sm:self-center"
        >
          <Volume2 className="w-4 h-4" />
          Hear “{character.char}”
        </button>
      </div>

      {/* Step 2: Interactive Sound Blocks (Click any Dot or Dash to hear it!) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono font-semibold text-stone-700 dark:text-stone-300">
            STEP 2 · CLICK EACH SOUND BLOCK ({elements.length}{' '}
            {elements.length === 1 ? 'PART' : 'PARTS'})
          </span>
          <span className="font-mono text-stone-500 dark:text-stone-400">
            {character.phonetic}
          </span>
        </div>

        <div className="flex items-stretch gap-2.5">
          {elements.map((el, idx) => {
            const isDit = el === '.';
            const isActive = activeElementIndex === idx;

            return (
              <button
                key={`${character.char}-el-${idx}`}
                type="button"
                onClick={() => onPlayElement?.(isDit ? 'dit' : 'dah', idx)}
                style={{ flexGrow: isDit ? 1 : 2.2 }}
                aria-label={`Play ${isDit ? 'Short Dot' : 'Long Dash'} ${idx + 1} for ${character.char}`}
                className={`rounded-xl py-3.5 px-3 transition-all flex flex-col items-center justify-center border cursor-pointer ${
                  isActive
                    ? 'bg-orange-700 text-white border-orange-800 dark:bg-amber-500 dark:text-stone-950 dark:border-amber-400 scale-[1.03]'
                    : isDit
                    ? 'bg-white hover:bg-orange-50 text-stone-900 border-stone-300 dark:bg-stone-900 dark:hover:bg-stone-800 dark:text-stone-100 dark:border-stone-700'
                    : 'bg-stone-900 hover:bg-stone-800 text-stone-50 border-stone-900 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-100 dark:border-stone-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isDit ? (
                    <span className="w-3.5 h-3.5 rounded-full bg-orange-700 dark:bg-amber-400 inline-block" />
                  ) : (
                    <span className="w-9 h-2.5 rounded-sm bg-current inline-block" />
                  )}
                </div>
                <span className="font-mono text-xs font-bold mt-1.5">
                  {isDit ? '• Dot (Short)' : '— Dash (Long)'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
