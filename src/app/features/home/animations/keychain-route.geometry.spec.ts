import {
  buildKeychainRoute,
  KeychainRouteInput,
  RouteRect,
  sampleKeychainRoute,
} from './keychain-route.geometry';

function fixture(width: number): KeychainRouteInput {
  const footprint = { width: Math.max(22, Math.min(width * 0.032, 54)), height: 0 };
  footprint.height = footprint.width * 2.2 + 10;
  const clearance = 8;
  const corridor = footprint.width + clearance * 2;
  const mobile = width < 768;
  const heroHeight = mobile ? 680 : Math.max(532, width * 0.52);
  const heroScene = mobile
    ? { left: 20, top: 0, width: width - 40, height: Math.max(240, (width - 40) / 1.13) }
    : { left: width * 0.46, top: 0, width: width * 0.5, height: heroHeight };
  const sections = {
    hero: { left: 0, top: 0, width, height: heroHeight },
    about: { left: 0, top: heroHeight, width, height: 320 + footprint.height },
    course: { left: 0, top: 0, width, height: 350 + footprint.height },
    contact: { left: 0, top: 0, width, height: 0 },
  };
  sections.course.top = sections.about.top + sections.about.height;
  sections.contact.top = sections.course.top + sections.course.height;
  const formation = {
    left: corridor,
    top: sections.contact.top + 180,
    width: width - corridor * 2,
    height: footprint.height + clearance * 2 + 16,
  };
  sections.contact.height = 200 + formation.height;
  const content = (top: number, height: number): RouteRect => ({
    left: corridor,
    top,
    width: width - corridor * 2,
    height,
  });

  return {
    width,
    footprint,
    clearance,
    corridor,
    sections,
    heroScene,
    formation,
    origin: {
      x: heroScene.left + heroScene.width * 0.11,
      y: heroScene.height * 0.32,
    },
    obstacles: [
      {
        id: 'hero-copy',
        section: 'hero',
        rect: mobile
          ? content(heroScene.height + 18, heroHeight - heroScene.height - 38)
          : { left: corridor, top: 140, width: width * 0.36 - corridor, height: 250 },
      },
      { id: 'about-copy', section: 'about', rect: content(sections.about.top + 70, 70) },
      {
        id: 'about-products',
        section: 'about',
        rect: content(sections.about.top + 160, sections.about.height - 230),
      },
      { id: 'course-copy', section: 'course', rect: content(sections.course.top + 70, 60) },
      { id: 'course-product', section: 'course', rect: content(sections.course.top + 140, 100) },
      {
        id: 'course-action',
        section: 'course',
        rect: content(sections.course.top + sections.course.height - 120, 50),
      },
      { id: 'contact-copy', section: 'contact', rect: content(sections.contact.top + 70, 70) },
    ],
  };
}

