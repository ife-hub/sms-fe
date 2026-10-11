export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.1fr_1fr]">
      <div className="hidden flex-col justify-between bg-board p-12 text-chalk lg:flex">
        <p className="font-display text-lg font-semibold text-white">School dashboard</p>
        <div className="max-w-md">
          <p className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-white">
            One record for every student.
          </p>
          <p className="mt-5 text-base text-chalk/80">
            Enroll students, keep guardian contacts current and issue ID cards that can be checked in seconds.
          </p>
          <div className="mt-10 h-1 w-24 rounded-full bg-bus" aria-hidden />
        </div>
        <p className="text-sm text-chalk/60">Each sign-in sees only what its role allows.</p>
      </div>
      <div className="flex min-h-screen items-center justify-center px-6 py-12 lg:min-h-0">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
