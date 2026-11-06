#include "resource_manager.hpp"
#include <algorithm>
#include <cctype>
#include <stdexcept>
#include <utility>
namespace life {
void ResourceManager::add(Resource resource) {
 if(resource.name.empty() || resource.name.size()>64) throw std::invalid_argument("name");
 for(unsigned char c:resource.name) if(!std::isalnum(c) && c!='_' && c!='-') throw std::invalid_argument("name");
 if(resources.count(resource.name)) throw std::invalid_argument("duplicate");
 resources.emplace(resource.name,std::move(resource));
}
void ResourceManager::walk(const std::string& name,std::set<std::string>& visiting,std::set<std::string>& done,std::vector<std::string>& result) const {
 if(done.count(name)) return;
 auto found=resources.find(name);
 if(found==resources.end()) throw std::invalid_argument("dependency missing: "+name);
 if(!visiting.insert(name).second) throw std::logic_error("dependency cycle");
 for(const auto& dep:found->second.dependencies) walk(dep,visiting,done,result);
 visiting.erase(name);done.insert(name);result.push_back(name);
}
std::vector<std::string> ResourceManager::order(const std::string& name) const {
 std::set<std::string> visiting,done;std::vector<std::string> result;
 walk(name,visiting,done,result);return result;
}
void ResourceManager::start(const std::string& name) {
 auto required=order(name);
 for(const auto& n:required)active.insert(n);
}
void ResourceManager::stop(const std::string& name) {
 if(!resources.count(name)) throw std::invalid_argument("resource missing");
 for(const auto& n:active) {
  if(n==name)continue;
  auto deps=order(n);
  if(std::find(deps.begin(),deps.end(),name)!=deps.end()) throw std::logic_error("resource in use");
 }
 active.erase(name);
}
bool ResourceManager::running(const std::string& name) const { return active.count(name)>0; }
std::vector<std::string> ResourceManager::names() const {
 std::vector<std::string> result;
 for(const auto& item: resources) result.push_back(item.first);
 return result;
}
}
