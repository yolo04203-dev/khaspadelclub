import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
}

export function ChallengeCardSkeleton({ className }: SkeletonCardProps) {
  return (
    <Card className={cn("animate-pulse", className)}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32 sm:w-40" />
              <Skeleton className="h-3 w-24 sm:w-32" />
            </div>
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export function PlayerCardSkeleton({ className }: SkeletonCardProps) {
  return (
    <Card className={cn("animate-pulse", className)}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 sm:w-16 sm:h-16 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function LadderRowSkeleton({ className }: SkeletonCardProps) {
  return (
    <div className={cn("flex items-center gap-4 p-4 border-b border-border animate-pulse", className)}>
      <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl shrink-0" />
      <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32 sm:w-40" />
        <Skeleton className="h-3 w-24 hidden sm:block" />
      </div>
      <div className="hidden sm:flex items-center gap-4">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-9 w-20 rounded-md" />
    </div>
  );
}

export function StatsCardSkeleton({ className }: SkeletonCardProps) {
  return (
    <Card className={cn("animate-pulse", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

export function DashboardCardSkeleton({ className }: SkeletonCardProps) {
  return (
    <Card className={cn("animate-pulse", className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-4 w-48 mt-2" />
      </CardHeader>
    </Card>
  );
}

export function TeamCardSkeleton({ className }: SkeletonCardProps) {
  return (
    <Card className={cn("animate-pulse", className)}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

export function MatchHistorySkeleton({ className }: SkeletonCardProps) {
  return (
    <Card className={cn("animate-pulse", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="text-center">
            <Skeleton className="h-6 w-16 mx-auto" />
          </div>
          <div className="flex items-center gap-3">
            <div className="space-y-1 text-right">
              <Skeleton className="h-4 w-24 ml-auto" />
              <Skeleton className="h-3 w-16 ml-auto" />
            </div>
            <Skeleton className="w-8 h-8 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
