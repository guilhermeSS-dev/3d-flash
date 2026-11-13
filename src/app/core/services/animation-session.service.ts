import { Injectable, signal } from '@angular/core';

/** Document-lifetime state shared across routes; intentionally never persisted to storage. */
@Injectable({ providedIn: 'root' })
export class AnimationSessionService {
  private readonly caseStarted = signal(false);
  private readonly enteredIds = new Set<string>();
  readonly caseTransformationStarted = this.caseStarted.asReadonly();

  /** Consume the transformation at its start, including interrupted animations. */
  claimCaseTransformation(): boolean {
    if (this.caseStarted()) return false;

    this.caseStarted.set(true);
    return true;
  }

  /** Keep each secondary entrance consumed across route changes in the same document. */
  claimEntrance(id: string): boolean {
    if (this.enteredIds.has(id)) return false;

    this.enteredIds.add(id);
    return true;
  }
}
