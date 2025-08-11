import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'listings',
    loadComponent: () => import('./listings/wizard/listing-wizard/listing-wizard').then(c => c.ListingWizard),
    title: 'Crear publicación',
  },
  {
    path: '**', redirectTo: 'listings'
  }
];
