export const DESKTOP_LAUNCH_MEDIA = '(min-width: 1024px) and (hover: hover) and (pointer: fine)';

export interface LaunchLayoutInput {
  width: number;
  height: number;
  introHeight: number;
  footerHeight: number;
  gap: number;
  desktop?: boolean;
}
/** Allocation uses measured intro height, including fonts/logo, instead of hiding overflow. */
export function fitLaunchLayout(input: LaunchLayoutInput) {
  const width = Math.max(0, input.width),
    height = Math.max(0, input.height);
  const gap = Math.max(0, input.gap),
    footer = Math.max(0, input.footerHeight);
  const wide = width >= 500 && height <= 580;
  const available = wide
    ? Math.min((width - gap) / 2, height - footer - gap)
    : Math.min(width, height - Math.max(0, input.introHeight) - footer - gap * 2);
  const size = Math.max(0, Math.min(520, available, wide ? height : Math.max(224, height * 0.52)));
  const availableWidth = wide ? Math.max(0, (width - gap) / 2) : width;
  const stageWidth = input.desktop ? Math.min(availableWidth, size * 1.3) : size;
  return { wide, size, stageWidth };
}
