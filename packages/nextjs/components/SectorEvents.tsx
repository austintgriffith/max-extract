"use client";

import { SectorEvent } from "~~/types/sector";

interface SectorEventsProps {
  events: SectorEvent[];
}

export const SectorEvents = ({ events }: SectorEventsProps) => {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body p-4">
          <h3 className="card-title text-sm">Recent Events</h3>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {events.length === 0 ? (
              <p className="text-base-content/50 text-xs">No events yet...</p>
            ) : (
              events
                .slice()
                .reverse()
                .slice(0, 8) // Show only last 8 events to keep it compact
                .map((event, index) => (
                  <div key={index} className="text-xs p-2 bg-base-200/60 rounded">
                    <div className="flex justify-between items-start">
                      <span
                        className={`badge badge-xs ${
                          event.type === "asteroid_spawn"
                            ? "badge-info"
                            : event.type === "ship_spawn"
                              ? "badge-success"
                              : event.type === "asteroid_depleted"
                                ? "badge-error"
                                : event.type === "asteroid_exit"
                                  ? "badge-neutral"
                                  : event.type === "ship_exit"
                                    ? "badge-warning"
                                    : event.type === "ship_retarget"
                                      ? "badge-accent"
                                      : event.type === "ship_vector_matched"
                                        ? "badge-primary"
                                        : event.type === "ship_destroyed"
                                          ? "badge-error"
                                          : event.type === "pilot_death"
                                            ? "badge-error"
                                            : event.type === "pilot_tip"
                                              ? "badge-success"
                                              : event.type === "credential_minted"
                                                ? "badge-success"
                                                : event.type === "credential_mint_failed"
                                                  ? "badge-warning"
                                                  : "badge-ghost"
                        }`}
                      >
                        {event.type.replace("_", " ")}
                      </span>
                      <span className="text-xs text-base-content/50">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-base-content/70">
                      {event.type === "ship_spawn" &&
                        `${event.data.pilotName || `Ship ${event.data.address.slice(0, 8)}...`} spawned${event.data.shipType ? ` (${event.data.shipType} ship)` : ""}`}
                      {event.type === "asteroid_spawn" && `Asteroid spawned (size: ${Math.round(event.data.size)})`}
                      {event.type === "asteroid_depleted" && `Asteroid mined (score: ${event.data.score})`}
                      {event.type === "asteroid_exit" && `Asteroid drifted off map`}
                      {event.type === "ship_exit" &&
                        `${event.data.pilotName || "Ship"} exited (total: ${event.data.score}${event.data.fuelBonus ? `, fuel bonus: ${event.data.fuelBonus}` : ""})`}
                      {event.type === "ship_retarget" && `Ship changed course (${event.data.state})`}
                      {event.type === "ship_vector_matched" &&
                        (event.data.targetShipId
                          ? `Ship matched target ship vector (combat)`
                          : `Ship matched asteroid vector (mining)`)}
                      {event.type === "ship_destroyed" &&
                        `${event.data.attackerPilotName || "Attacker"} destroyed ${event.data.victimPilotName || "victim"}! Gained ${event.data.stolenScore} points + ${event.data.stolenFuel} fuel`}
                      {event.type === "pilot_death" && (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <span>
                              💀 {event.data.victimPilotName} killed by {event.data.killerPilotName}
                            </span>
                            {event.data.blockchainConfirmed === true && (
                              <>
                                <div className="px-2 py-1 rounded text-white font-bold bg-gradient-to-r from-red-500 to-red-700">
                                  -{event.data.scorePenalty} points
                                </div>
                                {event.data.transactionHash && (
                                  <span className="text-xs opacity-70">
                                    (tx: {event.data.transactionHash.slice(0, 8)}...)
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                          {event.data.blockchainConfirmed === false && (
                            <div className="text-xs text-yellow-400">
                              ⚠️ Blockchain transaction failed: {event.data.error}
                            </div>
                          )}
                        </div>
                      )}
                      {event.type === "pilot_tip" && (
                        <div className="flex items-center gap-1">
                          {event.data.error ? (
                            <span>❌ {event.data.pilotName} tip failed</span>
                          ) : (
                            <>
                              <span>{event.data.pilotName} tipped</span>
                              <div
                                className={`px-2 py-1 rounded text-white font-bold ${
                                  event.data.aboutInfo?.tipType === "enhanced"
                                    ? "bg-gradient-to-r from-green-500 to-emerald-600"
                                    : "bg-green-600"
                                }`}
                              >
                                +{event.data.tipAmount} points
                                {event.data.aboutInfo?.tipType === "enhanced" && " ⭐"}
                              </div>
                              <span>
                                to {event.data.aboutInfo?.stationName || event.data.stationName || "the sector owner"}.
                              </span>
                            </>
                          )}
                        </div>
                      )}
                      {event.type === "credential_minted" && (
                        <div className="flex items-center gap-1">
                          <span>🎫 {event.data.pilotName} minted access credential</span>
                          <div className="px-2 py-1 rounded text-white font-bold bg-gradient-to-r from-green-500 to-emerald-600">
                            +{event.data.pointsEarned} points
                          </div>
                          {event.data.transactionHash && (
                            <span className="text-xs opacity-70">
                              (tx: {event.data.transactionHash.slice(0, 8)}...)
                            </span>
                          )}
                        </div>
                      )}
                      {event.type === "credential_mint_failed" && (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-warning">
                            <span>⚠️ {event.data.pilotName} could not mint credential</span>
                          </div>
                          <div className="text-xs bg-warning/10 rounded px-2 py-1 border border-warning/30">
                            <div className="font-semibold text-warning">Your credential contract has issues:</div>
                            <div className="mt-1">{event.data.reason}</div>
                            {event.data.credentialAddress && (
                              <div className="mt-1 opacity-70">
                                Contract: {event.data.credentialAddress.slice(0, 10)}...
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
