import { Component, OnInit, inject, isDevMode, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainerComponent } from './shared/toast-container.component';
import { LocationService } from './shared/location.service';
import { ToastService } from './shared/toast.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('vendotuauto-app');

  // Health check: probar Supabase REST (states/municipalities)
  private location = inject(LocationService);
  private toast = inject(ToastService);

  ngOnInit(): void {
    if (!isDevMode()) return;
    this.location.getStates().subscribe({
      next: (states) => {
        if (!states?.length) {
          this.toast.info('API: sin estados disponibles.');
          return;
        }
        // Probar municipios con el primer estado
        const firstId = states[0].id;
        this.location.getMunicipalitiesByStateId(firstId).subscribe({
          next: () => {
            // OK, no-op
          },
          error: () => {
            this.toast.error('API: error cargando municipios (health check).');
          },
        });
      },
      error: () => {
        this.toast.error('API: error conectando a Supabase (estados).');
      },
    });
  }
}
