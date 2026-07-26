import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CollectPremium } from './collect-premium';

describe('CollectPremium', () => {
  let component: CollectPremium;
  let fixture: ComponentFixture<CollectPremium>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectPremium],
    }).compileComponents();

    fixture = TestBed.createComponent(CollectPremium);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
