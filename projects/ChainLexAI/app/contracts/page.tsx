import { ContractGenerator } from "@/components/contracts/contract-generator";

export const metadata = {
  title: "ChainLex.ai · Contract Generator",
  description: "Configure, preview, and deploy RWA contracts with viem and wagmi.",
};

export default function ContractsPage() {
  return (
    <section className="space-y-10">
      <ContractGenerator />
    </section>
  );
}
