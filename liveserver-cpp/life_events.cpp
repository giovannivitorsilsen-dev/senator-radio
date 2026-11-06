#include "life_events.hpp"
#include <algorithm>
#include <stdexcept>
#include <utility>
namespace life {
namespace {
bool valid(const std::string& name) {
 if(name.empty() || name.size()>80) return false;
 for(unsigned char c:name) {
  if(!((c>='a'&&c<='z')||(c>='A'&&c<='Z')||(c>='0'&&c<='9')||c=='_'||c=='-'||c=='.'||c==':'))return false;
 }
 return true;
}
}
void LifeEvents::subscribe(const std::string& resource,const std::string& event,Handler callback) {
 if(!valid(resource)||!valid(event)||!callback)throw std::invalid_argument("invalid event subscription");
 if(subscriptions_.size()>=1024)throw std::length_error("too many subscriptions");
 subscriptions_.push_back({resource,event,std::move(callback)});
}
void LifeEvents::unsubscribeResource(const std::string& resource) {
 subscriptions_.erase(std::remove_if(subscriptions_.begin(),subscriptions_.end(),
 [&](const Subscription& s){return s.resource==resource;}),subscriptions_.end());
}
std::size_t LifeEvents::publish(const std::string& event,const std::string& payload) {
 if(!valid(event)||payload.size()>4096)throw std::invalid_argument("invalid event payload");
 std::size_t delivered=0;
 // Execute from a snapshot: callbacks may subscribe/unsubscribe without invalidating iteration.
 const auto snapshot=subscriptions_;
 for(const auto& s:snapshot) {
  if(s.event!=event)continue;
  try { s.callback(payload); ++delivered; }
  catch(const std::exception& e) {
   if(errors_.size()<128)errors_.push_back(s.resource+": "+e.what());
  } catch(...) { if(errors_.size()<128)errors_.push_back(s.resource+": unknown event failure"); }
 }
 return delivered;
}
}
