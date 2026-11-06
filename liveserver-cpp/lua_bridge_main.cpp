#include "life_runtime.hpp"
#include <fstream>
#include <iostream>
#include <iterator>
#include <stdexcept>
#include <string>
#include <utility>

// Dedicated local game-event bridge, NOT the administrative LifeConsole.
// Reads only HELLO <safe player display name> from inherited stdin.
// Never listens on a network port and never accepts resource/OS commands.
static bool safeName(const std::string& s) {
  if(s.empty() || s.size()>22)return false;
  for(unsigned char c:s) {
    if(!((c>='a'&&c<='z')||(c>='A'&&c<='Z')||
         (c>='0'&&c<='9')||c==' '||c=='_'||c=='-'))return false;
  }
  return true;
}
int main(int argc,char** argv) {
  if(argc!=2){std::cerr<<"Usage: lifeserver-lua-bridge trusted.lua\n";return 2;}
  try {
    std::ifstream in(argv[1],std::ios::binary);
    if(!in)throw std::runtime_error("missing local Lua resource");
    std::string script((std::istreambuf_iterator<char>(in)),std::istreambuf_iterator<char>());
    if(script.size()>1024*1024)throw std::runtime_error("resource exceeds size limit");
    life::LifeRuntime runtime;
    runtime.add("welcome",{},std::move(script),{"rp:hello"});
    runtime.start("welcome");
    std::cout<<"RESOURCE welcome "<<(runtime.running("welcome")?"STARTED":"STOPPED")<<"\\n"<<std::flush;
    std::string line;
    while(std::getline(std::cin,line)) {
      if(line=="PING") {
        std::cout<<"PONG\\n";
        std::cout<<"RESOURCE welcome "<<(runtime.running("welcome")?"STARTED":"STOPPED")<<"\\n"<<std::flush;
        continue;
      }
      if(line.size()<7 || line.size()>28 || line.compare(0,6,"HELLO ")!=0) continue;
      const std::string name=line.substr(6);
      if(!safeName(name))continue;
      runtime.publish("rp:hello",name);
      // Log a non-sensitive success marker for local operator debugging.
      std::cout<<"EVENT_OK\n"<<std::flush;
    }
    runtime.stop("welcome");
    std::cout<<"RESOURCE welcome STOPPED\\n"<<std::flush;
  } catch(const std::exception& error) {
    std::cerr<<"Lua bridge error: "<<error.what()<<"\n";
    return 1;
  }
}
