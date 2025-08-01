// src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast'; // assuming this is your hook
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login }                 = useAuth();
  const navigate                  = useNavigate();
  const { toast }                 = useToast();    // get toast fn

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await login(email, password);
    setIsLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      // show toast on error
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: result.message || 'Please check your credentials and try again.',
      });
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      
      const tokenParts = credentialResponse.credential.split('.');
      const decodedToken = JSON.parse(atob(tokenParts[1]));
      
      const apiUrl = import.meta.env.VITE_API_URL;
      const endpoint = import.meta.env.VITE_GOOGLE_AUTH_ENDPOINT;
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          access_token: credentialResponse.credential,
          id_token: credentialResponse.credential,
        }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.detail || 'Login failed');
      }

      // Lưu token vào localStorage
      if (responseData.access) {
        localStorage.setItem('token', responseData.access);
      }
      if (responseData.refresh) {
        localStorage.setItem('refreshToken', responseData.refresh);
      }
      if (responseData.user) {
        localStorage.setItem('user', JSON.stringify(responseData.user));
      }

      navigate('/');
      toast({
        title: "Success",
        description: "Logged in successfully with Google",
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: error.message,
      });
    }
  };

  return (
    <div className="py-8">
      <Helmet>
        <title>Login - Django Electo Store</title>
        <meta name="description" content="Login to your Django Electo Store account" />
      </Helmet>

      <motion.div 
        className="max-w-md mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Login</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="mt-1"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1"
                placeholder="Enter your password"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-800 font-medium">
                Register here
              </Link>
            </p>
          </div>

          <div className="mt-4">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => {
                // Xử lý lỗi
              }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
