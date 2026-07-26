import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Assessments } from './assessments';

describe('Assessments', () => {
  let component: Assessments;
  let fixture: ComponentFixture<Assessments>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Assessments],
    }).compileComponents();

    fixture = TestBed.createComponent(Assessments);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
