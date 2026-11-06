#include "life_console.hpp"
#include <sstream>
#include <stdexcept>
namespace life {
std::string LifeConsole::execute(const std::string& command) {
 if(command.size()>256) return "ERR command too long";
 std::istringstream in(command);
 std::string action, name, extra;
 in >> action;
 if(action.empty()) return "ERR empty command";
 if(action=="help") { if(in >> extra) return "ERR unexpected arguments"; return "help | list | start NAME | ensure NAME | stop NAME | restart NAME | status NAME"; }
 if(action=="list") {
  if(in >> extra) return "ERR unexpected arguments";
  std::ostringstream out;
  for (const auto& n:manager_.names()) out << n << " " << (manager_.running(n)?"started":"stopped") << "\n";
  return out.str();
 }
 if(!(in >> name) || (in >> extra)) return "ERR expected one resource name";
 try {
  if(action=="status") { manager_.order(name); return manager_.running(name) ? "started" : "stopped"; }
  if(action=="start") {
   if(manager_.running(name)) return "ERR already started";
   manager_.start(name);
   return "OK started";
  }
  if(action=="ensure") { manager_.start(name); return "OK ensured"; }
  if(action=="stop") { manager_.stop(name); return "OK stopped"; }
  if(action=="restart") {
   // Cannot restart an actively depended-upon resource.
   if(manager_.running(name)) manager_.stop(name);
   manager_.start(name);
   return "OK restarted";
  }
  return "ERR unknown command";
 } catch(const std::exception& e) {
  return std::string("ERR ") + e.what();
 }
}
}
