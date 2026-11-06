#pragma once
#include "resource_manager.hpp"
#include <string>
namespace life {
class LifeConsole {
 public:
  explicit LifeConsole(ResourceManager& manager) : manager_(manager) {}
  std::string execute(const std::string& command);
 private:
  ResourceManager& manager_;
};
}
