import { useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { ArrowTopRightOnSquareIcon, ClipboardDocumentIcon, RocketLaunchIcon } from "@heroicons/react/24/outline";
import { InputBase } from "~~/components/scaffold-eth/Input";
import { useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

{/* Prompt:  
   This is the page for generating AI agents.
   1/ input the name, description, and the landing page url to generate the json for the agent.
   2/ a btn to copy the json to the clipboard.
   3/ a btn to the "https://bodhi.wtf/space/5" to create the bodhi asset.
   4/ call the BodhiBasedAIAgentFactory to create the agent.
*/}

type AgentData = {
  name: string;
  description: string;
  basic_prompt: string;
  landing_page: string;
  version: string;
};

const Generator: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [agentName, setAgentName] = useState("My AI Agent");
  const [agentDescription, setAgentDescription] = useState("I am a helpful AI agent that can help you with your tasks.");
  const [landingPageUrl, setLandingPageUrl] = useState("https://www.google.com");
  const [generatedJson, setGeneratedJson] = useState<string>("");
  const [bodhiId, setBodhiId] = useState<string>("15541");

  // Generate JSON based on form inputs
  const generateAgentJson = () => {
    if (!agentName || !agentDescription || !landingPageUrl) {
      notification.error("Please fill in all required fields");
      return;
    }

    const agentData: AgentData = {
      name: agentName,
      description: agentDescription,
      basic_prompt: `You are ${agentName}. Your mission is to assist users by:\n1) ${agentDescription}\n2) Providing helpful and accurate information;\n3) Being supportive and engaging in all interactions.\n\nAlways be professional, clear, and help users achieve their goals.`,
      landing_page: landingPageUrl,
      version: "1.0.0",
    };

    const jsonString = JSON.stringify(agentData, null, 2);
    setGeneratedJson(jsonString);
    notification.success("Agent JSON generated successfully!");
  };

  // Copy JSON to clipboard
  const copyToClipboard = async () => {
    if (!generatedJson) {
      notification.error("No JSON to copy. Please generate the JSON first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedJson);
      notification.success("JSON copied to clipboard!");
    } catch (error) {
      notification.error("Failed to copy JSON to clipboard");
    }
  };

  // Open Bodhi space creation page
  const openBodhiSpace = () => {
    window.open("https://bodhi.wtf/space/5/new", "_blank");
  };

  // Smart contract interaction to create agent
  const { writeAsync: createAgent, isLoading: isCreatingAgent } = useScaffoldContractWrite({
    contractName: "BodhiBasedAIAgentFactory",
    functionName: "create",
    args: [bodhiId ? BigInt(bodhiId) : BigInt(0)],
    onSuccess: result => {
      notification.success("AI Agent created successfully on-chain!");
      console.log("Agent created:", result);
    },
  });

  const handleCreateAgent = async () => {
    if (!bodhiId) {
      notification.error("Please enter a Bodhi ID");
      return;
    }

    if (!connectedAddress) {
      notification.error("Please connect your wallet");
      return;
    }

    try {
      await createAgent();
    } catch (error) {
      console.error("Error creating agent:", error);
    }
  };

  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5 w-full max-w-4xl">
        <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row">
          <p className="my-2 font-medium">🤖 AI Agent Generator 🤖</p>
        </div>

        <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-full rounded-3xl shadow-lg border-2 border-primary">
          <h1 className="text-4xl font-bold mb-8">Generate Your On-Chain AI Agent</h1>
          <p className="text-lg mb-8 max-w-2xl">
            Create a new AI agent by providing basic information, then generate the JSON specification and deploy it
            on-chain using the Bodhi protocol.
          </p>

          {/* Form Section */}
          <div className="w-full max-w-2xl space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Agent Name *</label>
              <InputBase
                name="agentName"
                value={agentName}
                onChange={setAgentName}
                placeholder="Enter your AI agent's name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description *</label>
              <textarea
                className="textarea textarea-bordered w-full h-32 bg-base-200 border-2 border-base-300 rounded-lg"
                placeholder="Describe what your AI agent does and how it helps users..."
                value={agentDescription}
                onChange={e => setAgentDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Landing Page URL *</label>
              <InputBase
                name="landingPageUrl"
                value={landingPageUrl}
                onChange={setLandingPageUrl}
                placeholder="https://your-agent-landing-page.com"
              />
            </div>

            {/* Generate JSON Button */}
            <button
              className="btn btn-primary btn-lg w-full"
              onClick={generateAgentJson}
              disabled={!agentName || !agentDescription || !landingPageUrl}
            >
              <RocketLaunchIcon className="h-6 w-6" />
              Generate Agent JSON
            </button>
          </div>

          {/* Generated JSON Section */}
          {generatedJson && (
            <div className="w-full max-w-4xl mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Generated Agent JSON</h2>
                <button className="btn btn-secondary" onClick={copyToClipboard}>
                  <ClipboardDocumentIcon className="h-5 w-5" />
                  Copy to Clipboard
                </button>
              </div>
              <div className="bg-base-300 p-4 rounded-lg overflow-auto">
                <pre className="text-sm text-left whitespace-pre-wrap">{generatedJson}</pre>
              </div>
            </div>
          )}

          {/* Action Buttons Section */}
          <div className="w-full max-w-2xl mt-8 space-y-4">
            <div className="divider">Next Steps</div>

            {/* Bodhi Space Button */}
            <button className="btn btn-outline btn-lg w-full" onClick={openBodhiSpace}>
              <ArrowTopRightOnSquareIcon className="h-6 w-6" />
              Create Bodhi Asset (Step 1)
            </button>

            {/* Contract Interaction Section */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Bodhi ID (from Bodhi asset creation)</label>
                <InputBase
                  name="bodhiId"
                  value={bodhiId}
                  onChange={setBodhiId}
                  placeholder="Enter the Bodhi ID of your created asset"
                />
              </div>

              <button
                className="btn btn-success btn-lg w-full"
                onClick={handleCreateAgent}
                disabled={isCreatingAgent || !bodhiId || !connectedAddress}
              >
                {isCreatingAgent ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <RocketLaunchIcon className="h-6 w-6" />
                )}
                {isCreatingAgent ? "Creating Agent..." : "Deploy Agent On-Chain (Step 2)"}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 p-6 bg-base-200 rounded-lg max-w-4xl">
            <h3 className="text-xl font-bold mb-4">How to Create Your AI Agent:</h3>
            <ol className="list-decimal list-inside space-y-2 text-left">
              <li>Fill in the form above with your agent&apos;s information</li>
              <li>Click &quot;Generate Agent JSON&quot; to create the specification</li>
              <li>Copy the generated JSON and use it when creating your Bodhi asset</li>
              <li>Click &quot;Create Bodhi Asset&quot; to open Bodhi platform and create your asset</li>
              <li>Once your Bodhi asset is created, copy its ID and paste it in the Bodhi ID field</li>
              <li>Click &quot;Deploy Agent On-Chain&quot; to create your agent contract</li>
              <br></br>
              <li>Update the prompts(bodhi id list) and the knowledges(bodhi id list) after deployed</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Generator;