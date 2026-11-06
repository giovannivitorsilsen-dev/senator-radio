#pragma once
#include <cstddef>
#include <map>
#include <memory>
#include <string>
#include <vector>

struct lua_State;

namespace life {
class LuaResource {
public:
  LuaResource(std::string name, const std::string& source, std::size_t memoryLimit = 4 * 1024 * 1024);
  ~LuaResource();
  LuaResource(const LuaResource&) = delete;
  LuaResource& operator=(const LuaResource&) = delete;
  void emit(const std::string& event, const std::string& payload);
  const std::vector<std::string>& logs() const { return logs_; }
  const std::string& name() const { return name_; }
private:
  std::string name_;
  lua_State* state_ = nullptr;
  std::size_t used_ = 0, memoryLimit_;
  int instructionsLeft_ = 0;
  std::map<std::string, int> eventRefs_;
  std::vector<std::string> logs_;
  static void* allocate(void* userdata, void* ptr, std::size_t oldsize, std::size_t newsize);
  static void budgetHook(lua_State* L, void* debugUnused);
  static int registerEvent(lua_State* L);
  static int logMessage(lua_State* L);
  void callBudgetStart();
  void executeSource(const std::string& source);
};
}
