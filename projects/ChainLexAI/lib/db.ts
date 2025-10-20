import { neon, neonConfig } from "@neondatabase/serverless";

neonConfig.fetchConnectionCache = true;

function getSql() {
  const connectionString = process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  return neon(connectionString);
}

export type DeploymentRecord = {
  id: string;
  assetName: string;
  chain: string;
  status: "deployed" | "draft" | "pending";
  createdAt: string;
};

export async function listDeployments(): Promise<DeploymentRecord[]> {
  const sql = getSql();
  if (!sql) {
    return [];
  }

  const rows = await sql`
    select id, asset_name as "assetName", chain, status, created_at as "createdAt"
    from deployments
    order by created_at desc
    limit 25
  `;

  return rows as DeploymentRecord[];
}

export async function recordDeployment(entry: Omit<DeploymentRecord, "createdAt">) {
  const sql = getSql();
  if (!sql) {
    console.warn("Skipping deployment persistence because NEON_DATABASE_URL is not configured");
    return;
  }

  await sql`
    insert into deployments (id, asset_name, chain, status)
    values (${entry.id}, ${entry.assetName}, ${entry.chain}, ${entry.status})
  `;
}
