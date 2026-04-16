'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import type { DailyVolume } from '@repo/types';

const VolumeChart = dynamic(
  () => import('./VolumeChart').then((m) => m.VolumeChart),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full" /> },
);

export function VolumeChartWrapper({ data }: { data: DailyVolume[] }) {
  return <VolumeChart data={data} />;
}
