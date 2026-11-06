#include "life_console.hpp"
#include "life_events.hpp"
#include <cassert>
#include <stdexcept>
#include <string>
int main() {
 life::ResourceManager resources;
 resources.add({"core",{}});
 resources.add({"jobs",{"core"}});
 resources.add({"taxi",{"jobs"}});
 life::LifeConsole console(resources);
 assert(console.execute("ensure taxi")=="OK ensured");
 assert(console.execute("ensure taxi")=="OK ensured");
 assert(console.execute("status core")=="started");
 assert(console.execute("stop core").rfind("ERR",0)==0);
 assert(console.execute("restart taxi")=="OK restarted");
 assert(console.execute("list").find("taxi started")!=std::string::npos);
 assert(console.execute("status taxi junk").rfind("ERR",0)==0);
 assert(console.execute("shell rm -rf").rfind("ERR",0)==0);
 assert(console.execute(std::string(257,'a')).rfind("ERR",0)==0);
 assert(console.execute("stop taxi")=="OK stopped");
 assert(console.execute("stop jobs")=="OK stopped");
 assert(console.execute("stop core")=="OK stopped");
 life::LifeEvents events;
 int good=0;
 events.subscribe("one","player:joined",[&](const std::string& s){if(s=="A")good++;});
 events.subscribe("broken","player:joined",[](const std::string&){throw std::runtime_error("failure");});
 events.subscribe("two","player:joined",[&](const std::string& s){if(s=="A")good++;});
 assert(events.publish("player:joined","A")==2);
 assert(good==2);
 assert(events.errors().size()==1);
 events.unsubscribeResource("one");
 assert(events.publish("player:joined","A")==1);
 assert(good==3);
 bool rejected=false;
 try{events.publish("player:joined",std::string(4097,'x'));}catch(const std::invalid_argument&){rejected=true;}
 assert(rejected);
}
