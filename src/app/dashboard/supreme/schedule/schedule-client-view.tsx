"use client";

import { useState } from "react";
import { SupremeCalendarView, SupremeSessionItem } from "@/components/supreme/SupremeCalendarView";
import { CreateSessionModal } from "@/components/supreme/CreateSessionModal";

interface Props {
  sessions: SupremeSessionItem[];
  supremeMembers: Array<{
    id: string;
    fullName: string;
    email: string;
    employer?: string | null;
  }>;
  availableCases: Array<{
    id: string;
    caseNumber: string;
    caseYear: number;
    complainantName: string | null;
    hospitalName: string | null;
    subCommittee?: { name: string } | null;
  }>;
}

export function ScheduleClientView({
  sessions,
  supremeMembers,
  availableCases,
}: Props) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <>
      <SupremeCalendarView
        sessions={sessions}
        supremeMembers={supremeMembers}
        onOpenCreateModal={() => setIsCreateOpen(true)}
      />

      {isCreateOpen && (
        <CreateSessionModal
          availableCases={availableCases}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
    </>
  );
}
