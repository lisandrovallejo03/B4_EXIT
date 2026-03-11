import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Flag, Bomb } from 'lucide-react';

const CELL_SIZE_PX = 20;
const MINE_RATIO = 0.12;
const MIN_MINES = 10;
const MAX_MINES = 300;
const GAME_OVER_OVERLAY_DELAY_MS = 600;
const SHAKE_DURATION_MS = 450;

/** Colores clásicos por cantidad de minas adyacentes (1-8) */
const NUMBER_COLORS: Record<number, string> = {
  1: '#228b22',   /* green */
  2: '#1e90ff',   /* blue */
  3: '#dc143c',   /* red */
  4: '#00008b',   /* dark blue */
  5: '#8b0000',   /* dark red */
  6: '#008b8b',   /* dark cyan */
  7: '#8b4513',   /* saddle brown (visible on dark) */
  8: '#808080',   /* gray */
};

let audioContext: AudioContext | null = null;
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioContext) audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  return audioContext;
}
function playTone(freq: number, durationMs: number, type: OscillatorType = 'sine'): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // ignore
  }
}
function playRevealSound(): void {
  playTone(420, 70);
}
function playFlagSound(): void {
  playTone(280, 50);
}

function getNeighbors(index: number, cols: number, rows: number): number[] {
  const c = index % cols;
  const r = Math.floor(index / cols);
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) out.push(nr * cols + nc);
    }
  }
  return out;
}

function pickRandomIndices(total: number, count: number): Set<number> {
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return new Set(indices.slice(0, count));
}

interface MinesweeperProps {
  onGameEnd: () => void;
}

type CellState = 'hidden' | 'revealed' | 'flagged';

const MAX_COLS = 200;
const MAX_ROWS = 150;

function clampGridSize(value: number, max: number): number {
  const n = Math.floor(value);
  if (Number.isNaN(n) || n < 1) return 1;
  return Math.min(max, n);
}

