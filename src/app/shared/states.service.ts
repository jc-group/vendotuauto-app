import { Injectable } from '@angular/core';

// Ajusta la ruta si mueves el JSON
import statesData from '@data/inegi/statesWithMunicipalities.json';

export interface StateData {
  state: string;
  municipalities: string[];
}

@Injectable({ providedIn: 'root' })
export class StatesService {
  private states: StateData[] = statesData as StateData[];

  /** Returns all states */
  getStates(): StateData[] {
    return this.states;
  }

  /** Returns a state object by name (case-insensitive) */
  findState(query: string): StateData | undefined {
    const q = query.trim().toLowerCase();
    return this.states.find((s) => s.state.toLowerCase() === q);
  }

  /** Returns the municipalities of a state by name */
  getMunicipalitiesByState(query: string): string[] {
    const state = this.findState(query);
    return state ? state.municipalities : [];
  }
}
