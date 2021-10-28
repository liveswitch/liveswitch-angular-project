import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiveswitchComponent } from './liveswitch.component';

describe('LiveswitchComponent', () => {
  let component: LiveswitchComponent;
  let fixture: ComponentFixture<LiveswitchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LiveswitchComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LiveswitchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
