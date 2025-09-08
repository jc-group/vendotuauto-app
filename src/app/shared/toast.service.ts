import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  text: string;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<ToastItem[]>([]);
  toasts = this._toasts.asReadonly();

  private nextId = 1;
  private timers = new Map<number, any>();

  show(text: string, type: ToastType = 'info', duration = 3500) {
    const id = this.nextId++;
    const toast: ToastItem = { id, type, text, duration };
    this._toasts.update((list) => [...list, toast]);
    const timer = setTimeout(() => this.dismiss(id), duration);
    this.timers.set(id, timer);
    return id;
  }

  success(text: string, duration = 3000) {
    return this.show(text, 'success', duration);
  }
  error(text: string, duration = 5000) {
    return this.show(text, 'error', duration);
  }
  info(text: string, duration = 3500) {
    return this.show(text, 'info', duration);
  }

  dismiss(id: number) {
    const t = this.timers.get(id);
    if (t) {
      clearTimeout(t);
      this.timers.delete(id);
    }
    this._toasts.update((list) => list.filter((x) => x.id !== id));
  }
}

