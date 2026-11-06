-- LifeScript Bridge API PROPOSAL. This file is a contract example, not executable inside FiveM.
-- No direct SQL or privilege assignment. All state-changing calls must be verified by LifeRP Core.
local Job = { id = "taxi", label = "Tassista", salary = 80 }
function Job.onDuty(core, context)
    if not core:hasPermission(context, "jobs.taxi.clock_in") then
        return false, "Not authorized"
    end
    return core:setDuty(context, Job.id, true)
end
return Job
