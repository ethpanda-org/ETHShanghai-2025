import express from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import { ethers } from 'ethers';
import fs from 'fs';
import { routeJob, planExecution } from './orchestrator.js';

const app = express();
const upload = multer({ dest: 'uploads/' });
app.use(express.json());

// env
const RPC_URL = process.env.SEPOLIA_RPC_URL || process.env.BASE_SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const SBT_ADDRESS = process.env.SBT_PROXY || process.env.SBT_ADDRESS; // upgradeable or classic
const BUSINESS_ADDRESS = process.env.BUSINESS_ADDRESS;
const ID_ADDRESS = process.env.IDENTITY_REGISTRY;
const REP_ADDRESS = process.env.REPUTATION_REGISTRY;
const VAL_ADDRESS = process.env.VALIDATION_REGISTRY;

if (!RPC_URL || !PRIVATE_KEY) {
  console.error('Missing RPC/PRIVATE_KEY');
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// ABIs (load from artifacts or lightweight fragments)
const SBT_ABI = [
  'function setIssuerAgentId(address,uint256)',
  'function setRegistries(address,address,address)',
  'function setThresholds(uint8,uint8)',
  'function setPreferredValidator(address)',
  'function setEnforceRegistryChecks(bool)',
  'function mintBadgeWithValidation(address,uint8,string,bytes32)',
  'function mintWithPermit(address,address,uint8,string,bytes32,uint256,bytes)'
];
const BUSINESS_ABI = [
  'function assignJob(bytes32,address,uint256) payable',
  'function releasePayment(bytes32,bytes32,address)'
];
const ID_ABI = [ 'function set(uint256,address,string)' ];
const REP_ABI = [ 'function set(uint256,uint64,uint8)' ];
const VAL_ABI = [ 'function validationRequest(address,uint256,string,bytes32)', 'function set(bytes32,address,uint256,uint8,bytes32)' ];

const sbt = SBT_ADDRESS ? new ethers.Contract(SBT_ADDRESS, SBT_ABI, wallet) : null;
const business = BUSINESS_ADDRESS ? new ethers.Contract(BUSINESS_ADDRESS, BUSINESS_ABI, wallet) : null;
const id = ID_ADDRESS ? new ethers.Contract(ID_ADDRESS, ID_ABI, wallet) : null;
const rep = REP_ADDRESS ? new ethers.Contract(REP_ADDRESS, REP_ABI, wallet) : null;
const val = VAL_ADDRESS ? new ethers.Contract(VAL_ADDRESS, VAL_ABI, wallet) : null;

// util: upload file to pseudo storage (local) and return url+hash
async function storeFile(filePath) {
  const buf = fs.readFileSync(filePath);
  const hash = ethers.keccak256(buf);
  const uri = `file://${process.cwd()}/${filePath}`;
  return { uri, hash };
}

// A) 注册：绑定 agentId 与 AgentCard（将 URI 写到 IdentityRegistry）
app.post('/agent/register', async (req, res) => {
  try {
    const { agentId, owner, agentCardUri } = req.body;
    if (!id) return res.status(400).json({ error: 'ID registry not configured' });
    const tx = await id.set(agentId, owner, agentCardUri);
    await tx.wait();
    res.json({ agentId, tx: tx.hash });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// B) 投标（示例：仅记录意向）
app.post('/agent/bid', async (req, res) => {
  const { jobId, tags = [], minAvgScore, preferredValidator } = req.body;
  const agentProfiles = req.body.agentProfiles || [];
  const job = { id: jobId, tags };
  const routed = routeJob({ job, agentProfiles, minAvgScore, preferredValidator });
  const plan = await planExecution({ job, agent: routed.selected || {} });
  res.json({ ok: true, jobId, selection: routed, plan });
});

// C) 提交工件 → 返回 requestUri/hash（本地存储模拟；生产请用 IPFS/S3）
app.post('/agent/work', upload.single('artifact'), async (req, res) => {
  try {
    const file = req.file;
    const { uri, hash } = await storeFile(file.path);
    res.json({ requestUri: uri, requestHash: hash });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// D) 触发链上验证请求
app.post('/agent/validate', async (req, res) => {
  try {
    if (!val) return res.status(400).json({ error: 'Validation registry not configured' });
    const { validator, agentId, requestUri, requestHash } = req.body;
    const tx = await val.validationRequest(validator, agentId, requestUri, requestHash);
    await tx.wait();
    res.json({ tx: tx.hash });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// E) 反馈授权（EIP-712 示例负载返回给前端签名）
app.post('/agent/feedback/issue-auth', async (req, res) => {
  const { schema = 'ReputationAuth', agentId, client, deadline } = req.body;
  const payload = { schema, agentId, client, deadline: deadline || Math.floor(Date.now()/1000)+3600 };
  res.json({ payload, message: 'client signs this payload off-chain' });
});

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`agent-service listening on :${port}`));
