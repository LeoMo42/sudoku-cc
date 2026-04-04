"""
Sudoku puzzle evaluator and generator.

Modules:
  candidates  — CandidateGrid with bitset-based candidate tracking
  techniques  — Solving techniques (Naked Single → Simple Coloring)
  solver      — Human-technique solver, returns SolveResult with difficulty
  generator   — Complete board generation + puzzle creation pipeline

Quick start:
  from evaluator.solver import solve
  from evaluator.generator import generate_puzzles

  result = solve(board, 'ANTI_KNIGHT')
  print(result.difficulty, result.technique_counts())

  puzzles = generate_puzzles('NON_CONSECUTIVE', 'HARD', count=100, out='puzzles/')
"""
