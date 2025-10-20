import { expect } from "chai";
import { prove, verify, generateKeyPair, H_p, H_G } from '../utils/vrf.js';
import { bls12_381 } from '@noble/curves/bls12-381';
import { bytesToHex } from '@noble/hashes/utils';

describe('VRF BLS12-381', () => {
  describe('H_p (Hash to Field)', () => {
    it('应该将输入哈希并 mod p', () => {
      const input = 'test input';
      const result = H_p(input);
      
      // 检查结果是 bigint
      expect(typeof result).to.equal('bigint');
      
      // 检查结果小于曲线的阶
      expect(result).to.be.lessThan(bls12_381.params.r);
      expect(result).to.be.at.least(0n);
    });

    it('相同输入应该产生相同的输出', () => {
      const input = 'deterministic test';
      const result1 = H_p(input);
      const result2 = H_p(input);
      
      expect(result1).to.equal(result2);
    });

    it('不同输入应该产生不同的输出', () => {
      const result1 = H_p('input1');
      const result2 = H_p('input2');
      
      expect(result1).to.not.equal(result2);
    });

    it('应该处理多个输入参数', () => {
      const result = H_p('part1', 'part2', 123n);
      
      expect(typeof result).to.equal('bigint');
      expect(result).to.be.lessThan(bls12_381.params.r);
    });
  });

  describe('H_G (Hash to Curve)', () => {
    it('应该将输入映射到曲线上的点', () => {
      const input = 'test input';
      const point = H_G(input);
      
      // 检查返回的是一个点
      expect(point).to.not.be.undefined;
      
      // 检查点在曲线上
      expect(() => point.assertValidity()).to.not.throw();
    });

    it('相同输入应该产生相同的点', () => {
      const input = 'deterministic test';
      const point1 = H_G(input);
      const point2 = H_G(input);
      
      expect(point1.equals(point2)).to.be.true;
    });

    it('不同输入应该产生不同的点', () => {
      const point1 = H_G('input1');
      const point2 = H_G('input2');
      
      expect(point1.equals(point2)).to.be.false;
    });

    it('应该处理字节数组输入', () => {
      const input = new Uint8Array([1, 2, 3, 4, 5]);
      const point = H_G(input);
      
      expect(point).to.not.be.undefined;
      expect(() => point.assertValidity()).to.not.throw();
    });
  });

  describe('密钥生成', () => {
    it('应该生成有效的密钥对', () => {
      const { sk, pk } = generateKeyPair();
      
      // 检查私钥是 bigint
      expect(typeof sk).to.equal('bigint');
      expect(sk).to.be.greaterThan(0n);
      expect(sk).to.be.lessThan(bls12_381.params.r);
      
      // 检查公钥是曲线上的点
      expect(pk).to.not.be.undefined;
      expect(() => pk.assertValidity()).to.not.throw();
      
      // 验证 pk = sk · G
      const expectedPk = bls12_381.G1.ProjectivePoint.BASE.multiply(sk);
      expect(pk.equals(expectedPk)).to.be.true;
    });

    it('应该生成不同的密钥对', () => {
      const kp1 = generateKeyPair();
      const kp2 = generateKeyPair();
      
      // 不同的调用应该产生不同的密钥
      expect(kp1.sk).to.not.equal(kp2.sk);
      expect(kp1.pk.equals(kp2.pk)).to.be.false;
    });
  });

  describe('VRF Prove 和 Verify', () => {
    it('应该成功证明和验证', () => {
      const { sk, pk } = generateKeyPair();
      const input = 'test message';
      
      // Prover 生成证明
      const proof = prove(sk, pk, input);
      
      expect(proof).to.not.be.undefined;
      expect(proof.c).to.not.be.undefined;
      expect(proof.s_1).to.not.be.undefined;
      expect(proof.preout).to.not.be.undefined;
      expect(typeof proof.c).to.equal('bigint');
      expect(typeof proof.s_1).to.equal('bigint');
      expect(proof.preout instanceof Uint8Array).to.be.true;
      
      // Verifier 验证证明
      const output = verify(pk, input, proof);
      
      expect(output).to.not.be.null;
      expect(output instanceof Uint8Array).to.be.true;
      expect(output!.length).to.equal(32); // keccak256 输出 32 字节
    });

    it('相同的输入和密钥应该产生相同的输出', () => {
      const { sk, pk } = generateKeyPair();
      const input = 'deterministic message';
      
      // 使用相同的随机数 r_1 确保确定性
      const r_1 = 12345678901234567890n;
      
      const proof1 = prove(sk, pk, input, r_1);
      const proof2 = prove(sk, pk, input, r_1);
      
      const output1 = verify(pk, input, proof1);
      const output2 = verify(pk, input, proof2);
      
      expect(output1).to.not.be.null;
      expect(output2).to.not.be.null;
      expect(bytesToHex(output1!)).to.equal(bytesToHex(output2!));
    });

    it('不同的输入应该产生不同的输出', () => {
      const { sk, pk } = generateKeyPair();
      
      const proof1 = prove(sk, pk, 'input1');
      const proof2 = prove(sk, pk, 'input2');
      
      const output1 = verify(pk, 'input1', proof1);
      const output2 = verify(pk, 'input2', proof2);
      
      expect(output1).to.not.be.null;
      expect(output2).to.not.be.null;
      expect(bytesToHex(output1!)).to.not.equal(bytesToHex(output2!));
    });

    it('篡改证明应该导致验证失败', () => {
      const { sk, pk } = generateKeyPair();
      const input = 'test message';
      
      const proof = prove(sk, pk, input);
      
      // 篡改 c
      const tamperedProof1 = { ...proof, c: proof.c + 1n };
      const result1 = verify(pk, input, tamperedProof1);
      expect(result1).to.be.null;
      
      // 篡改 s_1
      const tamperedProof2 = { ...proof, s_1: proof.s_1 + 1n };
      const result2 = verify(pk, input, tamperedProof2);
      expect(result2).to.be.null;
      
      // 篡改 preout - 这会导致无效的点，可能抛出异常
      const tamperedPreout = new Uint8Array(proof.preout);
      tamperedPreout[0] ^= 0xFF; // 翻转第一个字节的位
      const tamperedProof3 = { ...proof, preout: tamperedPreout };
      
      // 验证会因为无效的点而抛出错误或返回 null
      try {
        const result = verify(pk, input, tamperedProof3);
        // 如果没有抛出错误，验证应该失败
        expect(result).to.be.null;
      } catch (e) {
        // 如果抛出错误，这也是预期的行为（无效的点）
        expect(e).to.not.be.undefined;
      }
    });

    it('使用错误的公钥应该导致验证失败', () => {
      const { sk, pk } = generateKeyPair();
      const { pk: wrongPk } = generateKeyPair();
      const input = 'test message';
      
      const proof = prove(sk, pk, input);
      
      // 使用错误的公钥验证
      const result = verify(wrongPk, input, proof);
      expect(result).to.be.null;
    });

    it('使用错误的输入应该导致验证失败', () => {
      const { sk, pk } = generateKeyPair();
      const input = 'test message';
      
      const proof = prove(sk, pk, input);
      
      // 使用错误的输入验证
      const result = verify(pk, 'wrong message', proof);
      expect(result).to.be.null;
    });

    it('应该处理字节数组输入', () => {
      const { sk, pk } = generateKeyPair();
      const input = new Uint8Array([1, 2, 3, 4, 5]);
      
      const proof = prove(sk, pk, input);
      const output = verify(pk, input, proof);
      
      expect(output).to.not.be.null;
      expect(output instanceof Uint8Array).to.be.true;
    });

    it('应该处理长字符串输入', () => {
      const { sk, pk } = generateKeyPair();
      const input = 'a'.repeat(1000);
      
      const proof = prove(sk, pk, input);
      const output = verify(pk, input, proof);
      
      expect(output).to.not.be.null;
    });

    it('应该处理空字符串输入', () => {
      const { sk, pk } = generateKeyPair();
      const input = '';
      
      const proof = prove(sk, pk, input);
      const output = verify(pk, input, proof);
      
      expect(output).to.not.be.null;
    });

    it('应该处理 Unicode 字符', () => {
      const { sk, pk } = generateKeyPair();
      const input = '你好世界 🌍 مرحبا';
      
      const proof = prove(sk, pk, input);
      const output = verify(pk, input, proof);
      
      expect(output).to.not.be.null;
    });
  });

  describe('完整工作流程', () => {
    it('应该完成完整的 VRF 生成和验证流程', () => {
      // 1. 生成密钥对
      const { sk, pk } = generateKeyPair();
      
      // 2. 准备输入
      const input = 'random seed for VRF';
      
      // 3. Prover 生成证明
      const proof = prove(sk, pk, input);
      
      console.log('VRF 证明:');
      console.log('  c:', proof.c.toString(16));
      console.log('  s_1:', proof.s_1.toString(16));
      console.log('  preout:', bytesToHex(proof.preout));
      
      // 4. Verifier 验证并获取随机输出
      const output = verify(pk, input, proof);
      
      expect(output).to.not.be.null;
      console.log('VRF 输出:', bytesToHex(output!));
      
      // 5. 验证输出的确定性
      const output2 = verify(pk, input, proof);
      expect(bytesToHex(output!)).to.equal(bytesToHex(output2!));
    });
  });
});

