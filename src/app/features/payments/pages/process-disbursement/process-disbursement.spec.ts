import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessDisbursement } from './process-disbursement';

describe('ProcessDisbursement', () => {
  let component: ProcessDisbursement;
  let fixture: ComponentFixture<ProcessDisbursement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProcessDisbursement],
    }).compileComponents();

    fixture = TestBed.createComponent(ProcessDisbursement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
