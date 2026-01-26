// Copyright 2020 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {describe, it, before} from 'mocha';
import {setup} from './util';
import * as assert from 'assert';
import {
  adjustHunkUp,
  adjustHunkDown,
  mergeAdjacentHunks,
} from '../src/utils/hunk-utils';

before(() => {
  setup();
});

describe('adjustHunkUp', () => {
  it('returns a new hunk if there is a previous line', () => {
    const hunk = {
      oldStart: 5,
      oldEnd: 5,
      newStart: 5,
      newEnd: 5,
      newContent: ["  args: ['sleep', '301']"],
      nextLine: "- name: 'ubuntu'",
      previousLine: "- name: 'ubuntu'",
    };
    const adjustedHunk = adjustHunkUp(hunk);
    assert.deepStrictEqual(adjustedHunk, {
      oldStart: 4,
      oldEnd: 5,
      newStart: 4,
      newEnd: 5,
      newContent: ["- name: 'ubuntu'", "  args: ['sleep', '301']"],
    });
  });
  it('preserves newlineAddedAtEnd when adjusting up', () => {
    const hunk = {
      oldStart: 5,
      oldEnd: 5,
      newStart: 5,
      newEnd: 5,
      newContent: ["  args: ['sleep', '301']"],
      previousLine: "- name: 'ubuntu'",
      newlineAddedAtEnd: true,
    };
    const adjustedHunk = adjustHunkUp(hunk);
    assert.deepStrictEqual(adjustedHunk, {
      oldStart: 4,
      oldEnd: 5,
      newStart: 4,
      newEnd: 5,
      newContent: ["- name: 'ubuntu'", "  args: ['sleep', '301']"],
      newlineAddedAtEnd: true,
    });
  });
  it('returns null if there is no previous line', () => {
    const hunk = {
      oldStart: 5,
      oldEnd: 5,
      newStart: 5,
      newEnd: 5,
      newContent: ["  args: ['sleep', '301']"],
    };
    const adjustedHunk = adjustHunkUp(hunk);
    assert.strictEqual(adjustedHunk, null);
  });
});

describe('adjustHunkDown', () => {
  it('returns a new hunk if there is a next line', () => {
    const hunk = {
      oldStart: 5,
      oldEnd: 5,
      newStart: 5,
      newEnd: 5,
      newContent: ["  args: ['sleep', '301']"],
      nextLine: "- name: 'ubuntu'",
      previousLine: "- name: 'ubuntu'",
    };
    const adjustedHunk = adjustHunkDown(hunk);
    assert.deepStrictEqual(adjustedHunk, {
      oldStart: 5,
      oldEnd: 6,
      newStart: 5,
      newEnd: 6,
      newContent: ["  args: ['sleep', '301']", "- name: 'ubuntu'"],
    });
  });
  it('clears newlineAddedAtEnd when adjusting down (no longer at EOF)', () => {
    const hunk = {
      oldStart: 5,
      oldEnd: 5,
      newStart: 5,
      newEnd: 5,
      newContent: ["  args: ['sleep', '301']"],
      nextLine: "- name: 'ubuntu'",
      newlineAddedAtEnd: true,
    };
    const adjustedHunk = adjustHunkDown(hunk);
    assert.deepStrictEqual(adjustedHunk, {
      oldStart: 5,
      oldEnd: 6,
      newStart: 5,
      newEnd: 6,
      newContent: ["  args: ['sleep', '301']", "- name: 'ubuntu'"],
    });
  });
  it('returns null if there is no previous line', () => {
    const hunk = {
      oldStart: 5,
      oldEnd: 5,
      newStart: 5,
      newEnd: 5,
      newContent: ["  args: ['sleep', '301']"],
    };
    const adjustedHunk = adjustHunkDown(hunk);
    assert.deepStrictEqual(adjustedHunk, null);
  });
});

