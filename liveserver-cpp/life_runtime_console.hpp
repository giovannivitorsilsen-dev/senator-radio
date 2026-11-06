#pragma once
#include "life_runtime.hpp"
#include <string>
namespace life {
class LifeRuntimeConsole {
public:
  explicit LifeRuntimeConsole(LifeRuntime& runtime):runtime_(runtime) {}
  std::string execute(const std::string& command);
private:
  LifeRuntime& runtime_;
};
}
