import type { NextPageWithLayout } from "./_app";
import { getDashboardLayout } from "~/components/Dashboard";
import ToolboxView from "~/views/ttm/toolbox";

const ToolboxPage: NextPageWithLayout = () => <ToolboxView />;

ToolboxPage.getLayout = (page) => getDashboardLayout(page);

export default ToolboxPage;
