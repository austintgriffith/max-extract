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
          <h3 className="card-title text-sm">Recent Events ({events.length})</h3>
          <div className="max-h-[600px] overflow-y-auto space-y-2">
            {events.length === 0 ? (
              <p className="text-base-content/50 text-xs">No events yet...</p>
            ) : (
              events
                .slice()
                .reverse() // Show all events, newest first
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
                                            : event.type === "pilot_slashed"
                                              ? "badge-secondary"
                                              : event.type === "pilot_tip"
                                                ? "badge-success"
                                                : event.type === "credential_minted"
                                                  ? "badge-success"
                                                  : event.type === "credential_mint_failed"
                                                    ? "badge-warning"
                                                    : event.type === "stake_failed"
                                                      ? "badge-error"
                                                      : event.type === "pilot_staked"
                                                        ? "badge-success"
                                                        : event.type === "pilot_unstaked"
                                                          ? "badge-info"
                                                          : event.type === "pilot_insufficient_credits"
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
                        `${event.data.pilotName || `Ship ${event.data.address.slice(0, 8)}...`} spawned${event.data.shipType ? ` (ship #${event.data.shipType})` : ""}`}
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
                      {event.type === "pilot_slashed" && (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <span>
                              ⚔️ {event.data.victimPilotName} killed by {event.data.killerPilotName}
                            </span>
                            <div className="px-2 py-1 rounded text-white font-bold bg-gradient-to-r from-purple-500 to-purple-700">
                              killer slashed!
                            </div>
                            {event.data.transactionHash && (
                              <span className="text-xs opacity-70">
                                (tx: {event.data.transactionHash.slice(0, 8)}...)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {event.type === "pilot_tip" && (
                        <div className="flex items-center gap-1">
                          {event.data.error ? (
                            <span>❌ {event.data.pilotName} tip failed</span>
                          ) : (
                            <>
                              <span>
                                {event.data.reason === "refueling"
                                  ? `⛽ ${event.data.pilotName} refueled and tipped`
                                  : `${event.data.pilotName} tipped`}
                              </span>
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
                                {event.data.reason === "refueling"
                                  ? `to ${event.data.stationName || "the station owner"} for fuel.`
                                  : `to ${event.data.aboutInfo?.hasAboutContract && event.data.aboutInfo?.stationName ? event.data.aboutInfo.stationName : "the sector owner"}.`}
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
                            <div className="font-semibold text-warning mb-1">Your credential contract has issues:</div>

                            {/* Show decoded error if available, otherwise show reason */}
                            {event.data.errorDetails ? (
                              <div className="mt-1 p-2 bg-error/10 border border-error/30 rounded">
                                <div className="font-mono text-error text-xs">{event.data.errorDetails}</div>
                              </div>
                            ) : (
                              <div className="mt-1">{event.data.reason}</div>
                            )}

                            {/* Show contract address */}
                            {event.data.credentialAddress && (
                              <div className="mt-2 opacity-70">
                                Contract: {event.data.credentialAddress.slice(0, 10)}...
                                {event.data.credentialAddress.slice(-8)}
                              </div>
                            )}

                            {/* Show error signature for debugging */}
                            {event.data.errorSignature && (
                              <div className="mt-1 opacity-60 font-mono">Error Code: {event.data.errorSignature}</div>
                            )}
                          </div>
                        </div>
                      )}
                      {event.type === "fuel_token_purchase" && (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <span>
                              🛒 {event.data.pilotName} bought {event.data.tokensPurchased} fuel tokens
                            </span>
                          </div>
                          <div className="text-xs bg-success/10 rounded px-2 py-1 border border-success/30">
                            <div className="flex justify-between">
                              <span>Cost:</span>
                              <span className="font-mono">{event.data.creditsCost.toLocaleString()} CREDITS</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Pilot now owns:</span>
                              <span className="font-mono">{event.data.totalTokensOwned} tokens</span>
                            </div>
                            <div className="flex justify-between font-semibold mt-1 pt-1 border-t border-success/30">
                              <span>Contract total:</span>
                              <span className="font-mono">
                                {event.data.contractTotalCredits.toLocaleString()} CREDITS
                              </span>
                            </div>
                            {event.data.transactionHash && (
                              <div className="mt-1 opacity-70">(tx: {event.data.transactionHash.slice(0, 10)}...)</div>
                            )}
                          </div>
                        </div>
                      )}
                      {event.type === "fuel_token_purchase_failed" && (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-warning">
                            <span>⚠️ {event.data.pilotName} could not buy fuel tokens</span>
                          </div>
                          <div className="text-xs bg-warning/10 rounded px-2 py-1 border border-warning/30">
                            <div className="font-semibold text-warning mb-1">Your fuel contract has issues:</div>

                            {/* Show decoded error if available, otherwise show reason */}
                            {event.data.errorDetails ? (
                              <div className="mt-1 p-2 bg-error/10 border border-error/30 rounded">
                                <div className="font-mono text-error text-xs">{event.data.errorDetails}</div>
                              </div>
                            ) : (
                              <div className="mt-1">{event.data.reason}</div>
                            )}

                            {/* Show contract address */}
                            {event.data.fuelContractAddress && (
                              <div className="mt-2 opacity-70">
                                Contract: {event.data.fuelContractAddress.slice(0, 10)}...
                                {event.data.fuelContractAddress.slice(-8)}
                              </div>
                            )}

                            {/* Show error signature for debugging */}
                            {event.data.errorSignature && (
                              <div className="mt-1 opacity-60 font-mono">Error Code: {event.data.errorSignature}</div>
                            )}
                          </div>
                        </div>
                      )}
                      {event.type === "station_upgraded" && (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <span>✅ Station upgraded by {event.data.pilotName}</span>
                          </div>
                          <div className="text-xs bg-success/10 rounded px-2 py-1 border border-success/30">
                            <div className="flex justify-between">
                              <span>Pilot bounty:</span>
                              <span className="font-mono">{event.data.pilotBounty} CREDITS</span>
                            </div>
                            {event.data.transactionHash && (
                              <div className="mt-1 opacity-70">(tx: {event.data.transactionHash.slice(0, 10)}...)</div>
                            )}
                          </div>
                        </div>
                      )}
                      {event.type === "station_upgrade_failed" && (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-warning">
                            <span>
                              ⚠️ {event.data.pilotName} tried to upgrade (attempt {event.data.attemptNumber}/
                              {event.data.maxAttempts})
                            </span>
                          </div>
                          <div className="text-xs bg-warning/10 rounded px-2 py-1 border border-warning/30">
                            <div className="font-semibold text-warning mb-1">Upgrade failed:</div>

                            {/* Show decoded error if available, otherwise show reason */}
                            {event.data.errorDetails ? (
                              <div className="mt-1 p-2 bg-error/10 border border-error/30 rounded">
                                <div className="font-mono text-error text-xs">{event.data.errorDetails}</div>
                              </div>
                            ) : (
                              <div className="mt-1">{event.data.reason}</div>
                            )}

                            {/* Show contract address */}
                            {event.data.fuelContractAddress && (
                              <div className="mt-2 opacity-70">
                                Contract: {event.data.fuelContractAddress.slice(0, 10)}...
                                {event.data.fuelContractAddress.slice(-8)}
                              </div>
                            )}

                            {/* Show error signature for debugging */}
                            {event.data.errorSignature && (
                              <div className="mt-1 opacity-60 font-mono">Error Code: {event.data.errorSignature}</div>
                            )}
                          </div>
                        </div>
                      )}
                      {event.type === "stake_failed" && (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-error">
                            <span>❌ {event.data.pilotName} failed to stake in sector</span>
                          </div>
                          <div className="text-xs bg-error/10 rounded px-2 py-1 border border-error/30">
                            <div className="font-semibold text-error mb-1">Staking failed:</div>

                            {/* Show user-friendly decoded error prominently */}
                            <div className="mt-1 p-2 bg-error/10 border border-error/30 rounded">
                              <div className="font-semibold text-error">
                                {event.data.reason || "Staking transaction failed"}
                              </div>
                            </div>

                            {/* Show technical details in a collapsed/less prominent section */}
                            {event.data.errorDetails && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-xs opacity-70 hover:opacity-100">
                                  Technical details (click to expand)
                                </summary>
                                <div className="mt-2 p-2 bg-base-200/50 rounded border border-base-300">
                                  <div className="font-mono text-xs whitespace-pre-wrap break-words opacity-80">
                                    {event.data.errorDetails}
                                  </div>
                                </div>
                              </details>
                            )}

                            {/* Show pilot address for debugging */}
                            {event.data.pilotAddress && (
                              <div className="mt-2 opacity-70">
                                Pilot: {event.data.pilotAddress.slice(0, 10)}...{event.data.pilotAddress.slice(-8)}
                              </div>
                            )}

                            {/* Show sector ID */}
                            {event.data.sectorId && (
                              <div className="mt-1 opacity-70">
                                Sector: {event.data.sectorId.slice(0, 10)}...{event.data.sectorId.slice(-8)}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {event.type === "pilot_staked" && (
                        <div className="flex items-center gap-1">
                          <span>✅ {event.data.pilotName} staked 10,000 CREDITS</span>
                          {event.data.transactionHash && (
                            <span className="text-xs opacity-70">
                              (tx: {event.data.transactionHash.slice(0, 8)}...)
                            </span>
                          )}
                        </div>
                      )}
                      {event.type === "pilot_unstaked" && (
                        <div className="flex items-center gap-1">
                          <span>
                            🔓 {event.data.pilotName} unstaked and received{" "}
                            {event.data.returnedAmount
                              ? `${Number(event.data.returnedAmount).toLocaleString()} CREDITS`
                              : "CREDITS"}{" "}
                            back
                          </span>
                          {event.data.transactionHash && (
                            <span className="text-xs opacity-70">
                              (tx: {event.data.transactionHash.slice(0, 8)}...)
                            </span>
                          )}
                        </div>
                      )}
                      {event.type === "pilot_insufficient_credits" && (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-warning">
                            <span>⚠️ {event.data.pilotName} could not enter - insufficient CREDITS</span>
                          </div>
                          <div className="text-xs bg-warning/10 rounded px-2 py-1 border border-warning/30">
                            <div className="flex justify-between">
                              <span>Required:</span>
                              <span className="font-mono">{event.data.requiredCredits} CREDITS</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Pilot has:</span>
                              <span className="font-mono">{event.data.currentCredits} CREDITS</span>
                            </div>
                            <div className="mt-2 text-xs opacity-70">
                              💎 Chapter 4 staking requirement: This sector requires pilots to stake 10,000 CREDITS to
                              enter.
                            </div>
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
