import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[92vw]">
      @for (t of toasts(); track t.id) {
        <div
          role="status"
          class="rounded-xl shadow-[var(--shadow-soft)] border px-4 py-3 flex items-start gap-3"
          [class]="
            'bg-white border-slate-200 text-slate-800 dark:bg-slate-900 dark:border-slate-700 ' +
            (t.type === 'success' ? 'ring-1 ring-green-200' : t.type === 'error' ? 'ring-1 ring-red-200' : 'ring-1 ring-slate-200')
          "
        >
          <div class="mt-0.5">
            <span
              class="inline-flex size-2.5 rounded-full"
              [class.bg-green-500]="t.type==='success'"
              [class.bg-red-500]="t.type==='error'"
              [class.bg-slate-400]="t.type==='info'"
            ></span>
          </div>
          <div class="text-sm leading-5 flex-1">{{ t.text }}</div>
          <button
            type="button"
            class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            (click)="close(t.id)"
            aria-label="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  private toast = inject(ToastService);
  toasts = computed(() => this.toast.toasts());
  close(id: number) {
    this.toast.dismiss(id);
  }
}

