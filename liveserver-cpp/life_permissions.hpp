#pragma once
#include <map>
#include <set>
#include <string>
#include <vector>
namespace life {
// Fail-closed permissions for trusted, locally provisioned Lua resources.
// This is NOT a user/role or billing authorization system.
class LifePermissions {
public:
  static bool validCapability(const std::string& capability);
  void registerResource(const std::string& resource,
                        const std::vector<std::string>& grants);
  bool has(const std::string& resource, const std::string& capability) const;
  void revoke(const std::string& resource);
private:
  std::map<std::string, std::set<std::string>> grants_;
};
}
