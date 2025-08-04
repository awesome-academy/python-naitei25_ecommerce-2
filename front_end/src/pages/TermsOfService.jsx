import React from "react";
import { Helmet } from "react-helmet";
import { motion } from "framer-motion";

const TermsOfService = () => {
  return (
    <div className="py-8">
      <Helmet>
        <title>Terms of Service - Django Electro Store</title>
        <meta
          name="description"
          content="Read the Terms of Service for Django Electro Store."
        />
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto bg-white p-8 rounded-lg border border-gray-200"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Terms of Service
        </h1>

        <div className="space-y-4 text-gray-700">
          <p>
            Welcome to Django Electro Store. By accessing or using our website,
            you agree to be bound by these terms of service. Please read them
            carefully.
          </p>

          <h2 className="text-xl font-semibold pt-4">1. Use of Our Service</h2>
          <p>
            You agree to use our service for lawful purposes only and in a way
            that does not infringe the rights of, restrict, or inhibit anyone
            else's use and enjoyment of the website. Prohibited behavior
            includes harassing or causing distress or inconvenience to any other
            user, transmitting obscene or offensive content, or disrupting the
            normal flow of dialogue within our website.
          </p>

          <h2 className="text-xl font-semibold pt-4">
            2. Intellectual Property
          </h2>
          <p>
            All content included on this site, such as text, graphics, logos,
            images, and software, is the property of Django Electro Store or its
            content suppliers and protected by international copyright laws.
          </p>

          <h2 className="text-xl font-semibold pt-4">3. Product Information</h2>
          <p>
            We strive to be as accurate as possible in the description of our
            products. However, we do not warrant that product descriptions or
            other content of this site is accurate, complete, reliable, current,
            or error-free.
          </p>

          <h2 className="text-xl font-semibold pt-4">
            4. Limitation of Liability
          </h2>
          <p>
            Django Electro Store will not be liable for any damages of any kind
            arising from the use of this site, including, but not limited to
            direct, indirect, incidental, punitive, and consequential damages.
          </p>

          <h2 className="text-xl font-semibold pt-4">5. Governing Law</h2>
          <p>
            These terms and conditions are governed by and construed in
            accordance with the laws of the land and you irrevocably submit to
            the exclusive jurisdiction of the courts in that State or location.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default TermsOfService;
