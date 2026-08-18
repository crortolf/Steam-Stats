Example API request: store.steampowered.com/api/appdetails/?appids=1478500
use the header image

todo:
change news api so that it displays who/how many are playing each game

get image for game news

function randomUnitCirclePoint() {
  const theta = Math.random() * 2 * Math.PI;
  return [Math.cos(theta), Math.sin(theta)];
}

function randomUnitCirclePairs(n) {
  const points = [];
  for (let i = 0; i < n; i++) {
    points.push(randomUnitCirclePoint());
  }
  return points;
}

// Example usage:
console.log(randomUnitCirclePairs(5));

How it works: pick a uniformly random angle theta between 0 and 2π, then use cos(theta) and sin(theta) as the x and y coordinates. Since cos²(θ) + sin²(θ) = 1 for any θ, every point generated this way automatically satisfies x² + y² = 1, so it lies exactly on the unit circle — and sampling θ uniformly gives you uniformly distributed points around the circle (not uniform in x or y individually, but uniform in angle).

If you instead wanted random points inside the unit disk (not just on the boundary), let me know and I can adjust it — that requires a slightly different sampling approach to avoid clustering near the center.