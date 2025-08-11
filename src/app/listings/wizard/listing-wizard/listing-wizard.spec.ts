import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListingWizard } from './listing-wizard';

describe('ListingWizard', () => {
  let component: ListingWizard;
  let fixture: ComponentFixture<ListingWizard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListingWizard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListingWizard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
