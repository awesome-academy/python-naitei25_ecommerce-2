import { useEffect } from 'react';

export default function AdminRedirect() {
  useEffect(() => {
    // hard‐redirect to Django admin
    window.location.href = '/admin/';
  }, []);
  return null;  // we don’t render any React UI here
}