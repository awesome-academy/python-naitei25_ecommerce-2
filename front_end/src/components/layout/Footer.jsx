import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center">
          <div className="flex space-x-6 mb-4">
            <Link
              to="/terms-of-service"
              className="text-sm text-gray-600 hover:text-blue-600"
            >
              Terms of Service
            </Link>
            <Link
              to="/privacy-policy"
              className="text-sm text-gray-600 hover:text-blue-600"
            >
              Privacy Policy
            </Link>
            <Link
              to="/refund-policy"
              className="text-sm text-gray-600 hover:text-blue-600"
            >
              Refund Policy
            </Link>
            <Link
              to="https://www.chatbase.co/chatbot-iframe/4G-lPMevQyxrzlNXUEwEo"
              className="text-sm text-gray-600 hover:text-blue-600"
            >
              Chat with the chatbot
            </Link>

            <a
              href="mailto:contact@djangoelectro.com"
              className="text-sm text-gray-600 hover:text-blue-600"
            >
              Contact Us
            </a>
          </div>
          <span className="text-sm text-gray-500">
            © 2024 Django Electro Store. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
