import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
	return twMerge(clsx(inputs));
}
// src/lib/auth.js
export async function authFetch(input, init = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(init.headers || {}),
  };
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: init.credentials || 'omit', // for token-based, omit cookies
  });

  return response;
}