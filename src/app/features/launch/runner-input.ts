export function preferTouchInput(
  userAgent: string,
  touchPoints: number,
  coarsePointer: boolean,
): boolean {
  return (
    coarsePointer ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && touchPoints > 1)
  );
}
export function isRunnerControl(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    !!target.closest('button,a,input,textarea,select,[data-no-game-input]')
  );
}
export function runnerProjection(
  width: number,
  height: number,
  worldWidth: number,
  worldHeight: number,
  dpr: number,
) {
  const pixelWidth = Math.max(1, Math.round(width * dpr)),
    pixelHeight = Math.max(1, Math.round(height * dpr));
  const scale = Math.min(pixelWidth / worldWidth, pixelHeight / worldHeight);
  return {
    width: pixelWidth,
    height: pixelHeight,
    scale,
    x: (pixelWidth - worldWidth * scale) / 2,
    y: pixelHeight - worldHeight * scale,
  };
}
