#include "life_runtime.hpp"
#include <stdexcept>
#include <utility>

namespace life {
namespace {
bool eventNameOk(const std::string& name) {
  if(name.empty() || name.size()>80) return false;
  for(unsigned char c:name) {
    if(!((c>='a'&&c<='z')||(c>='A'&&c<='Z')||(c>='0'&&c<='9')||c=='_'||c=='-'||c=='.'||c==':'))
      return false;
  }
  return true;
}
}
void LifeRuntime::add(const std::string& name, std::vector<std::string> dependencies,
                      std::string source, std::vector<std::string> eventNames) {
  for(const auto& event:eventNames) if(!eventNameOk(event))
    throw std::invalid_argument("invalid event registration");
  // The LuaHost validates the resource name and dependency graph.
  host_.add(name,std::move(dependencies),std::move(source));
  subscriptions_[name]=std::move(eventNames);
}
void LifeRuntime::start(const std::string& name) {
  const auto order=host_.order(name);
  host_.start(name); // Lua loading occurs before registering any event callbacks.
  for(const auto& resource:order) {
    if(!registered_.insert(resource).second) continue;
    for(const auto& event:subscriptions_.at(resource)) {
      events_.subscribe(resource,event,[this,resource,event](const std::string& payload) {
        host_.emitTo(resource,event,payload);
      });
    }
  }
}
void LifeRuntime::stop(const std::string& name) {
  host_.stop(name); // Refuses if another running resource depends on this one.
  events_.unsubscribeResource(name);
  registered_.erase(name);
}
void LifeRuntime::restart(const std::string& name) {
  if(running(name)) stop(name);
  start(name);
}
bool LifeRuntime::running(const std::string& name) const { return host_.running(name); }
std::vector<std::string> LifeRuntime::names() const {
  std::vector<std::string> result;
  for(const auto& item:subscriptions_)result.push_back(item.first);
  return result;
}
const std::vector<std::string>& LifeRuntime::logs(const std::string& name) const {return host_.logs(name);}
std::size_t LifeRuntime::publish(const std::string& event,const std::string& payload) {
  return events_.publish(event,payload);
}
}
