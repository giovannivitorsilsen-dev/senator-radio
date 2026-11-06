#include "life_permissions.hpp"
#include <stdexcept>
#include <utility>
namespace life {
bool LifePermissions::validCapability(const std::string& cap) {
  if (cap.empty() || cap.size()>64) return false;
  bool hasDot=false;
  for(unsigned char c:cap) {
    if(c=='.'){hasDot=true;continue;}
    if(!((c>='a'&&c<='z')||(c>='0'&&c<='9')||c=='_'))return false;
  }
  return hasDot && cap.front()!='.' && cap.back()!='.' &&
         cap.find("..")==std::string::npos;
}
void LifePermissions::registerResource(const std::string& resource,
                                        const std::vector<std::string>& grants) {
  if(resource.empty()||resource.size()>64)throw std::invalid_argument("resource");
  if(grants_.count(resource))throw std::invalid_argument("resource already registered");
  if(grants.size()>32)throw std::invalid_argument("too many capability grants");
  std::set<std::string> allowed;
  for(const auto& cap:grants) {
    if(!validCapability(cap))throw std::invalid_argument("invalid capability");
    if(!allowed.insert(cap).second)throw std::invalid_argument("duplicate capability");
  }
  grants_.emplace(resource,std::move(allowed));
}
bool LifePermissions::has(const std::string& resource,const std::string& cap) const {
  if(!validCapability(cap))return false;
  auto it=grants_.find(resource);
  return it!=grants_.end()&&it->second.count(cap)>0;
}
void LifePermissions::revoke(const std::string& resource) { grants_.erase(resource); }
}
