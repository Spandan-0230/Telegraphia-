import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMasterySummary,
  calculateTimingMs,
  createInitialSRSDeck,
  decodeFromMorse,
  encodeToMorse,
  evaluateTranscription,
  generateQuizQuestions,
  normalizeSignalPattern,
  updateSRSCard,
} from './morseEngine';

test('encodeToMorse and decodeFromMorse round-trip accurately', () => {
  const morse = encodeToMorse('SOS CQ 73');
  assert.equal(morse, '... --- ... / -.-. --.- / --... ...--');
  const decoded = decodeFromMorse(morse);
  assert.equal(decoded, 'SOS CQ 73');
});

test('normalizeSignalPattern converts bullet and dash variants to standard . and -', () => {
  assert.equal(normalizeSignalPattern('• — •'), '. - .');
  assert.equal(normalizeSignalPattern('... --- ...'), '... --- ...');
});

test('calculateTimingMs follows PARIS 1200/WPM standard and Farnsworth spacing', () => {
  const timing = calculateTimingMs(20, 10);
  assert.equal(timing.dotMs, 60);
  assert.equal(timing.dashMs, 180);
  assert.equal(timing.intraCharGapMs, 60);
  // Farnsworth at 10 WPM has 120ms base dot unit -> 360ms char gap, 840ms word gap
  assert.equal(timing.charGapMs, 360);
  assert.equal(timing.wordGapMs, 840);
});

test('SM-2 spaced repetition algorithm increases interval on correct recall and resets on error', () => {
  const deck = createInitialSRSDeck(1000000, false);
  const initialCard = deck['A'];
  assert.equal(initialCard.masteryStatus, 'unseen');

  // First fast correct recall
  const afterFirst = updateSRSCard(initialCard, true, 900, 1000000);
  assert.equal(afterFirst.repetition, 1);
  assert.equal(afterFirst.interval, 1);
  assert.equal(afterFirst.masteryStatus, 'reviewing');

  // Second fast correct recall
  const afterSecond = updateSRSCard(afterFirst, true, 1100, 2000000);
  assert.equal(afterSecond.repetition, 2);
  assert.equal(afterSecond.interval, 3);

  // Third fast correct recall -> mastered!
  const afterThird = updateSRSCard(afterSecond, true, 1000, 3000000);
  assert.equal(afterThird.repetition, 3);
  assert.equal(afterThird.masteryStatus, 'mastered');
  assert.ok(afterThird.interval >= 7);

  // Incorrect recall resets repetition and interval to 0
  const afterMiss = updateSRSCard(afterThird, false, 4000, 4000000);
  assert.equal(afterMiss.repetition, 0);
  assert.equal(afterMiss.interval, 0);
  assert.equal(afterMiss.masteryStatus, 'learning');
});

test('generateQuizQuestions creates listen, encode, and word challenges for each level', () => {
  const lvl1Questions = generateQuizQuestions(1);
  assert.ok(lvl1Questions.length >= 5);
  assert.ok(lvl1Questions.some((q) => q.type === 'listen-identify'));
  assert.ok(lvl1Questions.some((q) => q.type === 'encode-signal'));
  assert.ok(lvl1Questions.some((q) => q.type === 'word-decode'));
});

test('evaluateTranscription computes character accuracy and effective WPM', () => {
  const res = evaluateTranscription('SOS STORM', 'SOS STORM', 15);
  assert.equal(res.accuracyPercent, 100);
  assert.equal(res.correctChars, 9);
  assert.ok(res.effectiveWpm > 0);
});

test('calculateMasterySummary tallies seeded deck counts accurately', () => {
  const deck = createInitialSRSDeck(1000000, true);
  const summary = calculateMasterySummary(deck, 1000000);
  assert.equal(summary.total, 36);
  assert.equal(summary.mastered, 2); // E and T
  assert.equal(summary.reviewing, 4); // I, A, N, M
  assert.equal(summary.dueNow, 6); // I, A, N, M, S, O
});
