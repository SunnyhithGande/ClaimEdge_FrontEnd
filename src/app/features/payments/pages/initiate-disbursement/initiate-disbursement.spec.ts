import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InitiateDisbursement } from './initiate-disbursement';

describe('InitiateDisbursement', () => {
  let component: InitiateDisbursement;
  let fixture: ComponentFixture<InitiateDisbursement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InitiateDisbursement],
    }).compileComponents();

    fixture = TestBed.createComponent(InitiateDisbursement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
