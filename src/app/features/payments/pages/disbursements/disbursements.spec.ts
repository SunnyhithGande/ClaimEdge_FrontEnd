import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Disbursements } from './disbursements';

describe('Disbursements', () => {
  let component: Disbursements;
  let fixture: ComponentFixture<Disbursements>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Disbursements],
    }).compileComponents();

    fixture = TestBed.createComponent(Disbursements);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
