#pragma once
#include "resource_manager.hpp"
#include "lua_resource.hpp"
#include <map>
#include <memory>
#include <string>
#include <vector>

namespace life {
class LuaHost {
public:
  void add(const std::string& name, std::vector<std::string> dependencies, std::string source);
  std::vector<std::string> order(const std::string& name) const;
  void start(const std::string& name);
  void stop(const std::string& name);
  void restart(const std::string& name);
  void emit(const std::string& event, const std::string& payload);
  void emitTo(const std::string& resource, const std::string& event, const std::string& payload);
  bool running(const std::string& name) const;
  const std::vector<std::string>& logs(const std::string& name) const;
private:
  ResourceManager manager_;
  std::map<std::string, std::string> scripts_;
  std::map<std::string, std::unique_ptr<LuaResource>> active_;
};
}
