import type { GetServerSideProps } from "next";

// TTM Portal: Kan's public OSS friends page is not used. Everyone goes to
// /login, which forwards signed-in users to /boards.
export const getServerSideProps: GetServerSideProps = () =>
  Promise.resolve({ redirect: { destination: "/login", permanent: false } });

export default function OSSFriends() {
  return null;
}
