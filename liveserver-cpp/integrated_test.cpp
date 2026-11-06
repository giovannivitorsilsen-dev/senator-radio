#include "life_runtime_console.hpp"
#include <cassert>
#include <iostream>
#include <string>

int main() {
  life::LifeRuntime rt;
  rt.add("core", {}, "RegisterEvent('player:joined', function(v) Log('core:'..v) end)", {"player:joined"});
  rt.add("taxi", {"core"}, "RegisterEvent('player:joined', function(v) Log('taxi:'..v) end)", {"player:joined"});
  life::LifeRuntimeConsole cli(rt);
  assert(cli.execute("ensure taxi")=="OK ensured");
  assert(cli.execute("emit player:joined Mario")=="OK delivered 2");
  assert(cli.execute("logs taxi")=="taxi:Mario\n");
  assert(cli.execute("logs core")=="core:Mario\n");
  assert(cli.execute("stop core").rfind("ERR",0)==0);
  assert(cli.execute("restart taxi")=="OK restarted");
  assert(cli.execute("emit player:joined Anna")=="OK delivered 2");
  assert(cli.execute("logs taxi")=="taxi:Anna\n");
  assert(cli.execute("stop taxi")=="OK stopped");
  assert(cli.execute("emit player:joined Paolo")=="OK delivered 1");
  assert(cli.execute("stop core")=="OK stopped");
  assert(cli.execute("emit player:joined Paolo")=="OK delivered 0");
  rt.add("bad", {}, "error('fails on boot')", {"player:joined"});
  assert(cli.execute("start bad").rfind("ERR",0)==0);
  assert(cli.execute("status bad")=="stopped");
  assert(cli.execute("emit player:joined Mario")=="OK delivered 0");
  rt.add("faulty", {}, "RegisterEvent('player:joined',function(v) error('bad callback') end)",{"player:joined"});
  rt.add("healthy", {}, "RegisterEvent('player:joined',function(v) Log(v) end)",{"player:joined"});
  assert(cli.execute("ensure faulty")=="OK ensured");
  assert(cli.execute("ensure healthy")=="OK ensured");
  assert(cli.execute("emit player:joined safe")=="OK delivered 1");
  assert(cli.execute("logs healthy")=="safe\n");
  assert(rt.errors().size()==1);
  assert(cli.execute("emit player:joined "+std::string(4097,'x')).rfind("ERR",0)==0);
  assert(cli.execute("status unknown")=="ERR unknown resource");
  assert(cli.execute("exec anything").rfind("ERR",0)==0);
  std::cout<<"LifeRuntime integrated console + Lua + LifeEvents PASS\n";
}
