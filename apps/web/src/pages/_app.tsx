import "~/styles/globals.css";
import "~/utils/i18n";

import type { NextPage } from "next";
import type { AppProps, AppType } from "next/app";
import type { ReactElement, ReactNode } from "react";
<<<<<<< HEAD
import { Montserrat } from "next/font/google";
import Head from "next/head";
import { env } from "next-runtime-env";
=======
import { Plus_Jakarta_Sans } from "next/font/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
>>>>>>> upstream/main
import { ThemeProvider } from "next-themes";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";

import { env } from "@kan/shared/env";

import { env as appEnv } from "~/env";
import { FontSizeProvider } from "~/providers/font-size";
import { KeyboardShortcutProvider } from "~/providers/keyboard-shortcuts";
import { LinguiProviderWrapper } from "~/providers/lingui";
import { ModalProvider } from "~/providers/modal";
import { PopupProvider } from "~/providers/popup";

const queryClient = new QueryClient();

const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
});

export type NextPageWithLayout<P = object, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

const MyApp: AppType = ({ Component, pageProps }: AppPropsWithLayout) => {
  const posthogKey = env("NEXT_PUBLIC_POSTHOG_KEY");

  useEffect(() => {
    if (posthogKey) {
      posthog.init(posthogKey, {
        api_host: env("NEXT_PUBLIC_POSTHOG_HOST"),
        person_profiles: "identified_only",
        defaults: "2025-05-24",
        loaded: (posthog) => {
          if (appEnv.NODE_ENV === "development") posthog.debug();
        },
      });
    }
  }, [posthogKey]);

  const getLayout = Component.getLayout ?? ((page) => page);

  return (
    <>
      <style jsx global>{`
        html {
<<<<<<< HEAD
          font-family: ${montserrat.style.fontFamily};
=======
          --font-jakarta: ${jakarta.style.fontFamily};
          font-family: var(--font-jakarta);
>>>>>>> upstream/main
        }
        body {
          position: relative;
        }
      `}</style>
<<<<<<< HEAD
      {/* TTM: pages-router apps don't read a `viewport` export, so set the tag
          here for every page. PageHead uses the same key, so no duplicate. */}
      <Head>
        <meta
          key="viewport"
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
      </Head>
      <script src="/__ENV.js" />
      <main className={`${montserrat.variable} font-sans`}>
        <KeyboardShortcutProvider>
          <LinguiProviderWrapper>
            <FontSizeProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
              >
                <ModalProvider>
                  <PopupProvider>
                    {posthogKey ? (
                      <PostHogProvider client={posthog}>
                        {getLayout(<Component {...pageProps} />)}
                      </PostHogProvider>
                    ) : (
                      getLayout(<Component {...pageProps} />)
                    )}
                  </PopupProvider>
                </ModalProvider>
              </ThemeProvider>
            </FontSizeProvider>
          </LinguiProviderWrapper>
        </KeyboardShortcutProvider>
=======
      {/* eslint-disable-next-line @next/next/no-sync-scripts -- runtime env must load before the app reads it */}
      <script src="/__ENV.js" />
      <main className="font-sans">
        <QueryClientProvider client={queryClient}>
          <KeyboardShortcutProvider>
            <LinguiProviderWrapper>
              <FontSizeProvider>
                <ThemeProvider
                  attribute="class"
                  defaultTheme="system"
                  enableSystem
                >
                  <ModalProvider>
                    <PopupProvider>
                      {posthogKey ? (
                        <PostHogProvider client={posthog}>
                          {getLayout(<Component {...pageProps} />)}
                        </PostHogProvider>
                      ) : (
                        getLayout(<Component {...pageProps} />)
                      )}
                    </PopupProvider>
                  </ModalProvider>
                </ThemeProvider>
              </FontSizeProvider>
            </LinguiProviderWrapper>
          </KeyboardShortcutProvider>
        </QueryClientProvider>
>>>>>>> upstream/main
      </main>
    </>
  );
};

export default MyApp;
