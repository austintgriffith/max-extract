"use client";

import { useEffect, useState } from "react";
import { Address } from "~~/components/scaffold-eth";
import deployedContracts from "~~/contracts/deployedContracts";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

interface ContractInfo {
  name: string;
  address: string;
  deployedOnBlock: number;
}

const ContractsPage = () => {
  const { targetNetwork } = useTargetNetwork();
  const [contracts, setContracts] = useState<ContractInfo[]>([]);

  useEffect(() => {
    const networkId = targetNetwork.id;
    const networkContracts = deployedContracts[networkId as keyof typeof deployedContracts];

    if (networkContracts) {
      const contractList = Object.entries(networkContracts).map(([name, contract]) => ({
        name,
        address: contract.address,
        deployedOnBlock: contract.deployedOnBlock,
      }));
      setContracts(contractList);
    }
  }, [targetNetwork]);

  return (
    <div className="flex items-center flex-col flex-grow pt-8">
      <div className="px-5 w-full max-w-4xl">
        <h1 className="text-center mb-8">
          <span className="block text-4xl font-bold">Smart Contracts</span>
        </h1>

        {contracts.length === 0 ? (
          <div className="text-center">
            <p className="text-lg">No contracts deployed on this network.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {contracts.map(contract => (
              <div
                key={contract.name}
                className="bg-base-100 border-base-300 border shadow-md shadow-secondary rounded-3xl px-6 py-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-primary mb-2">{contract.name}</h2>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">Address:</span>
                        <Address address={contract.address} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">Deployed on Block:</span>
                        <span className="text-sm font-mono bg-base-200 px-2 py-1 rounded">
                          #{contract.deployedOnBlock}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <a href={`/blockexplorer/address/${contract.address}`} className="btn btn-secondary btn-sm">
                      View in Explorer
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center space-y-6">
          <div>
            <a href="/debug" className="btn btn-primary btn-lg">
              Debug Contracts
            </a>
          </div>

          <div className="bg-base-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">API Access</h3>
            <p className="text-sm mb-2">Get contract data programmatically:</p>
            <a
              href="/api/contracts.json"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs bg-base-300 hover:bg-base-100 px-2 py-1 rounded transition-colors cursor-pointer border border-transparent hover:border-primary"
            >
              GET /api/contracts.json
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContractsPage;
