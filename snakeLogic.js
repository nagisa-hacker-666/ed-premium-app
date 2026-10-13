// Logique du Snake (pure, testable)
export function placeFood(cols, rows, snake, rnd = Math.random) {
  const used = new Set(snake.map((p) => `${p.x},${p.y}`));
  const free = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (!used.has(`${x},${y}`)) free.push({ x, y });
  return free.length ? free[Math.floor(rnd() * free.length)] : null;
}
export function newGame(cols, rows, rnd = Math.random) {
  const snake = [{ x: 5, y: 10 }, { x: 4, y: 10 }, { x: 3, y: 10 }];
  return { cols, rows, snake, dir: { x: 1, y: 0 }, food: placeFood(cols, rows, snake, rnd), alive: true, won: false, score: 0 };
}
export function step(s, nextDir, rnd = Math.random) {
  if (!s.alive) return s;
  let dir = s.dir;
  if (nextDir && !(nextDir.x === -s.dir.x && nextDir.y === -s.dir.y)) dir = nextDir;
  const head = { x: s.snake[0].x + dir.x, y: s.snake[0].y + dir.y };
  const eats = !!s.food && head.x === s.food.x && head.y === s.food.y;
  const body = eats ? s.snake : s.snake.slice(0, -1);
  const out = head.x < 0 || head.y < 0 || head.x >= s.cols || head.y >= s.rows;
  if (out || body.some((p) => p.x === head.x && p.y === head.y)) return { ...s, dir, alive: false };
  const snake = [head, ...body];
  const food = eats ? placeFood(s.cols, s.rows, snake, rnd) : s.food;
  return { ...s, dir, snake, food, score: s.score + (eats ? 1 : 0), alive: !(eats && !food), won: eats && !food };
}
