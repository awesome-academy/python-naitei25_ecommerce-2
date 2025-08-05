import React from "react";

/**
 * Separator is a horizontal rule for dividing sections.
 */
export const Separator = ({ className = "", ...props }) => (
  <hr className={`border-t border-gray-200 ${className}`} {...props} />
);
