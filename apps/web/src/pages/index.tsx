import type { GetServerSideProps } from "next";

// TTM Portal: no public marketing page. /login forwards signed-in users to
// /boards, so this sends everyone to the right place.
export const getServerSideProps: GetServerSideProps = () =>
  Promise.resolve({ redirect: { destination: "/login", permanent: false } });

export default function Home() {
  return null;
}
