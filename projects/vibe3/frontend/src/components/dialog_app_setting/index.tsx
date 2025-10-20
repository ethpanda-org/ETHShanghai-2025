"use client"

import React, { useCallback, useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import Overview from "./overview"
import { type AppOverviewResponse, getAppOverview } from "@/services/vibe3_api/apps"
import { GradientPulse } from "@/components/loading-pulse"
import { FiAlertTriangle } from "react-icons/fi"
import Publish from "./publish"
import Envs from "./envs"
import Instantdb from "./instantdb"

interface DialogAppSettingProps {
  appId?: string
  open: boolean
  initialMenu?: MenuItem
  onOpenChange: (open: boolean) => void
}

export type MenuItem = "overview" | "environment" | "publish" | "instantdb"

const menuItems = [
  {
    id: "overview" as MenuItem,
    label: "Overview",
  },
  {
    id: "environment" as MenuItem,
    label: "Environment Variables",
  },
  {
    id: "publish" as MenuItem,
    label: "Publish",
  },
  {
    id: "instantdb" as MenuItem,
    label: "Instantdb",
    icon: '/instandb_logo.svg'
  },
]

export function DialogAppSetting({ open, onOpenChange, initialMenu, appId }: DialogAppSettingProps) {
  const [activeMenu, setActiveMenu] = useState<MenuItem>(initialMenu || "overview")
  const [overview, setOverview] = useState<AppOverviewResponse | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    getAppOverviewData()
    setActiveMenu(initialMenu || "overview")
  }, [appId, open])

  const getAppOverviewData = useCallback(async () => {
    if (!appId) {
      return
    }
    setLoading(true)
    setError(undefined)
    getAppOverview(appId)
      .then((res) => {
        setOverview(res)
      })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [appId])

  const renderContent = () => {
    if (!appId || loading) {
      return <div className="flex flex-col h-full gap-4 opacity-20">
        <GradientPulse width={'100%'} height={36} />
        <GradientPulse width={'30%'} height={36} />
        <GradientPulse width={'50%'} height={36} />
        <GradientPulse width={'100%'} height={36} />
        <GradientPulse width={'90%'} height={36} />
        <GradientPulse width={'100%'} height={36} />
        <GradientPulse width={'30%'} height={36} />
        <GradientPulse width={'50%'} height={36} />
        <GradientPulse width={'100%'} height={36} />
        <GradientPulse width={'90%'} height={36} />
      </div>
    }

    if (error) {
      return <div className="flex flex-col h-full gap-4 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <FiAlertTriangle size={30} className="text-red-500" />
          <div className="text-red-500">{error}</div>
          <Button variant="outline" size="sm"
            onClick={() => getAppOverviewData()}>
            Retry
          </Button>
        </div>
      </div>
    }

    switch (activeMenu) {
      case "overview":
        return <Overview data={overview} />
      case "environment":
        return <Envs data={overview?.data.envs || []} appId={appId} />
      case "publish":
        return  <Publish appid={appId} disabled={loading} />
      case "instantdb":
        return <Instantdb appid={appId} />
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[100vw] !max-w-[800px] h-[80vh] p-0 gap-0 bg-muted">
        <DialogTitle className="text-lg font-semibold p-4 pb-0 max-h-[44px]">
          Project Settings
        </DialogTitle>
        <div className="flex w-full flex-1 h-[calc(80vh-44px)]">
          {/* Left Sidebar */}
          <div className="w-64 border-r p-6">
            <div className="space-y-1">
              {menuItems.map((item) => {
                return (
                  <Button
                    key={item.id}
                    variant={'ghost'}
                    className={cn(
                      "cursor-pointer w-full justify-start hover:!bg-background/30",
                      activeMenu === item.id && "!bg-background/50 !text-green-500"
                    )}
                    onClick={() => setActiveMenu(item.id)}
                  >
                    {item.icon && <img src={item.icon} alt={item.label} className="w-4 h-4" />}
                    {item.label}
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Right Content */}
          <div className="flex-1 px-6 pb-6 overflow-auto flex-nowrap">
            {renderContent()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
