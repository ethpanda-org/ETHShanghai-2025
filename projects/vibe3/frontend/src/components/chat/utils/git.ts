import { WebContainer } from "@webcontainer/api";
import { Profile } from "@/services/vibe3_api/auth";

export async function resolveGitInit(webContainer: WebContainer) {
  console.log("[webcontainer] Initializing git repo...");
  // npx isogit init --dir '.'
  const initProcess = await webContainer.spawn("npx", [
    "isogit",
    "init",
    "--dir",
    ".",
  ]);
  const initExitCode = await initProcess.exit;
  if (initExitCode !== 0) {
    throw new Error("[webcontainer] Unable to init git repo");
  }
  console.log("[webcontainer] Git repo initialized successfully");
}

export async function resolveGitAdd(webContainer: WebContainer) {
  console.log("[webcontainer] Adding files to git repo...");
  // npx isogit add --filepath '.' --dir '.'
  const addProcess = await webContainer.spawn("npx", [
    "isogit",
    "add",
    "--filepath",
    ".",
    "--dir",
    ".",
  ]);

  const addExitCode = await addProcess.exit;
  if (addExitCode !== 0) {
    throw new Error("[webcontainer] Unable to add files to git repo");
  }
  console.log("[webcontainer] Files added to git repo successfully");
}

export async function resolveGitCommit(
  webContainer: WebContainer,
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    console.log("[webcontainer] Committing files to git repo...");
    // npx isogit commit --dir '.' --message "init" --author.name xxxxxx --author.email xxxxxx@test.com
    const commitProcess = await webContainer.spawn("npx", [
      "isogit",
      "commit",
      "--dir",
      ".",
      "--message",
      "init",
      "--author.name",
      "vibe3",
      "--author.email",
      "vibe3@vibe3.im",
    ]);
    
    // pipe the output to console
    let commitHash = "";
    commitProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          console.log(data);
          if (data.includes('"')) {
            commitHash = data.split('"')[1];
          }
        },
      })
    );

    const commitExitCode = await commitProcess.exit;
    if (commitExitCode !== 0) {
      reject(new Error("[webcontainer] Unable to commit files to git repo"));
    }
    console.log(`[webcontainer] Files committed to git repo successfully: ${commitHash}`);
    resolve(commitHash);
  });
}

export async function resolveGitCheckoutToSpecificCommit(webContainer: WebContainer, commitHash: string) {
  console.log("[webcontainer] Resetting git repo...");
  // remove .git/index
  await webContainer.fs.rm(".git/index");
  // npx isogit reset --dir '.'
  const resetProcess = await webContainer.spawn("npx", [
    "isogit",
    "checkout",
    "--ref",
    commitHash,
    "--dir",
    ".",
    "--force"
  ]);
  const resetExitCode = await resetProcess.exit;
  // pipe the output to console
  if (resetExitCode !== 0) {
    throw new Error("[webcontainer] Unable to reset git repo");
  }
  console.log("[webcontainer] Git repo reset successfully");
}
