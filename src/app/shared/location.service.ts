import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';

export interface State {
  id: number;
  name: string;
  name_norm?: string | null;
  slug: string;
}

export interface Municipality {
  id: number;
  state_id: number;
  name: string;
  name_norm?: string | null;
  slug: string;
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  private http = inject(HttpClient);

  private base = `${environment.supabaseUrl}/rest/v1`;
  private headers = new HttpHeaders({
    apikey: environment.supabaseAnonKey,
    Authorization: `Bearer ${environment.supabaseAnonKey}`,
  });

  // cache simple
  private states$?: Observable<State[]>;

  /** Obtiene todos los estados ordenados por nombre (cacheados). */
  getStates(): Observable<State[]> {
    if (!this.states$) {
      const params = new HttpParams()
        .set('select', 'id,name,slug')
        .set('order', 'name.asc');
      this.states$ = this.http
        .get<State[]>(`${this.base}/states`, { headers: this.headers, params })
        .pipe(shareReplay(1));
    }
    return this.states$;
  }

  /** Obtiene municipios por ID de estado. */
  getMunicipalitiesByStateId(stateId: number): Observable<Municipality[]> {
    const params = new HttpParams()
      .set('select', 'id,state_id,name,slug')
      .set('state_id', `eq.${stateId}`)
      .set('order', 'name.asc');
    return this.http.get<Municipality[]>(`${this.base}/municipalities`, {
      headers: this.headers,
      params,
    });
  }

  /** Obtiene un estado por slug. */
  getStateBySlug(slug: string): Observable<State | null> {
    const params = new HttpParams()
      .set('select', 'id,name,slug')
      .set('slug', `eq.${slug}`)
      .set('limit', 1);
    return this.http
      .get<State[]>(`${this.base}/states`, { headers: this.headers, params })
      .pipe(map((rows) => rows[0] ?? null));
  }

  /** Municipios por slug de estado (join implícito usando la FK). */
  getMunicipalitiesByStateSlug(stateSlug: string): Observable<Municipality[]> {
    // Nota: requiere FK municipalities.state_id -> states.id (ya la tienes)
    // y PostgREST permite select anidado con states!
    const params = new HttpParams()
      .set('select', 'id,state_id,name,slug,states!inner(slug)')
      .set('states.slug', `eq.${stateSlug}`)
      .set('order', 'name.asc');
    return this.http.get<Municipality[]>(`${this.base}/municipalities`, {
      headers: this.headers,
      params,
    });
  }

  /** Búsqueda de municipios por término, filtrando por estado (ID). */
  searchMunicipalities(
    stateId: number,
    term: string
  ): Observable<Municipality[]> {
    const q = term.trim();
    // Usamos name.ilike para búsqueda simple; si quieres búsqueda sin acentos,
    // crea una vista o RPC que compare contra name_norm.
    const params = new HttpParams()
      .set('select', 'id,state_id,name,slug')
      .set('state_id', `eq.${stateId}`)
      .set('name', `ilike.%${q}%`)
      .set('order', 'name.asc')
      .set('limit', 50);
    return this.http.get<Municipality[]>(`${this.base}/municipalities`, {
      headers: this.headers,
      params,
    });
  }
}
