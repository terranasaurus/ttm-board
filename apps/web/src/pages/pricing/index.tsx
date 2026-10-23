import type { GetServerSideProps } from "next";

// TTM Portal: Kan's public pricing page is not used. Everyone goes to /login,
// which forwards signed-in users to /boards.
export const getServerSideProps: GetServerSideProps = () =>
  Promise.resolve({ redirect: { destination: "/login", permanent: false } });

export default function Pricing() {
  return null;
}
