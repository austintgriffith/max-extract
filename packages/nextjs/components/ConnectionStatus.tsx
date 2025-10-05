import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";

interface ConnectionStatusProps {
  gameServerStatus: "checking" | "online" | "offline";
}

export const ConnectionStatus = ({ gameServerStatus }: ConnectionStatusProps) => {
  const { address: connectedAddress } = useAccount();

  return (
    <div className="grow bg-base-300 w-full mt-16 px-8 py-12">
      {/* Connection Status */}
      <div className="bg-base-200 rounded-lg p-6 mb-8 max-w-md mx-auto">
        <div className="flex justify-center items-center space-x-2 flex-col mb-4">
          <p className="font-medium">Connected Address:</p>
          <Address address={connectedAddress} />
        </div>

        <div className="text-center">
          <div
            className={`badge ${
              gameServerStatus === "online"
                ? "badge-success"
                : gameServerStatus === "checking"
                  ? "badge-warning"
                  : "badge-error"
            }`}
          >
            Game Server: {gameServerStatus}
          </div>
        </div>
      </div>
    </div>
  );
};
