import { Link } from "../lib/router";
import usePageTitle from "../lib/usePageTitle";
import EmptyState from "../components/ui/EmptyState";
import { SearchIcon } from "../components/reclaim/icons";

export default function NotFoundPage() {
  usePageTitle("Page not found");

  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <EmptyState
        icon={<SearchIcon size={26} />}
        title="We can’t find that page"
        description="The link may be broken or the page has moved. Everything on the board is one click away."
      >
        <Link to="/" className="rc-btn rc-btn-sm">
          Back home
        </Link>
        <Link to="/browse" className="rc-btn rc-btn-outline rc-btn-sm">
          Browse found items
        </Link>
      </EmptyState>
    </div>
  );
}
