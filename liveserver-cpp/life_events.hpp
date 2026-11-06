#pragma once
#include <cstddef>
#include <functional>
#include <map>
#include <string>
#include <vector>
namespace life {
class LifeEvents {
 public:
  using Handler=std::function<void(const std::string&)>;
  void subscribe(const std::string& resource,const std::string& event,Handler callback);
  void unsubscribeResource(const std::string& resource);
  // Only the trusted server calls publish. No external RPC exposure.
  std::size_t publish(const std::string& event,const std::string& payload);
  const std::vector<std::string>& errors() const { return errors_; }
 private:
  struct Subscription { std::string resource,event; Handler callback; };
  std::vector<Subscription> subscriptions_;
  std::vector<std::string> errors_;
};
}
