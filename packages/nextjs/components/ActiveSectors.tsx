import Link from "next/link";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export const ActiveSectors = () => {
  // Read active sectors from the MaxExtract contract
  const { data: activeSectors } = useScaffoldReadContract({
    contractName: "MaxExtract",
    functionName: "getActiveSectors",
  });

  if (!activeSectors || activeSectors.length === 0) {
    return null;
  }

  return (
    <div className="text-center mb-6">
      <h2 className="text-xl font-bold mb-4">🚀 Active Sectors</h2>
      <div className="flex flex-wrap justify-center gap-2">
        {activeSectors.map((sectorId: bigint) => (
          <Link key={sectorId.toString()} href={`/sector/${sectorId.toString()}`} className="btn btn-primary btn-sm">
            Sector {sectorId.toString().slice(0, 8)}...
          </Link>
        ))}
      </div>
    </div>
  );
};
