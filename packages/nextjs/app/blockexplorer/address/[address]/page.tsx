import fs from "fs";
import path from "path";
import { Address } from "viem";
import { foundry } from "viem/chains";
import { AddressComponent } from "~~/app/blockexplorer/_components/AddressComponent";
import deployedContracts from "~~/contracts/deployedContracts";
import { isZeroAddress } from "~~/utils/scaffold-eth/common";
import { GenericContractsDeclaration } from "~~/utils/scaffold-eth/contract";

type PageProps = {
  params: Promise<{ address: Address }>;
};

async function fetchByteCodeAndAssembly(buildInfoDirectory: string, contractPath: string) {
  const buildInfoFiles = fs.readdirSync(buildInfoDirectory);
  let bytecode = "";
  let assembly = "";

  for (let i = 0; i < buildInfoFiles.length; i++) {
    const filePath = path.join(buildInfoDirectory, buildInfoFiles[i]);

    try {
      const buildInfo = JSON.parse(fs.readFileSync(filePath, "utf8"));

      // Check if the expected structure exists
      if (buildInfo.output?.contracts?.[contractPath]) {
        for (const contract in buildInfo.output.contracts[contractPath]) {
          const contractData = buildInfo.output.contracts[contractPath][contract];
          if (contractData?.evm?.bytecode) {
            bytecode = contractData.evm.bytecode.object || "";
            assembly = contractData.evm.bytecode.opcodes || "";
            break;
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to parse build info file ${filePath}:`, error);
      continue;
    }

    if (bytecode && assembly) {
      break;
    }
  }

  return { bytecode, assembly };
}

const getContractData = async (address: Address) => {
  try {
    const contracts = deployedContracts as GenericContractsDeclaration | null;
    const chainId = foundry.id;

    if (!contracts || !contracts[chainId] || Object.keys(contracts[chainId]).length === 0) {
      return null;
    }

    let contractPath = "";

    const buildInfoDirectory = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "..",
      "..",
      "..",
      "..",
      "foundry",
      "out",
      "build-info",
    );

    if (!fs.existsSync(buildInfoDirectory)) {
      console.warn(
        `Build info directory ${buildInfoDirectory} not found. Bytecode and assembly will not be available.`,
      );
      return null;
    }

    const deployedContractsOnChain = contracts[chainId];
    for (const [contractName, contractInfo] of Object.entries(deployedContractsOnChain)) {
      if (contractInfo.address.toLowerCase() === address.toLowerCase()) {
        contractPath = `contracts/${contractName}.sol`;
        break;
      }
    }

    if (!contractPath) {
      // No contract found at this address
      return null;
    }

    const { bytecode, assembly } = await fetchByteCodeAndAssembly(buildInfoDirectory, contractPath);

    return { bytecode, assembly };
  } catch (error) {
    console.error("Error getting contract data:", error);
    return null;
  }
};

export function generateStaticParams() {
  // An workaround to enable static exports in Next.js, generating single dummy page.
  return [{ address: "0x0000000000000000000000000000000000000000" }];
}

const AddressPage = async (props: PageProps) => {
  const params = await props.params;
  const address = params?.address as Address;

  if (isZeroAddress(address)) return null;

  const contractData: { bytecode: string; assembly: string } | null = await getContractData(address);
  return <AddressComponent address={address} contractData={contractData} />;
};

export default AddressPage;
