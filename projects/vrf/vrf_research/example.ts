/**
 * VRF BLS12-381 使用示例
 */

import { generateKeyPair, prove, verify } from './src/index';
import { bytesToHex } from '@noble/hashes/utils';

// 示例 1: 基本使用
console.log('=== 示例 1: 基本使用 ===\n');

// 1. 生成密钥对
const { sk, pk } = generateKeyPair();
console.log('密钥对已生成');
console.log('私钥 (sk):', sk.toString(16).slice(0, 32) + '...');

// 2. 准备输入
const input = '这是一个测试输入';
console.log('输入:', input);

// 3. Prover 生成证明
const proof = prove(sk, pk, input);
console.log('\nVRF 证明已生成:');
console.log('  c  :', proof.c.toString(16));
console.log('  s_1:', proof.s_1.toString(16));
console.log('  preout:', bytesToHex(proof.preout));

// 4. Verifier 验证证明
const output = verify(pk, input, proof);

if (output !== null) {
  console.log('\n✅ 验证成功！');
  console.log('VRF 输出:', bytesToHex(output));
} else {
  console.log('\n❌ 验证失败');
}

// 示例 2: 验证确定性
console.log('\n\n=== 示例 2: 验证确定性 ===\n');

// 使用相同的私钥和输入
const r1 = 12345678901234567890n; // 固定随机数
const proof1 = prove(sk, pk, input, r1);
const proof2 = prove(sk, pk, input, r1);

const output1 = verify(pk, input, proof1);
const output2 = verify(pk, input, proof2);

console.log('第一次输出:', bytesToHex(output1!));
console.log('第二次输出:', bytesToHex(output2!));
console.log('输出相同?', bytesToHex(output1!) === bytesToHex(output2!));

// 示例 3: 不同输入产生不同输出
console.log('\n\n=== 示例 3: 不同输入产生不同输出 ===\n');

const input1 = 'input_1';
const input2 = 'input_2';

const proof_a = prove(sk, pk, input1);
const proof_b = prove(sk, pk, input2);

const output_a = verify(pk, input1, proof_a);
const output_b = verify(pk, input2, proof_b);

console.log('输入 1:', input1);
console.log('输出 1:', bytesToHex(output_a!));
console.log('\n输入 2:', input2);
console.log('输出 2:', bytesToHex(output_b!));
console.log('\n输出不同?', bytesToHex(output_a!) !== bytesToHex(output_b!));

// 示例 4: 验证失败的情况
console.log('\n\n=== 示例 4: 验证失败的情况 ===\n');

// 情况 1: 篡改证明
const tamperedProof = { ...proof, c: proof.c + 1n };
const result1 = verify(pk, input, tamperedProof);
console.log('篡改证明验证结果:', result1 === null ? '❌ 失败（符合预期）' : '✅ 成功（不应该）');

// 情况 2: 使用错误的输入
const result2 = verify(pk, 'wrong input', proof);
console.log('错误输入验证结果:', result2 === null ? '❌ 失败（符合预期）' : '✅ 成功（不应该）');

// 情况 3: 使用错误的公钥
const { pk: wrongPk } = generateKeyPair();
const result3 = verify(wrongPk, input, proof);
console.log('错误公钥验证结果:', result3 === null ? '❌ 失败（符合预期）' : '✅ 成功（不应该）');

console.log('\n\n=== 所有示例完成 ===');

