import { describe, it, expect } from 'vitest';
import { RenderEffects } from '../../src/render/effects';

describe('RenderEffects', () => {
  it('addTracer + addPop legen Effekte mit Leben 1 an', () => {
    const fx = new RenderEffects();
    fx.addTracer(0, 0, 10, 10, '#fff');
    fx.addPop(5, 5, '#f00');
    expect(fx.tracers).toHaveLength(1);
    expect(fx.pops).toHaveLength(1);
    expect(fx.tracers[0].life).toBe(1);
  });
  it('tick altert Effekte und entfernt abgelaufene', () => {
    const fx = new RenderEffects();
    fx.addTracer(0, 0, 1, 1, '#fff');
    fx.tick(0.1); // life sinkt
    expect(fx.tracers[0].life).toBeLessThan(1);
    fx.tick(1); // weit über Lebenszeit
    expect(fx.tracers).toHaveLength(0);
  });
});
