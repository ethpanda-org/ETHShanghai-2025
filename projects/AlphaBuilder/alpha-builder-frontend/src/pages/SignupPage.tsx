import { useEffect, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEmailAuth } from "@/hooks/useEmailAuth";

const SignupPage = () => {
  const navigate = useNavigate();
  const { signup, status, user, isLoading, error, dismissError } =
    useEmailAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (status === "authenticated" && user) {
      navigate("/", { replace: true });
    }
  }, [status, user, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      return;
    }
    await signup({ email, password, name: name || undefined });
  };

  const handleChange = (
    updater: (value: string) => void,
    value: string
  ) => {
    if (error) {
      dismissError();
    }
    updater(value);
  };

  const handleEnterKey = (
    event: KeyboardEvent<HTMLInputElement>,
    nextFieldId?: string
  ) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    if (!nextFieldId) {
      return;
    }
    const nextElement = document.getElementById(nextFieldId);
    if (nextElement instanceof HTMLElement) {
      nextElement.focus();
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 p-6">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Create account</h1>
        <p className="text-muted-foreground">
          Sign up with your email address to get started.
        </p>
      </header>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium">
            Name <span className="text-xs text-muted-foreground">(optional)</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => handleChange(setName, event.target.value)}
            onKeyDown={(event) => handleEnterKey(event, "signup-email")}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Jane Doe"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="signup-email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) =>
              handleChange(setEmail, event.target.value.trim())
            }
            onKeyDown={(event) => handleEnterKey(event, "signup-password")}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="signup-password"
            className="block text-sm font-medium"
          >
            Password
          </label>
          <input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => handleChange(setPassword, event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Create a password"
          />
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          size="default"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Creating account..." : "Sign up"}
        </Button>
      </form>
      <footer className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </footer>
    </div>
  );
};

export default SignupPage;
