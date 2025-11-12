import { useScaffoldReadContract } from "./scaffold-eth";

/**
 * Hook to read the placeholder message from the Game contract
 * Used for maintenance mode - when placeholder is set, frontend shows maintenance UI
 * @returns Object containing placeholder string and loading state
 */
export const usePlaceholder = () => {
  const { data: placeholder, isLoading } = useScaffoldReadContract({
    contractName: "Game",
    functionName: "placeholder",
    query: {
      // Poll every 20 seconds for updates
      refetchInterval: 20000,
    },
  });

  return {
    placeholder: placeholder as string | undefined,
    isLoading,
  };
};
