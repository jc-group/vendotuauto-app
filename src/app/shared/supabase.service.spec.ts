import { TestBed } from '@angular/core/testing';
import { SupabaseService } from './supabase.service';

// Elimina el mock de Jest, Jasmine no lo necesita
// El entorno se debe configurar en angular.json y environment.ts

describe('SupabaseService', () => {
  let service: SupabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SupabaseService],
    });
    service = TestBed.inject(SupabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize the Supabase client', () => {
    service.initClient();
    expect(service['supabase']).toBeDefined();
  });
});
