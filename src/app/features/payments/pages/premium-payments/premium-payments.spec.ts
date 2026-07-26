import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PremiumPayments } from './premium-payments';

describe('PremiumPayments', () => {
  let component: PremiumPayments;
  let fixture: ComponentFixture<PremiumPayments>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PremiumPayments],
    }).compileComponents();

    fixture = TestBed.createComponent(PremiumPayments);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
