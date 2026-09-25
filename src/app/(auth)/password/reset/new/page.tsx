import { AuthCenterLayout } from "@/components/layout/AuthCenterLayout";
import { NewPasswordForm } from "@/features/auth/components/NewPasswordForm";

export default function NewPasswordPage() {
  return (
    <AuthCenterLayout variant="modern">
      <NewPasswordForm />
    </AuthCenterLayout>
  );
}
