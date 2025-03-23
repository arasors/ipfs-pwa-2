import { PropsWithChildren } from "react";
import { config } from "../utils/web3config";
import { WagmiProvider } from "wagmi";
import { ConnectKitProvider } from "connectkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthGuard } from "@/components/AuthGuard";

const queryClient = new QueryClient();

export function Providers({ children }: PropsWithChildren) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          <AuthGuard>
            {children}
          </AuthGuard>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
} 