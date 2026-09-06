import { describe, it, expect } from 'vitest';
import { roleHome, ROLE_ROUTES, ROLE_LABELS } from '../role-routes';

describe('roleHome', () => {
  it('maps each known role to its own dashboard home', () => {
    expect(roleHome('admin')).toBe('/admin');
    expect(roleHome('staff')).toBe('/admin');
    expect(roleHome('teacher')).toBe('/teacher');
    expect(roleHome('student')).toBe('/student');
    expect(roleHome('parent')).toBe('/parent');
    expect(roleHome('accountant')).toBe('/accountant');
    expect(roleHome('superadmin')).toBe('/superadmin');
  });

  it('falls back to /admin for an unrecognized role rather than crashing or looping', () => {
    expect(roleHome('something-unexpected')).toBe('/admin');
  });

  it('has a label for every role that has a route', () => {
    for (const role of Object.keys(ROLE_ROUTES)) {
      expect(ROLE_LABELS[role]).toBeTruthy();
    }
  });
});