export function Minesweeper({ onGameEnd }: MinesweeperProps) {
  const [cols, setCols] = useState(() =>
    clampGridSize((typeof window !== 'undefined' ? window.innerWidth : 800) / CELL_SIZE_PX, MAX_COLS)
  );
  const [rows, setRows] = useState(() =>
    clampGridSize((typeof window !== 'undefined' ? window.innerHeight : 600) / CELL_SIZE_PX, MAX_ROWS)
  );

  useEffect(() => {
    const onResize = () => {
      setCols(clampGridSize(window.innerWidth / CELL_SIZE_PX, MAX_COLS));
      setRows(clampGridSize(window.innerHeight / CELL_SIZE_PX, MAX_ROWS));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const total = cols * rows;
  const mineCount = Math.min(MAX_MINES, Math.max(MIN_MINES, Math.floor(total * MINE_RATIO)));

  useEffect(() => {
    setCellStates(new Array(cols * rows).fill('hidden'));
    setGameOver(null);
    setShowGameOverOverlay(false);
  }, [cols, rows]);

  const { mines, adjacentCounts } = useMemo(() => {
    const mines = pickRandomIndices(total, mineCount);
    const adjacentCounts: number[] = new Array(total).fill(0);
    mines.forEach((idx) => {
      getNeighbors(idx, cols, rows).forEach((n) => {
        adjacentCounts[n]++;
      });
    });
    return { mines, adjacentCounts };
  }, [total, mineCount, cols, rows]);

  const [cellStates, setCellStates] = useState<CellState[]>(() => new Array(total).fill('hidden'));
  const [gameOver, setGameOver] = useState<'win' | 'lose' | null>(null);
  const [showGameOverOverlay, setShowGameOverOverlay] = useState(false);
  const [rippleDone, setRippleDone] = useState(false);
  const [shakeActive, setShakeActive] = useState(false);
  const hasShakenRef = React.useRef(false);

  useEffect(() => {
    if (gameOver !== 'lose') return;
    if (hasShakenRef.current) return;
    hasShakenRef.current = true;
    setShakeActive(true);
    const t = setTimeout(() => setShakeActive(false), SHAKE_DURATION_MS);
    return () => clearTimeout(t);
  }, [gameOver]);

  const reveal = useCallback(
    (index: number) => {
      if (gameOver) return;
      setCellStates((prev) => {
        if (prev[index] !== 'hidden') return prev;
        const next = [...prev];
        const queue = [index];
        while (queue.length > 0) {
          const i = queue.shift()!;
          if (next[i] !== 'hidden') continue;
          if (mines.has(i)) {
            next[i] = 'revealed';
            mines.forEach((idx) => {
              next[idx] = 'revealed';
            });
            setGameOver('lose');
            setTimeout(() => setShowGameOverOverlay(true), GAME_OVER_OVERLAY_DELAY_MS);
            return next;
          }
          next[i] = 'revealed';
          if (adjacentCounts[i] === 0) {
            getNeighbors(i, cols, rows).forEach((n) => {
              if (next[n] === 'hidden') queue.push(n);
            });
          }
        }
        const revealedCount = next.filter((s) => s === 'revealed').length;
        if (revealedCount === total - mineCount) {
          setGameOver('win');
          setShowGameOverOverlay(true);
        }
        return next;
      });
    },
    [gameOver, mines, adjacentCounts, cols, rows, total, mineCount]
  );

  const toggleFlag = useCallback(
    (index: number, e: React.MouseEvent) => {
      e.preventDefault();
      if (gameOver) return;
      if (cellStates[index] === 'revealed') return;
      playFlagSound();
      setCellStates((prev) => {
        const next = [...prev];
        next[index] = prev[index] === 'flagged' ? 'hidden' : 'flagged';
        return next;
      });
    },
    [gameOver, cellStates]
  );

  const handleCellClick = useCallback(
    (index: number) => {
      if (gameOver) return;
      const state = cellStates[index];
      const count = adjacentCounts[index];
      const isRevealed = state === 'revealed';

      if (isRevealed && count > 0) {
        const neighbors = getNeighbors(index, cols, rows);
        const flaggedAround = neighbors.filter((i) => cellStates[i] === 'flagged').length;
        if (flaggedAround === count) {
          playRevealSound();
          neighbors.forEach((n) => {
            if (cellStates[n] === 'hidden') reveal(n);
          });
        }
        return;
      }

      if (state !== 'hidden') return;
      playRevealSound();
      reveal(index);
    },
    [cellStates, gameOver, reveal, adjacentCounts, cols, rows]
  );

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyTouch = body.style.touchAction;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.touchAction = prevBodyTouch;
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-10 pointer-events-auto overflow-hidden overscroll-none ${shakeActive ? 'minesweeper-shake' : ''}`}
      style={{ background: 'transparent', touchAction: 'none', overscrollBehavior: 'none' }}
    >
      <div
        className="grid overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE_PX}px)`,
          gridTemplateRows: `repeat(${rows}, ${CELL_SIZE_PX}px)`,
          width: cols * CELL_SIZE_PX,
          height: rows * CELL_SIZE_PX,
          maxWidth: '100vw',
          maxHeight: '100vh',
          margin: 0,
          position: 'absolute',
          left: 0,
          top: 0,
        }}
      >
        {Array.from({ length: total }, (_, index) => {
          const state = cellStates[index];
          const isMine = mines.has(index);
          const count = adjacentCounts[index];
          const isRevealed = state === 'revealed' || (gameOver === 'lose' && isMine);
          const isFlagged = state === 'flagged';
          const showMine = isMine && isRevealed;

          return (
            <div
              key={index}
              role="button"
              tabIndex={0}
              className={`minesweeper-cell flex items-center justify-center text-[10px] font-mono select-none cursor-pointer ${isRevealed ? 'minesweeper-cell--revealed' : 'border border-[#003b00]/60'}`}
              style={{
                width: CELL_SIZE_PX,
                height: CELL_SIZE_PX,
                backgroundColor: isRevealed ? undefined : 'rgba(6, 22, 6, 0.9)',
                color: isRevealed
                  ? (showMine ? '#ef4444' : (count > 0 ? (NUMBER_COLORS[count] ?? 'var(--color-matrix-green)') : 'var(--color-matrix-green)'))
                  : 'var(--color-matrix-green-dim)',
              }}
              onClick={() => handleCellClick(index)}
              onContextMenu={(e) => toggleFlag(index, e)}
            >
              {isRevealed && showMine && <Bomb size={10} className="text-red-500" />}
              {isRevealed && !isMine && count > 0 && count}
              {isFlagged && !isRevealed && <Flag size={10} className="text-[#00ff41]" />}
            </div>
          );
        })}
      </div>

      <div
        className={`minesweeper-ripple-overlay ${rippleDone ? 'minesweeper-ripple-overlay--done' : ''}`}
        aria-hidden
        onAnimationEnd={() => setRippleDone(true)}
      />

      {gameOver && ((gameOver === 'win') || showGameOverOverlay) && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70">
          <div className="border border-[#00ff41]/40 bg-[#020a02] px-8 py-6 rounded-sm text-center">
            <p className="text-xl font-bold text-[#00ff41] font-mono uppercase tracking-widest mb-4">
              {gameOver === 'win' ? 'CLEARED' : 'GAME OVER'}
            </p>
            <button
              type="button"
              onClick={onGameEnd}
              className="border border-[#008f11]/40 bg-black/40 px-4 py-2 rounded-sm hover:border-[#00ff41]/60 hover:text-[#00ff41] text-[#008f11] font-mono text-sm uppercase tracking-widest"
            >
              Volver
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
