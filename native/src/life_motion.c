#include "../include/life_motion.h"
#include <math.h>
LifeMotion life_step(LifeMotion s, float dt, float limit) {
    if (!isfinite(dt) || dt <= 0.f || dt > .1f) return s;
    if (!isfinite(limit) || limit < 0.f) return s;
    if (!isfinite(s.x) || !isfinite(s.z) || !isfinite(s.vx) || !isfinite(s.vz)) return s;
    float speed = sqrtf(s.vx*s.vx+s.vz*s.vz);
    if (speed > limit && speed > 0.f) { s.vx *= limit/speed; s.vz *= limit/speed; }
    s.x += s.vx*dt; s.z += s.vz*dt;
    return s;
}
