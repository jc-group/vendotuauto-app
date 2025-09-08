import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { z } from 'zod';
import {
  LocationService,
  Municipality,
  State,
} from '../../../shared/location.service';
import { SupabaseService } from '../../../shared/supabase.service';
import { VehicleApiService } from '../../../shared/vehicle-api.service';
import { ToastService } from '../../../shared/toast.service';

interface ListingDraft {
  title: string;
  state: string;
  municipality_name: string;
  brand: string;
  model: string;
  year: number | null;
  km: number | null;
  description?: string;
  trim?: string;
  priceMin?: number | null;
  priceMax?: number | null;
}

@Component({
  selector: 'app-listing-wizard',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './listing-wizard.html',
  styleUrl: './listing-wizard.css',
})
export class ListingWizard implements OnDestroy, OnInit {
  // --- State (signals)
  step = signal(1);
  errors = signal<string[]>([]);
  private objectURLs = new Map<number, string>(); // index -> blob URL
  nextYear = new Date().getFullYear() + 1;

  // --- Favorite state for card preview
  isFavorited = false;
  toggleFavorite() {
    this.isFavorited = !this.isFavorited;
  }

  // --- Forms
  fb = new FormBuilder();
  formVehicle = this.fb.group({
    title: ['', Validators.required],
    state: ['', Validators.required],
    municipality: ['', Validators.required],
    brand: ['', Validators.required],
    model: ['', Validators.required],
    year: [
      null,
      [Validators.required, Validators.min(1990), Validators.max(2030)],
    ],
    km: [null, [Validators.required, Validators.min(0)]],
    trim: ['', Validators.required],
    description: [''],
  });
  formPrice = this.fb.group({
    priceMin: [null, [Validators.required, Validators.min(10000)]],
    priceMax: [null, [Validators.required, Validators.min(10000)]],
  });

  // --- Photos
  private _photos = signal<File[]>([]);
  photos = this._photos.asReadonly();

  // --- Summary
  summary = computed(() => {
    const v = this.formVehicle.value,
      p = this.formPrice.value;
    const priceRange =
      p.priceMin && p.priceMax
        ? `$${Number(p.priceMin).toLocaleString()} - $${Number(
            p.priceMax
          ).toLocaleString()}`
        : '';
    return `${v.title ?? ''} • ${v.brand ?? ''} ${v.model ?? ''} ${
      v.year ?? ''
    } • ${priceRange}`;
  });

  // --- Navigation
  next() {
    if (this.step() === 1 && this.formVehicle.valid) this.step.set(2);
    else if (this.step() === 2 && this.formPrice.valid) this.step.set(3);
  }
  prev() {
    if (this.step() > 1) this.step.update((s) => s - 1);
  }

  // --- Draft save (local)
  saveDraft() {
    const payload: ListingDraft = {
      title: this.formVehicle.value.title ?? '',
      state: this.formVehicle.value.state ?? '',
      municipality_name: this.formVehicle.value.municipality ?? '',
      brand: this.formVehicle.value.brand ?? '',
      model: this.formVehicle.value.model ?? '',
      year: this.formVehicle.value.year ?? null,
      km: this.formVehicle.value.km ?? null,
      description: this.formVehicle.value.description ?? '',
      trim: this.formVehicle.value.trim ?? '',
      priceMin: this.formPrice.value.priceMin ?? null,
      priceMax: this.formPrice.value.priceMax ?? null,
    };
    localStorage.setItem('listingDraft', JSON.stringify(payload));
    this.toast.success('Borrador guardado.');
  }

