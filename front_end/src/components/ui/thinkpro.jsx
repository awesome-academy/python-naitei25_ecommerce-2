import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, Heart, ShieldCheck, Clock, Users } from "lucide-react";

const TABS = [
  {
    key: "hands-on",
    title: "Hands-on Experience",
    desc: "A large number of products are on display so you can directly experience them along with pre-installed software and tools.",
    bg: "#2030E2", // blue
    image: "https://thinkpro.vn/usp-1.png",
    icon: ThumbsUp,
  },
  {
    key: "care",
    title: "Dedicated Consultation",
    desc: "A well-trained consulting team that always prioritizes customer benefits to help you choose the most suitable product.",
    bg: "#C026D3", // purple
    image: "https://thinkpro.vn/usp-2.png",
    icon: Heart,
  },
  {
    key: "service-center",
    title: "Customer Service Center",
    desc: "Protecting customer rights and acting promptly so you always feel comfortable and secure.",
    bg: "#16A34A", // green
    image: "https://thinkpro.vn/usp-3.png",
    icon: ShieldCheck,
  },
  {
    key: "support-24h",
    title: "24-Hour Support",
    desc: "Ready to assist 24 hours a day through online and offline channels, responding quickly.",
    bg: "#9A4A0B", // warm brown
    image: "https://thinkpro.vn/usp-4.png",
    icon: Clock,
  },
  {
    key: "onward",
    title: "Django Onward",
    desc: "A member of the Django Project Intern – operating principle: Customers are the center, bugs are best friends.",
    bg: "#0B1434", // deep navy
    image: "https://thinkpro.vn/usp-5.png",
    icon: Users,
  },
];

export default function USPSection() {
  const [activeKey, setActiveKey] = React.useState(TABS[0].key);
  const active = React.useMemo(
    () => TABS.find((t) => t.key === activeKey) ?? TABS[0],
    [activeKey]
  );

  // Preload all images once so switching tabs is instant
  React.useEffect(() => {
    const cache = [];
    TABS.forEach((t) => {
      const img = new Image();
      img.decoding = "async";
      img.src = t.image;
      cache.push(img);
    });
    // no-op cleanup; browser keeps cache
    return () => {
      cache.forEach((img) => (img.onload = null));
    };
  }, []);

  return (
    <section className="section-usp mt-10 md:mt-20">
      <div className="mt-4 md:mt-10">
        {/* cancel container padding so the colored panel spans nicely */}
        <div className="mx-[-1rem] sm:mx-[-1.5rem] lg:mx-[-2rem]">
          <motion.div
            className="rounded-3xl min-h-[460px] flex flex-col xl:flex-row items-center overflow-hidden p-6 md:p-10"
            animate={{ backgroundColor: active.bg }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            {/* LEFT: vertical pills (now vertically centered on xl+) */}
            <div className="xl:w-80 shrink-0 xl:pr-10 2xl:pr-14 h-full flex items-center">
              <ul className="flex flex-col sm:flex-row xl:flex-col gap-4 xl:gap-0 xl:space-y-5 w-full">
                {TABS.map(({ key, title, icon: Icon }) => {
                  const selected = key === activeKey;
                  return (
                    <li key={key} className="flex">
                      <button
                        type="button"
                        onClick={() => setActiveKey(key)}
                        className={[
                          "w-full xl:w-auto inline-flex items-center gap-3 rounded-full px-4 py-3 text-base font-semibold transition-colors",
                          selected
                            ? "bg-white text-gray-900"
                            : "bg-white/10 text-white hover:bg-white/20",
                        ].join(" ")}
                        aria-pressed={selected}
                      >
                        <Icon
                          className={
                            selected
                              ? "text-gray-900 h-5 w-5"
                              : "text-white h-5 w-5"
                          }
                        />
                        <span className="whitespace-nowrap">{title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* RIGHT: content + image (fixed-size image box, no layout shift) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-center mt-6 xl:mt-0 text-white w-full">
              {/* Text block */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.key + "-text"}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.35 }}
                  className="order-2 lg:order-1"
                >
                  <h3 className="text-3xl md:text-5xl font-extrabold leading-tight">
                    {active.title}
                  </h3>
                  <p className="mt-4 text-white/90 text-base md:text-lg max-w-prose">
                    {active.desc}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Image block — fixed height container; image absolutely fills it */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={active.key + "-img"}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.35 }}
                  className="order-1 lg:order-2"
                >
                  <div className="relative w-full h-[220px] sm:h-[280px] lg:h-[340px] xl:h-[360px]">
                    <img
                      src={active.image}
                      alt={active.title}
                      loading="eager" // show immediately; already cached
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover rounded-2xl shadow-lg ring-8 ring-white/20"
                    />
                    {/* subtle accent */}
                    <div className="hidden md:block absolute -top-4 -left-4 h-10 w-10 rounded-full bg-white/20 backdrop-blur" />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
