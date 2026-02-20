import { isValidMove, findConflicts } from './src/utils/sudokuValidator.js';
import { KING_MOVES } from './src/utils/constants.js';

// Anti-King Sudoku from sortedpuzzles.com
const antiKingSolution = [
  [7, 8, 4, 3, 9, 5, 1, 2, 6],
  [6, 9, 5, 2, 1, 7, 3, 4, 8],
  [2, 3, 1, 4, 6, 8, 5, 9, 7],
  [8, 7, 9, 5, 2, 4, 6, 3, 1],
  [1, 5, 6, 8, 3, 9, 2, 7, 4],
  [3, 4, 2, 1, 7, 6, 8, 5, 9],
  [5, 6, 7, 9, 8, 3, 4, 1, 2],
  [9, 2, 3, 6, 4, 1, 7, 8, 5],
  [4, 1, 8, 7, 5, 2, 9, 6, 3]
];

console.log('🔍 Testing Anti-King Sudoku from sortedpuzzles.com...\n');

// Test 1: Check for conflicts using our validator
console.log('Test 1: Checking for conflicts with our validator...');
const conflicts = findConflicts(antiKingSolution, 'ANTI_KING', null);
console.log(`Conflicts found: ${conflicts.size}`);
if (conflicts.size > 0) {
  console.log('❌ FAILED - Conflicts detected:');
  conflicts.forEach(cell => console.log(`  - Cell ${cell}`));
} else {
  console.log('✅ PASSED - No conflicts detected by our validator\n');
}

// Test 2: Manually check Anti-King constraint (no adjacent same digits)
console.log('Test 2: Manually checking Anti-King constraint...');
let antiKingViolations = 0;
const violations = [];

for (let row = 0; row < 9; row++) {
  for (let col = 0; col < 9; col++) {
    const num = antiKingSolution[row][col];

    // Check all 8 adjacent cells
    for (const move of KING_MOVES) {
      const newRow = row + move.row;
      const newCol = col + move.col;

      if (newRow >= 0 && newRow < 9 && newCol >= 0 && newCol < 9) {
        if (antiKingSolution[newRow][newCol] === num) {
          antiKingViolations++;
          violations.push({
            cell1: `[${row},${col}]`,
            cell2: `[${newRow},${newCol}]`,
            digit: num
          });
        }
      }
    }
  }
}

if (antiKingViolations > 0) {
  console.log(`❌ FAILED - Found ${antiKingViolations} Anti-King violations:`);
  violations.forEach(v => {
    console.log(`  - Cells ${v.cell1} and ${v.cell2} both have digit ${v.digit}`);
  });
} else {
  console.log('✅ PASSED - No adjacent cells have the same digit\n');
}

// Test 3: Check basic Sudoku rules (rows, columns, boxes)
console.log('Test 3: Checking basic Sudoku rules...');
let basicValid = true;

// Check rows
for (let row = 0; row < 9; row++) {
  const rowSet = new Set(antiKingSolution[row]);
  if (rowSet.size !== 9) {
    console.log(`❌ Row ${row} has duplicates`);
    basicValid = false;
  }
}

// Check columns
for (let col = 0; col < 9; col++) {
  const colSet = new Set(antiKingSolution.map(row => row[col]));
  if (colSet.size !== 9) {
    console.log(`❌ Column ${col} has duplicates`);
    basicValid = false;
  }
}

// Check 3x3 boxes
for (let boxRow = 0; boxRow < 3; boxRow++) {
  for (let boxCol = 0; boxCol < 3; boxCol++) {
    const boxNums = [];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        boxNums.push(antiKingSolution[boxRow * 3 + i][boxCol * 3 + j]);
      }
    }
    const boxSet = new Set(boxNums);
    if (boxSet.size !== 9) {
      console.log(`❌ Box [${boxRow},${boxCol}] has duplicates`);
      basicValid = false;
    }
  }
}

if (basicValid) {
  console.log('✅ PASSED - All rows, columns, and boxes are valid\n');
}

// Summary
console.log('═══════════════════════════════════════');
console.log('SUMMARY:');
console.log('═══════════════════════════════════════');
if (conflicts.size === 0 && antiKingViolations === 0 && basicValid) {
  console.log('🎉 SUCCESS! This is a valid Anti-King Sudoku');
  console.log('✅ Our validator correctly identifies it as valid');
} else {
  console.log('❌ FAILURE! Issues detected:');
  if (conflicts.size > 0) console.log(`  - Our validator found ${conflicts.size} conflicts`);
  if (antiKingViolations > 0) console.log(`  - Manual check found ${antiKingViolations} violations`);
  if (!basicValid) console.log('  - Basic Sudoku rules violated');
}
console.log('═══════════════════════════════════════');
