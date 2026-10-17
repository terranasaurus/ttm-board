import type { NextPageWithLayout } from "./_app";
import { getDashboardLayout } from "~/components/Dashboard";
import MyWorkView from "~/views/ttm/my-work";

const MyWorkPage: NextPageWithLayout = () => <MyWorkView />;

MyWorkPage.getLayout = (page) => getDashboardLayout(page);

export default MyWorkPage;
