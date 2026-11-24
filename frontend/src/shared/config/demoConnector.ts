import { createConnector } from "wagmi";
import { numberToHex } from "viem";

export function demoConnector(name: string, address: `0x${string}`) {
  return createConnector((config) => ({
    id: `demo-${address}`,
    name,
    icon: undefined as string | undefined,
    type: "demo",
    async connect({ withCapabilities } = {}) {
      return { accounts: (withCapabilities ? [{ address, capabilities: {} }] : [address]) as never, chainId: config.chains[0].id };
    },
    async disconnect() {},
    async getAccounts() { return [address]; },
    async getChainId() { return config.chains[0].id; },
    async isAuthorized() { return true; },
    async getProvider() {
      return {
        async request({ method, params }: { method: string; params?: readonly unknown[] }) {
          if (method === "eth_accounts" || method === "eth_requestAccounts") return [address];
          if (method === "eth_chainId") return numberToHex(config.chains[0].id);
          const response = await fetch("/demo-rpc", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
          });
          const result = await response.json();
          if (result.error) throw new Error(result.error.message);
          return result.result;
        },
      };
    },
    onAccountsChanged() {},
    onChainChanged() {},
    onDisconnect() {},
  }));
}
