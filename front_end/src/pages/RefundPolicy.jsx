import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';

const RefundPolicy = () => {
  return (
    <div className="py-8">
      <Helmet>
        <title>Refund Policy - Django Electo Store</title>
        <meta name="description" content="Read the Refund Policy for Django Electo Store." />
      </Helmet>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto bg-white p-8 rounded-lg border border-gray-200"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Refund Policy</h1>
        
        <div className="space-y-4 text-gray-700">
          <p>We want you to be happy with your purchase. If you are not completely satisfied, you may be eligible for a return or exchange.</p>
          
          <h2 className="text-xl font-semibold pt-4">1. Returns</h2>
          <p>Our policy lasts 30 days. If 30 days have gone by since your purchase, unfortunately, we can’t offer you a refund or exchange. To be eligible for a return, your item must be unused and in the same condition that you received it. It must also be in the original packaging.</p>

          <h2 className="text-xl font-semibold pt-4">2. Refunds</h2>
          <p>Once your return is received and inspected, we will send you an email to notify you that we have received your returned item. We will also notify you of the approval or rejection of your refund. If you are approved, then your refund will be processed, and a credit will automatically be applied to your original method of payment, within a certain amount of days.</p>

          <h2 className="text-xl font-semibold pt-4">3. Exchanges</h2>
          <p>We only replace items if they are defective or damaged. If you need to exchange it for the same item, send us an email at contact@djangoelecto.com.</p>

          <h2 className="text-xl font-semibold pt-4">4. Shipping</h2>
          <p>You will be responsible for paying for your own shipping costs for returning your item. Shipping costs are non-refundable. If you receive a refund, the cost of return shipping will be deducted from your refund.</p>
        </div>
      </motion.div>
    </div>
  );
};

export default RefundPolicy;