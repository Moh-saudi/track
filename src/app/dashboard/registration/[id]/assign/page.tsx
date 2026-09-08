import { redirect } from "next/navigation";

export default function DeprecatedAssignRedirect({ params }: { params: { id: string } }) {
  // التوجيه تم نقله رسمياً إلى موظف المتابعة والتوجيه
  redirect(`/dashboard/follow-up/${params.id}/assign`);
}
