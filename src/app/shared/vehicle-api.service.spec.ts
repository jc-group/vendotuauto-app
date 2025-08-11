import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { VehicleApiService } from './vehicle-api.service';

describe('VehicleApiService', () => {
  let service: VehicleApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [VehicleApiService],
    });
    service = TestBed.inject(VehicleApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getMakes should return Observable', () => {
    spyOn(service['http'], 'get').and.returnValue(of({ Results: [{ Make_ID: 1, Make_Name: 'Nissan' }] }));
    service.getMakes().subscribe((makes) => {
      expect(makes).toContain('Nissan');
    });
  });

  it('getModelsForMake should return Observable', () => {
    spyOn(service['http'], 'get').and.returnValue(of({ Results: [{ Model_ID: 1, Model_Name: 'Versa', Make_ID: 1, Make_Name: 'Nissan' }] }));
    service.getModelsForMake('Nissan').subscribe((models) => {
      expect(models).toContain('Versa');
    });
  });
});
