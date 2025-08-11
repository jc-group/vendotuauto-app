// src/app/shared/vehicle-api.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

interface VpicMake {
  Make_ID: number;
  Make_Name?: string;
  MakeName?: string;
}
interface VpicModel {
  Make_ID: number;
  Make_Name: string;
  Model_ID: number;
  Model_Name: string;
}

function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

@Injectable({ providedIn: 'root' })
export class VehicleApiService {
  private http = inject(HttpClient);
  private base = 'https://vpic.nhtsa.dot.gov/api/vehicles';

  private makes$?: Observable<string[]>;
  private modelsCache = new Map<string, string[]>();

  /** Load & cache car makes once */
  getMakes(): Observable<string[]> {
    if (!this.makes$) {
      this.makes$ = this.http
        .get<{ Results: VpicMake[] }>(
          `${this.base}/GetMakesForVehicleType/car?format=json`
        )
        .pipe(
          map(
            (r) =>
              r.Results.map((x) => (x.MakeName ?? x.Make_Name)?.trim()).filter(
                Boolean
              ) as string[]
          ),
          map((list) => {
            // dedupe case/diacritics
            const seen = new Set<string>();
            return list
              .filter((n) => {
                const key = normalize(n);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              })
              .sort((a, b) => a.localeCompare(b));
          }),
          shareReplay(1)
        );
    }
    return this.makes$;
  }

  /** Get models for a make (deduped & sorted) */
  getModelsForMake(make: string): Observable<string[]> {
    const m = (make ?? '').trim();
    if (!m) return of([]);
    const key = normalize(m);
    const cached = this.modelsCache.get(key);
    if (cached) return of(cached);

    return this.http
      .get<{ Results: VpicModel[] }>(
        `${this.base}/GetModelsForMake/${encodeURIComponent(m)}?format=json`
      )
      .pipe(
        map(
          (r) =>
            r.Results.map((x) => x.Model_Name?.trim()).filter(
              Boolean
            ) as string[]
        ),
        map((list) => [...new Set(list)].sort((a, b) => a.localeCompare(b))),
        map((list) => {
          this.modelsCache.set(key, list);
          return list;
        })
      );
  }

  /**
   * Devuelve modelos sugeridos para una marca según el input parcial del usuario.
   * Si el usuario teclea una marca, se le pueden sugerir modelos que coincidan con el texto ingresado.
   */
  suggestModelsForMake(make: string, partial: string): Observable<string[]> {
    const m = (make ?? '').trim();
    const p = (partial ?? '').trim().toLowerCase();
    if (!m || !p) return of([]);
    return this.getModelsForMake(m).pipe(
      map((models) =>
        models.filter((model) => normalize(model).includes(normalize(p)))
      )
    );
  }

  /**
   * Devuelve marcas sugeridas según el input parcial del usuario.
   * Si el usuario teclea una marca, se le pueden sugerir marcas que coincidan con el texto ingresado.
   */
  suggestMakes(partial: string): Observable<string[]> {
    const p = (partial ?? '').trim().toLowerCase();
    if (!p) return of([]);
    return this.getMakes().pipe(
      map((makes) =>
        makes.filter((make) => normalize(make).includes(normalize(p)))
      )
    );
  }
}