  // --- Files handlers
  onFile(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.pushFiles(Array.from(input.files));
    input.value = '';
  }
  onDrop(e: DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer?.files ?? []);
    this.pushFiles(files);
  }
  private pushFiles(files: File[]) {
    const errs: string[] = [];
    const accepted = ['image/jpeg', 'image/png', 'image/webp'];
    const max = 5 * 1024 * 1024; // 5MB
    const current = this._photos();

    for (const f of files) {
      if (!accepted.includes(f.type)) {
        errs.push(`Formato no permitido: ${f.name}`);
        continue;
      }
      if (f.size > max) {
        errs.push(`Archivo muy grande (>5MB): ${f.name}`);
        continue;
      }
      if (current.length >= 10) {
        errs.push('Límite de 10 fotos alcanzado.');
        break;
      }
      current.push(f);
      this.makePreview(current.length - 1, f);
    }
    this._photos.set([...current]);
    if (errs.length) {
      this.errors.set(errs);
      this.toast.error(
        errs.length === 1
          ? errs[0]
          : `${errs.length} archivos con errores. Revisa los detalles.`
      );
    }
  }
  remove(index: number) {
    const arr = [...this._photos()];
    if (!arr[index]) return;
    this.revokePreview(index);
    arr.splice(index, 1);
    this._photos.set(arr);
    // reindex previews
    const newMap = new Map<number, string>();
    arr.forEach((_, i) => {
      const prevUrl = this.objectURLs.get(i) ?? this.objectURLs.get(i + 1);
      if (prevUrl) newMap.set(i, prevUrl);
    });
    this.objectURLs.forEach((url, i) => {
      if (!newMap.has(i)) URL.revokeObjectURL(url);
    });
    this.objectURLs = newMap;
  }
  move(index: number, dir: -1 | 1) {
    const arr = [...this._photos()];
    const ni = index + dir;
    if (ni < 0 || ni >= arr.length) return;
    [arr[index], arr[ni]] = [arr[ni], arr[index]];
    this._photos.set(arr);
    const a = this.objectURLs.get(index);
    const b = this.objectURLs.get(ni);
    if (a !== undefined) this.objectURLs.set(ni, a);
    if (b !== undefined) this.objectURLs.set(index, b);
  }
  previewFor(index: number) {
    return this.objectURLs.get(index) ?? '';
  }
  private makePreview(index: number, file: File) {
    const url = URL.createObjectURL(file);
    this.objectURLs.set(index, url);
  }
  private revokePreview(index: number) {
    const url = this.objectURLs.get(index);
    if (url) URL.revokeObjectURL(url);
    this.objectURLs.delete(index);
  }

  // --- Validation helpers
  canSubmit() {
    return (
      this.formVehicle.valid &&
      this.formPrice.valid &&
      this._photos().length >= 3
    );
  }

  // --- Submit (stub)
  async submit() {
    if (!this.canSubmit()) return;
    try {
      // 1) Construir input crudo desde formularios
      const municipalityId = Number(this.formVehicle.value.municipality);
      const municipality_name = this.municipalities.find(
        (m) => m.id === municipalityId
      )?.name ?? '';

      const raw = {
        title: this.formVehicle.value.title ?? '',
        brand: this.formVehicle.value.brand ?? '',
        model: this.formVehicle.value.model ?? '',
        year: this.formVehicle.value.year as unknown,
        price: this.formPrice.value.priceMax as unknown,
        status: 'pending' as const,
        description: this.formVehicle.value.description ?? undefined,
        municipality_name,
      };

      // 2) Validar y sanear con Zod (trim + rangos)
      const SubmissionSchema = z.object({
        title: z.string().trim().min(1, 'Título requerido'),
        brand: z.string().trim().min(1, 'Marca requerida'),
        model: z.string().trim().min(1, 'Modelo requerido'),
        year: z.coerce
          .number({ message: 'Año inválido' })
          .int('Año debe ser entero')
          .min(1990, 'Año mínimo 1990')
          .max(2030, 'Año máximo 2030'),
        price: z.coerce
          .number({ message: 'Precio inválido' })
          .min(10000, 'Precio mínimo $10,000'),
        status: z.enum(['pending', 'published', 'rejected']).optional(),
        description: z.string().trim().optional().nullable(),
        municipality_name: z
          .string()
          .trim()
          .min(1, 'Municipio requerido'),
      });

      const payload = SubmissionSchema.parse(raw);

      // 3) Enviar a Supabase solo el shape esperado por la tabla
      await this.supabaseService.createListing(payload);
      // Subir fotos y guardar URLs
      const photoUrls: string[] = [];
      for (const file of this._photos()) {
        const url = await this.supabaseService.uploadPhoto(file);
        photoUrls.push(url);
      }
      this.toast.success('¡Enviado a revisión!');
    } catch (err) {
      // Mostrar errores de validación Zod de forma amigable
      if (err && typeof err === 'object' && 'issues' in (err as any)) {
        const zodErr = err as z.ZodError;
        this.errors.set(zodErr.issues.map((i) => i.message));
        this.toast.error('Corrige los campos marcados y vuelve a intentar.');
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error('Error al enviar: ' + msg);
    }
  }

  // --- Model suggestions
  private vehicleApi = inject(VehicleApiService);
  private locationService = inject(LocationService);
  private supabaseService = inject(SupabaseService);
  private toast = inject(ToastService);
  modelSuggestions: string[] = [];

  onModelInput(event: Event) {
    const value = (event.target as HTMLInputElement)?.value ?? '';
    const brand = this.formVehicle.value.brand ?? '';
    this.vehicleApi
      .suggestModelsForMake(brand, value)
      .subscribe((suggestions: string[]) => {
        this.modelSuggestions = suggestions;
      });
  }

  selectModel(model: string) {
    this.formVehicle.patchValue({ model });
    this.modelSuggestions = [];
  }

  // --- Brand list for select
  brands: string[] = [];
  brandLoading = true;
  models: string[] = [];
  states: State[] = [];
  municipalities: Municipality[] = [];

  constructor() {
    this.locationService = inject(LocationService);
  }

  ngOnInit() {
    this.vehicleApi.getMakes().subscribe({
      next: (response: string[] | { data: string[] }) => {
        // If the API response is wrapped, adjust accordingly
        const list = Array.isArray(response)
          ? response
          : (response as { data: string[] })?.data ?? [];
        this.brands = list;
        this.brandLoading = false;
      },
      error: (err) => {
        console.error('Error loading brands:', err);
        this.brandLoading = false;
        this.toast.error('Error cargando marcas. Intenta de nuevo.');
      },
    });
    // Cargar modelos si ya hay marca seleccionada al iniciar
    if (this.formVehicle.value.brand) {
      this.loadModels(this.formVehicle.value.brand);
      this.formVehicle.controls.model.enable();
    } else {
      this.formVehicle.controls.model.disable();
    }
    // Suscribirse a cambios de marca para actualizar modelos y habilitar/deshabilitar el control
    this.formVehicle.controls.brand.valueChanges.subscribe((brand) => {
      this.loadModels(brand ?? '');
      if (brand) {
        this.formVehicle.controls.model.enable();
      } else {
        this.formVehicle.controls.model.disable();
      }
    });

    // Cargar estados usando LocationService
    this.locationService.getStates().subscribe({
      next: (states) => {
        this.states = states;
      },
      error: (err) => {
        console.error('Error loading states:', err);
        this.toast.error('Error cargando estados.');
      },
    });
    // Deshabilitar municipio al inicio
    this.formVehicle.controls.municipality.disable();
    // Suscribirse a cambios de estado para cargar municipios
    this.formVehicle.controls.state.valueChanges.subscribe((stateId) => {
      if (stateId) {
        this.locationService
          .getMunicipalitiesByStateId(Number(stateId))
          .subscribe({
            next: (municipalities) => {
              this.municipalities = municipalities;
              this.formVehicle.controls.municipality.enable();
            },
            error: (err) => {
              console.error('Error loading municipalities:', err);
              this.municipalities = [];
              this.formVehicle.controls.municipality.disable();
              this.toast.error('Error cargando municipios.');
            },
          });
      } else {
        this.municipalities = [];
        this.formVehicle.controls.municipality.disable();
      }
      this.formVehicle.patchValue({ municipality: '' });
    });
  }

  loadModels(brand: string | null) {
    if (!brand) {
      this.models = [];
      return;
    }
    this.vehicleApi.getModelsForMake(brand).subscribe({
      next: (models) => {
        this.models = models;
      },
      error: (err) => {
        console.error('Error loading models:', err);
        this.models = [];
        this.toast.error('Error cargando modelos.');
      },
    });
  }

  onStateChange(event: Event) {
    const selectedStateId = (event.target as HTMLSelectElement).value;
    if (selectedStateId) {
      this.locationService
        .getMunicipalitiesByStateId(Number(selectedStateId))
        .subscribe({
          next: (municipalities) => {
            this.municipalities = municipalities;
          },
          error: (err) => {
            console.error('Error loading municipalities:', err);
            this.municipalities = [];
            this.toast.error('Error cargando municipios.');
          },
        });
    } else {
      this.municipalities = [];
    }
    this.formVehicle.patchValue({ municipality: '' });
  }

  trackByIndex(index: number) {
    return index;
  }

  ngOnDestroy(): void {
    this.objectURLs.forEach((u) => URL.revokeObjectURL(u));
    this.objectURLs.clear();
  }
}
