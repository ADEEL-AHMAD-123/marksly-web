'use client';

import { useState } from 'react';
import { Bus, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  useGetStudentOptInsQuery, useCreateOptInMutation, useEndOptInMutation,
  useGetFeeStructuresQuery,
} from '@/store/api/feesApi';
import { formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/get-error-message';

/**
 * Transport/hostel-type structures only bill a student while they have an
 * active opt-in row here — see student-service-opt-in.model.ts. Ending one
 * never deletes it (endDate is set instead), so history of "who had
 * transport when" survives for reporting and any credit-adjustment needed
 * on the following invoice.
 */
export function StudentFeeOptIns({ studentId }: { studentId: string }) {
  const { data, isLoading } = useGetStudentOptInsQuery(studentId);
  const optIns = data?.data ?? [];
  const { data: structuresRes } = useGetFeeStructuresQuery();
  const optInStructures = (structuresRes?.data ?? []).filter((s) => s.applicabilityMode === 'opt-in' && s.isActive);

  const [createOptIn, { isLoading: creating }] = useCreateOptInMutation();
  const [endOptIn] = useEndOptInMutation();
  const [picking, setPicking] = useState(false);
  const [pickedStructureId, setPickedStructureId] = useState('');

  const handleAdd = async () => {
    if (!pickedStructureId) return;
    try {
      await createOptIn({ studentId, feeStructureId: pickedStructureId }).unwrap();
      toast.success('Opted in');
      setPicking(false);
      setPickedStructureId('');
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not opt in'));
    }
  };

  const handleEnd = async (id: string) => {
    try {
      await endOptIn({ id, studentId }).unwrap();
      toast.success('Opt-in ended');
    } catch (e: any) {
      toast.error(getErrorMessage(e, 'Could not end opt-in'));
    }
  };

  if (isLoading) return <Skeleton className="h-16 w-full" />;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Bus size={12} /> Opt-in services
        </p>
        {optInStructures.length > 0 && (
          <button type="button" onClick={() => setPicking((p) => !p)} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <Plus size={13} /> Add
          </button>
        )}
      </div>

      {picking && (
        <div className="mb-2 flex items-center gap-2">
          <Select value={pickedStructureId} onValueChange={setPickedStructureId}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Transport / hostel structure" /></SelectTrigger>
            <SelectContent>
              {optInStructures.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" loading={creating} onClick={handleAdd}>Add</Button>
        </div>
      )}

      {optInStructures.length === 0 && optIns.length === 0 ? (
        <p className="text-sm text-muted-foreground">No opt-in fee structures configured (e.g. Transport, Hostel).</p>
      ) : optIns.length === 0 ? (
        <p className="text-sm text-muted-foreground">Not opted into any service.</p>
      ) : (
        <div className="space-y-1.5">
          {optIns.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              <div>
                <p className="text-foreground">{o.structureName ?? 'Service'}</p>
                <p className="text-xs text-muted-foreground">
                  Since {formatDate(o.startDate)}{o.endDate ? ` · ended ${formatDate(o.endDate)}` : ''}
                </p>
              </div>
              {o.active ? (
                <div className="flex items-center gap-2">
                  <Badge variant="success">Active</Badge>
                  <Button size="sm" variant="ghost" onClick={() => handleEnd(o.id)}><X size={14} /></Button>
                </div>
              ) : (
                <Badge variant="neutral">Ended</Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
