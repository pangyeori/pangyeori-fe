import { AuthCenterLayout } from "@/components/layout/AuthCenterLayout";
import { PasswordResetForm } from "@/features/auth/components/PasswordResetForm";

export default function PasswordResetPage() {
  return (
    <AuthCenterLayout variant="modern">
      <PasswordResetForm />
    </AuthCenterLayout>
  );
}
