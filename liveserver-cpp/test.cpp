#include "resource_manager.hpp"
#include <cassert>
#include <functional>
#include <iostream>
#include <stdexcept>
void expectFailure(std::function<void()> f) {
 bool rejected=false;try{f();}catch(const std::exception&){rejected=true;}assert(rejected);
}
int main() {
 life::ResourceManager m;m.add({"core",{}});m.add({"jobs",{"core"}});m.add({"taxi",{"jobs"}});
 m.start("taxi");assert(m.running("core")&&m.running("taxi"));
 expectFailure([&]{m.stop("core");});
 m.stop("taxi");m.stop("jobs");m.stop("core");assert(!m.running("core"));
 life::ResourceManager cycle;cycle.add({"a",{"b"}});cycle.add({"b",{"a"}});
 expectFailure([&]{cycle.start("a");});assert(!cycle.running("a"));
 std::cout<<"LifeServer C++ resource test PASS\n";
}
