import type { NextPageWithLayout } from "./_app";
import { getDashboardLayout } from "~/components/Dashboard";
import ResourcesView from "~/views/ttm/resources";

const ResourcesPage: NextPageWithLayout = () => <ResourcesView />;

ResourcesPage.getLayout = (page) => getDashboardLayout(page);

export default ResourcesPage;
