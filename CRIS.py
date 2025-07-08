"""  
CRIM – a two-player impartial combinatorial game  
GUI     : Tkinter  
Python ≥ 3.8  
"""  
  
import tkinter as tk  
from tkinter import ttk, messagebox  
from enum import Enum, auto  
from collections import deque  
from typing import List, Tuple, Set  
  
  
# ────────────────────────────── Logic  ────────────────────────────── #  
  
class Player(Enum):  
    RED = auto()  
    BLUE = auto()  
  
    def other(self) -> "Player":  
        return Player.BLUE if self is Player.RED else Player.RED  
  
  
class Fragment:  
    """  
    A rectangular sub-board consisting only of still-present  
    squares (True).  Coordinates are local (row, col).  
    """  
    def __init__(self, grid: List[List[bool]]):  
        self.grid = grid          # 2-D list of booleans  
        self.rows = len(grid)  
        self.cols = len(grid[0]) if self.rows else 0  
  
    # ---------------- legal moves ---------------- #  
  
    def rows_alive(self) -> List[int]:  
        """Return indices of non-empty rows."""  
        return [r for r in range(self.rows) if any(self.grid[r])]  
  
    def cols_alive(self) -> List[int]:  
        """Return indices of non-empty columns."""  
        alive = []  
        for c in range(self.cols):  
            if any(self.grid[r][c] for r in range(self.rows)):  
                alive.append(c)  
        return alive  
  
    def has_moves(self) -> bool:  
        return bool(self.rows_alive() or self.cols_alive())  
  
    # ---------------- apply move ---------------- #  
  
    def delete_row(self, r: int) -> None:  
        for c in range(self.cols):  
            self.grid[r][c] = False  
  
    def delete_col(self, c: int) -> None:  
        for r in range(self.rows):  
            self.grid[r][c] = False  
  
    # ---------------- splitting ---------------- #  
  
    def _neighbors(self, r: int, c: int) -> List[Tuple[int, int]]:  
        nbs = []  
        for dr, dc in ((1,0),(-1,0),(0,1),(0,-1)):  
            nr, nc = r+dr, c+dc  
            if 0 <= nr < self.rows and 0 <= nc < self.cols and self.grid[nr][nc]:  
                nbs.append((nr,nc))  
        return nbs  
  
    def split_into_fragments(self) -> List["Fragment"]:  
        """  
        Breadth-first search over still-alive squares to detect  
        connected components.  
        """  
        visited: Set[Tuple[int,int]] = set()  
        fragments = []  
  
        for r in range(self.rows):  
            for c in range(self.cols):  
                if self.grid[r][c] and (r,c) not in visited:  
                    # start new component  
                    component = []  
                    q = deque()  
                    q.append((r,c))  
                    visited.add((r,c))  
                    while q:  
                        cr, cc = q.popleft()  
                        component.append((cr,cc))  
                        for nr, nc in self._neighbors(cr,cc):  
                            if (nr,nc) not in visited:  
                                visited.add((nr,nc))  
                                q.append((nr,nc))  
                    fragments.append(Fragment._from_component(component))  
        return fragments if fragments else []  
  
    @staticmethod  
    def _from_component(cells: List[Tuple[int,int]]) -> "Fragment":  
        """  
        Build the smallest axis-aligned matrix containing these cells,  
        translate coordinates, mark True squares.  
        """  
        min_r = min(r for r,_ in cells)  
        min_c = min(c for _,c in cells)  
        max_r = max(r for r,_ in cells)  
        max_c = max(c for _,c in cells)  
        h = max_r - min_r + 1  
        w = max_c - min_c + 1  
        grid = [[False]*w for _ in range(h)]  
        for r,c in cells:  
            grid[r-min_r][c-min_c] = True  
        return Fragment(grid)  
  
  
class GameState:  
    """  
    Holds the list of current fragments and the player to move.  
    """  
    def __init__(self, initial_row_sizes: List[int]):  
        # Build single rectangular fragment  
        if not initial_row_sizes:  
            raise ValueError("Need at least one row size.")  
        rows = len(initial_row_sizes)  
        cols = max(initial_row_sizes)  
        grid = [[False]*cols for _ in range(rows)]  
        for r, length in enumerate(initial_row_sizes):  
            for c in range(length):  
                grid[r][c] = True  
        self.fragments: List[Fragment] = [Fragment(grid)]  
        self.player = Player.RED  
  
    # ---------------- moves and updates ---------------- #  
  
    def has_moves(self) -> bool:  
        return any(frag.has_moves() for frag in self.fragments)  
  
    def perform_move(  
        self, frag_index: int, kind: str, line_index: int  
    ) -> None:  
        """  
        kind  : "row" or "col"  
        """  
        frag = self.fragments[frag_index]  
        if kind == "row":  
            frag.delete_row(line_index)  
        else:  
            frag.delete_col(line_index)  
  
        # Split fragment (possibly)  
        new_frags = frag.split_into_fragments()  
        # Replace the old fragment by the new ones  
        self.fragments.pop(frag_index)  
        self.fragments.extend(new_frags)  
  
        # Switch player  
        self.player = self.player.other()  
  
  
