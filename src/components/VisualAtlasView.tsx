import React, { useState } from 'react';
import { Search, GitBranch, CheckCircle2 } from 'lucide-react';
import {
  CHAR_TO_MORSE_MAP,
  MORSE_CHARACTERS,
  MorseCharacter,
} from '../utils/morseData';
import { SRSCard } from '../utils/morseEngine';
import { morseAudio } from '../utils/audioSynth';
import { VisualMnemonicArt } from './VisualMnemonicArt';

interface VisualAtlasViewProps {
  srsDeck: Record<string, SRSCard>;
  wpm: number;
}

interface TreeNodeCoord {
  char: string;
  x: number;
  y: number;
  parentChar: string | null;
  branchType: 'dit' | 'dah';
}

const DICHOTOMIC_TREE_NODES: TreeNodeCoord[] = [
  { char: 'E', x: 250, y: 85, parentChar: 'ROOT', branchType: 'dit' },
  { char: 'T', x: 670, y: 85, parentChar: 'ROOT', branchType: 'dah' },
  { char: 'I', x: 140, y: 155, parentChar: 'E', branchType: 'dit' },
  { char: 'A', x: 360, y: 155, parentChar: 'E', branchType: 'dah' },
  { char: 'N', x: 560, y: 155, parentChar: 'T', branchType: 'dit' },
  { char: 'M', x: 780, y: 155, parentChar: 'T', branchType: 'dah' },
  { char: 'S', x: 85, y: 225, parentChar: 'I', branchType: 'dit' },
  { char: 'U', x: 195, y: 225, parentChar: 'I', branchType: 'dah' },
  { char: 'R', x: 305, y: 225, parentChar: 'A', branchType: 'dit' },
  { char: 'W', x: 415, y: 225, parentChar: 'A', branchType: 'dah' },
  { char: 'D', x: 505, y: 225, parentChar: 'N', branchType: 'dit' },
  { char: 'K', x: 615, y: 225, parentChar: 'N', branchType: 'dah' },
  { char: 'G', x: 725, y: 225, parentChar: 'M', branchType: 'dit' },
  { char: 'O', x: 835, y: 225, parentChar: 'M', branchType: 'dah' },
  { char: 'H', x: 55, y: 292, parentChar: 'S', branchType: 'dit' },
  { char: 'V', x: 115, y: 292, parentChar: 'S', branchType: 'dah' },
  { char: 'F', x: 170, y: 292, parentChar: 'U', branchType: 'dit' },
  { char: 'L', x: 280, y: 292, parentChar: 'R', branchType: 'dit' },
  { char: 'P', x: 385, y: 292, parentChar: 'W', branchType: 'dit' },
  { char: 'J', x: 445, y: 292, parentChar: 'W', branchType: 'dah' },
  { char: 'B', x: 480, y: 292, parentChar: 'D', branchType: 'dit' },
  { char: 'X', x: 535, y: 292, parentChar: 'D', branchType: 'dah' },
  { char: 'C', x: 590, y: 292, parentChar: 'K', branchType: 'dit' },
  { char: 'Y', x: 645, y: 292, parentChar: 'K', branchType: 'dah' },
  { char: 'Z', x: 700, y: 292, parentChar: 'G', branchType: 'dit' },
  { char: 'Q', x: 755, y: 292, parentChar: 'G', branchType: 'dah' },
];

