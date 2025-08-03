import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const getEmojiForCategory = (name) => {
  const lower = name.toLowerCase().replace(/[-_]/g, " ");

  // Electronics
  if (
    /\b(phone|phones|smartphone|smartphones|cell phone|cellphone|mobile)\b/.test(
      lower
    )
  )
    return "📱";
  if (/\b(laptop|laptops|notebook|notebooks)\b/.test(lower)) return "💻";
  if (/\b(tablet|tablets|ipad)\b/.test(lower)) return "📲";
  if (/\b(tv|television|screen|monitor|display)\b/.test(lower)) return "📺";
  if (/\b(camera|cameras|dslr|camcorder)\b/.test(lower)) return "📷";

  // Accessories
  if (
    /\b(headphone|headphones|head phone|earbuds|ear phones|earphone)\b/.test(
      lower
    )
  )
    return "🎧";
  if (/\b(mouse|mice|trackpad)\b/.test(lower)) return "🖱️";
  if (/\b(keyboard|key board|keyboards)\b/.test(lower)) return "⌨️";
  if (/\b(watch|watches|smartwatch|smart watch)\b/.test(lower)) return "⌚";

  // Gaming
  if (/\b(gaming|console|playstation|xbox|nintendo|game)\b/.test(lower))
    return "🎮";

  // Printing
  if (/\b(printer|printers|scanner|copier|fax)\b/.test(lower)) return "🖨️";

  // Storage
  if (/\b(ssd|hard drive|hdd|usb|storage|memory)\b/.test(lower)) return "💾";

  // Networking
  if (/\b(router|modem|network|wifi|ethernet)\b/.test(lower)) return "🌐";

  // Power
  if (/\b(power|charger|battery|batteries|adapter|cable|wire)\b/.test(lower))
    return "🔌";

  // Office
  if (/\b(accessory|accessories|office|stationery)\b/.test(lower)) return "🗂️";

  // Default
  if (/\b(tech|technology|electronics|gadget|device|gear)\b/.test(lower))
    return "🧠";

  return "🛒"; // fallback generic cart
};

const CategorySidebar = ({
  categories,
  selectedCategory,
  onCategorySelect,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white border border-gray-200 rounded-lg p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>

      <div className="space-y-2">
        <Button
          variant={!selectedCategory ? "secondary" : "ghost"}
          onClick={() => onCategorySelect("")}
          className="w-full justify-start h-auto p-3"
        >
          All Products
        </Button>

        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "secondary" : "ghost"}
            onClick={() => onCategorySelect(category.id)}
            className="w-full justify-start h-auto p-3"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center text-xl">
                {getEmojiForCategory(category.name)}
              </div>
              <span className="font-medium">{category.name}</span>
            </div>
          </Button>
        ))}
      </div>
    </motion.div>
  );
};

export default CategorySidebar;
