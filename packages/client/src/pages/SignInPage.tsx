import { SignIn } from '@clerk/clerk-react';

export default function SignInPage() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 min-h-dvh w-full max-w-lg mx-auto">
      <h1 className="text-3xl font-extrabold text-slate-900 mb-1">Live Trivia</h1>
      <p className="text-slate-500 font-medium mb-8">Sign in to host a game</p>

      <SignIn
        path="/sign-in"
        routing="path"
        forceRedirectUrl="/host"
        appearance={{
          variables: {
            colorPrimary: '#6366f1',
            borderRadius: '0.75rem',
            fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
          },
          elements: {
            card: 'shadow-sm border border-gray-100',
            socialButtonsBlockButton:
              'border-2 border-gray-200 bg-slate-50 hover:bg-slate-100 transition-colors',
            formButtonPrimary:
              'bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] transition-all text-lg font-semibold',
            footerActionLink: 'text-indigo-500 hover:text-indigo-600 font-medium',
          },
        }}
      />
    </div>
  );
}
