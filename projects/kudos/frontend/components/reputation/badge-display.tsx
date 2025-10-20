"use client"

import { useAccount } from "wagmi"
import { useUserBadges, useBadgeURI } from "@/lib/contracts/hooks/use-badges"
import { useBadgeRule } from "@/lib/contracts/hooks/use-badge-rules"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Award, Lock, Loader2 } from "lucide-react"
import { useState, useEffect } from "react"

interface BadgeMetadata {
  name: string
  description: string
  image: string
}

function BadgeCard({ ruleId, badgeId }: { ruleId: bigint; badgeId: bigint }) {
  const { data: rule } = useBadgeRule(ruleId)
  const { data: badgeURI } = useBadgeURI(badgeId)
  const [metadata, setMetadata] = useState<BadgeMetadata | null>(null)

  useEffect(() => {
    if (badgeURI) {
      // In production, fetch from IPFS
      // For now, use mock data
      setMetadata({
        name: `徽章 #${ruleId}`,
        description: rule?.metadataURI || "成就徽章",
        image: "/placeholder.svg?height=100&width=100",
      })
    }
  }, [badgeURI, ruleId, rule])

  return (
    <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 backdrop-blur-xl border-primary/20 hover:scale-105 transition-transform">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Award className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h4 className="font-semibold text-sm">{metadata?.name || "加载中..."}</h4>
          <p className="text-xs text-muted-foreground mt-1">{metadata?.description}</p>
        </div>
        <Badge variant="secondary" className="text-xs">
          #{badgeId.toString()}
        </Badge>
      </div>
    </Card>
  )
}

function LockedBadgeCard({ ruleId }: { ruleId: bigint }) {
  const { data: rule } = useBadgeRule(ruleId)

  return (
    <Card className="p-4 bg-muted/30 backdrop-blur-xl border-border/40 opacity-60">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <h4 className="font-semibold text-sm text-muted-foreground">未解锁</h4>
          <p className="text-xs text-muted-foreground mt-1">{rule?.metadataURI || `完成条件解锁徽章 #${ruleId}`}</p>
        </div>
      </div>
    </Card>
  )
}

export function BadgeDisplay() {
  const { address } = useAccount()
  const { data: badges, isLoading } = useUserBadges(address)

  // Mock all possible badge rule IDs (1-6 based on the plan)
  const allRuleIds = [1n, 2n, 3n, 4n, 5n, 6n]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const earnedRuleIds = badges?.ruleIds || []
  const earnedBadgeIds = badges?.badgeIds || []

  return (
    <div className="space-y-6">
      {/* Earned Badges */}
      {earnedRuleIds.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">已获得徽章</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {earnedRuleIds.map((ruleId, index) => (
              <BadgeCard key={ruleId.toString()} ruleId={ruleId} badgeId={earnedBadgeIds[index]} />
            ))}
          </div>
        </div>
      )}

      {/* Locked Badges */}
      <div>
        <h3 className="text-lg font-semibold mb-4">未获得徽章</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {allRuleIds
            .filter((ruleId) => !earnedRuleIds.includes(ruleId))
            .map((ruleId) => (
              <LockedBadgeCard key={ruleId.toString()} ruleId={ruleId} />
            ))}
        </div>
      </div>

      {earnedRuleIds.length === 0 && (
        <div className="text-center py-12">
          <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">还没有获得任何徽章</p>
          <p className="text-sm text-muted-foreground mt-2">完成购买或创作来获得您的第一个徽章！</p>
        </div>
      )}
    </div>
  )
}
