// src/pages/AdminEmbed.jsx
import React from 'react';

export default function AdminEmbed() {
  return (
    <iframe
      src="https://abcd1234.ngrok.io/admin/"
      style={{ width:'100%', height:'100vh', border:'none' }}
      title="Django Admin"
    />
  );
}