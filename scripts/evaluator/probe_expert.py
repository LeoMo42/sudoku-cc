"""Probe how often EXPERT puzzles appear and how long they take."""
import sys, time, random
sys.path.insert(0, 'evaluator')

from generator import generate_complete_board, count_solutions, MIN_GIVENS, EVAL_START
from solver import solve

stype = 'ANTI_KNIGHT'
trials = 20
results = {'EASY': 0, 'MEDIUM': 0, 'HARD': 0, 'EXPERT': 0, 'UNSOLVABLE_MAX': 0}

t0 = time.time()
for i in range(trials):
    board = generate_complete_board(stype)
    if not board:
        continue
    puzzle = [row[:] for row in board]
    positions = [(r, c) for r in range(9) for c in range(9)]
    random.shuffle(positions)
    givens = 81
    max_diff = 'EASY'

    for r, c in positions:
        if givens <= MIN_GIVENS:
            break
        saved = puzzle[r][c]
        puzzle[r][c] = 0
        givens -= 1
        if count_solutions(puzzle, stype, limit=2) != 1:
            puzzle[r][c] = saved
            givens += 1
            continue
        if givens > EVAL_START['EXPERT']:
            continue
        result = solve(puzzle, stype)
        if not result.solved:
            puzzle[r][c] = saved
            givens += 1
            continue
        max_diff = result.difficulty
        if result.difficulty == 'EXPERT':
            print(f'  trial {i}: EXPERT at givens={givens}, score={result.total_score}, '
                  f'techniques={result.technique_counts()}')
            break

    results[max_diff] = results.get(max_diff, 0) + 1

elapsed = time.time() - t0
print(f'\n{trials} trials in {elapsed:.1f}s:')
for k, v in results.items():
    print(f'  {k}: {v} ({v/trials:.0%})')
