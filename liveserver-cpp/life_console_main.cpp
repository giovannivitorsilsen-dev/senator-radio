#include "life_console.hpp"
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

// LOCAL maintenance utility: resources are explicitly listed by the server operator.
// No network listener, no OS command execution, no Lua installation.
int main(int argc, char** argv) {
  life::ResourceManager resources;
  try {
    for(int i=1;i<argc;i++) {
      std::string item=argv[i], name=item;
      std::vector<std::string> deps;
      auto colon=item.find(':');
      if(colon!=std::string::npos) {
        name=item.substr(0,colon);
        std::istringstream in(item.substr(colon+1));
        std::string dep;
        while(std::getline(in,dep,',')) if(!dep.empty()) deps.push_back(dep);
      }
      resources.add({name,deps});
    }
    life::LifeConsole console(resources);
    std::cout<<"LifeServer local console prototype. Type help or quit.\n";
    std::string line;
    while(std::getline(std::cin,line)) {
      if(line=="quit" || line=="exit") break;
      std::cout<<console.execute(line)<<std::endl;
    }
    return 0;
  } catch(const std::exception& e) {
    std::cerr<<"Configuration error: "<<e.what()<<"\n";
    return 1;
  }
}
