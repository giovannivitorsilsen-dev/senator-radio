#include <enet/enet.h>
#include <cstring>
#include <iostream>

// ENet native loopback integration test. No public interface and no game actions.
// Pumps both peers in-process; tests one real reliable packet and response.
int main(){
 if(enet_initialize()!=0)return 1;
 ENetAddress bind{};
 bind.host=ENET_HOST_ANY; // replaced by numeric 127.0.0.1 below
 if(enet_address_set_host(&bind,"127.0.0.1")!=0){enet_deinitialize();return 2;}
 bind.port=0; // OS-assigned ephemeral port
 ENetHost* server=enet_host_create(&bind,1,2,0,0);
 ENetHost* client=enet_host_create(nullptr,1,2,0,0);
 if(!server||!client){
  if(client)enet_host_destroy(client);
  if(server)enet_host_destroy(server);
  enet_deinitialize();return 3;
 }
 ENetAddress target=server->address;
 ENetPeer* peer=enet_host_connect(client,&target,2,0);
 bool connected=false,received=false,answered=false;
 if(peer){
  const char request[]="life:hello:v1";
  for(int i=0;i<3000&&!answered;++i){
   ENetEvent event{};
   while(enet_host_service(client,&event,1)>0){
    if(event.type==ENET_EVENT_TYPE_CONNECT && !connected){
     connected=true;
     ENetPacket* packet=enet_packet_create(request,sizeof(request)-1,ENET_PACKET_FLAG_RELIABLE);
     if(packet)enet_peer_send(peer,0,packet);
    }else if(event.type==ENET_EVENT_TYPE_RECEIVE){
     const char answer[]="life:ack:v1";
     answered=event.packet->dataLength==sizeof(answer)-1 &&
       std::memcmp(event.packet->data,answer,sizeof(answer)-1)==0;
     enet_packet_destroy(event.packet);
    }
   }
   while(enet_host_service(server,&event,1)>0){
    if(event.type==ENET_EVENT_TYPE_RECEIVE){
     received=event.packet->dataLength==sizeof(request)-1 &&
       std::memcmp(event.packet->data,request,sizeof(request)-1)==0;
     enet_packet_destroy(event.packet);
     if(received){
      const char answer[]="life:ack:v1";
      ENetPacket* reply=enet_packet_create(answer,sizeof(answer)-1,ENET_PACKET_FLAG_RELIABLE);
      if(reply)enet_peer_send(event.peer,0,reply);
     }
    }
   }
   enet_host_flush(server);
   enet_host_flush(client);
  }
 }
 if(peer)enet_peer_reset(peer);
 enet_host_destroy(client);
 enet_host_destroy(server);
 enet_deinitialize();
 if(!connected||!received||!answered){
  std::cerr<<"Local ENet handshake or reliable packet exchange failed\n";
  return 4;
 }
 std::cout<<"LifeNetwork ENet localhost client/server exchange PASS\n";
 return 0;
}
