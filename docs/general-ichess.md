# General iChess — how it works (developer guide)

The **General** is the "design‑your‑own‑piece" impartial‑chess game. Instead of a
fixed move set, the player draws the piece's moves on a grid, and the same
Sprague–Grundy engine that powers every other iChess piece then plays it
perfectly.

Everything lives in three files:

| File | Role |
|------|------|
| [`assets/js/ichess.js`](../assets/js/ichess.js) | the whole engine + the move designer |
| [`assets/css/ichess.css`](../assets/css/ichess.css) | the designer grid styling |
| [`games/general/general_page.html`](../games/general/general_page.html) | page shell (`<body data-piece="general">`) |

---

## 1. The mental model

> A single token sits on a **Young diagram** (a partition). Players alternately move
> it **toward the bottom‑left corner `(0,0)`**. Whoever makes the **last legal move
> wins** (normal play) or **loses** (misère). The program is just: **(1)** a function
> that lists legal moves, **(2)** a solver that scores every cell, **(3)** a thin UI loop.

The General differs from the other pieces in exactly one way: its move list comes
from **user data** instead of a hard‑coded function.

---

## 2. The board is a partition

Coordinates are `(c, r)` = (column, row). The board shape is an array `rows[]`
where `rows[r]` is the width of row `r`. One function defines the whole board
([`ichess.js:22`](../assets/js/ichess.js#L22)):

```js
function inBoard(c, r, rows) { return r >= 0 && r < rows.length && c >= 0 && c < rows[r]; }
```

The corner is `(0,0)`. A rectangle is just `rows = [n, n, …, n]`.

---

## 3. The move data model  (`{ leaps, riders }`)

A General piece is a plain object ([`ichess.js:53`](../assets/js/ichess.js#L53)):

```js
{ leaps:  [[-1,-2], [-2,-1], …],   // single-step jumps  (like a knight/king step)
  riders: [[-1,0],  [0,-1],  …] }  // repeatable slides  (like a rook, until off-board)
```

* **leap** = the piece may jump once to `(c+Δc, r+Δr)`.
* **rider** = the piece may slide `(c+kΔc, r+kΔr)` for `k = 1,2,3…` until it leaves the shape.

The default (before the user changes anything) is **King + Knight**
([`ichess.js:53`](../assets/js/ichess.js#L53)).

### The one invariant that makes everything work
Every vector must be **corner‑directed**: `Δc + Δr < 0`. That means every move
strictly decreases `c + r`, so the game **cannot cycle** and is guaranteed finite.
This is why the Grundy recursion (§5) always terminates. The designer UI enforces
it by only letting you click corner‑directed cells.

---

## 4. The move designer (the grid you click)

Built by `setupGeneralMoves()` ([`ichess.js:516`](../assets/js/ichess.js#L516)), attached only
for the General piece ([`ichess.js:297`](../assets/js/ichess.js#L297)).

* A labelled grid centered on the piece **◆** at `(0,0)`; axes are Δcol / Δrow.
* Only corner‑directed cells (`Δc+Δr < 0`) are clickable; the rest are dimmed.
* Each clickable cell **cycles through three states** on repeated clicks:

  `off → step (leap) → slide (rider) → off`

* Presets: **King + Knight**, **clear**. **Done** confirms (requires ≥1 move).
  You can back out with **Escape** or by clicking the backdrop (reverts to the saved set).

Two helpers translate between the grid and the data:

* `applyCM(cm)` ([`ichess.js:576`](../assets/js/ichess.js#L576)) — paints a `{leaps,riders}` object onto the grid.
* `readCM()` ([`ichess.js:582`](../assets/js/ichess.js#L582)) — reads the grid back into a `{leaps,riders}` object.

Styling: [`ichess.css:166–192`](../assets/css/ichess.css#L166) (`.ic-grid`, `.ic-gc` with
`.off/.on/.step/.slide/.piece`, `.ic-legend`).

---

## 5. Data → legal moves → Grundy AI

### 5a. Move generator
`generalMoves(c, r, rows, cm)` ([`ichess.js:57`](../assets/js/ichess.js#L57)) turns the
`{leaps, riders}` data into the list of reachable cells (leaps = one cell; riders =
a slide loop, same idea as `rookMoves`). `legalMoves()` routes the General piece
here ([`ichess.js:105`](../assets/js/ichess.js#L105)).

### 5b. The algorithm: Sprague–Grundy
`makeSolver(piece, rows, cm)` ([`ichess.js:112`](../assets/js/ichess.js#L112)) scores every cell:

```js
function grundy(c, r) {
    if (gMemo.has(key)) return gMemo.get(key);          // memoize — each cell once
    const seen = new Set();
    for (const [nc, nr] of legalMoves(...)) seen.add(grundy(nc, nr));   // recurse
    let mex = 0; while (seen.has(mex)) mex++;            // mex = smallest int NOT among children
    gMemo.set(key, mex);
    return mex;
}
```

* **mex** = "minimum excludant". If a cell's moves reach cells with Grundy values
  `{0,1,3}`, then `mex = 2`.
* **Rule:** `grundy = 0` ⇒ the player to move **loses** with perfect play; any other
  value ⇒ they can win.
* **Misère** (last move loses) uses a separate boolean recursion `misereWin`.

### 5c. The AI
`chooseMove(solver, c, r, mode, difficulty)` ([`ichess.js:142`](../assets/js/ichess.js#L142)):

```js
const best = moves.filter(([nc,nr]) => solver.grundy(nc,nr) === 0);  // moves to a losing cell for opp.
const playOptimal = (Math.random() * 100) <= difficulty;             // difficulty = % perfect
const pick = (playOptimal && winning) ? best[random] : pool[random];
```

The **difficulty slider is the probability the AI plays the perfect move** each turn;
otherwise it plays a random legal move.

---

## 6. The UI game loop (one turn)

`start()` → `begin(cfg)` boots a game ([`ichess.js:302`](../assets/js/ichess.js#L302)):

```
begin() → makeSolver(piece, rows, customMoves)  // build the brain (§5b)
        → buildBoard()                          // draw the partition
        → maybeAI() / your turn
```

Per turn: `showHints()` marks legal squares (and, in analysis mode, the Grundy‑0
"winning" ones) → you click → `onSquare()` validates → `doMove()` moves + checks if
the game is over (`legal(newCell).length === 0`) → flips turn → the AI runs
`chooseMove` and calls `doMove()` again. See
[`ichess.js:349–389`](../assets/js/ichess.js#L349).

---

## 7. Why one engine reproduces every piece

Because the piece is just data, the identical engine reproduces the classics
(verified in the Node tests):

| You design… | It becomes | Grundy value |
|---|---|---|
| riders `(-1,0),(0,-1)` | **Rook** | `col XOR row` (two‑pile Nim) |
| rider `(-1,-1)` | **Bishop** | `min(col, row)` |
| king leaps | **King** | `0` at both‑even |
| king + knight leaps | **General** (default) | no closed form — computed |

---

## 8. How to modify / extend

* **Change the grid size** — the `N` in `setupGeneralMoves` ([`ichess.js:516`](../assets/js/ichess.js#L516))
  controls the Δcol/Δrow range (currently `[-5, 5]`).
* **Allow moves away from the corner** — remove the `corner()` restriction in the
  designer, **but** then the game can be infinite, so `grundy()`/`misereWin()`
  ([`ichess.js:112`](../assets/js/ichess.js#L112)) need a cycle guard (mark a cell "in progress" during
  recursion; if you re‑enter it, the position is loopy). Currently corner‑only keeps
  it finite — a design decision to confirm with the research team.
* **Reproducible games** — randomness uses the browser's unseeded `Math.random()`.
  To replay exact random boards, add a seeded RNG (e.g. `mulberry32(seed)`) and
  surface the seed in the setup modal.

---

### Fastest path to understanding the code
Read these five functions in order — they *are* the game; everything else is UI:
[`inBoard` (22)](../assets/js/ichess.js#L22) →
[`generalMoves` (57)](../assets/js/ichess.js#L57) →
[`makeSolver`/`grundy` (112)](../assets/js/ichess.js#L112) →
[`chooseMove` (142)](../assets/js/ichess.js#L142) →
[`onSquare`/`doMove` (371)](../assets/js/ichess.js#L371).
