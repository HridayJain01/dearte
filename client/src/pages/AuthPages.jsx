import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';
import { brandLogoAlt, brandLogoUrl } from '../utils/brandLogo';
import { Button, Input, PasswordInput, Panel, SectionHeading } from '../components/ui/Primitives';
import { loginSchema, registerSchema } from '../utils/validators';

function AuthShell({ title, description, children }) {
  return (
    <section className="page-shell section-gap">
      <div className="grid overflow-hidden border border-[var(--color-border)] lg:grid-cols-2">
        <div className="relative min-h-[280px] bg-[var(--color-primary)] p-5 sm:min-h-[520px] sm:p-10">
          <img src={brandLogoUrl} alt={brandLogoAlt} className="mb-5 h-12 w-auto bg-white/95 p-2" />
          <h1 className="lux-heading max-w-md text-3xl !text-white sm:text-6xl">{title}</h1>
          <p className="mt-4 max-w-md text-sm text-white/60 sm:mt-6 sm:text-base">{description}</p>
        </div>
        <div className="bg-[var(--color-surface)] p-5 sm:p-8 md:p-12">{children}</div>
      </div>
    </section>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'hridaymjain@gmail.com', password: 'password' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const user = await login(values);
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/');
    } catch (error) {
      const message =
        error.response?.data?.message || 'Incorrect email or password. Please try again.';
      toast.error(message);
      form.setError('password', { type: 'manual', message });
    }
  });

  return (
    <AuthShell title="Sign in to your buyer account." description="Registered retailers can browse collections, save catalogues, and submit order requests.">
      <form className="space-y-5" onSubmit={onSubmit}>
        <SectionHeading eyebrow="Login" title="Welcome back" />
        <Input label="Email" error={form.formState.errors.email?.message} {...form.register('email')} />
        <PasswordInput label="Password" error={form.formState.errors.password?.message} {...form.register('password')} />
        <div className="flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="text-[var(--color-primary)] hover:underline">Forgot Password?</Link>
          <Link to="/register" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">Create account</Link>
        </div>
        <Button className="w-full" type="submit">Login</Button>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      customerName: '',
      email: '',
      mobile: '',
      address: '',
      city: '',
      state: '',
      country: 'India',
      pinCode: '',
      companyName: '',
      gstNumber: '',
      password: '',
      confirmPassword: '',
      acceptedTerms: false,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await register(values);
    navigate('/login');
  });

  return (
    <AuthShell title="Apply for a De Arté trade account." description="Buyer registrations stay inactive until reviewed and approved by the admin team.">
      <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
        <Input label="Customer Name" error={form.formState.errors.customerName?.message} {...form.register('customerName')} />
        <Input label="Email" error={form.formState.errors.email?.message} {...form.register('email')} />
        <Input label="Mobile" error={form.formState.errors.mobile?.message} {...form.register('mobile')} />
        <Input label="Company Name" error={form.formState.errors.companyName?.message} {...form.register('companyName')} />
        <Input label="Address" className="md:col-span-2" error={form.formState.errors.address?.message} {...form.register('address')} />
        <Input label="City" error={form.formState.errors.city?.message} {...form.register('city')} />
        <Input label="State" error={form.formState.errors.state?.message} {...form.register('state')} />
        <Input label="Country" error={form.formState.errors.country?.message} {...form.register('country')} />
        <Input label="Pin Code" error={form.formState.errors.pinCode?.message} {...form.register('pinCode')} />
        <Input label="GST Number" {...form.register('gstNumber')} />
        <PasswordInput label="Password" error={form.formState.errors.password?.message} {...form.register('password')} />
        <PasswordInput label="Confirm Password" error={form.formState.errors.confirmPassword?.message} {...form.register('confirmPassword')} />
        <label className="md:col-span-2 flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
          <input type="checkbox" {...form.register('acceptedTerms')} />
          I accept the terms and conditions.
        </label>
        <Button className="md:col-span-2" type="submit">Submit Registration</Button>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('request');
  const [sentEmail, setSentEmail] = useState('');

  const emailForm = useForm({
    defaultValues: { email: '' },
  });

  const resetForm = useForm({
    defaultValues: { otp: '', newPassword: '' },
  });

  const onRequestOtp = emailForm.handleSubmit(async ({ email }) => {
    await userService.forgotPassword({ email });
    setSentEmail(email);
    setStep('reset');
    // The API never confirms whether the address exists, so neither does this.
    toast.success('If that account exists, a reset code has been sent.');
  });

  const onResetPassword = resetForm.handleSubmit(async ({ otp, newPassword }) => {
    await userService.resetPassword({ email: sentEmail, otp, newPassword });
    toast.success('Password updated. Please log in.');
    navigate('/login');
  });

  return (
    <AuthShell title="Reset your password." description="Enter your email to receive a one-time code, then set a new password.">
      {step === 'request' ? (
        <form className="space-y-5" onSubmit={onRequestOtp}>
          <SectionHeading eyebrow="Forgot password" title="Request a reset code" />
          <Input label="Email" type="email" error={emailForm.formState.errors.email?.message} {...emailForm.register('email', { required: 'Email is required' })} />
          <Button className="w-full" type="submit">Send OTP</Button>
          <p className="text-center text-sm text-[var(--color-text-muted)]">
            <Link to="/login" className="text-[var(--color-primary)] hover:underline">Back to login</Link>
          </p>
        </form>
      ) : (
        <form className="space-y-5" onSubmit={onResetPassword}>
          <SectionHeading eyebrow="Forgot password" title="Enter your new password" />
          <p className="text-sm text-[var(--color-text-muted)]">A code was sent to <strong>{sentEmail}</strong>.</p>
          <Input label="OTP" error={resetForm.formState.errors.otp?.message} {...resetForm.register('otp', { required: 'OTP is required' })} />
          <PasswordInput label="New Password" error={resetForm.formState.errors.newPassword?.message} {...resetForm.register('newPassword', { required: 'Password is required', minLength: { value: 8, message: 'At least 8 characters' } })} />
          <Button className="w-full" type="submit">Reset Password</Button>
          <p className="text-center text-sm text-[var(--color-text-muted)]">
            <button type="button" className="text-[var(--color-primary)] hover:underline" onClick={() => setStep('request')}>Resend code</button>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
