#ifndef LIFE_MOTION_H
#define LIFE_MOTION_H
#ifdef __cplusplus
extern "C" {
#endif
typedef struct { float x, z, vx, vz; } LifeMotion;
LifeMotion life_step(LifeMotion state, float delta_seconds, float max_speed);
#ifdef __cplusplus
}
#endif
#endif
