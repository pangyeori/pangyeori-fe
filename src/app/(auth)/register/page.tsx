import { AuthLayout } from "@/components/layout/AuthLayout";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { RegisterIntro } from "@/features/auth/components/RegisterIntro";

export default function RegisterPage() {
  return (
    <AuthLayout hero={<RegisterIntro />}>
      <RegisterForm />
    </AuthLayout>
  );
}