describe('Measured keychain route geometry', () => {
  it.each([320, 390, 768, 1024, 1440])(
    'builds a clear right/left/right route inside a %ipx layout',
    (width) => {
      const input = fixture(width);
      const route = buildKeychainRoute(input);
      expect(route.issues).toEqual([]);
      expect(route.valid).toBe(true);
      expect(route.totalLength).toBeGreaterThan(input.formation.top);
      expect(route.points.find((point) => point.key === 'about-right')?.side).toBe('right');
      expect(route.points.find((point) => point.key === 'course-left')?.side).toBe('left');
      expect(route.points.find((point) => point.key === 'contact-right')?.side).toBe('right');
      expect(route.requiredSpacing.beforeCourse).toBe(0);
      expect(route.requiredSpacing.beforeContact).toBe(0);

      let previousY = -Infinity;
      const padX = input.footprint.width / 2 + input.clearance;
      const padY = input.footprint.height / 2 + input.clearance;
      for (let step = 0; step <= 500; step++) {
        const point = sampleKeychainRoute(route, step / 500);
        expect(point.y).toBeGreaterThanOrEqual(previousY - 1e-6);
        expect(point.x - padX).toBeGreaterThanOrEqual(-1e-6);
        expect(point.x + padX).toBeLessThanOrEqual(width + 1e-6);
        expect(point.y - padY).toBeGreaterThanOrEqual(-1e-6);
        expect(point.y + padY).toBeLessThanOrEqual(
          input.formation.top + input.formation.height + 1e-6,
        );
        previousY = point.y;

        for (const { rect } of input.obstacles) {
          const horizontalOverlap =
            point.x + padX > rect.left + 1e-6 && point.x - padX < rect.left + rect.width - 1e-6;
          const verticalOverlap =
            point.y + padY > rect.top + 1e-6 && point.y - padY < rect.top + rect.height - 1e-6;
          expect(horizontalOverlap && verticalOverlap).toBe(false);
        }
      }
    },
  );

  it('reports current crossing deficits without pretending the path is clear', () => {
    const input = fixture(390);
    const squeezed: KeychainRouteInput = {
      ...input,
      obstacles: input.obstacles.map((obstacle) => {
        if (obstacle.id === 'about-products') {
          return {
            ...obstacle,
            rect: {
              ...obstacle.rect,
              height:
                input.sections.about.top + input.sections.about.height - 8 - obstacle.rect.top,
            },
          };
        }
        if (obstacle.id === 'course-copy') {
          return { ...obstacle, rect: { ...obstacle.rect, top: input.sections.course.top + 8 } };
        }
        if (obstacle.id === 'course-action') {
          return {
            ...obstacle,
            rect: {
              ...obstacle.rect,
              top: input.sections.course.top + input.sections.course.height - 54,
            },
          };
        }
        if (obstacle.id === 'contact-copy') {
          return { ...obstacle, rect: { ...obstacle.rect, top: input.sections.contact.top + 4 } };
        }
        return obstacle;
      }),
    };
    const route = buildKeychainRoute(squeezed);
    const minimum = input.footprint.height + input.clearance * 2;
    expect(route.valid).toBe(false);
    expect(route.requiredSpacing.beforeCourse).toBeCloseTo(minimum - 16);
    expect(route.requiredSpacing.beforeContact).toBeCloseTo(minimum - 8);
    expect(route.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'insufficient-gap-before-course',
        'insufficient-gap-before-contact',
        'obstacle-collision',
      ]),
    );
    expect(route.points.length).toBeGreaterThan(0);
    expect(
      route.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)),
    ).toBe(true);
  });

  it('reports the absolute minimum arrival height and corridor/viewport violations', () => {
    const input = fixture(320);
    const route = buildKeychainRoute({
      ...input,
      origin: { x: -10, y: input.origin.y },
      corridor: input.footprint.width,
      formation: { ...input.formation, height: 12 },
    });
    expect(route.valid).toBe(false);
    expect(route.requiredSpacing.formationHeight).toBe(
      input.footprint.height + input.clearance * 2,
    );
    expect(route.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['out-of-bounds', 'corridor-too-narrow', 'formation-too-short']),
    );
  });

  it('rejects a row area that begins before all contact controls finish', () => {
    const input = fixture(390);
    const route = buildKeychainRoute({
      ...input,
      obstacles: [
        ...input.obstacles,
        {
          id: 'expanded-social-control',
          section: 'contact',
          // Left of the nominal final segment: checking the central path alone misses this.
          rect: {
            left: input.formation.left,
            top: input.formation.top + 4,
            width: 12,
            height: 12,
          },
        },
      ],
    });
    expect(route.valid).toBe(false);
    expect(route.issues.map((issue) => issue.code)).toContain('formation-before-contact-content');
  });

  it('rejects a row area that extends into the footer or outside the viewport', () => {
    const input = fixture(390);
    const route = buildKeychainRoute({
      ...input,
      formation: {
        ...input.formation,
        left: -1,
        height: input.sections.contact.height,
      },
    });
    expect(route.valid).toBe(false);
    expect(route.issues.map((issue) => issue.code)).toContain('formation-out-of-bounds');
  });

  it('detects an obstacle along a diagonal segment, not just at waypoints', () => {
    const input = fixture(1024);
    const clear = buildKeychainRoute(input);
    const first = clear.points[0];
    const second = clear.points[1];
    const x = (first.x + second.x) / 2;
    const y = (first.y + second.y) / 2;
    const route = buildKeychainRoute({
      ...input,
      obstacles: [
        ...input.obstacles,
        {
          id: 'intermediate-control',
          section: 'hero',
          rect: { left: x - 3, top: y - 3, width: 6, height: 6 },
        },
      ],
    });
    expect(route.valid).toBe(false);
    expect(
      route.issues.some(
        (issue) =>
          issue.code === 'obstacle-collision' && issue.detail.includes('intermediate-control'),
      ),
    ).toBe(true);
  });

  it('rejects empty or non-finite inputs without emitting NaN coordinates', () => {
    const input = fixture(390);
    const invalid: KeychainRouteInput[] = [
      { ...input, width: 0 },
      { ...input, width: NaN },
      { ...input, origin: { x: Infinity, y: 0 } },
      { ...input, heroScene: { ...input.heroScene, height: 0 } },
      { ...input, footprint: { width: 0, height: 1 } },
      { ...input, clearance: -1 },
      { ...input, corridor: Infinity },
      { ...input, formation: { ...input.formation, top: NaN } },
      { ...input, sections: { ...input.sections, about: { ...input.sections.about, width: 0 } } },
    ];
    for (const value of invalid) {
      const route = buildKeychainRoute(value);
      expect(route.valid).toBe(false);
      expect(route.points).toEqual([]);
      expect(route.totalLength).toBe(0);
      expect(route.issues.every((issue) => issue.code === 'invalid-input')).toBe(true);
      expect(sampleKeychainRoute(route, 0.5)).toEqual({ x: 0, y: 0 });
    }
  });

  it('samples by distance, including horizontal joints and reversed traversal', () => {
    const input = fixture(768);
    const route = buildKeychainRoute(input);
    const reverse = { ...route, points: [...route.points].reverse() };
    expect(sampleKeychainRoute(route, -1)).toEqual(input.origin);
    expect(sampleKeychainRoute(route, NaN)).toEqual(input.origin);
    expect(sampleKeychainRoute(route, Infinity)).toEqual(sampleKeychainRoute(route, 1));
    let distance = 0;
    for (let index = 0; index < route.points.length; index++) {
      if (index) {
        const a = route.points[index - 1];
        const b = route.points[index];
        distance += Math.hypot(b.x - a.x, b.y - a.y);
      }
      const point = sampleKeychainRoute(route, distance / route.totalLength);
      expect(point.x).toBeCloseTo(route.points[index].x, 6);
      expect(point.y).toBeCloseTo(route.points[index].y, 6);
    }
    for (const progress of [0, 0.13, 0.5, 0.89, 1]) {
      const forward = sampleKeychainRoute(route, progress);
      const backward = sampleKeychainRoute(reverse, 1 - progress);
      expect(backward.x).toBeCloseTo(forward.x, 6);
      expect(backward.y).toBeCloseTo(forward.y, 6);
    }

    const repeated = { ...route, points: [route.points[0], ...route.points, route.points.at(-1)!] };
    expect(sampleKeychainRoute(repeated, 0.4)).toEqual(sampleKeychainRoute(route, 0.4));
  });
});
