import { Routes } from '@angular/router';
//serve per importare il component che vogliamo visualizzare senza doverlo importare in app.ts
import { ClienteComponent } from './features/cliente/cliente';
//importa la dashboard
import { Dashboard } from './features/dashboard/dashboard';
//importa il component di corso
import { CorsoComponent } from './features/corso/corso';

export const routes: Routes = [
    
    //imposta dashboard come default
    {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
    },

    // si visualizza con /dashboard 
    {
        path: 'dashboard',
        component: Dashboard
    },

    // si visualizza con /clienti
    {
    path: 'clienti',
    component: ClienteComponent
    },

    // si visualizza con /corsi
    {
    path: 'corsi',
    component: CorsoComponent
    }


];