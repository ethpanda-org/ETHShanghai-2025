"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { Search, TrendingUp, Users, FileText, Shield, Eye } from "lucide-react";

// Mock contract data with more transactions
const MOCK_CONTRACTS = [
  {
    id: "contract-a",
    name: "Solar Power Plant",
    network: "Ethereum Mainnet",
    address: "0x1234567890123456789012345678901234567890",
    tokenSupply: "1,000,000",
    holders: "248",
    volume24h: "$45,230",
    pendingAlerts: "2",
    transactions: [
      { id: "0xabc123...", from: "0x742d35Cc7dEa8bc3a5B8C5c82F6c8Cbf4D8a2b1A", to: "0x8ba1f109551bD432803012645Hac136c73c10421", value: "1,500.00", timestamp: "2024-01-15 14:32:15" },
      { id: "0xdef456...", from: "0x9871234567890abcdef1234567890abcdef123456", to: "0x1234567890abcdef1234567890abcdef12345678", value: "750.50", timestamp: "2024-01-15 14:28:42" },
      { id: "0x789xyz...", from: "0xabcdef1234567890abcdef1234567890abcdef12", to: "0x567890abcdef1234567890abcdef1234567890ab", value: "2,250.75", timestamp: "2024-01-15 14:25:18" },
      { id: "0x123def...", from: "0x555666777888999aaabbbcccdddeeefffaaa111", to: "0x222333444555666777888999aaabbbcccdddee", value: "890.25", timestamp: "2024-01-15 14:20:35" },
      { id: "0x456abc...", from: "0xeeefff000111222333444555666777888999aa", to: "0xbbbcccdddeeefffaaa111222333444555666", value: "1,175.80", timestamp: "2024-01-15 14:18:22" },
      { id: "0x789ghi...", from: "0x444555666777888999aaabbbcccdddeeefffaa", to: "0x777888999aaabbbcccdddeeefffaaa111222", value: "650.00", timestamp: "2024-01-15 14:15:47" },
      { id: "0x012jkl...", from: "0x111222333444555666777888999aaabbbcccd", to: "0x999aaabbbcccdddeeefffaaa111222333444", value: "2,800.50", timestamp: "2024-01-15 14:12:33" },
      { id: "0x345mno...", from: "0xaaabbbcccdddeeefffaaa111222333444555", to: "0x666777888999aaabbbcccdddeeefffaaa11", value: "425.75", timestamp: "2024-01-15 14:09:18" },
      { id: "0x678pqr...", from: "0x333444555666777888999aaabbbcccdddee", to: "0xdddeeefffaaa111222333444555666777888", value: "1,950.25", timestamp: "2024-01-15 14:06:52" },
      { id: "0x901stu...", from: "0x888999aaabbbcccdddeeefffaaa11122233", to: "0x555666777888999aaabbbcccdddeeefffaa", value: "775.50", timestamp: "2024-01-15 14:03:27" },
      { id: "0x234vwx...", from: "0xfffaaa111222333444555666777888999aa", to: "0x222333444555666777888999aaabbbcccdd", value: "1,320.00", timestamp: "2024-01-15 14:01:15" },
      { id: "0x567yz1...", from: "0xcccdddeeefffaaa111222333444555666777", to: "0x999aaabbbcccdddeeefffaaa11122233344", value: "2,150.75", timestamp: "2024-01-15 13:58:43" }
    ]
  },
  {
    id: "contract-b",
    name: "Cloud Computing Farm", 
    network: "Polygon Mainnet",
    address: "0x2345678901234567890123456789012345678901",
    tokenSupply: "500,000",
    holders: "156",
    volume24h: "$28,450",
    pendingAlerts: "0",
    transactions: [
      { id: "0x123abc...", from: "0x111222333444555666777888999aaabbbcccddd", to: "0xeeefff000111222333444555666777888999aaa", value: "950.25", timestamp: "2024-01-15 14:30:05" },
      { id: "0x456def...", from: "0xbbbccc111222333444555666777888999aaaeee", to: "0x444555666777888999aaabbbcccdddeeefffaaa", value: "1,200.00", timestamp: "2024-01-15 14:26:33" },
      { id: "0x789ghi...", from: "0x777888999aaabbbcccdddeeefffaaa111222333", to: "0x333444555666777888999aaabbbcccdddeee", value: "675.50", timestamp: "2024-01-15 14:23:18" },
      { id: "0x012jkl...", from: "0xdddeeefffaaa111222333444555666777888", to: "0x888999aaabbbcccdddeeefffaaa11122233", value: "1,485.75", timestamp: "2024-01-15 14:19:42" },
      { id: "0x345mno...", from: "0x555666777888999aaabbbcccdddeeefffaaa", to: "0xaaabbbcccdddeeefffaaa11122233344455", value: "820.00", timestamp: "2024-01-15 14:16:27" },
      { id: "0x678pqr...", from: "0x222333444555666777888999aaabbbcccdd", to: "0x666777888999aaabbbcccdddeeefffaaa1", value: "1,750.25", timestamp: "2024-01-15 14:13:55" },
      { id: "0x901stu...", from: "0x999aaabbbcccdddeeefffaaa111222333444", to: "0x444555666777888999aaabbbcccdddeee", value: "535.80", timestamp: "2024-01-15 14:10:31" },
      { id: "0x234vwx...", from: "0xfffaaa111222333444555666777888999a", to: "0x777888999aaabbbcccdddeeefffaaa111", value: "2,100.50", timestamp: "2024-01-15 14:07:16" },
      { id: "0x567yz1...", from: "0xcccdddeeefffaaa111222333444555666", to: "0x111222333444555666777888999aaabbb", value: "925.25", timestamp: "2024-01-15 14:04:48" },
      { id: "0x890abc...", from: "0x888999aaabbbcccdddeeefffaaa1112223", to: "0x555666777888999aaabbbcccdddeeefff", value: "1,375.00", timestamp: "2024-01-15 14:01:22" },
      { id: "0x123def...", from: "0x333444555666777888999aaabbbcccddd", to: "0xdddeeefffaaa111222333444555666777", value: "680.75", timestamp: "2024-01-15 13:58:09" }
    ]
  },
  {
    id: "contract-c",
    name: "Wind Turbine Farm",
    network: "BSC Mainnet", 
    address: "0x3456789012345678901234567890123456789012",
    tokenSupply: "2,000,000",
    holders: "892",
    volume24h: "$125,680",
    pendingAlerts: "5",
    transactions: [
      { id: "0x789ghi...", from: "0x999888777666555444333222111000fffeeedd", to: "0x123456789abcdef0123456789abcdef012345678", value: "3,750.50", timestamp: "2024-01-15 14:35:12" },
      { id: "0xabc123...", from: "0xfedcba9876543210fedcba9876543210fedcba98", to: "0x0987654321098765432109876543210987654321", value: "680.25", timestamp: "2024-01-15 14:31:47" },
      { id: "0xdef456...", from: "0x1111aaaa2222bbbb3333cccc4444dddd5555eeee", to: "0x6666ffff7777aaaa8888bbbb9999cccc0000dddd", value: "1,875.00", timestamp: "2024-01-15 14:29:23" },
      { id: "0x987fed...", from: "0x5555666677778888999aaaabbbbccccddddeee", to: "0xeeeeffff0000111122223333444455556666777", value: "2,450.75", timestamp: "2024-01-15 14:26:35" },
      { id: "0x654cba...", from: "0x1122334455667788999aaabbccddeefffaaa111", to: "0xbbbcccdddeeefffaaa111222333444555666777", value: "1,320.50", timestamp: "2024-01-15 14:23:18" },
      { id: "0x321abc...", from: "0x3333444455556666777788889999aaaabbbbccc", to: "0xfffeeeddddcccbbbbaaaa9999888877776666555", value: "890.25", timestamp: "2024-01-15 14:20:42" },
      { id: "0x098def...", from: "0x7777888899990000aaaabbbbccccddddeeeefff", to: "0x2222333344445555666677778888999aaaabbb", value: "3,200.00", timestamp: "2024-01-15 14:17:56" },
      { id: "0x765ghi...", from: "0xccccddddeeeeffffaaaa1111222233334444555", to: "0x5555666677778888999aaaabbbbccccddddeee", value: "1,650.75", timestamp: "2024-01-15 14:14:29" },
      { id: "0x432jkl...", from: "0x9999aaaabbbbccccddddeeeeffff00001111222", to: "0x8888999900001111222233334444555566667", value: "750.50", timestamp: "2024-01-15 14:11:17" },
      { id: "0x109mno...", from: "0x4444555566667777888899990000aaaabbbbcc", to: "0x1111222233334444555566667777888899990", value: "2,825.25", timestamp: "2024-01-15 14:08:33" },
      { id: "0x876pqr...", from: "0xffffeeeedddddcccccbbbbbaaaaa99999888877", to: "0x6666777788889999000011112222333344445", value: "1,175.00", timestamp: "2024-01-15 14:05:48" },
      { id: "0x543stu...", from: "0x0000111122223333444455556666777788889", to: "0xddddeeeeffffaaaabbbbccccddddeeeeffff0", value: "2,950.75", timestamp: "2024-01-15 14:02:15" }
    ]
  },
  {
    id: "contract-d",
    name: "Battery Storage",
    network: "Arbitrum One",
    address: "0x4567890123456789012345678901234567890123",
    tokenSupply: "750,000",
    holders: "324",
    volume24h: "$67,890",
    pendingAlerts: "1",
    transactions: [
      { id: "0x654jkl...", from: "0xaaabbbcccdddeeefffaaa111222333444555666", to: "0x777888999aaabbbcccdddeeefffaaa111222333", value: "2,100.75", timestamp: "2024-01-15 14:33:28" },
      { id: "0x321mno...", from: "0x444555666777888999aaabbbcccdddeeefffaa", to: "0x111222333444555666777888999aaabbbccc", value: "1,450.50", timestamp: "2024-01-15 14:30:12" },
      { id: "0x987pqr...", from: "0xeeefff000111222333444555666777888999", to: "0x555666777888999aaabbbcccdddeeefffaa", value: "875.25", timestamp: "2024-01-15 14:27:45" },
      { id: "0x654stu...", from: "0x222333444555666777888999aaabbbcccddd", to: "0x888999aaabbbcccdddeeefffaaa11122233", value: "1,825.00", timestamp: "2024-01-15 14:24:33" },
      { id: "0x210vwx...", from: "0x666777888999aaabbbcccdddeeefffaaa11", to: "0x333444555666777888999aaabbbcccddde", value: "950.75", timestamp: "2024-01-15 14:21:18" },
      { id: "0x876yz1...", from: "0x999aaabbbcccdddeeefffaaa11122233344", to: "0xdddeeefffaaa111222333444555666777", value: "2,375.50", timestamp: "2024-01-15 14:18:52" },
      { id: "0x543abc...", from: "0xfffaaa111222333444555666777888999", to: "0x777888999aaabbbcccdddeeefffaaa111", value: "675.25", timestamp: "2024-01-15 14:15:27" },
      { id: "0x109def...", from: "0xcccdddeeefffaaa111222333444555666", to: "0x444555666777888999aaabbbcccdddeee", value: "1,725.00", timestamp: "2024-01-15 14:12:35" },
      { id: "0x765ghi...", from: "0x888999aaabbbcccdddeeefffaaa111222", to: "0x111222333444555666777888999aaabbb", value: "1,050.75", timestamp: "2024-01-15 14:09:18" },
      { id: "0x432jkl...", from: "0x555666777888999aaabbbcccdddeeefffaa", to: "0xaaabbbcccdddeeefffaaa11122233344455", value: "2,650.50", timestamp: "2024-01-15 14:06:42" },
      { id: "0x098mno...", from: "0x222333444555666777888999aaabbbccc", to: "0x666777888999aaabbbcccdddeeefffaaa", value: "825.25", timestamp: "2024-01-15 14:03:16" }
    ]
  },
  {
    id: "contract-e",
    name: "Hydroelectric Dam",
    network: "Avalanche C-Chain",
    address: "0x5678901234567890123456789012345678901234",
    tokenSupply: "1,250,000",
    holders: "567",
    volume24h: "$89,320",
    pendingAlerts: "3",
    transactions: [
      { id: "0x987mno...", from: "0xdddeeefffaaabbbcccdddeeefffaaabbbcccddd", to: "0x444555666777888999aaabbbcccdddeeefffaaa", value: "1,450.00", timestamp: "2024-01-15 14:34:15" },
      { id: "0xfed321...", from: "0x5555666677778888999aaaabbbbccccddddeee", to: "0xeeeeffff0000111122223333444455556666777", value: "825.50", timestamp: "2024-01-15 14:27:08" },
      { id: "0x654abc...", from: "0x1122334455667788999aaabbccddeefffaaa111", to: "0xbbbcccdddeeefffaaa111222333444555666777", value: "2,275.75", timestamp: "2024-01-15 14:31:42" },
      { id: "0x321def...", from: "0x3333444455556666777788889999aaaabbbbccc", to: "0xfffeeeddddcccbbbbaaaa9999888877776666555", value: "950.25", timestamp: "2024-01-15 14:28:17" },
      { id: "0x098ghi...", from: "0x7777888899990000aaaabbbbccccddddeeeefff", to: "0x2222333344445555666677778888999aaaabbb", value: "1,675.00", timestamp: "2024-01-15 14:24:53" },
      { id: "0x765jkl...", from: "0xccccddddeeeeffffaaaa1111222233334444555", to: "0x5555666677778888999aaaabbbbccccddddeee", value: "1,125.50", timestamp: "2024-01-15 14:21:26" },
      { id: "0x432mno...", from: "0x9999aaaabbbbccccddddeeeeffff00001111222", to: "0x8888999900001111222233334444555566667", value: "2,850.25", timestamp: "2024-01-15 14:18:39" },
      { id: "0x109pqr...", from: "0x4444555566667777888899990000aaaabbbbcc", to: "0x1111222233334444555566667777888899990", value: "675.75", timestamp: "2024-01-15 14:15:12" },
      { id: "0x876stu...", from: "0xffffeeeedddddcccccbbbbbaaaaa99999888877", to: "0x6666777788889999000011112222333344445", value: "1,925.00", timestamp: "2024-01-15 14:11:48" },
      { id: "0x543vwx...", from: "0x0000111122223333444455556666777788889", to: "0xddddeeeeffffaaaabbbbccccddddeeeeffff0", value: "1,350.50", timestamp: "2024-01-15 14:08:21" },
      { id: "0x210yz1...", from: "0xaaaa1111222233334444555566667777888899", to: "0x9999000011112222333344445555666677778", value: "775.25", timestamp: "2024-01-15 14:04:57" },
      { id: "0x987abc...", from: "0x6666777788889999aaaabbbbccccddddeeeeff", to: "0x3333444455556666777788889999aaaabbbb", value: "2,425.75", timestamp: "2024-01-15 14:01:33" }
    ]
  },
  {
    id: "contract-f",
    name: "Data Center Network",
    network: "Optimism",
    address: "0x6789012345678901234567890123456789012345",
    tokenSupply: "300,000",
    holders: "89",
    volume24h: "$12,450",
    pendingAlerts: "0",
    transactions: [
      { id: "0x321fed...", from: "0x9999aaaabbbbccccddddeeeeffff0000111122", to: "0x2222333344445555666677778888999aaaabbb", value: "560.25", timestamp: "2024-01-15 14:36:42" },
      { id: "0x654abc...", from: "0x4444555566667777888899990000aaaabbbbcc", to: "0x1111222233334444555566667777888899990", value: "825.50", timestamp: "2024-01-15 14:33:15" },
      { id: "0x987def...", from: "0xffffeeeedddddcccccbbbbbaaaaa99999888877", to: "0x6666777788889999000011112222333344445", value: "1,150.75", timestamp: "2024-01-15 14:29:48" },
      { id: "0x210ghi...", from: "0x0000111122223333444455556666777788889", to: "0xddddeeeeffffaaaabbbbccccddddeeeeffff0", value: "675.00", timestamp: "2024-01-15 14:26:22" },
      { id: "0x543jkl...", from: "0xaaaa1111222233334444555566667777888899", to: "0x9999000011112222333344445555666677778", value: "1,425.25", timestamp: "2024-01-15 14:22:57" },
      { id: "0x876mno...", from: "0x6666777788889999aaaabbbbccccddddeeeeff", to: "0x3333444455556666777788889999aaaabbbb", value: "950.50", timestamp: "2024-01-15 14:19:31" },
      { id: "0x109pqr...", from: "0x2222333344445555666677778888999aaaabbb", to: "0x8888999900001111222233334444555566667", value: "720.75", timestamp: "2024-01-15 14:16:16" },
      { id: "0x432stu...", from: "0x5555666677778888999aaaabbbbccccddddeee", to: "0xeeeeffff0000111122223333444455556666777", value: "1,875.00", timestamp: "2024-01-15 14:12:43" },
      { id: "0x765vwx...", from: "0x1111222233334444555566667777888899990", to: "0x7777888899990000aaaabbbbccccddddeeeefff", value: "625.25", timestamp: "2024-01-15 14:09:18" },
      { id: "0x098yz1...", from: "0xccccddddeeeeffffaaaa1111222233334444555", to: "0x4444555566667777888899990000aaaabbbbcc", value: "1,320.50", timestamp: "2024-01-15 14:05:52" },
      { id: "0x321abc...", from: "0x9999aaaabbbbccccddddeeeeffff00001111222", to: "0x0000111122223333444455556666777788889", value: "785.75", timestamp: "2024-01-15 14:02:27" }
    ]
  },
  {
    id: "contract-g",
    name: "Geothermal Plant",
    network: "Base",
    address: "0x7890123456789012345678901234567890123456",
    tokenSupply: "850,000",
    holders: "412",
    volume24h: "$58,720",
    pendingAlerts: "2",
    transactions: [
      { id: "0x654cba...", from: "0x1122334455667788999aaabbccddeefffaaa111", to: "0xbbbcccdddeeefffaaa111222333444555666777", value: "1,320.75", timestamp: "2024-01-15 14:38:19" },
      { id: "0x987bcd...", from: "0x3333444455556666777788889999aaaabbbbccc", to: "0xfffeeeddddcccbbbbaaaa9999888877776666555", value: "720.00", timestamp: "2024-01-15 14:24:55" },
      { id: "0x321efg...", from: "0x7777888899990000aaaabbbbccccddddeeeefff", to: "0x2222333344445555666677778888999aaaabbb", value: "2,150.50", timestamp: "2024-01-15 14:35:12" },
      { id: "0x654hij...", from: "0xccccddddeeeeffffaaaa1111222233334444555", to: "0x5555666677778888999aaaabbbbccccddddeee", value: "875.25", timestamp: "2024-01-15 14:31:47" },
      { id: "0x987klm...", from: "0x9999aaaabbbbccccddddeeeeffff00001111222", to: "0x8888999900001111222233334444555566667", value: "1,650.00", timestamp: "2024-01-15 14:28:33" },
      { id: "0x210nop...", from: "0x4444555566667777888899990000aaaabbbbcc", to: "0x1111222233334444555566667777888899990", value: "925.75", timestamp: "2024-01-15 14:25:18" },
      { id: "0x543qrs...", from: "0xffffeeeedddddcccccbbbbbaaaaa99999888877", to: "0x6666777788889999000011112222333344445", value: "2,475.25", timestamp: "2024-01-15 14:21:52" },
      { id: "0x876tuv...", from: "0x0000111122223333444455556666777788889", to: "0xddddeeeeffffaaaabbbbccccddddeeeeffff0", value: "1,125.50", timestamp: "2024-01-15 14:18:27" },
      { id: "0x109wxy...", from: "0xaaaa1111222233334444555566667777888899", to: "0x9999000011112222333344445555666677778", value: "750.00", timestamp: "2024-01-15 14:15:13" },
      { id: "0x432z12...", from: "0x6666777788889999aaaabbbbccccddddeeeeff", to: "0x3333444455556666777788889999aaaabbbb", value: "1,875.75", timestamp: "2024-01-15 14:11:48" },
      { id: "0x765345...", from: "0x2222333344445555666677778888999aaaabbb", to: "0x8888999900001111222233334444555566667", value: "1,050.25", timestamp: "2024-01-15 14:08:22" },
      { id: "0x098678...", from: "0x5555666677778888999aaaabbbbccccddddeee", to: "0xeeeeffff0000111122223333444455556666777", value: "2,325.00", timestamp: "2024-01-15 14:04:57" }
    ]
  },
  {
    id: "contract-h",
    name: "AI Computing Cluster",
    network: "Polygon zkEVM",
    address: "0x8901234567890123456789012345678901234567",
    tokenSupply: "1,500,000",
    holders: "634",
    volume24h: "$94,560",
    pendingAlerts: "4",
    transactions: [
      { id: "0xaaa111...", from: "0x6666777788889999aaaabbbbccccddddeeeefff", to: "0x0000111122223333444455556666777788889", value: "2,850.50", timestamp: "2024-01-15 14:37:33" },
      { id: "0xbbb222...", from: "0xccccddddeeeeffffaaaa1111222233334444555", to: "0x5555666677778888999aaaabbbbccccddddeee", value: "1,175.25", timestamp: "2024-01-15 14:22:17" },
      { id: "0xccc333...", from: "0x9999aaaabbbbccccddddeeeeffff00001111222", to: "0x8888999900001111222233334444555566667", value: "3,200.75", timestamp: "2024-01-15 14:34:48" },
      { id: "0xddd444...", from: "0x4444555566667777888899990000aaaabbbbcc", to: "0x1111222233334444555566667777888899990", value: "950.00", timestamp: "2024-01-15 14:31:22" },
      { id: "0xeee555...", from: "0xffffeeeedddddcccccbbbbbaaaaa99999888877", to: "0x6666777788889999000011112222333344445", value: "1,725.50", timestamp: "2024-01-15 14:28:15" },
      { id: "0xfff666...", from: "0x0000111122223333444455556666777788889", to: "0xddddeeeeffffaaaabbbbccccddddeeeeffff0", value: "875.25", timestamp: "2024-01-15 14:24:47" },
      { id: "0x111777...", from: "0xaaaa1111222233334444555566667777888899", to: "0x9999000011112222333344445555666677778", value: "2,450.00", timestamp: "2024-01-15 14:21:33" },
      { id: "0x222888...", from: "0x6666777788889999aaaabbbbccccddddeeeeff", to: "0x3333444455556666777788889999aaaabbbb", value: "1,350.75", timestamp: "2024-01-15 14:18:19" },
      { id: "0x333999...", from: "0x2222333344445555666677778888999aaaabbb", to: "0x8888999900001111222233334444555566667", value: "775.50", timestamp: "2024-01-15 14:14:52" },
      { id: "0x444000...", from: "0x5555666677778888999aaaabbbbccccddddeee", to: "0xeeeeffff0000111122223333444455556666777", value: "3,075.25", timestamp: "2024-01-15 14:11:26" },
      { id: "0x555aaa...", from: "0x1111222233334444555566667777888899990", to: "0x7777888899990000aaaabbbbccccddddeeeefff", value: "1,625.00", timestamp: "2024-01-15 14:08:13" },
      { id: "0x666bbb...", from: "0xccccddddeeeeffffaaaa1111222233334444555", to: "0x4444555566667777888899990000aaaabbbbcc", value: "2,925.75", timestamp: "2024-01-15 14:04:39" }
    ]
  }
];

