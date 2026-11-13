export interface RouteRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface RouteSize {
  readonly width: number;
  readonly height: number;
}

export interface RoutePosition {
  readonly x: number;
  readonly y: number;
}

export type RouteSection = 'hero' | 'about' | 'course' | 'contact';

export interface KeychainRouteInput {
  readonly width: number;
  readonly origin: RoutePosition;
  readonly heroScene: RouteRect;
  readonly sections: Readonly<Record<RouteSection, RouteRect>>;
  readonly formation: RouteRect;
  readonly obstacles: readonly {
    readonly id: string;
    readonly section: RouteSection;
    readonly rect: RouteRect;
  }[];
  /** Complete travelling envelope, including the desired float/rotation allowance. */
  readonly footprint: RouteSize;
  readonly clearance: number;
  readonly corridor: number;
}

export interface KeychainRoutePoint extends RoutePosition {
  readonly key: string;
  readonly side: 'origin' | 'front' | 'right' | 'left' | 'arrival';
}

export interface KeychainRouteIssue {
  readonly code: string;
  readonly detail: string;
}

export interface KeychainRoute {
  readonly points: readonly KeychainRoutePoint[];
  readonly totalLength: number;
  readonly issues: readonly KeychainRouteIssue[];
  readonly requiredSpacing: {
    /** Additional space missing from the currently measured gap. */
    readonly beforeCourse: number;
    /** Additional space missing from the currently measured gap. */
    readonly beforeContact: number;
    /** Absolute minimum height; suitable for a CSS min-block-size. */
    readonly formationHeight: number;
  };
  readonly valid: boolean;
}

const EPSILON = 1e-7;
const SECTION_KEYS: readonly RouteSection[] = ['hero', 'about', 'course', 'contact'];
const bottom = (rect: RouteRect): number => rect.top + rect.height;
const right = (rect: RouteRect): number => rect.left + rect.width;
const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

function positiveSize(size: RouteSize | undefined): boolean {
  return (
    !!size &&
    Number.isFinite(size.width) &&
    size.width > 0 &&
    Number.isFinite(size.height) &&
    size.height > 0 &&
    Number.isFinite(size.width + size.height)
  );
}

function validRect(rect: RouteRect | undefined): boolean {
  return (
    !!rect &&
    positiveSize(rect) &&
    Number.isFinite(rect.left) &&
    Number.isFinite(rect.top) &&
    Number.isFinite(right(rect)) &&
    Number.isFinite(bottom(rect))
  );
}

function invalidFields(input: KeychainRouteInput): string[] {
  const fields: string[] = [];
  if (!input) return ['input'];
  if (!Number.isFinite(input.width) || input.width <= 0) fields.push('width');
  if (!input.origin || !Number.isFinite(input.origin.x) || !Number.isFinite(input.origin.y)) {
    fields.push('origin');
  }
  if (!validRect(input.heroScene)) fields.push('heroScene');
  for (const key of SECTION_KEYS) {
    if (!validRect(input.sections?.[key])) fields.push('sections.' + key);
  }
  if (!validRect(input.formation)) fields.push('formation');
  if (!positiveSize(input.footprint)) fields.push('footprint');
  if (!Number.isFinite(input.clearance) || input.clearance < 0) fields.push('clearance');
  if (!Number.isFinite(input.corridor) || input.corridor <= 0) fields.push('corridor');
  if (!Array.isArray(input.obstacles)) {
    fields.push('obstacles');
  } else {
    input.obstacles.forEach((obstacle, index) => {
      if (!obstacle || !SECTION_KEYS.includes(obstacle.section) || !validRect(obstacle.rect)) {
        fields.push('obstacles.' + index);
      }
    });
  }
  return fields;
}

/** Boundary contact is allowed; penetration inside the requested clearance is not. */
function segmentIntersectsRect(a: RoutePosition, b: RoutePosition, rect: RouteRect): boolean {
  let enter = 0;
  let leave = 1;
  const axes = [
    [a.x, b.x - a.x, rect.left + EPSILON, right(rect) - EPSILON],
    [a.y, b.y - a.y, rect.top + EPSILON, bottom(rect) - EPSILON],
  ];

  for (const [start, delta, min, max] of axes) {
    if (Math.abs(delta) < EPSILON) {
      if (start < min || start > max) return false;
      continue;
    }
    const first = (min - start) / delta;
    const second = (max - start) / delta;
    enter = Math.max(enter, Math.min(first, second));
    leave = Math.min(leave, Math.max(first, second));
    if (enter > leave) return false;
  }
  return enter <= 1 && leave >= 0;
}

