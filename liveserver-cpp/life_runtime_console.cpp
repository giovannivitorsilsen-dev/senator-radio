#include "life_runtime_console.hpp"
#include <sstream>
#include <stdexcept>
namespace life {
std::string LifeRuntimeConsole::execute(const std::string& command) {
  if(command.size()>4096)return "ERR command too long";
  std::istringstream input(command);
  std::string action,name,extra;
  if(!(input>>action))return "ERR empty command";
  if(action=="help")return "help | list | start NAME | ensure NAME | stop NAME | restart NAME | status NAME | logs NAME | emit EVENT PAYLOAD";
  if(action=="list"){
    if(input>>extra)return "ERR unexpected argument";
    std::ostringstream out;
    for(const auto& resource:runtime_.names())
      out<<resource<<" "<<(runtime_.running(resource)?"started":"stopped")<<"\n";
    return out.str();
  }
  if(!(input>>name))return "ERR missing argument";
  try {
    if(action=="emit"){
      std::string payload;
      std::getline(input,payload);
      if(!payload.empty()&&payload[0]==' ')payload.erase(0,1);
      return "OK delivered "+std::to_string(runtime_.publish(name,payload));
    }
    if(input>>extra)return "ERR unexpected argument";
    if(action=="status"){
      if(runtime_.names().end()==std::find(runtime_.names().begin(),runtime_.names().end(),name))
        return "ERR unknown resource";
      return runtime_.running(name)?"started":"stopped";
    }
    if(action=="start"){
      if(runtime_.running(name))return "ERR already started";
      runtime_.start(name);return "OK started";
    }
    if(action=="ensure"){runtime_.start(name);return "OK ensured";}
    if(action=="stop"){runtime_.stop(name);return "OK stopped";}
    if(action=="restart"){runtime_.restart(name);return "OK restarted";}
    if(action=="logs"){
      std::ostringstream out;
      for(const auto& line:runtime_.logs(name))out<<line<<"\n";
      return out.str();
    }
    return "ERR unknown command";
  }catch(const std::exception& e){return std::string("ERR ")+e.what();}
}
}
