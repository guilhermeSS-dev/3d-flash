import { LaunchClock } from './features/launch/launch-clock';
import { LAUNCH_CONFIG } from './features/launch/launch-session.service';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideAppInitializer,
  inject,
} from '@angular/core';
import { provideRouter, withHashLocation, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => {
      const config = inject(LAUNCH_CONFIG),
        clock = inject(LaunchClock);
      return config.enabled ? clock.sync().then(() => undefined) : undefined;
    }),
    provideRouter(
      routes,
      withHashLocation(),
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      }),
    ),
  ],
};
