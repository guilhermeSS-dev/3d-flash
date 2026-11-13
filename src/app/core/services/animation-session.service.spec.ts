import { EnvironmentInjector, createEnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AnimationSessionService } from './animation-session.service';

describe('AnimationSessionService', () => {
  it('allows only the first transformation claim within a document session', () => {
    const session = TestBed.inject(AnimationSessionService);

    expect(session.caseTransformationStarted()).toBe(false);
    expect(session.claimCaseTransformation()).toBe(true);
    expect(session.caseTransformationStarted()).toBe(true);
    expect(session.claimCaseTransformation()).toBe(false);
    expect(session.caseTransformationStarted()).toBe(true);
  });

  it('shares the consumed state with child route environment injectors', () => {
    const session = TestBed.inject(AnimationSessionService);
    const child = createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));

    try {
      session.claimCaseTransformation();
      const routeSession = child.get(AnimationSessionService);

      expect(routeSession).toBe(session);
      expect(routeSession.caseTransformationStarted()).toBe(true);
      expect(routeSession.claimCaseTransformation()).toBe(false);
    } finally {
      child.destroy();
    }
  });

  it('starts unconsumed in a new application root', () => {
    const previous = TestBed.inject(AnimationSessionService);
    previous.claimCaseTransformation();

    TestBed.resetTestingModule();
    const next = TestBed.inject(AnimationSessionService);

    expect(next).not.toBe(previous);
    expect(next.caseTransformationStarted()).toBe(false);
    expect(next.claimCaseTransformation()).toBe(true);
  });

  it('consumes entrance keys independently and shares them across injected references', () => {
    const session = TestBed.inject(AnimationSessionService);
    const sameSession = TestBed.inject(AnimationSessionService);

    expect(session.claimEntrance('opening')).toBe(true);
    expect(sameSession.claimEntrance('opening')).toBe(false);
    expect(sameSession.claimEntrance('section:about')).toBe(true);
    expect(session.claimEntrance('section:about')).toBe(false);
    expect(session.claimEntrance('section:course')).toBe(true);
    expect(session.caseTransformationStarted()).toBe(false);
  });
});
