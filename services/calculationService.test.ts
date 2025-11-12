// This is a mock test file. In a real environment, you would use a test runner like Jest.
// To make TypeScript happy without a full test setup, we declare a mock jest object.
declare var describe: any;
declare var it: any;
declare var expect: any;
declare var beforeAll: any;
declare var afterAll: any;
declare var jest: any;

import { calculateBilletWeight } from './calculationService';
import type { BilletShapeParameters } from '../types';

// Mock console.error to prevent logs during tests
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  (console.error as any).mockRestore();
});


describe('calculateBilletWeight', () => {
  const density = 2.7; // g/cm³, typical for Aluminum

  it('should return 0 for invalid inputs', () => {
    expect(calculateBilletWeight('Block', {}, 0)).toBe(0);
    expect(calculateBilletWeight('Block', { length: -100, width: 50, height: 20 }, density)).toBe(0);
    expect(calculateBilletWeight('Tube', { outerDiameter: 50, innerDiameter: 60, height: 100 }, density)).toBe(0); // Inner > Outer
    expect(calculateBilletWeight('Rectangle Tube', { outerWidth: 50, outerHeight: 50, length: 100, wallThickness: 30 }, density)).toBe(0); // Wall thickness too large
  });

  it('should calculate weight for a Block correctly', () => {
    const params: BilletShapeParameters = { length: 100, width: 50, height: 20 }; // mm
    // Volume = 10cm * 5cm * 2cm = 100 cm³
    // Weight = 100cm³ * 2.7 g/cm³ = 270 g = 0.27 kg
    const expectedWeight = 0.27;
    expect(calculateBilletWeight('Block', params, density)).toBe(expectedWeight);
  });

  it('should calculate weight for a Cylinder correctly', () => {
    const params: BilletShapeParameters = { diameter: 50, height: 100 }; // mm
    // Radius = 2.5cm, Height = 10cm
    // Volume = PI * (2.5^2) * 10 = 196.3495 cm³
    // Weight = 196.3495 cm³ * 2.7 g/cm³ = 530.143 g = 0.5301 kg
    const expectedWeight = 0.5301;
    expect(calculateBilletWeight('Cylinder', params, density)).toBeCloseTo(expectedWeight, 4);
  });

  it('should calculate weight for a Tube correctly', () => {
    const params: BilletShapeParameters = { outerDiameter: 50, innerDiameter: 40, height: 100 }; // mm
    // Outer Radius (R) = 2.5cm, Inner Radius (r) = 2.0cm, Height = 10cm
    // Volume = PI * (R^2 - r^2) * h = PI * (6.25 - 4) * 10 = 70.6858 cm³
    // Weight = 70.6858 cm³ * 2.7 g/cm³ = 190.851 g = 0.1909 kg
    const expectedWeight = 0.1909;
    expect(calculateBilletWeight('Tube', params, density)).toBeCloseTo(expectedWeight, 4);
  });
  
  it('should calculate weight for a Cube correctly', () => {
    const params: BilletShapeParameters = { side: 50 }; // mm
    // Side = 5cm
    // Volume = 5 * 5 * 5 = 125 cm³
    // Weight = 125 cm³ * 2.7 g/cm³ = 337.5 g = 0.3375 kg
    const expectedWeight = 0.3375;
    expect(calculateBilletWeight('Cube', params, density)).toBeCloseTo(expectedWeight, 4);
  });

  it('should calculate weight for a Rectangle Tube correctly', () => {
    const params: BilletShapeParameters = { outerWidth: 60, outerHeight: 40, length: 100, wallThickness: 5 }; // mm
    // Outer L=6cm, W=4cm, h=10cm, t=0.5cm
    // Inner L = 6 - 2*0.5 = 5cm
    // Inner W = 4 - 2*0.5 = 3cm
    // Volume = (OuterArea - InnerArea) * h = (6*4 - 5*3) * 10 = (24 - 15) * 10 = 90 cm³
    // Weight = 90 cm³ * 2.7 g/cm³ = 243 g = 0.243 kg
    const expectedWeight = 0.243;
    expect(calculateBilletWeight('Rectangle Tube', params, density)).toBeCloseTo(expectedWeight, 4);
  });
});

// Helper to allow toBeCloseTo in a non-Jest environment
if (typeof expect !== 'undefined') {
    expect.extend({
        toBeCloseTo(received: number, expected: number, precision = 2) {
            const pass = Math.abs(expected - received) < (Math.pow(10, -precision) / 2);
            if (pass) {
                return {
                    message: () => `expected ${received} not to be close to ${expected}`,
                    pass: true,
                };
            } else {
                return {
                    message: () => `expected ${received} to be close to ${expected}`,
                    pass: false,
                };
            }
        },
    });
}