/**
 * Build a measured right → left → right route. Invalid geometry is reported, never
 * repaired by sending objects through content or outside the viewport.
 */
export function buildKeychainRoute(input: KeychainRouteInput): KeychainRoute {
  const fields = invalidFields(input);
  if (fields.length) {
    return {
      points: [],
      totalLength: 0,
      valid: false,
      requiredSpacing: { beforeCourse: 0, beforeContact: 0, formationHeight: 0 },
      issues: fields.map((field) => ({ code: 'invalid-input', detail: field })),
    };
  }

  const issues: KeychainRouteIssue[] = [];
  const padX = input.footprint.width / 2 + input.clearance;
  const padY = input.footprint.height / 2 + input.clearance;
  const minimumHeight = padY * 2;
  if (!Number.isFinite(padX) || !Number.isFinite(minimumHeight)) {
    return {
      points: [],
      totalLength: 0,
      valid: false,
      requiredSpacing: { beforeCourse: 0, beforeContact: 0, formationHeight: 0 },
      issues: [{ code: 'invalid-input', detail: 'footprint and clearance magnitude' }],
    };
  }

  const sectionObstacles = (section: RouteSection): readonly RouteRect[] =>
    input.obstacles.filter((item) => item.section === section).map((item) => item.rect);
  const crossing = (before: RouteSection, after: RouteSection) => {
    const previous = sectionObstacles(before);
    const next = sectionObstacles(after);
    const previousBottom = previous.length
      ? Math.max(...previous.map(bottom))
      : bottom(input.sections[before]);
    const nextTop = next.length
      ? Math.min(...next.map((rect) => rect.top))
      : input.sections[after].top;
    return {
      y: previousBottom + (nextTop - previousBottom) / 2,
      missing: Math.max(0, minimumHeight - (nextTop - previousBottom)),
    };
  };
  const beforeCourse = crossing('about', 'course');
  const beforeContact = crossing('course', 'contact');
  const requiredSpacing = {
    beforeCourse: beforeCourse.missing,
    beforeContact: beforeContact.missing,
    formationHeight: minimumHeight,
  };

  if (input.corridor < padX * 2 - EPSILON) {
    issues.push({
      code: 'corridor-too-narrow',
      detail: 'Travelling envelope does not fit the side corridor.',
    });
  }
  if (input.corridor >= input.width - EPSILON || input.width < padX * 2) {
    issues.push({
      code: 'insufficient-width',
      detail: 'Distinct left and right corridors do not fit.',
    });
  }
  if (beforeCourse.missing > EPSILON) {
    issues.push({
      code: 'insufficient-gap-before-course',
      detail: 'About-to-course crossing needs more vertical space.',
    });
  }
  if (beforeContact.missing > EPSILON) {
    issues.push({
      code: 'insufficient-gap-before-contact',
      detail: 'Course-to-contact crossing needs more vertical space.',
    });
  }
  if (input.formation.height < minimumHeight - EPSILON) {
    issues.push({
      code: 'formation-too-short',
      detail: 'Arrival envelope does not fit the reserved height.',
    });
  }
  if (input.formation.width < padX * 2 - EPSILON) {
    issues.push({
      code: 'formation-too-narrow',
      detail: 'Arrival envelope does not fit the reserved width.',
    });
  }
  const contactContent = sectionObstacles('contact');
  if (contactContent.some((rect) => bottom(rect) > input.formation.top + EPSILON)) {
    issues.push({
      code: 'formation-before-contact-content',
      detail: 'The entire row area must start below contact text and social controls.',
    });
  }
  if (
    input.formation.left < -EPSILON ||
    right(input.formation) > input.width + EPSILON ||
    input.formation.top < input.sections.contact.top - EPSILON ||
    bottom(input.formation) > bottom(input.sections.contact) + EPSILON
  ) {
    issues.push({
      code: 'formation-out-of-bounds',
      detail: 'The row area must fit inside the contact section and viewport width.',
    });
  }
  for (let index = 1; index < SECTION_KEYS.length; index++) {
    const previous = input.sections[SECTION_KEYS[index - 1]];
    const next = input.sections[SECTION_KEYS[index]];
    if (bottom(previous) > next.top + EPSILON) {
      issues.push({
        code: 'section-order',
        detail: SECTION_KEYS[index - 1] + ' overlaps ' + SECTION_KEYS[index],
      });
    }
  }

  const leftX = input.corridor / 2;
  const rightX = input.width - leftX;
  const front = {
    x: clamp(input.heroScene.left + input.heroScene.width * 0.68, padX, input.width - padX),
    y: Math.max(input.origin.y, input.heroScene.top + input.heroScene.height * 0.45),
  };
  const heroRightY = Math.max(
    front.y,
    Math.min(bottom(input.sections.hero) - padY, bottom(input.heroScene) - padY),
  );
  const arrival = {
    x: input.formation.left + input.formation.width / 2,
    y: input.formation.top + input.formation.height / 2,
  };
  const points: KeychainRoutePoint[] = [
    { ...input.origin, key: 'origin', side: 'origin' },
    { ...front, key: 'hero-front', side: 'front' },
    { x: rightX, y: heroRightY, key: 'hero-right', side: 'right' },
    {
      x: rightX,
      y: clamp(
        input.sections.about.top + input.sections.about.height / 2,
        heroRightY,
        beforeCourse.y,
      ),
      key: 'about-right',
      side: 'right',
    },
    { x: rightX, y: beforeCourse.y, key: 'before-course-right', side: 'right' },
    { x: leftX, y: beforeCourse.y, key: 'before-course-left', side: 'left' },
    {
      x: leftX,
      y: clamp(
        input.sections.course.top + input.sections.course.height / 2,
        beforeCourse.y,
        beforeContact.y,
      ),
      key: 'course-left',
      side: 'left',
    },
    { x: leftX, y: beforeContact.y, key: 'before-contact-left', side: 'left' },
    { x: rightX, y: beforeContact.y, key: 'before-contact-right', side: 'right' },
    {
      x: rightX,
      y: clamp(
        input.sections.contact.top + input.sections.contact.height / 2,
        beforeContact.y,
        arrival.y,
      ),
      key: 'contact-right',
      side: 'right',
    },
    { x: rightX, y: arrival.y, key: 'contact-arrival-right', side: 'right' },
    { ...arrival, key: 'contact-arrival', side: 'arrival' },
  ];

  const canvasBottom = bottom(input.formation);
  let totalLength = 0;
  for (let index = 0; index < points.length; index++) {
    const point = points[index];
    if (
      point.x < padX - EPSILON ||
      point.x > input.width - padX + EPSILON ||
      point.y < padY - EPSILON ||
      point.y > canvasBottom - padY + EPSILON
    ) {
      issues.push({ code: 'out-of-bounds', detail: point.key });
    }
    if (index === 0) continue;
    const previous = points[index - 1];
    if (point.y < previous.y - EPSILON) {
      issues.push({ code: 'non-monotonic-y', detail: previous.key + ' → ' + point.key });
    }
    totalLength += Math.hypot(point.x - previous.x, point.y - previous.y);
  }
  if (!Number.isFinite(totalLength) || totalLength <= EPSILON) {
    totalLength = 0;
    issues.push({ code: 'degenerate-route', detail: 'Route length is zero or not finite.' });
  }

  for (const obstacle of input.obstacles) {
    const expanded = {
      left: obstacle.rect.left - padX,
      top: obstacle.rect.top - padY,
      width: obstacle.rect.width + padX * 2,
      height: obstacle.rect.height + padY * 2,
    };
    for (let index = 1; index < points.length; index++) {
      if (segmentIntersectsRect(points[index - 1], points[index], expanded)) {
        issues.push({
          code: 'obstacle-collision',
          detail: obstacle.id + ': ' + points[index - 1].key + ' → ' + points[index].key,
        });
        break;
      }
    }
  }

  return { points, totalLength, issues, requiredSpacing, valid: issues.length === 0 };
}

/** Constant arc-length progress across a polyline; repeated joints remain well-defined. */
export function sampleKeychainRoute(route: KeychainRoute, progress: number): RoutePosition {
  const first = route.points[0];
  if (!first) return { x: 0, y: 0 };
  if (route.totalLength <= EPSILON || !Number.isFinite(route.totalLength)) {
    return { x: first.x, y: first.y };
  }
  const normalized =
    typeof progress !== 'number' || Number.isNaN(progress) ? 0 : clamp(progress, 0, 1);
  if (normalized === 0) return { x: first.x, y: first.y };
  const last = route.points[route.points.length - 1];
  if (normalized === 1) return { x: last.x, y: last.y };

  let remaining = normalized * route.totalLength;
  for (let index = 1; index < route.points.length; index++) {
    const start = route.points[index - 1];
    const end = route.points[index];
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    if (length <= EPSILON) continue;
    if (remaining <= length) {
      const ratio = remaining / length;
      return { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio };
    }
    remaining -= length;
  }
  return { x: last.x, y: last.y };
}
