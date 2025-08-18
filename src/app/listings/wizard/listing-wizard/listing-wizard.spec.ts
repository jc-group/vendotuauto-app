import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ListingDraft,
  SupabaseService,
} from '../../../shared/supabase.service';
import { VehicleApiService } from '../../../shared/vehicle-api.service';

import { ListingWizard } from './listing-wizard';

class SupabaseServiceMock {
  createListing(draft: ListingDraft): Promise<ListingDraft[]> {
    return Promise.resolve([draft]);
  }
  getListingsByStatus(status: string): Promise<ListingDraft[]> {
    return Promise.resolve([
      {
        title: 'Test',
        brand: 'Brand',
        model: 'Model',
        year: 2025,
        price: 10000,
        status,
        municipality: '',
        state: '',
        km: 0,
        description: '',
        trim: '',
        priceMin: 10000,
        priceMax: 10000,
      },
    ]);
  }
  updateListingStatus(id: string, status: string): Promise<ListingDraft[]> {
    return Promise.resolve([
      {
        title: 'Test',
        brand: 'Brand',
        model: 'Model',
        year: 2025,
        price: 10000,
        status,
        municipality: '',
        state: '',
        km: 0,
        description: '',
        trim: '',
        priceMin: 10000,
        priceMax: 10000,
        id,
      } as ListingDraft,
    ]);
  }
  deletePhoto(filename: string): Promise<void> {
    if (!filename) {
      return Promise.reject(new Error('Filename is required'));
    }
    // Simula la eliminación verificando si el nombre termina en ".jpg"
    if (filename.endsWith('.jpg') || filename.endsWith('.png')) {
      return Promise.resolve();
    } else {
      return Promise.reject(new Error('File not found'));
    }
  }
  uploadPhoto(file: File): Promise<string> {
    // Simula la subida de la foto y retorna una URL simulada basada en el nombre del archivo
    const fileName = file.name;
    const url = `https://mock-storage.example.com/photos/${encodeURIComponent(
      fileName
    )}`;
    return Promise.resolve(url);
  }
}

class VehicleApiServiceMock {
  getMakes() {
    return {
      subscribe: (cb?: (brands: string[]) => void) => {
        if (typeof cb === 'function') cb(['Brand']);
      },
    };
  }
  getModelsForMake() {
    return {
      subscribe: (cb?: (models: string[]) => void) => {
        if (typeof cb === 'function') cb(['Model']);
      },
    };
  }
  suggestModelsForMake() {
    return {
      subscribe: (cb?: (models: string[]) => void) => {
        if (typeof cb === 'function') cb(['Model']);
      },
    };
  }
}

describe('ListingWizard', () => {
  let component: ListingWizard;
  let fixture: ComponentFixture<ListingWizard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListingWizard],
      providers: [
        provideHttpClientTesting(),
        { provide: SupabaseService, useClass: SupabaseServiceMock },
        { provide: VehicleApiService, useClass: VehicleApiServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ListingWizard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should create a listing (mock)', async () => {
    const draft: ListingDraft = {
      title: 'Test',
      brand: 'Brand',
      model: 'Model',
      year: 2025,
      price: 10000,
      municipality: '',
      state: '',
      km: 0,
      description: '',
      trim: '',
      priceMin: 10000,
      priceMax: 10000,
    };
    const result = await component['supabaseService'].createListing(draft);
    expect(result[0]).toEqual(draft);
  });

  it('should get listings by status (mock)', async () => {
    const status = 'pending';
    const result = await component['supabaseService'].getListingsByStatus(
      status
    );
    expect(result[0].status).toBe(status);
  });

  it('should update listing status (mock)', async () => {
    const id = '1';
    const status = 'approved';
    const result = await component['supabaseService'].updateListingStatus(
      id,
      status
    );
    expect(result[0].status).toBe(status);
    expect(result[0]['id']).toBe(id);
  });

  it('should delete photo (mock)', async () => {
    await expectAsync(
      component['supabaseService'].deletePhoto('file.jpg')
    ).toBeResolved();
  });

  it('should upload photo (mock)', async () => {
    const url = await component['supabaseService'].uploadPhoto(
      new File([], 'file.jpg')
    );
    expect(url).toBe('https://mock-storage.example.com/photos/file.jpg');
  });
});
