/** External wrapper pose in landing-surface coordinates, before the independent inner float. */
export interface KeychainMotionMember {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  /** Scaled source dimensions, without rotation or the inner floating displacement. */
  readonly width: number;
  readonly height: number;
}

export interface KeychainMotionFrame {
  readonly progress: number;
  /** Resets establish geometry without implying a travelled segment. */
  readonly reason: 'motion' | 'reset';
  readonly members: readonly KeychainMotionMember[];
}
