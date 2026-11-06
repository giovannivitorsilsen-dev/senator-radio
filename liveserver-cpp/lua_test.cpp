#include "lua_host.hpp"
#include <cassert>
#include <functional>
#include <iostream>
#include <stdexcept>
#include <string>
void expectFailure(const std::function<void()>& action) {
  bool failed = false;
  try { action(); } catch (const std::exception&) { failed = true; }
  assert(failed);
}
int main() {
  life::LuaHost host;
  host.add("core", {}, "RegisterEvent('rp:hello', function(value) Log('core:'..value) end)");
  host.add("taxi", {"core"},
    "assert(os == nil and io == nil and package == nil and require == nil and load == nil)\n"
    "RegisterEvent('rp:hello', function(value) Log('taxi:'..value) end)");
  host.start("taxi");
  assert(host.running("core") && host.running("taxi"));
  host.emit("rp:hello", "ciao");
  assert(host.logs("core").at(0) == "core:ciao");
  assert(host.logs("taxi").at(0) == "taxi:ciao");
  expectFailure([&]{ host.stop("core"); });
  host.stop("taxi");
  host.stop("core");
  assert(!host.running("core"));
  host.add("bad", {}, "error('broken script')");
  expectFailure([&]{ host.start("bad"); });
  assert(!host.running("bad"));
  host.add("spin", {}, "while true do end");
  expectFailure([&]{ host.start("spin"); });
  assert(!host.running("spin"));
  host.add("memory", {}, "local blob = string.rep('x', 10000000)");
  expectFailure([&]{ host.start("memory"); });
  assert(!host.running("memory"));
  host.add("limited", {},
    "assert(not HasCapability('chat.notice'))\n"
    "assert(not RequestAction('chat.notice','blocked'))\n"
    "assert(not RequestAction('staff.ban','player'))");
  host.start("limited");
  assert(host.logs("limited").empty());
  host.add("allowed", {},
    "assert(HasCapability('chat.notice'))\n"
    "assert(not HasCapability('staff.ban'))\n"
    "assert(RequestAction('chat.notice','hello from Lua'))\n"
    "assert(not RequestAction('staff.ban','player'))",
    {"chat.notice"});
  host.start("allowed");
  assert(host.logs("allowed").size()==1);
  assert(host.logs("allowed").at(0)=="hello from Lua");
  expectFailure([&]{ host.add("wildcard",{}, "Log('bad')", {"chat.*"}); });
  std::cout << "LifeServer Lua integration tests PASS\n";
}
