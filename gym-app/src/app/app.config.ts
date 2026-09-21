import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners
} from '@angular/core';

import { provideRouter } from '@angular/router';

// importo lo strumento che ci permette
// di fare richieste HTTP e lavorare con il back-end
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';


export const appConfig: ApplicationConfig = {

  providers: [

    provideBrowserGlobalErrorListeners(),

    provideRouter(routes),

    // lo iniettiamo per utilizzare HttpClient
    provideHttpClient()

  ]

};