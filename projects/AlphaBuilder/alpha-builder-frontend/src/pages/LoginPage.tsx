import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEmailAuth } from "@/hooks/useEmailAuth";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, status, user, isLoading, error, dismissError } =
    useEmailAuth();
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
    await login({ email, password });
  };

  const handleInputChange = (
    updater: (value: string) => void,
    value: string
  ) => {
    if (error) {
      dismissError();
    }
    updater(value);
  };

  return (
    <div className="mx-auto max-w-md space-y-6 p-6">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Log in</h1>
        <p className="text-muted-foreground">
          Enter your email and password to access your account.
        </p>
      </header>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) =>
              handleInputChange(setEmail, event.target.value.trim())
            }
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) =>
              handleInputChange(setPassword, event.target.value)
            }
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="********"
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
          {isLoading ? "Signing in..." : "Log in"}
        </Button>
      </form>
      <footer className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link to="/signup" className="text-primary hover:underline">
          Sign up
        </Link>
      </footer>
    </div>
  );
};

export default LoginPage;
