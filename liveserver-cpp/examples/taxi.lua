-- LifeLua v0.1: example resource script, independent of ESX/QBCore/vRPex.
RegisterEvent("rp:hello", function(playerName)
  Log("Benvenuto nel lavoro taxi, " .. playerName)
end)
