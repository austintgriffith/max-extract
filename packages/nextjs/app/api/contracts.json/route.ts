import { NextResponse } from "next/server";
import deployedContracts from "~~/contracts/deployedContracts";

export const dynamic = "force-static";

export async function GET() {
  try {
    // Transform the deployed contracts data into a more API-friendly format
    const contractsData = Object.entries(deployedContracts).reduce(
      (acc, [networkId, contracts]) => {
        acc[networkId] = {
          networkId: parseInt(networkId),
          contracts: Object.entries(contracts).map(([name, contract]) => ({
            name,
            address: contract.address,
            deployedOnBlock: contract.deployedOnBlock,
            // Include ABI for those who need it
            abi: contract.abi,
          })),
        };
        return acc;
      },
      {} as Record<string, any>,
    );

    return NextResponse.json({
      success: true,
      data: contractsData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching contracts:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch contract data",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
