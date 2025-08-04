import { useEffect } from "react";

function ChatPage() {
  useEffect(() => {
    function injectScript() {
      if (document.getElementById("4G-lPMevQyxrzlNXUEwEo")) return;
      const script = document.createElement("script");
      script.id = "4G-lPMevQyxrzlNXUEwEo";
      script.src = "https://www.chatbase.co/embed.min.js";
      script.async = true;
      document.body.appendChild(script);
    }

    if (document.readyState === "complete") {
      injectScript();
    } else {
      window.addEventListener("load", injectScript);
      return () => window.removeEventListener("load", injectScript);
    }
  }, []);

  return null;
}

export default ChatPage;
