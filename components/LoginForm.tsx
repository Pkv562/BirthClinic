"use client";

import Image from 'next/image';
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/custom-ui/login-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate name input
      const nameRegex = /^[A-Za-z\s]*$/;
      if (!nameRegex.test(name)) {
        toast.error("Name can only contain letters and spaces");
        setIsLoading(false);
        return;
      }

      if (!name.trim()) {
        toast.error("Name is required");
        setIsLoading(false);
        return;
      }

      if (!password) {
        toast.error("Password is required");
        setIsLoading(false);
        return;
      }

      // Call server-side API for authentication
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), password }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Login successful!");
        // Store user data in session storage with additional information
        sessionStorage.setItem('user', JSON.stringify({
          name: result.user.name,
          firstName: result.user.firstName,
          role: result.user.role,
          avatar: result.user.avatar,
          userType: result.user.userType,
          isAdmin: result.user.isAdmin,
          isDoctor: result.user.isDoctor,
          clinicianId: result.user.clinicianId
        }));
        router.push("/Dashboard");
      } else {
        toast.error(result.error || "Invalid name or password");
      }
    } catch (error: any) {
      toast.error(`Login failed: ${error.message || 'Network error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center text-center">
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-balance text-muted-foreground">
                  Login to your account
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Michael Doe"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                >
                {isLoading ? "Login" : "Login"}
              </Button>
            </div>
          </form>
          <div className="relative hidden bg-muted md:block">
            <Image
              src="/images/pio.png"
              alt="Image"
              width={400}
              height={400}
              className="absolute inset-0 h-full w-full"
            />
          </div>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-sm text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        "Loving Father, touch me now with your healing hands, for I believe that your will is for me to be well in mind, body, soul and spirit"
        <div className="text-right py-2">
          — St. Padre Pio
        </div>
      </div>
    </div>
  );
}