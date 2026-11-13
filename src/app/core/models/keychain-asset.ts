export interface KeychainAsset {
  readonly id: string;
  readonly src: string;
  readonly width: number;
  readonly height: number;
  /** Visible bounds measured from the original PNG at alpha >= 128. */
  readonly bounds: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly renderAllowed: boolean;
  readonly status?: 'differs-from-mockup';
}
