"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { getBuiltGraphSDK } from "~~/.graphclient";
import { Address } from "~~/components/scaffold-eth";

// 获取 GraphQL SDK
const sdk = getBuiltGraphSDK();

const UserDetailPage = ({ params }: { params: Promise<{ address: string }> }) => {
  const router = useRouter();
  const { address: connectedAddress } = useAccount();
  const [userAddress, setUserAddress] = useState<string>("");
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [isValidAddress, setIsValidAddress] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 使用 React.use() 解包 params Promise，不在useEffect中使用
  const unwrappedParams = React.use(params);

  // 验证地址格式并获取用户数据
  useEffect(() => {
    // 验证地址格式
    if (!unwrappedParams.address.match(/^0x[a-fA-F0-9]{40}$/)) {
      router.push("/");
      setIsValidAddress(false);
      return;
    }

    setIsValidAddress(true);
    setUserAddress(unwrappedParams.address);
    setIsOwnProfile(connectedAddress?.toLowerCase() === unwrappedParams.address.toLowerCase());

    // 获取用户数据
    setLoading(true);
    // 使用 GraphQL 查询获取用户数据
    sdk
      .GetUser({
        id: unwrappedParams.address.toLowerCase(),
      })
      .then(result => {
        if (result?.user) {
          setUserData(result.user);
        } else {
          setError("用户未找到");
        }
      })
      .catch(err => {
        setError(err.message || "获取用户数据时出错");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [unwrappedParams.address, connectedAddress, router]);

  if (!isValidAddress) {
    return (
      <div className="flex justify-center items-center mt-10">
        <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 px-6 py-8 w-full max-w-2xl">
          <h2 className="text-2xl font-bold text-center mb-6">加载中...</h2>
          <div className="text-center">
            <p className="mb-4">正在重定向...</p>
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
            <Link href="/" className="btn btn-primary">
              返回首页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex justify-center items-center mt-10">
        <div className="bg-base-100 rounded-3xl shadow-md shadow-secondary border border-base-300 px-6 py-8 w-full max-w-2xl">
          <h2 className="text-2xl font-bold text-center mb-6">用户未找到</h2>
          <div className="text-center">
            <p className="mb-4">该地址尚未注册用户信息</p>
            <Link href="/" className="btn btn-primary">
              返回首页
            </Link>
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
          <div className="flex gap-2">
            {isOwnProfile && (
              <Link href="/profile" className="btn btn-secondary btn-sm">
                编辑资料
              </Link>
            )}
            <Link href={`/user/${userAddress}/work-and-disputes`} className="btn btn-primary btn-sm">
              工作和纠纷
            </Link>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">用户地址:</span>
            <Address address={userAddress} />
          </div>
        </div>

        {userData.profile && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">姓名</label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-base-200">
                {userData.profile.name}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">邮箱</label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-base-200">
                {userData.profile.email || "未提供"}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">个人简介</label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-base-200">
                {userData.profile.bio || "未提供"}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">网站</label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-base-200">
                {userData.profile.website ? (
                  <a
                    href={
                      userData.profile.website.startsWith("http")
                        ? userData.profile.website
                        : `http://${userData.profile.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-primary"
                  >
                    {userData.profile.website}
                  </a>
                ) : (
                  "未提供"
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">技能</label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-base-200">
                {userData.skills?.skills && userData.skills.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {userData.skills.skills.map((skill: string, index: number) => (
                      <span key={index} className="badge badge-primary">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  "未提供技能信息"
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">注册时间</label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-base-200">
                {userData.profile.createdAt
                  ? new Date(Number(userData.profile.createdAt) * 1000).toLocaleString()
                  : "未知"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDetailPage;
