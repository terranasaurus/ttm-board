import type { NextPageWithLayout } from "../_app";
import { getDashboardLayout } from "~/components/Dashboard";
import DocView from "~/views/ttm/docs/DocView";

const DocPage: NextPageWithLayout = () => <DocView />;

DocPage.getLayout = (page) => getDashboardLayout(page);

export default DocPage;