describe('mergeAdjacentHunks', () => {
  it('returns empty array for empty input', () => {
    const result = mergeAdjacentHunks([]);
    assert.deepStrictEqual(result, []);
  });

  it('returns single hunk unchanged', () => {
    const hunk = {
      oldStart: 5,
      oldEnd: 5,
      newStart: 5,
      newEnd: 5,
      newContent: ['line 5'],
    };
    const result = mergeAdjacentHunks([hunk]);
    assert.deepStrictEqual(result, [hunk]);
  });

  it('merges two adjacent single-line hunks (line swap case)', () => {
    const hunk1 = {
      oldStart: 423,
      oldEnd: 423,
      newStart: 423,
      newEnd: 423,
      newContent: ['    @MethodSource("deriveRecipeNameCases")'],
      previousLine: '    }',
    };
    const hunk2 = {
      oldStart: 424,
      oldEnd: 424,
      newStart: 424,
      newEnd: 424,
      newContent: ['    @ParameterizedTest'],
      nextLine: '    void deriveRecipeName(...) {',
    };
    const result = mergeAdjacentHunks([hunk1, hunk2]);
    assert.deepStrictEqual(result, [
      {
        oldStart: 423,
        oldEnd: 424,
        newStart: 423,
        newEnd: 424,
        newContent: [
          '    @MethodSource("deriveRecipeNameCases")',
          '    @ParameterizedTest',
        ],
        previousLine: '    }',
        nextLine: '    void deriveRecipeName(...) {',
      },
    ]);
  });

  it('does not merge non-adjacent hunks', () => {
    const hunk1 = {
      oldStart: 5,
      oldEnd: 5,
      newStart: 5,
      newEnd: 5,
      newContent: ['line 5'],
    };
    const hunk2 = {
      oldStart: 10,
      oldEnd: 10,
      newStart: 10,
      newEnd: 10,
      newContent: ['line 10'],
    };
    const result = mergeAdjacentHunks([hunk1, hunk2]);
    assert.deepStrictEqual(result, [hunk1, hunk2]);
  });

  it('merges multiple adjacent hunks into one', () => {
    const hunk1 = {
      oldStart: 1,
      oldEnd: 1,
      newStart: 1,
      newEnd: 1,
      newContent: ['line A'],
      previousLine: 'before',
    };
    const hunk2 = {
      oldStart: 2,
      oldEnd: 2,
      newStart: 2,
      newEnd: 2,
      newContent: ['line B'],
    };
    const hunk3 = {
      oldStart: 3,
      oldEnd: 3,
      newStart: 3,
      newEnd: 3,
      newContent: ['line C'],
      nextLine: 'after',
    };
    const result = mergeAdjacentHunks([hunk1, hunk2, hunk3]);
    assert.deepStrictEqual(result, [
      {
        oldStart: 1,
        oldEnd: 3,
        newStart: 1,
        newEnd: 3,
        newContent: ['line A', 'line B', 'line C'],
        previousLine: 'before',
        nextLine: 'after',
      },
    ]);
  });

  it('preserves newlineAddedAtEnd from the last hunk only', () => {
    const hunk1 = {
      oldStart: 5,
      oldEnd: 5,
      newStart: 5,
      newEnd: 5,
      newContent: ['line 5'],
      newlineAddedAtEnd: true, // This should be ignored since it's not the last hunk
    };
    const hunk2 = {
      oldStart: 6,
      oldEnd: 6,
      newStart: 6,
      newEnd: 6,
      newContent: ['line 6'],
      newlineAddedAtEnd: true,
    };
    const result = mergeAdjacentHunks([hunk1, hunk2]);
    assert.deepStrictEqual(result, [
      {
        oldStart: 5,
        oldEnd: 6,
        newStart: 5,
        newEnd: 6,
        newContent: ['line 5', 'line 6'],
        newlineAddedAtEnd: true,
      },
    ]);
  });

  it('handles mix of adjacent and non-adjacent hunks', () => {
    const hunk1 = {
      oldStart: 1,
      oldEnd: 1,
      newStart: 1,
      newEnd: 1,
      newContent: ['A'],
    };
    const hunk2 = {
      oldStart: 2,
      oldEnd: 2,
      newStart: 2,
      newEnd: 2,
      newContent: ['B'],
    };
    const hunk3 = {
      oldStart: 10,
      oldEnd: 10,
      newStart: 10,
      newEnd: 10,
      newContent: ['X'],
    };
    const hunk4 = {
      oldStart: 11,
      oldEnd: 11,
      newStart: 11,
      newEnd: 11,
      newContent: ['Y'],
    };
    const result = mergeAdjacentHunks([hunk1, hunk2, hunk3, hunk4]);
    assert.deepStrictEqual(result, [
      {
        oldStart: 1,
        oldEnd: 2,
        newStart: 1,
        newEnd: 2,
        newContent: ['A', 'B'],
      },
      {
        oldStart: 10,
        oldEnd: 11,
        newStart: 10,
        newEnd: 11,
        newContent: ['X', 'Y'],
      },
    ]);
  });
});
