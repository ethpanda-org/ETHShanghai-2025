"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { getBuiltGraphSDK } from "~~/.graphclient";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const ProfilePage = () => {
  const { address: connectedAddress, isConnected } = useAccount();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [skills, setSkills] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync: updateUserProfile } = useScaffoldWriteContract({ contractName: "UserInfo" });
  const { writeContractAsync: updateUserSkills } = useScaffoldWriteContract({ contractName: "UserInfo" });

  // 从子图获取用户数据
  const fetchUserData = useCallback(async () => {
    if (!connectedAddress) return;

    try {
      setLoading(true);

      // 将sdk的创建移到函数内部，避免因对象引用变化导致的无限循环
      const sdk = getBuiltGraphSDK();

      // 获取用户信息
      const result = await sdk.GetUser({
        id: connectedAddress.toLowerCase(),
      });

      if (result?.user) {
        const userData = result.user;
        setName(userData.profile?.name || "");
        setEmail(userData.profile?.email || "");
        setBio(userData.profile?.bio || "");
        setWebsite(userData.profile?.website || "");
        setSkills(userData.skills?.skills?.join(", ") || "");
      } else {
        setName("");
        setEmail("");
        setBio("");
        setWebsite("");
        setSkills("");
      }
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  }, [connectedAddress]);

  useEffect(() => {
    fetchUserData();
  }, [connectedAddress, fetchUserData]); // 添加 fetchUserData 到依赖数组

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      return;
    }

    try {
      await updateUserProfile({
        functionName: "updateUserProfile",
        args: [name, email, bio, website],
      });
    } catch (error) {
      setError(error as string);
    }
  };

  const handleUpdateSkills = async () => {
    const skillsArray = skills
      .split(",")
      .map(skill => skill.trim())
      .filter(skill => skill.length > 0);

    try {
      await updateUserSkills({
        functionName: "updateUserSkills",
        args: [skillsArray],
      });
    } catch (error) {
      setError(error as string);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex justify-center items-center mt-10">
        <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 px-6 py-8 w-full max-w-2xl">
          <h2 className="text-2xl font-bold text-center mb-6">用户信息</h2>
          <div className="text-center">
            <p className="mb-4">请先连接钱包以查看和编辑您的个人信息</p>
            <Address address={connectedAddress} />
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center mt-10">
        <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 px-6 py-8 w-full max-w-2xl">
          <h2 className="text-2xl font-bold text-center mb-6">加载中...</h2>
          <div className="text-center">
            <p className="mb-4">正在加载用户信息...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center mt-10">
        <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 px-6 py-8 w-full max-w-2xl">
          <h2 className="text-2xl font-bold text-center mb-6">错误</h2>
          <div className="text-center">
            <p className="mb-4">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center mt-10">
      <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 px-6 py-8 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">用户信息</h2>
          {connectedAddress && (
            <Link href={`/user/${connectedAddress}`} className="btn btn-secondary btn-sm">
              查看公开资料
            </Link>
          )}
        </div>

        <div className="space-y-4" style={{ marginTop: "2rem" }}>
          <div>
            <label className="block text-sm font-medium mb-1">姓名 *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="请输入您的姓名"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="请输入您的邮箱地址"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">个人简介</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="请简单介绍一下自己"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">网站</label>
            <input
              type="text"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="请输入您的个人网站或作品集链接"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleUpdateProfile}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full"
            >
              更新信息
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">技能</label>
            <textarea
              value={skills}
              onChange={e => setSkills(e.target.value)}
              placeholder="请输入您的技能，用逗号分隔（例如：JavaScript, React, Solidity）"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end items-center mt-1">
              <button
                onClick={handleUpdateSkills}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full"
              >
                更新技能
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
