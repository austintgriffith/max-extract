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
                      {event.type === "ship_spawn" && `Ship ${event.data.address.slice(0, 8)}... spawned`}
                      {event.type === "asteroid_spawn" && `Asteroid spawned (size: ${Math.round(event.data.size)})`}
                      {event.type === "asteroid_depleted" && `Asteroid mined (score: ${event.data.score})`}
                      {event.type === "asteroid_exit" && `Asteroid drifted off map`}
                      {event.type === "ship_exit" &&
                        `Ship exited (total: ${event.data.score}${event.data.fuelBonus ? `, fuel bonus: ${event.data.fuelBonus}` : ""})`}
                      {event.type === "ship_retarget" && `Ship changed course (${event.data.state})`}
                      {event.type === "ship_vector_matched" &&
                        (event.data.targetShipId
                          ? `Ship matched target ship vector (combat)`
                          : `Ship matched asteroid vector (mining)`)}
                      {event.type === "ship_destroyed" &&
                        `Ship destroyed! Attacker gained ${event.data.stolenScore} points + ${event.data.stolenFuel} fuel`}
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
