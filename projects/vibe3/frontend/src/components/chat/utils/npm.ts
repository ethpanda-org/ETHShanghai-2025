import { WebContainer } from "@webcontainer/api";
import * as ActionTypes from "../types";
import { stripOutput } from "@/uitls/output";

export async function resolveNpmInstall(
  action: ActionTypes.NpmInstallInput,
  webContainer: WebContainer
) {
  console.log("[webcontainer] Running npm install...", action);
  const installProcess = await webContainer.spawn("npm", [
    "install",
    ...action.packageNames,
    ...(action.args || []),
  ]);
  let output = "";
  installProcess.output.pipeTo(new WritableStream({
      write(data) {
        console.log('npm install output =>', data);
        output += data;
      }
    })
  );
  const installExitCode = await installProcess.exit;
  if (installExitCode !== 0) {
    console.error("[webcontainer] Unable to run npm install");
  }
  return stripOutput(output);
}
