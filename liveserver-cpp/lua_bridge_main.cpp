#include "life_runtime.hpp"
#include <fstream>
#include <iostream>
#include <iterator>
#include <set>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

// LOCAL event/telemetry bridge, no admin commands.
// First argument is the original welcome Lua path. Additional operator-controlled
// specs: name:dependency1,dependency2=/absolute/trusted/script.lua
struct Spec {std::string name,file;std::vector<std::string> dependencies;};
static bool validName(const std::string& s){
 if(s.empty()||s.size()>64)return false;
 for(unsigned char c:s)if(!((c>='a'&&c<='z')||(c>='A'&&c<='Z')||
  (c>='0'&&c<='9')||c=='_'||c=='-'))return false;
 return true;
}
static bool safePlayerName(const std::string& s){
 if(s.empty()||s.size()>22)return false;
 for(unsigned char c:s)if(!((c>='a'&&c<='z')||(c>='A'&&c<='Z')||
   (c>='0'&&c<='9')||c==' '||c=='_'||c=='-'))return false;
 return true;
}
static Spec parse(const std::string& input){
 const auto equal=input.find('=');
 if(equal==std::string::npos||equal==0||equal+1>=input.size())
  throw std::invalid_argument("resource spec: name[:deps]=file");
 Spec result;
 const std::string label=input.substr(0,equal);
 result.file=input.substr(equal+1);
 const auto colon=label.find(':');
 result.name=label.substr(0,colon);
 if(!validName(result.name))throw std::invalid_argument("invalid resource name");
 if(colon!=std::string::npos){
  const std::string list=label.substr(colon+1);
  if(list.empty())throw std::invalid_argument("empty dependency");
  std::size_t start=0;
  for(;;){
   const auto comma=list.find(',',start);
   const std::string dep=list.substr(start,comma==std::string::npos?comma:comma-start);
   if(!validName(dep)||dep==result.name)throw std::invalid_argument("invalid dependency");
   result.dependencies.push_back(dep);
   if(comma==std::string::npos)break;
   start=comma+1;
  }
 }
 if(result.dependencies.size()>16)throw std::invalid_argument("too many dependencies");
 return result;
}
static std::string source(const std::string& filename){
 std::ifstream file(filename,std::ios::binary);
 if(!file)throw std::runtime_error("resource file unavailable");
 std::string data((std::istreambuf_iterator<char>(file)),std::istreambuf_iterator<char>());
 if(data.size()>1024*1024)throw std::runtime_error("resource script too large");
 return data;
}
static void report(const life::LifeRuntime& runtime,const std::vector<Spec>& specs){
 for(const auto& spec:specs){
  std::cout<<"RESOURCE "<<spec.name<<" "<<(runtime.running(spec.name)?"STARTED":"STOPPED");
  if(!spec.dependencies.empty()){
   std::cout<<" ";
   for(std::size_t i=0;i<spec.dependencies.size();++i){
    if(i)std::cout<<",";
    std::cout<<spec.dependencies[i];
   }
  }
  std::cout<<"\n";
 }
 std::cout<<std::flush;
}
int main(int argc,char** argv){
 if(argc<2||argc>17){std::cerr<<"Usage: lifeserver-lua-bridge welcome.lua [name:deps=file.lua ...]\n";return 2;}
 try{
  std::vector<Spec> specs{{"welcome",argv[1],{}}};
  std::set<std::string> names{"welcome"};
  for(int i=2;i<argc;++i){
   Spec item=parse(argv[i]);
   if(!names.insert(item.name).second)throw std::invalid_argument("duplicate resource");
   specs.push_back(std::move(item));
  }
  life::LifeRuntime runtime;
  for(const auto& spec:specs)runtime.add(spec.name,spec.dependencies,source(spec.file),{"rp:hello"});
  // Each resource starts with its dependencies; no artificial 'running' status on failure.
  for(const auto& spec:specs)runtime.start(spec.name);
  report(runtime,specs);
  std::string line;
  while(std::getline(std::cin,line)){
   if(line=="PING"){std::cout<<"PONG\n";report(runtime,specs);continue;}
   if(line.size()<7||line.size()>28||line.compare(0,6,"HELLO ")!=0)continue;
   const std::string player=line.substr(6);
   if(!safePlayerName(player))continue;
   runtime.publish("rp:hello",player);
   if(!runtime.errors().empty())std::cout<<"ERROR runtime callback\n";
   std::cout<<"EVENT_OK\n"<<std::flush;
  }
  // Stop consumers before dependencies even when manifest entries were unordered.
  for(std::size_t pass=0;pass<specs.size();++pass){
   bool progressed=false;
   for(const auto& spec:specs){
    if(!runtime.running(spec.name))continue;
    try {runtime.stop(spec.name);progressed=true;}
    catch(const std::exception&) {}
   }
   if(!progressed)break;
  }
  report(runtime,specs);
 }catch(const std::exception&){
  std::cout<<"ERROR runtime startup\n"<<std::flush;
  std::cerr<<"LifeLua resources unavailable\n";
  return 1;
 }
}
