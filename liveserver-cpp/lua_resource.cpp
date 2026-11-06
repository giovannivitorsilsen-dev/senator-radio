#include "lua_resource.hpp"
#include "life_permissions.hpp"
#include <lua.hpp>
#include <cstdlib>
#include <new>
#include <stdexcept>
#include <utility>

namespace life {
namespace {
void removeGlobal(lua_State* L, const char* name) {
  lua_pushnil(L);
  lua_setglobal(L, name);
}
LuaResource* context(lua_State* L) {
  return static_cast<LuaResource*>(lua_touserdata(L, lua_upvalueindex(1)));
}
bool validEvent(const std::string& name) {
  if (name.empty() || name.size() > 80) return false;
  for (unsigned char c : name) {
    if (!(c >= 'a' && c <= 'z') && !(c >= 'A' && c <= 'Z') &&
        !(c >= '0' && c <= '9') && c != '.' && c != ':' && c != '_' && c != '-')
      return false;
  }
  return true;
}
}
void* LuaResource::allocate(void* userdata, void* ptr, std::size_t oldsize, std::size_t newsize) {
  auto* self = static_cast<LuaResource*>(userdata);
  if (!ptr) oldsize = 0;
  if (newsize == 0) {
    std::free(ptr);
    self->used_ -= oldsize;
    return nullptr;
  }
  if (newsize > oldsize && newsize - oldsize > self->memoryLimit_ - self->used_) return nullptr;
  void* next = std::realloc(ptr, newsize);
  if (next) self->used_ = self->used_ - oldsize + newsize;
  return next;
}
void LuaResource::budgetHook(lua_State* L, lua_Debug*) {
  LuaResource* self = *static_cast<LuaResource**>(lua_getextraspace(L));
  self->instructionsLeft_ -= 1000;
  if (self->instructionsLeft_ <= 0) luaL_error(L, "script instruction budget exceeded");
}
void LuaResource::callBudgetStart() {
  instructionsLeft_ = 100000;
  lua_sethook(state_, budgetHook, LUA_MASKCOUNT, 1000);
}
int LuaResource::registerEvent(lua_State* L) {
  auto* self = context(L);
  size_t length = 0;
  const char* name = luaL_checklstring(L, 1, &length);
  luaL_checktype(L, 2, LUA_TFUNCTION);
  std::string event(name, length);
  if (!validEvent(event)) return luaL_error(L, "invalid event name");
  lua_pushvalue(L, 2);
  int ref = luaL_ref(L, LUA_REGISTRYINDEX);
  auto found = self->eventRefs_.find(event);
  if (found != self->eventRefs_.end()) luaL_unref(L, LUA_REGISTRYINDEX, found->second);
  self->eventRefs_[event] = ref;
  return 0;
}
int LuaResource::logMessage(lua_State* L) {
  auto* self = context(L);
  size_t length = 0;
  const char* value = luaL_checklstring(L, 1, &length);
  if (self->logs_.size() < 128) self->logs_.emplace_back(value, length > 256 ? 256 : length);
  return 0;
}
int LuaResource::hasCapability(lua_State* L) {
  auto* self=context(L);
  size_t length=0;
  const char* raw=luaL_checklstring(L,1,&length);
  if(length>64){lua_pushboolean(L,0);return 1;}
  const std::string cap(raw,length);
  lua_pushboolean(L,self->permissions_ && self->permissions_->has(self->name_,cap));
  return 1;
}
int LuaResource::requestAction(lua_State* L) {
  auto* self=context(L);
  size_t actionLength=0,messageLength=0;
  const char* action=luaL_checklstring(L,1,&actionLength);
  const char* message=luaL_checklstring(L,2,&messageLength);
  if(actionLength>64 || messageLength>160){lua_pushboolean(L,0);return 1;}
  const std::string capability(action,actionLength);
  // Only demo notice logging is implemented. Staff/economy/vehicle APIs are absent.
  if(capability!="chat.notice" || !self->permissions_ ||
     !self->permissions_->has(self->name_,capability)){
    lua_pushboolean(L,0);return 1;
  }
  if(self->logs_.size()<128)self->logs_.emplace_back(message,messageLength);
  lua_pushboolean(L,1);return 1;
}
LuaResource::LuaResource(std::string name, const std::string& source, std::size_t memoryLimit,
                         const LifePermissions* permissions)
  : name_(std::move(name)), permissions_(permissions), memoryLimit_(memoryLimit) {
  if (memoryLimit_ < 64 * 1024) throw std::invalid_argument("memory limit too low");
  state_ = lua_newstate(allocate, this);
  if (!state_) throw std::runtime_error("cannot allocate Lua state");
  try {
    *static_cast<LuaResource**>(lua_getextraspace(state_)) = this;
    luaL_openlibs(state_);
    for (const char* name : {"io", "os", "debug", "package", "coroutine",
                              "require", "load", "loadfile", "dofile", "collectgarbage"})
      removeGlobal(state_, name);
    lua_pushlightuserdata(state_, this);
    lua_pushcclosure(state_, registerEvent, 1);
    lua_setglobal(state_, "RegisterEvent");
    lua_pushlightuserdata(state_, this);
    lua_pushcclosure(state_, logMessage, 1);
    lua_setglobal(state_, "Log");
    lua_pushlightuserdata(state_, this);
    lua_pushcclosure(state_, hasCapability, 1);
    lua_setglobal(state_, "HasCapability");
    lua_pushlightuserdata(state_, this);
    lua_pushcclosure(state_, requestAction, 1);
    lua_setglobal(state_, "RequestAction");
    executeSource(source);
  } catch (...) {
    lua_close(state_);
    state_ = nullptr;
    throw;
  }
}
LuaResource::~LuaResource() {
  if (state_) lua_close(state_);
}
void LuaResource::executeSource(const std::string& source) {
  callBudgetStart();
  if (luaL_loadbuffer(state_, source.data(), source.size(), name_.c_str()) != LUA_OK ||
      lua_pcall(state_, 0, 0, 0) != LUA_OK) {
    std::string error = lua_tostring(state_, -1) ? lua_tostring(state_, -1) : "unknown Lua error";
    lua_pop(state_, 1);
    throw std::runtime_error(name_ + ": " + error);
  }
}
void LuaResource::emit(const std::string& event, const std::string& payload) {
  auto found = eventRefs_.find(event);
  if (found == eventRefs_.end()) return;
  lua_rawgeti(state_, LUA_REGISTRYINDEX, found->second);
  lua_pushlstring(state_, payload.data(), payload.size());
  callBudgetStart();
  if (lua_pcall(state_, 1, 0, 0) != LUA_OK) {
    std::string error = lua_tostring(state_, -1) ? lua_tostring(state_, -1) : "unknown Lua error";
    lua_pop(state_, 1);
    throw std::runtime_error(name_ + ": " + error);
  }
}
}
