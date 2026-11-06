#include "lua_host.hpp"
#include <stdexcept>
#include <utility>

namespace life {
void LuaHost::add(const std::string& name, std::vector<std::string> dependencies, std::string source) {
  manager_.add({name, std::move(dependencies)});
  scripts_[name] = std::move(source);
}
void LuaHost::start(const std::string& name) {
  const auto order = manager_.order(name);
  // Construct every missing resource first. Errors leave the manager unchanged.
  std::map<std::string, std::unique_ptr<LuaResource>> staged;
  for (const auto& dependency : order) {
    if (!active_.count(dependency)) staged.emplace(
        dependency, std::make_unique<LuaResource>(dependency, scripts_.at(dependency)));
  }
  manager_.start(name);
  for (auto& entry : staged) active_.emplace(entry.first, std::move(entry.second));
}
void LuaHost::stop(const std::string& name) {
  manager_.stop(name);
  active_.erase(name);
}
void LuaHost::restart(const std::string& name) {
  if (running(name)) stop(name);
  start(name);
}
void LuaHost::emit(const std::string& event, const std::string& payload) {
  for (auto& [name, script] : active_) script->emit(event, payload);
}
bool LuaHost::running(const std::string& name) const { return manager_.running(name); }
const std::vector<std::string>& LuaHost::logs(const std::string& name) const {
  return active_.at(name)->logs();
}
}
