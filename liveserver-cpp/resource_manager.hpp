#pragma once
#include <map>
#include <set>
#include <string>
#include <vector>
namespace life {
struct Resource { std::string name; std::vector<std::string> dependencies; };
class ResourceManager {
 public:
 void add(Resource resource);
 void start(const std::string& name);
 void stop(const std::string& name);
 bool running(const std::string& name) const;
 std::vector<std::string> names() const;
 std::vector<std::string> order(const std::string& name) const;
 private:
 std::map<std::string,Resource> resources;
 std::set<std::string> active;
 void walk(const std::string&,std::set<std::string>&,std::set<std::string>&,std::vector<std::string>&) const;
};
}