# ────────────────────────────── GUI  ────────────────────────────── #  
  
CELL = 30         # pixel size of one square  
GAP  = 20         # gap between fragments  
  
class CRIM_GUI(tk.Tk):  
    def __init__(self):  
        super().__init__()  
        self.title("CRIM – combinatorial game")  
  
        # top input frame  
        frm_top = ttk.Frame(self, padding=6)  
        frm_top.pack(fill="x")  
        ttk.Label(frm_top, text="Row sizes:").pack(side="left")  
        self.row_entry = ttk.Entry(frm_top, width=30)  
        self.row_entry.insert(0, "6 5 5 4")  
        self.row_entry.pack(side="left", padx=4)  
        ttk.Button(frm_top, text="Start", command=self.start_game).pack(side="left")  
  
        # status  
        self.status = ttk.Label(self, text="Enter row sizes and press Start")  
        self.status.pack(fill="x")  
  
        # canvas  
        self.canvas = tk.Canvas(self, bg="white")  
        self.canvas.pack(fill="both", expand=True)  
  
        # internal  
        self.state: GameState | None = None  
        self.canvas.bind("<Button-1>", self.on_click)  
  
        # mapping of canvas ids to logical address  
        self.id_to_address = {}  # id -> (frag_idx, "row"/"col", index)  
  
    # --------------- game start --------------- #  
  
    def start_game(self):  
        try:  
            sizes = [int(x) for x in self.row_entry.get().split()]  
            self.state = GameState(sizes)  
        except Exception as e:  
            messagebox.showerror("Error", f"Invalid input: {e}")  
            return  
        self.redraw()  
        self.status["text"] = f"{self.state.player.name} to move"  
  
    # --------------- drawing --------------- #  
  
    def redraw(self):  
        self.canvas.delete("all")  
        self.id_to_address.clear()  
        if not self.state:  
            return  
        x0 = GAP  
        y0 = GAP  
        for i, frag in enumerate(self.state.fragments):  
            self._draw_fragment(i, frag, x0, y0)  
            x0 += frag.cols * CELL + 3*GAP  # move to the right  
  
    def _draw_fragment(self, frag_idx: int, frag: Fragment, x0: int, y0: int):  
        # labels rows on the left  
        for r in range(frag.rows):  
            if any(frag.grid[r]):  
                idr = self.canvas.create_rectangle(  
                    x0-20, y0 + r*CELL,  
                    x0,   y0 + (r+1)*CELL,  
                    fill="#ddd")  
                self.canvas.create_text(  
                    x0-10, y0 + r*CELL + CELL/2,  
                    text=str(r), font=("Arial",9))  
                self.id_to_address[idr] = (frag_idx, "row", r)  
  
        # labels columns on the top  
        for c in range(frag.cols):  
            if any(frag.grid[r][c] for r in range(frag.rows)):  
                idc = self.canvas.create_rectangle(  
                    x0 + c*CELL, y0-20,  
                    x0 + (c+1)*CELL, y0,  
                    fill="#ddd")  
                self.canvas.create_text(  
                    x0 + c*CELL + CELL/2, y0-10, text=str(c), font=("Arial",9))  
                self.id_to_address[idc] = (frag_idx, "col", c)  
  
        # draw squares  
        for r in range(frag.rows):  
            for c in range(frag.cols):  
                if frag.grid[r][c]:  
                    self.canvas.create_rectangle(  
                        x0 + c*CELL, y0 + r*CELL,  
                        x0 + (c+1)*CELL, y0 + (r+1)*CELL,  
                        fill="orange", outline="black")  
  
    # --------------- user click --------------- #  
  
    def on_click(self, event):  
        if not self.state:  
            return  
        item = self.canvas.find_closest(event.x, event.y)[0]  
        if item not in self.id_to_address:  
            return  
        frag_idx, kind, idx = self.id_to_address[item]  
        self.make_move(frag_idx, kind, idx)  
  
    def make_move(self, frag_idx: int, kind: str, line_idx: int):  
        # highlight  
        frag = self.state.fragments[frag_idx]  
        ids_to_flash = []  
        for cell_id, (f,k,i) in self.id_to_address.items():  
            if f==frag_idx and k==kind and i==line_idx:  
                ids_to_flash.append(cell_id)  
        color = "red" if self.state.player is Player.RED else "blue"  
        for cid in ids_to_flash:  
            self.canvas.itemconfig(cid, fill=color)  
        self.after(600, lambda: self._finalize_move(frag_idx, kind, line_idx))  
  
    def _finalize_move(self, frag_idx: int, kind: str, line_idx: int):  
        self.state.perform_move(frag_idx, kind, line_idx)  
        if not self.state.has_moves():  
            winner = self.state.player.other().name  
            messagebox.showinfo("Game over", f"{winner} wins!  (no moves left)")  
            self.state = None  
            self.canvas.delete("all")  
            self.status["text"] = "Enter row sizes and press Start"  
            return  
        self.redraw()  
        self.status["text"] = f"{self.state.player.name} to move"  
  
  
# ────────────────────────────── run ────────────────────────────── #  
  
if __name__ == "__main__":  
    CRIM_GUI().mainloop()  