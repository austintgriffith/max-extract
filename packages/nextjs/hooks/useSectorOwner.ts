import { useScaffoldReadContract } from "./scaffold-eth";

interface UseSectorOwnerReturn {
  ownerAddress: string | undefined;
  score: bigint | undefined;
  sectorName: string | undefined;
  auditStatus: "none" | "pending" | "audited";
  isLoading: boolean;
}

/**
 * Hook to fetch sector owner information from blockchain
 * Efficient single-call implementation using getSectorInfo
 * @param sectorId The sector ID to fetch info for
 */
export const useSectorOwner = (sectorId: string): UseSectorOwnerReturn => {
  // Get all sector info in one efficient call
  const { data: sectorInfo, isLoading } = useScaffoldReadContract({
    contractName: "MaxExtract",
    functionName: "getSectorInfo",
    args: [BigInt(sectorId)],
  });

  // Parse the sector info
  let ownerAddress: string | undefined;
  let score: bigint | undefined;
  let sectorName: string | undefined;
  let auditStatus: "none" | "pending" | "audited" = "none";

  if (sectorInfo && Array.isArray(sectorInfo) && sectorInfo.length === 5) {
    const [owner, , playerScore, name] = sectorInfo as [string, string, bigint, string, string];

    ownerAddress = owner;
    score = playerScore;

    // Determine audit status based on name
    if (name === "(pending audit)") {
      auditStatus = "pending";
      sectorName = undefined;
    } else if (name && name !== "") {
      auditStatus = "audited";
      sectorName = name;
    } else {
      auditStatus = "none";
      sectorName = undefined;
    }
  }

  return {
    ownerAddress,
    score,
    sectorName,
    auditStatus,
    isLoading,
  };
};
