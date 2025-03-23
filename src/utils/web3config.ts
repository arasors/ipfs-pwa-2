import { getDefaultConfig } from "connectkit";
import { createConfig } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";

export const chains = [mainnet, sepolia];

export const config = createConfig(
  getDefaultConfig({
    // ConnectKit yapılandırması
    appName: "IPFS-X",
    walletConnectProjectId: "BDwpdSrR2mqAfLlh40XAothSFIVPlxmSjb6bCy49cnZyCYW8ZVjcu7iC7k5BcV-jM_-E1p52L8WzGb1Fb-OjOro",
    chains: [mainnet, sepolia],
    // Diğer seçenekler
    ssr: false,
  }),
); 