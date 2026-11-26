import { useEffect } from "react";

export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Reclaim` : "Reclaim — Lost & Found";
  }, [title]);
}