export function DashboardOverview() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContract, setSelectedContract] = useState(MOCK_CONTRACTS[0]);
  const [activeReportTab, setActiveReportTab] = useState<"monthly" | "sar">("monthly");
  const [reportedItems, setReportedItems] = useState<Set<string>>(new Set());
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [activeChart, setActiveChart] = useState<string | null>(null); // Track which chart is active
  const lineChartRef = useRef<HTMLDivElement>(null);
  const doughnutChartRef = useRef<HTMLDivElement>(null);

  const handleReport = (reportId: string, targetType: "exchange" | "regulatory") => {
    setReportedItems(prev => {
      const newSet = new Set(prev);
      newSet.add(reportId);
      return newSet;
    });
    setReportDialogOpen(false); // Auto close dialog after selection
  };

  const handlePreview = async (type: "monthly" | "sar", contractName: string) => {
    try {
      const filePath = type === "monthly" ? "/markdowns/Monthly.md" : "/markdowns/SAR.md";
      const response = await fetch(filePath);
      if (response.ok) {
        const content = await response.text();
        setPreviewContent(content);
        setPreviewTitle(`${contractName} ${type === "monthly" ? "Monthly Report" : "SAR"} Preview`);
        setPreviewDialogOpen(true);
      }
    } catch (error) {
      console.error("Failed to load preview content:", error);
    }
  };

  const filteredContracts = MOCK_CONTRACTS.filter(contract => {
    return contract.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           contract.network.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Simple CSS-based charts using SVG
  const LineChart = () => {
    const data = [32000, 42000, 38000, 51000, 45000, 48000, 52000];
    const maxValue = Math.max(...data);
    const labels = ['Jan 9', 'Jan 10', 'Jan 11', 'Jan 12', 'Jan 13', 'Jan 14', 'Jan 15'];
    const chartWidth = 280;
    const chartHeight = 120;
    const chartPadding = { top: 20, right: 10, bottom: 20, left: 10 };
    const startX = chartPadding.left;
    const startY = chartPadding.top + chartHeight;

    // Calculate points for line chart
    const points = data.map((value, index) => {
      const x = startX + (index / (data.length - 1)) * chartWidth;
      const y = startY - (value / maxValue) * chartHeight;
      return { x, y, value, label: labels[index] };
    });

    const pointsString = points.map(p => `${p.x},${p.y}`).join(' ');

    // State for hover interaction
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

    // Handle mouse enter with active chart management
    const handleMouseEnter = (index: number) => {
      setActiveChart("line");
      setHoveredPoint(index);
    };

    // Handle mouse leave with active chart management
    const handleMouseLeave = () => {
      setHoveredPoint(null);
      // Only reset activeChart if it's currently the line chart
      if (activeChart === "line") {
        setActiveChart(null);
      }
    };

    return (
      <div className="h-48 w-full relative">
        <svg width="100%" height="100%" viewBox="0 0 300 160" className="absolute inset-0">
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0.0)" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map(i => (
            <line
              key={i}
              x1={chartPadding.left}
              y1={chartPadding.top + i * 30}
              x2={startX + chartWidth}
              y2={chartPadding.top + i * 30}
              stroke="#f3f4f6"
              strokeWidth="1"
            />
          ))}

          {/* Area fill */}
          <polygon
            points={`${startX},${startY} ${pointsString} ${startX + chartWidth},${startY}`}
            fill="url(#areaGradient)"
          />

          {/* Line */}
          <polyline
            points={pointsString}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points with hover effect */}
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r={hoveredPoint === index ? "6" : "3"}
                fill="#3b82f6"
                stroke="#fff"
                strokeWidth="2"
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseLeave={handleMouseLeave}
                filter={hoveredPoint === index && activeChart === "line" ? "url(#glow)" : ""}
              />

              {/* Tooltip - only show if this chart is active */}
              {hoveredPoint === index && activeChart === "line" && (
                <g>
                  <rect
                    x={point.x - 40}
                    y={point.y - 35}
                    width="80"
                    height="25"
                    fill="#1f2937"
                    rx="4"
                    stroke="#374151"
                    strokeWidth="1"
                  />
                  <text
                    x={point.x}
                    y={point.y - 18}
                    textAnchor="middle"
                    fill="white"
                    fontSize="11"
                    fontWeight="500"
                  >
                    ${point.value.toLocaleString()}
                  </text>
                  <text
                    x={point.x}
                    y={point.y - 5}
                    textAnchor="middle"
                    fill="#9ca3af"
                    fontSize="9"
                  >
                    {point.label}
                  </text>
                </g>
              )}
            </g>
          ))}
        </svg>

        {/* X-axis labels */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-between px-3 text-xs text-muted-foreground">
          {labels.map((label, i) => (
            <span
              key={i}
              className={`transition-colors duration-200 ${hoveredPoint === i && activeChart === "line" ? 'text-primary font-medium' : ''}`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const DoughnutChart = () => {
    const data = [
      { name: 'Retail Holders', value: 45, color: '#3b82f6' },
      { name: 'Institutional', value: 25, color: '#10b981' },
      { name: 'Treasury', value: 20, color: '#f59e0b' },
      { name: 'Locked', value: 10, color: '#ef4444' }
    ];

    const radius = 50; // Reduced radius to make more room
    const innerRadius = 25; // Reduced inner radius proportionally
    const centerX = 100;
    const centerY = 50; // Moved center up to make room for legend

    // State for hover interaction
    const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);

    // Handle mouse enter with active chart management
    const handleMouseEnter = (index: number) => {
      setActiveChart("doughnut");
      setHoveredSegment(index);
    };

    // Handle mouse leave with active chart management
    const handleMouseLeave = () => {
      setHoveredSegment(null);
      // Only reset activeChart if it's currently the doughnut chart
      if (activeChart === "doughnut") {
        setActiveChart(null);
      }
    };

    // Calculate paths for each segment
    const segments = data.map((item, index) => {
      const startAngle = data.slice(0, index).reduce((sum, prev) => sum + (prev.value / 100) * 360, -90);
      const angle = (item.value / 100) * 360;
      const endAngle = startAngle + angle;

      const startAngleRad = (startAngle * Math.PI) / 180;
      const endAngleRad = (endAngle * Math.PI) / 180;

      const x1 = centerX + radius * Math.cos(startAngleRad);
      const y1 = centerY + radius * Math.sin(startAngleRad);
      const x2 = centerX + radius * Math.cos(endAngleRad);
      const y2 = centerY + radius * Math.sin(endAngleRad);

      const x3 = centerX + innerRadius * Math.cos(startAngleRad);
      const y3 = centerY + innerRadius * Math.sin(startAngleRad);
      const x4 = centerX + innerRadius * Math.cos(endAngleRad);
      const y4 = centerY + innerRadius * Math.sin(endAngleRad);

      const largeArc = angle > 180 ? 1 : 0;

      const pathData = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${x4} ${y4}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x3} ${y3}`,
        'Z'
      ].join(' ');

      // Calculate center point for tooltip
      const midAngleRad = ((startAngle + angle / 2) * Math.PI) / 180;
      const tooltipX = centerX + (radius + 15) * Math.cos(midAngleRad);
      const tooltipY = centerY + (radius + 15) * Math.sin(midAngleRad);

      return {
        pathData,
        item,
        index,
        tooltipX,
        tooltipY,
        midAngleRad
      };
    });

    return (
      <div className="h-48 w-full relative">
        <svg width="100%" height="70%" viewBox="0 0 200 120" className="absolute top-0 left-0">
          <defs>
            <filter id="dropShadow">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2"/>
            </filter>
          </defs>

          {segments.map((segment) => (
            <g key={segment.index}>
              <path
                d={segment.pathData}
                fill={segment.item.color}
                stroke="#fff"
                strokeWidth="2"
                className="cursor-pointer transition-all duration-200"
                style={{
                  filter: hoveredSegment === segment.index && activeChart === "doughnut" ? "url(#dropShadow)" : "",
                  transform: hoveredSegment === segment.index && activeChart === "doughnut" ? "scale(1.05)" : "scale(1)",
                  transformOrigin: `${centerX}px ${centerY}px`,
                  opacity: hoveredSegment === null || hoveredSegment === segment.index ? 1 : 0.7
                }}
                onMouseEnter={() => handleMouseEnter(segment.index)}
                onMouseLeave={handleMouseLeave}
              />

              {/* Tooltip - only show if this chart is active */}
              {hoveredSegment === segment.index && activeChart === "doughnut" && (
                <g>
                  <rect
                    x={segment.tooltipX - 35}
                    y={segment.tooltipY - 20}
                    width="70"
                    height="30"
                    fill="#1f2937"
                    rx="4"
                    stroke="#374151"
                    strokeWidth="1"
                    filter="url(#dropShadow)"
                  />
                  <text
                    x={segment.tooltipX}
                    y={segment.tooltipY - 5}
                    textAnchor="middle"
                    fill="white"
                    fontSize="11"
                    fontWeight="500"
                  >
                    {segment.item.name}
                  </text>
                  <text
                    x={segment.tooltipX}
                    y={segment.tooltipY + 8}
                    textAnchor="middle"
                    fill="#9ca3af"
                    fontSize="9"
                  >
                    {segment.item.value}%
                  </text>
                </g>
              )}
            </g>
          ))}
        </svg>

        {/* Legend with hover effects - positioned below the chart */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-wrap justify-center gap-3 text-xs">
          {data.map((item, index) => (
            <div
              key={index}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-200 cursor-pointer ${
                hoveredSegment === index && activeChart === "doughnut" ? 'bg-muted/80 shadow-sm' : 'hover:bg-muted/40'
              }`}
              onMouseEnter={() => handleMouseEnter(index)}
              onMouseLeave={handleMouseLeave}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                  hoveredSegment === index && activeChart === "doughnut" ? 'scale-125' : ''
                }`}
                style={{ backgroundColor: item.color }}
              />
              <span className={`transition-colors duration-200 ${
                hoveredSegment === index && activeChart === "doughnut" ? 'text-foreground font-medium' : 'text-muted-foreground'
              }`}>
                {item.name}
              </span>
              <span className={`text-muted-foreground transition-colors duration-200 ${
                hoveredSegment === index && activeChart === "doughnut" ? 'text-primary' : ''
              }`}>
                {item.value}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[0.3fr_0.7fr]">
        {/* Left side - Contract tabs */}
        <Card className="border-muted-foreground/20">
          <CardHeader>
            <div className="space-y-4">
              {/* Search box */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search contracts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Contract tabs */}
            <div className="space-y-2">
              {filteredContracts.map((contract) => (
                <button
                  key={contract.id}
                  onClick={() => setSelectedContract(contract)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedContract.id === contract.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="font-medium">{contract.name}</div>
                  <div className="text-sm text-muted-foreground">{contract.network}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right side - Contract details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{selectedContract.name}</CardTitle>
            <CardDescription className="font-mono text-sm">
              {selectedContract.address}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg border bg-card p-3">
                <div className="text-2xl font-bold">{selectedContract.tokenSupply}</div>
                <div className="text-sm text-muted-foreground">Token Supply</div>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <div className="text-2xl font-bold">{selectedContract.holders}</div>
                <div className="text-sm text-muted-foreground">Holders</div>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <div className="text-2xl font-bold">{selectedContract.volume24h}</div>
                <div className="text-sm text-muted-foreground">24h Volume</div>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <div className="text-2xl font-bold">{selectedContract.pendingAlerts}</div>
                <div className="text-sm text-muted-foreground">Risk Tx</div>
              </div>
            </div>

            {/* Reports section */}
            <div>
              <h3 className="mb-4 text-lg font-medium">Reports</h3>
              <div className="mb-4 border-b">
                <nav className="flex space-x-8">
                  <button
                    onClick={() => setActiveReportTab("monthly")}
                    className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeReportTab === "monthly"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FileText className="inline h-4 w-4 mr-2" />
                    Monthly Report
                  </button>
                  <button
                    onClick={() => setActiveReportTab("sar")}
                    className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeReportTab === "sar"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Shield className="inline h-4 w-4 mr-2" />
                    Suspicious Activity Report
                  </button>
                </nav>
              </div>

              {/* Report content */}
              <div className="overflow-hidden rounded-lg border">
                <div className="max-h-96 overflow-y-auto">
                  {activeReportTab === "monthly" && (
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-background text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-medium">Project Name</th>
                          <th className="px-4 py-3 font-medium">Report Type</th>
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t">
                          <td className="px-4 py-3 font-medium">{selectedContract.name} Sep Report</td>
                          <td className="px-4 py-3 text-muted-foreground">Monthly</td>
                          <td className="px-4 py-3 text-muted-foreground">Sep 1, 2025</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePreview("monthly", selectedContract.name)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                              <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    disabled={reportedItems.has(`${selectedContract.id}-monthly-sep`)}
                                  >
                                    {reportedItems.has(`${selectedContract.id}-monthly-sep`) ? "Reported" : "Report"}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Report to Authority</DialogTitle>
                                    <DialogDescription>
                                      Choose where you want to submit this report
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="flex gap-4 mt-4">
                                    <Button
                                      onClick={() => handleReport(`${selectedContract.id}-monthly-sep`, "exchange")}
                                      className="flex-1"
                                    >
                                      Exchange
                                    </Button>
                                    <Button
                                      onClick={() => handleReport(`${selectedContract.id}-monthly-sep`, "regulatory")}
                                      className="flex-1"
                                      variant="outline"
                                    >
                                      Regulatory Agency
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}

                  {activeReportTab === "sar" && (
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-background text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 font-medium">Project Name</th>
                          <th className="px-4 py-3 font-medium">Risk Type</th>
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t">
                          <td className="px-4 py-3 font-medium">{selectedContract.name} SAR</td>
                          <td className="px-4 py-3 text-muted-foreground">Mixer</td>
                          <td className="px-4 py-3 text-muted-foreground">Sep 1, 2025</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePreview("sar", selectedContract.name)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                              <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    disabled={reportedItems.has(`${selectedContract.id}-sar-mixer`)}
                                  >
                                    {reportedItems.has(`${selectedContract.id}-sar-mixer`) ? "Reported" : "Report"}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Report to Authority</DialogTitle>
                                    <DialogDescription>
                                      Choose where you want to submit this report
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="flex gap-4 mt-4">
                                    <Button
                                      onClick={() => handleReport(`${selectedContract.id}-sar-mixer`, "exchange")}
                                      className="flex-1"
                                    >
                                      Exchange
                                    </Button>
                                    <Button
                                      onClick={() => handleReport(`${selectedContract.id}-sar-mixer`, "regulatory")}
                                      className="flex-1"
                                      variant="outline"
                                    >
                                      Regulatory Agency
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </td>
                        </tr>
                        <tr className="border-t">
                          <td className="px-4 py-3 font-medium">{selectedContract.name} SAR</td>
                          <td className="px-4 py-3 text-muted-foreground">Hacker</td>
                          <td className="px-4 py-3 text-muted-foreground">Sep 1, 2025</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePreview("sar", selectedContract.name)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Preview
                              </Button>
                              <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    disabled={reportedItems.has(`${selectedContract.id}-sar-hacker`)}
                                  >
                                    {reportedItems.has(`${selectedContract.id}-sar-hacker`) ? "Reported" : "Report"}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Report to Authority</DialogTitle>
                                    <DialogDescription>
                                      Choose where you want to submit this report
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="flex gap-4 mt-4">
                                    <Button
                                      onClick={() => handleReport(`${selectedContract.id}-sar-hacker`, "exchange")}
                                      className="flex-1"
                                    >
                                      Exchange
                                    </Button>
                                    <Button
                                      onClick={() => handleReport(`${selectedContract.id}-sar-hacker`, "regulatory")}
                                      className="flex-1"
                                      variant="outline"
                                    >
                                      Regulatory Agency
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Transactions table */}
            <div>
              <h3 className="mb-4 text-lg font-medium">Transactions</h3>
              <div className="overflow-hidden rounded-lg border">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-background text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Transaction ID</th>
                        <th className="px-4 py-3 font-medium">From</th>
                        <th className="px-4 py-3 font-medium">To</th>
                        <th className="px-4 py-3 font-medium">Value</th>
                        <th className="px-4 py-3 font-medium">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedContract.transactions.map((tx) => (
                        <tr key={tx.id} className="border-t">
                          <td className="px-4 py-3 font-mono text-xs">
                            {tx.id}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                            {tx.from.slice(0, 6)}...{tx.from.slice(-4)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                            {tx.to.slice(0, 6)}...{tx.to.slice(-4)}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {tx.value}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {tx.timestamp}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Charts section - moved below transactions */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Tx Volume Over Time
                  </CardTitle>
                  <CardDescription>Last 7 Days +8.5%</CardDescription>
                </CardHeader>
                <CardContent>
                  <LineChart />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Holders Distribution
                  </CardTitle>
                  <CardDescription>Current +2.3%</CardDescription>
                </CardHeader>
                <CardContent>
                  <DoughnutChart />
                </CardContent>
              </Card>
            </div>

            {/* Preview Dialog */}
            <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{previewTitle}</DialogTitle>
                  <DialogDescription>
                    Preview of the report content
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4">
                  <MarkdownRenderer content={previewContent} />
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}