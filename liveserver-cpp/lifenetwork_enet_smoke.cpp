#include <enet/enet.h>
#include <cstring>
#include <iostream>

// Private transport integration smoke: no listening public UDP server.
// This validates linkage, ENet host allocation and reliable packet lifecycle.
// Authentication, replication and anti-cheat must be built above ENet.
int main() {
  if(enet_initialize()!=0) {
    std::cerr<<"ENet initialization failed\n";
    return 1;
  }
  ENetHost* host=enet_host_create(nullptr,2,2,0,0);
  if(!host) {
    enet_deinitialize();
    std::cerr<<"ENet client host allocation failed\n";
    return 2;
  }
  const char message[]="life:probe:v1";
  ENetPacket* packet=enet_packet_create(message,sizeof(message)-1,ENET_PACKET_FLAG_RELIABLE);
  const bool ok=packet && packet->dataLength==sizeof(message)-1 &&
    (packet->flags&ENET_PACKET_FLAG_RELIABLE)!=0 &&
    std::memcmp(packet->data,message,sizeof(message)-1)==0;
  if(packet)enet_packet_destroy(packet);
  enet_host_destroy(host);
  enet_deinitialize();
  if(!ok)return 3;
  std::cout<<"LifeNetwork ENet native smoke PASS (no live game socket)\n";
  return 0;
}