export const VisualAtlasView: React.FC<VisualAtlasViewProps> = ({ srsDeck, wpm }) => {
  const [selectedChar, setSelectedChar] = useState<string>('A');
  const [filterCategory, setFilterCategory] = useState<'all' | 'letter' | 'number'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const focusedCharacter: MorseCharacter =
    CHAR_TO_MORSE_MAP[selectedChar] ?? MORSE_CHARACTERS[0];

  const getHighlightedChain = (target: string): Set<string> => {
    const chain = new Set<string>();
    let curr: string | null = target;
    while (curr && curr !== 'ROOT') {
      chain.add(curr);
      const found = DICHOTOMIC_TREE_NODES.find((n) => n.char === curr);
      curr = found ? found.parentChar : null;
    }
    return chain;
  };

  const activeChain = getHighlightedChain(selectedChar);

  const filteredCharacters = MORSE_CHARACTERS.filter((item) => {
    if (filterCategory !== 'all' && item.category !== filterCategory) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      item.char.toLowerCase().includes(q) ||
      item.code.includes(q) ||
      item.mnemonicWord.toLowerCase().includes(q) ||
      item.phonetic.toLowerCase().includes(q)
    );
  });

  const handleSelectNode = (ch: string) => {
    setSelectedChar(ch);
    const obj = CHAR_TO_MORSE_MAP[ch];
    if (obj) {
      morseAudio.playMorseSequence(obj.code, { wpm });
    }
  };

  return (
    <div className="space-y-6">
      {/* Compact Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-stone-500 dark:text-stone-400">
            INTERACTIVE DICHOTOMIC TREE · 36 SIGNALS
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 mt-0.5">
            Visual Signal Atlas
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-52">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <label htmlFor="atlas-search" className="sr-only">
              Search signals
            </label>
            <input
              id="atlas-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search char or .-..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-stone-200/70 dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                filterCategory === 'all'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              All (36)
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory('letter')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                filterCategory === 'letter'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              A–Z
            </button>
            <button
              type="button"
              onClick={() => setFilterCategory('number')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                filterCategory === 'number'
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              0–9
            </button>
          </div>
        </div>
      </div>

      {/* Symmetrical 2-Column Split: Interactive SVG Tree (7 cols) + Focused Character Inspector (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between text-xs font-mono text-stone-500 dark:text-stone-400">
            <span className="inline-flex items-center gap-1.5 text-stone-900 dark:text-stone-100 font-sans font-semibold">
              <GitBranch className="w-4 h-4 text-orange-700 dark:text-amber-400" />
              Click Any Node to Trace &amp; Hear Path
            </span>
            <span>SOLID = DIT (•) · DASHED = DAH (—)</span>
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              viewBox="0 0 920 325"
              className="w-full min-w-[580px] h-auto rounded-lg bg-stone-50 dark:bg-stone-950 border border-stone-200/80 dark:border-stone-800"
              role="img"
              aria-label="Interactive Morse code binary decision tree"
            >
              {DICHOTOMIC_TREE_NODES.map((node) => {
                const parent =
                  node.parentChar === 'ROOT'
                    ? { x: 460, y: 28 }
                    : DICHOTOMIC_TREE_NODES.find((n) => n.char === node.parentChar);
                if (!parent) return null;
                const isEdgeActive = activeChain.has(node.char);
                return (
                  <line
                    key={`edge-${node.char}`}
                    x1={parent.x}
                    y1={parent.y}
                    x2={node.x}
                    y2={node.y}
                    stroke={
                      isEdgeActive
                        ? '#c2410c'
                        : node.branchType === 'dit'
                        ? '#a8a29e'
                        : '#78716c'
                    }
                    strokeWidth={isEdgeActive ? 3 : 1.5}
                    strokeDasharray={node.branchType === 'dah' ? '5 3' : undefined}
                  />
                );
              })}

              <g transform="translate(460, 28)">
                <rect
                  x="-34"
                  y="-13"
                  width="68"
                  height="26"
                  rx="6"
                  fill="#1c1917"
                  stroke="#78716c"
                  strokeWidth="1.5"
                />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill="#fafaf9"
                  fontSize="11"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="600"
                >
                  START
                </text>
              </g>

              {DICHOTOMIC_TREE_NODES.map((node) => {
                const isSelected = node.char === selectedChar;
                const isInPath = activeChain.has(node.char);
                return (
                  <g
                    key={`node-${node.char}`}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => handleSelectNode(node.char)}
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-label={`Select character ${node.char} on signal tree`}
                  >
                    <circle
                      r={isSelected ? 19 : 16}
                      fill={
                        isSelected
                          ? '#c2410c'
                          : isInPath
                          ? '#fed7aa'
                          : '#ffffff'
                      }
                      stroke={isSelected || isInPath ? '#c2410c' : '#78716c'}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                    <text
                      x="0"
                      y="5"
                      textAnchor="middle"
                      fill={isSelected ? '#ffffff' : '#1c1917'}
                      fontSize="13"
                      fontWeight="700"
                      fontFamily="Plus Jakarta Sans, sans-serif"
                    >
                      {node.char}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right 5 Cols: Focused Interactive Character Card */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div className="h-full border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 rounded-xl p-5 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between text-xs font-mono text-stone-500 dark:text-stone-400">
              <span>SELECTED NODE INSPECTOR</span>
              <span>
                PATH:{' '}
                {focusedCharacter.treePath
                  .map((b) => (b === 'dit' ? 'L(•)' : 'R(—)'))
                  .join(' → ')}
              </span>
            </div>

            <VisualMnemonicArt
              character={focusedCharacter}
              onPlayFull={() => morseAudio.playMorseSequence(focusedCharacter.code, { wpm })}
              onPlayElement={(type) => morseAudio.playElement(type, wpm)}
            />
          </div>
        </div>
      </div>

      {/* Compact 6-Column Interactive Signal Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filteredCharacters.map((item) => {
          const srs = srsDeck[item.char];
          const isSelected = item.char === selectedChar;
          return (
            <button
              key={item.char}
              type="button"
              onClick={() => handleSelectNode(item.char)}
              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                isSelected
                  ? 'border-orange-700 dark:border-amber-400 bg-orange-50/50 dark:bg-stone-900'
                  : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-stone-400 dark:hover:border-stone-700'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-display text-2xl font-bold text-stone-900 dark:text-stone-100">
                  {item.char}
                </span>
                <span className="font-mono text-sm font-bold text-orange-700 dark:text-amber-400">
                  {item.code.replace(/\./g, '•').replace(/-/g, '—')}
                </span>
              </div>

              <div className="flex items-center justify-between w-full text-xs text-stone-500 dark:text-stone-400">
                <span className="truncate font-medium text-stone-700 dark:text-stone-300">
                  {item.mnemonicWord}
                </span>
                {srs?.masteryStatus === 'mastered' && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
