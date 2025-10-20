
import { PlatformApi } from "@instantdb/platform";

export const createInstantdbApp = async (dbName: string): Promise<string> => {
  const token = document.cookie
    .split("; ")
    .find((row) => row.startsWith("instantdb_token="))
    ?.split("=")[1];
  if (!token) {
    throw new Error("Instantdb token not found");
  }
  const api = new PlatformApi({ auth: { token } });
  const { app } = await api.createApp({
    title: dbName,
  });
  return app.id;
};

export const updateInstantdbSchema = async (schemaObj: any, instantAppId: string) => {
  const token = document.cookie
    .split("; ")
    .find((row) => row.startsWith("instantdb_token="))
    ?.split("=")[1];
  if (!token) {
    throw new Error("Instantdb token not found");
  }
  const api = new PlatformApi({ auth: { token } });
  await api.schemaPush(instantAppId, { schema: schemaObj });
}
