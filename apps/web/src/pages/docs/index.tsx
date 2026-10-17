import type { NextPageWithLayout } from "../_app";
import { getDashboardLayout } from "~/components/Dashboard";
import DocsListView from "~/views/ttm/docs";

const DocsPage: NextPageWithLayout = () => <DocsListView />;

DocsPage.getLayout = (page) => getDashboardLayout(page);

export default DocsPage;
