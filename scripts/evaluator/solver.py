"""
Solver — runs techniques in order, collects steps, returns difficulty rating.

Algorithm:
  1. Try techniques from easiest to hardest.
  2. On the first technique that makes progress → apply it, restart from step 1.
  3. Stop when: puzzle solved | contradiction | no technique applies (stuck).

No backtracking.  If we're stuck → puzzle is rejected.

Returns a SolveResult with:
  - solved:        bool
  - steps:         list[Step]
  - total_score:   int (sum of all step scores)
  - hardest_level: str (highest TECHNIQUE_LEVEL seen)
  - difficulty:    str (EASY / MEDIUM / HARD / EXPERT) per difficulty.py rules
"""

from dataclasses import dataclass, field

from candidates import CandidateGrid
from techniques import Step, TECHNIQUES, TECHNIQUE_LEVEL, SCORES


# Score thresholds used as a SECONDARY refinement within the same level.
# Primary classification is always hardest_level (the hardest technique used).
# Score is stored for within-level ordering / future tuning.
SCORE_THRESHOLDS = {
    'EASY':   (0,    100),
    'MEDIUM': (100,  400),
    'HARD':   (400, 1500),
    'EXPERT': (1500, float('inf')),
}

# Level ordering for the "floor" rule
LEVEL_ORDER = ['EASY', 'MEDIUM', 'HARD', 'EXPERT']


@dataclass
class SolveResult:
    solved: bool
    steps: list[Step] = field(default_factory=list)
    total_score: int = 0
    hardest_level: str = 'EASY'
    difficulty: str = 'EASY'

    def technique_counts(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for step in self.steps:
            counts[step.technique] = counts.get(step.technique, 0) + 1
        return counts


def solve(
    board: list[list[int]],
    sudoku_type: str = 'CLASSIC',
    odd_even_mask: list[list[str]] | None = None,
    killer_cages: list[dict] | None = None,
    kropki_dots: dict[str, str] | None = None,
    greater_than_signs: dict[str, str] | None = None,
    thermos: list[list[tuple[int, int]]] | None = None,
    sandwich_clues: dict | None = None,
    little_killer_clues: list[dict] | None = None,
    max_steps: int = 1000,
) -> SolveResult:
    """
    Attempt to solve a puzzle using human techniques only.

    Parameters
    ----------
    board : 9×9 grid, 0 = empty
    sudoku_type : variant id
    odd_even_mask : required for ODD_EVEN type
    killer_cages : required for KILLER type
    kropki_dots : required for KROPKI type
    greater_than_signs : required for GREATER_THAN type
    thermos : required for THERMO type
    sandwich_clues : required for SANDWICH type
    little_killer_clues : required for LITTLE_KILLER type
    max_steps : safety limit to prevent infinite loops

    Returns
    -------
    SolveResult (check .solved to know if puzzle was solvable without backtracking)
    """
    cg = CandidateGrid(
        board, sudoku_type,
        odd_even_mask=odd_even_mask,
        killer_cages=killer_cages,
        kropki_dots=kropki_dots,
        greater_than_signs=greater_than_signs,
        thermos=thermos,
        sandwich_clues=sandwich_clues,
        little_killer_clues=little_killer_clues,
    )

    if cg.has_contradiction():
        return SolveResult(solved=False)

    steps: list[Step] = []
    total_score = 0
    hardest_level = 'EASY'

    for _ in range(max_steps):
        if cg.is_solved():
            break

        if cg.has_contradiction():
            # A technique made an impossible elimination — reject
            return SolveResult(solved=False, steps=steps)

        applied = False
        for technique_fn in TECHNIQUES:
            step = technique_fn(cg)
            if step is not None:
                steps.append(step)
                total_score += step.score

                # Update hardest level seen (floor rule)
                step_level = TECHNIQUE_LEVEL.get(step.technique, 'EASY')
                if LEVEL_ORDER.index(step_level) > LEVEL_ORDER.index(hardest_level):
                    hardest_level = step_level

                applied = True
                break  # restart from easiest technique

        if not applied:
            # Genuinely stuck — no technique could progress
            break

    solved = cg.is_solved()

    difficulty = _compute_difficulty(total_score, hardest_level)

    return SolveResult(
        solved=solved,
        steps=steps,
        total_score=total_score,
        hardest_level=hardest_level,
        difficulty=difficulty,
    )


def _compute_difficulty(total_score: int, hardest_level: str) -> str:
    """
    Difficulty is determined solely by the hardest technique required.

    The score is stored on SolveResult for informational purposes (e.g.
    ranking puzzles within the same level) but does NOT affect the level.

    Examples:
      - 50 naked singles                    → EASY
      - hidden singles + locked candidates  → MEDIUM
      - 1 X-Wing + lots of simpler steps    → HARD
      - simple coloring                     → EXPERT
    """
    return hardest_level
