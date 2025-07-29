import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';

const PrivacyPolicy = () => {
  return (
    <div className="py-8">
      <Helmet>
        <title>Privacy Policy - Django Electo Store</title>
        <meta name="description" content="Read the Privacy Policy for Django Electo Store." />
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto bg-white p-8 rounded-lg border border-gray-200"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        
        <div className="space-y-4 text-gray-700">
          <p>Your privacy is important to us. It is Django Electo Store's policy to respect your privacy regarding any information we may collect from you across our website.</p>
          
          <h2 className="text-xl font-semibold pt-4">1. Information We Collect</h2>
          <p>We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used.</p>

          <h2 className="text-xl font-semibold pt-4">2. How We Use Your Information</h2>
          <p>We use the information we collect to process transactions, provide customer service, and improve our website and services. We do not share any personally identifying information publicly or with third-parties, except when required to by law.</p>

          <h2 className="text-xl font-semibold pt-4">3. Security</h2>
          <p>We are committed to protecting your personal information and have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process.</p>

          <h2 className="text-xl font-semibold pt-4">4. Your Rights</h2>
          <p>You are free to refuse our request for your personal information, with the understanding that we may be unable to provide you with some of your desired services. You have the right to access, update, or delete the information we have on you.</p>
        </div>
      </motion.div>
    </div>
  );
};

export default PrivacyPolicy;