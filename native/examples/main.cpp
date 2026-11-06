#include "../include/life_motion.h"
#include <iostream>
int main() {
    LifeMotion player{0.f, 0.f, 5.f, 0.f};
    auto step = life_step(player, 0.1f, 4.f);
    if (step.x < 0.399f || step.x > 0.401f) return 1;
    std::cout << "Native C/C++ movement ABI PASS\n";
    return 0;
}
