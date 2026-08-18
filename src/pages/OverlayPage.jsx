import { useEffect } from "react";
import Overlay from "../components/overlay.jsx";
import { IndividualRegistrationPromptV2 } from "../components/overlay/IndividualRegistrationPromptV2";

function OverlayPage() {
  useEffect(() => {
    const previous = {
      margin: document.body.style.margin,
      padding: document.body.style.padding,
      width: document.body.style.width,
      minHeight: document.body.style.minHeight,
      height: document.body.style.height,
      overflow: document.body.style.overflow,
      background: document.body.style.background
    };

    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";
    document.documentElement.style.width = "fit-content";
    document.documentElement.style.height = "fit-content";
    document.documentElement.style.overflow = "hidden";

    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.width = "fit-content";
    document.body.style.minHeight = "0";
    document.body.style.height = "fit-content";
    document.body.style.overflow = "hidden";
    document.body.style.background = "transparent";

    const fitPopupToOverlay = () => {
      if (window.opener && !window.closed) {
        const contentWidth = document.documentElement.scrollWidth;
        const contentHeight = document.documentElement.scrollHeight;
        const browserChromeWidth = Math.max(0, window.outerWidth - window.innerWidth);
        const browserChromeHeight = Math.max(0, window.outerHeight - window.innerHeight);
        window.resizeTo(contentWidth + browserChromeWidth, contentHeight + browserChromeHeight);
      }
    };

    const resizeTimer = window.setTimeout(fitPopupToOverlay, 120);
    window.addEventListener("load", fitPopupToOverlay);

    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener("load", fitPopupToOverlay);
      document.documentElement.style.margin = "";
      document.documentElement.style.padding = "";
      document.documentElement.style.width = "";
      document.documentElement.style.height = "";
      document.documentElement.style.overflow = "";
      document.body.style.margin = previous.margin;
      document.body.style.padding = previous.padding;
      document.body.style.width = previous.width;
      document.body.style.minHeight = previous.minHeight;
      document.body.style.height = previous.height;
      document.body.style.overflow = previous.overflow;
      document.body.style.background = previous.background;
    };
  }, []);

  return (
    <main style={{display:"block",width:"520px",margin:0,padding:0,overflow:"hidden",boxSizing:"border-box",position:"relative"}}>
      <Overlay />
      <IndividualRegistrationPromptV2 />
    </main>
  );
}

export default OverlayPage;
