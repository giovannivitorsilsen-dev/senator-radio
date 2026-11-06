#pragma once
#include "life_events.hpp"
#include "lua_host.hpp"
#include <map>
#include <set>
#include <string>
#include <vector>

namespace life {
// Local, trusted operator runtime: console -> resources -> Lua callbacks.
// No public HTTP/RPC access, no client-supplied administrative commands.
class LifeRuntime {
public:
  void add(const std::string& name, std::vector<std::string> dependencies,
           std::string source, std::vector<std::string> eventNames,
           std::vector<std::string> capabilities = {});
  void start(const std::string& name);
  void stop(const std::string& name);
  void restart(const std::string& name);
  bool running(const std::string& name) const;
  std::vector<std::string> names() const;
  const std::vector<std::string>& logs(const std::string& name) const;
  std::size_t publish(const std::string& event, const std::string& payload);
  const std::vector<std::string>& errors() const { return events_.errors(); }
private:
  LuaHost host_;
  LifeEvents events_;
  std::map<std::string,std::vector<std::string>> subscriptions_;
  std::set<std::string> registered_;
};
}
