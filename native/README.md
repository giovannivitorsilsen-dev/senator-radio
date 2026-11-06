# C + C++ native movement prototype
`life_motion.h` is a C-compatible ABI header, usable by C and C++.
```sh
cc -c -std=c11 src/life_motion.c -o motion.o
c++ -std=c++17 examples/main.cpp motion.o -lm -o motion_test
./motion_test
```
This is a standalone mathematical proof-of-concept, **not** an integrated Unity or Android client, physics engine, anticheat or multiplayer simulation.
