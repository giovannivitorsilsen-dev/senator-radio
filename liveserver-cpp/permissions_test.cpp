#include "life_permissions.hpp"
#include <cassert>
#include <stdexcept>
int main() {
 life::LifePermissions perms;
 assert(!perms.has("taxi","chat.notice"));
 perms.registerResource("taxi",{"chat.notice","world.read"});
 perms.registerResource("bank",{"economy.read"});
 assert(perms.has("taxi","chat.notice"));
 assert(!perms.has("taxi","economy.read"));
 assert(!perms.has("bank","chat.notice"));
 assert(!perms.has("taxi","staff.ban"));
 assert(!perms.has("taxi","chat..notice"));
 bool denied=false;
 try{perms.registerResource("bad",{"anything.*"});}catch(const std::invalid_argument&){denied=true;}
 assert(denied);
 denied=false;
 try{perms.registerResource("taxi",{});}catch(const std::invalid_argument&){denied=true;}
 assert(denied);
 perms.revoke("taxi");
 assert(!perms.has("taxi","chat.notice"));
}
