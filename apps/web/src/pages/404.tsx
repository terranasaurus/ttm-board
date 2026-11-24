import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { HiArrowRight } from "react-icons/hi2";

import Button from "~/components/Button";
import { PageHead } from "~/components/PageHead";
<<<<<<< HEAD
import PatternedBackground from "~/components/PatternedBackground";
import BrandMark from "~/components/BrandMark";

export default function NotFoundPage() {
  return (
    <>
      <PageHead title={t`404 - Page Not Found | TTM Portal`} />
      <main className="h-screen bg-light-100 pt-20 dark:bg-dark-50 sm:pt-0">
        <div className="justify-top flex h-full flex-col items-center px-4 sm:justify-center">
          <div className="z-10 flex w-full flex-col items-center">
            <Link href="/">
              <BrandMark size="lg" className="mb-6" />
            </Link>
            <p className="mb-4 text-8xl font-bold tracking-tight text-light-1000 dark:text-dark-1000">
              404
            </p>
            <p className="mb-10 text-3xl font-bold tracking-tight text-light-1000 dark:text-dark-1000">
              <Trans>Page not found</Trans>
            </p>
            <div className="w-full rounded-lg border border-light-500 bg-light-300 px-4 py-10 dark:border-dark-400 dark:bg-dark-200 sm:max-w-md lg:px-10">
              <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <p className="mb-6 text-center text-light-900 dark:text-dark-900">
                  <Trans>
                    The page you're looking for doesn't exist or has been moved.
                  </Trans>
                </p>
                <div className="flex flex-col gap-3">
                  <Link
                    href="/"
                    className="flex w-full justify-center rounded-md bg-light-1000 px-3 py-2 text-sm font-semibold text-light-100 shadow-sm hover:bg-light-900 dark:bg-dark-1000 dark:text-dark-100 dark:hover:bg-dark-900"
                  >
                    <Trans>Go to homepage</Trans>
                  </Link>
                  <Link
                    href="/boards"
                    className="flex w-full justify-center rounded-md border border-light-500 bg-light-100 px-3 py-2 text-sm font-semibold text-light-1000 shadow-sm hover:bg-light-200 dark:border-dark-400 dark:bg-dark-100 dark:text-dark-1000 dark:hover:bg-dark-300"
                  >
                    <Trans>Go to boards</Trans>
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <PatternedBackground />
=======
import Layout from "~/views/home/components/Layout";

export default function NotFoundPage() {
  return (
    <Layout>
      <PageHead title={t`404 - Page Not Found | kan.bn`} />
      <div className="flex min-h-[70vh] flex-col justify-center px-4 pt-36 pb-24">
        <p className="text-sm font-medium text-light-900 dark:text-dark-800">
          404
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-light-1000 lg:text-3xl dark:text-dark-1000">
          <Trans>Page not found</Trans>
        </h1>
        <p className="mt-3 max-w-[420px] text-sm text-pretty text-light-900 dark:text-dark-800">
          <Trans>
            The page you're looking for doesn't exist or has been moved.
          </Trans>
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button href="/" iconRight={<HiArrowRight className="h-4 w-4" />}>
            <Trans>Go to homepage</Trans>
          </Button>
          <Button href="/boards" variant="secondary">
            <Trans>Go to boards</Trans>
          </Button>
>>>>>>> upstream/main
        </div>
      </div>
    </Layout>
  );
}
