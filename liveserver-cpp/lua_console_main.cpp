#include "life_runtime_console.hpp"
#include <fstream>
#include <iostream>
#include <iterator>
#include <stdexcept>
#include <string>
#include <vector>

int main(int argc,char** argv){
 try {
  if(argc<2){
   std::cerr<<"Usage: lifeserver-lua-console FILE.lua [FILE.lua...] (local trusted scripts only)\n";
   return 2;
  }
  life::LifeRuntime runtime;
  for(int i=1;i<argc;i++){
   std::string filePath=argv[i];
   std::ifstream stream(filePath, std::ios::binary);
   if(!stream)throw std::runtime_error("cannot read "+filePath);
   std::string script((std::istreambuf_iterator<char>(stream)),std::istreambuf_iterator<char>());
   if(script.size()>1024*1024)throw std::runtime_error("script too large");
   auto slash=filePath.find_last_of("/\\");
   std::string name=filePath.substr(slash==std::string::npos?0:slash+1);
   if(name.size()>4 && name.substr(name.size()-4)==".lua")name.resize(name.size()-4);
   // Event list is a trusted operator declaration, not inferred from untrusted script.
   runtime.add(name,{},std::move(script),{"rp:hello"});
  }
  life::LifeRuntimeConsole console(runtime);
  std::cout<<"LOCAL ONLY: LifeServer Lua console. Type help, ensure NAME, emit rp:hello VALUE, quit.\n";
  std::string line;
  while(std::getline(std::cin,line)){
   if(line=="quit"||line=="exit")break;
   std::cout<<console.execute(line)<<std::endl;
  }
 }catch(const std::exception& e){std::cerr<<"fatal: "<<e.what()<<"\n";return 1;}
 return 0;
}
