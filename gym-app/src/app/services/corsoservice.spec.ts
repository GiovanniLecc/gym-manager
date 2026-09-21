import { TestBed } from '@angular/core/testing';

import { Corsoservice } from './corsoservice';

describe('Corsoservice', () => {
  let service: Corsoservice;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Corsoservice);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
