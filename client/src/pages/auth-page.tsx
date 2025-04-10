import * as React from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { insertUserSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Registration form schema
const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string().min(1, "Password confirmation is required"),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions",
  }),
  // Define roleId explicitly to match form values
  roleId: z.number().optional().nullable(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const auth = useAuth();

  // Redirect if already logged in
  React.useEffect(() => {
    if (auth.user) {
      navigate("/");
    }
  }, [auth.user, navigate]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      fullName: "",
      acceptTerms: false,
      roleId: 2, // Assign the default "user" role ID
    },
  });

  // Handle login form submission
  const onLoginSubmit = (data: LoginFormValues) => {
    const { username, password } = data;
    auth.loginMutation.mutate(
      { username, password },
      {
        onSuccess: () => {
          navigate("/");
        }
      }
    );
  };
  
  // Handle LDAP login form submission
  const onLdapLoginSubmit = (data: LoginFormValues) => {
    const { username, password } = data;
    auth.ldapLoginMutation.mutate(
      { username, password },
      {
        onSuccess: () => {
          navigate("/");
        }
      }
    );
  };
  
  // Handle OIDC login
  const handleOidcLogin = () => {
    auth.initiateOidcLogin();
  };

  // Handle register form submission
  const onRegisterSubmit = (data: RegisterFormValues) => {
    // Remove confirmPassword and acceptTerms which aren't part of the API request
    const { confirmPassword, acceptTerms, ...registerData } = data;
    
    // Add authProvider as 'local' for new registrations
    auth.registerMutation.mutate(
      {
        ...registerData,
        authProvider: 'local' // Explicitly set this for new users
      },
      {
        onSuccess: () => {
          navigate("/");
        }
      }
    );
  };

  return (
    <div className="flex min-h-screen bg-background">
      <div className="flex flex-col justify-center flex-1 px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="w-full max-w-sm mx-auto lg:w-96">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Active Directory Management API</h2>
            <p className="mt-2 text-sm text-gray-600">
              A comprehensive solution for managing your Active Directory resources
            </p>
          </div>

          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Login to your account</CardTitle>
                  <CardDescription>
                    Enter your credentials to access the dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your username" 
                                {...field} 
                                disabled={auth.loginMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Enter your password" 
                                {...field} 
                                disabled={auth.loginMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-center justify-between">
                        <FormField
                          control={loginForm.control}
                          name="rememberMe"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox 
                                  checked={field.value} 
                                  onCheckedChange={field.onChange}
                                  disabled={auth.loginMutation.isPending}  
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">
                                Remember me
                              </FormLabel>
                            </FormItem>
                          )}
                        />

                        <Button variant="link" className="text-sm p-0 h-auto" disabled={auth.loginMutation.isPending}>
                          Forgot password?
                        </Button>
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={auth.loginMutation.isPending || auth.ldapLoginMutation.isPending}
                      >
                        {auth.loginMutation.isPending ? "Logging in..." : "Log in"}
                      </Button>
                      
                      <div className="relative my-5">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-gray-300"></span>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-2 bg-white text-gray-500">Or continue with</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <Button 
                          type="button" 
                          variant="outline"
                          className="w-full"
                          disabled={auth.ldapLoginMutation.isPending || auth.loginMutation.isPending}
                          onClick={() => {
                            const username = loginForm.getValues("username");
                            const password = loginForm.getValues("password");
                            
                            // Validate the fields
                            if (!username || !password) {
                              loginForm.setError("username", { 
                                type: "manual", 
                                message: !username ? "Username is required" : undefined 
                              });
                              loginForm.setError("password", { 
                                type: "manual", 
                                message: !password ? "Password is required" : undefined 
                              });
                              return;
                            }
                            
                            auth.ldapLoginMutation.mutate(
                              { username, password },
                              {
                                onSuccess: () => {
                                  navigate("/");
                                }
                              }
                            );
                          }}
                        >
                          {auth.ldapLoginMutation.isPending ? "Authenticating..." : "LDAP Login"}
                        </Button>
                        
                        <Button 
                          type="button" 
                          variant="outline"
                          className="w-full"
                          disabled={auth.ldapLoginMutation.isPending || auth.loginMutation.isPending}
                          onClick={() => auth.initiateOidcLogin()}
                        >
                          OpenID Connect
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create a new account</CardTitle>
                  <CardDescription>
                    Fill out the form to register a new account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Choose a username" 
                                {...field} 
                                disabled={auth.registerMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="fullName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter your full name" 
                                {...field} 
                                value={field.value || ""}
                                disabled={auth.registerMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="Enter your email" 
                                {...field} 
                                value={field.value || ""}
                                disabled={auth.registerMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Create a password" 
                                {...field} 
                                disabled={auth.registerMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm Password</FormLabel>
                            <FormControl>
                              <Input 
                                type="password" 
                                placeholder="Confirm your password" 
                                {...field} 
                                disabled={auth.registerMutation.isPending}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="acceptTerms"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox 
                                checked={field.value} 
                                onCheckedChange={field.onChange} 
                                disabled={auth.registerMutation.isPending}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-normal">
                                I accept the terms and conditions
                              </FormLabel>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={auth.registerMutation.isPending}
                      >
                        {auth.registerMutation.isPending ? "Creating account..." : "Create account"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="relative hidden w-0 flex-1 lg:block">
        <div className="absolute inset-0 bg-primary flex items-center justify-center">
          <div className="max-w-lg p-8 text-white">
            <h2 className="text-4xl font-bold mb-6">Active Directory Management API</h2>
            <ul className="space-y-4 text-lg">
              <li className="flex items-center">
                <span className="mr-2 inline-block w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-sm">✓</span>
                Complete CRUD operations for AD resources
              </li>
              <li className="flex items-center">
                <span className="mr-2 inline-block w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-sm">✓</span>
                Comprehensive API with Swagger documentation
              </li>
              <li className="flex items-center">
                <span className="mr-2 inline-block w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-sm">✓</span>
                Flexible filtering and property selection
              </li>
              <li className="flex items-center">
                <span className="mr-2 inline-block w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-sm">✓</span>
                Secure API token management
              </li>
              <li className="flex items-center">
                <span className="mr-2 inline-block w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-sm">✓</span>
                Intuitive and responsive admin interface
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
