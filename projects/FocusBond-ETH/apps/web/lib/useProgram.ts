"use client"

import { useMemo } from 'react'
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react'
import { AnchorProvider } from '@coral-xyz/anchor'
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js'
import idl from '../src/idl/focusbond_program.json'
import { logClientError } from './logClientError'

export function useProgram() {
  const { connection } = useConnection()
  const wallet = useAnchorWallet()

  const program = useMemo(() => {
    if (!wallet) return null
    try {
      const idlObj: any = idl as any
      if (!idlObj || typeof idlObj !== 'object' || !Array.isArray(idlObj.instructions)) {
        logClientError('useProgram:idl', new Error('Invalid IDL shape'))
        return null
      }
      const provider = new AnchorProvider(connection, wallet, {
        commitment: 'confirmed',
      })
      const programId = new PublicKey(
        process.env.NEXT_PUBLIC_PROGRAM_ID || idlObj.address
      )
      
      // 返回一个简化的程序对象，避免 Anchor Program 的 IDL 解析问题
      return {
        programId,
        provider,
        connection,
        wallet,
        // 手动实现指令调用
        methods: {
          startSession: async (targetMinutes: number, depositLamports: number) => {
            const [userPda] = PublicKey.findProgramAddressSync(
              [Buffer.from('user'), wallet.publicKey!.toBuffer()],
              programId
            )
            const [sessionPda] = PublicKey.findProgramAddressSync(
              [Buffer.from('session'), wallet.publicKey!.toBuffer()],
              programId
            )
            const [vaultPda] = PublicKey.findProgramAddressSync(
              [Buffer.from('vault')],
              programId
            )

            const tx = new Transaction()
            tx.add({
              keys: [
                { pubkey: userPda, isSigner: false, isWritable: true },
                { pubkey: sessionPda, isSigner: false, isWritable: true },
                { pubkey: vaultPda, isSigner: false, isWritable: true },
                { pubkey: wallet.publicKey!, isSigner: true, isWritable: true },
                { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
              ],
              programId,
              data: Buffer.concat([
                Buffer.from([23, 227, 111, 142, 212, 230, 3, 175]), // start_session discriminator
                Buffer.from(new Uint16Array([targetMinutes]).buffer), // target_minutes
                Buffer.from(new BigUint64Array([BigInt(depositLamports)]).buffer), // deposit_lamports
              ])
            })

            return await provider.sendAndConfirm(tx)
          },
          breakSession: async () => {
            const [sessionPda] = PublicKey.findProgramAddressSync(
              [Buffer.from('session'), wallet.publicKey!.toBuffer()],
              programId
            )
            const [vaultPda] = PublicKey.findProgramAddressSync(
              [Buffer.from('vault')],
              programId
            )
            const [rewardPoolPda] = PublicKey.findProgramAddressSync(
              [Buffer.from('reward_pool')],
              programId
            )

            const tx = new Transaction()
            tx.add({
              keys: [
                { pubkey: sessionPda, isSigner: false, isWritable: true },
                { pubkey: vaultPda, isSigner: false, isWritable: true },
                { pubkey: rewardPoolPda, isSigner: false, isWritable: true },
                { pubkey: wallet.publicKey!, isSigner: true, isWritable: true },
              ],
              programId,
              data: Buffer.from([219, 148, 236, 179, 112, 52, 97, 68]) // break_session discriminator
            })

            return await provider.sendAndConfirm(tx)
          },
          completeSession: async () => {
            const [userPda] = PublicKey.findProgramAddressSync(
              [Buffer.from('user'), wallet.publicKey!.toBuffer()],
              programId
            )
            const [sessionPda] = PublicKey.findProgramAddressSync(
              [Buffer.from('session'), wallet.publicKey!.toBuffer()],
              programId
            )
            const [vaultPda] = PublicKey.findProgramAddressSync(
              [Buffer.from('vault')],
              programId
            )

            const tx = new Transaction()
            tx.add({
              keys: [
                { pubkey: userPda, isSigner: false, isWritable: true },
                { pubkey: sessionPda, isSigner: false, isWritable: true },
                { pubkey: vaultPda, isSigner: false, isWritable: true },
                { pubkey: wallet.publicKey!, isSigner: true, isWritable: true },
              ],
              programId,
              data: Buffer.from([3, 8, 154, 166, 198, 135, 76, 131]) // complete_session discriminator
            })

            return await provider.sendAndConfirm(tx)
          }
        }
      }
    } catch (e) {
      logClientError('useProgram', e)
      return null
    }
  }, [connection, wallet])

  return program
}

export type FocusbondProgramIdl = typeof idl


