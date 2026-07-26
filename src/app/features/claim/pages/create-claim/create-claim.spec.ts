import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateClaim } from './create-claim';

describe('CreateClaim', () => {
  let component: CreateClaim;
  let fixture: ComponentFixture<CreateClaim>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateClaim],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateClaim);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
